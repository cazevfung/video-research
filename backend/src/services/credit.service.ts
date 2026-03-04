import db from '../config/database';
import { Timestamp, Transaction, QueryDocumentSnapshot, DocumentSnapshot } from 'firebase-admin/firestore';
import { UserCredits, CreditTransaction, CreditTransactionType, UserTier } from '../types/credit.types';
import logger from '../utils/logger';
import { getPricingConfig, getTierCredits } from './pricing.service';
import { getSystemConfig, getFreemiumConfig, getAuthConfig } from '../config';
import env from '../config/env';
import { getUserById } from '../models/User';

const USER_CREDITS_COLLECTION = 'user_credits';
const CREDIT_TRANSACTIONS_COLLECTION = 'credit_transactions';

// Simple mutex implementation for credit operations (prevents race conditions)
// Maps userId -> Promise chain for serializing credit operations
const creditMutex = new Map<string, Promise<any>>();

/**
 * Get daily credit allocation for free tier
 * Uses config.yaml default_credits value (not hardcoded)
 * 
 * @returns Daily credits for free tier
 */
function getFreeTierDailyCredits(): number {
  const freemiumConfig = getFreemiumConfig();
  return freemiumConfig.free_tier.default_credits;
}

/**
 * Initialize user credits for a new user
 * Creates user_credits document with default balance based on tier
 * 
 * @param userId User ID
 * @param tier User tier
 * @returns User credits document
 */
export async function initializeUserCredits(
  userId: string,
  tier: UserTier = 'free'
): Promise<UserCredits> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    // For local storage mode, return in-memory structure
    const defaultCredits = await getTierCredits(tier);
    return {
      userId,
      balance: tier === 'free' ? getFreeTierDailyCredits() : defaultCredits, // Free tier gets daily amount from config, others get full monthly
      totalEarned: defaultCredits,
      totalSpent: 0,
      lastResetDate: Timestamp.now(),
      tier,
      tierUnlockedAt: null,
      tierUnlockedBy: null,
    };
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const creditRef = db.collection(USER_CREDITS_COLLECTION).doc(userId);
    const creditDoc = await creditRef.get();

    // If already exists, return it
    if (creditDoc.exists) {
      return creditDoc.data() as UserCredits;
    }

    // Get default credits for tier
    const defaultCredits = await getTierCredits(tier);
    
    // Free tier gets daily amount from config, others get full monthly allocation
    const initialBalance = tier === 'free' ? getFreeTierDailyCredits() : defaultCredits;

    const userCredits: UserCredits = {
      userId,
      balance: initialBalance,
      totalEarned: defaultCredits,
      totalSpent: 0,
      lastResetDate: Timestamp.now(),
      tier,
      tierUnlockedAt: null,
      tierUnlockedBy: null,
    };

    await creditRef.set(userCredits);

    logger.info('Initialized user credits', {
      userId,
      tier,
      balance: initialBalance,
    });

    return userCredits;
  } catch (error) {
    logger.error('Error initializing user credits', error);
    throw new Error(`Failed to initialize user credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check user's credit balance
 * Initializes credits if user doesn't have a credits document
 * 
 * @param userId User ID
 * @param tier Optional user tier (if not provided, will fetch from user model)
 * @returns Current credit balance
 */
export async function checkCreditBalance(userId: string, tier?: UserTier): Promise<number> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    // For local storage mode, determine credits based on user tier
    let userTier: UserTier = tier || 'free';
    
    // If tier not provided, fetch user to get tier
    if (!tier) {
      try {
        const user = await getUserById(userId);
        if (user) {
          userTier = user.tier;
        } else {
          // User doesn't exist, check if it's dev user with auth disabled
          if (!env.AUTH_ENABLED && userId === env.DEV_USER_ID) {
            const authConfig = getAuthConfig();
            userTier = authConfig.dev_mode_tier;
            logger.debug('Using dev user tier from config', {
              userId,
              tier: userTier,
            });
          } else {
            logger.debug('User not found, defaulting to free tier', { userId });
            userTier = 'free';
          }
        }
      } catch (error) {
        logger.warn('Error fetching user for tier, defaulting to free tier', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        userTier = 'free';
      }
    }
    
    // If auth is disabled and this is the dev user, use dev_mode_credits
    if (!env.AUTH_ENABLED && userId === env.DEV_USER_ID) {
      const devCredits = systemConfig.dev_mode_credits;
      logger.debug('Using dev mode credits for dev user', {
        userId,
        credits: devCredits,
      });
      return devCredits;
    }
    
    // Otherwise, use tier-appropriate credits
    if (userTier === 'free') {
      return getFreeTierDailyCredits();
    } else {
      // For paid tiers, return their monthly allocation
      const tierCredits = await getTierCredits(userTier);
      logger.debug('Using tier credits for local storage', {
        userId,
        tier: userTier,
        credits: tierCredits,
      });
      return tierCredits;
    }
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const creditRef = db.collection(USER_CREDITS_COLLECTION).doc(userId);
    const creditDoc = await creditRef.get();

    if (!creditDoc.exists) {
      // Initialize credits for new user (default to free tier)
      await initializeUserCredits(userId, tier || 'free');
      return getFreeTierDailyCredits(); // Free tier daily amount from config
    }

    const credits = creditDoc.data() as UserCredits;
    return credits.balance || 0;
  } catch (error) {
    logger.error('Error checking credit balance', error);
    throw new Error(`Failed to check credit balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deduct credits from user's account with locking
 * Uses mutex to prevent race conditions when multiple tasks start simultaneously
 * Uses Firestore transaction for atomic operation
 * Creates transaction record for audit trail
 * 
 * @param userId User ID
 * @param amount Amount to deduct (positive number)
 * @param metadata Transaction metadata (batchId, etc.)
 * @throws Error if insufficient credits
 */
export async function deductCredits(
  userId: string,
  amount: number,
  metadata: { batchId?: string; description?: string } = {}
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Deduction amount must be positive');
  }

  // Acquire lock for this user (serialize credit operations per user)
  const existingLock = creditMutex.get(userId);
  const lockPromise = (async () => {
    if (existingLock) {
      await existingLock;
    }
    return await deductCreditsInternal(userId, amount, metadata);
  })();

  creditMutex.set(userId, lockPromise);
  
  try {
    await lockPromise;
  } finally {
    // Remove lock if this is the current operation
    if (creditMutex.get(userId) === lockPromise) {
      creditMutex.delete(userId);
    }
  }
}

/**
 * Internal credit deduction (without mutex)
 * Called by deductCredits after acquiring lock
 */
async function deductCreditsInternal(
  userId: string,
  amount: number,
  metadata: { batchId?: string; description?: string } = {}
): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    // For local storage mode, just log (no actual deduction)
    logger.debug('Local storage mode - skipping credit deduction', { userId, amount });
    return;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  const creditRef = db.collection(USER_CREDITS_COLLECTION).doc(userId);

  try {
    await db.runTransaction(async (transaction: Transaction) => {
      const creditDoc = await transaction.get(creditRef) as unknown as DocumentSnapshot;

      if (!creditDoc.exists) {
        // Initialize credits if document doesn't exist
        const defaultCredits = await getTierCredits('free');
        const userCredits: UserCredits = {
          userId,
          balance: getFreeTierDailyCredits(), // Free tier daily amount from config
          totalEarned: defaultCredits,
          totalSpent: 0,
          lastResetDate: Timestamp.now(),
          tier: 'free',
          tierUnlockedAt: null,
          tierUnlockedBy: null,
        };
        transaction.set(creditRef, userCredits);
      }

      const credits = creditDoc.exists 
        ? (creditDoc.data() as UserCredits)
        : {
            userId,
            balance: getFreeTierDailyCredits(),
            totalEarned: await getTierCredits('free'),
            totalSpent: 0,
            lastResetDate: Timestamp.now(),
            tier: 'free' as UserTier,
            tierUnlockedAt: null,
            tierUnlockedBy: null,
          };

      const currentBalance = credits.balance || 0;

      if (currentBalance < amount) {
        throw new Error(`Insufficient credits. Required: ${amount}, Available: ${currentBalance}`);
      }

      const newBalance = currentBalance - amount;
      const newTotalSpent = (credits.totalSpent || 0) + amount;

      // Update credits
      transaction.update(creditRef, {
        balance: newBalance,
        totalSpent: newTotalSpent,
      });

      // Create transaction record
      const transactionRef = db.collection(CREDIT_TRANSACTIONS_COLLECTION).doc();
      const transactionRecord: CreditTransaction = {
        transactionId: transactionRef.id,
        userId,
        type: 'spent',
        amount: -amount, // Negative for deduction
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: metadata.description || `Spent ${amount} credits on batch`,
        metadata: {
          batchId: metadata.batchId,
        },
        timestamp: Timestamp.now(),
      };
      transaction.set(transactionRef, transactionRecord);

      logger.info('Credits deducted', {
        userId,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        batchId: metadata.batchId,
      });
    });
  } catch (error) {
    logger.error('Error deducting credits', error);
    if (error instanceof Error && error.message.includes('Insufficient credits')) {
      throw error;
    }
    throw new Error(`Failed to deduct credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add credits to user's account
 * Uses Firestore transaction for atomic operation
 * Creates transaction record for audit trail
 * 
 * @param userId User ID
 * @param amount Amount to add (positive number)
 * @param type Transaction type
 * @param metadata Transaction metadata
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType = 'earned',
  metadata: { description?: string; tierUpgrade?: string } = {}
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }

  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    // For local storage mode, just log
    logger.debug('Local storage mode - skipping credit addition', { userId, amount, type });
    return;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  const creditRef = db.collection(USER_CREDITS_COLLECTION).doc(userId);

  try {
    await db.runTransaction(async (transaction: Transaction) => {
      const creditDoc = await transaction.get(creditRef) as unknown as DocumentSnapshot;

      let credits: UserCredits;
      if (!creditDoc.exists) {
        // Initialize credits if document doesn't exist
        const defaultCredits = await getTierCredits('free');
        credits = {
          userId,
          balance: getFreeTierDailyCredits(),
          totalEarned: defaultCredits,
          totalSpent: 0,
          lastResetDate: Timestamp.now(),
          tier: 'free',
          tierUnlockedAt: null,
          tierUnlockedBy: null,
        };
        transaction.set(creditRef, credits);
      } else {
        credits = creditDoc.data() as UserCredits;
      }

      const currentBalance = credits.balance || 0;
      const newBalance = currentBalance + amount;
      const newTotalEarned = (credits.totalEarned || 0) + amount;

      // Update credits
      transaction.update(creditRef, {
        balance: newBalance,
        totalEarned: newTotalEarned,
      });

      // Create transaction record
      const transactionRef = db.collection(CREDIT_TRANSACTIONS_COLLECTION).doc();
      const transactionRecord: CreditTransaction = {
        transactionId: transactionRef.id,
        userId,
        type,
        amount, // Positive for addition
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: metadata.description || `Added ${amount} credits`,
        metadata: {
          tierUpgrade: metadata.tierUpgrade,
        },
        timestamp: Timestamp.now(),
      };
      transaction.set(transactionRef, transactionRecord);

      logger.info('Credits added', {
        userId,
        amount,
        type,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
      });
    });
  } catch (error) {
    logger.error('Error adding credits', error);
    throw new Error(`Failed to add credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reset daily credits for free tier users
 * Resets balance to daily allocation from config
 * 
 * @param userId User ID
 */
export async function resetDailyCredits(userId: string): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    logger.debug('Local storage mode - skipping daily credit reset', { userId });
    return;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  const creditRef = db.collection(USER_CREDITS_COLLECTION).doc(userId);

  try {
    await db.runTransaction(async (transaction: Transaction) => {
      const creditDoc = await transaction.get(creditRef) as unknown as DocumentSnapshot;

      if (!creditDoc.exists) {
        // Initialize if doesn't exist
        await initializeUserCredits(userId, 'free');
        return;
      }

      const credits = creditDoc.data() as UserCredits;

      // Only reset if user is on free tier
      if (credits.tier !== 'free') {
        logger.debug('Skipping daily reset for non-free tier user', { userId, tier: credits.tier });
        return;
      }

      const dailyCredits = getFreeTierDailyCredits(); // Free tier daily allocation from config
      const currentBalance = credits.balance || 0;

      // Update credits
      transaction.update(creditRef, {
        balance: dailyCredits,
        lastResetDate: Timestamp.now(),
      });

      // Create transaction record
      const transactionRef = db.collection(CREDIT_TRANSACTIONS_COLLECTION).doc();
      const transactionRecord: CreditTransaction = {
        transactionId: transactionRef.id,
        userId,
        type: 'reset',
        amount: dailyCredits - currentBalance, // Net change
        balanceBefore: currentBalance,
        balanceAfter: dailyCredits,
        description: 'Daily credit reset',
        metadata: {},
        timestamp: Timestamp.now(),
      };
      transaction.set(transactionRef, transactionRecord);

      logger.info('Daily credits reset', {
        userId,
        balanceBefore: currentBalance,
        balanceAfter: dailyCredits,
      });
    });
  } catch (error) {
    logger.error('Error resetting daily credits', error);
    throw new Error(`Failed to reset daily credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reset monthly credits for paid tier users
 * Resets balance to tier's monthly allocation
 * 
 * @param userId User ID
 */
export async function resetMonthlyCredits(userId: string): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    logger.debug('Local storage mode - skipping monthly credit reset', { userId });
    return;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  const creditRef = db.collection(USER_CREDITS_COLLECTION).doc(userId);

  try {
    await db.runTransaction(async (transaction: Transaction) => {
      const creditDoc = await transaction.get(creditRef) as unknown as DocumentSnapshot;

      if (!creditDoc.exists) {
        // Initialize if doesn't exist
        await initializeUserCredits(userId, 'free');
        return;
      }

      const credits = creditDoc.data() as UserCredits;

      // Only reset monthly tiers (starter, pro, premium)
      if (credits.tier === 'free') {
        logger.debug('Skipping monthly reset for free tier user', { userId });
        return;
      }

      const monthlyCredits = await getTierCredits(credits.tier);
      const currentBalance = credits.balance || 0;

      // Update credits
      transaction.update(creditRef, {
        balance: monthlyCredits,
        lastResetDate: Timestamp.now(),
      });

      // Create transaction record
      const transactionRef = db.collection(CREDIT_TRANSACTIONS_COLLECTION).doc();
      const transactionRecord: CreditTransaction = {
        transactionId: transactionRef.id,
        userId,
        type: 'reset',
        amount: monthlyCredits - currentBalance, // Net change
        balanceBefore: currentBalance,
        balanceAfter: monthlyCredits,
        description: `Monthly credit reset (${credits.tier} tier)`,
        metadata: {
          tierUpgrade: credits.tier,
        },
        timestamp: Timestamp.now(),
      };
      transaction.set(transactionRef, transactionRecord);

      logger.info('Monthly credits reset', {
        userId,
        tier: credits.tier,
        balanceBefore: currentBalance,
        balanceAfter: monthlyCredits,
      });
    });
  } catch (error) {
    logger.error('Error resetting monthly credits', error);
    throw new Error(`Failed to reset monthly credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get credit transactions for a user
 * 
 * @param userId User ID
 * @param limit Maximum number of transactions to return
 * @param offset Number of transactions to skip
 * @returns Array of credit transactions
 */
export async function getCreditTransactions(
  userId: string,
  limitCount: number = 50,
  offset: number = 0
): Promise<CreditTransaction[]> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    // Return empty array for local storage mode
    return [];
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const snapshot = await db
      .collection(CREDIT_TRANSACTIONS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limitCount + offset)
      .get();

    const transactions = snapshot.docs
      .slice(offset) // Apply offset
      .map((doc: QueryDocumentSnapshot) => ({
        transactionId: doc.id,
        ...doc.data(),
      })) as CreditTransaction[];

    return transactions;
  } catch (error) {
    logger.error('Error getting credit transactions', error);
    throw new Error(`Failed to get credit transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user credits document
 * 
 * @param userId User ID
 * @param tier Optional user tier (if not provided, will fetch from user model)
 * @returns User credits document or null if not found
 */
export async function getUserCredits(userId: string, tier?: UserTier): Promise<UserCredits | null> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    // For local storage mode, determine credits based on user tier
    let userTier: UserTier = tier || 'free';
    
    // If tier not provided, fetch user to get tier
    if (!tier) {
      try {
        const user = await getUserById(userId);
        if (user) {
          userTier = user.tier;
        } else {
          // User doesn't exist, check if it's dev user with auth disabled
          if (!env.AUTH_ENABLED && userId === env.DEV_USER_ID) {
            const authConfig = getAuthConfig();
            userTier = authConfig.dev_mode_tier;
          } else {
            userTier = 'free';
          }
        }
      } catch (error) {
        logger.warn('Error fetching user for tier, defaulting to free tier', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        userTier = 'free';
      }
    }
    
    // Determine balance based on tier and dev mode
    let balance: number;
    if (!env.AUTH_ENABLED && userId === env.DEV_USER_ID) {
      balance = systemConfig.dev_mode_credits;
    } else if (userTier === 'free') {
      balance = getFreeTierDailyCredits();
    } else {
      balance = await getTierCredits(userTier);
    }
    
    const defaultCredits = await getTierCredits(userTier);
    return {
      userId,
      balance,
      totalEarned: defaultCredits,
      totalSpent: 0,
      lastResetDate: Timestamp.now(),
      tier: userTier,
      tierUnlockedAt: null,
      tierUnlockedBy: null,
    };
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const creditRef = db.collection(USER_CREDITS_COLLECTION).doc(userId);
    const creditDoc = await creditRef.get();

    if (!creditDoc.exists) {
      return null;
    }

    return creditDoc.data() as UserCredits;
  } catch (error) {
    logger.error('Error getting user credits', error);
    throw new Error(`Failed to get user credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

