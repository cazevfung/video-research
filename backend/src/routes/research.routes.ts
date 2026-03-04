/**
 * Research routes
 * Handles research endpoints
 */

import { Router } from 'express';
import { createResearchJob, getResearchJobStatus, getResearchById, deleteResearchById, approveResearchStage, regenerateResearchStage } from '../controllers/research.controller';
import { optionalAuth } from '../middleware/optional-auth.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { checkCreditsMiddleware } from '../middleware/credit-check.middleware';
import { researchRateLimiter } from '../middleware/research-rate-limit.middleware';
import { createShare, shareCreationLimiter } from './share.routes';

const router = Router();

/**
 * POST /api/research
 * Create a new research job
 */
router.post(
  '/',
  optionalAuth, // Allows both authenticated and guest requests
  researchRateLimiter, // Enforce tier-based hourly rate limits
  checkCreditsMiddleware, // Check credits for authenticated users
  createResearchJob
);

/**
 * GET /api/research/:job_id/status
 * Get research job status (SSE or polling)
 */
router.get(
  '/:job_id/status',
  optionalAuth,
  getResearchJobStatus
);

/**
 * POST /api/research/:job_id/approve/:stage
 * Approve a research stage (questions, search_terms, videos)
 * Enhanced workflow approval endpoint
 */
router.post(
  '/:job_id/approve/:stage',
  optionalAuth,
  approveResearchStage
);

/**
 * POST /api/research/:job_id/regenerate/:stage
 * Request regeneration of a research stage with feedback
 * Enhanced workflow regeneration endpoint
 */
router.post(
  '/:job_id/regenerate/:stage',
  optionalAuth,
  regenerateResearchStage
);

/**
 * Phase 4: GET /api/research/:id
 * Get full details of a specific research document by ID
 * Middleware: requireAuth (optional - works without auth)
 * Validates ownership (skip when auth disabled)
 */
router.get('/:id', requireAuth, getResearchById);

/**
 * DELETE /api/research/:id
 * Delete a research document by ID. Validates ownership.
 */
router.delete('/:id', requireAuth, deleteResearchById);

/**
 * POST /api/research/:researchId/share
 * Create or get existing share link for a research
 * Requires authentication
 */
router.post(
  '/:researchId/share',
  requireAuth,
  shareCreationLimiter,
  createShare
);

export default router;
