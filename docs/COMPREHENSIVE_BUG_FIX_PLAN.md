# Comprehensive Bug Fix Plan - Research Service

**Date**: 2026-01-23  
**Status**: Implementation Complete (Verified 2026-01-26)

---

## Executive Summary

This document outlines a systematic plan to fix all identified bugs in the research service, including:
1. React Hooks violations (critical)
2. Duplicate React keys (high priority)
3. Race condition prevention (high priority)
4. Research results not appearing in history (high priority)
5. Research summary parsing/display issues (medium priority)

---

## Bug Summary

### Bug #1: Duplicate React Keys in `ResearchProgressSidebar` ⚠️ HIGH PRIORITY
- **Location**: `frontend/src/components/research/ResearchProgressSidebar.tsx:218`
- **Error**: "Encountered two children with the same key, `U5XS7_FqL9k`"
- **Root Cause**: Same `video_id` appears multiple times in `rawVideoResults` array, causing duplicate keys when using `video.video_id` as the key
- **Impact**: React reconciliation issues, incorrect component updates, potential UI bugs

### Bug #2: Hook Called Inside `useMemo` in `ResearchResultCard` 🔴 CRITICAL
- **Location**: `frontend/src/components/research/ResearchResultCard.tsx:76`
- **Error**: "Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks."
- **Root Cause**: `useSafeFormatDate` (a React hook) is being called inside `useMemo`. The `useSafeFormatDate` hook uses `useTranslation()` internally, violating React's Rules of Hooks
- **Impact**: Violates fundamental React rules, causes inconsistent hook order, potential crashes

### Bug #3: Changing Hook Order in `ResearchResultCard` 🔴 CRITICAL
- **Location**: `frontend/src/components/research/ResearchResultCard.tsx`
- **Error**: "React has detected a change in the order of Hooks called by ResearchResultCard"
- **Root Cause**: Direct consequence of Bug #2. Conditional hook calls inside `useMemo` cause hook order to change between renders
- **Impact**: React loses track of hook state, leading to incorrect behavior and potential crashes

### Bug #4: Hook Count Mismatch in `AppLayoutWrapper` ⚠️ MEDIUM PRIORITY
- **Location**: `frontend/src/app/layout.tsx:51` (via `AppLayoutWrapper`)
- **Error**: "Rendered more hooks than during the previous render"
- **Root Cause**: Likely cascading effect from `ResearchResultCard` issues, OR independent conditional hook calls in `AppLayoutWrapper`
- **Impact**: Component tree instability, potential crashes

### Bug #5: Potential Race Conditions in Research Flow ⚠️ HIGH PRIORITY
- **Location**: Multiple locations in research flow
- **Issues**:
  - No duplicate request prevention (user can submit same query multiple times)
  - SSE connection deduplication may not be fully effective
  - State updates from multiple sources can conflict
  - Rapid state changes during streaming can cause race conditions
- **Impact**: Duplicate jobs created, inconsistent UI state, data loss

### Bug #6: Research Results Not Appearing in History 🔴 CRITICAL
- **Location**: `backend/src/controllers/history.controller.ts` and `frontend/src/hooks/useHistory.ts`
- **Root Cause**: 
  - History API (`GET /api/history`) only queries `summaries` collection
  - Research results are stored in separate `researches` collection
  - No endpoint or logic to fetch research history
  - Frontend history page only displays summaries, not research results
- **Impact**: Users cannot see their past research results, major UX issue

### Bug #7: Research Summary Parsing/Display Issues ⚠️ MEDIUM PRIORITY
- **Location**: `frontend/src/components/research/ResearchResultCard.tsx` and `frontend/src/components/dashboard/MarkdownStreamer.tsx`
- **Potential Issues**:
  - Summary text may contain malformed markdown
  - Streaming chunks may not be properly accumulated
  - Final summary text may not replace streamed text correctly
  - Markdown parsing may fail on certain formats
- **Impact**: Incorrect or incomplete display of research summaries

---

## Systematic Fix Plan

### Phase 1: Fix React Hooks Violations (CRITICAL - Highest Priority)

#### Step 1.1: Fix `ResearchResultCard` Hook Violations
**File**: `frontend/src/components/research/ResearchResultCard.tsx`

**Current Code (lines 70-80)**:
```typescript
const formattedDate = React.useMemo(() => {
  if (research?.created_at) {
    const date = typeof research.created_at === 'string' 
      ? new Date(research.created_at) 
      : research.created_at;
    if (isValidDate(date)) {
      return useSafeFormatDate(date); // ❌ HOOK CALLED INSIDE useMemo
    }
  }
  return null;
}, [research?.created_at]);
```

**Fix**:
1. Move `useSafeFormatDate` call to top level of component (after other hooks)
2. Parse and validate date at top level
3. Use `useMemo` only for memoizing the formatted result, not for calling hooks
4. Ensure hook is called unconditionally on every render

**New Code**:
```typescript
// Call hook at top level (unconditionally)
const { t } = useTranslation('research');
const toast = useToast();
const [copied, setCopied] = React.useState(false);

// Parse date at top level
const dateToFormat = React.useMemo(() => {
  if (research?.created_at) {
    const date = typeof research.created_at === 'string' 
      ? new Date(research.created_at) 
      : research.created_at;
    return isValidDate(date) ? date : null;
  }
  return null;
}, [research?.created_at]);

// Call hook at top level with parsed date
const formattedDate = useSafeFormatDate(
  dateToFormat,
  'PPp',
  null // Return null if date is invalid
);
```

**Expected Outcome**: Bugs #2 and #3 resolved

---

#### Step 1.2: Verify `AppLayoutWrapper` Hook Consistency
**File**: `frontend/src/components/AppLayoutWrapper.tsx`

**Action**:
1. Review all hooks in `AppLayoutWrapper`
2. Ensure no conditional hook calls
3. Ensure early returns don't skip hooks
4. If issue persists after fixing `ResearchResultCard`, investigate further

**Expected Outcome**: Bug #4 resolved (either via cascade fix or direct fix)

---

### Phase 2: Fix Duplicate Keys in `ResearchProgressSidebar` (HIGH PRIORITY)

#### Step 2.1: Ensure Unique Keys for Video Particles
**File**: `frontend/src/components/research/ResearchProgressSidebar.tsx`

**Current Code (line 218)**:
```typescript
{!showVideoSkeleton && showVideoParticles && visibleVideos.map((video, idx) => {
  const isSelected = selectedVideos.some(v => v.video_id === video.video_id);
  return (
    <VideoParticle
      key={video.video_id} // ❌ DUPLICATE IF SAME video_id APPEARS MULTIPLE TIMES
      video={video}
      index={idx}
      isSelected={isSelected}
      phase={status}
    />
  );
})}
```

**Fix Options**:

**Option A: Composite Key (Recommended)**
```typescript
key={`${video.video_id}-${idx}`}
```
- Pros: Simple, handles duplicates
- Cons: Key changes if array order changes (acceptable for this use case)

**Option B: Deduplicate Array Before Mapping**
```typescript
// Deduplicate by video_id before mapping
const uniqueVideos = visibleVideos.reduce((acc, video) => {
  if (!acc.find(v => v.video_id === video.video_id)) {
    acc.push(video);
  }
  return acc;
}, [] as typeof visibleVideos);

{!showVideoSkeleton && showVideoParticles && uniqueVideos.map((video, idx) => {
  // ... rest of code
})}
```
- Pros: Prevents duplicates entirely
- Cons: May hide legitimate duplicate videos from different sources

**Option C: Generate Stable Unique ID**
```typescript
// Use combination of video_id and index for stable unique key
const getVideoKey = (video: typeof visibleVideos[0], idx: number) => {
  // If video_id is unique, use it; otherwise add index
  const firstOccurrence = visibleVideos.findIndex(v => v.video_id === video.video_id);
  return firstOccurrence === idx ? video.video_id : `${video.video_id}-${idx}`;
};

key={getVideoKey(video, idx)}
```
- Pros: Most robust, handles all cases
- Cons: More complex

**Recommended**: Use **Option A** (composite key) for simplicity and immediate fix.

**Expected Outcome**: Bug #1 resolved

---

### Phase 3: Fix Race Condition Issues (HIGH PRIORITY)

#### Step 3.1: Enhance Request Deduplication
**File**: `frontend/src/hooks/useResearchStream.ts`

**Current State**: 
- ✅ Request fingerprinting exists (line 655)
- ✅ In-flight request tracking exists (line 657)
- ⚠️ May need enhancement for edge cases

**Enhancements Needed**:
1. **Extend deduplication window**: Ensure fingerprint TTL is sufficient (currently uses `deduplicationConfig.fingerprintTtl`)
2. **Add visual feedback**: Disable submit button immediately on click
3. **Handle rapid re-submissions**: Add debouncing if needed
4. **Log deduplication events**: For debugging

**Action Items**:
1. Verify `deduplicationConfig.fingerprintTtl` is set appropriately (should be at least 5 seconds)
2. Ensure submit button is disabled in `ResearchForm` component during submission
3. Add console logging for deduplication events (in development mode)

---

#### Step 3.2: Enhance SSE Connection Deduplication
**File**: `frontend/src/hooks/useResearchStream.ts`

**Current State**:
- ✅ Connection state checks exist (lines 483-513)
- ✅ Prevents duplicate connections to same job
- ⚠️ May need additional safeguards

**Enhancements Needed**:
1. **Verify connection cleanup**: Ensure old connections are properly closed
2. **Add connection state logging**: For debugging duplicate connection attempts
3. **Handle React Strict Mode**: Ensure double-mounting doesn't create duplicates

**Action Items**:
1. Review connection cleanup logic (lines 224-241)
2. Add defensive checks for React Strict Mode double-mounting
3. Add logging for connection lifecycle events

---

#### Step 3.3: Fix State Update Race Conditions
**File**: `frontend/src/hooks/useResearchStream.ts`

**Potential Issues**:
- Rapid SSE events may cause state updates to conflict
- Chunk accumulation may have race conditions
- Completion state may be set incorrectly if events arrive out of order

**Action Items**:
1. Review `handleSSEEvent` function (line 309) for race conditions
2. Ensure state updates are atomic
3. Add guards against out-of-order events
4. Verify chunk accumulation logic (lines 273-303) handles rapid updates correctly

---

### Phase 4: Fix Research History Integration (CRITICAL)

#### Step 4.1: Update Backend History API to Include Research Results
**File**: `backend/src/controllers/history.controller.ts`

**Current State**:
- Only queries `summaries` collection
- Research results stored in separate `researches` collection
- No logic to combine both types

**Fix Required**:
1. **Query both collections**: Fetch summaries AND research results
2. **Combine results**: Merge both types into unified response
3. **Sort by date**: Ensure chronological order across both types
4. **Add type discriminator**: Include field to distinguish summaries from research

**Implementation**:
```typescript
// In getHistory function
const [summariesResult, researchesResult] = await Promise.all([
  getSummariesByUserId(userId, page, limit),
  getUserResearches(userId, limit) // Need to implement pagination
]);

// Combine and sort by created_at
const combinedItems = [
  ...summariesResult.summaries.map(s => ({ ...s, type: 'summary' })),
  ...researchesResult.map(r => ({ ...r, type: 'research' }))
].sort((a, b) => {
  const dateA = new Date(a.created_at).getTime();
  const dateB = new Date(b.created_at).getTime();
  return dateB - dateA; // Newest first
});

// Format for response (unified format)
const formattedItems = combinedItems.map(item => {
  if (item.type === 'summary') {
    // Format as SummaryListItem
    return {
      _id: item.id,
      batch_title: item.batch_title,
      created_at: item.created_at,
      source_videos: item.source_videos.map(v => ({
        thumbnail: v.thumbnail,
        title: v.title,
      })),
      video_count: item.source_videos.length,
      type: 'summary',
    };
  } else {
    // Format research as similar structure
    return {
      _id: item.id,
      batch_title: item.research_query || 'Research',
      created_at: item.created_at,
      source_videos: item.selected_videos?.map(v => ({
        thumbnail: v.thumbnail,
        title: v.title,
      })) || [],
      video_count: item.selected_videos?.length || 0,
      type: 'research',
    };
  }
});
```

**Files to Modify**:
- `backend/src/controllers/history.controller.ts`
- `backend/src/models/Research.ts` (may need pagination support)

---

#### Step 4.2: Update Frontend History Types
**File**: `frontend/src/types/index.ts`

**Action**:
1. Add `type: 'summary' | 'research'` field to `SummaryListItem` interface
2. Update history response type to include research items
3. Ensure frontend can handle both types

---

#### Step 4.3: Update Frontend History Display
**File**: `frontend/src/app/history/page.tsx` and related components

**Action**:
1. Update `SummaryCard` or create `ResearchCard` component
2. Handle both summary and research types in display logic
3. Update detail view to show research-specific fields
4. Ensure routing works for both types

---

#### Step 4.4: Create Research Detail Endpoint (if needed)
**File**: `backend/src/controllers/research.controller.ts` or new file

**Action**:
1. Create `GET /api/research/:id` endpoint (similar to `GET /api/summary/:id`)
2. Return full research document
3. Verify ownership
4. Format response consistently

---

### Phase 5: Fix Summary Parsing/Display Issues (MEDIUM PRIORITY)

#### Step 5.1: Verify Summary Text Accumulation
**File**: `frontend/src/hooks/useResearchStream.ts`

**Action**:
1. Review chunk accumulation logic (lines 273-303)
2. Verify `final_summary_text` replaces streamed text correctly (lines 424-428)
3. Ensure no duplicate content
4. Test with various summary lengths

---

#### Step 5.2: Verify Markdown Parsing
**File**: `frontend/src/components/dashboard/MarkdownStreamer.tsx`

**Action**:
1. Test with various markdown formats
2. Ensure malformed markdown doesn't break rendering
3. Verify streaming markdown renders correctly
4. Test edge cases (empty content, very long content, special characters)

---

#### Step 5.3: Add Error Handling for Parsing Failures
**File**: `frontend/src/components/research/ResearchResultCard.tsx`

**Action**:
1. Add try-catch around markdown rendering
2. Fallback to plain text if markdown parsing fails
3. Log parsing errors for debugging
4. Show user-friendly error message if rendering fails

---

## Implementation Priority

### Critical (Fix Immediately)
1. ✅ **Phase 1**: Fix React Hooks violations (Bugs #2, #3, #4)
   - Prevents crashes and unstable behavior
   - Blocks other fixes if not addressed first

### High Priority (Fix Soon)
2. ✅ **Phase 2**: Fix duplicate keys (Bug #1)
   - Prevents UI bugs and incorrect rendering

3. ✅ **Phase 4**: Fix research history integration (Bug #6)
   - Major UX issue - users can't see past research
   - Requires backend and frontend changes

4. ✅ **Phase 3**: Fix race conditions (Bug #5)
   - Prevents duplicate jobs and state inconsistencies
   - Enhances existing deduplication

### Medium Priority (Fix When Possible)
5. ✅ **Phase 5**: Fix summary parsing/display (Bug #7)
   - Improves display quality
   - May not be blocking issue

---

## Testing Checklist

### Phase 1 Testing
- [ ] Verify no React hooks warnings in console
- [ ] Test `ResearchResultCard` with various date formats
- [ ] Test `ResearchResultCard` with null/undefined dates
- [ ] Verify `AppLayoutWrapper` renders without errors

### Phase 2 Testing
- [ ] Test `ResearchProgressSidebar` with duplicate video IDs
- [ ] Verify all video particles render correctly
- [ ] Test with empty video arrays
- [ ] Test with single video

### Phase 3 Testing
- [ ] Test rapid form submissions (should be prevented)
- [ ] Test SSE reconnection scenarios
- [ ] Test with multiple browser tabs
- [ ] Verify no duplicate jobs created
- [ ] Test state consistency during streaming

### Phase 4 Testing
- [ ] Verify research results appear in history page
- [ ] Test pagination with mixed summary/research results
- [ ] Test research detail view
- [ ] Verify sorting by date works correctly
- [ ] Test with user who has both summaries and research

### Phase 5 Testing
- [ ] Test markdown rendering with various formats
- [ ] Test streaming markdown display
- [ ] Test with very long summaries
- [ ] Test with special characters
- [ ] Verify error handling for malformed markdown

---

## Files to Modify

### Frontend Files
1. `frontend/src/components/research/ResearchResultCard.tsx` (Phase 1)
2. `frontend/src/components/research/ResearchProgressSidebar.tsx` (Phase 2)
3. `frontend/src/components/AppLayoutWrapper.tsx` (Phase 1, if needed)
4. `frontend/src/hooks/useResearchStream.ts` (Phase 3)
5. `frontend/src/components/research/ResearchForm.tsx` (Phase 3 - button disable)
6. `frontend/src/types/index.ts` (Phase 4)
7. `frontend/src/app/history/page.tsx` (Phase 4)
8. `frontend/src/components/history/SummaryCard.tsx` (Phase 4)
9. `frontend/src/components/dashboard/MarkdownStreamer.tsx` (Phase 5)

### Backend Files
1. `backend/src/controllers/history.controller.ts` (Phase 4)
2. `backend/src/models/Research.ts` (Phase 4 - pagination support)
3. `backend/src/controllers/research.controller.ts` (Phase 4 - detail endpoint, if needed)

---

## Notes

1. **React Hooks Rules**: All hooks must be called at the top level of components, unconditionally. No hooks inside loops, conditions, or other hooks.

2. **React Keys**: Keys must be unique within a list. If data contains duplicates, use composite keys or deduplicate the data.

3. **Race Conditions**: Request deduplication and connection management are critical for preventing duplicate jobs and state inconsistencies.

4. **History Integration**: Research results must be included in history API response. This requires backend changes to query both collections and frontend changes to display both types.

5. **Summary Parsing**: Markdown parsing should be robust and handle edge cases gracefully.

---

## Success Criteria

- ✅ No React hooks warnings in console
- ✅ No duplicate key warnings
- ✅ Research results appear in history page
- ✅ No duplicate jobs created from rapid submissions
- ✅ Summary text displays correctly in all scenarios
- ✅ All tests pass
- ✅ No console errors during normal operation

---

## Implementation Verification (2026-01-26)

### Phase 1: React Hooks – DONE
- **1.1 ResearchResultCard**: `useSafeFormatDate` moved to top level; `dateToFormat` in `useMemo` (no hooks inside). Fix matches plan.
- **1.2 AppLayoutWrapper**: All hooks run before any early return; no conditional hooks.

### Phase 2: Duplicate Keys – DONE
- **2.1 ResearchProgressSidebar**: Uses composite key `` `${video.video_id}${videoKeySeparator}${idx}` `` with `researchParticleConfig.videoParticle.compositeKeySeparator` (e.g. `'-'`).

### Phase 3: Race Conditions – DONE
- **3.1 Request deduplication**: `inFlightRequestsRef`, `getRequestFingerprint`, `deduplicationConfig.fingerprintTtl` (min 5s), toast on duplicate, `logDeduplicationEvents` in dev.
- **3.2 SSE**: `isConnectingRef`, `currentJobIdRef`, connection cleanup; `logConnectionLifecycle` in dev.
- **3.3 State**: `handleSSEEvent` job_id guard; on `completed`, flush chunk batch before applying `final_summary_text`; `accumulateChunk` deduplication.
- **ResearchForm**: `isSubmitting`, `isButtonDisabled = !canSubmit || isSubmitting || disabled`; research page passes `disabled={stream.isStreaming || state !== "idle"}` and `canSubmit` excludes streaming.

### Phase 4: Research History – DONE
- **4.1 history.controller**: `Promise.all([getSummariesByUserId, getUserResearches])`, combined and sorted by `created_at`, `type: 'summary'|'research'`, pagination on merged list.
- **4.2 Types**: `SummaryListItem` has `type?: 'summary'|'research'`.
- **4.3 History UI**: `handleSummaryClick` uses `item.type` to call `getResearch` or `getSummary`; `SummaryDetailView` supports `research` and `isResearch`; **EnhancedSummaryCard** `handleExport` uses `getResearch` when `summary.type === 'research'` (fixed during verification).
- **4.4 GET /api/research/:id**: `getResearchById` in controller, `GET /api/research/:id` in routes, `getResearch` in `api.ts` via `apiEndpoints.researchDocument(id)`.
- **Research model**: `getUserResearches(userUid, limit)` used by history.

### Phase 5: Summary Parsing – DONE
- **5.1 useResearchStream**: Chunk accumulation with dedup and batching; on `completed`, flush batch then set `accumulatedTextRef` and `setStreamedText(final_summary_text)`.
- **5.2 MarkdownStreamer**: `MarkdownErrorBoundary`, `onError` prop, fallback to plain text.
- **5.3 ResearchResultCard**: `MarkdownStreamer` with `onError={() => toast.warning(markdownMessages.renderFallback)}`.

### Delete Research (Implemented 2026-01-26)
- **Backend**: `deleteResearch(id)` in `Research` model (Firestore + local cache); `deleteResearchById` in `research.controller` with ownership check; `DELETE /api/research/:id` in `research.routes`.
- **Frontend**: `deleteResearch(id)` in `api.ts` with history cache invalidation; `handleDelete(id, type?)` and `confirmBulkDelete` use type-aware `deleteResearch` or `deleteSummary`; `SummaryDetailView` `onDelete(id, type)` passes type so research items are deleted via `DELETE /api/research/:id`.

---

**End of Plan**
