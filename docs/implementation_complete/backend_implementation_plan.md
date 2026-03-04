# Backend Implementation Plan: YouTube Batch Summary Service

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | 2024 |
| **Target Timeline** | 4-6 weeks |

## Table of Contents
1. [Overview](#overview)
2. [Implementation Phases](#implementation-phases)
3. [Phase 1: Project Setup & Foundation](#phase-1-project-setup--foundation)
4. [Phase 2: Authentication & User Management](#phase-2-authentication--user-management)
5. [Phase 3: Core Services - Transcript & AI Integration](#phase-3-core-services---transcript--ai-integration)
6. [Phase 4: Summary Pipeline & Business Logic](#phase-4-summary-pipeline--business-logic)
7. [Phase 5: Real-time Updates (SSE)](#phase-5-real-time-updates-sse)
8. [Phase 6: History & Library Management](#phase-6-history--library-management)
9. [Phase 7: Error Handling & Edge Cases](#phase-7-error-handling--edge-cases)
10. [Phase 8: Testing & Optimization](#phase-8-testing--optimization)
11. [Dependencies & Prerequisites](#dependencies--prerequisites)
12. [Risk Mitigation](#risk-mitigation)

---

## Overview

This implementation plan breaks down the backend development into 8 sequential phases, each building upon the previous phase. The plan prioritizes core functionality first, then adds real-time features, and finally polishes with error handling and optimization.

**Key Principles:**
- **Incremental Development**: Each phase delivers working, testable functionality
- **Fail-Fast Validation**: Implement validation early to catch issues
- **Separation of Concerns**: Services, controllers, and routes are clearly separated
- **Type Safety**: Leverage TypeScript throughout for maintainability
- **Testability**: Design services to be easily unit-testable
- **Optional Authentication**: Authentication is **optional** - the system works without OAuth for development and testing. Set `AUTH_ENABLED=false` to skip authentication entirely.

---

## Implementation Phases

| Phase | Focus | Estimated Time | Dependencies |
|-------|-------|----------------|--------------|
| **Phase 1** | Project Setup & Foundation | 1-2 days | None |
| **Phase 2** | Authentication & User Management | 2-3 days | Phase 1 |
| **Phase 3** | Core Services (Transcript & AI) | 3-4 days | Phase 1, Phase 2 |
| **Phase 4** | Summary Pipeline & Business Logic | 4-5 days | Phase 3 |
| **Phase 5** | Real-time Updates (SSE) | 2-3 days | Phase 4 |
| **Phase 6** | History & Library Management | 2 days | Phase 4 |
| **Phase 7** | Error Handling & Edge Cases | 2-3 days | Phase 4, Phase 5 |
| **Phase 8** | Testing & Optimization | 3-4 days | All phases |

**Total Estimated Time: 19-26 days (4-5 weeks)**

---

## Phase 1: Project Setup & Foundation

**Goal:** Establish the project structure, configuration system, database connection, and basic server setup.

### Tasks

#### 1.1 Initialize Project Structure
- [ ] Create `backend/` directory structure following `directory_structure.md`
- [ ] Initialize Node.js project with `npm init`
- [ ] Install core dependencies:
  - `express` (or `fastify`)
  - `typescript`
  - `ts-node`
  - `@types/node`, `@types/express`
  - `firebase-admin` (Firebase Admin SDK for Firestore)
  - `dotenv`
  - `yaml` (for config.yaml parsing)
  - `zod` (for environment variable validation)
- [ ] Install dev dependencies:
  - `nodemon`
  - `@typescript-eslint/eslint-plugin`
  - `@typescript-eslint/parser`
  - `eslint`
  - `prettier`

#### 1.2 TypeScript Configuration
- [ ] Create `tsconfig.json` with strict mode enabled
- [ ] Configure path aliases (e.g., `@/` for `src/`)
- [ ] Set up build scripts in `package.json`

#### 1.3 Configuration System
- [ ] Create `src/config/index.ts`:
  - Load and parse `config.yaml`
  - Export typed configuration object
  - Handle environment-specific overrides
- [ ] Create `src/config/env.ts`:
  - Use `zod` to validate environment variables
  - Export validated env object
  - **Add `AUTH_ENABLED` variable (optional boolean, default: `false`)**
  - Provide clear error messages for missing variables
  - **Make Google OAuth variables optional** (only required if `AUTH_ENABLED=true`)
- [ ] Create `.env.example` with all required variables:
  - Include `AUTH_ENABLED=false` with clear comment for development
  - Mark Google OAuth variables as optional
- [ ] Document configuration in README:
  - Explain development mode (auth disabled)
  - Explain production setup (auth enabled)

#### 1.4 Database Connection
- [ ] Create `src/config/database.ts`:
  - Initialize Firebase Admin SDK with service account credentials
  - Initialize Firestore database instance
  - Connection state logging
  - Export Firestore instance for use throughout app
  - Handle Firebase initialization errors gracefully

#### 1.5 Basic Server Setup
- [ ] Create `src/server.ts`:
  - Express/Fastify app initialization
  - Middleware setup (CORS, JSON parsing, logging)
  - **CORS Configuration**: Configure CORS to allow frontend origin (from env)
    - Allow credentials (for JWT cookies if used)
    - Set allowed methods and headers
    - Configure preflight handling
  - Health check endpoint (`GET /health`)
  - Error handling middleware (basic)
  - Server startup with graceful shutdown

#### 1.6 Logging System
- [ ] Create `src/utils/logger.ts`:
  - Structured logging (consider `winston` or `pino`)
  - Log levels (info, warn, error, debug)
  - Request logging middleware
  - Environment-aware formatting

#### 1.7 Project Documentation
- [ ] Create `backend/README.md`:
  - Setup instructions
  - Environment variables
  - Running the server
  - Project structure overview

### Deliverables
- ✅ Working server that starts and connects to Firebase Firestore
- ✅ Health check endpoint returns 200
- ✅ Configuration system loads `config.yaml` and environment variables
- ✅ TypeScript compiles without errors
- ✅ Basic logging in place

### Testing Checklist
- [ ] Server starts successfully
- [ ] Firebase Firestore connection established
- [ ] Health endpoint responds
- [ ] Configuration loads correctly
- [ ] Environment validation catches missing variables

---

## Phase 2: Authentication & User Management

**Goal:** Implement Google OAuth authentication, JWT token generation, and user model with quota management.

**Note:** Authentication is **optional** and can be disabled for development/testing. The system should work without authentication when `AUTH_ENABLED=false` in environment variables.

### Tasks

#### 2.1 User Model
- [ ] Create `src/models/User.ts`:
  - Define TypeScript interface: `email`, `googleId`, `name`, `tier`, `credits_remaining`, `created_at`
  - Create Firestore collection helpers: `getUserByEmail()`, `getUserByGoogleId()`, `createUser()`, `updateUser()`
  - Firestore queries with where clauses for `googleId` and `email` lookups
  - Methods: `resetDailyCredits()` (for cron job)
  - TypeScript interface/type export
- [ ] **Development Mode Support:**
  - Create a default "dev" user for testing when auth is disabled
  - Or allow `userId` to be optional/nullable in services

#### 2.2 Authentication Dependencies
- [ ] Install (as **optional dependencies** - only needed if auth is enabled):
  - `passport`
  - `passport-google-oauth20`
  - `jsonwebtoken`
  - `@types/passport`, `@types/passport-google-oauth20`, `@types/jsonwebtoken`
- [ ] **Configuration:**
  - Add `AUTH_ENABLED` environment variable (default: `false` for development)
  - Add to `src/config/env.ts` validation (optional boolean)
  - Document in `.env.example` with clear note about development mode

#### 2.3 Passport Strategy
- [ ] Create `src/config/passport.ts`:
  - **Conditional loading:** Only initialize if `AUTH_ENABLED=true`
  - Configure Google OAuth strategy (when enabled)
  - Handle user creation/retrieval
  - Link Google profile to User model
  - Export a check function: `isAuthEnabled()` - returns boolean

#### 2.4 Authentication Routes
- [ ] Create `src/routes/auth.routes.ts`:
  - **Conditional registration:** Only register routes if `AUTH_ENABLED=true`
  - `GET /auth/google` - Initiate OAuth flow (only when enabled)
  - `GET /auth/google/callback` - Handle OAuth callback (only when enabled)
  - `GET /auth/me` - Get current user info (protected, or returns dev user when disabled)
  - `POST /auth/logout` - Logout endpoint (optional, for token invalidation)
  - `POST /auth/refresh` - Refresh JWT token (optional, for long sessions)
- [ ] Create `src/controllers/auth.controller.ts`:
  - `initiateGoogleAuth()` - Redirect to Google (or return 501 if disabled)
  - `handleGoogleCallback()` - Process callback, create JWT, redirect to frontend
  - `getCurrentUser()` - Return user info, credits, and quota details
    - **When auth disabled:** Return default dev user or mock user data
  - `logout()` - Handle logout (optional: invalidate token)
  - `refreshToken()` - Issue new JWT token (optional)

#### 2.5 JWT Middleware
- [ ] Create `src/middleware/auth.middleware.ts`:
  - `verifyToken()` - Validate JWT token (or return dev user when auth disabled)
  - `requireAuth()` - Express middleware for protected routes
    - **When `AUTH_ENABLED=false`:** Skip validation, attach default dev user to `req.user`
    - **When `AUTH_ENABLED=true`:** Validate JWT token as normal
  - Extract user from token and attach to `req.user`
  - **Development helper:** `getDevUser()` - Returns a mock user object for testing

#### 2.6 Quota Service
- [ ] Create `src/services/quota.service.ts`:
  - `checkQuota(userId)` - Verify user has credits remaining
    - **When auth disabled:** Always return true (unlimited for dev)
  - `deductCredit(userId)` - Decrement credits after job
    - **When auth disabled:** Skip deduction (no-op)
  - `getQuotaInfo(userId)` - Return current quota status with:
    - `credits_remaining`: number
    - `tier`: 'free' | 'premium'
    - `daily_limit`: number (from config)
    - `max_videos_per_batch`: number (from config)
    - `reset_time`: Date (next reset time)
    - **When auth disabled:** Return unlimited quota (or high default values)
  - `validateBatchSize(userId, urlCount)` - Check against tier limits
    - **When auth disabled:** Use maximum allowed from config (or skip check)
  - Use `config.yaml` for tier limits

#### 2.7 Quota Middleware
- [ ] Create `src/middleware/quota.middleware.ts`:
  - `checkQuotaMiddleware()` - Verify quota before processing
    - **When auth disabled:** Skip check (always pass)
  - `checkBatchSizeMiddleware()` - Validate URL count against tier
    - **When auth disabled:** Use maximum from config or skip validation

#### 2.8 Daily Credit Reset (Cron Job)
- [ ] Install `node-cron`
- [ ] Create `src/jobs/resetCredits.job.ts`:
  - Cron job to reset `credits_remaining` daily at midnight
  - Update all users based on their tier
  - Log reset operations

### Deliverables
- ✅ **Authentication is optional** - System works without auth for development
- ✅ When enabled: Users can authenticate via Google OAuth
- ✅ When enabled: JWT tokens are generated and validated
- ✅ Protected routes work with or without authentication
- ✅ Quota system enforces tier limits (or bypasses when auth disabled)
- ✅ Daily credit reset runs automatically (only when auth enabled)
- ✅ **Development mode:** All endpoints work without OAuth setup

### Testing Checklist
- [ ] **System works with `AUTH_ENABLED=false`** (no OAuth setup required)
- [ ] All endpoints accessible without authentication when disabled
- [ ] Quota checks are bypassed when auth disabled
- [ ] When enabled: Google OAuth flow completes successfully
- [ ] When enabled: JWT token is generated and valid
- [ ] When enabled: Protected routes reject unauthenticated requests
- [ ] When enabled: Quota middleware blocks requests when credits exhausted
- [ ] When enabled: Batch size validation works for free/premium tiers
- [ ] User model saves and retrieves correctly

---

## Phase 3: Core Services - Transcript & AI Integration

**Goal:** Build the foundational services for fetching transcripts and calling AI APIs. These services will be used by the summary pipeline.

### Tasks

#### 3.1 Transcript Service
- [ ] Create `src/services/transcript.service.ts`:
  - `fetchTranscript(url)` - Single video transcript fetch
  - `fetchTranscriptsBatch(urls)` - Parallel batch fetch
  - Error handling for unavailable videos
  - Return structure: `{ url, title, channel, thumbnail, duration_seconds, transcript_text, error? }`
  - Use Supadata API (configure API key from env)
  - Implement retry logic (1 retry on failure)

#### 3.2 URL Validation Utility
- [ ] Create `src/utils/validators.ts`:
  - `validateYouTubeUrl(url)` - Regex validation for YouTube URLs
  - `validateYouTubeUrls(urls)` - Batch validation
  - Support both `youtube.com` and `youtu.be` formats
  - Return validation errors with line numbers

#### 3.3 AI Service - Qwen Integration
- [ ] Install HTTP client (`axios` or `node-fetch`)
- [ ] Create `src/services/ai.service.ts`:
  - `callQwenFlash(prompt, transcript)` - For pre-condensing long videos
  - `callQwenPlus(prompt, aggregatedText)` - For final summary generation
  - `callQwenMax(prompt, aggregatedText)` - Optional premium model
  - Error handling and retry logic
  - Token counting/estimation (optional, for cost tracking)
  - Use DashScope API (configure API key from env)

#### 3.4 Prompt Templates System
- [ ] Create `src/prompts/index.ts`:
  - Prompt loader/manager
  - Export prompt functions
- [ ] Create `src/prompts/pre-condense.prompt.ts`:
  - System prompt for condensing long videos (70% reduction)
  - Preserve technical details, numbers, arguments
- [ ] Create `src/prompts/final-summary.prompt.ts`:
  - Base template for final summary generation
  - Accepts: `presetStyle`, `customPrompt`, `language`, `context`
- [ ] Create `src/prompts/templates/` directory:
  - `detailed.prompt.ts` - Detailed blog post style
  - `bullet-points.prompt.ts` - Bullet points style
  - `tutorial.prompt.ts` - Tutorial/code-focused style
  - `tldr.prompt.ts` - TL;DR style

#### 3.5 Summary Model
- [ ] Create `src/models/Summary.ts`:
  - Define TypeScript interface matching PRD specification:
    - `user_id` (Firestore document ID reference)
    - `batch_title`
    - `source_videos[]` (nested objects)
    - `user_prompt_focus`
    - `preset_style`
    - `final_summary_text`
    - `language`
    - `created_at`
  - Create Firestore collection helpers: `createSummary()`, `getSummaryById()`, `getSummariesByUserId()`
  - Firestore queries with where clauses and ordering for `user_id` and `created_at`
  - TypeScript interface export

### Deliverables
- ✅ Transcript service fetches from Supadata (single and batch)
- ✅ AI service calls Qwen APIs (flash and plus models)
- ✅ Prompt templates are organized and reusable
- ✅ URL validation works correctly
- ✅ Summary model is defined and ready

### Testing Checklist
- [ ] Transcript service handles valid URLs
- [ ] Transcript service handles unavailable videos gracefully
- [ ] Batch transcript fetch runs in parallel
- [ ] AI service successfully calls Qwen APIs
- [ ] Prompt templates generate correct prompts
- [ ] URL validator catches invalid YouTube URLs
- [ ] Summary model saves and retrieves correctly

---

## Phase 4: Summary Pipeline & Business Logic

**Goal:** Implement the core "Fail-All" validation, Smart Context logic, and final summary generation pipeline.

### Tasks

#### 4.1 Summary Service - Core Pipeline
- [ ] Create `src/services/summary.service.ts`:
  - `processBatch(userId, request)` - Main orchestration function
    - **`userId` can be null/optional** when auth is disabled
    - Use default dev user ID or skip user-specific logic when auth disabled
  - Implement "Fail-All" validation:
    - Validate all URLs upfront
    - Fetch all transcripts in parallel
    - If ANY transcript fails, abort entire batch
    - Return clear error message with failed video URL
  - Implement "Smart Context" logic:
    - Iterate through successful transcripts
    - Check length: duration > 60min OR word count > 8000
    - For long videos: call `qwen-flash` to condense
    - Build `final_context_buffer` (mix of raw + condensed)
  - Final generation:
    - Combine context buffer + user prompt + preset style
    - Call `qwen-plus` (or `qwen-max` for premium)
    - Generate final summary
  - Save to database:
    - Create Summary document
    - Link to user
    - Store all metadata

#### 4.2 Job Management
- [ ] Create `src/services/job.service.ts`:
  - `createJob(userId, request)` - Generate unique job_id
  - `getJobStatus(jobId)` - Retrieve job status
  - `updateJobStatus(jobId, status, data?)` - Update job progress
  - Store jobs in memory (Map) or Redis (optional, for persistence)
  - Job states: `pending`, `fetching`, `processing`, `condensing`, `aggregating`, `generating`, `completed`, `error`

#### 4.3 Summary Controller
- [ ] Create `src/controllers/summary.controller.ts`:
  - `createSummaryJob()` - POST handler
    - Validate request body
    - Check quota (via middleware)
    - Create job
    - Start async processing (don't await)
    - Return `{ job_id }` immediately
  - Handle errors and return appropriate status codes

#### 4.4 Summary Routes
- [ ] Create `src/routes/summarize.routes.ts`:
  - `POST /api/summarize` - Create summary job
    - Middleware: `requireAuth` (optional - skips when auth disabled), `checkQuotaMiddleware` (optional), `checkBatchSizeMiddleware` (optional)
    - Request body validation
    - Call controller
    - **Works without authentication** - middleware handles both cases

#### 4.5 Request/Response Types
- [ ] Create `src/types/summary.types.ts`:
  - `SummaryRequest` - Input type:
    - `urls`: string[]
    - `preset`: 'tldr' | 'deep_dive' | 'tutorial' | 'bullet_points' | 'detailed'
    - `custom_prompt?`: string (optional, max 500 chars)
    - `language`: string (default: 'English')
  - `SummaryResponse` - Output type (for completed summary)
  - `JobResponse` - Response from POST /api/summarize: `{ job_id: string }`
  - `JobStatus` - Job status enum
  - `SourceVideo` - Video metadata type:
    - `url`: string
    - `title`: string
    - `channel`: string
    - `thumbnail`: string
    - `duration_seconds`: number
    - `was_pre_condensed`: boolean
  - `SummaryProgress` - SSE event type (matches frontend expectations)
  - Export all types for potential use in `shared/types/` directory

#### 4.6 Integration Testing
- [ ] Test full pipeline with sample URLs:
  - Short videos (< 60min)
  - Long videos (> 60min)
  - Mixed batch
  - Invalid URL handling
  - Unavailable video handling

### Deliverables
- ✅ Complete summary pipeline processes batches end-to-end
- ✅ "Fail-All" validation aborts on any transcript failure
- ✅ Smart context condenses long videos before aggregation
- ✅ Final summary is generated and saved to database
- ✅ Job system tracks processing status

### Testing Checklist
- [ ] Batch with all valid URLs processes successfully
- [ ] Batch with one invalid URL aborts immediately
- [ ] Long videos are pre-condensed before final summary
- [ ] Short videos use raw transcripts
- [ ] Final summary is coherent and follows preset style
- [ ] Summary document is saved with correct metadata
- [ ] Job status updates correctly throughout pipeline

---

## Phase 5: Real-time Updates (SSE)

**Goal:** Implement Server-Sent Events (SSE) to stream progress updates to the frontend in real-time.

**Frontend Dependencies:**
- Frontend expects `text_chunk` events for streaming markdown content
- Frontend needs SSE reconnection support for network reliability
- Frontend requires consistent event format across all stages

### Tasks

#### 5.1 SSE Utility
- [ ] Create `src/utils/sse.ts`:
  - `createSSEConnection(res)` - Set up SSE response headers
  - `sendSSEEvent(res, event, data)` - Send formatted SSE event
  - `closeSSEConnection(res)` - Clean up connection
  - Handle client disconnection gracefully

#### 5.2 Job Status Streaming
- [ ] Modify `src/services/summary.service.ts`:
  - Accept optional `progressCallback` parameter
  - Emit progress events at key stages:
    - `fetching_transcripts` (progress: 10%)
    - `processing_video_X_long_content` (progress: 40%)
    - `aggregating` (progress: 70%)
    - `generating_final_summary` (progress: 85%)
    - `completed` (progress: 100%, include summary data)
    - `error` (include error message)
  - **Text Chunk Streaming**: When AI generates summary, stream text chunks:
    - Emit `text_chunk` events as AI response arrives (if Qwen API supports streaming)
    - Or emit chunks in batches if streaming not available
    - Frontend expects incremental text updates for real-time display
  - Calculate progress percentages dynamically

#### 5.3 SSE Route Handler
- [ ] Create `GET /api/status/:job_id` route in `src/routes/summarize.routes.ts`:
  - Set SSE headers
  - Validate job_id exists
  - Check user owns the job (security)
  - Stream status updates from job service
  - Handle client disconnect
  - Clean up on completion/error

#### 5.4 Job-Progress Bridge
- [ ] Modify job service to support SSE:
  - Store active SSE connections per job
  - When job status updates, broadcast to all connected clients
  - Remove connections on completion/error

#### 5.5 Error Event Formatting
- [ ] Standardize SSE event format:
  ```typescript
  {
    status: 'fetching_transcripts' | 'processing' | ... | 'completed' | 'error',
    progress: number, // 0-100
    message?: string, // Optional status message
    data?: any, // Final summary data on completion
    error?: string, // Error message on failure
    chunk?: string // Text chunk for streaming (when status is 'generating_final_summary')
  }
  ```
- [ ] Ensure all SSE events follow consistent structure
- [ ] Document event types and formats for frontend team

#### 5.6 Connection Management
- [ ] Implement connection timeout (e.g., 5 minutes)
- [ ] Handle multiple clients connecting to same job
- [ ] Log connection/disconnection events
- [ ] **SSE Reconnection Support**: 
  - Send periodic heartbeat/keepalive messages (every 30 seconds)
  - Allow clients to reconnect and resume from last known status
  - Store job status in job service for reconnection queries
  - Handle client reconnection gracefully without duplicating events

### Deliverables
- ✅ SSE endpoint streams real-time progress updates
- ✅ Progress events are emitted at all pipeline stages
- ✅ **Text chunks are streamed during final summary generation** (critical for frontend)
- ✅ Frontend can connect and receive updates
- ✅ **SSE reconnection is supported with heartbeat/keepalive**
- ✅ Connections are cleaned up properly
- ✅ Error events are formatted correctly
- ✅ **Event format matches frontend expectations**

### Testing Checklist
- [ ] SSE connection establishes successfully
- [ ] Progress events are received in correct order
- [ ] Progress percentages are accurate
- [ ] **Text chunk events are received during final generation**
- [ ] Completion event includes full summary data
- [ ] Error events are sent on failures
- [ ] Multiple clients can connect to same job
- [ ] **Client reconnection resumes from last status**
- [ ] **Heartbeat/keepalive messages prevent connection timeout**
- [ ] Connections close gracefully on completion
- [ ] Client disconnect is handled without errors

---

## Phase 6: History & Library Management

**Goal:** Implement endpoints for users to view their past summaries and retrieve specific summary details.

### Tasks

#### 6.1 History Controller
- [ ] Create `src/controllers/history.controller.ts`:
  - `getHistory()` - GET handler for paginated list
    - Query by `user_id` (from auth token)
    - Pagination: `page`, `limit` query params
    - Sort by `created_at` descending
    - Return: `_id`, `batch_title`, `created_at`, `source_videos[]` (thumbnails only)
  - `getSummaryById()` - GET handler for single summary
    - Validate `user_id` owns the summary (security)
    - Return full summary document

#### 6.2 History Routes
- [ ] Create `src/routes/history.routes.ts`:
  - `GET /api/history` - List user's summaries
    - Middleware: `requireAuth` (optional - works without auth)
    - Query params: `page`, `limit`
    - **When auth disabled:** Return all summaries or mock data
  - `GET /api/history/:id` - Get specific summary
    - Middleware: `requireAuth` (optional)
    - Validate ownership (skip when auth disabled)
  - **Alternative endpoint for consistency**: `GET /api/summary/:id` (alias to `/api/history/:id`)
    - Frontend may reference this endpoint
    - Ensure both endpoints work identically

#### 6.3 Response Formatting
- [ ] Format history list response:
  ```typescript
  {
    summaries: SummaryListItem[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
  ```
- [ ] Format single summary response (full document)

#### 6.4 Batch Title Generation
- [ ] Enhance summary service:
  - Generate `batch_title` if not provided
  - Format: "Summary of X Videos" or use first video title
  - Store in Summary document

### Deliverables
- ✅ Users can retrieve paginated list of their summaries
- ✅ Users can view full details of any summary
- ✅ Ownership validation prevents unauthorized access
- ✅ Pagination works correctly

### Testing Checklist
- [ ] History endpoint returns user's summaries only
- [ ] Pagination works (page, limit)
- [ ] Single summary endpoint returns full details
- [ ] Unauthorized access to other user's summary is blocked
- [ ] Batch titles are generated correctly
- [ ] Response format matches specification

---

## Phase 7: Error Handling & Edge Cases

**Goal:** Implement comprehensive error handling, edge case management, and improve system robustness.

### Tasks

#### 7.1 Error Middleware
- [ ] Create `src/middleware/error.middleware.ts`:
  - Centralized error handler
  - Format error responses consistently with structure:
    ```typescript
    {
      error: {
        code: string, // e.g., 'QUOTA_EXCEEDED', 'INVALID_URL', 'TRANSCRIPT_ERROR'
        message: string, // User-friendly message
        details?: any // Optional additional context
      }
    }
    ```
  - Log errors appropriately
  - Handle different error types:
    - Validation errors (400) - Include field-level errors if applicable
    - Authentication errors (401) - Clear message about token expiration
    - Authorization errors (403) - Include quota/rate limit details
    - Not found errors (404)
    - API errors (500) - Generic message for user, detailed in logs
    - Timeout errors (504)
  - **User-Friendly Messages**: Ensure all error messages are actionable for frontend display

#### 7.2 Custom Error Classes
- [ ] Create `src/utils/errors.ts`:
  - `ValidationError` - For invalid input
  - `QuotaExceededError` - For quota violations
  - `TranscriptError` - For transcript fetch failures
  - `AIError` - For AI API failures
  - `JobNotFoundError` - For invalid job IDs
  - Each error includes appropriate HTTP status code

#### 7.3 Retry Logic Enhancement
- [ ] Enhance transcript service:
  - Retry on network errors (max 2 retries)
  - Exponential backoff
  - Distinguish retryable vs non-retryable errors
- [ ] Enhance AI service:
  - Retry on timeout errors
  - Retry on rate limit errors (with backoff)
  - Don't retry on invalid prompt errors

#### 7.4 Timeout Handling
- [ ] Set timeouts for external API calls:
  - Supadata: 30 seconds
  - Qwen APIs: 60 seconds
  - Overall job timeout: 10 minutes
- [ ] Handle timeout errors gracefully
- [ ] Return clear timeout error messages

#### 7.5 Edge Case Handling
- [ ] Handle empty transcript (video has no transcript)
- [ ] Handle very short videos (< 1 minute)
- [ ] Handle videos with only auto-generated captions
- [ ] Handle batch with duplicate URLs (deduplicate)
- [ ] Handle batch exceeding context window (split or error)
- [ ] Handle user quota reset during processing

#### 7.6 Input Validation
- [ ] Enhance `src/utils/validators.ts`:
  - Validate preset style (enum check) - must match frontend options
  - Validate language (supported languages list) - must match frontend dropdown
  - Validate custom prompt length (max 500 chars)
  - Validate URL count against tier limits
  - Sanitize inputs (prevent injection)
  - **Return validation errors in format frontend expects**:
    ```typescript
    {
      field: string, // e.g., 'urls', 'preset'
      message: string,
      value?: any // Invalid value
    }
    ```

#### 7.7 Rate Limiting
- [ ] Install `express-rate-limit`
- [ ] Create rate limiting middleware:
  - Per-user rate limiting
  - Per-IP rate limiting (for auth endpoints)
  - Different limits for free vs premium

#### 7.8 Logging Enhancement
- [ ] Add structured error logging:
  - Log all API errors with context
  - Log job failures with full details
  - Log quota violations
  - Log authentication failures
- [ ] Add performance logging:
  - Log job processing times
  - Log API call durations

### Deliverables
- ✅ Comprehensive error handling covers all scenarios
- ✅ Custom error classes provide clear error messages
- ✅ Retry logic handles transient failures
- ✅ Timeouts prevent hanging requests
- ✅ Edge cases are handled gracefully
- ✅ Input validation prevents invalid data

### Testing Checklist
- [ ] Invalid URLs return 400 with clear message
- [ ] Quota exceeded returns 403
- [ ] Unauthenticated requests return 401
- [ ] Transcript failures abort batch correctly
- [ ] AI API timeouts are handled
- [ ] Rate limiting blocks excessive requests
- [ ] Edge cases (empty transcript, duplicates) handled
- [ ] Error messages are user-friendly

---

## Phase 8: Testing & Optimization

**Goal:** Write comprehensive tests, optimize performance, and prepare for production deployment.

### Tasks

#### 8.1 Unit Tests
- [ ] Install testing framework (`jest` or `vitest`)
- [ ] Write unit tests for:
  - `transcript.service.ts` (mock Supadata API)
  - `ai.service.ts` (mock Qwen API)
  - `quota.service.ts`
  - `validators.ts`
  - Prompt template functions
- [ ] Achieve > 80% code coverage

#### 8.2 Integration Tests
- [ ] Write integration tests for:
  - Authentication flow
  - Summary pipeline (with mocked external APIs)
  - SSE connection and events
  - History endpoints
- [ ] Use test database (separate from dev)

#### 8.3 Performance Optimization
- [ ] Optimize Firestore queries:
  - Create composite indexes in Firebase Console for compound queries (user_id + created_at)
  - Use field selection to limit returned data
  - Implement query result caching (optional)
  - Use Firestore query pagination for large result sets
- [ ] Optimize transcript fetching:
  - Ensure parallel execution
  - Limit concurrent requests (respect API limits)
- [ ] Optimize AI calls:
  - Batch processing where possible
  - Cache common prompts (optional)

#### 8.4 Monitoring & Observability
- [ ] Add request ID tracking (correlation IDs)
- [ ] Add metrics collection:
  - Job success/failure rates
  - Average processing time
  - API call latencies
  - Quota usage statistics
- [ ] Consider adding APM tool (optional: New Relic, Datadog)

#### 8.5 Documentation
- [ ] Create API documentation:
  - Endpoint specifications with request/response schemas
  - Request/response examples (JSON)
  - Error codes and messages (complete list)
  - Authentication flow (step-by-step)
  - **SSE event format documentation** (critical for frontend):
    - All event types and their structure
    - Text chunk streaming format
    - Reconnection behavior
    - Example SSE event sequences
  - **CORS configuration** for frontend integration
- [ ] Update `backend/README.md`:
  - Deployment instructions
  - Environment variables
  - Database setup
  - Running tests
  - **Frontend integration guide** (API base URL, CORS setup, etc.)

#### 8.6 Security Hardening
- [ ] Security audit:
  - Validate all user inputs
  - Sanitize outputs
  - Check for NoSQL injection (validate Firestore queries)
  - Check for XSS vulnerabilities
  - Validate JWT token expiration
- [ ] Add CORS configuration (restrict to frontend URL)
- [ ] Add helmet.js for security headers
- [ ] Review and secure environment variables

#### 8.7 Production Readiness
- [ ] Create production environment configuration
- [ ] Set up logging aggregation (optional)
- [ ] Create deployment scripts
- [ ] Document scaling considerations
- [ ] Configure Firestore backup/export strategy (Firebase provides automatic backups)
- [ ] Set up health check monitoring

#### 8.8 Code Quality
- [ ] Run linter and fix all issues
- [ ] Format code with Prettier
- [ ] Review code for best practices
- [ ] Remove console.logs, replace with logger
- [ ] Add JSDoc comments to public functions

### Deliverables
- ✅ Comprehensive test suite (> 80% coverage)
- ✅ Performance optimizations implemented
- ✅ API documentation complete
- ✅ Security audit passed
- ✅ Production deployment ready

### Testing Checklist
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Performance benchmarks meet targets
- [ ] Security vulnerabilities addressed
- [ ] Documentation is complete and accurate
- [ ] Code quality checks pass

---

## Dependencies & Prerequisites

### External Services Required
1. **Firebase Firestore** (cloud database)
   - **Development:** Use Firebase Emulator Suite for local testing
     - Install Firebase CLI: `npm install -g firebase-tools`
     - Initialize emulator: `firebase init emulators`
     - Start emulators: `firebase emulators:start`
     - No cloud setup needed for local testing
   - **Production:** Firebase Firestore (cloud) - free tier available
     - Service account key file required (JSON)
     - Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
     - Or use Firebase Admin SDK with service account
   - **Note:** Connection is required - your app connects to Firestore (emulator for dev, cloud for production)

2. **Supadata API**
   - API key required (already in config.yaml)
   - Used for transcript fetching

3. **DashScope (Qwen AI)**
   - API key required (already in config.yaml)
   - Used for AI summarization

4. **Google OAuth** (Optional - only if `AUTH_ENABLED=true`)
   - Client ID and Secret required
   - Callback URL must be configured
   - **Can be skipped for development/testing** - set `AUTH_ENABLED=false`

### Development Tools
- Node.js 18+ (LTS recommended)
- npm or yarn
- Firebase CLI (for emulator)
- Git

### Environment Setup

**For Local Development:**
1. Clone repository
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Initialize Firebase project (if not done): `firebase init`
4. Set up Firebase Emulator Suite:
   - Run `firebase init emulators` and select Firestore
   - Or manually configure `firebase.json` for emulators
5. Copy `.env.example` to `.env`
6. Set `FIRESTORE_EMULATOR_HOST=localhost:8080` (for emulator)
7. Set `GOOGLE_APPLICATION_CREDENTIALS` to path of service account key (or use emulator)
8. Set `AUTH_ENABLED=false` (no OAuth setup needed for testing)
9. Install dependencies: `npm install`
10. Start Firebase emulators: `firebase emulators:start` (in separate terminal)
11. Run server: `npm run dev`

**For Production (Firebase Hosting/Functions):**
- Use Firebase Firestore (cloud) - no separate database setup needed
- Set `GOOGLE_APPLICATION_CREDENTIALS` to service account key path
- Or use Firebase Functions default credentials (automatic)
- Set `AUTH_ENABLED=true` and configure Google OAuth

**Note:** The backend can run and be tested **without any authentication setup**. Simply set `AUTH_ENABLED=false` in your `.env` file.

---

## Risk Mitigation

### High-Risk Areas

1. **External API Failures**
   - **Risk:** Supadata or Qwen API downtime
   - **Mitigation:** 
     - Implement retry logic with exponential backoff
     - Add fallback error messages
     - Monitor API health
     - Consider caching transcripts (future)

2. **Context Window Limits**
   - **Risk:** Very large batches exceed AI context window
   - **Mitigation:**
     - Pre-condense long videos (already planned)
     - Enforce batch size limits
     - Consider chunking for extremely large batches (future)

3. **Cost Management**
   - **Risk:** AI API costs can escalate
   - **Mitigation:**
     - Implement quota system (already planned)
     - Monitor API usage
     - Set up cost alerts
     - Use cheaper models (qwen-flash) for pre-condensing

4. **Concurrent Job Overload**
   - **Risk:** Too many simultaneous jobs crash server
   - **Mitigation:**
     - Implement `max_concurrent_jobs` limit (in config.yaml)
     - Use job queue (consider Bull/BullMQ in future)
     - Add rate limiting

5. **SSE Connection Management**
   - **Risk:** Too many open SSE connections
   - **Mitigation:**
     - Implement connection timeout
     - Clean up disconnected clients
     - Monitor connection count

### Medium-Risk Areas

1. **Database Performance**
   - **Risk:** Slow queries with large user base
   - **Mitigation:** Add indexes, optimize queries (Phase 8)

2. **Token Expiration**
   - **Risk:** Long-running jobs fail due to expired tokens
   - **Mitigation:** Validate token at job start, not during processing

3. **Data Loss**
   - **Risk:** Job failures lose user data
   - **Mitigation:** Save partial results, implement retry mechanism

---

## Success Criteria

The backend implementation is considered complete when:

1. ✅ All 8 phases are implemented and tested
2. ✅ Users can authenticate via Google OAuth
3. ✅ Users can submit batch URLs and receive summaries
4. ✅ Real-time progress updates work via SSE
5. ✅ Users can view their summary history
6. ✅ Error handling covers all edge cases
7. ✅ Test coverage exceeds 80%
8. ✅ API documentation is complete
9. ✅ System is ready for production deployment

---

## Next Steps After Implementation

1. **Frontend Integration**
   - Connect frontend to backend APIs
   - Test end-to-end user flow
   - Debug integration issues

2. **Performance Monitoring**
   - Set up monitoring dashboards
   - Track key metrics
   - Optimize based on real usage

3. **Feature Enhancements**
   - Export summaries (PDF, Markdown)
   - Share summaries with others
   - Advanced filtering in history
   - Batch scheduling

4. **Scaling Considerations**
   - Implement job queue (Redis + Bull)
   - Add horizontal scaling support
   - Implement caching layer
   - Database sharding (if needed)

---

## Notes

- This plan assumes sequential development, but some tasks can be parallelized (e.g., writing tests while implementing features)
- Adjust timelines based on team size and experience
- Regular code reviews after each phase are recommended
- Keep PRD and this plan in sync as requirements evolve

## Frontend Integration Considerations

### Critical Dependencies for Frontend Development

The following items are **essential** for frontend Phase 4 (API Integration) to proceed:

1. **SSE Text Streaming** (Phase 5):
   - Frontend expects `text_chunk` events during final summary generation
   - Must be implemented before frontend can test streaming markdown display
   - Consider Qwen API streaming capabilities or implement chunked responses

2. **CORS Configuration** (Phase 1):
   - Must be configured early to allow frontend development
   - Frontend will be on different origin (localhost:3000 vs localhost:5000)

3. **Error Response Format** (Phase 7):
   - Frontend expects consistent error structure with `code` and `message` fields
   - User-friendly messages are critical for frontend error handling

4. **API Endpoint Consistency**:
   - Frontend references `/api/summary/:id` - ensure this endpoint exists or document alias
   - All endpoints must match frontend expectations

5. **Quota Information in Auth** (Phase 2):
   - `/auth/me` must return complete quota information for frontend display
   - Frontend needs this to show user their remaining credits

### Recommended Development Order

For parallel frontend/backend development:

1. **Week 1-2**: Backend Phases 1-3 (Setup, Auth, Core Services)
   - Frontend can work on Phases 1-3 (Setup, Auth UI, Dashboard Components)
   - Mock API responses for frontend testing

2. **Week 3**: Backend Phase 4 (Summary Pipeline)
   - Frontend Phase 4 can begin with mock SSE events
   - Backend should prioritize SSE implementation (Phase 5) early

3. **Week 4**: Backend Phases 5-6 (SSE, History)
   - Frontend Phase 4 can integrate with real backend
   - Frontend Phase 6 (History) can proceed

4. **Week 5**: Backend Phases 7-8 (Error Handling, Testing)
   - Frontend Phase 7 (Polish) can proceed
   - End-to-end testing together

### API Contract Documentation

Before frontend Phase 4 begins, provide:
- Complete API endpoint list with request/response schemas
- SSE event format specification
- Error code reference
- Example API calls (curl or Postman collection)

