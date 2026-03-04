# Deploy Your Backend Code to Cloud Run

## Problem
Your Cloud Run service is currently using a default "hello" container image, not your actual backend code. That's why CORS isn't working - the CORS logic is in your backend code, not in that default container.

## Solution: Build and Deploy Your Backend

### Option 1: Using Google Cloud Console (Easiest - No CLI Required)

1. **Go to Cloud Build in Google Cloud Console:**
   - Navigate to: https://console.cloud.google.com/cloud-build
   - Make sure you're in the correct project

2. **Create a Build:**
   - Click **"Create Build"** or **"Trigger"**
   - Choose **"Build from source"**
   - Connect your repository (GitHub, etc.) OR upload your code
   - Set build configuration:
     - **Source:** Your backend code
     - **Dockerfile:** `backend/Dockerfile`
     - **Image:** `gcr.io/video-research-40c4b/video-research:latest`
   - Click **"Create"** or **"Run"**

3. **Wait for Build to Complete:**
   - This will take 5-10 minutes
   - You'll see the build progress

4. **Deploy to Cloud Run:**
   - Go back to Cloud Run
   - Click on your service "video-research"
   - Click **"EDIT & DEPLOY NEW REVISION"**
   - Under **"Container image URL"**, click **"SELECT"**
   - Choose the image you just built: `gcr.io/video-research-40c4b/video-research:latest`
   - Make sure environment variables are set:
     - `FRONTEND_URL` = `https://video-research-40c4b.web.app`
     - `FRONTEND_URLS` = `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
   - Click **"DEPLOY"**

### Option 2: Using gcloud CLI (If You Have It Installed)

**Step 1: Build the Docker Image**

```powershell
cd backend
gcloud builds submit --tag gcr.io/video-research-40c4b/video-research:latest
```

**Step 2: Deploy to Cloud Run**

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

**Note:** Replace `video-research-40c4b` with your actual project ID if different.

### Option 3: Manual Docker Build (If You Have Docker Installed)

**Step 1: Build Locally**

```powershell
cd backend
docker build -t video-research-backend .
```

**Step 2: Tag for Google Container Registry**

```powershell
docker tag video-research-backend gcr.io/video-research-40c4b/video-research:latest
```

**Step 3: Push to GCR**

```powershell
docker push gcr.io/video-research-40c4b/video-research:latest
```

**Step 4: Deploy to Cloud Run**

Use the same command as Option 2, Step 2.

## After Deployment

1. **Wait 2-3 minutes** for the service to start
2. **Test the health endpoint:**
   - Visit: `https://video-research-1028499272215.asia-southeast1.run.app/health`
   - You should see a JSON response with status "healthy"
3. **Test your frontend:**
   - Go to: `https://video-research-40c4b.web.app`
   - The CORS error should be gone!

## Required Environment Variables

Make sure these are set in Cloud Run:

- `NODE_ENV` = `production`
- `FRONTEND_URL` = `https://video-research-40c4b.web.app`
- `FRONTEND_URLS` = `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
- `USE_FIREBASE_AUTH` = `true` (if using Firebase Auth)
- `SUPADATA_API_KEY` = (your API key)
- `DASHSCOPE_BEIJING_API_KEY` = (your API key)
- `YOUTUBE_API_KEYS` = (your keys, comma-separated)

## Troubleshooting

**Build fails:**
- Check that `backend/Dockerfile` exists
- Check that `backend/package.json` exists
- Check build logs in Cloud Build console

**Deployment fails:**
- Check that the image was built successfully
- Verify environment variables are set
- Check Cloud Run logs for errors

**Still getting CORS errors:**
- Wait a few more minutes (cold start can take time)
- Clear browser cache
- Check backend logs: Cloud Run → Logs tab
- Verify environment variables are correct

