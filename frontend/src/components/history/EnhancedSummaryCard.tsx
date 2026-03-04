'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SummaryListItem } from '@/types';
import { useSafeFormatDate } from '@/utils/date';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Calendar, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { getSummary, getResearch } from '@/lib/api';
import { ShareButton } from '@/components/research/ShareButton';
import { masonryConfig } from '@/config/visual-effects';
import { cn } from '@/lib/utils';
import { CardSize } from '@/utils/cardSizeCalculator';

interface EnhancedSummaryCardProps {
  summary: SummaryListItem;
  onClick: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  showCheckbox?: boolean;
  animationDelay?: number;
  size?: CardSize;
}

/**
 * Enhanced Summary Card Component
 * Features:
 * - Rotating background thumbnails
 * - Glassmorphism content overlay
 * - Pinterest-inspired design
 */
export function EnhancedSummaryCard({
  summary,
  onClick,
  isSelected = false,
  onSelect,
  showCheckbox = false,
  animationDelay = 0,
  size = 'small',
}: EnhancedSummaryCardProps) {
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Extract thumbnails (max 6)
  const thumbnails = summary.source_videos
    .filter((v) => v.thumbnail)
    .slice(0, masonryConfig.thumbnailRotation.maxThumbnails)
    .map((v) => v.thumbnail!);

  const formattedDate = useSafeFormatDate(summary.created_at, 'PPp', 'Unknown date');

  // Get size-specific configuration
  const sizeConfig = masonryConfig.cardSizes[size];
  const titleFontSize = size === 'tall'
    ? masonryConfig.textOverlay.title.fontSize.large 
    : masonryConfig.textOverlay.title.fontSize.base;
  const lineClamp = masonryConfig.textOverlay.title.lineClamp[size];

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Intersection Observer for viewport detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Thumbnail rotation logic
  useEffect(() => {
    if (
      prefersReducedMotion ||
      !isInView ||
      thumbnails.length <= 1 ||
      (isHovered && masonryConfig.thumbnailRotation.pauseOnHover)
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setCurrentThumbnailIndex((prev) => (prev + 1) % thumbnails.length);
    }, masonryConfig.thumbnailRotation.interval + animationDelay);

    return () => clearTimeout(timer);
  }, [
    currentThumbnailIndex,
    thumbnails.length,
    isHovered,
    isInView,
    animationDelay,
    prefersReducedMotion,
  ]);

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExporting(true);
    try {
      const isResearch = summary.type === 'research';
      const response = isResearch
        ? await getResearch(summary._id)
        : await getSummary(summary._id);
      if (response.error) {
        toast.error(response.error.message || (isResearch ? 'Failed to export research' : 'Failed to export summary'));
        return;
      }
      if (response.data) {
        const data = response.data as { final_summary_text?: string; research_query?: string; batch_title?: string };
        const text = data.final_summary_text ?? '';
        const title = (isResearch ? data.research_query : data.batch_title) || (isResearch ? 'research' : 'summary');
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(isResearch ? 'Research exported!' : 'Summary exported!');
      }
    } catch (err) {
      toast.error(summary.type === 'research' ? 'Failed to export research' : 'Failed to export summary');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(!isSelected);
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        'enhanced-summary-card h-full w-full',
        `card-${size}`
      )}
      whileHover={{
        scale: masonryConfig.card.hover.scale,
        y: masonryConfig.card.hover.y,
        transition: { duration: masonryConfig.card.hover.duration },
      }}
      whileTap={{ scale: masonryConfig.card.tap.scale }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{ willChange: 'transform' }}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-xl cursor-pointer',
          'transition-all duration-300',
          isSelected && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900',
          'h-full w-full'
        )}
        style={{
          boxShadow: isHovered
            ? masonryConfig.card.shadow.hover
            : masonryConfig.card.shadow.default,
          // Removed minHeight - let grid control height via row spans
        }}
      >
        {/* Rotating Background Layer */}
        <div className="absolute inset-0 w-full h-full">
          <AnimatePresence mode="wait">
            {thumbnails.length > 0 ? (
              <motion.div
                key={currentThumbnailIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: prefersReducedMotion
                    ? 0
                    : masonryConfig.thumbnailRotation.transitionDuration / 1000,
                }}
                className="absolute inset-0"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                  style={{
                    backgroundImage: `url(${thumbnails[currentThumbnailIndex]})`,
                    filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
                  }}
                />
              </motion.div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 dark:from-purple-900 dark:to-blue-900">
                <div className="flex items-center justify-center h-full">
                  <Play className="w-16 h-16 text-white opacity-30" />
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Text Overlay Gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: masonryConfig.textOverlay.gradient,
            }}
          />

          {/* Action Buttons (Top Right) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {thumbnails.length > 1 && !prefersReducedMotion && (
              <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                <span className="text-white text-xs font-medium">
                  {currentThumbnailIndex + 1} / {thumbnails.length}
                </span>
              </div>
            )}
            
            {/* Phase 5: Share button for research items */}
            {summary.type === 'research' && summary._id && (
              <div 
                className="h-9 w-9 p-0 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border-0 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                }}
              >
                <ShareButton
                  contentId={summary._id}
                  contentType="research"
                  source="card"
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 rounded-full text-white hover:text-white"
                />
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="h-9 w-9 p-0 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border-0"
              aria-label="Export summary"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
            </Button>

            {showCheckbox && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                className="w-5 h-5 rounded border-2 border-white/80 bg-black/40 backdrop-blur-sm focus:ring-2 focus:ring-white/50 cursor-pointer"
                style={{ accentColor: '#3b82f6' }}
                aria-label="Select summary"
              />
            )}
          </div>

          {/* Text Content Overlay (Bottom) */}
          <div 
            className="absolute bottom-0 left-0 right-0"
            style={{
              padding: `${masonryConfig.textOverlay.padding.vertical}px ${masonryConfig.textOverlay.padding.horizontal}px`,
            }}
          >
            {/* Title */}
            <h3
              className="text-white font-bold mb-2"
              style={{
                fontSize: `${titleFontSize}px`,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                display: '-webkit-box',
                WebkitLineClamp: lineClamp,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {summary.batch_title}
            </h3>

            {/* Metadata */}
            <div 
              className="flex items-center gap-3 text-white"
              style={{
                fontSize: `${masonryConfig.textOverlay.metadata.fontSize}px`,
                opacity: masonryConfig.textOverlay.metadata.opacity,
              }}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>

              <span className="opacity-60">•</span>

              <div className="flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                <span>
                  {summary.video_count} {summary.video_count === 1 ? 'video' : 'videos'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

