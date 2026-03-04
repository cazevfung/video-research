"use client";

import * as React from "react";
import { Card } from "@/components/ui/Card";
import { MarkdownStreamer } from "@/components/dashboard/MarkdownStreamer";
import { SelectedVideosList } from "@/components/research/SelectedVideosList";
import type { ResearchResponse, SelectedVideo } from "@/types";
import { useSafeFormatDate, isValidDate } from "@/utils/date";
import { typography, spacing, colors, cardConfig } from "@/config/visual-effects";
import { researchDisplayConfig } from "@/config/research";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { CitationContent } from "@/components/shared/CitationContent";
import type { CitationMetadata, CitationUsageMap } from "@/types/citations";
import { generateCitationMap } from "@/utils/citationMapper";

export interface SharedResearchCardProps {
  research: ResearchResponse;
  selectedVideos?: SelectedVideo[];
  className?: string;
}

/**
 * SharedResearchCard Component
 * Read-only version of ResearchResultCard for public shared pages
 * 
 * Features:
 * - No edit/delete buttons
 * - No share button (already shared)
 * - No user-specific features
 * - Displays share metadata (shared date, view count)
 */
export const SharedResearchCard = React.memo(function SharedResearchCard({
  research,
  selectedVideos = [],
  className = "",
}: SharedResearchCardProps) {
  const { t } = useTranslation('research');

  const citationMetadata = React.useMemo((): CitationMetadata | null => {
    const citations = (research as any).citations as CitationMetadata | undefined;
    if (citations) return citations;
    if (research.selected_videos?.length) {
      const raw = (research as any).raw_video_results ?? (research as any).research_data?.raw_video_results;
      return generateCitationMap(research.selected_videos, raw);
    }
    return null;
  }, [research]);
  const citationUsage = ((research as any).citationUsage as CitationUsageMap | undefined) ?? null;

  // Determine display text
  const displayText = research?.final_summary_text || '';
  const displayTitle = research?.research_query || 'Research Summary';

  // Parse and validate date
  const dateToFormat = React.useMemo(() => {
    if (research?.created_at) {
      const date = typeof research.created_at === 'string'
        ? new Date(research.created_at)
        : research.created_at;
      return isValidDate(date) ? date : null;
    }
    return null;
  }, [research?.created_at]);

  const formattedDate = useSafeFormatDate(
    dateToFormat,
    researchDisplayConfig.dateFormat,
    researchDisplayConfig.dateFormatFallback
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
                {t('result.createdAt', 'Created: {{date}}', { date: formattedDate })}
              </p>
            )}
          </div>
        </div>

        {/* Selected Videos List */}
        {selectedVideos.length > 0 && (
          <div>
            <SelectedVideosList videos={selectedVideos} />
          </div>
        )}

        {/* Content Section – CitationContent sets context so citation hover works */}
        <CitationContent citationMetadata={citationMetadata} citationUsage={citationUsage}>
          <div className="min-w-0 break-words">
            <MarkdownStreamer
              content={displayText}
              isStreaming={false}
            />
          </div>
        </CitationContent>
      </Card>
    </div>
  );
});
