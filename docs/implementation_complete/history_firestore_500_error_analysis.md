# History API 500 Error Analysis - Firestore Deployment

## Problem Summary

The `/api/history` endpoint is returning a **500 Internal Server Error** when deployed to Firebase/Cloud Run, even though summary records exist in Firestore.

**Error from logs:**
```
GET https://video-research-723520495466.asia-southeast1.run.app/api/history?page=1&limit=20 500 (Internal Server Error)
Error: {code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve history'}
```

## Root Cause Analysis

### Issue #1: Missing Firestore Composite Index (MOST LIKELY)

**Problem:**
The query in `backend/src/models/Summary.ts:276-285` uses a compound query:
```typescript
let query = db.collection('summaries');
if (userId !== null) {
  query = query.where('user_id', '==', userId);
}
query = query.orderBy('created_at', 'desc');
```

**Why this fails:**
- Firestore requires a **composite index** for compound queries (where + orderBy on different fields)
- Without the index, Firestore throws an error: `The query requires an index`
- This error gets caught and re-thrown as a 500 error

**Evidence:**
- The error is a 500 (server error), not a 404 (no results)
- The query structure matches Firestore's compound query requirements
- No index creation code found in the codebase

**Solution:**
Create a composite index in Firestore Console:
- Collection: `summaries`
- Fields: `user_id` (Ascending), `created_at` (Descending)
- Query scope: Collection

**How to create:**
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection ID: `summaries`
4. Add fields:
   - `user_id` → Ascending
   - `created_at` → Descending
5. Click "Create"

Alternatively, Firestore will provide a link in the error message that you can click to create the index automatically.

---

### Issue #2: Duplicate User Documents (CRITICAL - ROOT CAUSE)

**Problem:**
- **TWO user documents were created** when signing in with Google
- Both documents have the same `uid: "Ayii1pvydGOIngE8D6rfpEtaNCk2"` (Firebase Auth UID)
- But different Firestore document IDs: `vvyxVO2XhhnORfWmCYeN` and `xPyqcq2dM6huoi5ZR9hT`

**Why this causes the issue:**
1. When user signs in, `getOrCreateUserByUid()` is called (line 77 in `firebase-auth.middleware.ts`)
2. It should find existing user by `uid` field, but if the query fails or returns wrong result, it creates a NEW user
3. Each time a different document ID is returned, summaries get created with different `user_id` values
4. History query uses `req.user.id` (one document ID), but summaries might have `user_id` set to the OTHER document ID
5. Result: Query finds 0 summaries (wrong user_id) OR query fails if there's also an index issue

**Root cause of duplicate creation:**
- `getOrCreateUserByUid()` queries by `uid` field: `where('uid', '==', uid).limit(1)`
- If this query fails (missing index, race condition, or query error), it falls back to email lookup
- If email lookup also fails or returns wrong result, it creates a new user
- **Missing index on `uid` field** could cause the query to fail silently or return wrong results

**Evidence:**
- Two user documents with same `uid` but different document IDs
- Both created at the same time (same `created_at` timestamp)
- This indicates `getOrCreateUserByUid()` was called twice and created a new user each time

**Solution:**
1. **Create Firestore index on `uid` field:**
   - Collection: `users`
   - Field: `uid` (Ascending)
   - This ensures the `where('uid', '==', uid)` query works correctly

2. **Merge duplicate user documents:**
   - Identify which document is the "correct" one (check which has summaries)
   - Update all summaries to use the correct `user_id`
   - Delete the duplicate user document
   - Or merge data from both documents into one

3. **Fix the query logic:**
   - Ensure `getOrCreateUserByUid()` properly handles the case where multiple users exist with same `uid`
   - Add logging to detect when duplicate creation happens
   - Consider using Firestore document ID = Firebase Auth UID (instead of auto-generated IDs)

---

### Issue #3: User ID Mismatch (Related to Issue #2)

**Problem:**
- Frontend sends: `userId: 'dev-user-id'` (from logs - if auth disabled)
- OR: `userId: "vvyxVO2XhhnORfWmCYeN"` or `"xPyqcq2dM6huoi5ZR9hT"` (if auth enabled)
- Firestore summaries might have `user_id` set to a DIFFERENT document ID
- This happens because of duplicate user documents (Issue #2)

**Why this causes problems:**
- History query uses `req.user.id` (one document ID)
- But summaries were created with `user_id` = different document ID
- Query returns 0 results (no summaries match)
- Combined with missing index (Issue #1), this causes a 500 error

**Solution:**
- Fix duplicate user documents first (Issue #2)
- Then verify all summaries have correct `user_id` matching the active user document
- Update any summaries with wrong `user_id` to use the correct one

---

### Issue #3: Missing `created_at` Field

**Problem:**
If some documents in Firestore don't have a `created_at` field, the `orderBy('created_at', 'desc')` will fail.

**Why this is less likely:**
- The code always sets `created_at: Timestamp.now()` when creating summaries (line 141)
- But older documents might have been created differently

**Solution:**
- Check if all documents in the `summaries` collection have `created_at` field
- If not, add a migration script to add `created_at` to existing documents

---

### Issue #4: Firestore `offset()` Limitation

**Problem:**
The code uses `query.limit(limitNum).offset(offset).get()` (line 292).

**Why this might be an issue:**
- Firestore has a maximum offset of 1000
- Using offset is inefficient and can be slow
- But this wouldn't cause a 500 error immediately (only on page > 50 with limit 20)

**Solution:**
- Consider using cursor-based pagination instead of offset
- Or ensure pagination stays within Firestore limits

---

### Issue #5: Database Connection Issue

**Problem:**
The database might not be properly initialized in Cloud Run.

**Why this is less likely:**
- Other endpoints might be working
- The error is specific to the history query, not a general connection issue

**Solution:**
- Check Cloud Run logs for database initialization errors
- Verify `GOOGLE_APPLICATION_CREDENTIALS` or Workload Identity is configured correctly

---

## Diagnostic Steps

### Step 1: Check Cloud Run Logs

Look for the actual error message in Cloud Run logs:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=video-research" --limit 50 --format json
```

Look for:
- Firestore index error messages
- Database connection errors
- The actual `userId` being used in the query

### Step 2: Verify Firestore Indexes

1. Go to Firebase Console → Firestore Database → Indexes
2. Check if there's an index for:
   - Collection: `summaries`
   - Fields: `user_id` (Ascending), `created_at` (Descending)
3. If missing, create it (Firestore will provide a link in error messages)

### Step 3: Verify User ID Matching

1. Check what `userId` is being sent from frontend (logs show `dev-user-id`)
2. Check what `user_id` values exist in Firestore documents
3. Verify `DEV_USER_ID` environment variable in Cloud Run matches

### Step 4: Check Document Structure

1. Open Firebase Console → Firestore Database
2. Check a few documents in `summaries` collection
3. Verify all have:
   - `user_id` field (string or null)
   - `created_at` field (Timestamp)

### Step 5: Check for Duplicate User Documents

1. Open Firebase Console → Firestore Database → `users` collection
2. Check if multiple documents have the same `uid` field value
3. If duplicates exist:
   - Note which document IDs they have
   - Check which one has associated summaries (query `summaries` collection by `user_id`)
   - This is the "correct" user document

### Step 6: Verify Indexes on `users` Collection

1. Go to Firebase Console → Firestore Database → Indexes
2. Check if there's an index for:
   - Collection: `users`
   - Field: `uid` (Ascending)
3. If missing, create it (required for `getOrCreateUserByUid()` to work correctly)

---

## Most Likely Solution

**The issue is likely a combination of:**

1. **Missing Firestore composite index** (Issue #1)
2. **Duplicate user documents** (Issue #2) causing user_id mismatches

### Fix Steps (in order):

**Step 1: Create Required Indexes**

1. **Index for `summaries` collection:**
   - Collection: `summaries`
   - Fields: `user_id` (Ascending), `created_at` (Descending)
   - This is required for the history query

2. **Index for `users` collection:**
   - Collection: `users`
   - Field: `uid` (Ascending)
   - This prevents duplicate user creation

**Step 2: Fix Duplicate User Documents**

1. Identify which user document is "correct" (has summaries or was created first)
2. Note the document ID (e.g., `vvyxVO2XhhnORfWmCYeN`)
3. Check all summaries and update any with wrong `user_id`:
   ```javascript
   // In Firestore Console or via script
   // Update summaries with user_id = "xPyqcq2dM6huoi5ZR9hT" 
   // to user_id = "vvyxVO2XhhnORfWmCYeN"
   ```
4. Delete the duplicate user document

**Step 3: Test**

- Wait 1-2 minutes for indexes to build
- Retry the history API call
- Should work after both fixes

---

## Additional Considerations

### If Index Creation Doesn't Fix It

1. **Check the actual error in Cloud Run logs** - the generic 500 error hides the real Firestore error
2. **Verify userId matching** - ensure `dev-user-id` matches documents in Firestore
3. **Check for null userId handling** - when `userId` is null, the query should work without the where clause
4. **Verify database initialization** - ensure Firestore is properly connected in Cloud Run

### Code Improvements Needed

1. **Better error logging** - log the actual Firestore error, not just generic message
2. **Index creation automation** - add code to detect missing indexes and provide helpful error messages
3. **User ID validation** - verify userId matches before querying
4. **Cursor-based pagination** - replace offset with cursor for better performance

---

## Next Steps

1. ✅ **Check Cloud Run logs** for actual Firestore error message
2. ✅ **Create composite index** in Firestore Console
3. ✅ **Verify userId matching** between frontend and Firestore documents
4. ✅ **Test the endpoint** after index creation
5. ⚠️ **If still failing**, check logs for other errors and verify database connection

