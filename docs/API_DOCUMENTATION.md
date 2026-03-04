# API Documentation

Complete API reference for the YouTube Batch Summary Service backend.

## Base URL

- **Development:** `http://localhost:5000`
- **Production:** (configured via environment variable)

## Authentication

The API supports optional authentication via Google OAuth. When `AUTH_ENABLED=false`, all endpoints work without authentication.

**Headers (when auth enabled):**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request ID Tracking:**
All responses include an `X-Request-ID` header for request correlation and debugging.

---

## Endpoints

### Health Check

#### `GET /health`

Check the health status of the service.

**Response (200 OK):**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected" | "disconnected"
  },
  "version": "1.0.0"
}
```

**Status Codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Service is unhealthy

---

### Root Endpoint

#### `GET /`

Get API information.

**Response (200 OK):**
```json
{
  "message": "YouTube Batch Summary Service API",
  "version": "1.0.0",
  "status": "running"
}
```

---

### Authentication Endpoints

> **Note:** These endpoints only work when `AUTH_ENABLED=true`.

#### `GET /auth/google`

Initiates Google OAuth flow. Redirects to Google OAuth consent screen.

**Response:**
- `302 Found` - Redirects to Google OAuth
- `501 Not Implemented` - If auth is disabled

#### `GET /auth/google/callback`

Handles OAuth callback from Google. Creates/updates user and generates JWT token.

**Query Parameters:**
- `code` - OAuth code from Google

**Response:**
- `302 Found` - Redirects to frontend with token: `{FRONTEND_URL}?token={JWT_TOKEN}`

#### `GET /auth/me`

Get current user information and quota status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "firestore-user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "free" | "premium"
  },
  "quota": {
    "credits_remaining": 5,
    "daily_limit": 3,
    "max_videos_per_batch": 3,
    "reset_time": "2024-01-02T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid/missing token (if auth enabled)

---

### Summary Endpoints

#### `POST /api/summarize`

Create a new summary job. Processing happens asynchronously.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (optional)
```

**Request Body:**
```json
{
  "urls": [
    "https://www.youtube.com/watch?v=...",
    "https://youtube.com/watch?v=..."
  ],
  "preset": "tldr" | "bullet_points" | "deep_dive" | "tutorial" | "detailed",
  "custom_prompt": "Focus on frontend tips", // Optional, max 500 chars
  "language": "English" // Default: "English"
}
```

**Request Validation:**
- `urls`: Required, array, 1-10 items (based on tier), all valid YouTube URLs
- `preset`: Required, must be one of: `tldr`, `bullet_points`, `deep_dive`, `tutorial`, `detailed`
- `custom_prompt`: Optional, string, max 500 characters
- `language`: Required, must be from supported languages list

**Response (200 OK):**
```json
{
  "job_id": "uuid-string"
}
```

**Error Responses:**

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

**Status Codes:**
- `200 OK` - Job created successfully
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid token (if auth enabled)
- `403 Forbidden` - Quota exceeded or batch size exceeded
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

#### `GET /api/status/:job_id` (SSE)

Server-Sent Events endpoint for real-time job status updates.

**Headers:**
```
Authorization: Bearer <token> (optional)
Accept: text/event-stream
```

**Event Format:**
```typescript
{
  status: 'connected' | 'fetching_transcripts' | 'processing_video_X' | 'condensing' | 'aggregating' | 'generating_final_summary' | 'completed' | 'error',
  progress: number, // 0-100
  message?: string, // Human-readable status message
  chunk?: string, // Text chunk (only during 'generating_final_summary')
  title?: string, // AI-generated title (quick title after transcripts, refined title after summary completion)
  data?: SummaryObject, // Only on 'completed'
  error?: string // Only on 'error'
}
```

**Event Sequence:**
1. `{ status: "connected", job_id: "..." }` - Connection established
2. `{ status: "fetching_transcripts", progress: 10, message: "Fetching 5 videos..." }`
3. `{ status: "fetching", progress: 10, message: "Processing transcripts...", title: "Quick AI-Generated Title" }` - Quick title generated from transcripts
4. `{ status: "processing_video_2", progress: 40, message: "Condensing video 2 of 5..." }` (if long video)
5. `{ status: "aggregating", progress: 70, message: "Combining transcripts..." }`
6. `{ status: "generating_final_summary", progress: 85, chunk: "First part..." }`
7. `{ status: "generating_final_summary", progress: 87, chunk: " continuation..." }` (multiple chunks)
8. `{ status: "completed", progress: 100, title: "Refined AI-Generated Title", data: { ...full_summary... } }` - Refined title replaces quick title

**Error Event:**
```json
{
  "status": "error",
  "progress": 0,
  "error": "Video unavailable: https://youtube.com/watch?v=..."
}
```

**Heartbeat:**
Every 30 seconds, a heartbeat event is sent: `{ status: "heartbeat", timestamp: "..." }`

**Status Codes:**
- `200 OK` - Connection established (SSE stream)
- `404 Not Found` - Job not found
- `401 Unauthorized` - Invalid token (if auth enabled)
- `403 Forbidden` - User doesn't own this job

**Example (JavaScript):**
```javascript
const eventSource = new EventSource(`/api/status/${jobId}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status:', data.status, 'Progress:', data.progress);
  
  if (data.status === 'completed') {
    console.log('Summary:', data.data);
    eventSource.close();
  }
  
  if (data.status === 'error') {
    console.error('Error:', data.error);
    eventSource.close();
  }
};
```

---

### History Endpoints

#### `GET /api/history`

Returns paginated list of user's past summaries.

**Headers:**
```
Authorization: Bearer <token> (optional)
```

**Query Parameters:**
- `page`: number (optional, default: 1, min: 1)
- `limit`: number (optional, default: 20, max: 100)

**Response (200 OK):**
```json
{
  "summaries": [
    {
      "_id": "summary-id",
      "batch_title": "Summary of 5 Videos",
      "created_at": "2024-01-01T00:00:00.000Z",
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

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid token (if auth enabled)
- `400 Bad Request` - Invalid query parameters

---

#### `GET /api/history/:id`

Get full details of a specific summary.

**Headers:**
```
Authorization: Bearer <token> (optional)
```

**Response (200 OK):**
```json
{
  "_id": "summary-id",
  "user_id": "user-id",
  "batch_title": "Summary of 5 Videos",
  "source_videos": [
    {
      "url": "https://www.youtube.com/watch?v=...",
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
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Summary not found
- `401 Unauthorized` - Invalid token (if auth enabled)
- `403 Forbidden` - User doesn't own this summary

---

#### `GET /api/summary/:id`

Alias for `GET /api/history/:id`. Returns the same response.

---

## Preset Styles

| Preset Value | Name | Description | Max Length |
|-------------|------|-------------|------------|
| `tldr` | TL;DR | Ultra-concise summary | ~100 words |
| `bullet_points` | Bullet Points | Key points in bullet format | ~500 words |
| `deep_dive` | Deep Dive | Comprehensive analysis | ~2000 words |
| `tutorial` | Tutorial Code | Code-focused guide | ~1500 words |
| `detailed` | Detailed Blog Post | Full article-style summary | ~3000 words |

---

## Supported Languages

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

---

## Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_URL` | 400 | Malformed YouTube URL |
| `INVALID_PRESET` | 400 | Unknown preset style |
| `INVALID_LANGUAGE` | 400 | Unsupported language |
| `BATCH_SIZE_EXCEEDED` | 403 | Too many URLs for tier |
| `QUOTA_EXCEEDED` | 403 | Daily limit reached |
| `TRANSCRIPT_ERROR` | 400 | Video has no transcript |
| `VIDEO_UNAVAILABLE` | 400 | Video is private/deleted |
| `AI_API_ERROR` | 500 | Qwen API failure |
| `AI_API_TIMEOUT` | 504 | Qwen API timeout |
| `CONTEXT_WINDOW_EXCEEDED` | 400 | Aggregated content too large |
| `JOB_NOT_FOUND` | 404 | Invalid job_id |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## Rate Limiting

Rate limits are applied based on user tier and IP address:

- **General API:** 100 requests per 15 minutes per IP
- **Auth endpoints:** 10 requests per 15 minutes per IP
- **Summary requests:** Based on user tier quotas (daily limits)

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

---

## CORS Configuration

CORS is configured to allow requests from the frontend URL specified in `FRONTEND_URL` environment variable.

**Allowed:**
- Origin: `FRONTEND_URL` (e.g., `http://localhost:3000`)
- Methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- Headers: `Content-Type`, `Authorization`
- Credentials: Enabled (for JWT cookies)

---

## Request/Response Headers

**Request Headers:**
- `Authorization`: Bearer token (optional when auth disabled)
- `Content-Type`: `application/json` (for POST requests)
- `Accept`: `text/event-stream` (for SSE endpoint)

**Response Headers:**
- `X-Request-ID`: Unique request identifier for tracking
- `X-RateLimit-Limit`: Rate limit information
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Rate limit reset time

---

## Examples

### Creating a Summary Job

```bash
curl -X POST http://localhost:5000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    ],
    "preset": "bullet_points",
    "language": "English",
    "custom_prompt": "Focus on key takeaways"
  }'
```

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Watching Job Status (SSE)

```javascript
const jobId = "550e8400-e29b-41d4-a716-446655440000";
const eventSource = new EventSource(`http://localhost:5000/api/status/${jobId}`);

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Status: ${data.status}, Progress: ${data.progress}%`);
  
  if (data.chunk) {
    // Stream text chunks during generation
    console.log('Chunk:', data.chunk);
  }
  
  if (data.status === 'completed') {
    console.log('Summary:', data.data.final_summary_text);
    eventSource.close();
  }
  
  if (data.status === 'error') {
    console.error('Error:', data.error);
    eventSource.close();
  }
});
```

### Getting History

```bash
curl http://localhost:5000/api/history?page=1&limit=10
```

### Getting Summary by ID

```bash
curl http://localhost:5000/api/history/{summary-id}
```

---

## Testing

See `scripts/test-api.ts` for a terminal-based testing script, or run:

```bash
npm run test:api
```

For automated tests, run:

```bash
npm test
npm run test:coverage
```

