/**
 * Research rate limiting middleware
 * Enforces per-user hourly limits based on tier
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { RateLimitExceededError } from '../utils/errors';
import { getResearchConfig, getRateLimitingConfig } from '../config';
import logger from '../utils/logger';

/**
 * Create rate limiter for research endpoints (per-user, per-tier)
 * Different limits for free, starter, pro, and premium tiers
 */
export const researchRateLimiter = (() => {
  const rateLimitConfig = getRateLimitingConfig();
  const researchConfig = getResearchConfig();
  
  // Use hourly window from rate_limiting.research config
  const researchRateLimitConfig = rateLimitConfig.research;
  const windowMs = researchRateLimitConfig
    ? researchRateLimitConfig.window_hours * 60 * 60 * 1000
    : 60 * 60 * 1000; // Default to 1 hour if not configured
  const retryAfterSeconds = researchRateLimitConfig
    ? researchRateLimitConfig.window_hours * 60 * 60
    : 60 * 60; // Default to 1 hour

  return rateLimit({
    windowMs,
    max: async (req: Request) => {
      // Get user tier from request (set by auth middleware)
      const user = (req as any).user;

      if (!user || !user.tier) {
        // Default to free tier if no user
        return researchConfig.free_tier_max_per_hour;
      }

      // Return limit based on tier
      switch (user.tier) {
        case 'premium':
          return researchConfig.premium_tier_max_per_hour;
        case 'pro':
          return researchConfig.pro_tier_max_per_hour;
        case 'starter':
          return researchConfig.starter_tier_max_per_hour;
        case 'free':
        default:
          return researchConfig.free_tier_max_per_hour;
      }
    },
    keyGenerator: (req: Request) => {
      // Use user ID for authenticated users, or a constant key for unauthenticated
      // This avoids the IPv6 issue with req.ip
      const user = (req as any).user;
      return user?.id || user?.uid || 'anonymous';
    },
    // Disable all validation since this limiter uses user-based keys, not IP-based
    validate: false,
    message: 'Hourly research limit reached. Please try again later or upgrade your plan.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const user = (req as any).user;
      const tier = user?.tier || 'free';
      const limit = user?.tier === 'premium'
        ? researchConfig.premium_tier_max_per_hour
        : user?.tier === 'pro'
        ? researchConfig.pro_tier_max_per_hour
        : user?.tier === 'starter'
        ? researchConfig.starter_tier_max_per_hour
        : researchConfig.free_tier_max_per_hour;

      logger.warn('Rate limit exceeded for research endpoint', {
        userId: user?.id || user?.uid,
        tier,
        limit,
        path: req.path,
      });
      
      throw new RateLimitExceededError(
        `Hourly research limit reached (${limit} per hour). Upgrade to increase your limit.`,
        {
          retryAfter: retryAfterSeconds,
          tier,
          limit,
        }
      );
    },
  });
})();
