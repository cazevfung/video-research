/**
 * Guest summary storage service
 * Handles temporary storage of guest summaries with expiration
 */

import { GuestSummary, GuestSummaryData } from '../types/guest.types';
import { Summary } from '../models/Summary';
import env from '../config/env';
import { getGuestAccessConfig } from '../config';
import logger from '../utils/logger';

/**
 * In-memory storage for guest summaries
 * In production with Redis, this would be replaced with Redis storage
 */
const guestSummaries = new Map<string, GuestSummary>();

/**
 * Cleanup interval for expired summaries
 */
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Session expiry in milliseconds (from config)
 */
function getSessionExpiryMs(): number {
  return env.GUEST_SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
}

/**
 * Initialize cleanup job for expired summaries
 */
function initializeCleanup(): void {
  if (cleanupInterval) {
    return; // Already initialized
  }

  const guestConfig = getGuestAccessConfig();
  const cleanupIntervalMs = guestConfig.cleanup_interval_hours * 60 * 60 * 1000;

  // Run cleanup at configured interval
  cleanupInterval = setInterval(() => {
    cleanupExpiredSummaries();
  }, cleanupIntervalMs);

  logger.info('Guest summary cleanup interval initialized', {
    expiry_hours: env.GUEST_SESSION_EXPIRY_HOURS,
    cleanup_interval_hours: guestConfig.cleanup_interval_hours,
  });
}

/**
 * Clean up expired summaries
 */
function cleanupExpiredSummaries(): void {
  const now = new Date();
  let cleaned = 0;

  for (const [sessionId, summary] of guestSummaries.entries()) {
    if (summary.expiresAt < now) {
      guestSummaries.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired guest summaries`);
  }
}

/**
 * Convert Summary to GuestSummaryData
 */
function convertSummaryToGuestData(summary: Summary): GuestSummaryData {
  return {
    id: summary.id,
    job_id: summary.job_id,
    batch_title: summary.batch_title,
    source_videos: summary.source_videos.map((v) => ({
      url: v.url,
      title: v.title,
      channel: v.channel,
      thumbnail: v.thumbnail,
      duration_seconds: v.duration_seconds,
      word_count: v.word_count,
      was_pre_condensed: v.was_pre_condensed,
      transcript_length: v.transcript_length,
      video_id: v.video_id,
      upload_date: v.upload_date,
    })),
    user_prompt_focus: summary.user_prompt_focus,
    preset_style: summary.preset_style,
    final_summary_text: summary.final_summary_text,
    language: summary.language,
    processing_stats: summary.processing_stats,
    created_at: summary.created_at,
    updated_at: summary.updated_at,
  };
}

/**
 * Store guest summary
 * @param sessionId Guest session ID
 * @param jobId Job ID
 * @param summary Summary data
 */
export function storeGuestSummary(
  sessionId: string,
  jobId: string,
  summary: Summary
): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getSessionExpiryMs());

  const guestSummary: GuestSummary = {
    sessionId,
    jobId,
    summaryData: convertSummaryToGuestData(summary),
    createdAt: now,
    expiresAt,
  };

  guestSummaries.set(sessionId, guestSummary);

  logger.info('Stored guest summary', {
    sessionId,
    jobId,
    expiresAt: expiresAt.toISOString(),
  });

  // Initialize cleanup if not already done
  initializeCleanup();
}

/**
 * Get guest summary by session ID
 * @param sessionId Guest session ID
 * @returns Guest summary or null if not found/expired
 */
export function getGuestSummary(sessionId: string): GuestSummary | null {
  const summary = guestSummaries.get(sessionId);
  if (!summary) {
    return null;
  }

  // Check if expired
  if (summary.expiresAt < new Date()) {
    guestSummaries.delete(sessionId);
    return null;
  }

  return summary;
}

/**
 * Get guest summary by job ID
 * @param jobId Job ID
 * @returns Guest summary or null if not found
 */
export function getGuestSummaryByJobId(jobId: string): GuestSummary | null {
  for (const summary of guestSummaries.values()) {
    if (summary.jobId === jobId) {
      // Check if expired
      if (summary.expiresAt < new Date()) {
        guestSummaries.delete(summary.sessionId);
        return null;
      }
      return summary;
    }
  }
  return null;
}

/**
 * Check if summary is expired
 * @param summary Guest summary
 * @returns True if expired
 */
export function isGuestSummaryExpired(summary: GuestSummary): boolean {
  return summary.expiresAt < new Date();
}

/**
 * Clear guest summary
 * @param sessionId Session ID
 */
export function clearGuestSummary(sessionId: string): void {
  guestSummaries.delete(sessionId);
  logger.debug('Cleared guest summary', { sessionId });
}

/**
 * Shutdown cleanup
 */
export function shutdown(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  guestSummaries.clear();
  logger.info('Guest summary service shut down');
}

