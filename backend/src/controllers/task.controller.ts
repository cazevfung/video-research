/**
 * Task controller
 * Handles task management endpoints (active tasks, cancellation)
 */

import { Request, Response } from 'express';
import { AuthenticatedUser } from '../types/auth.types';
import {
  getJobStatus,
  userOwnsJob,
  cancelJob,
  getUserJobsWithInfo,
} from '../services/job.service';
import {
  getActiveTaskIds,
  releaseTaskSlot,
} from '../services/task-concurrency.service';
import logger from '../utils/logger';

/**
 * Extended Request type with user
 */
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Get all active tasks for the current user
 * GET /api/tasks/active
 */
export async function getActiveTasks(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.uid || req.user?.id || null;
    const activeJobIds = await getActiveTaskIds(userId);

    const tasks = await Promise.all(
      activeJobIds.map(async (jobId) => {
        const job = getJobStatus(jobId);
        if (!job) {
          return null;
        }

        return {
          job_id: job.job_id,
          title: job.title || null,
          status: job.status,
          progress: job.progress,
          message: getStatusMessage(job.status),
          created_at: job.created_at.toISOString(),
        };
      })
    );

    res.json({ tasks: tasks.filter(Boolean) });
  } catch (error) {
    logger.error('Error getting active tasks', { error, userId: req.user?.uid || req.user?.id });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get active tasks',
      },
    });
  }
}

/**
 * Cancel a specific task
 * DELETE /api/tasks/:jobId/cancel
 */
export async function cancelTask(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { jobId } = req.params;
    const userId = req.user?.uid || req.user?.id || null;

    // Verify ownership
    if (!userOwnsJob(jobId, userId)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Task not found or access denied',
        },
      });
      return;
    }

    // Cancel job (mark as cancelled, stop processing if possible)
    const cancelled = cancelJob(jobId, userId);
    if (!cancelled) {
      res.status(404).json({
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
        },
      });
      return;
    }

    // Release task slot
    await releaseTaskSlot(userId, jobId);

    res.json({ success: true, message: 'Task cancelled' });
  } catch (error) {
    logger.error('Error cancelling task', {
      error,
      jobId: req.params.jobId,
      userId: req.user?.uid || req.user?.id,
    });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel task',
      },
    });
  }
}

/**
 * Get human-readable status message
 * 
 * NOTE: Returns null to let frontend handle localization based on status code.
 * Frontend components translate based on status for proper localization.
 */
function getStatusMessage(status: string): string | null {
  // Return null to let frontend handle translation based on status
  return null;
}


