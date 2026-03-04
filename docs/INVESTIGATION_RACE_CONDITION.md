# Race Condition Investigation: Multiple SSE Connections

**Date:** 2026-01-19  
**Status:** Investigation Complete - DO NOT IMPLEMENT YET

## Summary

The logs show 3 SSE connection attempts being created simultaneously:
- First set: `[useSummaryStream] Connecting to SSE endpoint (attempt 1)` × 3
- Second set: `[StreamInstance] Connecting to SSE endpoint` × 3
- All 3 connections established successfully: `[AuthenticatedSSE] Connection established in 0ms` × 3

## Root Cause Analysis

### 1. **Expected Behavior (Not a Bug)**
The system is designed to support **multiple simultaneous tasks**, where each task gets its own SSE stream instance. The 3 connections correspond to 3 active tasks.

**Evidence from logs:**
- Render #64: `tasksCount: 3` - Three tasks exist
- Three `TaskStreamWrapper` components are created (one per task)
- Each wrapper creates its own `useSummaryStreamInstance` hook
- Each hook auto-connects to its own jobId

**Architecture:**
```
TaskList
  ├── TaskStreamWrapper (task1) → useSummaryStreamInstance(jobId1) → SSE Connection 1
  ├── TaskStreamWrapper (task2) → useSummaryStreamInstance(jobId2) → SSE Connection 2
  └── TaskStreamWrapper (task3) → useSummaryStreamInstance(jobId3) → SSE Connection 3
```

### 2. **Potential Race Conditions (Real Issues)**

#### Issue A: Re-render Triggers Duplicate Connections

**Location:** `frontend/src/hooks/useSummaryStreamInstance.ts:540-551`

```typescript
useEffect(() => {
  if (jobId && isMountedRef.current) {
    connect(jobId).catch((err) => {
      console.error(`[StreamInstance] Failed to connect to job ${jobId}:`, err);
    });
  }
  return () => {
    disconnect();
  };
}, [jobId, connect, disconnect]);
```

**Problem:**
- Dependencies include `connect` and `disconnect` callbacks
- These are `useCallback` functions that may be recreated on parent re-renders
- If recreated, the effect fires again → new connection attempt
- The cleanup (disconnect) only runs AFTER the new effect starts

**Race Condition Scenario:**
1. Component renders, effect fires, connection starts
2. Parent re-renders causing `connect`/`disconnect` to be recreated (if their dependencies change)
3. Effect fires again → NEW connection attempt starts
4. THEN cleanup runs → OLD connection disconnected
5. Result: Brief period with 2 connections for same jobId

#### Issue B: No Duplicate Connection Guard

**Location:** `frontend/src/hooks/useSummaryStreamInstance.ts:388-407`

```typescript
const connect = useCallback(
  (targetJobId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!targetJobId) {
        reject(new Error('Job ID is required'));
        return;
      }

      const url = `${apiBaseUrl}${apiEndpoints.status(targetJobId)}`;
      
      console.log(`[StreamInstance] Connecting to SSE endpoint`, {
        url,
        jobId: targetJobId,
      });

      const eventSource = new AuthenticatedSSE(url, {
        withCredentials: false,
        enableAutoReconnect: false,
      });
      eventSourceRef.current = eventSource;
      // ... rest of connection logic
```

**Problem:**
- No check for `eventSourceRef.current` before creating new connection
- No check for `isConnected` state
- If called multiple times rapidly, creates multiple EventSource instances
- Only the last one is stored in `eventSourceRef.current` → previous ones leak

#### Issue C: useTaskManager Re-render Storm

**Location:** `frontend/src/hooks/useTaskManager.ts:624-759`

**Evidence from logs:**
```
[useTaskManager-o04i9mc9x] RENDER #6
[useTaskManager-o04i9mc9x] useEffect CLEANUP
[useTaskManager-o04i9mc9x] useEffect SETUP
[useTaskManager-o04i9mc9x] useEffect PROCEEDING with setup
[useTaskManager-o04i9mc9x] RENDER #7
... continues through render #76
```

**Problem:**
- useTaskManager renders 76 times in this session
- Multiple cleanup/setup cycles (renders #6, #9, #14, #19, #25, #34, #51)
- Each cleanup clears polling interval, setup recreates it
- Each setup calls `refreshTasks()` → fetches tasks → updates state → causes TaskList re-render
- TaskList re-render → TaskStreamWrapper re-render → might trigger reconnection

**Trigger Chain:**
```
useTaskManager re-render
  → cleanup/setup cycle
  → refreshTasks() called
  → tasks state updated
  → TaskList re-renders
  → TaskStreamWrapper re-renders
  → useSummaryStreamInstance dependencies change?
  → reconnection attempt
```

#### Issue D: Task Restoration Creates All Streams Simultaneously

**Location:** `frontend/src/hooks/useTaskManager.ts:651-675`

```typescript
const restoreTasksFromStorage = () => {
  try {
    const storedTasks = sessionStorage.getItem('activeTasks');
    if (storedTasks) {
      const parsedTasks = JSON.parse(storedTasks);
      const restoredTasks = parsedTasks.filter((task: any) => {
        const createdAt = new Date(task.createdAt);
        const age = Date.now() - createdAt.getTime();
        return age < apiConfig.tasks.restorationTimeout;
      });
      if (restoredTasks.length > 0) {
        setTasks(restoredTasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
        })));
      }
    }
  } catch (error) {
    console.error('Failed to restore tasks from storage:', error);
  }
};

restoreTasksFromStorage();
refreshTasks();
```

**Problem:**
- On mount, restores all tasks from sessionStorage simultaneously
- Immediately calls `refreshTasks()` which updates tasks again
- TaskList receives all tasks at once
- Creates all TaskStreamWrapper components at once
- All streams attempt to connect simultaneously

**Timeline:**
1. Page loads → useTaskManager mounts
2. `restoreTasksFromStorage()` → adds 3 tasks to state
3. TaskList renders → creates 3 TaskStreamWrapper
4. All 3 useSummaryStreamInstance hooks mount
5. All 3 auto-connect effects fire simultaneously
6. `refreshTasks()` called → updates tasks → another render
7. Possible reconnection if dependencies changed

## Specific Log Analysis

### Initial Setup (Render #3)
```
[useTaskManager-o04i9mc9x] useEffect PROCEEDING with setup
```
- First proper setup after auth is ready
- Calls `restoreTasksFromStorage()` and `refreshTasks()`

### First Connection Burst (Around Render #27)
```
[useSummaryStream] Connecting to SSE endpoint (attempt 1) Object
[useSummaryStream] Connecting to SSE endpoint (attempt 1) Object
[useSummaryStream] Connecting to SSE endpoint (attempt 1) Object
[AuthenticatedSSE] Connection established in 0ms
[AuthenticatedSSE] Connection established in 477ms
```
- 3 connections created (likely for 3 tasks)
- Two connections establish instantly (0ms)
- One takes 477ms
- NOTE: These logs use `[useSummaryStream]` which is the OLD hook, not `[StreamInstance]`

### Second Connection Burst (Around Render #53)
```
[StreamInstance] Connecting to SSE endpoint Object
[StreamInstance] Connecting to SSE endpoint Object
[StreamInstance] Connecting to SSE endpoint Object
[AuthenticatedSSE] Connection established in 0ms
[AuthenticatedSSE] Connection established in 0ms
[AuthenticatedSSE] Connection established in 0ms
```
- Another 3 connections created
- All establish instantly
- Uses `[StreamInstance]` logs (correct hook)

**Questions:**
1. Why two different log prefixes (`useSummaryStream` vs `StreamInstance`)?
   - **CONFIRMED:** Both old and new hooks are in use simultaneously!
   - Old hook: `useSummaryStream` (single-task, used in `app/page.tsx` and `app/app/page.tsx`)
   - New hook: `useSummaryStreamInstance` (multi-task, used by TaskPanel system)
   - This means there could be 4+ connections: 1 from old hook + 3 from new hook
2. Why two bursts of connections?
   - Possible: Task restoration + refresh cycle
   - Possible: Component remount/cleanup cycle
   - Possible: Both old and new systems creating connections simultaneously

## Critical Finding: Dual SSE System Architecture

### Two Concurrent SSE Systems Running

The codebase has **TWO separate SSE streaming systems** that can run simultaneously:

#### System 1: Old Single-Task System
- **Hook:** `useSummaryStream` (`frontend/src/hooks/useSummaryStream.ts`)
- **Used in:** Main dashboard pages
  - `frontend/src/app/page.tsx` (line 17)
  - `frontend/src/app/app/page.tsx` (line 16)
- **Purpose:** Original single-task streaming for main dashboard
- **Log prefix:** `[useSummaryStream]`
- **Connections:** 1 per active summary job

#### System 2: New Multi-Task System
- **Hook:** `useSummaryStreamInstance` (`frontend/src/hooks/useSummaryStreamInstance.ts`)
- **Used in:** TaskPanel system
  - `TaskStreamWrapper.tsx` → creates instance per task
  - Used by `TaskList`, `TaskPanel`, `useTaskManager`
- **Purpose:** Multi-task concurrent streaming (Phase 3 feature)
- **Log prefix:** `[StreamInstance]`
- **Connections:** 1 per task (3 tasks = 3 connections)

### The Critical Problem

**If a user creates a task through the main dashboard while TaskPanel is active:**

1. Main dashboard (`app/page.tsx`) calls `useSummaryStream` → creates SSE connection for jobId
2. Task is added to TaskManager → appears in TaskPanel
3. TaskPanel creates `TaskStreamWrapper` for the task
4. `TaskStreamWrapper` calls `useSummaryStreamInstance(jobId)` → creates ANOTHER SSE connection for SAME jobId
5. **Result:** 2 SSE connections to the same backend endpoint for the same job!

**Evidence from logs:**
```
[useSummaryStream] Connecting to SSE endpoint (attempt 1) Object  ← Old system
[useSummaryStream] Connecting to SSE endpoint (attempt 1) Object
[useSummaryStream] Connecting to SSE endpoint (attempt 1) Object

[StreamInstance] Connecting to SSE endpoint Object                ← New system
[StreamInstance] Connecting to SSE endpoint Object
[StreamInstance] Connecting to SSE endpoint Object
```

This shows both systems attempting connections, potentially for overlapping tasks.

### Why This is Dangerous

1. **Backend SSE Handler Confusion**
   - Backend maintains SSE connection map: `Map<jobId, SSEConnection[]>`
   - Two connections for same jobId → backend sends events to BOTH
   - State updates processed twice → potential race conditions

2. **Frontend State Desync**
   - Two hooks managing state for same job
   - Old system updates dashboard state
   - New system updates TaskPanel state
   - Different update timings → UI inconsistencies

3. **Connection Pool Exhaustion**
   - Browser limit: ~6 concurrent HTTP/2 connections per domain
   - 3 tasks × 2 systems = 6 connections
   - Add any other API calls → connection starvation

4. **Memory Leaks**
   - Each system maintains its own refs, timers, state
   - Double the memory usage per task
   - If one system doesn't cleanup properly → leak persists

### Architectural Questions

**Why do both systems exist?**
- Old system: Original implementation for single-task workflow
- New system: Phase 3 enhancement for multi-task support
- **Problem:** Migration incomplete - both systems still active

**Should they coexist?**
- NO - they serve the same purpose
- New system is superset of old system (multi-task includes single-task)
- Old system should be deprecated/removed

**Which one is being used?**
- Looking at user flow:
  - User lands on dashboard (`app/page.tsx`) → Old system active
  - User clicks "+" to create task → TaskPanel opens → New system active
  - **Both could be active simultaneously**

### Visual Diagram of Dual System

```
User Dashboard (app/page.tsx)
│
├─► useSummaryStream (Old System)
│   │
│   └─► SSE Connection 1 (jobId: abc123)
│       └─► Backend: /api/jobs/abc123/status
│
└─► TaskPanel (TaskPanel.tsx)
    │
    └─► TaskList
        │
        ├─► TaskStreamWrapper (task 1: abc123)  ← DUPLICATE!
        │   └─► useSummaryStreamInstance
        │       └─► SSE Connection 2 (jobId: abc123)
        │           └─► Backend: /api/jobs/abc123/status
        │
        ├─► TaskStreamWrapper (task 2: def456)
        │   └─► useSummaryStreamInstance
        │       └─► SSE Connection 3 (jobId: def456)
        │           └─► Backend: /api/jobs/def456/status
        │
        └─► TaskStreamWrapper (task 3: ghi789)
            └─► useSummaryStreamInstance
                └─► SSE Connection 4 (jobId: ghi789)
                    └─► Backend: /api/jobs/ghi789/status

Total: 4 SSE connections
       - 2 connections for jobId abc123 (DUPLICATE!)
       - 1 connection for jobId def456
       - 1 connection for jobId ghi789
```

## Additional Observations

### TaskStreamWrapper Design Issue

**Location:** `frontend/src/components/tasks/TaskStreamWrapper.tsx:22-62`

```typescript
export function TaskStreamWrapper({ task, onStreamUpdate }: TaskStreamWrapperProps) {
  const stream = useSummaryStreamInstance(task.jobId);
  // ...
  
  useEffect(() => {
    return () => {
      stream.disconnect();
    };
  }, [stream]);
  
  return null;
}
```

**Problem:**
- The cleanup effect depends on `[stream]`
- `stream` is the return object from useSummaryStreamInstance
- This object is recreated on every render (new object reference)
- Effect cleanup runs, then re-runs on every render → disconnect/reconnect cycle

### TaskList Creates Separate Wrappers and Cards

**Location:** `frontend/src/components/tasks/TaskList.tsx:82-95`

```typescript
{sortedTasks.map((task) => (
  <TaskStreamWrapper
    key={`stream-${task.jobId}`}
    task={task}
    onStreamUpdate={onStreamUpdate || (() => {})}
  />
))}

{/* Phase 4: Task cards with optimized animations */}
<AnimatePresence mode="popLayout">
  {sortedTasks.map((task) => (
    <TaskCard key={task.jobId} task={task} onCancel={onCancel} />
  ))}
</AnimatePresence>
```

**Observation:**
- TaskStreamWrapper and TaskCard are separate components
- Both iterate over the same task list
- Good separation of concerns
- But: TaskStreamWrapper depends on task object → any task property change causes re-render

## Crash Risk Assessment

### High Risk Scenarios

1. **Memory Leak from Abandoned Connections**
   - Multiple connections created, old ones not properly closed
   - EventSource objects accumulate in memory
   - Browser limits (~6 concurrent connections per domain)
   - Could exhaust connection pool → new connections fail

2. **Backend Overload**
   - Each SSE connection keeps HTTP connection open
   - 3 tasks × multiple connection attempts = many open connections
   - Backend SSE connection tracking might not handle rapid connect/disconnect
   - Could hit connection limits or memory issues on backend

3. **State Desynchronization**
   - Multiple streams updating same task state
   - Race between old connection's final updates and new connection's initial state
   - Could show wrong progress/status to user
   - Completed tasks might revert to "processing"

4. **React Strict Mode Double-Mounting**
   - In development, React Strict Mode mounts components twice
   - Each mount creates connections
   - First mount unmounts (cleanup) but connection might still be active
   - Second mount creates new connections
   - Could have 6+ connections in dev mode

### Medium Risk Scenarios

5. **Browser Tab Switch Behavior**
   - Page visibility changes cause refresh (line 48-58 in TaskPanel.tsx)
   - Refresh calls `refreshTasks()` → state update → re-render
   - Might trigger reconnection if components remount

6. **Auth State Changes**
   - useTaskManager depends on `authLoading` and `isAuthenticated`
   - Auth state changes cause cleanup/setup cycle
   - Could disconnect all streams and recreate them

### Low Risk (Current Behavior is Expected)

7. **Multiple Tasks = Multiple Connections**
   - This is by design and working as intended
   - Each task should have its own stream
   - Not a bug, just looks alarming in logs

## Recommended Investigation Steps (Before Implementing Fix)

### 1. Verify Old Hook Usage ✅ CONFIRMED
```bash
# Search for useSummaryStream (old hook) usage
grep -r "useSummaryStream[^Instance]" frontend/src/
```
**Result:** Old hook IS still in use!

**Files using OLD hook (`useSummaryStream`):**
- `frontend/src/app/page.tsx` (line 17)
- `frontend/src/app/app/page.tsx` (line 16)
- Tests: `useSummaryStream.test.ts`, `useSummaryStream.completion.test.ts`

**Files using NEW hook (`useSummaryStreamInstance`):**
- `frontend/src/hooks/useTaskManager.ts` (line 14)
- `frontend/src/components/tasks/TaskStreamWrapper.tsx` (line 10)
- `frontend/src/components/tasks/TaskList.tsx` (line 13)
- `frontend/src/components/tasks/TaskPanel.tsx` (line 17)

**Implication:** 
- Two separate SSE systems running concurrently!
- Old system: Single task on main dashboard
- New system: Multiple tasks in TaskPanel
- Potential for 4+ concurrent connections (1 old + 3 new)

### 2. Add Connection Tracking Logs
Add to `useSummaryStreamInstance.ts` connect function:
```typescript
const connect = useCallback((targetJobId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (eventSourceRef.current) {
      console.warn(`[StreamInstance ${targetJobId}] DUPLICATE CONNECTION ATTEMPT - already connected`);
      return; // Early exit
    }
    
    console.log(`[StreamInstance ${targetJobId}] CONNECT START`, {
      isConnected,
      existingConnection: !!eventSourceRef.current,
      timestamp: new Date().toISOString(),
    });
    
    // ... rest of connection logic
  });
}, [/* dependencies */]);
```

### 3. Add Render Tracking to TaskStreamWrapper
```typescript
const renderCount = useRef(0);
renderCount.current++;

console.log(`[TaskStreamWrapper ${task.jobId}] Render #${renderCount.current}`, {
  streamId: stream.jobId,
  streamStatus: stream.status,
  streamConnected: stream.isConnected,
});
```

### 4. Monitor Browser DevTools Network Tab
- Filter by EventSource/SSE connections
- Watch for:
  - Multiple connections to same job endpoint
  - Connections that don't close properly
  - Failed connection attempts

### 5. Test Specific Scenarios
- [ ] Create 3 tasks, observe connection count
- [ ] Switch tabs, come back, check if new connections created
- [ ] Refresh page with active tasks, count connections
- [ ] Create task, cancel it immediately, check cleanup
- [ ] Create task, complete it, check if connection closes

## Key Files Involved

1. **`frontend/src/hooks/useSummaryStreamInstance.ts`** (lines 540-551)
   - Auto-connect effect
   - Connect function (lines 388-407)

2. **`frontend/src/components/tasks/TaskStreamWrapper.tsx`**
   - Stream lifecycle management
   - Cleanup effect (lines 53-57)

3. **`frontend/src/components/tasks/TaskList.tsx`** (lines 82-88)
   - Creates TaskStreamWrapper for each task

4. **`frontend/src/hooks/useTaskManager.ts`**
   - Task restoration (lines 651-675)
   - Re-render storm (76 renders observed)
   - Cleanup/setup cycles (lines 747-758)

5. **`frontend/src/lib/authenticated-sse.ts`** (lines 114-213)
   - Connection guard (lines 119-123) - DOES check for duplicate connect attempts
   - But only at AuthenticatedSSE level, not at hook level

## Conclusion

**Not an immediate crash risk**, but several issues that could cause problems:

1. ✅ **Expected:** 3 tasks = 3 connections (by design)
2. ✅ **Confirmed:** Two SSE systems running concurrently (old single-task + new multi-task)
3. ⚠️ **Potential Issue:** Duplicate connections for same jobId during re-renders
4. ⚠️ **Potential Issue:** Connection leaks if old connections not properly closed
5. ⚠️ **Potential Issue:** useTaskManager re-render storm (76 renders)
6. ⚠️ **Potential Issue:** Task restoration creates all streams simultaneously
7. 🔴 **Critical Issue:** Same jobId might be used by both old AND new hook → 2 connections per task!

**Recommended Next Steps:**

### Phase 1: Immediate Investigation (DO THIS FIRST)
1. ✅ **COMPLETED:** Verify old hook usage → CONFIRMED dual system
2. Add connection tracking to both hooks
3. Test scenario: Create task on dashboard, observe TaskPanel → Count connections
4. Check browser DevTools Network tab → Filter EventSource → Count active connections
5. Confirm if same jobId appears in both systems

### Phase 2: Determine Strategy (Based on Phase 1 Results)

**Option A: Quick Fix (If only 3 connections, not 4+)**
- Guard against duplicate connections in `useSummaryStreamInstance`
- Fix useTaskManager re-render storm
- Fix TaskStreamWrapper cleanup effect
- Keep both systems (temporary)

**Option B: Architectural Fix (If 4+ connections confirmed)**
- Deprecate old `useSummaryStream` hook
- Migrate `app/page.tsx` and `app/app/page.tsx` to use TaskPanel system
- Remove old hook entirely
- Unified SSE streaming architecture

**Option C: Hybrid (If systems are genuinely separate)**
- Keep old hook for main dashboard single-task workflow
- Keep new hook for TaskPanel multi-task workflow
- Add jobId tracking to prevent duplicate connections
- Implement global SSE connection manager to deduplicate

### Phase 3: Implementation

**DO NOT IMPLEMENT YET** - Complete Phase 1 investigation first!

Based on investigation results, choose strategy and implement:

1. **If Quick Fix:**
   - Add `isConnecting` and `isConnected` guards to connect function
   - Fix useCallback dependencies to prevent effect re-trigger
   - Stabilize TaskStreamWrapper cleanup
   - Add connection deduplication map

2. **If Architectural Fix:**
   - Create migration plan for dashboard pages
   - Update dashboard to use TaskPanel system
   - Deprecate old hook with console warnings
   - Remove old hook after migration complete
   - Update tests

3. **If Hybrid:**
   - Implement global SSE connection registry
   - Add connection deduplication by jobId
   - Coordinate between old and new systems
   - Document dual system architecture

### Success Criteria

**Investigation Complete When:**
- [ ] Connection count confirmed (3 vs 4+)
- [ ] Duplicate jobId connections confirmed/denied
- [ ] Both systems active simultaneously confirmed/denied
- [ ] Re-render triggers measured and logged
- [ ] Connection leaks identified (if any)

**Fix Complete When:**
- [ ] No duplicate connections for same jobId
- [ ] Clean connection lifecycle (connect → use → disconnect)
- [ ] Re-render storm resolved (< 20 renders on mount)
- [ ] No connection leaks
- [ ] All SSE connections close on task completion/cancellation
- [ ] Browser connection pool not exhausted
- [ ] No backend SSE handler errors

**DO NOT IMPLEMENT FIXES YET** - Complete Phase 1 investigation first to determine correct strategy!
