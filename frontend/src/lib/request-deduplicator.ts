/**
 * Request Deduplication
 * Prevents multiple identical requests from executing simultaneously
 * Returns the same promise for duplicate requests
 * Phase 3: Architectural Improvements
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly cacheTimeout: number;

  constructor(cacheTimeout: number = 5000) {
    // Phase 3: Make cache timeout configurable via environment variable
    this.cacheTimeout = parseInt(
      process.env.NEXT_PUBLIC_REQUEST_DEDUP_CACHE_TIMEOUT_MS || String(cacheTimeout),
      10
    );
  }

  /**
   * Execute a request with deduplication
   * If same request is already pending, returns existing promise
   * @param key - Unique identifier for the request
   * @param fn - Function to execute
   * @returns Promise with result
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    
    if (pending) {
      const age = Date.now() - pending.timestamp;
      
      // If request is recent, return existing promise
      if (age < this.cacheTimeout) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RequestDeduplicator] ⚡ Using cached request: ${key} (age: ${age}ms)`);
        }
        return pending.promise;
      } else {
        // Old request, clean up
        this.pendingRequests.delete(key);
      }
    }

    // Execute new request
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RequestDeduplicator] 🚀 New request: ${key}`);
    }
    
    const promise = fn().finally(() => {
      // Clean up after request completes
      this.pendingRequests.delete(key);
    });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear all pending requests (for cleanup)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get pending request keys (for debugging)
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();


