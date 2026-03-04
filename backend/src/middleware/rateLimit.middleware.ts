/**
 * Rate limiting middleware
 * Prevents abuse and enforces per-user and per-IP limits
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { RateLimitExceededError } from '../utils/errors';
import { getFreemiumConfig, getRateLimitingConfig } from '../config';
import logger from '../utils/logger';

/**
 * Create rate limiter for authentication endpoints (per-IP)
 */
export const authRateLimiter = (() => {
  const rateLimitConfig = getRateLimitingConfig();
  const authConfig = rateLimitConfig.auth;
  const windowMs = authConfig.window_minutes * 60 * 1000;
  const retryAfterSeconds = authConfig.window_minutes * 60;

  return rateLimit({
    windowMs,
    max: authConfig.max_requests,
    keyGenerator: (req: Request) => {
      // Use ipKeyGenerator on req.ip to properly handle IPv6 addresses
      // The library's static analysis requires seeing ipKeyGenerator(req.ip) pattern directly
      if (req.ip) {
        return ipKeyGenerator(req.ip);
      }
      // Fallback for cases where req.ip is undefined
      const fallbackIp = req.socket.remoteAddress || '127.0.0.1';
      return ipKeyGenerator(fallbackIp);
    },
    // Disable all validation - we're using ipKeyGenerator correctly, just with a conditional
    validate: false,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      // Extract IP safely for logging (using same logic as keyGenerator)
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      logger.warn('Rate limit exceeded for auth endpoint', {
        ip,
        path: req.path,
      });
      throw new RateLimitExceededError(
        'Too many authentication attempts. Please try again later.',
        {
          retryAfter: retryAfterSeconds,
        }
      );
    },
  });
})();

/**
 * Create rate limiter for summary endpoints (per-user)
 * Different limits for free vs premium tiers
 */
export const summaryRateLimiter = (() => {
  const rateLimitConfig = getRateLimitingConfig();
  const summaryConfig = rateLimitConfig.summary;
  const windowMs = summaryConfig.window_hours * 60 * 60 * 1000;
  const retryAfterSeconds = summaryConfig.window_hours * 60 * 60;

  return rateLimit({
    windowMs,
    max: async (req: Request) => {
      // Get user tier from request (set by auth middleware)
      const user = (req as any).user;
      const freemiumConfig = getFreemiumConfig();

      if (!user || !user.tier) {
        // Default to free tier if no user
        return freemiumConfig.free_tier.daily_request_limit;
      }

      // Return limit based on tier
      return user.tier === 'premium'
        ? freemiumConfig.premium_tier.daily_request_limit
        : freemiumConfig.free_tier.daily_request_limit;
    },
    keyGenerator: (req: Request) => {
      // Use user ID for authenticated users, or a constant key for unauthenticated  
      // This avoids the IPv6 issue with req.ip
      const user = (req as any).user;
      return user?.id || 'anonymous';
    },
    // Disable all validation since this limiter uses user-based keys, not IP-based
    validate: false,
    message: 'Daily request limit reached. Please try again tomorrow.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const user = (req as any).user;
      logger.warn('Rate limit exceeded for summary endpoint', {
        userId: user?.id,
        // Note: Not logging IP here to avoid express-rate-limit IPv6 validation
        // This limiter is user-based, not IP-based
        tier: user?.tier || 'free',
        path: req.path,
      });
      throw new RateLimitExceededError(
        'Daily request limit reached. Upgrade to Premium for more requests.',
        {
          retryAfter: retryAfterSeconds,
          tier: user?.tier || 'free',
        }
      );
    },
  });
})();

/**
 * Create general API rate limiter (per-IP)
 * For endpoints that don't have specific rate limits
 */
export const generalRateLimiter = (() => {
  const rateLimitConfig = getRateLimitingConfig();
  const generalConfig = rateLimitConfig.general;
  const windowMs = generalConfig.window_minutes * 60 * 1000;
  const retryAfterSeconds = generalConfig.window_minutes * 60;

  return rateLimit({
    windowMs,
    max: generalConfig.max_requests,
    keyGenerator: (req: Request) => {
      // Use ipKeyGenerator on req.ip to properly handle IPv6 addresses
      // The library's static analysis requires seeing ipKeyGenerator(req.ip) pattern directly
      if (req.ip) {
        return ipKeyGenerator(req.ip);
      }
      // Fallback for cases where req.ip is undefined
      const fallbackIp = req.socket.remoteAddress || '127.0.0.1';
      return ipKeyGenerator(fallbackIp);
    },
    // Disable all validation - we're using ipKeyGenerator correctly, just with a conditional
    validate: false,
    // Skip rate limiting for config endpoint (public, read-only, frequently accessed during dev)
    skip: (req: Request) => {
      return req.path === '/api/config' || req.path.startsWith('/api/config/');
    },
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      // Extract IP safely for logging (using same logic as keyGenerator)
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      logger.warn('Rate limit exceeded for general endpoint', {
        ip,
        path: req.path,
      });
      throw new RateLimitExceededError(
        'Too many requests. Please try again later.',
        {
          retryAfter: retryAfterSeconds,
        }
      );
    },
  });
})();

