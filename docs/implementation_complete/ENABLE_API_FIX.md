# Fix: Enable Artifact Registry API

## Quick Fix: Enable the API

The error means Google Cloud needs the Artifact Registry API enabled. Here's how to fix it:

### Option 1: Click the Link (Easiest)

Just click this link to enable it:
https://console.developers.google.com/apis/api/artifactregistry.googleapis.com/overview?project=723520495466

Then click **"Enable"** button.

### Option 2: Enable via Cloud Console

1. Go to: https://console.cloud.google.com/apis/library
2. Search for: **"Artifact Registry API"**
3. Click on it
4. Click **"Enable"** button
5. Wait 1-2 minutes for it to activate

### Option 3: Use Container Registry Instead (Alternative)

If you prefer to use the older Container Registry (GCR), enable this API instead:
1. Go to: https://console.cloud.google.com/apis/library
2. Search for: **"Container Registry API"**
3. Enable it

## After Enabling

Wait 1-2 minutes, then run the build command again:

```bash
gcloud builds submit --tag gcr.io/video-research-40c4b/video-research:latest
```

## Alternative: Use Artifact Registry (Recommended)

Google recommends using Artifact Registry instead of Container Registry. If you want to switch:

1. Enable Artifact Registry API (as above)
2. Create an Artifact Registry repository:
   ```bash
   gcloud artifacts repositories create video-research \
     --repository-format=docker \
     --location=asia-southeast1 \
     --description="Docker repository for video research backend"
   ```
3. Build with Artifact Registry URL:
   ```bash
   gcloud builds submit --tag asia-southeast1-docker.pkg.dev/video-research-40c4b/video-research/backend:latest
   ```

But for now, just enable the API and use the original command - that's simpler!

