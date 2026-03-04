#!/bin/bash

# Fix CORS Configuration for Cloud Run
# This script updates the Cloud Run service to include Firebase hosting domains in CORS

echo "🔧 Fixing CORS configuration for Cloud Run..."

# Detect the region from the service URL or use default
REGION=${CLOUD_RUN_REGION:-"asia-southeast1"}
SERVICE_NAME=${CLOUD_RUN_SERVICE:-"api"}

echo "📍 Region: $REGION"
echo "🔌 Service: $SERVICE_NAME"

# Update Cloud Run service with FRONTEND_URLS
# This includes both Firebase hosting domains
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars "FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"

echo ""
echo "✅ CORS configuration updated!"
echo ""
echo "📋 Current CORS allowed origins:"
echo "   - https://video-research-40c4b.firebaseapp.com"
echo "   - https://video-research-40c4b.web.app"
echo ""
echo "🔄 The service will restart automatically with the new configuration."
echo "⏱️  Wait a few seconds for the update to complete, then test your frontend."


