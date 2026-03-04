"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { streamingConfig, animationDurations } from "@/config/visual-effects";

interface StreamingProgressProps {
  progress: number; // 85-99% during streaming
  className?: string;
}

/**
 * StreamingProgress Component
 * Displays streaming progress bar (85-99%) during generation phase
 * Matches PRD Section 4.2.4.1 specifications
 * Phase 4: Animate UI Progress component integration
 */
export function StreamingProgress({ progress, className }: StreamingProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  const clampedProgress = React.useMemo(
    () => Math.max(streamingConfig.progress.min, Math.min(streamingConfig.progress.max, progress)),
    [progress]
  );

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={streamingConfig.progress.min}
      aria-valuemax={streamingConfig.progress.max}
      aria-label={`Streaming progress: ${Math.round(clampedProgress)} percent`}
    >
      <ProgressPrimitive.Root
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          streamingConfig.progress.height,
          streamingConfig.progress.background
        )}
        value={clampedProgress}
      >
        <motion.div
          className={cn("h-full rounded-full", streamingConfig.progress.gradient)}
          initial={shouldReduceMotion ? {} : { width: 0 }}
          animate={shouldReduceMotion ? {} : { width: `${clampedProgress}%` }}
          transition={{ duration: animationDurations.streamingProgressTransition, ease: "easeOut" as const }}
          style={{ willChange: "width" }}
        />
        {/* Subtle pulse effect during active streaming */}
        {clampedProgress < streamingConfig.progress.max && !shouldReduceMotion && (
          <motion.div
            className={cn("absolute inset-0 rounded-full", streamingConfig.progress.gradient)}
            style={{ opacity: streamingConfig.progress.pulseBaseOpacity }}
            animate={{ opacity: streamingConfig.progress.pulseOpacity }}
            transition={{ duration: animationDurations.streamingProgressPulse, repeat: Infinity, ease: "easeInOut" as const }}
          />
        )}
      </ProgressPrimitive.Root>
    </div>
  );
}

