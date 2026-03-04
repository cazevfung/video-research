# Fix CORS Configuration for Cloud Run
# This script updates the Cloud Run service to include Firebase hosting domains in CORS

Write-Host "🔧 Fixing CORS configuration for Cloud Run..." -ForegroundColor Cyan

# Detect the region from the service URL or use default
$REGION = if ($env:CLOUD_RUN_REGION) { $env:CLOUD_RUN_REGION } else { "asia-southeast1" }
$SERVICE_NAME = if ($env:CLOUD_RUN_SERVICE) { $env:CLOUD_RUN_SERVICE } else { "api" }

Write-Host "📍 Region: $REGION" -ForegroundColor Yellow
Write-Host "🔌 Service: $SERVICE_NAME" -ForegroundColor Yellow

# Update Cloud Run service with FRONTEND_URLS
# This includes both Firebase hosting domains
gcloud run services update $SERVICE_NAME `
  --region $REGION `
  --update-env-vars "FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"

Write-Host ""
Write-Host "✅ CORS configuration updated!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Current CORS allowed origins:" -ForegroundColor Cyan
Write-Host "   - https://video-research-40c4b.firebaseapp.com"
Write-Host "   - https://video-research-40c4b.web.app"
Write-Host ""
Write-Host "🔄 The service will restart automatically with the new configuration." -ForegroundColor Yellow
Write-Host "⏱️  Wait a few seconds for the update to complete, then test your frontend." -ForegroundColor Yellow


