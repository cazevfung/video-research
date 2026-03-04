'use client';

/**
 * Phase 1: Foundation - useTier hook
 * Custom hook for fetching and managing tier status and requests
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTierStatus, requestTierUpgrade } from '@/lib/api';
import { TierStatus } from '@/types';
import { apiConfig } from '@/config/api';
import RateLimitCoordinator from '@/lib/rate-limit-coordinator';
import { ExponentialBackoff } from '@/lib/exponential-backoff';
import { CircuitBreaker } from '@/lib/circuit-breaker';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

// Define ApiError type locally
interface ApiError {
  code: string;
  message: string;
  details?: any;
}

interface UseTierReturn {
  tierStatus: TierStatus | null;
  loading: boolean;
  error: ApiError | null;
  requestUpgrade: (tier: 'starter' | 'pro' | 'premium') => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing tier status and upgrade requests
 * Automatically polls for updates at configured interval
 */
export function useTier(): UseTierReturn {
  const { showToast } = useToast();
  const { isAuthenticated, loading: authLoading, isGuest } = useAuth();
  
  const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs to manage polling and cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Phase 2: Exponential backoff and circuit breaker
  const backoffRef = useRef(new ExponentialBackoff({
    baseDelay: apiConfig.userDataPollingInterval * 2, // Tier polls at half frequency
    maxDelay: parseInt(
      process.env.NEXT_PUBLIC_BACKOFF_MAX_DELAY_MS || '240000', // 4 minutes
      10
    ),
    multiplier: parseFloat(
      process.env.NEXT_PUBLIC_BACKOFF_MULTIPLIER || '2',
    ),
  }));
  
  const circuitBreakerRef = useRef(new CircuitBreaker({
    name: 'Tier',
    failureThreshold: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5',
      10
    ),
    successThreshold: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '2',
      10
    ),
    timeout: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_TIMEOUT_MS || '60000', // 1 minute
      10
    ),
  }));

  /**
   * Fetch tier status from API
   * Phase 2: Enhanced with circuit breaker and exponential backoff
   */
  const fetchTierStatus = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Allow API calls for authenticated users or guests, but not if auth is still loading
    // Note: Tier status might not be relevant for guests, but we allow the API call
    if (!isAuthenticated && !isGuest && !authLoading) {
      setLoading(false);
      setTierStatus(null);
      setError(null);
      return;
    }

    // Wait for auth to finish loading before making API calls
    if (authLoading) {
      return;
    }

    // Check global coordinator before polling
    if (RateLimitCoordinator.isPausedNow()) {
      return;
    }

    // Phase 2: Check circuit breaker
    if (circuitBreakerRef.current.isOpen()) {
      console.warn('[useTier] Circuit breaker is open, skipping request');
      return;
    }

    try {
      setError(null);
      
      // Phase 2: Execute with circuit breaker protection
      const response = await circuitBreakerRef.current.execute(async () => {
        return await getTierStatus();
      });

      // Circuit breaker blocked the request
      if (response === null) {
        return;
      }

      if (response.error) {
        // Phase 2: Record failure for exponential backoff
        backoffRef.current.recordFailure();
        
        // Handle UNAUTHORIZED errors - stop polling immediately
        // Note: This is expected when user is not authenticated, so we use debug instead of error
        if (response.error.code === 'UNAUTHORIZED') {
          const wasAuthenticated = tierStatus !== null;
          
          console.debug('[useTier] Unauthorized - stopping polling', {
            wasAuthenticated,
            message: wasAuthenticated ? 'Session expired' : 'Not authenticated (expected)'
          });
          
          // Stop polling immediately
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setError(response.error);
          setTierStatus(null);
          
          // Only show "Session Expired" message if user was previously authenticated
          // If they were never authenticated, this is expected behavior (guest mode)
          if (wasAuthenticated && typeof window !== 'undefined') {
            // Dispatch custom event for error toast
            window.dispatchEvent(new CustomEvent('auth-error', {
              detail: {
                code: 'UNAUTHORIZED',
                message: 'Your session has expired. Please refresh the page to continue.',
                action: 'refresh'
              }
            }));
          }
          
          return;
        }
        
        // Handle rate limit errors with global coordinator
        if (response.error.code === 'RATE_LIMIT') {
          const retryAfter = response.error.details?.retryAfter || apiConfig.rateLimit.defaultRetryAfterSeconds;
          
          // Use global coordinator instead of local pause
          RateLimitCoordinator.pause(Math.min(retryAfter, apiConfig.rateLimit.maxPauseSeconds));
          
          console.warn('[useTier] Rate limited, using global pause');
          
          // Phase 3: Show user-friendly rate limit notification
          const retryMinutes = Math.ceil((Math.min(retryAfter, apiConfig.rateLimit.maxPauseSeconds)) / 60);
          showToast({
            variant: 'warning',
            title: 'Rate Limit Reached',
            description: `Too many requests. Please wait ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''} before trying again.`,
            duration: apiConfig.toast.defaultDuration,
          });
        } else if (response.error.code === 'NETWORK_ERROR') {
          // Phase 3: Show network error notification
          showToast({
            variant: 'error',
            title: 'Connection Error',
            description: 'Unable to connect to server. Please check your internet connection.',
            duration: apiConfig.toast.defaultDuration,
          });
        }
        
        // Phase 7: Track retry count for retryable errors (not rate limit)
        const isRetryable = 
          response.error.code === 'NETWORK_ERROR' ||
          response.error.code === 'TIMEOUT_ERROR';
        
        if (isRetryable) {
          setRetryCount((prev) => prev + 1);
        }
        
        // Phase 2: Log backoff delay
        console.warn(
          `[useTier] API error, next retry in ${backoffRef.current.getDelayString()}`
        );
        
        setError(response.error);
        setTierStatus(null);
      } else if (response.data) {
        // Phase 2: Record success for exponential backoff
        backoffRef.current.recordSuccess();
        
        // Phase 7: Reset retry count on success (using functional setState to avoid dependency)
        setRetryCount((prev) => prev > 0 ? 0 : prev);
        setTierStatus(response.data);
      }
    } catch (err) {
      const apiError: ApiError = {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch tier status',
      };
      setError(apiError);
      setTierStatus(null);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, isGuest, authLoading, showToast]); // Fixed: Removed retryCount from dependencies to prevent unnecessary callback recreation

  /**
   * Request tier upgrade
   */
  const requestUpgrade = useCallback(
    async (tier: 'starter' | 'pro' | 'premium') => {
      try {
        const response = await requestTierUpgrade(tier);

        if (response.error) {
          throw new Error(response.error.message);
        }

        // Refetch tier status after successful request
        await fetchTierStatus();
      } catch (err) {
        const apiError: ApiError = {
          code: 'UPGRADE_ERROR',
          message: err instanceof Error ? err.message : 'Failed to request tier upgrade',
        };
        setError(apiError);
        throw err;
      }
    },
    [fetchTierStatus]
  );

  /**
   * Refetch function exposed to components
   * Phase 7: Supports manual retry with reset of retry count
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setRetryCount(0); // Reset retry count on manual refetch
    setError(null);
    await fetchTierStatus();
  }, [fetchTierStatus]);

  // Initial fetch on mount
  // Phase 2: Enhanced with dynamic polling interval from exponential backoff
  useEffect(() => {
    isMountedRef.current = true;
    
    // Don't set up polling or fetch data until auth is ready
    // Allow both authenticated users and guests to fetch tier status
    // CRITICAL: Always return a cleanup function (even if empty) to maintain consistent hook order
    if (authLoading || (!isAuthenticated && !isGuest)) {
      return () => {}; // Return empty cleanup to maintain hook consistency
    }
    
    // Initial fetch
    fetchTierStatus();

    // Phase 2: Start with base interval, will be adjusted dynamically
    let currentInterval = apiConfig.userDataPollingInterval * 2; // Poll tier status at half the frequency
    
    const pollData = () => {
      if (isMountedRef.current && !RateLimitCoordinator.isPausedNow()) {
        fetchTierStatus();
      }
    };
    
    const updatePollingInterval = () => {
      const newInterval = backoffRef.current.getDelay();
      if (newInterval !== currentInterval) {
        console.log(`[useTier] Adjusting polling interval to ${backoffRef.current.getDelayString()}`);
        currentInterval = newInterval;
        
        // Clear old interval and set new one
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        pollingIntervalRef.current = setInterval(() => {
          pollData();
          updatePollingInterval(); // Check if we need to adjust interval
        }, newInterval);
      }
    };

    // Set up polling for real-time updates (uses global coordinator and dynamic interval)
    pollingIntervalRef.current = setInterval(() => {
      pollData();
      updatePollingInterval(); // Check if we need to adjust interval
    }, currentInterval);

    // Subscribe to global coordinator events
    const unsubscribe = RateLimitCoordinator.subscribe(() => {
      if (!RateLimitCoordinator.isPausedNow() && isMountedRef.current) {
        // Resumed from global pause, fetch immediately
        fetchTierStatus();
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchTierStatus, authLoading, isAuthenticated, isGuest]);

  return {
    tierStatus,
    loading,
    error,
    requestUpgrade,
    refetch,
  };
}

