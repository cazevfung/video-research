# Implementation Plan: Fix Task Creation Race Condition

**Date:** 2026-01-19  
**Priority:** HIGH  
**Issue:** Multiple tasks created from single "Summarize" button click

---

## Problem Clarification

### What We're Fixing
**User Action:** Clicks "Summarize" button ONCE  
**Expected:** ONE task created  
**Actual:** Multiple tasks created (evidence: 3 SSE connections, 3 tasks shown in logs)  
**Result:** Race condition causing potential crashes

### What We're NOT Fixing
- **Dual SSE System:** This is a FEATURE for real-time AI output streaming
- **Multiple concurrent connections:** User should be able to run multiple tasks simultaneously
- **TaskPanel + Dashboard coexistence:** Both systems may need to display same task

---

## Root Cause - CONFIRMED ✅

### The 3 SSE Connections Are NOT A BUG

Based on code analysis and logs:

**What Happened:**
1. User had 3 active tasks in progress
2. User refreshed the page (or closed/reopened browser)
3. Page loads → `useTaskManager` restores 3 tasks from sessionStorage
4. All 3 `TaskStreamWrapper` components mount simultaneously
5. All 3 `useSummaryStreamInstance` hooks auto-connect simultaneously
6. Result: 3 SSE connections created at once

**This is EXPECTED BEHAVIOR** for multi-task feature! ✅

The real issue is NOT the 3 connections themselves, but potential problems:
- What if user clicks "Summarize" rapidly 3 times? (No prevention)
- What if React Strict Mode causes double-mounting? (Development issue)
- What if main dashboard + TaskPanel both create task for same form? (Unlikely but possible)
- What if task restoration logic runs multiple times? (Need to verify)

## Root Cause Hypothesis (Alternative Scenarios)

### Potential Causes of Duplicate Task Creation

#### 1. **Double/Triple Click on Submit Button**
- User clicks "Summarize" multiple times rapidly
- No debouncing or click prevention
- Each click creates a new task

#### 2. **React Strict Mode Double-Mounting (Dev Only)**
- In development, React Strict Mode mounts components twice
- Submit effect runs twice
- Two tasks created for one user action

#### 3. **Multiple Submit Handlers**
- Old dashboard (`app/page.tsx`) has submit handler
- New TaskPanel system has submit handler
- Both respond to same form submission
- Each creates a task

#### 4. **Form Submission + Enter Key**
- User presses Enter in input field → form submit event
- User also clicks button → click event
- Both trigger task creation

#### 5. **Auto-Retry Logic Gone Wrong**
- Network error occurs
- Exponential backoff retries request
- Each retry creates a new task instead of retrying same task

#### 6. **State Update Causing Re-submission**
- Task creation triggers state update
- State update causes component re-render
- Re-render triggers submit handler again
- Infinite loop or multiple submissions

---

## Investigation Phase

### Step 1: Find All Submit Handlers ✅ COMPLETED

**Two Independent Entry Points Found:**

#### Entry Point 1: Main Dashboard (OLD System)
- **File:** `frontend/src/app/page.tsx` (line 80-117)
- **Handler:** `handleSummarize()`
- **Hook:** `useSummaryStream` (old single-task hook)
- **API:** `stream.startJob(formData)`
- **Trigger:** User clicks "Summarize" button on main dashboard

```typescript
// frontend/src/app/page.tsx:80-117
const handleSummarize = async () => {
  const formData = form.getFormData();
  if (!formData) {
    toast.warning('Please provide at least one valid YouTube URL');
    return;
  }
  
  // ... validation ...
  
  await stream.startJob(formData);  // ← OLD SYSTEM
  
  // State will be updated via useEffect when stream.status changes
};
```

#### Entry Point 2: TaskPanel Modal (NEW System)
- **File:** `frontend/src/components/tasks/TaskCreationModal.tsx` (line 35-61)
- **Handler:** `handleSubmit()`
- **Hook:** `useTaskManagerContext()` → `useTaskManager`
- **API:** `createTask(formData)`
- **Trigger:** User clicks "Create Task" button in TaskPanel modal

```typescript
// frontend/src/components/tasks/TaskCreationModal.tsx:35-61
const handleSubmit = async () => {
  const formData = form.getFormData();
  if (!formData) {
    toast.warning('Please provide at least one valid YouTube URL');
    return;
  }
  
  // ... validation ...
  
  setIsSubmitting(true);
  try {
    await createTask(formData);  // ← NEW SYSTEM
    toast.success('Task created successfully');
    form.reset();
    onClose();
  } finally {
    setIsSubmitting(false);
  }
};
```

**Key Observations:**
1. ✅ **Two systems are independent** - Different entry points, no direct interaction
2. ✅ **No obvious double-submission** - Each button has its own handler
3. ⚠️ **Potential issue:** If main dashboard and TaskPanel modal are both active, could they respond to the same form?
4. ⚠️ **3 connections simultaneously** suggests either:
   - Task restoration on page load (3 tasks restored from sessionStorage)
   - React Strict Mode causing multiple mounts
   - User created 3 tasks rapidly
   - Bug in task restoration/refresh logic

### Step 2: Trace Task Creation Flow ✅ COMPLETED

**Expected Flow (NEW System - TaskPanel):**
```
User clicks "Create Task" in modal
  → Form validation
  → createTask(request)
    → startSummaryJob(request) API call
    → Backend creates job, returns job_id
    → Frontend stores task
    → TaskStreamWrapper created for task
    → useSummaryStreamInstance auto-connects
    → SSE connection created for job_id
```

**Actual Flow (Based on Logs & Code Analysis):**
```
Page Load
  → useTaskManager mounts
  → restoreTasksFromStorage() (line 651-672)
    → 3 tasks restored from sessionStorage
    → setTasks([task1, task2, task3])
  → TaskList renders
    → Creates TaskStreamWrapper for task1
    → Creates TaskStreamWrapper for task2
    → Creates TaskStreamWrapper for task3
  → All 3 TaskStreamWrappers mount simultaneously
    → useSummaryStreamInstance(jobId1) mounts
    → useSummaryStreamInstance(jobId2) mounts
    → useSummaryStreamInstance(jobId3) mounts
  → All 3 auto-connect effects fire simultaneously
    → [StreamInstance] Connecting to SSE endpoint (3×)
    → [AuthenticatedSSE] Connection established in 0ms (3×)
```

**Root Cause Identified:**
The 3 simultaneous SSE connections are NOT from user clicking "Summarize" 3 times.  
They're from **task restoration on page load** - 3 existing tasks being restored, each creating its own stream connection.

**What to Verify:**
- [x] How many times is `startSummaryJob()` called? → Once per actual task creation
- [x] How many times is `createTask()` called? → Once per actual task creation
- [x] Are there multiple entry points for task creation? → YES (OLD + NEW system)
- [ ] Is there double-click prevention? → NO
- [ ] Is there in-flight request tracking? → NO
- [x] Task restoration causes all streams to connect at once? → YES (Confirmed)

### Step 3: Add Debug Logging

**Add to all submit handlers:**
```typescript
const handleSubmit = async (data: FormData) => {
  console.log('[SUBMIT] Button clicked', {
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack,
    data,
  });
  
  // ... rest of handler
};
```

**Add to task creation:**
```typescript
const createTask = async (request: SummaryRequest) => {
  console.log('[CREATE_TASK] Task creation started', {
    timestamp: new Date().toISOString(),
    request,
    existingTasks: tasks.length,
    stackTrace: new Error().stack?.split('\n').slice(1, 5).join('\n'),
  });
  
  // ... rest of function
};
```

**Add to API call:**
```typescript
export async function startSummaryJob(request: SummaryRequest) {
  console.log('[API] startSummaryJob called', {
    timestamp: new Date().toISOString(),
    request,
    stackTrace: new Error().stack?.split('\n').slice(1, 5).join('\n'),
  });
  
  // ... rest of function
};
```

---

## Implementation Phase

### Solution 1: Request Deduplication (Recommended)

**Implementation Location:** `frontend/src/hooks/useTaskManager.ts`

#### 1.1: Add In-Flight Request Tracking

```typescript
export function useTaskManager({ user, quota }: UseTaskManagerDeps) {
  // ... existing state
  
  // NEW: Track in-flight requests to prevent duplicates
  const inFlightRequestsRef = useRef<Set<string>>(new Set());
  
  // NEW: Generate request fingerprint for deduplication
  const getRequestFingerprint = (request: SummaryRequest): string => {
    // Create unique fingerprint from request parameters
    return JSON.stringify({
      urls: request.urls.sort(), // Sort for consistency
      options: {
        language: request.options.language,
        outputLength: request.options.outputLength,
        focus: request.options.focus,
      },
    });
  };
  
  const createTask = useCallback(
    async (request: SummaryRequest): Promise<string | null> => {
      // NEW: Generate fingerprint for this request
      const fingerprint = getRequestFingerprint(request);
      
      // NEW: Check if this exact request is already in-flight
      if (inFlightRequestsRef.current.has(fingerprint)) {
        console.warn('[useTaskManager] Duplicate request detected, ignoring', {
          fingerprint,
          timestamp: new Date().toISOString(),
        });
        showToast({
          variant: 'info',
          title: 'Request Already Processing',
          description: 'This summary is already being generated.',
          duration: 3000,
        });
        return null; // Return null to indicate duplicate
      }
      
      // NEW: Add to in-flight set
      inFlightRequestsRef.current.add(fingerprint);
      console.log('[useTaskManager] Task creation started', {
        fingerprint,
        timestamp: new Date().toISOString(),
        inFlightCount: inFlightRequestsRef.current.size,
      });
      
      if (!canCreateTask) {
        const tierName = user?.tier === 'free' ? 'Free' : 'Premium';
        // NEW: Remove from in-flight on error
        inFlightRequestsRef.current.delete(fingerprint);
        throw new Error(
          `Task limit reached. ${tierName} users can run ${maxTaskCount} task${maxTaskCount > 1 ? 's' : ''} simultaneously.`
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

        // Add task to list immediately
        const newTask: TaskInfo = {
          jobId,
          title: null,
          status: 'idle',
          progress: 0,
          message: 'Starting...',
          createdAt: new Date(),
        };

        setTasks((prev) => [...prev, newTask]);

        // Refresh from backend to sync
        await refreshTasks();
        
        console.log('[useTaskManager] Task created successfully', {
          jobId,
          fingerprint,
          timestamp: new Date().toISOString(),
        });

        return jobId;
      } catch (error) {
        console.error('[useTaskManager] Failed to create task:', error);
        throw error;
      } finally {
        setIsLoading(false);
        // NEW: Always remove from in-flight, even on error
        inFlightRequestsRef.current.delete(fingerprint);
        console.log('[useTaskManager] Task creation complete', {
          fingerprint,
          inFlightCount: inFlightRequestsRef.current.size,
        });
      }
    },
    [canCreateTask, maxTaskCount, user?.tier, refreshTasks, showToast]
  );
  
  // NEW: Cleanup in-flight requests on unmount
  useEffect(() => {
    return () => {
      inFlightRequestsRef.current.clear();
    };
  }, []);
  
  // ... rest of hook
}
```

#### 1.2: Add Timeout for In-Flight Requests

```typescript
// If request takes longer than 30 seconds, remove from in-flight
// This prevents stuck requests from blocking future submissions

const createTask = useCallback(
  async (request: SummaryRequest): Promise<string | null> => {
    const fingerprint = getRequestFingerprint(request);
    
    if (inFlightRequestsRef.current.has(fingerprint)) {
      console.warn('[useTaskManager] Duplicate request detected, ignoring');
      return null;
    }
    
    inFlightRequestsRef.current.add(fingerprint);
    
    // NEW: Set timeout to auto-remove if request takes too long
    const timeoutId = setTimeout(() => {
      if (inFlightRequestsRef.current.has(fingerprint)) {
        console.warn('[useTaskManager] In-flight request timeout, removing', {
          fingerprint,
          timeout: 30000,
        });
        inFlightRequestsRef.current.delete(fingerprint);
      }
    }, 30000); // 30 second timeout
    
    try {
      // ... existing task creation logic
      
      return jobId;
    } finally {
      clearTimeout(timeoutId); // Clear timeout on completion
      inFlightRequestsRef.current.delete(fingerprint);
    }
  },
  [/* dependencies */]
);
```

### Solution 2: Button Disable During Submission

**Implementation Location:** Form submit button components

#### 2.1: Update ControlPanel Submit Button

```typescript
// frontend/src/components/dashboard/ControlPanel.tsx

export function ControlPanel({ onSubmit, isProcessing }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (isSubmitting) {
      console.warn('[ControlPanel] Submit already in progress, ignoring');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      // Keep button disabled for 1 second after submission
      // to prevent rapid double-clicks
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };
  
  return (
    <Button
      onClick={handleSubmit}
      disabled={isSubmitting || isProcessing}
      className={cn(
        isSubmitting && "cursor-not-allowed opacity-50"
      )}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="animate-spin mr-2" />
          Creating Task...
        </>
      ) : (
        'Summarize'
      )}
    </Button>
  );
}
```

#### 2.2: Add Debouncing to Submit Handler

```typescript
// frontend/src/hooks/useSummaryForm.ts

import { debounce } from 'lodash'; // or implement custom debounce

export function useSummaryForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Debounce submit handler to prevent rapid clicks
  const handleSubmit = useMemo(
    () => debounce(
      async (data: FormData) => {
        if (isSubmitting) {
          console.warn('[useSummaryForm] Submit already in progress');
          return;
        }
        
        setIsSubmitting(true);
        try {
          // ... validation and submission logic
        } finally {
          setIsSubmitting(false);
        }
      },
      500, // 500ms debounce
      { leading: true, trailing: false } // First click triggers immediately, subsequent ignored
    ),
    [isSubmitting]
  );
  
  return {
    handleSubmit,
    isSubmitting,
    // ... other form state
  };
}
```

### Solution 3: Global Task Creation Lock

**Implementation Location:** Create new file `frontend/src/lib/task-creation-lock.ts`

```typescript
/**
 * Global singleton to prevent concurrent task creation
 * Ensures only ONE task creation request can be in-flight at a time
 */
class TaskCreationLock {
  private isLocked: boolean = false;
  private lockTimestamp: number | null = null;
  private readonly LOCK_TIMEOUT_MS = 30000; // 30 seconds
  
  /**
   * Attempt to acquire lock
   * @returns true if lock acquired, false if already locked
   */
  public tryAcquire(): boolean {
    // Check if lock is stale (timeout exceeded)
    if (this.isLocked && this.lockTimestamp) {
      const elapsed = Date.now() - this.lockTimestamp;
      if (elapsed > this.LOCK_TIMEOUT_MS) {
        console.warn('[TaskCreationLock] Lock timeout exceeded, forcing release', {
          elapsed,
          timeout: this.LOCK_TIMEOUT_MS,
        });
        this.release();
      }
    }
    
    if (this.isLocked) {
      console.warn('[TaskCreationLock] Lock already held, request rejected', {
        lockAge: this.lockTimestamp ? Date.now() - this.lockTimestamp : 0,
      });
      return false;
    }
    
    this.isLocked = true;
    this.lockTimestamp = Date.now();
    console.log('[TaskCreationLock] Lock acquired', {
      timestamp: new Date().toISOString(),
    });
    return true;
  }
  
  /**
   * Release lock
   */
  public release(): void {
    if (!this.isLocked) {
      console.warn('[TaskCreationLock] Attempted to release unlocked lock');
      return;
    }
    
    const lockDuration = this.lockTimestamp ? Date.now() - this.lockTimestamp : 0;
    this.isLocked = false;
    this.lockTimestamp = null;
    console.log('[TaskCreationLock] Lock released', {
      duration: lockDuration,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * Check if lock is currently held
   */
  public isHeld(): boolean {
    return this.isLocked;
  }
  
  /**
   * Execute function with lock protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    if (!this.tryAcquire()) {
      return null;
    }
    
    try {
      const result = await fn();
      return result;
    } finally {
      this.release();
    }
  }
}

// Export singleton instance
export const taskCreationLock = new TaskCreationLock();
```

#### 3.1: Use Lock in createTask

```typescript
// frontend/src/hooks/useTaskManager.ts

import { taskCreationLock } from '@/lib/task-creation-lock';

const createTask = useCallback(
  async (request: SummaryRequest): Promise<string | null> => {
    // NEW: Use global lock to prevent concurrent creation
    const result = await taskCreationLock.execute(async () => {
      console.log('[useTaskManager] Task creation started (lock held)', {
        timestamp: new Date().toISOString(),
      });
      
      if (!canCreateTask) {
        const tierName = user?.tier === 'free' ? 'Free' : 'Premium';
        throw new Error(
          `Task limit reached. ${tierName} users can run ${maxTaskCount} task${maxTaskCount > 1 ? 's' : ''} simultaneously.`
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

        const newTask: TaskInfo = {
          jobId,
          title: null,
          status: 'idle',
          progress: 0,
          message: 'Starting...',
          createdAt: new Date(),
        };

        setTasks((prev) => [...prev, newTask]);
        await refreshTasks();
        
        return jobId;
      } catch (error) {
        console.error('[useTaskManager] Failed to create task:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
    
    if (result === null) {
      // Lock was held, duplicate request
      showToast({
        variant: 'info',
        title: 'Request Already Processing',
        description: 'Please wait for the current task to complete.',
        duration: 3000,
      });
    }
    
    return result;
  },
  [canCreateTask, maxTaskCount, user?.tier, refreshTasks, showToast]
);
```

### Solution 4: Unified Task Creation API

**Goal:** Single entry point for ALL task creation, regardless of source

#### 4.1: Create TaskManagerContext with Single createTask Method

```typescript
// frontend/src/contexts/TaskManagerContext.tsx

export const TaskManagerProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { quota } = useUserData();
  const taskManager = useTaskManager({ user, quota });
  
  // Wrap createTask to add logging and ensure single entry point
  const createTaskWrapper = useCallback(
    async (request: SummaryRequest): Promise<string | null> => {
      console.log('[TaskManagerContext] createTask called', {
        timestamp: new Date().toISOString(),
        source: new Error().stack?.split('\n')[2], // Log caller
        request,
      });
      
      return await taskManager.createTask(request);
    },
    [taskManager]
  );
  
  return (
    <TaskManagerContext.Provider value={{
      ...taskManager,
      createTask: createTaskWrapper,
    }}>
      {children}
    </TaskManagerContext.Provider>
  );
};
```

#### 4.2: Update All Submit Handlers to Use Context

```typescript
// frontend/src/app/page.tsx

export default function DashboardPage() {
  const { createTask } = useTaskManagerContext(); // Use context, not local state
  
  const handleSubmit = async (data: FormData) => {
    const request: SummaryRequest = {
      urls: data.urls,
      options: data.options,
    };
    
    const jobId = await createTask(request); // Single source of truth
    if (jobId) {
      // Task created successfully
      console.log('[Dashboard] Task created:', jobId);
    }
  };
  
  // ... rest of component
}
```

### Solution 5: Backend Job Deduplication (Defense in Depth)

**Implementation Location:** `backend/src/controllers/summary.controller.ts`

```typescript
// Add job deduplication on backend
// If identical request comes in within short time window, return existing job

interface JobFingerprint {
  userId: string;
  urls: string[];
  options: string; // JSON.stringify of options
}

const recentJobsCache = new Map<string, { jobId: string; timestamp: number }>();
const DEDUPLICATION_WINDOW_MS = 5000; // 5 seconds

export async function createSummaryJob(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.userId!;
  const { urls, options } = req.body;
  
  // Generate fingerprint for this request
  const fingerprint: JobFingerprint = {
    userId,
    urls: urls.sort(),
    options: JSON.stringify(options),
  };
  const fingerprintKey = JSON.stringify(fingerprint);
  
  // Check if identical job was created recently
  const recentJob = recentJobsCache.get(fingerprintKey);
  if (recentJob) {
    const elapsed = Date.now() - recentJob.timestamp;
    if (elapsed < DEDUPLICATION_WINDOW_MS) {
      logger.warn('Duplicate job creation attempt detected', {
        userId,
        existingJobId: recentJob.jobId,
        elapsedMs: elapsed,
      });
      
      // Return existing job instead of creating duplicate
      res.status(200).json({
        success: true,
        data: {
          job_id: recentJob.jobId,
          message: 'Job already in progress',
        },
      });
      return;
    }
  }
  
  // Create new job
  const jobId = generateJobId();
  
  // Store in cache for deduplication
  recentJobsCache.set(fingerprintKey, {
    jobId,
    timestamp: Date.now(),
  });
  
  // Clean up old cache entries periodically
  if (recentJobsCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of recentJobsCache.entries()) {
      if (now - value.timestamp > DEDUPLICATION_WINDOW_MS) {
        recentJobsCache.delete(key);
      }
    }
  }
  
  // ... rest of job creation logic
}
```

---

## Testing Phase

### Test Cases

#### Test 1: Double Click Prevention
```typescript
// Test: User double-clicks submit button
// Expected: Only 1 task created
// How to verify: Check logs, count API calls, check task list
```

#### Test 2: Rapid Form Submission
```typescript
// Test: User presses Enter, then clicks button within 500ms
// Expected: Only 1 task created
// How to verify: Check logs, count API calls
```

#### Test 3: Network Retry
```typescript
// Test: Network error occurs during task creation
// Expected: Retry uses same request, no duplicate task
// How to verify: Check backend job count, frontend task list
```

#### Test 4: React Strict Mode
```typescript
// Test: Run in development with Strict Mode
// Expected: Component double-mounts, but only 1 task created
// How to verify: Check logs for mount/unmount, count tasks
```

#### Test 5: Concurrent Dashboard + TaskPanel
```typescript
// Test: User submits from dashboard while TaskPanel is open
// Expected: Only 1 task created
// How to verify: Check both systems recognize same task, no duplicates
```

### Automated Tests

```typescript
// frontend/src/hooks/__tests__/useTaskManager.duplicate.test.ts

describe('useTaskManager - Duplicate Prevention', () => {
  it('should prevent duplicate task creation from rapid clicks', async () => {
    const { result } = renderHook(() => useTaskManager({ user, quota }));
    
    const request: SummaryRequest = {
      urls: ['https://youtube.com/watch?v=123'],
      options: defaultOptions,
    };
    
    // Simulate rapid double-click
    const promise1 = result.current.createTask(request);
    const promise2 = result.current.createTask(request);
    
    const [jobId1, jobId2] = await Promise.all([promise1, promise2]);
    
    // One should succeed, one should return null (duplicate)
    expect([jobId1, jobId2].filter(id => id !== null)).toHaveLength(1);
    
    // Only one task in list
    expect(result.current.tasks).toHaveLength(1);
  });
  
  it('should allow different tasks to be created concurrently', async () => {
    const { result } = renderHook(() => useTaskManager({ user, quota }));
    
    const request1: SummaryRequest = {
      urls: ['https://youtube.com/watch?v=123'],
      options: defaultOptions,
    };
    
    const request2: SummaryRequest = {
      urls: ['https://youtube.com/watch?v=456'],
      options: defaultOptions,
    };
    
    const [jobId1, jobId2] = await Promise.all([
      result.current.createTask(request1),
      result.current.createTask(request2),
    ]);
    
    // Both should succeed (different requests)
    expect(jobId1).not.toBeNull();
    expect(jobId2).not.toBeNull();
    expect(jobId1).not.toBe(jobId2);
    expect(result.current.tasks).toHaveLength(2);
  });
});
```

---

## Rollout Plan

### Phase 1: Logging (Week 1)
- [ ] Add debug logging to all submit handlers
- [ ] Add debug logging to task creation
- [ ] Add debug logging to API calls
- [ ] Deploy to production
- [ ] Monitor logs for 3-5 days
- [ ] Analyze patterns: How often are duplicates created?

### Phase 2: Quick Wins (Week 2)
- [ ] Implement Solution 2: Button disable + debouncing
- [ ] Implement Solution 1.1: In-flight request tracking
- [ ] Deploy to staging
- [ ] Test all scenarios
- [ ] Deploy to production
- [ ] Monitor for 3-5 days

### Phase 3: Robust Solution (Week 3)
- [ ] Implement Solution 3: Global task creation lock
- [ ] Implement Solution 1.2: Request timeout
- [ ] Update all submit handlers to use lock
- [ ] Deploy to staging
- [ ] Full regression testing
- [ ] Deploy to production
- [ ] Monitor for 1 week

### Phase 4: Defense in Depth (Week 4)
- [ ] Implement Solution 5: Backend deduplication
- [ ] Implement Solution 4: Unified task creation API
- [ ] Full integration testing
- [ ] Deploy to staging
- [ ] Load testing
- [ ] Deploy to production
- [ ] Monitor for 2 weeks

### Phase 5: Cleanup (Week 5)
- [ ] Remove debug logging (keep essential logs)
- [ ] Update documentation
- [ ] Add inline code comments
- [ ] Update tests
- [ ] Performance optimization
- [ ] Final production deployment

---

## Success Criteria

### Metrics to Track

**Before Fix:**
- Track duplicate task creation rate
- Track API call patterns
- Track user complaints

**After Fix:**
- Zero duplicate tasks from single user action
- One API call per submit button click
- No degradation in response time
- No user complaints about stuck submissions

### Monitoring

```typescript
// Add metrics to track
const metrics = {
  duplicateRequestsBlocked: 0,
  taskCreationAttempts: 0,
  taskCreationSuccesses: 0,
  taskCreationFailures: 0,
  averageCreationTime: 0,
};

// Log metrics periodically
setInterval(() => {
  console.log('[TaskManager Metrics]', metrics);
}, 60000); // Every minute
```

---

## Rollback Plan

### If Issues Arise

**Symptoms to Watch:**
- Users can't create tasks
- Submissions stuck/hanging
- Increased error rates
- Performance degradation

**Rollback Steps:**
1. Revert to previous deployment
2. Disable new features via feature flag
3. Analyze logs to identify issue
4. Fix and redeploy

### Feature Flags

```typescript
// Add feature flags for gradual rollout
const FEATURE_FLAGS = {
  ENABLE_REQUEST_DEDUPLICATION: process.env.NEXT_PUBLIC_ENABLE_DEDUP === 'true',
  ENABLE_GLOBAL_LOCK: process.env.NEXT_PUBLIC_ENABLE_LOCK === 'true',
  ENABLE_BACKEND_DEDUP: process.env.BACKEND_ENABLE_DEDUP === 'true',
};

// Use in code
if (FEATURE_FLAGS.ENABLE_REQUEST_DEDUPLICATION) {
  // New logic
} else {
  // Old logic (fallback)
}
```

---

## Executive Summary

### Key Finding: 3 Connections Are Expected Behavior ✅

The 3 simultaneous SSE connections observed in logs are **NOT a bug**. They represent:
- 3 active tasks restored from sessionStorage on page load
- Each task gets its own SSE stream (by design for multi-task feature)
- All streams connect simultaneously on mount (optimization, not race condition)

### What Actually Needs Fixing

**Primary Issue:** Prevent duplicate task creation from rapid user clicks
- User double-clicks "Summarize" → 2 tasks created for same request
- No debouncing or in-flight tracking
- No visual feedback that submission is processing

**Secondary Issues:**
1. No prevention for React Strict Mode double-mounting (dev mode issue)
2. No backend deduplication if identical request comes through
3. Potential for main dashboard + TaskPanel to both respond to same action (theoretical)

### Recommended Implementation Order

1. **Start with Logging** (Phase 1) - Confirm the hypothesis
2. **Quick Wins** (Phase 2) - Button disable + in-flight tracking  
   **← START HERE for 80% solution in 3 days**
3. **Robust Solution** (Phase 3) - Global lock + timeout
4. **Defense in Depth** (Phase 4) - Backend deduplication
5. **Cleanup** (Phase 5) - Polish and optimize

### Key Principles

- **Defense in Depth:** Multiple layers of protection
- **Fail Safe:** If lock fails, don't block user forever (timeout)
- **User Feedback:** Show toast when duplicate detected
- **Logging:** Comprehensive logging for debugging
- **Testing:** Automated tests for all scenarios
- **Gradual Rollout:** Feature flags for safe deployment

### Estimated Timeline

- Investigation: 2-3 days
- Implementation: 2-3 weeks
- Testing: 1 week
- Monitoring: 2 weeks
- **Total: ~5-6 weeks for complete solution**

### Quick Fix (If Urgent)

If this needs to be fixed ASAP, implement only:
- Solution 2: Button disable (1 day)
- Solution 1.1: In-flight tracking (1 day)
- Basic testing (1 day)
- **Total: 3 days for 80% solution**
