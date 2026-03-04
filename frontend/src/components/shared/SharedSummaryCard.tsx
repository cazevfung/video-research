"use client";

import * as React from "react";
import { Card } from "@/components/ui/Card";
import { MarkdownStreamer } from "@/components/dashboard/MarkdownStreamer";
import { SourceVideosList } from "@/components/dashboard/SourceVideosList";
import type { SummaryResponse } from "@/types";
import { useSafeFormatDate, isValidDate } from "@/utils/date";
import { typography, spacing, colors, cardConfig } from "@/config/visual-effects";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface SharedSummaryCardProps {
  summary: SummaryResponse;
  className?: string;
}

/**
 * SharedSummaryCard Component
 * Read-only version for public shared summary pages
 *
 * Features:
 * - No edit/delete/share buttons
 * - Displays share metadata (shared date, view count) via parent
 */
export const SharedSummaryCard = React.memo(function SharedSummaryCard({
  summary,
  className = "",
}: SharedSummaryCardProps) {
  const { t } = useTranslation('summary');

  const displayText = summary?.final_summary_text || '';
  const displayTitle = summary?.batch_title || 'Summary';
  const sourceVideos = summary?.source_videos ?? [];

  const dateToFormat = React.useMemo(() => {
    if (summary?.created_at) {
      const date = typeof summary.created_at === 'string'
        ? new Date(summary.created_at)
        : summary.created_at;
      return isValidDate(date) ? date : null;
    }
    return null;
  }, [summary?.created_at]);

  const formattedDate = useSafeFormatDate(
    dateToFormat,
    'PPp',
    ''
  );

  return (
    <div className={cn("w-full min-w-0", className)}>
      <Card className={cn(
        cardConfig.borderRadius,
        cardConfig.border,
        cardConfig.background,
        cardConfig.padding,
        "relative overflow-hidden"
      )}>
        {/* Header Section */}
        <div className={cn("flex flex-col", spacing.marginBottom.lg, spacing.gap.md)}>
          <div className="flex-1 min-w-0 break-words">
            <h1 className={cn(
              typography.fontSize.xl,
              typography.fontWeight.bold,
              colors.text.primary,
              spacing.marginBottom.sm,
              "break-words"
            )}>
              {displayTitle}
            </h1>
            {formattedDate && (
              <p className={cn(typography.fontSize.sm, colors.text.tertiary)}>
                {t('result.videoAnalyzed', { count: sourceVideos.length })} • {formattedDate}
              </p>
            )}
          </div>
        </div>

        {/* Source Videos List */}
        {sourceVideos.length > 0 && (
          <div className={cn(spacing.marginBottom.lg)}>
            <SourceVideosList videos={sourceVideos} />
          </div>
        )}

        {/* Content Section */}
        <div className="min-w-0 break-words">
          <MarkdownStreamer
            content={displayText}
            isStreaming={false}
          />
        </div>
      </Card>
    </div>
  );
});
