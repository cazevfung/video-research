# Incremental Backend Deployment Guide

## How Incremental Deployments Work

Docker **already does incremental builds** through layer caching! When you deploy:

- ✅ **If `package.json` hasn't changed** → `npm install` layer is cached (saves 2-3 minutes)
- ✅ **If only one source file changed** → Only that layer and later layers rebuild
- ✅ **If nothing changed** → Build is super fast (just verification)
- ✅ **If everything changed** → Full rebuild (but still faster than manual uploads)

The `.dockerignore` and `.gcloudignore` files ensure only necessary files are uploaded/processed.

## Quick Deploy (One Command)

From the **project root** directory, run:

### PowerShell (Windows)
**Recommended: Use the script**
```powershell
.\BUILD_AND_DEPLOY.ps1
```

**Or run manually (two commands):**
```powershell
cd backend
gcloud builds submit --tag gcr.io/video-research-40c4b/video-research:latest

# After build succeeds, run:
gcloud run deploy video-research --image gcr.io/video-research-40c4b/video-research:latest --platform managed --region asia-southeast1 --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 --timeout 3600 --update-env-vars "FRONTEND_URL=https://video-research-40c4b.web.app,FRONTEND_URLS=\"https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app\""
```

**Note:** If `gcloud` command is not found, the script will automatically search common installation locations.

### Bash (Mac/Linux)
```bash
cd backend && gcloud builds submit --tag gcr.io/video-research-40c4b/video-research:latest && gcloud run deploy video-research --image gcr.io/video-research-40c4b/video-research:latest --platform managed --region asia-southeast1 --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 --timeout 3600 --update-env-vars "FRONTEND_URL=https://video-research-40c4b.web.app,FRONTEND_URLS=\"https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app\""
```

Or use the existing script:
```powershell
.\BUILD_AND_DEPLOY.ps1
```

## What Gets Uploaded/Deployed?

Only changed files are processed thanks to Docker layer caching:

### Upload Stage (`.gcloudignore` filters this)
- ✅ Source code (`src/`)
- ✅ Configuration files (`config.yaml`, `tsconfig.json`)
- ✅ Package files (`package.json`, `package-lock.json`)
- ❌ Node modules (installed during build)
- ❌ Build outputs (generated during build)
- ❌ Test files, logs, IDE files

### Build Stage (Docker layer caching)
- Layer 1: Copy `package.json` → If unchanged, cached ✅
- Layer 2: Run `npm install` → If package.json unchanged, cached ✅
- Layer 3: Copy source code → Only changed files trigger rebuild
- Layer 4: Run `npm run build` → Only if source changed
- Layer 5: Final image → Only if previous layers changed

## Performance Examples

### Scenario 1: Only changed one TypeScript file
```
Build time: ~1-2 minutes (reuses npm install, only rebuilds source)
Upload size: ~100KB (only changed files)
```

### Scenario 2: Changed package.json (added dependency)
```
Build time: ~5-7 minutes (runs npm install, rebuilds everything)
Upload size: ~10KB (just package.json)
```

### Scenario 3: Nothing changed
```
Build time: ~30 seconds (verification only)
Upload size: Minimal (just checksums)
```

### Scenario 4: Changed everything
```
Build time: ~7-10 minutes (full rebuild)
Upload size: ~500KB (source files only, no node_modules)
```

## Prerequisites

1. **Google Cloud SDK installed** and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project video-research-40c4b
   ```

2. **Cloud Run API enabled**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

3. **Permissions**: You need `Cloud Build Editor` and `Cloud Run Admin` roles

## Environment Variables

The deployment script preserves existing environment variables and updates only `FRONTEND_URL` and `FRONTEND_URLS`.

To see all environment variables:
```bash
gcloud run services describe video-research --region asia-southeast1 --format="value(spec.template.spec.containers[0].env)"
```

To update additional environment variables:
```bash
gcloud run services update video-research \
  --region asia-southeast1 \
  --update-env-vars "KEY1=value1,KEY2=value2"
```

## Troubleshooting

### Build is slow every time
- Check if you're modifying `package.json` frequently (causes npm install to rerun)
- Verify `.gcloudignore` is working (should exclude node_modules, dist, etc.)

### "Permission denied" errors
```bash
# Check authentication
gcloud auth list

# Check project
gcloud config get-value project

# Check permissions
gcloud projects get-iam-policy video-research-40c4b
```

### Build fails with "file not found"
- Make sure you're running from the `backend/` directory OR project root with `cd backend`
- Check that all required files exist (package.json, Dockerfile, etc.)

### Deployment succeeds but service doesn't work
- Check Cloud Run logs:
  ```bash
  gcloud run services logs read video-research --region asia-southeast1 --limit 50
  ```
- Verify environment variables are set correctly
- Test health endpoint: `https://[your-service-url]/health`

## Advanced: Using Cloud Build Triggers (Fully Automated)

Set up automatic deployments on git push:

1. **Connect repository** to Cloud Build (GitHub, GitLab, etc.)
2. **Create trigger** that watches `backend/` directory
3. **Configure trigger** to use `cloudbuild.yaml`
4. **Push code** → Automatic build and deploy! 🚀

See `backend/cloudbuild.yaml` for the build configuration.

## Tips for Faster Deployments

1. **Don't change `package.json` unnecessarily** - npm install is the slowest step
2. **Use `.dockerignore` and `.gcloudignore`** - Already configured ✅
3. **Group related changes** - Deploy multiple changes together
4. **Test locally first** - Catch errors before deploying
5. **Monitor build logs** - Learn which layers are being cached

