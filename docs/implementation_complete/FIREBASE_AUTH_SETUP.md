# Firebase Authentication Setup Guide

Complete guide for configuring Firebase Authentication with email/password provider for the Video Research application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Firebase Console Configuration](#firebase-console-configuration)
4. [Environment Variables Setup](#environment-variables-setup)
5. [Verification Checklist](#verification-checklist)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

---

## Overview

This guide covers the setup and configuration of Firebase Authentication with email/password provider. The application supports:

- **Email/Password Authentication**: Users can sign up and sign in with email and password
- **Google OAuth**: Users can sign in with their Google account
- **Backend Integration**: Automatic user creation in backend database when Firebase Auth user is created

All configuration values are centralized in environment variables - no hardcoded values.

---

## Prerequisites

Before starting, ensure you have:

1. **Firebase Project**: A Firebase project created at [Firebase Console](https://console.firebase.google.com/)
2. **Firebase Admin SDK**: Service account JSON file downloaded from Firebase Console
3. **Environment Variables**: Access to configure both frontend and backend environment variables
4. **Firebase Console Access**: Admin access to configure authentication providers

---

## Firebase Console Configuration

### Step 1: Enable Email/Password Provider

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Email/Password** provider
5. Enable **Email/Password** (toggle ON)
6. **Optional**: Enable **Email link (passwordless sign-in)** if desired (not required for MVP)
7. Click **Save**

**Important**: Email verification is **optional** for MVP. You can enable it later if needed.

### Step 2: Configure Authorized Domains

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Ensure the following domains are listed:
   - `localhost` (for local development)
   - Your production domain (e.g., `video-research-40c4b.firebaseapp.com`)
   - Your custom domain (if applicable)
3. Click **Add domain** if any are missing
4. Click **Save**

**Note**: Firebase automatically includes `localhost` and your Firebase hosting domains. You only need to add custom domains.

### Step 3: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. If you don't have a web app, click **Add app** → **Web** (</> icon)
4. Register your app with a nickname (e.g., "Video Research Web")
5. Copy the Firebase configuration values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId` (optional, for Analytics)

**Save these values** - you'll need them for environment variables.

### Step 4: Download Service Account Key (Backend)

1. In Firebase Console, go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Save the JSON file securely (e.g., `firebase-service-account.json`)
4. **Important**: Keep this file secure and never commit it to version control

---

## Environment Variables Setup

### Frontend Environment Variables

Create or update `frontend/.env.local`:

```bash
# Backend API URL
# Development: http://localhost:5000
# Production: https://your-cloud-run-url.run.app
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase Authentication Configuration
# Feature flag to enable/disable Firebase Auth (set to "true" to enable)
NEXT_PUBLIC_USE_FIREBASE_AUTH=true

# Firebase Client SDK Configuration
# Get these values from Firebase Console → Project Settings → Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id  # Optional

# Development: Skip authentication (set to "true" to bypass auth during development)
# WARNING: This should NEVER be true in production!
NEXT_PUBLIC_SKIP_AUTH=false

# Development User Configuration (only used when NEXT_PUBLIC_SKIP_AUTH=true)
# These values should match the backend DEV_USER_* values
NEXT_PUBLIC_DEV_USER_ID=dev-user-id
NEXT_PUBLIC_DEV_USER_EMAIL=dev@example.com
NEXT_PUBLIC_DEV_USER_NAME=Development User
```

### Backend Environment Variables

Create or update `backend/.env`:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
# Additional frontend URLs for CORS (comma-separated, for production)
# Example: FRONTEND_URLS=https://video-research-40c4b.firebaseapp.com,https://video-research-40c4b.web.app
FRONTEND_URLS=

# Authentication
# Set to "true" to enable authentication
AUTH_ENABLED=true

# Firebase Authentication (Feature flag)
# Set to "true" to use Firebase Auth (recommended)
USE_FIREBASE_AUTH=true

# Firebase Firestore
# Path to service account JSON file (relative to project root or absolute path)
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
# For local development with emulator (optional)
# FIRESTORE_EMULATOR_HOST=localhost:8080

# Development User Configuration (for local dev when AUTH_ENABLED=false)
# These values should match the frontend NEXT_PUBLIC_DEV_USER_* values
DEV_USER_ID=dev-user-id
DEV_USER_EMAIL=dev@example.com
DEV_USER_NAME=Development User

# External APIs (Required)
SUPADATA_API_KEY=your-supadata-api-key
DASHSCOPE_BEIJING_API_KEY=your-dashscope-api-key
YOUTUBE_API_KEYS=key1,key2,key3

# Optional
LOG_LEVEL=info
```

### Production Environment Variables

For production deployment (Firebase Hosting, Cloud Run, etc.):

1. **Frontend**: Set environment variables in your hosting platform:
   - Firebase Hosting: Use `.env.production` or hosting platform environment variables
   - Vercel/Netlify: Use platform's environment variable settings

2. **Backend**: Set environment variables in Cloud Run:
   - Use Cloud Run's environment variable configuration
   - Or use Secret Manager for sensitive values

**Important**: Never commit `.env` or `.env.local` files to version control!

---

## Verification Checklist

Use this checklist to verify your Firebase Auth setup is correct:

### Firebase Console Verification

- [ ] Email/Password provider is enabled in Firebase Console
- [ ] Authorized domains include `localhost` (for development)
- [ ] Authorized domains include production domain (for production)
- [ ] Firebase configuration values are copied and ready
- [ ] Service account JSON file is downloaded and secured

### Frontend Configuration Verification

- [ ] `NEXT_PUBLIC_USE_FIREBASE_AUTH=true` is set
- [ ] All `NEXT_PUBLIC_FIREBASE_*` environment variables are set
- [ ] `NEXT_PUBLIC_API_URL` points to correct backend URL
- [ ] `NEXT_PUBLIC_SKIP_AUTH=false` (or `true` only for local dev)
- [ ] Frontend can access Firebase configuration (check browser console)

### Backend Configuration Verification

- [ ] `AUTH_ENABLED=true` is set
- [ ] `USE_FIREBASE_AUTH=true` is set
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` points to service account JSON file
- [ ] Service account JSON file exists and is readable
- [ ] `FRONTEND_URL` matches frontend URL
- [ ] `FRONTEND_URLS` includes all production domains (comma-separated)

### Code Verification

- [ ] No hardcoded Firebase configuration values in code
- [ ] All configs use centralized environment variables
- [ ] `frontend/src/lib/firebase.ts` uses `process.env.NEXT_PUBLIC_FIREBASE_*`
- [ ] `frontend/src/contexts/AuthContext.tsx` uses `isFirebaseAuthEnabled()` from config
- [ ] `backend/src/config/env.ts` validates Firebase Auth environment variables

---

## Testing

### Test Email/Password Signup

1. Start the frontend: `cd frontend && npm run dev`
2. Start the backend: `cd backend && npm run dev`
3. Navigate to `http://localhost:3000/signup`
4. Fill in the signup form:
   - Email: `test@example.com`
   - Password: `Test1234` (min 8 chars, letters + numbers)
   - Confirm Password: `Test1234`
   - Name: `Test User`
5. Click **Sign up**
6. **Expected**: User is created and redirected to `/app`
7. **Verify**: Check Firebase Console → Authentication → Users (user should appear)
8. **Verify**: Check backend logs (user should be created in database)

### Test Email/Password Login

1. Navigate to `http://localhost:3000/login`
2. Enter credentials from signup test
3. Click **Sign in**
4. **Expected**: User is authenticated and redirected to `/app`
5. **Verify**: User state is available in AuthContext

### Test Google OAuth

1. Navigate to `http://localhost:3000/login`
2. Click **Sign in with Google**
3. Complete Google OAuth flow
4. **Expected**: User is authenticated and redirected to `/app`
5. **Verify**: User appears in Firebase Console → Authentication → Users

### Test Error Handling

1. **Invalid Email**: Try signing up with invalid email format
   - **Expected**: Validation error message

2. **Weak Password**: Try signing up with password less than 8 characters
   - **Expected**: Validation error message

3. **Email Already Exists**: Try signing up with existing email
   - **Expected**: "An account with this email already exists" error

4. **Wrong Password**: Try logging in with wrong password
   - **Expected**: "Incorrect password" error

5. **User Not Found**: Try logging in with non-existent email
   - **Expected**: "No account found with this email address" error

### Test Backend Integration

1. Sign up a new user via frontend
2. Make an API request to a protected endpoint (e.g., `/api/auth/me`)
3. **Expected**: Request succeeds with user data
4. **Verify**: Backend logs show user was created/retrieved from database

---

## Troubleshooting

### Issue: "Email/password authentication is not enabled"

**Symptoms**: Error message when trying to sign up or sign in

**Solution**:
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable Email/Password provider
3. Save changes
4. Wait a few seconds for changes to propagate
5. Try again

### Issue: "Firebase Auth is not enabled"

**Symptoms**: Error message in console or UI

**Solution**:
1. Check `NEXT_PUBLIC_USE_FIREBASE_AUTH=true` in frontend `.env.local`
2. Restart frontend dev server
3. Clear browser cache and reload

### Issue: "Invalid API key" or Firebase initialization error

**Symptoms**: Firebase fails to initialize

**Solution**:
1. Verify all `NEXT_PUBLIC_FIREBASE_*` environment variables are set correctly
2. Check Firebase Console → Project Settings → Your apps for correct values
3. Ensure no typos in environment variable names
4. Restart frontend dev server after changing environment variables

### Issue: Backend can't verify Firebase tokens

**Symptoms**: API requests fail with authentication errors

**Solution**:
1. Check `GOOGLE_APPLICATION_CREDENTIALS` points to correct service account file
2. Verify service account file exists and is readable
3. Check `USE_FIREBASE_AUTH=true` in backend `.env`
4. Verify service account has correct permissions in Firebase Console
5. Restart backend server after changing environment variables

### Issue: CORS errors when making API requests

**Symptoms**: Browser console shows CORS errors

**Solution**:
1. Check `FRONTEND_URL` in backend `.env` matches frontend URL
2. For production, add all frontend domains to `FRONTEND_URLS` (comma-separated)
3. Restart backend server after changing environment variables

### Issue: User created in Firebase but not in backend database

**Symptoms**: User can sign in but API requests fail

**Solution**:
1. Check backend logs for errors
2. Verify `getOrCreateUserByUid()` is being called
3. Check Firestore permissions and service account permissions
4. Verify backend can access Firestore (check `GOOGLE_APPLICATION_CREDENTIALS`)

### Issue: Environment variables not loading

**Symptoms**: Config values are undefined

**Solution**:
1. **Frontend**: Ensure variables start with `NEXT_PUBLIC_` prefix
2. **Frontend**: Restart dev server after changing `.env.local`
3. **Backend**: Ensure `.env` file is in `backend/` directory
4. **Backend**: Restart server after changing `.env`
5. Check for typos in variable names
6. Verify file is not in `.gitignore` (should be, but check it exists)

---

## Security Considerations

### Environment Variables

- **Never commit** `.env` or `.env.local` files to version control
- Use `.env.example` or `env.example.txt` as templates (without real values)
- In production, use secure secret management (e.g., Firebase Secret Manager, Cloud Run secrets)

### Service Account Key

- **Never commit** service account JSON files to version control
- Store service account keys securely
- Rotate keys periodically
- Use least-privilege IAM roles for service account

### Firebase Auth Security

- Enable email verification for production (optional for MVP)
- Configure password strength requirements (already enforced in frontend validation)
- Monitor authentication attempts in Firebase Console
- Set up rate limiting for authentication endpoints (already implemented in backend)

### Authorized Domains

- Only add trusted domains to authorized domains list
- Remove test/development domains from production Firebase project
- Use separate Firebase projects for development and production

### CORS Configuration

- Only allow trusted frontend domains in `FRONTEND_URLS`
- Never use wildcard (`*`) for CORS in production
- Verify CORS configuration matches your deployment domains

---

## Related Documentation

- [Local Development Guide](./LOCAL_DEVELOPMENT_GUIDE.md) - Complete local development setup
- [Authentication System Fixes PRD](./authentication_system_fixes_prd.md) - Full authentication implementation details
- [Firebase Deployment Guide](../FIREBASE_DEPLOYMENT_GUIDE.md) - Production deployment guide
- [Backend API Documentation](../backend/API_DOCUMENTATION.md) - Backend API reference

---

## Quick Reference

### Environment Variables Summary

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_USE_FIREBASE_AUTH=true`
- `NEXT_PUBLIC_FIREBASE_API_KEY=...`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=...`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...`
- `NEXT_PUBLIC_FIREBASE_APP_ID=...`

**Backend** (`backend/.env`):
- `AUTH_ENABLED=true`
- `USE_FIREBASE_AUTH=true`
- `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`
- `FRONTEND_URL=http://localhost:3000`
- `FRONTEND_URLS=...` (comma-separated for production)

### Firebase Console Quick Links

- [Firebase Console](https://console.firebase.google.com/)
- Authentication → Sign-in method: Enable Email/Password
- Authentication → Settings → Authorized domains: Configure domains
- Project Settings → Your apps: Get Firebase config
- Project Settings → Service accounts: Download service account key

---

**Last Updated**: 2024
**Version**: 1.0

