# Firebase Deployment PRD: YouTube Batch Summary Service

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Platform** | Firebase (Firestore, Authentication, Hosting, Cloud Functions) |
| **Authentication** | Firebase Authentication (Google OAuth) |
| **Database** | Cloud Firestore |
| **Frontend** | Next.js (deployed to Firebase Hosting) |
| **Backend** | Node.js/Express (deployed to Cloud Functions or Cloud Run) |

---

## 1. Executive Summary

This PRD outlines the deployment strategy for migrating the YouTube Batch Summary Service to Firebase infrastructure, replacing the current Passport.js OAuth implementation with Firebase Authentication, and deploying both frontend and backend services to Firebase-managed platforms.

**Key Objectives:**
- Migrate authentication from Passport.js to Firebase Authentication with Google OAuth
- Deploy frontend (Next.js) to Firebase Hosting
- Deploy backend (Node.js/Express) to Cloud Functions or Cloud Run
- Maintain existing Firestore database schema and functionality
- Ensure seamless user experience during migration
- Implement proper security and environment configuration

**Current State:**
- Backend uses Firebase Admin SDK for Firestore (already configured)
- Backend uses Passport.js with Google OAuth strategy
- Frontend uses mock authentication
- Service account key: `video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json`
- Firebase project: `video-research-40c4b`
- Firestore and Authentication already enabled in Firebase Console

**Target State:**
- Backend uses Firebase Admin SDK for Firestore (no change)
- Backend uses Firebase Admin SDK to verify Firebase Auth tokens
- Frontend uses Firebase Client SDK for authentication
- Frontend deployed to Firebase Hosting
- Backend deployed to Cloud Functions or Cloud Run
- All authentication flows use Firebase Authentication

---

## 2. Firebase Project Configuration

### 2.1 Project Details

**Project Information:**
- **Project ID:** `video-research-40c4b`
- **Project Number:** `723520495466`
- **App ID:** `1:723520495466:web:6fda6d5e11c877bca44f13`
- **Linked Hosting Site:** `video-research-40c4b`

**Firebase Configuration (Client SDK):**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM",
  authDomain: "video-research-40c4b.firebaseapp.com",
  projectId: "video-research-40c4b",
  storageBucket: "video-research-40c4b.firebasestorage.app",
  messagingSenderId: "723520495466",
  appId: "1:723520495466:web:6fda6d5e11c877bca44f13",
  measurementId: "G-JSDG4VDKT9"
};
```

### 2.2 Enabled Services

**Already Configured:**
- ✅ **Firestore Database:** Enabled (Native mode)
- ✅ **Authentication:** Enabled
  - Email/Password: Enabled
  - Google: Enabled
- ✅ **Data Connect:** Enabled

**Services to Configure:**
- ⚠️ **Firebase Hosting:** Needs initialization and deployment
- ⚠️ **Cloud Functions** (if using): Needs setup
- ⚠️ **Cloud Run** (if using): Needs setup

### 2.3 Service Account

**Service Account File:** `video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json`

**Service Account Details:**
- **Email:** `firebase-adminsdk-fbsvc@video-research-40c4b.iam.gserviceaccount.com`
- **Client ID:** `113734839805526316156`
- **Project ID:** `video-research-40c4b`

**Usage:**
- Backend uses this service account for Firestore Admin SDK
- Backend uses this service account to verify Firebase Auth tokens
- Must be securely stored (not in version control)
- Should be set via `GOOGLE_APPLICATION_CREDENTIALS` environment variable

---

## 3. Authentication Migration Strategy

### 3.1 Current Authentication Flow

**Backend (Current):**
1. User clicks "Sign in with Google" on frontend
2. Frontend redirects to `/auth/google` (Passport.js route)
3. Passport.js redirects to Google OAuth consent screen
4. Google redirects back to `/auth/google/callback`
5. Passport.js strategy receives profile, creates/updates user in Firestore
6. Backend creates JWT token and sets session cookie
7. Frontend receives JWT token for subsequent API calls

**Frontend (Current):**
- Mock authentication (`NEXT_PUBLIC_SKIP_AUTH=true`)
- No real OAuth flow implemented
- Uses backend JWT tokens for API authentication

### 3.2 Target Authentication Flow (Firebase Auth)

**Frontend:**
1. User clicks "Sign in with Google" on frontend
2. Frontend uses Firebase Client SDK: `signInWithPopup(auth, googleProvider)`
3. Firebase handles OAuth flow (popup or redirect)
4. Firebase returns user credential with ID token
5. Frontend stores ID token (in memory or secure storage)
6. Frontend sends ID token to backend API in `Authorization: Bearer <token>` header

**Backend:**
1. Backend receives request with Firebase ID token in Authorization header
2. Backend uses Firebase Admin SDK to verify token: `admin.auth().verifyIdToken(idToken)`
3. Admin SDK returns decoded token with user info (uid, email, etc.)
4. Backend queries Firestore to get/create user document using Firebase `uid`
5. Backend processes request with authenticated user context
6. No JWT creation needed (Firebase token is the credential)

### 3.3 Migration Steps

**Phase 1: Frontend Firebase Auth Integration**
1. Install Firebase Client SDK: `npm install firebase`
2. Create Firebase client configuration file
3. Implement Firebase Auth hooks and context
4. Replace mock authentication with Firebase Auth
5. Update login page to use Firebase `signInWithPopup`
6. Update API client to send Firebase ID tokens

**Phase 2: Backend Token Verification**
1. Update backend to accept Firebase ID tokens instead of JWT
2. Implement Firebase Admin SDK token verification middleware
3. Update user lookup to use Firebase `uid` instead of `googleId`
4. Remove Passport.js dependencies (optional, can keep for transition)
5. Update authentication middleware

**Phase 3: User Migration**
1. Create migration script to map existing `googleId` to Firebase `uid`
2. Update Firestore user documents to include Firebase `uid`
3. Test authentication flow end-to-end
4. Deploy to staging environment

**Phase 4: Production Deployment**
1. Deploy frontend to Firebase Hosting
2. Deploy backend to Cloud Functions/Cloud Run
3. Update OAuth redirect URIs in Google Cloud Console
4. Monitor authentication errors and user migration

---

## 4. Frontend Implementation

### 4.1 Firebase Client SDK Setup

**Installation:**
```bash
cd frontend
npm install firebase
```

**Configuration File:** `frontend/src/lib/firebase.ts`

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (prevent multiple initializations)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account', // Force account selection
});

export default app;
```

**Environment Variables:** `frontend/.env.local`
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=video-research-40c4b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=video-research-40c4b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=video-research-40c4b.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=723520495466
NEXT_PUBLIC_FIREBASE_APP_ID=1:723520495466:web:6fda6d5e11c877bca44f13
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-JSDG4VDKT9
```

### 4.2 Authentication Context

**File:** `frontend/src/contexts/AuthContext.tsx`

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Get ID token error:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 4.3 API Client Updates

**File:** `frontend/src/lib/api.ts`

Update `getAuthToken()` function:
```typescript
import { useAuth } from '@/contexts/AuthContext';

// In API client, get token from auth context
async function getAuthToken(): Promise<string | null> {
  // Get auth context (requires hook, so this needs refactoring)
  // Alternative: Use a global auth state or pass token as parameter
  // For now, we'll use a token getter function passed from component
  return null; // Will be updated to use Firebase token
}
```

**Better Approach:** Create a token provider that can be accessed outside React:
```typescript
// frontend/src/lib/auth-token.ts
let currentTokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: () => Promise<string | null>) {
  currentTokenGetter = getter;
}

export async function getAuthToken(): Promise<string | null> {
  if (!currentTokenGetter) return null;
  return await currentTokenGetter();
}
```

Then in `AuthContext`:
```typescript
import { setTokenGetter } from '@/lib/auth-token';

// In AuthProvider component
useEffect(() => {
  setTokenGetter(() => getIdToken());
}, [user]);
```

### 4.4 Login Page Updates

**File:** `frontend/src/app/login/page.tsx`

Replace mock authentication with Firebase Auth:
```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/app');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      await signIn();
      router.push('/app');
    } catch (error) {
      console.error('Sign in failed:', error);
      // Show error message to user
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div>
      <button onClick={handleSignIn}>
        Sign in with Google
      </button>
    </div>
  );
}
```

---

## 5. Backend Implementation

### 5.1 Firebase Admin SDK Token Verification

**File:** `backend/src/middleware/firebase-auth.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

/**
 * Middleware to verify Firebase ID token
 * Replaces Passport.js authentication
 */
export async function verifyFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name,
      picture: decodedToken.picture,
    };

    next();
  } catch (error) {
    logger.error('Firebase token verification failed', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### 5.2 User Model Updates

**File:** `backend/src/models/User.ts`

Update to use Firebase `uid` instead of `googleId`:

```typescript
import db from '../config/database';
import logger from '../utils/logger';

export interface User {
  id: string; // Firestore document ID
  uid: string; // Firebase Auth UID (replaces googleId)
  email: string;
  name: string;
  tier: 'free' | 'premium';
  credits_remaining: number;
  created_at: FirebaseFirestore.Timestamp;
  last_reset: FirebaseFirestore.Timestamp;
}

/**
 * Get or create user by Firebase UID
 * Replaces getOrCreateUser(googleId, email, name)
 */
export async function getOrCreateUserByUid(
  uid: string,
  email: string,
  name: string
): Promise<User> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Query by Firebase UID
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('uid', '==', uid).limit(1).get();

    if (!snapshot.empty) {
      // User exists
      const doc = snapshot.docs[0];
      const userData = doc.data();
      return {
        id: doc.id,
        ...userData,
      } as User;
    }

    // Create new user
    const newUser = {
      uid,
      email,
      name,
      tier: 'free' as const,
      credits_remaining: 5, // Default free tier credits
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      last_reset: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await usersRef.add(newUser);
    logger.info('Created new user', { userId: docRef.id, uid, email });

    return {
      id: docRef.id,
      ...newUser,
      created_at: admin.firestore.Timestamp.now(),
      last_reset: admin.firestore.Timestamp.now(),
    } as User;
  } catch (error) {
    logger.error('Error getting or creating user', error);
    throw error;
  }
}
```

### 5.3 Auth Routes Updates

**File:** `backend/src/routes/auth.routes.ts`

Remove Passport.js routes, add token refresh endpoint:

```typescript
import { Router } from 'express';
import { verifyFirebaseToken, AuthenticatedRequest } from '../middleware/firebase-auth.middleware';
import { getOrCreateUserByUid } from '../models/User';

const router = Router();

/**
 * Verify token and return user info
 * Frontend can call this to check if token is valid
 */
router.get('/verify', verifyFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get or create user in Firestore
    const user = await getOrCreateUserByUid(
      req.user.uid,
      req.user.email,
      req.user.name || req.user.email
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        credits_remaining: user.credits_remaining,
      },
    });
  } catch (error) {
    logger.error('Error verifying token', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export function registerAuthRoutes(): Router {
  return router;
}
```

### 5.4 Update Protected Routes

**File:** `backend/src/routes/summarize.routes.ts`

Replace Passport.js middleware with Firebase token verification:

```typescript
import { verifyFirebaseToken, AuthenticatedRequest } from '../middleware/firebase-auth.middleware';
import { getOrCreateUserByUid } from '../models/User';

// Replace: import { authenticate } from '../middleware/auth.middleware';
// With: Use verifyFirebaseToken middleware

router.post('/', verifyFirebaseToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user from Firestore using Firebase UID
  const user = await getOrCreateUserByUid(
    req.user.uid,
    req.user.email,
    req.user.name || req.user.email
  );

  // Continue with existing logic...
});
```

### 5.5 Environment Variables

**File:** `backend/.env`

Update to remove Passport.js variables (optional, can keep for transition):

```env
# Remove these (no longer needed):
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_CALLBACK_URL=

# Keep these:
GOOGLE_APPLICATION_CREDENTIALS=./video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json
AUTH_ENABLED=true

# Firebase Admin SDK will use GOOGLE_APPLICATION_CREDENTIALS
# No additional OAuth configuration needed
```

### 5.6 Database Schema Migration

**Firestore Collection: `users`**

**Current Schema:**
```json
{
  "id": "doc-id",
  "googleId": "123456...",
  "email": "user@gmail.com",
  "name": "John Doe",
  "tier": "free",
  "credits_remaining": 5,
  "created_at": "Timestamp",
  "last_reset": "Timestamp"
}
```

**New Schema:**
```json
{
  "id": "doc-id",
  "uid": "firebase-auth-uid",  // NEW: Firebase Auth UID
  "googleId": "123456...",      // KEEP: For migration reference
  "email": "user@gmail.com",
  "name": "John Doe",
  "tier": "free",
  "credits_remaining": 5,
  "created_at": "Timestamp",
  "last_reset": "Timestamp"
}
```

**Migration Script:** `backend/scripts/migrate-users-to-firebase-uid.ts`

```typescript
import admin from 'firebase-admin';
import * as serviceAccount from '../video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();

async function migrateUsers() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  for (const doc of snapshot.docs) {
    const userData = doc.data();
    
    // Skip if already migrated
    if (userData.uid) {
      console.log(`User ${doc.id} already has uid, skipping`);
      continue;
    }

    // If user has googleId, try to find Firebase user by email
    if (userData.googleId && userData.email) {
      try {
        const firebaseUser = await admin.auth().getUserByEmail(userData.email);
        
        // Update document with Firebase UID
        await doc.ref.update({
          uid: firebaseUser.uid,
        });
        
        console.log(`Migrated user ${doc.id} with uid ${firebaseUser.uid}`);
      } catch (error) {
        console.error(`Failed to migrate user ${doc.id}:`, error);
      }
    }
  }
}

migrateUsers().then(() => {
  console.log('Migration complete');
  process.exit(0);
});
```

---

## 6. Deployment Strategy

### 6.1 Frontend Deployment (Firebase Hosting)

**Prerequisites:**
```bash
npm install -g firebase-tools
firebase login
```

**Initialize Firebase Hosting:**
```bash
cd frontend
firebase init hosting
```

**Configuration:** `frontend/firebase.json`
```json
{
  "hosting": {
    "public": ".next",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

**Note:** Next.js static export may be needed, or use Next.js with Firebase Hosting adapter.

**Alternative: Next.js on Firebase Hosting**

For Next.js App Router, consider using Firebase Hosting with Next.js:
1. Use `@next/firebase` adapter (if available)
2. Or deploy Next.js to Cloud Run and use Firebase Hosting as reverse proxy
3. Or use static export if app doesn't require server-side features

**Build and Deploy:**
```bash
# Build Next.js app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### 6.2 Backend Deployment Options

#### Option A: Cloud Functions (Recommended for Serverless)

**Pros:**
- Automatic scaling
- Pay per use
- Integrated with Firebase ecosystem
- Easy deployment

**Cons:**
- Cold start latency
- 60-second timeout (can be extended to 540s)
- Limited to Node.js runtime

**Setup:**
```bash
cd backend
firebase init functions
```

**Configuration:** `backend/firebase.json`
```json
{
  "functions": {
    "source": ".",
    "runtime": "nodejs20",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  }
}
```

**Entry Point:** `backend/src/functions/index.ts`
```typescript
import * as functions from 'firebase-functions';
import app from '../server';

// Export Express app as Cloud Function
export const api = functions.https.onRequest(app);
```

**Deploy:**
```bash
firebase deploy --only functions
```

#### Option B: Cloud Run (Recommended for Full Control)

**Pros:**
- No cold starts (with min instances)
- Longer timeouts (up to 60 minutes)
- Full Docker control
- Better for long-running processes (SSE, batch jobs)

**Cons:**
- More complex setup
- Requires Docker
- Manual scaling configuration

**Dockerfile:** `backend/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY config.yaml ./
COPY scripts ./scripts

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "start"]
```

**Deploy:**
```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/video-research-40c4b/api

# Deploy to Cloud Run
gcloud run deploy api \
  --image gcr.io/video-research-40c4b/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json"
```

### 6.3 Environment Variables

**Firebase Hosting (Frontend):**
- Set via `firebase.json` or Firebase Console
- Use `firebase functions:config:set` for Cloud Functions
- Or use `.env.local` (for local dev only)

**Cloud Functions:**
```bash
firebase functions:config:set \
  supadata.api_key="your-key" \
  dashscope.beijing_api_key="your-key" \
  auth.enabled="true"
```

**Cloud Run:**
```bash
gcloud run services update api \
  --set-env-vars "SUPADATA_API_KEY=your-key,DASHSCOPE_BEIJING_API_KEY=your-key"
```

**Service Account:**
- For Cloud Functions: Upload service account JSON to Firebase Storage, reference in code
- For Cloud Run: Mount as secret or use Workload Identity

### 6.4 OAuth Redirect URIs

**Update Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Edit OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `https://video-research-40c4b.firebaseapp.com/__/auth/handler`
   - `https://video-research-40c4b.web.app/__/auth/handler`
   - `http://localhost:3000` (for local development)

**Firebase Authentication:**
- Firebase handles OAuth redirects automatically
- No manual callback URL configuration needed
- Firebase uses `__/auth/handler` endpoint

---

## 7. Security Considerations

### 7.1 Service Account Security

**Best Practices:**
- ✅ Never commit service account JSON to version control
- ✅ Use environment variables or secrets management
- ✅ Rotate service account keys regularly
- ✅ Use least privilege IAM roles
- ✅ Enable audit logging

**For Cloud Functions:**
- Store service account JSON in Firebase Storage
- Download at function initialization
- Or use Application Default Credentials (ADC)

**For Cloud Run:**
- Use Workload Identity (recommended)
- Or mount as Kubernetes secret
- Or use environment variable (less secure)

### 7.2 Firebase Auth Security Rules

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
    }
    
    // Users can only read/write their own summaries
    match /summaries/{summaryId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
    }
  }
}
```

**Note:** Backend uses Admin SDK (bypasses security rules), but rules protect direct client access.

### 7.3 CORS Configuration

**Backend CORS:**
```typescript
const corsOptions = {
  origin: [
    'https://video-research-40c4b.firebaseapp.com',
    'https://video-research-40c4b.web.app',
    'http://localhost:3000', // Development only
  ],
  credentials: true,
};
```

### 7.4 API Rate Limiting

- Keep existing rate limiting middleware
- Consider Firebase App Check for additional protection
- Monitor API usage in Firebase Console

---

## 8. Testing Strategy

### 8.1 Local Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Test Firebase Auth with local emulator or real Firebase project
```

**Backend:**
```bash
cd backend
npm install
# Use Firebase Auth Emulator or real Firebase project
npm run dev
```

**Firebase Emulator Suite:**
```bash
firebase init emulators
firebase emulators:start
```

**Environment:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Firestore Emulator: `localhost:8080`
- Auth Emulator: `localhost:9099`

### 8.2 Integration Testing

**Test Scenarios:**
1. User signs in with Google (Firebase Auth)
2. Frontend receives ID token
3. Frontend sends API request with token
4. Backend verifies token
5. Backend creates/updates user in Firestore
6. User can access protected routes
7. User can create summaries
8. User can view history

### 8.3 Migration Testing

**Test User Migration:**
1. Create test users with old schema (`googleId`)
2. Run migration script
3. Verify users have `uid` field
4. Test authentication with migrated users
5. Verify no data loss

---

## 9. Rollback Plan

### 9.1 If Migration Fails

**Frontend Rollback:**
- Keep mock authentication as fallback
- Use feature flag to switch between Firebase Auth and mock
- Revert to previous deployment

**Backend Rollback:**
- Keep Passport.js code (don't remove immediately)
- Use feature flag to switch between Firebase Auth and Passport.js
- Revert to previous deployment

**Database Rollback:**
- Keep `googleId` field (don't remove)
- Migration script is additive (adds `uid`, doesn't remove `googleId`)
- Can query by either field during transition

### 9.2 Gradual Migration

**Phase 1:** Deploy Firebase Auth alongside Passport.js
- Support both authentication methods
- New users use Firebase Auth
- Existing users continue with Passport.js

**Phase 2:** Migrate existing users
- Run migration script
- Update users to use Firebase Auth
- Monitor for errors

**Phase 3:** Remove Passport.js
- All users migrated
- Remove Passport.js dependencies
- Clean up old code

---

## 10. Monitoring and Logging

### 10.1 Firebase Console

**Monitor:**
- Authentication events (sign-ins, sign-ups)
- Firestore read/write operations
- Cloud Functions/Cloud Run metrics
- Error rates and latency

### 10.2 Application Logging

**Backend:**
- Use existing logger
- Log authentication events
- Log token verification failures
- Log user creation/updates

**Frontend:**
- Log authentication errors
- Log API request failures
- Use Firebase Analytics (optional)

### 10.3 Alerts

**Set Up:**
- Authentication failure rate > threshold
- API error rate > threshold
- Firestore quota usage > 80%
- Cloud Functions/Cloud Run errors

---

## 11. Implementation Checklist

### Phase 1: Frontend Firebase Auth
- [ ] Install Firebase Client SDK
- [ ] Create Firebase configuration file
- [ ] Create AuthContext with Firebase Auth
- [ ] Update login page to use Firebase `signInWithPopup`
- [ ] Update API client to send Firebase ID tokens
- [ ] Test authentication flow locally
- [ ] Update environment variables

### Phase 2: Backend Token Verification
- [ ] Create Firebase token verification middleware
- [ ] Update user model to use Firebase `uid`
- [ ] Update auth routes to verify Firebase tokens
- [ ] Update protected routes to use new middleware
- [ ] Remove Passport.js dependencies (optional)
- [ ] Test token verification locally

### Phase 3: Database Migration
- [ ] Create migration script
- [ ] Test migration on staging data
- [ ] Run migration on production (with backup)
- [ ] Verify migrated users can authenticate
- [ ] Monitor for errors

### Phase 4: Deployment
- [ ] Initialize Firebase Hosting
- [ ] Configure Next.js build for Firebase Hosting
- [ ] Deploy frontend to Firebase Hosting
- [ ] Choose backend deployment (Cloud Functions or Cloud Run)
- [ ] Configure backend deployment
- [ ] Deploy backend
- [ ] Update OAuth redirect URIs
- [ ] Test end-to-end in production

### Phase 5: Cleanup
- [ ] Remove Passport.js code (after migration period)
- [ ] Remove `googleId` field queries (after all users migrated)
- [ ] Update documentation
- [ ] Archive old authentication code

---

## 12. Dependencies and Prerequisites

### 12.1 Required Tools

- **Firebase CLI:** `npm install -g firebase-tools`
- **Node.js:** 18+ (LTS recommended)
- **Google Cloud SDK:** (for Cloud Run deployment, optional)

### 12.2 Required Services

- **Firebase Project:** `video-research-40c4b` (already created)
- **Firestore Database:** Enabled (already configured)
- **Firebase Authentication:** Enabled with Google provider (already configured)
- **Firebase Hosting:** Needs initialization
- **Cloud Functions or Cloud Run:** Needs setup

### 12.3 Required Credentials

- **Service Account Key:** `video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json` (provided)
- **Firebase Client Config:** Provided in PRD
- **OAuth Client ID:** (from Google Cloud Console, if needed for custom setup)

---

## 13. Timeline Estimate

**Phase 1 (Frontend):** 2-3 days
- Firebase SDK integration
- Auth context and hooks
- Login page updates
- API client updates

**Phase 2 (Backend):** 2-3 days
- Token verification middleware
- User model updates
- Route updates
- Testing

**Phase 3 (Migration):** 1-2 days
- Migration script
- Testing
- Production migration

**Phase 4 (Deployment):** 2-3 days
- Firebase Hosting setup
- Backend deployment
- Configuration
- Testing

**Total:** 7-11 days

---

## 14. Recommendations & Decisions

### 14.1 Next.js Deployment: **Firebase Hosting with Static Export** ✅ RECOMMENDED

**Recommendation:** Use **static export** for Firebase Hosting

**Why:**
- ✅ **Simplest option** - Your frontend is mostly client-side (uses "use client" components)
- ✅ **Fastest to deploy** - Just build and upload static files
- ✅ **Lowest cost** - Firebase Hosting free tier is generous
- ✅ **No server management** - Firebase handles everything automatically
- ✅ **Your app calls external APIs** - You don't need Next.js server features

**How it works:**
- Next.js builds your app into static HTML/CSS/JS files
- Firebase Hosting serves these files (like a CDN)
- All API calls go directly to your backend (no Next.js server needed)

**Alternative (if you need server features later):**
- Cloud Run - More complex but gives you full Next.js features
- Only needed if you add server-side rendering or API routes

**Decision:** ✅ **Use Firebase Hosting with static export**

---

### 14.2 Backend Deployment: **Cloud Run** ✅ RECOMMENDED

**Recommendation:** Use **Cloud Run** (not Cloud Functions)

**Why:**
- ✅ **Your app uses SSE (Server-Sent Events)** - These are long-running connections
- ✅ **Cloud Functions timeout limit** - Max 60 seconds (540s with extension), but SSE can run longer
- ✅ **Better for streaming** - Cloud Run handles long connections better
- ✅ **More control** - You can configure timeouts, memory, CPU
- ✅ **No cold starts** - Can set minimum instances to keep it warm

**Cloud Functions limitations for your use case:**
- ❌ 60-second timeout (even with extension, SSE might exceed this)
- ❌ Cold starts can delay first request
- ❌ Less control over runtime environment

**How it works:**
- Your backend runs in a Docker container
- Google manages the infrastructure
- Auto-scales based on traffic
- Pay only for what you use

**Decision:** ✅ **Use Cloud Run for backend**

---

### 14.3 Migration Strategy: **Gradual Migration** ✅ RECOMMENDED

**Recommendation:** Use **gradual migration** (not big bang)

**Why:**
- ✅ **Safer** - If something breaks, only affects new users
- ✅ **Easier to test** - Can test with real users before full rollout
- ✅ **Less risky** - Can roll back easily if problems occur
- ✅ **Better for non-technical users** - Less chance of downtime

**How it works:**
1. **Week 1:** Deploy Firebase Auth alongside Passport.js
   - New users use Firebase Auth
   - Existing users still use Passport.js
   - Test with small group

2. **Week 2:** Migrate existing users gradually
   - Run migration script for 10% of users
   - Monitor for errors
   - If successful, migrate more users

3. **Week 3:** Complete migration
   - All users on Firebase Auth
   - Remove Passport.js code
   - Clean up old code

**Big Bang alternative (not recommended):**
- Migrate everyone at once
- Higher risk if something breaks
- Harder to roll back

**Decision:** ✅ **Use gradual migration**

---

### 14.4 Feature Flags: **Yes, Use Feature Flags** ✅ RECOMMENDED

**Recommendation:** **Use feature flags** for gradual rollout

**Why:**
- ✅ **Control rollout** - Turn features on/off without redeploying
- ✅ **A/B testing** - Test Firebase Auth with some users, Passport.js with others
- ✅ **Quick rollback** - If Firebase Auth has issues, flip switch back to Passport.js
- ✅ **Less stress** - Can deploy code but keep it disabled until ready

**Simple implementation:**
```typescript
// In your code
const USE_FIREBASE_AUTH = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true';

if (USE_FIREBASE_AUTH) {
  // Use Firebase Auth
} else {
  // Use Passport.js (old way)
}
```

**How to use:**
- Start with `USE_FIREBASE_AUTH=false` (use old system)
- Deploy code with Firebase Auth ready
- When ready, set `USE_FIREBASE_AUTH=true` in Firebase Console
- Monitor, then remove old code

**Decision:** ✅ **Use feature flags**

---

### 14.5 Monitoring: **Firebase Console + Basic Logging** ✅ RECOMMENDED

**Recommendation:** Start with **Firebase Console**, add Cloud Monitoring later if needed

**Why:**
- ✅ **Firebase Console is free** - No additional cost
- ✅ **Easy to use** - Simple dashboard, no setup needed
- ✅ **Shows what you need** - Authentication events, errors, usage
- ✅ **Good enough for start** - You can always add more later

**What Firebase Console shows:**
- How many users signed in today
- Authentication errors
- Firestore database usage
- Cloud Run/Cloud Functions errors and performance
- Basic analytics

**When to add Cloud Monitoring:**
- If you need more detailed metrics
- If you need custom alerts
- If you're scaling significantly
- (Usually not needed for small/medium apps)

**Decision:** ✅ **Start with Firebase Console, add Cloud Monitoring later if needed**

---

## 15. Summary of Decisions

| Question | Decision | Reason |
|----------|----------|--------|
| **Next.js Deployment** | Firebase Hosting (static export) | Simplest, cheapest, your app doesn't need server features |
| **Backend Deployment** | Cloud Run | Better for SSE streaming, more control, no timeout issues |
| **Migration Strategy** | Gradual migration | Safer, easier to test, less risky |
| **Feature Flags** | Yes, use them | Easy rollback, control rollout, less stress |
| **Monitoring** | Firebase Console (start) | Free, easy, shows what you need |

**Next Steps:**
1. Update PRD with these decisions
2. Start with frontend Firebase Auth integration
3. Deploy frontend to Firebase Hosting (static export)
4. Deploy backend to Cloud Run
5. Use feature flags to gradually enable Firebase Auth
6. Monitor in Firebase Console

---

## 16. References

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

---

**Document Version:** 1.1  
**Last Updated:** [Current Date]  
**Author:** [Your Name]  
**Status:** Draft - Recommendations Added

