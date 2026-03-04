"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { colors, typography, spacing, borderRadius, animationDurations, layoutConfig } from "@/config/visual-effects";
import type { ResearchStatus } from "@/types";

export type WorkflowStage = 
  | 'query_submitted'
  | 'questions'
  | 'search_terms'
  | 'videos'
  | 'transcripts'
  | 'summary';

export type StageStatus = 
  | 'completed'
  | 'current'
  | 'awaiting'
  | 'processing';

export interface WorkflowProgressTrackerProps {
  currentStatus: ResearchStatus;
  className?: string;
}

/**
 * WorkflowProgressTracker Component
 * Phase 3: Visual progress indicator for enhanced research workflow
 * 
 * Shows workflow stages with status indicators:
 * - Completed: Filled circle (green)
 * - Current: Outline circle (blue, pulsing)
 * - Awaiting: Empty circle (gray)
 * - Processing: Spinner icon
 */
export function WorkflowProgressTracker({
  currentStatus,
  className,
}: WorkflowProgressTrackerProps) {
  const { t } = useTranslation('research');

  // Map current status to workflow stage
  const getCurrentStage = (status: ResearchStatus): WorkflowStage => {
    if (status === 'generating_questions' || status === 'awaiting_question_approval' || status === 'regenerating_questions') {
      return 'questions';
    }
    if (status === 'generating_search_terms' || status === 'awaiting_search_term_approval' || status === 'regenerating_search_terms') {
      return 'search_terms';
    }
    if (status === 'searching_videos' || status === 'videos_found' || status === 'filtering_videos' || status === 'awaiting_video_approval' || status === 'refiltering_videos') {
      return 'videos';
    }
    if (status === 'fetching_transcripts' || status === 'transcripts_ready' || status === 'generating_style_guide') {
      return 'transcripts';
    }
    if (status === 'generating_summary') {
      return 'summary';
    }
    if (status === 'completed') {
      return 'summary';
    }
    return 'query_submitted';
  };

  // Get stage status
  const getStageStatus = (stage: WorkflowStage): StageStatus => {
    const currentStage = getCurrentStage(currentStatus);
    const stageOrder: WorkflowStage[] = ['query_submitted', 'questions', 'search_terms', 'videos', 'transcripts', 'summary'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);

    if (stageIndex < currentIndex) {
      return 'completed';
    }
    if (stageIndex === currentIndex) {
      // If research is completed, mark the current stage as completed
      if (currentStatus === 'completed') {
        return 'completed';
      }
      // Check if it's processing or awaiting
      if (
        currentStatus === 'generating_questions' ||
        currentStatus === 'regenerating_questions' ||
        currentStatus === 'generating_search_terms' ||
        currentStatus === 'regenerating_search_terms' ||
        currentStatus === 'searching_videos' ||
        currentStatus === 'videos_found' ||
        currentStatus === 'filtering_videos' ||
        currentStatus === 'refiltering_videos' ||
        currentStatus === 'fetching_transcripts' ||
        currentStatus === 'transcripts_ready' ||
        currentStatus === 'generating_style_guide' ||
        currentStatus === 'generating_summary'
      ) {
        return 'processing';
      }
      return 'current';
    }
    return 'awaiting';
  };

  const stages: Array<{ key: WorkflowStage; label: string }> = [
    { key: 'query_submitted', label: t('workflow.querySubmitted') },
    { key: 'questions', label: t('workflow.questions') },
    { key: 'search_terms', label: t('workflow.searchTerms') },
    { key: 'videos', label: t('workflow.videos') },
    { key: 'transcripts', label: t('workflow.transcripts') },
    { key: 'summary', label: t('workflow.summary') },
  ];

  const config = layoutConfig.workflowProgressTracker;

  return (
    <div className={cn("w-full", config.spacing.rightPadding, className)}>
      <div className={config.spacing.verticalGap}>
        {stages.map((stage) => {
          const status = getStageStatus(stage.key);

          return (
            <div key={stage.key} className={cn("flex items-center", config.spacing.itemGap)}>
              {/* Stage Indicator */}
              <div className="flex items-center">
                {status === 'completed' ? (
                  <motion.div
                    key={`${stage.key}-completed`}
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: animationDurations.pageTransition }}
                  >
                    <CheckCircle2 className={cn(config.iconSize, config.colors.completed)} />
                  </motion.div>
                ) : status === 'processing' ? (
                  <motion.div
                    key={`${stage.key}-processing`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className={cn(config.iconSize, config.colors.processing)} />
                  </motion.div>
                ) : status === 'current' ? (
                  <motion.div
                    key={`${stage.key}-current`}
                    animate={{ scale: [1, 1.2, 1], rotate: 0 }}
                    transition={{ duration: animationDurations.streamingProgressPulse, repeat: Infinity }}
                  >
                    <Circle className={cn(config.iconSize, config.colors.current, "fill-blue-500/20")} />
                  </motion.div>
                ) : (
                  <Circle className={cn(config.iconSize, config.colors.awaiting)} />
                )}
              </div>

              {/* Stage Label */}
              <div className="flex-1">
                <div
                  className={cn(
                    typography.fontSize.sm,
                    typography.fontWeight.medium,
                    status === 'completed' && colors.text.secondary,
                    status === 'current' || status === 'processing' ? colors.text.primary : colors.text.secondary
                  )}
                >
                  {stage.label}
                </div>
                {status === 'current' && currentStatus.includes('awaiting') && (
                  <div className={cn(typography.fontSize.xs, colors.text.secondary, "mt-1")}>
                    {t('workflow.awaitingApproval')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
