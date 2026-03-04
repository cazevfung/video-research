import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import env from '../config/env';
import { getSystemConfig, getAuthConfig, useLocalStorage } from '../config';
import { getUserById } from '../models/User';
import { AuthenticatedUser, JWTPayload } from '../types/auth.types';
import { verifyFirebaseToken } from './firebase-auth.middleware';
// Phase 5: Migration functions removed - credits auto-initialize on first access
import logger from '../utils/logger';

/**
 * Default dev user for testing when auth is disabled
 * Uses centralized configuration from environment variables
 */
export function getDevUser(): AuthenticatedUser {
  const authConfig = getAuthConfig();
  
  // Use centralized config from env.ts (which reads from environment variables or defaults)
  const devUser: AuthenticatedUser = {
    id: env.DEV_USER_ID,
    email: env.DEV_USER_EMAIL,
    name: env.DEV_USER_NAME,
    tier: authConfig.dev_mode_tier,
  };
  
  // Log in development mode for debugging
  if (env.NODE_ENV === 'development' || !env.AUTH_ENABLED) {
    logger.debug('🔓 Using dev user for authentication bypass', {
      userId: devUser.id,
      email: devUser.email,
      name: devUser.name,
      tier: devUser.tier,
    });
  }
  
  return devUser;
}

/**
 * Verify JWT token and attach user to request
 * When auth is disabled, attaches dev user instead
 */
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // If auth is disabled, use dev user
  if (!env.AUTH_ENABLED) {
    const devUser = getDevUser();
    req.user = devUser;
    
    // Log auth bypass in development mode
    logger.debug('🔓 Auth bypassed - using dev user', {
      userId: devUser.id,
      email: devUser.email,
      path: req.path,
      method: req.method,
    });
    
    // Phase 5: Credits auto-initialize on first access via credit.service.checkCreditBalance()
    return next();
  }

  try {
    // Extract token from Authorization header
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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server configuration error',
        },
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Fetch user from database to ensure they still exist and get latest data
    const user = await getUserById(decoded.id);
    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id!,
      email: user.email,
      name: user.name,
      tier: user.tier,
      language_preference: user.language_preference || 'en',
    };

    // Phase 5: Credits auto-initialize on first access via credit.service.checkCreditBalance()
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
      return;
    }

    logger.error('Error verifying token', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error verifying authentication',
      },
    });
  }
}

/**
 * Express middleware for protected routes
 * Uses Firebase Auth if enabled, otherwise falls back to JWT/Passport.js
 * Requires authentication (or uses dev user if auth disabled)
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use Firebase Auth if enabled, otherwise use JWT/Passport.js
  if (env.USE_FIREBASE_AUTH) {
    verifyFirebaseToken(req, res, next);
  } else {
    verifyToken(req, res, next);
  }
}

/**
 * Generate JWT token for authenticated user
 * Works when:
 * - AUTH_ENABLED=true and JWT_SECRET is set (production mode)
 * - USE_LOCAL_STORAGE=true and JWT_SECRET is set (localhost testing mode)
 */
export function generateToken(user: AuthenticatedUser): string {
  const useLocalStorageValue = useLocalStorage();
  
  // JWT generation is allowed if:
  // 1. Auth is enabled with JWT_SECRET, OR
  // 2. Using local storage with JWT_SECRET (localhost testing)
  if (!env.JWT_SECRET) {
    throw new Error('JWT generation requires JWT_SECRET to be set');
  }
  
  if (!env.AUTH_ENABLED && !useLocalStorageValue) {
    throw new Error('JWT generation requires AUTH_ENABLED=true or USE_LOCAL_STORAGE=true');
  }

  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier,
  };

  // Token expiration from config
  const systemConfig = getSystemConfig();
  
  // At this point, JWT_SECRET is guaranteed to be defined due to the check above
  // Convert hours to seconds for expiresIn
  const expiresInSeconds = systemConfig.jwt_expiration_hours * 3600;
  const options: SignOptions = {
    expiresIn: expiresInSeconds,
  };
  
  return jwt.sign(payload, env.JWT_SECRET as string, options);
}

