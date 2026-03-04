# Implementation Checklist - Consistency & Race Condition Fixes

**Date**: 2026-01-22  
**Purpose**: Quick reference checklist for implementing consistency and race condition fixes

---

## ✅ Pre-Implementation Review

- [ ] Read `CONSISTENCY_AND_RACE_CONDITION_ANALYSIS.md` completely
- [ ] Understand race condition issues from summary feature
- [ ] Review backend and frontend PRDs for consistency
- [ ] Review implementation plan with race condition tasks

---

## Backend Fixes

### Type Consistency
- [ ] Update `JobInfo.research_data` to include `research_query?: string`
- [ ] Store `research_query` in job object when job created
- [ ] Include `research_query` in `buildResearchJobStatusResponse()`

### Race Condition Prevention
- [ ] Implement request deduplication cache (5-second window)
- [ ] Add request fingerprinting (userId + research_query + language)
- [ ] Return existing job_id if duplicate detected
- [ ] Implement SSE connection deduplication
- [ ] Track active connections per job

### Code Locations
- `backend/src/controllers/research.controller.ts` - Request deduplication
- `backend/src/services/job.service.ts` - SSE connection management
- `backend/src/types/summary.types.ts` - Type updates

---

## Frontend Fixes

### Type Consistency
- [ ] Update `ResearchProgress` interface with all fields:
  - [ ] `raw_video_results?: Array<...>`
  - [ ] `video_count?: number`
  - [ ] `research_query?: string`
- [ ] Ensure field names match backend (snake_case)
- [ ] Export types from `types/index.ts`

### Race Condition Prevention
- [ ] Implement request fingerprinting in `useResearchStream`
- [ ] Add in-flight request tracking
- [ ] Disable submit button during submission
- [ ] Add connection state check before creating SSE connection
- [ ] Implement proper cleanup on unmount

### Code Locations
- `frontend/src/types/research.ts` - Type definitions
- `frontend/src/hooks/useResearchStream.ts` - Request deduplication, connection management
- `frontend/src/components/research/ResearchForm.tsx` - Button disable

---

## Testing Checklist

### Consistency Tests
- [ ] Frontend types match backend API exactly
- [ ] All fields present in TypeScript interfaces
- [ ] SSE and polling return same data structure
- [ ] Research query available in all status responses

### Race Condition Tests
- [ ] Double-click submit → only 1 job created
- [ ] Rapid form submission → only 1 job created
- [ ] Network retry → doesn't create duplicate
- [ ] React Strict Mode → no duplicate connections
- [ ] Page refresh → reconnects correctly

### Data Syncing Tests
- [ ] SSE update → polling shows same data
- [ ] Job object update → SSE broadcast succeeds
- [ ] Connection drop → reconnection gets latest state
- [ ] Database save failure → job marked as error

---

## Documentation Updates

### Backend PRD
- [x] Added race condition prevention section
- [x] Added research_query storage instructions
- [x] Added request deduplication documentation

### Frontend PRD
- [x] Updated ResearchProgress interface
- [x] Added race condition prevention section
- [x] Added button disable documentation

### Implementation Plan
- [x] Added race condition tasks to Phase 2
- [x] Updated time estimates
- [x] Added testing requirements

---

## Priority Order

1. **Critical** (Week 1):
   - Type consistency fixes
   - Research query storage
   - Button disable

2. **High** (Week 2):
   - Request deduplication (frontend + backend)
   - Connection state check

3. **Medium** (Week 3):
   - SSE connection deduplication
   - Comprehensive testing

---

## Quick Reference: Code Snippets

### Backend: Store Research Query
```typescript
// In createResearchJob, after createJob()
updateJobStatus(jobId, 'pending' as JobStatus, {
  research_data: {
    research_query: request.research_query,
  },
});
```

### Backend: Request Deduplication
```typescript
const fingerprint = JSON.stringify({
  userId,
  research_query: request.research_query.trim().toLowerCase(),
  language: request.language,
});
```

### Frontend: Request Deduplication
```typescript
const inFlightRequestsRef = useRef<Set<string>>(new Set());
const fingerprint = getRequestFingerprint(payload);
if (inFlightRequestsRef.current.has(fingerprint)) {
  return; // Already in-flight
}
```

### Frontend: Button Disable
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
<Button disabled={!canSubmit || isSubmitting}>
```

---

## Success Criteria

✅ All type definitions match between backend and frontend  
✅ No duplicate jobs created from rapid clicks  
✅ No duplicate SSE connections  
✅ Research query available during processing  
✅ All intermediate data fields present in types  
✅ Comprehensive race condition tests pass  
