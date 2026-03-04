"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { researchParticleConfig, layoutConfig } from "@/config/visual-effects";
import type { ResearchStatus } from "@/types";

export interface ResearchOrbProps {
  queriesGenerated: number;
  videosFound: number;
  videosSelected: number;
  isSearching: boolean;
  isFiltering: boolean;
  phase: ResearchStatus;
}

/**
 * ResearchOrb Component
 * Central glowing orb that pulses and changes color based on research phase
 * 
 * Features:
 * - Pulsing animation (2s cycle)
 * - Color changes based on phase
 * - Count badges for queries/videos
 * - Responsive sizing
 * - Respects reduced motion preference
 */
export function ResearchOrb({
  queriesGenerated,
  videosFound,
  videosSelected,
  isSearching,
  isFiltering,
  phase,
}: ResearchOrbProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= layoutConfig.breakpoints.desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Get phase color configuration
  const getPhaseColor = (): (typeof researchParticleConfig.phaseColors)[keyof typeof researchParticleConfig.phaseColors] => {
    if (phase === 'generating_queries') {
      return researchParticleConfig.phaseColors.generating_queries;
    }
    if (phase === 'searching_videos' || isSearching) {
      return researchParticleConfig.phaseColors.searching_videos;
    }
    if (phase === 'filtering_videos' || isFiltering) {
      return researchParticleConfig.phaseColors.filtering_videos;
    }
    if (phase === 'generating_summary') {
      return researchParticleConfig.phaseColors.generating_summary;
    }
    // Default to query generation colors
    return researchParticleConfig.phaseColors.generating_queries;
  };

  const phaseColor = getPhaseColor();
  const orbSize = isDesktop 
    ? researchParticleConfig.orb.size.desktop 
    : researchParticleConfig.orb.size.mobile;

  // Pulse animation variants
  const pulseVariants = {
    pulse: {
      scale: prefersReducedMotion ? 1 : [1, 1.1, 1],
      opacity: prefersReducedMotion ? 1 : [0.8, 1, 0.8],
      transition: {
        duration: researchParticleConfig.orb.pulseDuration,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Central Orb */}
      <motion.div
        className={cn(
          "rounded-full",
          `bg-gradient-to-r ${phaseColor.orb}`,
          `shadow-lg ${phaseColor.glow}`
        )}
        style={{
          width: orbSize,
          height: orbSize,
          // Phase 7: Performance optimization - use GPU acceleration
          willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
          transform: 'translateZ(0)',
        }}
        variants={pulseVariants}
        animate="pulse"
      >
        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-full bg-white/20 blur-sm"
          style={{
            boxShadow: researchParticleConfig.orb.glowShadow,
          }}
        />
      </motion.div>

      {/* Count Badges */}
      {queriesGenerated > 0 && (
        <motion.div
          className={cn(
            "absolute -top-2 -right-2",
            "flex items-center justify-center",
            "rounded-full",
            "bg-theme-bg-card border border-theme-border-primary",
            "px-2 py-1",
            "text-xs font-semibold",
            phaseColor.text
          )}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: researchParticleConfig.animationTiming.particleFadeIn }}
        >
          {queriesGenerated}
        </motion.div>
      )}

      {videosFound > 0 && (
        <motion.div
          className={cn(
            "absolute -bottom-2 -left-2",
            "flex items-center justify-center",
            "rounded-full",
            "bg-theme-bg-card border border-theme-border-primary",
            "px-2 py-1",
            "text-xs font-semibold",
            phaseColor.text
          )}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: researchParticleConfig.animationTiming.particleFadeIn,
            delay: researchParticleConfig.queryParticle.staggerDelay * 0.5
          }}
        >
          {videosFound}
        </motion.div>
      )}

      {videosSelected > 0 && (
        <motion.div
          className={cn(
            "absolute top-1/2 -right-8",
            "flex items-center justify-center",
            "rounded-full",
            "bg-theme-bg-card border border-theme-border-primary",
            "px-2 py-1",
            "text-xs font-semibold",
            researchParticleConfig.phaseColors.filtering_videos.text
          )}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: researchParticleConfig.animationTiming.particleFadeIn,
            delay: researchParticleConfig.queryParticle.staggerDelay
          }}
        >
          {videosSelected}
        </motion.div>
      )}
    </div>
  );
}
