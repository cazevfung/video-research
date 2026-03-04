/**
 * Title generation prompts
 * Centralized prompts for AI-generated title creation
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSummaryConfig } from '../config';
import logger from '../utils/logger';

export type TitleContext = 'transcripts' | 'summary';

export interface TitleGenerationPromptOptions {
  context: TitleContext;
  maxLength: number;
  language: string;
}

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
 * Load prompt template from markdown file
 */
function loadPromptTemplate(): string {
  const promptsDir = getPromptsDir();
  const templatePath = path.join(promptsDir, 'title-generation.prompt.md');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Prompt template not found at ${templatePath}. Please ensure title-generation.prompt.md exists.`
    );
  }
  
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Get system prompt for title generation
 * @param options Prompt options
 * @returns System prompt string
 */
export function getTitleGenerationSystemPrompt(
  options: TitleGenerationPromptOptions
): string {
  const { context, maxLength, language } = options;
  const template = loadPromptTemplate();
  
  // Extract the appropriate system prompt section based on context
  const sections = template.split('## ');
  
  let systemPromptSection = '';
  if (context === 'transcripts') {
    // Find "System Prompt - Transcripts Context" section
    const transcriptsSection = sections.find(s => 
      s.trim().startsWith('System Prompt - Transcripts Context')
    );
    if (transcriptsSection) {
      // Extract content after the header (skip first line which is the header)
      const lines = transcriptsSection.split('\n');
      systemPromptSection = lines
        .slice(1) // Skip header line
        .join('\n')
        .trim();
    }
  } else {
    // Find "System Prompt - Summary Context" section
    const summarySection = sections.find(s => 
      s.trim().startsWith('System Prompt - Summary Context')
    );
    if (summarySection) {
      // Extract content after the header (skip first line which is the header)
      const lines = summarySection.split('\n');
      systemPromptSection = lines
        .slice(1) // Skip header line
        .join('\n')
        .trim();
    }
  }
  
  // Fallback if section not found
  if (!systemPromptSection) {
    // Fallback to hardcoded prompt (should not happen if template is correct)
    logger.warn('[Title Generation] Prompt template section not found, using fallback', { context });
    return context === 'transcripts'
      ? `You are a title generator. Generate a concise, descriptive title (max ${maxLength} characters) based on video transcripts. The title should capture the main themes and topics discussed. Write the title in ${language}. Return ONLY the title, no quotes, no explanation.`
      : `You are a title generator. Generate a concise, descriptive title (max ${maxLength} characters) based on a video summary. The title should capture the key insights and main topics. Write the title in ${language}. Return ONLY the title, no quotes, no explanation.`;
  }
  
  // Replace placeholders with actual values
  return systemPromptSection
    .replace(/{maxLength}/g, maxLength.toString())
    .replace(/{language}/g, language);
}

/**
 * Get user prompt for title generation
 * @param context Content context (transcripts or summary)
 * @param content Content to generate title from
 * @param language Language to generate title in
 * @returns User prompt string
 */
export function getTitleGenerationUserPrompt(
  context: TitleContext,
  content: string,
  language: string
): string {
  const template = loadPromptTemplate();
  
  // Extract user prompt template section
  const sections = template.split('## ');
  const userPromptSection = sections.find(s => 
    s.trim().startsWith('User Prompt Template')
  );
  
  if (!userPromptSection) {
    // Fallback if template structure changes
    logger.warn('[Title Generation] User prompt template section not found, using fallback', { context });
    const contextType = context === 'transcripts' ? 'video transcripts' : 'video summary';
    return `Based on this ${contextType}, generate a concise title in ${language}:\n\n${content}`;
  }
  
  // Extract template content (skip first line which is the header)
  const lines = userPromptSection.split('\n');
  const templateContent = lines
    .slice(1) // Skip header line
    .join('\n')
    .trim();
  
  // Replace placeholders
  const contextType = context === 'transcripts' ? 'video transcripts' : 'video summary';
  return templateContent
    .replace(/{contextType}/g, contextType)
    .replace(/{language}/g, language)
    .replace(/{content}/g, content);
}

