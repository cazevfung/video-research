/**
 * useGuestSession Hook
 * Phase 3: Manages guest session state and summary count
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getOrCreateGuestSessionId,
  getGuestSessionId,
  clearGuestSession,
  getGuestSummaryCount,
  incrementGuestSummaryCount,
  setGuestSummaryCount,
  getGuestResearchCount,
  incrementGuestResearchCount,
  setGuestResearchCount,
} from '@/utils/guest-session.utils';
import { guestConfig } from '@/config/guest';
import { getDevModeBypassGuestLimits } from '@/utils/dev-mode';
import { useUserDataContext } from '@/contexts/UserDataContext';
import {
  trackGuestSessionStarted,
  trackGuestSummaryCreated,
  trackGuestLimitReached,
} from '@/utils/analytics';

export interface UseGuestSessionReturn {
  /**
   * Guest session ID (null if not a guest)
   */
  sessionId: string | null;
  
  /**
   * Current summary count for this guest session
   */
  summaryCount: number;
  
  /**
   * Current research count for this guest session
   */
  researchCount: number;
  
  /**
   * Whether the guest has reached the summary limit
   */
  hasReachedLimit: boolean;
  
  /**
   * Whether the guest has reached the research limit
   */
  hasReachedResearchLimit: boolean;
  
  /**
   * Whether the user can create more summaries as a guest
   */
  canCreateSummary: boolean;
  
  /**
   * Whether the user can create more research jobs as a guest
   */
  canCreateResearch: boolean;
  
  /**
   * Increment the summary count
   */
  incrementCount: () => number;
  
  /**
   * Increment the research count
   */
  incrementResearchCount: () => number;
  
  /**
   * Reset the summary count
   */
  resetCount: () => void;
  
  /**
   * Reset the research count
   */
  resetResearchCount: () => void;
  
  /**
   * Clear the guest session
   */
  clearSession: () => void;

  /**
   * Effective guest summary limit from backend or config (null = unlimited)
   */
  maxSummaryLimit: number | null;
}

/**
 * Hook to manage guest session state
 * Automatically creates or retrieves guest session ID from sessionStorage
 */
export function useGuestSession(): UseGuestSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summaryCount, setSummaryCount] = useState(0);
  const [researchCount, setResearchCount] = useState(0);
  const { quota } = useUserDataContext();

  // Initialize session ID and counts on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = getOrCreateGuestSessionId();
      const summary = getGuestSummaryCount();
      const research = getGuestResearchCount();
      setSessionId(id);
      setSummaryCount(summary);
      setResearchCount(research);
      
      // Track guest session started (only if this is a new session)
      if (id && summary === 0 && research === 0) {
        trackGuestSessionStarted(id);
      }
    }
  }, []);

  // Listen for storage changes (e.g., from other tabs)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === guestConfig.sessionStorageKey) {
        const newId = e.newValue || getGuestSessionId();
        setSessionId(newId);
      }
      if (e.key === guestConfig.summaryCountStorageKey) {
        const newCount = e.newValue ? parseInt(e.newValue, 10) : 0;
        setSummaryCount(newCount);
      }
      if (e.key === guestConfig.researchCountStorageKey) {
        const newCount = e.newValue ? parseInt(e.newValue, 10) : 0;
        setResearchCount(newCount);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const incrementCount = useCallback(() => {
    const newCount = incrementGuestSummaryCount();
    setSummaryCount(newCount);
    
    // Track guest summary created
    const currentSessionId = getGuestSessionId();
    if (currentSessionId) {
      trackGuestSummaryCreated(currentSessionId, newCount);
      
      // Track limit reached if applicable (only when limit is set)
      const limit = quota?.daily_limit ?? guestConfig.maxSummaries;
      if (limit != null && newCount >= limit) {
        trackGuestLimitReached(currentSessionId);
      }
    }
    
    return newCount;
  }, []);

  const incrementResearchCount = useCallback(() => {
    const newCount = incrementGuestResearchCount();
    setResearchCount(newCount);
    
    // Track guest research created
    const currentSessionId = getGuestSessionId();
    if (currentSessionId) {
      // Similar tracking could be added for research if needed
      // trackGuestResearchCreated(currentSessionId, newCount);
      
      // Track limit reached if applicable
      if (newCount >= guestConfig.maxResearch) {
        // trackGuestResearchLimitReached(currentSessionId);
      }
    }
    
    return newCount;
  }, []);

  const resetCount = useCallback(() => {
    setGuestSummaryCount(0);
    setSummaryCount(0);
  }, []);

  const resetResearchCount = useCallback(() => {
    setGuestResearchCount(0);
    setResearchCount(0);
  }, []);

  const clearSession = useCallback(() => {
    clearGuestSession();
    setSessionId(null);
    setSummaryCount(0);
    setResearchCount(0);
  }, []);

  // Phase 2: Dev mode guest limit bypass. Limit from API (quota.daily_limit) or env; null = unlimited.
  const bypassGuest = getDevModeBypassGuestLimits();
  const guestSummaryLimit = sessionId ? (quota?.daily_limit ?? guestConfig.maxSummaries) : null;
  const hasReachedLimit = bypassGuest ? false : (guestSummaryLimit != null && summaryCount >= guestSummaryLimit);
  const hasReachedResearchLimit = bypassGuest ? false : researchCount >= guestConfig.maxResearch;
  const canCreateSummary = !hasReachedLimit;
  const canCreateResearch = !hasReachedResearchLimit;

  return {
    sessionId,
    summaryCount,
    researchCount,
    hasReachedLimit,
    hasReachedResearchLimit,
    canCreateSummary,
    canCreateResearch,
    incrementCount,
    incrementResearchCount,
    resetCount,
    resetResearchCount,
    clearSession,
    maxSummaryLimit: guestSummaryLimit,
  };
}

