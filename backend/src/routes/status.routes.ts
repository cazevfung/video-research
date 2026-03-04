/**
 * Status routes
 * Handles SSE endpoints for job status updates
 */

import { Router } from 'express';
import { getJobStatusSSE } from '../controllers/summary.controller';
import { optionalAuth } from '../middleware/optional-auth.middleware';

const router = Router();

/**
 * GET /api/status/:job_id
 * Server-Sent Events endpoint for real-time job status updates
 * Middleware: optionalAuth (allows both authenticated and guest requests)
 */
router.get('/:job_id', optionalAuth, getJobStatusSSE);

export default router;


