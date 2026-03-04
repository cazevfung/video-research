/**
 * Optional authentication middleware
 * Allows both authenticated and guest requests
 * Tries to authenticate first, falls back to guest session if no auth token
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, getDevUser } from './auth.middleware';
import { verifyFirebaseToken } from './firebase-auth.middleware';
import env from '../config/env';
import {
  createGuestSession,
  getGuestSession,
  extractGuestSessionId,
} from '../services/guest-session.service';
import { AuthenticatedUser } from '../types/auth.types';
import logger from '../utils/logger';

/**
 * Extended Request type with user and guest properties
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  guest?: { sessionId: string };
}

/**
 * Optional authentication middleware
 * Tries to authenticate user first, falls back to guest session if no auth
 * When AUTH_ENABLED=false, uses dev user instead of guest sessions
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // If auth is disabled, use dev user (consistent with requireAuth)
  if (!env.AUTH_ENABLED) {
    const devUser = getDevUser();
    req.user = devUser;
    req.guest = undefined;
    
    logger.debug('🔓 Optional auth bypassed - using dev user', {
      userId: devUser.id,
      email: devUser.email,
      path: req.path,
      method: req.method,
    });
    
    return next();
  }

  // Try to authenticate first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // User has auth token, try to authenticate
    if (env.USE_FIREBASE_AUTH) {
      verifyFirebaseToken(req, res, () => {
        // Authenticated user - clear any guest session
        req.guest = undefined;
        next();
      });
    } else {
      verifyToken(req, res, () => {
        // Authenticated user - clear any guest session
        req.guest = undefined;
        next();
      });
    }
    return;
  }

  // No auth token, check for guest session
  const guestSessionId = extractGuestSessionId(req);
  if (guestSessionId) {
    const session = getGuestSession(guestSessionId);
    if (session) {
      // Valid guest session
      req.user = undefined;
      req.guest = { sessionId: guestSessionId };
      logger.debug('Guest session authenticated', {
        sessionId: guestSessionId,
        path: req.path,
      });
      return next();
    }
    // Invalid or expired session, create new one
    logger.debug('Guest session expired or invalid, creating new session', {
      oldSessionId: guestSessionId,
    });
  }

  // No valid guest session, create one
  try {
    const newSessionId = createGuestSession(req);
    req.user = undefined;
    req.guest = { sessionId: newSessionId };
    logger.debug('Created new guest session', {
      sessionId: newSessionId,
      path: req.path,
    });
    next();
  } catch (error) {
    logger.error('Error creating guest session', error);
    res.status(429).json({
      error: {
        code: 'GUEST_SESSION_LIMIT_EXCEEDED',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to create guest session. Please try again later.',
      },
    });
  }
}

