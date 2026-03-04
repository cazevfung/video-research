"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { particleConfig, type ParticleBehavior } from "@/config/visual-effects";

interface ParticleSystemProps {
  behavior: ParticleBehavior;
  particleCount: number;
  orbCenter: { x: number; y: number };
  enabled?: boolean;
  // Test/override props
  particleConfig?: {
    size?: { min: number; max: number };
    distance?: { base: number; random: number };
    speed?: { min: number; max: number };
    opacity?: number;
  };
  particleColor?: string; // CSS color (e.g., "rgba(156, 163, 175, 0.6)" or "rgb(100, 200, 255)")
}

interface Particle {
  id: string;
  x: number;
  y: number;
  angle: number;
  distance: number;
  speed: number;
  size: number;
}

/**
 * Particle System Component
 * Creates animated particles around the orb based on current processing state
 * Phase 7: Optimized with React.memo and will-change
 */
export const ParticleSystem = React.memo(function ParticleSystem({
  behavior,
  particleCount,
  orbCenter,
  enabled = true,
  particleConfig: overrideConfig,
  particleColor,
}: ParticleSystemProps) {
  const shouldReduceMotion = useReducedMotion();
  const [particles, setParticles] = React.useState<Particle[]>([]);

  // Use override config if provided, otherwise use default
  const config = React.useMemo(() => ({
    size: overrideConfig?.size ?? particleConfig.size,
    distance: overrideConfig?.distance ?? particleConfig.distance,
    speed: overrideConfig?.speed ?? particleConfig.speed,
    opacity: overrideConfig?.opacity ?? particleConfig.opacity.default,
  }), [overrideConfig]);

  // Initialize particles based on behavior
  React.useEffect(() => {
    if (!enabled || shouldReduceMotion) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = config.distance.base + Math.random() * config.distance.random;
      const startX = orbCenter.x + Math.cos(angle) * distance;
      const startY = orbCenter.y + Math.sin(angle) * distance;

      newParticles.push({
        id: `particle-${i}`,
        x: startX,
        y: startY,
        angle,
        distance,
        speed: config.speed.min + Math.random() * (config.speed.max - config.speed.min),
        size: config.size.min + Math.random() * (config.size.max - config.size.min),
      });
    }
    setParticles(newParticles);
  }, [behavior, particleCount, orbCenter, enabled, shouldReduceMotion, config]);

  if (!enabled || shouldReduceMotion || particles.length === 0) {
    return null;
  }

  const getAnimationVariants = (particle: Particle) => {
    switch (behavior) {
      case "fly-in": {
        const config = particleConfig.durations["fly-in"];
        return {
          initial: {
            x: particle.x - orbCenter.x,
            y: particle.y - orbCenter.y,
            opacity: 1,
          },
          animate: {
            x: 0,
            y: 0,
            opacity: 0,
          },
          transition: {
            duration: config.base + Math.random() * config.random,
            repeat: Infinity,
            ease: "easeIn" as const,
            delay: Math.random() * config.delay,
          },
        };
      }

      case "spiral": {
        const config = particleConfig.durations.spiral;
        return {
          initial: {
            x: particle.x - orbCenter.x,
            y: particle.y - orbCenter.y,
            opacity: 1,
            rotate: 0,
          },
          animate: {
            x: 0,
            y: 0,
            opacity: 0,
            rotate: 360,
          },
          transition: {
            duration: config.base + Math.random() * config.random,
            repeat: Infinity,
            ease: "easeIn" as const,
          },
        };
      }

      case "orbit": {
        const durationConfig = particleConfig.durations.orbit;
        return {
          initial: {
            x: Math.cos(particle.angle) * particle.distance,
            y: Math.sin(particle.angle) * particle.distance,
            opacity: config.opacity,
          },
          animate: {
            x: Math.cos(particle.angle + Math.PI * 2) * particle.distance,
            y: Math.sin(particle.angle + Math.PI * 2) * particle.distance,
            opacity: config.opacity,
          },
          transition: {
            duration: durationConfig.base + Math.random() * durationConfig.random,
            repeat: Infinity,
            ease: "linear" as const,
          },
        };
      }

      case "flow-down": {
        const config = particleConfig.durations["flow-down"];
        return {
          initial: {
            x: (particle.x - orbCenter.x) * 0.5,
            y: config.startY,
            opacity: 1,
          },
          animate: {
            x: (particle.x - orbCenter.x) * 0.5 + (Math.random() - 0.5) * config.xVariance,
            y: config.endY,
            opacity: 0,
          },
          transition: {
            duration: config.base + Math.random() * config.random,
            repeat: Infinity,
            ease: "easeIn" as const,
          },
        };
      }

      default:
        return {};
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => {
        const variants = getAnimationVariants(particle);
        return (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${orbCenter.x}px`,
              top: `${orbCenter.y}px`,
              backgroundColor: particleColor ?? "rgba(156, 163, 175, 0.6)", // Default gray-400/60
              willChange: "transform",
            }}
            initial={variants.initial}
            animate={variants.animate}
            transition={variants.transition}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
});

