'use client';

/**
 * AccountStatistics Component
 * Phase 3: Displays account statistics and usage information
 */

import * as React from 'react';
import { User, UserQuota } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { BarChart3, Video, FileText, Calendar } from 'lucide-react';

interface AccountStatisticsProps {
  user: User | null;
  quota: UserQuota | null;
  loading?: boolean;
}

/**
 * Mock statistics - in a real app, these would come from the backend
 * TODO: Replace with actual API call to GET /api/user/stats when available
 */
const mockStats = {
  totalSummaries: 0,
  totalVideos: 0,
  accountAge: 0,
};

export function AccountStatistics({ user, quota, loading }: AccountStatisticsProps) {
  // Calculate account age
  const accountAge = React.useMemo(() => {
    if (!user?.createdAt) return 0;
    const created = new Date(user.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [user?.createdAt]);

  if (loading || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Your account usage statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn("grid grid-cols-2 gap-4")}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("h-20", colors.background.tertiary, "rounded animate-pulse")} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Total Summaries',
      value: mockStats.totalSummaries.toString(),
      icon: FileText,
      color: colors.status.info,
    },
    {
      label: 'Total Videos',
      value: mockStats.totalVideos.toString(),
      icon: Video,
      color: colors.status.info,
    },
    {
      label: 'Account Age',
      value: `${accountAge} days`,
      icon: Calendar,
      color: colors.status.info,
    },
    {
      label: 'Daily Limit',
      value: quota?.daily_limit != null ? quota.daily_limit.toString() : 'Unlimited',
      icon: BarChart3,
      color: colors.status.info,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
        <CardDescription>Your account usage statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn("grid grid-cols-2 gap-4")}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={cn(
                  borderRadius.md,
                  colors.background.secondary,
                  spacing.padding.md,
                  "border",
                  colors.border.default,
                  "flex flex-col",
                  spacing.vertical.sm
                )}
              >
                <div className={cn("flex items-center", spacing.gap.sm)}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                  <span className={cn(typography.fontSize.xs, colors.text.secondary)}>
                    {stat.label}
                  </span>
                </div>
                <div className={cn(typography.fontSize['2xl'], typography.fontWeight.bold, colors.text.primary)}>
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


