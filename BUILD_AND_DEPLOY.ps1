# Build and Deploy Backend to Cloud Run
# Run this script from the project root directory

Write-Host "🔨 Building backend Docker image..." -ForegroundColor Cyan

# Find gcloud command (handles cases where it's not in PATH)
$gcloudCmd = "gcloud"
if (-not (Get-Command $gcloudCmd -ErrorAction SilentlyContinue)) {
    # Try common installation locations
    $gcloudPaths = @(
        "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        "${env:ProgramFiles(x86)}\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    )
    
    foreach ($path in $gcloudPaths) {
        if (Test-Path $path) {
            $gcloudCmd = $path
            # Add to current session PATH for subsequent calls
            $env:Path += ";$([System.IO.Path]::GetDirectoryName($path))"
            Write-Host "Found gcloud at: $path" -ForegroundColor Yellow
            break
        }
    }
    
    if (-not (Test-Path $gcloudCmd)) {
        Write-Host "❌ Error: gcloud not found. Please install Google Cloud SDK or add it to PATH." -ForegroundColor Red
        exit 1
    }
}

# Set Google Cloud project if not already set
$projectId = "video-research-40c4b"
$currentProject = & $gcloudCmd config get-value project 2>$null
if (-not $currentProject -or $currentProject -ne $projectId) {
    Write-Host "⚙️  Setting Google Cloud project to: $projectId" -ForegroundColor Yellow
    & $gcloudCmd config set project $projectId | Out-Null
}

# Navigate to backend directory
Set-Location backend

# Build and push Docker image to Google Container Registry
# Note: Docker will detect changes to scripts/copy-prompts.js and rebuild accordingly
Write-Host "📦 Building image..." -ForegroundColor Yellow
& $gcloudCmd builds submit --tag gcr.io/video-research-40c4b/video-research:latest

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Cyan
    
    # Deploy to Cloud Run first (without env vars to avoid comma parsing issues)
    & $gcloudCmd run deploy video-research `
        --image gcr.io/video-research-40c4b/video-research:latest `
        --platform managed `
        --region asia-southeast1 `
        --allow-unauthenticated `
        --port 8080 `
        --memory 512Mi `
        --cpu 1 `
        --timeout 3600
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "⚙️  Updating environment variables..." -ForegroundColor Yellow
        
        # Update FRONTEND_URL first (no commas, safe)
        & $gcloudCmd run services update video-research `
            --region asia-southeast1 `
            --update-env-vars "FRONTEND_URL=https://video-research-40c4b.web.app"
        
        if ($LASTEXITCODE -eq 0) {
            # For FRONTEND_URLS with commas, use escaped quotes format for gcloud
            # Format: FRONTEND_URLS="url1,url2" - inner quotes must be escaped
            # Use single quotes to prevent PowerShell variable expansion, then pass with quotes
            $frontendUrlsArg = 'FRONTEND_URLS="https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app"'
            
            # Quote the variable to ensure it's passed as a single argument
            & $gcloudCmd run services update video-research `
                --region asia-southeast1 `
                --update-env-vars "$frontendUrlsArg"
            
            $envVarUpdateSuccess = ($LASTEXITCODE -eq 0)
        } else {
            $envVarUpdateSuccess = $false
        }
        
        if ($envVarUpdateSuccess) {
            Write-Host ""
            Write-Host "✅ Deployment successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 Your backend is now deployed!" -ForegroundColor Green
            Write-Host "⏱️  Wait 2-3 minutes, then test: https://video-research-40c4b.web.app" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Environment variable update failed." -ForegroundColor Red
            Write-Host "💡 Please update FRONTEND_URLS manually via Cloud Console:" -ForegroundColor Yellow
            Write-Host "   https://console.cloud.google.com/run/detail/asia-southeast1/video-research" -ForegroundColor Cyan
            Write-Host "   Set FRONTEND_URLS to: https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Deployment failed. Check the error above." -ForegroundColor Red
    }
} else {
    Write-Host "❌ Build failed. Check the error above." -ForegroundColor Red
}

# Return to project root
Set-Location ..

