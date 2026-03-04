# Backend-Frontend Consistency & Race Condition Analysis

**Date**: 2026-01-22  
**Status**: Analysis Complete - Issues Identified

---

## Executive Summary

This document analyzes consistency between backend and frontend PRDs, identifies missing race condition prevention mechanisms, and provides recommendations to avoid data syncing problems experienced in the summary feature.

---

## 1. API Consistency Issues

### Issue 1.1: Missing `raw_video_results` in Frontend Type Definition

**Backend PRD** (line 942-949):
```typescript
// Available after video search
raw_video_results?: Array<{
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration_seconds: number;
  view_count: number;
  upload_date: string;
  url: string;
}>;
```

**Frontend PRD** (line 383-394):
```typescript
export interface ResearchProgress {
  status: ResearchStatus;
  progress: number;
  message?: string;
  chunk?: string;
  title?: string;
  data?: ResearchResponse;
  generated_queries?: string[];
  selected_videos?: SelectedVideo[];
  error?: string;
  job_id?: string;
  // ❌ MISSING: raw_video_results
  // ❌ MISSING: video_count
}
```

**Impact**: Frontend code references `raw_video_results` but TypeScript types don't include it, causing type errors.

**Fix Required**: Add missing fields to frontend `ResearchProgress` interface.

---

### Issue 1.2: Missing `research_query` in Real-Time Status

**Backend PRD** (line 883-891):
- States that original research query is only available at completion
- Notes that minor enhancement needed to store in job object

**Frontend PRD** (line 542-543):
- References `research_query` in data flow examples
- Expects it to be available during processing

**Impact**: Frontend may try to access `research_query` before completion, getting undefined.

**Fix Required**: 
1. Backend: Store `research_query` in job object when created
2. Frontend: Handle case where `research_query` may not be available until completion

---

### Issue 1.3: Inconsistent Field Names

**Backend** uses snake_case: `raw_video_results`, `generated_queries`, `selected_videos`  
**Frontend** uses camelCase in some places: `rawVideoResults`, `generatedQueries`, `selectedVideos`

**Impact**: Potential runtime errors if frontend expects camelCase but backend sends snake_case.

**Fix Required**: Standardize on snake_case (matches backend API) or add transformation layer.

---

## 2. Race Condition Prevention

### Issue 2.1: No Duplicate Request Prevention

**Current Backend Implementation**:
- ✅ Task slot reservation (`reserveTaskSlot`) - prevents too many concurrent tasks
- ❌ No deduplication for identical requests
- ❌ No fingerprinting of requests

**Problem**: If user double-clicks "Start Research" or rapidly submits same query, multiple jobs will be created.

**Evidence from Summary Feature**:
- `IMPLEMENTATION_PLAN_FIX_TASK_CREATION_RACE.md` documents this exact issue
- Multiple tasks created from single user action
- No frontend deduplication

**Fix Required**: 
1. **Frontend**: Add request fingerprinting and in-flight tracking
2. **Backend**: Add deduplication window (5 seconds) for identical requests

---

### Issue 2.2: No SSE Connection Deduplication

**Current Implementation**:
- Multiple SSE connections can be established for same job
- No check if connection already exists
- Each connection receives all updates

**Problem**: If frontend reconnects or React Strict Mode causes double-mounting, duplicate connections created.

**Evidence from Summary Feature**:
- `INVESTIGATION_RACE_CONDITION.md` shows 3 SSE connections for same job
- Dual SSE system (old + new) can both connect to same job

**Fix Required**:
1. **Backend**: Track active SSE connections per job, prevent duplicates
2. **Frontend**: Check if connection exists before creating new one

---

### Issue 2.3: No Button Disable During Submission

**Current Frontend PRD**:
- No mention of disabling submit button during request
- No debouncing or click prevention

**Problem**: User can click multiple times before first request completes.

**Fix Required**: 
1. Disable submit button immediately on click
2. Show loading state
3. Re-enable only after response or error

---

## 3. Data Syncing Issues

### Issue 3.1: SSE vs Polling Data Consistency

**Backend Implementation**:
- Both SSE and polling use `buildResearchJobStatusResponse()`
- ✅ Same function ensures consistency

**Potential Issue**:
- SSE sends updates as they happen
- Polling gets snapshot at request time
- If polling happens between SSE updates, data may appear inconsistent

**Fix Required**: Ensure both methods return same data structure at same point in time.

---

### Issue 3.2: Job Object vs Database Consistency

**Current Flow**:
1. Job created in memory (`job.service.ts`)
2. Intermediate data stored in `job.research_data`
3. Final data saved to Firestore on completion

**Potential Issue**:
- If job object updated but SSE broadcast fails, frontend may miss update
- If database save fails but job marked complete, data inconsistency

**Fix Required**: 
1. Ensure atomic updates (job object + SSE broadcast)
2. Handle database save failures gracefully
3. Add retry logic for failed broadcasts

---

### Issue 3.3: Missing Research Query in Job Object

**Current Implementation**:
- `research_query` only stored in Firestore document
- Not stored in job object during processing
- Frontend can't display original query until completion

**Fix Required**: Store `research_query` in job object when job created.

---

## 4. Recommended Fixes

### Priority 1: Critical Consistency Fixes

#### Fix 1.1: Update Frontend Type Definitions
**File**: `frontend/src/types/research.ts`

```typescript
export interface ResearchProgress {
  status: ResearchStatus;
  progress: number;
  message?: string;
  chunk?: string;
  title?: string;
  data?: ResearchResponse;
  
  // ✅ ADD: Missing fields from backend
  generated_queries?: string[];
  raw_video_results?: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    view_count: number;
    upload_date: string;
    url: string;
  }>;
  video_count?: number;
  selected_videos?: SelectedVideo[];
  
  // ✅ ADD: Research query (when available)
  research_query?: string;
  
  error?: string;
  job_id?: string;
}
```

#### Fix 1.2: Store Research Query in Job Object
**File**: `backend/src/controllers/research.controller.ts`

```typescript
// After line 216: createJob(userId)
const jobId = createJob(userId);

// ✅ ADD: Store research query in job object
updateJobStatus(jobId, 'pending' as JobStatus, {
  research_data: {
    research_query: request.research_query,
  },
});
```

**File**: `backend/src/types/summary.types.ts`

```typescript
export interface JobInfo {
  // ... existing fields
  research_data?: {
    research_query?: string; // ✅ ADD
    generated_queries?: string[];
    raw_video_results?: any[];
    selected_videos?: any[];
    video_count?: number;
  };
}
```

#### Fix 1.3: Include Research Query in Status Response
**File**: `backend/src/controllers/research.controller.ts`

```typescript
async function buildResearchJobStatusResponse(
  jobId: string,
  job: any
): Promise<ResearchProgress> {
  // ... existing code ...
  
  // ✅ ADD: Include research query from job object
  if (job.research_data?.research_query) {
    currentProgress.research_query = job.research_data.research_query;
  }
  
  // ... rest of function ...
}
```

---

### Priority 2: Race Condition Prevention

#### Fix 2.1: Frontend Request Deduplication
**File**: `frontend/src/hooks/useResearchStream.ts` (or new hook)

```typescript
// Track in-flight requests
const inFlightRequestsRef = useRef<Set<string>>(new Set());

const getRequestFingerprint = (request: ResearchRequest): string => {
  return JSON.stringify({
    research_query: request.research_query.trim().toLowerCase(),
    language: request.language,
  });
};

const startJob = useCallback(async (payload: ResearchRequest) => {
  const fingerprint = getRequestFingerprint(payload);
  
  // ✅ ADD: Check if already in-flight
  if (inFlightRequestsRef.current.has(fingerprint)) {
    toast.warning('This research is already being processed');
    return;
  }
  
  // ✅ ADD: Add to in-flight set
  inFlightRequestsRef.current.add(fingerprint);
  
  try {
    const result = await startResearchJob(payload);
    
    if (result.data?.job_id) {
      // Connect to SSE
      await connect(result.data.job_id);
    }
  } finally {
    // ✅ ADD: Remove from in-flight set after delay
    setTimeout(() => {
      inFlightRequestsRef.current.delete(fingerprint);
    }, 5000); // 5 second window
  }
}, []);
```

#### Fix 2.2: Backend Request Deduplication
**File**: `backend/src/controllers/research.controller.ts`

```typescript
// ✅ ADD: In-memory cache for recent jobs (at top of file)
const recentResearchJobsCache = new Map<string, {
  jobId: string;
  timestamp: number;
}>();

const DEDUPLICATION_WINDOW_MS = 5000; // 5 seconds

export async function createResearchJob(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // ... validation code ...
  
  const request = validation.request!;
  const userId = req.user?.uid || req.user?.id || null;
  
  // ✅ ADD: Generate fingerprint
  const fingerprint = JSON.stringify({
    userId,
    research_query: request.research_query.trim().toLowerCase(),
    language: request.language,
  });
  
  // ✅ ADD: Check for duplicate
  const recentJob = recentResearchJobsCache.get(fingerprint);
  if (recentJob) {
    const elapsed = Date.now() - recentJob.timestamp;
    if (elapsed < DEDUPLICATION_WINDOW_MS) {
      logger.warn('Duplicate research job creation detected', {
        userId,
        existingJobId: recentJob.jobId,
        elapsedMs: elapsed,
      });
      
      // Return existing job ID
      res.status(200).json({
        job_id: recentJob.jobId,
        message: 'Research job already in progress',
      });
      return;
    }
  }
  
  // ... create job code ...
  
  // ✅ ADD: Store in cache
  recentResearchJobsCache.set(fingerprint, {
    jobId,
    timestamp: Date.now(),
  });
  
  // ✅ ADD: Cleanup old entries
  if (recentResearchJobsCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of recentResearchJobsCache.entries()) {
      if (now - value.timestamp > DEDUPLICATION_WINDOW_MS * 10) {
        recentResearchJobsCache.delete(key);
      }
    }
  }
  
  // ... rest of function ...
}
```

#### Fix 2.3: Disable Submit Button During Request
**File**: `frontend/src/components/research/ResearchForm.tsx`

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (isSubmitting) return; // ✅ ADD: Prevent double submission
  
  setIsSubmitting(true); // ✅ ADD: Disable button
  
  try {
    await onSubmit();
  } finally {
    // ✅ ADD: Re-enable after delay (prevents rapid clicks)
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  }
};

// In JSX:
<Button 
  disabled={!canSubmit || isSubmitting} // ✅ ADD: isSubmitting
  onClick={handleSubmit}
>
  {isSubmitting ? 'Starting...' : 'Start Research'}
</Button>
```

---

### Priority 3: SSE Connection Management

#### Fix 3.1: Prevent Duplicate SSE Connections
**File**: `backend/src/services/job.service.ts`

```typescript
// ✅ ADD: Track active connections per job
const activeConnections = new Map<string, Set<SSEConnection>>();

export function addSSEConnection(jobId: string, connection: SSEConnection): void {
  if (!activeConnections.has(jobId)) {
    activeConnections.set(jobId, new Set());
  }
  
  const connections = activeConnections.get(jobId)!;
  
  // ✅ ADD: Check if connection already exists (same response object)
  for (const existing of connections) {
    if (existing.res === connection.res) {
      logger.warn(`Duplicate SSE connection attempt for job ${jobId}`);
      return; // Don't add duplicate
    }
  }
  
  connections.add(connection);
  logger.debug(`Added SSE connection for job ${jobId}`, {
    totalConnections: connections.size,
  });
}
```

#### Fix 3.2: Frontend Connection Check
**File**: `frontend/src/hooks/useResearchStream.ts`

```typescript
const eventSourceRef = useRef<EventSource | null>(null);

const connect = useCallback((jobId: string) => {
  // ✅ ADD: Check if already connected
  if (eventSourceRef.current && 
      eventSourceRef.current.readyState !== EventSource.CLOSED) {
    logger.warn(`Already connected to job ${jobId}, skipping`);
    return Promise.resolve();
  }
  
  // ... existing connection logic ...
}, []);
```

---

## 5. Testing Checklist

### Consistency Tests
- [ ] Frontend types match backend API responses exactly
- [ ] SSE and polling return identical data structures
- [ ] Research query available in all status responses
- [ ] All intermediate data fields present in types

### Race Condition Tests
- [ ] Double-click submit button → only 1 job created
- [ ] Rapid form submission → only 1 job created
- [ ] Network retry → doesn't create duplicate job
- [ ] React Strict Mode → no duplicate connections
- [ ] Page refresh during processing → reconnects correctly

### Data Syncing Tests
- [ ] SSE update → polling shows same data
- [ ] Job object update → SSE broadcast succeeds
- [ ] Database save failure → job marked as error
- [ ] Connection drop → reconnection gets latest state

---

## 6. Implementation Priority

### Week 1: Critical Fixes
1. ✅ Fix 1.1: Update frontend types
2. ✅ Fix 1.2: Store research_query in job object
3. ✅ Fix 1.3: Include research_query in status response
4. ✅ Fix 2.3: Disable submit button

### Week 2: Race Condition Prevention
1. ✅ Fix 2.1: Frontend request deduplication
2. ✅ Fix 2.2: Backend request deduplication
3. ✅ Fix 3.2: Frontend connection check

### Week 3: SSE Management
1. ✅ Fix 3.1: Backend connection deduplication
2. ✅ Testing and validation

---

## 7. Documentation Updates Required

### Backend PRD Updates
- [ ] Document request deduplication mechanism
- [ ] Document SSE connection management
- [ ] Add research_query to job object storage
- [ ] Add race condition prevention section

### Frontend PRD Updates
- [ ] Update ResearchProgress interface with all fields
- [ ] Document request deduplication in useResearchStream
- [ ] Document button disable behavior
- [ ] Add race condition prevention section

### Implementation Plan Updates
- [ ] Add tasks for race condition fixes
- [ ] Add tasks for type consistency fixes
- [ ] Add testing tasks for race conditions

---

## 8. Lessons Learned from Summary Feature

### What Worked Well
- ✅ Task slot reservation prevents too many concurrent tasks
- ✅ SSE reconnection logic handles network issues
- ✅ Job object storage for intermediate data

### What Needs Improvement
- ❌ No duplicate request prevention
- ❌ No button disable during submission
- ❌ Multiple SSE connections for same job possible
- ❌ No request fingerprinting

### Applied to Research Feature
- ✅ Implement all improvements from summary feature
- ✅ Add comprehensive race condition prevention
- ✅ Ensure type consistency from start
- ✅ Document all prevention mechanisms

---

## Conclusion

The research feature has good foundation but needs:
1. **Type consistency** between backend and frontend
2. **Race condition prevention** mechanisms
3. **Request deduplication** at both layers
4. **SSE connection management** improvements

Implementing these fixes will prevent the data syncing problems experienced in the summary feature.
