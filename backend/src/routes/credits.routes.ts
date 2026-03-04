/**
 * Credits routes
 * Handles credit balance and transaction endpoints
 */

import { Router } from 'express';
import { getCreditsBalance, getCreditTransactionsHistory } from '../controllers/credits.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/credits/balance
 * Get user credit balance and statistics
 * Requires authentication
 */
router.get('/balance', requireAuth, getCreditsBalance);

/**
 * GET /api/credits/transactions
 * Get credit transaction history with pagination
 * Requires authentication
 * Query params: page (default: 1), limit (default: 20, max: 100)
 */
router.get('/transactions', requireAuth, getCreditTransactionsHistory);

export default router;


