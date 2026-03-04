/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests after threshold
 * Phase 2: Connection Crash Fix - High Priority Improvements
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, all requests blocked
 * - HALF_OPEN: Testing if service recovered, limited requests
 * 
 * All configuration values are configurable via environment variables
 */

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  successThreshold: number;    // Number of successes to close from half-open
  timeout: number;             // Time in ms before trying half-open
  name: string;                // Circuit name for logging
}

interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  totalRequests: number;
  blockedRequests: number;
}

/**
 * Get default circuit breaker configuration from environment variables
 */
function getDefaultConfig(name: string): CircuitBreakerConfig {
  return {
    failureThreshold: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5',
      10
    ),
    successThreshold: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '2',
      10
    ),
    timeout: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_TIMEOUT_MS || '60000', // 1 minute default
      10
    ),
    name,
  };
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange: number = Date.now();
  private totalRequests: number = 0;
  private blockedRequests: number = 0;
  
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    const defaultConfig = getDefaultConfig(config.name || 'default');
    this.config = {
      ...defaultConfig,
      ...config,
      name: config.name || defaultConfig.name,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param fn - Async function to execute
   * @returns Result of function or null if circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'open') {
      // Check if timeout has elapsed
      if (this.shouldAttemptReset()) {
        console.log(`[CircuitBreaker:${this.config.name}] 🔄 Transitioning to HALF_OPEN`);
        this.state = 'half-open';
        this.lastStateChange = Date.now();
      } else {
        // Circuit still open, block request
        this.blockedRequests++;
        const timeRemaining = this.getTimeUntilRetry();
        console.warn(
          `[CircuitBreaker:${this.config.name}] ⛔ Circuit OPEN, blocking request ` +
          `(retry in ${Math.ceil(timeRemaining / 1000)}s)`
        );
        return null;
      }
    }

    // Circuit is closed or half-open, attempt request
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      
      console.log(
        `[CircuitBreaker:${this.config.name}] ✅ Success in HALF_OPEN ` +
        `(${this.successCount}/${this.config.successThreshold})`
      );

      // If we've had enough successes, close the circuit
      if (this.successCount >= this.config.successThreshold) {
        console.log(`[CircuitBreaker:${this.config.name}] 🟢 Transitioning to CLOSED`);
        this.state = 'closed';
        this.successCount = 0;
        this.lastStateChange = Date.now();
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(error: unknown): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.warn(
      `[CircuitBreaker:${this.config.name}] ❌ Failure ` +
      `(${this.failureCount}/${this.config.failureThreshold})`,
      error
    );

    if (this.state === 'half-open') {
      // Any failure in half-open state reopens circuit
      console.warn(`[CircuitBreaker:${this.config.name}] 🔴 HALF_OPEN failure, reopening circuit`);
      this.state = 'open';
      this.successCount = 0;
      this.lastStateChange = Date.now();
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures, open circuit
      console.error(`[CircuitBreaker:${this.config.name}] 🔴 Threshold reached, opening circuit`);
      this.state = 'open';
      this.lastStateChange = Date.now();
    }
  }

  /**
   * Check if we should attempt to reset (move to half-open)
   */
  private shouldAttemptReset(): boolean {
    if (this.state !== 'open') return false;
    if (!this.lastFailureTime) return false;

    const elapsed = Date.now() - this.lastFailureTime;
    return elapsed >= this.config.timeout;
  }

  /**
   * Get time remaining until retry attempt
   */
  private getTimeUntilRetry(): number {
    if (this.state !== 'open' || !this.lastFailureTime) return 0;
    
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.config.timeout - elapsed);
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is allowing requests
   */
  isOpen(): boolean {
    return this.state === 'open' && !this.shouldAttemptReset();
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      blockedRequests: this.blockedRequests,
    };
  }

  /**
   * Force reset circuit (for testing)
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
    console.log(`[CircuitBreaker:${this.config.name}] 🔄 Manual reset`);
  }
}


