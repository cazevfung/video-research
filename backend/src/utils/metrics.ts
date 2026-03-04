/**
 * Simple metrics collection utility
 * Tracks job success/failure rates, processing times, and API call latencies
 */

import { getMetricsConfig } from '../config';

interface MetricEntry {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

interface JobMetrics {
  total: number;
  successful: number;
  failed: number;
  processingTimes: number[];
  averageProcessingTime: number;
}

interface APIMetrics {
  calls: number;
  latencies: number[];
  errors: number;
  averageLatency: number;
}

class MetricsCollector {
  private jobMetrics: Map<string, JobMetrics> = new Map();
  private apiMetrics: Map<string, APIMetrics> = new Map();
  private quotaUsage: Map<string, number> = new Map(); // userId -> total usage

  /**
   * Record a job completion
   */
  recordJobCompletion(
    jobId: string,
    success: boolean,
    processingTimeMs: number
  ): void {
    const key = 'all_jobs';
    const metrics = this.jobMetrics.get(key) || {
      total: 0,
      successful: 0,
      failed: 0,
      processingTimes: [],
      averageProcessingTime: 0,
    };

    metrics.total++;
    if (success) {
      metrics.successful++;
    } else {
      metrics.failed++;
    }

    metrics.processingTimes.push(processingTimeMs);
    // Keep only configured number of processing times to prevent memory bloat
    const maxRetention = getMetricsConfig().max_items_retention;
    if (metrics.processingTimes.length > maxRetention) {
      metrics.processingTimes.shift();
    }

    // Calculate average
    const sum = metrics.processingTimes.reduce((a, b) => a + b, 0);
    metrics.averageProcessingTime = sum / metrics.processingTimes.length;

    this.jobMetrics.set(key, metrics);
  }

  /**
   * Record an API call
   */
  recordAPICall(
    apiName: string,
    latencyMs: number,
    success: boolean
  ): void {
    const metrics = this.apiMetrics.get(apiName) || {
      calls: 0,
      latencies: [],
      errors: 0,
      averageLatency: 0,
    };

    metrics.calls++;
    if (!success) {
      metrics.errors++;
    }

    metrics.latencies.push(latencyMs);
    // Keep only configured number of latencies
    const maxRetention = getMetricsConfig().max_items_retention;
    if (metrics.latencies.length > maxRetention) {
      metrics.latencies.shift();
    }

    // Calculate average
    const sum = metrics.latencies.reduce((a, b) => a + b, 0);
    metrics.averageLatency = sum / metrics.latencies.length;

    this.apiMetrics.set(apiName, metrics);
  }

  /**
   * Record quota usage
   */
  recordQuotaUsage(userId: string, amount: number): void {
    const current = this.quotaUsage.get(userId) || 0;
    this.quotaUsage.set(userId, current + amount);
  }

  /**
   * Get job metrics
   */
  getJobMetrics(): JobMetrics | undefined {
    return this.jobMetrics.get('all_jobs');
  }

  /**
   * Get API metrics for a specific API
   */
  getAPIMetrics(apiName: string): APIMetrics | undefined {
    return this.apiMetrics.get(apiName);
  }

  /**
   * Get all API metrics
   */
  getAllAPIMetrics(): Map<string, APIMetrics> {
    return new Map(this.apiMetrics);
  }

  /**
   * Get quota usage statistics
   */
  getQuotaUsageStats(): {
    totalUsers: number;
    totalUsage: number;
    topUsers: Array<{ userId: string; usage: number }>;
  } {
    const entries = Array.from(this.quotaUsage.entries());
    const totalUsage = entries.reduce((sum, [, usage]) => sum + usage, 0);
    
    const topUsersLimit = getMetricsConfig().top_users_limit;
    const topUsers = entries
      .map(([userId, usage]) => ({ userId, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, topUsersLimit);

    return {
      totalUsers: entries.length,
      totalUsage,
      topUsers,
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.jobMetrics.clear();
    this.apiMetrics.clear();
    this.quotaUsage.clear();
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    jobs: JobMetrics | undefined;
    apis: Record<string, APIMetrics>;
    quota: {
      totalUsers: number;
      totalUsage: number;
      topUsers: Array<{ userId: string; usage: number }>;
    };
  } {
    const apis: Record<string, APIMetrics> = {};
    this.apiMetrics.forEach((metrics, name) => {
      apis[name] = metrics;
    });

    return {
      jobs: this.getJobMetrics(),
      apis,
      quota: this.getQuotaUsageStats(),
    };
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();

