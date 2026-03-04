"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { ApprovalCard } from "./ApprovalCard";
import { cn } from "@/lib/utils";
import { colors, typography, spacing, borderRadius, animationDurations, sourceVideosConfig } from "@/config/visual-effects";
import type { SelectedVideo } from "@/types";
import { useConfig } from "@/hooks/useConfig";

export interface VideoApprovalCardProps {
  videos: SelectedVideo[];
  questions?: string[];
  researchQuery: string;
  feedbackCount: number;
  isProcessing: boolean;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
}

/**
 * VideoApprovalCard Component
 * Phase 3: Approval card specifically for video selection
 * 
 * Features:
 * - Displays selected videos with thumbnails
 * - Shows selection rationale
 * - Uses ApprovalCard for common functionality
 * - Config-driven regeneration limits
 */
export function VideoApprovalCard({
  videos,
  questions,
  researchQuery,
  feedbackCount,
  isProcessing,
  onApprove,
  onRequestChanges,
}: VideoApprovalCardProps) {
  const { t } = useTranslation('research');
  const { config } = useConfig();
  
  const maxFeedbackPerStage = config?.research?.max_feedback_per_stage ?? 1;
  const regenerationsRemaining = maxFeedbackPerStage - feedbackCount;
  const showFeedback = regenerationsRemaining > 0;

  // Classification badge colors
  const getClassificationColor = (classification: SelectedVideo['classification']) => {
    switch (classification) {
      case 'Direct':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'Foundational':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'Contrarian':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const renderVideoItem = (video: SelectedVideo, index: number) => {
    return (
      <motion.div
        key={video.video_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: animationDurations.pageTransition }}
        className={cn(
          sourceVideosConfig.card.display,
          sourceVideosConfig.card.gap,
          sourceVideosConfig.card.borderRadius,
          sourceVideosConfig.card.border,
          sourceVideosConfig.card.background,
          sourceVideosConfig.card.padding,
          "hover:bg-theme-bg-secondary",
          "transition-colors"
        )}
      >
        {/* Thumbnail - wrapper from config for consistent padding */}
        <div className={sourceVideosConfig.thumbnail.wrapperClass}>
          <img
            src={video.thumbnail}
            alt={video.title}
            className={cn(
              sourceVideosConfig.thumbnail.objectFit,
              sourceVideosConfig.thumbnail.objectPosition,
              sourceVideosConfig.thumbnail.borderRadius
            )}
            style={{
              height: sourceVideosConfig.thumbnail.height,
              width: sourceVideosConfig.thumbnail.width,
            }}
          />
        </div>

        {/* Content */}
        <div className={cn(sourceVideosConfig.content.flex)}>
          <div className="flex-1 min-w-0">
            {/* Title and Classification */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={cn(
                sourceVideosConfig.content.title.truncate,
                sourceVideosConfig.content.title.fontWeight,
                sourceVideosConfig.content.title.color
              )}>
                {video.title}
              </p>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium border",
                getClassificationColor(video.classification),
                "flex-shrink-0"
              )}>
                {video.classification}
              </span>
            </div>

            {/* Channel */}
            <p className={cn(
              sourceVideosConfig.content.channel.fontSize,
              sourceVideosConfig.content.channel.color,
              spacing.marginBottom.sm
            )}>
              {video.channel}
            </p>

            {/* Selection Rationale */}
            <div className="space-y-2">
              <div>
                <p className={cn(
                  typography.fontSize.sm,
                  typography.fontWeight.medium,
                  colors.text.secondary,
                  spacing.marginBottom.xs
                )}>
                  {t('approval.videos.whySelected')}:
                </p>
                <p className={cn(
                  typography.fontSize.sm,
                  colors.text.tertiary
                )}>
                  {video.why_selected}
                </p>
              </div>
              <div>
                <p className={cn(
                  typography.fontSize.sm,
                  typography.fontWeight.medium,
                  colors.text.secondary,
                  spacing.marginBottom.xs
                )}>
                  {t('approval.videos.fillsGap')}:
                </p>
                <p className={cn(
                  typography.fontSize.sm,
                  colors.text.tertiary
                )}>
                  {video.fills_gap}
                </p>
              </div>
            </div>

            {/* YouTube Link */}
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                sourceVideosConfig.content.link.marginTop,
                sourceVideosConfig.content.link.display,
                sourceVideosConfig.content.link.gap,
                sourceVideosConfig.content.link.fontSize,
                sourceVideosConfig.content.link.color,
                sourceVideosConfig.content.link.hoverColor,
                sourceVideosConfig.content.link.transition
              )}
            >
              {t('approval.videos.viewOnYouTube')} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <ApprovalCard
      title={t('approval.videos.title')}
      subtitle={t('approval.videos.subtitle', { count: videos.length })}
      items={videos}
      renderItem={renderVideoItem}
      showFeedback={showFeedback}
      onApprove={onApprove}
      onRequestChanges={onRequestChanges}
      feedbackPlaceholder={t('approval.videos.feedbackPlaceholder')}
      regenerationsRemaining={regenerationsRemaining}
      isProcessing={isProcessing}
      contextInfo={
        questions && questions.length > 0 && (
          <div className={cn(
            "p-3 rounded-md",
            "bg-theme-bg-secondary",
            "border border-theme-border-primary"
          )}>
            <p className={cn("text-sm font-medium text-theme-text-secondary mb-2")}>
              {t('approval.videos.researchQuestions')}
            </p>
            <ul className="space-y-1">
              {questions.map((question, idx) => (
                <li key={idx} className={cn("text-sm text-theme-text-primary")}>
                  {idx + 1}. {question}
                </li>
              ))}
            </ul>
          </div>
        )
      }
    />
  );
}
