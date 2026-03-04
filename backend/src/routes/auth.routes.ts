import { Router } from 'express';
import { isAuthEnabled } from '../config/passport';
import env from '../config/env';
import {
  initiateGoogleAuth,
  handleGoogleCallback,
  getCurrentUser,
  login,
  logout,
  refreshToken,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { optionalAuth } from '../middleware/optional-auth.middleware';
import { verifyFirebaseToken, AuthenticatedRequest } from '../middleware/firebase-auth.middleware';
import { getOrCreateUserByUid } from '../models/User';
import logger from '../utils/logger';

const router = Router();

/**
 * Register authentication routes
 * Supports both Firebase Auth and Passport.js OAuth
 */
export function registerAuthRoutes(): Router {
  // POST /auth/login - Login with email/password (for dev user testing)
  router.post('/login', login);

  // GET /auth/me - Get current user info (works with or without auth, supports guest sessions)
  router.get('/me', optionalAuth, getCurrentUser);

  // POST /auth/logout - Logout (works with or without auth)
  router.post('/logout', logout);

  // Firebase Auth verification endpoint
  if (env.USE_FIREBASE_AUTH) {
    logger.info('Registering Firebase Auth routes');
    
    // GET /auth/verify - Verify Firebase token and return user info
    // Note: User is already attached to req.user by verifyFirebaseToken middleware
    router.get('/verify', verifyFirebaseToken, async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Unauthorized',
            },
          });
        }

        // User is already fetched and attached by middleware
        res.json({
          user: req.user,
        });
      } catch (error) {
        logger.error('Error in verify endpoint', error);
        res.status(500).json({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
          },
        });
      }
    });
  }

  // If auth is enabled and not using Firebase Auth, register OAuth routes
  if (isAuthEnabled() && !env.USE_FIREBASE_AUTH) {
    logger.info('Registering Google OAuth routes');

    // GET /auth/google - Initiate OAuth flow
    router.get('/google', initiateGoogleAuth);

    // GET /auth/google/callback - Handle OAuth callback
    router.get('/google/callback', handleGoogleCallback);

    // POST /auth/refresh - Refresh JWT token
    router.post('/refresh', requireAuth, refreshToken);
  } else if (!env.USE_FIREBASE_AUTH) {
    logger.info('Authentication disabled - skipping OAuth routes');
  }

  return router;
}

export default router;

