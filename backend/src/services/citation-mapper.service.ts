/**
 * Citation Mapper Service
 * Maps selected videos to citation numbers and generates citation metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { SelectedVideo } from '../models/Research';
import {
  CitationMetadata,
  CitationMetadataItem,
  CitationPromptContext,
} from '../types/citation.types';
import { getCitationConfig } from '../config';
import { ensureVideoUploadDate } from '../constants/dates';
import logger from '../utils/logger';

/**
 * Get the prompts directory path
 * In dist (compiled): __dirname is dist/services → resolve to project root then src/prompts.
 * In Docker we have /app/src and /app/dist; src/prompts exists at /app/src/prompts.
 */
function getPromptsDir(): string {
  // __dirname in compiled code is dist/services
  const distPromptsDir = path.resolve(__dirname, '../prompts');
  const srcPromptsDir = path.resolve(__dirname, '../../src/prompts');

  if (__dirname.includes('dist') && fs.existsSync(srcPromptsDir)) {
    return srcPromptsDir;
  }
  if (fs.existsSync(distPromptsDir)) {
    return distPromptsDir;
  }
  return path.resolve(__dirname, '../prompts');
}

/**
 * Load citation instructions template from markdown file
 */
function loadCitationInstructionsTemplate(): string {
  const promptsDir = getPromptsDir();
  const templatePath = path.join(promptsDir, 'general', 'citation-instructions.md');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Citation instructions template not found at ${templatePath}. Please ensure citation-instructions.md exists in prompts/general.`
    );
  }
  
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Format duration from seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Video search result interface (for view_count lookup)
 */
interface VideoSearchResult {
  video_id: string;
  view_count: number;
}

/**
 * Generate citation map from selected videos
 * Maps videos to citation numbers: selected_videos[0] → [1], selected_videos[1] → [2], etc.
 * 
 * @param selectedVideos Array of selected videos
 * @param rawVideoResults Optional array of raw video results to look up view_count
 * @returns Citation metadata dictionary indexed by citation number
 */
export function generateCitationMap(
  selectedVideos: SelectedVideo[],
  rawVideoResults?: VideoSearchResult[]
): CitationMetadata {
  const citationMap: CitationMetadata = {};
  
  // Create a lookup map for view_count by video_id
  const viewCountMap = new Map<string, number>();
  if (rawVideoResults) {
    rawVideoResults.forEach(video => {
      viewCountMap.set(video.video_id, video.view_count);
    });
  }

  selectedVideos.forEach((video, index) => {
    const citationNumber = (index + 1).toString();
    
    // Look up view_count from raw video results if available
    const viewCount = viewCountMap.get(video.video_id) || 0;
    
    citationMap[citationNumber] = {
      videoId: video.video_id,
      title: video.title,
      channel: video.channel,
      thumbnail: video.thumbnail,
      url: video.url,
      duration_seconds: video.duration_seconds,
      upload_date: ensureVideoUploadDate(video.upload_date),
      view_count: viewCount,
    };
  });

  logger.debug('[Citation Mapper] Generated citation map', {
    videoCount: selectedVideos.length,
    citationCount: Object.keys(citationMap).length,
    viewCountsFound: Array.from(viewCountMap.values()).filter(v => v > 0).length,
  });

  return citationMap;
}

/**
 * Format citation prompt context for AI
 * Creates a formatted string with video references and citation instructions
 * 
 * @param citationMap Citation metadata dictionary
 * @param language Report language for localization
 * @returns Formatted prompt context string
 */
export function formatCitationPromptContext(
  citationMap: CitationMetadata,
  language: string
): CitationPromptContext {
  const config = getCitationConfig();
  
  // Format video references list
  const videoReferences = Object.entries(citationMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([number, metadata]) => {
      const duration = formatDuration(metadata.duration_seconds);
      return `[${number}] "${metadata.title}" - ${metadata.channel} (${duration}, ${metadata.upload_date})`;
    })
    .join('\n');

  // Get localized citation instructions
  const sourcesHeading = config.sources_heading[language] || config.sources_heading['English'] || '### Sources';
  const formatExample = config.format_examples[language] || config.format_examples['English'] || '';

  // Format sources list
  const sourcesList = Object.entries(citationMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([number, metadata]) => {
      const duration = formatDuration(metadata.duration_seconds);
      return `[${number}] ${metadata.title} - ${metadata.channel} (${duration}, ${metadata.upload_date})`;
    })
    .join('\n');

  // Load citation instructions template from markdown file
  let citationInstructions = loadCitationInstructionsTemplate();
  
  // Replace placeholders
  citationInstructions = citationInstructions.replace(/{videoReferences}/g, videoReferences);
  citationInstructions = citationInstructions.replace(/{sourcesHeading}/g, sourcesHeading);
  citationInstructions = citationInstructions.replace(/{sourcesList}/g, sourcesList);
  
  // Handle formatExample - remove the line if empty, otherwise replace with formatted example
  if (formatExample && formatExample.trim().length > 0) {
    citationInstructions = citationInstructions.replace(
      /{formatExample}/g,
      `\n**Example Format:**\n${formatExample}`
    );
  } else {
    // Remove the line containing {formatExample} placeholder
    citationInstructions = citationInstructions.replace(/\n?{formatExample}\n?/g, '');
  }

  logger.debug('[Citation Mapper] Formatted citation prompt context', {
    language,
    citationCount: Object.keys(citationMap).length,
    instructionsLength: citationInstructions.length,
  });

  return {
    videoReferences,
    citationInstructions,
  };
}
