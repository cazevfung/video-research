# Complete Cloud Run Environment Variables Setup

## Current Environment Variables (You Already Have)

✅ **FRONTEND_URL** = `https://video-research-40c4b.web.app`  
✅ **FRONTEND_URLS** = `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`  
✅ **SUPADATA_API_KEY** = `sd_492c1f57641998736e4cae0c3b0b78c4`  
✅ **DASHSCOPE_BEIJING_API_KEY** = `sk-57b64160eb2f461390cfa25b2906956b`  
✅ **NODE_ENV** = `production`

## Required Environment Variables to ADD

### ✅ **UPDATE: Auto-Enabled in Production!**

When `NODE_ENV=production`, these are **automatically enabled**:
- ✅ `AUTH_ENABLED=true` (auto-enabled)
- ✅ `USE_FIREBASE_AUTH=true` (auto-enabled)  
- ✅ `USE_LOCAL_STORAGE=false` (auto-disabled, uses Firestore)

**You don't need to set these manually anymore!** 🎉

### 🔴 Still Required

1. **`NODE_ENV`** = `production` (you already have this!)
   - This automatically enables auth and Firebase Auth

### 🟡 Service Account (Choose One Option)

**Option A: Workload Identity (Recommended - No env var needed)**
- Configure Cloud Run service account in Cloud Console
- Service account: `firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com`
- No `GOOGLE_APPLICATION_CREDENTIALS` needed

**Option B: Service Account JSON File**
- If using a mounted JSON file, add:
- **`GOOGLE_APPLICATION_CREDENTIALS`** = `/path/to/service-account.json`
- (Usually `/app/service-account.json` or `/secrets/firebase-service-account`)

### 🟢 Optional (Recommended)

4. **`PORT`** = `8080`
   - Cloud Run default port
   - (Backend defaults to 5000, but Cloud Run uses 8080)

5. **`LOG_LEVEL`** = `info`
   - Controls logging verbosity
   - Options: `error`, `warn`, `info`, `debug`

6. **`YOUTUBE_API_KEYS`** = `key1,key2,key3`
   - Comma-separated YouTube API keys
   - Optional but recommended for video processing

## Complete Environment Variables List

Add these to your Cloud Run service:

```
AUTH_ENABLED=true
USE_FIREBASE_AUTH=true
USE_LOCAL_STORAGE=false
PORT=8080
LOG_LEVEL=info
```

## How to Add in Cloud Console

1. Go to **Cloud Run** → Your service → **Edit & Deploy New Revision**
2. Click **"Variables & Secrets"** tab
3. Click **"Add Variable"** for each:
   - `AUTH_ENABLED` = `true`
   - `USE_FIREBASE_AUTH` = `true`
   - `USE_LOCAL_STORAGE` = `false`
   - `PORT` = `8080` (optional)
   - `LOG_LEVEL` = `info` (optional)
4. Click **"Deploy"**

## Verify Service Account (If Using Workload Identity)

1. Go to **Cloud Run** → Your service → **Edit & Deploy New Revision**
2. Click **"Security"** tab
3. Under **"Service account"**, select:
   - `firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com`
4. Click **"Deploy"**

## Quick Setup via gcloud CLI

```powershell
gcloud run services update video-research `
  --region asia-southeast1 `
  --update-env-vars "AUTH_ENABLED=true,USE_FIREBASE_AUTH=true,USE_LOCAL_STORAGE=false,PORT=8080,LOG_LEVEL=info"
```

## After Adding Variables

1. **Redeploy** the service (or wait for auto-deploy)
2. **Test user signup** - Create a new account
3. **Check Firestore** - Verify `users` and `user_credits` collections are created
4. **Test endpoints**:
   - `/auth/me` - Should return user info
   - `/api/credits/balance` - Should return credits
   - `/api/history` - Should return empty array (no summaries yet)

## Troubleshooting

### Users not created in Firestore
- ✅ Check `AUTH_ENABLED=true`
- ✅ Check `USE_FIREBASE_AUTH=true`
- ✅ Check `USE_LOCAL_STORAGE=false`
- ✅ Verify service account has Firestore permissions

### Backend won't start
- ✅ Check all required env vars are set
- ✅ Check service account is configured
- ✅ Check logs: `gcloud run services logs read video-research --region asia-southeast1`

