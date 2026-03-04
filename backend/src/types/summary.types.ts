/**
 * Summary request/response types
 * Used for API endpoints and internal processing
 */

import { PresetStyle } from '../prompts';
import { SourceVideo, ProcessingStats } from '../models/Summary';

/**
 * Job status enum
 */
export type JobStatus =
  | 'pending'
  | 'fetching'
  | 'processing'
  | 'condensing'
  | 'aggregating'
  | 'generating'
  | 'generating_summary'
  | 'completed'
  | 'error';

/**
 * Summary request input type
 */
export interface SummaryRequest {
  urls: string[];
  preset: PresetStyle;
  custom_prompt?: string;
  language: string;
}

/**
 * Source video metadata (for API responses)
 */
export interface SourceVideoResponse {
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration_seconds: number;
  was_pre_condensed: boolean;
  /** Video publish/upload date when available (e.g. YYYY-MM-DD). Omit only when unavailable. */
  upload_date?: string;
}

/**
 * Summary response (for completed summary)
 */
export interface SummaryResponse {
  _id: string;
  user_id: string | null;
  batch_title: string;
  source_videos: SourceVideoResponse[];
  user_prompt_focus?: string;
  preset_style: PresetStyle;
  final_summary_text: string;
  language: string;
  processing_stats?: ProcessingStats;
  created_at: Date | string;
}

/**
 * Job response (from POST /api/summarize)
 */
export interface JobResponse {
  job_id: string;
}

/**
 * Summary progress event (for SSE)
 */
export interface SummaryProgress {
  status: JobStatus | 'connected' | 'heartbeat';
  progress: number; // 0-100
  message?: string;
  chunk?: string; // Text chunk during final generation
  title?: string; // AI-generated title (quick or refined)
  data?: SummaryResponse; // Full summary on completion
  source_videos?: SourceVideoResponse[]; // Source videos (sent after processing, before generation)
  error?: string; // Error message on failure
  job_id?: string; // Job ID for connection confirmation
  research_query?: string; // Research query (for research jobs)
}

/**
 * Job information (internal)
 */
export interface JobInfo {
  job_id: string;
  user_id: string | null;
  status: JobStatus;
  progress: number;
  created_at: Date;
  updated_at: Date;
  error?: string;
  summary_id?: string; // Firestore summary document ID
  title?: string | null; // Task title (can be null if not yet generated)
  cancelled?: boolean; // Whether the task was cancelled
  // Research-specific intermediate data
  research_data?: {
    // Core fields
    research_query?: string;
    language?: string;
    
    // Legacy fields (for backward compatibility)
    generated_queries?: string[];
    raw_video_results?: any[]; // VideoSearchResult[]
    selected_videos?: any[]; // SelectedVideo[]
    video_count?: number;
    
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
    previous_selected_videos?: any[];
    
    // Transcript tracking
    transcript_success_count?: number;
    
    // Style guide
    style_guide?: string;
  };
}

