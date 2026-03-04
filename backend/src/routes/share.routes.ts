/**
 * Share routes
 * Handles share link creation and retrieval endpoints
 */

import { Router, Request, Response } from 'express';
import { createShare, getSharedResearchData } from '../controllers/share.controller';
import { requireAuth } from '../middleware/auth.middleware';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import logger from '../utils/logger';
import env from '../config/env';

const router = Router();

/**
 * Rate limiter for share creation
 * Phase 5: Configurable via environment variables (not hardcoded)
 */
const shareCreationLimiter = rateLimit({
  windowMs: env.SHARE_RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  max: env.SHARE_RATE_LIMIT_PER_USER,
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated users
    const user = (req as any).user;
    return user?.id || 'anonymous';
  },
  validate: false, // Disable validation since we're using user-based keys
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Share creation rate limit exceeded', {
      userId: (req as any).user?.id,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many share link creation requests. Please try again later.',
      },
    });
  },
});

/**
 * Rate limiter for public share access
 * Phase 5: Configurable via environment variables (not hardcoded)
 */
const shareAccessLimiter = rateLimit({
  windowMs: env.SHARE_ACCESS_RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  max: env.SHARE_ACCESS_RATE_LIMIT_PER_IP,
  keyGenerator: (req: Request) => {
    // Use ipKeyGenerator on req.ip to properly handle IPv6 addresses
    if (req.ip) {
      return ipKeyGenerator(req.ip);
    }
    // Fallback for cases where req.ip is undefined
    const fallbackIp = req.socket.remoteAddress || '127.0.0.1';
    return ipKeyGenerator(fallbackIp);
  },
  validate: false, // Disable validation - we're using ipKeyGenerator correctly
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    logger.warn('Share access rate limit exceeded', {
      ip,
      shareId: req.params.shareId,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  },
});

/**
 * GET /api/shared/:shareId
 * Get shared research data (public endpoint, no auth required)
 */
router.get(
  '/:shareId',
  shareAccessLimiter,
  getSharedResearchData
);

export default router;

/**
 * Export share creation route handler for use in research routes
 */
export { createShare, shareCreationLimiter };
