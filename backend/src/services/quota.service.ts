import { getUserById } from '../models/User';
import { getFreemiumConfig, getSystemConfig, getAuthConfig, getRateLimitingConfig, getLimitsConfig } from '../config';
import env from '../config/env';
import { AuthenticatedUser } from '../types/auth.types';
import { UserTier } from '../types/credit.types';
import logger from '../utils/logger';
import { getCreditBalance } from './credit-facade.service';

/**
 * Quota information interface
 */
export interface QuotaInfo {
  credits_remaining: number;
  tier: UserTier;
  daily_limit: number;
  max_videos_per_batch: number;
  reset_time: Date;
}

/**
 * Check if user has credits remaining
 * Uses new transactional credit system
 * When auth is disabled, always returns true
 */
export async function checkQuota(userId: string): Promise<boolean> {
  if (!env.AUTH_ENABLED) {
    // Unlimited quota when auth is disabled
    return true;
  }

  try {
    // Use new credit system to check balance
    const balance = await getCreditBalance(userId);
    return balance > 0;
  } catch (error) {
    logger.error('Error checking quota', error);
    throw new Error('Failed to check quota');
  }
}

/**
 * @deprecated Use deductCredits() from credit.service instead
 * This function is removed in Phase 5 - all credit operations should use the transactional credit system.
 * 
 * Legacy function kept for backward compatibility but should not be used.
 * Use credit.service.deductCredits() for all credit deductions.
 */
export async function deductCredit(userId: string): Promise<void> {
  logger.warn('deductCredit() is deprecated - use credit.service.deductCredits() instead', { userId });
  
  // Delegate to new credit system
  const { deductCredits } = await import('./credit.service');
  await deductCredits(userId, 1, { description: 'Legacy deductCredit call' });
}

/**
 * Get quota information for user
 * When auth is disabled, returns unlimited quota
 */
export async function getQuotaInfo(userId: string): Promise<QuotaInfo> {
  if (!env.AUTH_ENABLED) {
    // Return unlimited quota when auth is disabled
    const freemiumConfig = getFreemiumConfig();
    const systemConfig = getSystemConfig();
    const authConfig = getAuthConfig();
    const rateLimitConfig = getRateLimitingConfig();
    const tierConfig = authConfig.dev_mode_tier === 'premium'
      ? freemiumConfig.premium_tier
      : freemiumConfig.free_tier;
    
    // Calculate reset time using configured rate limit window
    const resetWindowMs = rateLimitConfig.summary.window_hours * 60 * 60 * 1000;
    return {
      credits_remaining: systemConfig.dev_mode_credits, // From config
      tier: authConfig.dev_mode_tier,
      daily_limit: tierConfig.daily_request_limit,
      max_videos_per_batch: tierConfig.max_videos_per_batch,
      reset_time: new Date(Date.now() + resetWindowMs), // Using configured window
    };
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const freemiumConfig = getFreemiumConfig();
    const tierConfig =
      user.tier === 'premium'
        ? freemiumConfig.premium_tier
        : freemiumConfig.free_tier;

    // Calculate next reset time (midnight UTC tomorrow)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    // If last_reset exists and is today, use today's reset time
    let resetTime = tomorrow;
    if (user.last_reset) {
      const lastReset = user.last_reset instanceof Date
        ? user.last_reset
        : typeof user.last_reset === 'string'
        ? new Date(user.last_reset)
        : user.last_reset;
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);
      
      if (lastReset >= today) {
        resetTime = tomorrow;
      }
    }

    // Use facade to get dynamic balance (from new system if migrated, legacy otherwise)
    const balance = await getCreditBalance(userId);
    
    return {
      credits_remaining: balance, // ✅ Dynamic, not hardcoded
      tier: user.tier,
      daily_limit: tierConfig.daily_request_limit,
      max_videos_per_batch: tierConfig.max_videos_per_batch,
      reset_time: resetTime,
    };
  } catch (error) {
    logger.error('Error getting quota info', error);
    throw new Error('Failed to get quota information');
  }
}

/**
 * Validate batch size against user's tier limits
 * When auth is disabled, uses maximum allowed from config
 */
export async function validateBatchSize(
  userId: string,
  urlCount: number
): Promise<{ valid: boolean; maxAllowed: number }> {
  const limits = getLimitsConfig();
  const absoluteMax = limits.max_batch_size;
  
  if (!env.AUTH_ENABLED) {
    // Use maximum from config when auth is disabled
    const freemiumConfig = getFreemiumConfig();
    const tierMax = freemiumConfig.premium_tier.max_videos_per_batch;
    // Enforce absolute maximum regardless of tier
    const maxAllowed = Math.min(tierMax, absoluteMax);
    return {
      valid: urlCount <= maxAllowed && urlCount <= absoluteMax,
      maxAllowed,
    };
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const freemiumConfig = getFreemiumConfig();
    const tierConfig =
      user.tier === 'premium'
        ? freemiumConfig.premium_tier
        : freemiumConfig.free_tier;

    const tierMax = tierConfig.max_videos_per_batch;
    // Enforce absolute maximum regardless of tier
    const maxAllowed = Math.min(tierMax, absoluteMax);

    return {
      valid: urlCount <= maxAllowed && urlCount <= absoluteMax,
      maxAllowed,
    };
  } catch (error) {
    logger.error('Error validating batch size', error);
    throw new Error('Failed to validate batch size');
  }
}

