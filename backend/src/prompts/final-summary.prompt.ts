/**
 * Final summary prompt template
 * Base template for generating final summaries from aggregated content
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { getFormattedDate } from './utils/date';

/**
 * PresetStyle type - dynamically validated against config.yaml
 * Note: TypeScript can't enforce runtime config values at compile time,
 * so we use string type with runtime validation
 */
export type PresetStyle = string;

export interface FinalSummaryPromptOptions {
  presetStyle: PresetStyle;
  customPrompt?: string;
  language: string;
  context?: string; // Additional context if needed
  /** When provided, citation rules (numbered [1], [2], Sources) are included. Omit when no source videos. */
  citationInstructions?: string;
}

/**
 * Cache for loaded files (avoid re-reading on every request)
 */
const fileCache = new Map<string, string>();

/**
 * Get the prompts directory path
 * Reads from src/prompts (which exists in Docker) instead of dist/prompts
 * This way we don't need to copy .md files during build
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
    // If src doesn't exist, log warning but continue (might be in a different setup)
    logger.warn(`src/prompts not found at ${srcPromptsDir}, falling back to ${__dirname}`);
  }
  
  // Fallback to __dirname (works in dev with ts-node where __dirname is src/prompts)
  return __dirname;
}

/**
 * Load file with caching
 */
function loadCached(filePath: string): string {
  if (fileCache.has(filePath)) {
    return fileCache.get(filePath)!;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  fileCache.set(filePath, content);
  return content;
}

/**
 * Load shared styling guidelines from general/styling-guidelines.md
 * Used by style instruction files that contain {stylingGuidelines} placeholder
 */
function loadStylingGuidelines(): string {
  const promptsDir = getPromptsDir();
  const guidelinesPath = path.join(promptsDir, 'general', 'styling-guidelines.md');
  if (!fs.existsSync(guidelinesPath)) {
    logger.warn(`Styling guidelines not found at ${guidelinesPath}, using empty placeholder`);
    return '';
  }
  return loadCached(guidelinesPath);
}

/**
 * Load style-specific instructions from markdown file
 * @param presetStyle Style identifier (tldr, bullet_points, tutorial, detailed)
 * @returns Style instructions or fallback
 */
function loadStyleInstructions(presetStyle: PresetStyle): string {
  // Map preset style to instruction file
  const styleFileMap: Record<string, string> = {
    'tldr': 'tldr-instructions.md',
    'bullet_points': 'bullet-points-instructions.md',
    'tutorial': 'tutorial-instructions.md',
    'detailed': 'detailed-instructions.md',
    'deep_dive': 'detailed-instructions.md', // Use detailed for deep_dive
  };
  
  const fileName = styleFileMap[presetStyle];
  if (!fileName) {
    logger.warn(`No style instructions found for preset: ${presetStyle}`);
    return '';
  }
  
  const promptsDir = getPromptsDir();
  const instructionsPath = path.join(promptsDir, 'summary', fileName);
  
  if (!fs.existsSync(instructionsPath)) {
    logger.error(`❌ Style instructions not found at ${instructionsPath}`);
    logger.error(`   __dirname is: ${__dirname}`);
    logger.error(`   Looking for file: ${fileName}`);
    // List what files actually exist in summary directory
    const summaryDir = path.join(promptsDir, 'summary');
    if (fs.existsSync(summaryDir)) {
      const existingFiles = fs.readdirSync(summaryDir);
      logger.error(`   Files in summary directory: ${existingFiles.join(', ')}`);
    } else {
      logger.error(`   Summary directory does not exist at: ${summaryDir}`);
    }
    return '';
  }
  
  let content = loadCached(instructionsPath);
  if (content.includes('{stylingGuidelines}')) {
    const stylingGuidelines = loadStylingGuidelines();
    content = content.replace(/{stylingGuidelines}/g, stylingGuidelines);
  }
  logger.info(`✓ Loaded style instructions from ${instructionsPath} (${content.length} chars)`);
  return content;
}

/**
 * Extract framework name for display in prompt
 */
function extractFramework(style: PresetStyle): string {
  const frameworks: Record<string, string> = {
    'tldr': 'Smart Brevity + Pyramid Principle',
    'bullet_points': 'Smart Brevity format',
    'tutorial': 'Talk Like TED + Visual Thinking',
    'detailed': 'McKinsey Way + Pyramid Principle',
    'deep_dive': 'Research Paper structure + McKinsey Way',
  };
  
  return frameworks[style] || 'Standard summarization frameworks';
}

/**
 * Load comprehensive summarization principles from markdown file (general/summarization-principles.md)
 * @returns Core principles content or fallback
 */
function loadCorePrinciples(): string {
  const promptsDir = getPromptsDir();
  const principlesPath = path.join(promptsDir, 'general', 'summarization-principles.md');
  
  if (!fs.existsSync(principlesPath)) {
    logger.error(`❌ Core principles file not found at ${principlesPath}, using fallback`);
    logger.error(`   __dirname is: ${__dirname}`);
    const generalDir = path.join(promptsDir, 'general');
    if (fs.existsSync(generalDir)) {
      const existingFiles = fs.readdirSync(generalDir);
      logger.error(`   Files in general directory: ${existingFiles.join(', ')}`);
    } else {
      logger.error(`   General directory does not exist at: ${generalDir}`);
    }
    return 'Follow core summarization principles: Lead with conclusion, maintain objectivity, be concise, make it stick, prioritize actionability.';
  }
  
  const content = loadCached(principlesPath);
  logger.info(`✓ Loaded core principles from ${principlesPath} (${content.length} chars)`);
  return content;
}

/**
 * Load prompt template from markdown file
 */
function loadPromptTemplate(): string {
  const promptsDir = getPromptsDir();
  const templatePath = path.join(promptsDir, 'final-summary.prompt.md');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Prompt template not found at ${templatePath}. Please ensure final-summary.prompt.md exists.`
    );
  }
  
  return loadCached(templatePath);
}

/**
 * Generate final summary system prompt
 * @param options Prompt options
 * @returns System prompt string
 */
export function getFinalSummaryPrompt(
  options: FinalSummaryPromptOptions
): string {
  const { presetStyle, customPrompt, language, context, citationInstructions } = options;

  // Load template
  const template = loadPromptTemplate();
  
  // Load comprehensive core principles
  const corePrinciples = loadCorePrinciples();
  
  // Load style-specific instructions (detailed instructions from md files)
  let styleInstructions = loadStyleInstructions(presetStyle);
  styleInstructions = styleInstructions
    .replace(/{language}/g, language)
    .replace(/{date}/g, getFormattedDate());

  // Extract framework name for template
  const styleFramework = extractFramework(presetStyle);
  
  // Build user focus section
  const userFocus = customPrompt
    ? `**User's specific focus**: ${customPrompt}\n\n`
    : '';

  // Build additional context section
  const additionalContext = context 
    ? `**Additional context**: ${context}\n\n` 
    : '';

  // Build citation section only when we have citation instructions (e.g. when source videos exist)
  const citationSection = citationInstructions && citationInstructions.trim().length > 0
    ? `\n\n---\n\n## Citation requirements\n\n${citationInstructions.trim()}\n\n---\n\n`
    : `\n\n---\n\n`;

  // Replace placeholders in template
  let prompt = template
    .replace(/{language}/g, language)
    .replace(/{corePrinciples}/g, corePrinciples)
    .replace(/{styleFramework}/g, styleFramework)
    .replace(/{styleStructure}/g, styleInstructions) // Inject full instructions
    .replace(/{userFocus}/g, userFocus)
    .replace(/{additionalContext}/g, additionalContext)
    .replace(/{citationSection}/g, citationSection)
    .replace(/{presetStyle}/g, presetStyle)
    .replace(/{date}/g, getFormattedDate());

  return prompt;
}

/**
 * Replace content placeholder in prompt with actual aggregated content
 * @param prompt Template prompt with [CONTENT_PLACEHOLDER]
 * @param content Aggregated content to insert
 * @returns Final prompt with content
 */
export function injectContentIntoPrompt(
  prompt: string,
  content: string
): string {
  return prompt.replace('[CONTENT_PLACEHOLDER]', content);
}

