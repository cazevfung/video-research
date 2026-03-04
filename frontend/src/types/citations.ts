/**
 * Citation System Type Definitions
 * Phase 3: Type definitions for citation system
 * Matches backend CitationMetadata and CitationUsageMap structures
 */

/**
 * Citation metadata for a single citation
 * Matches backend CitationMetadata structure
 */
export interface CitationMetadata {
  // Key: citation number (string "1", "2", etc.)
  [citationNumber: string]: {
    videoId: string; // YouTube video ID
    title: string; // Video title
    channel: string; // Channel name
    thumbnail: string; // Thumbnail URL
    url: string; // Full YouTube URL
    duration_seconds: number; // Duration in seconds
    upload_date: string; // "2 months ago"
    view_count: number; // View count
    firstAppearance?: {
      section: string; // Section title where first cited
      position: number; // Character position in full text
    };
  };
}

/**
 * Citation usage map
 * Tracks which citations appear in which sections
 */
export interface CitationUsageMap {
  // Key: section heading (H2 title)
  // Value: array of citation numbers used in that section
  [sectionHeading: string]: number[];
}

/**
 * Citation data for frontend components
 * Processed version of CitationMetadata with formatted values
 */
export interface CitationData {
  number: number; // Citation number
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  durationFormatted: string; // "14:25"
  uploadDate: string; // "2 months ago"
  viewCountFormatted: string; // "72K"
}

/**
 * Citation store state
 */
export interface CitationStoreState {
  // Citation metadata indexed by number
  citations: Map<number, CitationData>;
  
  // Current hover state
  hoveredCitation: number | null;
  
  // Tooltip positioning
  tooltipPosition: { x: number; y: number } | null;
  
  // Active video player
  activeVideoId: string | null;
  
  // Citation usage per section
  citationUsage: CitationUsageMap;
  
  // Current section being rendered
  currentSection: string | null;
}

/**
 * Citation badge props
 */
export interface CitationBadgeProps {
  number: number; // Citation number to display
  citationData: CitationData; // Full citation metadata
  onClick?: () => void; // Optional custom click handler
  className?: string; // Additional CSS classes
}

/**
 * Citation tooltip props
 */
export interface CitationTooltipProps {
  citationData: CitationData;
  position: { x: number; y: number };
  onClose: () => void;
  onWatchClick: (videoId: string) => void;
}

/**
 * Reference list props
 */
export interface ReferenceListProps {
  sectionTitle: string; // Section heading
  citations: CitationData[]; // Citations used in this section
  onCitationClick: (num: number) => void; // Scroll to citation in text
  onVideoClick: (videoId: string) => void; // Open video player
}

/**
 * Citation prompt context (for backend)
 * Used to pass citation mapping to AI prompt
 */
export interface CitationPromptContext {
  videoReferences: string; // Formatted string for AI prompt
  citationInstructions: string; // Citation format rules
}
