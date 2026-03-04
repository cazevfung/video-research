"use client";

import * as React from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { animationDurations, layoutConfig } from "@/config/visual-effects";
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

interface UnifiedStreamingContainerProps {
  children: React.ReactNode; // ResultCard
  sidebar: React.ReactNode; // ProcessingSidebar
  showSidebar: boolean;
}

/**
 * UnifiedStreamingContainer Component
 * Flex container that holds ProcessingSidebar and ResultCard together
 * Creates visual unity and eliminates size-changing issues
 * Part of the unified flex container layout (Option 1 implementation)
 * 
 * Key Features:
 * - Flex container: row on desktop, column on mobile
 * - Sidebar slot with smooth slide animations
 * - Children slot for ResultCard
 * - Shared container styling (borders, shadows, backgrounds)
 * - Normal document flow (not fixed positioned)
 * - Responsive breakpoints
 */
export function UnifiedStreamingContainer({
  children,
  sidebar,
  showSidebar,
}: UnifiedStreamingContainerProps) {
  const isDesktop = useIsDesktop();
  
  // Get responsive config values
  const gap = isDesktop 
    ? layoutConfig.unifiedContainer.gap.desktop 
    : layoutConfig.unifiedContainer.gap.mobile;
  const padding = isDesktop 
    ? layoutConfig.unifiedContainer.padding.desktop 
    : layoutConfig.unifiedContainer.padding.mobile;

  return (
    <LayoutGroup>
      <motion.div
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ 
          layout: {
            duration: animationDurations.summaryExpansion,
            ease: "easeInOut"
          },
          opacity: { duration: animationDurations.unifiedContainerFadeIn }
        }}
        className={cn(
          "flex",
          "lg:flex-row flex-col",
          "w-full",
          "bg-transparent"
        )}
        style={{
          gap,
          padding,
        }}
      >
        <AnimatePresence mode="popLayout">
          {showSidebar && (
            <motion.div
              key="sidebar"
              initial={{ opacity: 0, x: -20 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              transition: {
                duration: animationDurations.sidebarSlideIn,
                ease: "easeOut" as const
              }
            }}
            exit={{ 
              opacity: 0, 
              x: -20, 
              scale: 0.95,
              transition: {
                duration: animationDurations.sidebarSlideOut,
                ease: "easeIn" as const
              }
            }}
            className="flex-shrink-0"
          >
            {sidebar}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content container - expands naturally with flex when sidebar exits */}
      {/* LayoutGroup coordinates the animation smoothly */}
      {/* Use layout="position" to prevent text stretching during size changes */}
      <motion.div 
        className="flex-1 min-w-0"
        layout="position"
        transition={{
          layout: {
            duration: animationDurations.summaryExpansion,
            ease: "easeInOut"
          }
        }}
      >
        {children}
      </motion.div>
    </motion.div>
    </LayoutGroup>
  );
}
