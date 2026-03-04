# Instructions for Implementing DashScope API Streaming Response Handling

## Overview
When `stream: true` is enabled in the config, DashScope API returns a Server-Sent Events (SSE) stream instead of a JSON response. You need to update the AI service to:
1. Handle the streaming response from DashScope
2. Parse SSE chunks in real-time
3. Forward chunks to clients via SSE
4. Accumulate the full response for storage

---

## Step 1: Update Axios Request for Streaming

**Location:** `backend/src/services/ai.service.ts`

1. **Modify the axios request:**
   - When `stream: true`, use `responseType: 'stream'` in axios config
   - When `stream: false`, use `responseType: 'json'` (current implementation)
   - This tells axios to handle the response as a stream instead of parsing JSON

2. **Add streaming handler function:**
   - Create `callQwenStream()` function for streaming mode
   - Create `callQwenNonStream()` function for non-streaming mode (current implementation)
   - Route to appropriate handler based on config

---

## Step 2: Parse DashScope SSE Stream Format

**DashScope SSE Format:**
- Each line is a JSON object
- Format: `data: {"output": {...}, "request_id": "..."}`
- End marker: `[DONE]` or empty line

1. **Create stream parser:**
   - Read response stream line by line
   - Strip `data: ` prefix from each line
   - Parse JSON for each chunk
   - Handle `[DONE]` marker to know when stream ends
   - Extract content from `output.choices[0].message.content`
   - Handle `enable_thinking` output format (if different)

2. **Handle thinking mode:**
   - If `enable_thinking: true`, response may include thinking tokens
   - Filter out thinking tokens before sending to clients
   - Only forward actual content chunks

---

## Step 3: Integrate with Job Service and SSE

**Location:** `backend/src/services/summary.service.ts` (around line 480-510)

1. **Modify `callQwenPlus()` and `callQwenMax()`:**
   - Accept optional `jobId` parameter
   - Pass `jobId` to `callQwen()` when streaming is enabled
   - This enables real-time chunk forwarding

2. **Update `callQwen()` signature:**
   - Add optional `jobId?: string` parameter
   - Add optional `onChunk?: (chunk: string) => void` callback
   - When streaming, call `onChunk` for each content chunk
   - Accumulate chunks for final response

3. **Forward chunks to SSE clients:**
   - In `summary.service.ts`, when calling AI service:
     - Pass `jobId` to AI service
     - Use `broadcastJobProgress()` to send chunks
     - Format: `{ status: 'generating', chunk: '...', progress: ... }`
   - Update progress incrementally based on chunk count/estimated total

---

## Step 4: Update AI Service Function Signatures

**Location:** `backend/src/services/ai.service.ts`

1. **Modify function signatures:**
   ```typescript
   // Add optional parameters for streaming
   async function callQwen(
     model: QwenModel,
     systemPrompt: string,
     userContent: string,
     parameters: {...},
     retryCount = 0,
     jobId?: string,  // NEW: For streaming
     onChunk?: (chunk: string) => void  // NEW: Callback for chunks
   ): Promise<AIResult>
   ```

2. **Update `callQwenPlus()` and `callQwenMax()`:**
   - Accept `jobId?: string` parameter
   - Pass it through to `callQwen()`

---

## Step 5: Implement Stream Parsing Logic

**Location:** `backend/src/services/ai.service.ts`

1. **Create helper function:**
   ```typescript
   async function parseDashScopeStream(
     stream: NodeJS.ReadableStream,
     onChunk: (chunk: string) => void
   ): Promise<{ content: string, tokens_used?: number }>
   ```
   - Use `readline` or `stream` to read line by line
   - Parse each `data: {...}` line
   - Extract content from `output.choices[0].message.content`
   - Accumulate content
   - Call `onChunk()` for each new content delta
   - Return final accumulated content and token usage

2. **Handle errors in stream:**
   - Parse error chunks: `{"code": "...", "message": "..."}`
   - Throw appropriate errors
   - Clean up stream on error

---

## Step 6: Update Summary Service to Use Streaming

**Location:** `backend/src/services/summary.service.ts` (around line 480-510)

1. **Replace current AI call:**
   ```typescript
   // OLD: const aiResult = await callQwenPlus(...)
   
   // NEW: Pass jobId and handle streaming
   const aiResult = await callQwenPlus(
     promptWithContent,
     finalContent,
     jobId  // Pass jobId for streaming
   );
   ```

2. **Remove simulated streaming:**
   - Remove or disable `streamTextChunks()` when real streaming is enabled
   - Real chunks come from DashScope API
   - Only use `streamTextChunks()` as fallback if streaming fails

---

## Step 7: Handle Token Accumulation

1. **Track tokens:**
   - DashScope may send token usage in stream chunks
   - Accumulate `usage.total_tokens` if provided
   - Or estimate from final content length

2. **Update progress calculation:**
   - Use chunk count or content length to estimate progress
   - Update progress from `generating` (85%) to `completed` (100%)
   - Increment progress as chunks arrive

---

## Step 8: Error Handling and Fallback

1. **Stream errors:**
   - If stream fails, fall back to non-streaming mode
   - Log the error
   - Retry with `stream: false` if retries remaining

2. **Client disconnection:**
   - If all SSE clients disconnect, continue processing
   - Accumulate full response for storage
   - Don't abort the AI request

---

## Step 9: Update TypeScript Interfaces

**Location:** `backend/src/services/ai.service.ts`

1. **Add streaming response types:**
   ```typescript
   interface DashScopeStreamChunk {
     output?: {
       choices: Array<{
         message: {
           content: string;
         };
       }>;
     };
     usage?: {
       total_tokens: number;
     };
     request_id?: string;
   }
   ```

2. **Update `AIResponse`:**
   - Keep existing structure
   - Ensure streaming and non-streaming return same format

---

## Step 10: Testing Considerations

1. **Test scenarios:**
   - Streaming enabled: verify chunks arrive in real-time
   - Streaming disabled: verify existing behavior works
   - Error handling: verify fallback to non-streaming
   - Client disconnect: verify processing continues
   - Thinking mode: verify thinking tokens are filtered

2. **Performance:**
   - Monitor memory usage during streaming
   - Ensure chunks are processed efficiently
   - Don't buffer entire stream in memory unnecessarily

---

## Step 11: Configuration Check

**Location:** `backend/src/services/ai.service.ts`

1. **Add runtime check:**
   - Check `aiSettings.stream` before making request
   - Route to streaming or non-streaming handler
   - This allows toggling streaming via config without code changes

---

## Implementation Order

1. **Step 1:** Update axios request handling
2. **Step 5:** Implement stream parser
3. **Step 4:** Update function signatures
4. **Step 3:** Integrate with job service
5. **Step 6:** Update summary service
6. **Step 7-11:** Polish and testing

---

## Important Notes

- **Backward Compatibility:** Ensure non-streaming mode still works
- **Stream Parsing:** Use `readline` or streaming library for efficient parsing
- **Thinking Mode:** Handle `enable_thinking` output format if it differs
- **Testing:** Test with actual DashScope API responses to verify format
- **Rate Limiting:** Consider rate limiting chunk forwarding to avoid overwhelming clients

These changes will enable real-time streaming from DashScope to your Firebase/SSE clients while maintaining the existing architecture.

