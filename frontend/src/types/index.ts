/**
 * Base type definitions for the frontend application
 * More specific types will be added in subsequent phases
 */

// Export user-related types
export * from './user';

// Export research-related types
export * from './research';

export type JobStatus =
  | "idle"
  | "connected"
  | "fetching"
  | "processing"
  | "condensing"
  | "aggregating"
  | "generating"
  | "completed"
  | "error"
  | "heartbeat";

/**
 * Summary Progress Event from SSE
 * Matches backend SummaryProgress interface
 */
export interface SummaryProgress {
  status: JobStatus;
  progress: number; // 0-100
  message?: string; // Human-readable status message
  chunk?: string; // Text chunk streaming in real-time (only during 'generating')
  title?: string; // AI-generated title (quick or refined)
  data?: SummaryResponse; // Complete summary data (only on 'completed')
  source_videos?: Array<{
    url: string;
    title: string;
    channel: string;
    thumbnail?: string;
    duration_seconds?: number;
    was_pre_condensed?: boolean;
    upload_date?: string;
  }>; // Source videos (sent after processing, before generation)
  error?: string; // Error message if something goes wrong (only on 'error')
  job_id?: string; // Job ID for connection tracking (only on 'connected')
}

/**
 * Summary Request Payload
 */
export interface SummaryRequest {
  urls: string[];
  preset?: string | null;
  custom_prompt?: string;
  language?: string;
}

/**
 * Summary Response Data
 * Matches backend SummaryResponse structure
 */
export interface SummaryResponse {
  _id?: string;
  job_id?: string;
  user_id?: string;
  batch_title?: string;
  source_videos?: Array<{
    url: string;
    title: string;
    channel: string;
    thumbnail?: string;
    duration_seconds?: number;
    was_pre_condensed?: boolean;
    upload_date?: string;
  }>;
  user_prompt_focus?: string;
  preset_style?: string;
  final_summary_text: string;
  language?: string;
  processing_stats?: {
    total_videos: number;
    total_duration_seconds: number;
    processing_time_seconds: number;
  };
  created_at?: string | Date;
  video_count?: number; // Legacy field for compatibility
  processing_time?: number; // Legacy field for compatibility
}

/**
 * Summary List Item (lighter weight for history list)
 * Matches backend SummaryListItem structure
 * Phase 4: Extended to support both summaries and research results
 * 
 * @property _id - Unique identifier for the summary/research (required)
 * @property batch_title - Title of the summary batch or research query (required)
 * @property created_at - Creation timestamp. Should always be a valid ISO 8601 string (YYYY-MM-DDTHH:mm:ss.sssZ) 
 *                        in production data. May be a Date object during runtime, but should be normalized to 
 *                        ISO string before serialization. Invalid dates will be sanitized to current timestamp.
 * @property source_videos - Array of source video metadata (required)
 * @property video_count - Number of videos in the summary/research (required, should match source_videos.length)
 * @property type - Type discriminator: 'summary' | 'research' (Phase 4)
 */
export interface SummaryListItem {
  _id: string;
  batch_title: string;
  /** 
   * Creation timestamp in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).
   * Should always be a valid date string. Invalid dates will trigger sanitization.
   */
  created_at: string | Date;
  source_videos: Array<{
    thumbnail: string;
    title: string;
  }>;
  video_count: number;
  /** Phase 4: Type discriminator to distinguish summaries from research results */
  type?: 'summary' | 'research';
}

/**
 * Pagination metadata
 * Phase 3: Added hasMore field to support backend responses that don't include totalPages
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages?: number; // Optional - backend may not provide this if total count is unknown
  hasMore?: boolean; // Alternative to totalPages - indicates if there are more pages
}

/**
 * History Response
 * Matches backend response structure
 * Phase 4: Now includes both summaries and research results (unified history)
 */
export interface HistoryResponse {
  summaries: SummaryListItem[]; // Phase 4: May contain both summaries and research results (check type field)
  pagination: PaginationInfo;
}

/**
 * Hook return type for useSummaryStream
 * Defined here for type consistency
 */
export interface UseSummaryStreamReturn {
  startJob: (payload: SummaryRequest) => Promise<void>;
  status: JobStatus | 'idle' | 'connected';
  progress: number;
  message: string | null;
  streamedText: string;
  title: string | null; // AI-generated title (quick or refined)
  error: string | null;
  isStreaming: boolean;
  chunkCount: number; // Phase 3: Number of chunks received
  videoCount: number;
  completedVideos: number;
  reset: () => void;
}

