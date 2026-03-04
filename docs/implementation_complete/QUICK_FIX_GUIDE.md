# Quick Fix: Build and Deploy Your Backend

## Understanding the Process

**Important:** A Dockerfile is NOT a deployed image. It's a recipe for building an image.

**What you need to do:**
1. **Build** the Dockerfile → Creates a Docker image
2. **Push** the image to Google Container Registry → Stores it in the cloud
3. **Deploy** that image to Cloud Run → Uses your actual backend code

## Step-by-Step: Build Your Image

### Option 1: Using Google Cloud Console (Easiest - No CLI)

#### Step 1: Go to Cloud Build

1. Open: https://console.cloud.google.com/cloud-build
2. Make sure project `video-research-40c4b` is selected
3. Click **"Create Build"** or **"Trigger"** button

#### Step 2: Configure the Build

**If you see "Build from source" option:**

1. **Source:**
   - Choose **"Cloud Source Repositories"** (if your code is there)
   - OR **"Upload"** and select your `backend/` folder as a ZIP file
   - OR connect to **GitHub** if your code is there

2. **Build configuration:**
   - Select **"Dockerfile"**
   - **Dockerfile location:** `backend/Dockerfile` (or just `Dockerfile` if uploading backend folder)
   - **Dockerfile directory:** Leave empty or set to `backend/`

3. **Image:**
   - **Image name:** `gcr.io/video-research-40c4b/video-research:latest`
   - Or: `gcr.io/video-research-40c4b/backend:latest`

4. Click **"Create"** or **"Run"**

**If you see "Cloud Build configuration file" option:**

1. Create a `cloudbuild.yaml` file (see below)
2. Upload it with your backend code
3. Run the build

#### Step 3: Wait for Build

- Build takes 5-10 minutes
- Watch the build logs
- Wait for "SUCCESS" message

#### Step 4: Update Cloud Run Container Image

1. Go to Cloud Run: https://console.cloud.google.com/run
2. Click on service: **video-research**
3. Click **"EDIT & DEPLOY NEW REVISION"**
4. In **"Container image URL"**, click **"SELECT"**
5. Find your image: `gcr.io/video-research-40c4b/video-research:latest`
6. Click **"SELECT"**
7. Click **"DEPLOY"**

### Option 2: Using gcloud CLI (If You Have It)

```powershell
# Navigate to backend directory
cd backend

# Build and push in one command
gcloud builds submit --tag gcr.io/video-research-40c4b/video-research:latest

# Then update Cloud Run
gcloud run deploy video-research `
  --image gcr.io/video-research-40c4b/video-research:latest `
  --region asia-southeast1 `
  --platform managed
```

### Option 3: Create cloudbuild.yaml (For Cloud Build)

If Cloud Build needs a configuration file, create `backend/cloudbuild.yaml`:

```yaml
steps:
  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/video-research-40c4b/video-research:latest', '.']

  # Push the Docker image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/video-research-40c4b/video-research:latest']

images:
  - 'gcr.io/video-research-40c4b/video-research:latest'
```

Then upload this file with your backend code to Cloud Build.

## After Building: Update Cloud Run

Once the image is built:

1. **Go to Cloud Run Console**
2. **Click on "video-research" service**
3. **Click "EDIT & DEPLOY NEW REVISION"**
4. **In "Container image URL" field:**
   - Click **"SELECT"** button
   - Find: `gcr.io/video-research-40c4b/video-research:latest`
   - OR manually type: `gcr.io/video-research-40c4b/video-research:latest`
5. **Verify environment variables are still set:**
   - `FRONTEND_URL` = `https://video-research-40c4b.web.app`
   - `FRONTEND_URLS` = `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
6. **Click "DEPLOY"**

## Verify It Works

1. **Wait 2-3 minutes** for deployment
2. **Test health endpoint:**
   - Visit: `https://video-research-1028499272215.asia-southeast1.run.app/health`
   - Should see JSON response with `"status": "healthy"`
3. **Test your frontend:**
   - Go to: `https://video-research-40c4b.web.app`
   - CORS errors should be gone!

## Troubleshooting

**"Image not found" error:**
- Make sure the build completed successfully
- Check Container Registry: https://console.cloud.google.com/gcr
- Verify image name matches exactly

**Build fails:**
- Check build logs for errors
- Make sure `backend/package.json` exists
- Verify all files are included in the build

**Service won't start:**
- Check Cloud Run logs
- Verify environment variables are set
- Make sure port 8080 is configured

