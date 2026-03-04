"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { animationDurations, typography, colors, spacing } from "@/config/visual-effects";
import { a11yMessages } from "@/config/messages";
import {
  BACKEND_MESSAGE_TO_I18N_KEY,
  STATUS_MESSAGE_PATTERNS,
  DYNAMIC_MESSAGE_KEYS,
} from "@/config/status-messages";
import { cn } from "@/lib/utils";

interface StatusMessageProps {
  message: string | null;
  progress: number;
  videoCount?: number; // Phase 2: Total number of videos
  completedVideos?: number; // Phase 2: Number of completed videos
}

/**
 * StatusMessage Component
 * Displays current processing status and progress percentage
 * Matches PRD Section 5.2.3 specifications
 * Phase 2: Added video count indication
 */
// Translates using "namespace:key" format from centralized config
function translateByI18nKey(
  i18nKey: string,
  t: (key: string, options?: object) => string
): string {
  return t(i18nKey);
}

// Helper to resolve backend message to translated string (uses centralized config)
function translateBackendMessage(
  message: string | null,
  t: (key: string, options?: object) => string
): string {
  if (!message) return t('summary:processing.processingVideos');

  // Dynamic message patterns (from centralized config)
  const m1 = message.match(STATUS_MESSAGE_PATTERNS.generatedQueriesSearching);
  if (m1) return t(DYNAMIC_MESSAGE_KEYS.generatedQueriesSearching, { count: parseInt(m1[1]) });

  const m2 = message.match(STATUS_MESSAGE_PATTERNS.generatedQuestionsReview);
  if (m2) return t(DYNAMIC_MESSAGE_KEYS.generatedQuestionsReview, { count: parseInt(m2[1]) });

  const m3 = message.match(STATUS_MESSAGE_PATTERNS.generatingQuestionsProgress);
  if (m3) return t(DYNAMIC_MESSAGE_KEYS.generatingQuestionsProgress, { current: parseInt(m3[1]), total: parseInt(m3[2]) });

  const m4 = message.match(STATUS_MESSAGE_PATTERNS.generatingSearchTermsProgress);
  if (m4) return t(DYNAMIC_MESSAGE_KEYS.generatingSearchTermsProgress, { current: parseInt(m4[1]), total: parseInt(m4[2]) });

  const m5 = message.match(STATUS_MESSAGE_PATTERNS.foundVideosFiltering);
  if (m5) return t(DYNAMIC_MESSAGE_KEYS.foundVideosFiltering, { found: parseInt(m5[1]), target: parseInt(m5[2]) });

  const m6 = message.match(STATUS_MESSAGE_PATTERNS.selectedVideosFetching);
  if (m6) return t(DYNAMIC_MESSAGE_KEYS.selectedVideosFetching, { count: parseInt(m6[1]) });

  // Static message mapping (from centralized config)
  const i18nKey = BACKEND_MESSAGE_TO_I18N_KEY[message];
  if (i18nKey) return translateByI18nKey(i18nKey, t);

  // Fallback: raw i18n key or typo (e.g. processing.aggregatingConter, processing.generatingSumma)
  if (message.startsWith('processing.aggregating')) return t('summary:processing.aggregatingContent');
  if (message.startsWith('processing.generating')) return t('summary:processing.generatingSummary');
  if ((message.startsWith('processing.') || message.startsWith('progress.')) && !message.includes(' ')) {
    const ns = message.startsWith('progress.') ? 'research' : 'summary';
    return t(`${ns}:${message}`);
  }
  // Full "namespace:key" format (e.g. from ResearchProgressSidebar status fallback)
  if (/^\w+:\w+[\w.]*$/.test(message) && message.includes(':')) return t(message);

  return message;
}

export const StatusMessage = React.memo(function StatusMessage({ 
  message, 
  progress, 
  videoCount, 
  completedVideos 
}: StatusMessageProps) {
  const { t } = useTranslation(['summary', 'research', 'common']);
  const { t: tSummary } = useTranslation('summary');
  // Phase 2: Show video count if available
  const showVideoCount = videoCount !== undefined && videoCount > 0;
  const videoCountText = showVideoCount && completedVideos !== undefined
    ? tSummary('processing.processingVideosCount', { completed: completedVideos, total: videoCount, count: videoCount })
    : showVideoCount
    ? tSummary('processing.videoCount', { count: videoCount })
    : null;
  
  const translatedMessage = translateBackendMessage(message, t as (key: string, options?: object) => string);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: animationDurations.statusMessage }}
      className="text-center bg-transparent"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className={cn(
        typography.fontSize.lg,
        "md:" + typography.fontSize.xl,
        typography.fontWeight.semibold,
        colors.text.primary,
        spacing.margin.sm
      )}>
        {translatedMessage}
      </p>
      {videoCountText && (
        <p className={cn(
          typography.fontSize.sm,
          "md:" + typography.fontSize.base,
          colors.text.tertiary,
          spacing.margin.xs
        )}>
          {videoCountText}
        </p>
      )}
      <p className={cn(
        typography.fontSize.sm,
        "md:" + typography.fontSize.base,
        colors.text.tertiary
      )} aria-label={a11yMessages.progress(Math.round(progress))}>
        {tSummary('processing.percentComplete', { progress: Math.round(progress) })}
      </p>
    </motion.div>
  );
});

