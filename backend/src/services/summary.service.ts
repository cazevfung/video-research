/**
 * Summary service - Core pipeline
 * Implements Fail-All validation, Smart Context logic, and final summary generation
 */

import {
  fetchTranscriptsBatch,
  getVideoMetadata,
  TranscriptData,
  TranscriptError,
} from './transcript.service';
import {
  callQwenPlus,
  callQwenMax,
  estimateTokens,
  AIResult,
  generateTitle,
} from './ai.service';
import {
  validateYouTubeUrls,
  deduplicateUrls,
  ValidationError,
  extractVideoId,
} from '../utils/validators';
import {
  generateCitationMap,
  formatCitationPromptContext,
} from './citation-mapper.service';
import { SelectedVideo } from '../models/Research';
import {
  getFinalSummaryPrompt,
  injectContentIntoPrompt,
  PresetStyle,
} from '../prompts';
import {
  createSummary,
  SourceVideo,
  ProcessingStats,
  SummaryCreateData,
  updateSummaryTitle,
  Summary,
} from '../models/Summary';
import { getUserById } from '../models/User';
import { UserTier } from '../types/credit.types';
import { updateJobStatus, broadcastJobProgress } from './job.service';
import { deductCredits } from './credit.service'; // Credit system (Phase 5 - legacy removed)
import { trackBatchCost, calculateBatchCost } from './cost-tracking.service'; // Cost tracking (Phase 3)
import { getBatchPrice } from './pricing.service'; // Pricing service (Phase 3)
import {
  getLimitsConfig,
  getAIModelsConfig,
  getAISettingsConfig,
  getSummaryConfig,
  getAPIConfig,
} from '../config';
import { SummaryRequest, SummaryProgress } from '../types/summary.types';
import { ensureVideoUploadDate } from '../constants/dates';
import logger from '../utils/logger';

/**
 * Progress callback type for SSE updates
 */
export type ProgressCallback = (progress: SummaryProgress) => void;

/**
 * Stream text chunks incrementally via SSE
 * Simulates streaming by splitting text into chunks and sending them with delays
 * @param jobId Job ID
 * @param text Full text to stream
 * @param generatingProgress Progress percentage when generation starts
 * @param completedProgress Progress percentage when completed
 */
async function streamTextChunks(
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
      status: 'generating',
      progress: Math.min(progress, completedProgress - 1), // Don't reach 100% until done
      message: streamingConfig.generating_final_message,
      chunk: chunk,
    });

    // Small delay between chunks to simulate streaming
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Generate batch title from videos
 */
function generateBatchTitle(
  videos: Array<{ title: string }>,
  customTitle?: string
): string {
  const summaryConfig = getSummaryConfig();
  if (customTitle && customTitle.trim().length > 0) {
    // Sanitize and truncate custom title
    const sanitized = customTitle.trim().substring(0, summaryConfig.batch_title_max_length);
    return sanitized;
  }

  if (videos.length === 0) {
    return 'Summary Batch';
  }

  if (videos.length === 1) {
    const title = videos[0].title || 'Video';
    return `${title} - Summary`;
  }

  // Multiple videos
  const firstTitle = videos[0].title || 'Video';
  if (videos.length === 2) {
    return `Summary: ${firstTitle} and 1 more`;
  }

  return `Summary of ${videos.length} Videos`;
}

/**
 * Process a batch of YouTube URLs into a summary
 * @param userId User ID (can be null if auth disabled or guest)
 * @param request Summary request
 * @param jobId Job ID for tracking
 * @param isGuest Whether this is a guest user
 * @param guestSessionId Guest session ID (if guest)
 * @param progressCallback Optional callback for progress updates
 * @returns Summary document ID
 */
export async function processBatch(
  userId: string | null,
  request: SummaryRequest,
  jobId: string,
  isGuest?: boolean,
  guestSessionId?: string | null,
  progressCallback?: ProgressCallback
): Promise<string> {
  const startTime = Date.now();
  let totalTokensUsed = 0;
  const summaryConfig = getSummaryConfig();
  const progressPercentages = summaryConfig.progress_percentages;
  
  // Phase 3: Cost tracking variables
  let finalSummaryTokens = { input: 0, output: 0 };
  let firebaseOps = { writes: 0, reads: 0, storageBytes: 0 };
  let transcriptCount = 0;
  let aiModel: 'qwen-plus' | 'qwen-max' | 'qwen-flash' = 'qwen-plus';

  logger.info(`[Summary Service] Starting batch processing`, {
    jobId,
    userId,
    urlCount: request.urls.length,
    urls: request.urls,
    preset: request.preset,
    language: request.language,
    customPrompt: request.custom_prompt ? `${request.custom_prompt.substring(0, 100)}...` : undefined,
  });

  try {
    // Step 1: Fail-All Validation - URL Validation
    logger.jobEvent(jobId, 'batch_processing_started', 'processing', {
      userId,
      urlCount: request.urls.length,
      preset: request.preset,
      language: request.language,
    });

    // Broadcast progress update
    broadcastJobProgress(jobId, {
      status: 'fetching',
      progress: progressPercentages.validation,
      message: 'Validating URLs...',
    });
    
    if (progressCallback) {
      progressCallback({
        status: 'fetching',
        progress: progressPercentages.validation,
        message: 'Validating URLs...',
      });
    }

    // Deduplicate URLs
    const uniqueUrls = deduplicateUrls(request.urls);
    if (uniqueUrls.length !== request.urls.length) {
      logger.info(`Deduplicated ${request.urls.length - uniqueUrls.length} duplicate URLs`);
    }

    // Validate all URLs upfront
    const urlValidation = validateYouTubeUrls(uniqueUrls);
    if (!urlValidation.valid) {
      const errorMessages = urlValidation.errors
        .map((err: ValidationError) => err.message)
        .join('; ');
      throw new Error(`Invalid URLs: ${errorMessages}`);
    }

    // Step 2: Fail-All Validation - Fetch All Transcripts
    broadcastJobProgress(jobId, {
      status: 'fetching',
      progress: progressPercentages.fetching,
      message: `Fetching transcripts for ${uniqueUrls.length} videos...`,
    });
    
    if (progressCallback) {
      progressCallback({
        status: 'fetching',
        progress: progressPercentages.fetching,
        message: `Fetching transcripts for ${uniqueUrls.length} videos...`,
      });
    }

    updateJobStatus(jobId, 'fetching', { progress: progressPercentages.fetching });

    const transcriptResults = await fetchTranscriptsBatch(uniqueUrls);

    // Separate successful and failed transcripts
    const successfulTranscripts = transcriptResults.filter(
      (result): result is TranscriptData => !('error' in result)
    );
    const failedTranscripts = transcriptResults.filter(
      (result): result is TranscriptError => 'error' in result
    );
    
    // Phase 3: Track transcript count for cost calculation
    transcriptCount = successfulTranscripts.length;

    // Check success rate - only fail if below threshold
    const limits = getLimitsConfig();
    const minSuccessRate = limits.min_transcript_success_rate;
    const successRate = uniqueUrls.length > 0 ? successfulTranscripts.length / uniqueUrls.length : 0;

    if (successfulTranscripts.length === 0) {
      // No successful transcripts at all - fail the batch
      const failedUrl = failedTranscripts[0]?.url || 'unknown';
      const errorMessage = failedTranscripts[0]?.error || 'Failed to fetch transcript';
      throw new Error(`Batch failed: No valid transcripts found. ${failedTranscripts.length} video(s) failed. First error: ${failedUrl} - ${errorMessage}`);
    }

    if (successRate < minSuccessRate) {
      // Success rate too low - fail the batch
      const failedUrls = failedTranscripts.map(f => f.url).join(', ');
      throw new Error(
        `Batch failed: Too many videos failed to fetch transcript. ` +
        `Success rate: ${(successRate * 100).toFixed(1)}% (${successfulTranscripts.length}/${uniqueUrls.length} succeeded). ` +
        `Minimum required: ${(minSuccessRate * 100).toFixed(1)}%. ` +
        `Failed videos: ${failedUrls}`
      );
    }

    // Log warnings for failed videos but continue processing
    if (failedTranscripts.length > 0) {
      logger.warn(`Some videos failed to fetch transcript, continuing with successful ones`, {
        total: uniqueUrls.length,
        successful: successfulTranscripts.length,
        failed: failedTranscripts.length,
        successRate: `${(successRate * 100).toFixed(1)}%`,
        failedUrls: failedTranscripts.map(f => ({ url: f.url, error: f.error })),
      });
    }

    logger.info(`Successfully fetched ${successfulTranscripts.length}/${uniqueUrls.length} transcripts (${(successRate * 100).toFixed(1)}% success rate)`);

    /**
     * Phase 2: Generate quick title from transcripts (non-blocking)
     * 
     * This generates an AI-powered title immediately after transcripts are fetched,
     * providing users with early feedback. The title is generated using qwen-flash
     * model with the first 2000 characters of combined transcripts to save tokens.
     * 
     * Error handling: If title generation fails, we continue with default title
     * generation. This ensures title generation never blocks summary processing.
     * 
     * @param jobId - Job ID for logging and broadcasting
     * @param successfulTranscripts - Array of successfully fetched transcripts
     * @param progressCallback - Optional callback for progress updates
     */
    // Generate quick title from transcripts (non-blocking)
    let quickTitle: string | null = null;
    try {
      logger.info('[Summary Service] Generating quick title from transcripts', { jobId });
      
      // Combine all transcripts with video titles for context
      const allTranscriptText = successfulTranscripts
        .map(t => `${t.title}: ${t.transcript_text}`)
        .join('\n\n');
      
      quickTitle = await generateTitle(allTranscriptText, 'transcripts', request.language);
      
      if (quickTitle) {
        logger.info('[Summary Service] Quick title generated', { jobId, title: quickTitle });
        
        // Broadcast title update to clients via SSE
        // Title can be updated at any point during processing
        broadcastJobProgress(jobId, {
          status: 'fetching', // Keep current status (still in fetching phase)
          progress: progressPercentages.fetching, // Current progress
          message: 'Processing transcripts...', // Current message
          title: quickTitle, // AI-generated quick title
        });
        
        if (progressCallback) {
          progressCallback({
            status: 'fetching',
            progress: progressPercentages.fetching,
            message: 'Processing transcripts...',
            title: quickTitle,
          });
        }
      } else {
        logger.warn('[Summary Service] Quick title generation returned null', { jobId });
      }
    } catch (titleError) {
      logger.warn('[Summary Service] Quick title generation failed, continuing', {
        jobId,
        error: titleError instanceof Error ? titleError.message : String(titleError),
      });
      // Don't fail the whole process if title generation fails
      // Will fallback to default title generation when creating summary
    }

    // Step 3: Smart Context Logic - Pre-condense long videos
    broadcastJobProgress(jobId, {
      status: 'processing',
      progress: progressPercentages.processing_start,
      message: 'Processing videos...',
    });
    
    if (progressCallback) {
      progressCallback({
        status: 'processing',
        progress: progressPercentages.processing_start,
        message: 'Processing videos...',
      });
    }

    updateJobStatus(jobId, 'processing', { progress: progressPercentages.processing_start });

    const finalContextBuffer: string[] = [];
    const sourceVideos: SourceVideo[] = [];

    for (let i = 0; i < successfulTranscripts.length; i++) {
      const transcript = successfulTranscripts[i];
      
      // Edge case: Handle empty transcript
      if (!transcript.transcript_text || transcript.transcript_text.trim().length === 0) {
        logger.warn(`Empty transcript for video: ${transcript.title}`, {
          url: transcript.url,
          duration: transcript.duration_seconds,
        });
        // Skip video with empty transcript but continue processing others
        // Add minimal metadata to context
        finalContextBuffer.push(
          `\n\n--- Video: ${transcript.title} ---\n\n[No transcript available for this video]`
        );
        sourceVideos.push({
          url: transcript.url,
          title: transcript.title,
          channel: transcript.channel,
          thumbnail: transcript.thumbnail,
          duration_seconds: transcript.duration_seconds,
          word_count: 0,
          was_pre_condensed: false,
          video_id: transcript.video_id,
          upload_date: transcript.upload_date,
        });
        continue;
      }

      // Edge case: Handle very short videos
      const durationMinutes = transcript.duration_seconds / 60;
      const shortVideoThreshold = limits.short_video_threshold_minutes;
      if (durationMinutes < shortVideoThreshold) {
        logger.info(`Very short video detected: ${transcript.title} (${durationMinutes.toFixed(2)} minutes)`, {
          url: transcript.url,
          word_count: transcript.word_count,
        });
        // Process normally but log for monitoring
      }

      // Use original transcript (no condensing)
      const processedText = transcript.transcript_text;

      // Add video separator and content to buffer
      finalContextBuffer.push(
        `\n\n--- Video: ${transcript.title} ---\n\n${processedText}`
      );

      // Build source video metadata (preserve upload_date from transcript/Supadata)
      sourceVideos.push({
        url: transcript.url,
        title: transcript.title,
        channel: transcript.channel,
        thumbnail: transcript.thumbnail,
        duration_seconds: transcript.duration_seconds,
        word_count: transcript.word_count,
        was_pre_condensed: false, // Condensing disabled
        video_id: transcript.video_id,
        upload_date: transcript.upload_date,
      });
    }

    // Step 4: Context Window Check
    const aggregatedContent = finalContextBuffer.join('');
    const estimatedTokens = estimateTokens(aggregatedContent);

    logger.info('Context window check', {
      estimated_tokens: estimatedTokens,
      max_tokens: limits.max_context_tokens,
    });

    // Use aggregated content directly (no condensing)
    const finalContent = aggregatedContent;

    // Step 5: Final Summary Generation
    broadcastJobProgress(jobId, {
      status: 'aggregating',
      progress: progressPercentages.aggregating,
      message: 'Combining transcripts...',
    });
    
    if (progressCallback) {
      progressCallback({
        status: 'aggregating',
        progress: progressPercentages.aggregating,
        message: 'Combining transcripts...',
      });
    }

    updateJobStatus(jobId, 'aggregating', { progress: progressPercentages.aggregating });

    // Determine which model to use based on user tier
    let userTier: UserTier = 'free';
    if (userId) {
      try {
        const user = await getUserById(userId);
        if (user) {
          userTier = user.tier;
        }
      } catch (error) {
        logger.warn('Failed to get user tier, defaulting to free', { error });
      }
    }

    // Build citation instructions when we have source videos (numbered [1], [2], Sources subsection)
    // Backfill missing upload_date so Sources never show "Unknown" (metadata may have failed during transcript fetch)
    if (sourceVideos.length > 0) {
      const needBackfill = sourceVideos.filter(
        (v) => v.upload_date == null || String(v.upload_date).trim() === ''
      );
      if (needBackfill.length > 0) {
        const backfillResults = await Promise.all(
          needBackfill.map(async (v) => {
            const meta = await getVideoMetadata(v.url);
            return { video: v, upload_date: meta?.upload_date };
          })
        );
        for (const { video, upload_date } of backfillResults) {
          if (upload_date) {
            video.upload_date = upload_date;
            logger.info('[Summary] Backfilled upload_date for citation', {
              url: video.url,
              title: video.title,
              upload_date,
            });
          }
        }
      }
    }

    let citationInstructions: string | undefined;
    if (sourceVideos.length > 0) {
      const selectedVideosForCitation: SelectedVideo[] = sourceVideos.map((v) => ({
        video_id: v.video_id || extractVideoId(v.url) || `url-${v.url}`,
        title: v.title,
        channel: v.channel,
        thumbnail: v.thumbnail,
        duration_seconds: v.duration_seconds,
        url: v.url,
        upload_date: ensureVideoUploadDate(v.upload_date),
        classification: 'Direct',
        why_selected: '',
        fills_gap: '',
      }));
      const citationMap = generateCitationMap(selectedVideosForCitation);
      const citationContext = formatCitationPromptContext(citationMap, request.language);
      citationInstructions = citationContext.citationInstructions;
    }

    // Build final prompt template (instructions only)
    const promptTemplate = getFinalSummaryPrompt({
      presetStyle: request.preset,
      customPrompt: request.custom_prompt,
      language: request.language,
      citationInstructions,
    });

    // Combine prompt template with transcript content into single message
    const combinedPrompt = injectContentIntoPrompt(promptTemplate, finalContent);

    // Get model names from config
    const modelsConfig = getAIModelsConfig();
    const aiSettings = getAISettingsConfig();
    const apiConfig = getAPIConfig();
    // Use premium model for starter, pro, and premium tiers
    const usePremiumModel = userTier !== 'free';
    const modelName = usePremiumModel ? modelsConfig.premium_summary : modelsConfig.default_summary;
    
    // Phase 3: Track AI model for cost calculation
    aiModel = usePremiumModel ? 'qwen-max' : 'qwen-plus';
    
    // Get streaming configuration
    const streamingConfig = summaryConfig.sse_streaming;
    
    // Send source_videos in progress event so frontend can display them during streaming
    broadcastJobProgress(jobId, {
      status: 'generating',
      progress: progressPercentages.generating,
      message: streamingConfig.generating_final_message,
      source_videos: sourceVideos.map(v => ({
        url: v.url,
        title: v.title,
        channel: v.channel,
        thumbnail: v.thumbnail,
        duration_seconds: v.duration_seconds,
        was_pre_condensed: v.was_pre_condensed,
        upload_date: v.upload_date,
      })),
    });

    if (progressCallback) {
      progressCallback({
        status: 'generating',
        progress: progressPercentages.generating,
        message: streamingConfig.generating_final_message,
        source_videos: sourceVideos.map(v => ({
          url: v.url,
          title: v.title,
          channel: v.channel,
          thumbnail: v.thumbnail,
          duration_seconds: v.duration_seconds,
          was_pre_condensed: v.was_pre_condensed,
          upload_date: v.upload_date,
        })),
      });
    }

    updateJobStatus(jobId, 'generating', { progress: progressPercentages.generating });

    // Calculate request sizes (single combined message)
    const combinedPromptLength = combinedPrompt.length;
    const estimatedTotalTokens = estimateTokens(combinedPrompt);
    
    // Calculate individual component sizes for error reporting
    const systemPromptLength = promptTemplate.length;
    const userContentLength = finalContent.length;
    const totalRequestLength = combinedPromptLength;

    logger.info(`[Summary Service] Starting AI generation`, {
      jobId,
      userTier,
      model: modelName,
      requestDetails: {
        combinedPromptLength,
        totalRequestLength: combinedPromptLength,
      },
      tokenEstimates: {
        estimatedTotalTokens,
      },
      aiSettings: {
        temperature: aiSettings.temperature,
        maxTokens: aiSettings.max_tokens_default,
        stream: aiSettings.stream,
      },
      apiConfig: {
        timeoutMs: apiConfig.dashscope.timeout_ms,
        maxRetries: apiConfig.dashscope.max_retries,
        baseUrl: apiConfig.dashscope.base_url,
      },
      requestStructure: {
        messagesFormat: 'OpenAI-compatible',
        singleUserMessage: {
          role: 'user',
          contentLength: combinedPrompt.length,
          preview: combinedPrompt.substring(0, 200) + (combinedPrompt.length > 200 ? '...' : ''),
        },
      },
    });

    // Track timing for the AI call
    const aiCallStartTime = Date.now();
    
    // Check if streaming is enabled
    const isStreamingEnabled = aiSettings.stream;
    
    // Track streaming state for progress calculation
    let chunkCount = 0;
    let accumulatedContentLength = 0;
    const estimatedOutputTokens = aiSettings.max_tokens_default;
    const estimatedOutputLength = estimatedOutputTokens * streamingConfig.chars_per_token_estimate;
    
    // Create onChunk callback for streaming chunks
    const onChunk = (chunk: string): void => {
      if (!chunk || chunk.trim().length === 0) {
        return; // Ignore empty chunks
      }
      
      chunkCount++;
      accumulatedContentLength += chunk.length;
      
      // Calculate progress: start at generating percentage, increment during streaming
      // Progress calculation based on accumulated content length vs estimated output
      const streamingProgressRange = progressPercentages.completed - progressPercentages.generating;
      const progressRatio = Math.min(
        accumulatedContentLength / estimatedOutputLength,
        streamingConfig.progress_cap_ratio // Cap at configured ratio until completion
      );
      const currentProgress = Math.min(
        progressPercentages.generating + (streamingProgressRange * progressRatio * streamingConfig.progress_range_multiplier),
        progressPercentages.completed - 1 // Don't reach 100% until completion
      );
      
      // Format progress event with chunk data
      const progressEvent: SummaryProgress = {
        status: 'generating',
        progress: Math.round(currentProgress),
        chunk: chunk,
        message: streamingConfig.generating_message,
      };
      
      // Forward chunk via broadcastJobProgress
      broadcastJobProgress(jobId, progressEvent);
      
      // Also call progressCallback if provided
      if (progressCallback) {
        progressCallback(progressEvent);
      }
      
      logger.debug(`[Summary Service] Streaming chunk ${chunkCount}`, {
        jobId,
        chunkLength: chunk.length,
        accumulatedLength: accumulatedContentLength,
        progress: Math.round(currentProgress),
      });
    };
    
    let aiResult: AIResult | undefined;
    let streamingFailed = false;
    let streamingError: Error | null = null;
    
    try {
      // Call appropriate model based on tier with streaming callback
      if (isStreamingEnabled) {
        try {
          logger.info(`[Summary Service] Starting streaming AI generation`, {
            jobId,
            userTier,
            model: modelName,
          });
          
          aiResult =
            usePremiumModel
              ? await callQwenMax(combinedPrompt, onChunk)
              : await callQwenPlus(combinedPrompt, onChunk);
          
          // Check if streaming actually worked (no stream parse errors)
          if ('error' in aiResult && aiResult.error_code === 'STREAM_PARSE_ERROR') {
            streamingFailed = true;
            streamingError = new Error(aiResult.error);
            logger.warn(`[Summary Service] Streaming failed, will retry with non-streaming mode`, {
              jobId,
              error: aiResult.error,
            });
          }
        } catch (streamError) {
          // Catch streaming-specific errors
          streamingFailed = true;
          streamingError = streamError instanceof Error ? streamError : new Error(String(streamError));
          logger.warn(`[Summary Service] Streaming error caught, will retry with non-streaming mode`, {
            jobId,
            error: streamingError.message,
          });
        }
      } else {
        // Streaming disabled in config, use non-streaming mode
        logger.info(`[Summary Service] Streaming disabled in config, using non-streaming mode`, {
          jobId,
        });
        aiResult =
          usePremiumModel
            ? await callQwenMax(combinedPrompt)
            : await callQwenPlus(combinedPrompt);
      }
      
      // Fallback to non-streaming mode if streaming failed
      if (streamingFailed && isStreamingEnabled) {
        logger.info(`[Summary Service] Falling back to non-streaming mode`, {
          jobId,
          originalError: streamingError?.message,
        });
        
        // Notify frontend about fallback
        const fallbackMessage = streamingConfig.streaming_unavailable_message;
        broadcastJobProgress(jobId, {
          status: 'generating',
          progress: progressPercentages.generating,
          message: fallbackMessage,
        });
        
        if (progressCallback) {
          progressCallback({
            status: 'generating',
            progress: progressPercentages.generating,
            message: fallbackMessage,
          });
        }
        
        // Retry with non-streaming mode
        aiResult =
          usePremiumModel
            ? await callQwenMax(combinedPrompt)
            : await callQwenPlus(combinedPrompt);
      }
      
      const aiCallDuration = Date.now() - aiCallStartTime;
      logger.info(`[Summary Service] AI call completed`, {
        jobId,
        model: modelName,
        durationMs: aiCallDuration,
        durationSeconds: (aiCallDuration / 1000).toFixed(2),
        success: aiResult ? !('error' in aiResult) : false,
      });
    } catch (error) {
      const aiCallDuration = Date.now() - aiCallStartTime;
      logger.error(`[Summary Service] AI call threw exception`, {
        jobId,
        model: modelName,
        durationMs: aiCallDuration,
        durationSeconds: (aiCallDuration / 1000).toFixed(2),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      throw error;
    }

    if (!aiResult) {
      throw new Error('AI result is undefined');
    }

    if ('error' in aiResult) {
      const aiCallDuration = Date.now() - aiCallStartTime;
      
      // Determine failure type for better error messaging
      const errorCode = aiResult.error_code || 'UNKNOWN_ERROR';
      let failureType = 'Unknown error';
      let failureDetails = '';
      
      switch (errorCode) {
        case 'TIMEOUT':
          failureType = 'Timeout';
          failureDetails = `Request exceeded timeout of ${apiConfig.dashscope.timeout_ms}ms after ${aiCallDuration}ms`;
          break;
        case 'RATE_LIMIT':
          failureType = 'Rate limit exceeded';
          failureDetails = 'API rate limit was exceeded. Please try again later.';
          break;
        case 'AUTH_ERROR':
          failureType = 'Authentication failed';
          failureDetails = 'API key authentication failed. Please check API key configuration.';
          break;
        case 'NETWORK_ERROR':
        case 'CONNECTION_REFUSED':
        case 'DNS_ERROR':
        case 'CONNECTION_RESET':
          failureType = 'Network error';
          failureDetails = `Network request failed after ${aiCallDuration}ms. Check detailed logs above for connection status (was connection established? was request sent? did we get HTTP response?)`;
          break;
        case 'CONTEXT_LENGTH_EXCEEDED':
        case 'ContextLengthExceeded':
          failureType = 'Context window exceeded';
          failureDetails = `Content (${estimatedTotalTokens} estimated tokens) exceeds model context window`;
          break;
        case 'EMPTY_RESPONSE':
          failureType = 'Empty response';
          failureDetails = 'AI service returned empty response';
          break;
        default:
          failureDetails = aiResult.error || 'Unknown error occurred';
      }

      logger.error(`[Summary Service] AI generation failed`, {
        jobId,
        userTier,
        model: aiResult.model,
        failureType,
        errorCode,
        errorMessage: aiResult.error,
        failureDetails,
        timing: {
          durationMs: aiCallDuration,
          durationSeconds: (aiCallDuration / 1000).toFixed(2),
          timeoutMs: apiConfig.dashscope.timeout_ms,
          exceededTimeout: aiCallDuration >= apiConfig.dashscope.timeout_ms,
        },
        requestDetails: {
          systemPromptLength,
          userContentLength,
          totalRequestLength,
          estimatedInputTokens: estimatedTotalTokens,
          estimatedContextTokens: estimatedTotalTokens,
        },
        apiConfig: {
          baseUrl: apiConfig.dashscope.base_url,
          timeoutMs: apiConfig.dashscope.timeout_ms,
          maxRetries: apiConfig.dashscope.max_retries,
        },
      });
      
      // Build comprehensive error message with all diagnostics
      const errorMessageParts = [
        `AI generation failed (${failureType})`,
        failureDetails,
        `Error code: ${errorCode}`,
        `Model: ${aiResult.model}`,
        `Duration: ${(aiCallDuration / 1000).toFixed(2)}s`,
        `Request size: ${totalRequestLength} chars (${estimatedTotalTokens} est. tokens)`,
      ];
      
      // Throw error with detailed information
      throw new Error(errorMessageParts.join('. '));
    }

    const finalSummaryText = aiResult.content;
    if (aiResult.tokens_used) {
      totalTokensUsed += aiResult.tokens_used;
    }
    
    // Phase 3: Track final summary tokens for cost calculation
    finalSummaryTokens.input = estimatedTotalTokens;
    finalSummaryTokens.output = estimateTokens(finalSummaryText);

    /**
     * Phase 4: Generate refined title from summary (non-blocking)
     * 
     * After the final summary is generated, we create a refined title using the
     * full summary text. This title is more contextually aware than the quick title
     * since it's based on the complete summary rather than just transcripts.
     * 
     * The refined title replaces the quick title in the database and is broadcast
     * to clients. If refined title generation fails, we keep the quick title.
     * 
     * Error handling: If title generation fails, we keep the quick title (if available)
     * or fallback to default title. This ensures title generation never blocks
     * summary completion.
     * 
     * @param jobId - Job ID for logging and broadcasting
     * @param finalSummaryText - Complete summary text for title generation
     * @param summaryId - Summary document ID for updating title in database
     * @param quickTitle - Quick title to use as fallback if refined generation fails
     * @param summaryData - Summary data for completion event
     * @param progressCallback - Optional callback for progress updates
     */
    // Phase 4: Generate refined title from summary (non-blocking)
    let refinedTitle: string | null = null;
    try {
      logger.info('[Summary Service] Generating refined title from summary', { jobId });
      
      refinedTitle = await generateTitle(finalSummaryText, 'summary', request.language);
      
      if (refinedTitle) {
        logger.info('[Summary Service] Refined title generated', { jobId, title: refinedTitle });
        // Title will be updated after summary is created (see line 999)
      } else {
        logger.warn('[Summary Service] Refined title generation returned null', { jobId });
        // Will keep quick title or use default title
      }
    } catch (titleError) {
      logger.warn('[Summary Service] Refined title generation failed, continuing', {
        jobId,
        error: titleError instanceof Error ? titleError.message : String(titleError),
      });
      // Don't fail the whole process if title generation fails
      // Will keep quick title or use default title
    }

    // Only use simulated streaming if real streaming was disabled or failed
    // Real streaming chunks are already forwarded via onChunk callback
    if (!isStreamingEnabled || streamingFailed) {
      // Fallback: Stream text chunks incrementally for real-time display
      // This simulates streaming by sending chunks with small delays
      try {
        logger.info(`[Summary Service] Using simulated streaming fallback`, {
          jobId,
          reason: !isStreamingEnabled ? 'streaming disabled in config' : 'streaming failed',
        });
        await streamTextChunks(
          jobId,
          finalSummaryText,
          progressPercentages.generating,
          progressPercentages.completed
        );
      } catch (error) {
        logger.warn('Error streaming text chunks, continuing with full text', {
          error,
        });
        // Continue even if streaming fails
      }
    } else {
      // Real streaming was used, chunks already forwarded
      logger.debug(`[Summary Service] Real streaming completed, skipping simulated streaming`, {
        jobId,
        chunkCount,
        finalLength: finalSummaryText.length,
      });
    }

    // Step 6: Save to Database
    const batchTitle = quickTitle || generateBatchTitle(sourceVideos);

    const processingStats: ProcessingStats = {
      total_videos: sourceVideos.length,
      total_tokens_used: totalTokensUsed,
      processing_time_seconds: Math.round((Date.now() - startTime) / 1000),
      failed_videos_count: failedTranscripts.length > 0 ? failedTranscripts.length : undefined,
    };

    const summaryData: SummaryCreateData = {
      user_uid: userId, // userId should now be Firebase Auth UID (stable identifier)
      job_id: jobId,
      batch_title: batchTitle,
      source_videos: sourceVideos,
      user_prompt_focus: request.custom_prompt,
      preset_style: request.preset,
      final_summary_text: finalSummaryText,
      language: request.language,
      processing_stats: processingStats,
    };

    // For guest users, store in guest storage instead of regular database
    if (isGuest && guestSessionId) {
      // Import guest summary service
      const { storeGuestSummary } = await import('./guest-summary.service');
      const { incrementGuestSummaryCount } = await import('./guest-session.service');
      
      // Create summary object for guest storage (matching Summary type)
      const guestSummaryObj: Summary = {
        id: jobId,
        user_id: null,
        user_uid: null,
        job_id: jobId,
        batch_title: batchTitle,
        source_videos: sourceVideos,
        user_prompt_focus: request.custom_prompt,
        preset_style: request.preset,
        final_summary_text: finalSummaryText,
        language: request.language,
        processing_stats: processingStats,
        created_at: new Date(),
      };
      
      // Store in guest storage
      storeGuestSummary(guestSessionId, jobId, guestSummaryObj);
      
      // Increment guest summary count
      incrementGuestSummaryCount(guestSessionId);
      
      logger.info('Stored guest summary', {
        sessionId: guestSessionId,
        jobId,
        summaryId: jobId,
      });
      
      // Update job status with guest summary ID
      updateJobStatus(jobId, 'completed', {
        progress: progressPercentages.completed,
        summary_id: jobId, // Use jobId as summary ID for guests
      });
      
      // Broadcast completion with guest summary data
      const completedProgress = {
        status: 'completed' as const,
        progress: progressPercentages.completed,
        message: 'Summary completed successfully',
        title: refinedTitle || quickTitle || batchTitle,
        data: {
          _id: jobId,
          user_id: null,
          batch_title: refinedTitle || quickTitle || batchTitle,
          source_videos: guestSummaryObj.source_videos.map((v: SourceVideo) => ({
            url: v.url,
            title: v.title,
            channel: v.channel,
            thumbnail: v.thumbnail,
            duration_seconds: v.duration_seconds,
            was_pre_condensed: v.was_pre_condensed,
            upload_date: v.upload_date,
          })),
          user_prompt_focus: guestSummaryObj.user_prompt_focus,
          preset_style: guestSummaryObj.preset_style,
          final_summary_text: guestSummaryObj.final_summary_text,
          language: guestSummaryObj.language,
          processing_stats: guestSummaryObj.processing_stats,
          created_at: typeof guestSummaryObj.created_at === 'string' 
            ? guestSummaryObj.created_at 
            : guestSummaryObj.created_at.toISOString(),
        },
      };
      
      broadcastJobProgress(jobId, completedProgress);
      
      if (progressCallback) {
        progressCallback(completedProgress);
      }
      
      const processingTime = Date.now() - startTime;
      logger.performance('batch_processing', processingTime, {
        jobId,
        userId: `guest:${guestSessionId}`,
        summaryId: jobId,
        urlCount: request.urls.length,
        totalTokensUsed,
      });
      
      logger.jobEvent(jobId, 'batch_processing_completed', 'completed', {
        userId: `guest:${guestSessionId}`,
        summaryId: jobId,
        processingTimeMs: processingTime,
        totalTokensUsed,
      });
      
      return jobId;
    }
    
    // For authenticated users, save to database
    const summary = await createSummary(summaryData);
    
    // Phase 3: Track Firebase operations for cost calculation
    // Estimate: 1 write for summary document, 1 read for user document, ~10KB storage per summary
    firebaseOps.writes += 1; // Summary document write
    firebaseOps.reads += 1; // User document read (if needed)
    firebaseOps.storageBytes += Math.max(10000, finalSummaryText.length * 2); // Estimate ~10KB per summary (UTF-16 encoding)

    // Phase 4: Update summary document with refined title (or quick title as fallback)
    const finalTitle = refinedTitle || quickTitle || batchTitle;
    if (summary.id && (refinedTitle || quickTitle)) {
      try {
        await updateSummaryTitle(summary.id, finalTitle);
        firebaseOps.writes += 1; // Title update write
        logger.debug('[Summary Service] Updated summary document with title', {
          jobId,
          summaryId: summary.id,
          title: finalTitle,
          titleType: refinedTitle ? 'refined' : quickTitle ? 'quick' : 'default',
        });
      } catch (updateError) {
        logger.warn('[Summary Service] Failed to update summary document with title, continuing', {
          jobId,
          summaryId: summary.id,
          error: updateError instanceof Error ? updateError.message : String(updateError),
        });
        // Don't fail the whole process if title update fails
      }
    }

    // Step 7: Phase 3 - Deduct Credits and Track Costs (only after successful completion)
    if (userId) {
      try {
        // Calculate credit cost for this batch
        const creditCost = await getBatchPrice(request.urls.length);
        
        // Deduct credits using new credit service
        await deductCredits(userId, creditCost, {
          batchId: summary.id || jobId,
          description: `Batch processing: ${request.urls.length} video(s)`,
        });
        logger.info('Credits deducted after successful summary', { 
          userId, 
          creditsDeducted: creditCost,
          batchId: summary.id,
        });
        
        // Calculate and track batch costs
        const costBreakdown = calculateBatchCost(
          transcriptCount,
          finalSummaryTokens,
          firebaseOps,
          aiModel
        );
        
        // Track batch costs in Firestore
        await trackBatchCost(
          summary.id || jobId,
          userId,
          costBreakdown,
          creditCost
        );
        
        logger.info('Batch costs tracked', {
          batchId: summary.id,
          userId,
          totalCostUSD: costBreakdown.totalCostUSD,
          creditsCharged: creditCost,
          margin: `${((creditCost * 0.001 - costBreakdown.totalCostUSD) / costBreakdown.totalCostUSD * 100).toFixed(2)}%`,
        });
      } catch (error) {
        logger.error('Failed to deduct credits or track costs (summary still created)', {
          userId,
          error,
        });
        // Don't fail the entire job if credit deduction/cost tracking fails
      }
    }

    // Update job status
    updateJobStatus(jobId, 'completed', {
      progress: progressPercentages.completed,
      summary_id: summary.id,
    });

    // Phase 4: Use refined title if available, otherwise fallback to quick title or default
    const finalTitleForResponse = refinedTitle || quickTitle || summary.batch_title;
    
    const completedProgress = {
      status: 'completed' as const,
      progress: progressPercentages.completed,
      message: 'Summary completed successfully',
      title: finalTitleForResponse, // Phase 4: Include refined/quick title in completion event
      data: {
        _id: summary.id!,
        user_id: summary.user_id,
        batch_title: finalTitleForResponse, // Phase 4: Use refined/quick title in response
        source_videos: summary.source_videos.map((v) => ({
          url: v.url,
          title: v.title,
          channel: v.channel,
          thumbnail: v.thumbnail,
          duration_seconds: v.duration_seconds,
          was_pre_condensed: v.was_pre_condensed,
          upload_date: v.upload_date,
        })),
        user_prompt_focus: summary.user_prompt_focus,
        preset_style: summary.preset_style,
        final_summary_text: summary.final_summary_text,
        language: summary.language,
        processing_stats: summary.processing_stats,
        created_at: typeof summary.created_at === 'string' 
          ? summary.created_at 
          : (summary.created_at instanceof Date 
              ? summary.created_at.toISOString() 
              : new Date().toISOString()),
      },
    };
    
    broadcastJobProgress(jobId, completedProgress);
    
    if (progressCallback) {
      progressCallback(completedProgress);
    }

    const processingTime = Date.now() - startTime;
    logger.performance('batch_processing', processingTime, {
      jobId,
      userId,
      summaryId: summary.id,
      urlCount: request.urls.length,
      totalTokensUsed,
    });
    
    logger.jobEvent(jobId, 'batch_processing_completed', 'completed', {
      userId,
      summaryId: summary.id,
      processingTimeMs: processingTime,
      totalTokensUsed,
    });

    return summary.id!;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    logger.structuredError(error, {
      operation: 'batch_processing',
      userId,
      jobId,
      metadata: {
        urlCount: request.urls.length,
        preset: request.preset,
      },
    });

    updateJobStatus(jobId, 'error', {
      progress: 0,
      error: errorMessage,
    });

    broadcastJobProgress(jobId, {
      status: 'error',
      progress: 0,
      error: errorMessage,
    });
    
    if (progressCallback) {
      progressCallback({
        status: 'error',
        progress: 0,
        error: errorMessage,
      });
    }

    throw error;
  }
}

