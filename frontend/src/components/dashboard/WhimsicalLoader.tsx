"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ParticleSystem } from "./ParticleSystem";
import type { JobStatus } from "@/types";
import {
  orbConfig,
  orbAnimations,
  orbParticleCounts,
  orbGradients,
  waveConfig,
  shadows,
  colors,
  successRingAnimation,
  getParticleBehavior,
  getParticleCount,
  getOrbGradient,
  getOrbAnimation,
} from "@/config/visual-effects";

interface WhimsicalLoaderProps {
  status: JobStatus | "idle" | "connected";
  progress: number;
  isCompleted?: boolean; // Phase 2: Completion state for smooth transitions
  // Phase 2: Optional blur overrides for testing/adjustment
  blurConfig?: {
    enabled?: boolean;
    radius?: number;
    opacity?: number;
  };
  // Test/override props for customization
  orbGradient?: string; // Tailwind gradient classes (e.g., "from-blue-500 to-purple-500")
  particleCount?: number; // Override particle count (if not provided, uses status-based count)
  particleConfig?: {
    size?: { min: number; max: number };
    distance?: { base: number; random: number };
    speed?: { min: number; max: number };
    opacity?: number;
  };
  particleColor?: string; // CSS color for particles
  waveColor?: string; // CSS color for wave effects (e.g., "rgba(156, 163, 175, 0.3)")
}

/**
 * WhimsicalLoader Component - "The Alchemist's Orb"
 * Visualizes processing state with an animated orb and particle system
 * Matches PRD Section 5.2.2 specifications
 * 
 * Phase 1: Fixed star alignment - orb center now calculated relative to parent container
 * Phase 2: Added Gaussian blur overlay for dreamy, ethereal visual effect
 * Phase 3: Added completion animation for smooth state transitions
 * Phase 4: Integration & Testing - Edge case handling and accessibility improvements
 * 
 * Key Features:
 * - State-specific animations (fetching, processing, generating, etc.)
 * - Completion animation with success colors
 * - Particle system with state-specific behaviors (properly aligned with orb)
 * - Wave effects for generating state
 * - Success ring animation on completion
 * - Gaussian blur overlay for enhanced visual depth and dreamy aesthetic
 * 
 * Animations:
 * - Fetching: Scale pulse
 * - Processing: Rotation
 * - Condensing: Scale compression
 * - Aggregating: Opacity pulse
 * - Generating: Vertical movement with wave effects
 * - Completed: Scale down with success gradient and ring
 * - Error: Shake animation
 * 
 * Edge Cases Handled:
 * - Rapid state changes (animation transitions smoothly)
 * - Error during completion (no completion animation)
 * - Reduced motion preferences (animations disabled)
 * - Layout changes tracked with ResizeObserver for accurate positioning
 * 
 * Accessibility:
 * - ARIA labels for screen readers
 * - Respects prefers-reduced-motion
 * - Semantic status indication
 */
export function WhimsicalLoader({ 
  status, 
  progress, 
  isCompleted = false, 
  blurConfig,
  orbGradient,
  particleCount: overrideParticleCount,
  particleConfig,
  particleColor,
  waveColor,
}: WhimsicalLoaderProps) {
  const shouldReduceMotion = useReducedMotion();
  const [orbCenter, setOrbCenter] = React.useState({ x: 0, y: 0 });
  const orbRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Phase 1: Fix star alignment - Update orb center position relative to parent container
  // This ensures particles are positioned correctly relative to the particle container
  React.useEffect(() => {
    const updateOrbCenter = () => {
      if (orbRef.current && containerRef.current) {
        const orbRect = orbRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Calculate orb center relative to the parent container's coordinate system
        // This accounts for flexbox centering and any offsets
        setOrbCenter({
          x: orbRect.left - containerRect.left + orbRect.width / 2,
          y: orbRect.top - containerRect.top + orbRect.height / 2,
        });
      }
    };

    updateOrbCenter();
    window.addEventListener('resize', updateOrbCenter);
    // Also update on any layout changes (e.g., animations)
    const observer = new ResizeObserver(updateOrbCenter);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    if (orbRef.current) {
      observer.observe(orbRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateOrbCenter);
      observer.disconnect();
    };
  }, []);

  // Phase 2: Get completion-specific configuration
  const getCompletionConfig = () => {
    if (!isCompleted) return null;
    
    const completedAnim = orbAnimations.completed;
    
    return {
      gradient: orbGradients.completed,
      orbAnimation: {
        scale: completedAnim.scale,
        opacity: completedAnim.opacity,
        transition: {
          duration: completedAnim.duration,
          ease: completedAnim.ease
        }
      }
    };
  };

  // Get state-specific configuration from centralized config
  const getStateConfig = () => {
    const animConfig = getOrbAnimation(status);
    
    let orbAnimation: any;
    if (status === "error") {
      orbAnimation = {
        x: (animConfig as any).shake,
        transition: { duration: animConfig.duration, repeat: (animConfig as any).repeat },
      };
    } else if (status === "processing") {
      orbAnimation = {
        rotate: (animConfig as any).rotate,
        transition: { duration: animConfig.duration, repeat: Infinity, ease: "linear" as const },
      };
    } else if ((animConfig as any).scale) {
      orbAnimation = {
        scale: (animConfig as any).scale,
        transition: { duration: animConfig.duration, repeat: Infinity },
      };
    } else if ((animConfig as any).opacity) {
      orbAnimation = {
        opacity: (animConfig as any).opacity,
        transition: { duration: animConfig.duration, repeat: Infinity },
      };
    } else if ((animConfig as any).y) {
      orbAnimation = {
        y: (animConfig as any).y,
        transition: { duration: animConfig.duration, repeat: Infinity },
      };
    } else {
      // Default connected state
      orbAnimation = {
        scale: (animConfig as any).scale,
        transition: { duration: animConfig.duration, repeat: Infinity },
      };
    }

    return {
      gradient: getOrbGradient(status),
      particleBehavior: getParticleBehavior(status),
      particleCount: getParticleCount(status),
      orbAnimation,
    };
  };

  const completionConfig = getCompletionConfig();
  const stateConfig = getStateConfig();
  
  // Phase 2: Use completion config if completed, otherwise use state config
  // Override gradient if provided via prop
  const config = completionConfig ? {
    gradient: orbGradient ?? completionConfig.gradient,
    particleBehavior: stateConfig.particleBehavior,
    particleCount: 0, // Fade out particles on completion
    orbAnimation: completionConfig.orbAnimation,
  } : {
    ...stateConfig,
    gradient: orbGradient ?? stateConfig.gradient,
  };
  
  const isActive = status !== "idle" && status !== "error";

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full bg-transparent"
      style={{ 
        minHeight: `${orbConfig.minHeight.mobile}px`,
        // Phase 3 Fix: Ensure no background or border styling
        // Component is transparent and seamless - no visible container
      }}
    >
      {/* Orb Container */}
      <div className="relative" ref={orbRef}>
        <motion.div
          className={`rounded-full bg-gradient-to-br ${config.gradient}`}
          style={{
            width: `${orbConfig.size.mobile}px`,
            height: `${orbConfig.size.mobile}px`,
            boxShadow: shadows.orbGlow, // Phase 3: Use centralized config
            willChange: shouldReduceMotion ? "auto" : "transform, opacity",
          }}
          animate={shouldReduceMotion ? {} : config.orbAnimation}
          aria-label={`Processing status: ${status}`}
        />

        {/* Wave effect for generating state - DISABLED per user preference */}
        {/* Wave rings have been disabled to simplify the visual and focus on core orb and particle effects */}
        {false && status === "generating" && !isCompleted && !shouldReduceMotion && (
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: waveConfig.count }, (_, i) => i).map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border-2"
                style={{
                  width: `${orbConfig.size.mobile}px`,
                  height: `${orbConfig.size.mobile}px`,
                  borderColor: waveColor ?? "rgba(156, 163, 175, 0.3)", // Default gray-400/30
                }}
                initial={{ scale: waveConfig.scale.start, opacity: waveConfig.opacity.start }}
                animate={{
                  scale: [waveConfig.scale.start, waveConfig.scale.mid, waveConfig.scale.end],
                  opacity: [waveConfig.opacity.start, waveConfig.opacity.mid, waveConfig.opacity.end],
                }}
                transition={{
                  duration: waveConfig.duration,
                  repeat: Infinity,
                  delay: i * waveConfig.delay,
                  ease: "easeOut" as const,
                }}
              />
            ))}
          </div>
        )}

        {/* Phase 2: Success ring animation for completion */}
        {isCompleted && !shouldReduceMotion && (
          <motion.div
            className={`absolute inset-0 rounded-full border-4 ${colors.successRing.border}`}
            animate={{
              scale: successRingAnimation.scale,
              opacity: successRingAnimation.opacity
            }}
            transition={{
              duration: successRingAnimation.duration,
              repeat: Infinity,
              ease: successRingAnimation.ease
            }}
          />
        )}
      </div>

      {/* Particle System - Phase 2: Fade out particles on completion */}
      {isActive && (
        <ParticleSystem
          behavior={config.particleBehavior}
          particleCount={isCompleted ? 0 : (overrideParticleCount ?? config.particleCount)}
          orbCenter={orbCenter}
          enabled={!shouldReduceMotion && !isCompleted}
          particleConfig={particleConfig}
          particleColor={particleColor}
        />
      )}

      {/* Phase 2: Gaussian blur overlay for dreamy, ethereal effect */}
      {/* Phase 1 Fix: Improved blur positioning, z-index, and coverage to ensure visibility */}
      {(() => {
        // Use blurConfig override if provided, otherwise use orbConfig
        const blur = blurConfig 
          ? { 
              enabled: blurConfig.enabled ?? orbConfig.blur.enabled,
              radius: blurConfig.radius ?? orbConfig.blur.radius,
              opacity: blurConfig.opacity ?? orbConfig.blur.opacity,
            }
          : orbConfig.blur;
        
        if (!blur.enabled || shouldReduceMotion) {
          return null;
        }

        // Phase 1 Fix: Create a blur overlay that covers all elements
        // Using both backdrop-filter (blurs content behind) and filter (blurs the overlay itself)
        // This ensures blur effect is visible even when there's no content behind
        // Fix: Explicitly set transparent background to prevent backdrop-filter from creating visible background
        return (
          <motion.div
            className="absolute inset-0 pointer-events-none bg-transparent"
            style={{
              // Backdrop filter blurs content behind the overlay
              backdropFilter: `blur(${blur.radius}px)`,
              WebkitBackdropFilter: `blur(${blur.radius}px)`,
              // Filter blurs the overlay itself for additional effect
              filter: `blur(${blur.radius * 0.5}px)`,
              opacity: blur.opacity,
              mixBlendMode: 'normal',
              willChange: 'filter, opacity, backdrop-filter',
              zIndex: 1000, // Ensure blur is on top of all elements (orb, particles, etc.)
              // Explicitly set transparent background to prevent backdrop-filter side effects
              backgroundColor: 'transparent',
              // Ensure blur covers entire container area
              width: '100%',
              height: '100%',
              // Ensure blur extends beyond container to cover particles
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
            }}
            aria-hidden="true"
          />
        );
      })()}
    </div>
  );
}

