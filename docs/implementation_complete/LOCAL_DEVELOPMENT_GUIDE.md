# Local Development Guide

Complete guide for setting up and working with the Video Research application in local development mode.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Common Scenarios](#common-scenarios)
4. [Troubleshooting](#troubleshooting)
5. [FAQ](#faq)

---

## Quick Start

Get up and running with local development in under 5 minutes.

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- API keys for external services (Supadata, DashScope)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd video-research

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables

#### Backend Configuration

Create `backend/.env` file (copy from `backend/env.example.txt`):

**Option 1: Skip Authentication (Simplest for Local Dev)**

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Authentication (disabled for local dev)
AUTH_ENABLED=false
USE_FIREBASE_AUTH=false

# Development User Configuration
DEV_USER_ID=dev-user-id
DEV_USER_EMAIL=dev@example.com
DEV_USER_NAME=Development User

# Local Storage (enabled for local dev)
USE_LOCAL_STORAGE=true

# External APIs (Required - fill these in!)
SUPADATA_API_KEY=your-supadata-api-key
DASHSCOPE_BEIJING_API_KEY=your-dashscope-api-key
YOUTUBE_API_KEYS=key1,key2,key3

# Optional
LOG_LEVEL=info
```

**Option 2: Enable Firebase Authentication (For Testing Auth Features)**

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Authentication (enabled for testing)
AUTH_ENABLED=true
USE_FIREBASE_AUTH=true

# Firebase Firestore
# Path to service account JSON file (relative to project root or absolute path)
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# Development User Configuration (only used when AUTH_ENABLED=false)
DEV_USER_ID=dev-user-id
DEV_USER_EMAIL=dev@example.com
DEV_USER_NAME=Development User

# Local Storage (enabled for local dev)
USE_LOCAL_STORAGE=true

# External APIs (Required - fill these in!)
SUPADATA_API_KEY=your-supadata-api-key
DASHSCOPE_BEIJING_API_KEY=your-dashscope-api-key
YOUTUBE_API_KEYS=key1,key2,key3

# Optional
LOG_LEVEL=info
```

**Note**: For complete Firebase Auth setup instructions, see [Firebase Auth Setup Guide](./FIREBASE_AUTH_SETUP.md).

#### Frontend Configuration

Create `frontend/.env.local` file (copy from `frontend/env.example`):

**Option 1: Skip Authentication (Simplest for Local Dev)**

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Skip authentication (for local dev)
NEXT_PUBLIC_SKIP_AUTH=true

# Development User Configuration (must match backend)
NEXT_PUBLIC_DEV_USER_ID=dev-user-id
NEXT_PUBLIC_DEV_USER_EMAIL=dev@example.com
NEXT_PUBLIC_DEV_USER_NAME=Development User

# Firebase Auth (disabled for local dev)
NEXT_PUBLIC_USE_FIREBASE_AUTH=false
```

**Option 2: Enable Firebase Authentication (For Testing Auth Features)**

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Enable Firebase Authentication
NEXT_PUBLIC_USE_FIREBASE_AUTH=true

# Firebase Client SDK Configuration
# Get these from Firebase Console → Project Settings → Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id  # Optional

# Skip authentication (set to false when testing auth)
NEXT_PUBLIC_SKIP_AUTH=false
```

**Note**: For complete Firebase Auth setup instructions, see [Firebase Auth Setup Guide](./FIREBASE_AUTH_SETUP.md).

### Step 3: Initialize Local Development Environment

Run the setup script to create required directories:

```bash
cd backend
npm run dev:setup
```

This will:
- Create `backend/data/summaries/` directory
- Create `backend/data/users/` directory
- Validate your configuration
- Display current configuration status

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Verify Setup

1. Open `http://localhost:3000` in your browser
2. You should see a development mode indicator (yellow badge) in the bottom-right corner
3. Check backend logs for:
   - `✅ Local storage directories ready`
   - `💾 Storage mode: LOCAL FILE STORAGE`
   - `🧪 Development mode: ENABLED`

**Congratulations!** You're now running the application locally. 🎉

---

## Configuration

### Configuration Hierarchy

The application uses a layered configuration system with the following priority (highest to lowest):

1. **Environment Variables** (`.env` files)
2. **config.yaml** (backend system configuration)
3. **Default Values** (hardcoded fallbacks)

### Backend Configuration Files

#### `backend/.env`

Environment-specific variables that override `config.yaml`:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `USE_LOCAL_STORAGE` | Enable local file storage | `false` | No |
| `AUTH_ENABLED` | Enable authentication | `false` | No |
| `DEV_USER_ID` | Development user ID | `dev-user-id` | No |
| `DEV_USER_EMAIL` | Development user email | `dev@example.com` | No |
| `DEV_USER_NAME` | Development user name | `Development User` | No |
| `SUPADATA_API_KEY` | Supadata API key | - | **Yes** |
| `DASHSCOPE_BEIJING_API_KEY` | DashScope API key | - | **Yes** |
| `YOUTUBE_API_KEYS` | YouTube API keys (comma-separated) | - | **Yes** |

#### `backend/config.yaml`

System-wide configuration (limits, tiers, AI models, etc.):

```yaml
system:
  use_local_storage: true  # Can be overridden by USE_LOCAL_STORAGE env var
  dev_mode_credits: 999    # Credits for dev user
  history_pagination_default_limit: 20

auth:
  dev_mode_tier: "premium"  # Tier for dev user

# Local storage paths (optional - defaults shown)
local_storage:
  data_directory: "data"
  summaries_subdirectory: "summaries"
  users_subdirectory: "users"
```

**Note:** Environment variables take precedence over `config.yaml` values.

### Frontend Configuration Files

#### `frontend/.env.local`

Frontend environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000` | No |
| `NEXT_PUBLIC_SKIP_AUTH` | Skip authentication | `false` | No |
| `NEXT_PUBLIC_DEV_USER_ID` | Dev user ID (must match backend) | `dev-user-id` | No |
| `NEXT_PUBLIC_DEV_USER_EMAIL` | Dev user email | `dev@example.com` | No |
| `NEXT_PUBLIC_DEV_USER_NAME` | Dev user name | `Development User` | No |

**Important:** `NEXT_PUBLIC_DEV_USER_ID` must match `DEV_USER_ID` in backend `.env`!

### Configuration Validation

The backend automatically validates configuration on startup:

- ✅ Checks data directories exist (creates if missing)
- ✅ Validates user ID consistency
- ✅ Warns about potential configuration conflicts
- ✅ Displays active storage mode

View validation output in backend startup logs.

### Centralized Configuration Access

All configuration values are accessed through centralized modules:

**Backend:**
```typescript
import { getSystemConfig, useLocalStorage, getLocalStorageConfig } from './config';
import env from './config/env';

// Check storage mode
const isLocal = useLocalStorage();

// Get storage paths
const storageConfig = getLocalStorageConfig();
const summariesDir = getSummariesDirectory();

// Get dev user ID
const devUserId = env.DEV_USER_ID;
```

**Frontend:**
```typescript
import { getApiBaseUrl, getDevUserId, shouldSkipAuth } from '@/config/env';

// Get API URL
const apiUrl = getApiBaseUrl();

// Get dev user ID
const userId = getDevUserId();

// Check auth status
const skipAuth = shouldSkipAuth();
```

---

## Common Scenarios

### Scenario 1: First-Time Setup

**Problem:** Setting up the project for the first time.

**Solution:**

1. Follow the [Quick Start](#quick-start) guide
2. Run `npm run dev:setup` in the backend directory
3. Verify directories were created:
   ```bash
   ls backend/data/
   # Should show: summaries/  users/
   ```
4. Start both servers and check for development mode indicator

### Scenario 2: Switching Between Local Storage and Firestore

**Problem:** Need to test with Firestore instead of local storage.

**Solution:**

**Switch to Firestore:**

1. Update `backend/.env`:
   ```bash
   USE_LOCAL_STORAGE=false
   ```

2. Configure Firestore:
   ```bash
   # Option A: Use emulator
   FIRESTORE_EMULATOR_HOST=localhost:8080
   # Then start: firebase emulators:start --only firestore
   
   # Option B: Use production
   GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json
   ```

3. Restart backend server

**Switch back to Local Storage:**

1. Update `backend/.env`:
   ```bash
   USE_LOCAL_STORAGE=true
   ```

2. Restart backend server

**Note:** Local data in `backend/data/` is separate from Firestore data. They don't interfere with each other.

### Scenario 3: Setting Up Firebase Authentication

**Problem:** Need to test authentication features with Firebase Auth.

**Solution:**

1. **Enable Email/Password in Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to **Authentication** → **Sign-in method**
   - Enable **Email/Password** provider
   - Save changes

2. **Get Firebase Configuration:**
   - Go to **Project Settings** → **Your apps**
   - Copy Firebase config values (apiKey, authDomain, etc.)

3. **Update Frontend Environment:**
   - Set `NEXT_PUBLIC_USE_FIREBASE_AUTH=true` in `frontend/.env.local`
   - Add all `NEXT_PUBLIC_FIREBASE_*` environment variables
   - Set `NEXT_PUBLIC_SKIP_AUTH=false`

4. **Update Backend Environment:**
   - Set `AUTH_ENABLED=true` in `backend/.env`
   - Set `USE_FIREBASE_AUTH=true`
   - Set `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`

5. **Restart Both Servers:**
   ```bash
   # Frontend
   cd frontend
   npm run dev

   # Backend
   cd backend
   npm run dev
   ```

6. **Test Authentication:**
   - Navigate to `http://localhost:3000/signup`
   - Create a test account
   - Verify user appears in Firebase Console → Authentication → Users

**For complete setup instructions, see [Firebase Auth Setup Guide](./FIREBASE_AUTH_SETUP.md).**

### Scenario 4: Testing with Multiple Users

**Problem:** Need to test with different user IDs locally.

**Solution:**

1. Create test summaries with different `user_id` values:
   ```bash
   # Edit backend/data/summaries/*.json files
   # Change "user_id" field to different values
   ```

2. Or use the seed script with custom user ID:
   ```bash
   # Modify backend/scripts/dev-seed.ts temporarily
   # Change userId parameter
   ```

3. Update frontend `.env.local` to match:
   ```bash
   NEXT_PUBLIC_DEV_USER_ID=test-user-1
   ```

4. Restart both servers

**Note:** History page will only show summaries matching the current `DEV_USER_ID`.

### Scenario 4: Resetting Test Data

**Problem:** Need to clear all local test data and start fresh.

**Solution:**

**Option 1: Reset Script (Recommended)**

```bash
cd backend
npm run dev:reset

# With backup
npm run dev:reset -- --backup
```

**Option 2: Manual Deletion**

```bash
# Delete all summaries
rm -rf backend/data/summaries/*

# Delete all users
rm -rf backend/data/users/*
```

**Option 3: Complete Reset**

```bash
# Delete entire data directory
rm -rf backend/data

# Recreate with setup script
npm run dev:setup
```

### Scenario 5: Seeding Test Data

**Problem:** Need sample data for testing pagination, filtering, etc.

**Solution:**

```bash
cd backend
npm run dev:seed

# Seed specific number of summaries
npm run dev:seed -- 10
```

This creates sample summaries with:
- Different batch titles
- Various video counts
- Different timestamps (for sorting tests)
- Realistic data structure

### Scenario 6: Debugging History Page Issues

**Problem:** History page not showing summaries.

**Solution:**

1. **Check storage mode:**
   ```bash
   # Backend logs should show:
   💾 Storage mode: LOCAL FILE STORAGE
   ```

2. **Verify user ID match:**
   ```bash
   # Check backend .env
   DEV_USER_ID=dev-user-id
   
   # Check frontend .env.local
   NEXT_PUBLIC_DEV_USER_ID=dev-user-id
   
   # Must match!
   ```

3. **Check summary files:**
   ```bash
   ls backend/data/summaries/
   # Should show .json files
   
   # Check user_id in files
   cat backend/data/summaries/*.json | grep user_id
   # Should all show: "user_id": "dev-user-id"
   ```

4. **Check backend health endpoint:**
   ```bash
   curl http://localhost:5000/health
   # Should show: "storage": { "mode": "local" }
   ```

5. **Check browser console:**
   - Look for API errors
   - Verify API URL is correct
   - Check network tab for `/api/history` requests

### Scenario 7: Authentication Issues

**Problem:** Getting authentication errors in local development.

**Solution:**

1. **Backend:** Ensure `AUTH_ENABLED=false` in `backend/.env`
2. **Frontend:** Ensure `NEXT_PUBLIC_SKIP_AUTH=true` in `frontend/.env.local`
3. **Restart both servers**
4. **Check logs:**
   ```bash
   # Backend should show:
   ✅ Auth disabled - using dev user: { userId: 'dev-user-id', ... }
   ```

### Scenario 8: Port Already in Use

**Problem:** Port 5000 or 3000 is already in use.

**Solution:**

**Change Backend Port:**

1. Update `backend/.env`:
   ```bash
   PORT=5001
   ```

2. Update `frontend/.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:5001
   ```

3. Restart both servers

**Change Frontend Port:**

```bash
# Start with custom port
npm run dev -- -p 3001
```

---

## Troubleshooting

### Issue: Data Directories Not Created

**Symptoms:**
- Backend fails to start
- Error: "Cannot initialize local storage"
- Missing `backend/data/` directory

**Solution:**

1. Run setup script:
   ```bash
   cd backend
   npm run dev:setup
   ```

2. Check directory permissions:
   ```bash
   ls -la backend/
   # Ensure you have write permissions
   ```

3. Manually create directories:
   ```bash
   mkdir -p backend/data/summaries
   mkdir -p backend/data/users
   ```

### Issue: History Page Shows Empty

**Symptoms:**
- History page loads but shows no summaries
- No errors in console
- Backend logs show summaries exist

**Possible Causes:**

1. **User ID Mismatch**
   - **Check:** Backend `DEV_USER_ID` vs Frontend `NEXT_PUBLIC_DEV_USER_ID`
   - **Fix:** Ensure they match exactly

2. **Wrong Storage Mode**
   - **Check:** Backend logs show "Storage mode: FIRESTORE"
   - **Fix:** Set `USE_LOCAL_STORAGE=true` in `backend/.env`

3. **Summary Files Have Wrong User ID**
   - **Check:** `cat backend/data/summaries/*.json | grep user_id`
   - **Fix:** Update files or regenerate with correct user ID

4. **Pagination Issue**
   - **Check:** Try accessing page 1 explicitly
   - **Fix:** Check pagination parameters in API call

### Issue: Configuration Not Loading

**Symptoms:**
- Changes to `.env` not taking effect
- Default values being used instead of configured values

**Solution:**

1. **Restart servers** after changing `.env` files
2. **Check file location:**
   - Backend: `backend/.env` (not `backend/env.example.txt`)
   - Frontend: `frontend/.env.local` (not `frontend/env.example`)
3. **Verify syntax:**
   ```bash
   # No spaces around =
   USE_LOCAL_STORAGE=true  # ✅ Correct
   USE_LOCAL_STORAGE = true  # ❌ Wrong
   ```
4. **Check for typos** in variable names

### Issue: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- API requests fail

**Solution:**

1. **Check `FRONTEND_URL` in backend `.env`:**
   ```bash
   FRONTEND_URL=http://localhost:3000
   ```

2. **Verify frontend is running on correct port**

3. **Check backend CORS configuration** (should allow localhost:3000)

### Issue: API Connection Failed

**Symptoms:**
- Frontend can't connect to backend
- Network errors in browser

**Solution:**

1. **Verify backend is running:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check API URL in frontend:**
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. **Check firewall/antivirus** blocking localhost connections

4. **Verify ports:**
   ```bash
   # Backend should be on 5000
   # Frontend should be on 3000
   ```

### Issue: Development Mode Indicator Not Showing

**Symptoms:**
- No yellow badge in bottom-right corner
- Can't tell if in dev mode

**Solution:**

1. **Check development mode detection:**
   ```typescript
   // Should return true in local development
   isDevelopmentMode()
   ```

2. **Verify environment:**
   ```bash
   # Frontend should have:
   NODE_ENV=development
   # OR
   NEXT_PUBLIC_DEV_MODE=true
   ```

3. **Check component is rendered:**
   - Look for `<DevModeIndicator />` in app layout
   - Check browser console for errors

### Issue: Summary Files Corrupted

**Symptoms:**
- Backend logs show JSON parsing errors
- Some summaries not loading

**Solution:**

1. **Check file integrity:**
   ```bash
   # Validate JSON syntax
   cat backend/data/summaries/*.json | jq .
   ```

2. **Remove corrupted files:**
   ```bash
   # Find corrupted files
   for file in backend/data/summaries/*.json; do
     if ! jq . "$file" > /dev/null 2>&1; then
       echo "Corrupted: $file"
     fi
   done
   ```

3. **Backup and reset:**
   ```bash
   npm run dev:reset -- --backup
   npm run dev:seed
   ```

---

## FAQ

### Q: Can I use local storage in production?

**A:** No. Local storage is designed for development and testing only. Production should always use Firestore for:
- Data persistence
- Scalability
- Multi-instance deployments
- Backup and recovery

### Q: How do I share local test data with my team?

**A:** You can commit test data to git (if not in `.gitignore`), or use the export/import scripts (if available). However, it's recommended to use seed scripts to generate consistent test data.

### Q: What happens if I accidentally enable AUTH_ENABLED=true with local storage?

**A:** The backend will warn you but still work. However, you may experience user ID mismatches. It's recommended to keep `AUTH_ENABLED=false` for local development.

### Q: Can I use Firebase emulator with local storage?

**A:** No, they're mutually exclusive. Choose one:
- **Local storage:** `USE_LOCAL_STORAGE=true` (no emulator needed)
- **Firestore emulator:** `USE_LOCAL_STORAGE=false` + `FIRESTORE_EMULATOR_HOST=localhost:8080`

### Q: How do I change the data directory location?

**A:** Update `backend/config.yaml`:

```yaml
local_storage:
  data_directory: "custom-data"
  summaries_subdirectory: "custom-summaries"
  users_subdirectory: "custom-users"
```

Or use environment variables (if supported).

### Q: Why do I need to match DEV_USER_ID between frontend and backend?

**A:** The frontend sends requests with the dev user ID, and the backend filters summaries by user ID. If they don't match, you won't see any summaries in the history page.

### Q: How do I test with production-like data?

**A:** 
1. Export data from Firestore (if you have access)
2. Convert to local storage format
3. Place files in `backend/data/summaries/`
4. Ensure `user_id` matches your `DEV_USER_ID`

### Q: Can I run multiple backend instances with local storage?

**A:** Yes, but they'll share the same data directory. This can cause conflicts if both instances write simultaneously. For true multi-instance testing, use Firestore.

### Q: How do I debug API requests in local development?

**A:**
1. **Backend logs:** Check terminal running `npm run dev` in backend
2. **Browser DevTools:** Network tab shows all API requests
3. **Health endpoint:** `curl http://localhost:5000/health` shows storage mode
4. **Request IDs:** Every request has a unique ID in logs

### Q: What's the difference between `USE_LOCAL_STORAGE` env var and `config.yaml` setting?

**A:** Environment variables take precedence. If `USE_LOCAL_STORAGE=true` is set in `.env`, it overrides `config.yaml`. This allows environment-specific configuration without modifying `config.yaml`.

---

## Additional Resources

- [Firebase Auth Setup Guide](./FIREBASE_AUTH_SETUP.md) - Complete Firebase Authentication configuration guide
- [Backend README](../backend/README.md) - Backend-specific documentation
- [Local Storage README](../backend/LOCAL_STORAGE_README.md) - Local storage implementation details
- [Frontend README](../frontend/README.md) - Frontend-specific documentation
- [API Documentation](../backend/API_DOCUMENTATION.md) - Complete API reference

---

**Last Updated:** 2024  
**Status:** Complete  
**Maintained By:** Development Team

