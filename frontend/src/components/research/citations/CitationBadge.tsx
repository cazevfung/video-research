'use client';

/**
 * CitationBadge Component
 * Phase 3: Renders clickable citation badge [number] with hover/click interactions
 * Phase 4: Added React.memo for performance optimization
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { useCitation } from '@/contexts/CitationContext';
import { citationConfig } from '@/config/citations';
import { cn } from '@/lib/utils';
import type { CitationBadgeProps } from '@/types/citations';

const badgeConfig = citationConfig.badge;

export const CitationBadge = React.memo(function CitationBadge({
  number,
  citationData,
  onClick,
  className,
}: CitationBadgeProps) {
  const {
    setHoveredCitation,
    setTooltipPosition,
    scrollToCitation,
    openVideo,
    getCitation,
  } = useCitation();
  
  const badgeRef = useRef<HTMLSpanElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle mouse move to track cursor position
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isHoveringRef.current) return;
    
    // Update tooltip position to follow cursor
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY,
    });
  }, [setTooltipPosition]);
  
  // Handle hover
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    // Clear any existing timeout and RAF first
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Cancel leave timeout if user hovers back
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    
    // Mark that we're hovering
    isHoveringRef.current = true;
    
    // Store badge ref locally to check in timeout
    const badgeElement = badgeRef.current;
    const citationNumber = number;
    const initialMouseX = e.clientX;
    const initialMouseY = e.clientY;
    
    // Set hover delay with fresh timeout
    hoverTimeoutRef.current = setTimeout(() => {
      // Clear timeout ref immediately to prevent double execution
      hoverTimeoutRef.current = null;
      
      // Check if we're still hovering (user might have moved away)
      if (!isHoveringRef.current) {
        return;
      }
      
      // Double-check badge still exists and is mounted
      if (!badgeElement || !badgeRef.current) {
        return;
      }
      
      // Get fresh citation data
      const currentCitationData = getCitation(citationNumber);
      
      // Show tooltip if citation data exists (even if placeholder during streaming)
      // The tooltip will show placeholder data until real data arrives
      if (currentCitationData) {
        // Use requestAnimationFrame to ensure DOM is stable
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          
          // Final check that we're still hovering and badge still exists
          if (!isHoveringRef.current || !badgeRef.current) {
            return;
          }
          
          // Set initial position at cursor location
          setHoveredCitation(citationNumber);
          setTooltipPosition({
            x: initialMouseX,
            y: initialMouseY,
          });
        });
      }
    }, citationConfig.tooltip.positioning.hoverDelay);
  }, [number, setHoveredCitation, setTooltipPosition, getCitation]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    // Mark that we're no longer hovering
    isHoveringRef.current = false;
    
    // Clear timeout immediately
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Cancel any pending RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // Clear any existing leave timeout
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    
    // Add a small delay before clearing hover state to allow moving to tooltip
    // This prevents flickering when moving mouse from badge to tooltip
    leaveTimeoutRef.current = setTimeout(() => {
      leaveTimeoutRef.current = null;
      // Double-check we're still not hovering (user might have moved back)
      if (!isHoveringRef.current) {
        setHoveredCitation(null);
        setTooltipPosition(null);
      }
    }, 100); // Small delay to allow moving to tooltip
  }, [setHoveredCitation, setTooltipPosition]);
  
  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onClick) {
      onClick();
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + Click: Open video
      openVideo(citationData.videoId);
    } else {
      // Regular click: Scroll to reference list
      scrollToCitation(number);
    }
  }, [number, citationData.videoId, onClick, openVideo, scrollToCitation]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as any);
    } else if (e.key === 'Escape') {
      setHoveredCitation(null);
      setTooltipPosition(null);
    }
  }, [handleClick, setHoveredCitation, setTooltipPosition]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isHoveringRef.current = false;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
    };
  }, []);
  
  return (
    <span
      ref={badgeRef}
      data-citation-number={number}
      role="button"
      tabIndex={0}
      aria-label={`Citation ${number}: ${citationData.title} by ${citationData.channel}`}
      className={cn(
        // Base styles - perfect circle
        'inline-flex items-center justify-center',
        // Typography - Phase 4: Using config values
        'font-semibold leading-none',
        // Colors - light mode: light gray background with dark text
        badgeConfig.colors.text,
        badgeConfig.colors.background,
        badgeConfig.colors.hoverBackground,
        // Dark mode: dark gray background with light text
        badgeConfig.colors.darkText,
        badgeConfig.colors.darkBackground,
        badgeConfig.colors.darkHoverBackground,
        // Interactive states
        'cursor-pointer transition-all user-select-none',
        // Focus states
        'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
        className
      )}
      style={{
        // Perfect circle: width and height equal to diameter
        width: `${badgeConfig.sizing.diameter}px`,
        height: `${badgeConfig.sizing.diameter}px`,
        fontSize: `${badgeConfig.typography.fontSize}px`,
        fontWeight: badgeConfig.typography.fontWeight,
        borderRadius: '50%', // Perfect circle
        transitionDuration: `${badgeConfig.animations.transitionDuration}s`,
        marginLeft: `${badgeConfig.sizing.marginX}px`,
        marginRight: `${badgeConfig.sizing.marginX}px`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {number}
    </span>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo
  // Allow re-render if citation data changes (e.g., placeholder -> real data during streaming)
  return (
    prevProps.number === nextProps.number &&
    prevProps.citationData.videoId === nextProps.citationData.videoId &&
    prevProps.citationData.title === nextProps.citationData.title &&
    prevProps.citationData.thumbnail === nextProps.citationData.thumbnail &&
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick
  );
});
