/**
 * User routes
 * Handles user-related endpoints
 */

import { Router } from 'express';
import { getQuota, updateProfile, getSettings, updateSettings, updateLanguagePreference } from '../controllers/user.controller';
import { getCreditTransactionsHistory } from '../controllers/credits.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/user/quota
 * Get quota information for current user
 * Returns dynamic credit balance (from new system if migrated, legacy otherwise)
 * Requires authentication
 */
router.get('/quota', requireAuth, getQuota);

/**
 * PATCH /api/user/profile
 * Update user profile (name, email, language_preference)
 * Requires authentication
 */
router.patch('/profile', requireAuth, updateProfile);

/**
 * GET /api/user/credits/transactions
 * Get credit transaction history with pagination
 * Requires authentication
 * Query params: page (default: 1), limit (default: 20, max: 100)
 * This is an alias for /api/credits/transactions for consistency
 */
router.get('/credits/transactions', requireAuth, getCreditTransactionsHistory);

/**
 * GET /api/user/settings
 * Get user settings
 * Returns default settings if user has no settings saved
 * Requires authentication
 */
router.get('/settings', requireAuth, getSettings);

/**
 * PATCH /api/user/settings
 * Update user settings (partial update supported)
 * Requires authentication
 */
router.patch('/settings', requireAuth, updateSettings);

/**
 * PATCH /api/user/language
 * Update user language preference
 * This is the dedicated endpoint for language changes (Phase 1: Language Settings Unification)
 * Updates user.language_preference field (single source of truth)
 * Requires authentication
 */
router.patch('/language', requireAuth, updateLanguagePreference);

export default router;

