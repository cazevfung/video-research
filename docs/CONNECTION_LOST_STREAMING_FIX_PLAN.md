# Connection Lost & No Real-Time Streaming - Fix Plan

**Date:** January 27, 2026  
**Status:** Planning Phase - Do Not Implement Yet

---

## Executive Summary

Two UX issues occurring during research sessions at the "generating comprehensive summary" phase (≈70% progress):

1. **False "Connection lost" error** - Shows "Connection lost. Please try again." with "Try reconnecting" button even though auto-reconnect is working and the summary completes successfully
2. **No real-time AI streaming** - Summary text appears all at once instead of streaming in real-time

Both issues stem from the same root cause: the research summary generation phase has a long silent period (60-120+ seconds) with minimal SSE activity.

---

## Root Cause Analysis

### Issue 1: False "Connection Lost" Error

**What happens:**
1. At ~70%, backend calls `generateResearchSummary()` which uses `callQwenMax(fullPrompt)` **without** `onChunk`
2. During the 60-120+ second AI call, the **only** SSE traffic is heartbeats every 30 seconds
3. The underlying HTTP/SSE connection can be closed/reset during this long silent period by:
   - Proxy/load balancer idle timeout
   - Network interruptions
   - Server connection cleanup
4. When connection drops, frontend SSE client's `onerror` fires → sets `isConnected = false`
5. Frontend shows "Connection lost. Please try again." with "Try reconnecting" button
6. Auto-reconnect kicks in, creates new SSE connection, receives `completed` event with full summary
7. Summary appears successfully, but poor UX from the error message

**Key insight:** The connection loss is real, but the UX messaging is poor because:
- It shows a failure state even though auto-reconnect is working
- "Try reconnecting" button appears even though reconnection is automatic
- User doesn't know the job is still processing successfully on the backend

### Issue 2: No Real-Time Streaming

**What happens:**
1. `generateResearchSummary()` calls `callQwenMax(fullPrompt)` **without** `onChunk` parameter
2. No chunks are sent during the 60-120 second generation period
3. Full summary text only appears in the `completed` event at the end
4. Frontend has all the streaming code ready (`accumulateChunk`, `streamedText`, etc.) but receives no chunks

**Comparison with Summary Service:**
- Summary service DOES pass `onChunk` to `callQwenMax`/`callQwenPlus`
- Each chunk triggers `broadcastJobProgress(jobId, { status: 'generating', chunk })`
- Frontend receives and displays chunks in real-time
- Better UX and perceived performance

### Issue 3: Unknown SSE Event Status (Minor)

**What happens:**
- When SSE connection first connects or reconnects, backend sends initial status: `processing` or `generating`
- Frontend's `handleSSEEvent` switch statement doesn't have cases for these statuses
- Falls through to `default` case and logs: `[useResearchStream] Unknown SSE event status: processing`
- Doesn't reset heartbeat timer for these events (though heartbeats handle this separately)

---

## Current Implementation State

### Frontend: `useResearchStream.ts` (Ready for streaming)
```typescript
case 'generating_summary':
  setStatus('generating_summary');
  setProgress(data.progress || 0);
  setMessage(data.message || null);
  setIsStreaming(true);
  
  // ✅ Already handles chunks!
  if (data.chunk !== undefined) {
    accumulateChunk(data.chunk);
  }
  
  resetHeartbeatTimer();
  break;
```

**Missing cases in switch:**
```typescript
case 'processing':
case 'generating':
  // No handler - falls through to default
```

### Backend: `research.service.ts` (No streaming)

**Line 345:**
```typescript
// ❌ No onChunk parameter - no streaming
const aiResult = await callQwenMax(fullPrompt);
```

**Compare to `summary.service.ts` (Lines 630-631):**
```typescript
// ✅ Has onChunk - streams in real-time
aiResult = usePremiumModel
  ? await callQwenMax(combinedPrompt, onChunk)
  : await callQwenPlus(combinedPrompt, onChunk);
```

### Connection Status UI

**File:** `frontend/src/components/dashboard/ConnectionStatus.tsx`

**Lines 94-110:**
```typescript
// Shows "Connection lost" when !isConnected
// Shows "Try reconnecting" button even when auto-reconnect is active
!isConnected ? (
  <>
    <WifiOff className={...} />
    <div className="flex-1">
      <p>{errorMessages.connectionLost}</p>
      {onManualReconnect && (
        <button onClick={onManualReconnect}>
          Try reconnecting
        </button>
      )}
    </div>
  </>
) : ...
```

**Current behavior:**
- `isConnected = false` → Shows "Connection lost. Please try again." + "Try reconnecting"
- `isReconnecting = true` → Shows "Connection lost. Reconnecting..."
- Problem: Brief moment where `!isConnected && !isReconnecting` before reconnect starts

---

## Proposed Solution

### Phase A: Fix "Connection Lost" UX (Priority 1)

#### A1. Handle Unknown SSE Status Events
**File:** `frontend/src/hooks/useResearchStream.ts`

**Location:** Lines 358-491 (switch statement in `handleSSEEvent`)

**Change:**
```typescript
case 'processing':
case 'generating':
  // These statuses are sent when connection first opens or reconnects
  // Treat as active/in-progress state
  setStatus(data.status);
  setProgress(data.progress || progress); // Keep existing progress if not provided
  setMessage(data.message || message);
  resetHeartbeatTimer();
  break;
```

**Impact:**
- Stops "Unknown SSE event status" warnings
- Ensures heartbeat timer is reset on reconnection
- Properly handles initial connection status

#### A2. Improve Connection Status Messaging
**File:** `frontend/src/config/messages.ts`

**Change:**
```typescript
// Current:
connectionLost: "Connection lost. Please try again.",
connectionLostReconnecting: "Connection lost. Reconnecting...",

// Proposed:
connectionLost: "Connection interrupted. Reconnecting...",
connectionLostReconnecting: "Connection interrupted. Reconnecting...",
connectionLostPermanent: "Connection lost. Please try again.",
```

**File:** `frontend/src/components/dashboard/ConnectionStatus.tsx`

**Logic change (Lines 94-110):**
```typescript
// Use connectionLostPermanent only when:
// - Not reconnecting AND
// - Max retries exceeded
const isPermanentFailure = !isConnected && !isReconnecting && reconnectAttempts >= maxRetries;

{isPermanentFailure ? (
  // Show "Connection lost. Please try again." + manual reconnect button
) : !isConnected ? (
  // Show "Connection interrupted. Reconnecting..." without button
) : (
  // Connected - show success
)}
```

**Impact:**
- Softer messaging during temporary disconnections
- Only shows "Please try again" when auto-reconnect has failed
- Reduces user anxiety during normal reconnection

#### A3. Verify Backend Heartbeat Configuration
**File:** `backend/config.yaml`

**Current:**
```yaml
sse_heartbeat_interval_seconds: 30
```

**Verification needed:**
- Is 30s sufficient for common proxy timeouts?
- Most load balancers have 60-120s idle timeout
- Consider lowering to 15-20s for safety margin

**Action:** Document proxy timeout requirements, adjust if needed

#### A4. Add Connection State Logging
**File:** `frontend/src/hooks/useResearchStream.ts`

**Add debug logs:**
```typescript
// In onerror handler (Line 607)
console.debug('[useResearchStream] Connection lost during phase', {
  status,
  progress,
  retryCount,
  willReconnect: retryCount < maxRetries
});

// When reconnect succeeds (Line 585)
console.debug('[useResearchStream] Reconnection successful', {
  retryCount,
  timeElapsed: Date.now() - disconnectTime
});
```

**Impact:** Better debugging of connection issues in production

---

### Phase B: Enable Real-Time AI Streaming (Priority 2)

#### B1. Add Streaming to Research Summary Generation
**File:** `backend/src/services/research.service.ts`

**Function:** `generateResearchSummary` (Lines 320-372)

**Current signature:**
```typescript
async function generateResearchSummary(
  researchQuery: string,
  transcripts: any[],
  selectedVideos: any[],
  language: string
): Promise<string>
```

**Proposed signature:**
```typescript
async function generateResearchSummary(
  researchQuery: string,
  transcripts: any[],
  selectedVideos: any[],
  language: string,
  onChunk?: (chunk: string) => void  // Add optional streaming callback
): Promise<string>
```

**Implementation (Line 345):**
```typescript
// Current:
const aiResult = await callQwenMax(fullPrompt);

// Proposed:
const aiResult = await callQwenMax(fullPrompt, onChunk);
```

**Impact:**
- Enables streaming when `onChunk` is provided
- Maintains backward compatibility (onChunk is optional)
- Follows same pattern as summary.service.ts

#### B2. Broadcast Chunks During Generation
**File:** `backend/src/services/research.service.ts`

**Function:** `processResearch` (around Line 377)

**Location:** Before calling `generateResearchSummary`

**Add:**
```typescript
// Track progress for streaming
const summaryStartProgress = progressPercentages.fetched_transcripts;
const summaryEndProgress = 100;
let accumulatedChunkLength = 0;

// Streaming callback
const onChunk = (chunk: string) => {
  accumulatedChunkLength += chunk.length;
  
  // Interpolate progress from 70% to 95% based on chunk accumulation
  // Reserve 95-100% for final processing
  const estimatedProgress = Math.min(
    summaryStartProgress + ((summaryEndProgress - summaryStartProgress - 5) * 
      Math.min(accumulatedChunkLength / 5000, 1)), // Estimate ~5000 chars total
    95
  );
  
  broadcastJobProgress(jobId, {
    status: 'generating_summary',
    progress: Math.round(estimatedProgress),
    message: 'Generating research summary...',
    chunk,
    research_query: request.research_query,
  });
};

// Call with streaming
const finalSummary = await generateResearchSummary(
  request.research_query,
  successfulTranscripts,
  selectedVideos,
  request.language,
  onChunk  // Pass the callback
);
```

**Impact:**
- Real-time streaming during summary generation
- Better perceived performance
- Connection stays active with chunk data (reduces connection loss risk)

#### B3. Add Streaming Fallback
**File:** `backend/src/services/research.service.ts`

**Pattern:** Follow summary.service.ts fallback pattern (Lines 663-690)

**Implementation:**
```typescript
let aiResult: AIResult | undefined;
let streamingFailed = false;

try {
  // Try streaming first
  aiResult = await callQwenMax(fullPrompt, onChunk);
  
  if ('error' in aiResult && aiResult.error_code === 'STREAM_PARSE_ERROR') {
    streamingFailed = true;
  }
} catch (error) {
  streamingFailed = true;
}

// Fallback to non-streaming
if (streamingFailed) {
  logger.warn('[Research] Streaming failed, falling back to non-streaming mode');
  
  broadcastJobProgress(jobId, {
    status: 'generating_summary',
    progress: progressPercentages.generating_summary,
    message: 'Generating summary (streaming unavailable)...',
  });
  
  aiResult = await callQwenMax(fullPrompt);  // No onChunk
}
```

**Impact:**
- Graceful degradation when streaming fails
- Maintains reliability
- Informs user of fallback

#### B4. Frontend Verification
**File:** `frontend/src/hooks/useResearchStream.ts`

**Status:** ✅ Already implemented (Lines 381-393)

**File:** `frontend/src/components/research/ResearchResultCard.tsx`

**Verification needed:**
- Confirm `streamedText` is displayed with smooth rendering
- Ensure no flicker/full-replace when chunks arrive
- Test with MarkdownStreamer component

---

## Implementation Checklist

### Phase A: Connection UX (Estimated: 2-3 hours)

- [ ] **A1:** Add `processing` and `generating` cases to `handleSSEEvent` switch
- [ ] **A2:** Update connection lost messages in messages.ts
- [ ] **A3:** Update ConnectionStatus.tsx logic for better message display
- [ ] **A4:** Verify/adjust heartbeat interval in config.yaml
- [ ] **A5:** Add connection state debug logging
- [ ] **Test:** Simulate connection drop during summary generation
- [ ] **Test:** Verify "Connection interrupted" message appears
- [ ] **Test:** Verify successful reconnection shows "Connection restored"
- [ ] **Test:** Verify "Try reconnecting" only shows after max retries

### Phase B: Real-Time Streaming (Estimated: 4-5 hours)

- [ ] **B1:** Add optional `onChunk` parameter to `generateResearchSummary`
- [ ] **B2:** Pass `onChunk` to `callQwenMax` in `generateResearchSummary`
- [ ] **B3:** Create streaming callback in `processResearch`
- [ ] **B4:** Implement progress interpolation for chunks
- [ ] **B5:** Add streaming fallback logic
- [ ] **B6:** Add logging for streaming success/failure
- [ ] **Test:** Verify chunks arrive in real-time on frontend
- [ ] **Test:** Verify `streamedText` updates smoothly in UI
- [ ] **Test:** Test streaming fallback when AI streaming fails
- [ ] **Test:** Verify final summary matches streamed content
- [ ] **Test:** Check for duplicate content or chunk ordering issues

---

## Testing Strategy

### Manual Testing

1. **Connection Loss Scenario:**
   - Start research job
   - Wait for 70% (generating summary)
   - Kill network connection briefly
   - Observe: Should show "Connection interrupted. Reconnecting..."
   - Restore network
   - Observe: Should reconnect and complete successfully

2. **Streaming Verification:**
   - Start research job
   - Watch summary generation phase
   - Observe: Text should appear word-by-word or sentence-by-sentence
   - Final text should match what was streamed

3. **Fallback Testing:**
   - Temporarily break streaming in AI service
   - Start research job
   - Observe: Should fall back to non-streaming
   - Summary should still complete

### Console Log Verification

**During connection loss:**
```
[useResearchStream] Connection lost during phase: { status: 'generating_summary', progress: 70 }
[useResearchStream] Reconnecting in 2000ms (attempt 1/5)...
[useResearchStream] Reconnection successful: { retryCount: 1 }
```

**During streaming:**
```
[Research] Starting streaming AI generation
[Summary Service] Streaming chunk 1: { chunkLength: 42, accumulatedLength: 42 }
[Summary Service] Streaming chunk 2: { chunkLength: 38, accumulatedLength: 80 }
...
```

---

## Risk Assessment

### Low Risk
- **Phase A:** UX improvements are low-risk changes to UI messaging and event handling
- Frontend streaming code already exists and is tested

### Medium Risk
- **Phase B:** Backend streaming changes follow established pattern from summary.service
- Fallback ensures reliability even if streaming fails

### Mitigation
- Implement Phase A first (quick win, low risk)
- Thoroughly test Phase B in development before production
- Monitor logs for streaming failures in production
- Keep fallback path for non-streaming mode

---

## Expected Outcomes

### After Phase A (Connection UX)
- ✅ No more "Unknown SSE event status" warnings
- ✅ More accurate connection status messaging
- ✅ Less user anxiety during temporary connection drops
- ✅ Clear distinction between auto-reconnect and permanent failure

### After Phase B (Real-Time Streaming)
- ✅ Research summary appears in real-time (word-by-word or sentence-by-sentence)
- ✅ Better perceived performance
- ✅ Reduced connection loss risk (active data flow keeps connection alive)
- ✅ Consistent UX with summary feature

---

## Related Documentation

- **Original Investigation:** `docs/CONNECTION_LOST_AND_STREAMING_UX_INVESTIGATION.md`
- **Summary Service Reference:** `backend/src/services/summary.service.ts` (Lines 600-690)
- **SSE Connection Handling:** `frontend/src/lib/authenticated-sse.ts`
- **Streaming Config:** `frontend/src/config/streaming.ts`
- **Job Service (Heartbeats):** `backend/src/services/job.service.ts`

---

## Notes

- This plan does **not** include implementation of the changes
- All file references are accurate as of January 27, 2026
- The investigation document (`CONNECTION_LOST_AND_STREAMING_UX_INVESTIGATION.md`) contains detailed technical analysis
- Summary service streaming implementation serves as a proven reference pattern
- Frontend is already fully prepared for chunk-based streaming
