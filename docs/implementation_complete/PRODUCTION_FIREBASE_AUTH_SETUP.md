# Production Firebase Auth Setup Guide

This guide explains how to configure your Firebase deployment for proper user authentication and account creation.

## What Was Fixed

1. **Credits Endpoint**: Added missing `/api/credits/balance` and `/api/credits/transactions` endpoints
2. **User Creation**: Users are now automatically created in Firestore when they sign up via Firebase Auth
3. **Credits Initialization**: Credits are automatically initialized when new users are created

## Required Environment Variables for Production

### Backend (Cloud Run) Environment Variables

Set these in your Cloud Run service configuration:

```bash
# Authentication
AUTH_ENABLED=true
USE_FIREBASE_AUTH=true

# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR use Secret Manager:
# GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-service-account

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# Storage Mode (MUST be Firestore in production)
# Set via config.yaml: system.use_local_storage: false
# OR via environment variable:
USE_LOCAL_STORAGE=false
```

### Frontend Environment Variables

Set these in your frontend build environment (Vercel/Netlify/etc.):

```bash
# Firebase Auth
NEXT_PUBLIC_USE_FIREBASE_AUTH=true

# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend-url.run.app

# Disable auth bypass in production
NEXT_PUBLIC_SKIP_AUTH=false
```

## How It Works Now

### User Sign Up Flow

1. **User signs up** via frontend (email/password or Google OAuth)
2. **Firebase Auth** creates the user account
3. **Frontend** sends Firebase ID token to backend on first API call
4. **Backend middleware** (`verifyFirebaseToken`) verifies the token
5. **Backend** calls `getOrCreateUserByUid()` which:
   - Creates user record in Firestore `users` collection
   - Automatically initializes credits in `user_credits` collection
6. **User can now**:
   - Access history (`/api/history`)
   - Check credits (`/api/credits/balance`)
   - Create summaries

### What Gets Created in Firestore

When a new user signs up, these documents are created:

1. **`users/{userId}`** - User profile
   ```json
   {
     "email": "user@example.com",
     "uid": "firebase-auth-uid",
     "name": "User Name",
     "tier": "free",
     "credits_remaining": 120,
     "created_at": "2024-01-01T00:00:00Z",
     "last_reset": "2024-01-01T00:00:00Z"
   }
   ```

2. **`user_credits/{userId}`** - Credit balance
   ```json
   {
     "userId": "user-doc-id",
     "balance": 40,
     "totalEarned": 120,
     "totalSpent": 0,
     "lastResetDate": "2024-01-01T00:00:00Z",
     "tier": "free",
     "tierUnlockedAt": null,
     "tierUnlockedBy": null
   }
   ```

## Verification Steps

After deploying, verify:

1. **Sign up a new user** via your frontend
2. **Check Firestore Console**:
   - Go to Firestore Database
   - Check `users` collection - should have new user document
   - Check `user_credits` collection - should have credits document
3. **Test API endpoints**:
   - `/auth/me` - Should return user info
   - `/api/credits/balance` - Should return credit balance
   - `/api/history` - Should return empty array (no summaries yet)
4. **Create a summary** - Should work and deduct credits

## Troubleshooting

### Users not appearing in Firestore

- Check backend logs for errors in `getOrCreateUserByUid()`
- Verify `AUTH_ENABLED=true` and `USE_FIREBASE_AUTH=true`
- Verify Firebase Admin SDK credentials are correct
- Check that frontend is sending Authorization header with Firebase token

### Credits not initialized

- Credits are initialized automatically when user is created
- If missing, they'll be created on first access to `/api/credits/balance`
- Check backend logs for credit initialization errors

### History not loading

- Ensure user document exists in Firestore
- Check that `user_id` field in summaries matches user document ID
- Verify authentication token is being sent with requests

## Code Changes Summary

1. **`backend/src/routes/credits.routes.ts`** - New credits endpoints
2. **`backend/src/controllers/credits.controller.ts`** - Credits balance and transactions
3. **`backend/src/models/User.ts`** - Auto-initialize credits on user creation
4. **`backend/src/controllers/auth.controller.ts`** - Dev user creation (dev mode only)

## Next Steps

1. Deploy backend with updated code
2. Set environment variables in Cloud Run
3. Set frontend environment variables
4. Test user signup flow
5. Verify Firestore collections are populated

