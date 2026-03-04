# Cloud Run Environment Variables Setup Guide

## Problem
The backend container is failing to start because required environment variables are not set in Cloud Run.

## Required Environment Variables

Your backend requires these environment variables to start:

### **Required (Must be set):**
1. **`SUPADATA_API_KEY`** - Your Supadata API key
2. **`DASHSCOPE_BEIJING_API_KEY`** - Your Dashscope Beijing API key
3. **`NODE_ENV`** - Set to `production`
4. **`FRONTEND_URL`** - Your frontend URL: `https://video-research-40c4b.web.app`
5. **`FRONTEND_URLS`** - Comma-separated frontend URLs: `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`

### **Optional (Recommended):**
6. **`USE_FIREBASE_AUTH`** - Set to `true` if using Firebase Auth
7. **`YOUTUBE_API_KEYS`** - Comma-separated YouTube API keys (optional but recommended)
8. **`LOG_LEVEL`** - Set to `info` or `debug`

## How to Set Environment Variables

### Option 1: Via Google Cloud Console (Easiest)

1. **Go to Cloud Run Console:**
   - Visit: https://console.cloud.google.com/run/detail/asia-southeast1/video-research
   - Or navigate: Cloud Run → video-research → Edit & Deploy New Revision

2. **Click on "Variables & Secrets" tab**

3. **Add each environment variable:**
   - Click "Add Variable"
   - Enter the variable name and value
   - For `FRONTEND_URLS`, enter: `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`

4. **Click "Deploy"** to save changes

### Option 2: Via gcloud CLI

Run these commands (replace the API keys with your actual keys):

```powershell
# Set required environment variables
gcloud run services update video-research `
  --region asia-southeast1 `
  --update-env-vars "NODE_ENV=production,FRONTEND_URL=https://video-research-40c4b.web.app,SUPADATA_API_KEY=your-supadata-key,DASHSCOPE_BEIJING_API_KEY=your-dashscope-key"

# Set FRONTEND_URLS separately (due to comma issue)
# Note: You may need to set this via Console if the command fails
gcloud run services update video-research `
  --region asia-southeast1 `
  --update-env-vars "FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"

# Optional: Set additional variables
gcloud run services update video-research `
  --region asia-southeast1 `
  --update-env-vars "USE_FIREBASE_AUTH=true,LOG_LEVEL=info"
```

### Option 3: Using Secrets Manager (Recommended for API Keys)

For better security, store API keys in Google Cloud Secrets Manager:

```powershell
# Create secrets
echo -n "your-supadata-key" | gcloud secrets create supadata-api-key --data-file=-
echo -n "your-dashscope-key" | gcloud secrets create dashscope-api-key --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding supadata-api-key `
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding dashscope-api-key `
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"

# Mount secrets as environment variables
gcloud run services update video-research `
  --region asia-southeast1 `
  --update-secrets "SUPADATA_API_KEY=supadata-api-key:latest,DASHSCOPE_BEIJING_API_KEY=dashscope-api-key:latest"
```

## Service Account Setup (For Firebase/Firestore Access)

If you're using Firebase Auth or Firestore, you need to configure the service account:

### Option A: Workload Identity (Recommended)

```powershell
# Set the service account
gcloud run services update video-research `
  --region asia-southeast1 `
  --service-account firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com
```

### Option B: Service Account JSON File

If using a service account JSON file:
1. Upload the JSON file to Cloud Storage or Secrets Manager
2. Mount it as a volume in Cloud Run
3. Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path

## Verify Environment Variables

After setting the variables, check the logs to ensure the service starts:

```powershell
# View logs
gcloud run services logs read video-research --region asia-southeast1 --limit 50

# Or check in Console:
# https://console.cloud.google.com/run/detail/asia-southeast1/video-research/logs
```

## Quick Checklist

- [ ] `SUPADATA_API_KEY` is set
- [ ] `DASHSCOPE_BEIJING_API_KEY` is set
- [ ] `NODE_ENV=production` is set
- [ ] `FRONTEND_URL` is set
- [ ] `FRONTEND_URLS` is set (with comma-separated URLs)
- [ ] Service account is configured (if using Firebase)
- [ ] Check logs to verify the service starts successfully

## Troubleshooting

### Container fails to start
- Check Cloud Run logs for specific error messages
- Verify all required environment variables are set
- Ensure API keys are valid

### CORS errors
- Verify `FRONTEND_URL` and `FRONTEND_URLS` are set correctly
- Check that your frontend domain matches exactly

### Database connection errors
- Verify service account has proper permissions
- Check `GOOGLE_APPLICATION_CREDENTIALS` is set correctly (if using file)

## Next Steps

After setting environment variables:
1. The service should automatically restart with new configuration
2. Wait 1-2 minutes for the new revision to deploy
3. Test the health endpoint: `https://your-service-url.run.app/health`
4. Check logs to ensure no errors

