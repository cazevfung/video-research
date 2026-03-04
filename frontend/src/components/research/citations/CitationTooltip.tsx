'use client';

/**
 * CitationTooltip Component
 * Phase 3: Displays video preview card on hover over citation badge
 * Phase 4: Added responsive design (mobile bottom sheets) and localization
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCitation } from '@/contexts/CitationContext';
import { citationConfig } from '@/config/citations';
import { cn } from '@/lib/utils';
import type { CitationTooltipProps } from '@/types/citations';
import { ExternalLink } from 'lucide-react';

/**
 * Detect if device is mobile/tablet
 * Phase 4: Responsive design - use bottom sheets on mobile
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // <768px = mobile
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

export const CitationTooltip = React.memo(function CitationTooltip({
  citationData,
  position,
  onClose,
  onWatchClick,
}: CitationTooltipProps) {
  const { t } = useTranslation('research');
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Initialize with position if available, otherwise will be set in useEffect
  // Calculate initial position immediately to avoid delay
  const calculateInitialPosition = (pos: { x: number; y: number } | null) => {
    if (!pos) return null;
    const estimatedWidth = citationConfig.tooltip.dimensions.width;
    const estimatedHeight = 200;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    let x = Math.max(
      estimatedWidth / 2 + 8,
      Math.min(pos.x, viewportWidth - estimatedWidth / 2 - 8)
    );
    
    const spaceAbove = pos.y;
    const spaceBelow = viewportHeight - pos.y;
    let y = spaceAbove < estimatedHeight + 8 && spaceBelow > spaceAbove
      ? pos.y + 24
      : pos.y - estimatedHeight - 8;
    
    y = Math.max(8, Math.min(y, viewportHeight - estimatedHeight - 8));
    return { x, y };
  };
  
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(
    position ? calculateInitialPosition(position) : null
  );
  const [isVisible, setIsVisible] = useState(false); // Start hidden until positioned correctly
  const [isPositioned, setIsPositioned] = useState(false); // Track if we've done initial positioning
  const isMobile = useIsMobile();
  
  // Reset visibility and position when position becomes null
  useEffect(() => {
    if (!position) {
      setIsVisible(false);
      setAdjustedPosition(null);
      setIsPositioned(false);
      tooltipDimensionsRef.current = null; // Reset dimensions for next hover
    }
  }, [position]);
  
  // Store tooltip dimensions after first measurement
  const tooltipDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // Phase 4: Adjust position to keep tooltip within viewport
  // On mobile, use bottom sheet positioning
  useEffect(() => {
    if (!position) return;
    
    if (isMobile) {
      // Mobile: Bottom sheet - center horizontally, position at bottom
      setAdjustedPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight - 8, // Will be adjusted to show from bottom
      });
      setIsPositioned(true);
      setIsVisible(true);
    } else {
      // Desktop: Position tooltip relative to cursor
      // Default: show below cursor, flip to above if no space
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const cursorOffset = 12; // pixels below/above cursor
      
      // Use measured dimensions if available, otherwise estimate
      const tooltipWidth = tooltipDimensionsRef.current?.width || citationConfig.tooltip.dimensions.width;
      const tooltipHeight = tooltipDimensionsRef.current?.height || 300;
      
      // Calculate position relative to cursor
      let x = position.x;
      let y = position.y;
      
      // Horizontal positioning - center tooltip on cursor, adjust if overflow
      x = Math.max(
        tooltipWidth / 2 + 8, // Minimum left margin
        Math.min(x, viewportWidth - tooltipWidth / 2 - 8) // Maximum right margin
      );
      
      // Vertical positioning - prefer below cursor, flip to above if no space
      const spaceBelow = viewportHeight - position.y;
      const spaceAbove = position.y;
      const minSpaceNeeded = tooltipHeight + cursorOffset + 8;
      
      if (spaceBelow >= minSpaceNeeded) {
        // Show below cursor
        y = position.y + cursorOffset;
      } else if (spaceAbove >= minSpaceNeeded) {
        // Show above cursor
        y = position.y - tooltipHeight - cursorOffset;
      } else {
        // Not enough space on either side - choose the side with more space
        if (spaceBelow > spaceAbove) {
          // Show below, but adjust to fit viewport
          y = position.y + cursorOffset;
          y = Math.min(y, viewportHeight - tooltipHeight - 8);
        } else {
          // Show above, but adjust to fit viewport
          y = position.y - tooltipHeight - cursorOffset;
          y = Math.max(y, 8);
        }
      }
      
      // Ensure tooltip stays within viewport vertically
      y = Math.max(8, Math.min(y, viewportHeight - tooltipHeight - 8));
      
      // Update position
      setAdjustedPosition({ x, y });
      
      // If we haven't measured yet, do it now
      if (!tooltipDimensionsRef.current && tooltipRef.current) {
        requestAnimationFrame(() => {
          if (!tooltipRef.current) return;
          
          const rect = tooltipRef.current.getBoundingClientRect();
          tooltipDimensionsRef.current = {
            width: rect.width || citationConfig.tooltip.dimensions.width,
            height: rect.height || 300,
          };
          
          // Recalculate position with actual dimensions
          const actualWidth = tooltipDimensionsRef.current.width;
          const actualHeight = tooltipDimensionsRef.current.height;
          
          let finalX = position.x;
          let finalY = position.y;
          
          finalX = Math.max(
            actualWidth / 2 + 8,
            Math.min(finalX, viewportWidth - actualWidth / 2 - 8)
          );
          
          const spaceBelow = viewportHeight - position.y;
          const spaceAbove = position.y;
          const minSpaceNeeded = actualHeight + cursorOffset + 8;
          
          if (spaceBelow >= minSpaceNeeded) {
            finalY = position.y + cursorOffset;
          } else if (spaceAbove >= minSpaceNeeded) {
            finalY = position.y - actualHeight - cursorOffset;
          } else {
            if (spaceBelow > spaceAbove) {
              finalY = position.y + cursorOffset;
              finalY = Math.min(finalY, viewportHeight - actualHeight - 8);
            } else {
              finalY = position.y - actualHeight - cursorOffset;
              finalY = Math.max(finalY, 8);
            }
          }
          
          finalY = Math.max(8, Math.min(finalY, viewportHeight - actualHeight - 8));
          
          setAdjustedPosition({ x: finalX, y: finalY });
          setIsPositioned(true);
          setIsVisible(true);
        });
      } else {
        // Already measured, just update position
        setIsPositioned(true);
        setIsVisible(true);
      }
    }
  }, [position, isMobile]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Don't close if clicking on the tooltip itself
      if (tooltipRef.current && tooltipRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on a citation badge (user might be clicking to scroll)
      const clickedBadge = (target as Element)?.closest?.('[data-citation-number]');
      if (clickedBadge) {
        return;
      }
      
      // Close tooltip if clicking elsewhere
      onClose();
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Use a small delay to avoid race conditions with hover events
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleEscape);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);
  
  const config = citationConfig.tooltip;
  
  // Phase 4: Memoize watch video text for performance
  const watchVideoText = useMemo(() => t('citations.watchVideo', 'Watch Video'), [t]);
  
  // Don't render if no position or citation data
  if (!position || !citationData) return null;
  
  // Phase 4: Mobile bottom sheet vs desktop tooltip
  const isBottomSheet = isMobile;
  
  // For desktop: Only render if we have an adjusted position
  // For mobile: Always render (positioning is simpler)
  if (!isBottomSheet && !adjustedPosition) {
    return null;
  }
  
  // For desktop: Only show tooltip after it's been positioned correctly (prevents flash)
  // For mobile: Show immediately
  const shouldShow = isBottomSheet || isPositioned;
  
  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ 
          opacity: 1, 
          y: 0 
        }}
        animate={{ 
          opacity: (isVisible && shouldShow) ? 1 : 0, 
          y: 0
        }}
        exit={{ 
          opacity: 0, 
          y: isBottomSheet ? 100 : config.animations.translateY 
        }}
        transition={{ duration: 0 }}
        onMouseEnter={() => {
          // Keep tooltip open when hovering over it
          setIsVisible(true);
        }}
        onMouseLeave={() => {
          // Close tooltip when leaving tooltip area
          setIsVisible(false);
          onClose();
        }}
        className={cn(
          'fixed pointer-events-auto',
          isBottomSheet ? 'w-full max-w-md' : '',
          'bg-white dark:bg-gray-800',
          isBottomSheet ? 'rounded-t-xl' : 'rounded-xl',
          'shadow-lg',
          'overflow-hidden',
          'border-0', // Explicitly remove any border that could create top bar
          !shouldShow && 'invisible' // Hide until positioned to prevent flash
        )}
        style={{
          ...(isBottomSheet ? {
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            maxHeight: '80vh',
          } : adjustedPosition ? {
            width: `${config.dimensions.width}px`,
            left: `${adjustedPosition.x}px`,
            top: `${adjustedPosition.y}px`,
            transform: 'translateX(-50%)', // Center horizontally
          } : {
            // Fallback positioning if adjustedPosition not set yet
            width: `${config.dimensions.width}px`,
            left: `${position.x}px`,
            top: `${position.y - 200}px`,
            transform: 'translateX(-50%)',
            opacity: 0, // Hide until positioned
          }),
          borderRadius: isBottomSheet ? '12px 12px 0 0' : `${config.borderRadius}px`,
          zIndex: config.positioning.zIndex,
          border: 'none', // Explicitly remove border to prevent top bar
          margin: 0, // Remove any default margins
        }}
      >
        {/* Thumbnail - Phase 4: Lazy loading */}
        <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 relative overflow-hidden" style={{ border: 'none', margin: 0, padding: 0 }}>
          <img
            src={citationData.thumbnail}
            alt={citationData.title}
            className={cn(
              "w-full h-full",
              citationConfig.tooltip.thumbnail.objectFit,
              citationConfig.tooltip.thumbnail.objectPosition
            )}
            loading="lazy"
            decoding="async"
            style={{ display: 'block', margin: 0, padding: 0 }}
          />
        </div>
        
        {/* Content */}
        <div 
          style={{
            paddingTop: `${config.spacing.contentPaddingTop}px`,
            paddingBottom: `${config.spacing.contentPaddingBottom}px`,
            paddingLeft: `${config.spacing.contentPaddingX}px`,
            paddingRight: `${config.spacing.contentPaddingX}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: `${config.spacing.verticalGap}px`,
          }}
        >
          {/* Title */}
          <h3
            className={cn(
              'text-sm font-semibold',
              config.colors.title,
              config.colors.darkTitle,
              'line-clamp-2',
              'leading-tight'
            )}
            style={{
              fontSize: `${config.typography.titleFontSize}px`,
              fontWeight: config.typography.titleFontWeight,
              margin: 0,
              padding: 0,
            }}
          >
            {citationData.title}
          </h3>
          
          {/* Channel and Meta - Combined with minimal spacing */}
          <div className="flex flex-col" style={{ gap: '2px', marginTop: '2px' }}>
            <div className="flex items-center">
              <span 
                className={cn(
                  config.colors.channel,
                  config.colors.darkChannel
                )}
                style={{
                  fontSize: `${config.typography.channelFontSize}px`,
                  lineHeight: '1.2',
                }}
              >
                {citationData.channel}
              </span>
            </div>
            
            <div 
              className={cn(
                config.colors.meta,
                config.colors.darkMeta
              )}
              style={{
                fontSize: `${config.typography.metaFontSize}px`,
                lineHeight: '1.2',
              }}
            >
              {citationData.durationFormatted} • {citationData.uploadDate} • {citationData.viewCountFormatted} views
            </div>
          </div>
          
          {/* Watch Video Button */}
          <button
            onClick={() => onWatchClick(citationData.videoId)}
            className={cn(
              'w-full',
              config.colors.actionBackground,
              config.colors.actionHoverBackground,
              'text-white font-medium',
              'rounded-md',
              'transition-colors',
              'flex items-center justify-center gap-2'
            )}
            style={{
              paddingLeft: `${config.spacing.buttonPaddingX}px`,
              paddingRight: `${config.spacing.buttonPaddingX}px`,
              paddingTop: `${config.spacing.buttonPaddingY}px`,
              paddingBottom: `${config.spacing.buttonPaddingY}px`,
              marginTop: `${config.spacing.buttonMarginTop}px`,
              fontSize: `${config.typography.actionFontSize}px`,
            }}
          >
            {watchVideoText}
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
