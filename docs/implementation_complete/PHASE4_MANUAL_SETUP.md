# Phase 4: Manual Setup Required

This document lists all the manual steps and code changes needed for files that couldn't be automatically edited.

## ⚠️ Important: .env.example File Change

I modified `frontend/env.example` to add a comment. This is safe - it's just documentation. However, if you want to revert it, here's what was changed:

**File:** `frontend/env.example`
- **Line 1-3:** Added comments explaining development vs production URLs
- **Action:** This is just documentation, no code changes. Safe to keep.

## Files You Need to Create/Update Manually

### 1. Backend `.env` File (Required)

**Location:** `backend/.env` (create this file - it's gitignored)

Copy from `backend/env.example.txt` and fill in your values:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
# For production, add all your frontend domains (comma-separated):
# FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app
FRONTEND_URLS=

# Authentication
AUTH_ENABLED=false
USE_FIREBASE_AUTH=false

# Google OAuth (Only required if AUTH_ENABLED=true and USE_FIREBASE_AUTH=false)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
JWT_SECRET=

# Firebase Firestore
GOOGLE_APPLICATION_CREDENTIALS=./video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json

# External APIs (Required - fill these in!)
SUPADATA_API_KEY=your-supadata-api-key
DASHSCOPE_BEIJING_API_KEY=your-dashscope-api-key
YOUTUBE_API_KEYS=key1,key2,key3

# Optional
REDIS_URL=
LOG_LEVEL=info
```

### 2. Frontend `.env.local` File (Required for Local Development)

**Location:** `frontend/.env.local` (create this file - it's gitignored)

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase Authentication Configuration
NEXT_PUBLIC_USE_FIREBASE_AUTH=false

# Firebase Client SDK Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=video-research-40c4b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=video-research-40c4b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=video-research-40c4b.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=723520495466
NEXT_PUBLIC_FIREBASE_APP_ID=1:723520495466:web:6fda6d5e11c877bca44f13
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-JSDG4VDKT9

# Development: Skip authentication
NEXT_PUBLIC_SKIP_AUTH=false
```

### 3. Dockerfile Fix (Optional but Recommended)

**File:** `backend/Dockerfile`

**Current Issue:** Line 19 uses `npm ci --only=production` which might cause issues if you need dev dependencies for the build.

**Recommended Fix:** Change line 19 from:
```dockerfile
RUN npm ci --only=production
```

To:
```dockerfile
RUN npm ci
```

**Reason:** The build process (`npm run build`) might need dev dependencies (TypeScript, etc.). After build, you can optionally add a production-only install step, but for simplicity, installing all dependencies is safer.

**Alternative (if you want to optimize):**
```dockerfile
# Install all dependencies (needed for build)
RUN npm ci

# Build TypeScript
RUN npm run build

# Optional: Remove dev dependencies to reduce image size
RUN npm prune --production
```

### 4. Production Environment Variables (Cloud Run)

When deploying to Cloud Run, you need to set these environment variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://video-research-40c4b.web.app
FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app

# Firebase Authentication
USE_FIREBASE_AUTH=true
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
# OR use Workload Identity (recommended - no file needed)

# External APIs
SUPADATA_API_KEY=your-production-key
DASHSCOPE_BEIJING_API_KEY=your-production-key
YOUTUBE_API_KEYS=key1,key2,key3

# Optional
AUTH_ENABLED=true
LOG_LEVEL=info
```

**Set via Cloud Run Console or CLI:**
```bash
gcloud run services update api \
  --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://video-research-40c4b.web.app,FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app" \
  --region us-central1
```

### 5. Production Frontend Environment Variables

For production builds, set these before running `npm run build`:

```bash
export NEXT_PUBLIC_API_URL=https://video-research-723520495466.asia-southeast1.run.app
export NEXT_PUBLIC_USE_FIREBASE_AUTH=true
export NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=video-research-40c4b.firebaseapp.com
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=video-research-40c4b
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=video-research-40c4b.firebasestorage.app
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=723520495466
export NEXT_PUBLIC_FIREBASE_APP_ID=1:723520495466:web:6fda6d5e11c877bca44f13
export NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-JSDG4VDKT9
```

### 6. Service Account File for Docker (If Not Using Workload Identity)

If you're using the service account JSON file approach (not recommended, but sometimes needed):

**Option A: Copy into Docker Image (Less Secure)**
Add to `backend/Dockerfile` before the `CMD` line:
```dockerfile
# Copy service account (if not using Workload Identity)
COPY video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json /app/service-account.json
```

**Option B: Use Cloud Secrets (Recommended)**
Mount as a secret in Cloud Run instead of copying into image.

### 7. Firebase Hosting Environment Variables

Firebase Hosting doesn't support environment variables at runtime (since it's static). All `NEXT_PUBLIC_*` variables must be set at **build time**.

Create a build script or use CI/CD to set them before building.

**Example build script:** `frontend/build-production.sh`
```bash
#!/bin/bash
export NEXT_PUBLIC_API_URL=https://your-cloud-run-url.run.app
export NEXT_PUBLIC_USE_FIREBASE_AUTH=true
# ... other variables ...
npm run build
```

## Summary of Required Actions

1. ✅ **Create `backend/.env`** - Copy from `backend/env.example.txt`
2. ✅ **Create `frontend/.env.local`** - For local development
3. ⚠️ **Fix Dockerfile** - Change `npm ci --only=production` to `npm ci` (optional but recommended)
4. ✅ **Set Cloud Run environment variables** - When deploying
5. ✅ **Set frontend build-time variables** - Before `npm run build` for production
6. ⚠️ **Service account setup** - Choose Workload Identity or file mounting

## Verification Checklist

- [ ] `backend/.env` file created with all required values
- [ ] `frontend/.env.local` file created for local dev
- [ ] Dockerfile reviewed (and optionally fixed)
- [ ] Cloud Run environment variables documented/configured
- [ ] Frontend build script created (if needed)
- [ ] Service account approach decided (Workload Identity recommended)

## Notes

- The `.env.example` file change I made is just documentation - it's safe
- All `.env` and `.env.local` files are gitignored, so they won't be committed
- The Dockerfile fix is optional but recommended for reliability
- Production environment variables should be set via Cloud Run console or CI/CD

