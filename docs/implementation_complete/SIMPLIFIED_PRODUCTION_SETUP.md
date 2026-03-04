# Simplified Production Setup

## You're Right! 🎯

When `NODE_ENV=production`, the system now **automatically**:
- ✅ Enables authentication (`AUTH_ENABLED=true`)
- ✅ Enables Firebase Auth (`USE_FIREBASE_AUTH=true`)
- ✅ Uses Firestore instead of local storage (`USE_LOCAL_STORAGE=false`)

## Required Environment Variables (Minimal!)

### **Only 3 Required Variables:**

1. **`NODE_ENV`** = `production` 
   - This automatically enables everything above!

2. **`FRONTEND_URL`** = `https://video-research-40c4b.web.app`
   - For CORS configuration

3. **`FRONTEND_URLS`** = `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
   - Additional frontend URLs for CORS

### **API Keys (Required):**

4. **`SUPADATA_API_KEY`** = `your-key`
5. **`DASHSCOPE_BEIJING_API_KEY`** = `your-key`

### **Optional:**

6. **`PORT`** = `8080` (Cloud Run sets this automatically)
7. **`LOG_LEVEL`** = `info` (optional)

## What You DON'T Need Anymore

❌ ~~`AUTH_ENABLED=true`~~ - Auto-enabled when `NODE_ENV=production`  
❌ ~~`USE_FIREBASE_AUTH=true`~~ - Auto-enabled when `NODE_ENV=production`  
❌ ~~`USE_LOCAL_STORAGE=false`~~ - Auto-disabled when `NODE_ENV=production`

## Service Account

**Still Required:** Set the Cloud Run service account to:
- `firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com`

This is done in Cloud Run Console → Security tab (not an environment variable).

## Complete Minimal Setup

```bash
NODE_ENV=production
FRONTEND_URL=https://video-research-40c4b.web.app
FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app
SUPADATA_API_KEY=your-key
DASHSCOPE_BEIJING_API_KEY=your-key
```

That's it! 🎉

## How It Works

The code now checks `NODE_ENV`:
- **Production** → Auth enabled, Firebase Auth enabled, Firestore used
- **Development** → Auth disabled (dev mode), local storage used

You can still override these if needed, but in production, you don't need to!

