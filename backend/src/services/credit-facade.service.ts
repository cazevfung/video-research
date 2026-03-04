/**
 * Credit Facade Service
 * 
 * Provides a unified interface for credit operations using the transactional
 * credit system (user_credits collection).
 * 
 * Phase 5: Migration complete - always uses new transactional system.
 * Legacy system (hardcoded credits_remaining) is deprecated.
 */

import { getUserById } from '../models/User';
import { checkCreditBalance, deductCredits, initializeUserCredits, getUserCredits, addCredits } from './credit.service';
import { getTierCredits } from './pricing.service';
import { getFreemiumConfig } from '../config';
import logger from '../utils/logger';
import { UserTier } from '../types/credit.types';

/**
 * Get credit balance for a user
 * Always uses new transactional credit system
 * 
 * @param userId User ID
 * @returns Current credit balance
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Always use new transactional system (Phase 5)
  // Pass tier for better performance in local storage mode
  return await checkCreditBalance(userId, user.tier);
}

/**
 * Deduct credits from user's account
 * Always uses new transactional credit system
 * 
 * @param userId User ID
 * @param amount Amount to deduct (positive number)
 * @param metadata Transaction metadata (batchId, description, etc.)
 * @throws Error if insufficient credits
 */
export async function deductCreditsFacade(
  userId: string, 
  amount: number,
  metadata: { batchId?: string; description?: string } = {}
): Promise<void> {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Always use new transactional system (Phase 5)
  await deductCredits(userId, amount, metadata);
}

/**
 * @deprecated Migration functions removed in Phase 5
 * All users should already be migrated. If credits are missing, they will be
 * auto-initialized on first access via credit.service.checkCreditBalance()
 */

