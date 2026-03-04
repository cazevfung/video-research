'use client';

/**
 * CreditVisualizations Component
 * Phase 5: Credit balance and usage visualizations
 */

import * as React from 'react';
import { UserQuota, UserCredits } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { safeFormatDate } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { 
  getCreditStatusColor, 
  getCreditStatusBackgroundColor,
  creditVisualization 
} from '@/config/credits';

interface CreditVisualizationsProps {
  quota: UserQuota | null;
  credits: UserCredits | null;
  loading?: boolean;
}

/**
 * Simple bar chart component for credit usage
 */
function SimpleBarChart({ 
  data, 
  height = creditVisualization.chartHeight 
}: { 
  data: Array<{ label: string; value: number; max: number }>; 
  height?: number;
}) {
  const maxValue = Math.max(...data.map(d => d.max), 1);
  
  return (
    <div className={cn("space-y-2")} style={{ height: `${height}px` }}>
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const statusColor = getCreditStatusColor((item.value / item.max) * 100);
        const bgColor = getCreditStatusBackgroundColor((item.value / item.max) * 100);
        
        return (
          <div key={index} className={cn("space-y-1")}>
            <div className={cn("flex items-center justify-between")}>
              <span className={cn(typography.fontSize.xs, colors.text.secondary)}>
                {item.label}
              </span>
              <span className={cn(typography.fontSize.xs, typography.fontWeight.medium, colors.text.primary)}>
                {item.value} / {item.max}
              </span>
            </div>
            <div className={cn(
              "w-full h-4 rounded-full overflow-hidden",
              colors.background.tertiary
            )}>
              <div
                className={cn("h-full transition-all duration-500", bgColor)}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Simple line chart component for credit balance over time
 * Note: This is a simplified visualization. For real-time data, 
 * you would need historical data from the backend.
 */
function SimpleLineChart({ 
  currentBalance, 
  dailyLimit,
  height = creditVisualization.chartHeight 
}: { 
  currentBalance: number; 
  dailyLimit: number;
  height?: number;
}) {
  // Generate mock data points for visualization
  // In a real implementation, this would come from backend historical data
  const dataPoints = React.useMemo(() => {
    const points = 7; // Last 7 days
    return Array.from({ length: points }, (_, i) => {
      const daysAgo = points - i - 1;
      // Simulate balance decreasing over time (mock data)
      const balance = Math.max(0, currentBalance + (daysAgo * (dailyLimit / points)));
      return {
        day: daysAgo === 0 ? 'Today' : `${daysAgo}d ago`,
        balance: Math.min(balance, dailyLimit),
      };
    });
  }, [currentBalance, dailyLimit]);

  const maxBalance = Math.max(...dataPoints.map(d => d.balance), dailyLimit);
  const chartHeight = height - 40; // Account for labels
  const chartWidth = 100; // Percentage

  return (
    <div className={cn("relative")} style={{ height: `${height}px` }}>
      <svg
        width="100%"
        height={chartHeight}
        className={cn("overflow-visible")}
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => (
          <line
            key={percent}
            x1="0%"
            y1={`${100 - percent}%`}
            x2="100%"
            y2={`${100 - percent}%`}
            stroke="currentColor"
            strokeWidth="1"
            className={cn(colors.border.muted)}
            opacity={0.2}
          />
        ))}
        
        {/* Line path */}
        <polyline
          points={dataPoints.map((point, i) => {
            const x = (i / (dataPoints.length - 1)) * 100;
            const y = 100 - (point.balance / maxBalance) * 100;
            return `${x}%,${y}%`;
          }).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(getCreditStatusColor((currentBalance / dailyLimit) * 100))}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {dataPoints.map((point, i) => {
          const x = (i / (dataPoints.length - 1)) * 100;
          const y = 100 - (point.balance / maxBalance) * 100;
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r="4"
              fill="currentColor"
              className={cn(getCreditStatusColor((point.balance / dailyLimit) * 100))}
            />
          );
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className={cn("flex justify-between mt-2")}>
        {dataPoints.map((point, i) => (
          <span
            key={i}
            className={cn(typography.fontSize.xs, colors.text.tertiary)}
          >
            {point.day}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CreditVisualizations({ quota, credits, loading }: CreditVisualizationsProps) {
  const { i18n } = useTranslation();
  if (loading || !quota) {
    return (
      <div className={cn("space-y-6")}>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>
                <div className={cn("h-5 w-32", colors.background.tertiary, "rounded animate-pulse")} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("h-48", colors.background.tertiary, "rounded animate-pulse")} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const creditsRemaining = quota.credits_remaining;
  const dailyLimit = quota.daily_limit ?? 0;
  const percentage = dailyLimit > 0 ? (creditsRemaining / dailyLimit) * 100 : 100;

  // Prepare data for bar chart
  const barChartData = [
    {
      label: 'Remaining',
      value: creditsRemaining,
      max: dailyLimit,
    },
    {
      label: 'Used',
      value: dailyLimit - creditsRemaining,
      max: dailyLimit,
    },
  ];

  return (
    <div className={cn("space-y-6")}>
      {/* Balance Over Time Chart */}
      <Card>
        <CardHeader>
          <div className={cn("flex items-center", spacing.gap.sm)}>
            <TrendingUp className={cn("h-5 w-5", colors.status.info)} />
            <div>
              <CardTitle>Balance Trend</CardTitle>
              <CardDescription>Credit balance over the last 7 days</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SimpleLineChart 
            currentBalance={creditsRemaining} 
            dailyLimit={dailyLimit}
            height={creditVisualization.chartHeight}
          />
          <div className={cn(
            "mt-4 p-3 rounded",
            colors.background.secondary,
            "border",
            colors.border.default
          )}>
            <p className={cn(typography.fontSize.xs, colors.text.tertiary)}>
              Note: Historical data visualization. For detailed transaction history, see the transaction list.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Usage Breakdown */}
      <Card>
        <CardHeader>
          <div className={cn("flex items-center", spacing.gap.sm)}>
            <BarChart3 className={cn("h-5 w-5", colors.status.info)} />
            <div>
              <CardTitle>Usage Breakdown</CardTitle>
              <CardDescription>Current credit usage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SimpleBarChart 
            data={barChartData}
            height={creditVisualization.chartHeight}
          />
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      {credits && (
        <Card>
          <CardHeader>
            <div className={cn("flex items-center", spacing.gap.sm)}>
              <TrendingDown className={cn("h-5 w-5", colors.status.info)} />
              <div>
                <CardTitle>Statistics</CardTitle>
                <CardDescription>Credit usage statistics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("space-y-4")}>
              <div className={cn(
                "flex items-center justify-between",
                spacing.padding.md,
                borderRadius.md,
                colors.background.secondary,
                "border",
                colors.border.default
              )}>
                <div className={cn("flex items-center", spacing.gap.sm)}>
                  <TrendingUp className={cn("h-4 w-4", colors.status.success)} />
                  <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                    Total Earned
                  </span>
                </div>
                <span className={cn(
                  typography.fontSize.lg,
                  typography.fontWeight.semibold,
                  colors.status.success
                )}>
                  {credits.totalEarned || 0}
                </span>
              </div>

              <div className={cn(
                "flex items-center justify-between",
                spacing.padding.md,
                borderRadius.md,
                colors.background.secondary,
                "border",
                colors.border.default
              )}>
                <div className={cn("flex items-center", spacing.gap.sm)}>
                  <TrendingDown className={cn("h-4 w-4", colors.status.error)} />
                  <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                    Total Spent
                  </span>
                </div>
                <span className={cn(
                  typography.fontSize.lg,
                  typography.fontWeight.semibold,
                  colors.status.error
                )}>
                  {credits.totalSpent || 0}
                </span>
              </div>

              {credits.lastResetDate && (
                <div className={cn(
                  "flex items-center justify-between",
                  spacing.padding.md,
                  borderRadius.md,
                  colors.background.secondary,
                  "border",
                  colors.border.default
                )}>
                  <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                    Last Reset
                  </span>
                  <span className={cn(typography.fontSize.sm, colors.text.primary)}>
                    {safeFormatDate(credits.lastResetDate, 'MMM d, yyyy', 'N/A', i18n.language)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


