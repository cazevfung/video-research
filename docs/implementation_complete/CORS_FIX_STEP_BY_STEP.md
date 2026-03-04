# CORS Fix - Step by Step Guide

## Option 1: Fix via Google Cloud Console (Easiest - No CLI Required)

This is the easiest method if you don't have gcloud CLI installed.

### Step 1: Open Google Cloud Console
1. Go to: https://console.cloud.google.com
2. Make sure you're logged in with the correct Google account
3. Select your project: **video-research-40c4b**

### Step 2: Navigate to Cloud Run
1. In the left sidebar, click **"Cloud Run"** (under "Serverless")
2. If you don't see it, click the hamburger menu (☰) at the top left
3. Look for **"Cloud Run"** in the menu

### Step 3: Find Your Service
1. You should see a list of services
2. Look for a service that matches your backend URL: `video-research-1028499272215.asia-southeast1.run.app`
3. The service name might be:
   - `video-research-1028499272215`
   - `api`
   - Or something similar
4. **Click on the service name** to open it

### Step 4: Edit the Service
1. Click the **"EDIT & DEPLOY NEW REVISION"** button at the top
2. This opens the service configuration page

### Step 5: Add Environment Variable
1. Scroll down to the **"Variables & Secrets"** section
2. Click **"ADD VARIABLE"** or find the existing environment variables section
3. Add a new environment variable:
   - **Name:** `FRONTEND_URLS`
   - **Value:** `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
4. Make sure there are **no spaces** around the comma

### Step 6: Deploy
1. Scroll to the bottom of the page
2. Click **"DEPLOY"** button
3. Wait for the deployment to complete (usually 1-2 minutes)

### Step 7: Verify
1. After deployment completes, go back to your frontend: https://video-research-40c4b.web.app
2. Open browser console (F12)
3. Refresh the page
4. The CORS error should be gone!

---

## Option 2: Install gcloud CLI and Use Command Line

If you prefer using the command line, follow these steps:

### Step 1: Install Google Cloud SDK

**For Windows:**
1. Download the installer from: https://cloud.google.com/sdk/docs/install
2. Run the installer
3. Follow the installation wizard
4. Make sure to check "Add gcloud to PATH" during installation

**Or use PowerShell (if you have Chocolatey):**
```powershell
choco install gcloudsdk
```

### Step 2: Initialize gcloud
1. Open PowerShell
2. Run:
```powershell
gcloud init
```
3. Follow the prompts:
   - Login with your Google account
   - Select project: `video-research-40c4b`
   - Choose default region: `asia-southeast1`

### Step 3: Find Your Service Name
Run this command to list all your Cloud Run services:
```powershell
gcloud run services list --region asia-southeast1
```

This will show something like:
```
SERVICE                          REGION            URL
video-research-1028499272215     asia-southeast1   https://...
```

**Note the SERVICE name** (first column) - you'll need it for the next step.

### Step 4: Update the Service
Replace `YOUR_SERVICE_NAME` with the actual service name from Step 3:

```powershell
gcloud run services update YOUR_SERVICE_NAME `
  --region asia-southeast1 `
  --update-env-vars "FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"
```

**Important:** 
- The backtick (`) at the end of each line is for PowerShell line continuation
- Make sure there are **no spaces** after the backtick
- The quotes around the FRONTEND_URLS value are important

### Step 5: Verify
Wait 10-30 seconds, then test your frontend. The CORS error should be fixed!

---

## Troubleshooting

### "Service not found" error
- Make sure you're using the correct service name
- List services again: `gcloud run services list --region asia-southeast1`
- Check that you're in the correct project: `gcloud config get-value project`

### "Permission denied" error
- Make sure you're logged in: `gcloud auth login`
- Make sure you have Cloud Run Admin permissions

### Still getting CORS errors after fix
1. Wait a bit longer (up to 1 minute) for the service to restart
2. Clear your browser cache
3. Check backend logs:
   ```powershell
   gcloud run services logs read YOUR_SERVICE_NAME --region asia-southeast1 --limit 20
   ```
4. Look for "CORS blocked origin" messages

---

## What This Fix Does

The `FRONTEND_URLS` environment variable tells your backend which frontend domains are allowed to make API requests. By adding:
- `https://video-research-40c4b.firebaseapp.com`
- `https://video-research-40c4b.web.app`

Your backend will now accept requests from both Firebase hosting domains, fixing the CORS error.

