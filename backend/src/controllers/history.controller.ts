/**
 * History controller
 * Handles history and library management endpoints
 * Phase 4: Unified history (summaries + research results), config-driven, no hardcoding
 */

import { Request, Response } from 'express';
import {
  getSummariesByUserId,
  getSummaryById as getSummaryByIdFromModel,
  userOwnsSummary,
  SummaryListItem,
} from '../models/Summary';
import { getUserResearches } from '../models/Research';
import { AuthenticatedUser } from '../types/auth.types';
import { getSystemConfig, DEV_MODE } from '../config';
import env from '../config/env';
import logger from '../utils/logger';
import { normalizeCreatedAtToISO } from '../utils/date-normalizer';

/** Phase 4: History list item with type discriminator (summary | research) */
export interface HistoryListItem extends SummaryListItem {
  type: 'summary' | 'research';
}

/**
 * Extended Request type with user
 */
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Phase 4: Normalize date to ISO string (uses shared date-normalizer)
 */
function normalizeDate(date: Date | string | undefined, itemId: string, itemType: string, userId: string | null): string {
  return normalizeCreatedAtToISO(date, itemId, itemType, { userId });
}

/**
 * Phase 4: Get paginated list of user's summaries AND research results
 * GET /api/history
 * Combines summaries and researches, sorts by date, adds type discriminator
 */
export async function getHistory(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Use uid (Firebase Auth UID) if available, fallback to id for backward compatibility
    const userId = req.user?.uid || req.user?.id || null;
    const effectiveUserId = userId || env.DEV_USER_ID; // For getUserResearches which requires non-null
    const systemConfig = getSystemConfig();
    
    // Parse pagination parameters (from config, not hardcoded)
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const defaultLimit = systemConfig.history_pagination_default_limit;
    const maxLimit = systemConfig.history_pagination_max_limit;
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));

    logger.debug('Fetching unified history (summaries + research)', { userId, page, limit });

    // Phase 4: Fetch both summaries and researches in parallel
    const [summariesResult, researchesResult] = await Promise.all([
      getSummariesByUserId(userId, page, limit),
      getUserResearches(effectiveUserId, maxLimit), // Fetch up to max limit for merging
    ]);

    // Phase 4: Format summaries with type discriminator
    const formattedSummaries: HistoryListItem[] = summariesResult.summaries.map((summary) => {
      try {
        const created_at = normalizeDate(summary.created_at, summary.id || 'unknown', 'Summary', userId);
        return {
          _id: summary.id!,
          batch_title: summary.batch_title,
          created_at,
          source_videos: summary.source_videos.map((video) => ({
            thumbnail: video.thumbnail,
            title: video.title,
          })),
          video_count: summary.source_videos.length,
          type: 'summary' as const,
        };
      } catch (formatError) {
        logger.error('Error formatting summary in history response', {
          error: formatError,
          summaryId: summary.id,
          userId,
        });
        return {
          _id: summary.id!,
          batch_title: summary.batch_title,
          created_at: new Date().toISOString(),
          source_videos: summary.source_videos.map((video) => ({
            thumbnail: video.thumbnail,
            title: video.title,
          })),
          video_count: summary.source_videos.length,
          type: 'summary' as const,
        };
      }
    });

    // Phase 4: Format researches with type discriminator
    const formattedResearches: HistoryListItem[] = researchesResult.map((research) => {
      try {
        const created_at = normalizeDate(research.created_at, research.id || 'unknown', 'Research', userId);
        const batch_title = research.research_query || systemConfig.history_research_fallback_title;
        const selectedVideos = research.selected_videos || [];
        
        return {
          _id: research.id!,
          batch_title,
          created_at,
          source_videos: selectedVideos.map((video) => ({
            thumbnail: video.thumbnail,
            title: video.title,
          })),
          video_count: selectedVideos.length,
          type: 'research' as const,
        };
      } catch (formatError) {
        logger.error('Error formatting research in history response', {
          error: formatError,
          researchId: research.id,
          userId,
        });
        return {
          _id: research.id!,
          batch_title: research.research_query || systemConfig.history_research_fallback_title,
          created_at: new Date().toISOString(),
          source_videos: (research.selected_videos || []).map((video) => ({
            thumbnail: video.thumbnail,
            title: video.title,
          })),
          video_count: (research.selected_videos || []).length,
          type: 'research' as const,
        };
      }
    });

    // Phase 4: Combine and sort by created_at (newest first)
    const combinedItems: HistoryListItem[] = [...formattedSummaries, ...formattedResearches].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Descending (newest first)
    });

    // Phase 4: Apply pagination to combined results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = combinedItems.slice(startIndex, endIndex);
    const total = combinedItems.length;
    const totalPages = Math.ceil(total / limit);

    // Return formatted response (maintain backward compatibility with 'summaries' key)
    res.status(200).json({
      summaries: paginatedItems, // Frontend expects 'summaries' key
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const isIndexError =
      /index|Index|Missing Firestore index/i.test(errorMessage);

    logger.error('Error fetching unified history', {
      error: errorMessage,
      stack: errorStack,
      userId: req.user?.uid || req.user?.id || null,
      page: req.query.page,
      limit: req.query.limit,
      isIndexError,
    });

    if (isIndexError) {
      res.status(500).json({
        error: {
          code: 'MISSING_INDEX',
          message:
            'History requires Firestore composite indexes. Create indexes for collections "summaries" and "researches": user_uid (Ascending), created_at (Descending). See Firebase Console → Firestore → Indexes.',
          ...(DEV_MODE && { details: errorMessage, stack: errorStack }),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve history',
        ...(DEV_MODE && { details: errorMessage, stack: errorStack }),
      },
    });
  }
}

/**
 * Get full details of a specific summary
 * GET /api/history/:id or GET /api/summary/:id
 */
export async function getSummaryById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const summaryId = req.params.id;
    // Use uid (Firebase Auth UID) if available, fallback to id for backward compatibility
    const userId = req.user?.uid || req.user?.id || null;

    if (!summaryId) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Summary ID is required',
        },
      });
      return;
    }

    logger.debug('Fetching summary by ID', { summaryId, userId });

    // Get summary from database
    const summary = await getSummaryByIdFromModel(summaryId);

    if (!summary) {
      res.status(404).json({
        error: {
          code: 'SUMMARY_NOT_FOUND',
          message: 'Summary not found',
        },
      });
      return;
    }

    // Check ownership (skip if auth disabled)
    const ownsSummary = await userOwnsSummary(summaryId, userId);
    if (!ownsSummary) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this summary',
        },
      });
      return;
    }

    // Format response (full summary document)
    const response = {
      _id: summary.id!,
      user_id: summary.user_id,
      batch_title: summary.batch_title,
      source_videos: summary.source_videos.map((video) => ({
        url: video.url,
        title: video.title,
        channel: video.channel,
        thumbnail: video.thumbnail,
        duration_seconds: video.duration_seconds,
        was_pre_condensed: video.was_pre_condensed,
        upload_date: video.upload_date,
      })),
      user_prompt_focus: summary.user_prompt_focus,
      preset_style: summary.preset_style,
      final_summary_text: summary.final_summary_text,
      language: summary.language,
      processing_stats: summary.processing_stats,
      created_at: summary.created_at,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching summary by ID', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve summary',
      },
    });
  }
}

