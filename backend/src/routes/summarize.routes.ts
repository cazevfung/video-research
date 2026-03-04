/**
 * Summary routes
 * Handles summary creation endpoints
 */

import { Router } from 'express';
import { createSummaryJob } from '../controllers/summary.controller';
import { optionalAuth } from '../middleware/optional-auth.middleware';
import {
  checkQuotaMiddleware,
  checkBatchSizeMiddleware,
} from '../middleware/quota.middleware';
import { checkCreditsMiddleware } from '../middleware/credit-check.middleware';
import { guestRateLimiter } from '../middleware/guest-rate-limit.middleware';

const router = Router();

/**
 * POST /api/summarize
 * Create a new summary job
 * Middleware: optionalAuth (allows both authenticated and guest requests), 
 *             guestRateLimiter (rate limiting for guests),
 *             checkCreditsMiddleware (for authenticated users only),
 *             checkBatchSizeMiddleware (optional)
 * Note: checkQuotaMiddleware is kept for backward compatibility but will be phased out
 */
router.post(
  '/',
  optionalAuth, // Allows both authenticated and guest requests
  guestRateLimiter, // Rate limiting for guest requests
  checkCreditsMiddleware, // New credit check middleware (Phase 3) - only applies to authenticated users
  checkQuotaMiddleware, // Legacy quota check (kept for backward compatibility)
  checkBatchSizeMiddleware,
  createSummaryJob
);

export default router;

