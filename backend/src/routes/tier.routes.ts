/**
 * Tier routes
 * Handles tier upgrade requests
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../middleware/firebase-auth.middleware';
import {
  requestTierUpgrade,
  getTierRequestStatus,
  approveTierUpgrade,
  rejectTierUpgrade,
} from '../services/tier.service';
import { getUserCredits } from '../services/credit.service';
import logger from '../utils/logger';
import { ValidationError } from '../utils/errors';

const router = Router();

/**
 * POST /api/tier/request
 * Request tier upgrade
 * Requires authentication
 */
router.post('/request', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { requestedTier, userEmail } = req.body;

    // Validate requested tier
    if (!requestedTier || !['starter', 'pro', 'premium'].includes(requestedTier)) {
      throw new ValidationError('Invalid tier', {
        errors: [
          {
            field: 'requestedTier',
            message: 'requestedTier must be one of: starter, pro, premium',
            value: requestedTier,
          },
        ],
      });
    }

    // Validate email
    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
      throw new ValidationError('Invalid email', {
        errors: [
          {
            field: 'userEmail',
            message: 'userEmail must be a valid email address',
            value: userEmail,
          },
        ],
      });
    }

    // Request tier upgrade
    const requestId = await requestTierUpgrade(
      req.user.id,
      requestedTier,
      userEmail
    );

    res.status(200).json({
      success: true,
      requestId,
      message: 'Tier upgrade request submitted successfully. You will be notified via email once processed.',
    });
  } catch (error) {
    logger.error('Error requesting tier upgrade', error);
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to request tier upgrade',
      },
    });
  }
});

/**
 * GET /api/tier/status
 * Get current tier and pending tier request status
 * Requires authentication
 */
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user credits (includes tier)
    // Pass tier for better performance in local storage mode
    const userCredits = await getUserCredits(req.user.id, req.user.tier);

    if (!userCredits) {
      res.status(404).json({ error: 'User credits not found' });
      return;
    }

    // Get pending tier request (if any)
    const pendingRequest = await getTierRequestStatus(req.user.id);

    res.status(200).json({
      tier: userCredits.tier,
      balance: userCredits.balance,
      pendingRequest: pendingRequest
        ? {
            requestId: pendingRequest.requestId,
            requestedTier: pendingRequest.requestedTier,
            requestedAt: pendingRequest.requestedAt.toDate().toISOString(),
            status: pendingRequest.status,
          }
        : null,
    });
  } catch (error) {
    logger.error('Error getting tier status', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get tier status',
      },
    });
  }
});

/**
 * POST /api/tier/approve
 * Approve tier upgrade request (admin only)
 * TODO: Add admin authentication middleware
 */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const { requestId, adminEmail, notes } = req.body;

    if (!requestId || !adminEmail) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requestId and adminEmail are required',
        },
      });
      return;
    }

    // TODO: Add admin authentication check
    // For now, allow any request (should be restricted in production)

    await approveTierUpgrade(requestId, adminEmail, notes);

    res.status(200).json({
      success: true,
      message: 'Tier upgrade approved successfully',
    });
  } catch (error) {
    logger.error('Error approving tier upgrade', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to approve tier upgrade',
      },
    });
  }
});

/**
 * POST /api/tier/reject
 * Reject tier upgrade request (admin only)
 * TODO: Add admin authentication middleware
 */
router.post('/reject', async (req: Request, res: Response) => {
  try {
    const { requestId, adminEmail, notes } = req.body;

    if (!requestId || !adminEmail) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requestId and adminEmail are required',
        },
      });
      return;
    }

    // TODO: Add admin authentication check
    // For now, allow any request (should be restricted in production)

    await rejectTierUpgrade(requestId, adminEmail, notes);

    res.status(200).json({
      success: true,
      message: 'Tier upgrade rejected',
    });
  } catch (error) {
    logger.error('Error rejecting tier upgrade', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reject tier upgrade',
      },
    });
  }
});

export default router;

