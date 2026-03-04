"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { animationDurations, typography } from "@/config/visual-effects";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  className?: string;
}

/**
 * ProgressBar Component
 * Displays a thin progress bar with gradient fill
 * Matches PRD Section 5.2.4 specifications
 * Phase 7: Optimized with React.memo and will-change
 */
export const ProgressBar = React.memo(function ProgressBar({ progress, className = "" }: ProgressBarProps) {
  const clampedProgress = React.useMemo(() => Math.max(0, Math.min(100, progress)), [progress]);

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={clampedProgress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress: ${Math.round(clampedProgress)} percent`}>
      <div className="flex items-center justify-between mb-2">
        <div className="h-1 bg-gray-800 rounded-full flex-1 mr-4 relative overflow-hidden">
          <motion.div
            className="h-1 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ duration: animationDurations.progressBar, ease: "easeOut" as const }}
            style={{ willChange: "width" }}
          />
        </div>
        <span className={cn(typography.fontSize.sm, "text-gray-400 font-medium min-w-[3rem] text-right")}>
          {Math.round(clampedProgress)}%
        </span>
      </div>
    </div>
  );
});

