/**
 * Global Rate Limit Coordinator
 * Ensures all hooks pause/resume polling together when rate limited
 * Prevents cascading failures from independent pause timers
 */

type RateLimitListener = () => void;

class RateLimitCoordinator {
  private static isPaused: boolean = false;
  private static resumeTime: number | null = null;
  private static listeners: Set<RateLimitListener> = new Set();
  private static checkInterval: NodeJS.Timeout | null = null;

  /**
   * Pause all polling for specified duration
   * @param seconds - Duration to pause in seconds
   */
  static pause(seconds: number): void {
    this.isPaused = true;
    this.resumeTime = Date.now() + (seconds * 1000);
    
    console.warn(`[RateLimitCoordinator] 🛑 Global pause for ${seconds} seconds`);
    console.warn(`[RateLimitCoordinator] Resume at: ${new Date(this.resumeTime).toISOString()}`);
    
    // Notify all listeners
    this.notifyListeners();
    
    // Set up auto-resume check if not already running
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        if (this.isPausedNow() === false && this.isPaused) {
          // Time has elapsed, resume
          this.resume();
        }
      }, 1000); // Check every second
    }
  }

  /**
   * Check if polling is currently paused
   * @returns true if paused, false if can proceed
   */
  static isPausedNow(): boolean {
    if (!this.isPaused) return false;
    
    if (this.resumeTime && Date.now() >= this.resumeTime) {
      // Pause period has expired, but don't auto-resume yet
      // Let the check interval handle it
      return false;
    }
    
    return true;
  }

  /**
   * Resume all polling
   */
  static resume(): void {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    this.resumeTime = null;
    
    console.log('[RateLimitCoordinator] ✅ Global pause lifted, resuming polling');
    
    // Notify all listeners
    this.notifyListeners();
    
    // Clear check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Subscribe to pause/resume events
   * @param callback - Function to call when pause state changes
   * @returns Unsubscribe function
   */
  static subscribe(callback: RateLimitListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get time remaining until resume (in seconds)
   * @returns Seconds remaining, or 0 if not paused
   */
  static getTimeRemaining(): number {
    if (!this.isPaused || !this.resumeTime) return 0;
    
    const remaining = Math.max(0, this.resumeTime - Date.now());
    return Math.ceil(remaining / 1000);
  }

  /**
   * Get current pause status for debugging
   */
  static getStatus(): {
    isPaused: boolean;
    resumeTime: Date | null;
    timeRemaining: number;
    listenerCount: number;
  } {
    return {
      isPaused: this.isPaused,
      resumeTime: this.resumeTime ? new Date(this.resumeTime) : null,
      timeRemaining: this.getTimeRemaining(),
      listenerCount: this.listeners.size,
    };
  }

  /**
   * Notify all listeners of state change
   */
  private static notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[RateLimitCoordinator] Error in listener callback:', error);
      }
    });
  }

  /**
   * Reset coordinator (for testing)
   */
  static reset(): void {
    this.isPaused = false;
    this.resumeTime = null;
    this.listeners.clear();
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export default RateLimitCoordinator;


