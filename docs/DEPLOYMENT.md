# Frontend Deployment Guide: Firebase Hosting

This guide covers deploying the Next.js frontend to Firebase Hosting using static export.

## Prerequisites

1. **Firebase CLI** installed: `npm install -g firebase-tools`
2. **Firebase project** set up: `video-research-40c4b`
3. **Node.js 18+** installed

## Initial Setup

### Step 1: Login to Firebase

```bash
firebase login
```

### Step 2: Initialize Firebase Hosting (if not already done)

```bash
cd frontend
firebase init hosting
```

Select:
- Use an existing project: `video-research-40c4b`
- Public directory: `out` (Next.js static export output)
- Configure as single-page app: Yes
- Set up automatic builds: Optional

## Environment Variables

### Development

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_USE_FIREBASE_AUTH=false
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD4oiS2MBt7YQm7VGqHazTtMHT5w7KsKiM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=video-research-40c4b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=video-research-40c4b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=video-research-40c4b.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=723520495466
NEXT_PUBLIC_FIREBASE_APP_ID=1:723520495466:web:6fda6d5e11c877bca44f13
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-JSDG4VDKT9
```

### Production

**Important:** The deployed app must call your **production backend** (e.g. Cloud Run), not localhost. If `NEXT_PUBLIC_API_URL` is wrong, the deployed site will hit your local machine and history/API will fail.

1. Create **`.env.production`** (copy from `.env.production.example`). Set:
   - `NEXT_PUBLIC_API_URL` = your production backend URL (e.g. `https://your-backend.run.app`). **Never use localhost here.**
   - All `NEXT_PUBLIC_FIREBASE_*` for the same Firebase project as your backend.
2. Use **`npm run deploy:firebase`** (not plain `npm run build`). It runs a safe build that removes `.env.local` during build so production values from `.env.production` are baked in.
3. After deploy, run **`npm run deploy:firestore-indexes`** once so History works (see [FIRESTORE_INDEXES.md](FIRESTORE_INDEXES.md)).

Example `.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://your-cloud-run-url.run.app
NEXT_PUBLIC_USE_FIREBASE_AUTH=true
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=video-research-40c4b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=video-research-40c4b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=video-research-40c4b.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
NEXT_PUBLIC_SKIP_AUTH=false
```

## Building

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Build Static Export (production)

For production deploy, use the safe build so only `.env.production` is used (not `.env.local`):

```bash
npm run deploy:firebase
```

This runs `build:safe` then deploys hosting. For local testing you can use `npm run build`.

This will:
1. Build the Next.js app
2. Export static files to `out/` directory
3. Optimize assets and generate HTML files

### Step 3: Verify Build

Check that `out/` directory contains:
- `index.html`
- Static assets (JS, CSS, images)
- All route pages as HTML files

## Deploying

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### Deploy to Specific Project

```bash
firebase use video-research-40c4b
firebase deploy --only hosting
```

## Configuration

### Firebase Hosting Config (`firebase.json`)

The `firebase.json` file is already configured with:
- Public directory: `out`
- Rewrites for client-side routing
- Cache headers for static assets
- No-cache for HTML files

### Custom Domain (Optional)

1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning

## Monitoring

### Firebase Console

- View deployment history
- Monitor traffic and performance
- Check error logs
- View analytics

### Performance Monitoring

- Use Firebase Performance Monitoring
- Check Core Web Vitals
- Monitor page load times

## Troubleshooting

### Build Fails

1. Check Node.js version (18+ required)
2. Clear `.next` and `out` directories
3. Delete `node_modules` and reinstall
4. Check for TypeScript errors

### Static Export Issues

1. Ensure `next.config.ts` has `output: 'export'`
2. Remove any server-side features (API routes, SSR)
3. Check for dynamic routes that need `generateStaticParams`

### CORS Errors

1. Verify `NEXT_PUBLIC_API_URL` points to correct backend
2. Check backend CORS configuration
3. Ensure production domains are allowed

### Routing Issues

1. Verify `firebase.json` has correct rewrites
2. Check that all routes are exported as static files
3. Ensure client-side routing is working

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build
        run: |
          cd frontend
          export NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}
          export NEXT_PUBLIC_USE_FIREBASE_AUTH=true
          npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: video-research-40c4b
```

## Rollback

To rollback to a previous deployment:

1. Go to Firebase Console > Hosting
2. Click on deployment history
3. Select previous deployment
4. Click "Rollback"

## Performance Optimization

### Image Optimization

- Use Next.js Image component with `unoptimized: true` (for static export)
- Optimize images before adding to project
- Use WebP format when possible

### Code Splitting

- Next.js automatically code splits
- Use dynamic imports for large components
- Lazy load non-critical components

### Caching

- Static assets cached for 1 year (configured in `firebase.json`)
- HTML files not cached (always fresh)
- Consider CDN for additional caching

## Security

1. **Environment Variables** - Never commit `.env.local`
2. **API Keys** - Use `NEXT_PUBLIC_` prefix only for public keys
3. **Content Security Policy** - Configure in `next.config.ts` if needed
4. **HTTPS** - Firebase Hosting enforces HTTPS automatically

## Cost Optimization

- Firebase Hosting free tier includes:
  - 10 GB storage
  - 360 MB/day data transfer
- Monitor usage in Firebase Console
- Optimize bundle size to reduce transfer costs

## Next Steps

1. Set up custom domain
2. Configure analytics
3. Set up monitoring and alerts
4. Optimize performance
5. Set up CI/CD pipeline

