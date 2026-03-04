/**
 * User-related type definitions
 * Phase 1: Foundation - Type definitions for user management features
 */

/**
 * User tier types
 */
export type UserTier = 'free' | 'starter' | 'pro' | 'premium';

/**
 * User data structure from backend
 */
export interface User {
  id: string;
  email: string;
  name: string;
  tier: UserTier;
  createdAt?: string;
  picture?: string;
  language_preference?: string; // ISO 639-1 language code (e.g., 'en', 'es', 'fr')
}

/**
 * User quota information
 * Phase 3: Added system field for debugging (indicates which credit system is in use)
 * Phase 2: Added max_simultaneous_tasks from backend config
 */
export interface UserQuota {
  credits_remaining: number;
  daily_limit: number | null; // null = unlimited (e.g. guest when config guest_access.max_summaries is null)
  max_videos_per_batch: number;
  reset_time: string;
  system?: 'legacy' | 'transactional'; // For debugging - indicates which credit system is active
  max_simultaneous_tasks?: number; // Phase 2: Maximum simultaneous tasks from config
}

/**
 * User credits information
 */
export interface UserCredits {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastResetDate: string;
  tier: string;
}

/**
 * Credit transaction types
 */
export type CreditTransactionType = 
  | 'earned' 
  | 'spent' 
  | 'reset' 
  | 'tier_upgrade' 
  | 'purchased' 
  | 'refunded';

/**
 * Credit transaction structure
 * Phase 3: Added id field to match backend response (backend returns both id and transactionId)
 */
export interface CreditTransaction {
  id?: string; // Backend returns this as primary identifier
  transactionId: string; // Kept for backward compatibility
  type: CreditTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
  metadata?: {
    batchId?: string;
    tierUpgrade?: string;
  };
}

/**
 * Tier status information
 */
export interface TierStatus {
  tier: string;
  balance: number;
  pendingRequest: {
    requestId: string;
    requestedTier: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
  } | null;
}

/**
 * User settings structure
 * 
 * Note: Language preference is now managed via user.language_preference field
 * and updated through the dedicated /api/user/language endpoint.
 * This removes duplicate language fields and ensures single source of truth.
 * Phase 1: Language Settings Unification
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  // language field removed - use user.language_preference instead
  notifications: {
    email: boolean;
    creditLowThreshold: number;
    summaryComplete: boolean;
    tierUpgrade: boolean;
  };
  privacy: {
    dataSharing: boolean;
    analytics: boolean;
  };
  preferences: {
    defaultPreset: string;
    defaultLanguage: string; // Default language for generated summaries (not UI language)
    autoSave: boolean;
  };
}

/**
 * Current user data response from GET /auth/me
 */
export interface CurrentUserData {
  user: User;
  quota: UserQuota;
}

/**
 * Credit balance response from GET /api/credits/balance
 */
export interface CreditBalanceResponse {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastResetDate: string;
  tier: string;
}

/**
 * Credit transactions response from GET /api/credits/transactions
 */
export interface CreditTransactionsResponse {
  transactions: CreditTransaction[];
  pagination: import('./index').PaginationInfo;
}

