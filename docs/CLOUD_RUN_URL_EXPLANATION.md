# What is a Cloud Run URL?

## Simple Explanation

**Cloud Run** is Google Cloud Platform's service where your **backend API** (the server that handles API requests) runs.

When you deploy your backend to Cloud Run, Google automatically gives you a **public URL** that looks like:
```
https://api-xxxxx-uc.a.run.app
```

This URL is where your frontend will send API requests (like `/api/summarize`, `/api/history`, etc.).

## Why Do You Need It?

Your frontend (the website users see) needs to know where to send API requests. 

- **In development**: Frontend uses `http://localhost:5000` (your local backend)
- **In production**: Frontend needs the Cloud Run URL (your deployed backend)

## How to Get Your Cloud Run URL

### Option 1: After Deploying Backend (Recommended)

After you deploy your backend to Cloud Run, the deployment command will show you the URL:

```bash
cd backend
gcloud run deploy api \
  --image gcr.io/video-research-40c4b/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Output will look like:**
```
Service [api] revision [api-00001-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://api-xxxxx-uc.a.run.app
```

**Copy that URL!** That's your Cloud Run URL.

### Option 2: Get URL from Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Cloud Run** service
3. Click on your service name (usually `api`)
4. The URL will be displayed at the top of the page

### Option 3: Using gcloud CLI

```bash
gcloud run services describe api --region us-central1 --format 'value(status.url)'
```

This will output your Cloud Run URL directly.

## What to Do With It

Once you have your Cloud Run URL, you need to:

1. **Create `.env.production` file** in `frontend/` directory
2. **Set `NEXT_PUBLIC_API_URL`** to your Cloud Run URL

Example `.env.production`:
```env
NEXT_PUBLIC_API_URL=https://api-xxxxx-uc.a.run.app
NEXT_PUBLIC_USE_FIREBASE_AUTH=true
NEXT_PUBLIC_SKIP_AUTH=false
# ... other variables
```

## Important Notes

- ✅ The URL must start with `https://` (not `http://`)
- ✅ The URL should end with `.run.app`
- ✅ Never use `localhost` in production
- ✅ The URL is unique to your deployment

## Example Cloud Run URLs

Valid examples:
- `https://api-abc123-uc.a.run.app`
- `https://video-research-api-xyz789-uc.a.run.app`

Invalid examples:
- `http://api-abc123-uc.a.run.app` (missing `s` in `https`)
- `http://localhost:5000` (this is for development only)
- `https://api-abc123-uc.run.app` (missing region code)

## Still Don't Have a Backend Deployed?

If you haven't deployed your backend yet, you need to:

1. **Deploy the backend first** (see `FIREBASE_DEPLOYMENT_GUIDE.md` Part 2)
2. **Get the Cloud Run URL** from the deployment output
3. **Then** create `.env.production` with that URL
4. **Then** build and deploy the frontend

The order matters: **Backend first, then Frontend!**


