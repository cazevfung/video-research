/**
 * Phase 5: Performance Optimization Utilities
 * Provides utilities for performance monitoring and optimization
 */

/**
 * Measure performance of a function execution
 */
export function measurePerformance<T>(
  fn: () => T,
  label?: string
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  if (label && process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Measure async performance
 */
export async function measureAsyncPerformance<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  if (label && process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit function execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get bundle size information (for development/debugging)
 */
export function getBundleInfo(): {
  scripts: HTMLScriptElement[];
  stylesheets: HTMLLinkElement[];
  totalScripts: number;
  totalStylesheets: number;
} {
  if (typeof document === 'undefined') {
    return {
      scripts: [],
      stylesheets: [],
      totalScripts: 0,
      totalStylesheets: 0,
    };
  }

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const stylesheets = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]')
  );

  return {
    scripts: scripts as HTMLScriptElement[],
    stylesheets: stylesheets as HTMLLinkElement[],
    totalScripts: scripts.length,
    totalStylesheets: stylesheets.length,
  };
}

/**
 * Monitor component render performance
 */
export function useRenderPerformance(componentName: string) {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }

  const start = performance.now();

  return () => {
    const end = performance.now();
    const duration = end - start;
    console.log(`[Render] ${componentName}: ${duration.toFixed(2)}ms`);
  };
}

/**
 * Check if code is running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if code is running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

