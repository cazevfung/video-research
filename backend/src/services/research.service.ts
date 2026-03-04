/**
 * Research Service
 * Core orchestration logic for AI-powered video research feature
 */

import {
  fetchTranscriptsBatch,
  TranscriptData,
  TranscriptError,
} from './transcript.service';
import {
  callQwenPlus,
  callQwenMax,
  callQwenFlash,
  AIResult,
  AIResponse,
  AIError,
} from './ai.service';
import {
  searchYouTubeVideosBatch,
  VideoSearchResult,
} from './youtube-search.service';
import {
  getResearchSummaryPrompt,
  getSearchQueryPrompt,
  getVideoFilteringPrompt,
  getStyleGuidePrompt,
} from '../prompts';
import {
  createResearch,
  SelectedVideo,
  ResearchProcessingStats,
  ResearchCreateData,
  Research,
} from '../models/Research';
import { SourceVideo } from '../models/Summary';
import { updateJobStatus, broadcastJobProgress, getJobStatus, getSSEConnectionCount } from './job.service';
import { JobStatus } from '../types/summary.types';
import { deductCredits, addCredits } from './credit.service';
import { getResearchConfig, getLimitsConfig, getAISettingsConfig, getSupadataSearchConfig, getSummaryConfig } from '../config';
import logger from '../utils/logger';
import { generateResearchQuestions, regenerateResearchQuestions } from './research-question.service';
import { ResearchStatus, validateStateTransition } from '../utils/research-state-validator';
import { generateCitationMap, formatCitationPromptContext } from './citation-mapper.service';

/**
 * Sort videos by recency and view count (prioritizes recent high-view videos)
 * Uses weighted scoring: 40% recency, 60% views
 */
function sortVideosByRecencyAndViews(videos: VideoSearchResult[]): void {
  videos.sort((a, b) => {
    // Parse upload dates (format: ISO string like "2024-01-15" or "2024-01-15T10:30:00Z")
    const parseDate = (dateStr: string): number => {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    };
    
    const now = Date.now();
    const dateA = parseDate(a.upload_date);
    const dateB = parseDate(b.upload_date);
    
    // Calculate recency score: more recent = higher score
    // Normalize to 0-1 scale (videos from last 365 days get full weight, older videos decay)
    const daysAgoA = dateA > 0 ? (now - dateA) / (1000 * 60 * 60 * 24) : 365;
    const daysAgoB = dateB > 0 ? (now - dateB) / (1000 * 60 * 60 * 24) : 365;
    const recencyScoreA = Math.max(0, 1 - (daysAgoA / 365)); // 1.0 for today, 0.0 for 365+ days ago
    const recencyScoreB = Math.max(0, 1 - (daysAgoB / 365));
    
    // Calculate view score: normalize views to 0-1 scale (log scale for better distribution)
    // Use log10 to compress the range (1M views = 1.0, 1K views = 0.5, 100 views = 0.33)
    const logViewsA = Math.log10(Math.max(1, a.view_count));
    const logViewsB = Math.log10(Math.max(1, b.view_count));
    const maxLogViews = 7; // ~10M views (log10(10000000) ≈ 7)
    const viewScoreA = Math.min(1, logViewsA / maxLogViews);
    const viewScoreB = Math.min(1, logViewsB / maxLogViews);
    
    // Combined score: 40% recency, 60% views (views slightly more important for credibility)
    const scoreA = (recencyScoreA * 0.4) + (viewScoreA * 0.6);
    const scoreB = (recencyScoreB * 0.4) + (viewScoreB * 0.6);
    
    // Sort by combined score (descending: highest score first)
    return scoreB - scoreA;
  });
}

/**
 * Research request interface
 */
export interface ResearchRequest {
  research_query: string;
  language: string;
}

/**
 * Research status types
 * Note: Enhanced workflow uses ResearchStatus from research-state-validator
 * This type is kept for backward compatibility
 */
export type LegacyResearchStatus =
  | 'pending'
  | 'generating_queries'
  | 'searching_videos'
  | 'filtering_videos'
  | 'fetching_transcripts'
  | 'generating_summary'
  | 'completed'
  | 'error';

/**
 * Research progress interface
 * Phase 3: Enhanced workflow with approval stages
 */
export interface ResearchProgress {
  status: ResearchStatus | LegacyResearchStatus | 'citations:metadata' | 'citations:section-complete';
  progress: number;
  message: string;
  generated_queries?: string[]; // Legacy field
  generated_questions?: string[]; // Legacy field (kept for backward compatibility)
  video_count?: number;
  raw_video_results?: any[]; // VideoSearchResult[]
  selected_videos?: SelectedVideo[];
  chunk?: string; // For streaming final summary
  research_query?: string; // Original research query
  title?: string; // AI-generated title
  job_id?: string; // Job ID for tracking
  citation_metadata?: import('../types/citation.types').CitationMetadata; // Citation metadata for frontend
  citation_usage?: import('../types/citation.types').CitationUsageMap; // Citation usage tracking
  data?: {
    _id: string;
    research_query: string;
    generated_queries: string[];
    selected_videos: SelectedVideo[];
    final_summary_text: string;
    processing_stats: ResearchProcessingStats;
    created_at: Date;
    citations?: import('../types/citation.types').CitationMetadata;
    citationUsage?: import('../types/citation.types').CitationUsageMap;
  };
  // Phase 3: Approval stage data (enhanced workflow)
  research_data?: {
    // Core fields
    research_query?: string;
    language?: string;
    
    // Stage 1: Questions
    generated_questions?: string[];
    question_approval_status?: 'pending' | 'approved' | 'regenerating';
    question_feedback_count?: 0 | 1;
    question_user_feedback?: string;
    previous_questions?: string[];
    
    // Stage 2: Search Terms
    generated_search_terms?: string[];
    search_term_approval_status?: 'pending' | 'approved' | 'regenerating';
    search_term_feedback_count?: 0 | 1;
    search_term_user_feedback?: string;
    previous_search_terms?: string[];
    
    // Stage 4: Video Selection
    video_approval_status?: 'pending' | 'approved' | 'regenerating';
    video_feedback_count?: 0 | 1;
    video_user_feedback?: string;
    previous_selected_videos?: SelectedVideo[];
  };
  error?: string;
}

/**
 * Type guard to check if AIResult is an error
 */
function isAIError(result: AIResult): result is AIError {
  return 'error' in result;
}

/**
 * Calculate research job cost
 * Uses configuration values from config.yaml (not hardcoded)
 */
function calculateResearchCost(videoCount: number): number {
  const researchConfig = getResearchConfig();
  const baseCost = researchConfig.base_cost;
  const perVideoCost = researchConfig.per_video_cost;
  
  return baseCost + (videoCount * perVideoCost);
}

/**
 * Parse search terms from AI response
 * Handles both JSON format and numbered list format
 * Enhanced to support partial/incomplete outputs during streaming
 */
function parseSearchTermsFromAI(content: string): string[] {
  // Try to extract JSON first
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.search_terms && Array.isArray(parsed.search_terms)) {
        return parsed.search_terms.map((t: string) => t.trim()).filter(Boolean);
      }
      if (parsed.queries && Array.isArray(parsed.queries)) {
        return parsed.queries.map((t: string) => t.trim()).filter(Boolean);
      }
    } catch (e) {
      // JSON might be incomplete during streaming, continue to list parsing
      logger.debug('[Research] JSON parsing failed (may be incomplete during streaming)', { error: e });
    }
  }

  // Fallback: parse numbered list (works better for partial outputs)
  const lines = content.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  const queries: string[] = [];
  
  for (const line of lines) {
    // Skip lines that are clearly meta-commentary or explanations
    if (line.startsWith('**') || 
        line.toLowerCase().includes('feedback') ||
        line.toLowerCase().includes('regenerate') ||
        line.toLowerCase().includes('address') ||
        line.toLowerCase().includes('note:') ||
        line.toLowerCase().includes('explanation:')) {
      continue;
    }
    
    // Match patterns like "1. query text" or "1) query text" or "- query text"
    const match = line.match(/^(?:\d+[.)]\s*|[-•]\s*)(.+)$/);
    if (match) {
      const query = match[1].trim();
      
      // Additional validation: skip if it's meta-commentary
      if (query.startsWith('**') || 
          query.toLowerCase().includes('feedback') ||
          query.toLowerCase().includes('regenerate')) {
        continue;
      }
      
      // Only add if it looks like a complete query (length check helps filter incomplete ones)
      if (query.length > 5) {
        queries.push(query);
      }
    }
  }

  return queries;
}

/**
 * Calculate progress percentage for search term generation
 * Uses config values to determine progress range
 */
function calculateSearchTermProgress(currentCount: number, targetCount: number): number {
  const researchConfig = getResearchConfig();
  const progressPercentages = researchConfig.progress_percentages;
  
  const startProgress = progressPercentages.generating_search_terms;
  const endProgress = progressPercentages.awaiting_search_term_approval;
  const progressRange = endProgress - startProgress;
  
  // Calculate progress based on completion ratio
  const completionRatio = Math.min(currentCount / targetCount, 1);
  return Math.round(startProgress + (progressRange * completionRatio));
}

/**
 * Stream research summary text chunks incrementally via SSE (fallback mechanism)
 * Simulates streaming by splitting text into chunks and sending them with delays
 * This matches the pattern used in batch summary service
 * @param jobId Job ID
 * @param text Full text to stream
 * @param generatingProgress Progress percentage when generation starts
 * @param completedProgress Progress percentage when completed
 */
async function streamResearchSummaryChunks(
  jobId: string,
  text: string,
  generatingProgress: number,
  completedProgress: number
): Promise<void> {
  const summaryConfig = getSummaryConfig();
  const streamingConfig = summaryConfig.sse_streaming;
  const chunkSize = streamingConfig.text_chunk_size;
  const delayMs = streamingConfig.chunk_delay_ms;
  const progressRatio = streamingConfig.streaming_progress_ratio;

  const chunks: string[] = [];
  
  // Split text into chunks
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  // Send chunks incrementally
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    // Use configured ratio of remaining progress for streaming (from generating to completed)
    const progress = generatingProgress + 
      (i / chunks.length) * (completedProgress - generatingProgress) * progressRatio;
    
    broadcastJobProgress(jobId, {
      status: 'generating_summary',
      progress: Math.min(progress, completedProgress - 1), // Don't reach 100% until done
      message: 'Generating research summary...',
      chunk: chunk,
    });

    // Small delay between chunks to simulate streaming
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Generate search queries using AI
 * Updated to accept optional questions parameter and support streaming
 */
async function generateSearchQueries(
  researchQuery: string,
  language: string,
  questions?: string[], // Optional questions to guide search term generation
  jobId?: string // NEW: For streaming
): Promise<string[]> {
  const researchConfig = getResearchConfig();
  
  // Calculate target count: use questions if provided, otherwise use legacy config
  const targetCount = questions && questions.length > 0
    ? questions.length * researchConfig.search_terms_per_question
    : researchConfig.queries_per_research;
  
  const prompt = getSearchQueryPrompt({ 
    researchQuery,
    queryCount: targetCount,
    questions,
  });
  
  // Get AI settings for search term generation from config
  const aiSettings = getAISettingsConfig();
  const searchTermConfig = aiSettings.search_term_generation;

  logger.info('[Research] Generating search queries with enhanced AI parameters', {
    researchQuery,
    language,
    queryCount: targetCount,
    questionCount: questions?.length || 0,
    aiParams: searchTermConfig,
    jobId,
    streamingEnabled: !!jobId,
  });

  let accumulatedContent = '';
  let partialTerms: string[] = [];
  let streamingFailed = false;

  // Streaming callback for real-time updates
  const onChunk = (chunk: string): void => {
    if (!chunk || chunk.trim().length === 0) {
      return; // Ignore empty chunks
    }

    accumulatedContent += chunk;
    
    // Parse partial search terms incrementally
    const parsed = parseSearchTermsFromAI(accumulatedContent);
    
    // Only broadcast if we have new complete terms
    if (parsed.length > partialTerms.length) {
      partialTerms = parsed;
      
      // Broadcast progress if jobId provided
      if (jobId) {
        const progress = calculateSearchTermProgress(partialTerms.length, targetCount);
        broadcastJobProgress(jobId, {
          status: 'generating_search_terms' as any,
          progress,
          message: `Generating search terms... (${partialTerms.length}/${targetCount})`,
          research_data: {
            partial_search_terms: partialTerms,
          },
        } as any);
      }
      
      logger.debug('[Research] Partial search terms parsed during streaming', {
        jobId,
        currentCount: partialTerms.length,
        targetCount,
      });
    }
  };

  try {
    // Use streaming if jobId is provided and streaming is enabled in config
    const aiResult = await callQwenPlus(
      prompt,
      jobId ? onChunk : undefined, // Only pass callback if streaming
      searchTermConfig
    );

    // Check for errors
    if (isAIError(aiResult)) {
      // Check if it's a streaming parse error - fallback to non-streaming
      if (aiResult.error_code === 'STREAM_PARSE_ERROR') {
        logger.warn('[Research] Streaming failed, falling back to non-streaming mode', {
          jobId,
          error: aiResult.error,
        });
        streamingFailed = true;
        
        // Fallback: retry without streaming
        const fallbackResult = await callQwenPlus(prompt, undefined, searchTermConfig);
        
        if (isAIError(fallbackResult)) {
          throw new Error(`AI service error: ${fallbackResult.error} (${fallbackResult.error_code})`);
        }
        
        const queries = parseSearchTermsFromAI(fallbackResult.content);
        
        // Ensure we have at least the expected number of queries
        if (queries.length < targetCount) {
          logger.warn(`[Research] Generated only ${queries.length} queries, expected ${targetCount}`);
          // Pad with variations of the original query
          while (queries.length < targetCount) {
            queries.push(`${researchQuery} ${queries.length + 1}`);
          }
        }
        
        const finalQueries = queries.slice(0, targetCount);
        logger.info('[Research] Search queries generated (fallback mode)', {
          queryCount: finalQueries.length,
        });
        return finalQueries;
      }
      
      throw new Error(`AI service error: ${aiResult.error} (${aiResult.error_code})`);
    }

    // Final parse from complete content
    const queries = parseSearchTermsFromAI(aiResult.content);

    // Ensure we have at least the expected number of queries
    if (queries.length < targetCount) {
      logger.warn(`[Research] Generated only ${queries.length} queries, expected ${targetCount}`);
      // Pad with variations of the original query
      while (queries.length < targetCount) {
        queries.push(`${researchQuery} ${queries.length + 1}`);
      }
    }

    // Limit to target count
    const finalQueries = queries.slice(0, targetCount);

    logger.info('[Research] Generated search queries', {
      queryCount: finalQueries.length,
      streamingUsed: !!jobId && !streamingFailed,
      queries: finalQueries,
    });

    return finalQueries;
  } catch (error) {
    logger.error('[Research] Failed to generate search queries', {
      researchQuery,
      error: error instanceof Error ? error.message : String(error),
      jobId,
    });
    throw new Error(`Failed to generate search queries: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Regenerate search terms based on user feedback
 * Exported for use in approval endpoints
 */
export async function regenerateSearchTerms(
  researchQuery: string,
  questions: string[],
  originalSearchTerms: string[],
  userFeedback: string,
  language: string
): Promise<string[]> {
  const researchConfig = getResearchConfig();
  const targetTermCount = questions.length * researchConfig.search_terms_per_question;
  
  logger.info('[Research] Regenerating search terms with feedback', {
    researchQuery: researchQuery.substring(0, 100),
    feedbackLength: userFeedback.length,
    originalTermCount: originalSearchTerms.length,
    targetTermCount,
  });

  // For now, we'll use the same generation function but with feedback context
  // In a full implementation, we'd have a separate regeneration prompt
  // For Phase 1, we'll enhance the prompt with feedback
  const prompt = getSearchQueryPrompt({
    researchQuery,
    queryCount: targetTermCount,
    questions,
  });

  // Add feedback context to the prompt
  const feedbackSection = `

## User Feedback on Previous Search Terms

The user has provided this feedback:

**Feedback**: ${userFeedback}

Please regenerate search terms that address this feedback while maintaining relevance to the research questions.

**CRITICAL**: Output ONLY the search queries as a numbered list. Do NOT include explanations, reasoning, or meta-commentary about what you changed. Just the search queries themselves.
`;
  
  const enhancedPrompt = prompt + feedbackSection;

  const aiSettings = getAISettingsConfig();
  const searchTermConfig = aiSettings.search_term_generation;

  try {
    const aiResult = await callQwenPlus(enhancedPrompt, undefined, searchTermConfig);

    if (isAIError(aiResult)) {
      throw new Error(`AI service error: ${aiResult.error} (${aiResult.error_code})`);
    }

    // Parse the AI response using shared parsing function
    const queries = parseSearchTermsFromAI(aiResult.content);
    
    // Validate that we got a reasonable number of search terms
    if (queries.length !== targetTermCount) {
      logger.warn('[Research] Search term count mismatch after regeneration', {
        expected: targetTermCount,
        received: queries.length,
        rawContentPreview: aiResult.content.substring(0, 500),
      });
    }

    if (queries.length < targetTermCount) {
      logger.warn(`[Research] Regenerated only ${queries.length} terms, expected ${targetTermCount}`);
      while (queries.length < targetTermCount) {
        queries.push(`${researchQuery} ${queries.length + 1}`);
      }
    }

    const finalTerms = queries.slice(0, targetTermCount);

    logger.info('[Research] Search terms regenerated', {
      termCount: finalTerms.length,
    });

    return finalTerms;
  } catch (error) {
    logger.error('[Research] Failed to regenerate search terms', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Filter videos using AI
 * Updated to accept optional questions and user feedback
 * Exported for use in approval endpoints
 */
export async function filterVideos(
  researchQuery: string,
  videoResults: VideoSearchResult[],
  language: string,
  questions?: string[],
  userFeedback?: string,
  previousSelectedVideos?: SelectedVideo[]
): Promise<SelectedVideo[]> {
  const researchConfig = getResearchConfig();
  const prompt = getVideoFilteringPrompt({
    researchQuery,
    videoResults,
    language,
    questions,
    userFeedback,
    previousSelectedVideos:
      previousSelectedVideos?.map((v) => ({
        title: v.title,
        channel: v.channel,
        classification: v.classification,
      })),
  });

  logger.info('[Research] Filtering videos', {
    researchQuery,
    videoCount: videoResults.length,
    targetCount: researchConfig.target_selected_videos,
    questionCount: questions?.length || 0,
    hasFeedback: !!userFeedback,
  });

    try {
      logger.debug('[Research] Calling AI for video filtering', {
        researchQuery,
        videoCount: videoResults.length,
        promptLength: prompt.length,
      });

      const aiResult = await callQwenPlus(prompt);

      // Check for errors
      if (isAIError(aiResult)) {
        throw new Error(`AI service error: ${aiResult.error} (${aiResult.error_code})`);
      }

      logger.debug('[Research] AI filtering response received', {
        researchQuery,
        responseLength: aiResult.content.length,
        tokensUsed: aiResult.tokens_used || 0,
      });

      // Parse JSON response
      let parsedResult: {
        temporal_assessment?: string;
        selected_videos: Array<{
          title: string;
          channel: string;
          classification: 'Direct' | 'Foundational' | 'Contrarian';
          why_selected: string;
          fills_gap: string;
        }>;
        learning_path?: {
          direct_exploration: number;
          foundational_context: number;
          alternative_perspectives: number;
          how_they_work_together: string;
        };
      };

      try {
        let jsonContent = aiResult.content.trim();
        
        // Strategy 1: Try to extract JSON from markdown code blocks if present
        // Match code blocks with optional json language tag
        const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*\})\s*```/;
        const codeBlockMatch = jsonContent.match(codeBlockRegex);
        if (codeBlockMatch && codeBlockMatch[1]) {
          jsonContent = codeBlockMatch[1].trim();
        } else {
          // Strategy 2: Try to find JSON object boundaries (start with {, end with })
          // This handles cases where there's text before/after the JSON
          // We need to find the matching closing brace, not just the last one
          if (!jsonContent.startsWith('{')) {
            const jsonStart = jsonContent.indexOf('{');
            if (jsonStart !== -1) {
              // Find the matching closing brace by counting braces
              let braceCount = 0;
              let jsonEnd = -1;
              for (let i = jsonStart; i < jsonContent.length; i++) {
                if (jsonContent[i] === '{') braceCount++;
                if (jsonContent[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    jsonEnd = i;
                    break;
                  }
                }
              }
              if (jsonEnd !== -1) {
                jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
              }
            }
          }
        }
        
        // Strategy 3: Parse the JSON
        parsedResult = JSON.parse(jsonContent);
        
        // Validate the structure
        if (!parsedResult.selected_videos || !Array.isArray(parsedResult.selected_videos)) {
          throw new Error('Response missing required "selected_videos" array');
        }
        
        if (parsedResult.selected_videos.length === 0) {
          throw new Error('Response contains empty "selected_videos" array');
        }
        
        logger.debug('[Research] Successfully parsed AI filtering response', {
          researchQuery,
          selectedCount: parsedResult.selected_videos.length,
          hasTemporalAssessment: !!parsedResult.temporal_assessment,
          hasLearningPath: !!parsedResult.learning_path,
        });
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        const contentPreview = aiResult.content.substring(0, 1000);
        
        logger.error('[Research] Failed to parse AI response as JSON', {
          contentPreview,
          contentLength: aiResult.content.length,
          error: errorMessage,
          hasCodeBlock: aiResult.content.includes('```'),
          hasJsonStart: aiResult.content.includes('{'),
          hasJsonEnd: aiResult.content.includes('}'),
        });
        
        throw new Error(`AI returned invalid JSON format: ${errorMessage}. Response preview: ${contentPreview.substring(0, 200)}...`);
      }

    // Match selected videos with original video results
    const selectedVideos: SelectedVideo[] = [];
    for (const selected of parsedResult.selected_videos) {
      // Find matching video by title and channel
      const matchingVideo = videoResults.find(
        v => v.title === selected.title && v.channel === selected.channel
      );

      if (matchingVideo) {
        selectedVideos.push({
          video_id: matchingVideo.video_id,
          title: matchingVideo.title,
          channel: matchingVideo.channel,
          thumbnail: matchingVideo.thumbnail,
          duration_seconds: matchingVideo.duration_seconds,
          url: matchingVideo.url,
          upload_date: matchingVideo.upload_date,
          classification: selected.classification,
          why_selected: selected.why_selected,
          fills_gap: selected.fills_gap,
        });
      } else {
        logger.warn('[Research] Could not find matching video for selected item', {
          title: selected.title,
          channel: selected.channel,
        });
      }
    }

    // Ensure we have at least the minimum required videos
    if (selectedVideos.length < researchConfig.min_selected_videos) {
      logger.warn(`[Research] Only selected ${selectedVideos.length} videos, minimum is ${researchConfig.min_selected_videos}`);
      throw new Error(`Insufficient videos selected: ${selectedVideos.length} < ${researchConfig.min_selected_videos}`);
    }

    logger.info('[Research] Videos filtered', {
      selectedCount: selectedVideos.length,
      classifications: selectedVideos.map(v => v.classification),
    });

    return selectedVideos;
  } catch (error) {
    logger.error('[Research] Failed to filter videos', {
      researchQuery,
      videoCount: videoResults.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate style guide using qwen-flash
 * Analyzes query and transcripts to determine appropriate writing style
 * Exported for simulation/testing (transcript -> style guide stage).
 */
export async function generateStyleGuide(
  researchQuery: string,
  transcripts: TranscriptData[],
  language: string,
  questions?: string[],
  jobId?: string
): Promise<string> {
  const researchConfig = getResearchConfig();
  
  // Check if style guide generation is enabled
  if (!researchConfig.enable_style_guide) {
    logger.info('[Research] Style guide generation disabled, skipping', { jobId });
    return '';
  }
  
  const previewLength = researchConfig.style_guide_transcript_preview_length || 1000;
  
  logger.info('[Research] Generating style guide', {
    jobId,
    researchQuery,
    transcriptCount: transcripts.length,
    previewLength,
  });
  
  try {
    // Validate transcripts have text
    if (transcripts.length === 0) {
      logger.warn('[Research] Style guide generation skipped: no transcripts available', {
        jobId,
      });
      return '';
    }
    
    // Filter transcripts that have valid text
    const validTranscripts = transcripts.filter(t => 
      t.transcript_text && 
      typeof t.transcript_text === 'string' && 
      t.transcript_text.trim().length > 0
    );
    
    if (validTranscripts.length === 0) {
      logger.warn('[Research] Style guide generation skipped: no transcripts with valid text', {
        jobId,
        totalTranscripts: transcripts.length,
      });
      return '';
    }
    
    logger.debug('[Research] Created transcript previews for style guide', {
      jobId,
      validTranscriptCount: validTranscripts.length,
      totalTranscriptCount: transcripts.length,
    });
    
    // Create transcript previews (first N characters of each transcript)
    const transcriptPreviews = validTranscripts.map((t, index) => {
      const preview = t.transcript_text.substring(0, previewLength);
      return `**Video ${index + 1}: ${t.title}**\n${preview}${t.transcript_text.length > previewLength ? '...' : ''}`;
    });
    
    // Generate style guide prompt
    const styleGuidePrompt = getStyleGuidePrompt({
      researchQuery,
      language,
      questions,
      transcriptPreviews,
    });
    
    // Call qwen-flash to generate style guide
    const aiResult = await callQwenFlash(styleGuidePrompt, '');
    
    // Check for errors
    if (isAIError(aiResult)) {
      logger.warn('[Research] Style guide generation failed, continuing without style guide', {
        jobId,
        error: aiResult.error,
      });
      return '';
    }
    
    const styleGuide = aiResult.content.trim();
    
    logger.info('[Research] Style guide generated successfully', {
      jobId,
      styleGuideLength: styleGuide.length,
      tokensUsed: aiResult.tokens_used || 0,
      styleGuidePreview: styleGuide.substring(0, 200) + '...',
    });
    
    return styleGuide;
  } catch (error) {
    logger.error('[Research] Failed to generate style guide', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - continue without style guide if generation fails
    return '';
  }
}

/**
 * Generate research summary using AI
 * Updated to accept questions for structured summary and style guide
 */
async function generateResearchSummary(
  researchQuery: string,
  transcripts: TranscriptData[],
  selectedVideos: SelectedVideo[],
  language: string,
  questions?: string[], // NEW: Optional questions to structure summary
  styleGuide?: string, // NEW: Optional style guide for adaptive writing
  onChunk?: (chunk: string) => void,
  rawVideoResults?: VideoSearchResult[] // NEW: Optional raw video results for citation metadata
): Promise<string> {
  // Get current date for temporal context in the prompt
  const queryDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  
  const researchConfig = getResearchConfig();
  const useQuestionsForStructure = researchConfig.use_questions_for_structure && questions && questions.length > 0;
  
  // Generate citation map and citation instructions
  const citationMap = generateCitationMap(selectedVideos, rawVideoResults);
  const citationContext = formatCitationPromptContext(citationMap, language);
  
  // Log style guide status before generating prompt
  logger.info('[Research] Generating research summary prompt', {
    hasStyleGuide: !!styleGuide && styleGuide.trim().length > 0,
    styleGuideLength: styleGuide ? styleGuide.length : 0,
    hasQuestions: !!questions && questions.length > 0,
    questionCount: questions ? questions.length : 0,
  });
  
  const prompt = getResearchSummaryPrompt({
    researchQuery,
    language,
    queryDate,
    questions: useQuestionsForStructure ? questions : undefined, // Pass questions if enabled
    styleGuide: styleGuide, // Pass style guide if provided
    citationInstructions: citationContext.citationInstructions, // Pass citation instructions
  });
  
  // Verify style guide was inserted into prompt
  if (styleGuide && styleGuide.trim().length > 0) {
    const styleGuideInPrompt = prompt.includes('Writing Style Guide') || prompt.includes(styleGuide.substring(0, 50));
    logger.info('[Research] Style guide insertion verification', {
      styleGuideInPrompt,
      promptLength: prompt.length,
      styleGuideLength: styleGuide.length,
    });
  }

  // Format transcripts for prompt
  const transcriptsText = transcripts.map((t, index) => {
    const video = selectedVideos[index];
    const uploadInfo = video.upload_date ? `\n**Upload Date:** ${video.upload_date}` : '';
    return `
## Video ${index + 1}: ${t.title}
**Channel:** ${t.channel}
**Duration:** ${Math.floor(t.duration_seconds / 60)}:${String(t.duration_seconds % 60).padStart(2, '0')}${uploadInfo}

**Transcript:**
${t.transcript_text}
`.trim();
  }).join('\n\n---\n\n');

  // Replace transcripts placeholder in prompt
  const fullPrompt = prompt.replace(/{transcripts}/g, transcriptsText);

  logger.info('[Research] Generating research summary', {
    researchQuery,
    transcriptCount: transcripts.length,
    language,
  });

  try {
    logger.debug('[Research] Starting AI summary generation', {
      researchQuery,
      transcriptCount: transcripts.length,
      promptLength: fullPrompt.length,
    });

    // Use QwenMax for high-quality research summaries
    const aiResult = await callQwenMax(fullPrompt, onChunk);

    // Check for errors
    if (isAIError(aiResult)) {
      // Check if it's a streaming parse error - this should be handled by caller for fallback
      if (aiResult.error_code === 'STREAM_PARSE_ERROR') {
        const streamError = new Error(`AI service error: ${aiResult.error} (${aiResult.error_code})`);
        (streamError as any).isStreamParseError = true;
        throw streamError;
      }
      throw new Error(`AI service error: ${aiResult.error} (${aiResult.error_code})`);
    }

    logger.info('[Research] Research summary generated', {
      researchQuery,
      summaryLength: aiResult.content.length,
      tokensUsed: aiResult.tokens_used || 0,
    });

    logger.debug('[Research] AI summary generation details', {
      researchQuery,
      summaryPreview: aiResult.content.substring(0, 200) + '...',
      tokensUsed: aiResult.tokens_used || 0,
    });

    return aiResult.content;
  } catch (error) {
    logger.error('[Research] Failed to generate research summary', {
      researchQuery,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Failed to generate research summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main orchestration function for research processing
 * Enhanced workflow: Generates questions first and stops at approval stage
 */
export async function processResearch(
  userId: string | null,
  request: ResearchRequest,
  jobId: string,
  isGuest?: boolean,
  guestSessionId?: string | null
): Promise<string> {
  const startTime = Date.now();
  const researchConfig = getResearchConfig();
  const progressPercentages = researchConfig.progress_percentages;
  const limitsConfig = getLimitsConfig();

  logger.info('[Research] Starting research processing (enhanced workflow)', {
    jobId,
    userId,
    researchQuery: request.research_query,
    language: request.language,
  });

  let estimatedCost = calculateResearchCost(researchConfig.target_selected_videos);
  let creditsReserved = false;

  try {
    // Step 1: Reserve credits upfront
    if (userId) {
      try {
        await deductCredits(userId, estimatedCost, {
          batchId: jobId,
          description: `Research job: ${request.research_query.substring(0, 50)}...`,
        });
        creditsReserved = true;
        logger.info('[Research] Credits reserved', {
          userId,
          creditsReserved: estimatedCost,
        });
      } catch (creditError) {
        logger.error('[Research] Failed to reserve credits', {
          userId,
          error: creditError instanceof Error ? creditError.message : String(creditError),
        });
        throw new Error('Insufficient credits for research job');
      }
    }

    // Step 2: Generate research questions (enhanced workflow)
    updateJobStatus(jobId, 'processing' as JobStatus, {
      progress: progressPercentages.generating_questions,
    });

    broadcastJobProgress(jobId, {
      status: 'generating_questions' as any,
      progress: progressPercentages.generating_questions,
      message: 'Generating research questions...',
    });

    const questions = await generateResearchQuestions(
      request.research_query,
      request.language,
      researchConfig.question_count
    );

    // Store questions and stop at approval stage
    updateJobStatus(jobId, 'processing' as JobStatus, {
      progress: progressPercentages.awaiting_question_approval,
      research_data: {
        research_query: request.research_query,
        language: request.language,
        generated_questions: questions,
        question_approval_status: 'pending',
        question_feedback_count: 0,
      },
    });

    broadcastJobProgress(jobId, {
      status: 'awaiting_question_approval' as any,
      progress: progressPercentages.awaiting_question_approval,
      message: `Generated ${questions.length} research questions. Please review and approve.`,
      research_data: {
        research_query: request.research_query,
        language: request.language,
        generated_questions: questions,
        question_approval_status: 'pending',
        question_feedback_count: 0,
      },
    } as any);

    logger.info('[Research] Questions generated, awaiting approval', {
      jobId,
      questionCount: questions.length,
    });

    // Return jobId - workflow continues via approval endpoint
    return jobId;
  } catch (error) {
    logger.error('[Research] Research processing failed', {
      jobId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Refund credits on failure
    if (userId && creditsReserved) {
      try {
        await addCredits(userId, estimatedCost, 'refunded', {
          description: `Research job failure refund: ${request.research_query.substring(0, 50)}...`,
        });
        logger.info('[Research] Credits refunded due to failure', {
          userId,
          creditsRefunded: estimatedCost,
        });
      } catch (refundError) {
        logger.error('[Research] Failed to refund credits on failure', {
          userId,
          error: refundError instanceof Error ? refundError.message : String(refundError),
        });
      }
    }

    updateJobStatus(jobId, 'error', {
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    broadcastJobProgress(jobId, {
      status: 'error' as JobStatus,
      progress: 0,
      message: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as any);

    throw error;
  }
}

/**
 * Continue research workflow after approval stage
 * Called by approval endpoints to proceed to next stage
 */
export async function continueResearchAfterApproval(
  jobId: string,
  stage: 'questions' | 'search_terms' | 'videos',
  userId: string | null
): Promise<string> {
  console.error(`[CONTINUE-RESEARCH] ===== START continueResearchAfterApproval =====`);
  console.error(`[CONTINUE-RESEARCH] JobId: ${jobId}, Stage: ${stage}, UserId: ${userId || 'null'}`);
  
  const researchConfig = getResearchConfig();
  const progressPercentages = researchConfig.progress_percentages;
  
  // Re-fetch job to ensure we have the latest state after approval update
  console.error(`[CONTINUE-RESEARCH] Fetching job status...`);
  const job = getJobStatus(jobId);
  
  if (!job) {
    console.error(`[CONTINUE-RESEARCH] ERROR: Job not found: ${jobId}`);
    throw new Error(`Job not found: ${jobId}`);
  }

  console.error(`[CONTINUE-RESEARCH] Job found. Status: ${job.status}, Progress: ${job.progress}`);

  const researchData = job.research_data || {};
  const researchQuery = researchData.research_query || '';
  const language = researchData.language || 'English';
  const startTime = Date.now();

  console.error(`[CONTINUE-RESEARCH] Research data keys:`, Object.keys(researchData));
  console.error(`[CONTINUE-RESEARCH] Research data:`, JSON.stringify(researchData, null, 2));
  console.error(`[CONTINUE-RESEARCH] question_approval_status: ${researchData.question_approval_status || 'undefined'}`);
  console.error(`[CONTINUE-RESEARCH] search_term_approval_status: ${researchData.search_term_approval_status || 'undefined'}`);
  console.error(`[CONTINUE-RESEARCH] video_approval_status: ${researchData.video_approval_status || 'undefined'}`);

  logger.info('[Research] Continuing research after approval', {
    jobId,
    stage,
    userId,
    question_approval_status: researchData.question_approval_status,
    search_term_approval_status: researchData.search_term_approval_status,
    video_approval_status: researchData.video_approval_status,
  });

  try {
    if (stage === 'questions') {
      console.error(`[CONTINUE-RESEARCH] ===== PROCESSING QUESTIONS STAGE =====`);
      
      // Stage 2: Generate search terms from approved questions
      // Verify questions are actually approved before using them
      // Re-check the latest job state to ensure approval was persisted
      console.error(`[CONTINUE-RESEARCH] Re-fetching job to verify approval status...`);
      const latestJob = getJobStatus(jobId);
      
      if (!latestJob) {
        console.error(`[CONTINUE-RESEARCH] ERROR: Latest job not found!`);
        throw new Error(`Job not found: ${jobId}`);
      }
      
      const latestResearchData = latestJob.research_data || {};
      
      console.error(`[CONTINUE-RESEARCH] Latest research_data keys:`, Object.keys(latestResearchData));
      console.error(`[CONTINUE-RESEARCH] Latest research_data:`, JSON.stringify(latestResearchData, null, 2));
      console.error(`[CONTINUE-RESEARCH] Checking question_approval_status...`);
      console.error(`[CONTINUE-RESEARCH] Expected: 'approved'`);
      console.error(`[CONTINUE-RESEARCH] Actual: '${latestResearchData.question_approval_status || 'undefined'}'`);
      console.error(`[CONTINUE-RESEARCH] Type check:`, typeof latestResearchData.question_approval_status);
      console.error(`[CONTINUE-RESEARCH] Equality check:`, latestResearchData.question_approval_status === 'approved');
      
      if (latestResearchData.question_approval_status !== 'approved') {
        console.error(`[CONTINUE-RESEARCH] ===== APPROVAL CHECK FAILED =====`);
        console.error(`[CONTINUE-RESEARCH] question_approval_status is NOT 'approved'!`);
        console.error(`[CONTINUE-RESEARCH] Value: '${latestResearchData.question_approval_status || 'undefined'}'`);
        console.error(`[CONTINUE-RESEARCH] Type: ${typeof latestResearchData.question_approval_status}`);
        console.error(`[CONTINUE-RESEARCH] All research_data keys:`, Object.keys(latestResearchData));
        console.error(`[CONTINUE-RESEARCH] Full research_data:`, JSON.stringify(latestResearchData, null, 2));
        
        logger.error('[Research] Question approval status check failed', {
          jobId,
          stage,
          expected: 'approved',
          actual: latestResearchData.question_approval_status,
          researchDataKeys: Object.keys(latestResearchData),
          fullResearchData: JSON.stringify(latestResearchData),
        });
        throw new Error('Questions must be approved before generating search terms');
      }
      
      console.error(`[CONTINUE-RESEARCH] Approval check PASSED! Proceeding with search term generation...`);
      
      const approvedQuestions = researchData.generated_questions || [];
      
      if (approvedQuestions.length === 0) {
        throw new Error('No approved questions found');
      }

      updateJobStatus(jobId, 'processing' as JobStatus, {
        progress: progressPercentages.generating_search_terms,
        research_data: {
          question_approval_status: 'approved',
        },
      });

      broadcastJobProgress(jobId, {
        status: 'generating_search_terms' as any,
        progress: progressPercentages.generating_search_terms,
        message: 'Generating search terms from approved questions...',
      });

      const searchTerms = await generateSearchQueries(
        researchQuery,
        language,
        approvedQuestions,
        jobId // Pass jobId for streaming support
      );

      // Store search terms and stop at approval stage
      updateJobStatus(jobId, 'processing' as JobStatus, {
        progress: progressPercentages.awaiting_search_term_approval,
        research_data: {
          generated_search_terms: searchTerms,
          search_term_approval_status: 'pending',
          search_term_feedback_count: 0,
        },
      });

      // Get current job to include all research_data
      const currentJob = getJobStatus(jobId);
      const currentResearchData = currentJob?.research_data || {};
      
      broadcastJobProgress(jobId, {
        status: 'awaiting_search_term_approval' as any,
        progress: progressPercentages.awaiting_search_term_approval,
        message: `Generated ${searchTerms.length} search terms. Please review and approve.`,
        research_data: {
          ...currentResearchData,
          generated_search_terms: searchTerms,
          search_term_approval_status: 'pending',
          search_term_feedback_count: 0,
        },
        generated_queries: searchTerms, // Legacy field for backward compatibility
      } as any);

      logger.info('[Research] Search terms generated, awaiting approval', {
        jobId,
        termCount: searchTerms.length,
      });

      return jobId;
    } else if (stage === 'search_terms') {
      // Stage 3: Search videos (no approval needed)
      // Re-check the latest job state to ensure approvals were persisted
      const latestJob = getJobStatus(jobId);
      const latestResearchData = latestJob?.research_data || {};
      
      // Verify questions and search terms are actually approved before using them
      if (latestResearchData.question_approval_status !== 'approved') {
        logger.error('[Research] Question approval status check failed in search_terms stage', {
          jobId,
          stage,
          expected: 'approved',
          actual: latestResearchData.question_approval_status,
        });
        throw new Error('Questions must be approved before searching videos');
      }
      
      if (latestResearchData.search_term_approval_status !== 'approved') {
        logger.error('[Research] Search term approval status check failed', {
          jobId,
          stage,
          expected: 'approved',
          actual: latestResearchData.search_term_approval_status,
        });
        throw new Error('Search terms must be approved before searching videos');
      }
      
      const approvedSearchTerms = latestResearchData.generated_search_terms || [];
      const approvedQuestions = latestResearchData.generated_questions || [];

      if (approvedSearchTerms.length === 0) {
        throw new Error('No approved search terms found');
      }
      
      if (approvedQuestions.length === 0) {
        throw new Error('No approved questions found');
      }

      updateJobStatus(jobId, 'processing' as JobStatus, {
        progress: progressPercentages.searching_videos,
        research_data: {
          search_term_approval_status: 'approved',
        },
      });

      broadcastJobProgress(jobId, {
        status: 'searching_videos' as any,
        progress: progressPercentages.searching_videos,
        message: `Searching for videos using ${approvedSearchTerms.length} search terms...`,
      });

      const supadataSearchConfig = getSupadataSearchConfig();
      const searchOptions = {
        limit: researchConfig.videos_per_query,
        sortBy: supadataSearchConfig.sort_by,
        duration: supadataSearchConfig.supported_durations[0] as 'short' | 'medium' | 'long',
      };

      logger.info('[Research] Starting video search batch', {
        jobId,
        searchTermCount: approvedSearchTerms.length,
        searchTerms: approvedSearchTerms,
        searchOptions,
        videosPerQuery: researchConfig.videos_per_query,
        sortBy: supadataSearchConfig.sort_by,
        duration: supadataSearchConfig.supported_durations[0],
        supadataSearchUrl: supadataSearchConfig.search_url,
      });

      let videoResults: VideoSearchResult[];
      try {
        videoResults = await searchYouTubeVideosBatch(approvedSearchTerms, searchOptions);
        logger.info('[Research] Video search batch completed', {
          jobId,
          searchTermCount: approvedSearchTerms.length,
          resultsCount: videoResults.length,
          resultsPerTerm: videoResults.length / approvedSearchTerms.length,
        });
      } catch (error) {
        logger.error('[Research] Video search batch failed', {
          jobId,
          searchTermCount: approvedSearchTerms.length,
          searchTerms: approvedSearchTerms,
          searchOptions,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }

      if (videoResults.length === 0) {
        throw new Error('No videos found for the research query. Please try rephrasing your query.');
      }

      // Sort videos: Prioritize higher views AND more recent dates
      // Uses weighted scoring: 40% recency, 60% views
      sortVideosByRecencyAndViews(videoResults);

      logger.info('[Research] Videos sorted by recency and views', {
        jobId,
        totalVideos: videoResults.length,
        topVideo: videoResults[0] ? {
          title: videoResults[0].title.substring(0, 50),
          views: videoResults[0].view_count,
          date: videoResults[0].upload_date,
        } : null,
      });

      // Pre-filter: Remove videos with suspiciously low view counts before displaying
      // This filters out obviously low-quality videos (e.g., 55 views) that Supadata
      // may return for niche search terms. The AI filter will do more nuanced filtering later.
      // Minimum threshold: 100 views (very permissive - just removes the worst outliers)
      const MIN_VIEW_COUNT_THRESHOLD = 100;
      const filteredVideoResults = videoResults.filter(v => v.view_count >= MIN_VIEW_COUNT_THRESHOLD);
      
      const filteredCount = videoResults.length - filteredVideoResults.length;
      if (filteredCount > 0) {
        logger.info('[Research] Pre-filtered low-view videos', {
          jobId,
          originalCount: videoResults.length,
          filteredCount: filteredVideoResults.length,
          removedCount: filteredCount,
          threshold: MIN_VIEW_COUNT_THRESHOLD,
        });
      }

      // Use filtered results for display, but keep all results for AI filtering
      // (AI filter can make more nuanced decisions based on age + views)
      const videosForDisplay = filteredVideoResults.length > 0 ? filteredVideoResults : videoResults;
      const videosForFiltering = videoResults; // AI gets all results for nuanced filtering

      // Store video results (use filtered for display count)
      updateJobStatus(jobId, 'processing' as JobStatus, {
        progress: progressPercentages.videos_found,
        research_data: {
          raw_video_results: videosForDisplay.map(v => ({
            video_id: v.video_id,
            title: v.title,
            channel: v.channel,
            thumbnail: v.thumbnail,
            duration_seconds: v.duration_seconds,
            view_count: v.view_count,
            upload_date: v.upload_date,
            url: v.url,
          })),
          video_count: videosForDisplay.length,
        },
      });

      broadcastJobProgress(jobId, {
        status: 'videos_found' as any,
        progress: progressPercentages.videos_found,
        message: `Found ${videosForDisplay.length} videos. Filtering to select best ${researchConfig.target_selected_videos}...`,
        video_count: videosForDisplay.length,
        raw_video_results: videosForDisplay.map(v => ({
          video_id: v.video_id,
          title: v.title,
          channel: v.channel,
          thumbnail: v.thumbnail,
          duration_seconds: v.duration_seconds,
          view_count: v.view_count,
          upload_date: v.upload_date,
          url: v.url,
        })),
      } as any);

      // Stage 4: Filter videos using AI
      updateJobStatus(jobId, 'processing' as JobStatus, {
        progress: progressPercentages.filtering_videos,
      });

      broadcastJobProgress(jobId, {
        status: 'filtering_videos' as any,
        progress: progressPercentages.filtering_videos,
        message: 'AI is selecting the best videos...',
      });

      let selectedVideos: SelectedVideo[];
      try {
        // Use all videos for AI filtering (not pre-filtered) so AI can make nuanced decisions
        // based on age + views + channel credibility
        selectedVideos = await filterVideos(
          researchQuery,
          videosForFiltering,
          language,
          approvedQuestions
        );
      } catch (filterError) {
        logger.error('[Research] Video filtering failed', {
          jobId,
          error: filterError instanceof Error ? filterError.message : String(filterError),
        });
        
        // Fallback: select top videos by recency and views (use all videos, not pre-filtered)
        if (videosForFiltering.length >= researchConfig.min_selected_videos) {
          const sortedVideos = [...videosForFiltering];
          sortVideosByRecencyAndViews(sortedVideos);
          selectedVideos = sortedVideos.slice(0, researchConfig.target_selected_videos).map(v => ({
            video_id: v.video_id,
            title: v.title,
            channel: v.channel,
            thumbnail: v.thumbnail,
            duration_seconds: v.duration_seconds,
            url: v.url,
            classification: 'Direct' as const,
            why_selected: 'Selected as fallback due to filtering failure',
            fills_gap: 'Top videos by view count',
          }));
        } else {
          throw new Error(`Failed to filter videos and insufficient videos available: ${filterError instanceof Error ? filterError.message : 'Unknown error'}`);
        }
      }

      // Store selected videos and stop at approval stage
      updateJobStatus(jobId, 'processing' as JobStatus, {
        progress: progressPercentages.awaiting_video_approval,
        research_data: {
          selected_videos: selectedVideos,
          video_approval_status: 'pending',
          video_feedback_count: 0,
        },
      });

      // Get current job to include all research_data
      const currentJob = getJobStatus(jobId);
      const currentResearchData = currentJob?.research_data || {};
      
      broadcastJobProgress(jobId, {
        status: 'awaiting_video_approval' as any,
        progress: progressPercentages.awaiting_video_approval,
        message: `Selected ${selectedVideos.length} videos. Please review and approve.`,
        research_data: {
          ...currentResearchData,
          selected_videos: selectedVideos,
          video_approval_status: 'pending',
          video_feedback_count: 0,
        },
        selected_videos: selectedVideos, // Also include at top level for backward compatibility
      } as any);

      logger.info('[Research] Videos filtered, awaiting approval', {
        jobId,
        selectedCount: selectedVideos.length,
      });

      return jobId;
    } else if (stage === 'videos') {
      // Stage 5: Fetch transcripts and generate summary
      // Re-check the latest job state to ensure approvals were persisted
      const latestJob = getJobStatus(jobId);
      const latestResearchData = latestJob?.research_data || {};
      
      const approvedVideos = latestResearchData.selected_videos || [];
      
      // Verify questions and videos are actually approved before using them
      if (latestResearchData.question_approval_status !== 'approved') {
        logger.error('[Research] Question approval status check failed in videos stage', {
          jobId,
          stage,
          expected: 'approved',
          actual: latestResearchData.question_approval_status,
        });
        throw new Error('Questions must be approved before generating summary');
      }
      
      if (latestResearchData.video_approval_status !== 'approved') {
        logger.error('[Research] Video approval status check failed', {
          jobId,
          stage,
          expected: 'approved',
          actual: latestResearchData.video_approval_status,
        });
        throw new Error('Videos must be approved before generating summary');
      }
      
      const approvedQuestions = latestResearchData.generated_questions || [];
      const rawVideoResults = latestResearchData.raw_video_results || [];

      if (approvedVideos.length === 0) {
        throw new Error('No approved videos found');
      }
      
      if (approvedQuestions.length === 0) {
        throw new Error('No approved questions found');
      }

      updateJobStatus(jobId, 'processing' as JobStatus, {
        progress: progressPercentages.fetching_transcripts,
        research_data: {
          video_approval_status: 'approved',
        },
      });

      broadcastJobProgress(jobId, {
        status: 'fetching_transcripts' as any,
        progress: progressPercentages.fetching_transcripts,
        message: `Fetching transcripts for ${approvedVideos.length} videos...`,
      });

      const videoUrls = approvedVideos.map((v: SelectedVideo) => v.url);
      const transcriptResults = await fetchTranscriptsBatch(videoUrls);

      const successfulTranscripts = transcriptResults.filter(
        (result): result is TranscriptData => !('error' in result)
      );
      const failedTranscripts = transcriptResults.filter(
        (result): result is TranscriptError => 'error' in result
      );

      logger.info('[Research] Transcript fetching completed', {
        jobId,
        successful: successfulTranscripts.length,
        failed: failedTranscripts.length,
      });

      updateJobStatus(jobId, 'generating' as JobStatus, {
        progress: progressPercentages.transcripts_ready,
        research_data: {
          transcript_success_count: successfulTranscripts.length,
        },
      });

      broadcastJobProgress(jobId, {
        status: 'transcripts_ready' as any,
        progress: progressPercentages.transcripts_ready,
        message: `Fetched ${successfulTranscripts.length}/${approvedVideos.length} transcripts. Analyzing content style...`,
      });

      // Stage 5.5: Generate style guide (if enabled)
      let styleGuide = '';
      if (researchConfig.enable_style_guide) {
        try {
          logger.info('[Research] Starting style guide generation', {
            jobId,
            researchQuery,
            transcriptCount: successfulTranscripts.length,
            previewLength: researchConfig.style_guide_transcript_preview_length || 1000,
          });
          
          broadcastJobProgress(jobId, {
            status: 'generating_style_guide' as any,
            progress: progressPercentages.transcripts_ready + 2,
            message: 'Analyzing content to determine writing style...',
          });
          
          styleGuide = await generateStyleGuide(
            researchQuery,
            successfulTranscripts,
            language,
            approvedQuestions,
            jobId
          );
          
          // Log style guide generation result
          if (styleGuide && styleGuide.trim().length > 0) {
            logger.info('[Research] Style guide generation SUCCESSFUL', {
              jobId,
              styleGuideLength: styleGuide.length,
              styleGuidePreview: styleGuide.substring(0, 150) + '...',
            });
            
            // Save style guide to research data
            updateJobStatus(jobId, 'processing' as JobStatus, {
              research_data: {
                style_guide: styleGuide,
              },
            });
            
            logger.info('[Research] Style guide saved to research data', {
              jobId,
              styleGuideLength: styleGuide.length,
            });
          } else {
            logger.warn('[Research] Style guide generation returned empty result', {
              jobId,
              note: 'Continuing without style guide',
            });
          }
        } catch (error) {
          logger.error('[Research] Style guide generation FAILED with exception', {
            jobId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Continue without style guide if generation fails
        }
      } else {
        logger.info('[Research] Style guide generation disabled in config', { jobId });
      }

      broadcastJobProgress(jobId, {
        status: 'transcripts_ready' as any,
        progress: progressPercentages.transcripts_ready + 3,
        message: `Generating comprehensive summary...`,
      });

      // Generate citation map BEFORE summary generation starts
      // This allows frontend to initialize citation store before content streams
      const citationMap = generateCitationMap(approvedVideos, rawVideoResults);
      
      // Send citation metadata to frontend BEFORE streaming starts
      // Frontend needs this to render CitationBadge components correctly
      broadcastJobProgress(jobId, {
        status: 'citations:metadata' as any,
        progress: progressPercentages.transcripts_ready + 5,
        message: 'Initializing citations...',
        citation_metadata: citationMap,
      } as any);

      logger.info('[Research] Citation metadata sent to frontend', {
        jobId,
        citationCount: Object.keys(citationMap).length,
      });

      // Stage 6: Generate summary with streaming support
      // Follow batch summary pattern: check config, use streaming if enabled, fallback to simulated streaming
      const summaryStartProgress = progressPercentages.transcripts_ready;
      const summaryEndProgress = 100;
      let accumulatedChunkLength = 0;
      let chunkCount = 0;

      // Check if streaming is enabled in config (like batch summary does)
      const aiSettings = getAISettingsConfig();
      const isStreamingEnabled = aiSettings.stream;

      // Check if SSE connection is still alive before starting summary generation
      const activeConnections = getSSEConnectionCount(jobId);
      if (activeConnections === 0) {
        logger.warn('[Research] No active SSE connections before summary generation', {
          jobId,
          researchQuery,
          message: 'Frontend may have disconnected. Summary chunks may not be received.',
        });
      } else {
        logger.info('[Research] Active SSE connections before summary generation', {
          jobId,
          activeConnections,
        });
      }

      const onChunk = (chunk: string) => {
        accumulatedChunkLength += chunk.length;
        chunkCount += 1;
        
        const estimatedProgress = Math.min(
          summaryStartProgress + ((summaryEndProgress - summaryStartProgress - 5) * 
            Math.min(accumulatedChunkLength / 5000, 1)),
          95
        );
        
        broadcastJobProgress(jobId, {
          status: 'generating_summary',
          progress: Math.round(estimatedProgress),
          message: 'Generating research summary...',
          chunk,
          research_query: researchQuery,
        });

        logger.debug('[Research] Streaming chunk', {
          jobId,
          chunkCount,
          chunkLength: chunk.length,
          accumulatedLength: accumulatedChunkLength,
          progress: Math.round(estimatedProgress),
        });
      };

      let finalSummary = '';
      let streamingFailed = false;
      let streamingError: Error | null = null;

      try {
        // Use streaming if enabled in config (like batch summary)
        if (isStreamingEnabled) {
          logger.info('[Research] Starting streaming AI generation', {
            jobId,
            researchQuery,
            activeConnections,
          });
          
          logger.info('[Research] Calling generateResearchSummary with style guide', {
            jobId,
            hasStyleGuide: !!styleGuide && styleGuide.trim().length > 0,
            styleGuideLength: styleGuide ? styleGuide.length : 0,
          });
          
          // Note: citationMap is already generated above, but generateResearchSummary
          // generates it again internally. This is fine - it's idempotent.
          // We keep the one generated above for sending to frontend.
          finalSummary = await generateResearchSummary(
            researchQuery,
            successfulTranscripts,
            approvedVideos,
            language,
            approvedQuestions, // Pass questions to structure summary
            styleGuide, // Pass style guide for adaptive writing
            onChunk,
            rawVideoResults // Pass raw video results for citation metadata
          );
          
          // Check if streaming actually worked (no stream parse errors)
          // Note: generateResearchSummary throws on error, so if we get here, streaming succeeded
        } else {
          // Streaming disabled in config, use non-streaming mode (like batch summary)
          logger.info('[Research] Streaming disabled in config, using non-streaming mode', {
            jobId,
          });
          
          broadcastJobProgress(jobId, {
            status: 'generating_summary',
            progress: progressPercentages.generating_summary,
            message: 'Generating research summary...',
          });
          
          logger.info('[Research] Calling generateResearchSummary (non-streaming) with style guide', {
            jobId,
            hasStyleGuide: !!styleGuide && styleGuide.trim().length > 0,
            styleGuideLength: styleGuide ? styleGuide.length : 0,
          });
          
          finalSummary = await generateResearchSummary(
            researchQuery,
            successfulTranscripts,
            approvedVideos,
            language,
            approvedQuestions,
            styleGuide, // Pass style guide for adaptive writing
            undefined, // No onChunk callback for non-streaming mode
            rawVideoResults // Pass raw video results for citation metadata
          );
        }
      } catch (error) {
        const isStreamOrEmptyError = error instanceof Error && (
          (error as any).isStreamParseError ||
          error.message.includes('STREAM_PARSE_ERROR') ||
          error.message.includes('Stream parsing failed') ||
          error.message.includes('EMPTY_RESPONSE') ||
          error.message.includes('Empty response from AI service')
        );
        if (isStreamOrEmptyError) {
          streamingFailed = true;
          streamingError = error instanceof Error ? error : new Error(String(error));
          logger.warn('[Research] Streaming failed or empty response, will retry with non-streaming mode', {
            jobId,
            error: error instanceof Error ? error.message : String(error),
          });
        } else {
          throw error;
        }
      }

      // Fallback to non-streaming mode if streaming failed (like batch summary)
      if (streamingFailed && isStreamingEnabled) {
        logger.info('[Research] Falling back to non-streaming mode', {
          jobId,
          originalError: streamingError?.message,
        });
        
        broadcastJobProgress(jobId, {
          status: 'generating_summary',
          progress: progressPercentages.generating_summary,
          message: 'Generating summary (streaming unavailable)...',
        });
        
        logger.info('[Research] Calling generateResearchSummary (fallback) with style guide', {
          jobId,
          hasStyleGuide: !!styleGuide && styleGuide.trim().length > 0,
          styleGuideLength: styleGuide ? styleGuide.length : 0,
        });
        
        finalSummary = await generateResearchSummary(
          researchQuery,
          successfulTranscripts,
          approvedVideos,
          language,
          approvedQuestions,
          styleGuide, // Pass style guide for adaptive writing
          undefined, // No onChunk callback for fallback mode
          rawVideoResults // Pass raw video results for citation metadata
        );
      }

      // Only use simulated streaming if real streaming was disabled or failed (like batch summary)
      // Real streaming chunks are already forwarded via onChunk callback
      if (!isStreamingEnabled || streamingFailed) {
        // Fallback: Stream text chunks incrementally for real-time display
        // This simulates streaming by sending chunks with small delays
        try {
          logger.info('[Research] Using simulated streaming fallback', {
            jobId,
            reason: !isStreamingEnabled ? 'streaming disabled in config' : 'streaming failed',
          });
          await streamResearchSummaryChunks(
            jobId,
            finalSummary,
            summaryStartProgress,
            summaryEndProgress
          );
        } catch (error) {
          logger.warn('[Research] Error streaming text chunks, continuing with full text', {
            jobId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue even if streaming fails
        }
      } else {
        // Real streaming was used, chunks already forwarded
        logger.debug('[Research] Real streaming completed, skipping simulated streaming', {
          jobId,
          chunkCount,
          finalLength: finalSummary.length,
        });
      }

      // Log final confirmation that style guide was used
      logger.info('[Research] Summary generation completed - Style guide usage confirmation', {
        jobId,
        summaryLength: finalSummary.length,
        styleGuideWasUsed: !!styleGuide && styleGuide.trim().length > 0,
        styleGuideLength: styleGuide ? styleGuide.length : 0,
        styleGuideWillBeSaved: !!styleGuide && styleGuide.trim().length > 0,
      });
      
      // Create research document
      const processingTime = (Date.now() - startTime) / 1000;
      const processingStats: ResearchProcessingStats = {
        total_queries_generated: researchData.generated_search_terms?.length || 0,
        total_videos_searched: researchData.video_count || 0,
        total_videos_selected: approvedVideos.length,
        total_transcripts_fetched: successfulTranscripts.length,
        processing_time_seconds: processingTime,
        failed_transcripts_count: failedTranscripts.length,
      };

      const sourceTranscripts: SourceVideo[] = successfulTranscripts.map((t, index) => {
        const video = approvedVideos[index];
        return {
          url: t.url,
          title: t.title,
          channel: t.channel,
          thumbnail: t.thumbnail || video.thumbnail,
          duration_seconds: t.duration_seconds,
          word_count: t.word_count,
          was_pre_condensed: false,
          video_id: t.video_id,
        };
      });

      const researchDataForCreate: ResearchCreateData = {
        user_uid: userId,
        job_id: jobId,
        research_query: researchQuery,
        language,
        generated_queries: researchData.generated_search_terms || [],
        video_search_results: researchData.raw_video_results || [],
        selected_videos: approvedVideos,
        source_transcripts: sourceTranscripts,
        style_guide: styleGuide || undefined, // Save style guide if generated
        final_summary_text: finalSummary,
        citations: citationMap, // Save citation metadata to database
        citationUsage: {}, // TODO: Parse citation usage from summary text per section
        processing_stats: processingStats,
      };

      const research = await createResearch(researchDataForCreate);

      // Settle credits
      // Note: Credits were already reserved in processResearch()
      // We only need to refund if actual cost is less than estimated
      const estimatedCost = calculateResearchCost(researchConfig.target_selected_videos);
      const actualCost = calculateResearchCost(approvedVideos.length);
      
      if (userId && actualCost < estimatedCost) {
        const difference = estimatedCost - actualCost;
        try {
          await addCredits(userId, difference, 'refunded', {
            description: `Research job refund: ${researchQuery.substring(0, 50)}...`,
          });
          logger.info('[Research] Credits refunded', {
            userId,
            refundAmount: difference,
          });
        } catch (refundError) {
          logger.error('[Research] Failed to refund credits', {
            userId,
            error: refundError instanceof Error ? refundError.message : String(refundError),
          });
        }
      }

      updateJobStatus(jobId, 'completed', {
        progress: progressPercentages.completed,
      });

      const completedProgress: ResearchProgress = {
        status: 'completed',
        progress: progressPercentages.completed,
        message: 'Research completed successfully',
        citation_metadata: citationMap, // Include citations in final response
        citation_usage: {}, // TODO: Parse citation usage from summary text per section
        data: {
          _id: research.id || jobId,
          research_query: researchQuery,
          generated_queries: researchData.generated_search_terms || [],
          selected_videos: approvedVideos,
          final_summary_text: finalSummary,
          processing_stats: processingStats,
          citations: citationMap, // Include citations in data object
          citationUsage: {}, // TODO: Parse citation usage from summary text per section
          created_at: new Date(),
        },
      };

      broadcastJobProgress(jobId, completedProgress as any);

      logger.info('[Research] Research processing completed', {
        jobId,
        userId,
        researchId: research.id,
        processingTime: `${processingTime.toFixed(1)}s`,
      });

      return research.id || jobId;
    } else {
      throw new Error(`Invalid stage: ${stage}`);
    }
  } catch (error) {
    logger.error('[Research] Failed to continue research after approval', {
      jobId,
      stage,
      error: error instanceof Error ? error.message : String(error),
    });

    updateJobStatus(jobId, 'error', {
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    broadcastJobProgress(jobId, {
      status: 'error' as JobStatus,
      progress: 0,
      message: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as any);

    throw error;
  }
}
