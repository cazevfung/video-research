'use client';

/**
 * Phase 1: Foundation - useUserData hook
 * Custom hook for fetching and managing user data, quota, and credits
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getCurrentUserData, 
  getUserCredits,
  getCreditTransactions
} from '@/lib/api';
import { 
  User, 
  UserQuota, 
  UserCredits,
  CreditTransaction,
  CreditTransactionsResponse
} from '@/types';
import { apiConfig } from '@/config/api';
import { creditTransactions } from '@/config/credits';
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

interface UseUserDataReturn {
  user: User | null;
  quota: UserQuota | null;
  credits: UserCredits | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  // Phase 7: Optimistic update functions
  updateUserOptimistically: (updates: Partial<User>) => void;
  updateCreditsOptimistically: (updates: Partial<UserCredits>) => void;
  // Phase 3: Transaction history convenience method
  fetchTransactionHistory: (page?: number, limit?: number) => Promise<CreditTransactionsResponse | null>;
}

/**
 * Custom hook for fetching and managing user data
 * Automatically polls for updates at configured interval
 */
export function useUserData(): UseUserDataReturn {
  const { showToast } = useToast();
  const { isAuthenticated, loading: authLoading, isGuest } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs to manage polling and cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Phase 2: Exponential backoff and circuit breaker
  const backoffRef = useRef(new ExponentialBackoff({
    baseDelay: apiConfig.userDataPollingInterval,
    maxDelay: parseInt(
      process.env.NEXT_PUBLIC_BACKOFF_MAX_DELAY_MS || '240000', // 4 minutes
      10
    ),
    multiplier: parseFloat(
      process.env.NEXT_PUBLIC_BACKOFF_MULTIPLIER || '2',
    ),
  }));
  
  const circuitBreakerRef = useRef(new CircuitBreaker({
    name: 'UserData',
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
   * Fetch user data and credits from API
   * Phase 2: Enhanced with circuit breaker and exponential backoff
   */
  const fetchUserData = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Allow API calls for authenticated users or guests, but not if auth is still loading
    // Guests can fetch their profile data via guest session ID
    if (!isAuthenticated && !isGuest && !authLoading) {
      setLoading(false);
      setUser(null);
      setQuota(null);
      setCredits(null);
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
      console.warn('[useUserData] Circuit breaker is open, skipping request');
      return;
    }

    try {
      setError(null);
      
      // Phase 2: Execute with circuit breaker protection
      const userDataResponse = await circuitBreakerRef.current.execute(async () => {
        return await getCurrentUserData();
      });

      // Circuit breaker blocked the request
      if (userDataResponse === null) {
        return;
      }
      
      if (userDataResponse.error) {
        // Phase 2: Record failure for exponential backoff
        backoffRef.current.recordFailure();
        
        // Handle UNAUTHORIZED errors - stop polling immediately
        // Note: This is expected when user is not authenticated, so we use debug instead of error
        if (userDataResponse.error.code === 'UNAUTHORIZED') {
          const wasAuthenticated = user !== null || quota !== null;
          
          console.debug('[useUserData] Unauthorized - stopping polling', {
            wasAuthenticated,
            message: wasAuthenticated ? 'Session expired' : 'Not authenticated (expected)'
          });
          
          // Stop polling immediately
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setError(userDataResponse.error);
          setUser(null);
          setQuota(null);
          
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
        if (userDataResponse.error.code === 'RATE_LIMIT') {
          const retryAfter = userDataResponse.error.details?.retryAfter || apiConfig.rateLimit.defaultRetryAfterSeconds;
          
          // Use global coordinator instead of local pause
          RateLimitCoordinator.pause(Math.min(retryAfter, apiConfig.rateLimit.maxPauseSeconds));
          
          console.warn('[useUserData] Rate limited, using global pause');
          
          // Phase 3: Show user-friendly rate limit notification
          const retryMinutes = Math.ceil((Math.min(retryAfter, apiConfig.rateLimit.maxPauseSeconds)) / 60);
          showToast({
            variant: 'warning',
            title: 'Rate Limit Reached',
            description: `Too many requests. Please wait ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''} before trying again.`,
            duration: apiConfig.toast.defaultDuration,
          });
        } else if (userDataResponse.error.code === 'NETWORK_ERROR') {
          // Phase 3: Show network error notification
          showToast({
            variant: 'error',
            title: 'Connection Error',
            description: 'Unable to connect to server. Please check your internet connection.',
            duration: apiConfig.toast.defaultDuration,
          });
        }
        
        // Phase 7: Increment retry count for retryable errors
        const isRetryable = 
          userDataResponse.error.code === 'NETWORK_ERROR' ||
          userDataResponse.error.code === 'TIMEOUT_ERROR';
        
        if (isRetryable) {
          setRetryCount((prev) => prev + 1);
        }
        
        // Phase 2: Log backoff delay
        console.warn(
          `[useUserData] API error, next retry in ${backoffRef.current.getDelayString()}`
        );
        
        setError(userDataResponse.error);
        setUser(null);
        setQuota(null);
        return;
      }
      
      // Phase 2: Record success for exponential backoff
      backoffRef.current.recordSuccess();
      
      // Phase 7: Reset retry count on success (using functional setState to avoid dependency)
      setRetryCount((prev) => prev > 0 ? 0 : prev);
      
      if (userDataResponse.data) {
        setUser(userDataResponse.data.user);
        setQuota(userDataResponse.data.quota);
      }
      
      // Fetch credit balance
      const creditsResponse = await getUserCredits();
      
      if (creditsResponse.error) {
        // Don't fail completely if credits fail, just log it
        console.warn('Failed to fetch credits:', creditsResponse.error);
      } else if (creditsResponse.data) {
        // Map CreditBalanceResponse to UserCredits
        setCredits({
          balance: creditsResponse.data.balance,
          totalEarned: creditsResponse.data.totalEarned,
          totalSpent: creditsResponse.data.totalSpent,
          lastResetDate: creditsResponse.data.lastResetDate,
          tier: creditsResponse.data.tier,
        });
      }
      
    } catch (err) {
      const apiError: ApiError = {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch user data',
      };
      setError(apiError);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, isGuest, authLoading, showToast]);

  /**
   * Refetch function exposed to components
   * Phase 7: Supports manual retry with reset of retry count
   * Phase 4: Clears cache before fetching to ensure fresh data
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setRetryCount(0); // Reset retry count on manual refetch
    setError(null);
    
    // Phase 4: Clear any cached user data from localStorage/sessionStorage
    if (typeof window !== 'undefined') {
      // Clear API request cache (from api.ts)
      const { invalidateCache } = await import('@/lib/api');
      invalidateCache('/auth/me');
      invalidateCache('/api/credits/balance');
      invalidateCache('/api/user/profile');
      
      // Clear any other potential user data caches
      localStorage.removeItem('user_data_cache');
      sessionStorage.removeItem('user_data_cache');
    }
    
    await fetchUserData();
  }, [fetchUserData]);

  /**
   * Phase 7: Optimistically update user data (immediate UI update)
   * The update will be overwritten by the next successful refetch
   */
  const updateUserOptimistically = useCallback((updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  /**
   * Phase 7: Optimistically update credits (immediate UI update)
   * The update will be overwritten by the next successful refetch
   */
  const updateCreditsOptimistically = useCallback((updates: Partial<UserCredits>) => {
    setCredits((prev) => (prev ? { ...prev, ...updates } : null));
    
    // Also update quota if balance is provided
    if (updates.balance !== undefined && quota) {
      setQuota((prev) => 
        prev ? { ...prev, credits_remaining: updates.balance || 0 } : null
      );
    }
  }, [quota]);

  /**
   * Phase 3: Fetch credit transaction history
   * Convenience method for fetching transactions (use useCreditTransactions hook for more features)
   * @param page - Page number (default: 1)
   * @param limit - Number of transactions per page (default: from config)
   * @returns Transaction history response or null on error
   */
  const fetchTransactionHistory = useCallback(async (
    page: number = 1,
    limit: number = creditTransactions.defaultPageSize
  ): Promise<CreditTransactionsResponse | null> => {
    try {
      const response = await getCreditTransactions(page, limit);
      
      if (response.error) {
        console.warn('Failed to fetch transaction history:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      return null;
    }
  }, []);

  // Initial fetch on mount
  // Phase 2: Enhanced with dynamic polling interval from exponential backoff
  useEffect(() => {
    isMountedRef.current = true;
    
    // Don't set up polling or fetch data until auth is ready
    // Allow both authenticated users and guests to fetch profile data
    // CRITICAL: Always return a cleanup function (even if empty) to maintain consistent hook order
    if (authLoading || (!isAuthenticated && !isGuest)) {
      return () => {}; // Return empty cleanup to maintain hook consistency
    }
    
    // Initial fetch
    fetchUserData();

    // Phase 2: Start with base interval, will be adjusted dynamically
    let currentInterval = apiConfig.userDataPollingInterval;
    
    const pollData = () => {
      if (isMountedRef.current && !RateLimitCoordinator.isPausedNow()) {
        fetchUserData();
      }
    };
    
    const updatePollingInterval = () => {
      const newInterval = backoffRef.current.getDelay();
      if (newInterval !== currentInterval) {
        console.log(`[useUserData] Adjusting polling interval to ${backoffRef.current.getDelayString()}`);
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
        fetchUserData();
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
  }, [fetchUserData, authLoading, isAuthenticated, isGuest]);

  return {
    user,
    quota,
    credits,
    loading,
    error,
    refetch,
    updateUserOptimistically,
    updateCreditsOptimistically,
    fetchTransactionHistory,
  };
}

