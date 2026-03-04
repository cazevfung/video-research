# Root Cause Analysis - History API 500 Error

## The Real Problem (Not Surface Fixes)

### Core Design Flaw: Data Model Mismatch

**The code stores the WRONG identifier in summaries:**

1. **What the code does:**
   ```typescript
   // backend/src/middleware/firebase-auth.middleware.ts:85
   req.user = {
     id: user.id!,  // ← Firestore document ID (random, auto-generated)
     ...
   }
   
   // backend/src/controllers/summary.controller.ts:171
   const userId = req.user?.id || null;  // ← Uses document ID
   
   // backend/src/models/Summary.ts:132
   user_id: data.user_id,  // ← Stores document ID in summary
   ```

2. **What Firestore rules expect:**
   ```javascript
   // firestore.rules:54
   resource.data.user_id == request.auth.uid  // ← Expects Firebase Auth UID!
   ```

3. **The problem:**
   - Code stores: `user_id = "vvyxVO2XhhnORfWmCYeN"` (Firestore document ID - random)
   - Rules expect: `user_id = "Ayii1pvydGOIngE8D6rfpEtaNCk2"` (Firebase Auth UID - stable)
   - These don't match, so queries fail or return wrong results

### Why Duplicate Users Are Created

**Root cause in `getUserByUid()`:**

```typescript
// backend/src/models/User.ts:306-310
const snapshot = await db
  .collection(USERS_COLLECTION)
  .where('uid', '==', uid)
  .limit(1)
  .get();
```

**What happens:**
1. Query requires index on `uid` field
2. If index missing, query **fails silently** or throws error
3. Error is caught, `getUserByUid()` returns `null`
4. `getOrCreateUserByUid()` thinks user doesn't exist
5. Creates NEW user with different document ID
6. Next sign-in: same thing happens → duplicate created

**The bug:** No proper error handling for missing index. Query failure is treated as "user not found".

### Why History Query Fails

**Multiple issues compound:**

1. **Wrong identifier stored:**
   - Summaries have `user_id = document ID` (e.g., `"vvyxVO2XhhnORfWmCYeN"`)
   - Query uses `req.user.id` which might be different document ID (e.g., `"xPyqcq2dM6huoi5ZR9hT"`)
   - Result: 0 matches found

2. **Missing composite index:**
   - Query: `where('user_id', '==', userId).orderBy('created_at', 'desc')`
   - Requires composite index
   - Without it: Firestore throws error → 500

3. **Inconsistent user IDs:**
   - Each sign-in might return different document ID
   - Summaries created with one ID, query uses another
   - Even with index, query returns 0 results

---

## The Real Fix (Code Changes Required)

### Fix #1: Store Firebase Auth UID, Not Document ID

**Change the data model to use stable identifier:**

```typescript
// backend/src/middleware/firebase-auth.middleware.ts
// BEFORE:
req.user = {
  id: user.id!,  // ← Document ID (wrong)
  ...
}

// AFTER:
req.user = {
  id: user.uid || user.id!,  // ← Use uid if available, fallback to id
  uid: user.uid,  // ← Also store uid separately
  ...
}
```

**OR better - change summaries to store `uid`:**

```typescript
// backend/src/models/Summary.ts
// Change interface:
export interface Summary {
  id?: string;
  user_uid: string | null;  // ← Change from user_id to user_uid
  // ... rest
}

// backend/src/controllers/summary.controller.ts
// When creating summary:
const userUid = req.user?.uid || req.user?.id || null;  // ← Use uid
const summaryData = {
  user_uid: userUid,  // ← Store uid, not document ID
  // ...
}

// backend/src/models/Summary.ts:getSummariesByUserId
// Change query:
query = query.where('user_uid', '==', userUid);  // ← Query by uid
```

### Fix #2: Use UID as Document ID (Best Solution)

**Make user document ID = Firebase Auth UID:**

```typescript
// backend/src/models/User.ts:createUser
// BEFORE:
const docRef = await db.collection(USERS_COLLECTION).add(userData);

// AFTER:
if (data.uid) {
  // Use uid as document ID (deterministic, prevents duplicates)
  const docRef = db.collection(USERS_COLLECTION).doc(data.uid);
  await docRef.set(userData);
  const doc = await docRef.get();
  return { id: doc.id, ...doc.data() } as User;
} else {
  // Fallback for non-Firebase users
  const docRef = await db.collection(USERS_COLLECTION).add(userData);
  // ...
}
```

**Benefits:**
- Prevents duplicate users (same uid = same document)
- No query needed to find user (direct document access)
- Stable identifier across sign-ins
- Matches Firestore rules expectation

### Fix #3: Handle Index Errors Properly

**Add error handling for missing indexes:**

```typescript
// backend/src/models/User.ts:getUserByUid
export async function getUserByUid(uid: string): Promise<User | null> {
  // ...
  try {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('uid', '==', uid)
      .limit(1)
      .get();
    // ...
  } catch (error) {
    // Check if error is about missing index
    if (error instanceof Error && error.message.includes('index')) {
      logger.error('Missing Firestore index on uid field', {
        uid,
        error: error.message,
        hint: 'Create index: Collection: users, Field: uid (Ascending)'
      });
      // Try alternative: use uid as document ID
      try {
        const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() } as User;
        }
      } catch (docError) {
        // Fall through
      }
    }
    logger.error('Error getting user by UID', error);
    throw error;
  }
}
```

### Fix #4: Update History Query

**Change to query by uid if available:**

```typescript
// backend/src/models/Summary.ts:getSummariesByUserId
export async function getSummariesByUserId(
  userId: string | null,  // ← This should be uid, not document ID
  page: number = 1,
  limit?: number
) {
  // ...
  // If userId is actually a uid, query by user_uid
  // If userId is document ID, query by user_id (for backward compatibility)
  
  // Better: Change parameter name and always use uid
  let query = db.collection(SUMMARIES_COLLECTION);
  if (userUid !== null) {
    query = query.where('user_uid', '==', userUid);  // ← Query by uid
  }
  query = query.orderBy('created_at', 'desc');
  // ...
}
```

---

## Migration Strategy

### Step 1: Update Code to Use UID

1. Change `user_id` to `user_uid` in Summary interface
2. Update all code that creates/reads summaries
3. Update history query to use `user_uid`

### Step 2: Migrate Existing Data

```typescript
// Migration script to update existing summaries
async function migrateSummariesToUid() {
  const db = admin.firestore();
  const summaries = await db.collection('summaries').get();
  
  for (const doc of summaries.docs) {
    const data = doc.data();
    if (data.user_id && !data.user_uid) {
      // Find user by document ID to get uid
      const userDoc = await db.collection('users').doc(data.user_id).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.uid) {
          await doc.ref.update({
            user_uid: userData.uid,
            // Keep user_id for backward compatibility during transition
          });
        }
      }
    }
  }
}
```

### Step 3: Fix User Documents

```typescript
// Merge duplicate users
async function mergeDuplicateUsers() {
  const db = admin.firestore();
  const users = await db.collection('users').get();
  
  // Group by uid
  const usersByUid = new Map<string, any[]>();
  users.docs.forEach(doc => {
    const data = doc.data();
    if (data.uid) {
      if (!usersByUid.has(data.uid)) {
        usersByUid.set(data.uid, []);
      }
      usersByUid.get(data.uid)!.push({ id: doc.id, ...data });
    }
  });
  
  // For each uid with duplicates, merge into one
  for (const [uid, userList] of usersByUid.entries()) {
    if (userList.length > 1) {
      // Use first one as primary, merge others
      const primary = userList[0];
      const duplicates = userList.slice(1);
      
      // Update all summaries to use primary user_id
      for (const dup of duplicates) {
        const summaries = await db.collection('summaries')
          .where('user_id', '==', dup.id)
          .get();
        
        for (const summary of summaries.docs) {
          await summary.ref.update({ user_id: primary.id });
        }
        
        // Delete duplicate user
        await db.collection('users').doc(dup.id).delete();
      }
    }
  }
}
```

---

## Summary

**Root causes:**
1. ❌ Storing Firestore document ID instead of Firebase Auth UID
2. ❌ No error handling for missing Firestore indexes
3. ❌ Auto-generated document IDs cause duplicates
4. ❌ Data model doesn't match Firestore rules

**Real fixes:**
1. ✅ Use Firebase Auth UID as identifier (stable, matches rules)
2. ✅ Use UID as document ID to prevent duplicates
3. ✅ Add proper error handling for index errors
4. ✅ Update all queries to use uid instead of document ID

**This is a fundamental data model issue, not just missing indexes.**

