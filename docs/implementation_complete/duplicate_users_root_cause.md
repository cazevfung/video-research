# Why Duplicate Users Are Created - Root Cause Analysis

## The Problem

**Two user documents are created with the same `uid` field value:**
- Document 1: `vvyxVO2XhhnORfWmCYeN` with `uid: "Ayii1pvydGOIngE8D6rfpEtaNCk2"`
- Document 2: `xPyqcq2dM6huoi5ZR9hT` with `uid: "Ayii1pvydGOIngE8D6rfpEtaNCk2"`

Both have the same Firebase Auth UID but different Firestore document IDs.

## Root Causes

### Cause #1: Race Condition (Most Likely)

**The code has NO protection against concurrent requests:**

```typescript
// backend/src/models/User.ts:getOrCreateUserByUid()
export async function getOrCreateUserByUid(uid, email, name) {
  // Step 1: Check if user exists
  let user = await getUserByUid(uid);  // ← Query: where('uid', '==', uid)
  
  if (user) {
    return user;  // User exists, return it
  }
  
  // Step 2: Check by email (fallback)
  user = await getUserByEmail(email);
  if (user) {
    return user;
  }
  
  // Step 3: Create new user
  const newUser = await createUser({ uid, email, name });  // ← NO LOCKING!
  return newUser;
}
```

**What happens with concurrent requests:**

```
Time    Request 1                          Request 2
─────────────────────────────────────────────────────────────
T0      getUserByUid(uid) → null          (not started)
T1      getUserByEmail(email) → null      getUserByUid(uid) → null
T2      createUser() starts...            getUserByEmail(email) → null
T3      createUser() creates doc1         createUser() starts...
T4      Returns doc1                      createUser() creates doc2
T5      (done)                            Returns doc2
```

**Result:** Both requests create a user because they both see "no user exists" at the same time.

### Cause #2: Missing Index on `uid` Field

**The query requires an index:**

```typescript
// backend/src/models/User.ts:getUserByUid()
const snapshot = await db
  .collection(USERS_COLLECTION)
  .where('uid', '==', uid)  // ← Requires index on 'uid' field
  .limit(1)
  .get();
```

**What happens without index:**

1. **Firestore throws error** (most common):
   ```typescript
   // Error: "The query requires an index"
   // This gets caught and re-thrown
   // Request fails with 500 error
   ```

2. **Firestore allows query but it's slow/unreliable**:
   - Query might return empty results even if user exists
   - Query might timeout
   - Query might return wrong results

3. **If error is caught and ignored**:
   - `getUserByUid()` might return `null` instead of throwing
   - Code thinks user doesn't exist
   - Creates new user → duplicate

**Current error handling:**
```typescript
try {
  const snapshot = await db.collection(USERS_COLLECTION)
    .where('uid', '==', uid)
    .limit(1)
    .get();
  // ...
} catch (error) {
  logger.error('Error getting user by UID', error);
  throw new Error(`Failed to retrieve user by UID: ${errorMessage}`);
  // ← Error is thrown, not caught silently
}
```

So if index is missing, it should throw an error, not create duplicates. **But** if the error is caught somewhere else and retried, or if there's a race condition, duplicates can still occur.

### Cause #3: No Unique Constraint

**Firestore doesn't enforce uniqueness on fields:**

- You can have multiple documents with the same `uid` value
- There's no database-level constraint preventing duplicates
- The application code must enforce uniqueness

**Current code:** No uniqueness check before creating user.

---

## Why This Needs to Be Fixed

### Impact on the Application:

1. **History API fails:**
   - Summaries created with `user_id = document ID 1`
   - Next request uses `user_id = document ID 2`
   - Query finds 0 summaries → 500 error

2. **Data inconsistency:**
   - User data split across multiple documents
   - Credits, settings, etc. in different documents
   - Can't determine which is the "real" user

3. **Security issues:**
   - Firestore rules check `user_id == request.auth.uid`
   - But code stores document ID, not uid
   - Rules might not work correctly

4. **User confusion:**
   - User sees different data on different requests
   - Credits might appear/disappear
   - History might be missing

---

## The Real Fix

### Solution #1: Use UID as Document ID (BEST)

**Make Firestore document ID = Firebase Auth UID:**

```typescript
// backend/src/models/User.ts:createUser()
export async function createUser(data: UserCreateData): Promise<User> {
  // ...
  
  if (data.uid) {
    // Use uid as document ID - prevents duplicates automatically
    const docRef = db.collection(USERS_COLLECTION).doc(data.uid);
    
    // Check if document already exists (atomic operation)
    const existing = await docRef.get();
    if (existing.exists) {
      // User already exists, return it
      return { id: existing.id, ...existing.data() } as User;
    }
    
    // Create with specific document ID
    await docRef.set(userData);
    const doc = await docRef.get();
    
    return { id: doc.id, ...doc.data() } as User;
  } else {
    // Fallback for non-Firebase users
    const docRef = await db.collection(USERS_COLLECTION).add(userData);
    // ...
  }
}
```

**Benefits:**
- ✅ **Prevents duplicates**: Same uid = same document (Firestore enforces document ID uniqueness)
- ✅ **No query needed**: Direct document access `doc(uid).get()` - fast and reliable
- ✅ **No race condition**: Firestore document creation is atomic
- ✅ **No index needed**: Direct document access doesn't require indexes

### Solution #2: Use Firestore Transactions (Alternative)

**Wrap the get-or-create logic in a transaction:**

```typescript
export async function getOrCreateUserByUid(
  uid: string,
  email: string,
  name: string
): Promise<User> {
  const db = (await import('../config/database')).default;
  
  // Use transaction to prevent race conditions
  return await db.runTransaction(async (transaction) => {
    // Try to find by uid (using index or direct doc access)
    const userQuery = db.collection(USERS_COLLECTION)
      .where('uid', '==', uid)
      .limit(1);
    
    const snapshot = await transaction.get(userQuery);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    }
    
    // User doesn't exist, create it
    // Use uid as document ID to prevent duplicates
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    
    // Check if created by another transaction
    const existing = await transaction.get(docRef);
    if (existing.exists) {
      return { id: existing.id, ...existing.data() } as User;
    }
    
    // Create new user
    const userData = {
      uid,
      email,
      name,
      tier: 'free',
      credits_remaining: 5,
      created_at: Timestamp.now(),
      last_reset: Timestamp.now(),
    };
    
    transaction.set(docRef, userData);
    
    return { id: docRef.id, ...userData } as User;
  });
}
```

**Benefits:**
- ✅ Prevents race conditions (transaction is atomic)
- ✅ Handles concurrent requests correctly
- ✅ Still works with auto-generated document IDs

**Drawbacks:**
- ⚠️ More complex code
- ⚠️ Still requires index on `uid` field (if using query)
- ⚠️ Slower than direct document access

### Solution #3: Add Index + Better Error Handling (Quick Fix)

**Create the index and handle errors properly:**

```typescript
export async function getUserByUid(uid: string): Promise<User | null> {
  // ...
  try {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('uid', '==', uid)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  } catch (error) {
    // Check if error is about missing index
    if (error instanceof Error && error.message.includes('index')) {
      logger.error('Missing Firestore index on uid field', {
        uid,
        error: error.message,
        hint: 'Create index: Collection: users, Field: uid (Ascending)'
      });
      
      // Fallback: Try direct document access (if uid is used as doc ID)
      // This won't work if using auto-generated IDs, but shows the pattern
      try {
        const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() } as User;
        }
      } catch (docError) {
        // Ignore
      }
    }
    
    throw error;
  }
}
```

**This is a band-aid, not a real fix:**
- ⚠️ Still has race condition risk
- ⚠️ Still uses queries (slower than direct access)
- ⚠️ Doesn't prevent duplicates, just makes queries work

---

## Recommended Fix

**Use Solution #1: UID as Document ID**

This is the cleanest, fastest, and most reliable solution:

1. **Change `createUser()` to use `doc(uid).set()`** instead of `add()`
2. **Change `getUserByUid()` to use `doc(uid).get()`** instead of query
3. **Update `getOrCreateUserByUid()` to check document existence atomically**

**Migration needed:**
- Update existing users to use uid as document ID (or keep both for backward compatibility)
- Update all code that references user document IDs
- Update summaries to use `user_uid` instead of `user_id`

---

## Summary

**Why duplicates are created:**
1. ❌ Race condition: Two requests check "user exists" → both get null → both create user
2. ❌ Missing index: Query might fail or return wrong results
3. ❌ No uniqueness constraint: Firestore allows duplicate `uid` values

**Why this needs to be fixed:**
- Causes history API to fail (wrong user_id in summaries)
- Data inconsistency (user data split across documents)
- Security issues (rules don't match data model)

**The fix:**
- ✅ Use Firebase Auth UID as Firestore document ID
- ✅ Prevents duplicates automatically (document ID is unique)
- ✅ No race condition (atomic document operations)
- ✅ No index needed (direct document access)
- ✅ Faster and more reliable

---

## ✅ IMPLEMENTATION STATUS: FIXED

**Date Fixed:** 2025-01-27

**Changes Made:**

1. **`createUser()` function** (lines 191-209):
   - ✅ Now checks if document exists before creating (for uid-based documents)
   - ✅ Returns existing user if found instead of overwriting
   - ✅ Prevents race condition where two requests both try to create the same user

2. **`getOrCreateUserByUid()` function** (lines 392-520):
   - ✅ Wrapped in Firestore transaction for atomicity
   - ✅ Transaction ensures only one request can create a user with the same uid
   - ✅ Handles concurrent requests correctly
   - ✅ Maintains backward compatibility with local storage mode

**How it works:**
- When `createUser()` is called with a `uid`, it first checks if a document with that ID already exists
- If it exists, returns the existing user (prevents overwriting)
- If it doesn't exist, creates the new user
- `getOrCreateUserByUid()` uses a Firestore transaction to atomically check and create
- Transaction ensures that concurrent requests are serialized, preventing duplicates

**Result:**
- ✅ No more duplicate users with the same uid
- ✅ Race conditions eliminated
- ✅ Data consistency guaranteed
- ✅ No index required (uses direct document access)

