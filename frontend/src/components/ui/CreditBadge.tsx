'use client';

/**
 * CreditBadge Component
 * Phase 5: Optional header badge for credit display
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { routes } from '@/config/routes';
import { useQuota } from '@/contexts/UserDataContext';
import { getCreditStatusColor, creditDisplay } from '@/config/credits';

interface CreditBadgeProps {
  /**
   * Whether to show the badge (controlled by config)
   */
  show?: boolean;
  /**
   * Whether to make it clickable (navigate to credits page)
   */
  clickable?: boolean;
}

export function CreditBadge({ show = creditDisplay.showHeaderBadge, clickable = true }: CreditBadgeProps) {
  const router = useRouter();
  const { quota, loading } = useQuota();

  // Don't render if disabled in config
  if (!show) {
    return null;
  }

  if (loading || !quota) {
    return (
      <div className={cn(
        "h-8 w-20 rounded",
        colors.background.tertiary,
        "animate-pulse"
      )} />
    );
  }

  const creditsRemaining = quota.credits_remaining;
  const dailyLimit = quota.daily_limit;
  const percentage = dailyLimit != null && dailyLimit > 0 ? (creditsRemaining / dailyLimit) * 100 : 100;
  const statusColor = getCreditStatusColor(percentage);

  const handleClick = () => {
    if (clickable) {
      router.push(routes.accountCredits);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "flex items-center",
        spacing.gap.sm,
        borderRadius.md,
        colors.background.secondary,
        "border",
        colors.border.default,
        clickable && "hover:border-theme-border-strong cursor-pointer",
        !clickable && "cursor-default"
      )}
    >
      <CreditCard className={cn("h-4 w-4", statusColor)} />
      <span className={cn(
        typography.fontSize.sm,
        typography.fontWeight.medium,
        statusColor
      )}>
        {creditsRemaining}/{dailyLimit}
      </span>
    </Button>
  );
}

