/**
 * Guest rate limiting middleware
 * Applies stricter rate limits for guest requests
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import env from '../config/env';
import { RateLimitExceededError } from '../utils/errors';
import logger from '../utils/logger';
import { AuthenticatedRequest } from './optional-auth.middleware';

/**
 * Create rate limiter for guest requests (per-IP)
 * Only applies to guest users, authenticated users bypass this
 */
export const guestRateLimiter = rateLimit({
  windowMs: env.GUEST_RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  max: env.GUEST_RATE_LIMIT_PER_IP,
  keyGenerator: (req: Request) => {
    // Only apply to guest requests
    const authReq = req as AuthenticatedRequest;
    if (authReq.user) {
      // Authenticated user - bypass this limiter
      return 'authenticated';
    }
    
    // Use ipKeyGenerator on req.ip to properly handle IPv6 addresses
    if (req.ip) {
      return ipKeyGenerator(req.ip);
    }
    // Fallback for cases where req.ip is undefined
    const fallbackIp = req.socket.remoteAddress || '127.0.0.1';
    return ipKeyGenerator(fallbackIp);
  },
  // Disable all validation - we're using ipKeyGenerator correctly, just with a conditional
  validate: false,
  message: 'Too many guest requests. Please login for higher limits.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for authenticated users
    const authReq = req as AuthenticatedRequest;
    return !!authReq.user;
  },
  handler: (req: Request, res: Response) => {
    // Extract IP safely for logging (using same logic as keyGenerator)
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    logger.warn('Guest rate limit exceeded', {
      ip,
      path: req.path,
    });
    throw new RateLimitExceededError(
      `Too many guest requests. Please login for higher limits. Try again after ${env.GUEST_RATE_LIMIT_WINDOW_HOURS} hour(s).`,
      {
        retryAfter: env.GUEST_RATE_LIMIT_WINDOW_HOURS * 60 * 60,
      }
    );
  },
});


