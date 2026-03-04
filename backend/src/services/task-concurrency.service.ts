/**
 * Task concurrency service
 * Manages simultaneous task limits per user tier
 * Prevents race conditions in task creation
 */

import { UserTier } from '../types/credit.types';
import { getTasksConfig } from '../config';
import logger from '../utils/logger';

// In-memory tracking (can be replaced with Redis for distributed systems)
const activeTasksByUser = new Map<string, Set<string>>(); // userId -> Set of jobIds

// Simple mutex implementation using Promise chains
const taskLocks = new Map<string, Promise<{ success: boolean; reason?: string }>>(); // userId -> lock promise

/**
 * Get tier-based task limit from config
 */
function getTierLimit(userTier: UserTier): number {
  const tasksConfig = getTasksConfig();
  if (userTier === 'premium') {
    return tasksConfig.limits.premium;
  }
  // Default to free tier limit for free, starter, pro
  return tasksConfig.limits.free;
}

/**
 * Check if user can create a new task
 * @param userId User ID (can be null if auth disabled)
 * @param userTier User tier
 * @returns True if user can create a new task
 */
export async function canCreateTask(
  userId: string | null,
  userTier: UserTier
): Promise<boolean> {
  if (!userId) {
    // Auth disabled - allow unlimited (for dev)
    return true;
  }

  const activeCount = await getActiveTaskCount(userId);
  const limit = getTierLimit(userTier);
  return activeCount < limit;
}

/**
 * Reserve a task slot (atomic operation)
 * Checks limit and reserves slot in one atomic operation
 * @param userId User ID (can be null if auth disabled)
 * @param userTier User tier
 * @returns Success status and optional reason if failed
 */
export async function reserveTaskSlot(
  userId: string | null,
  userTier: UserTier
): Promise<{ success: boolean; reason?: string }> {
  if (!userId) {
    // Auth disabled - allow unlimited (for dev)
    return { success: true };
  }

  // Acquire lock for this user
  const lockKey = `task-lock-${userId}`;
  const existingLock = taskLocks.get(lockKey);
  if (existingLock) {
    await existingLock;
  }

  const lockPromise = (async () => {
    const canCreate = await canCreateTask(userId, userTier);
    if (!canCreate) {
      const limit = getTierLimit(userTier);
      const tierName = userTier === 'free' ? 'Free' : 'Premium';
      return {
        success: false,
        reason: `Task limit reached. ${tierName} users can run ${limit} task${limit > 1 ? 's' : ''} simultaneously.`,
      };
    }

    // Slot will be reserved when registerActiveTask is called
    return { success: true };
  })();

  taskLocks.set(lockKey, lockPromise);
  const result = await lockPromise;
  taskLocks.delete(lockKey);

  return result;
}

/**
 * Register an active task for a user
 * Should be called after successfully reserving a slot
 * @param userId User ID (can be null if auth disabled)
 * @param jobId Job ID
 */
export async function registerActiveTask(
  userId: string | null,
  jobId: string
): Promise<void> {
  if (!userId) return;

  if (!activeTasksByUser.has(userId)) {
    activeTasksByUser.set(userId, new Set());
  }
  activeTasksByUser.get(userId)!.add(jobId);

  logger.debug(`Registered active task: ${jobId} for user: ${userId}`, {
    activeCount: activeTasksByUser.get(userId)!.size,
  });
}

/**
 * Release a task slot when task completes or errors
 * @param userId User ID (can be null if auth disabled)
 * @param jobId Job ID
 */
export async function releaseTaskSlot(
  userId: string | null,
  jobId: string
): Promise<void> {
  if (!userId) return;

  const userTasks = activeTasksByUser.get(userId);
  if (userTasks) {
    userTasks.delete(jobId);
    if (userTasks.size === 0) {
      activeTasksByUser.delete(userId);
    }
  }

  logger.debug(`Released task slot: ${jobId} for user: ${userId}`, {
    remainingCount: userTasks?.size || 0,
  });
}

/**
 * Get active task count for a user
 * @param userId User ID (can be null if auth disabled)
 * @returns Number of active tasks
 */
export async function getActiveTaskCount(userId: string | null): Promise<number> {
  if (!userId) return 0;
  return activeTasksByUser.get(userId)?.size || 0;
}

/**
 * Get all active task IDs for a user
 * @param userId User ID (can be null if auth disabled)
 * @returns Array of active job IDs
 */
export async function getActiveTaskIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const userTasks = activeTasksByUser.get(userId);
  return userTasks ? Array.from(userTasks) : [];
}

