# Backend Deployment Guide: Cloud Run

This guide covers deploying the backend service to Google Cloud Run.

## Prerequisites

1. **Google Cloud SDK** installed and configured
2. **Docker** installed (for local testing)
3. **Firebase project** set up: `video-research-40c4b`
4. **Service account key** available (for Cloud Run to access Firestore)

## Environment Variables

All configuration should be set via Cloud Run environment variables. Never hardcode sensitive values.

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=8080  # Cloud Run sets this automatically, but we default to 8080

# Frontend URLs (comma-separated for multiple domains)
FRONTEND_URL=https://video-research-40c4b.web.app
FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app

# Firebase Authentication
USE_FIREBASE_AUTH=true
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json

# External APIs
SUPADATA_API_KEY=your-supadata-api-key
DASHSCOPE_BEIJING_API_KEY=your-dashscope-api-key
YOUTUBE_API_KEYS=key1,key2,key3  # Comma-separated

# Optional
AUTH_ENABLED=true
LOG_LEVEL=info
```

### Service Account Setup

For Cloud Run, you have two options:

#### Option 1: Workload Identity (Recommended)

1. Create a service account in Google Cloud Console
2. Grant it necessary permissions (Firestore Admin, etc.)
3. Configure Cloud Run to use this service account
4. No need to mount service account JSON file

#### Option 2: Service Account JSON File

1. Download service account JSON from Firebase Console
2. Store it as a Cloud Secret
3. Mount it as a volume in Cloud Run

## Building and Deploying

### Step 1: Build Docker Image

```bash
cd backend

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/video-research-40c4b/api

# Or use Artifact Registry (recommended)
gcloud builds submit --tag us-central1-docker.pkg.dev/video-research-40c4b/api/backend:latest
```

### Step 2: Deploy to Cloud Run

```bash
gcloud run deploy api \
  --image gcr.io/video-research-40c4b/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://video-research-40c4b.web.app" \
  --set-secrets "SUPADATA_API_KEY=supadata-api-key:latest,DASHSCOPE_BEIJING_API_KEY=dashscope-api-key:latest"
```

### Step 3: Configure Service Account (if using Workload Identity)

```bash
gcloud run services update api \
  --service-account firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com \
  --region us-central1
```

### Step 4: Set Environment Variables

```bash
# Set all environment variables
gcloud run services update api \
  --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://video-research-40c4b.web.app,USE_FIREBASE_AUTH=true" \
  --region us-central1
```

## Health Check

The service exposes a health check endpoint at `/health`:

```bash
curl https://your-cloud-run-url.run.app/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected"
  },
  "version": "1.0.0"
}
```

## Monitoring

### Cloud Run Logs

```bash
# View logs
gcloud run services logs read api --region us-central1

# Stream logs
gcloud run services logs tail api --region us-central1
```

### Cloud Monitoring

- Set up alerts for error rates
- Monitor request latency
- Track memory and CPU usage
- Set up uptime checks for `/health` endpoint

## Scaling Configuration

Default settings:
- **Min instances:** 0 (scales to zero)
- **Max instances:** 10
- **Memory:** 512Mi
- **CPU:** 1
- **Timeout:** 300 seconds (5 minutes)

Adjust based on your traffic patterns:
- For SSE streaming, consider `min-instances=1` to avoid cold starts
- Increase memory if processing large batches
- Increase timeout if batch processing takes longer

## CORS Configuration

CORS is automatically configured to allow:
- `FRONTEND_URL` (primary frontend URL)
- `FRONTEND_URLS` (additional comma-separated URLs)
- Production Firebase Hosting domains (when `NODE_ENV=production`)

## Troubleshooting

### Service Won't Start

1. Check logs: `gcloud run services logs read api --region us-central1`
2. Verify environment variables are set correctly
3. Check service account permissions
4. Verify Docker image builds successfully

### CORS Errors

1. Ensure `FRONTEND_URL` and `FRONTEND_URLS` are set correctly
2. Check that production domains are included
3. Verify CORS middleware is working in logs

### Database Connection Issues

1. Verify `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
2. Check service account has Firestore permissions
3. Verify Firestore is enabled in Firebase Console

## Rollback

To rollback to a previous revision:

```bash
# List revisions
gcloud run revisions list --service api --region us-central1

# Rollback to specific revision
gcloud run services update-traffic api \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - id: 'auth'
        uses: 'google-github-actions/auth@v1'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'
      
      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v1'
      
      - name: 'Build and Deploy'
        run: |
          cd backend
          gcloud builds submit --tag gcr.io/video-research-40c4b/api
          gcloud run deploy api \
            --image gcr.io/video-research-40c4b/api \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
```

## Security Best Practices

1. **Never commit secrets** - Use Cloud Secrets Manager
2. **Use Workload Identity** - Prefer over service account JSON files
3. **Enable VPC connector** - If accessing private resources
4. **Set up IAM** - Use least privilege principle
5. **Enable audit logs** - Monitor access and changes
6. **Regular updates** - Keep dependencies updated
7. **Rate limiting** - Already configured in the service
8. **HTTPS only** - Cloud Run enforces HTTPS

## Cost Optimization

1. **Scale to zero** - Set `min-instances=0` for cost savings
2. **Right-size resources** - Adjust memory/CPU based on actual usage
3. **Monitor usage** - Use Cloud Monitoring to track costs
4. **Optimize cold starts** - Consider `min-instances=1` if needed

## Next Steps

1. Set up monitoring and alerts
2. Configure custom domain (if needed)
3. Set up CI/CD pipeline
4. Configure backup and disaster recovery
5. Review and optimize costs

