# Connection Crash Issue Analysis
**Date:** 2026-01-14  
**Status:** ⚠️ Critical - Application becomes unusable after extended use

## Executive Summary

The application crashes after being open for a while due to a **cascading failure** caused by:
1. Firebase token expiration without automatic refresh
2. Aggressive polling from multiple hook instances  
3. Rate limiting triggered by excessive failed requests
4. Independent rate limit handling that doesn't coordinate across hook instances

## Error Sequence Timeline

### Phase 1: Token Expiration (After ~1 hour)
```
1. Firebase ID token expires (1-hour lifespan)
2. Polling hooks continue making requests with expired token
3. Backend returns 401 Unauthorized errors
4. Error: "Missing or invalid authorization header"
```

### Phase 2: Continued Polling Despite Auth Failure
```
5. useUserData continues polling /auth/me every 30s
6. useTier continues polling /api/tier/status every 60s  
7. useTaskManager continues polling /api/tasks/active every 5s
8. Multiple 401 errors accumulate rapidly
```

### Phase 3: Rate Limiting Triggered
```
9. Backend rate limiter: 100 requests per 15 minutes per IP
10. With 3 hooks polling aggressively = ~30+ requests/minute
11. Rate limit exceeded → 429 Too Many Requests
12. retryAfter: 900 seconds (15 minutes)
```

### Phase 4: Cascade Failure
```
13. Each hook instance pauses for 60 seconds independently
14. Hooks resume at different times
15. Immediately hit rate limit again
16. Cycle repeats indefinitely
17. Application becomes unusable
```

## Root Cause Analysis

### 1. Firebase Token Not Force-Refreshing

**Location:** `frontend/src/contexts/AuthContext.tsx:139`

```typescript
setTokenGetter(async () => {
  try {
    return await firebaseUser.getIdToken();  // ❌ Missing force refresh
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
});
```

**Problem:** 
- `getIdToken()` returns cached token (may be expired)
- Should use `getIdToken(true)` to force refresh when expired
- Firebase SDK automatically refreshes tokens, but we're not utilizing it

**Impact:**
- After 1 hour, all API requests fail with 401
- No automatic recovery mechanism

---

### 2. Multiple Hook Instances Creating Polling Storm

**Locations:**
- `useUserData` - used in:
  - `UserMenu` component (every page)
  - `TaskPanel` → `useTaskManager` → depends on `useUserData`
  - Account pages
  - Credit pages

- `useTier` - used in:
  - Account pages
  - TierCard component
  - UpgradeModal component

- `useTaskManager` - used in:
  - TaskPanel (every page)
  - Multiple task-related components

**Problem:**
Each component that uses these hooks creates a **separate polling instance**:

```
Page Load:
├─ UserMenu → useUserData (polls every 30s)
├─ TaskPanel → useTaskManager (polls every 5s)
│   └─ depends on useUserData (another instance, polls every 30s)
└─ Account Page → useUserData (yet another instance, polls every 30s)
    └─ TierCard → useTier (polls every 60s)
```

**Request Rate Calculation:**
- Minimum: 1 useUserData (30s) + 1 useTier (60s) + 1 useTaskManager (5s)
- Requests per minute: 2 + 1 + 12 = **15 requests/min**
- With multiple instances: **30-50 requests/min**
- Rate limit: 100 requests per 15 min = **6.67 requests/min average**

**Result:** Rate limit exceeded within 2-3 minutes of normal use

---

### 3. Backend Rate Limiting Configuration

**Location:** `backend/config.yaml:134-136`

```yaml
rate_limiting:
  general:
    window_minutes: 15        # 15-minute window
    max_requests: 100         # 100 requests per IP
```

**Effective Limit:** 6.67 requests/minute average

**Frontend Polling Rates:**
- `useUserData`: 2 requests/min (every 30s)
- `useTier`: 1 request/min (every 60s)
- `useTaskManager`: 12 requests/min (every 5s)

**With Auth Failures:** Every failed request counts toward rate limit
- 401 errors don't stop polling
- Retry logic with exponential backoff not coordinated
- Multiple hook instances = multiplied failure requests

---

### 4. Independent Rate Limit Pause Logic

**Problem:** Each hook instance has its own pause mechanism:

**`useUserData.ts:60-61`**
```typescript
const rateLimitPausedRef = useRef(false);
const rateLimitResumeTimeRef = useRef<number | null>(null);
```

**`useTier.ts:41-42`**
```typescript
const rateLimitPausedRef = useRef(false);
const rateLimitResumeTimeRef = useRef<number | null>(null);
```

**`useTaskManager.ts:58-59`**
```typescript
const rateLimitPausedRef = useRef(false);
const rateLimitResumeTimeRef = useRef<number | null>(null);
```

**Issue:**
- 3 different hooks × multiple instances = dozens of independent pause states
- When one instance resumes, hits rate limit, pauses
- Other instances continue or resume at different times
- No global coordination
- Creates perpetual cycle of failures

---

### 5. No Centralized Auth State Management

**Problem:**
- Each hook independently fetches auth data
- No shared state for user/quota/tier information
- Redundant API calls for the same data
- No coordination when auth fails

**Evidence from logs:**
```
video-research-723520495466.asia-southeast1.run.app/auth/me:1
Failed to load resource: the server responded with a status of 401 ()
```
Multiple `/auth/me` calls failing repeatedly

---

## Impact Assessment

### User Experience Impact: ⚠️ **CRITICAL**

1. **Application Unusable After 1 Hour**
   - All features stop working
   - Data cannot be fetched
   - Actions cannot be performed

2. **No User Feedback**
   - Console shows errors, but UI doesn't inform user
   - User doesn't know if they should refresh or wait

3. **15-Minute Lockout**
   - Rate limit retryAfter: 900 seconds
   - User must wait or clear browser data

### Server Impact: ⚠️ **HIGH**

1. **Wasted Resources**
   - Thousands of failed requests
   - Rate limiter processing overhead
   - Logs filled with errors

2. **Legitimate Users Affected**
   - IP-based rate limiting
   - Shared IPs (offices, schools) hit limit faster

### Data Consistency Impact: ⚠️ **MEDIUM**

1. **Stale Data**
   - UI shows outdated information
   - Credit balance not updated
   - Task status not refreshed

## Technical Debt Created

1. **Multiple Hook Instances Anti-Pattern**
   - Should use global state management (React Context)
   - Current architecture doesn't scale

2. **Polling-Based Architecture Limitations**
   - Should use WebSocket/SSE for real-time updates
   - Polling only for fallback

3. **No Centralized Error Handling**
   - Each hook handles errors independently
   - No application-wide error recovery strategy

## Recommended Solutions (Priority Order)

### 🔴 Critical - Fix Immediately

#### 1. Force Token Refresh
**File:** `frontend/src/contexts/AuthContext.tsx:139`
```typescript
setTokenGetter(async () => {
  try {
    // Force refresh if token is close to expiry
    return await firebaseUser.getIdToken(true);
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
});
```

#### 2. Implement Global Rate Limit Coordination
**New File:** `frontend/src/lib/rate-limit-coordinator.ts`
```typescript
class RateLimitCoordinator {
  private static isPaused = false;
  private static resumeTime: number | null = null;
  private static listeners: Set<() => void> = new Set();

  static pause(seconds: number) {
    this.isPaused = true;
    this.resumeTime = Date.now() + (seconds * 1000);
    this.notifyListeners();
  }

  static isPausedNow(): boolean {
    if (!this.isPaused) return false;
    if (this.resumeTime && Date.now() >= this.resumeTime) {
      this.resume();
      return false;
    }
    return true;
  }

  static resume() {
    this.isPaused = false;
    this.resumeTime = null;
    this.notifyListeners();
  }

  static subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private static notifyListeners() {
    this.listeners.forEach(cb => cb());
  }
}
```

#### 3. Stop Polling on Auth Failure
All hooks should immediately stop polling when receiving 401:
```typescript
if (response.error?.code === 'UNAUTHORIZED') {
  // Stop polling immediately
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
  
  // Trigger global auth refresh or logout
  await attemptTokenRefresh();
}
```

### 🟡 High Priority - Implement Soon

#### 4. Centralize User Data Management
**New File:** `frontend/src/contexts/UserDataContext.tsx`
```typescript
// Single source of truth for user data
// All components subscribe to this context
// Only ONE set of polling intervals
export function UserDataProvider({ children }) {
  const { user, loading, error } = useUserData(); // Single instance
  const { tierStatus } = useTier(); // Single instance
  
  return (
    <UserDataContext.Provider value={{ user, tierStatus, loading, error }}>
      {children}
    </UserDataContext.Provider>
  );
}
```

#### 5. Implement Exponential Backoff with Jitter
```typescript
// Increase polling interval after failures
let currentInterval = baseInterval;
let failureCount = 0;

function calculateNextInterval() {
  if (failureCount === 0) return baseInterval;
  
  // Exponential backoff: 30s → 60s → 120s → 240s (max)
  const backoff = Math.min(
    baseInterval * Math.pow(2, failureCount),
    240000 // Max 4 minutes
  );
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = backoff * 0.2 * (Math.random() - 0.5);
  return backoff + jitter;
}
```

#### 6. Add Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  private readonly threshold = 5; // Open after 5 failures
  private readonly timeout = 60000; // Try again after 60s
  
  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        console.warn('Circuit breaker is open, skipping request');
        return null;
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      console.warn('Circuit breaker opened due to repeated failures');
    }
  }
}
```

### 🟢 Medium Priority - Architectural Improvements

#### 7. Move to Server-Sent Events (SSE) for Real-Time Updates
- Reduce polling to minimum (only for fallback)
- Use SSE for user data updates, tier changes, task updates
- Backend pushes updates instead of client pulling

#### 8. Implement Request Deduplication
```typescript
// Prevent multiple instances from making duplicate requests
const pendingRequests = new Map<string, Promise<any>>();

async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}
```

#### 9. Add User-Visible Error Messages
```typescript
// Show toast notification when auth fails
if (error?.code === 'UNAUTHORIZED') {
  showToast({
    type: 'error',
    title: 'Session Expired',
    message: 'Please refresh the page to continue',
    action: {
      label: 'Refresh',
      onClick: () => window.location.reload()
    }
  });
}

// Show toast when rate limited
if (error?.code === 'RATE_LIMIT') {
  showToast({
    type: 'warning',
    title: 'Too Many Requests',
    message: `Please wait ${Math.ceil(retryAfter / 60)} minutes before trying again`,
    duration: 10000
  });
}
```

#### 10. Adjust Backend Rate Limits
**File:** `backend/config.yaml`
```yaml
rate_limiting:
  general:
    window_minutes: 15
    max_requests: 300  # Increase from 100 to 300
    # OR implement per-endpoint rate limits:
  auth:
    window_minutes: 15
    max_requests: 50   # Auth endpoints
  tasks:
    window_minutes: 15  
    max_requests: 200  # Task polling (high frequency, low cost)
  tier:
    window_minutes: 15
    max_requests: 30   # Tier checks (low frequency)
```

## Testing Strategy

### 1. Reproduce the Issue
```bash
# Keep browser open for 1+ hour
# Monitor console for:
# - 401 errors appearing
# - 429 errors following
# - Polling continuing despite errors
```

### 2. Verify Token Refresh Fix
```typescript
// Add logging
console.log('Token age:', (Date.now() - tokenIssuedAt) / 1000, 'seconds');
console.log('Forcing token refresh:', forceRefresh);

// Test: Keep app open for 65 minutes, verify no 401 errors
```

### 3. Test Rate Limit Coordination
```typescript
// Simulate rate limit
mockApi.onGet('/auth/me').reply(429, {
  error: {
    code: 'RATE_LIMIT',
    message: 'Too many requests',
    details: { retryAfter: 60 }
  }
});

// Verify: All polling stops globally
// Verify: Polling resumes after 60 seconds
```

### 4. Load Testing
```bash
# Simulate multiple users
# Verify rate limits are reasonable
# Ensure legitimate users aren't blocked
```

## Monitoring & Alerting

### Add Application Metrics
1. **Token Refresh Rate**
   - How often tokens are refreshed
   - Refresh failures

2. **API Request Volume**
   - Requests per endpoint per minute
   - Failed requests by status code

3. **Rate Limit Hit Rate**
   - How often users hit rate limits
   - Average retry-after duration

4. **Polling Health**
   - Number of active polling intervals
   - Polling failures and recovery

### Alert Conditions
- 401 error rate > 5% of requests
- 429 error rate > 1% of requests
- Token refresh failures > 10/hour
- Average polling requests > 10/min per user

## Conclusion

This is a **critical production issue** caused by:
1. ❌ Token expiration without proper refresh
2. ❌ Uncoordinated aggressive polling
3. ❌ Multiple independent hook instances
4. ❌ Inadequate rate limit handling

**Immediate Action Required:**
1. Implement force token refresh (**Priority 1**)
2. Add global rate limit coordinator (**Priority 1**)
3. Stop polling on auth failure (**Priority 1**)

**Expected Outcome:**
- Application remains stable for indefinite duration
- Graceful handling of auth expiration
- Reduced server load
- Better user experience

**Estimated Fix Time:**
- Critical fixes (1-3): **2-4 hours**
- High priority (4-6): **1-2 days**
- Medium priority (7-10): **3-5 days**


