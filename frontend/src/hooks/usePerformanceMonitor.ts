"use client";

import * as React from "react";
import { getPerformanceMonitor, type PerformanceMetrics } from "@/utils/performanceMonitor";
import { researchParticleConfig } from "@/config/visual-effects";

/**
 * usePerformanceMonitor Hook
 * Monitors animation performance during particle animations
 * 
 * Phase 7: Polish & Animations - Task 7.2
 * 
 * Features:
 * - Tracks FPS and frame time
 * - Provides performance warnings
 * - Can be enabled/disabled via config
 */
export function usePerformanceMonitor(enabled: boolean = false) {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const monitorRef = React.useRef<ReturnType<typeof getPerformanceMonitor> | null>(null);

  React.useEffect(() => {
    if (!enabled || !researchParticleConfig.loading.performance.enableLogging) {
      return;
    }

    const monitor = getPerformanceMonitor();
    monitorRef.current = monitor;

    const handleMetrics = (newMetrics: PerformanceMetrics) => {
      setMetrics(newMetrics);
    };

    monitor.start(handleMetrics);

    return () => {
      monitor.stop();
      monitorRef.current = null;
    };
  }, [enabled]);

  return {
    metrics,
    isOptimal: metrics?.isOptimal ?? true,
    fps: metrics?.fps ?? 60,
    frameTime: metrics?.frameTime ?? 16.67,
    warning: metrics?.warning,
  };
}
