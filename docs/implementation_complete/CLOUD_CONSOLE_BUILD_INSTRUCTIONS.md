# Build Backend Using Cloud Console

## Step 1: Prepare Your Code

1. **Create `cloudbuild.yaml`** in your `backend/` folder (I've created this for you)
2. **Zip your backend folder:**
   - Right-click on the `backend/` folder
   - Select "Send to" → "Compressed (zipped) folder"
   - Name it `backend.zip`

## Step 2: Create Build in Cloud Console

### Method A: Using Cloud Source Repositories (Recommended)

1. **Go to Cloud Source Repositories:**
   - Navigate to: https://console.cloud.google.com/source-repos
   - Click **"Add repository"**
   - Choose **"Create new repository"**
   - Name it: `video-research-backend`
   - Click **"Create"**

2. **Push your code:**
   - Follow the instructions to push your code
   - Or use the web interface to upload files

3. **Create Build Trigger:**
   - Go back to Cloud Build → Triggers
   - Click **"Create trigger"**
   - Connect to the repository you just created
   - Set trigger to "Manual invocation"
   - Configuration: Use `backend/cloudbuild.yaml`
   - Click **"Create"**
   - Then click **"Run"** on the trigger

### Method B: Direct Build (Easier)

1. **Go to Cloud Build:**
   - Navigate to: https://console.cloud.google.com/cloud-build/builds
   - Click **"Create Build"** button (top right)

2. **If you see "Run sample build":**
   - Click it
   - This will open a build configuration
   - We'll modify it

3. **Configure the Build:**
   - **Source:** 
     - Click **"Select source"**
     - Choose **"Upload"** or **"Cloud Storage"**
     - Upload your `backend.zip` file
   - **Configuration:**
     - Select **"Cloud Build configuration file (yaml or json)"**
     - **Location:** `cloudbuild.yaml`
   - **Substitution variables:** Leave empty
   - **Advanced:** Leave defaults

4. **Run the Build:**
   - Click **"Create"** or **"Run"**
   - Wait 5-10 minutes for build to complete

### Method C: Using gcloud CLI (If You Install It)

If you want to install gcloud CLI:

1. **Download Google Cloud SDK:**
   - Go to: https://cloud.google.com/sdk/docs/install
   - Download for Windows
   - Install it

2. **Initialize:**
   ```powershell
   gcloud init
   ```
   - Login with your Google account
   - Select project: `video-research-40c4b`

3. **Build:**
   ```powershell
   cd backend
   gcloud builds submit --tag gcr.io/video-research-40c4b/video-research:latest
   ```

## Step 3: After Build Completes

1. **Go to Container Registry:**
   - Navigate to: https://console.cloud.google.com/gcr
   - You should see your image: `video-research:latest`

2. **Update Cloud Run:**
   - Go to Cloud Run: https://console.cloud.google.com/run
   - Click on service: **video-research**
   - Click **"EDIT & DEPLOY NEW REVISION"**
   - In **"Container image URL"**, click **"SELECT"**
   - Find: `gcr.io/video-research-40c4b/video-research:latest`
   - Click **"SELECT"**
   - Verify environment variables are set
   - Click **"DEPLOY"**

## Troubleshooting

**Can't find "Create Build" button:**
- Look for "Run" button instead
- Or go to History page and look for build options

**Build fails:**
- Check that `cloudbuild.yaml` is in the backend folder
- Verify all files are included in the zip
- Check build logs for specific errors

**Image not found:**
- Wait a few minutes after build completes
- Check Container Registry: https://console.cloud.google.com/gcr

