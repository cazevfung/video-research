# CORS Troubleshooting Guide

## Issue: CORS Still Not Working After Adding FRONTEND_URLS

If you've added the `FRONTEND_URLS` environment variable but CORS errors persist, try these steps:

### Step 1: Verify Environment Variable Was Set Correctly

1. Go back to Cloud Run → Your service → Click on it
2. Scroll down to **"Environment variables"** section
3. Verify you see:
   - **FRONTEND_URLS** = `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
   - Make sure there are **NO SPACES** around the comma
   - Make sure both URLs are on the same line

### Step 2: Check FRONTEND_URL is Also Set

The backend code uses BOTH `FRONTEND_URL` and `FRONTEND_URLS`. Make sure `FRONTEND_URL` is also set:

1. In the same "Environment variables" section
2. Look for **FRONTEND_URL**
3. If it's missing or wrong, add/update it:
   - **Name:** `FRONTEND_URL`
   - **Value:** `https://video-research-40c4b.web.app`
4. Click **"DEPLOY"** again

### Step 3: Verify Service Restarted

1. Check the **"Revisions"** tab in your Cloud Run service
2. You should see a new revision with a recent timestamp
3. Make sure the new revision is serving 100% of traffic

### Step 4: Wait and Clear Cache

1. Wait **2-3 minutes** after deployment (sometimes it takes time)
2. Clear your browser cache (Ctrl+Shift+Delete)
3. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)

### Step 5: Check Backend Logs

1. In Cloud Run, go to the **"Logs"** tab
2. Look for any errors or warnings
3. Search for "CORS" in the logs
4. If you see "CORS blocked origin", the environment variable might not be read correctly

### Step 6: Verify the Exact Origin

The browser sends the exact origin. Make sure it matches exactly:

1. Open browser console (F12)
2. Run: `console.log(window.location.origin)`
3. This should output: `https://video-research-40c4b.web.app`
4. Make sure this EXACT value is in your `FRONTEND_URLS` (no trailing slash!)

### Step 7: Try Setting Both Variables Explicitly

Sometimes it helps to set both variables in one deployment:

1. Go to **"EDIT & DEPLOY NEW REVISION"**
2. In **"Variables & Secrets"**, make sure you have:
   - **FRONTEND_URL** = `https://video-research-40c4b.web.app`
   - **FRONTEND_URLS** = `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app`
3. Click **"DEPLOY"**

### Step 8: Check for Typos

Common mistakes:
- ❌ `https://video-research-40c4b.web.app/` (trailing slash - WRONG)
- ✅ `https://video-research-40c4b.web.app` (no trailing slash - CORRECT)
- ❌ `https://video-research-40c4b.firebaseapp.com, https://video-research-40c4b.web.app` (space after comma - WRONG)
- ✅ `https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app` (no space - CORRECT)

### Step 9: Test Directly

Test if the backend is responding with CORS headers:

1. Open browser console
2. Run:
```javascript
fetch('https://video-research-1028499272215.asia-southeast1.run.app/api/config', {
  method: 'GET',
  headers: {
    'Origin': 'https://video-research-40c4b.web.app'
  }
})
.then(r => {
  console.log('Status:', r.status);
  console.log('CORS Headers:', {
    'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Credentials': r.headers.get('Access-Control-Allow-Credentials')
  });
  return r.json();
})
.then(data => console.log('Data:', data))
.catch(err => console.error('Error:', err));
```

If you see `Access-Control-Allow-Origin: https://video-research-40c4b.web.app`, CORS is working!

### Step 10: Check Service Account Permissions

If nothing works, the service might not have permission to read environment variables. This is rare, but check:
1. Go to **"Permissions"** tab
2. Make sure the service account has proper permissions

## Still Not Working?

If none of these work, the issue might be:
1. The backend code needs to be redeployed (environment variables are read at startup)
2. There's a bug in the CORS configuration code
3. The service is using an old revision

Try creating a new revision by making a small change (like updating a comment) and redeploying.

