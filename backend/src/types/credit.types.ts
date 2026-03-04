import { Timestamp } from 'firebase-admin/firestore';

/**
 * User tier type - matches PRD requirements
 */
export type UserTier = 'free' | 'starter' | 'pro' | 'premium';

/**
 * Credit transaction type
 */
export type CreditTransactionType = 'earned' | 'spent' | 'reset' | 'tier_upgrade' | 'purchased' | 'refunded' | 'expired';

/**
 * Tier request status
 */
export type TierRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * User credits document structure
 * Stored in 'user_credits' collection, document ID = userId
 */
export interface UserCredits {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastResetDate: Timestamp;
  tier: UserTier;
  tierUnlockedAt: Timestamp | null;
  tierUnlockedBy: string | null; // Email address that requested unlock
}

/**
 * Credit transaction document structure
 * Stored in 'credit_transactions' collection
 */
export interface CreditTransaction {
  transactionId: string;
  userId: string;
  type: CreditTransactionType;
  amount: number; // Positive for earned/purchased, negative for spent
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata: {
    batchId?: string;
    tierUpgrade?: string; // New tier when upgraded
    purchaseId?: string;
    subscriptionId?: string;
  };
  timestamp: Timestamp;
}

/**
 * Batch cost document structure
 * Stored in 'batch_costs' collection
 */
export interface BatchCost {
  batchId: string;
  userId: string;
  timestamp: Timestamp;
  costs: {
    supadata: {
      creditsUsed: number;
      costUSD: number;
    };
    qwen: {
      model: string; // 'qwen-flash' | 'qwen-plus' | 'qwen-max'
      inputTokens: number;
      outputTokens: number;
      preCondenseTokens?: {
        input: number;
        output: number;
      };
      costUSD: number;
    };
    firebase: {
      writes: number;
      reads: number;
      storageBytes: number;
      costUSD: number;
    };
    totalCostUSD: number;
  };
  creditsCharged: number;
  margin: number; // (creditsCharged * 0.001 - totalCostUSD) / totalCostUSD
}

/**
 * Tier request document structure
 * Stored in 'tier_requests' collection
 */
export interface TierRequest {
  requestId: string;
  userId: string;
  userEmail: string;
  requestedTier: 'starter' | 'pro' | 'premium';
  status: TierRequestStatus;
  requestedAt: Timestamp;
  processedAt: Timestamp | null;
  processedBy: string | null; // Admin email
  notes: string | null;
}

/**
 * Pricing configuration document structure
 * Stored in 'pricing_config' collection, document ID = 'current'
 */
export interface PricingConfig {
  version: number;
  lastUpdated: Timestamp;
  lastUpdatedBy: string;
  tiers: {
    free: {
      credits: number;
      resetFrequency: 'daily';
    };
    starter: {
      credits: number;
      resetFrequency: 'monthly';
    };
    pro: {
      credits: number;
      resetFrequency: 'monthly';
    };
    premium: {
      credits: number;
      resetFrequency: 'monthly';
    };
  };
  creditRates: {
    transcriptPerVideo: number; // 10 credits per video
    aiInputPer1kTokens: number; // 0.1 credits per 1k tokens
    aiOutputPer1kTokens: {
      free: number; // 0.3 credits per 1k tokens
      premium: number; // 0.6 credits per 1k tokens
    };
    preCondenseInputPer1kTokens: number; // 0.1 credits per 1k tokens
    preCondenseOutputPer1kTokens: number; // 0.5 credits per 1k tokens
  };
  batchPricing: {
    '1': number; // 20 credits
    '2': number; // 30 credits
    '3': number; // 40 credits
    '4-5': number; // 60 credits
    '6-10': number; // 120 credits
    costPerAdditionalVideo: number; // Cost per video beyond the 6-10 range (default: 20)
  };
}

/**
 * Cost breakdown for batch processing
 */
export interface CostBreakdown {
  supadata: {
    creditsUsed: number;
    costUSD: number;
  };
  qwen: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    preCondenseTokens?: {
      input: number;
      output: number;
    };
    costUSD: number;
  };
  firebase: {
    writes: number;
    reads: number;
    storageBytes: number;
    costUSD: number;
  };
  totalCostUSD: number;
}

/**
 * Margin report for analytics
 */
export interface MarginReport {
  startDate: Timestamp;
  endDate: Timestamp;
  totalBatches: number;
  totalCostUSD: number;
  totalCreditsCharged: number;
  totalRevenueUSD: number; // creditsCharged * 0.001
  averageMargin: number; // percentage
  batches: Array<{
    batchId: string;
    userId: string;
    costUSD: number;
    creditsCharged: number;
    margin: number;
    timestamp: Timestamp;
  }>;
}

