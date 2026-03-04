# YouTube Batch Summary Service - Backend

Backend service for generating comprehensive summaries from multiple YouTube videos using AI.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** Firebase Firestore
- **External APIs:** Supadata (transcripts), DashScope/Qwen (AI)

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Firebase CLI (for local emulator) - Optional
- Firebase project with Firestore enabled (for production)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `backend/` directory based on `.env.example`:

```bash
# Copy example file
cp .env.example .env
```

**Required Environment Variables:**
- `SUPADATA_API_KEY` - API key for Supadata transcript service
- `DASHSCOPE_BEIJING_API_KEY` - API key for Qwen/DashScope AI service (Beijing endpoint)

**Optional (for local development):**
- `AUTH_ENABLED=false` - Disables authentication (no OAuth setup needed)
- `FIRESTORE_EMULATOR_HOST=localhost:8080` - Use Firebase emulator
- `FRONTEND_URL` - Frontend URL for share link generation (default: `http://localhost:3000`)

### 3. Firebase Setup

#### Option A: Local Development with Emulator (Recommended for Testing)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize Firebase project (if not done):
   ```bash
   firebase init
   ```

3. Start Firestore emulator:
   ```bash
   firebase emulators:start --only firestore
   ```

4. Set in `.env`:
   ```
   FIRESTORE_EMULATOR_HOST=localhost:8080
   ```

#### Option B: Production (Cloud Firestore)

1. Create a Firebase project in [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore
3. Generate service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely
4. Set in `.env`:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
   ```

### 4. Configuration File

The `config.yaml` file contains system configuration (limits, tiers, AI models). Edit as needed for your environment.

### 5. Run the Server

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000` (or the port specified in `.env`).

## Local Development

### Quick Start

For complete local development setup, see the **[Local Development Guide](../../docs/LOCAL_DEVELOPMENT_GUIDE.md)**.

### Local Storage Mode

The backend supports **local file storage** for development and testing, eliminating the need for Firebase setup:

1. **Enable local storage:**
   ```bash
   # In backend/.env
   USE_LOCAL_STORAGE=true
   ```

2. **Initialize directories:**
   ```bash
   npm run dev:setup
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

Summaries will be saved as JSON files in `backend/data/summaries/` instead of Firestore.

**Benefits:**
- ✅ No Firebase configuration needed
- ✅ Fast iteration (no network calls)
- ✅ Easy debugging (inspect JSON files directly)
- ✅ Works offline

For more details, see [LOCAL_STORAGE_README.md](../docs/LOCAL_STORAGE_README.md).

### Development Mode (No Authentication)

For development and testing, you can disable authentication:

1. Set `AUTH_ENABLED=false` in `.env`
2. Set `USE_LOCAL_STORAGE=true` for local file storage
3. All endpoints will work without OAuth setup
4. Quota checks are bypassed
5. No Google OAuth configuration needed

**Development User Configuration:**

When `AUTH_ENABLED=false`, the backend uses a development user. Configure in `.env`:

```bash
DEV_USER_ID=dev-user-id
DEV_USER_EMAIL=dev@example.com
DEV_USER_NAME=Development User
```

**Important:** The frontend `NEXT_PUBLIC_DEV_USER_ID` must match `DEV_USER_ID` for history to work correctly.

### Development Scripts

- `npm run dev:setup` - Initialize local development environment
- `npm run dev:reset` - Clear all local test data (with optional backup)
- `npm run dev:seed` - Generate sample test data
- `npm run dev:validate` - Validate local development configuration

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration management
│   ├── models/          # Database models (to be added)
│   ├── routes/          # API routes (to be added)
│   ├── controllers/     # Request handlers (to be added)
│   ├── services/        # Business logic (to be added)
│   ├── middleware/      # Express middleware (to be added)
│   ├── utils/           # Utility functions
│   └── server.ts        # Main entry point
├── config.yaml          # System configuration
├── package.json
└── tsconfig.json
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Root
- `GET /` - API information

### Share Feature (Phase 4)

The share feature allows users to generate persistent, reusable shareable links for their research summaries.

**Endpoints:**
- `POST /api/research/:researchId/share` - Create or retrieve existing share link (requires authentication)
- `GET /api/shared/:shareId` - Get shared research data (public endpoint, no auth required)

**Rate Limiting:**
- Share creation: 10 shares per user per hour
- Share access: 100 requests per IP per hour

**Configuration:**
- `FRONTEND_URL` environment variable is used to generate share URLs
- Development: `http://localhost:3000/shared/[shareId]`
- Production: `${FRONTEND_URL}/shared/[shareId]`

**Storage:**
- Shares are stored in Firestore `shared_links` collection (or local JSON files in dev mode)
- Each share link is persistent and reusable (same link returned for same research)

For complete share feature documentation, see [`docs/SHARE_FEATURE_PRD.md`](../docs/SHARE_FEATURE_PRD.md).

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run unit and integration tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:api` - Run interactive terminal-based API testing script

## Environment Variables

See `env.example.txt` for all available environment variables and their descriptions.

**Configuration Priority:**
1. Environment variables (`.env` file) - Highest priority
2. `config.yaml` - System configuration
3. Default values - Hardcoded fallbacks

All configuration values are centralized - no hardcoded values in code. See [Configuration Guide](../../docs/local_development_environment_prd.md) for details.

## Logging

The application uses structured logging:
- **Development:** Human-readable format
- **Production:** JSON format

Log levels: `error`, `warn`, `info`, `debug`

Set log level via `LOG_LEVEL` environment variable.

## CORS Configuration

CORS is configured to allow requests from the frontend URL specified in `FRONTEND_URL` environment variable.

## Testing

### Automated Tests

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Test coverage threshold: 70% (branches, functions, lines, statements)

### Manual API Testing

Test API endpoints interactively from the terminal:

```bash
npm run test:api
```

This will start an interactive menu where you can:
1. Test health check endpoint
2. Test root endpoint
3. Create summary jobs (with real URLs)
4. View job status
5. Get history
6. Get summary by ID

**Prerequisites:**
- Server must be running (`npm run dev`)
- API keys configured in `.env` (for real API calls)

### Test Files Structure

```
backend/
├── __tests__/
│   ├── setup.ts                 # Jest setup
│   ├── unit/                    # Unit tests
│   │   ├── validators.test.ts
│   │   └── services/
│   │       ├── transcript.service.test.ts
│   │       ├── ai.service.test.ts
│   │       └── quota.service.test.ts
│   └── integration/             # Integration tests
│       └── api.test.ts
└── scripts/
    └── test-api.ts              # Interactive API test script
```

## API Documentation

Complete API documentation is available in [`API_DOCUMENTATION.md`](../docs/API_DOCUMENTATION.md).

It includes:
- All endpoint specifications
- Request/response schemas
- Error codes and messages
- SSE event format documentation
- CORS configuration
- Rate limiting information
- Example requests and responses

## Deployment

### Production Checklist

1. **Environment Variables:**
   - Set `NODE_ENV=production`
   - Set `AUTH_ENABLED=true` (if using authentication)
   - Configure all required API keys
   - Set `FRONTEND_URL` to production frontend URL (e.g., `https://video-research-40c4b.web.app`)
   - Set `FRONTEND_URLS` for CORS (comma-separated list of allowed origins)
   - Configure `GOOGLE_APPLICATION_CREDENTIALS` for Firestore

2. **Build:**
   ```bash
   npm run build
   ```

3. **Run:**
   ```bash
   npm start
   ```

4. **Health Check:**
   - Monitor `/health` endpoint
   - Set up health check monitoring in your deployment platform

### Firebase Firestore Setup

1. Create Firebase project in [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Generate service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save JSON file securely
4. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to key file path
5. Create Firestore indexes:
   - `summaries` collection: Index on `user_id` + `created_at` (composite)
   - `users` collection: Index on `googleId` and `email`

### Security Considerations

- **API Keys:** Store in environment variables, never commit to git
- **CORS:** Configure `FRONTEND_URL` correctly for production
- **Rate Limiting:** Enabled by default, adjust in `config.yaml` if needed
- **Security Headers:** Helmet.js is configured for security headers
- **Input Validation:** All user inputs are validated and sanitized
- **Authentication:** JWT tokens expire after 24 hours

### Monitoring

The service includes:
- **Request ID Tracking:** Every request has a unique ID (`X-Request-ID` header)
- **Metrics Collection:** Job success/failure rates, processing times, API call latencies
- **Structured Logging:** JSON format in production, human-readable in development

### Scaling Considerations

- **Concurrent Jobs:** Limited by `max_concurrent_jobs` in `config.yaml` (default: 10)
- **Job Storage:** Currently in-memory, consider Redis for distributed systems
- **Database:** Firestore scales automatically, monitor usage
- **API Rate Limits:** Monitor external API usage (Supadata, DashScope)

## Architecture

### Request Flow

1. Client sends request → Request ID middleware assigns unique ID
2. Authentication middleware (optional) validates token
3. Rate limiting middleware checks limits
4. Route handler processes request
5. Service layer executes business logic
6. External APIs called (Supadata, DashScope)
7. Response sent with request ID header

### Key Components

- **Services:** Business logic (transcript, AI, quota, summary, job)
- **Controllers:** Request handlers
- **Middleware:** Authentication, rate limiting, error handling, request ID
- **Models:** Database operations (User, Summary)
- **Utils:** Validators, logger, metrics, SSE helpers
- **Routes:** API endpoint definitions

## Performance

### Target Response Times

- Health check: < 100ms
- Job creation: < 200ms
- History list: < 500ms
- Summary retrieval: < 300ms

### Processing Times

- Transcript fetching: < 30s per video (parallel execution)
- Pre-condensing: < 60s per long video
- Final summary: < 120s for typical batch (3-5 videos)

## Next Steps

All phases are implemented! The backend is ready for:
- Frontend integration
- Production deployment
- Performance monitoring
- Feature enhancements

## Troubleshooting

### Local Development Issues

For comprehensive troubleshooting, see the [Local Development Guide](../../docs/LOCAL_DEVELOPMENT_GUIDE.md#troubleshooting).

**Common Issues:**

- **History page empty:** Check that `DEV_USER_ID` matches between backend and frontend
- **Data directories missing:** Run `npm run dev:setup`
- **Configuration not loading:** Restart server after changing `.env` files
- **User ID mismatch:** Ensure `DEV_USER_ID` in backend matches `NEXT_PUBLIC_DEV_USER_ID` in frontend

### Firebase Connection Issues

- **Emulator:** Ensure `firebase emulators:start` is running
- **Production:** Verify service account key path is correct
- Check `GOOGLE_APPLICATION_CREDENTIALS` environment variable

**Note:** If using local storage (`USE_LOCAL_STORAGE=true`), Firebase is not required.

### Port Already in Use

Change `PORT` in `.env` to a different port number.

### Missing Environment Variables

Check `.env` file exists and contains all required variables. See `.env.example` for reference.

### Tests Failing

- Ensure all dependencies are installed: `npm install`
- Check that test environment variables are set correctly in `__tests__/setup.ts`
- Verify external API mocks are working (nock is configured)

### API Tests Not Connecting

- Ensure server is running: `npm run dev`
- Check `API_BASE_URL` in test script matches server port
- Verify CORS configuration allows the test origin

## License

ISC

