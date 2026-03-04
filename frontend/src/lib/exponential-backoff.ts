/**
 * Exponential Backoff Calculator
 * Calculates increasing delays with jitter for retry attempts
 * Phase 2: Connection Crash Fix - High Priority Improvements
 * 
 * All configuration values are read from apiConfig to avoid hardcoding
 */

import { apiConfig } from '@/config/api';

interface BackoffConfig {
  baseDelay: number;      // Base delay in milliseconds
  maxDelay: number;       // Maximum delay cap
  multiplier: number;     // Exponential multiplier
  jitter: boolean;        // Add random jitter
  jitterFactor: number;   // Jitter percentage (0-1)
}

/**
 * Get default backoff configuration from apiConfig
 * Uses environment variables with sensible defaults
 */
function getDefaultConfig(): BackoffConfig {
  return {
    baseDelay: apiConfig.userDataPollingInterval, // Use existing polling interval as base
    maxDelay: parseInt(
      process.env.NEXT_PUBLIC_BACKOFF_MAX_DELAY_MS || '240000', // 4 minutes default
      10
    ),
    multiplier: parseFloat(
      process.env.NEXT_PUBLIC_BACKOFF_MULTIPLIER || '2',
    ),
    jitter: process.env.NEXT_PUBLIC_BACKOFF_JITTER_ENABLED !== 'false', // Default: true
    jitterFactor: parseFloat(
      process.env.NEXT_PUBLIC_BACKOFF_JITTER_FACTOR || '0.2', // ±20% default
    ),
  };
}

export class ExponentialBackoff {
  private failureCount: number = 0;
  private config: BackoffConfig;
  private lastFailureTime: number = 0;

  constructor(config: Partial<BackoffConfig> = {}) {
    const defaultConfig = getDefaultConfig();
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Record a failure and increment counter
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  /**
   * Record a success and reset counter
   */
  recordSuccess(): void {
    if (this.failureCount > 0) {
      console.log(`[ExponentialBackoff] ✅ Success after ${this.failureCount} failures, resetting`);
    }
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Get current delay based on failure count
   * @returns Delay in milliseconds
   */
  getDelay(): number {
    if (this.failureCount === 0) {
      return this.config.baseDelay;
    }

    // Calculate exponential delay: baseDelay * (multiplier ^ failureCount)
    let delay = this.config.baseDelay * Math.pow(this.config.multiplier, this.failureCount - 1);

    // Cap at maxDelay
    delay = Math.min(delay, this.config.maxDelay);

    // Add jitter if enabled
    if (this.config.jitter) {
      const jitterAmount = delay * this.config.jitterFactor;
      const jitterOffset = (Math.random() - 0.5) * 2 * jitterAmount;
      delay += jitterOffset;
    }

    return Math.round(delay);
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get time since last failure
   */
  getTimeSinceLastFailure(): number {
    if (this.lastFailureTime === 0) return 0;
    return Date.now() - this.lastFailureTime;
  }

  /**
   * Check if should retry based on failure count
   */
  shouldRetry(maxRetries: number = 10): boolean {
    return this.failureCount < maxRetries;
  }

  /**
   * Reset the backoff state
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Get human-readable delay string
   */
  getDelayString(): string {
    const delay = this.getDelay();
    if (delay < 60000) {
      return `${Math.round(delay / 1000)}s`;
    }
    return `${Math.round(delay / 60000)}m`;
  }
}


