# Multiple Simultaneous Summary Tasks PRD

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | 2024 |
| **Tech Stack** | React (TypeScript), Node.js (TypeScript), SSE (Server-Sent Events) |
| **Dependencies** | Existing job service, summary service, user tier system, credit system |

---

## 1. Executive Summary

This PRD outlines the implementation of a multi-task summary system that allows users to create and manage multiple summary tasks simultaneously. The system will feature a Google Drive-like expandable UI component in the bottom right corner, showing progress and titles for all active tasks. The backend will ensure proper concurrency control, preventing race conditions and conflicts between simultaneous tasks. Task limits will be enforced based on user tier: free users can run 1 simultaneous task, while premium users can run up to 10 simultaneous tasks.

**Key Features:**
- Multi-task creation via floating action button (+ button) in bottom right corner
- Expandable task list UI showing all active tasks with progress and titles
- Concurrent task processing with race condition prevention
- Tier-based task limits (Free: 1, Premium: 10)
- Real-time progress updates via SSE for each task
- Task management (cancel, view details, remove completed tasks)

---

## 2. Current State Analysis

### 2.1 What Exists

1. **Job Management System**
   - ✅ In-memory job storage (`backend/src/services/job.service.ts`)
   - ✅ Job creation, status tracking, and updates
   - ✅ SSE connections for real-time progress updates
   - ✅ Job cleanup and retention policies
   - ⚠️ Currently designed for single job per user session

2. **Summary Processing**
   - ✅ Async batch processing (`processBatch` function)
   - ✅ Credit deduction system
   - ✅ User quota checking
   - ✅ Error handling and recovery
   - ⚠️ No concurrent task limit enforcement

3. **Frontend Summary UI**
   - ✅ Single task UI with `useSummaryStream` hook
   - ✅ Processing overlay and result display
   - ✅ SSE connection management
   - ❌ No multi-task UI components
   - ❌ No task list or management interface

4. **User Tier System**
   - ✅ Free and Premium tier support
   - ✅ Tier-based quota limits
   - ✅ Tier configuration in `config.yaml`
   - ❌ No simultaneous task limit configuration

### 2.2 Gaps to Address

1. **Backend**
   - Add simultaneous task limit checking
   - Implement task queue/concurrency control
   - Add endpoint to get all active tasks for a user
   - Add endpoint to cancel a specific task
   - Prevent race conditions in credit deduction and resource access
   - Track active task count per user

2. **Frontend**
   - Create floating action button component (+ button)
   - Create expandable task list UI component (Google Drive-like)
   - Create individual task progress card component
   - Update `useSummaryStream` to support multiple concurrent streams
   - Create task management context/hook
   - Update dashboard to support multi-task mode

3. **State Management**
   - Track multiple active tasks simultaneously
   - Manage multiple SSE connections
   - Handle task state synchronization
   - Implement task prioritization (if needed)

---

## 3. Goals & Objectives

### 3.1 Primary Goals

1. **Multi-Task Creation**
   - Users can create new summary tasks while others are running
   - New task creation respects tier-based limits
   - Clear feedback when limit is reached

2. **Task Visibility & Management**
   - All active tasks visible in expandable UI panel
   - Real-time progress updates for each task
   - Task titles displayed for easy identification
   - Ability to cancel running tasks
   - Completed tasks can be dismissed or viewed

3. **Concurrency Control**
   - No race conditions between simultaneous tasks
   - Proper resource locking for shared resources (credits, API quotas)
   - Independent processing of each task
   - No interference between tasks

4. **Tier-Based Limits**
   - Free users: Maximum 1 simultaneous task
   - Premium users: Maximum 10 simultaneous tasks
   - Clear messaging when limits are reached
   - Upgrade prompts for free users

5. **User Experience**
   - Intuitive Google Drive-like UI pattern
   - Smooth animations and transitions
   - Non-intrusive task panel (expandable/collapsible)
   - Easy access to create new tasks

### 3.2 Success Criteria

- ✅ Users can create multiple summary tasks simultaneously (within tier limits)
- ✅ All active tasks are visible in the expandable UI panel
- ✅ Each task shows real-time progress and title
- ✅ No race conditions or conflicts between tasks
- ✅ Task limits are enforced correctly (Free: 1, Premium: 10)
- ✅ Users can cancel running tasks
- ✅ Completed tasks can be dismissed or viewed
- ✅ No performance degradation with multiple active tasks
- ✅ UI remains responsive with multiple tasks running

---

## 4. System Architecture

### 4.1 Backend Architecture

#### 4.1.1 Task Concurrency Management

**New Service: `task-concurrency.service.ts`**
- Track active task count per user
- Enforce tier-based limits before task creation
- Provide atomic operations for task counting
- Handle task completion/error cleanup

**Key Functions:**
```typescript
// Check if user can create new task
canCreateTask(userId: string, userTier: UserTier): Promise<boolean>

// Reserve task slot (atomic operation)
reserveTaskSlot(userId: string): Promise<{ success: boolean; reason?: string }>

// Release task slot on completion/error
releaseTaskSlot(userId: string): Promise<void>

// Get active task count for user
getActiveTaskCount(userId: string): Promise<number>

// Get all active task IDs for user
getActiveTaskIds(userId: string): Promise<string[]>
```

#### 4.1.2 Race Condition Prevention

**Credit Deduction Locking:**
- Use distributed locks (or in-memory locks for single instance)
- Prevent double-deduction when multiple tasks start simultaneously
- Atomic credit check-and-deduct operations

**Resource Access:**
- Transcript fetching: Already parallel-safe (no shared state)
- AI API calls: Rate limiting per user (if needed)
- Database writes: Firestore handles concurrency (document-level)

**Implementation Strategy:**
- Use Redis for distributed locking (if multi-instance)
- Use in-memory Map with locks for single instance
- Implement optimistic locking for credit transactions

#### 4.1.3 API Endpoints

**New Endpoints:**
```
GET /api/tasks/active
- Returns all active tasks for current user
- Response: { tasks: Array<{ job_id, title, status, progress, created_at }> }

DELETE /api/tasks/:jobId/cancel
- Cancels a specific task
- Returns: { success: boolean, message: string }
```

**Modified Endpoints:**
```
POST /api/summarize
- Add task limit check before job creation
- Return error if limit exceeded: { error: { code: 'TASK_LIMIT_EXCEEDED', message: '...' } }
```

#### 4.1.4 Job Service Enhancements

**Modifications to `job.service.ts`:**
- Add user-to-jobs mapping for quick lookup
- Add task metadata (title, created_at) to JobInfo
- Add cancellation support (mark job as cancelled, stop processing)
- Enhance `getUserJobs` to return full job info, not just IDs

### 4.2 Frontend Architecture

#### 4.2.1 Component Structure

```
components/
  tasks/
    TaskPanel.tsx              # Main expandable panel (Google Drive-like)
    TaskList.tsx               # List of active tasks
    TaskCard.tsx               # Individual task progress card
    FloatingActionButton.tsx   # + button for creating new tasks
    TaskCreationModal.tsx       # Modal for creating new task (optional)
```

#### 4.2.2 State Management

**New Hook: `useTaskManager.ts`**
- Manages multiple active tasks
- Handles task creation, cancellation, updates
- Syncs with backend for active tasks
- Provides task list to UI components

**Key Functions:**
```typescript
interface UseTaskManagerReturn {
  tasks: TaskInfo[];
  createTask: (request: SummaryRequest) => Promise<string | null>;
  cancelTask: (jobId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  canCreateTask: boolean;
  activeTaskCount: number;
  maxTaskCount: number;
}
```

**Task Info Interface:**
```typescript
interface TaskInfo {
  jobId: string;
  title: string | null;
  status: JobStatus;
  progress: number;
  message: string | null;
  createdAt: Date;
  stream?: UseSummaryStreamReturn; // SSE connection for this task
}
```

#### 4.2.3 UI Layout

**Task Panel (Bottom Right):**
- Collapsed state: Small circular button with task count badge
- Expanded state: Slide-up panel showing all active tasks
- Google Drive-like animation (slide up from bottom)
- Fixed position, z-index above other content
- Responsive sizing (mobile: full width, desktop: 400px max width)

**Floating Action Button (+ Button):**
- Positioned in bottom right corner
- Always visible (even when panel is collapsed)
- Opens task creation flow
- Disabled when task limit reached (with tooltip)

**Task Cards:**
- Show task title (or "Untitled" if not yet generated)
- Progress bar with percentage
- Status indicator (fetching, processing, generating, etc.)
- Cancel button (for active tasks)
- Click to expand/view details (optional)

---

## 5. User Experience Design

### 5.1 Task Creation Flow

1. **User clicks + button** (bottom right)
2. **Task creation modal/form appears** (or inline form)
3. **User enters URLs and settings**
4. **User clicks "Create Summary"**
5. **System checks task limit:**
   - If limit not reached: Create task, show in task panel
   - If limit reached: Show error message with upgrade prompt (for free users)
6. **New task appears in task panel** (expanded automatically)
7. **Task starts processing** with real-time progress updates

### 5.2 Task Panel Interaction

**Collapsed State:**
- Small circular button with number badge (active task count)
- Hover: Shows tooltip "X active tasks"
- Click: Expands panel

**Expanded State:**
- Slide-up animation from bottom
- Shows list of all active tasks
- Each task shows:
  - Title (or "Processing..." if no title yet)
  - Progress bar
  - Status text
  - Cancel button (X icon)
- Click outside or collapse button: Collapses panel
- Auto-expand when new task is created

### 5.3 Task States & Visual Feedback

**Task Status Indicators:**
- **Pending**: Gray, "Starting..."
- **Fetching**: Blue, "Fetching transcripts..."
- **Processing**: Blue, "Processing videos..."
- **Condensing**: Blue, "Condensing long videos..."
- **Aggregating**: Blue, "Aggregating content..."
- **Generating**: Green, "Generating summary..." (with streaming indicator)
- **Completed**: Green checkmark, "Completed"
- **Error**: Red, error message with retry option
- **Cancelled**: Gray, "Cancelled"

**Progress Visualization:**
- Progress bar (0-100%)
- Percentage text
- Status-specific icons

### 5.4 Error Handling

**Task Limit Exceeded:**
- Error message: "You've reached your task limit. Free users can run 1 task at a time. Upgrade to Premium to run up to 10 tasks simultaneously."
- Show upgrade button/link

**Task Creation Error:**
- Show error in task panel
- Allow retry or cancellation

**Task Processing Error:**
- Show error state in task card
- Provide retry option (if applicable)
- Allow dismissal

---

## 6. Technical Implementation Details

### 6.1 Backend Implementation

#### 6.1.1 Task Concurrency Service

**File: `backend/src/services/task-concurrency.service.ts`**

```typescript
import { UserTier } from '../types/credit.types';
import { getFreemiumConfig } from '../config';
import logger from '../utils/logger';

// In-memory tracking (can be replaced with Redis for distributed systems)
const activeTasksByUser = new Map<string, Set<string>>(); // userId -> Set of jobIds
const taskLocks = new Map<string, Promise<void>>(); // userId -> lock promise

const TIER_LIMITS: Record<UserTier, number> = {
  free: 1,
  premium: 10,
};

export async function canCreateTask(
  userId: string | null,
  userTier: UserTier
): Promise<boolean> {
  if (!userId) {
    // Auth disabled - allow unlimited (for dev)
    return true;
  }

  const activeCount = await getActiveTaskCount(userId);
  const limit = TIER_LIMITS[userTier];
  return activeCount < limit;
}

export async function reserveTaskSlot(
  userId: string | null,
  userTier: UserTier
): Promise<{ success: boolean; reason?: string }> {
  if (!userId) {
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
      const limit = TIER_LIMITS[userTier];
      return {
        success: false,
        reason: `Task limit reached. ${userTier === 'free' ? 'Free' : 'Premium'} users can run ${limit} task${limit > 1 ? 's' : ''} simultaneously.`,
      };
    }

    // Reserve slot (will be released when task completes/errors)
    return { success: true };
  })();

  taskLocks.set(lockKey, lockPromise);
  const result = await lockPromise;
  taskLocks.delete(lockKey);

  return result;
}

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

export async function getActiveTaskCount(userId: string | null): Promise<number> {
  if (!userId) return 0;
  return activeTasksByUser.get(userId)?.size || 0;
}

export async function getActiveTaskIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const userTasks = activeTasksByUser.get(userId);
  return userTasks ? Array.from(userTasks) : [];
}
```

#### 6.1.2 Credit Deduction Locking

**Modify: `backend/src/services/credit.service.ts`**

Add distributed locking for credit deduction:

```typescript
import { Mutex } from 'async-mutex'; // or use Redis for distributed

const creditMutex = new Mutex();

export async function deductCreditsWithLock(
  userId: string,
  amount: number
): Promise<{ success: boolean; remaining: number; error?: string }> {
  return creditMutex.runExclusive(async () => {
    // Check balance
    const balance = await checkCreditBalance(userId);
    if (balance < amount) {
      return {
        success: false,
        remaining: balance,
        error: 'Insufficient credits',
      };
    }

    // Deduct credits (atomic operation)
    return await deductCredits(userId, amount);
  });
}
```

#### 6.1.3 Controller Updates

**Modify: `backend/src/controllers/summary.controller.ts`**

```typescript
import { reserveTaskSlot, registerActiveTask, releaseTaskSlot } from '../services/task-concurrency.service';

export async function createSummaryJob(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // ... existing validation ...

    const userId = req.user?.uid || req.user?.id || null;
    const userTier = req.user?.tier || 'free';

    // Check task limit
    const slotReservation = await reserveTaskSlot(userId, userTier);
    if (!slotReservation.success) {
      res.status(429).json({
        error: {
          code: 'TASK_LIMIT_EXCEEDED',
          message: slotReservation.reason || 'Task limit exceeded',
        },
      });
      return;
    }

    // Create job
    const jobId = createJob(userId);
    await registerActiveTask(userId, jobId);

    // Start async processing
    processBatch(userId, request, jobId)
      .then(() => {
        // Release slot on completion
        releaseTaskSlot(userId, jobId);
      })
      .catch((error) => {
        // Release slot on error
        releaseTaskSlot(userId, jobId);
        logger.error(`Error processing batch for job ${jobId}`, { error, userId });
      });

    // Return job ID
    res.status(200).json({ job_id: jobId });
  } catch (error) {
    // ... error handling ...
  }
}
```

**New Controller: `backend/src/controllers/task.controller.ts`**

```typescript
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
        if (!job) return null;

        return {
          job_id: job.job_id,
          title: job.title || null,
          status: job.status,
          progress: job.progress,
          message: job.message || null,
          created_at: job.created_at.toISOString(),
        };
      })
    );

    res.json({ tasks: tasks.filter(Boolean) });
  } catch (error) {
    // ... error handling ...
  }
}

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
        error: { code: 'FORBIDDEN', message: 'Task not found or access denied' },
      });
      return;
    }

    // Cancel job (mark as cancelled, stop processing if possible)
    updateJobStatus(jobId, 'error', { error: 'Cancelled by user' });
    await releaseTaskSlot(userId, jobId);

    res.json({ success: true, message: 'Task cancelled' });
  } catch (error) {
    // ... error handling ...
  }
}
```

#### 6.1.4 Routes

**New: `backend/src/routes/task.routes.ts`**

```typescript
import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/firebase-auth.middleware';
import { getActiveTasks, cancelTask } from '../controllers/task.controller';

const router = Router();

router.get('/active', verifyFirebaseToken, getActiveTasks);
router.delete('/:jobId/cancel', verifyFirebaseToken, cancelTask);

export default router;
```

### 6.2 Frontend Implementation

#### 6.2.1 Task Manager Hook

**File: `frontend/src/hooks/useTaskManager.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useUserData } from './useUserData';
import { useSummaryStream } from './useSummaryStream';
import { SummaryRequest } from '@/types';
import { startSummaryJob, getActiveTasks, cancelTask } from '@/lib/api';

interface TaskInfo {
  jobId: string;
  title: string | null;
  status: JobStatus;
  progress: number;
  message: string | null;
  createdAt: Date;
  stream?: ReturnType<typeof useSummaryStream>;
}

export function useTaskManager() {
  const { user } = useUserData();
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const maxTaskCount = user?.tier === 'premium' ? 10 : 1;
  const activeTaskCount = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'error'
  ).length;
  const canCreateTask = activeTaskCount < maxTaskCount;

  // Fetch active tasks from backend
  const refreshTasks = useCallback(async () => {
    try {
      const response = await getActiveTasks();
      if (response.data?.tasks) {
        setTasks((prev) => {
          // Merge with existing tasks (preserve SSE connections)
          const existingMap = new Map(prev.map((t) => [t.jobId, t]));
          const newTasks = response.data.tasks.map((task: any) => {
            const existing = existingMap.get(task.job_id);
            return {
              jobId: task.job_id,
              title: task.title,
              status: task.status,
              progress: task.progress,
              message: task.message,
              createdAt: new Date(task.created_at),
              stream: existing?.stream, // Preserve SSE connection
            };
          });
          return newTasks;
        });
      }
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  }, []);

  // Create new task
  const createTask = useCallback(
    async (request: SummaryRequest): Promise<string | null> => {
      if (!canCreateTask) {
        throw new Error(
          `Task limit reached. ${user?.tier === 'free' ? 'Free' : 'Premium'} users can run ${maxTaskCount} task${maxTaskCount > 1 ? 's' : ''} simultaneously.`
        );
      }

      setIsLoading(true);
      try {
        const response = await startSummaryJob(request);
        if (response.error) {
          throw new Error(response.error.message);
        }

        const jobId = response.data?.job_id;
        if (!jobId) {
          throw new Error('Failed to create task');
        }

        // Create stream connection for this task
        const stream = useSummaryStream();
        await stream.startJob(request);

        // Add task to list
        const newTask: TaskInfo = {
          jobId,
          title: null,
          status: 'pending',
          progress: 0,
          message: 'Starting...',
          createdAt: new Date(),
          stream,
        };

        setTasks((prev) => [...prev, newTask]);

        // Refresh from backend to sync
        await refreshTasks();

        return jobId;
      } catch (error) {
        console.error('Failed to create task:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [canCreateTask, maxTaskCount, user?.tier, refreshTasks]
  );

  // Cancel task
  const cancelTaskHandler = useCallback(
    async (jobId: string) => {
      try {
        await cancelTask(jobId);
        setTasks((prev) => prev.filter((t) => t.jobId !== jobId));
        await refreshTasks();
      } catch (error) {
        console.error('Failed to cancel task:', error);
        throw error;
      }
    },
    [refreshTasks]
  );

  // Sync task status from streams
  useEffect(() => {
    setTasks((prev) =>
      prev.map((task) => {
        if (!task.stream) return task;
        return {
          ...task,
          status: task.stream.status,
          progress: task.stream.progress,
          message: task.stream.message,
          title: task.stream.title || task.title,
        };
      })
    );
  }, [tasks.map((t) => t.stream?.status).join(',')]);

  // Initial load
  useEffect(() => {
    refreshTasks();
    // Poll for updates every 5 seconds
    const interval = setInterval(refreshTasks, 5000);
    return () => clearInterval(interval);
  }, [refreshTasks]);

  return {
    tasks,
    createTask,
    cancelTask: cancelTaskHandler,
    refreshTasks,
    canCreateTask,
    activeTaskCount,
    maxTaskCount,
    isLoading,
  };
}
```

#### 6.2.2 Task Panel Component

**File: `frontend/src/components/tasks/TaskPanel.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskManager } from '@/hooks/useTaskManager';
import { TaskList } from './TaskList';
import { FloatingActionButton } from './FloatingActionButton';

export function TaskPanel() {
  const { tasks, activeTaskCount } = useTaskManager();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveTasks = activeTaskCount > 0;

  return (
    <>
      {/* Collapsed State - Task Count Badge */}
      {hasActiveTasks && (
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className="text-sm font-semibold">{activeTaskCount}</span>
        </motion.button>
      )}

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-24 right-6 z-50 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Active Tasks</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <TaskList tasks={tasks} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </>
  );
}
```

#### 6.2.3 Task Card Component

**File: `frontend/src/components/tasks/TaskCard.tsx`**

```typescript
'use client';

import { motion } from 'framer-motion';
import { TaskInfo } from '@/hooks/useTaskManager';
import { X } from 'lucide-react';

interface TaskCardProps {
  task: TaskInfo;
  onCancel: (jobId: string) => void;
}

export function TaskCard({ task, onCancel }: TaskCardProps) {
  const isActive = task.status !== 'completed' && task.status !== 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 border-b border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">
            {task.title || 'Processing...'}
          </h4>
          <p className="text-xs text-gray-500 mt-1">{task.message}</p>
          {isActive && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1">
                {task.progress}%
              </span>
            </div>
          )}
        </div>
        {isActive && (
          <button
            onClick={() => onCancel(task.jobId)}
            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
```

---

## 7. Implementation Phases

### Phase 1: Backend Foundation (Week 1)

**Goal:** Implement task concurrency control and API endpoints

**Tasks:**
1. Create `task-concurrency.service.ts`
   - Implement task slot reservation/release
   - Add tier-based limit checking
   - Add active task tracking

2. Update `summary.controller.ts`
   - Add task limit check before job creation
   - Integrate task slot reservation
   - Add task slot release on completion/error

3. Create `task.controller.ts`
   - Implement `getActiveTasks` endpoint
   - Implement `cancelTask` endpoint

4. Create `task.routes.ts`
   - Add routes for task management
   - Wire up authentication middleware

5. Update `job.service.ts`
   - Add task metadata (title) to JobInfo
   - Enhance `getUserJobs` to return full job info
   - Add cancellation support

6. Add credit deduction locking
   - Implement mutex/lock for credit operations
   - Prevent race conditions in credit deduction

7. Testing
   - Unit tests for task concurrency service
   - Integration tests for task limit enforcement
   - Test concurrent task creation
   - Test credit deduction locking

**Deliverables:**
- ✅ Task concurrency service
- ✅ Task management API endpoints
- ✅ Credit deduction locking
- ✅ Unit and integration tests

---

### Phase 2: Frontend Core Components (Week 2)

**Goal:** Build UI components for multi-task management

**Tasks:**
1. Create `useTaskManager` hook
   - Implement task state management
   - Add task creation/cancellation logic
   - Add task refresh/polling

2. Create `TaskPanel` component
   - Implement expandable/collapsible UI
   - Add Google Drive-like animations
   - Add task count badge

3. Create `TaskList` component
   - Display list of active tasks
   - Handle empty state
   - Add task filtering/sorting

4. Create `TaskCard` component
   - Display task progress and status
   - Add cancel button
   - Add title display

5. Create `FloatingActionButton` component
   - Implement + button
   - Add disabled state when limit reached
   - Add tooltip for limit messaging

6. Update API client
   - Add `getActiveTasks` function
   - Add `cancelTask` function
   - Update error handling

7. Testing
   - Component unit tests
   - Hook unit tests
   - UI interaction tests

**Deliverables:**
- ✅ Task management hook
- ✅ Task panel UI components
- ✅ Floating action button
- ✅ Component tests

---

### Phase 3: Multi-Stream Integration (Week 3)

**Goal:** Integrate multiple SSE connections for concurrent tasks

**Tasks:**
1. Update `useSummaryStream` hook
   - Support multiple concurrent streams
   - Add stream instance management
   - Prevent stream conflicts

2. Integrate streams with task manager
   - Connect each task to its SSE stream
   - Sync stream status with task state
   - Handle stream errors/disconnections

3. Update dashboard/page components
   - Support multi-task mode
   - Handle task creation from FAB
   - Integrate task panel

4. Add task creation flow
   - Create task creation modal/form
   - Handle form submission
   - Show task in panel after creation

5. Add task cancellation
   - Implement cancellation from UI
   - Handle cancellation feedback
   - Clean up streams on cancellation

6. Testing
   - Test multiple concurrent streams
   - Test stream reconnection
   - Test task cancellation
   - Test error handling

**Deliverables:**
- ✅ Multi-stream support
- ✅ Task creation flow
- ✅ Task cancellation
- ✅ Integration tests

---

### Phase 4: Polish & Edge Cases (Week 4)

**Goal:** Refine UX, handle edge cases, and optimize performance

**Tasks:**
1. UI/UX refinements
   - Improve animations and transitions
   - Add loading states
   - Improve error messages
   - Add empty states

2. Edge case handling
   - Handle network disconnections
   - Handle task limit reached scenarios
   - Handle task completion cleanup
   - Handle page refresh/reload

3. Performance optimization
   - Optimize task polling frequency
   - Optimize SSE connection management
   - Add task list virtualization (if needed)
   - Optimize re-renders

4. Accessibility
   - Add ARIA labels
   - Keyboard navigation support
   - Screen reader support
   - Focus management

5. Mobile responsiveness
   - Test on mobile devices
   - Adjust panel sizing for mobile
   - Optimize touch interactions

6. Documentation
   - Update API documentation
   - Add component documentation
   - Update user guide

7. Testing
   - End-to-end tests
   - Performance tests
   - Accessibility tests
   - Cross-browser testing

**Deliverables:**
- ✅ Polished UI/UX
- ✅ Edge case handling
- ✅ Performance optimizations
- ✅ Complete test coverage
- ✅ Documentation

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Backend:**
- Task concurrency service (slot reservation, limit checking)
- Credit deduction locking
- Task controller endpoints
- Job service enhancements

**Frontend:**
- Task manager hook
- Task components (TaskPanel, TaskCard, etc.)
- API client functions

### 8.2 Integration Tests

- Concurrent task creation
- Task limit enforcement
- Task cancellation flow
- Multiple SSE connections
- Credit deduction with concurrent tasks

### 8.3 End-to-End Tests

- User creates multiple tasks
- User cancels a task
- User reaches task limit
- Task completion and cleanup
- Page refresh with active tasks

### 8.4 Performance Tests

- Multiple concurrent tasks (stress test)
- SSE connection management
- Memory usage with many tasks
- UI responsiveness with 10 active tasks

---

## 9. Security Considerations

### 9.1 Authorization

- Verify user ownership before task operations
- Enforce task limits per user (not globally)
- Prevent task enumeration attacks

### 9.2 Rate Limiting

- Limit task creation rate (prevent abuse)
- Limit API calls per user
- Monitor for suspicious activity

### 9.3 Resource Protection

- Prevent resource exhaustion (too many tasks)
- Implement timeouts for long-running tasks
- Clean up abandoned tasks

---

## 10. Monitoring & Observability

### 10.1 Metrics to Track

- Active task count per user tier
- Task creation rate
- Task completion rate
- Task cancellation rate
- Average task duration
- Task limit hit rate
- Concurrent task conflicts (if any)

### 10.2 Logging

- Log task creation with user ID and tier
- Log task limit hits
- Log task cancellations
- Log concurrent task conflicts
- Log credit deduction locking issues

### 10.3 Alerts

- High task limit hit rate (may indicate need for tier adjustment)
- Unusual concurrent task patterns
- Task processing failures
- Resource exhaustion warnings

---

## 11. Future Enhancements

### 11.1 Task Prioritization

- Allow users to prioritize tasks
- Process high-priority tasks first
- Queue lower-priority tasks

### 11.2 Task Scheduling

- Schedule tasks for later execution
- Recurring task support
- Task templates

### 11.3 Task History

- View completed task history
- Re-run completed tasks
- Export task results

### 11.4 Advanced Limits

- Per-day task limits (in addition to concurrent)
- Per-month task limits
- Custom limits for enterprise users

---

## 12. Success Metrics

### 12.1 User Engagement

- Increase in tasks created per user
- Increase in premium conversions (due to higher limits)
- User satisfaction with multi-task feature

### 12.2 Technical Metrics

- Zero race conditions in production
- Task limit enforcement accuracy: 100%
- Average task creation time: < 500ms
- UI responsiveness: < 100ms for interactions

### 12.3 Business Metrics

- Premium conversion rate increase
- User retention improvement
- Task completion rate (should remain stable or improve)

---

## 13. Risks & Mitigations

### 13.1 Technical Risks

**Risk:** Race conditions in credit deduction
- **Mitigation:** Implement proper locking mechanisms, thorough testing

**Risk:** SSE connection management complexity
- **Mitigation:** Use proven patterns, implement connection pooling, add reconnection logic

**Risk:** Performance degradation with many tasks
- **Mitigation:** Optimize polling, use virtualization, implement task cleanup

### 13.2 Product Risks

**Risk:** Users confused by multi-task UI
- **Mitigation:** Clear UI/UX, tooltips, onboarding, user testing

**Risk:** Task limits too restrictive or too permissive
- **Mitigation:** Monitor usage patterns, gather user feedback, adjust limits iteratively

### 13.3 Business Risks

**Risk:** Increased server costs from concurrent tasks
- **Mitigation:** Monitor costs, implement rate limiting, optimize resource usage

**Risk:** Abuse of multi-task feature
- **Mitigation:** Rate limiting, monitoring, abuse detection

---

## 14. Appendix

### 14.1 Configuration

**Backend Config (`config.yaml`):**
```yaml
tasks:
  limits:
    free: 1
    premium: 10
  polling_interval_seconds: 5
  cleanup_interval_hours: 24
```

### 14.2 API Response Examples

**GET /api/tasks/active:**
```json
{
  "tasks": [
    {
      "job_id": "abc123",
      "title": "Video Analysis Batch",
      "status": "generating",
      "progress": 75,
      "message": "Generating summary...",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**POST /api/summarize (Task Limit Exceeded):**
```json
{
  "error": {
    "code": "TASK_LIMIT_EXCEEDED",
    "message": "Task limit reached. Free users can run 1 task simultaneously."
  }
}
```

### 14.3 Component Props

**TaskPanel Props:**
```typescript
interface TaskPanelProps {
  // No props - uses context/hooks internally
}
```

**TaskCard Props:**
```typescript
interface TaskCardProps {
  task: TaskInfo;
  onCancel: (jobId: string) => void;
}
```

---

## 15. Conclusion

This PRD outlines a comprehensive implementation plan for enabling multiple simultaneous summary tasks. The phased approach ensures a solid foundation is built before adding complexity, and thorough testing at each phase ensures reliability. The Google Drive-like UI pattern provides an intuitive user experience, while the backend architecture ensures proper concurrency control and prevents race conditions.

The implementation is designed to be scalable, maintainable, and user-friendly, with clear separation of concerns between frontend and backend components. Success will be measured through user engagement metrics, technical performance, and business outcomes.

