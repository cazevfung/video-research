"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { researchParticleConfig } from "@/config/visual-effects";
import type { ResearchStatus } from "@/types";

export interface VideoParticleProps {
  video: {
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    url: string;
  };
  index: number;
  isSelected: boolean;
  phase: ResearchStatus;
}

/**
 * VideoParticle Component
 * Thumbnail particle that orbits around the research orb
 * 
 * Features:
 * - Fades in with thumbnail image
 * - Orbits around orb at varying distances
 * - Shows classification badge if selected
 * - Hover tooltip with full title
 * - Scales up if selected, fades out if not
 */
export function VideoParticle({
  video,
  index,
  isSelected,
  phase,
}: VideoParticleProps) {
  const prefersReducedMotion = useReducedMotion();
  
  // Calculate orbit parameters
  const orbitRadius = 
    researchParticleConfig.videoParticle.orbitRadius.min +
    (index % 3) * researchParticleConfig.videoParticle.orbitRadius.step;
  const orbitSpeed = 
    researchParticleConfig.videoParticle.orbitSpeed.min +
    (index % 5) * researchParticleConfig.videoParticle.orbitSpeed.step;
  const angle = (index * 137.5) % 360; // Golden angle for distribution
  
  // Get phase color
  const getPhaseColor = () => {
    if (phase === 'searching_videos') {
      return researchParticleConfig.phaseColors.searching_videos;
    }
    if (phase === 'filtering_videos') {
      return isSelected
        ? researchParticleConfig.phaseColors.filtering_videos
        : researchParticleConfig.phaseColors.searching_videos;
    }
    return researchParticleConfig.phaseColors.searching_videos;
  };

  const phaseColor = getPhaseColor();
  const thumbnailSize = researchParticleConfig.videoParticle.thumbnailSize;

  // Truncate title for display
  const displayTitle = video.title.length > 40 ? `${video.title.slice(0, 40)}...` : video.title;

  if (prefersReducedMotion) {
    // Simplified version for reduced motion
    return (
      <div
        className="absolute"
        style={{
          transform: `translate(${Math.cos((angle * Math.PI) / 180) * orbitRadius}px, ${Math.sin((angle * Math.PI) / 180) * orbitRadius}px)`,
        }}
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          className={cn(
            researchParticleConfig.videoParticle.thumbnail.objectFit,
            researchParticleConfig.videoParticle.thumbnail.objectPosition,
            "rounded border-2",
            phaseColor.particle.replace('bg-', 'border-') + "/50",
            "shadow-lg"
          )}
          style={{
            width: thumbnailSize.width,
            height: thumbnailSize.height,
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="absolute group"
      initial={{
        opacity: 0,
        scale: 0.8,
      }}
      animate={{
        rotate: [0, 360],
        x: [
          Math.cos((angle * Math.PI) / 180) * orbitRadius,
          Math.cos(((angle + 180) * Math.PI) / 180) * orbitRadius,
        ],
        y: [
          Math.sin((angle * Math.PI) / 180) * orbitRadius,
          Math.sin(((angle + 180) * Math.PI) / 180) * orbitRadius,
        ],
        scale: isSelected
          ? researchParticleConfig.videoParticle.scaleRange.selected[1]
          : researchParticleConfig.videoParticle.scaleRange.unselected[1],
        opacity: isSelected ? 1 : 0.3,
      }}
      transition={{
        rotate: {
          duration: orbitSpeed,
          repeat: Infinity,
          ease: 'linear',
        },
        x: {
          duration: orbitSpeed,
          repeat: Infinity,
          ease: 'linear',
        },
        y: {
          duration: orbitSpeed,
          repeat: Infinity,
          ease: 'linear',
        },
        scale: {
          duration: researchParticleConfig.videoParticle.transitionDurations.scale,
        },
        opacity: {
          duration: researchParticleConfig.videoParticle.transitionDurations.opacity,
        },
      }}
      style={{
        willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
        // Phase 7: Performance optimization - use GPU acceleration
        transform: 'translateZ(0)',
      }}
    >
      <img
        src={video.thumbnail}
        alt={video.title}
        className={cn(
          researchParticleConfig.videoParticle.thumbnail.objectFit,
          researchParticleConfig.videoParticle.thumbnail.objectPosition,
          "rounded border-2",
          phaseColor.particle.replace('bg-', 'border-') + "/50",
          "shadow-lg",
          "transition-all"
        )}
        style={{
          width: thumbnailSize.width,
          height: thumbnailSize.height,
        }}
      />
      
      {/* Title tooltip (shows on hover) */}
      <motion.div
        className={cn(
          "absolute top-full left-1/2 -translate-x-1/2 mt-2",
          "whitespace-nowrap",
          "text-xs",
          phaseColor.text,
          "opacity-0 group-hover:opacity-100",
          "pointer-events-auto",
          "bg-theme-bg-card border border-theme-border-primary",
          "px-2 py-1 rounded",
          "z-10",
          "max-w-[200px]"
        )}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <p className="font-medium">{displayTitle}</p>
        <p className="text-theme-text-tertiary text-[10px]">{video.channel}</p>
      </motion.div>
    </motion.div>
  );
}
