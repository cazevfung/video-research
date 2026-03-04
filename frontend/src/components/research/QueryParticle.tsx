"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { researchParticleConfig } from "@/config/visual-effects";

export interface QueryParticleProps {
  query: string;
  index: number;
  totalQueries: number;
  isActive: boolean;
  orbCenter: { x: number; y: number };
}

/**
 * QueryParticle Component
 * Animated particle representing a search query
 * 
 * Features:
 * - Fades in from random edge position
 * - Moves towards orb center with easing
 * - Shows query text (truncated) on hover
 * - Trail effect during movement
 * - Disappears into orb on arrival
 */
export function QueryParticle({
  query,
  index,
  totalQueries,
  isActive,
  orbCenter,
}: QueryParticleProps) {
  const prefersReducedMotion = useReducedMotion();
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Calculate random start position on edge of container
    if (containerRef.current) {
      const container = containerRef.current.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        // Distribute particles around the edge
        const angle = (index / totalQueries) * Math.PI * 2;
        const radius = Math.max(containerRect.width, containerRect.height) * 0.4;
        
        setStartPos({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      }
    }
  }, [index, totalQueries]);

  const phaseColor = researchParticleConfig.phaseColors.generating_queries;
  const delay = index * researchParticleConfig.queryParticle.staggerDelay;
  // Phase 7: Use optimized animation timing from config
  const moveDuration = 
    researchParticleConfig.animationTiming.particleMove.min +
    (Math.random() * (researchParticleConfig.animationTiming.particleMove.max - 
      researchParticleConfig.animationTiming.particleMove.min));

  // Truncate query text for display
  const displayQuery = query.length > 30 ? `${query.slice(0, 30)}...` : query;

  if (prefersReducedMotion) {
    // Simplified version for reduced motion
    return (
      <div
        ref={containerRef}
        className="absolute pointer-events-none"
        style={{
          left: `${startPos.x}px`,
          top: `${startPos.y}px`,
        }}
      >
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            phaseColor.particle,
            "shadow-lg"
          )}
          style={{
            width: researchParticleConfig.queryParticle.size,
            height: researchParticleConfig.queryParticle.size,
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="absolute pointer-events-none group"
      initial={{
        opacity: 0,
        scale: 0.5,
        x: startPos.x,
        y: startPos.y,
      }}
      animate={
        isActive
          ? {
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.2, 1, 0.8],
              x: orbCenter.x,
              y: orbCenter.y,
            }
          : {
              opacity: 1,
              scale: 1,
              x: startPos.x,
              y: startPos.y,
            }
      }
      transition={{
        duration: moveDuration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{
        willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
        // Phase 7: Performance optimization - use GPU acceleration
        transform: 'translateZ(0)',
      }}
    >
      {/* Glowing dot */}
      <div className="relative">
        <div
          className={cn(
            "rounded-full",
            phaseColor.particle,
            "shadow-lg"
          )}
          style={{
            width: researchParticleConfig.queryParticle.size,
            height: researchParticleConfig.queryParticle.size,
            boxShadow: `0 0 8px ${phaseColor.particle.replace('bg-', '')}`,
          }}
        />
        
        {/* Trail effect */}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full",
            phaseColor.particle
          )}
          style={{
            opacity: researchParticleConfig.queryParticle.trailOpacity,
          }}
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.5, 0.3, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
        
        {/* Query text tooltip (shows on hover) */}
        <motion.div
          className={cn(
            "absolute top-4 left-1/2 -translate-x-1/2",
            "whitespace-nowrap",
            "text-xs",
            phaseColor.text,
            "opacity-0 group-hover:opacity-100",
            "pointer-events-auto",
            "bg-theme-bg-card border border-theme-border-primary",
            "px-2 py-1 rounded",
            "z-10"
          )}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {displayQuery}
        </motion.div>
      </div>
    </motion.div>
  );
}
