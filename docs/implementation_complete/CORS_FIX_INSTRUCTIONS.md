# CORS Fix Instructions

## Problem
The frontend at `https://video-research-40c4b.web.app` is being blocked by CORS when trying to access the backend at `https://video-research-1028499272215.asia-southeast1.run.app`.

**Error:**
```
Access to fetch at 'https://video-research-1028499272215.asia-southeast1.run.app/api/config' 
from origin 'https://video-research-40c4b.web.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
The Cloud Run backend service doesn't have the `FRONTEND_URLS` environment variable set to include the Firebase hosting domain.

## Solution

### Quick Fix Command (Run This Now!)

**For Windows PowerShell:**
```powershell
gcloud run services update video-research-1028499272215 `
  --region asia-southeast1 `
  --update-env-vars "FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"
```

**For Linux/Mac/Bash:**
```bash
gcloud run services update video-research-1028499272215 \
  --region asia-southeast1 \
  --update-env-vars "FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"
```

**Note:** The service name `video-research-1028499272215` is derived from your backend URL. If this doesn't work, first list your services:
```bash
gcloud run services list --region asia-southeast1
```

### Option 1: Using the Fix Script

**For Windows PowerShell:**
```powershell
cd backend
.\fix-cors.ps1
```

**For Linux/Mac:**
```bash
cd backend
chmod +x fix-cors.sh
./fix-cors.sh
```

### Option 2: Manual Update via gcloud CLI

If your service name is different, use:
```bash
gcloud run services update YOUR_SERVICE_NAME \
  --region asia-southeast1 \
  --update-env-vars "FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"
```

### Option 3: Update via Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Cloud Run** → Your service
3. Click **Edit & Deploy New Revision**
4. Go to **Variables & Secrets** tab
5. Add or update environment variable:
   - **Name:** `FRONTEND_URLS`
   - **Value:** `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
6. Click **Deploy**

## Verify the Fix

### 1. Check Environment Variables

```bash
gcloud run services describe api \
  --region asia-southeast1 \
  --format 'value(spec.template.spec.containers[0].env)'
```

You should see `FRONTEND_URLS` in the output.

### 2. Test CORS from Browser

Open your browser console on `https://video-research-40c4b.web.app` and run:

```javascript
fetch('https://video-research-1028499272215.asia-southeast1.run.app/api/config')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

If CORS is fixed, you should see the config response without errors.

### 3. Check Backend Logs

```bash
gcloud run services logs read api --region asia-southeast1 --limit 50
```

Look for CORS-related warnings. If you see `CORS blocked origin: https://video-research-40c4b.web.app`, the fix didn't work.

## Additional Notes

- The backend CORS configuration supports multiple origins via the `FRONTEND_URLS` environment variable (comma-separated)
- Both Firebase hosting domains should be included:
  - `https://video-research-40c4b.web.app`
  - `https://video-research-40c4b.firebaseapp.com`
- The service will automatically restart after updating environment variables
- Wait 10-30 seconds after updating before testing

## If the Fix Doesn't Work

1. **Verify the service name and region:**
   ```bash
   gcloud run services list
   ```

2. **Check current environment variables:**
   ```bash
   gcloud run services describe api --region asia-southeast1 --format yaml | grep -A 20 env:
   ```

3. **Ensure FRONTEND_URL is also set correctly:**
   ```bash
   gcloud run services update api \
     --region asia-southeast1 \
     --update-env-vars "FRONTEND_URL=https://video-research-40c4b.web.app"
   ```

4. **Check backend logs for CORS errors:**
   ```bash
   gcloud run services logs tail api --region asia-southeast1
   ```

