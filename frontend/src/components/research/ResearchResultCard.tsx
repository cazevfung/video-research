"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarkdownStreamer } from "@/components/dashboard/MarkdownStreamer";
import { StreamingProgress } from "@/components/dashboard/StreamingProgress";
import { SelectedVideosList } from "./SelectedVideosList";
import { ShimmerEffect } from "./ShimmerEffect";
import { ResearchActionButtons } from "@/components/shared/ResearchActionButtons";
import { useToast } from "@/contexts/ToastContext";
import type { ResearchResponse, SelectedVideo } from "@/types";
import { useSafeFormatDate, isValidDate } from "@/utils/date";
import { typography, spacing, colors, cardConfig, streamingConfig, contentActionsLayoutConfig } from "@/config/visual-effects";
import { researchDisplayConfig } from "@/config/research";
import { markdownMessages } from "@/config/messages";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { CitationContent } from "@/components/shared/CitationContent";
import type { CitationMetadata, CitationUsageMap } from "@/types/citations";
import { generateCitationMap } from "@/utils/citationMapper";

export interface ResearchResultCardProps {
  research: ResearchResponse | null;
  streamedText: string;
  isStreaming: boolean;
  progress?: number;
  title?: string | null;
  selectedVideos?: SelectedVideo[];
  className?: string;
}

/**
 * ResearchResultCard Component
 * Displays final research summary with markdown rendering and action buttons
 * 
 * Features:
 * - Markdown rendering (reuse MarkdownStreamer)
 * - Streaming text works smoothly
 * - Selected videos list displays
 * - Copy button works
 * - Responsive layout
 */
export const ResearchResultCard = React.memo(function ResearchResultCard({
  research,
  streamedText,
  isStreaming,
  progress,
  title,
  selectedVideos = [],
  className = "",
}: ResearchResultCardProps) {
  const { t } = useTranslation('research');
  const toast = useToast();

  const citationMetadata = React.useMemo((): CitationMetadata | null | undefined => {
    if (!research) return undefined;
    const citations = (research as any).citations as CitationMetadata | undefined;
    if (citations) return citations;
    if (research.selected_videos?.length) {
      const raw = (research as any).raw_video_results ?? (research as any).research_data?.raw_video_results;
      return generateCitationMap(research.selected_videos, raw);
    }
    return null;
  }, [research]);
  const citationUsage = research ? ((research as any).citationUsage as CitationUsageMap | undefined) ?? null : undefined;

  // Determine display text
  const displayText = research?.final_summary_text || streamedText;
  const displayTitle = title || research?.research_query || t('result.researchSummary');

  // Parse and validate date at top level (useMemo for value only, no hooks inside)
  const dateToFormat = React.useMemo(() => {
    if (research?.created_at) {
      const date = typeof research.created_at === 'string'
        ? new Date(research.created_at)
        : research.created_at;
      return isValidDate(date) ? date : null;
    }
    return null;
  }, [research?.created_at]);

  // Call hook at top level unconditionally (config from researchDisplayConfig)
  const formattedDate = useSafeFormatDate(
    dateToFormat,
    researchDisplayConfig.dateFormat,
    researchDisplayConfig.dateFormatFallback
  );

  // Phase 7: Show shimmer effect when streaming starts but no content yet
  const showShimmer = isStreaming && !displayText && !research;

  // Show videos from prop or from saved research so the "Selected Videos" section is never missing
  const videosToShow = React.useMemo(() => {
    if (selectedVideos?.length) return selectedVideos;
    const fromResearch = research?.selected_videos;
    if (Array.isArray(fromResearch) && fromResearch.length > 0) return fromResearch as SelectedVideo[];
    return [];
  }, [selectedVideos, research?.selected_videos]);

  const researchId = research?._id || (research as any)?.id;
  if (process.env.NODE_ENV === 'development' && research && !researchId) {
    console.debug('[ResearchResultCard] Research object missing ID:', {
      hasResearch: !!research,
      hasUnderscoreId: !!research._id,
      hasId: !!(research as any)?.id,
      researchKeys: Object.keys(research),
    });
  }

  return (
    <div className={cn("flex flex-col min-h-0 w-full min-w-0", className)}>
      <div className={contentActionsLayoutConfig.row}>
        <Card className={cn(
          cardConfig.borderRadius,
          cardConfig.border,
          cardConfig.background,
          cardConfig.padding,
          "relative overflow-hidden flex-1 min-w-0 flex flex-col min-h-0"
        )}>
          {showShimmer && <ShimmerEffect overlay />}
          {/* Header: title + date only (actions are outside) */}
          <div className={cn("flex flex-col", spacing.marginBottom.lg, spacing.gap.md)}>
            <h2 className={cn(
              typography.fontSize.xl,
              typography.fontWeight.bold,
              colors.text.primary,
              spacing.marginBottom.sm,
              "break-words"
            )}>
              {displayTitle}
            </h2>
            {formattedDate && (
              <p className={cn(typography.fontSize.sm, colors.text.tertiary)}>
                {t('result.createdAt', { date: formattedDate })}
              </p>
            )}
          </div>

          {videosToShow.length > 0 && (
            <div className={cn(spacing.marginBottom.lg)}>
              <SelectedVideosList videos={videosToShow} />
            </div>
          )}

          {isStreaming && progress !== undefined && (
            <div className={cn(spacing.paddingTop.sm, spacing.marginBottom.md)}>
              <StreamingProgress progress={progress} />
            </div>
          )}

          <CitationContent citationMetadata={citationMetadata} citationUsage={citationUsage}>
            <div className={cn("min-w-0 break-words", videosToShow.length > 0 && "mt-6 pt-2")}>
              {(displayText || isStreaming) && (
                <h3 className={cn(typography.fontSize.lg, typography.fontWeight.semibold, colors.text.primary, "mb-3")}>
                  {t('result.researchSummary')}
                </h3>
              )}
              <MarkdownStreamer
                content={displayText}
                isStreaming={isStreaming}
                onError={() => toast.warning(markdownMessages.renderFallback)}
              />
            </div>
          </CitationContent>
        </Card>

        {/* Actions outside content column (same config as ResultCard) */}
        <div className={contentActionsLayoutConfig.actionsColumn}>
          <div className={cn(...contentActionsLayoutConfig.actionsInner)}>
            {researchId ? (
              <ResearchActionButtons
                researchId={researchId}
                researchType="research"
                content={displayText}
                title={displayTitle}
                showShare={true}
                showCopy={true}
                showExport={false}
                showDelete={false}
                shareSource="header"
                buttonSize={contentActionsLayoutConfig.actionButtons.size}
                buttonVariant={contentActionsLayoutConfig.actionButtons.variant}
              />
            ) : (
              <Button
                variant={contentActionsLayoutConfig.actionButtons.variant}
                size={contentActionsLayoutConfig.actionButtons.size}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(displayText);
                    toast.success(t('toasts.copiedToClipboard'));
                  } catch (err) {
                    toast.error(t('toasts.failedToCopy', 'Failed to copy'));
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                {t('result.copy')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
