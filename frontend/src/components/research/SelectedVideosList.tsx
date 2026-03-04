"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { typography, spacing, colors, borderRadius, animationDurations, sourceVideosConfig } from "@/config/visual-effects";
import type { SelectedVideo } from "@/types";

export interface SelectedVideosListProps {
  videos: SelectedVideo[];
  className?: string;
}

/**
 * SelectedVideosList Component
 * Display selected videos with classifications and rationale
 * 
 * Features:
 * - Grid layout responsive
 * - Classification badges color-coded correctly
 * - Expandable sections work
 * - Thumbnails load correctly
 * - YouTube links open in new tab
 * - Accessible (keyboard navigation)
 */
export function SelectedVideosList({ videos, className }: SelectedVideosListProps) {
  const { t } = useTranslation('research');
  const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());

  const toggleCard = (videoId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

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

  // Deduplicate videos by video_id (defensive check for race conditions)
  const uniqueVideos = React.useMemo(() => {
    return videos.reduce((acc: SelectedVideo[], video) => {
      if (!acc.find(v => v.video_id === video.video_id)) {
        acc.push(video);
      }
      return acc;
    }, []);
  }, [videos]);

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className={cn(
        sourceVideosConfig.heading.fontSize,
        sourceVideosConfig.heading.fontWeight,
        sourceVideosConfig.heading.marginBottom,
        sourceVideosConfig.heading.color
      )}>
        Selected Videos ({uniqueVideos.length})
      </h3>
      
      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-4"
      )}>
        <AnimatePresence mode="popLayout">
          {uniqueVideos.map((video, index) => {
            const isExpanded = expandedCards.has(video.video_id);
            
            return (
              <motion.div
                key={`${video.video_id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: animationDurations.pageTransition }}
                className={cn(
                  sourceVideosConfig.card.display,
                  sourceVideosConfig.card.gap,
                  sourceVideosConfig.card.borderRadius,
                  sourceVideosConfig.card.border,
                  sourceVideosConfig.card.background,
                  sourceVideosConfig.card.padding,
                  "cursor-pointer",
                  "hover:bg-theme-bg-secondary",
                  "transition-colors"
                )}
                onClick={() => toggleCard(video.video_id)}
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

                    {/* Expandable Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: animationDurations.pageTransition }}
                          className="overflow-hidden space-y-2"
                        >
                          <div>
                            <p className={cn(
                              typography.fontSize.sm,
                              typography.fontWeight.medium,
                              colors.text.secondary,
                              spacing.marginBottom.xs
                            )}>
                              Why Selected:
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
                              Fills Gap:
                            </p>
                            <p className={cn(
                              typography.fontSize.sm,
                              colors.text.tertiary
                            )}>
                              {video.fills_gap}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Expand/Collapse Indicator */}
                    <div className={cn(
                      "flex items-center gap-1",
                      typography.fontSize.xs,
                      colors.text.tertiary,
                      spacing.marginTop.sm
                    )}>
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          <span>Show less</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          <span>Show details</span>
                        </>
                      )}
                    </div>

                    {/* YouTube Link */}
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
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
                      View on YouTube <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
