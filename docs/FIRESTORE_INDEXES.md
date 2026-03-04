# Firestore composite indexes (History)

**Production:** Hosting deploy (`npm run deploy:firebase`) does **not** deploy Firestore indexes. You must deploy indexes at least once (and whenever you change `firestore.indexes.json`):

```bash
cd frontend
npm run deploy:firestore-indexes
```

Wait until both indexes show as **Enabled** in [Firebase Console → Firestore → Indexes](https://console.firebase.google.com/). Then history will load in production.

---

History uses Firestore queries that require composite indexes on **summaries** and **researches**:

- **Fields:** `user_uid` (Ascending), `created_at` (Descending)
- **Used for:** Listing a user’s summaries and researches sorted by date (newest first).

## Option 1: Deploy indexes via Firebase CLI (recommended)

From the repo root:

```bash
cd frontend
firebase deploy --only firestore:indexes
```

Index definitions are in `frontend/firestore.indexes.json`. After deploy, indexes may take a few minutes to build. Status: [Firebase Console → Firestore → Indexes](https://console.firebase.google.com/).

## Option 2: Create indexes in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) → your project → **Firestore** → **Indexes**.
2. Click **Create index**.
3. **summaries:** Collection ID `summaries`, add fields:
   - `user_uid` – Ascending  
   - `created_at` – Descending  
   Query scope: **Collection**.
4. **researches:** Collection ID `researches`, same fields and scope.
5. Create both indexes and wait until they finish building.

## After indexes are built

Reload the app and open History again. The **MISSING_INDEX** error should be gone once both indexes show as **Enabled** in the Indexes tab.
