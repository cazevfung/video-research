'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { colors, spacing, borderRadius, historyConfig } from '@/config/visual-effects';
import { cn } from '@/lib/utils';

/**
 * Summary Card Skeleton Component
 * Loading skeleton for individual summary cards
 */
export function SummaryCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className={cn('h-6 w-3/4', colors.background.tertiary, borderRadius.md, spacing.margin.sm)} />
        <div className={cn('h-4 w-1/2', colors.background.tertiary, borderRadius.md)} />
      </CardHeader>
      <CardContent>
        <div className={cn('flex', spacing.gap.sm, spacing.margin.md)}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                `${historyConfig.thumbnail.height}px ${historyConfig.thumbnail.width}px`,
                colors.background.tertiary,
                borderRadius.md
              )}
            />
          ))}
        </div>
        <div className={cn('h-4 w-1/4', colors.background.tertiary, borderRadius.md)} />
      </CardContent>
    </Card>
  );
}

/**
 * Summary Grid Skeleton Component
 * Loading skeleton for the summary grid
 */
export function SummaryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={`grid ${historyConfig.grid.mobile} ${historyConfig.grid.tablet} ${historyConfig.grid.desktop} ${historyConfig.grid.gap}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SummaryCardSkeleton key={i} />
      ))}
    </div>
  );
}



