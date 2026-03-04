import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import env from '../config/env';
import { isAuthEnabled } from '../config/passport';
import { useLocalStorage } from '../config';
import { requireAuth, getDevUser } from '../middleware/auth.middleware';
import { generateToken } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../middleware/optional-auth.middleware';
import { getUserById, createUser } from '../models/User';
import { getQuotaInfo } from '../services/quota.service';
import { getGuestAccessConfig, getFreemiumConfig } from '../config';
import { getGuestSession } from '../services/guest-session.service';
import logger from '../utils/logger';

/**
 * Initiate Google OAuth flow
 */
export async function initiateGoogleAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isAuthEnabled()) {
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Authentication is disabled',
      },
    });
    return;
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })(req, res, next);
}

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isAuthEnabled()) {
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Authentication is disabled',
      },
    });
    return;
  }

  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err) {
      logger.error('OAuth callback error', err);
      // Redirect to frontend with error
      const errorMsg = encodeURIComponent('Authentication failed');
      return res.redirect(`${env.FRONTEND_URL}/auth/callback?error=${errorMsg}`);
    }

    if (!user) {
      const errorMsg = encodeURIComponent('User not found');
      return res.redirect(`${env.FRONTEND_URL}/auth/callback?error=${errorMsg}`);
    }

    try {
      // Generate JWT token
      const token = generateToken(user);

      // Redirect to frontend with token
      const redirectUrl = `${env.FRONTEND_URL}/auth/callback?token=${token}`;
      logger.info('Redirecting to frontend with token', {
        userId: user.id,
        email: user.email,
      });
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Error generating token', error);
      const errorMsg = encodeURIComponent('Token generation failed');
      res.redirect(`${env.FRONTEND_URL}/auth/callback?error=${errorMsg}`);
    }
  })(req, res, next);
}

/**
 * Get current user information and quota
 * Supports both authenticated users (req.user) and guest sessions (req.guest)
 */
export async function getCurrentUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Handle guest session
    if (req.guest && !req.user) {
      const guestSession = getGuestSession(req.guest.sessionId);
      const guestConfig = getGuestAccessConfig();
      const freemiumConfig = getFreemiumConfig();
      const freeTierConfig = freemiumConfig.free_tier;
      
      if (!guestSession) {
        res.status(404).json({
          error: {
            code: 'GUEST_SESSION_NOT_FOUND',
            message: 'Guest session not found',
          },
        });
        return;
      }

      // Return guest profile data
      const guestUser = {
        id: req.guest.sessionId,
        email: null,
        name: 'Guest',
        tier: 'guest' as const,
        language_preference: 'en',
      };

      // Create guest quota info (limited to guest config limits)
      const guestQuota = {
        credits_remaining: 0, // Guests don't use credits
        tier: 'guest' as const,
        daily_limit: guestConfig.max_summaries,
        max_videos_per_batch: freeTierConfig.max_videos_per_batch,
        reset_time: guestSession.expiresAt,
      };

      res.json({
        user: guestUser,
        quota: guestQuota,
      });
      return;
    }

    // Handle authenticated user
    // req.user is set by optionalAuth middleware (either from JWT token, Firebase token, or dev user when auth disabled)
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated and no guest session found',
        },
      });
      return;
    }

    let user = req.user;

    // If auth is enabled, fetch latest user data from database
    // (to get latest tier and credits)
    if (isAuthEnabled()) {
      const dbUser = await getUserById(req.user.id);
      if (!dbUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      user = {
        id: dbUser.id!,
        email: dbUser.email,
        name: dbUser.name,
        tier: dbUser.tier,
        language_preference: dbUser.language_preference || 'en',
      };
    } else {
      // Auth is disabled - ensure dev user exists in database
      // This is important for Firestore deployments where user records are needed
      let dbUser = await getUserById(req.user.id);
      
      if (!dbUser) {
        // Create dev user in database if it doesn't exist
        // Use the dev user's ID to maintain consistency
        logger.info('Creating dev user in database', {
          userId: req.user.id,
          email: req.user.email,
          name: req.user.name,
        });
        
        try {
          // Import database and create user with specific ID
          const db = (await import('../config/database')).default;
          const { Timestamp } = await import('firebase-admin/firestore');
          const { getFreemiumConfig } = await import('../config');
          
          if (db) {
            // Firestore: Create user with specific document ID
            const tier = req.user.tier || 'free';

            const userData = {
              email: req.user.email,
              uid: null,
              googleId: null,
              name: req.user.name,
              tier,
              // credits_remaining is deprecated - credits are now managed by credit.service
              created_at: Timestamp.now(),
              last_reset: Timestamp.now(),
            };

            // Create with specific document ID (dev user ID)
            await db.collection('users').doc(req.user.id).set(userData);
            const doc = await db.collection('users').doc(req.user.id).get();

            if (!doc.exists) {
              throw new Error('Failed to create user document');
            }

            dbUser = {
              id: doc.id,
              ...doc.data(),
            } as any;

            // Initialize credits via credit.service (Phase 5)
            if (dbUser && dbUser.id) {
              try {
                const { initializeUserCredits } = await import('../services/credit.service');
                await initializeUserCredits(dbUser.id, tier);
                logger.info('Dev user credits initialized', { userId: dbUser.id, tier });
              } catch (creditError) {
                // Log error but don't fail user creation - credits will be initialized on first access
                logger.warn('Failed to initialize credits for dev user (will be created on first access)', {
                  userId: dbUser.id,
                  error: creditError instanceof Error ? creditError.message : String(creditError),
                });
              }
            }

            logger.info('Dev user created successfully in Firestore', { userId: dbUser?.id });
          } else {
            // Local storage mode - use createUser function with dev user ID
            dbUser = await createUser({
              id: req.user.id, // Use dev user ID to maintain consistency
              email: req.user.email,
              name: req.user.name,
              tier: req.user.tier || 'free',
            });
            logger.info('Dev user created successfully in local storage', { userId: dbUser?.id });
          }
          
          // Update user object with the created user's ID
          // dbUser is guaranteed to be non-null here because we just created it
          if (dbUser) {
            user = {
              id: dbUser.id!,
              email: dbUser.email,
              name: dbUser.name,
              tier: dbUser.tier,
              language_preference: dbUser.language_preference || 'en',
            };
          }
        } catch (error) {
          logger.error('Failed to create dev user in database', error);
          // Continue with hardcoded dev user if creation fails
        }
      } else {
        // User exists, use database user data
        user = {
          id: dbUser.id!,
          email: dbUser.email,
          name: dbUser.name,
          tier: dbUser.tier,
          language_preference: dbUser.language_preference || 'en',
        };
      }
    }

    // Get quota information
    const quota = await getQuotaInfo(user.id);

    res.json({
      user,
      quota,
    });
  } catch (error) {
    logger.error('Error getting current user', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve user information',
      },
    });
  }
}

/**
 * Login with email and password (for dev user testing)
 * Works when:
 * - AUTH_ENABLED=true and USE_FIREBASE_AUTH=false (production mode)
 * - USE_LOCAL_STORAGE=true (localhost testing mode with backend/data)
 */
export async function login(req: Request, res: Response): Promise<void> {
  // Allow login in localhost mode with local storage, or when auth is enabled
  const useLocalStorageValue = useLocalStorage();
  const authEnabled = isAuthEnabled();
  
  // Login is allowed if:
  // 1. Auth is enabled (production mode), OR
  // 2. Using local storage (localhost testing mode)
  if (!authEnabled && !useLocalStorageValue) {
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Authentication is disabled',
      },
    });
    return;
  }

  // If auth is enabled, don't allow Firebase Auth users to use this endpoint
  if (authEnabled && env.USE_FIREBASE_AUTH) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Use Firebase Auth for email/password login',
      },
    });
    return;
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Email and password are required',
        },
      });
      return;
    }

    // Check if credentials match dev user
    const devUser = getDevUser();
    if (email !== devUser.email) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    // Ensure dev user exists in database
    let dbUser = await getUserById(devUser.id);
    if (!dbUser) {
      // Create dev user if it doesn't exist
      dbUser = await createUser({
        id: devUser.id,
        email: devUser.email,
        name: devUser.name,
        tier: devUser.tier || 'free',
      });
      
      // Add password to the newly created user (for local storage)
      if (useLocalStorage()) {
        const { updateUser } = await import('../models/User');
        await updateUser(devUser.id, { password: env.DEV_USER_PASSWORD } as any);
        dbUser = await getUserById(devUser.id);
      }
    }

    // Ensure dbUser is not null at this point
    if (!dbUser) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user',
        },
      });
      return;
    }

    // Check password - prefer password from database, fallback to env variable
    const userPassword = (dbUser as any).password || env.DEV_USER_PASSWORD;
    if (password !== userPassword) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      id: dbUser.id!,
      email: dbUser.email,
      name: dbUser.name,
      tier: dbUser.tier,
    });

    logger.info('Dev user logged in successfully', {
      userId: dbUser.id,
      email: dbUser.email,
    });

    res.json({
      token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        tier: dbUser.tier,
      },
    });
  } catch (error) {
    logger.error('Error during login', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process login',
      },
    });
  }
}

/**
 * Logout endpoint (client-side token removal)
 */
export async function logout(req: Request, res: Response): Promise<void> {
  // Since we use JWT (stateless), logout is handled client-side by removing the token
  // This endpoint just confirms logout
  res.json({
    message: 'Logged out successfully',
  });
}

/**
 * Refresh JWT token
 */
export async function refreshToken(
  req: Request,
  res: Response
): Promise<void> {
  if (!isAuthEnabled()) {
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Authentication is disabled',
      },
    });
    return;
  }

  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    // Generate new token
    const token = generateToken(req.user);

    res.json({
      token,
    });
  } catch (error) {
    logger.error('Error refreshing token', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to refresh token',
      },
    });
  }
}

