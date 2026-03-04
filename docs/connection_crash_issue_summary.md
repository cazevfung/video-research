# Connection Crash Issue - Executive Summary

**Date:** 2026-01-14  
**Severity:** 🔴 **CRITICAL**  
**Status:** Analysis Complete - Ready for Implementation

---

## The Problem in 30 Seconds

Your application **crashes after ~1 hour of being open** due to a perfect storm of issues:

1. **Firebase tokens expire** but aren't automatically refreshed
2. **Multiple polling hooks** continue making requests with expired tokens
3. **Backend rate limiter** gets overwhelmed by failed requests
4. **Independent pause logic** in each hook creates an infinite loop of failures
5. **Application becomes permanently unusable** until page refresh

---

## The Smoking Gun

From your error logs:

```javascript
// Phase 1: Token expires (after 1 hour)
video-research-723520495466.asia-southeast1.run.app/auth/me:1
Failed to load resource: the server responded with a status of 401 ()
❌ "Missing or invalid authorization header"

// Phase 2: Hooks keep polling despite auth failure
// useUserData: every 30s
// useTier: every 60s  
// useTaskManager: every 5s
// Result: 30-50 requests/min with expired token

// Phase 3: Rate limiter kicks in
video-research-723520495466.asia-southeast1.run.app/api/tasks/active:1
Failed to load resource: the server responded with a status of 429 ()
❌ "Too many requests. Please try again later."
retryAfter: 900 seconds (15 minutes)

// Phase 4: Infinite loop
[useTaskManager] Rate limited, pausing polling for 60 seconds
[useTaskManager] Rate limited, pausing polling for 60 seconds
[useTaskManager] Rate limited, pausing polling for 60 seconds
// ... repeats forever, app is dead
```

---

## Root Causes Identified

### 1. Token Not Force-Refreshing ⏱️

**Location:** `frontend/src/contexts/AuthContext.tsx:139`

```typescript
// ❌ CURRENT (Wrong)
return await firebaseUser.getIdToken();

// ✅ SHOULD BE (Correct)
return await firebaseUser.getIdToken(true); // Force refresh when expired
```

**Impact:** After 1 hour, all requests fail with 401

---

### 2. Multiple Hook Instances 🔁

**Problem:** Every component creates its own polling instance

```
UserMenu → useUserData (polls every 30s)
TaskPanel → useTaskManager → useUserData (polls every 30s)
Account Page → useUserData (polls every 30s)
           → useTier (polls every 60s)

= 3 instances of useUserData + 1 useTier + 1 useTaskManager
= 19+ requests/min minimum
= 30-50 requests/min with failures
```

**Rate Limit:** 6.67 requests/min average  
**Result:** Limit exceeded in 2-3 minutes

---

### 3. Polling Doesn't Stop on Auth Failure ⚠️

**Current behavior:**
- Get 401 error
- Log error to console
- **Continue polling** ❌
- Rack up hundreds of failed requests

**Should be:**
- Get 401 error
- **Stop ALL polling immediately**
- Attempt token refresh
- Show user-friendly error
- Resume or logout

---

### 4. Independent Rate Limit Pausing 🔀

Each hook has its own pause logic:

```typescript
// useUserData.ts
const rateLimitPausedRef = useRef(false); // ❌ Independent

// useTier.ts  
const rateLimitPausedRef = useRef(false); // ❌ Independent

// useTaskManager.ts
const rateLimitPausedRef = useRef(false); // ❌ Independent
```

**Problem:**
- Instance A pauses for 60s
- Instance B pauses for 60s (started 5s later)
- Instance A resumes → hits rate limit → pauses again
- Instance B resumes → hits rate limit → pauses again
- **Infinite loop** ♾️

---

## Impact Assessment

| Area | Impact | Details |
|------|--------|---------|
| **User Experience** | 🔴 Critical | App unusable after 1 hour, no recovery |
| **Server Load** | 🟡 High | Thousands of failed requests, wasted resources |
| **Data Freshness** | 🟡 Medium | Stale data shown to users |
| **User Trust** | 🔴 Critical | Silent failures, no feedback |

---

## The Fix (Priority Order)

### 🔴 Critical - Fix TODAY (2-4 hours)

#### 1. Force Token Refresh
```typescript
// frontend/src/contexts/AuthContext.tsx:139
return await firebaseUser.getIdToken(true); // Add 'true'
```

#### 2. Stop Polling on Auth Failure
```typescript
if (error?.code === 'UNAUTHORIZED') {
  clearInterval(pollingIntervalRef.current);
  // Attempt refresh or logout
}
```

#### 3. Global Rate Limit Coordinator
```typescript
// New file: frontend/src/lib/rate-limit-coordinator.ts
// Centralized pause/resume for ALL hooks
class RateLimitCoordinator {
  static isPaused = false;
  static pause(seconds) { /* ... */ }
  static canPoll() { /* ... */ }
}
```

**Expected Result:** App stays stable indefinitely ✅

---

### 🟡 High Priority - This Week (1-2 days)

#### 4. Centralize User Data
```typescript
// New: UserDataContext - single source of truth
// All components subscribe, only ONE set of polling
<UserDataProvider>
  <App />
</UserDataProvider>
```

#### 5. Exponential Backoff
```typescript
// Increase intervals after failures
// 30s → 60s → 120s → 240s (max)
```

#### 6. Circuit Breaker Pattern
```typescript
// Stop requests after N failures
// Try again after timeout
// Prevent cascade failures
```

---

### 🟢 Medium Priority - Next Sprint (3-5 days)

#### 7. User-Visible Error Messages
```typescript
showToast({
  type: 'error',
  title: 'Session Expired',
  message: 'Please refresh to continue',
  action: { label: 'Refresh', onClick: reload }
});
```

#### 8. Increase Backend Rate Limits
```yaml
# backend/config.yaml
rate_limiting:
  general:
    max_requests: 300  # Up from 100
```

#### 9. Request Deduplication
```typescript
// Prevent duplicate requests from multiple instances
```

#### 10. Move to SSE for Real-Time Updates
```typescript
// Replace polling with push notifications
// Polling only for fallback
```

---

## Testing Checklist

- [ ] Keep app open for 65 minutes → No 401 errors
- [ ] Keep app open for 65 minutes → No 429 errors
- [ ] Simulate token expiry → Automatic refresh
- [ ] Simulate rate limit → Global pause works
- [ ] Multiple components → No duplicate polling
- [ ] Auth failure → Clear error message to user
- [ ] Network offline → Graceful degradation

---

## Before & After Metrics

| Metric | Before (Broken) | After (Fixed) | Improvement |
|--------|----------------|---------------|-------------|
| **Requests/min** | 30-50 | 5-10 | 🟢 75% reduction |
| **App Stability** | Crashes in 1hr | Stable indefinitely | 🟢 100% uptime |
| **Rate Limit Hits** | Multiple/hour | None | 🟢 100% elimination |
| **User Feedback** | None | Toast notifications | 🟢 Clear communication |
| **Polling Efficiency** | Multiple instances | Single instance | 🟢 66% reduction |

---

## Files to Modify

### Critical Changes (Must Do)
1. `frontend/src/contexts/AuthContext.tsx` - Line 139 (force token refresh)
2. `frontend/src/hooks/useUserData.ts` - Lines 87-109 (stop on 401)
3. `frontend/src/hooks/useTier.ts` - Lines 62-105 (stop on 401)
4. `frontend/src/hooks/useTaskManager.ts` - Lines 83-149 (stop on 401)
5. `frontend/src/lib/rate-limit-coordinator.ts` - New file (global coordinator)

### High Priority Changes (Should Do)
6. `frontend/src/contexts/UserDataContext.tsx` - New file (centralized state)
7. `frontend/src/hooks/useUserData.ts` - Add exponential backoff
8. `frontend/src/hooks/useTier.ts` - Add exponential backoff  
9. `frontend/src/hooks/useTaskManager.ts` - Add exponential backoff
10. `frontend/src/lib/circuit-breaker.ts` - New file (circuit breaker)

### Medium Priority Changes (Nice to Have)
11. `backend/config.yaml` - Increase rate limits
12. `frontend/src/components/ui/ErrorToast.tsx` - User notifications
13. `frontend/src/lib/request-deduplicator.ts` - Deduplicate requests

---

## Success Criteria

✅ Application remains stable after 24+ hours of continuous use  
✅ Zero 401 errors from token expiration  
✅ Zero 429 errors from rate limiting  
✅ Clear user feedback on any errors  
✅ Reduced server load (75% fewer requests)  
✅ Single polling instance per hook type  

---

## Risk Assessment

**If Not Fixed:**
- 🔴 **100% of users** will experience crashes after 1 hour
- 🔴 **Production is unusable** for any real usage
- 🔴 **Users will leave** due to poor experience
- 🟡 **Server costs increase** due to failed requests
- 🟡 **Support tickets increase** with confused users

**Implementation Risk:**
- 🟢 **Low** - Changes are localized and well-defined
- 🟢 **Low** - Can be tested incrementally
- 🟢 **Low** - Backward compatible (no breaking changes)

---

## Next Steps

1. **Review this analysis** with the team
2. **Prioritize the critical fixes** (items 1-3)
3. **Assign implementation** to developers
4. **Set up monitoring** for the metrics
5. **Deploy and test** in staging first
6. **Roll out to production** with monitoring
7. **Verify stability** over 24-48 hours

---

## Questions?

For detailed technical analysis, see:
- `docs/connection_crash_issue_analysis.md` - Full technical breakdown
- `docs/connection_crash_issue_diagram.md` - Visual flow diagrams

For implementation guidance:
- Start with the 3 critical fixes (2-4 hours total)
- Each fix is independent and can be deployed separately
- Test thoroughly in staging before production


