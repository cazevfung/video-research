# Investigation: "Connection lost" at 70% and No Real-Time AI Streaming

## Summary

- **"Connection lost" at ~70% during "generating comprehensive summary"**: Caused by the SSE connection being closed or reset during a long silent period (60–120+ seconds) while the backend runs `generateResearchSummary` with **no SSE activity** except heartbeats. When the connection drops, the frontend correctly treats it as an error and shows "Connection lost"; reconnection then succeeds and the `completed` event arrives on the new connection, so the summary still appears. The UX is poor because the message suggests total failure and a manual "Try reconnecting" when auto-reconnect is already in progress or has recovered.
- **No real-time streaming of AI output**: The research backend does **not** stream summary chunks. It calls `callQwenMax(fullPrompt)` without `onChunk`, so the full text is only sent in the `completed` event. The frontend is built to consume `chunk` in `generating_summary` events and `streamedText`, but research never sends those chunks.

---

## 1. "Connection lost" at 70%

### 1.1 Where the message comes from

- **Component**: `frontend/src/components/dashboard/ConnectionStatus.tsx`
- **Condition**: Rendered when `stream.isStreaming`; shows "Connection lost. Please try again." and "Try reconnecting" when `!isConnected && !isReconnecting`.
- **`isConnected`** is set in `useResearchStream`:
  - `true`: on SSE `open` and on `status: 'connected'`
  - `false`: in `disconnect()` and in `eventSource.onerror`

So "Connection lost" appears when the SSE client’s `onerror` has run (or `disconnect()` has been called for a non-completion reason).

### 1.2 What triggers `onerror`

In `AuthenticatedSSE`:

- `handleError` invokes `onerror` when:
  - `connect()` fails (e.g. non-2xx, no body, auth error), or
  - `readStream()` catches an error from `reader.read()` (e.g. network/connection reset).

`handleError` is **not** called when the stream ends normally (`done: true` → `close()` only).

So the path that leads to "Connection lost" is: **`reader.read()` throws (e.g. connection closed/reset) → `handleError` → `onerror` → `useResearchStream` sets `isConnected = false`** and, when retries are used, `isReconnecting = true`.

### 1.3 Why it happens around 70% ("generating comprehensive summary")

In `research.service.ts`:

1. Right before summary generation, we send a single progress event:
   - `broadcastJobProgress(jobId, { status: 'generating_summary', progress: ~70, message: '...' })`
2. Then we run:
   - `finalSummary = await generateResearchSummary(...)`
   - which calls `callQwenMax(fullPrompt)` **without** `onChunk`.

So during the whole LLM call (often 60–120+ seconds) the backend:

- does **not** send any `generating_summary` events with `chunk`
- does **not** send any other progress events

The only ongoing traffic on the SSE connection are **heartbeats** from `job.service`’s `sendHeartbeats` every `sse_heartbeat_interval_seconds` (30s in `config.yaml`). Those use `status: 'heartbeat'` and are handled by the frontend to reset the heartbeat timer.

So:

- The frontend’s 60s heartbeat timeout is **not** the direct cause of "Connection lost" (it only logs; it does not set `isConnected = false` or call `onerror`).
- The likely cause is the **underlying HTTP/stream being closed or reset** during that long phase, for example:
  - proxy/load balancer idle timeout (if they treat the connection as idle despite heartbeats, or if heartbeats fail to be written)
  - server or client closing the connection (e.g. `res` error, client navigating away, etc.)
  - network blip

When that happens, `reader.read()` can throw → `handleError` → `onerror` → `isConnected = false` and, when `shouldRetry` is true, reconnection starts.

### 1.4 Why the summary still arrives

`useResearchStream`’s `onerror`:

- sets `isConnected = false`
- if `retryCount < maxRetries`: sets `isReconnecting = true` and schedules `connect(jobId, retryCount + 1)` with backoff.

A new `AuthenticatedSSE` is created and a new `GET /api/research/:job_id/status` with `Accept: text/event-stream` is made. The research controller:

- opens a new SSE connection and sends `buildResearchJobStatusResponse` as the first message (this can contain `status: 'processing'` or `'generating'` from `job.status`),
- registers it in `addSSEConnection`, so it receives:
  - heartbeats from `sendHeartbeats`
  - later, `broadcastJobProgress(jobId, completedProgress)` when `generateResearchSummary` finishes.

So the **new** connection receives `completed` with `final_summary_text`. The user keeps the same `job_id` and the summary appears even though the first connection was lost. The logic is correct; the problem is **messaging and when we show "Connection lost" vs "Reconnecting"**.

### 1.5 `status: 'processing'` in logs

Log: `[useResearchStream] Unknown SSE event status: processing`

- `buildResearchJobStatusResponse` does `status: job.status`. The in-memory job is updated with `updateJobStatus(jobId, 'processing', ...)` and `updateJobStatus(jobId, 'generating', ...)` in `research.service`. These statuses are **not** in the frontend’s `handleSSEEvent` switch.
- They are sent when:
  - a client first connects to the SSE endpoint, or
  - a client **reconnects** and gets the initial status.

So after a reconnection during "generating comprehensive summary", the initial payload can have `status: 'processing'` or `'generating'`. The frontend falls through to `default`, logs "Unknown SSE event status", and **does not** call `resetHeartbeatTimer()`. If we ever depended on that event to reset the heartbeat, we’d be wrong; in practice heartbeats use `status: 'heartbeat'`, so this is mainly a logging/consistency issue and a missed chance to map these to a known phase and reset the timer.

---

## 2. No real-time streaming of AI output

### 2.1 Backend

In `research.service.ts`:

```ts
finalSummary = await generateResearchSummary(
  request.research_query,
  successfulTranscripts,
  selectedVideos,
  request.language
);
```

`generateResearchSummary`:

```ts
const aiResult = await callQwenMax(fullPrompt);
return aiResult.content;
```

- `callQwenMax` in `ai.service` has the signature `(combinedPrompt, onChunk?)` and supports streaming when `onChunk` is provided.
- Research **never** passes `onChunk`, so the full answer is only available when `callQwenMax` resolves. No `broadcastJobProgress(..., { status: 'generating_summary', chunk })` is emitted during the LLM call.
- The only `generating_summary` broadcast is the one **before** `generateResearchSummary`, with no `chunk`. The next broadcast is `completed` with `data.final_summary_text`.

So the research pipeline is **non-streaming** by design today.

### 2.2 Frontend

- `useResearchStream`’s `handleSSEEvent` already supports:
  - `generating_summary` with `data.chunk` → `accumulateChunk(data.chunk)`
  - `completed` with `data.data.final_summary_text` → `setStreamedText(finalText)`
- `ResearchResultCard` uses `stream.streamedText` and `research?.final_summary_text`, and treats `isStreaming` to drive shimmer/loading.

So the **UI is ready** for streamed chunks; the missing piece is the **backend** sending `generating_summary` events with `chunk` during `generateResearchSummary`.

### 2.3 Comparison with summary service

In `summary.service`:

- An `onChunk` is defined and passed to `callQwenMax` / `callQwenPlus`.
- Each chunk is sent via `broadcastJobProgress(jobId, { status: 'generating_summary', progress, chunk })` (or the equivalent for summaries).
- There is also a fallback that simulates streaming by chunking the final text when the real stream fails.

Research has no equivalent: no `onChunk`, no chunked progress, and no fallback.

---

## 3. Root causes (concise)

| Issue | Root cause |
|-------|------------|
| "Connection lost" at ~70% | 1) Long silent period (60–120+s) during `generateResearchSummary` with only heartbeats. 2) Underlying SSE/HTTP connection is closed or reset (proxy, network, server). 3) `reader.read()` throws → `onerror` → `isConnected = false` and reconnection. 4) Reconnection succeeds and `completed` is received on the new connection, so the summary still appears. |
| UX of "Connection lost" / "Try reconnecting" | Shown when `!isConnected && !isReconnecting`. If we’ve stopped retrying (e.g. max retries) or didn’t retry, that’s correct. If we *are* reconnecting, we show "Connection lost. Reconnecting...". The bigger UX problem: we show a strong failure state and "Try reconnecting" even when auto-reconnect is in progress or has just recovered, and the job completes successfully. |
| No streamed AI output | `generateResearchSummary` uses `callQwenMax(fullPrompt)` without `onChunk` and never calls `broadcastJobProgress` with `chunk` during the LLM call. |

---

## 4. Plan (do not implement yet)

### 4.1 "Connection lost" UX and robustness

1. **Handle `processing` and `generating` in `useResearchStream`**
   - **File**: `frontend/src/hooks/useResearchStream.ts`
   - In `handleSSEEvent`, add branches for `status === 'processing'` and `status === 'generating'`:
     - Map to a sensible phase for the UI (e.g. treat as `generating_summary` or a generic "in progress").
     - Call `resetHeartbeatTimer()` so we don’t rely only on `heartbeat` for timer reset when these are the only events (e.g. right after reconnect).
   - Stops "Unknown SSE event status: processing" and keeps heartbeat logic correct.

2. **Softer "connection lost" when we are recovering**
   - **Files**: `frontend/src/components/dashboard/ConnectionStatus.tsx`, `frontend/src/config/messages.ts` (or equivalent).
   - When `isReconnecting` is true, we already show "Connection lost. Reconnecting...". Consider:
     - Slightly gentler copy (e.g. "Temporarily disconnected. Reconnecting...") so it doesn’t imply total failure.
   - When we have just reconnected (`isConnected` flips to `true` after `isReconnecting`), we already show "Connection restored" and then hide the banner. Ensure that transition is quick and clear (e.g. 2s hide delay is acceptable; avoid flicker).

3. **Avoid showing "Connection lost. Please try again." + "Try reconnecting" when the job is still successfully progressing**
   - **File**: `frontend/src/hooks/useResearchStream.ts`
   - Today, `onerror` always sets `isConnected = false`. When we’re in `generating_summary` and we immediately trigger reconnection, the user sees "Connection lost. Reconnecting...". When reconnection succeeds, we clear that. The problematic case is when we **stop** reconnecting (max retries) but the **job** actually completes on the server (e.g. last retry coincided with completion). That’s a corner case; for the common “reconnect succeeds” case, ensuring `isReconnecting` and “Connection restored” are correct is enough.
   - Optional: only set a user-facing "connection lost" / error state after we’ve given up reconnecting **and** we have no `completed` or `research` from a concurrent completion. This requires careful ordering (e.g. complete can arrive on the new connection while we’re still in `isReconnecting`). Defer to a later iteration if needed.

4. **Backend: keep connection alive during long LLM phase**
   - **File**: `backend/src/services/job.service.ts` (and config)
   - Heartbeats are already every 30s. Verify that:
     - Research SSE connections are in the same `sseConnections` map used by `sendHeartbeats` (they are, via `addSSEConnection` in the research controller).
     - No proxy/load balancer is closing connections earlier (e.g. 60s) and that it treats SSE `data` as activity. If needed, consider lowering `sse_heartbeat_interval_seconds` (e.g. 15s) as a safety margin, and document any proxy timeouts.
   - **File**: `backend/src/controllers/research.controller.ts`
   - Ensure `buildResearchJobStatusResponse` uses status values the frontend understands, or that the frontend robustly maps `processing` / `generating` as above.

5. **Heartbeat timeout in the frontend**
   - **File**: `frontend/src/hooks/useResearchStream.ts`
   - The 60s heartbeat timeout currently only logs. If we want to detect “no data at all” (including no heartbeats), we could:
     - On timeout: set a “stale” or “maybe disconnected” state and optionally try **one** reconnect, **without** immediately showing "Connection lost. Please try again." (treat it as a softer warning until `onerror` or a failed reconnect). This needs a clear state (e.g. `isStale`) and messaging so we don’t confuse “no data” with “connection error.” Defer unless we see real cases where the connection is effectively dead but `onerror` never fires.

### 4.2 Real-time streaming of research summary

6. **Stream research summary in the backend**
   - **File**: `backend/src/services/research.service.ts`
   - In `generateResearchSummary`, add an optional `onChunk` and pass it to `callQwenMax` (or a streaming-capable helper used by `callQwenMax`). The function is currently:
     - `generateResearchSummary(researchQuery, transcripts, selectedVideos, language) → Promise<string>`.
   - Change the call site in `processResearch` to:
     - Create an `onChunk` that calls `broadcastJobProgress(jobId, { status: 'generating_summary', progress: …, message: '…', chunk })`.
     - Use `progressPercentages` (e.g. `transcripts_ready` → `generating_summary` end) to interpolate `progress` as chunks flow, similar to the summary service.
   - **Signature change**: `generateResearchSummary` needs either:
     - an extra optional `onChunk?: (chunk: string) => void`, or
     - a `BroadcastContext` (e.g. `{ jobId, progressPercentages }`) so it can call `broadcastJobProgress` itself. The first is simpler and matches `summary.service` and `callQwenMax(prompt, onChunk)`.

7. **Align `generateResearchSummary` with `callQwenMax`’s streaming API**
   - **File**: `backend/src/services/research.service.ts`
   - Replace:
     - `const aiResult = await callQwenMax(fullPrompt);`
   - with:
     - `const aiResult = await callQwenMax(fullPrompt, onChunk);`
   - where `onChunk` is provided by the caller (`processResearch`) and forwards to `broadcastJobProgress` with `status: 'generating_summary'` and `chunk`. Reuse the same progress semantics as the single pre-generation `generating_summary` broadcast (or the summary service’s chunked progress).

8. **Fallback when streaming fails**
   - **File**: `backend/src/services/research.service.ts`
   - If `callQwenMax`’s streaming path fails (e.g. no chunks, error, or the API doesn’t support it for this model), keep the current behavior: use the final `aiResult.content` and send it only in the `completed` event. Optionally, if the AI SDK allows, emulate chunked send of `content` (like the summary service’s fallback) for better UX. Prefer real streaming first; fallback is secondary.

9. **Frontend**
   - **File**: `frontend/src/hooks/useResearchStream.ts`
   - No change required for chunk handling: `generating_summary` with `data.chunk` is already passed to `accumulateChunk` and `setStreamedText`. Once the backend sends chunks, `streamedText` will update in real time.
   - **File**: `frontend/src/components/research/ResearchResultCard.tsx`
   - Already uses `streamedText` and `isStreaming`; confirm that `MarkdownStreamer` or the main text renderer appends smoothly when `streamedText` grows (no full replace that would cause flicker). If needed, ensure we only append or do a dirty-region update.

### 4.3 Testing and checks

10. **Regression and UX**
    - After 4.1: Run a research job through "generating comprehensive summary"; if possible, simulate a dropped connection (e.g. kill the HTTP stream) and confirm:
      - "Connection lost. Reconnecting..." (or softer equivalent) appears.
      - After reconnect, "Connection restored" then banner hides, and the summary still appears when the job completes.
    - Confirm that `status: 'processing'` and `'generating'` in the initial (or reconnection) SSE message no longer produce "Unknown SSE event status" and that the heartbeat timer is reset.

11. **Streaming**
    - After 4.2: Run a research job and confirm `streamedText` grows during "generating comprehensive summary" and that the final text matches the previous non-streaming behavior.
    - Test with a model/config where streaming fails and ensure the `completed` payload still contains the full `final_summary_text` and the UI shows it.

### 4.4 Suggested order of work

- **Phase A – "Connection lost" and robustness (4.1)**
  1. Handle `processing` and `generating` in `useResearchStream` (item 1).
  2. Verify backend heartbeats and proxy timeouts (item 4); adjust heartbeat interval if needed.
  3. Softer reconnection copy and "Connection restored" behavior (items 2–3).
  4. Optionally: heartbeat-timeout-driven “stale” handling (item 5) only if we see real-world cases.

- **Phase B – Research summary streaming (4.2)**
  1. Add `onChunk` to `generateResearchSummary` and pass it to `callQwenMax`; in `processResearch`, implement `onChunk` that calls `broadcastJobProgress` with `generating_summary` and `chunk` (items 6–7).
  2. Add fallback when streaming is unavailable (item 8).
  3. Smoke-test frontend rendering of `streamedText` (item 9) and run tests from item 10–11.

---

## 5. Files to touch (quick reference)

| Area | Files |
|------|-------|
| Connection / "Connection lost" | `frontend/src/hooks/useResearchStream.ts`, `frontend/src/components/dashboard/ConnectionStatus.tsx`, `frontend/src/config/messages.ts` |
| Backend heartbeats / SSE | `backend/src/services/job.service.ts`, `backend/config.yaml`, `backend/src/controllers/research.controller.ts` |
| Research summary streaming | `backend/src/services/research.service.ts` |
| Frontend streaming (likely no change) | `frontend/src/hooks/useResearchStream.ts` (chunk handling), `frontend/src/components/research/ResearchResultCard.tsx` |

---

## 6. References

- `frontend/src/config/streaming.ts`: `heartbeatConfig.timeout` (60s), `streamingMessages.connectionLost`, `reconnectConfig`
- `frontend/src/components/dashboard/ConnectionStatus.tsx`: `errorMessages.connectionLost`, "Try reconnecting", `isConnected` / `isReconnecting`
- `frontend/src/hooks/useResearchStream.ts`: `handleSSEEvent` (including `generating_summary` with `chunk`, `heartbeat`, and `default` for `processing`), `resetHeartbeatTimer`, `onerror` and reconnection, `accumulateChunk`
- `frontend/src/lib/authenticated-sse.ts`: `readStream`, `handleError`, `onerror`, `close`
- `backend/src/services/research.service.ts`: `processResearch`, `generateResearchSummary`, `callQwenMax(fullPrompt)` (no `onChunk`), `broadcastJobProgress` usage
- `backend/src/services/job.service.ts`: `addSSEConnection`, `broadcastJobProgress`, `sendHeartbeats`, `initializeHeartbeat`
- `backend/src/controllers/research.controller.ts`: `getResearchJobStatus` (SSE path), `buildResearchJobStatusResponse` (`status: job.status`), `addSSEConnection`
- `backend/src/services/summary.service.ts`: `onChunk` and `broadcastJobProgress` with `chunk` for summaries; fallback chunked send
- `backend/src/services/ai.service.ts`: `callQwenMax(combinedPrompt, onChunk?)`, `callQwen` / `callQwenStream` with `onChunk`
- `backend/config.yaml`: `sse_heartbeat_interval_seconds`, `job_timeout_minutes`
