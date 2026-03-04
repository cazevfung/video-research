'use client';

/**
 * Connection Status Indicator
 * Shows connection status (online/offline/rate-limited) to users
 * Phase 3: Architectural Improvements
 */

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import RateLimitCoordinator from '@/lib/rate-limit-coordinator';
import { cn } from '@/lib/utils';
import { colors, spacing } from '@/config/visual-effects';

type ConnectionStatus = 'online' | 'offline' | 'rate-limited' | 'error';

export function ConnectionStatusIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setStatus('offline');
        setTimeRemaining(0);
        return;
      }
      
      // If online, check rate limit status
      if (RateLimitCoordinator.isPausedNow()) {
        setStatus('rate-limited');
        setTimeRemaining(RateLimitCoordinator.getTimeRemaining());
      } else {
        setStatus('online');
        setTimeRemaining(0);
      }
    };

    // Check rate limit status
    const checkRateLimit = () => {
      if (RateLimitCoordinator.isPausedNow()) {
        setStatus('rate-limited');
        setTimeRemaining(RateLimitCoordinator.getTimeRemaining());
      } else if (navigator.onLine) {
        setStatus('online');
        setTimeRemaining(0);
      } else {
        setStatus('offline');
        setTimeRemaining(0);
      }
    };

    // Initial check
    updateOnlineStatus();
    checkRateLimit();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Subscribe to rate limit coordinator
    const unsubscribe = RateLimitCoordinator.subscribe(checkRateLimit);

    // Check rate limit status every second to update countdown
    const interval = setInterval(checkRateLimit, 1000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Don't show indicator if online
  if (status === 'online') {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50',
        'flex items-center gap-2',
        'px-4 py-2 rounded-lg shadow-lg',
        'border',
        colors.background.primary,
        colors.border.default,
        'backdrop-blur-sm'
      )}
      role="status"
      aria-live="polite"
    >
      {status === 'offline' && (
        <>
          <WifiOff className="w-4 h-4 text-red-500" aria-hidden="true" />
          <span className="text-sm font-medium text-theme-text-primary">
            No internet connection
          </span>
        </>
      )}

      {status === 'rate-limited' && (
        <>
          <AlertCircle className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <span className="text-sm font-medium text-theme-text-primary">
            Rate limited - resuming in {timeRemaining}s
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
          <span className="text-sm font-medium text-theme-text-primary">
            Connection error
          </span>
        </>
      )}
    </div>
  );
}


