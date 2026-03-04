/**
 * Guest-to-authenticated migration service
 * Handles migration of guest summaries to authenticated user accounts
 */

import { getGuestSummary, clearGuestSummary } from './guest-summary.service';
import { clearGuestSession } from './guest-session.service';
import { createSummary, SummaryCreateData } from '../models/Summary';
import logger from '../utils/logger';

/**
 * Migrate guest summary to authenticated user account
 * @param guestSessionId Guest session ID
 * @param userId Authenticated user ID (Firebase Auth UID)
 * @returns True if migration was successful, false if no guest summary found
 */
export async function migrateGuestSummary(
  guestSessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const guestSummary = getGuestSummary(guestSessionId);
    
    if (!guestSummary) {
      logger.debug('No guest summary found to migrate', {
        guestSessionId,
        userId,
      });
      return false;
    }

    // Check if expired
    if (guestSummary.expiresAt < new Date()) {
      logger.debug('Guest summary expired, cannot migrate', {
        guestSessionId,
        userId,
        expiresAt: guestSummary.expiresAt.toISOString(),
      });
      clearGuestSummary(guestSessionId);
      return false;
    }

    // Convert guest summary data to SummaryCreateData
    const summaryData: SummaryCreateData = {
      user_uid: userId,
      job_id: guestSummary.jobId,
      batch_title: guestSummary.summaryData.batch_title,
      source_videos: guestSummary.summaryData.source_videos.map((v) => ({
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
      user_prompt_focus: guestSummary.summaryData.user_prompt_focus,
      preset_style: guestSummary.summaryData.preset_style as any,
      final_summary_text: guestSummary.summaryData.final_summary_text,
      language: guestSummary.summaryData.language,
      processing_stats: guestSummary.summaryData.processing_stats,
    };

    // Save to user's account
    const summary = await createSummary(summaryData);

    logger.info('Migrated guest summary to user account', {
      guestSessionId,
      userId,
      summaryId: summary.id,
      jobId: guestSummary.jobId,
    });

    // Clear guest session and summary
    clearGuestSummary(guestSessionId);
    clearGuestSession(guestSessionId);

    return true;
  } catch (error) {
    logger.error('Error migrating guest summary', {
      error,
      guestSessionId,
      userId,
    });
    throw error;
  }
}


