# Firestore Data Persistence Fix Plan

## ✅ Solution Implemented: Automatic Storage Switching

**Good News!** The configuration now **automatically switches** between local storage and Firestore based on the environment:

- **Localhost/Development** (`NODE_ENV=development` or not set): Automatically uses **local storage**
- **Production** (`NODE_ENV=production`): Automatically uses **Firestore**
- **Explicit Override**: You can still set `USE_LOCAL_STORAGE=true/false` to override if needed

**What this means:**
- ✅ **No manual configuration needed** when switching between local and production
- ✅ **Local testing**: Just run `npm run dev` - uses local storage automatically
- ✅ **Production deployment**: Just ensure `NODE_ENV=production` is set in Cloud Run (should be automatic)
- ✅ **No more switching config files** before testing/deploying

---

## Problem Analysis

### Current Issue
The web application is functioning correctly (users can login and create summaries), but **no data is being saved to Firestore**. The Firestore database remains empty, and user accounts and summaries are not persisting.

### Root Cause

The backend is configured to use **local file storage** instead of **Firestore**. This was determined by the `USE_LOCAL_STORAGE` setting, which can be set via:

1. **Environment variable**: `USE_LOCAL_STORAGE` (takes precedence)
2. **Config file**: `config.yaml` → `system.use_local_storage` (fallback)

**Previous Configuration:**
- `backend/config.yaml` line 12: `use_local_storage: true`
- No `USE_LOCAL_STORAGE` environment variable was set in Cloud Run
- The code logic: `env.USE_LOCAL_STORAGE || config.system.use_local_storage` defaulted to `true`
- Result: Backend wrote to local files instead of Firestore

**✅ Solution Implemented:**
The configuration now **automatically switches** based on `NODE_ENV`:
- **Development** (`NODE_ENV=development` or not set): Uses **local storage** automatically
- **Production** (`NODE_ENV=production`): Uses **Firestore** automatically
- **Explicit override**: `USE_LOCAL_STORAGE` environment variable can still override auto-detection

This means:
- ✅ Localhost testing: No configuration needed, uses local storage automatically
- ✅ Cloud Run deployment: Just ensure `NODE_ENV=production` is set (which Cloud Run should set by default)
- ✅ No manual switching needed between environments

**Why Data Isn't Persisting:**
1. Backend is running on Cloud Run (ephemeral containers)
2. Local file storage writes to container filesystem
3. Container filesystem is destroyed when container stops/scales
4. Firestore is never written to, so database remains empty

### Evidence from Codebase

**Storage Mode Detection** (`backend/src/config/index.ts:509-511`):
```typescript
export function useLocalStorage(): boolean {
  return env.USE_LOCAL_STORAGE || config.system.use_local_storage;
}
```

**Database Initialization** (`backend/src/config/database.ts:13-22`):
```typescript
function initializeFirebase() {
  // Skip Firebase initialization if using local storage
  if (USE_LOCAL_STORAGE) {
    logger.info('🚀 LOCAL STORAGE MODE - Skipping Firebase initialization');
    return null as any; // Returns dummy object
  }
  // ... Firestore initialization
}
```

**User Creation** (`backend/src/models/User.ts:163-166`):
```typescript
export async function createUser(data: UserCreateData): Promise<User> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.createUser(data); // Writes to local JSON file
  }
  // Firestore implementation is never reached
}
```

**Summary Creation** (`backend/src/models/Summary.ts:108-125`):
```typescript
export async function createSummary(data: SummaryCreateData): Promise<Summary> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.createSummary(data); // Writes to local JSON file
  }
  // Firestore implementation is never reached
}
```

### Additional Issues to Address

1. **Firebase Admin SDK Initialization**: Need to verify it's properly initialized when switching to Firestore
2. **Service Account Credentials**: Must ensure `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
3. **Firestore Database Creation**: Verify the Firestore database is created and accessible
4. **Authentication Flow**: Ensure `getOrCreateUserByUid()` works correctly with Firestore
5. **Error Handling**: Check backend logs for any silent failures

---

## Solution Plan

### Phase 1: Verify Production Environment (Automatic Configuration)

#### Step 1.1: Verify NODE_ENV is Set in Cloud Run
**Priority: CRITICAL**

With the automatic switching in place, you only need to ensure `NODE_ENV=production` is set in Cloud Run. The backend will automatically use Firestore.

**Verify via Google Cloud Console:**
1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select service: `video-research` (or your service name)
3. Click on the service to view details
4. Check "Variables & Secrets" tab
5. Verify `NODE_ENV` is set to `production`

**If not set, add it:**

**Via Google Cloud Console:**
1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select service: `video-research` (or your service name)
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add environment variable:
   - Name: `NODE_ENV`
   - Value: `production`
6. Click "Deploy"

**Via gcloud CLI:**
```bash
gcloud run services update video-research \
  --region asia-southeast1 \
  --update-env-vars "NODE_ENV=production"
```

**Note:** Cloud Run should set `NODE_ENV=production` by default, but verify it's set. With this, the backend will automatically use Firestore.

**Optional: Explicit Override**
If you want to explicitly force Firestore (even though it's automatic in production), you can still set:
```bash
--update-env-vars "USE_LOCAL_STORAGE=false"
```

However, this is **not necessary** if `NODE_ENV=production` is set.

#### Step 1.2: Verify Required Environment Variables
**Priority: CRITICAL**

Ensure these environment variables are set in Cloud Run:

```bash
# Production environment (triggers automatic Firestore mode)
NODE_ENV=production

# Required for Firestore (when NODE_ENV=production)
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json  # Or use Workload Identity
USE_FIREBASE_AUTH=true
AUTH_ENABLED=true

# Required for API functionality
SUPADATA_API_KEY=your-key
DASHSCOPE_BEIJING_API_KEY=your-key

# Frontend URLs
FRONTEND_URL=https://video-research-40c4b.web.app
FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app
```

**Note:** `USE_LOCAL_STORAGE` is **no longer required** - the backend automatically uses Firestore when `NODE_ENV=production`.

#### Step 1.3: Configuration Behavior (Automatic)

**How it works:**
- ✅ **Development** (`NODE_ENV=development` or not set): Uses local storage from `config.yaml`
- ✅ **Production** (`NODE_ENV=production`): Automatically uses Firestore
- ✅ **Explicit override**: Set `USE_LOCAL_STORAGE=true/false` to override auto-detection if needed

**No manual switching needed** - the backend handles it automatically based on the environment!

---

### Phase 2: Verify Firebase/Firestore Setup

#### Step 2.1: Verify Firestore Database Exists
**Priority: HIGH**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `video-research-40c4b`
3. Navigate to: **Firestore Database**
4. Verify:
   - Database is created (Native mode)
   - No errors or warnings
   - Database is in the correct region

**If database doesn't exist:**
1. Click "Create database"
2. Select "Start in production mode" (rules will be deployed separately)
3. Choose location (preferably same region as Cloud Run: `asia-southeast1`)

#### Step 2.2: Verify Service Account Permissions
**Priority: HIGH**

The service account used by Cloud Run needs these IAM roles:

- `roles/firebase.admin`
- `roles/datastore.user` (for Firestore)
- `roles/iam.serviceAccountTokenCreator` (for token creation)

**Check current permissions:**
```bash
# Get the service account used by Cloud Run
gcloud run services describe video-research \
  --region asia-southeast1 \
  --format="value(spec.template.spec.serviceAccountName)"

# Check IAM bindings
gcloud projects get-iam-policy video-research-40c4b \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SERVICE_ACCOUNT@*.iam.gserviceaccount.com"
```

**Grant permissions if missing:**
```bash
# Get the service account email
SERVICE_ACCOUNT="your-service-account@video-research-40c4b.iam.gserviceaccount.com"

# Grant roles
gcloud projects add-iam-policy-binding video-research-40c4b \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding video-research-40c4b \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.user"
```

#### Step 2.3: Verify Service Account Credentials
**Priority: HIGH**

**Option A: Using Workload Identity (Recommended)**

Cloud Run should use a service account with Workload Identity:

```bash
# Check if service account is set
gcloud run services describe video-research \
  --region asia-southeast1 \
  --format="value(spec.template.spec.serviceAccountName)"

# If not set, set it:
gcloud run services update video-research \
  --region asia-southeast1 \
  --service-account=firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com
```

**Note**: When using Workload Identity, you don't need `GOOGLE_APPLICATION_CREDENTIALS`. The Admin SDK will automatically use the service account.

**Option B: Using Service Account JSON File**

If using a JSON file:

1. Ensure file exists in container at path specified by `GOOGLE_APPLICATION_CREDENTIALS`
2. Mount as Cloud Secret (recommended) or copy into Docker image
3. Verify file permissions (readable by container user)

**Mount as Cloud Secret:**
```bash
# Upload service account as secret
gcloud secrets create firebase-service-account \
  --data-file=./firebase-service-account.json

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding firebase-service-account \
  --member="serviceAccount:YOUR_CLOUD_RUN_SA@*.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Update Cloud Run to mount secret
gcloud run services update video-research \
  --region asia-southeast1 \
  --update-secrets="GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account:latest"
```

---

### Phase 3: Deploy Firestore Security Rules

#### Step 3.1: Review Current Rules
**Priority: MEDIUM**

The current `firestore.rules` file has security rules that require authentication. However, since the backend uses Firebase Admin SDK (which bypasses rules), these rules mainly protect against direct client access.

**Current rules issue**: Rules reference `request.auth.uid` but the backend writes documents with `user_id` field containing Firestore document IDs, not Firebase Auth UIDs. This could cause issues if clients try to read directly.

**Action**: Review and update rules if client-side Firestore access is needed, or ensure all access goes through the backend API.

#### Step 3.2: Deploy Rules
**Priority: MEDIUM**

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules
```

**Verify deployment:**
1. Go to Firebase Console → Firestore Database → Rules
2. Verify rules are deployed correctly
3. Check for any rule errors or warnings

---

### Phase 4: Update Backend Code (If Needed)

#### Step 4.1: Verify Database Initialization
**Priority: HIGH**

Check that database initialization properly handles the switch from local storage:

**Current code** (`backend/src/config/database.ts:13-22`):
```typescript
function initializeFirebase() {
  if (USE_LOCAL_STORAGE) {
    return null as any; // Dummy object
  }
  // ... Firestore initialization
}
```

**Issue**: If `USE_LOCAL_STORAGE` becomes `false` but Firebase credentials are missing, initialization will fail.

**Fix**: Ensure proper error handling and logging:

```typescript
function initializeFirebase() {
  if (USE_LOCAL_STORAGE) {
    logger.info('🚀 LOCAL STORAGE MODE - Skipping Firebase initialization');
    return null as any;
  }

  try {
    // ... existing initialization code ...
    
    // Test connection with a simple operation
    const db = admin.firestore();
    logger.info('✅ Firestore connection established');
    return db;
  } catch (error) {
    logger.error('❌ Failed to initialize Firestore', error);
    throw new Error(`Firestore initialization failed: ${error.message}`);
  }
}
```

#### Step 4.2: Add Health Check for Database
**Priority: MEDIUM**

Update the `/health` endpoint to verify Firestore connectivity:

**Current health check** should include:
- Database connection status
- Read/write capability test (optional, may add latency)

**Implementation** (if not already present):
```typescript
// In backend/src/controllers/health.controller.ts or similar
async function checkDatabaseHealth(): Promise<'connected' | 'disconnected'> {
  if (USE_LOCAL_STORAGE) {
    return 'local_storage'; // or 'connected' for local mode
  }

  try {
    const db = (await import('../config/database')).default;
    if (!db) {
      return 'disconnected';
    }
    
    // Simple connectivity test (Firestore ping)
    await db.collection('_health_check').limit(1).get();
    return 'connected';
  } catch (error) {
    logger.error('Database health check failed', error);
    return 'disconnected';
  }
}
```

#### Step 4.3: Improve Error Logging
**Priority: MEDIUM**

Add better logging for Firestore operations to diagnose issues:

**In `backend/src/models/User.ts`**:
```typescript
export async function createUser(data: UserCreateData): Promise<User> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.createUser(data);
  }

  const db = (await import('../config/database')).default;
  if (!db) {
    logger.error('❌ Firestore database not initialized');
    throw new Error('Database not initialized');
  }

  try {
    // ... existing code ...
    logger.info(`✅ Created user in Firestore: ${data.email}`, { 
      userId: docRef.id, 
      tier 
    });
    return { id: docRef.id, ...doc.data() } as User;
  } catch (error) {
    logger.error('❌ Error creating user in Firestore', {
      error: error instanceof Error ? error.message : String(error),
      email: data.email,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
```

Similar improvements for `createSummary()` and other Firestore operations.

---

### Phase 5: Testing & Verification

#### Step 5.1: Test Backend Deployment
**Priority: CRITICAL**

1. **Deploy updated backend** with `USE_LOCAL_STORAGE=false`
2. **Check Cloud Run logs** for initialization:
   ```bash
   gcloud run services logs read video-research \
     --region asia-southeast1 \
     --limit 100
   ```

3. **Look for these log messages**:
   - ✅ `Firebase Firestore connection established successfully`
   - ❌ `LOCAL STORAGE MODE - Skipping Firebase initialization` (should NOT appear)
   - ❌ Any database initialization errors

4. **Test health endpoint**:
   ```bash
   curl https://your-cloud-run-url.run.app/health
   ```
   
   Expected response:
   ```json
   {
     "status": "healthy",
     "services": {
       "database": "connected"  // Should be "connected", not "local_storage"
     }
   }
   ```

#### Step 5.2: Test User Creation
**Priority: CRITICAL**

1. **Login via frontend** (Firebase Auth should work)
2. **Check backend logs** for:
   ```
   ✅ Created user in Firestore: user@example.com
   ```
3. **Verify in Firestore Console**:
   - Go to Firestore Database → Data
   - Check `users` collection
   - Should see a new document with user email, uid, tier, credits, etc.

4. **Check document structure**:
   ```json
   {
     "email": "user@example.com",
     "uid": "firebase-auth-uid-here",
     "name": "User Name",
     "tier": "free",
     "credits_remaining": 3,
     "created_at": "2024-01-01T00:00:00Z",
     "last_reset": "2024-01-01T00:00:00Z"
   }
   ```

#### Step 5.3: Test Summary Creation
**Priority: CRITICAL**

1. **Create a summary via frontend**
2. **Check backend logs** for:
   ```
   ✅ Created new summary: Summary Title
   ```
3. **Verify in Firestore Console**:
   - Check `summaries` collection
   - Should see a new document with summary data

4. **Check document structure**:
   ```json
   {
     "user_id": "firestore-user-doc-id",
     "job_id": "uuid-here",
     "batch_title": "Summary Title",
     "source_videos": [...],
     "final_summary_text": "...",
     "preset_style": "bullet_points",
     "language": "English",
     "created_at": "2024-01-01T00:00:00Z"
   }
   ```

#### Step 5.4: Test Data Retrieval
**Priority: HIGH**

1. **Refresh frontend** and check:
   - User profile loads correctly
   - Summary history shows created summaries
   - Credits are displayed correctly

2. **Test API endpoints directly**:
   ```bash
   # Get user info (requires auth token)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-api-url.run.app/auth/me

   # Get summaries (requires auth token)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-api-url.run.app/api/summaries?page=1&limit=10
   ```

3. **Verify data consistency**:
   - User document in Firestore matches frontend display
   - Summary documents match frontend history
   - Credits are correctly tracked

---

### Phase 6: Monitor and Validate

#### Step 6.1: Monitor Cloud Run Logs
**Priority: HIGH**

Set up continuous monitoring:

```bash
# Stream logs in real-time
gcloud run services logs tail video-research \
  --region asia-southeast1
```

**Watch for**:
- Firestore connection errors
- Write operation failures
- Authentication issues
- Rate limiting (if applicable)

#### Step 6.2: Monitor Firestore Usage
**Priority: MEDIUM**

1. Go to [Firebase Console](https://console.firebase.google.com/) → Usage
2. Monitor:
   - Read operations
   - Write operations
   - Storage size
   - Costs (if on Blaze plan)

#### Step 6.3: Set Up Alerts
**Priority: MEDIUM**

Configure Cloud Monitoring alerts for:
- Database connection failures
- High error rates
- Unusual write patterns
- Service downtime

---

## Rollback Plan

If issues occur after deployment:

### Immediate Rollback
```bash
# Revert to local storage mode (quick fix)
# Option 1: Set explicit override
gcloud run services update video-research \
  --region asia-southeast1 \
  --update-env-vars "USE_LOCAL_STORAGE=true"

# Option 2: Change NODE_ENV to development (triggers local storage)
gcloud run services update video-research \
  --region asia-southeast1 \
  --update-env-vars "NODE_ENV=development"
```

**Note**: This will cause data loss (local storage doesn't persist in Cloud Run), but will restore functionality.

### Data Recovery
If data was created in local storage mode, it's likely lost (container filesystem). However, if you can access container logs or filesystem snapshots, you might recover:
- User accounts (from authentication events)
- Summary content (from API logs or frontend cache)

---

## Checklist

### Pre-Deployment
- [ ] Identify current Cloud Run service name and region
- [ ] Verify Firestore database exists and is accessible
- [ ] Verify service account has correct IAM permissions
- [ ] Review current environment variables in Cloud Run
- [ ] Backup current configuration (export env vars)

### Deployment
- [ ] Verify `NODE_ENV=production` is set in Cloud Run (triggers automatic Firestore mode)
- [ ] Verify `GOOGLE_APPLICATION_CREDENTIALS` or Workload Identity is configured
- [ ] Verify `USE_FIREBASE_AUTH=true` is set
- [ ] Deploy updated backend with automatic switching code
- [ ] Deploy Firestore security rules

### Post-Deployment Verification
- [ ] Check Cloud Run logs for automatic Firestore mode selection
- [ ] Verify log message shows: `Storage mode: FIRESTORE (auto-selected Firestore for production)`
- [ ] Check Cloud Run logs for successful Firestore initialization
- [ ] Test `/health` endpoint shows `database: "connected"`
- [ ] Test user login and verify user document in Firestore
- [ ] Test summary creation and verify summary document in Firestore
- [ ] Test data retrieval (user profile, summary history)
- [ ] Verify data persists after container restart
- [ ] Monitor logs for any errors or warnings

### Long-term Monitoring
- [ ] Set up Cloud Monitoring alerts
- [ ] Monitor Firestore usage and costs
- [ ] Review logs weekly for any issues
- [ ] Document any additional configuration needed

---

## Troubleshooting

### Issue: "Firestore database not initialized"
**Cause**: `NODE_ENV` is not set to `production` or Firebase credentials are missing.

**Solution**:
1. Verify `NODE_ENV=production` is set in Cloud Run (this triggers automatic Firestore mode)
2. Check `GOOGLE_APPLICATION_CREDENTIALS` path or Workload Identity
3. Check service account permissions
4. If `USE_LOCAL_STORAGE=true` is explicitly set, remove it or set to `false`

### Issue: "Permission denied" when writing to Firestore
**Cause**: Service account lacks required IAM roles.

**Solution**:
1. Grant `roles/datastore.user` role
2. Grant `roles/firebase.admin` role
3. Verify service account is attached to Cloud Run service

### Issue: Users created but summaries not saved
**Cause**: Different code paths or error handling.

**Solution**:
1. Check backend logs for summary creation errors
2. Verify `createSummary()` is using Firestore path
3. Check for silent failures in error handling

### Issue: Data appears in Firestore but frontend doesn't show it
**Cause**: Frontend API calls or data mapping issues.

**Solution**:
1. Check frontend API calls return correct data
2. Verify `user_id` field matches between users and summaries
3. Check Firestore security rules (if client-side access)

### Issue: "Failed to initialize Firebase Admin SDK"
**Cause**: Service account file missing or invalid.

**Solution**:
1. Verify service account JSON file exists and is accessible
2. Check file permissions (readable by container)
3. Verify JSON structure is valid
4. Consider switching to Workload Identity instead

---

## Expected Outcomes

After implementing this fix:

1. ✅ **User accounts persist** in Firestore `users` collection
2. ✅ **Summaries persist** in Firestore `summaries` collection
3. ✅ **Data survives container restarts** and scaling events
4. ✅ **Firestore database is populated** with actual data
5. ✅ **Frontend displays correct user data** and summary history
6. ✅ **Backend logs show Firestore operations** instead of local storage
7. ✅ **Health endpoint reports** `database: "connected"`

---

## Additional Recommendations

### 1. Separate Configurations for Dev/Prod
Consider using environment-specific config files or ensuring all production settings come from environment variables, not `config.yaml`.

### 2. Add Integration Tests
Add tests that verify Firestore operations work correctly when `USE_LOCAL_STORAGE=false`.

### 3. Improve Configuration Validation
Add startup validation that checks:
- If `USE_LOCAL_STORAGE=false`, Firestore must be accessible
- Required environment variables are set
- Service account credentials are valid

### 4. Document Local Development Setup
Ensure developers know how to:
- Use local storage for local development
- Switch to Firestore for production-like testing
- Access Firestore emulator if needed

---

## Timeline Estimate

- **Phase 1 (Configuration)**: 15-30 minutes
- **Phase 2 (Firebase Setup)**: 30-60 minutes (if not already done)
- **Phase 3 (Security Rules)**: 15 minutes
- **Phase 4 (Code Updates)**: 1-2 hours (if needed)
- **Phase 5 (Testing)**: 30-60 minutes
- **Phase 6 (Monitoring)**: Ongoing

**Total Estimated Time**: 2-4 hours for full implementation and verification

---

## Success Criteria

This fix is successful when:

1. ✅ Firestore database contains user documents after login
2. ✅ Firestore database contains summary documents after creation
3. ✅ Data persists after Cloud Run container restarts
4. ✅ Frontend correctly displays user data and summary history
5. ✅ No errors in Cloud Run logs related to database operations
6. ✅ Health endpoint reports database as "connected"

---

## References

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Workload Identity for Cloud Run](https://cloud.google.com/run/docs/securing/service-identity)
