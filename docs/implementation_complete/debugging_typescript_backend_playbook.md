# Debugging Playbook (Backend TypeScript) — Common Compile Errors & Fixes

This doc captures a few recurring backend TypeScript compile issues we hit in this repo, **why they happen**, and the **lowest-risk fixes**.

---

### Key idea: why errors “appear” after fixing others

TypeScript compilation typically **fails fast**: it stops at the first error (or first file that can’t be typechecked).  
So when you fix one error, the compiler progresses and then surfaces the **next** pre-existing error.

This can look like “we fixed it and got more errors”, but it’s usually just the next file in the pipeline.

---

## 1) Firestore Admin SDK vs Client SDK mismatch (TS2305 / TS2724)

### Symptoms

Errors like:
- `TS2305: Module '"firebase-admin/firestore"' has no exported member 'doc'.`
- `TS2305: ... no exported member 'getDoc' / 'setDoc' / 'updateDoc' / 'collection' / 'getDocs' / 'where' / 'orderBy'`
- `TS2724: ... has no exported member named 'query'. Did you mean 'Query'?`

### Root cause

Those helpers (`doc`, `getDoc`, `setDoc`, `query`, `where`, etc.) are **Firebase Client SDK** patterns.

In the backend we use the **Firebase Admin SDK**, where you typically do:
- `db.collection('x').doc('y').get()`
- `db.collection('x').where(...).orderBy(...).get()`
- `docRef.set(...)`, `docRef.update(...)`

### Safe fix patterns (Admin SDK)

#### Single document read

Replace:
- `doc(db, 'pricing_config', 'current')` + `getDoc(docRef)`

With:
- `const ref = db.collection('pricing_config').doc('current');`
- `const snap = await ref.get();`
- `if (!snap.exists) ...`

#### Single document write/update

Replace:
- `setDoc(docRef, data)` with `await ref.set(data)`
- `updateDoc(docRef, patch)` with `await ref.update(patch)`

#### Query

Replace:
- `collection(db, 'user_credits')`
- `query(ref, where(...), orderBy(...))`
- `getDocs(q)`

With:
- `await db.collection('user_credits').where(...).orderBy(...).get()`

### Quick search

Search for client-style helpers mistakenly used in backend:

```bash
rg -n "from 'firebase-admin/firestore'|\\b(doc|getDoc|setDoc|updateDoc|getDocs|collection|query|where|orderBy)\\b" backend/src
```

> Tip: if you see `import { doc, getDoc } from 'firebase-admin/firestore'` in backend code, it’s almost certainly wrong.

---

## 2) Firestore `DocumentSnapshot.exists` vs `exists()` confusion (TS2339)

### Symptoms

Errors like:
- `Property 'exists' does not exist on type 'QuerySnapshot<...>'`
- `Property 'data' does not exist on type 'QuerySnapshot<...>'`
- or code using `docSnap.exists()` vs `docSnap.exists`

### Root cause

- Admin SDK `DocumentSnapshot` uses **`exists` (property)**.
- Client SDK `DocumentSnapshot` uses **`exists()` (method)**.

### Safe fix

In backend code, prefer:
- `if (!snap.exists) { ... }`
- `const data = snap.data()`

---

## 3) Transaction typing oddities (TS7006 / TS2339 / TS2352 / TS2739)

### Symptoms

Common ones:
- `TS7006: Parameter 'transaction' implicitly has an 'any' type.`
- `TS2339: Property 'exists' does not exist on type 'QuerySnapshot...'` (inside transactions)
- `TS2352/TS2739: Conversion of type 'QuerySnapshot' to 'DocumentSnapshot'...`

### Root cause

In this repo, the exported `db` is sometimes typed loosely because local-storage mode returns `null as any`.  
That can degrade TypeScript inference for transaction overloads, causing it to pick query overloads.

### Lowest-risk fix strategy

- First try: annotate the transaction param:
  - `db.runTransaction(async (transaction: Transaction) => { ... })`
- If overload inference is still wrong, **avoid aggressive casting** and instead ensure the reference passed to `transaction.get(...)` is a real `DocumentReference`.
  - Example: `const creditRef = db.collection('user_credits').doc(userId);`

> Avoid `as unknown as ...` unless you have no choice; it silences errors but can hide real bugs.

---

## 4) `node-cron` options mismatch (TS2353)

### Symptoms

- `TS2353: Object literal may only specify known properties, and 'scheduled' does not exist in type 'TaskOptions'.`

### Root cause

Different versions of `node-cron` / its typings expose different option shapes. In your current dependency set, the `scheduled` option isn’t recognized.

### Safe fix

Remove the unsupported option and control scheduling explicitly:
- Create the task with `cron.schedule(...)`
- Call `.start()` only from a controlled place (e.g. `startCreditResetJobs()`)

---

## 5) Import/export mismatch for request typing (TS2305)

### Symptoms

- `TS2305: Module '.../auth.middleware' has no exported member 'AuthenticatedRequest'.`

### Root cause

The type exists, but in a **different module**. In this repo:
- `AuthenticatedRequest` is exported by `backend/src/middleware/firebase-auth.middleware.ts`
- `backend/src/middleware/auth.middleware.ts` exports `requireAuth`, not that type

### Safe fix

In routes, import types from the module that actually exports them:
- `import { requireAuth } from '../middleware/auth.middleware';`
- `import { AuthenticatedRequest } from '../middleware/firebase-auth.middleware';`

---

## “Do this first” checklist when backend won’t start

- **Read the first compile error** from nodemon/ts-node output and fix that file first.
- Check if the failing file is using:
  - client Firestore helpers in backend (`doc/getDoc/setDoc/query/...`)
  - `exists()` vs `exists`
  - a type import from the wrong middleware module
  - unsupported option fields (like `scheduled`) for your installed typings

---

## Optional: fast repo-wide scans

```bash
# client-style Firestore helpers mistakenly imported from firebase-admin/firestore
rg -n "import\\s*\\{[^}]*\\b(doc|getDoc|setDoc|updateDoc|getDocs|collection|query|where|orderBy)\\b[^}]*\\}\\s*from\\s*'firebase-admin/firestore'" backend/src

# scheduled option in node-cron schedule options
rg -n "\\bscheduled\\s*:" backend/src

# AuthenticatedRequest imports
rg -n "AuthenticatedRequest" backend/src
```


