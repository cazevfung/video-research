'use client';

/**
 * TierComparison Component
 * Phase 6: Displays all tiers side-by-side for comparison
 * Uses centralized tier configuration (no hardcoded values)
 */

import * as React from 'react';
import { UserTier } from '@/types/user';
import { tierConfig, tierColors, getAllTiers, formatTierName, getTierColorClasses } from '@/config/tier';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { Check, Crown, Zap, Star, X } from 'lucide-react';

interface TierComparisonProps {
  /** Current user tier to highlight */
  currentTier?: UserTier;
  /** Callback when a tier is selected */
  onTierSelect?: (tier: UserTier) => void;
  /** Whether to show selection buttons */
  showSelectButtons?: boolean;
}

/**
 * Get tier icon component
 */
function getTierIcon(tier: UserTier) {
  switch (tier) {
    case 'premium':
      return Crown;
    case 'pro':
      return Star;
    case 'starter':
      return Zap;
    default:
      return null;
  }
}

/**
 * TierComparison Component
 * Displays all tiers in a comparison table format
 */
export function TierComparison({ 
  currentTier, 
  onTierSelect,
  showSelectButtons = false 
}: TierComparisonProps) {
  const tiers = getAllTiers();

  // Features to compare across all tiers
  const comparisonFeatures = [
    {
      label: 'Monthly Credits',
      getValue: (tier: UserTier) => {
        const info = tierConfig[tier];
        if (info.resetFrequency === 'daily') {
          return `${info.monthlyCredits} total (${Math.floor(info.monthlyCredits / 30)}/day)`;
        }
        return info.monthlyCredits.toLocaleString();
      },
    },
    {
      label: 'Daily Batches',
      getValue: (tier: UserTier) => {
        const info = tierConfig[tier];
        if (tier === 'premium') return 'Unlimited';
        return info.dailyRequestLimit.toString();
      },
    },
    {
      label: 'Videos per Batch',
      getValue: (tier: UserTier) => tierConfig[tier].maxVideosPerBatch.toString(),
    },
    {
      label: 'AI Model',
      getValue: (tier: UserTier) => tierConfig[tier].aiModel,
    },
    {
      label: 'Processing Speed',
      getValue: (tier: UserTier) => {
        const speed = tierConfig[tier].processingSpeed;
        return speed.charAt(0).toUpperCase() + speed.slice(1);
      },
    },
    {
      label: 'Custom Prompts',
      getValue: (tier: UserTier) => (tierConfig[tier].customPrompts ? 'Yes' : 'No'),
    },
    {
      label: 'History Retention',
      getValue: (tier: UserTier) => {
        const days = tierConfig[tier].historyRetentionDays;
        if (days === null) return 'Unlimited';
        if (days >= 365) return '1 year+';
        if (days >= 90) return '90 days';
        return `${days} days`;
      },
    },
    {
      label: 'Priority Support',
      getValue: (tier: UserTier) => (tierConfig[tier].prioritySupport ? 'Yes' : 'No'),
    },
    {
      label: 'API Access',
      getValue: (tier: UserTier) => (tierConfig[tier].apiAccess ? 'Yes' : 'Coming Soon'),
    },
  ];

  return (
    <div className={cn("w-full overflow-x-auto")}>
      <div 
        className={cn("grid gap-4")} 
        style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(200px, 1fr))` }}
      >
        {tiers.map((tier) => {
          const info = tierConfig[tier];
          const TierIcon = getTierIcon(tier);
          const isCurrentTier = currentTier === tier;
          const colorClasses = getTierColorClasses(tier);

          return (
            <Card
              key={tier}
              className={cn(
                "relative flex flex-col",
                isCurrentTier && "ring-2 ring-offset-2",
                isCurrentTier && tierColors[currentTier].border.replace('/30', '/50')
              )}
            >
              {/* Tier Header */}
              <CardHeader className={cn("text-center")}>
                <div className={cn("flex items-center justify-center", spacing.gap.sm, spacing.marginBottom.sm)}>
                  {TierIcon && <TierIcon className={cn("h-5 w-5", tierColors[tier].text)} />}
                  <CardTitle className={cn(typography.fontSize.lg, typography.fontWeight.bold)}>
                    {info.name}
                  </CardTitle>
                </div>
                
                {/* Price */}
                {info.monthlyPrice !== null ? (
                  <div className={cn("space-y-1")}>
                    <div className={cn(typography.fontSize['2xl'], typography.fontWeight.bold, colors.text.primary)}>
                      ${info.monthlyPrice.toFixed(2)}
                    </div>
                    <div className={cn(typography.fontSize.xs, colors.text.secondary)}>
                      per month
                    </div>
                  </div>
                ) : (
                  <div className={cn(typography.fontSize.xs, colors.text.secondary)}>
                    Free
                  </div>
                )}

                {/* Current Tier Badge */}
                {isCurrentTier && (
                  <div className={cn(
                    cn("absolute top-2 right-2 px-2 py-1 rounded font-medium border", typography.fontSize.xs),
                    colorClasses
                  )}>
                    Current
                  </div>
                )}
              </CardHeader>

              <CardContent className={cn("flex-1 flex flex-col", spacing.padding.md)}>
                {/* Key Features */}
                <div className={cn("space-y-3", spacing.marginBottom.md)}>
                  {comparisonFeatures.map((feature, index) => (
                    <div key={index} className={cn("space-y-1")}>
                      <div className={cn(typography.fontSize.xs, typography.fontWeight.medium, colors.text.secondary)}>
                        {feature.label}
                      </div>
                      <div className={cn(typography.fontSize.sm, colors.text.primary)}>
                        {feature.getValue(tier)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Benefits List */}
                <div className={cn("flex-1", spacing.marginBottom.md)}>
                  <div className={cn(typography.fontSize.xs, typography.fontWeight.semibold, colors.text.primary, spacing.marginBottom.sm)}>
                    Benefits
                  </div>
                  <ul className={cn("space-y-2")}>
                    {info.benefits.map((benefit, index) => (
                      <li key={index} className={cn("flex items-start", spacing.gap.sm)}>
                        <Check className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.status.success)} />
                        <span className={cn(typography.fontSize.xs, colors.text.secondary)}>
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Select Button */}
                {showSelectButtons && onTierSelect && !isCurrentTier && (
                  <button
                    onClick={() => onTierSelect(tier)}
                    className={cn(
                      cn("w-full py-2 px-4 rounded-md font-medium transition-colors", typography.fontSize.sm),
                      "border",
                      colorClasses,
                      "hover:opacity-80",
                      "mt-auto"
                    )}
                  >
                    Select {info.name}
                  </button>
                )}

                {isCurrentTier && (
                  <div className={cn(
                    cn("w-full py-2 px-4 rounded-md font-medium text-center", typography.fontSize.sm),
                    colors.background.secondary,
                    colors.text.secondary,
                    "mt-auto"
                  )}>
                    Current Plan
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

