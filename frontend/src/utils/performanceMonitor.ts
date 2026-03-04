/**
 * Performance Monitor Utility
 * Monitors animation performance and provides FPS tracking
 * 
 * Phase 7: Polish & Animations - Task 7.2
 * 
 * Features:
 * - FPS tracking
 * - Frame time monitoring
 * - Performance warnings
 * - Configurable thresholds
 */

import { researchParticleConfig } from "@/config/visual-effects";

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  isOptimal: boolean;
  warning?: string;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameTime = 16.67;
  private intervalId: number | null = null;
  private callback: ((metrics: PerformanceMetrics) => void) | null = null;
  private readonly config = researchParticleConfig.loading.performance;

  /**
   * Start monitoring performance
   */
  start(callback?: (metrics: PerformanceMetrics) => void): void {
    this.callback = callback || null;
    this.lastTime = performance.now();
    this.frameCount = 0;

    const measure = (currentTime: number) => {
      const deltaTime = currentTime - this.lastTime;
      
      if (deltaTime >= 1000) {
        // Calculate FPS
        this.fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.frameTime = deltaTime / this.frameCount;
        
        const metrics = this.getMetrics();
        
        if (this.callback) {
          this.callback(metrics);
        }
        
        if (this.config.enableLogging && !metrics.isOptimal) {
          console.warn('[PerformanceMonitor]', metrics.warning, metrics);
        }
        
        this.frameCount = 0;
        this.lastTime = currentTime;
      }
      
      this.frameCount++;
      requestAnimationFrame(measure);
    };
    
    requestAnimationFrame(measure);

    // Also check at intervals for callback
    if (this.callback) {
      this.intervalId = window.setInterval(() => {
        const metrics = this.getMetrics();
        this.callback!(metrics);
      }, this.config.monitoringInterval);
    }
  }

  /**
   * Stop monitoring performance
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.callback = null;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const isOptimal = 
      this.fps >= this.config.targetFPS && 
      this.frameTime <= this.config.frameTimeThreshold;
    
    let warning: string | undefined;
    if (!isOptimal) {
      if (this.fps < this.config.targetFPS) {
        warning = `FPS below target: ${this.fps} < ${this.config.targetFPS}`;
      } else if (this.frameTime > this.config.frameTimeThreshold) {
        warning = `Frame time too high: ${this.frameTime.toFixed(2)}ms > ${this.config.frameTimeThreshold}ms`;
      }
    }

    return {
      fps: this.fps,
      frameTime: this.frameTime,
      isOptimal,
      warning,
    };
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Get current frame time
   */
  getFrameTime(): number {
    return this.frameTime;
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

/**
 * Get or create performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}
