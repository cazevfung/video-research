# Backend PRD: YouTube Batch Summary Service

| Version | 2.0 |
| :--- | :--- |
| **Status** | Enhanced |
| **Tech Stack** | Node.js (TypeScript), Express.js (or Fastify), Firebase Firestore |
| **External APIs** | Supadata (Transcripts), Qwen/DashScope (AI), Google OAuth (Optional) |

## 1. Executive Summary

A backend service that accepts a batch of YouTube URLs, extracts their content, and aggregates them into a **single comprehensive summary** based on user preferences. The system prioritizes user engagement via real-time progress updates and manages context windows by intelligently condensing long videos before final aggregation.

**Key Features:**
- Batch processing of multiple YouTube videos
- Real-time progress updates via Server-Sent Events (SSE)
- Intelligent context window management
- Optional authentication (can be disabled for development)
- Configurable freemium quota system

---

## 2. System Architecture

### 2.1 Technology Choices

*   **Runtime:** Node.js with TypeScript (Strong typing for maintainability).
*   **Database:** Firebase Firestore. (NoSQL, stores data in JSON-like documents, perfect for variable metadata and text blobs. Integrated with Firebase ecosystem).
*   **Authentication:** Passport.js (Google Strategy) + JWT (JSON Web Tokens) for session management. **Optional** - can be disabled via `AUTH_ENABLED=false`.
*   **Real-time Communication:** Server-Sent Events (SSE). Simpler than WebSockets, perfect for one-way progress updates ("fetching," "summarizing," "done").
*   **Job Management:** In-memory Map or Redis (optional) for job state tracking.

### 2.2 High-Level Workflow

1.  **Client** sends batch URLs + Prompt Settings.
2.  **Backend** validates request and creates job with unique `job_id`.
3.  **Backend** returns `job_id` immediately (async processing).
4.  **Client** opens SSE connection to `/api/status/:job_id`.
5.  **Backend** fetches transcripts via Supadata (Parallel).
6.  **Logic Check:** If any video > 60m or > 8000 words → Pre-summarize using `qwen-flash`.
7.  **Aggregation:** Combine all (short transcripts + pre-summarized long videos) into one context.
8.  **Context Check:** Verify aggregated content fits within AI context window.
9.  **Final AI:** Send aggregated text to Qwen (Model: `qwen-plus` or `qwen-max`) with user prompts.
10. **Storage:** Save metadata and summary to Firebase Firestore User Library.
11. **Response:** Stream final payload to Client via SSE.

### 2.3 Development Mode

**Optional Authentication:** The system can run without authentication for development and testing.

- Set `AUTH_ENABLED=false` in environment variables
- All endpoints work without authentication
- Quota checks are bypassed
- Default dev user is used for testing
- No OAuth setup required

---

## 3. Database Schema (Firestore)

### 3.1 Collection: `users`

Firestore document structure:
```json
{
  "id": "firestore-doc-id",
  "email": "user@gmail.com",
  "googleId": "123456...",
  "name": "John Doe",
  "tier": "free", // or "premium"
  "credits_remaining": 5, // reset daily via cron job
  "created_at": "Timestamp",
  "last_reset": "Timestamp" // Last time credits were reset
}
```

**Firestore Queries:**
- Query by `googleId` (where clause) - For OAuth lookup
- Query by `email` (where clause) - For user lookup
- Order by `created_at` - For analytics

**Note:** Firestore automatically indexes fields used in where clauses. Create composite indexes for compound queries if needed.

### 3.2 Collection: `summaries`

Firestore document structure:
```json
{
  "id": "firestore-doc-id",
  "user_id": "firestore-user-doc-id", // Nullable if auth disabled
  "job_id": "uuid-string", // For tracking
  "batch_title": "Summary of 5 AI Tutorials", // Generated title
  "source_videos": [
    {
      "url": "https://youtube.com/watch?v=...",
      "title": "Video Title",
      "channel": "Channel Name",
      "thumbnail": "https://img.youtube.com/...",
      "duration_seconds": 600,
      "word_count": 5000,
      "was_pre_condensed": false, // true if we used qwen-flash first
      "transcript_length": 5000 // Original transcript word count
    }
  ],
  "user_prompt_focus": "Focus on python code examples",
  "preset_style": "detailed", // See Section 5.4 for valid values
  "final_summary_text": "Here is the summary...",
  "language": "English", // See Section 5.5 for supported languages
  "processing_stats": {
    "total_videos": 5,
    "condensed_videos": 2,
    "total_tokens_used": 15000,
    "processing_time_seconds": 45
  },
  "created_at": "Timestamp"
}
```

**Firestore Queries:**
- Query by `user_id` + order by `created_at` (compound query) - For user history
- Query by `job_id` (where clause) - For job lookup
- Order by `created_at` - For sorting

**Note:** Create composite indexes in Firestore console for compound queries (user_id + created_at).

---

## 4. Configuration

### 4.1 Configuration File (`config.yaml`)

```yaml
system:
  max_concurrent_jobs: 10 # Prevent server overload
  job_timeout_minutes: 10 # Max time for a job to complete
  sse_heartbeat_interval_seconds: 30 # Keep-alive for SSE connections
  job_retention_hours: 1 # How long to keep completed jobs in memory

freemium_model:
  free_tier:
    daily_request_limit: 3 # User can run 3 batches per day
    max_videos_per_batch: 3
    default_credits: 3
  premium_tier:
    daily_request_limit: 50
    max_videos_per_batch: 10
    default_credits: 50

limits:
  long_video_threshold_minutes: 60
  long_video_word_count: 8000
  max_context_tokens: 24000 # Safety margin for Qwen models
  custom_prompt_max_length: 500
  max_batch_size: 10 # Absolute maximum regardless of tier

ai_models:
  pre_condense: qwen-flash # Fast, cheap model for condensing
  default_summary: qwen-plus # Default for final summary
  premium_summary: qwen-max # Premium users get better model
```

### 4.2 Environment Variables

```bash
# Server Configuration
NODE_ENV=development|production
PORT=5000
FRONTEND_URL=http://localhost:3000

# Authentication (Optional)
AUTH_ENABLED=false # Set to true to enable authentication
GOOGLE_CLIENT_ID= # Only required if AUTH_ENABLED=true
GOOGLE_CLIENT_SECRET= # Only required if AUTH_ENABLED=true
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
JWT_SECRET= # Secret for signing JWT tokens

# Database (Firebase Firestore)
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
# OR for local development with emulator:
FIRESTORE_EMULATOR_HOST=localhost:8080

# External APIs
SUPADATA_API_KEY= # API key for Supadata transcript service
DASHSCOPE_API_KEY= # API key for Qwen/DashScope AI service

# Optional
REDIS_URL= # For persistent job storage (optional, uses memory by default)
LOG_LEVEL=info # error, warn, info, debug
```

---

## 5. Core Business Logic (The Pipeline)

### 5.1 The "Fail-All" Validation

**Trigger:** User submits URLs via `POST /api/summarize`.

**Validation Steps:**

1. **URL Validation:**
   - Validate all URLs are valid YouTube links
   - Supported formats:
     - `https://www.youtube.com/watch?v=VIDEO_ID`
     - `https://youtu.be/VIDEO_ID`
     - `https://youtube.com/watch?v=VIDEO_ID`
   - Extract and validate video ID format
   - **Deduplicate URLs** - Remove duplicate URLs from batch
   - Return error if any URL is invalid (400 Bad Request)

2. **Batch Size Validation:**
   - Check URL count against user's tier limit
   - Free tier: Max 3 URLs
   - Premium tier: Max 10 URLs
   - Return error if exceeded (403 Forbidden)

3. **Quota Check:**
   - Verify user has credits remaining
   - **Atomic check-and-reserve** - Prevent race conditions
   - Return error if quota exceeded (403 Forbidden)

4. **Transcript Fetching:**
   - Call Supadata for **all** links in parallel
   - **Constraint:** If Supadata returns an error for **any** video (e.g., "Video Unavailable," "No Transcript"), the backend immediately aborts the process.
   - **Output:** Send error to frontend via SSE: `"Batch Failed: Video [X] unavailable."`

**Logical Issue Prevention:**
- Use database transactions or atomic operations for quota checks to prevent race conditions
- Deduplicate URLs before processing to avoid wasted API calls
- Validate all URLs before making any external API calls

### 5.2 The "Smart Context" Logic

This ensures we don't exceed the AI context window or blow up costs.

**Process:**

1. **Iterate through successful transcripts.**

2. **Check Length for Each Video:**
   - **Case A (Short Video):** 
     - Duration ≤ 60 minutes **AND** word count ≤ 8000
     - Append raw transcript to `final_context_buffer`
   
   - **Case B (Long Video):**
     - Duration > 60 minutes **OR** word count > 8000
     - Call `qwen-flash` API to condense
     - **System Prompt:** "Summarize this transcript preserving all key technical details, numbers, and nuanced arguments. Reduce length by 70% while maintaining all important information."
     - **Error Handling:** If condensing fails, use raw transcript (log warning)
     - Append the condensed result to `final_context_buffer`
     - Mark video as `was_pre_condensed: true`

3. **Aggregation:**
   - `final_context_buffer` now contains a mix of raw transcripts and condensed summaries
   - Add separators between videos: `\n\n--- Video: [Title] ---\n\n`

4. **Context Window Check:**
   - Estimate token count of aggregated content
   - If tokens > `max_context_tokens` (24K):
     - **Option 1:** Further condense all videos (even short ones)
     - **Option 2:** Return error: "Batch too large even after condensing"
     - **Decision:** Try Option 1 first, if still too large, use Option 2

**Logical Issue Prevention:**
- Check BOTH duration AND word count (not just one) - videos can be long in time but short in words
- Handle pre-condensing failures gracefully - don't fail entire batch if one video's condensing fails
- Estimate tokens, not just word count - AI models use tokens, not words
- Add video separators to help AI distinguish between sources

### 5.3 The Final Generation

**Input:** `final_context_buffer` + User Custom Prompt + System Preset (Style).

**Target Model Selection:**
- Free tier: `qwen-plus` (Good balance of cost/performance)
- Premium tier: `qwen-max` (Higher quality)

**System Prompt Construction:**

```
You are an expert summarizer. You have been provided with transcripts from multiple YouTube videos. Your task is to synthesize them into a single coherent [PRESET_STYLE] in [TARGET_LANGUAGE].

User's specific focus: [USER_CUSTOM_PROMPT]

Instructions:
- Maintain accuracy and preserve important technical details
- Cite which video each key point comes from when relevant
- Follow the [PRESET_STYLE] format exactly
- Write in [TARGET_LANGUAGE]

Content from videos:
[FINAL_CONTEXT_BUFFER]
```

**Streaming:**
- If Qwen API supports streaming, stream text chunks to client via SSE
- If not supported, send complete response when finished
- Emit `text_chunk` events during generation for real-time display

### 5.4 Preset Styles Definition

The following preset styles are supported:

| Preset Value | Name | Description | Expected Format | Max Length |
|-------------|------|-------------|----------------|------------|
| `tldr` | TL;DR | Ultra-concise summary | 2-3 sentences | ~100 words |
| `bullet_points` | Bullet Points | Key points in bullet format | Bulleted list | ~500 words |
| `deep_dive` | Deep Dive | Comprehensive analysis | Structured sections | ~2000 words |
| `tutorial` | Tutorial Code | Code-focused guide | Step-by-step with code | ~1500 words |
| `detailed` | Detailed Blog Post | Full article-style summary | Article with sections | ~3000 words |

**Validation:** Request must include a valid preset value, otherwise return 400 Bad Request.

### 5.5 Supported Languages

The following languages are supported for summary generation:

- English (default)
- Spanish
- French
- German
- Chinese (Simplified)
- Chinese (Traditional)
- Japanese
- Korean
- Portuguese
- Italian
- Russian
- Arabic

**Validation:** Request must include a supported language, otherwise default to English.

### 5.6 Batch Title Generation

**Logic:**
1. If user provides custom title: Use it (max 100 characters)
2. If single video: Use format `"[Video Title] - Summary"`
3. If multiple videos: Use format `"Summary of [X] Videos"` or `"Summary: [First Video Title] and [X-1] more"`
4. Sanitize special characters
5. Truncate to 100 characters if needed

**Edge Case:** If all videos fail, use generic title: `"Summary Batch - [Date]"`

### 5.7 Context Window Management

**Problem:** Even after pre-condensing, aggregated content might exceed AI model's context window.

**Solution Strategy:**

1. **Estimate tokens before sending:**
   - Use token estimation: ~1.3 tokens per word (approximate)
   - Add 20% safety margin

2. **If content exceeds limit:**
   - **Step 1:** Further condense ALL videos (even short ones) by 50%
   - **Step 2:** Re-check token count
   - **Step 3:** If still exceeds:
     - Return error: `CONTEXT_WINDOW_EXCEEDED`
     - Message: "Batch too large. Please reduce number of videos or try shorter videos."

3. **Logging:**
   - Log when context window is approached
   - Track token usage for cost monitoring

---

## 6. API Endpoints Specification

### 6.1 Authentication Endpoints

**Note:** All authentication endpoints are optional and only work when `AUTH_ENABLED=true`.

#### `GET /auth/google`
- **Description:** Initiates Google OAuth flow
- **Response:** Redirects to Google OAuth consent screen
- **Status Codes:**
  - `302 Found` - Redirect to Google
  - `501 Not Implemented` - If auth is disabled

#### `GET /auth/google/callback`
- **Description:** Handles OAuth callback from Google
- **Query Parameters:** `code` (OAuth code from Google)
- **Response:** 
  - Creates/updates user in database
  - Generates JWT token
  - Redirects to frontend with token: `{FRONTEND_URL}?token={JWT_TOKEN}`
- **Status Codes:**
  - `302 Found` - Redirect to frontend
  - `400 Bad Request` - Invalid OAuth code
  - `500 Internal Server Error` - OAuth processing failed

#### `GET /auth/me`
- **Description:** Returns current user information and quota status
- **Headers:** `Authorization: Bearer <token>` (optional if auth disabled)
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "ObjectId",
      "email": "user@example.com",
      "name": "John Doe",
      "tier": "free"
    },
    "quota": {
      "credits_remaining": 5,
      "daily_limit": 3,
      "max_videos_per_batch": 3,
      "reset_time": "2024-01-02T00:00:00Z"
    }
  }
  ```
- **Status Codes:**
  - `200 OK` - Success
  - `401 Unauthorized` - Invalid/missing token (if auth enabled)

#### `POST /auth/logout` (Optional)
- **Description:** Logs out user (invalidates token on client side)
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** `{ "message": "Logged out successfully" }`

#### `POST /auth/refresh` (Optional)
- **Description:** Refreshes JWT token
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** `{ "token": "new_jwt_token" }`

### 6.2 Processing Endpoints

#### `POST /api/summarize`
- **Description:** Creates a new summary job
- **Headers:** 
  - `Authorization: Bearer <token>` (optional if auth disabled)
  - `Content-Type: application/json`
- **Request Body:**
    ```json
    {
    "urls": ["https://youtube.com/watch?v=...", "..."],
      "preset": "bullet_points",
      "custom_prompt": "Focus on frontend tips",
    "language": "English"
  }
  ```
- **Request Validation:**
  - `urls`: Required, array, 1-10 items (based on tier), all valid YouTube URLs
  - `preset`: Required, must be one of: `tldr`, `bullet_points`, `deep_dive`, `tutorial`, `detailed`
  - `custom_prompt`: Optional, string, max 500 characters
  - `language`: Required, must be from supported languages list
- **Response (200 OK):**
  ```json
  {
    "job_id": "uuid-string"
  }
  ```
- **Error Responses:**
  ```json
  // 400 Bad Request - Invalid input
  {
    "error": {
      "code": "INVALID_URL",
      "message": "Invalid YouTube URL: https://invalid.com",
      "details": {
        "field": "urls",
        "invalid_urls": ["https://invalid.com"]
      }
    }
  }
  
  // 403 Forbidden - Quota exceeded
  {
    "error": {
      "code": "QUOTA_EXCEEDED",
      "message": "Daily limit reached. Upgrade to Premium for more.",
      "details": {
        "credits_remaining": 0,
        "daily_limit": 3
      }
    }
  }
  ```
- **Status Codes:**
  - `200 OK` - Job created successfully
  - `400 Bad Request` - Invalid input
  - `401 Unauthorized` - Missing/invalid token (if auth enabled)
  - `403 Forbidden` - Quota exceeded or batch size exceeded
  - `429 Too Many Requests` - Rate limit exceeded
  - `500 Internal Server Error` - Server error

#### `GET /api/status/:job_id` (SSE)
- **Description:** Server-Sent Events endpoint for real-time job status updates
- **Headers:** `Authorization: Bearer <token>` (optional if auth disabled)
- **Response:** SSE stream with `text/event-stream` content type
- **Event Format:**
  ```typescript
  {
    status: 'connected' | 'fetching_transcripts' | 'processing_video_X' | 'condensing' | 'aggregating' | 'generating_final_summary' | 'completed' | 'error',
    progress: number, // 0-100
    message?: string, // Human-readable status message
    chunk?: string, // Text chunk (only during 'generating_final_summary')
    data?: SummaryObject, // Only on 'completed'
    error?: string // Only on 'error'
  }
  ```
- **Event Sequence:**
  1. `{ status: "connected", job_id: "..." }` - Connection established
  2. `{ status: "fetching_transcripts", progress: 10, message: "Fetching 5 videos..." }`
  3. `{ status: "processing_video_2", progress: 40, message: "Condensing video 2 of 5..." }` (if long video)
  4. `{ status: "aggregating", progress: 70, message: "Combining transcripts..." }`
  5. `{ status: "generating_final_summary", progress: 85, chunk: "First part..." }`
  6. `{ status: "generating_final_summary", progress: 87, chunk: " continuation..." }` (multiple chunks)
  7. `{ status: "completed", progress: 100, data: { ...full_summary... } }`
- **Error Event:**
  ```json
  {
    "status": "error",
    "progress": 0,
    "error": "Video unavailable: https://youtube.com/watch?v=..."
  }
  ```
- **Heartbeat:** Every 30 seconds, send `{ status: "heartbeat", timestamp: "..." }` to keep connection alive
- **Reconnection:** Clients can reconnect and receive last known status
- **Status Codes:**
  - `200 OK` - Connection established (SSE stream)
  - `404 Not Found` - Job not found
  - `401 Unauthorized` - Invalid token (if auth enabled)
  - `403 Forbidden` - User doesn't own this job

### 6.3 History Endpoints

#### `GET /api/history`
- **Description:** Returns paginated list of user's past summaries
- **Headers:** `Authorization: Bearer <token>` (optional if auth disabled)
- **Query Parameters:**
  - `page`: number (optional, default: 1, min: 1)
  - `limit`: number (optional, default: 20, max: 100)
- **Response (200 OK):**
  ```json
  {
    "summaries": [
      {
        "_id": "ObjectId",
        "batch_title": "Summary of 5 Videos",
        "created_at": "2024-01-01T00:00:00Z",
        "source_videos": [
          {
            "thumbnail": "https://img.youtube.com/...",
            "title": "Video Title"
          }
        ],
        "video_count": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
  ```
- **Status Codes:**
  - `200 OK` - Success
  - `401 Unauthorized` - Invalid token (if auth enabled)
  - `400 Bad Request` - Invalid query parameters

#### `GET /api/history/:id` or `GET /api/summary/:id`
- **Description:** Returns full details of a specific summary
- **Headers:** `Authorization: Bearer <token>` (optional if auth disabled)
- **Response (200 OK):**
  ```json
  {
    "_id": "ObjectId",
    "user_id": "ObjectId",
    "batch_title": "Summary of 5 Videos",
    "source_videos": [
      {
        "url": "https://youtube.com/watch?v=...",
        "title": "Video Title",
        "channel": "Channel Name",
        "thumbnail": "https://img.youtube.com/...",
        "duration_seconds": 600,
        "was_pre_condensed": false
      }
    ],
    "user_prompt_focus": "Focus on python code",
    "preset_style": "detailed",
    "final_summary_text": "Full summary text...",
    "language": "English",
    "created_at": "2024-01-01T00:00:00Z"
  }
  ```
- **Status Codes:**
  - `200 OK` - Success
  - `404 Not Found` - Summary not found
  - `401 Unauthorized` - Invalid token (if auth enabled)
  - `403 Forbidden` - User doesn't own this summary

### 6.4 Health Check Endpoint

#### `GET /health`
- **Description:** Service health check endpoint
- **Response (200 OK):**
  ```json
  {
    "status": "healthy" | "degraded" | "unhealthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "services": {
      "database": "connected" | "disconnected",
      "supadata": "available" | "unavailable",
      "qwen": "available" | "unavailable"
    },
    "version": "2.0"
  }
  ```
- **Status Codes:**
  - `200 OK` - Service is healthy
  - `503 Service Unavailable` - Service is unhealthy

---

## 7. External API Integration

### 7.1 Supadata API Integration

**Purpose:** Fetch YouTube video transcripts

**Endpoint:** `https://api.supadata.com/v1/transcript` (example - use actual endpoint)

**Authentication:** API key in header: `Authorization: Bearer {SUPADATA_API_KEY}`

**Request:**
```json
{
  "video_url": "https://youtube.com/watch?v=...",
  "format": "text"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "video_id": "...",
    "title": "Video Title",
    "channel": "Channel Name",
    "thumbnail": "https://img.youtube.com/...",
    "duration_seconds": 600,
    "transcript": "Full transcript text...",
    "word_count": 5000
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "VIDEO_UNAVAILABLE" | "NO_TRANSCRIPT" | "RATE_LIMIT",
    "message": "Error message"
  }
}
```

**Error Handling:**
- **Retry Strategy:** Max 2 retries for network errors
- **Backoff:** Exponential (1s, 2s)
- **Don't Retry:** For "NO_TRANSCRIPT" or "VIDEO_UNAVAILABLE" errors
- **Timeout:** 30 seconds per request

**Rate Limits:** [Document actual limits from Supadata]

### 7.2 Qwen/DashScope API Integration

**Purpose:** AI-powered summarization

**Endpoint:** `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation` (example - use actual endpoint)

**Authentication:** API key in header: `Authorization: Bearer {DASHSCOPE_API_KEY}`

**Models:**
- `qwen-flash` - Fast, cheap model for pre-condensing long videos
- `qwen-plus` - Default model for final summary generation
- `qwen-max` - Premium model for higher quality summaries

**Request (Non-streaming):**
```json
{
  "model": "qwen-plus",
  "input": {
    "messages": [
      {
        "role": "system",
        "content": "System prompt..."
      },
      {
        "role": "user",
        "content": "User prompt with context..."
      }
    ]
  },
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 4000
  }
}
```

**Request (Streaming - if supported):**
```json
{
  "model": "qwen-plus",
  "input": {
    "messages": [...]
  },
  "parameters": {
    "stream": true,
    "temperature": 0.7
  }
}
```

**Response (Success):**
```json
{
  "output": {
    "choices": [
      {
        "message": {
          "content": "Generated summary text..."
        }
      }
    ],
    "usage": {
      "total_tokens": 5000
    }
  }
}
```

**Response (Streaming):**
- Stream of chunks with `data: {...}` format
- Parse chunks and forward to client via SSE

**Error Handling:**
- **Retry Strategy:** Max 1 retry for timeouts only
- **Don't Retry:** For invalid prompts or context window exceeded
- **Backoff:** 2 seconds
- **Timeout:** 60 seconds per request

**Cost Tracking:**
- Log token usage per request
- Track costs per user/tier
- Alert on high usage

---

## 8. Job Management

### 8.1 Job States

```typescript
type JobStatus = 
  | 'pending'      // Created, waiting to start
  | 'fetching'     // Fetching transcripts
  | 'processing'   // Processing/condensing videos
  | 'aggregating'  // Combining transcripts
  | 'generating'   // Generating final summary
  | 'completed'    // Successfully completed
  | 'error'        // Failed with error
  | 'cancelled'    // User cancelled (future feature)
```

### 8.2 Job Lifecycle

1. **Creation:** Job created with unique ID (UUID) when `POST /api/summarize` is called
2. **Storage:** Job state stored in memory (Map) or Redis (if configured)
3. **Processing:** Job progresses through states, emitting SSE events
4. **Completion:** Job marked as `completed` or `error`, data saved to Firebase Firestore
5. **Cleanup:** Job removed from memory after retention period (1 hour for completed, 24 hours for errors)

### 8.3 Job Properties

```typescript
{
  job_id: string,
  user_id: string | null, // Null if auth disabled
  status: JobStatus,
  progress: number, // 0-100
  created_at: Date,
  updated_at: Date,
  error?: string,
  summary_id?: string // Firestore summary document ID
}
```

### 8.4 Job Cleanup

- **Completed jobs:** Keep for 1 hour (allow client reconnection)
- **Error jobs:** Keep for 24 hours (for debugging)
- **Auto-cleanup:** Background job runs every hour
- **Manual cleanup:** Admin endpoint (future feature)

---

## 9. Error Handling & Edge Cases

### 9.1 Standardized Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "details": {
      // Additional context
    }
  }
}
```

### 9.2 Error Code Reference

| Error Code | HTTP Status | Description | User Message |
|------------|-------------|-------------|--------------|
| `INVALID_URL` | 400 | Malformed YouTube URL | "Invalid YouTube URL: [url]" |
| `INVALID_PRESET` | 400 | Unknown preset style | "Invalid preset style. Valid values: tldr, bullet_points, deep_dive, tutorial, detailed" |
| `INVALID_LANGUAGE` | 400 | Unsupported language | "Unsupported language. Defaulting to English." |
| `BATCH_SIZE_EXCEEDED` | 403 | Too many URLs for tier | "Batch size exceeded. Free tier: max 3 videos, Premium: max 10 videos." |
| `QUOTA_EXCEEDED` | 403 | Daily limit reached | "Daily limit reached. Upgrade to Premium for more." |
| `TRANSCRIPT_ERROR` | 400 | Video has no transcript | "Video has no transcript available: [url]" |
| `VIDEO_UNAVAILABLE` | 400 | Video is private/deleted | "Video is unavailable: [url]" |
| `AI_API_ERROR` | 500 | Qwen API failure | "AI service error. Please try again." |
| `AI_API_TIMEOUT` | 504 | Qwen API timeout | "Processing timed out. Please try again." |
| `CONTEXT_WINDOW_EXCEEDED` | 400 | Aggregated content too large | "Batch too large. Please reduce number of videos." |
| `JOB_NOT_FOUND` | 404 | Invalid job_id | "Job not found." |
| `UNAUTHORIZED` | 401 | Missing/invalid token | "Session expired. Please log in again." |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | "Rate limit exceeded. Please try again later." |

### 9.3 Error Handling Matrix

| Scenario | HTTP Status | Error Code | System Behavior |
|----------|-------------|------------|-----------------|
| Invalid URL format | 400 | INVALID_URL | Reject before any API calls |
| No transcript | 400 | TRANSCRIPT_ERROR | Abort entire batch, notify user |
| Video unavailable | 400 | VIDEO_UNAVAILABLE | Abort entire batch, notify user |
| Quota exceeded | 403 | QUOTA_EXCEEDED | Reject before processing |
| Token expired | 401 | UNAUTHORIZED | Reject, frontend handles logout |
| AI API timeout | 504 | AI_API_TIMEOUT | Retry once, then fail |
| Context too large | 400 | CONTEXT_WINDOW_EXCEEDED | Try further condensing, then error |
| Pre-condense failure | 500 | AI_API_ERROR | Use raw transcript, log warning |
| Duplicate URLs | 200 | (handled) | Deduplicate silently |

### 9.4 Edge Cases

**Empty Transcript:**
- Some videos may have empty transcripts
- Handle gracefully: Skip video or use metadata only
- Log warning

**Very Short Videos (< 1 minute):**
- May have minimal transcript
- Process normally, may result in short summary

**Duplicate URLs in Batch:**
- Deduplicate before processing
- Process each unique URL only once
- Don't count duplicates toward batch size

**All Videos Fail:**
- If all videos in batch fail transcript fetch
- Return error immediately
- Don't create summary document

**Job Timeout:**
- If job exceeds `job_timeout_minutes` (10 minutes)
- Mark job as `error`
- Clean up resources
- Notify client via SSE

**SSE Connection Lost:**
- Job continues processing
- Client can reconnect and receive last status
- Job state persists for reconnection

**Credit Deduction Timing:**
- **Deduct credits AFTER job completes successfully**
- If job fails, don't deduct credits
- Use database transaction to ensure atomicity

---

## 10. Data Validation Rules

### 10.1 URL Validation

- **Pattern Matching:**
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://youtube.com/watch?v=VIDEO_ID`
- **Video ID Format:** 11 characters, alphanumeric
- **Deduplication:** Remove duplicate URLs in batch
- **Max Length:** 2048 characters per URL

### 10.2 Request Validation

- **`urls`:** 
  - Required, array type
  - 1-10 items (based on tier)
  - All items must be valid YouTube URLs
  - No duplicates
  
- **`preset`:** 
  - Required, string
  - Must be one of: `tldr`, `bullet_points`, `deep_dive`, `tutorial`, `detailed`
  
- **`custom_prompt`:** 
  - Optional, string
  - Max 500 characters
  - Sanitize HTML/special characters
  
- **`language`:** 
  - Required, string
  - Must be from supported languages list
  - Default to "English" if invalid

### 10.3 Batch Size Validation

- Check URL count against user tier:
  - Free tier: Max 3 URLs
  - Premium tier: Max 10 URLs
- Absolute maximum: 10 URLs (regardless of tier)
- Return clear error if exceeded

---

## 11. Performance Requirements

### 11.1 Response Time Targets

- **Health check:** < 100ms
- **Job creation:** < 200ms
- **History list:** < 500ms
- **Summary retrieval:** < 300ms

### 11.2 Processing Time Targets

- **Transcript fetching:** < 30s per video (parallel execution)
- **Pre-condensing:** < 60s per long video
- **Final summary:** < 120s for typical batch (3-5 videos)

### 11.3 Scalability Targets

- Support 10 concurrent jobs (configurable)
- Handle 100 requests/minute per user
- Support 1000+ users
- Database queries optimized with indexes

### 11.4 Resource Limits

- Max context window: 24K tokens (safety margin)
- Max aggregated text: ~18K tokens (before sending to AI)
- Max job duration: 10 minutes
- Max concurrent SSE connections: 100 per server instance

---

## 12. Security Specifications

### 12.1 Authentication

- **JWT Tokens:**
  - 24-hour expiration
  - Signed with secret key
  - Stored securely on client (httpOnly cookies recommended)
  
- **Token Refresh:** Optional endpoint for long sessions
  
- **Optional Mode:** Can be disabled for development (`AUTH_ENABLED=false`)

### 12.2 Authorization

- Users can only access their own summaries
- Job ownership validation on SSE connection
- Quota enforcement per user
- Tier-based feature access

### 12.3 Input Sanitization

- Sanitize all user inputs
- Validate URLs to prevent injection
- Escape special characters in prompts
- Limit input lengths

### 12.4 CORS Configuration

- Allow only frontend origin (from `FRONTEND_URL` env var)
- Support credentials for JWT cookies
- Configure preflight handling
- Reject unauthorized origins

### 12.5 API Key Security

- Store API keys in environment variables only
- Never expose in responses or logs
- Rotate keys regularly
- Use different keys for dev/prod

### 12.6 Rate Limiting

- **Per-user rate limiting:** Based on tier quotas
- **Per-IP rate limiting:** For auth endpoints (10 req/min)
- **Global rate limiting:** Prevent abuse
- **Rate limit headers:**
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## 13. Monitoring & Observability

### 13.1 Logging

- **Structured Logging:** JSON format
- **Log Levels:** error, warn, info, debug
- **Log All:**
  - API requests/responses
  - Job lifecycle events
  - External API calls
  - Errors with full context

### 13.2 Metrics

Track the following metrics:
- Job success/failure rates
- Average processing time
- API call latencies
- Quota usage statistics
- Error rates by type
- Token usage and costs

### 13.3 Health Checks

- `GET /health` endpoint
- Check database connection
- Check external API availability
- Return service status

### 13.4 Alerts

Set up alerts for:
- High error rates (> 5%)
- API timeouts
- Quota exhaustion warnings
- Cost threshold exceeded
- Database connection failures

---

## 14. Logical Issues & Prevention Strategies

### 14.1 Race Conditions

**Issue:** Multiple simultaneous requests might both pass quota check before either deducts credits.

**Prevention:**
- Use database transactions for quota checks
- Atomic operations: `findOneAndUpdate` with conditions
- Lock user record during quota check and deduction

### 14.2 Job State Consistency

**Issue:** Job might fail mid-way, leaving partial state.

**Prevention:**
- Use state machine pattern for job states
- Only transition to next state after current completes
- Save error state immediately on failure
- Clean up resources on error

### 14.3 Context Window Calculation

**Issue:** Estimating tokens incorrectly might cause API failures.

**Prevention:**
- Use conservative token estimation (1.3 tokens/word)
- Add 20% safety margin
- Check before sending to AI
- Handle "context too large" errors gracefully

### 14.4 Credit Deduction Timing

**Issue:** When to deduct credits - before or after job?

**Prevention:**
- **Deduct AFTER successful completion**
- If job fails, don't deduct (user shouldn't pay for failures)
- Use database transaction to ensure atomicity
- Log all credit operations

### 15.5 SSE Connection Management

**Issue:** What if client disconnects? Should job continue?

**Prevention:**
- Job continues processing even if client disconnects
- Client can reconnect and receive last status
- Implement heartbeat to detect dead connections
- Clean up connections on completion

### 14.6 Pre-condensing Failure

**Issue:** What if qwen-flash fails for a long video?

**Prevention:**
- Don't fail entire batch
- Use raw transcript as fallback
- Log warning for monitoring
- Mark video as not condensed

### 14.7 Duplicate URL Handling

**Issue:** User might submit same URL multiple times.

**Prevention:**
- Deduplicate URLs before processing
- Process each unique URL only once
- Don't count duplicates toward batch size
- Return success even with duplicates (silent handling)

---

## 15. Development & Testing

### 15.1 Development Mode

- Set `AUTH_ENABLED=false` to skip authentication
- All endpoints work without OAuth setup
- Quota checks bypassed
- Default dev user for testing

### 15.2 Testing Strategy

- **Unit Tests:** Services, utilities, validators
- **Integration Tests:** API endpoints, database operations
- **E2E Tests:** Full pipeline with mocked external APIs
- **Load Tests:** Concurrent jobs, rate limiting

### 15.3 Mock Data

- Mock Supadata responses for testing
- Mock Qwen API responses
- Test data for various scenarios (long videos, errors, etc.)

---

## 16. Future Enhancements

### 16.1 Planned Features

- Job cancellation (user can cancel in-progress jobs)
- Export summaries (PDF, Markdown)
- Share summaries with others
- Advanced filtering in history
- Batch scheduling
- Webhook notifications

### 16.2 Scalability Improvements

- Redis for job storage (persistent, distributed)
- Job queue system (Bull/BullMQ)
- Horizontal scaling support
- Caching layer for transcripts
- Database sharding (if needed)

---

## Appendix A: Complete API Reference

[See Section 6 for detailed API specifications]

## Appendix B: Configuration Reference

[See Section 4 for complete configuration]

## Appendix C: Error Code Reference

[See Section 9.2 for complete error codes]

---

**Document Version:** 2.0  
**Last Updated:** 2024  
**Status:** Enhanced - Ready for Implementation
