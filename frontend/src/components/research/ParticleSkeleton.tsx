"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { researchParticleConfig, colors, spacing } from "@/config/visual-effects";

export interface ParticleSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * ParticleSkeleton Component
 * Loading skeleton for particle system visualization
 * 
 * Phase 7: Polish & Animations - Task 7.1
 * 
 * Features:
 * - Animated skeleton particles that pulse
 * - Respects reduced motion preference
 * - Configurable count
 * - Shimmer effect
 */
export function ParticleSkeleton({ 
  count = researchParticleConfig.loading.skeleton.particleSkeleton.count,
  className,
}: ParticleSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const skeletonConfig = researchParticleConfig.loading.skeleton.particleSkeleton;

  if (prefersReducedMotion) {
    // Static version for reduced motion
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {Array.from({ length: count }).map((_, idx) => {
          const angle = (idx / count) * Math.PI * 2;
          const radius = skeletonConfig.spacing;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <div
              key={idx}
              className={cn(
                "absolute rounded-full",
                colors.background.tertiary,
                "animate-pulse"
              )}
              style={{
                width: skeletonConfig.size,
                height: skeletonConfig.size,
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {Array.from({ length: count }).map((_, idx) => {
        const angle = (idx / count) * Math.PI * 2;
        const radius = skeletonConfig.spacing;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const delay = idx * researchParticleConfig.loading.skeleton.shimmerDelay;
        
        return (
          <motion.div
            key={idx}
            className={cn(
              "absolute rounded-full",
              colors.background.tertiary
            )}
            style={{
              width: skeletonConfig.size,
              height: skeletonConfig.size,
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: researchParticleConfig.loading.skeleton.shimmerDuration,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}
