import { Response, NextFunction } from 'express';
import { checkQuota, validateBatchSize } from '../services/quota.service';
import { getFreemiumConfig } from '../config';
import logger from '../utils/logger';
import { QuotaExceededError, BatchSizeExceededError, ValidationError } from '../utils/errors';
import { AuthenticatedRequest } from './optional-auth.middleware';

/**
 * Middleware to check if user has credits remaining
 * Skips quota check for guest users (they have their own limit system)
 * When auth is disabled, always passes
 */
export async function checkQuotaMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip quota check for guest users (they have their own limit system)
    if (!req.user && req.guest) {
      logger.debug('Skipping quota check for guest user', {
        sessionId: req.guest.sessionId,
      });
      return next();
    }

    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const hasQuota = await checkQuota(req.user.id);

    if (!hasQuota) {
      logger.quotaViolation(req.user.id, req.user.tier, 'credits_exhausted', {
        path: req.path,
      });
      throw new QuotaExceededError('Daily limit reached. Upgrade to Premium for more.', {
        credits_remaining: 0,
      });
    }

    next();
  } catch (error) {
    logger.error('Error in quota middleware', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check quota',
      },
    });
  }
}

/**
 * Middleware to validate batch size against user's tier limits
 * Skips batch size check for guest users (they have their own limit system)
 * When auth is disabled, uses maximum from config
 */
export async function checkBatchSizeMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip batch size check for guest users (they have their own limit system)
    if (!req.user && req.guest) {
      logger.debug('Skipping batch size check for guest user', {
        sessionId: req.guest.sessionId,
      });
      return next();
    }

    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    // Extract URLs from request body
    const urls = req.body?.urls;
    if (!Array.isArray(urls)) {
      throw new ValidationError('urls must be an array', {
        field: 'urls',
        value: urls,
      });
    }

    const urlCount = urls.length;
    const validation = await validateBatchSize(req.user.id, urlCount);

    if (!validation.valid) {
      const user = req.user;
      const freemiumConfig = getFreemiumConfig();
      const tierConfig = user.tier === 'free'
        ? freemiumConfig.free_tier
        : freemiumConfig.premium_tier;
      const tierName = user.tier === 'free' ? 'Free tier' : 'Premium tier';
      
      logger.quotaViolation(req.user.id, req.user.tier, 'batch_size_exceeded', {
        requested: urlCount,
        max_allowed: validation.maxAllowed,
        path: req.path,
      });
      
      throw new BatchSizeExceededError(
        `Batch size exceeded. ${tierName}: max ${tierConfig.max_videos_per_batch} videos.`,
        {
          requested: urlCount,
          max_allowed: validation.maxAllowed,
          tier: user.tier,
        }
      );
    }

    next();
  } catch (error) {
    logger.error('Error in batch size middleware', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to validate batch size',
      },
    });
  }
}

