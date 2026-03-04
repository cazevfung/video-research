/**
 * Guest routes
 * Handles guest-specific endpoints
 */

import { Router } from 'express';
import { getGuestSummary } from '../services/guest-summary.service';
import { getGuestSession } from '../services/guest-session.service';
import { migrateGuestSummary } from '../services/guest-migration.service';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../middleware/optional-auth.middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/guest/summary/:sessionId
 * Get guest summary by session ID
 */
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Validate session exists
    const session = getGuestSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: {
          code: 'GUEST_SESSION_NOT_FOUND',
          message: 'Guest session not found or expired.',
        },
      });
    }

    // Get guest summary
    const guestSummary = getGuestSummary(sessionId);
    if (!guestSummary) {
      return res.status(404).json({
        error: {
          code: 'GUEST_SUMMARY_NOT_FOUND',
          message: 'Guest summary not found or session expired.',
        },
      });
    }

    logger.debug('Retrieved guest summary', {
      sessionId,
      jobId: guestSummary.jobId,
    });

    res.json({
      summary: guestSummary.summaryData,
    });
  } catch (error) {
    logger.error('Error retrieving guest summary', {
      error,
      sessionId: req.params.sessionId,
    });
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve guest summary',
      },
    });
  }
});

/**
 * POST /api/guest/migrate
 * Migrate guest summary to authenticated user account
 * Requires authentication
 */
router.post('/migrate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const guestSessionId = req.body.guestSessionId;
    
    if (!guestSessionId || typeof guestSessionId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'guestSessionId is required',
        },
      });
    }

    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    const migrated = await migrateGuestSummary(guestSessionId, userId);
    
    if (!migrated) {
      return res.status(404).json({
        error: {
          code: 'GUEST_SUMMARY_NOT_FOUND',
          message: 'No guest summary found to migrate',
        },
      });
    }

    logger.info('Guest summary migrated successfully', {
      guestSessionId,
      userId,
    });

    res.json({
      success: true,
      message: 'Guest summary migrated successfully',
    });
  } catch (error) {
    logger.error('Error migrating guest summary', {
      error,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to migrate guest summary',
      },
    });
  }
});

export default router;

