# PRD: Fix CORS Error by Deploying Backend Docker Image

| Version | 1.0 |
| :--- | :--- |
| **Status** | Active |
| **Created** | 2025-01-08 |
| **Priority** | Critical |
| **Related Issues** | CORS errors blocking frontend API calls |

---

## 1. Executive Summary

### Problem
The frontend application at `https://video-research-40c4b.web.app` is experiencing CORS (Cross-Origin Resource Sharing) errors when attempting to communicate with the backend API at `https://video-research-1028499272215.asia-southeast1.run.app`.

**Error Message:**
```
Access to fetch at 'https://video-research-1028499272215.asia-southeast1.run.app/api/config' 
from origin 'https://video-research-40c4b.web.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Root Cause
The Cloud Run service is currently running a **default "hello" container image** (`us-docker.pkg.dev/cloudrun/container/hello@sha256:...`) instead of the actual backend application code. This default container does not contain:
- The Express.js server with CORS middleware
- The environment variable parsing logic
- The API endpoints (`/api/config`, `/api/summarize`, etc.)
- Any of the backend application logic

**Current State:**
- ✅ Environment variables are correctly set in Cloud Run (`FRONTEND_URL`, `FRONTEND_URLS`)
- ❌ The deployed container image does not contain the backend code
- ❌ CORS middleware is not running because the backend code is not deployed

### Solution
Build and deploy the actual backend Docker image that contains:
- The complete backend application code
- CORS middleware configured to read `FRONTEND_URL` and `FRONTEND_URLS` environment variables
- All API endpoints and business logic

---

## 2. Problem Analysis

### 2.1 Current Architecture

**Frontend:**
- Deployed to: Firebase Hosting (`https://video-research-40c4b.web.app`)
- Status: ✅ Working correctly
- Issue: Cannot communicate with backend due to CORS

**Backend:**
- Expected: Node.js/Express application with CORS middleware
- Actual: Default "hello" container (no application code)
- Location: Cloud Run (`https://video-research-1028499272215.asia-southeast1.run.app`)
- Region: `asia-southeast1`
- Service Name: `video-research`

### 2.2 Why Environment Variables Alone Don't Work

The environment variables (`FRONTEND_URL`, `FRONTEND_URLS`) are correctly set in Cloud Run, but they have no effect because:

1. The default "hello" container doesn't read these variables
2. The default container doesn't have CORS middleware
3. The default container doesn't have the Express.js server that implements CORS logic

**Code Reference:**
```typescript
// backend/src/server.ts (lines 37-45)
const getAllowedOrigins = (): string[] => {
  const origins = [env.FRONTEND_URL];
  if (env.FRONTEND_URLS && env.FRONTEND_URLS.length > 0) {
    origins.push(...env.FRONTEND_URLS);
  }
  return origins;
};
```

This code exists in the repository but is **not running** because it's not in the deployed container.

### 2.3 Impact

**User Impact:**
- ❌ Frontend cannot load configuration
- ❌ All API calls fail with CORS errors
- ❌ Application is completely non-functional
- ❌ Users cannot use any features

**Technical Impact:**
- Backend API is not accessible
- No health checks can pass
- No logging or monitoring of actual application
- Service is running but not serving the application

---

## 3. Solution Design

### 3.1 Overview

Build a Docker image from the backend source code and deploy it to Cloud Run, replacing the default "hello" container.

### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Build Process                         │
├─────────────────────────────────────────────────────────┤
│  1. Source Code (backend/)                               │
│     ├── src/server.ts (with CORS logic)                 │
│     ├── Dockerfile                                      │
│     └── package.json                                    │
│                                                          │
│  2. Docker Build                                        │
│     └── Creates image with backend code                 │
│                                                          │
│  3. Push to Google Container Registry                   │
│     └── gcr.io/video-research-40c4b/video-research     │
│                                                          │
│  4. Deploy to Cloud Run                                 │
│     └── Replace "hello" container                       │
│     └── Use new backend image                           │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Dockerfile Analysis

**File:** `backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
COPY config.yaml ./
COPY scripts ./scripts
RUN npm run build
EXPOSE 8080
ENV PORT=8080
CMD ["npm", "start"]
```

**What it does:**
1. Uses Node.js 20 Alpine (lightweight)
2. Installs dependencies
3. Copies source code
4. Builds TypeScript to JavaScript
5. Exposes port 8080 (Cloud Run requirement)
6. Starts the server with `npm start`

**Status:** ✅ Dockerfile exists and is correct

### 3.4 Required Environment Variables

After deployment, these must be set in Cloud Run:

| Variable | Value | Status |
|----------|-------|--------|
| `NODE_ENV` | `production` | ⚠️ Need to verify |
| `FRONTEND_URL` | `https://video-research-40c4b.web.app` | ✅ Set |
| `FRONTEND_URLS` | `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app` | ✅ Set |
| `USE_FIREBASE_AUTH` | `true` | ⚠️ Need to verify |
| `SUPADATA_API_KEY` | (secret) | ⚠️ Need to verify |
| `DASHSCOPE_BEIJING_API_KEY` | (secret) | ⚠️ Need to verify |
| `YOUTUBE_API_KEYS` | (comma-separated) | ⚠️ Need to verify |
| `GOOGLE_APPLICATION_CREDENTIALS` | (if using service account file) | ⚠️ Need to verify |

---

## 4. Implementation Plan

### 4.1 Prerequisites

**Required:**
- ✅ Backend source code exists (`backend/` directory)
- ✅ Dockerfile exists (`backend/Dockerfile`)
- ✅ Google Cloud project access (`video-research-40c4b`)
- ✅ Cloud Run service exists (`video-research` in `asia-southeast1`)

**Optional but Recommended:**
- Google Cloud SDK (gcloud CLI) installed
- Docker Desktop installed (for local testing)

### 4.2 Step-by-Step Implementation

#### Phase 1: Build Docker Image

**Option A: Using Google Cloud Build (Recommended - No CLI Required)**

1. **Navigate to Cloud Build:**
   - Go to: https://console.cloud.google.com/cloud-build
   - Select project: `video-research-40c4b`

2. **Create Build:**
   - Click **"Create Build"** or **"Trigger"**
   - Choose **"Build from source"**
   - **Source:** 
     - Option 1: Connect GitHub repository
     - Option 2: Upload `backend/` directory as ZIP
   - **Build configuration:** Use `backend/Dockerfile`
   - **Image name:** `gcr.io/video-research-40c4b/video-research:latest`
   - Click **"Create"** or **"Run"**

3. **Monitor Build:**
   - Wait 5-10 minutes for build to complete
   - Check build logs for errors
   - Verify image was created successfully

**Option B: Using gcloud CLI (If Installed)**

```powershell
# Navigate to backend directory
cd backend

# Build and push image
gcloud builds submit --tag gcr.io/video-research-40c4b/video-research:latest
```

**Option C: Using Docker Desktop (If Installed)**

```powershell
# Navigate to backend directory
cd backend

# Build locally
docker build -t video-research-backend .

# Tag for Google Container Registry
docker tag video-research-backend gcr.io/video-research-40c4b/video-research:latest

# Authenticate with GCR
gcloud auth configure-docker

# Push to registry
docker push gcr.io/video-research-40c4b/video-research:latest
```

#### Phase 2: Deploy to Cloud Run

**Option A: Using Google Cloud Console (Recommended)**

1. **Navigate to Cloud Run:**
   - Go to: https://console.cloud.google.com/run
   - Select project: `video-research-40c4b`
   - Click on service: `video-research`

2. **Edit Service:**
   - Click **"EDIT & DEPLOY NEW REVISION"**

3. **Update Container Image:**
   - Scroll to **"Container"** section
   - Under **"Container image URL"**, click **"SELECT"**
   - Choose: `gcr.io/video-research-40c4b/video-research:latest`
   - Or manually enter: `gcr.io/video-research-40c4b/video-research:latest`

4. **Verify Environment Variables:**
   - Scroll to **"Variables & Secrets"**
   - Ensure these are set:
     - `FRONTEND_URL` = `https://video-research-40c4b.web.app`
     - `FRONTEND_URLS` = `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
   - Add any missing required variables (see section 3.4)

5. **Configure Service Settings:**
   - **Port:** `8080` (should already be set)
   - **Memory:** `512Mi` (or as needed)
   - **CPU:** `1` (or as needed)
   - **Timeout:** `300` seconds

6. **Deploy:**
   - Click **"DEPLOY"** button
   - Wait 2-3 minutes for deployment

**Option B: Using gcloud CLI**

```powershell
gcloud run deploy video-research `
  --image gcr.io/video-research-40c4b/video-research:latest `
  --platform managed `
  --region asia-southeast1 `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 300 `
  --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://video-research-40c4b.web.app,FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"
```

#### Phase 3: Verification

1. **Check Health Endpoint:**
   ```
   https://video-research-1028499272215.asia-southeast1.run.app/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "services": {
       "database": "connected"
     }
   }
   ```

2. **Test CORS:**
   - Open: `https://video-research-40c4b.web.app`
   - Open browser console (F12)
   - Check for CORS errors
   - Should see successful API calls

3. **Check Logs:**
   - Go to Cloud Run → Logs tab
   - Look for server startup messages
   - Verify no CORS blocking messages

---

## 5. Testing Strategy

### 5.1 Pre-Deployment Testing

**Local Testing (Optional):**
```powershell
# Build locally
cd backend
docker build -t video-research-backend .

# Run locally
docker run -p 8080:8080 `
  -e FRONTEND_URL=http://localhost:3000 `
  -e FRONTEND_URLS=http://localhost:3000 `
  video-research-backend

# Test health endpoint
curl http://localhost:8080/health
```

### 5.2 Post-Deployment Testing

**Test Cases:**

1. **Health Check:**
   - ✅ GET `/health` returns 200 OK
   - ✅ Response includes status "healthy"

2. **CORS Headers:**
   - ✅ OPTIONS request to `/api/config` returns CORS headers
   - ✅ `Access-Control-Allow-Origin` header is present
   - ✅ Header value matches frontend origin

3. **API Endpoints:**
   - ✅ GET `/api/config` returns configuration
   - ✅ No CORS errors in browser console
   - ✅ Frontend can successfully fetch data

4. **Environment Variables:**
   - ✅ Backend logs show correct `FRONTEND_URL`
   - ✅ CORS allows requests from configured origins

### 5.3 Browser Testing

**Test in Browser Console:**
```javascript
// Test CORS
fetch('https://video-research-1028499272215.asia-southeast1.run.app/api/config', {
  method: 'GET',
  headers: {
    'Origin': 'https://video-research-40c4b.web.app'
  }
})
.then(r => {
  console.log('Status:', r.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Credentials': r.headers.get('Access-Control-Allow-Credentials')
  });
  return r.json();
})
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));
```

**Expected Result:**
- Status: `200`
- `Access-Control-Allow-Origin`: `https://video-research-40c4b.web.app`
- Data: Configuration object

---

## 6. Rollback Plan

If deployment causes issues:

1. **Rollback to Previous Revision:**
   - Go to Cloud Run → Revisions tab
   - Find previous revision (the "hello" container)
   - Click **"Manage Traffic"**
   - Set previous revision to 100% traffic
   - New revision to 0%

2. **Or Redeploy Previous Image:**
   - Edit service
   - Change container image back to previous version
   - Deploy

---

## 7. Success Criteria

### Must Have:
- ✅ Backend Docker image built successfully
- ✅ Image deployed to Cloud Run
- ✅ Health endpoint returns 200 OK
- ✅ CORS errors resolved
- ✅ Frontend can successfully call backend APIs
- ✅ No errors in browser console

### Nice to Have:
- ✅ Build process automated (Cloud Build trigger)
- ✅ CI/CD pipeline set up
- ✅ Monitoring and alerts configured

---

## 8. Troubleshooting

### Issue: Build Fails

**Possible Causes:**
- Missing dependencies in `package.json`
- TypeScript compilation errors
- Dockerfile syntax errors

**Solutions:**
- Check build logs in Cloud Build console
- Test build locally: `docker build -t test .`
- Verify `backend/package.json` has all dependencies

### Issue: Deployment Fails

**Possible Causes:**
- Image not found in registry
- Insufficient permissions
- Invalid environment variables

**Solutions:**
- Verify image exists: Check Container Registry
- Check IAM permissions for Cloud Run
- Validate environment variable format

### Issue: Service Won't Start

**Possible Causes:**
- Missing required environment variables
- Port configuration incorrect
- Application crashes on startup

**Solutions:**
- Check Cloud Run logs
- Verify all required env vars are set
- Test locally with same environment

### Issue: CORS Still Not Working

**Possible Causes:**
- Environment variables not read correctly
- CORS middleware not enabled
- Origin mismatch

**Solutions:**
- Check backend logs for CORS messages
- Verify environment variables in Cloud Run
- Test with exact origin from browser

---

## 9. Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Build Docker Image | 5-10 minutes | ⏳ Pending |
| Deploy to Cloud Run | 2-3 minutes | ⏳ Pending |
| Verification | 5 minutes | ⏳ Pending |
| **Total** | **15-20 minutes** | ⏳ Pending |

---

## 10. Next Steps

1. **Immediate:**
   - [ ] Build backend Docker image
   - [ ] Deploy to Cloud Run
   - [ ] Verify CORS is working
   - [ ] Test all API endpoints

2. **Short-term:**
   - [ ] Set up Cloud Build trigger for automatic builds
   - [ ] Configure all required environment variables
   - [ ] Set up monitoring and alerts

3. **Long-term:**
   - [ ] Implement CI/CD pipeline
   - [ ] Add automated testing
   - [ ] Optimize Docker image size
   - [ ] Set up staging environment

---

## 11. References

- **Backend Code:** `backend/src/server.ts` (CORS configuration)
- **Dockerfile:** `backend/Dockerfile`
- **Deployment Guide:** `FIREBASE_DEPLOYMENT_GUIDE.md`
- **Cloud Run Docs:** https://cloud.google.com/run/docs
- **Docker Docs:** https://docs.docker.com/

---

## 12. Questions & Answers

**Q: Why can't I just update environment variables?**  
A: Environment variables only work if the code that reads them is running. The default "hello" container doesn't have that code.

**Q: Do I need to rebuild every time I change code?**  
A: Yes, you need to rebuild the Docker image and redeploy. Consider setting up CI/CD for automation.

**Q: Can I test locally first?**  
A: Yes! Build the Docker image locally and run it with `docker run` to test before deploying.

**Q: What if the build fails?**  
A: Check the build logs, fix any errors in the code or Dockerfile, and try again.

**Q: How do I know if it's working?**  
A: Test the `/health` endpoint and check your frontend - CORS errors should be gone.

---

**Document Status:** Ready for Implementation  
**Last Updated:** 2025-01-08  
**Owner:** Development Team

