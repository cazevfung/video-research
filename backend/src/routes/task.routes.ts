/**
 * Task routes
 * Handles task management endpoints
 */

import { Router } from 'express';
import { getActiveTasks, cancelTask } from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/tasks/active
 * Get all active tasks for the current user
 */
router.get('/active', requireAuth, getActiveTasks);

/**
 * DELETE /api/tasks/:jobId/cancel
 * Cancel a specific task
 */
router.delete('/:jobId/cancel', requireAuth, cancelTask);

export default router;


