# Firebase Deployment Guide

This guide provides step-by-step instructions for deploying your Video Research app to Firebase.

## Prerequisites

1. **Firebase CLI** installed:
   ```bash
   npm install -g firebase-tools
   ```

2. **Google Cloud SDK** installed (for backend deployment):
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use: `gcloud init`

3. **Login to Firebase**:
   ```bash
   firebase login
   ```

4. **Login to Google Cloud** (for backend):
   ```bash
   gcloud auth login
   gcloud config set project video-research-40c4b
   ```

## Project Structure

- **Frontend**: Next.js app → Firebase Hosting (static export)
- **Backend**: Node.js/Express → Cloud Run
- **Database**: Firestore (already configured)
- **Authentication**: Firebase Auth (already configured)

---

## Part 1: Frontend Deployment (Firebase Hosting)

### Step 1: Initialize Firebase (if not done)

```bash
cd frontend
firebase init hosting
```

When prompted:
- **Select existing project**: `video-research-40c4b`
- **Public directory**: `out` (Next.js static export output)
- **Configure as single-page app**: Yes
- **Set up automatic builds**: No (we'll do manual deployment)

### Step 2: Set Production Environment Variables

**CRITICAL:** These variables MUST be set BEFORE running `npm run build`.
Next.js static export embeds environment variables at build time.

**Option A: Using .env.production file (Recommended)**

Create `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://your-cloud-run-url.run.app
NEXT_PUBLIC_USE_FIREBASE_AUTH=true
NEXT_PUBLIC_SKIP_AUTH=false
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=video-research-40c4b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=video-research-40c4b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=video-research-40c4b.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=723520495466
NEXT_PUBLIC_FIREBASE_APP_ID=1:723520495466:web:6fda6d5e11c877bca44f13
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-JSDG4VDKT9
```

**Option B: Using environment variables (PowerShell)**

```powershell
$env:NEXT_PUBLIC_API_URL="https://your-cloud-run-url.run.app"
$env:NEXT_PUBLIC_USE_FIREBASE_AUTH="true"
$env:NEXT_PUBLIC_SKIP_AUTH="false"
$env:NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM"
$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="video-research-40c4b.firebaseapp.com"
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID="video-research-40c4b"
$env:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="video-research-40c4b.firebasestorage.app"
$env:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="723520495466"
$env:NEXT_PUBLIC_FIREBASE_APP_ID="1:723520495466:web:6fda6d5e11c877bca44f13"
$env:NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-JSDG4VDKT9"
npm run build
```

**Option C: Using environment variables (Bash)**

```bash
export NEXT_PUBLIC_API_URL="https://your-cloud-run-url.run.app"
export NEXT_PUBLIC_USE_FIREBASE_AUTH="true"
export NEXT_PUBLIC_SKIP_AUTH="false"
export NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM"
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="video-research-40c4b.firebaseapp.com"
export NEXT_PUBLIC_FIREBASE_PROJECT_ID="video-research-40c4b"
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="video-research-40c4b.firebasestorage.app"
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="723520495466"
export NEXT_PUBLIC_FIREBASE_APP_ID="1:723520495466:web:6fda6d5e11c877bca44f13"
export NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-JSDG4VDKT9"
npm run build
```

**Important Notes:**
- Replace `https://your-cloud-run-url.run.app` with your actual Cloud Run URL
- `NEXT_PUBLIC_SKIP_AUTH` MUST be `false` in production (security requirement)
- If you see `localhost:5000` errors in production, the build was misconfigured
- The validation script will automatically check these values before building

### Step 3: Build the Frontend

**Recommended: Use the production build script with validation**

```bash
cd frontend
npm install
npm run build:production
```

This will:
1. Validate all environment variables
2. Ensure API URL is not localhost
3. Ensure SKIP_AUTH is false
4. Build the production bundle

**Alternative: Manual build with validation**

```bash
npm run validate-env
npm run build
```

This creates a static export in the `out/` directory.

### Step 4: Deploy to Firebase Hosting

**Option A: One-command deployment (Recommended)**

```bash
npm run deploy:firebase
```

This will build and deploy in one step.

**Option B: Manual deployment**

```bash
firebase deploy --only hosting
```

Or deploy to a specific project:

```bash
firebase use video-research-40c4b
firebase deploy --only hosting
```

Your frontend will be available at:
- `https://video-research-40c4b.web.app`
- `https://video-research-40c4b.firebaseapp.com`

---

## Part 2: Backend Deployment (Cloud Run)

### Step 1: Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Step 2: Set Up Service Account (if using Workload Identity)

The service account should already exist. Verify it:

```bash
gcloud iam service-accounts list
```

You should see: `firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com`

### Step 3: Prepare Environment Variables

You'll need these environment variables for Cloud Run. Create a file with your secrets or set them directly:

**Required Variables:**
- `NODE_ENV=production`
- `FRONTEND_URL=https://video-research-40c4b.web.app`
- `USE_FIREBASE_AUTH=true`
- `SUPADATA_API_KEY=your-key`
- `DASHSCOPE_BEIJING_API_KEY=your-key`
- `YOUTUBE_API_KEYS=key1,key2,key3` (comma-separated)

### Step 4: Build and Deploy to Cloud Run

#### Option A: Using Google Container Registry (GCR)

```bash
cd backend

# Build and push Docker image
gcloud builds submit --tag gcr.io/video-research-40c4b/api

# Deploy to Cloud Run
gcloud run deploy api \
  --image gcr.io/video-research-40c4b/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --service-account firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com \
  --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://video-research-40c4b.web.app,USE_FIREBASE_AUTH=true" \
  --set-secrets "SUPADATA_API_KEY=supadata-api-key:latest,DASHSCOPE_BEIJING_API_KEY=dashscope-api-key:latest"
```

#### Option B: Using Artifact Registry (Recommended)

```bash
# Create Artifact Registry repository (first time only)
gcloud artifacts repositories create api \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository for API"

# Build and push
gcloud builds submit --tag us-central1-docker.pkg.dev/video-research-40c4b/api/backend:latest

# Deploy
gcloud run deploy api \
  --image us-central1-docker.pkg.dev/video-research-40c4b/api/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --service-account firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com \
  --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://video-research-40c4b.web.app,USE_FIREBASE_AUTH=true"
```

### Step 5: Set Up Secrets (if using secrets)

If you want to use Google Cloud Secrets Manager:

```bash
# Create secrets
echo -n "your-supadata-key" | gcloud secrets create supadata-api-key --data-file=-
echo -n "your-dashscope-key" | gcloud secrets create dashscope-api-key --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding supadata-api-key \
  --member="serviceAccount:firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding dashscope-api-key \
  --member="serviceAccount:firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then update your deployment to use secrets:

```bash
gcloud run services update api \
  --update-secrets "SUPADATA_API_KEY=supadata-api-key:latest,DASHSCOPE_BEIJING_API_KEY=dashscope-api-key:latest" \
  --region us-central1
```

### Step 6: Get Your Cloud Run URL

After deployment, you'll get a URL like:
```
https://api-xxxxx-uc.a.run.app
```

**Save this URL** - you'll need it for the frontend environment variables.

### Step 7: Update Frontend with Backend URL

Go back to **Part 1, Step 2** and update `NEXT_PUBLIC_API_URL` with your Cloud Run URL, then rebuild and redeploy the frontend.

---

## Part 3: Deploy Firestore Security Rules

```bash
# From project root
firebase deploy --only firestore:rules
```

Or from the frontend directory:

```bash
cd frontend
firebase deploy --only firestore:rules
```

---

## Part 4: Verify Deployment

### 1. Test Frontend

Visit:
- `https://video-research-40c4b.web.app`
- `https://video-research-40c4b.firebaseapp.com`

### 2. Test Backend Health Check

```bash
curl https://your-cloud-run-url.run.app/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "services": {
    "database": "connected"
  }
}
```

### 3. Test Authentication

1. Go to your frontend URL
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify you can access protected routes

---

## Quick Deployment Script

Create a `deploy.sh` script for easier deployment:

```bash
#!/bin/bash

# Frontend deployment
echo "Building frontend..."
cd frontend
npm run build
firebase deploy --only hosting
cd ..

# Backend deployment
echo "Building and deploying backend..."
cd backend
gcloud builds submit --tag gcr.io/video-research-40c4b/api
gcloud run deploy api \
  --image gcr.io/video-research-40c4b/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
cd ..

echo "Deployment complete!"
```

For Windows PowerShell, create `deploy.ps1`:

```powershell
# Frontend deployment
Write-Host "Building frontend..."
Set-Location frontend
npm run build
firebase deploy --only hosting
Set-Location ..

# Backend deployment
Write-Host "Building and deploying backend..."
Set-Location backend
gcloud builds submit --tag gcr.io/video-research-40c4b/api
gcloud run deploy api `
  --image gcr.io/video-research-40c4b/api `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated
Set-Location ..

Write-Host "Deployment complete!"
```

---

## Troubleshooting

### Frontend Issues

**Build fails:**
- Check Node.js version (18+ required)
- Clear `.next` and `out` directories
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Static export issues:**
- Ensure `next.config.ts` has `output: 'export'`
- Remove any server-side features (API routes, SSR)

**CORS errors:**
- Verify `NEXT_PUBLIC_API_URL` points to correct backend
- Check backend CORS configuration includes your Firebase Hosting domains

### Backend Issues

**Service won't start:**
- Check logs: `gcloud run services logs read api --region us-central1`
- Verify environment variables are set correctly
- Check service account permissions

**Database connection issues:**
- Verify service account has Firestore permissions
- Check that `GOOGLE_APPLICATION_CREDENTIALS` is set (or using Workload Identity)
- Verify Firestore is enabled in Firebase Console

**Build fails:**
- Check Dockerfile syntax
- Verify all files are copied correctly
- Check TypeScript compilation errors

### General Issues

**Firebase CLI not found:**
```bash
npm install -g firebase-tools
```

**Not logged in:**
```bash
firebase login
gcloud auth login
```

**Wrong project:**
```bash
firebase use video-research-40c4b
gcloud config set project video-research-40c4b
```

---

## Updating After Changes

### Frontend Updates

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend Updates

```bash
cd backend
gcloud builds submit --tag gcr.io/video-research-40c4b/api
gcloud run deploy api \
  --image gcr.io/video-research-40c4b/api \
  --platform managed \
  --region us-central1
```

### Firestore Rules Updates

```bash
firebase deploy --only firestore:rules
```

---

## Monitoring

### View Logs

**Frontend:**
- Firebase Console > Hosting > View logs

**Backend:**
```bash
gcloud run services logs read api --region us-central1
gcloud run services logs tail api --region us-central1  # Stream logs
```

### Firebase Console

Monitor:
- Authentication events
- Firestore usage
- Hosting traffic
- Error rates

### Cloud Run Console

Monitor:
- Request latency
- Memory/CPU usage
- Error rates
- Request counts

---

## Cost Optimization

### Firebase Hosting (Free Tier)
- 10 GB storage
- 360 MB/day data transfer
- Usually sufficient for small/medium apps

### Cloud Run (Pay per use)
- First 2 million requests/month: Free
- After that: $0.40 per million requests
- Memory/CPU charges based on usage
- Set `min-instances=0` to scale to zero when not in use

### Firestore
- Free tier: 50K reads, 20K writes, 20K deletes per day
- Monitor usage in Firebase Console

---

## Next Steps

1. ✅ Set up custom domain (optional)
2. ✅ Configure monitoring and alerts
3. ✅ Set up CI/CD pipeline (GitHub Actions)
4. ✅ Configure backup and disaster recovery
5. ✅ Review and optimize costs

---

## Quick Reference

### Frontend URLs
- Production: `https://video-research-40c4b.web.app`
- Alternative: `https://video-research-40c4b.firebaseapp.com`

### Backend URL
- Get from: `gcloud run services describe api --region us-central1`
- Format: `https://api-xxxxx-uc.a.run.app`

### Firebase Project
- Project ID: `video-research-40c4b`
- Project Number: `723520495466`

### Service Account
- Email: `firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com`

---

**Need Help?**
- Firebase Docs: https://firebase.google.com/docs
- Cloud Run Docs: https://cloud.google.com/run/docs
- Check the troubleshooting section above

