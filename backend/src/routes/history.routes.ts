/**
 * History routes
 * Handles history and library management endpoints
 */

import { Router } from 'express';
import { getHistory, getSummaryById } from '../controllers/history.controller';
import { createSummaryShare } from '../controllers/share.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { shareCreationLimiter } from './share.routes';

const router = Router();

/**
 * GET /api/history
 * List user's summaries with pagination
 * Middleware: requireAuth (optional - works without auth)
 * Query params: page (default: 1), limit (default: 20, max: 100)
 */
router.get('/', requireAuth, getHistory);

/**
 * POST /api/history/:id/share
 * Create or get existing share link for a summary
 */
router.post('/:id/share', requireAuth, shareCreationLimiter, createSummaryShare);

/**
 * GET /api/history/:id
 * Get full details of a specific summary
 * Middleware: requireAuth (optional)
 * Validates ownership (skip when auth disabled)
 */
router.get('/:id', requireAuth, getSummaryById);

export default router;

/**
 * Summary alias routes
 * Provides alternative endpoint for consistency (frontend may reference this)
 */
export const summaryAliasRouter = Router();

/**
 * GET /api/summary/:id
 * Alias to GET /api/history/:id
 * Same functionality as history/:id endpoint
 */
summaryAliasRouter.get('/:id', requireAuth, getSummaryById);

