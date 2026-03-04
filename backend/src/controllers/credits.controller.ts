/**
 * Credits controller
 * Handles credit balance and transaction endpoints
 */

import { Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../middleware/firebase-auth.middleware';
import { getUserCredits, getCreditTransactions } from '../services/credit.service';
import { initializeUserCredits } from '../services/credit.service';
import logger from '../utils/logger';

/**
 * Get user credit balance and statistics
 * GET /api/credits/balance
 */
export async function getCreditsBalance(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      });
      return;
    }

    const userId = req.user.id;

    // Get user credits (will initialize if doesn't exist)
    // Pass tier for better performance in local storage mode
    let userCredits = await getUserCredits(userId, req.user.tier);

    // If user doesn't have credits document, initialize it
    if (!userCredits) {
      logger.debug('Initializing credits for user', { userId, tier: req.user.tier });
      userCredits = await initializeUserCredits(userId, req.user.tier || 'free');
    }

    // Format response
    res.status(200).json({
      balance: userCredits.balance,
      totalEarned: userCredits.totalEarned,
      totalSpent: userCredits.totalSpent,
      lastResetDate: userCredits.lastResetDate.toDate().toISOString(),
      tier: userCredits.tier,
    });
  } catch (error) {
    logger.error('Error getting credits balance', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get credits balance',
      },
    });
  }
}

/**
 * Get credit transaction history
 * GET /api/credits/transactions?page=1&limit=20
 */
export async function getCreditTransactionsHistory(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      });
      return;
    }

    const userId = req.user.id;

    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // Get transactions
    const transactions = await getCreditTransactions(userId, limit, offset);

    // Format transactions for response
    // Phase 2: Using camelCase to match frontend expectations (CreditTransaction interface)
    // Migration plan shows snake_case format, but frontend already uses camelCase
    // Phase 3 will handle frontend updates if format needs to change
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.transactionId, // Use 'id' as specified in migration plan (Phase 2.3)
      transactionId: tx.transactionId, // Keep for backward compatibility with existing frontend
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore, // camelCase for current frontend compatibility
      balanceAfter: tx.balanceAfter, // camelCase for current frontend compatibility
      description: tx.description,
      timestamp: tx.timestamp.toDate().toISOString(),
      metadata: tx.metadata,
    }));

    // Calculate pagination info
    const totalTransactions = transactions.length; // Note: This is approximate since we're using limit+offset
    const hasMore = transactions.length === limit;

    res.status(200).json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total: totalTransactions,
        hasMore,
      },
    });
  } catch (error) {
    logger.error('Error getting credit transactions', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get credit transactions',
      },
    });
  }
}

