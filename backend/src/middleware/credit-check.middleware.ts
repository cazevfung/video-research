import { Request, Response, NextFunction } from 'express';
import { checkCreditBalance } from '../services/credit.service';
import { getBatchPrice } from '../services/pricing.service';
import { AuthenticatedRequest } from './optional-auth.middleware';
import { getResearchConfig } from '../config';
import logger from '../utils/logger';

/**
 * Middleware to check if user has sufficient credits before processing batch
 * Calculates batch cost based on video count using centralized pricing
 * Returns 402 (Payment Required) if insufficient credits
 * Attaches credit cost to request for later deduction
 * Skips credit check for guest users (they have their own limit system)
 * 
 * @param req Express request (must have user from auth middleware)
 * @param res Express response
 * @param next Express next function
 */
export async function checkCreditsMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.debug('Credit check middleware called', {
      path: req.path,
      method: req.method,
      hasUser: !!req.user,
      hasGuest: !!req.guest,
      bodyKeys: Object.keys(req.body || {}),
    });

    // Skip credit check for guest users (they have their own limit system)
    if (!req.user && req.guest) {
      logger.debug('Skipping credit check for guest user', {
        sessionId: req.guest.sessionId,
      });
      return next();
    }

    // Check if user is authenticated
    if (!req.user) {
      logger.debug('No user found in request, returning 401');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if this is a research request (has research_query instead of urls)
    const isResearchRequest = !!req.body.research_query;
    logger.debug('Request type detection', {
      isResearchRequest,
      hasResearchQuery: !!req.body.research_query,
      hasUrls: !!req.body.urls,
    });

    if (isResearchRequest) {
      // For research requests, we use an estimated cost
      // The actual cost will be calculated later based on video count
      // We estimate ~10 videos for upfront credit check
      const estimatedVideoCount = 10;
      const researchConfig = getResearchConfig();
      const requiredCredits = researchConfig.base_cost + (estimatedVideoCount * researchConfig.per_video_cost);
      
      logger.debug('Research request credit check', {
        userId: req.user.id,
        estimatedVideoCount,
        requiredCredits,
        baseCost: researchConfig.base_cost,
        perVideoCost: researchConfig.per_video_cost,
        researchQuery: req.body.research_query?.substring(0, 50),
      });

      // Check user's credit balance
      const balance = await checkCreditBalance(req.user.id, req.user.tier);

      if (balance < requiredCredits) {
        logger.warn('Insufficient credits for research', {
          userId: req.user.id,
          required: requiredCredits,
          balance,
          estimatedVideoCount,
        });

        res.status(402).json({
          error: 'Insufficient credits',
          required: requiredCredits,
          balance,
          estimatedVideoCount,
        });
        return;
      }

      // Attach estimated credit cost to request for later deduction
      (req as any).creditCost = requiredCredits;
      (req as any).estimatedVideoCount = estimatedVideoCount;
      (req as any).isResearchRequest = true;

      logger.debug('Research credit check passed', {
        userId: req.user.id,
        required: requiredCredits,
        balance,
        estimatedVideoCount,
      });

      return next();
    }

    // Original logic for batch video processing
    // Get video count from request body
    const videoCount = req.body.urls?.length || 0;
    
    logger.debug('Batch request credit check', {
      userId: req.user.id,
      videoCount,
      urlsLength: req.body.urls?.length,
    });

    if (videoCount === 0) {
      logger.warn('No videos provided in batch request', {
        userId: req.user.id,
        bodyKeys: Object.keys(req.body || {}),
      });
      res.status(400).json({ error: 'No videos provided' });
      return;
    }

    // Calculate required credits using centralized pricing
    const requiredCredits = await getBatchPrice(videoCount);

    // Check user's credit balance (pass tier if available for better performance)
    const balance = await checkCreditBalance(req.user.id, req.user.tier);

    if (balance < requiredCredits) {
      logger.warn('Insufficient credits', {
        userId: req.user.id,
        required: requiredCredits,
        balance,
        videoCount,
      });

      res.status(402).json({
        error: 'Insufficient credits',
        required: requiredCredits,
        balance,
        videoCount,
      });
      return;
    }

    // Attach credit cost to request for later deduction
    (req as any).creditCost = requiredCredits;
    (req as any).videoCount = videoCount;

    logger.debug('Credit check passed', {
      userId: req.user.id,
      required: requiredCredits,
      balance,
      videoCount,
    });

    next();
  } catch (error) {
    logger.error('Error in credit check middleware', error);
    res.status(500).json({
      error: 'Failed to check credits',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

