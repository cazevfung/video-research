import db from '../config/database';
import { PricingConfig } from '../types/credit.types';
import logger from '../utils/logger';
import { getSystemConfig } from '../config';

/**
 * Pricing configuration cache
 */
let cachedPricing: PricingConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get current pricing configuration from Firestore
 * Uses caching to reduce Firestore reads (5-minute TTL)
 * 
 * @returns Pricing configuration
 * @throws Error if pricing config not found
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  const systemConfig = getSystemConfig();
  
  // If using local storage, return default pricing (for development)
  if (systemConfig.use_local_storage) {
    if (!cachedPricing) {
      cachedPricing = getDefaultPricingConfig();
      cacheTimestamp = Date.now();
    }
    return cachedPricing;
  }

  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedPricing && (now - cacheTimestamp) < CACHE_TTL) {
    logger.debug('Pricing config cache hit', {
      age: now - cacheTimestamp,
      ttl: CACHE_TTL,
    });
    return cachedPricing;
  }

  // Cache miss or expired - fetch from Firestore
  logger.debug('Pricing config cache miss, fetching from Firestore');
  
  try {
    const docRef = db.collection('pricing_config').doc('current');
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      logger.warn('Pricing configuration not found in Firestore, using defaults');
      // Return default config if not found (for first-time setup)
      cachedPricing = getDefaultPricingConfig();
      cacheTimestamp = now;
      return cachedPricing;
    }

    const data = docSnap.data() as PricingConfig;
    cachedPricing = data;
    cacheTimestamp = now;
    
    logger.info('Pricing config loaded from Firestore', {
      version: data.version,
      lastUpdated: data.lastUpdated.toDate().toISOString(),
    });
    
    return cachedPricing;
  } catch (error) {
    logger.error('Error fetching pricing config from Firestore', error);
    
    // If we have cached config, return it even if expired
    if (cachedPricing) {
      logger.warn('Using expired cached pricing config due to Firestore error');
      return cachedPricing;
    }
    
    // No cache available - return default config
    logger.warn('No cached pricing config available, using defaults');
    return getDefaultPricingConfig();
  }
}

/**
 * Get default pricing configuration
 * Used when Firestore config is not available (first-time setup or local storage mode)
 */
function getDefaultPricingConfig(): PricingConfig {
  const { Timestamp } = require('firebase-admin/firestore');
  
  return {
    version: 1,
    lastUpdated: Timestamp.now(),
    lastUpdatedBy: 'system',
    tiers: {
      free: {
        credits: 120, // Monthly credits (daily reset gives 40/day)
        resetFrequency: 'daily',
      },
      starter: {
        credits: 500,
        resetFrequency: 'monthly',
      },
      pro: {
        credits: 2000,
        resetFrequency: 'monthly',
      },
      premium: {
        credits: 5000,
        resetFrequency: 'monthly',
      },
    },
    creditRates: {
      transcriptPerVideo: 10, // 10 credits per video transcript
      aiInputPer1kTokens: 0.1, // 0.1 credits per 1k input tokens
      aiOutputPer1kTokens: {
        free: 0.3, // 0.3 credits per 1k output tokens (free tier)
        premium: 0.6, // 0.6 credits per 1k output tokens (premium tier)
      },
      preCondenseInputPer1kTokens: 0.1, // 0.1 credits per 1k input tokens
      preCondenseOutputPer1kTokens: 0.5, // 0.5 credits per 1k output tokens
    },
    batchPricing: {
      '1': 20, // 1 video = 20 credits
      '2': 30, // 2 videos = 30 credits
      '3': 40, // 3 videos = 40 credits
      '4-5': 60, // 4-5 videos = 60 credits
      '6-10': 120, // 6-10 videos = 120 credits
      costPerAdditionalVideo: 20, // Cost per video beyond the 6-10 range (configurable, not hardcoded)
    },
  };
}

/**
 * Get tier credit allocation
 * 
 * @param tier User tier
 * @returns Credit allocation for tier
 */
export async function getTierCredits(tier: 'free' | 'starter' | 'pro' | 'premium'): Promise<number> {
  const config = await getPricingConfig();
  return config.tiers[tier].credits;
}

/**
 * Get batch price based on video count
 * Uses simplified flat-rate pricing from pricing config
 * 
 * @param videoCount Number of videos in batch
 * @returns Credit cost for batch
 */
export async function getBatchPrice(videoCount: number): Promise<number> {
  const config = await getPricingConfig();
  
  if (videoCount <= 0) {
    throw new Error('Video count must be positive');
  }
  
  if (videoCount === 1) {
    return config.batchPricing['1'];
  } else if (videoCount === 2) {
    return config.batchPricing['2'];
  } else if (videoCount === 3) {
    return config.batchPricing['3'];
  } else if (videoCount >= 4 && videoCount <= 5) {
    return config.batchPricing['4-5'];
  } else if (videoCount >= 6 && videoCount <= 10) {
    return config.batchPricing['6-10'];
  } else {
    // For batches larger than 10, use linear scaling
    // Base cost for 6-10 range + additional cost per video over 10
    const baseCost = config.batchPricing['6-10'];
    const additionalVideos = videoCount - 10;
    // Use configurable cost per additional video from pricing config (not hardcoded)
    const costPerAdditionalVideo = config.batchPricing.costPerAdditionalVideo;
    return baseCost + (additionalVideos * costPerAdditionalVideo);
  }
}

/**
 * Invalidate pricing cache
 * Forces next call to getPricingConfig() to fetch from Firestore
 */
export function invalidatePricingCache(): void {
  cachedPricing = null;
  cacheTimestamp = 0;
  logger.info('Pricing cache invalidated');
}

/**
 * Get credit rates for AI processing
 * 
 * @param tier User tier (for output token rates)
 * @returns Credit rates configuration
 */
export async function getCreditRates(tier: 'free' | 'premium' = 'free') {
  const config = await getPricingConfig();
  return {
    transcriptPerVideo: config.creditRates.transcriptPerVideo,
    aiInputPer1kTokens: config.creditRates.aiInputPer1kTokens,
    aiOutputPer1kTokens: tier === 'premium' 
      ? config.creditRates.aiOutputPer1kTokens.premium
      : config.creditRates.aiOutputPer1kTokens.free,
    preCondenseInputPer1kTokens: config.creditRates.preCondenseInputPer1kTokens,
    preCondenseOutputPer1kTokens: config.creditRates.preCondenseOutputPer1kTokens,
  };
}

