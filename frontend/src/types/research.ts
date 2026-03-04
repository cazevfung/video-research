/**
 * Research Feature Type Definitions
 * Matches backend API responses exactly
 * All field names use snake_case to match backend
 */

/**
 * Research job status types
 * Matches backend ResearchStatus enum
 * Phase 3: Added approval and regeneration statuses
 */
export type ResearchStatus =
  | 'idle'
  | 'connected'
  | 'generating_questions'
  | 'awaiting_question_approval'
  | 'regenerating_questions'
  | 'generating_search_terms'
  | 'awaiting_search_term_approval'
  | 'regenerating_search_terms'
  | 'generating_queries' // Legacy
  | 'searching_videos'
  | 'videos_found'
  | 'filtering_videos'
  | 'awaiting_video_approval'
  | 'refiltering_videos'
  | 'fetching_transcripts'
  | 'transcripts_ready'
  | 'generating_style_guide'
  | 'generating_summary'
  | 'completed'
  | 'error'
  | 'heartbeat'
  | 'citations:metadata'
  | 'citations:section-complete';

/**
 * Research progress event from SSE
 * Matches backend ResearchProgress interface
 * Phase 3: Added approval stage data
 * Phase 4: Added citation events
 */
export interface ResearchProgress {
  status: ResearchStatus;
  progress: number; // 0-100
  message?: string;
  chunk?: string; // Text chunk during 'generating_summary' or AI generation stages
  title?: string; // AI-generated title
  data?: ResearchResponse; // Complete research data on 'completed'
  
  // Intermediate data (available during processing)
  generated_queries?: string[]; // Search queries generated (legacy)
  raw_video_results?: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    view_count: number;
    upload_date: string;
    url: string;
  }>; // Videos found from search (before filtering)
  video_count?: number; // Total number of videos found
  selected_videos?: SelectedVideo[]; // Videos selected by AI after filtering
  
  // Phase 3: Approval stage data
  research_data?: {
    // Core fields
    research_query?: string;
    language?: string;
    
    // Stage 1: Questions
    generated_questions?: string[]; // Complete array when generation finishes
    partial_questions?: string[]; // Partial array during streaming (Phase 3)
    question_approval_status?: 'pending' | 'approved' | 'regenerating';
    question_feedback_count?: 0 | 1;
    question_user_feedback?: string;
    previous_questions?: string[];
    
    // Stage 2: Search Terms
    generated_search_terms?: string[]; // Complete array when generation finishes
    partial_search_terms?: string[]; // Partial array during streaming (Phase 3)
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
  
  // Phase 4: Citation events
  citation_metadata?: import('./citations').CitationMetadata; // Sent once at start via citations:metadata event
  citation_section_complete?: {
    section: string; // Section heading
    citations_used: number[]; // Array of citation numbers used in this section
  }; // Sent when section completes via citations:section-complete event
  
  // Original research query (available during processing if stored in job object)
  research_query?: string;
  
  error?: string;
  job_id?: string;
}

/**
 * Research request payload
 * Matches backend ResearchRequest interface
 */
export interface ResearchRequest {
  research_query: string;
  language: string;
}

/**
 * Selected video with classification and rationale
 * Matches backend SelectedVideo interface
 */
export interface SelectedVideo {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration_seconds: number;
  url: string;
  classification: 'Direct' | 'Foundational' | 'Contrarian';
  why_selected: string;
  fills_gap: string;
  /** Optional; present when mapped from citation metadata or raw video results */
  upload_date?: string;
}

/**
 * Source video transcript data
 * Matches backend SourceVideo interface
 */
export interface SourceVideo {
  video_id: string;
  title: string;
  channel: string;
  thumbnail?: string;
  duration_seconds?: number;
  url: string;
  transcript?: string;
}

/**
 * Research processing statistics
 * Matches backend ResearchProcessingStats interface
 */
export interface ResearchProcessingStats {
  total_queries_generated: number;
  total_videos_searched: number;
  total_videos_selected: number;
  total_transcripts_fetched: number;
  total_tokens_used: number;
  processing_time_seconds: number;
  failed_transcripts_count?: number;
}

/**
 * Research response data
 * Matches backend ResearchResponse structure
 */
export interface ResearchResponse {
  _id?: string;
  job_id?: string;
  user_uid?: string | null;
  research_query: string;
  language: string;
  generated_queries?: string[];
  selected_videos?: SelectedVideo[];
  source_transcripts?: SourceVideo[];
  final_summary_text: string;
  processing_stats?: ResearchProcessingStats;
  citations?: import('./citations').CitationMetadata; // Citation metadata for citation badges
  citationUsage?: import('./citations').CitationUsageMap; // Citation usage tracking
  created_at?: string | Date;
}

/**
 * Hook return type for useResearchStream
 * Defined here for type consistency
 */
export interface UseResearchStreamReturn {
  startJob: (payload: ResearchRequest) => Promise<void>;
  status: ResearchStatus | 'idle' | 'connected';
  progress: number;
  message: string | null;
  streamedText: string;
  title: string | null;
  error: string | null;
  errorType?: StreamingErrorType;
  errorCode?: string;
  isStreaming: boolean;
  generatedQueries?: string[];
  rawVideoResults?: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    view_count: number;
    upload_date: string;
    url: string;
  }>;
  selectedVideos?: SelectedVideo[];
  research: ResearchResponse | null;
  researchData?: ResearchProgress['research_data'] | null; // Phase 4: Approval stage data
  researchQuery?: string; // Current research query (from job or completion data)
  currentJobId: string | null; // Phase 4: Current job ID
  reset: () => void;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  manualReconnect: () => void;
  isCompleted: boolean;
  isCompleting: boolean;
}

/**
 * Streaming error type
 * Reused from summary feature
 */
export type StreamingErrorType =
  | 'network'
  | 'timeout'
  | 'server'
  | 'quota'
  | 'auth'
  | 'unknown';
