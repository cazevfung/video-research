"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { MarkdownStreamer } from "./MarkdownStreamer";
import { StreamingProgress } from "./StreamingProgress";
import { SourceVideosList } from "./SourceVideosList";
import { ResearchActionButtons } from "@/components/shared/ResearchActionButtons";
import type { SummaryResponse } from "@/types";
import { useSafeFormatDate, isValidDate } from "@/utils/date";
import { CitationContent } from "@/components/shared/CitationContent";
import { generateCitationMapFromSourceVideos } from "@/utils/citationMapper";
import { typography, spacing, colors, animationDurations, cardConfig, streamingConfig, contentActionsLayoutConfig } from "@/config/visual-effects";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ResultCardProps {
  summary: SummaryResponse | null;
  streamedText: string;
  isStreaming: boolean;
  progress?: number; // Progress percentage (85-99% during streaming)
  title?: string | null; // Phase 3: AI-generated title (quick or refined)
  submittedUrls?: string[]; // Submitted URLs for showing source videos from the beginning
  className?: string;
}

/**
 * ResultCard Component
 * Displays the final summary with markdown rendering and action buttons
 * Matches PRD Section 5.3.1 specifications
 * Phase 7: Optimized with React.memo
 * 
 * Phase 2 (Unified Layout): Optimized for flex container usage
 * - Works properly in flex-1 container (takes remaining space)
 * - Proper overflow handling for long content
 * - Height constraints work correctly in flex context
 */
export const ResultCard = React.memo(function ResultCard({
  summary,
  streamedText,
  isStreaming,
  progress,
  title,
  submittedUrls = [],
  className = "",
}: ResultCardProps) {
  const { t } = useTranslation('summary');

  const sourceVideos = summary?.source_videos ?? (summary as any)?.sourceVideos;
  const citationMetadata = React.useMemo(
    () => (sourceVideos?.length ? generateCitationMapFromSourceVideos(sourceVideos) : undefined),
    [summary]
  );

  const displayText = summary?.final_summary_text || streamedText;
  const displayTitle = title || summary?.batch_title || "Summary";
  const videoCount = summary?.source_videos?.length || summary?.video_count || 0;
  // Format created_at if available and valid, otherwise use current date as fallback
  const dateToFormat = (summary?.created_at && isValidDate(summary.created_at)) 
    ? summary.created_at 
    : new Date();
  const createdAt = useSafeFormatDate(dateToFormat, "PPp", "Unknown date");

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      <div className={contentActionsLayoutConfig.row}>
        {/* Content column: full width (unchanged from original), no space taken by buttons */}
        <Card className={cn(
          cardConfig.background,
          cardConfig.borderRadius,
          cardConfig.border,
          spacing.container.cardPaddingMobile,
          "space-y-6",
          "flex-1 min-w-0 flex flex-col min-h-0 overflow-y-auto"
        )}>
          <div className={cn("flex flex-col", spacing.gap.md)}>
            <motion.h2
              key={displayTitle}
              initial={{ opacity: 0, y: -streamingConfig.textChunk.initialY }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: streamingConfig.textChunk.initialY / 2 }}
              transition={{ duration: animationDurations.textChunkFadeIn }}
              className={cn(
                typography.fontSize["2xl"],
                typography.fontWeight.bold,
                spacing.margin.md,
                colors.text.primary
              )}
            >
              {displayTitle}
            </motion.h2>
            <div className={cn(
              "flex flex-wrap items-center",
              spacing.gap.md,
              typography.fontSize.base,
              colors.text.tertiary
            )}>
              <span>{t('result.videoAnalyzed', { count: videoCount })}</span>
              {createdAt && <span>• {createdAt}</span>}
            </div>
          </div>

          {/* Source Videos List */}
          {(() => {
            if (summary?.source_videos && summary.source_videos.length > 0) {
              return <SourceVideosList videos={summary.source_videos} />;
            }
            if (submittedUrls.length > 0) {
              const fallbackVideos = submittedUrls.map(url => ({
                url,
                title: url,
                channel: '',
                thumbnail: undefined,
              }));
              return <SourceVideosList videos={fallbackVideos} />;
            }
            return null;
          })()}

          {isStreaming && progress !== undefined && (
            <div className="pt-2">
              <StreamingProgress progress={progress} />
            </div>
          )}

          <CitationContent citationMetadata={citationMetadata}>
            <div>
              <MarkdownStreamer content={displayText} isStreaming={isStreaming} />
            </div>
          </CitationContent>
        </Card>

        {/* Buttons outside content column (config: contentActionsLayoutConfig) */}
        <div className={contentActionsLayoutConfig.actionsColumn}>
          <div className={cn(...contentActionsLayoutConfig.actionsInner)}>
            <ResearchActionButtons
              researchId={summary?._id}
              researchType="summary"
              content={displayText}
              title={displayTitle}
              showCopy={true}
              showShare={!!summary?._id}
              showExport={true}
              showDelete={false}
              shareSource="card"
              buttonSize={contentActionsLayoutConfig.actionButtons.size}
              buttonVariant={contentActionsLayoutConfig.actionButtons.variant}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

