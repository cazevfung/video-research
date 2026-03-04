/**
 * Research prompts
 * Centralized prompts for AI-powered research feature
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { VideoSearchResult } from '../services/youtube-search.service';
import { getFormattedDate } from './utils/date';

/**
 * Get the prompts directory path
 * Reads from src/prompts (which exists in Docker) instead of dist/prompts
 */
function getPromptsDir(): string {
  // __dirname in compiled code is dist/prompts
  // Go up to project root, then into src/prompts
  const srcPromptsDir = path.resolve(__dirname, '../../src/prompts');
  
  // Check if we're in dist (compiled) - if so, use src directory
  if (__dirname.includes('dist')) {
    if (fs.existsSync(srcPromptsDir)) {
      return srcPromptsDir;
    }
  }
  
  // Fallback to __dirname (works in dev with ts-node where __dirname is src/prompts)
  return __dirname;
}

/**
 * Load styling guidelines from general/styling-guidelines.md
 * Used to inject real content into the research summary template (same pattern as citation instructions).
 */
function loadStylingGuidelines(): string {
  const promptsDir = getPromptsDir();
  const filePath = path.join(promptsDir, 'general', 'styling-guidelines.md');
  if (!fs.existsSync(filePath)) {
    logger.warn(`[Research Prompts] Styling guidelines not found at ${filePath}, using fallback`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8').trim();
}

/** Marker in question-generation.md from which to take content (Question Quality Criteria + Framework + Output Format). */
const QUESTION_GENERATION_CRITERIA_START = '## Question Quality Criteria';

/**
 * Load question generation criteria from research/question-generation.md (sections: Question Quality Criteria, Question Framework, Output Format).
 * Used to inject real imported content into the question regeneration template.
 */
function loadQuestionGenerationCriteria(): string {
  const promptsDir = getPromptsDir();
  const filePath = path.join(promptsDir, 'research', 'question-generation.md');
  if (!fs.existsSync(filePath)) {
    logger.warn(`[Research Prompts] Question generation template not found at ${filePath}`);
    return '';
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const startIdx = content.indexOf(QUESTION_GENERATION_CRITERIA_START);
  if (startIdx === -1) {
    logger.warn('[Research Prompts] Question Quality Criteria section not found in question-generation.md');
    return '';
  }
  return content.slice(startIdx).trim();
}

/** Marker in video-filtering.md from which to take criteria (YOUR GOAL through selection/credibility, before OUTPUT FORMAT). */
const VIDEO_FILTERING_CRITERIA_START = '## YOUR GOAL';
const VIDEO_FILTERING_CRITERIA_END = '## OUTPUT FORMAT (JSON):';

/**
 * Load video filtering criteria from research/video-filtering.md (from YOUR GOAL up to but not including OUTPUT FORMAT).
 * Used to inject into the video filtering regeneration template.
 */
function loadVideoFilteringCriteria(): string {
  const promptsDir = getPromptsDir();
  const filePath = path.join(promptsDir, 'research', 'video-filtering.md');
  if (!fs.existsSync(filePath)) {
    logger.warn(`[Research Prompts] Video filtering template not found at ${filePath}`);
    return '';
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const startIdx = content.indexOf(VIDEO_FILTERING_CRITERIA_START);
  const endIdx = content.indexOf(VIDEO_FILTERING_CRITERIA_END);
  if (startIdx === -1) {
    logger.warn('[Research Prompts] VIDEO_FILTERING_CRITERIA_START not found in video-filtering.md');
    return '';
  }
  if (endIdx === -1) {
    return content.slice(startIdx).trim();
  }
  return content.slice(startIdx, endIdx).trim();
}

/**
 * Load prompt template from markdown file
 * Supports includes using <!-- @include filename.md --> syntax
 * Recursively processes includes to handle nested includes
 */
function loadPromptTemplate(templateName: string): string {
  const promptsDir = getPromptsDir();
  const templatePath = path.join(promptsDir, 'research', templateName);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Prompt template not found at ${templatePath}. Please ensure ${templateName} exists.`
    );
  }
  
  return processIncludes(templatePath, templateName, promptsDir, []);
}

/**
 * Recursively process includes in a template file
 * Supports:
 * - <!-- @include filename.md --> (includes entire file)
 * - <!-- @include filename.md#Section Name --> (includes specific section)
 * - <!-- @include filename.md#Section1#Section2 --> (includes multiple sections)
 */
function processIncludes(
  filePath: string,
  baseFileName: string,
  promptsDir: string,
  includeChain: string[]
): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return processIncludesInContent(content, baseFileName, promptsDir, includeChain);
}

/**
 * Process includes within markdown content (recursive helper)
 */
function processIncludesInContent(
  content: string,
  baseFileName: string,
  promptsDir: string,
  includeChain: string[]
): string {
  // Process includes: <!-- @include filename.md --> or <!-- @include filename.md#Section -->
  const includeRegex = /<!--\s*@include\s+([^\s#]+\.md)((?:#[^#\s]+)*)\s*-->/g;
  let match;
  
  // Collect all matches first
  const matches: Array<{ 
    fullMatch: string; 
    fileName: string; 
    sections: string[];
    index: number;
  }> = [];
  while ((match = includeRegex.exec(content)) !== null) {
    const fileName = match[1];
    const sectionsPart = match[2] || '';
    // Extract all sections (everything after #)
    const sections = sectionsPart
      .split('#')
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());
    
    matches.push({
      fullMatch: match[0],
      fileName,
      sections,
      index: match.index,
    });
  }
  
  // Process matches in reverse order to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, fileName, sections } = matches[i];
    
    // Prevent circular includes by checking if this file is already in the chain
    if (includeChain.includes(fileName)) {
      const chain = [...includeChain, fileName].join(' -> ');
      logger.warn(`[Research Prompts] Circular include detected: ${chain}, skipping`);
      content = content.replace(fullMatch, '');
      continue;
    }
    
    const includePath = path.join(promptsDir, 'research', fileName);
    
    if (!fs.existsSync(includePath)) {
      logger.warn(`[Research Prompts] Include file not found: ${includePath}, skipping include`);
      content = content.replace(fullMatch, '');
      continue;
    }
    
    // Load the included file content
    let includedContent = fs.readFileSync(includePath, 'utf-8');
    
    // Recursively process any includes within the included content first
    const newChain = [...includeChain, baseFileName];
    includedContent = processIncludesInContent(
      includedContent, 
      fileName, 
      promptsDir, 
      newChain
    );
    
    // If sections are specified, extract only those sections after processing nested includes
    if (sections.length > 0) {
      includedContent = extractSections(includedContent, sections);
      if (!includedContent.trim()) {
        logger.warn(`[Research Prompts] No content found for sections: ${sections.join(', ')} in ${fileName}`);
      }
    }
    
    // Replace the include comment with the included content
    content = content.replace(fullMatch, includedContent);
  }
  
  return content;
}

/**
 * Extract specific sections from markdown content by heading name
 * @param content The markdown content
 * @param sectionNames Array of section names to extract (e.g., ["Question Quality Criteria", "Question Framework"])
 * @returns The extracted sections concatenated together
 */
function extractSections(content: string, sectionNames: string[]): string {
  const lines = content.split('\n');
  const extractedSections: string[] = [];
  
  for (const sectionName of sectionNames) {
    let inSection = false;
    let sectionLines: string[] = [];
    let sectionLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is a heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        const headingLevel = headingMatch[1].length;
        const headingText = headingMatch[2].trim();
        
        // Check if this is the section we're looking for
        if (headingText === sectionName) {
          inSection = true;
          sectionLevel = headingLevel;
          sectionLines = [line]; // Include the heading
          continue;
        }
        
        // If we're in a section and encounter a heading of same or higher level, end the section
        if (inSection && headingLevel <= sectionLevel) {
          extractedSections.push(sectionLines.join('\n'));
          sectionLines = [];
          inSection = false;
          
          // Check if this new heading is another section we want
          if (headingText === sectionName) {
            inSection = true;
            sectionLevel = headingLevel;
            sectionLines = [line];
          }
          continue;
        }
      }
      
      // If we're in a section, collect the line
      if (inSection) {
        sectionLines.push(line);
      }
    }
    
    // Add the last section if we're still in it
    if (inSection && sectionLines.length > 0) {
      extractedSections.push(sectionLines.join('\n'));
    }
  }
  
  // Join all extracted sections with double newlines
  return extractedSections.join('\n\n');
}

/**
 * Get localized instruction texts for video filtering prompt JSON output format
 */
function getLocalizedInstructions(language: string): {
  temporalAssessment: string;
  whySelected: string;
  fillsGap: string;
  howTheyWorkTogether: string;
} {
  const isEnglish = language.toLowerCase() === 'english';
  
  // Default English instructions
  const instructions = {
    temporalAssessment: "Recent Event Topic|Timeless Topic|Mixed - explain your reasoning briefly",
    whySelected: "what you hope to learn from this video and why it's worth including",
    fillsGap: "what perspective or information this adds that other videos don't cover",
    howTheyWorkTogether: "explain how these 10 videos build on each other to create comprehensive understanding"
  };
  
  // If language is English, return as-is
  if (isEnglish) {
    return instructions;
  }
  
  // For non-English languages, provide instructions in that language
  // These are instruction texts for the AI, so they should be in the target language
  const localized: Record<string, typeof instructions> = {
    'chinese': {
      temporalAssessment: "近期事件主题|永恒主题|混合 - 简要解释你的推理",
      whySelected: "你希望从该视频中学到什么以及为什么值得包含",
      fillsGap: "该视频添加了哪些其他视频未涵盖的视角或信息",
      howTheyWorkTogether: "解释这10个视频如何相互配合以创建全面的理解"
    },
    'spanish': {
      temporalAssessment: "Tema de Evento Reciente|Tema Atemporal|Mixto - explica brevemente tu razonamiento",
      whySelected: "qué esperas aprender de este video y por qué vale la pena incluirlo",
      fillsGap: "qué perspectiva o información añade que otros videos no cubren",
      howTheyWorkTogether: "explica cómo estos 10 videos se complementan para crear una comprensión integral"
    },
    'french': {
      temporalAssessment: "Sujet d'Événement Récent|Sujet Intemporel|Mixte - expliquez brièvement votre raisonnement",
      whySelected: "ce que vous espérez apprendre de cette vidéo et pourquoi elle mérite d'être incluse",
      fillsGap: "quelle perspective ou information cela ajoute que les autres vidéos ne couvrent pas",
      howTheyWorkTogether: "expliquez comment ces 10 vidéos se complètent pour créer une compréhension complète"
    },
    'german': {
      temporalAssessment: "Aktuelles Ereignisthema|Zeitloses Thema|Gemischt - erklären Sie kurz Ihre Überlegungen",
      whySelected: "was Sie von diesem Video lernen möchten und warum es sich lohnt, es einzubeziehen",
      fillsGap: "welche Perspektive oder Information dies hinzufügt, die andere Videos nicht abdecken",
      howTheyWorkTogether: "erklären Sie, wie diese 10 Videos zusammenarbeiten, um ein umfassendes Verständnis zu schaffen"
    }
  };
  
  const langKey = language.toLowerCase();
  return localized[langKey] || instructions;
}

/**
 * Get research summary prompt
 * Updated to accept optional questions for structured summary and citation context
 */
export function getResearchSummaryPrompt(params: {
  researchQuery: string;
  language: string;
  queryDate?: string;
  questions?: string[]; // NEW: Optional questions to structure summary
  styleGuide?: string; // NEW: Optional style guide for adaptive writing
  citationInstructions?: string; // NEW: Optional citation instructions for numbered citations
}): string {
  // Load base template
  let prompt = loadPromptTemplate('research-summary.md');
  
  // Format query date (default to today if not provided)
  const formattedDate = params.queryDate || new Date().toISOString().split('T')[0];
  
  // Add language instruction at the top (before research query)
  let languageInstruction = '';
  if (params.language !== 'English') {
    languageInstruction = `**CRITICAL LANGUAGE REQUIREMENT:**
- Write the ENTIRE report in ${params.language}
- Do NOT mix languages - maintain consistency throughout
- If video transcripts are in English but the report must be in ${params.language}, translate all content including quotes
- Use natural ${params.language} phrasing, not literal translations
- Maintain accuracy while translating technical terms and quotes
- **IMPORTANT**: Citations must ALWAYS use numbered format [1], [2], [3] regardless of report language - do NOT translate citation format

`;
    logger.debug('[Research Prompts] Adding language instruction at top', { language: params.language });
  }
  
  // Replace placeholders (replace all occurrences using regex for compatibility)
  prompt = prompt.replace(/{languageInstruction}/g, languageInstruction);
  
  // Replace style guidance placeholder
  let styleGuidance = '';
  if (params.styleGuide && params.styleGuide.trim().length > 0) {
    styleGuidance = `## Writing Style Guide\n\nThe following style guide was generated based on analysis of your research query and video transcripts. **Follow these instructions precisely** to match the appropriate writing style:\n\n${params.styleGuide}\n\n---\n\n`;
    logger.info('[Research Prompts] Adding style guide to research summary prompt', {
      styleGuideLength: params.styleGuide.length,
      styleGuidePreview: params.styleGuide.substring(0, 100) + '...',
    });
  } else {
    logger.info('[Research Prompts] No style guide provided, using default styling', {
      hasStyleGuide: !!params.styleGuide,
      styleGuideLength: params.styleGuide ? params.styleGuide.length : 0,
    });
  }
  prompt = prompt.replace(/{styleGuidance}/g, styleGuidance);
  
  // Log final prompt status
  if (params.styleGuide && params.styleGuide.trim().length > 0) {
    const placeholderReplaced = !prompt.includes('{styleGuidance}');
    logger.info('[Research Prompts] Style guidance placeholder replacement verification', {
      placeholderReplaced,
      promptContainsStyleGuide: prompt.includes('Writing Style Guide'),
      promptLength: prompt.length,
    });
  }
  
  prompt = prompt.replace(/{date}/g, getFormattedDate());
  prompt = prompt.replace(/{researchQuery}/g, params.researchQuery);
  prompt = prompt.replace(/{queryDate}/g, formattedDate);
  
  // Replace styling guidelines with content from general/styling-guidelines.md (real imported content)
  const stylingGuidelines = loadStylingGuidelines();
  prompt = prompt.replace(/{stylingGuidelines}/g, stylingGuidelines);
  
  // Replace citation instructions placeholder
  let citationInstructions = '';
  if (params.citationInstructions && params.citationInstructions.trim().length > 0) {
    citationInstructions = params.citationInstructions;
    logger.debug('[Research Prompts] Adding citation instructions to prompt', {
      citationInstructionsLength: citationInstructions.length,
    });
  }
  prompt = prompt.replace(/{citationInstructions}/g, citationInstructions);
  
  // Replace questions placeholder with actual APPROVED questions or fallback
  // NOTE: params.questions contains the user-approved questions from the research workflow
  if (params.questions && params.questions.length > 0) {
    // Replace {questions} with the numbered list of approved questions
    const questionsList = params.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    prompt = prompt.replace(/{questions}/g, questionsList);
  } else {
    // Fallback: if no questions provided, replace with generic structure guidance
    const fallbackGuidance = `Since no specific questions were provided, structure your report to comprehensively explore the topic by covering:
- The current situation/state
- Underlying causes and mechanisms  
- Implications and consequences
- Actionable recommendations
- Nuances and alternative perspectives`;
    prompt = prompt.replace(/{questions}/g, fallbackGuidance);
  }
  
  logger.debug('[Research Prompts] Research summary prompt assembled', {
    promptLength: prompt.length,
    hasQuestions: !!params.questions && params.questions.length > 0,
    questionCount: params.questions?.length || 0,
    language: params.language,
    queryDate: formattedDate,
    hasLanguageInstruction: languageInstruction.length > 0,
  });
  
  return prompt;
}

/**
 * Get style guide generation prompt
 */
export function getStyleGuidePrompt(params: {
  researchQuery: string;
  language: string;
  questions?: string[];
  transcriptPreviews: string[];
}): string {
  logger.debug('[Research Prompts] Loading style guide generation prompt', {
    researchQuery: params.researchQuery?.substring(0, 50) + '...',
    language: params.language,
    questionCount: params.questions?.length || 0,
    transcriptCount: params.transcriptPreviews.length,
  });
  
  let prompt = loadPromptTemplate('style-guide-generation.md');
  prompt = prompt.replace(/{researchQuery}/g, params.researchQuery);
  prompt = prompt.replace(/{language}/g, params.language);
  
  // Replace questions placeholder (approved questions from user)
  if (params.questions && params.questions.length > 0) {
    const questionsSection = params.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    prompt = prompt.replace(/{questions_section}/g, questionsSection);
  } else {
    prompt = prompt.replace(/{questions_section}/g, 'No specific questions provided.');
  }
  
  // Replace transcript previews
  const transcriptPreviewsText = params.transcriptPreviews.map((preview, i) => 
    `## Transcript Preview ${i + 1}:\n${preview}`
  ).join('\n\n---\n\n');
  prompt = prompt.replace(/{transcriptPreviews}/g, transcriptPreviewsText);
  
  logger.debug('[Research Prompts] Style guide prompt assembled', {
    promptLength: prompt.length,
    transcriptCount: params.transcriptPreviews.length,
  });
  
  return prompt;
}

/**
 * Get question generation prompt
 */
export function getQuestionGenerationPrompt(params: {
  researchQuery: string;
  language: string;
  questionCount: number;
}): string {
  logger.debug('[Research Prompts] Loading question generation prompt', {
    researchQuery: params.researchQuery?.substring(0, 50) + '...',
    language: params.language,
    questionCount: params.questionCount,
  });
  
  let prompt = loadPromptTemplate('question-generation.md');
  prompt = prompt.replace(/{date}/g, getFormattedDate());
  prompt = prompt.replace(/{research_query}/g, params.researchQuery);
  prompt = prompt.replace(/{question_count}/g, params.questionCount.toString());
  prompt = prompt.replace(/{language}/g, params.language);
  
  logger.debug('[Research Prompts] Question generation prompt assembled', {
    promptLength: prompt.length,
    questionCount: params.questionCount,
  });
  
  return prompt;
}

/**
 * Get question regeneration prompt
 */
export function getQuestionRegenerationPrompt(params: {
  researchQuery: string;
  language: string;
  originalQuestions: string[];
  userFeedback: string;
  questionCount: number;
}): string {
  logger.debug('[Research Prompts] Loading question regeneration prompt', {
    researchQuery: params.researchQuery?.substring(0, 50) + '...',
    language: params.language,
    originalQuestionCount: params.originalQuestions.length,
    feedbackLength: params.userFeedback.length,
  });
  
  let prompt = loadPromptTemplate('question-regeneration.md');
  // Imported content from question-generation.md (Question Quality Criteria + Framework + Output Format)
  const questionGenerationCriteria = loadQuestionGenerationCriteria();
  prompt = prompt.replace(/{questionGenerationCriteria}/g, questionGenerationCriteria);
  prompt = prompt.replace(/{date}/g, getFormattedDate());
  prompt = prompt.replace(/{research_query}/g, params.researchQuery);
  prompt = prompt.replace(/{language}/g, params.language);
  prompt = prompt.replace(/{question_count}/g, params.questionCount.toString());
  prompt = prompt.replace(
    /{original_questions}/g,
    params.originalQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
  );
  prompt = prompt.replace(/{user_feedback}/g, params.userFeedback);
  
  logger.debug('[Research Prompts] Question regeneration prompt assembled', {
    promptLength: prompt.length,
  });
  
  return prompt;
}

/**
 * Get search query generation prompt
 * Updated to accept optional questions parameter
 */
export function getSearchQueryPrompt(params: {
  researchQuery: string;
  queryCount: number;
  questions?: string[]; // NEW: Optional questions to guide search term generation
}): string {
  logger.debug('[Research Prompts] Loading search query generation prompt', {
    researchQuery: params.researchQuery?.substring(0, 50) + '...',
    queryCount: params.queryCount,
    hasQuestions: !!params.questions && params.questions.length > 0,
  });
  
  let prompt = loadPromptTemplate('search-term-genration.md');
  prompt = prompt.replace(/{date}/g, getFormattedDate());
  prompt = prompt.replace(/{researchQuery}/g, params.researchQuery);
  prompt = prompt.replace(/{queryCount}/g, String(params.queryCount));
  
  // Add questions section if provided (approved questions from user)
  if (params.questions && params.questions.length > 0) {
    const questionsSection = `
## Research Questions to Answer

**These are the AI-generated questions that have been approved by the user. Your search queries MUST be designed to find videos that answer these specific questions:**

${params.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

**IMPORTANT**: Generate search terms that will help find videos answering these questions. Each search query should target content that addresses one or more of these research questions.
`;
    // Check if prompt has a placeholder for questions, otherwise append
    if (prompt.includes('{questions_section}')) {
      prompt = prompt.replace(/{questions_section}/g, questionsSection);
    } else {
      // Append questions section before the output format section if it exists
      if (prompt.includes('## Output Format') || prompt.includes('```json')) {
        prompt = prompt.replace(/(## Output Format|```json)/, `${questionsSection}\n\n$1`);
      } else {
        prompt = `${prompt}\n\n${questionsSection}`;
      }
    }
  } else {
    // Remove questions section placeholder if no questions provided
    prompt = prompt.replace(/{questions_section}/g, '');
  }
  
  logger.debug('[Research Prompts] Search query prompt assembled', {
    promptLength: prompt.length,
    queryCount: params.queryCount,
    hasQuestions: !!params.questions && params.questions.length > 0,
  });
  
  return prompt;
}

/** Minimal type for previous selection used in regeneration prompt (avoids importing Research in prompts). */
export type PreviousSelectedVideoForPrompt = { title: string; channel: string; classification?: string };

/**
 * Get video filtering prompt
 * Initial selection: uses video-filtering.md.
 * Regeneration (user feedback): uses video-filtering-regeneration.md with original selection + criteria injection.
 */
export function getVideoFilteringPrompt(params: {
  researchQuery: string;
  videoResults: VideoSearchResult[];
  language: string;
  questions?: string[];
  userFeedback?: string;
  previousSelectedVideos?: PreviousSelectedVideoForPrompt[];
}): string {
  const formattedResults = formatVideoResults(params.videoResults);
  const questionsSection = buildQuestionsSection(params.questions);
  const localizedInstructions = getLocalizedInstructions(params.language);

  logger.debug('[Research Prompts] Loading video filtering prompt', {
    researchQuery: params.researchQuery?.substring(0, 50) + '...',
    videoCount: params.videoResults?.length || 0,
    language: params.language,
    hasQuestions: !!params.questions && params.questions.length > 0,
    hasFeedback: !!params.userFeedback,
    useRegenerationTemplate: !!params.userFeedback,
  });

  // Regeneration path: dedicated template with original selection + feedback + injected criteria
  if (params.userFeedback) {
    const originalSelectedVideosText =
      params.previousSelectedVideos && params.previousSelectedVideos.length > 0
        ? params.previousSelectedVideos
            .map(
              (v, i) =>
                `${i + 1}. ${v.title} — ${v.channel}${v.classification ? ` (${v.classification})` : ''}`
            )
            .join('\n')
        : '(No previous selection listed.)';

    const videoFilteringCriteria = loadVideoFilteringCriteria();
    let prompt = loadPromptTemplate('video-filtering-regeneration.md');
    prompt = prompt.replace(/{date}/g, getFormattedDate());
    prompt = prompt.replace(/{researchQuery}/g, params.researchQuery);
    prompt = prompt.replace(/{language}/g, params.language);
    prompt = prompt.replace(/{original_selected_videos}/g, originalSelectedVideosText);
    prompt = prompt.replace(/{user_feedback}/g, params.userFeedback);
    prompt = prompt.replace(/{videoFilteringCriteria}/g, videoFilteringCriteria);
    prompt = prompt.replace(/{searchResults}/g, formattedResults);
    prompt = prompt.replace(/{questions_section}/g, questionsSection);
    prompt = prompt.replace(/{temporal_assessment_instruction}/g, localizedInstructions.temporalAssessment);
    prompt = prompt.replace(/{why_selected_instruction}/g, localizedInstructions.whySelected);
    prompt = prompt.replace(/{fills_gap_instruction}/g, localizedInstructions.fillsGap);
    prompt = prompt.replace(/{how_they_work_together_instruction}/g, localizedInstructions.howTheyWorkTogether);

    logger.debug('[Research Prompts] Video filtering regeneration prompt assembled', {
      promptLength: prompt.length,
      hasSearchResults: formattedResults.length > 0,
    });
    return prompt;
  }

  // Initial selection path: video-filtering.md only
  let prompt = loadPromptTemplate('video-filtering.md');
  prompt = prompt.replace(/{date}/g, getFormattedDate());
  prompt = prompt.replace(/{researchQuery}/g, params.researchQuery);
  prompt = prompt.replace(/{language}/g, params.language);
  prompt = prompt.replace(/{temporal_assessment_instruction}/g, localizedInstructions.temporalAssessment);
  prompt = prompt.replace(/{why_selected_instruction}/g, localizedInstructions.whySelected);
  prompt = prompt.replace(/{fills_gap_instruction}/g, localizedInstructions.fillsGap);
  prompt = prompt.replace(/{how_they_work_together_instruction}/g, localizedInstructions.howTheyWorkTogether);
  prompt = prompt.replace(/{searchResults}/g, formattedResults);

  if (prompt.includes('{questions_section}')) {
    prompt = prompt.replace(/{questions_section}/g, questionsSection);
  } else {
    if (prompt.includes('## Output Format') || prompt.includes('```json')) {
      prompt = prompt.replace(/(## Output Format|```json)/, `${questionsSection}\n\n$1`);
    } else {
      prompt = `${prompt}\n\n${questionsSection}`;
    }
  }
  prompt = prompt.replace(/{user_feedback}/g, '');

  logger.debug('[Research Prompts] Video filtering prompt assembled', {
    promptLength: prompt.length,
    hasSearchResults: formattedResults.length > 0,
    hasQuestions: !!params.questions && params.questions.length > 0,
  });
  return prompt;
}

function buildQuestionsSection(questions?: string[]): string {
  if (!questions || questions.length === 0) {
    return '';
  }
  return `
## RESEARCH QUESTIONS TO ANSWER

**These are the specific research questions that MUST be answered by the selected videos.**

**Your PRIMARY task is to select videos that directly answer or provide essential context for these questions. Videos that don't address these questions should be REJECTED.**

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}

**Selection Requirement**: Each selected video must address at least one of these research questions. The collection of 10 videos should collectively cover all questions comprehensively.
`.trim();
}

/**
 * Helper to format video results for prompt
 */
function formatVideoResults(videos: VideoSearchResult[]): string {
  if (!videos || videos.length === 0) {
    logger.warn('[Research Prompts] formatVideoResults called with empty or null videos array');
    return '';
  }
  
  return videos.map((v, index) => {
    const minutes = Math.floor(v.duration_seconds / 60);
    const seconds = v.duration_seconds % 60;
    const durationStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
    
    return `
${index + 1}. **${v.title}**
   - Channel: ${v.channel}
   - Views: ${v.view_count.toLocaleString()}
   - Duration: ${durationStr}
   - Upload: ${v.upload_date}
   - URL: ${v.url}
    `.trim();
  }).join('\n\n');
}
