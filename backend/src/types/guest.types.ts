/**
 * Guest access types
 * Defines types for guest session management and guest summaries
 */

/**
 * Guest session information
 */
export interface GuestSession {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  summaryCount: number; // Max 1 for guests
  ipAddress?: string; // For abuse prevention
}

/**
 * Guest summary storage structure
 */
export interface GuestSummary {
  sessionId: string;
  jobId: string;
  summaryData: GuestSummaryData;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Guest summary data (matches Summary structure but without user_id)
 */
export interface GuestSummaryData {
  id?: string;
  job_id: string;
  batch_title: string;
  source_videos: Array<{
    url: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    word_count: number;
    was_pre_condensed: boolean;
    transcript_length?: number;
    video_id?: string;
    upload_date?: string;
  }>;
  user_prompt_focus?: string;
  preset_style: string;
  final_summary_text: string;
  language: string;
  processing_stats?: {
    total_videos: number;
    total_tokens_used?: number;
    processing_time_seconds?: number;
    failed_videos_count?: number;
  };
  created_at: Date | string;
  updated_at?: Date | string;
}


