# Comprehensive Implementation Plan: Authentication, Credits & Deployment

| Version | 2.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | 2024 |
| **Related PRDs** | Firebase Deployment, Freemium Credit System, Login Page |
| **Target Timeline** | 6-8 weeks |
| **Priority** | High |

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Phases](#implementation-phases)
3. [Phase 1: Firebase Authentication Migration](#phase-1-firebase-authentication-migration)
4. [Phase 2: Login Page Implementation](#phase-2-login-page-implementation)
5. [Phase 3: Credit System Foundation](#phase-3-credit-system-foundation)
6. [Phase 4: Deployment & Infrastructure](#phase-4-deployment--infrastructure)
7. [Phase 5: Testing & Migration](#phase-5-testing--migration)
8. [Dependencies & Prerequisites](#dependencies--prerequisites)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Criteria](#success-criteria)

---

## Overview

This implementation plan integrates three major features into a cohesive system:

1. **Firebase Authentication Migration** - Replace Passport.js with Firebase Auth
2. **Login Page** - Beautiful, minimalist authentication UI
3. **Freemium Credit System** - Comprehensive credit tracking and management with free-to-use tiers
4. **Firebase Deployment** - Deploy frontend and backend to Firebase infrastructure

**Key Principles:**
- **Incremental Development:** Each phase delivers working, testable functionality
- **Backward Compatibility:** Support both old and new systems during migration
- **Feature Flags:** Use flags to control rollout and enable quick rollback
- **Data Integrity:** Ensure no data loss during migrations
- **User Experience:** Seamless transitions with minimal disruption

**Current State:**
- Backend uses Passport.js with Google OAuth + JWT tokens
- Basic credit system with `credits_remaining` field
- Frontend uses mock authentication (`NEXT_PUBLIC_SKIP_AUTH=true`)
- No payment system
- No centralized pricing configuration

**Target State:**
- Firebase Authentication with Google OAuth
- Beautiful login page matching Animate UI aesthetic
- Comprehensive credit system with transactions and cost tracking
- Free-to-use tier system (free, starter, pro, premium) with email-based premium unlock
- Centralized pricing configuration in Firestore
- Frontend deployed to Firebase Hosting
- Backend deployed to Cloud Run

---

## Implementation Phases

| Phase | Focus | Duration | Dependencies | Critical Path |
|-------|-------|----------|--------------|---------------|
| **Phase 1** | Firebase Auth Migration | Week 1-2 | None | ✅ Critical |
| **Phase 2** | Login Page | Week 2-3 | Phase 1 | ✅ Critical |
| **Phase 3** | Credit System Foundation | Week 3-5 | Phase 1 | ✅ Critical |
| **Phase 4** | Deployment | Week 5-6 | Phase 1-3 | ✅ Critical |
| **Phase 5** | Testing & Migration | Week 6-8 | Phase 4 | ⚠️ Important |

**Total Estimated Time: 6-8 weeks**

---

## Phase 1: Firebase Authentication Migration

**Duration:** Week 1-2  
**Goal:** Migrate from Passport.js to Firebase Authentication  
**Priority:** Critical (blocks all other features)

### 1.1 Prerequisites & Setup

**Tasks:**
- [ ] Verify Firebase project configuration (`video-research-40c4b`)
- [ ] Confirm Firebase Authentication is enabled with Google provider
- [ ] Verify service account key exists (`video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json`)
- [ ] Set up Firebase CLI: `npm install -g firebase-tools`
- [ ] Login to Firebase: `firebase login`
- [ ] Create feature flag: `USE_FIREBASE_AUTH` (default: `false`)

**Environment Variables:**
```bash
# Backend .env
GOOGLE_APPLICATION_CREDENTIALS=./video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json
USE_FIREBASE_AUTH=false  # Feature flag

# Frontend .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=video-research-40c4b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=video-research-40c4b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=video-research-40c4b.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=723520495466
NEXT_PUBLIC_FIREBASE_APP_ID=1:723520495466:web:6fda6d5e11c877bca44f13
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-JSDG4VDKT9
NEXT_PUBLIC_USE_FIREBASE_AUTH=false  # Feature flag
```

### 1.2 Backend: Firebase Admin SDK Setup

**File:** `backend/src/config/firebase-admin.ts`

**Tasks:**
- [ ] Create Firebase Admin SDK initialization file
- [ ] Initialize with service account credentials
- [ ] Export `admin` instance for use in middleware
- [ ] Add error handling for initialization failures
- [ ] Add logging for initialization status

**Implementation:**
```typescript
import admin from 'firebase-admin';
import * as serviceAccount from '../../video-research-40c4b-firebase-adminsdk-fbsvc-8ec5f10735.json';
import logger from '../utils/logger';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    logger.info('Firebase Admin SDK initialized');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', error);
    throw error;
  }
}

export default admin;
```

### 1.3 Backend: Firebase Token Verification Middleware

**File:** `backend/src/middleware/firebase-auth.middleware.ts`

**Tasks:**
- [ ] Create `verifyFirebaseToken()` middleware function
- [ ] Extract Firebase ID token from `Authorization: Bearer <token>` header
- [ ] Verify token using Firebase Admin SDK: `admin.auth().verifyIdToken()`
- [ ] Extract user info from decoded token (uid, email, name, picture)
- [ ] Attach user info to `req.user` (compatible with existing interface)
- [ ] Handle errors: invalid token, expired token, network errors
- [ ] Add feature flag check: use Firebase Auth if enabled, else use Passport.js

**Implementation:**
```typescript
import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase-admin';
import logger from '../utils/logger';
import { AuthenticatedUser } from '../types/auth.types';
import { getOrCreateUserByUid } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function verifyFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Get or create user in Firestore
    const user = await getOrCreateUserByUid(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || decodedToken.email || 'User'
    );

    // Attach user to request (compatible with existing interface)
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
    };

    next();
  } catch (error) {
    logger.error('Firebase token verification failed', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### 1.4 Backend: User Model Updates

**File:** `backend/src/models/User.ts`

**Tasks:**
- [ ] Add `uid` field to User interface (Firebase Auth UID)
- [ ] Create `getOrCreateUserByUid()` function
- [ ] Query Firestore by `uid` field instead of `googleId`
- [ ] Keep `googleId` field for migration period (don't remove yet)
- [ ] Update user creation to include `uid` field
- [ ] Add migration helper: `migrateGoogleIdToUid()`

**Implementation:**
```typescript
export interface User {
  id: string;
  uid?: string; // NEW: Firebase Auth UID
  googleId?: string; // KEEP: For migration
  email: string;
  name: string;
  tier: 'free' | 'premium' | 'starter' | 'pro';
  credits_remaining: number;
  created_at: FirebaseFirestore.Timestamp;
  last_reset: FirebaseFirestore.Timestamp;
}

export async function getOrCreateUserByUid(
  uid: string,
  email: string,
  name: string
): Promise<User> {
  // Query by Firebase UID
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('uid', '==', uid).limit(1).get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  // Create new user with Firebase UID
  const newUser = {
    uid,
    email,
    name,
    tier: 'free' as const,
    credits_remaining: 120, // Free tier default
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    last_reset: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await usersRef.add(newUser);
  return { id: docRef.id, ...newUser } as User;
}
```

### 1.5 Backend: Update Auth Routes

**File:** `backend/src/routes/auth.routes.ts`

**Tasks:**
- [ ] Add feature flag check for Firebase Auth
- [ ] Create `/auth/verify` endpoint for Firebase token verification
- [ ] Keep existing Passport.js routes (for backward compatibility)
- [ ] Add conditional route registration based on feature flag
- [ ] Update `/auth/me` to work with both auth systems

**Implementation:**
```typescript
import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/firebase-auth.middleware';
import { verifyToken } from '../middleware/auth.middleware'; // Existing Passport.js
import { getOrCreateUserByUid } from '../models/User';
import { env } from '../config/env';

const router = Router();

// Firebase Auth verification endpoint
if (env.USE_FIREBASE_AUTH) {
  router.get('/verify', verifyFirebaseToken, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ user: req.user });
  });
}

// Keep existing routes for backward compatibility
export function registerAuthRoutes(): Router {
  // ... existing Passport.js routes ...
  return router;
}
```

### 1.6 Backend: Update Protected Routes

**Files:** `backend/src/routes/summarize.routes.ts`, `backend/src/routes/history.routes.ts`

**Tasks:**
- [ ] Create conditional auth middleware selector
- [ ] Use Firebase Auth middleware if feature flag enabled
- [ ] Fall back to Passport.js middleware if disabled
- [ ] Test both paths work correctly
- [ ] Update all protected routes to use conditional middleware

**Implementation:**
```typescript
import { env } from '../config/env';
import { verifyFirebaseToken } from '../middleware/firebase-auth.middleware';
import { verifyToken } from '../middleware/auth.middleware';

// Conditional auth middleware
export const authenticate = env.USE_FIREBASE_AUTH 
  ? verifyFirebaseToken 
  : verifyToken;

// Use in routes
router.post('/', authenticate, async (req, res) => {
  // ... existing logic ...
});
```

### 1.7 Frontend: Firebase Client SDK Setup

**File:** `frontend/src/lib/firebase.ts`

**Tasks:**
- [ ] Install Firebase SDK: `npm install firebase`
- [ ] Create Firebase client configuration file
- [ ] Initialize Firebase app (prevent multiple initializations)
- [ ] Export `auth`, `db`, and `googleProvider` instances
- [ ] Configure Google provider with `prompt: 'select_account'`

**Implementation:**
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

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
```

### 1.8 Frontend: Auth Context

**File:** `frontend/src/contexts/AuthContext.tsx`

**Tasks:**
- [ ] Create `AuthContext` with Firebase Auth integration
- [ ] Implement `signIn()` using `signInWithPopup()`
- [ ] Implement `signOut()` using Firebase `signOut()`
- [ ] Implement `getIdToken()` to get Firebase ID token
- [ ] Add `onAuthStateChanged` listener for real-time updates
- [ ] Add feature flag check: use Firebase Auth if enabled, else mock auth
- [ ] Export `useAuth()` hook

**Implementation:**
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
  const useFirebaseAuth = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true';

  useEffect(() => {
    if (!useFirebaseAuth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [useFirebaseAuth]);

  const signIn = async () => {
    if (!useFirebaseAuth) {
      // Fallback to mock auth
      return;
    }
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    if (!useFirebaseAuth) return;
    await firebaseSignOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!useFirebaseAuth || !user) return null;
    return await user.getIdToken();
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

### 1.9 Frontend: API Client Updates

**File:** `frontend/src/lib/api.ts`

**Tasks:**
- [ ] Update `getAuthToken()` to use Firebase ID token
- [ ] Create token getter function that works with AuthContext
- [ ] Update all API calls to include Firebase token in Authorization header
- [ ] Handle token refresh automatically
- [ ] Add feature flag check for token source

**Implementation:**
```typescript
// Token getter (set by AuthContext)
let tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

async function getAuthToken(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true') {
    return tokenGetter ? await tokenGetter() : null;
  }
  // Fallback to existing JWT token logic
  return localStorage.getItem('auth_token');
}

// In API calls
const token = await getAuthToken();
headers['Authorization'] = `Bearer ${token}`;
```

### 1.10 Testing & Validation

**Tasks:**
- [ ] Test Firebase Auth sign-in flow end-to-end
- [ ] Test token verification on backend
- [ ] Test user creation/retrieval from Firestore
- [ ] Test backward compatibility (Passport.js still works)
- [ ] Test feature flag toggle (switch between auth systems)
- [ ] Verify no data loss during migration
- [ ] Test error handling (invalid tokens, network errors)

**Test Scenarios:**
1. New user signs in with Google → Creates user in Firestore with `uid`
2. Existing user signs in → Retrieves user by `uid`
3. Token expires → User must re-authenticate
4. Invalid token → Returns 401 error
5. Feature flag disabled → Uses Passport.js

### 1.11 Migration Script (Optional)

**File:** `backend/scripts/migrate-users-to-firebase-uid.ts`

**Tasks:**
- [ ] Create script to migrate existing users
- [ ] Map `googleId` to Firebase `uid` by email lookup
- [ ] Update user documents with `uid` field
- [ ] Keep `googleId` for reference
- [ ] Log migration progress
- [ ] Handle errors gracefully

**Deliverables:**
- ✅ Firebase Admin SDK initialized
- ✅ Token verification middleware working
- ✅ User model supports Firebase UID
- ✅ Frontend AuthContext integrated
- ✅ API client sends Firebase tokens
- ✅ Feature flag controls auth system
- ✅ Backward compatibility maintained

---

## Phase 2: Login Page Implementation

**Duration:** Week 2-3  
**Goal:** Create beautiful, minimalist login page matching Animate UI aesthetic  
**Priority:** Critical (user-facing)

### 2.1 Design System Integration

**File:** `frontend/src/config/visual-effects.ts`

**Tasks:**
- [ ] Verify visual-effects.ts exists and has required config
- [ ] Ensure color scheme matches PRD requirements
- [ ] Verify typography scale is available
- [ ] Check spacing and border radius values
- [ ] Confirm animation variants are defined

### 2.2 Theme Setup

**File:** `frontend/src/app/providers.tsx`

**Tasks:**
- [ ] Install `next-themes`: `npm install next-themes`
- [ ] Create ThemeProvider component
- [ ] Wrap app with ThemeProvider
- [ ] Configure theme persistence (localStorage)
- [ ] Set up system preference detection
- [ ] Add theme toggle component (reusable)

**Implementation:**
```typescript
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
```

### 2.3 Header Component

**File:** `frontend/src/components/auth/LoginHeader.tsx`

**Tasks:**
- [ ] Create minimal header with logo/brand name
- [ ] Add theme toggle button (sun/moon icons from Lucide React)
- [ ] Style according to PRD (transparent background, backdrop blur)
- [ ] Make responsive (smaller on mobile)
- [ ] Add link to home page (`/`)

**Styling:**
- Background: `bg-slate-950/80 dark:bg-white/80 backdrop-blur-sm`
- Height: `h-16`
- Padding: `px-4 md:px-6 lg:px-8`
- Logo: `text-xl font-bold` (desktop), `text-lg` (mobile)

### 2.4 Login Form Component

**File:** `frontend/src/components/auth/LoginForm.tsx`

**Tasks:**
- [ ] Create form container with card styling
- [ ] Add welcome heading ("Welcome back")
- [ ] Add subheading ("Sign in to continue")
- [ ] Create email input field with label
- [ ] Create password input field with label
- [ ] Add show/hide password toggle (optional)
- [ ] Add "Forgot password?" link
- [ ] Add "Sign in" button with gradient styling
- [ ] Add "Don't have an account? Sign up" link
- [ ] Implement form validation (email format, required fields)
- [ ] Add error/success message display
- [ ] Integrate with Firebase Auth `signIn()` function

**Styling (matches PRD):**
- Form container: `bg-slate-900 dark:bg-white rounded-xl p-6 md:p-10 max-w-md w-full shadow-lg`
- Welcome heading: `text-3xl md:text-4xl lg:text-5xl font-bold text-slate-200 dark:text-slate-900`
- Inputs: `bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200`
- Button: `bg-gradient-to-r from-slate-600 to-slate-400 text-white px-8 py-3 rounded-lg w-full font-semibold`

### 2.5 Input Component

**File:** `frontend/src/components/auth/LoginInput.tsx`

**Tasks:**
- [ ] Create reusable input component
- [ ] Support email and password types
- [ ] Add label and error message display
- [ ] Implement focus states (border color, ring, scale)
- [ ] Add validation styling (invalid = red border)
- [ ] Support show/hide password toggle
- [ ] Add proper ARIA attributes

### 2.6 Animations

**File:** `frontend/src/components/auth/LoginForm.tsx`

**Tasks:**
- [ ] Install Framer Motion: `npm install framer-motion`
- [ ] Add fade-in animations for form elements
- [ ] Implement staggered animation sequence
- [ ] Add form container fade-in-up animation
- [ ] Respect `prefers-reduced-motion`
- [ ] Use animation variants from visual-effects.ts

**Animation Sequence:**
1. Form container: `opacity: 0 → 1, y: 20 → 0` (500ms, delay: 100ms)
2. Welcome heading: `opacity: 0 → 1` (400ms, delay: 200ms)
3. Subheading: `opacity: 0 → 1` (400ms, delay: 300ms)
4. Email input: `opacity: 0 → 1` (400ms, delay: 400ms)
5. Password input: `opacity: 0 → 1` (400ms, delay: 500ms)
6. Helper links: `opacity: 0 → 1` (400ms, delay: 600ms)
7. Submit button: `opacity: 0 → 1` (400ms, delay: 700ms)
8. Sign up link: `opacity: 0 → 1` (400ms, delay: 800ms)

### 2.7 Login Page Route

**File:** `frontend/src/app/login/page.tsx`

**Tasks:**
- [ ] Create login page route
- [ ] Integrate LoginHeader and LoginForm components
- [ ] Add redirect logic (if already authenticated, redirect to `/app`)
- [ ] Handle loading state (show spinner while checking auth)
- [ ] Add error handling for sign-in failures
- [ ] Implement success redirect to `/app` after login
- [ ] Add "Back to home" footer link

**Layout:**
- Full viewport height: `min-h-screen flex items-center justify-center`
- Centered form with padding: `px-4 md:px-6 lg:px-8`
- Background: `bg-slate-950 dark:bg-white`

### 2.8 Form Validation

**File:** `frontend/src/lib/validation.ts`

**Tasks:**
- [ ] Install React Hook Form: `npm install react-hook-form`
- [ ] Install Zod: `npm install zod @hookform/resolvers`
- [ ] Create login schema with email and password validation
- [ ] Integrate with LoginForm component
- [ ] Add real-time validation feedback
- [ ] Display inline error messages

**Schema:**
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

### 2.9 Google Sign-In Integration

**File:** `frontend/src/components/auth/GoogleSignInButton.tsx`

**Tasks:**
- [ ] Create "Sign in with Google" button component
- [ ] Style to match design system
- [ ] Add Google icon (from Lucide React or custom SVG)
- [ ] Integrate with Firebase Auth `signIn()` function
- [ ] Handle loading state during sign-in
- [ ] Show error messages on failure
- [ ] Add to LoginForm (optional, can be separate button)

### 2.10 Accessibility

**Tasks:**
- [ ] Add proper ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works (Tab, Enter, Escape)
- [ ] Add focus indicators (ring on focus)
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Ensure color contrast meets WCAG AA standards
- [ ] Add `aria-invalid` for invalid inputs
- [ ] Link error messages to inputs with `aria-describedby`

### 2.11 Responsive Design

**Tasks:**
- [ ] Test on mobile devices (375px, 414px widths)
- [ ] Test on tablets (768px, 1024px widths)
- [ ] Test on desktop (1280px, 1920px widths)
- [ ] Ensure touch targets are at least 44px × 44px
- [ ] Verify form is readable and usable on all screen sizes
- [ ] Test landscape orientation on mobile

### 2.12 Testing

**Tasks:**
- [ ] Test email/password sign-in flow
- [ ] Test Google sign-in flow
- [ ] Test form validation (invalid email, short password)
- [ ] Test error handling (network errors, invalid credentials)
- [ ] Test redirect logic (already authenticated → redirect to `/app`)
- [ ] Test theme toggle functionality
- [ ] Test responsive layout on multiple devices
- [ ] Test accessibility with keyboard and screen reader

**Deliverables:**
- ✅ Beautiful login page matching Animate UI aesthetic
- ✅ Firebase Auth integration working
- ✅ Form validation implemented
- ✅ Animations smooth and subtle
- ✅ Responsive design works on all devices
- ✅ Accessibility requirements met
- ✅ Theme toggle functional

---

## Phase 3: Credit System Foundation

**Duration:** Week 3-5  
**Goal:** Implement comprehensive credit tracking and management system with free-to-use tiers  
**Priority:** Critical

### 3.1 Database Schema Setup

**Firestore Collections:**

**Tasks:**
- [ ] Create `user_credits` collection structure
- [ ] Create `credit_transactions` collection structure
- [ ] Create `batch_costs` collection structure
- [ ] Create `pricing_config` collection (for centralized pricing)
- [ ] Set up Firestore security rules
- [ ] Create indexes for common queries

**Collections:**

1. **`user_credits`** (one document per user, document ID = userId)
```typescript
{
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastResetDate: Timestamp;
  tier: 'free' | 'starter' | 'pro' | 'premium';
  tierUnlockedAt: Timestamp | null; // When premium tier was unlocked via email
  tierUnlockedBy: string | null; // Email address that requested unlock
}
```

2. **`credit_transactions`** (collection)
```typescript
{
  transactionId: string;
  userId: string;
  type: 'earned' | 'spent' | 'reset' | 'tier_upgrade';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata: {
    batchId?: string;
    tierUpgrade?: string; // New tier when upgraded
  };
  timestamp: Timestamp;
}
```

3. **`batch_costs`** (collection)
```typescript
{
  batchId: string;
  userId: string;
  timestamp: Timestamp;
  costs: {
    supadata: { creditsUsed: number; costUSD: number };
    qwen: { model: string; inputTokens: number; outputTokens: number; costUSD: number };
    firebase: { writes: number; reads: number; storageBytes: number; costUSD: number };
    totalCostUSD: number;
  };
  creditsCharged: number;
  margin: number;
}
```

4. **`pricing_config`** (single document, ID = 'current')
```typescript
{
  version: number;
  lastUpdated: Timestamp;
  lastUpdatedBy: string;
  tiers: {
    free: { credits: number; resetFrequency: 'daily' };
    starter: { credits: number; resetFrequency: 'monthly' };
    pro: { credits: number; resetFrequency: 'monthly' };
    premium: { credits: number; resetFrequency: 'monthly' };
  };
  creditRates: { ... };
  batchPricing: { ... };
}
```

5. **`tier_requests`** (collection) - Track email requests for premium tier unlock
```typescript
{
  requestId: string;
  userId: string;
  userEmail: string;
  requestedTier: 'starter' | 'pro' | 'premium';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
  processedAt: Timestamp | null;
  processedBy: string | null; // Admin email
  notes: string | null;
}
```

### 3.2 Centralized Pricing Service

**File:** `backend/src/services/pricing.service.ts`

**Tasks:**
- [ ] Create `getPricingConfig()` function with caching (5-minute TTL)
- [ ] Create `getTierCredits(tier)` helper
- [ ] Create `getBatchPrice()` helper
- [ ] Create `invalidatePricingCache()` function
- [ ] Add error handling for missing config
- [ ] Add logging for cache hits/misses

**Implementation:**
```typescript
import { db } from '../config/database';
import { doc, getDoc } from 'firebase-admin/firestore';

let cachedPricing: PricingConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now();
  if (cachedPricing && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedPricing;
  }

  const docRef = doc(db, 'pricing_config', 'current');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Pricing configuration not found');
  }

  cachedPricing = docSnap.data() as PricingConfig;
  cacheTimestamp = now;
  return cachedPricing;
}
```

### 3.3 Pricing Initialization Script

**File:** `backend/scripts/init-pricing-config.ts`

**Tasks:**
- [ ] Create script to initialize pricing configuration
- [ ] Define initial tier credit allocations
- [ ] Set up tier configurations (Free, Starter, Pro, Premium)
- [ ] Set up credit consumption rates
- [ ] Set up batch pricing (flat rates)
- [ ] Run script to create initial config in Firestore

**Initial Tier Credit Allocations:**
- Free: 120 credits (daily reset)
- Starter: 500 credits (monthly reset)
- Pro: 2,000 credits (monthly reset)
- Premium: 5,000 credits (monthly reset)
- Batch Pricing: 1 video (20), 2 videos (30), 3 videos (40), 4-5 videos (60), 6-10 videos (120)

### 3.4 Credit Service

**File:** `backend/src/services/credit.service.ts`

**Tasks:**
- [ ] Create `checkCreditBalance(userId): Promise<number>`
- [ ] Create `deductCredits(userId, amount, metadata): Promise<void>`
- [ ] Create `addCredits(userId, amount, type, metadata): Promise<void>`
- [ ] Create `resetDailyCredits(userId): Promise<void>`
- [ ] Create `resetMonthlyCredits(userId): Promise<void>`
- [ ] Create `getCreditTransactions(userId, limit, offset): Promise<Transaction[]>`
- [ ] Implement atomic operations (Firestore transactions)
- [ ] Add error handling for insufficient credits
- [ ] Create transaction records for all credit changes

**Implementation:**
```typescript
import { db } from '../config/database';
import { doc, getDoc, updateDoc, runTransaction } from 'firebase-admin/firestore';

export async function checkCreditBalance(userId: string): Promise<number> {
  const creditDoc = await getDoc(doc(db, 'user_credits', userId));
  if (!creditDoc.exists()) {
    // Initialize credits for new user
    await initializeUserCredits(userId);
    return 120; // Free tier default
  }
  return creditDoc.data().balance || 0;
}

export async function deductCredits(
  userId: string,
  amount: number,
  metadata: { batchId?: string }
): Promise<void> {
  const creditRef = doc(db, 'user_credits', userId);
  
  await runTransaction(db, async (transaction) => {
    const creditDoc = await transaction.get(creditRef);
    if (!creditDoc.exists()) {
      throw new Error('User credits not found');
    }

    const currentBalance = creditDoc.data().balance || 0;
    if (currentBalance < amount) {
      throw new Error('Insufficient credits');
    }

    const newBalance = currentBalance - amount;
    
    // Update balance
    transaction.update(creditRef, {
      balance: newBalance,
      totalSpent: (creditDoc.data().totalSpent || 0) + amount,
    });

    // Create transaction record
    const transactionRef = doc(db.collection('credit_transactions'));
    transaction.set(transactionRef, {
      transactionId: transactionRef.id,
      userId,
      type: 'spent',
      amount: -amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Spent ${amount} credits on batch`,
      metadata,
      timestamp: new Date(),
    });
  });
}
```

### 3.5 Cost Tracking Service

**File:** `backend/src/services/cost-tracking.service.ts`

**Tasks:**
- [ ] Create `trackBatchCost(batchId, costs): Promise<void>`
- [ ] Create `calculateBatchCost(transcriptCount, aiTokens, firebaseOps): CostBreakdown`
- [ ] Create `getMarginReport(startDate, endDate): Promise<MarginReport>`
- [ ] Track Supadata costs (transcript fetching)
- [ ] Track Qwen costs (AI processing, pre-condensing)
- [ ] Track Firebase costs (storage, reads, writes)
- [ ] Calculate margin: `(creditsCharged * 0.001 - totalCostUSD) / totalCostUSD`
- [ ] Store cost data in `batch_costs` collection

### 3.6 Credit Middleware

**File:** `backend/src/middleware/credit-check.middleware.ts`

**Tasks:**
- [ ] Create `checkCreditsMiddleware()` function
- [ ] Calculate batch cost based on video count (use centralized pricing)
- [ ] Check user's credit balance before processing
- [ ] Return 402 (Payment Required) if insufficient credits
- [ ] Attach credit cost to request for later deduction
- [ ] Integrate with existing quota middleware

**Implementation:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { checkCreditBalance } from '../services/credit.service';
import { getBatchPrice } from '../services/pricing.service';

export async function checkCreditsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const videoCount = req.body.urls?.length || 0;
  const requiredCredits = await getBatchPrice(videoCount);
  const balance = await checkCreditBalance(req.user.id);

  if (balance < requiredCredits) {
    res.status(402).json({
      error: 'Insufficient credits',
      required: requiredCredits,
      balance,
    });
    return;
  }

  // Attach credit cost to request for later deduction
  (req as any).creditCost = requiredCredits;
  next();
}
```

### 3.7 Credit Reset Jobs

**File:** `backend/src/jobs/credit-reset.job.ts`

**Tasks:**
- [ ] Create daily reset job for free tier (midnight UTC)
- [ ] Create monthly reset job for premium tiers (first day of month, midnight UTC)
- [ ] Query all users needing reset
- [ ] Reset credits based on tier
- [ ] Create transaction records for resets
- [ ] Handle errors gracefully (log and continue)
- [ ] Set up cron schedule (use node-cron or Cloud Scheduler)

**Implementation:**
```typescript
import cron from 'node-cron';
import { db } from '../config/database';
import { collection, query, where, getDocs } from 'firebase-admin/firestore';
import { resetDailyCredits, resetMonthlyCredits } from '../services/credit.service';

// Daily reset for free tier (midnight UTC)
cron.schedule('0 0 * * *', async () => {
  const usersRef = collection(db, 'user_credits');
  const freeTierUsers = query(usersRef, where('tier', '==', 'free'));
  const snapshot = await getDocs(freeTierUsers);

  for (const doc of snapshot.docs) {
    try {
      await resetDailyCredits(doc.id);
    } catch (error) {
      logger.error(`Failed to reset credits for user ${doc.id}`, error);
    }
  }
});

// Monthly reset for premium tiers (first day of month, midnight UTC)
cron.schedule('0 0 1 * *', async () => {
  const usersRef = collection(db, 'user_credits');
  const premiumTierUsers = query(
    usersRef,
    where('tier', 'in', ['starter', 'pro', 'premium'])
  );
  const snapshot = await getDocs(premiumTierUsers);

  for (const doc of snapshot.docs) {
    try {
      await resetMonthlyCredits(doc.id);
    } catch (error) {
      logger.error(`Failed to reset credits for user ${doc.id}`, error);
    }
  }
});
```

### 3.8 Update Summary Service

**File:** `backend/src/services/summary.service.ts`

**Tasks:**
- [ ] Integrate credit deduction after successful batch
- [ ] Track batch costs during processing
- [ ] Calculate actual costs (Supadata, Qwen, Firebase)
- [ ] Store cost data in `batch_costs` collection
- [ ] Deduct credits using `deductCredits()` service
- [ ] Handle errors (if deduction fails, roll back batch)

**Integration Points:**
- After transcript fetching: Track Supadata costs
- After AI processing: Track Qwen costs (input/output tokens)
- After Firestore writes: Track Firebase costs
- After successful batch: Deduct credits and store cost data

### 3.9 Frontend: Credit Balance Display

**File:** `frontend/src/components/credits/CreditBalance.tsx`

**Tasks:**
- [ ] Create credit balance component
- [ ] Display current balance prominently
- [ ] Show credits needed for current batch
- [ ] Warn if insufficient credits
- [ ] Add link to request tier upgrade
- [ ] Use Firestore real-time listener for updates
- [ ] Style according to design system

**Hook:**
```typescript
export function useCreditBalance(userId: string) {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'user_credits', userId),
      (snapshot) => {
        setBalance(snapshot.data()?.balance || 0);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  return balance;
}
```

### 3.10 Frontend: Pricing Hook

**File:** `frontend/src/hooks/usePricing.ts`

**Tasks:**
- [ ] Create `usePricing()` hook with Firestore listener
- [ ] Create `useTierInfo()` helper hook
- [ ] Implement caching to prevent unnecessary reads
- [ ] Handle loading and error states
- [ ] Update UI automatically when pricing changes

### 3.11 Tier Unlock System

**File:** `backend/src/services/tier.service.ts`

**Tasks:**
- [ ] Create `requestTierUpgrade(userId, requestedTier, userEmail)` function
- [ ] Create tier request document in `tier_requests` collection
- [ ] Send email notification to admin (cazevfung@gmail.com) with request details
- [ ] Create `approveTierUpgrade(requestId, adminEmail)` function
- [ ] Update user's tier in `user_credits` collection
- [ ] Reset credits based on new tier
- [ ] Create transaction record for tier upgrade
- [ ] Update tier request status to 'approved'
- [ ] Send confirmation email to user

**File:** `backend/src/routes/tier.routes.ts`

**Tasks:**
- [ ] Create `POST /tier/request` endpoint (authenticated)
- [ ] Create `GET /tier/status` endpoint (authenticated, check user's tier)
- [ ] Add validation for tier request (valid tier, user not already on that tier)

**File:** `frontend/src/components/tier/TierUpgradeRequest.tsx`

**Tasks:**
- [ ] Create tier upgrade request component
- [ ] Display current tier and available tiers
- [ ] Show email contact information (cazevfung@gmail.com)
- [ ] Add "Request Tier Upgrade" button
- [ ] Show request status if pending
- [ ] Display success message after request submitted
- [ ] Add link to email client with pre-filled message

**Implementation:**
```typescript
// Backend: Request tier upgrade
export async function requestTierUpgrade(
  userId: string,
  requestedTier: 'starter' | 'pro' | 'premium',
  userEmail: string
): Promise<void> {
  const requestRef = db.collection('tier_requests').doc();
  await requestRef.set({
    requestId: requestRef.id,
    userId,
    userEmail,
    requestedTier,
    status: 'pending',
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    processedAt: null,
    processedBy: null,
    notes: null,
  });

  // Send email to admin
  await sendTierRequestEmail(userEmail, requestedTier);
}
```

### 3.12 Migration: Existing Users

**File:** `backend/scripts/migrate-users-to-credit-system.ts`

**Tasks:**
- [ ] Create migration script
- [ ] Query all existing users
- [ ] Create `user_credits` documents
- [ ] Initialize balances based on tier
- [ ] Set up reset schedules
- [ ] Create initial transaction records
- [ ] Handle errors gracefully
- [ ] Log migration progress

**Deliverables:**
- ✅ Credit system database schema created
- ✅ Centralized pricing service implemented
- ✅ Credit service with all CRUD operations
- ✅ Cost tracking integrated
- ✅ Credit middleware protecting routes
- ✅ Credit reset jobs scheduled
- ✅ Tier unlock system implemented
- ✅ Frontend credit balance display
- ✅ Existing users migrated

---

## Phase 4: Deployment & Infrastructure

**Duration:** Week 5-6  
**Goal:** Deploy frontend and backend to Firebase infrastructure  
**Priority:** Critical (production readiness)

### 4.1 Frontend: Firebase Hosting Setup

**Tasks:**
- [ ] Initialize Firebase Hosting: `firebase init hosting`
- [ ] Configure `firebase.json` for Next.js
- [ ] Set up static export configuration
- [ ] Configure rewrites for client-side routing
- [ ] Set up caching headers
- [ ] Configure environment variables for production
- [ ] Test build locally: `npm run build`

**File:** `frontend/firebase.json`
```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
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

**File:** `frontend/next.config.ts`
```typescript
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};
```

### 4.2 Backend: Cloud Run Setup

**Tasks:**
- [ ] Create Dockerfile for backend
- [ ] Configure Cloud Run deployment
- [ ] Set up environment variables
- [ ] Configure service account permissions
- [ ] Set up health check endpoint
- [ ] Configure CORS for Firebase Hosting domain
- [ ] Set up logging and monitoring

**File:** `backend/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src ./src
COPY config.yaml ./
COPY scripts ./scripts

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
```

**Deployment Commands:**
```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/video-research-40c4b/api

# Deploy to Cloud Run
gcloud run deploy api \
  --image gcr.io/video-research-40c4b/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production"
```

### 4.3 Environment Configuration

**Tasks:**
- [ ] Set production environment variables in Firebase Console
- [ ] Configure Cloud Run environment variables
- [ ] Set up secrets management (service account keys)
- [ ] Configure CORS for production domains
- [ ] Update OAuth redirect URIs in Google Cloud Console

**Production Domains:**
- `https://video-research-40c4b.firebaseapp.com`
- `https://video-research-40c4b.web.app`

### 4.4 Security Rules

**File:** `firestore.rules`

**Tasks:**
- [ ] Update Firestore security rules
- [ ] Allow read access to `pricing_config` (public)
- [ ] Restrict `user_credits` to owner only
- [ ] Restrict `credit_transactions` to owner only
- [ ] Restrict `tier_requests` to owner only (users can only read their own requests)
- [ ] Deploy rules: `firebase deploy --only firestore:rules`

### 4.5 Monitoring & Logging

**Tasks:**
- [ ] Set up Firebase Console monitoring
- [ ] Configure Cloud Run logging
- [ ] Set up error alerts
- [ ] Monitor authentication events
- [ ] Track credit usage
- [ ] Monitor tier upgrade requests
- [ ] Monitor API performance

### 4.6 Testing Production Deployment

**Tasks:**
- [ ] Test frontend deployment (Firebase Hosting)
- [ ] Test backend deployment (Cloud Run)
- [ ] Test authentication flow in production
- [ ] Test credit system in production
- [ ] Test tier upgrade request flow
- [ ] Verify CORS configuration
- [ ] Test error handling

**Deliverables:**
- ✅ Frontend deployed to Firebase Hosting
- ✅ Backend deployed to Cloud Run
- ✅ Environment variables configured
- ✅ Security rules deployed
- ✅ Monitoring set up
- ✅ Production testing complete

---

## Phase 5: Testing & Migration

**Duration:** Week 8-10  
**Goal:** Comprehensive testing and user migration  
**Priority:** Important (quality assurance)

### 5.1 Integration Testing

**Tasks:**
- [ ] Test complete user flow: Sign up → Login → Create batch → Request tier upgrade
- [ ] Test credit deduction during batch processing
- [ ] Test credit reset jobs (daily/monthly)
- [ ] Test tier upgrade request and approval flow
- [ ] Test error scenarios (insufficient credits)
- [ ] Test data consistency (credits match transactions)

### 5.2 User Migration

**Tasks:**
- [ ] Run migration script for existing users
- [ ] Verify all users have `uid` field
- [ ] Verify all users have `user_credits` documents
- [ ] Verify credit balances are correct
- [ ] Test authentication for migrated users
- [ ] Monitor for migration errors
- [ ] Create rollback plan

### 5.3 Performance Testing

**Tasks:**
- [ ] Test API response times
- [ ] Test Firestore read/write performance
- [ ] Test credit deduction performance
- [ ] Test concurrent user scenarios
- [ ] Load test with multiple users
- [ ] Monitor resource usage

### 5.4 Security Testing

**Tasks:**
- [ ] Test authentication security (token verification)
- [ ] Test authorization (users can't access other users' data)
- [ ] Test Firestore security rules
- [ ] Test CORS configuration
- [ ] Test rate limiting
- [ ] Security audit

### 5.5 User Acceptance Testing

**Tasks:**
- [ ] Create test scenarios for end users
- [ ] Test login page usability
- [ ] Test tier upgrade request flow
- [ ] Test credit system usability
- [ ] Gather user feedback
- [ ] Fix usability issues

### 5.6 Documentation

**Tasks:**
- [ ] Update API documentation
- [ ] Create user guide for login
- [ ] Create user guide for credit system
- [ ] Create user guide for tier upgrade requests
- [ ] Document deployment process
- [ ] Document troubleshooting steps

### 5.7 Gradual Rollout

**Tasks:**
- [ ] Enable Firebase Auth for 10% of users (feature flag)
- [ ] Monitor for errors
- [ ] Gradually increase to 50%, then 100%
- [ ] Monitor credit system
- [ ] Monitor tier upgrade requests
- [ ] Collect metrics and feedback

**Deliverables:**
- ✅ Comprehensive testing complete
- ✅ All users migrated
- ✅ Performance validated
- ✅ Security verified
- ✅ User acceptance testing done
- ✅ Documentation updated
- ✅ Gradual rollout successful

---

## Dependencies & Prerequisites

### Required Tools
- Node.js 18+ (LTS recommended)
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud SDK (for Cloud Run deployment)
- Git for version control

### Required Services
- Firebase project: `video-research-40c4b`
- Firestore Database (enabled)
- Firebase Authentication (enabled with Google provider)
- Firebase Hosting (needs initialization)
- Cloud Run (needs setup)
- Email service (for tier upgrade notifications to cazevfung@gmail.com)

### Required Credentials
- Firebase service account key
- Firebase client configuration
- Google Cloud service account
- Email service credentials (for sending tier upgrade notifications)

### Code Dependencies
- Frontend: `firebase`, `next-themes`, `framer-motion`, `react-hook-form`, `zod`
- Backend: `firebase-admin`, `nodemailer` (or similar for email notifications)

---

## Risk Mitigation

### Risk 1: Authentication Migration Failures
**Mitigation:**
- Use feature flags to control rollout
- Keep Passport.js code during transition
- Test thoroughly before enabling Firebase Auth
- Have rollback plan ready

### Risk 2: Data Loss During Migration
**Mitigation:**
- Backup Firestore data before migration
- Test migration script on staging data first
- Keep `googleId` field during transition
- Verify data integrity after migration

### Risk 3: Credit System Bugs
**Mitigation:**
- Use Firestore transactions for atomic operations
- Implement comprehensive error handling
- Log all credit transactions
- Monitor credit balances regularly

### Risk 4: Deployment Failures
**Mitigation:**
- Test deployments in staging first
- Have rollback procedures ready
- Monitor deployment logs
- Test health checks

---

## Success Criteria

### Phase 1: Firebase Auth Migration
- ✅ All users can authenticate with Firebase Auth
- ✅ Token verification works correctly
- ✅ User data migrated successfully
- ✅ No data loss during migration

### Phase 2: Login Page
- ✅ Beautiful login page matches design requirements
- ✅ Firebase Auth integration working
- ✅ Responsive design works on all devices
- ✅ Accessibility requirements met

### Phase 3: Credit System
- ✅ Credit tracking working correctly
- ✅ Cost tracking implemented
- ✅ Credit reset jobs running
- ✅ Tier unlock system working
- ✅ Frontend displays credit balance

### Phase 4: Deployment
- ✅ Frontend deployed to Firebase Hosting
- ✅ Backend deployed to Cloud Run
- ✅ All services working in production
- ✅ Monitoring and logging set up

### Phase 5: Testing & Migration
- ✅ All tests passing
- ✅ Users migrated successfully
- ✅ Performance validated
- ✅ Security verified

---

## Timeline Summary

| Phase | Duration | Start Week | End Week |
|-------|----------|------------|----------|
| Phase 1: Firebase Auth Migration | 2 weeks | Week 1 | Week 2 |
| Phase 2: Login Page | 1 week | Week 2 | Week 3 |
| Phase 3: Credit System | 2 weeks | Week 3 | Week 5 |
| Phase 4: Deployment | 1 week | Week 5 | Week 6 |
| Phase 5: Testing & Migration | 2 weeks | Week 6 | Week 8 |

**Total: 8 weeks**

---

**Document Version:** 2.0  
**Last Updated:** 2024  
**Status:** Draft - Ready for Review  
**Changes:** Removed payment system integration. All tiers are now free-to-use with email-based premium tier unlock (cazevfung@gmail.com).  
**Next Steps:** Begin Phase 1 implementation

