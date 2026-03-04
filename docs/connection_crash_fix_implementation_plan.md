# Connection Crash Fix - Implementation Plan

**Date:** 2026-01-14  
**Priority:** 🔴 **CRITICAL**  
**Estimated Timeline:** 2-5 days  
**Risk Level:** 🟢 Low (localized changes, backward compatible)

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Phases](#implementation-phases)
3. [Phase 1: Critical Fixes](#phase-1-critical-fixes-day-1)
4. [Phase 2: High Priority Improvements](#phase-2-high-priority-improvements-days-2-3)
5. [Phase 3: Architectural Improvements](#phase-3-architectural-improvements-days-4-5)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Rollback Plan](#rollback-plan)
9. [Monitoring & Validation](#monitoring--validation)

---

## Overview

### Problem Statement

The application becomes unusable after ~1 hour due to:
- Firebase token expiration without proper refresh
- Multiple uncoordinated polling hook instances
- Rate limiting cascade failures
- No user feedback on errors

### Solution Approach

Three-phased implementation:
1. **Phase 1:** Critical fixes to stop crashes (2-4 hours)
2. **Phase 2:** Coordination and efficiency improvements (1-2 days)
3. **Phase 3:** Architectural improvements for long-term stability (2-3 days)

### Success Criteria

- ✅ Application remains stable for 24+ hours of continuous use
- ✅ Zero 401 errors from token expiration
- ✅ Zero 429 errors from rate limiting
- ✅ 75% reduction in API request volume
- ✅ Clear user feedback on any errors
- ✅ Graceful error recovery without page refresh

---

## Implementation Phases

### Phase Overview

| Phase | Priority | Duration | Risk | Impact |
|-------|----------|----------|------|--------|
| Phase 1 | 🔴 Critical | 2-4 hours | 🟢 Low | Stops crashes |
| Phase 2 | 🟡 High | 1-2 days | 🟢 Low | Improves efficiency |
| Phase 3 | 🟢 Medium | 2-3 days | 🟡 Medium | Long-term stability |

---

## Phase 1: Critical Fixes (Day 1)

**Goal:** Stop the application from crashing  
**Duration:** 2-4 hours  
**Can Deploy:** Yes, incrementally

### Task 1.1: Force Firebase Token Refresh

**Priority:** 🔴 Critical  
**Duration:** 15 minutes  
**Files:** 1

#### File: `frontend/src/contexts/AuthContext.tsx`

**Location:** Line 136-144

**Current Code:**
```typescript
// Update token getter when user changes
if (firebaseUser) {
  setTokenGetter(async () => {
    try {
      return await firebaseUser.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  });
}
```

**New Code:**
```typescript
// Update token getter when user changes
if (firebaseUser) {
  setTokenGetter(async () => {
    try {
      // Force refresh to ensure token is always valid
      // Firebase SDK handles caching and refresh timing automatically
      // Pass true to force refresh if token is expired or close to expiry
      return await firebaseUser.getIdToken(true);
    } catch (error) {
      console.error('Error getting ID token:', error);
      
      // If token refresh fails, user needs to re-authenticate
      if (error instanceof Error) {
        if (error.message.includes('auth/network-request-failed')) {
          console.error('Network error during token refresh');
        } else if (error.message.includes('auth/user-token-expired')) {
          console.error('Token expired and refresh failed, user needs to re-login');
        }
      }
      
      return null;
    }
  });
}
```

**Testing:**
```bash
# Test 1: Normal operation
- Log in
- Wait 5 minutes
- Verify API calls work
- Check console for "forcing token refresh" logs

# Test 2: Token expiry simulation
- Log in
- Use browser devtools to manually expire token (Application > Firebase)
- Make an API call
- Verify token is automatically refreshed
- Verify API call succeeds
```

---

### Task 1.2: Create Global Rate Limit Coordinator

**Priority:** 🔴 Critical  
**Duration:** 30 minutes  
**Files:** 1 (new)

#### File: `frontend/src/lib/rate-limit-coordinator.ts` (NEW)

**Create new file:**
```typescript
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
```

**Testing:**
```typescript
// Test file: frontend/src/lib/__tests__/rate-limit-coordinator.test.ts
import RateLimitCoordinator from '../rate-limit-coordinator';

describe('RateLimitCoordinator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    RateLimitCoordinator.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should pause and resume globally', () => {
    expect(RateLimitCoordinator.isPausedNow()).toBe(false);
    
    RateLimitCoordinator.pause(60);
    expect(RateLimitCoordinator.isPausedNow()).toBe(true);
    
    jest.advanceTimersByTime(61000);
    expect(RateLimitCoordinator.isPausedNow()).toBe(false);
  });

  it('should notify listeners on pause/resume', () => {
    const listener = jest.fn();
    RateLimitCoordinator.subscribe(listener);
    
    RateLimitCoordinator.pause(60);
    expect(listener).toHaveBeenCalledTimes(1);
    
    RateLimitCoordinator.resume();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
```

---

### Task 1.3: Stop Polling on Auth Failure - useUserData

**Priority:** 🔴 Critical  
**Duration:** 20 minutes  
**Files:** 1

#### File: `frontend/src/hooks/useUserData.ts`

**Location:** Lines 81-109

**Current Code:**
```typescript
try {
  setError(null);
  
  // Fetch user data and quota
  const userDataResponse = await getCurrentUserData();
  
  if (userDataResponse.error) {
    // Handle rate limit errors by pausing polling
    if (userDataResponse.error.code === 'RATE_LIMIT') {
      rateLimitPausedRef.current = true;
      // Pause for 60 seconds when rate limited
      rateLimitResumeTimeRef.current = Date.now() + 60000;
      console.warn('[useUserData] Rate limited, pausing polling for 60 seconds');
    }
    
    // Phase 7: Increment retry count for retryable errors
    const isRetryable = 
      userDataResponse.error.code === 'NETWORK_ERROR' ||
      userDataResponse.error.code === 'TIMEOUT_ERROR';
    
    if (isRetryable) {
      setRetryCount((prev) => prev + 1);
    }
    
    setError(userDataResponse.error);
    setUser(null);
    setQuota(null);
    return;
  }
```

**New Code:**
```typescript
try {
  setError(null);
  
  // Fetch user data and quota
  const userDataResponse = await getCurrentUserData();
  
  if (userDataResponse.error) {
    // Handle UNAUTHORIZED errors - stop polling immediately
    if (userDataResponse.error.code === 'UNAUTHORIZED') {
      console.error('[useUserData] ❌ Unauthorized - stopping polling');
      
      // Stop polling immediately
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      setError(userDataResponse.error);
      setUser(null);
      setQuota(null);
      
      // Show user-friendly error message
      if (typeof window !== 'undefined') {
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
      const retryAfter = userDataResponse.error.details?.retryAfter || 900; // Default 15 min
      
      // Use global coordinator instead of local pause
      RateLimitCoordinator.pause(Math.min(retryAfter, 300)); // Cap at 5 minutes
      
      console.warn('[useUserData] Rate limited, using global pause');
    }
    
    // Phase 7: Increment retry count for retryable errors
    const isRetryable = 
      userDataResponse.error.code === 'NETWORK_ERROR' ||
      userDataResponse.error.code === 'TIMEOUT_ERROR';
    
    if (isRetryable) {
      setRetryCount((prev) => prev + 1);
    }
    
    setError(userDataResponse.error);
    setUser(null);
    setQuota(null);
    return;
  }
```

**Import Addition (top of file):**
```typescript
import RateLimitCoordinator from '@/lib/rate-limit-coordinator';
```

**Update polling logic (Lines 217-226):**

**Current Code:**
```typescript
// Set up polling for real-time updates (only if not rate limited)
pollingIntervalRef.current = setInterval(() => {
  if (isMountedRef.current && !rateLimitPausedRef.current) {
    fetchUserData();
  } else if (rateLimitPausedRef.current && rateLimitResumeTimeRef.current && Date.now() >= rateLimitResumeTimeRef.current) {
    // Rate limit pause expired, resume polling
    rateLimitPausedRef.current = false;
    rateLimitResumeTimeRef.current = null;
    fetchUserData();
  }
}, apiConfig.userDataPollingInterval);
```

**New Code:**
```typescript
// Set up polling for real-time updates (uses global coordinator)
pollingIntervalRef.current = setInterval(() => {
  // Check global coordinator before polling
  if (isMountedRef.current && !RateLimitCoordinator.isPausedNow()) {
    fetchUserData();
  }
}, apiConfig.userDataPollingInterval);

// Subscribe to global coordinator events
const unsubscribe = RateLimitCoordinator.subscribe(() => {
  if (!RateLimitCoordinator.isPausedNow() && isMountedRef.current) {
    // Resumed from global pause, fetch immediately
    fetchUserData();
  }
});

// Add unsubscribe to cleanup
return () => {
  unsubscribe();
  // ... existing cleanup
};
```

**Remove old rate limit refs (Lines 60-61):**
```typescript
// DELETE THESE LINES - no longer needed
// const rateLimitPausedRef = useRef(false);
// const rateLimitResumeTimeRef = useRef<number | null>(null);
```

---

### Task 1.4: Stop Polling on Auth Failure - useTier

**Priority:** 🔴 Critical  
**Duration:** 20 minutes  
**Files:** 1

#### File: `frontend/src/hooks/useTier.ts`

**Apply same changes as Task 1.3:**

1. Add import for `RateLimitCoordinator`
2. Update error handling in `fetchTierStatus` (Lines 62-105)
3. Replace local rate limit logic with global coordinator
4. Update polling interval logic (Lines 151-160)
5. Remove old rate limit refs (Lines 41-42)

**Detailed changes:**

```typescript
// Add import at top
import RateLimitCoordinator from '@/lib/rate-limit-coordinator';

// Update fetchTierStatus error handling
if (response.error) {
  // Handle UNAUTHORIZED
  if (response.error.code === 'UNAUTHORIZED') {
    console.error('[useTier] ❌ Unauthorized - stopping polling');
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setError(response.error);
    setTierStatus(null);
    return;
  }
  
  // Handle RATE_LIMIT with global coordinator
  if (response.error.code === 'RATE_LIMIT') {
    const retryAfter = response.error.details?.retryAfter || 900;
    RateLimitCoordinator.pause(Math.min(retryAfter, 300));
    console.warn('[useTier] Rate limited, using global pause');
  }
  
  // ... rest of error handling
}

// Update polling logic
pollingIntervalRef.current = setInterval(() => {
  if (isMountedRef.current && !RateLimitCoordinator.isPausedNow()) {
    fetchTierStatus();
  }
}, apiConfig.userDataPollingInterval * 2);

const unsubscribe = RateLimitCoordinator.subscribe(() => {
  if (!RateLimitCoordinator.isPausedNow() && isMountedRef.current) {
    fetchTierStatus();
  }
});

// Cleanup
return () => {
  unsubscribe();
  isMountedRef.current = false;
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
};

// Remove these lines
// const rateLimitPausedRef = useRef(false);
// const rateLimitResumeTimeRef = useRef<number | null>(null);
```

---

### Task 1.5: Stop Polling on Auth Failure - useTaskManager

**Priority:** 🔴 Critical  
**Duration:** 20 minutes  
**Files:** 1

#### File: `frontend/src/hooks/useTaskManager.ts`

**Location:** Lines 83-149 (refreshTasks function)

**Apply same pattern:**

```typescript
// Add import at top
import RateLimitCoordinator from '@/lib/rate-limit-coordinator';

// Update refreshTasks error handling (around line 100)
if (response.error) {
  // Handle UNAUTHORIZED
  if (response.error.code === 'UNAUTHORIZED') {
    console.error('[useTaskManager] ❌ Unauthorized - stopping polling');
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    return;
  }
  
  // Handle RATE_LIMIT with global coordinator
  if (response.error.code === 'RATE_LIMIT') {
    const retryAfter = response.error.details?.retryAfter || 900;
    RateLimitCoordinator.pause(Math.min(retryAfter, 300));
    console.warn('[useTaskManager] Rate limited, using global pause');
  }
  
  console.error('Failed to refresh tasks:', response.error.message, response.error);
  return;
}

// Update polling logic (Lines 527-536)
const pollTasks = () => {
  if (isMountedRef.current && 
      document.visibilityState === 'visible' && 
      !RateLimitCoordinator.isPausedNow()) {
    refreshTasks();
  }
};

pollingIntervalRef.current = setInterval(pollTasks, pollingIntervalMs);

const unsubscribe = RateLimitCoordinator.subscribe(() => {
  if (!RateLimitCoordinator.isPausedNow() && 
      isMountedRef.current && 
      document.visibilityState === 'visible') {
    refreshTasks();
  }
});

// Cleanup (Lines 550-557)
return () => {
  unsubscribe();
  isMountedRef.current = false;
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
};

// Remove these lines (58-59)
// const rateLimitPausedRef = useRef(false);
// const rateLimitResumeTimeRef = useRef<number | null>(null);
```

---

### Task 1.6: Add Auth Error Toast Listener

**Priority:** 🔴 Critical  
**Duration:** 30 minutes  
**Files:** 1

#### File: `frontend/src/contexts/ToastContext.tsx`

**Add auth error listener in ToastProvider:**

```typescript
// Add to useEffect in ToastProvider component (around line 50)
useEffect(() => {
  // Listen for auth errors from hooks
  const handleAuthError = (event: CustomEvent) => {
    const { code, message, action } = event.detail;
    
    addToast({
      type: 'error',
      title: 'Session Expired',
      message: message || 'Your session has expired. Please refresh the page.',
      duration: 0, // Don't auto-dismiss
      action: action === 'refresh' ? {
        label: 'Refresh Page',
        onClick: () => {
          window.location.reload();
        }
      } : undefined,
    });
  };

  window.addEventListener('auth-error', handleAuthError as EventListener);
  
  return () => {
    window.removeEventListener('auth-error', handleAuthError as EventListener);
  };
}, [addToast]);
```

---

### Phase 1 Testing Checklist

After implementing Phase 1:

- [ ] **Token Refresh Test**
  - [ ] Log in to application
  - [ ] Keep browser open for 65 minutes
  - [ ] Verify no 401 errors in console
  - [ ] Verify API calls continue working
  - [ ] Check Network tab for token refresh in Authorization header

- [ ] **Global Coordinator Test**
  - [ ] Simulate rate limit (mock API to return 429)
  - [ ] Verify all hooks stop polling simultaneously
  - [ ] Verify hooks resume after timeout
  - [ ] Check console for global pause messages

- [ ] **Auth Failure Test**
  - [ ] Log in to application
  - [ ] Manually expire token (Firebase console or devtools)
  - [ ] Make an action that triggers API call
  - [ ] Verify polling stops immediately
  - [ ] Verify toast notification appears
  - [ ] Verify "Refresh Page" button works

- [ ] **Multiple Hook Instances Test**
  - [ ] Open Account page (has useUserData + useTier)
  - [ ] Open developer console
  - [ ] Monitor polling requests
  - [ ] Verify only one request per endpoint per interval
  - [ ] Trigger rate limit
  - [ ] Verify all instances pause together

**Acceptance Criteria for Phase 1:**
- ✅ No 401 errors after 1+ hour of use
- ✅ Rate limit triggers global pause (visible in console)
- ✅ Auth errors show user-friendly toast
- ✅ Polling stops on auth failure
- ✅ Application can run for 2+ hours without crashes

**Deployment:** Can deploy Phase 1 immediately after testing

---

## Phase 2: High Priority Improvements (Days 2-3)

**Goal:** Reduce redundant polling and improve efficiency  
**Duration:** 1-2 days

### Task 2.1: Create Centralized User Data Context

**Priority:** 🟡 High  
**Duration:** 2-3 hours  
**Files:** 1 (new) + multiple updates

#### File: `frontend/src/contexts/UserDataContext.tsx` (NEW)

**Create new context:**

```typescript
'use client';

/**
 * Centralized User Data Context
 * Single source of truth for user data, quota, credits, and tier
 * Prevents multiple polling instances by providing shared state
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useUserData as useUserDataHook } from '@/hooks/useUserData';
import { useTier as useTierHook } from '@/hooks/useTier';
import { User, UserQuota, UserCredits, TierStatus, ApiError, CreditTransactionsResponse } from '@/types';

interface UserDataContextValue {
  // User data
  user: User | null;
  quota: UserQuota | null;
  credits: UserCredits | null;
  
  // Tier data
  tierStatus: TierStatus | null;
  
  // Loading states
  loading: boolean;
  tierLoading: boolean;
  
  // Errors
  error: ApiError | null;
  tierError: ApiError | null;
  
  // Actions
  refetchUserData: () => Promise<void>;
  refetchTier: () => Promise<void>;
  requestUpgrade: (tier: string) => Promise<boolean>;
  updateCreditsOptimistically: (updates: Partial<UserCredits>) => void;
  fetchTransactionHistory: (page?: number, limit?: number) => Promise<CreditTransactionsResponse | null>;
}

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
  // Single instance of useUserData
  const {
    user,
    quota,
    credits,
    loading,
    error,
    refetch: refetchUserData,
    updateCreditsOptimistically,
    fetchTransactionHistory,
  } = useUserDataHook();
  
  // Single instance of useTier
  const {
    tierStatus,
    loading: tierLoading,
    error: tierError,
    refetch: refetchTier,
    requestUpgrade,
  } = useTierHook();
  
  const value: UserDataContextValue = {
    user,
    quota,
    credits,
    tierStatus,
    loading,
    tierLoading,
    error,
    tierError,
    refetchUserData,
    refetchTier,
    requestUpgrade,
    updateCreditsOptimistically,
    fetchTransactionHistory,
  };
  
  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

/**
 * Hook to access user data context
 * Replaces direct useUserData and useTier calls
 */
export function useUserDataContext() {
  const context = useContext(UserDataContext);
  
  if (context === undefined) {
    throw new Error('useUserDataContext must be used within UserDataProvider');
  }
  
  return context;
}

// Convenience hooks for specific data
export function useUser() {
  const { user, loading, error } = useUserDataContext();
  return { user, loading, error };
}

export function useQuota() {
  const { quota, loading, error } = useUserDataContext();
  return { quota, loading, error };
}

export function useCredits() {
  const { credits, loading, error } = useUserDataContext();
  return { credits, loading, error };
}

export function useTierContext() {
  const { tierStatus, tierLoading, tierError, requestUpgrade, refetchTier } = useUserDataContext();
  return { tierStatus, loading: tierLoading, error: tierError, requestUpgrade, refetch: refetchTier };
}
```

#### Update: `frontend/src/components/providers.tsx`

**Add UserDataProvider:**

```typescript
import { UserDataProvider } from '@/contexts/UserDataContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserDataProvider>  {/* Add this */}
          {children}
        </UserDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

---

### Task 2.2: Update Components to Use Centralized Context

**Priority:** 🟡 High  
**Duration:** 2-3 hours  
**Files:** 10-15 components

#### Components to Update:

1. **`frontend/src/components/ui/UserMenu.tsx`**
   
```typescript
// Before
import { useUserData } from '@/hooks/useUserData';
const { user, quota, credits, loading, error, refetch } = useUserData();

// After
import { useUserDataContext } from '@/contexts/UserDataContext';
const { user, quota, credits, loading, error, refetchUserData } = useUserDataContext();
```

2. **`frontend/src/components/tasks/TaskPanel.tsx`**

```typescript
// Before
import { useTaskManager } from '@/hooks/useTaskManager';
const { tasks, activeTaskCount, cancelTask } = useTaskManager();
// useTaskManager internally uses useUserData

// After - no changes needed
// useTaskManager will still use useUserData hook directly
// But since we have UserDataProvider wrapping the app,
// the data will be shared
```

3. **`frontend/src/app/account/page.tsx`**
4. **`frontend/src/app/account/credits/page.tsx`**
5. **`frontend/src/components/account/TierCard.tsx`**
6. **`frontend/src/components/account/UpgradeModal.tsx`**
7. **`frontend/src/components/ui/CreditBadge.tsx`**

**Pattern for all updates:**
```typescript
// Replace this:
import { useUserData } from '@/hooks/useUserData';
import { useTier } from '@/hooks/useTier';

// With this:
import { useUserDataContext } from '@/contexts/UserDataContext';

// Update hook calls:
const { user, quota, credits, tierStatus, loading, error } = useUserDataContext();
```

---

### Task 2.3: Implement Exponential Backoff

**Priority:** 🟡 High  
**Duration:** 1 hour  
**Files:** 1 (new utility)

#### File: `frontend/src/lib/exponential-backoff.ts` (NEW)

```typescript
/**
 * Exponential Backoff Calculator
 * Calculates increasing delays with jitter for retry attempts
 */

interface BackoffConfig {
  baseDelay: number;      // Base delay in milliseconds
  maxDelay: number;       // Maximum delay cap
  multiplier: number;     // Exponential multiplier
  jitter: boolean;        // Add random jitter
  jitterFactor: number;   // Jitter percentage (0-1)
}

const DEFAULT_CONFIG: BackoffConfig = {
  baseDelay: 30000,       // 30 seconds
  maxDelay: 240000,       // 4 minutes
  multiplier: 2,
  jitter: true,
  jitterFactor: 0.2,      // ±20%
};

export class ExponentialBackoff {
  private failureCount: number = 0;
  private config: BackoffConfig;
  private lastFailureTime: number = 0;

  constructor(config: Partial<BackoffConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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

// Example usage:
// const backoff = new ExponentialBackoff();
// 
// // On API failure:
// backoff.recordFailure();
// const delay = backoff.getDelay(); // Returns: 30s, 60s, 120s, 240s, ...
// 
// // On API success:
// backoff.recordSuccess(); // Resets to 30s
```

---

### Task 2.4: Add Exponential Backoff to Hooks

**Priority:** 🟡 High  
**Duration:** 1 hour  
**Files:** 3

#### Update each hook to use exponential backoff:

**Pattern for all hooks:**

```typescript
import { ExponentialBackoff } from '@/lib/exponential-backoff';

// Add to hook state
const backoffRef = useRef(new ExponentialBackoff({
  baseDelay: apiConfig.userDataPollingInterval, // Use existing interval as base
  maxDelay: 240000, // 4 minutes max
  multiplier: 2,
}));

// In fetch function, on error:
if (response.error) {
  // Record failure
  backoffRef.current.recordFailure();
  
  // Log with delay info
  console.warn(
    `[useUserData] API error, next retry in ${backoffRef.current.getDelayString()}`
  );
  
  // ... handle error
}

// On success:
if (response.data) {
  // Reset backoff on success
  backoffRef.current.recordSuccess();
  
  // ... process data
}

// Update polling interval to use dynamic delay:
useEffect(() => {
  // ... setup code
  
  const pollData = () => {
    if (isMountedRef.current && !RateLimitCoordinator.isPausedNow()) {
      fetchData();
    }
  };
  
  // Start with base interval
  let currentInterval = apiConfig.userDataPollingInterval;
  
  const updatePollingInterval = () => {
    const newInterval = backoffRef.current.getDelay();
    if (newInterval !== currentInterval) {
      console.log(`[useUserData] Adjusting polling interval to ${backoffRef.current.getDelayString()}`);
      currentInterval = newInterval;
      
      // Clear old interval and set new one
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = setInterval(pollData, newInterval);
    }
  };
  
  pollingIntervalRef.current = setInterval(() => {
    pollData();
    updatePollingInterval(); // Check if we need to adjust interval
  }, currentInterval);
  
  // ... cleanup
}, []);
```

Apply this pattern to:
1. `useUserData.ts`
2. `useTier.ts`
3. `useTaskManager.ts`

---

### Task 2.5: Implement Circuit Breaker Pattern

**Priority:** 🟡 High  
**Duration:** 2 hours  
**Files:** 1 (new) + 3 updates

#### File: `frontend/src/lib/circuit-breaker.ts` (NEW)

```typescript
/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests after threshold
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, all requests blocked
 * - HALF_OPEN: Testing if service recovered, limited requests
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
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      name: 'default',
      ...config,
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

// Example usage:
// const breaker = new CircuitBreaker({ name: 'UserAPI', failureThreshold: 3 });
//
// const result = await breaker.execute(async () => {
//   return await fetch('/api/user');
// });
//
// if (result === null) {
//   // Circuit is open, request was blocked
// }
```

**Add circuit breakers to hooks:**

```typescript
// In useUserData.ts, useTier.ts, useTaskManager.ts

const circuitBreakerRef = useRef(new CircuitBreaker({
  name: 'UserData', // or 'Tier', 'TaskManager'
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
}));

// Wrap fetch in circuit breaker
const fetchUserData = useCallback(async () => {
  // Check if circuit is open
  if (circuitBreakerRef.current.isOpen()) {
    console.warn('[useUserData] Circuit breaker is open, skipping request');
    return;
  }

  // Execute with circuit breaker protection
  const result = await circuitBreakerRef.current.execute(async () => {
    const response = await getCurrentUserData();
    return response;
  });

  if (result === null) {
    // Circuit breaker blocked the request
    return;
  }

  // Process result...
  if (result.error) {
    // ... handle error
  } else {
    // ... handle success
  }
}, []);
```

---

### Phase 2 Testing Checklist

- [ ] **Centralized Context Test**
  - [ ] Open multiple pages/components
  - [ ] Monitor network requests
  - [ ] Verify only ONE instance of each polling hook
  - [ ] Verify shared state across components

- [ ] **Exponential Backoff Test**
  - [ ] Mock API to fail repeatedly
  - [ ] Verify polling interval increases: 30s → 60s → 120s → 240s
  - [ ] Mock API to succeed
  - [ ] Verify polling interval resets to 30s

- [ ] **Circuit Breaker Test**
  - [ ] Mock API to fail 5 times
  - [ ] Verify circuit opens (requests blocked)
  - [ ] Wait 60 seconds
  - [ ] Verify circuit transitions to half-open
  - [ ] Mock API to succeed 2 times
  - [ ] Verify circuit closes

**Acceptance Criteria for Phase 2:**
- ✅ 75% reduction in API request volume
- ✅ Single polling instance per endpoint
- ✅ Automatic backoff on failures
- ✅ Circuit breaker prevents cascades

**Deployment:** Can deploy Phase 2 after Phase 1 is stable

---

## Phase 3: Architectural Improvements (Days 4-5)

**Goal:** Long-term stability and user experience  
**Duration:** 2-3 days  
**Risk:** 🟡 Medium (more complex changes)

### Task 3.1: User-Visible Error Notifications

**Priority:** 🟢 Medium  
**Duration:** 2 hours

Add comprehensive error handling with user-friendly messages.

#### Update: `frontend/src/hooks/useUserData.ts`

```typescript
// Import useToast
import { useToast } from '@/contexts/ToastContext';

export function useUserData() {
  const { addToast } = useToast();
  
  // ... existing code
  
  // In fetchUserData error handling:
  if (userDataResponse.error) {
    if (userDataResponse.error.code === 'UNAUTHORIZED') {
      addToast({
        type: 'error',
        title: 'Session Expired',
        message: 'Your session has expired. Please refresh the page to continue.',
        duration: 0, // Don't auto-dismiss
        action: {
          label: 'Refresh Page',
          onClick: () => window.location.reload(),
        },
      });
    } else if (userDataResponse.error.code === 'RATE_LIMIT') {
      const retryMinutes = Math.ceil((userDataResponse.error.details?.retryAfter || 900) / 60);
      addToast({
        type: 'warning',
        title: 'Rate Limit Reached',
        message: `Too many requests. Please wait ${retryMinutes} minutes before trying again.`,
        duration: 10000,
      });
    } else if (userDataResponse.error.code === 'NETWORK_ERROR') {
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Unable to connect to server. Please check your internet connection.',
        duration: 5000,
      });
    }
  }
}
```

Apply similar patterns to `useTier.ts` and `useTaskManager.ts`.

---

### Task 3.2: Request Deduplication

**Priority:** 🟢 Medium  
**Duration:** 2 hours

#### File: `frontend/src/lib/request-deduplicator.ts` (NEW)

```typescript
/**
 * Request Deduplication
 * Prevents multiple identical requests from executing simultaneously
 * Returns the same promise for duplicate requests
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly cacheTimeout: number = 5000; // 5 seconds

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
        console.log(`[RequestDeduplicator] ⚡ Using cached request: ${key} (age: ${age}ms)`);
        return pending.promise;
      } else {
        // Old request, clean up
        this.pendingRequests.delete(key);
      }
    }

    // Execute new request
    console.log(`[RequestDeduplicator] 🚀 New request: ${key}`);
    
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
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();
```

#### Update API calls to use deduplicator:

```typescript
// In frontend/src/lib/api.ts

import { requestDeduplicator } from './request-deduplicator';

export async function getCurrentUserData(): Promise<ApiResponse<UserDataResponse>> {
  return requestDeduplicator.deduplicate('getCurrentUserData', async () => {
    return authenticatedRequest<UserDataResponse>(`${apiBaseUrl}${apiEndpoints.authMe}`);
  });
}

export async function getTierStatus(): Promise<ApiResponse<TierStatus>> {
  return requestDeduplicator.deduplicate('getTierStatus', async () => {
    return authenticatedRequest<TierStatus>(`${apiBaseUrl}${apiEndpoints.tierStatus}`);
  });
}

export async function getActiveTasks(): Promise<ApiResponse<TasksResponse>> {
  return requestDeduplicator.deduplicate('getActiveTasks', async () => {
    return authenticatedRequest<TasksResponse>(`${apiBaseUrl}${apiEndpoints.tasksActive}`);
  });
}
```

---

### Task 3.3: Increase Backend Rate Limits

**Priority:** 🟢 Medium  
**Duration:** 15 minutes

#### File: `backend/config.yaml`

**Current:**
```yaml
rate_limiting:
  general:
    window_minutes: 15
    max_requests: 100  # ~6.67 req/min
```

**New:**
```yaml
rate_limiting:
  auth:
    window_minutes: 15
    max_requests: 60    # Auth endpoints (4 req/min)
  tasks:
    window_minutes: 15
    max_requests: 240   # Task polling (16 req/min)
  tier:
    window_minutes: 15
    max_requests: 30    # Tier checks (2 req/min)
  general:
    window_minutes: 15
    max_requests: 300   # General API (20 req/min)
```

**Rationale:**
- Task polling is high frequency but low cost (DB lookup)
- Auth checks are critical, should have dedicated limit
- Tier checks are infrequent
- General limit covers everything else

---

### Task 3.4: Add Connection Status Indicator

**Priority:** 🟢 Medium  
**Duration:** 2 hours

#### File: `frontend/src/components/ui/ConnectionStatusIndicator.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import RateLimitCoordinator from '@/lib/rate-limit-coordinator';

type ConnectionStatus = 'online' | 'offline' | 'rate-limited' | 'error';

export function ConnectionStatusIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setStatus(navigator.onLine ? 'online' : 'offline');
    };

    // Check rate limit status
    const checkRateLimit = () => {
      if (RateLimitCoordinator.isPausedNow()) {
        setStatus('rate-limited');
        setTimeRemaining(RateLimitCoordinator.getTimeRemaining());
      } else if (navigator.onLine) {
        setStatus('online');
        setTimeRemaining(0);
      }
    };

    // Initial check
    updateOnlineStatus();
    checkRateLimit();

    // Listen for online/offline
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Subscribe to rate limit coordinator
    const unsubscribe = RateLimitCoordinator.subscribe(checkRateLimit);

    // Check rate limit status every second
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
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      {status === 'offline' && (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            No internet connection
          </span>
        </>
      )}
      
      {status === 'rate-limited' && (
        <>
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Rate limited - resuming in {timeRemaining}s
          </span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Connection error
          </span>
        </>
      )}
    </div>
  );
}
```

**Add to layout:**

```typescript
// In frontend/src/app/app/layout.tsx
import { ConnectionStatusIndicator } from '@/components/ui/ConnectionStatusIndicator';

export default function AppLayout({ children }) {
  return (
    <div>
      {children}
      <ConnectionStatusIndicator />
    </div>
  );
}
```

---

### Task 3.5: Add Monitoring and Metrics

**Priority:** 🟢 Medium  
**Duration:** 3 hours

#### File: `frontend/src/lib/metrics.ts` (NEW)

```typescript
/**
 * Frontend Metrics Collection
 * Track API performance, errors, and rate limits
 */

interface MetricEvent {
  timestamp: number;
  type: string;
  value: number;
  metadata?: Record<string, any>;
}

class MetricsCollector {
  private events: MetricEvent[] = [];
  private readonly maxEvents = 1000;

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

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__metrics = metrics;
}
```

**Integrate metrics into API calls:**

```typescript
// In frontend/src/lib/api.ts

import { recordAPIRequest, recordAPIError, recordAPISuccess, recordRateLimit } from './metrics';

async function authenticatedRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const startTime = Date.now();
  const endpoint = new URL(url).pathname;
  
  recordAPIRequest(endpoint);

  try {
    const response = await fetch(url, {
      ...options,
      headers: await buildHeaders(),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 429) {
        const data = await response.json();
        recordRateLimit(endpoint, data.error?.details?.retryAfter || 900);
      } else if (response.status === 401) {
        recordAPIError(endpoint, 'UNAUTHORIZED');
      } else {
        recordAPIError(endpoint, `HTTP_${response.status}`);
      }
      
      // ... handle error
    }

    recordAPISuccess(endpoint, duration);
    
    // ... return success
  } catch (error) {
    recordAPIError(endpoint, 'NETWORK_ERROR');
    throw error;
  }
}
```

---

### Phase 3 Testing Checklist

- [ ] **Error Notifications Test**
  - [ ] Trigger 401 error → Verify toast appears
  - [ ] Trigger 429 error → Verify toast appears
  - [ ] Trigger network error → Verify toast appears
  - [ ] Click "Refresh Page" button → Verify page reloads

- [ ] **Request Deduplication Test**
  - [ ] Open network devtools
  - [ ] Navigate to page with multiple components using same hook
  - [ ] Verify only ONE request per endpoint
  - [ ] Check console for deduplication logs

- [ ] **Connection Status Test**
  - [ ] Go offline → Verify indicator appears
  - [ ] Go online → Verify indicator disappears
  - [ ] Trigger rate limit → Verify indicator shows countdown

- [ ] **Metrics Test**
  - [ ] Open console
  - [ ] Type `__metrics.getSummary()`
  - [ ] Verify metrics are being collected
  - [ ] Trigger various errors
  - [ ] Verify error rates update

**Acceptance Criteria for Phase 3:**
- ✅ Users see clear error messages
- ✅ Request deduplication working
- ✅ Connection status visible
- ✅ Metrics being collected
- ✅ Backend rate limits adjusted

**Deployment:** Deploy Phase 3 after Phase 2 is stable

---

## Testing Strategy

### Unit Tests

#### Rate Limit Coordinator Tests
```bash
npm test -- rate-limit-coordinator.test.ts
```

#### Circuit Breaker Tests
```bash
npm test -- circuit-breaker.test.ts
```

#### Exponential Backoff Tests
```bash
npm test -- exponential-backoff.test.ts
```

### Integration Tests

#### End-to-End Stability Test
```typescript
// Test: Application stays stable for 2+ hours
describe('Connection Stability', () => {
  it('should remain stable for 2 hours', async () => {
    // 1. Log in
    // 2. Navigate between pages
    // 3. Wait 65 minutes (token expiry)
    // 4. Verify no errors
    // 5. Continue for another 55 minutes
    // 6. Verify still working
  }, 7200000); // 2 hour timeout
});
```

#### Rate Limit Handling Test
```typescript
// Test: Graceful handling of rate limits
describe('Rate Limit Handling', () => {
  it('should handle rate limits gracefully', async () => {
    // 1. Mock API to return 429
    // 2. Verify global pause activates
    // 3. Verify all hooks stop polling
    // 4. Verify toast appears
    // 5. Wait for timeout
    // 6. Verify polling resumes
  });
});
```

### Manual Testing

#### Pre-Deployment Checklist

- [ ] **Fresh Login Test** (0-5 minutes)
  - [ ] Log in
  - [ ] Navigate all pages
  - [ ] Verify no errors
  - [ ] Check network tab for reasonable request rate

- [ ] **Token Refresh Test** (60-70 minutes)
  - [ ] Keep app open for 65 minutes
  - [ ] Perform actions (create task, view history, etc.)
  - [ ] Verify no 401 errors
  - [ ] Verify no user-visible issues

- [ ] **Long Session Test** (2-4 hours)
  - [ ] Keep app open for 2+ hours
  - [ ] Periodically perform actions
  - [ ] Verify app remains responsive
  - [ ] Check console for issues

- [ ] **Network Issues Test**
  - [ ] Go offline mid-session
  - [ ] Verify indicator appears
  - [ ] Go back online
  - [ ] Verify app recovers

- [ ] **Rate Limit Test**
  - [ ] Artificially trigger rate limit (rapid actions)
  - [ ] Verify global pause activates
  - [ ] Verify toast notification
  - [ ] Verify automatic recovery

---

## Deployment Plan

### Pre-Deployment

1. **Review all changes in staging**
   ```bash
   git diff main feature/connection-crash-fix
   ```

2. **Run full test suite**
   ```bash
   npm test
   npm run test:e2e
   npm run lint
   npm run build
   ```

3. **Deploy to staging environment**
   ```bash
   npm run deploy:staging
   ```

4. **Perform manual testing in staging** (use checklist above)

5. **Load testing** (optional but recommended)
   ```bash
   # Use k6, Artillery, or similar
   k6 run load-test.js
   ```

### Deployment Sequence

#### Option 1: Phased Rollout (Recommended)

**Week 1 - Day 1: Phase 1 (Critical Fixes)**
```bash
# Deploy only Phase 1 changes
git checkout feature/connection-crash-fix-phase1
npm run deploy:production
```

**Monitoring Period:** 24-48 hours
- Watch for 401/429 errors in logs
- Monitor user feedback
- Check error rates in metrics

**Week 1 - Day 3: Phase 2 (Improvements)**
```bash
# Deploy Phase 2 changes
git checkout feature/connection-crash-fix-phase2
npm run deploy:production
```

**Monitoring Period:** 48-72 hours
- Check request volume reduction
- Verify single polling instances
- Monitor backoff behavior

**Week 2 - Day 1: Phase 3 (Enhancements)**
```bash
# Deploy Phase 3 changes
git checkout feature/connection-crash-fix-phase3
npm run deploy:production
```

**Monitoring Period:** 1 week
- Collect user feedback on new UI elements
- Verify metrics collection
- Monitor long-term stability

#### Option 2: All-at-Once (If Urgent)

```bash
# Deploy all changes together
git checkout feature/connection-crash-fix
npm run deploy:production
```

**Requires:**
- Extensive pre-deployment testing
- Immediate monitoring
- Rollback plan ready

### Post-Deployment

1. **Monitor metrics dashboard** (first 2 hours)
   - 401 error rate
   - 429 error rate
   - Request volume
   - Error rates

2. **Check user reports** (first 24 hours)
   - Support tickets
   - User feedback
   - Social media mentions

3. **Review logs** (first week)
   - Backend error logs
   - Frontend console errors
   - Rate limit hits

4. **Verify success criteria** (first week)
   - Application stable for 24+ hours
   - Zero auth-related crashes
   - 75% request reduction achieved

---

## Rollback Plan

### Rollback Triggers

Rollback immediately if:
- 401 error rate > 5% (indicates token refresh not working)
- 429 error rate > 2% (indicates rate limiting worse)
- User complaints > 10/hour (indicates UX issues)
- Application crashes reported

### Rollback Procedure

#### If Phase 1 Fails:
```bash
# Revert to previous version
git revert <commit-hash-phase-1>
npm run deploy:production

# OR use backup deployment
npm run deploy:production -- --version=<previous-version>
```

#### If Phase 2 Fails:
```bash
# Keep Phase 1, revert Phase 2
git revert <commit-hash-phase-2>
npm run deploy:production
```

#### If Phase 3 Fails:
```bash
# Keep Phases 1 & 2, revert Phase 3
git revert <commit-hash-phase-3>
npm run deploy:production
```

### Rollback Verification

After rollback:
- [ ] Application loads without errors
- [ ] Users can log in
- [ ] Basic functionality works
- [ ] No new errors in logs
- [ ] Confirm rollback in monitoring dashboard

---

## Monitoring & Validation

### Metrics to Monitor

#### Application Health
- **Uptime:** Should be 99.9%+
- **Error Rate:** Should be < 1%
- **Response Time:** Should be < 500ms average

#### Authentication
- **Token Refresh Rate:** 1 per hour per user
- **Token Refresh Failures:** Should be 0
- **401 Error Rate:** Should be 0%

#### Rate Limiting
- **429 Error Rate:** Should be < 0.1%
- **Global Pause Events:** Track frequency
- **Rate Limit Recovery Time:** Average < 60s

#### API Performance
- **Request Volume:** Should decrease 75%
- **Requests per User per Hour:** Should be < 40
- **Polling Efficiency:** Single instance verified

### Monitoring Dashboard

Set up dashboard with:

1. **Error Rates (Last 24h)**
   - 401 errors
   - 429 errors
   - Network errors
   - Total error rate

2. **API Request Volume**
   - Total requests per hour
   - Requests by endpoint
   - Before/after comparison

3. **Token Management**
   - Refresh attempts
   - Refresh failures
   - Token age distribution

4. **Circuit Breaker Status**
   - Current state
   - State transitions
   - Blocked requests

5. **User Experience**
   - Session duration
   - Page refresh rate
   - Error toast frequency

### Alerts

Configure alerts for:

- 401 error rate > 1% (5 min window)
- 429 error rate > 0.5% (5 min window)
- Token refresh failure > 5 (1 hour window)
- Circuit breaker open > 2 (1 hour window)
- Request volume spike > 200% (15 min window)

---

## Success Criteria

### Phase 1 Success Criteria

- [ ] ✅ No 401 errors after 1+ hour of use
- [ ] ✅ Rate limits trigger global pause (verified in logs)
- [ ] ✅ Polling stops on auth failure
- [ ] ✅ User sees toast on session expiry
- [ ] ✅ Application runs for 2+ hours without crash

### Phase 2 Success Criteria

- [ ] ✅ Request volume reduced by 75%
- [ ] ✅ Single polling instance per hook type
- [ ] ✅ Exponential backoff working (verified in logs)
- [ ] ✅ Circuit breaker prevents cascades
- [ ] ✅ No duplicate requests (verified in network tab)

### Phase 3 Success Criteria

- [ ] ✅ Users see clear error messages
- [ ] ✅ Connection status indicator working
- [ ] ✅ Request deduplication active
- [ ] ✅ Metrics being collected
- [ ] ✅ Backend rate limits adjusted
- [ ] ✅ Application stable for 24+ hours

### Overall Success Criteria

- [ ] ✅ Zero crash reports related to token expiry
- [ ] ✅ Zero crash reports related to rate limiting
- [ ] ✅ 401 error rate: 0%
- [ ] ✅ 429 error rate: < 0.1%
- [ ] ✅ Request volume: 75% reduction
- [ ] ✅ User satisfaction: No complaints about crashes
- [ ] ✅ Long session support: 24+ hours stable

---

## Timeline Summary

| Phase | Duration | Start | End | Deliverables |
|-------|----------|-------|-----|--------------|
| **Phase 1** | 2-4 hours | Day 1 AM | Day 1 PM | Critical fixes deployed |
| **Testing 1** | 24-48 hours | Day 1 PM | Day 3 AM | Phase 1 validated |
| **Phase 2** | 1-2 days | Day 3 AM | Day 4 PM | Improvements deployed |
| **Testing 2** | 48-72 hours | Day 4 PM | Day 7 AM | Phase 2 validated |
| **Phase 3** | 2-3 days | Day 7 AM | Day 9 PM | Enhancements deployed |
| **Testing 3** | 1 week | Day 9 PM | Day 16 | Phase 3 validated |
| **Total** | ~2-3 weeks | Day 1 | Day 16-20 | Complete solution |

**Fast Track Option:**
- All phases: 2-5 days of development
- Testing: 1 week of validation
- Total: ~2 weeks to full deployment

---

## Team Assignment

### Development Tasks

**Backend Developer (Optional):**
- Task 3.3: Adjust rate limits in config.yaml (15 min)

**Frontend Developer 1:**
- Task 1.1: Force token refresh (15 min)
- Task 1.2: Rate limit coordinator (30 min)
- Task 1.3-1.5: Stop polling on errors (1 hour)
- Task 1.6: Auth error toast (30 min)

**Frontend Developer 2:**
- Task 2.1: Centralized context (2-3 hours)
- Task 2.2: Update components (2-3 hours)

**Frontend Developer 3:**
- Task 2.3: Exponential backoff (1 hour)
- Task 2.4: Add to hooks (1 hour)
- Task 2.5: Circuit breaker (2 hours)

**Frontend Developer 4 (or 1-3):**
- Task 3.1: Error notifications (2 hours)
- Task 3.2: Request deduplication (2 hours)
- Task 3.4: Connection indicator (2 hours)
- Task 3.5: Metrics collection (3 hours)

### Testing & QA

**QA Engineer:**
- Manual testing all phases
- E2E test scenarios
- Load testing
- Regression testing

**DevOps:**
- Staging deployments
- Production deployments
- Monitoring setup
- Alert configuration

---

## Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Token refresh breaks auth | Low | High | Extensive testing, rollback plan |
| Global coordinator conflicts | Low | Medium | Unit tests, phased deployment |
| Context provider performance | Low | Medium | Performance monitoring, lazy loading |
| Circuit breaker too aggressive | Medium | Low | Tunable thresholds, monitoring |
| Request deduplication cache issues | Low | Low | Short timeout, fallback to normal |

### Process Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Incomplete testing | Medium | High | Mandatory testing checklist |
| Rushed deployment | Medium | High | Phased rollout enforced |
| Poor monitoring | Low | Medium | Pre-configure dashboards |
| Team unavailable for issues | Low | High | On-call schedule, documentation |

---

## Communication Plan

### Stakeholder Updates

**Before Deployment:**
- Notify team of deployment schedule
- Share testing results
- Document rollback procedures

**During Deployment:**
- Status updates every hour (first 4 hours)
- Immediate notification of any issues
- Metrics snapshots every 2 hours

**After Deployment:**
- Daily summary reports (first week)
- Weekly summary (ongoing)
- Success metrics presentation

### User Communication

**If Phase 1 Deployed:**
- No user notification needed (transparent fixes)

**If Issues Occur:**
- Status page update
- Email to affected users
- Social media post if widespread

**After Success:**
- Blog post about improvements
- Newsletter mention
- "What's New" in app

---

## Documentation Updates

After completion, update:

- [ ] `README.md` - Note improved stability
- [ ] `docs/architecture.md` - Document new patterns
- [ ] `docs/api.md` - Note rate limit changes
- [ ] `docs/deployment.md` - Add monitoring guidelines
- [ ] `docs/troubleshooting.md` - Add connection issues section

---

## Conclusion

This implementation plan provides a comprehensive, phased approach to fixing the connection crash issue. The three-phase structure allows for:

1. **Immediate impact** - Critical fixes stop crashes (Phase 1)
2. **Efficiency gains** - Reduce load and improve performance (Phase 2)
3. **Long-term stability** - Better UX and observability (Phase 3)

Each phase can be deployed independently, minimizing risk while delivering value quickly.

**Key Success Factors:**
- Thorough testing at each phase
- Careful monitoring post-deployment
- Clear rollback plan
- Team communication

**Expected Outcomes:**
- ✅ Zero crash reports
- ✅ 75% reduction in API requests
- ✅ Improved user experience
- ✅ Better observability
- ✅ Foundation for future improvements

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-14  
**Author:** Development Team  
**Status:** Ready for Implementation


