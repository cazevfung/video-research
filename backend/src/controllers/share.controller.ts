/**
 * Share controller
 * Handles share link creation and retrieval requests
 */

import { Request, Response } from 'express';
import {
  createOrGetShareLink,
  createOrGetShareLinkForSummary,
  getSharedResearch,
} from '../services/share.service';
import { getResearchById, userOwnsResearch } from '../models/Research';
import { getSummaryById, userOwnsSummary } from '../models/Summary';
import { generateCitationMap } from '../services/citation-mapper.service';
import { AuthenticatedRequest } from '../middleware/optional-auth.middleware';
import logger from '../utils/logger';

/**
 * POST /api/research/:researchId/share
 * Create or get existing share link for a research
 */
export async function createShare(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const researchId = req.params.researchId;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!researchId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Research ID is required',
        },
      });
      return;
    }

    // Verify research exists
    const research = await getResearchById(researchId);
    if (!research) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Research not found',
        },
      });
      return;
    }

    // Verify user owns the research
    const ownsResearch = await userOwnsResearch(researchId, userId);
    if (!ownsResearch) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to share this research',
        },
      });
      return;
    }

    // Create or get share link
    const result = await createOrGetShareLink(researchId, userId);

    res.status(200).json({
      success: true,
      data: {
        shareId: result.shareId,
        shareUrl: result.shareUrl,
        isNew: result.isNew,
        createdAt: result.createdAt,
        accessCount: result.accessCount,
      },
      message: result.isNew
        ? 'Share link created successfully'
        : 'Share link already exists',
    });
  } catch (error) {
    logger.error('Error creating share link', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create share link: ${errorMessage}`,
      },
    });
  }
}

/**
 * POST /api/history/:summaryId/share
 * Create or get existing share link for a summary
 */
export async function createSummaryShare(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const summaryId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!summaryId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Summary ID is required',
        },
      });
      return;
    }

    const summary = await getSummaryById(summaryId);
    if (!summary) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Summary not found',
        },
      });
      return;
    }

    const ownsSummary = await userOwnsSummary(summaryId, userId);
    if (!ownsSummary) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to share this summary',
        },
      });
      return;
    }

    const result = await createOrGetShareLinkForSummary(summaryId, userId);

    res.status(200).json({
      success: true,
      data: {
        shareId: result.shareId,
        shareUrl: result.shareUrl,
        isNew: result.isNew,
        createdAt: result.createdAt,
        accessCount: result.accessCount,
      },
      message: result.isNew
        ? 'Share link created successfully'
        : 'Share link already exists',
    });
  } catch (error) {
    logger.error('Error creating share link for summary', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create share link: ${errorMessage}`,
      },
    });
  }
}

/**
 * GET /api/shared/:shareId
 * Get shared research data (public endpoint, no auth required)
 */
export async function getSharedResearchData(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const shareId = req.params.shareId;

    if (!shareId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Share ID is required',
        },
      });
      return;
    }

    // Phase 5: Get share record with abuse detection
    const clientIp = req.ip || req.socket.remoteAddress || undefined;
    const { share, requiresCaptcha } = await getSharedResearch(shareId, clientIp);

    const metadata = {
      shareId: share.shareId,
      sharedAt: share.createdAt,
      viewCount: share.accessCount,
      sharedBy: null as string | null,
      requiresCaptcha: requiresCaptcha || false,
    };

    // Handle summary shares
    if (share.contentType === 'summary' && share.contentId) {
      const summary = await getSummaryById(share.contentId);
      if (!summary) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Summary not found',
          },
        });
        return;
      }

      const summaryData = {
        _id: summary.id,
        user_id: summary.user_id,
        batch_title: summary.batch_title,
        source_videos: summary.source_videos.map((v) => ({
          url: v.url,
          title: v.title,
          channel: v.channel,
          thumbnail: v.thumbnail,
          duration_seconds: v.duration_seconds,
          was_pre_condensed: v.was_pre_condensed,
          upload_date: v.upload_date,
        })),
        user_prompt_focus: summary.user_prompt_focus,
        preset_style: summary.preset_style,
        final_summary_text: summary.final_summary_text,
        language: summary.language,
        processing_stats: summary.processing_stats,
        created_at: summary.created_at,
      };

      res.status(200).json({
        success: true,
        data: {
          contentType: 'summary',
          summary: summaryData,
          metadata,
        },
      });
      return;
    }

    // Handle research shares (default/legacy)
    const research = await getResearchById(share.researchId);
    if (!research) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Research not found',
        },
      });
      return;
    }

    const citations =
      research.citations ??
      generateCitationMap(
        (research.selected_videos ?? []) as any,
        (research.video_search_results ?? []) as any
      );

    res.status(200).json({
      success: true,
      data: {
        contentType: 'research',
        research: {
          id: research.id,
          research_query: research.research_query,
          language: research.language,
          video_search_results: research.video_search_results,
          selected_videos: research.selected_videos,
          final_summary_text: research.final_summary_text,
          created_at: research.created_at,
          processing_stats: research.processing_stats,
          citations,
          citationUsage: research.citationUsage,
        },
        metadata,
      },
    });
  } catch (error) {
    logger.error('Error getting shared research', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not found') || errorMessage.includes('Share not found')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Share link not found',
        },
      });
      return;
    }

    if (errorMessage.includes('revoked')) {
      res.status(410).json({
        success: false,
        error: {
          code: 'GONE',
          message: 'Share link has been revoked',
        },
      });
      return;
    }

    if (errorMessage.includes('expired')) {
      res.status(410).json({
        success: false,
        error: {
          code: 'GONE',
          message: 'Share link has expired',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to get shared research: ${errorMessage}`,
      },
    });
  }
}
