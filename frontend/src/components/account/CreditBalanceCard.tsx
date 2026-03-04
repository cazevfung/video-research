'use client';

/**
 * CreditBalanceCard Component
 * Phase 3: Large credit balance display with breakdown and reset information
 */

import * as React from 'react';
import { UserQuota, UserCredits } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { safeFormatDate } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { CreditCard, TrendingUp, TrendingDown, RefreshCw, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { routes } from '@/config/routes';
import { getCreditStatusColor, getCreditStatusBackgroundColor } from '@/config/credits';

interface CreditBalanceCardProps {
  quota: UserQuota | null;
  credits: UserCredits | null;
  loading?: boolean;
}

export function CreditBalanceCard({ quota, credits, loading }: CreditBalanceCardProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  
  /**
   * Format reset time for display (localized)
   */
  const formatResetTime = (resetTime: string | undefined): string => {
    if (!resetTime) return 'N/A';
    return safeFormatDate(resetTime, 'MMM d, h:mm a', 'N/A', i18n.language);
  };
  
  if (loading || !quota) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("space-y-4")}>
            <div className={cn("h-16 w-32", colors.background.tertiary, "rounded animate-pulse")} />
            <div className={cn("h-4 w-full", colors.background.tertiary, "rounded animate-pulse")} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const creditsRemaining = quota.credits_remaining;
  const dailyLimit = quota.daily_limit;
  const percentage = dailyLimit != null && dailyLimit > 0 ? (creditsRemaining / dailyLimit) * 100 : 100;
  const creditColor = getCreditStatusColor(percentage);

  return (
    <Card>
      <CardHeader>
        <div className={cn("flex items-center justify-between")}>
          <div>
            <CardTitle className={cn("flex items-center", spacing.gap.sm)}>
              <CreditCard className={cn("h-5 w-5")} />
              Credit Balance
            </CardTitle>
            <CardDescription>Your current credit status</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("space-y-6")}>
          {/* Large Balance Display */}
          <div className={cn("text-center", spacing.vertical.md)}>
            <div className={cn(
              typography.fontSize.xl,
              typography.fontWeight.bold,
              creditColor,
              spacing.marginBottom.sm
            )}>
              {creditsRemaining}
            </div>
            <div className={cn(typography.fontSize.base, colors.text.secondary)}>
              of {dailyLimit} credits remaining
            </div>
            
            {/* Progress Bar */}
            <div className={cn(
              "w-full h-3 rounded-full overflow-hidden",
              colors.background.tertiary,
              spacing.marginTop.md
            )}>
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  getCreditStatusBackgroundColor(percentage)
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Credit Breakdown */}
          {credits && (
            <div className={cn("grid grid-cols-2 gap-4", spacing.paddingTop.md)}>
              <div className={cn(
                borderRadius.md,
                colors.background.secondary,
                spacing.padding.md,
                "border",
                colors.border.default
              )}>
                <div className={cn("flex items-center", spacing.gap.sm, spacing.marginBottom.xs)}>
                  <TrendingUp className={cn("h-4 w-4", colors.status.success)} />
                  <span className={cn(typography.fontSize.base, colors.text.secondary)}>
                    Total Earned
                  </span>
                </div>
                <div className={cn(typography.fontSize.lg, typography.fontWeight.semibold, colors.text.primary)}>
                  {credits.totalEarned || 0}
                </div>
              </div>

              <div className={cn(
                borderRadius.md,
                colors.background.secondary,
                spacing.padding.md,
                "border",
                colors.border.default
              )}>
                <div className={cn("flex items-center", spacing.gap.sm, spacing.marginBottom.xs)}>
                  <TrendingDown className={cn("h-4 w-4", colors.status.error)} />
                  <span className={cn(typography.fontSize.base, colors.text.secondary)}>
                    Total Spent
                  </span>
                </div>
                <div className={cn(typography.fontSize.lg, typography.fontWeight.semibold, colors.text.primary)}>
                  {credits.totalSpent || 0}
                </div>
              </div>
            </div>
          )}

          {/* Reset Information */}
          <div className={cn(
            "flex items-center justify-between",
            borderRadius.md,
            colors.background.secondary,
            spacing.padding.md,
            "border",
            colors.border.default
          )}>
            <div className={cn("flex items-center", spacing.gap.sm)}>
              <RefreshCw className={cn("h-4 w-4", colors.text.secondary)} />
              <div>
                <div className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
                  Next Reset
                </div>
                <div className={cn(typography.fontSize.base, colors.text.secondary)}>
                  {formatResetTime(quota.reset_time)}
                </div>
              </div>
            </div>
          </div>

          {/* View Transactions Button */}
          <Button
            variant="outline"
            className={cn("w-full")}
            onClick={() => router.push(routes.accountCredits)}
          >
            <ExternalLink className={cn("mr-2 h-4 w-4")} />
            View Transaction History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

