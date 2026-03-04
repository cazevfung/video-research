/**
 * Frontend Metrics Collection
 * Track API performance, errors, and rate limits
 * Phase 3: Architectural Improvements
 */

interface MetricEvent {
  timestamp: number;
  type: string;
  value: number;
  metadata?: Record<string, any>;
}

class MetricsCollector {
  private events: MetricEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents: number = 1000) {
    // Phase 3: Make max events configurable via environment variable
    this.maxEvents = parseInt(
      process.env.NEXT_PUBLIC_METRICS_MAX_EVENTS || String(maxEvents),
      10
    );
  }

  /**
   * Record a metric event
   */
  record(type: string, value: number, metadata?: Record<string, any>): void {
    this.events.push({
      timestamp: Date.now(),
      type,
      value,
      metadata,
    });

    // Limit size
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] ${type}: ${value}`, metadata);
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(): Record<string, any> {
    const now = Date.now();
    const last5Min = this.events.filter(e => now - e.timestamp < 5 * 60 * 1000);
    const last1Hour = this.events.filter(e => now - e.timestamp < 60 * 60 * 1000);

    return {
      total_events: this.events.length,
      events_last_5min: last5Min.length,
      events_last_hour: last1Hour.length,
      error_rate_5min: this.calculateErrorRate(last5Min),
      error_rate_1hour: this.calculateErrorRate(last1Hour),
      rate_limit_hits_5min: last5Min.filter(e => e.type === 'rate_limit').length,
      rate_limit_hits_1hour: last1Hour.filter(e => e.type === 'rate_limit').length,
      avg_request_duration: this.calculateAverage(last5Min.filter(e => e.type === 'api_duration')),
      token_refresh_count_5min: last5Min.filter(e => e.type === 'token_refresh').length,
      token_refresh_count_1hour: last1Hour.filter(e => e.type === 'token_refresh').length,
    };
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(events: MetricEvent[]): number {
    const total = events.filter(e => e.type === 'api_request').length;
    if (total === 0) return 0;
    
    const errors = events.filter(e => e.type === 'api_error').length;
    return (errors / total) * 100;
  }

  /**
   * Calculate average value
   */
  private calculateAverage(events: MetricEvent[]): number {
    if (events.length === 0) return 0;
    const sum = events.reduce((acc, e) => acc + e.value, 0);
    return sum / events.length;
  }

  /**
   * Export metrics for debugging
   */
  export(): string {
    return JSON.stringify({
      summary: this.getSummary(),
      recent_events: this.events.slice(-50),
    }, null, 2);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get recent events by type
   */
  getEventsByType(type: string, limit: number = 50): MetricEvent[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit);
  }
}

// Global instance
export const metrics = new MetricsCollector();

// Helper functions
export function recordAPIRequest(endpoint: string): void {
  metrics.record('api_request', 1, { endpoint });
}

export function recordAPIError(endpoint: string, code: string): void {
  metrics.record('api_error', 1, { endpoint, code });
}

export function recordAPISuccess(endpoint: string, duration: number): void {
  metrics.record('api_success', 1, { endpoint });
  metrics.record('api_duration', duration, { endpoint });
}

export function recordRateLimit(endpoint: string, retryAfter: number): void {
  metrics.record('rate_limit', 1, { endpoint, retryAfter });
}

export function recordTokenRefresh(): void {
  metrics.record('token_refresh', 1);
}

// Add to window for debugging (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__metrics = metrics;
}


