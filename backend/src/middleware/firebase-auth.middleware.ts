import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase-admin';
import env from '../config/env';
import logger from '../utils/logger';
import { AuthenticatedUser } from '../types/auth.types';
import { getOrCreateUserByUid } from '../models/User';
import { getDevUser } from './auth.middleware';
// Phase 5: Migration functions removed - credits auto-initialize on first access

/**
 * Extended Express Request with user property
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Verify Firebase ID token and attach user to request
 * This middleware replaces Passport.js authentication when USE_FIREBASE_AUTH=true
 */
export async function verifyFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // If auth is disabled, use dev user (consistent with verifyToken)
  if (!env.AUTH_ENABLED) {
    const devUser = getDevUser();
    req.user = devUser;
    
    // Log auth bypass in development mode
    logger.debug('🔓 Auth bypassed (Firebase) - using dev user', {
      userId: devUser.id,
      email: devUser.email,
      path: req.path,
      method: req.method,
    });
    
    // Phase 5: Credits auto-initialize on first access via credit.service.checkCreditBalance()
    return next();
  }
  
  // Only use Firebase Auth if feature flag is enabled
  if (!env.USE_FIREBASE_AUTH) {
    // Fall through to next middleware (will use JWT or other auth method)
    return next();
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!admin.apps.length) {
      logger.error('Firebase Admin SDK not initialized');
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server configuration error',
        },
      });
      return;
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Get or create user in Firestore using Firebase UID
    const user = await getOrCreateUserByUid(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || decodedToken.email || 'User'
    );

    // Attach user to request (compatible with existing interface)
    // Use uid as id if available (stable identifier), otherwise fallback to document id
    const userId = user.uid || user.id!;
    req.user = {
      id: userId, // Use uid as primary identifier (stable)
      uid: user.uid, // Also store uid separately for clarity
      email: user.email,
      name: user.name,
      tier: user.tier,
      language_preference: user.language_preference || 'en',
    };

    // Phase 5: Credits auto-initialize on first access via credit.service.checkCreditBalance()
    next();
  } catch (error) {
    logger.error('Firebase token verification failed', error);

    // Handle specific Firebase Auth errors
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token has expired',
          },
        });
        return;
      }
      if (error.message.includes('invalid') || error.message.includes('malformed')) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or malformed token',
          },
        });
        return;
      }
    }

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }
}

