"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { ResearchOrb } from "./ResearchOrb";
import { QueryParticle } from "./QueryParticle";
import { VideoParticle } from "./VideoParticle";
import { ParticleSkeleton } from "./ParticleSkeleton";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { StatusMessage } from "@/components/dashboard/StatusMessage";
import { WorkflowProgressTracker } from "@/components/research/WorkflowProgressTracker";
import type { ResearchStatus, SelectedVideo } from "@/types";
import { layoutConfig, researchParticleConfig, spacing, colors, typography } from "@/config/visual-effects";
import {
  BACKEND_MESSAGE_TO_I18N_KEY,
  STATUS_MESSAGE_PATTERNS,
  DYNAMIC_MESSAGE_KEYS,
  RESEARCH_STATUS_TO_I18N_KEY,
} from "@/config/status-messages";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
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

export interface ResearchProgressSidebarProps {
  status: ResearchStatus;
  progress: number;
  message: string | null;
  generatedQueries?: string[];
  rawVideoResults?: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    view_count: number;
    upload_date: string;
    url: string;
  }>;
  selectedVideos?: SelectedVideo[];
  videoCount?: number;
  onCancel?: () => void;
}

/**
 * ResearchProgressSidebar Component
 * Displays research progress with interactive particle system visualization
 * 
 * Features:
 * - Central Research Orb with pulsing animation
 * - Query particles that move towards orb
 * - Video thumbnail particles that orbit around orb
 * - Phase-based color transitions
 * - Status messages and progress bar
 * - Responsive design
 */
export function ResearchProgressSidebar({
  status,
  progress,
  message,
  generatedQueries = [],
  rawVideoResults = [],
  selectedVideos = [],
  videoCount,
  onCancel,
}: ResearchProgressSidebarProps) {
  const { t } = useTranslation('research');
  const isDesktop = useIsDesktop();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [orbCenter, setOrbCenter] = React.useState({ x: 0, y: 0 });

  // Calculate orb center position
  React.useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      setOrbCenter({
        x: rect.width / 2,
        y: rect.height / 2,
      });
    }
  }, [isDesktop]);

  // Get status message - uses centralized config (no hardcoded strings)
  const getStatusMessage = (): string => {
    if (message) {
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

      const i18nKey = BACKEND_MESSAGE_TO_I18N_KEY[message];
      if (i18nKey) return t(i18nKey);
    }

    const statusKey = RESEARCH_STATUS_TO_I18N_KEY[status] ?? 'research:progress.generatingQueries';
    return t(statusKey);
  };

  // Limit visible particles for performance
  const visibleQueries = generatedQueries.slice(0, researchParticleConfig.maxVisibleParticles.queries);
  const visibleVideos = rawVideoResults.slice(0, researchParticleConfig.maxVisibleParticles.videos);

  // Determine if we should show query particles
  const showQueryParticles = 
    status === 'generating_queries' || 
    status === 'searching_videos' || 
    status === 'filtering_videos';

  // Determine if we should show video particles
  const showVideoParticles = 
    status === 'searching_videos' || 
    status === 'filtering_videos' || 
    status === 'fetching_transcripts';

  // Phase 7: Performance monitoring (only enabled if config allows)
  const performanceMonitor = usePerformanceMonitor(
    researchParticleConfig.loading.performance.enableLogging &&
    (showQueryParticles || showVideoParticles)
  );

  // Phase 7: Show skeleton loaders when data is not yet available
  const showQuerySkeleton = 
    status === 'generating_queries' && generatedQueries.length === 0;
  const showVideoSkeleton = 
    (status === 'searching_videos' || status === 'filtering_videos') && 
    rawVideoResults.length === 0;

  // Get responsive config values
  const sidebarWidth = isDesktop 
    ? layoutConfig.processingSidebar.desktop.width 
    : layoutConfig.processingSidebar.mobile.width;
  const sidebarHeight = isDesktop 
    ? 'auto' 
    : layoutConfig.processingSidebar.mobile.height;
  
  const visualizationHeight = isDesktop 
    ? layoutConfig.whimsicalContainer.desktop.height 
    : layoutConfig.whimsicalContainer.mobile.height;

  const videoKeySeparator = researchParticleConfig.videoParticle.compositeKeySeparator;

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
      {/* Particle System Visualization Container */}
      <div 
        ref={containerRef}
        className={cn(
          "relative flex items-center justify-center",
          "flex-shrink-0",
          "bg-transparent",
          "overflow-hidden"
        )}
        style={{
          width: isDesktop ? '100%' : layoutConfig.whimsicalContainer.mobile.width,
          height: visualizationHeight,
        }}
      >
        {/* Central Research Orb */}
        <ResearchOrb
          queriesGenerated={generatedQueries.length}
          videosFound={rawVideoResults.length}
          videosSelected={selectedVideos.length}
          isSearching={status === 'searching_videos'}
          isFiltering={status === 'filtering_videos'}
          phase={status}
        />

        {/* Phase 7: Query Particles Skeleton (when loading) */}
        {showQuerySkeleton && (
          <ParticleSkeleton count={5} />
        )}

        {/* Query Particles */}
        {!showQuerySkeleton && showQueryParticles && visibleQueries.map((query, idx) => (
          <QueryParticle
            key={`query-${idx}`}
            query={query}
            index={idx}
            totalQueries={visibleQueries.length}
            isActive={status === 'searching_videos' || status === 'filtering_videos'}
            orbCenter={orbCenter}
          />
        ))}

        {/* Phase 7: Video Particles Skeleton (when loading) */}
        {showVideoSkeleton && (
          <ParticleSkeleton count={8} />
        )}

        {/* Video Thumbnail Particles */}
        {!showVideoSkeleton && showVideoParticles && visibleVideos.map((video, idx) => {
          const isSelected = selectedVideos.some(v => v.video_id === video.video_id);
          return (
            <VideoParticle
              key={`${video.video_id}${videoKeySeparator}${idx}`}
              video={video}
              index={idx}
              isSelected={isSelected}
              phase={status}
            />
          );
        })}
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
          message={getStatusMessage()} 
          progress={progress}
          videoCount={videoCount}
        />
        <ProgressBar progress={progress} />
        
        {onCancel && (
          <button
            onClick={onCancel}
            className={cn(
              typography.fontSize.sm,
              colors.text.tertiary,
              "hover:text-theme-text-secondary",
              "underline transition-colors"
            )}
          >
            {t('progress.cancel', 'Cancel')}
          </button>
        )}
      </div>

      {/* Workflow Progress Tracker - Under whimsical component */}
      <div className={cn(
        "px-4 pt-4",
        "lg:block",
        "bg-transparent"
      )}>
        <WorkflowProgressTracker currentStatus={status} />
      </div>
    </div>
  );
}
