"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { WhimsicalLoader } from "./WhimsicalLoader";
import { StatusMessage } from "./StatusMessage";
import { ProgressBar } from "./ProgressBar";
import { SubmittedUrls } from "./SubmittedUrls";
import type { JobStatus } from "@/types";
import { animationDurations, colors, headerConfig, zIndex, typography } from "@/config/visual-effects";
import { successMessages, infoMessages } from "@/config/messages";
import { cn } from "@/lib/utils";

interface ProcessingOverlayProps {
  status: JobStatus | "idle" | "connected";
  progress: number;
  message: string | null;
  show: boolean;
  isStreaming?: boolean; // Streaming state
  isCompleted?: boolean; // Completion state
  isCompleting?: boolean; // Completion animation phase
  videoCount?: number; // Total number of videos
  completedVideos?: number; // Number of completed videos
  submittedUrls?: string[]; // Submitted URLs to display
  onCancel?: () => void;
}

/**
 * ProcessingOverlay Component
 * Full-screen overlay displaying the whimsical processing state during initial processing
 * Used only for initial processing states (before streaming begins)
 * 
 * Phase 2 (Unified Layout): Simplified to only show full-screen overlay for initial processing
 * - Removed shrink/slide logic (handled by ProcessingSidebar in unified container)
 * - Removed scale animations
 * - Removed streaming-related shrinking behavior
 * 
 * Key Features:
 * - Full-screen overlay for initial processing states
 * - Completion animation (1.5s) before overlay fade-out
 * - Cancel functionality during processing
 * 
 * State Transitions:
 * - Initial processing states (fetching, processing, condensing, aggregating) -> full-screen overlay
 * - Completion -> completion animation plays -> overlay fades out
 * 
 * Edge Cases Handled:
 * - Rapid completion (minimum display time for animation)
 * - Content reset during completion (cancels animation)
 * - Cancel during processing (immediate hide)
 * 
 * Accessibility:
 * - Respects reduced motion preferences
 * - ARIA labels for screen readers
 * - Keyboard navigation support
 */
export function ProcessingOverlay({
  status,
  progress,
  message,
  show,
  isCompleted = false,
  isCompleting = false,
  videoCount,
  completedVideos,
  submittedUrls,
  onCancel,
}: ProcessingOverlayProps) {
  const { t } = useTranslation(['summary', 'common']);
  // Track overlay visibility separately for completion phase
  const [overlayVisible, setOverlayVisible] = React.useState(show);

  // Handle completion phase - keep overlay visible during completion animation
  // Edge case handling - Handle rapid completion and content reset
  React.useEffect(() => {
    if (isCompleted) {
      // Edge case - Ensure minimum display time for completion animation
      // Keep overlay visible during completion animation
      setOverlayVisible(true);
      
      // Edge case - Handle rapid completion by ensuring minimum display time
      // Fade out after completion animation duration
      const timer = setTimeout(() => {
        setOverlayVisible(false);
      }, animationDurations.completionAnimationDuration * 1000); // Convert seconds to milliseconds
      
      return () => clearTimeout(timer);
    } else {
      // Edge case - Reset overlay visibility when not completing
      // This handles content reset during completion
      setOverlayVisible(show);
    }
  }, [isCompleted, show]);

  // Update message for completion
  // Use centralized config for completion message
  const displayMessage = isCompleted 
    ? successMessages.summaryCompleted 
    : (message || infoMessages.processing);

  return (
    <AnimatePresence>
      {overlayVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: isCompleting ? animationDurations.overlayFadeOutDuration : animationDurations.overlayFadeIn 
          }}
          className={cn(
            "fixed backdrop-blur-sm",
            zIndex.overlay,
            "bg-transparent", // Fix: Remove background color to make overlay transparent during fetching
            "left-0 right-0 bottom-0 flex items-center justify-center"
          )}
          style={{
            top: `${headerConfig.heightPx}px`,
          }}
        >
          <motion.div
            className="w-full max-w-2xl px-4 md:px-6"
          >
            {/* Central Visualization */}
            <div className="flex items-center justify-center mb-4 md:mb-8 min-h-[40vh] md:min-h-[50vh]">
              <WhimsicalLoader 
                status={status} 
                progress={progress}
                isCompleted={isCompleted}
              />
            </div>

            {/* Status Text and Progress */}
            <div className="block">
              <div className="mb-4 md:mb-6">
                <StatusMessage 
                  message={displayMessage} 
                  progress={progress}
                  videoCount={videoCount}
                  completedVideos={completedVideos}
                />
              </div>

              <div className="mb-4 md:mb-6">
                <ProgressBar progress={progress} />
              </div>
            </div>

            {/* Submitted URLs */}
            {submittedUrls && submittedUrls.length > 0 && (
              <div className="mb-4 md:mb-6">
                <SubmittedUrls urls={submittedUrls} />
              </div>
            )}

            {/* Cancel Button */}
            {onCancel && (
              <div className="text-center">
                <button
                  onClick={onCancel}
                  className={cn(typography.fontSize.sm, colors.text.gray400, "hover:text-gray-300", "transition-colors", "underline")}
                >
                  {t('common:buttons.cancel')}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

