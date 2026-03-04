# User UID Centralization Fix

## Problem Summary

The history API was failing with a 500 error because:
1. **Field name conflict**: Summaries were being saved with `user_uid` set correctly, but `user_id` was `null`
2. **Query fallback failure**: When the `user_uid` query failed (e.g., missing index), it fell back to `user_id`, which was `null` in new records
3. **Hardcoded field names**: Field names were hardcoded throughout the codebase, making it easy to introduce inconsistencies

## Solution Implemented

### 1. Centralized Field Name Constants

Created `backend/src/config/field-names.ts` to centralize all user identifier field names:
- `USER_UID_FIELD = 'user_uid'` - Primary field (Firebase Auth UID)
- `USER_ID_FIELD = 'user_id'` - Deprecated field (kept for backward compatibility)
- `getUserIdentifierField()` - Helper function to get the primary field name

**Benefits:**
- Single source of truth for field names
- Easy to update if field names change
- Prevents hardcoded field name bugs

### 2. Fixed Summary Creation

**Updated `backend/src/models/Summary.ts`:**
- When creating summaries, both `user_uid` and `user_id` are now set to the same value
- This ensures backward compatibility while using the correct primary field
- Uses centralized constants instead of hardcoded strings

**Before:**
```typescript
user_uid: userUid,
user_id: data.user_id || null, // Could be null!
```

**After:**
```typescript
[USER_UID_FIELD]: userUid, // Primary field
[USER_ID_FIELD]: userUid, // Set to same value for backward compatibility
```

### 3. Fixed Query Logic

**Updated `getSummariesByUserId()` in `backend/src/models/Summary.ts`:**
- Always queries by `user_uid` (primary field) using the centralized constant
- Removed fallback to `user_id` query (which could return wrong results)
- Improved error messages with clear instructions for creating the required Firestore index

**Key changes:**
- Uses `getUserIdentifierField()` to get the field name
- Throws clear error if index is missing (instead of silently failing)
- No longer falls back to `user_id` query

### 4. Updated Local Storage

**Updated `backend/src/storage/local-summary.storage.ts`:**
- Summary creation sets both `user_uid` and `user_id` to the same value
- Query functions check both fields for backward compatibility
- Ownership checks verify both fields

## Files Changed

1. **Created:**
   - `backend/src/config/field-names.ts` - Centralized field name constants

2. **Modified:**
   - `backend/src/models/Summary.ts` - Fixed creation and query logic
   - `backend/src/storage/local-summary.storage.ts` - Updated to use both fields consistently

## Next Steps (Required)

### 1. Create Firestore Composite Index

The query now uses `user_uid` as the primary field. You **must** create a composite index in Firestore:

**Index Configuration:**
- **Collection ID:** `summaries`
- **Fields:**
  - `user_uid` (Ascending)
  - `created_at` (Descending)
- **Query scope:** Collection

**How to create:**
1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project
2. Navigate to **Firestore Database** → **Indexes** tab
3. Click **"Create Index"**
4. Enter the configuration above
5. Click **"Create"**
6. Wait 1-2 minutes for the index to build

**Alternative:** If the index is missing, Firestore will provide a link in the error message that you can click to create it automatically.

### 2. Update Existing Records (Optional but Recommended)

Existing summaries in Firestore may have:
- `user_uid` set correctly
- `user_id` set to `null` or an old document ID

**To fix existing records:**
You can run a migration script to update all summaries where `user_id` is `null` but `user_uid` exists:

```javascript
// Example migration (run in Firebase Console or via script)
const summariesRef = db.collection('summaries');
const snapshot = await summariesRef.where('user_uid', '!=', null).get();

const batch = db.batch();
snapshot.docs.forEach(doc => {
  const data = doc.data();
  if (data.user_uid && !data.user_id) {
    batch.update(doc.ref, { user_id: data.user_uid });
  }
});
await batch.commit();
```

**Note:** This is optional because the query now uses `user_uid` as the primary field. However, setting `user_id` to the same value ensures backward compatibility if any code still queries by `user_id`.

### 3. Verify the Fix

After creating the index:
1. Wait 1-2 minutes for the index to build
2. Test the history API: `GET /api/history?page=1&limit=20`
3. Should return summaries successfully

## Testing

### Local Development
- Local storage mode automatically sets both fields correctly
- No Firestore index needed for local development

### Production
- Ensure Firestore composite index is created (see above)
- Verify new summaries have both `user_uid` and `user_id` set to the same value
- Test history API endpoint

## Prevention

The centralized constants file (`field-names.ts`) ensures:
- ✅ Single source of truth for field names
- ✅ Easy to update if field names change
- ✅ Type-safe field name usage
- ✅ Prevents hardcoded field name bugs

**Best Practice:** Always import and use constants from `field-names.ts` instead of hardcoding field names.

## Related Issues

This fix addresses:
- History API 500 errors
- Inconsistent user identifier storage
- Query failures due to missing indexes
- Hardcoded field names causing bugs

## Migration Notes

- **Backward Compatibility:** Both `user_uid` and `user_id` are set to the same value
- **Query Priority:** New code queries by `user_uid` (primary field)
- **Old Records:** Existing records with only `user_id` will still work (if querying by `user_id`)
- **Future:** Eventually, `user_id` can be deprecated once all records are migrated

