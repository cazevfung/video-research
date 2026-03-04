"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { WhimsicalLoader } from "./WhimsicalLoader";
import { StatusMessage } from "./StatusMessage";
import { ProgressBar } from "./ProgressBar";
import type { JobStatus } from "@/types";
import { layoutConfig } from "@/config/visual-effects";
import { cn } from "@/lib/utils";

// Hook to detect desktop breakpoint
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= layoutConfig.breakpoints.desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return isDesktop;
}

interface ProcessingSidebarProps {
  status: JobStatus | "idle" | "connected";
  progress: number;
  message: string | null;
  isStreaming?: boolean;
  isCompleted?: boolean;
  isCompleting?: boolean;
  videoCount?: number;
  completedVideos?: number;
  submittedUrls?: string[];
  onCancel?: () => void;
}

/**
 * ProcessingSidebar Component
 * Fixed-size sidebar displaying the whimsical processing state during streaming
 * Part of the unified flex container layout (Option 1 implementation)
 * 
 * Key Features:
 * - Fixed dimensions from layoutConfig (never changes)
 * - No scale animations
 * - Responsive layout: column on desktop, row on mobile
 * - Compact design optimized for sidebar
 * - Normal document flow (not fixed positioned)
 * - Uses layoutConfig.processingSidebar and layoutConfig.whimsicalContainer
 */
export function ProcessingSidebar({
  status,
  progress,
  message,
  isStreaming = false,
  isCompleted = false,
  videoCount,
  completedVideos,
  submittedUrls,
  onCancel,
}: ProcessingSidebarProps) {
  const isDesktop = useIsDesktop();
  const { t } = useTranslation(['summary', 'common']);

  // Use i18n keys - no hardcoded strings
  const displayMessage = isCompleted
    ? t('common:messages.summaryCompleted')
    : (message ?? t('summary:processing.processingVideos'));

  // Get responsive config values
  const sidebarWidth = isDesktop 
    ? layoutConfig.processingSidebar.desktop.width 
    : layoutConfig.processingSidebar.mobile.width;
  const sidebarHeight = isDesktop 
    ? 'auto' 
    : layoutConfig.processingSidebar.mobile.height;
  
  const whimsicalWidth = isDesktop 
    ? '100%' 
    : layoutConfig.whimsicalContainer.mobile.width;
  const whimsicalHeight = isDesktop 
    ? layoutConfig.whimsicalContainer.desktop.height 
    : layoutConfig.whimsicalContainer.mobile.height;

  return (
    <div 
      className={cn(
        "bg-transparent",
        "lg:flex-col flex-row",
        "flex-shrink-0",
        "overflow-hidden"
      )}
      style={{
        width: sidebarWidth,
        minWidth: isDesktop ? layoutConfig.processingSidebar.desktop.minWidth : undefined,
        maxWidth: isDesktop ? layoutConfig.processingSidebar.desktop.maxWidth : undefined,
        height: sidebarHeight,
        minHeight: isDesktop ? undefined : layoutConfig.processingSidebar.mobile.minHeight,
        maxHeight: isDesktop ? undefined : layoutConfig.processingSidebar.mobile.maxHeight,
      }}
    >
      {/* WhimsicalLoader Container - Fixed Size */}
      <div 
        className={cn(
          "flex items-center justify-center",
          "flex-shrink-0",
          "bg-transparent"
        )}
        style={{
          width: whimsicalWidth,
          height: whimsicalHeight,
        }}
      >
        <WhimsicalLoader 
          status={status} 
          progress={progress}
          isCompleted={isCompleted}
        />
      </div>

      {/* Status Info - Compact */}
      <div className={cn(
        "px-4 pb-4",
        "lg:block flex flex-col justify-center",
        "flex-1 lg:flex-none",
        "space-y-3",
        "bg-transparent"
      )}>
        <StatusMessage 
          message={displayMessage} 
          progress={progress}
          videoCount={videoCount}
          completedVideos={completedVideos}
        />
        <ProgressBar progress={progress} />
        
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-theme-text-tertiary hover:text-theme-text-secondary underline transition-colors"
          >
            {t('common:buttons.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
