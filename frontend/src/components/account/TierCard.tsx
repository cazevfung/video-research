'use client';

/**
 * TierCard Component
 * Phase 3: Current tier display with benefits and upgrade button
 */

import * as React from 'react';
import { User, TierStatus } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { Check, Crown, Zap, Star, AlertCircle } from 'lucide-react';
import { useTierContext } from '@/contexts/UserDataContext';
import { 
  tierConfig, 
  getTierColorClasses, 
  formatTierName,
  type UserTier 
} from '@/config/tier';

interface TierCardProps {
  user: User | null;
  loading?: boolean;
  /** Callback when upgrade button is clicked */
  onUpgradeClick?: () => void;
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

export function TierCard({ user, loading: initialLoading, onUpgradeClick }: TierCardProps) {
  const { tierStatus, loading: tierLoading } = useTierContext();

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  if (initialLoading || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tier</CardTitle>
          <CardDescription>Your current subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn("space-y-4")}>
            <div className={cn("h-8 w-32", colors.background.tertiary, "rounded animate-pulse")} />
            <div className={cn("h-4 w-full", colors.background.tertiary, "rounded animate-pulse")} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const tier = user.tier as UserTier;
  const tierInfo = tierConfig[tier as keyof typeof tierConfig];
  const tierDisplay = formatTierName(tier);
  const TierIcon = getTierIcon(tier);
  const benefits = tierInfo.benefits;
  const pendingRequest = tierStatus?.pendingRequest;
  const isFreeTier = tier === 'free';
  const colorClasses = getTierColorClasses(tier);

  return (
    <Card>
      <CardHeader>
        <div className={cn("flex items-center justify-between")}>
          <div>
            <CardTitle className={cn("flex items-center", spacing.gap.sm)}>
              {TierIcon && <TierIcon className={cn("h-5 w-5")} />}
              Current Tier
            </CardTitle>
            <CardDescription>Your subscription tier and benefits</CardDescription>
          </div>
          <span className={cn(
            cn("px-3 py-1 rounded-md font-medium border", typography.fontSize.sm),
            colorClasses
          )}>
            {tierDisplay}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("space-y-4")}>
          {/* Pending Request Status */}
          {pendingRequest && (
            <div className={cn(
              "flex items-center",
              spacing.gap.sm,
              borderRadius.md,
              colors.background.secondary,
              spacing.padding.md,
              "border",
              colors.border.default
            )}>
              <AlertCircle className={cn("h-4 w-4", colors.status.warning)} />
              <div className={cn("flex-1")}>
                <div className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
                  Upgrade Request Pending
                </div>
                <div className={cn(typography.fontSize.xs, colors.text.secondary)}>
                  Requested: {formatTierName(pendingRequest.requestedTier as UserTier)} • Status: {pendingRequest.status}
                </div>
              </div>
            </div>
          )}

          {/* Tier Benefits */}
          <div>
            <h4 className={cn(typography.fontSize.sm, typography.fontWeight.semibold, colors.text.primary, spacing.marginBottom.sm)}>
              Tier Benefits
            </h4>
            <ul className={cn("space-y-2")}>
              {benefits.map((benefit: string, index: number) => (
                <li key={index} className={cn("flex items-start", spacing.gap.sm)}>
                  <Check className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.status.success)} />
                  <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
      {(isFreeTier || pendingRequest) && (
        <CardFooter>
          <Button
            onClick={handleUpgrade}
            disabled={tierLoading || !!pendingRequest}
            className={cn("w-full")}
          >
            {pendingRequest ? (
              <>
                <AlertCircle className={cn("mr-2 h-4 w-4")} />
                Upgrade Request Pending
              </>
            ) : (
              <>
                <Crown className={cn("mr-2 h-4 w-4")} />
                Upgrade Plan
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

