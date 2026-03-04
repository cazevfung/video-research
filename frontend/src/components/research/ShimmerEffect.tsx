"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { researchParticleConfig, colors } from "@/config/visual-effects";

export interface ShimmerEffectProps {
  className?: string;
  children?: React.ReactNode;
  // If true, renders as standalone overlay (no children wrapper)
  overlay?: boolean;
}

/**
 * ShimmerEffect Component
 * Shimmer loading effect for cards and content areas
 * 
 * Phase 7: Polish & Animations - Task 7.1
 * 
 * Features:
 * - Animated shimmer gradient overlay
 * - Respects reduced motion preference
 * - Can wrap content or be standalone
 */
export function ShimmerEffect({ className, children, overlay = false }: ShimmerEffectProps) {
  const prefersReducedMotion = useReducedMotion();

  // Overlay mode - just the shimmer overlay
  if (overlay) {
    if (prefersReducedMotion) {
      return (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none z-10",
            colors.background.tertiary,
            "opacity-20",
            className
          )}
        />
      );
    }

    return (
      <motion.div
        className={cn("absolute inset-0 pointer-events-none z-10", className)}
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.15) 50%,
            transparent 100%
          )`,
          width: '50%',
        }}
        animate={{
          x: ['-100%', '300%'],
        }}
        transition={{
          duration: researchParticleConfig.loading.skeleton.shimmerDuration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    );
  }

  // Wrapper mode - wraps children with shimmer
  if (prefersReducedMotion) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        {children}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none",
            colors.background.tertiary,
            "opacity-20"
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {children}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.15) 50%,
            transparent 100%
          )`,
          width: '50%',
        }}
        animate={{
          x: ['-100%', '300%'],
        }}
        transition={{
          duration: researchParticleConfig.loading.skeleton.shimmerDuration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
