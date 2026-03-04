'use client';

import * as React from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { sourceVideosConfig, colors, spacing, typography, borderRadius, iconSizes } from '@/config/visual-effects';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface SourceVideo {
  url: string;
  title: string;
  channel: string;
  thumbnail?: string;
}

interface SourceVideosListProps {
  videos: SourceVideo[];
  maxVisible?: number;
  showExpandButton?: boolean;
  className?: string;
}

/**
 * SourceVideosList Component
 * Displays source videos in a card-based layout with expand/collapse functionality
 * - Shows first 3 videos by default when there are more than 3
 * - Displays fade effect at bottom when collapsed
 * - Expand button appears next to heading when there are more than maxVisible videos
 */
export function SourceVideosList({
  videos,
  maxVisible = sourceVideosConfig.defaultVisibleCount,
  showExpandButton = true,
  className,
}: SourceVideosListProps) {
  const { t } = useTranslation('summary');
  const [isExpanded, setIsExpanded] = React.useState(false);
  const shouldShowExpand = videos.length > maxVisible && showExpandButton;
  const visibleVideos = isExpanded ? videos : videos.slice(0, maxVisible);
  const remainingCount = videos.length - maxVisible;

  if (videos.length === 0) return null;

  return (
    <div className={cn(sourceVideosConfig.container.marginBottom, className)}>
      {/* Header with Expand Button */}
      <div className={cn("flex items-center justify-between", sourceVideosConfig.heading.marginBottom)}>
        <h3 className={cn(
          sourceVideosConfig.heading.fontSize,
          sourceVideosConfig.heading.fontWeight,
          sourceVideosConfig.heading.color
        )}>
          {t('result.sourceVideos')}
        </h3>
        {shouldShowExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "inline-flex items-center",
              sourceVideosConfig.expandButton.gap,
              sourceVideosConfig.expandButton.fontSize,
              sourceVideosConfig.expandButton.color,
              sourceVideosConfig.expandButton.hoverColor,
              sourceVideosConfig.expandButton.transition
            )}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('tooltips.collapseVideos') : t('tooltips.showMoreVideos', { count: remainingCount })}
          >
            {isExpanded ? (
              <>
                {t('result.showLess')}
                <ChevronUp className={iconSizes.xs} />
              </>
            ) : (
              <>
                {t('result.showMore', { count: remainingCount })}
                <ChevronDown className={iconSizes.xs} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Video Cards Container */}
      <div className={cn("relative", sourceVideosConfig.card.spacing)}>
        {visibleVideos.map((video, index) => (
          <div
            key={index}
            className={cn(
              sourceVideosConfig.card.display,
              sourceVideosConfig.card.gap,
              sourceVideosConfig.card.borderRadius,
              sourceVideosConfig.card.border,
              sourceVideosConfig.card.background,
              sourceVideosConfig.card.padding
            )}
          >
            {/* Thumbnail - wrapper from config for consistent padding across all video lists */}
            <div className={sourceVideosConfig.thumbnail.wrapperClass}>
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className={cn(
                    sourceVideosConfig.thumbnail.objectFit,
                    sourceVideosConfig.thumbnail.objectPosition,
                    sourceVideosConfig.thumbnail.borderRadius
                  )}
                  style={{
                    height: `${sourceVideosConfig.thumbnail.height}px`,
                    width: `${sourceVideosConfig.thumbnail.width}px`,
                  }}
                />
              ) : (
                <div
                  className={cn(
                    sourceVideosConfig.thumbnail.borderRadius,
                    colors.background.secondary,
                    "flex items-center justify-center"
                  )}
                  style={{
                    height: `${sourceVideosConfig.thumbnail.height}px`,
                    width: `${sourceVideosConfig.thumbnail.width}px`,
                  }}
                >
                  <span className={cn(colors.text.muted, typography.fontSize.base)}>{t('result.noImage')}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className={cn(sourceVideosConfig.content.flex)}>
              <p className={cn(
                sourceVideosConfig.content.title.truncate,
                sourceVideosConfig.content.title.fontWeight,
                sourceVideosConfig.content.title.color
              )}>
                {video.title}
              </p>
              {video.channel && (
                <p className={cn(
                  sourceVideosConfig.content.channel.fontSize,
                  sourceVideosConfig.content.channel.color
                )}>
                  {video.channel}
                </p>
              )}
              {video.url && (
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
                  {t('result.viewOnYouTube')} <ExternalLink className={iconSizes.xs} />
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Fade Effect (only when collapsed and more videos exist) */}
        {!isExpanded && shouldShowExpand && (
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: `${sourceVideosConfig.fade.height}px`,
              background: `linear-gradient(to bottom, transparent, var(--color-theme-bg-card))`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

