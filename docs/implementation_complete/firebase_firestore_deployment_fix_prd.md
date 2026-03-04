# Firebase/Firestore Deployment Fix - Comprehensive Analysis & Solution

## Executive Summary

The application is currently **not writing to Firestore** in production, even though account details are visible in the UI. This is causing:
- ❌ No user records in Firestore database
- ❌ Summary functionality not persisting data
- ❌ Data loss when containers restart (ephemeral Cloud Run containers)

**Root Cause**: Models are reading storage mode directly from `config.yaml` instead of using the auto-detection function that respects `NODE_ENV`.

---

## Problem Analysis

### Issue 1: Storage Mode Detection Not Working

**Location**: `backend/src/models/User.ts`, `backend/src/models/Summary.ts`, `backend/src/config/database.ts`

**Problem**:
- All models read `systemConfig.use_local_storage` directly from `config.yaml` (which is `true`)
- They do NOT use the `useLocalStorage()` function from `config/index.ts` which has auto-detection logic
- The `useLocalStorage()` function correctly checks `NODE_ENV` and returns `false` for production, but it's never called

**Current Code** (WRONG):
```typescript
// backend/src/models/User.ts:52
const systemConfig = getSystemConfig();
const USE_LOCAL_STORAGE = systemConfig.use_local_storage; // Always reads from config.yaml (true)
```

**Expected Behavior**:
```typescript
// Should use the function that auto-detects based on NODE_ENV
import { useLocalStorage } from '../config';
const USE_LOCAL_STORAGE = useLocalStorage(); // Returns false in production
```

**Impact**:
- Even with `NODE_ENV=production`, models still use local storage
- Data is written to ephemeral container filesystem (lost on restart)
- Firestore remains empty

---

### Issue 2: Database Initialization Check

**Location**: `backend/src/config/database.ts:8`

**Problem**:
- Database initialization also reads `systemConfig.use_local_storage` directly
- Should use `useLocalStorage()` function for consistency

**Current Code**:
```typescript
const systemConfig = getSystemConfig();
const USE_LOCAL_STORAGE = systemConfig.use_local_storage; // Wrong
```

**Fix Required**:
```typescript
import { useLocalStorage } from './index';
const USE_LOCAL_STORAGE = useLocalStorage(); // Correct
```

---

### Issue 3: Account Details Visible But No Firestore Record

**Why This Happens**:
1. User authenticates via Firebase Auth (frontend)
2. Firebase Auth stores user in Firebase Authentication (separate from Firestore)
3. Backend receives Firebase ID token
4. Backend tries to create/get user in Firestore via `getOrCreateUserByUid()`
5. **BUT**: `getOrCreateUserByUid()` checks `USE_LOCAL_STORAGE` (which is `true`)
6. So it uses local storage instead of Firestore
7. User data is written to container filesystem (lost)
8. Frontend shows account details from Firebase Auth token, but no Firestore record exists

**Evidence**:
- Account details show in UI (from Firebase Auth token)
- Firestore database is empty (backend using local storage)
- Summaries don't persist (written to ephemeral filesystem)

---

### Issue 4: Summary Functionality Not Working

**Why Summaries Fail**:
1. User creates summary request
2. Backend processes and creates summary via `createSummary()`
3. `createSummary()` checks `USE_LOCAL_STORAGE` (which is `true`)
4. Summary is written to local JSON file in container
5. Container restarts → data lost
6. User can't see summaries in history

---

## Root Cause Summary

**The Core Problem**:
- `config.yaml` has `use_local_storage: true` (for development)
- Models read this value directly at module load time
- The `useLocalStorage()` function exists with correct auto-detection logic but is never called
- Production deployments still use local storage because models ignore `NODE_ENV`

**The Fix**:
- Update all models and database initialization to use `useLocalStorage()` function
- This function automatically returns `false` when `NODE_ENV=production`
- No need to change `config.yaml` or environment variables

---

## Solution Implementation Plan

### Step 1: Fix Database Initialization

**File**: `backend/src/config/database.ts`

**Change**:
```typescript
// BEFORE (line 7-8):
import { getSystemConfig } from './index';
const systemConfig = getSystemConfig();
const USE_LOCAL_STORAGE = systemConfig.use_local_storage;

// AFTER:
import { useLocalStorage } from './index';
const USE_LOCAL_STORAGE = useLocalStorage();
```

**Why**: Database initialization should respect `NODE_ENV` auto-detection.

---

### Step 2: Fix User Model

**File**: `backend/src/models/User.ts`

**Change**:
```typescript
// BEFORE (line 50-52):
// Check if we should use local storage (for testing) or Firestore (production)
const systemConfig = getSystemConfig();
const USE_LOCAL_STORAGE = systemConfig.use_local_storage;

// AFTER:
import { useLocalStorage } from '../config';
// Check if we should use local storage (for testing) or Firestore (production)
// Auto-detects based on NODE_ENV: production → Firestore, development → local storage
const USE_LOCAL_STORAGE = useLocalStorage();
```

**Why**: User model should use auto-detection function.

---

### Step 3: Fix Summary Model

**File**: `backend/src/models/Summary.ts`

**Change**:
```typescript
// BEFORE (line 91-94):
// Check if we should use local storage (for testing) or Firestore (production)
// Configure via config.yaml: system.use_local_storage
const systemConfig = getSystemConfig();
const USE_LOCAL_STORAGE = systemConfig.use_local_storage;

// AFTER:
import { useLocalStorage } from '../config';
// Check if we should use local storage (for testing) or Firestore (production)
// Auto-detects based on NODE_ENV: production → Firestore, development → local storage
const USE_LOCAL_STORAGE = useLocalStorage();
```

**Why**: Summary model should use auto-detection function.

---

### Step 4: Verify Environment Variables

**Required in Cloud Run**:
- ✅ `NODE_ENV=production` (already set)
- ✅ `USE_FIREBASE_AUTH=true` (auto-enabled in production)
- ✅ `AUTH_ENABLED=true` (auto-enabled in production)
- ✅ Service account configured (for Firestore access)

**NOT Required**:
- ❌ `USE_LOCAL_STORAGE=false` (auto-detected from `NODE_ENV`)

---

### Step 5: Verify Firebase Admin Initialization

**Check**: `backend/src/config/database.ts` should initialize Firebase when `USE_LOCAL_STORAGE=false`

**Expected Flow**:
1. `useLocalStorage()` returns `false` (production)
2. `database.ts` initializes Firebase Admin SDK
3. Firestore connection established
4. Models use Firestore instead of local storage

---

## Testing Plan

### Pre-Deployment Testing

1. **Local Development Test**:
   ```bash
   # Should use local storage
   NODE_ENV=development npm run dev
   # Verify: Logs show "LOCAL STORAGE MODE ENABLED"
   ```

2. **Production Simulation Test**:
   ```bash
   # Should use Firestore
   NODE_ENV=production npm run dev
   # Verify: Logs show "Firebase Firestore connection established"
   # Verify: No "LOCAL STORAGE MODE" logs
   ```

### Post-Deployment Verification

1. **Check Backend Logs**:
   ```bash
   gcloud run services logs read video-research --region asia-southeast1 --limit 50
   ```
   - Should see: "Firebase Firestore connection established successfully"
   - Should NOT see: "LOCAL STORAGE MODE ENABLED"

2. **Test User Creation**:
   - Sign up/login via frontend
   - Check Firestore Console → `users` collection
   - Should see user document with email, name, tier, credits

3. **Test Summary Creation**:
   - Create a summary via frontend
   - Check Firestore Console → `summaries` collection
   - Should see summary document

4. **Test Data Persistence**:
   - Create user and summary
   - Restart Cloud Run service (or wait for auto-scaling)
   - Verify data still exists in Firestore
   - Verify user can see their history

---

## Files to Modify

1. ✅ `backend/src/config/database.ts` - Use `useLocalStorage()` function
2. ✅ `backend/src/models/User.ts` - Use `useLocalStorage()` function
3. ✅ `backend/src/models/Summary.ts` - Use `useLocalStorage()` function

**Total Changes**: 3 files, ~6 lines of code

---

## Expected Behavior After Fix

### Development (Local)
- `NODE_ENV=development` (or not set)
- `useLocalStorage()` returns `true` (from `config.yaml`)
- Uses local file storage (`backend/data/`)
- Firebase not initialized

### Production (Cloud Run)
- `NODE_ENV=production`
- `useLocalStorage()` returns `false` (auto-detected)
- Uses Firestore database
- Firebase Admin SDK initialized
- Data persists across container restarts

---

## Additional Considerations

### Firestore Security Rules

**Verify**: `firestore.rules` allows authenticated users to read/write their own data

**Current Rules** (should be sufficient):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /summaries/{summaryId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
  }
}
```

### Service Account Permissions

**Verify**: Cloud Run service account has Firestore permissions

**Required Role**: `roles/datastore.user` or `roles/firebase.admin`

**Service Account**: `firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com`

---

## Rollback Plan

If issues occur after deployment:

1. **Quick Rollback**: Revert the 3 file changes
2. **Alternative**: Set `USE_LOCAL_STORAGE=true` explicitly in Cloud Run (overrides auto-detection)
3. **Data Recovery**: If data was written to local storage, it's lost (containers are ephemeral)

---

## Success Criteria

✅ Backend logs show "Firebase Firestore connection established"  
✅ User records appear in Firestore `users` collection  
✅ Summary records appear in Firestore `summaries` collection  
✅ Data persists after container restart  
✅ Frontend can retrieve user data and summaries  
✅ No "LOCAL STORAGE MODE" logs in production

---

## Timeline

- **Analysis**: ✅ Complete
- **Implementation**: Pending (3 files, ~6 lines)
- **Testing**: After implementation
- **Deployment**: After testing passes

---

## Notes

- The `useLocalStorage()` function already exists and works correctly
- The issue is that models don't use it
- This is a simple fix with high impact
- No environment variable changes needed
- No `config.yaml` changes needed
- Backward compatible (development still uses local storage)

