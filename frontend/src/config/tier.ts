/**
 * Tier Configuration
 * Phase 6: Centralized tier information configuration
 * All tier-related data should come from this config, not hardcoded in components
 * 
 * This config matches backend values from config.yaml and pricing.service.ts
 */

import { UserTier } from '@/types/user';

// Re-export UserTier for convenience
export type { UserTier };

/**
 * Tier color configuration for UI display
 */
export const tierColors = {
  free: {
    background: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
  },
  starter: {
    background: 'bg-blue-500/20',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
  },
  pro: {
    background: 'bg-purple-500/20',
    text: 'text-purple-500',
    border: 'border-purple-500/30',
  },
  premium: {
    background: 'bg-yellow-500/20',
    text: 'text-yellow-500',
    border: 'border-yellow-500/30',
  },
} as const;

/**
 * Tier configuration matching backend values
 * Credits and limits from backend/config.yaml and pricing.service.ts
 */
export interface TierInfo {
  /** Display name for the tier */
  name: string;
  /** Monthly credits allocated (from backend pricing config) */
  monthlyCredits: number;
  /** Daily request limit (from backend config.yaml) */
  dailyRequestLimit: number;
  /** Maximum videos per batch (from backend config.yaml) */
  maxVideosPerBatch: number;
  /** Default credits (from backend config.yaml) */
  defaultCredits: number;
  /** Credit reset frequency */
  resetFrequency: 'daily' | 'monthly';
  /** AI model used (from backend config.yaml) */
  aiModel: string;
  /** Processing speed/priority */
  processingSpeed: 'standard' | 'faster' | 'fastest';
  /** Monthly price (for display only, not enforced by backend) */
  monthlyPrice: number | null;
  /** List of tier benefits/features */
  benefits: string[];
  /** History retention in days (null = unlimited) */
  historyRetentionDays: number | null;
  /** Whether custom prompts are allowed */
  customPrompts: boolean;
  /** Whether priority support is available */
  prioritySupport: boolean;
  /** Whether API access is available */
  apiAccess: boolean;
}

/**
 * Complete tier information configuration
 * Matches backend values from config.yaml and pricing.service.ts
 */
export const tierConfig: Record<UserTier, TierInfo> = {
  free: {
    name: 'Free',
    monthlyCredits: 120, // From pricing.service.ts: 120 credits/month (daily reset gives 40/day)
    dailyRequestLimit: 3, // From config.yaml: freemium_model.free_tier.daily_request_limit
    maxVideosPerBatch: 3, // From config.yaml: freemium_model.free_tier.max_videos_per_batch
    defaultCredits: 3, // From config.yaml: freemium_model.free_tier.default_credits
    resetFrequency: 'daily', // From pricing.service.ts: resetFrequency: 'daily'
    aiModel: 'qwen-plus', // From config.yaml: ai_models.default_summary
    processingSpeed: 'standard',
    monthlyPrice: null, // Free tier
    benefits: [
      '3 credits per day',
      'Up to 3 videos per batch',
      'Standard processing',
      'Standard AI models',
      'Access to all preset styles',
      'History retention: 30 days',
    ],
    historyRetentionDays: 30,
    customPrompts: false,
    prioritySupport: false,
    apiAccess: false,
  },
  starter: {
    name: 'Starter',
    monthlyCredits: 500, // From pricing.service.ts
    dailyRequestLimit: 10, // Estimated from PRD: 10 batches per day
    maxVideosPerBatch: 5, // From PRD
    defaultCredits: 500, // Monthly allocation
    resetFrequency: 'monthly', // From pricing.service.ts
    aiModel: 'qwen-plus',
    processingSpeed: 'standard',
    monthlyPrice: 4.99, // From PRD
    benefits: [
      '500 credits per month',
      'Up to 10 batches per day',
      'Up to 5 videos per batch',
      'Standard processing',
      'Standard AI models',
      'Access to all preset styles',
      'Custom prompts',
      'History retention: 90 days',
      'Priority support',
    ],
    historyRetentionDays: 90,
    customPrompts: true,
    prioritySupport: true,
    apiAccess: false,
  },
  pro: {
    name: 'Pro',
    monthlyCredits: 2000, // From pricing.service.ts
    dailyRequestLimit: 50, // From PRD: 50 batches per day
    maxVideosPerBatch: 10, // From PRD
    defaultCredits: 2000, // Monthly allocation
    resetFrequency: 'monthly', // From pricing.service.ts
    aiModel: 'qwen-plus', // Default, with option for qwen-max (from PRD)
    processingSpeed: 'faster',
    monthlyPrice: 14.99, // From PRD
    benefits: [
      '2,000 credits per month',
      'Up to 50 batches per day',
      'Up to 10 videos per batch',
      'Faster processing',
      'Advanced AI models',
      'Access to all preset styles',
      'Custom prompts',
      'History retention: 1 year',
      'Priority support',
      'API access (future)',
    ],
    historyRetentionDays: 365,
    customPrompts: true,
    prioritySupport: true,
    apiAccess: false, // Future feature
  },
  premium: {
    name: 'Premium',
    monthlyCredits: 5000, // From pricing.service.ts
    dailyRequestLimit: 50, // From config.yaml: freemium_model.premium_tier.daily_request_limit (used as max)
    maxVideosPerBatch: 10, // From config.yaml: freemium_model.premium_tier.max_videos_per_batch
    defaultCredits: 50, // From config.yaml: freemium_model.premium_tier.default_credits (daily reset)
    resetFrequency: 'monthly', // From pricing.service.ts
    aiModel: 'qwen-max', // From config.yaml: ai_models.premium_summary
    processingSpeed: 'fastest',
    monthlyPrice: 29.99, // From PRD
    benefits: [
      '5,000 credits per month',
      'Unlimited batches per day (within rate limits)',
      'Up to 10 videos per batch',
      'Priority processing',
      'Advanced AI models (qwen-max)',
      'Access to all preset styles',
      'Custom prompts',
      'History retention: Unlimited',
      'Email support',
      'Early access to features',
      'API access (future)',
      'Advanced features (future)',
    ],
    historyRetentionDays: null, // Unlimited
    customPrompts: true,
    prioritySupport: true,
    apiAccess: false, // Future feature
  },
};

/**
 * Get tier information by tier name
 */
export function getTierInfo(tier: UserTier): TierInfo {
  return tierConfig[tier];
}

/**
 * Get tier color classes for UI
 */
export function getTierColorClasses(tier: UserTier): string {
  const colors = tierColors[tier];
  return `${colors.background} ${colors.text} ${colors.border}`;
}

/**
 * Get all available tiers for comparison
 */
export function getAllTiers(): UserTier[] {
  return ['free', 'starter', 'pro', 'premium'];
}

/**
 * Get upgradeable tiers (excludes current tier)
 */
export function getUpgradeableTiers(currentTier: UserTier): UserTier[] {
  const allTiers = getAllTiers();
  const currentIndex = allTiers.indexOf(currentTier);
  return allTiers.slice(currentIndex + 1);
}

/**
 * Format tier name for display
 */
export function formatTierName(tier: UserTier): string {
  return tierConfig[tier].name;
}

