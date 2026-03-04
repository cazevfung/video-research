/**
 * Citation System Types
 * Type definitions for the numbered citation system
 */

import { SelectedVideo } from '../models/Research';

/**
 * Citation metadata for a single video source
 */
export interface CitationMetadataItem {
  videoId: string;           // YouTube video ID
  title: string;             // Video title
  channel: string;           // Channel name
  thumbnail: string;         // Thumbnail URL
  url: string;               // Full YouTube URL
  duration_seconds: number;  // Duration in seconds
  upload_date: string;       // "2 months ago"
  view_count: number;        // View count
  firstAppearance?: {
    section: string;         // Section title where first cited
    position: number;        // Character position in full text
  };
}

/**
 * Citation metadata dictionary
 * Key: citation number (string "1", "2", etc.)
 * Value: citation metadata for that video
 */
export interface CitationMetadata {
  [citationNumber: string]: CitationMetadataItem;
}

/**
 * Citation usage map
 * Tracks which citations appear in which sections
 * Key: section heading (H2 title)
 * Value: array of citation numbers used in that section
 */
export interface CitationUsageMap {
  [sectionHeading: string]: number[];
}

/**
 * Citation prompt context for AI
 */
export interface CitationPromptContext {
  videoReferences: string; // Formatted string for AI prompt
  citationInstructions: string; // Citation format rules
}

/**
 * Citation configuration from config.yaml
 */
export interface CitationConfig {
  enabled: boolean;
  sources_heading: {
    [language: string]: string; // Localized "Sources" heading per language
  };
  format_examples: {
    [language: string]: string; // Citation format examples per language
  };
}
