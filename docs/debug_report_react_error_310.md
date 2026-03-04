# Debug Report: React Error #310 on Production

**Date:** 2026-01-15
**Issue:** Minified React error #310 - "Rendered more hooks than during the previous render"
**Status:** Unresolved
**Environment:** Firebase Hosting (Production)

## Error Details

```
Error: Minified React error #310
Component: eY (minified name)
Location: useEffect hook execution
Failed Endpoint: /api/tasks/active (401 Unauthorized)
```

## Root Cause Analysis

React error #310 occurs when hooks are called in inconsistent order across renders. This typically happens when:
1. Hooks are called conditionally
2. Early returns happen before all hooks are called
3. Async state changes cause different render paths

## What We Found

### 1. Environment Variable Issue
- **Problem:** `.env.local` had `NEXT_PUBLIC_SKIP_AUTH=true` which overrides production settings
- **Root Cause:** Next.js loads `.env.local` with **HIGHEST priority**, even during production builds. This means `.env.local` will override `.env.production` values.
- **Fix Applied:** 
  1. Changed to `false` in `.env.local` (temporary fix)
  2. **Better Solution:** Updated `validate-env.js` to detect and warn when `.env.local` exists during production builds
  3. **Best Practice:** Rename or delete `.env.local` before production builds, or use environment variables directly
- **Result:** Eliminated security warnings but didn't fix the error (the error is unrelated to env vars)
- **Prevention:** The build script now warns if `.env.local` exists during production builds and will fail in CI/CD environments

### 2. Multiple Hooks Making Premature API Calls

Three hooks were making API calls before authentication was ready:

#### `useUserData` Hook
- **Endpoint:** `/auth/me`, `/api/credits/balance`
- **Problem:** Polling started immediately on mount regardless of auth state
- **Fixes Attempted:**
  1. Added `useAuth()` import and auth state checks
  2. Modified `fetchUserData` to return early if not authenticated
  3. Fixed `useCallback` dependencies (removed `user`, `quota` to prevent recreation)
  4. Added auth check to `useEffect` before setting up polling
  
#### `useTier` Hook
- **Endpoint:** `/api/tier/status`
- **Problem:** Same as useUserData - polling before auth ready
- **Fixes Attempted:**
  1. Added `useAuth()` import and auth state checks
  2. Modified `fetchTierStatus` to return early if not authenticated
  3. Fixed `useCallback` dependencies (removed `tierStatus`)
  4. Added auth check to `useEffect` before setting up polling

#### `useTaskManager` Hook
- **Endpoint:** `/api/tasks/active`
- **Problem:** Same pattern - immediate polling without auth check
- **Fixes Attempted:**
  1. Added `useAuth()` import and auth state checks
  2. Modified `useEffect` to return early if `authLoading || !isAuthenticated`
  3. Updated dependencies to include `authLoading` and `isAuthenticated`

## Code Changes Made

### 1. useUserData.ts
```typescript
// Added import
import { useAuth } from '@/contexts/AuthContext';

// Added in hook body
const { isAuthenticated, loading: authLoading } = useAuth();

// Modified useEffect
useEffect(() => {
  isMountedRef.current = true;
  
  // Don't set up polling or fetch data until auth is ready and user is authenticated
  if (authLoading || !isAuthenticated) {
    return;
  }
  
  // ... rest of polling setup
}, [fetchUserData, authLoading, isAuthenticated]);

// Fixed useCallback dependencies
}, [isAuthenticated, authLoading, showToast]); // Removed user, quota
```

### 2. useTier.ts
Same pattern as useUserData - added auth checks and fixed dependencies.

### 3. useTaskManager.ts
```typescript
// Added import and auth checks
const { isAuthenticated, loading: authLoading } = useAuth();

// Modified useEffect
useEffect(() => {
  if (authLoading || !isAuthenticated) {
    return;
  }
  // ... rest of setup
}, [refreshTasks, pollingIntervalMs, authLoading, isAuthenticated]);
```

### 4. Environment Files
```bash
# .env.local - changed from true to false
NEXT_PUBLIC_SKIP_AUTH=false

# .env.production - was already correct
NEXT_PUBLIC_SKIP_AUTH=false
```

## Provider Hierarchy

Current structure (updated with TaskManagerProvider):
```
Providers
├── NextThemesProvider
│   └── ToastProvider
│       └── AuthProvider
│           └── UserDataProvider (uses useUserData, useTier)
│               └── TaskManagerProvider (uses useTaskManager, which calls useUserData directly - PROBLEM!)
│                   └── LanguageProvider (uses useAuth, useUserDataContext)
│                       └── children
```

**Issue:** `TaskManagerProvider` calls `useTaskManager()`, which internally calls `useUserData()` directly instead of using `useUserDataContext()`. This creates a duplicate hook instance.

## What Didn't Work

Despite all fixes:
1. ✅ Auth checks added to all three hooks
2. ✅ Early returns before polling setup
3. ✅ Stable callback dependencies
4. ✅ Clean builds and deployments
5. ❌ **Error still persists**

## Possible Remaining Issues

### 1. Circular Dependency Chain
- `LanguageProvider` uses `useUserDataContext()`
- `UserDataContext` uses `useUserData()` and `useTier()`
- Both hooks now use `useAuth()`
- All are in the same provider tree
- **Potential Issue:** Complex re-render cycle when auth state changes

### 2. Minified Error Obscures Source
- Component name `eY` is minified
- Can't identify exact component causing the issue
- **Recommendation:** Run dev build locally to get unminified error

### 3. Server-Side Rendering (SSR) Mismatch
- Next.js static export with `output: 'export'`
- Client-side hooks might be executing during SSR
- **Potential Issue:** Server render vs client render hook count differs

### 4. Guest User Flow
- App needs to support unauthenticated guest users
- Current fix prevents polling when `!isAuthenticated`
- This is correct behavior, but may reveal other issues in components expecting user data

### 5. AuthContext Loading State
- `loading: true` initially, then switches to `false`
- This state change triggers re-renders in all child components
- **Potential Issue:** Re-render cascade causing hook order changes

## Recommendations for Next Debug Session

### 1. Enable Development Mode in Production
Temporarily deploy a dev build to see unminified errors:
```bash
# In package.json, temporarily change
"build": "next build" → "build": "NODE_ENV=development next build"
```

### 2. Add Debugging Logs
Add console logs in hooks to track execution order:
```typescript
console.log('[useUserData] render', { isAuthenticated, authLoading });
console.log('[useTier] render', { isAuthenticated, authLoading });
console.log('[useTaskManager] render', { isAuthenticated, authLoading });
```

### 3. Check for Other Hooks Making API Calls
Search for other locations calling API endpoints:
```bash
grep -r "getCurrentUserData\|getActiveTasks\|getTierStatus" frontend/src
```

### 4. Simplify Provider Hierarchy Temporarily
Test if removing `UserDataProvider` from inside `AuthProvider` helps:
```typescript
// Temporary test structure
<AuthProvider>
  <LanguageProvider>
    <UserDataProvider>
      {children}
    </UserDataProvider>
  </LanguageProvider>
</AuthProvider>
```

### 5. Check ErrorBoundary Component
The error is being caught by `ErrorBoundary` (line 7648988ed79093a0.js:9).
Review the ErrorBoundary implementation for issues.

## Files Modified

1. `frontend/.env.local` - Set SKIP_AUTH to false
2. `frontend/src/hooks/useUserData.ts` - Added auth checks
3. `frontend/src/hooks/useTier.ts` - Added auth checks  
4. `frontend/src/hooks/useTaskManager.ts` - Added auth checks

## Build & Deploy History

1. **First attempt:** Fixed .env.local - didn't work
2. **Second attempt:** Added auth checks to useUserData, useTier - didn't work
3. **Third attempt:** Fixed useCallback dependencies - didn't work
4. **Fourth attempt:** Fixed useEffect polling setup - didn't work
5. **Fifth attempt:** Added auth checks to useTaskManager - still didn't work
6. **Sixth attempt:** Fixed refreshTasks dependency array - didn't work
7. **Seventh attempt:** Fixed fetchTierStatus and fetchUserData retryCount handling - didn't work
8. **Eighth attempt:** Added comprehensive debug logging - revealed duplicate instances but didn't fix
9. **Ninth attempt:** Fixed useEffect early returns to return cleanup functions - didn't work
10. **Tenth attempt:** Created TaskManagerContext to share useTaskManager instance - reduced to one instance but error persists
11. **Eleventh attempt:** Added environment variable build safety - prevents env issues but doesn't fix React error

All builds completed successfully with no warnings.
All deployments completed successfully to Firebase Hosting.

**Key Finding from Logs:** Even with TaskManagerContext, there are still TWO `useUserData` instances:
- One from `UserDataContext` (expected)
- One from `useTaskManager` calling `useUserData()` directly (unexpected - this is the problem)

## Additional Notes

- The 401 errors (`/api/tasks/active`, `/auth/me`, `/api/tier/status`) suggest hooks are still making calls before auth
- The fact that it fails even in incognito mode (no cache) confirms it's a code issue, not a caching issue
- Firebase Hosting deployment time verified: 18:50:xx (latest)
- The error occurs immediately on page load, before any user interaction

## Latest Fixes Applied (2026-01-15)

### 1. Fixed `refreshTasks` Dependency Array in `useTaskManager.ts`
**Problem:** `refreshTasks` callback had empty dependency array `[]` but used `user` and `showToast` inside, causing stale closures.

**Fix:** Added missing dependencies:
```typescript
}, [user, showToast]); // Fixed: Added missing dependencies. Note: tasks is intentionally excluded to avoid infinite loops (we use functional setState)
```

### 2. Fixed `fetchTierStatus` Dependency Array in `useTier.ts`
**Problem:** `retryCount` was in dependency array, causing callback to be recreated every time retry count changed, potentially causing effect re-runs and hook order issues.

**Fix:** Removed `retryCount` from dependencies and used functional setState:
```typescript
// Before: if (retryCount > 0) { setRetryCount(0); }
// After:
setRetryCount((prev) => prev > 0 ? 0 : prev);
}, [isAuthenticated, authLoading, showToast]); // Removed retryCount
```

### 3. Fixed `fetchUserData` in `useUserData.ts`
**Problem:** Same issue - `retryCount` was being read but not in dependencies, or would cause unnecessary recreations if added.

**Fix:** Used functional setState:
```typescript
// Before: if (retryCount > 0) { setRetryCount(0); }
// After:
setRetryCount((prev) => prev > 0 ? 0 : prev);
```

## Additional Fixes Applied (2026-01-15 - Continued)

### 4. Added Comprehensive Debug Logging
**Purpose:** Track hook execution order to identify where hooks are called inconsistently.

**Changes:**
- Added detailed console logs to `useUserData`, `useTier`, `useTaskManager`, and `AuthContext`
- Created `hook-tracker.ts` utility to track hook execution order across renders
- Each hook logs: render count, timestamp, stack trace, auth state

**Result:** Logs revealed multiple instances of hooks being created, but didn't fix the root cause.

### 5. Fixed useEffect Early Returns
**Problem:** `useEffect` hooks with early returns were returning `undefined` instead of cleanup functions, causing inconsistent hook signatures.

**Fix:** Changed all early returns to return empty cleanup functions:
```typescript
// Before
if (authLoading || !isAuthenticated) {
  return; // Returns undefined
}

// After
if (authLoading || !isAuthenticated) {
  return () => {}; // Returns cleanup function (empty)
}
```

**Files Modified:**
- `frontend/src/hooks/useUserData.ts`
- `frontend/src/hooks/useTier.ts`
- `frontend/src/hooks/useTaskManager.ts`

**Result:** Didn't fix the error - the issue is deeper than cleanup function consistency.

### 6. Created TaskManagerContext
**Problem:** Multiple components were calling `useTaskManager()` directly, creating multiple instances. Each instance called `useUserData()` internally, causing inconsistent hook order.

**Fix:** Created centralized `TaskManagerContext` similar to `UserDataContext`:
- Created `frontend/src/contexts/TaskManagerContext.tsx`
- Added `TaskManagerProvider` to provider hierarchy
- Updated all components to use `useTaskManagerContext()` instead of `useTaskManager()`

**Files Modified:**
- `frontend/src/contexts/TaskManagerContext.tsx` (new)
- `frontend/src/components/providers.tsx` (added TaskManagerProvider)
- `frontend/src/components/tasks/TaskPanel.tsx`
- `frontend/src/components/tasks/FloatingActionButton.tsx`
- `frontend/src/components/tasks/TaskCreationModal.tsx`

**Result:** Reduced to ONE instance of `useTaskManager`, but error still persists. Logs show:
- ✅ Only one `useTaskManager` instance (`useTaskManager-tu9gbgq7m`)
- ❌ Still TWO `useUserData` instances:
  - `useUserData-okaqljjhd` (from UserDataContext)
  - `useUserData-r4oj486ay` (from within useTaskManager)

### 7. Environment Variable Build Safety
**Problem:** `.env.local` could override `.env.production` during builds.

**Fix:** 
- Created `frontend/.firebaseignore` to exclude env files
- Updated `firebase.json` ignore patterns
- Created `frontend/scripts/safe-build.js` to temporarily remove `.env.local` during builds
- Updated `validate-env.js` to warn about `.env.local` during production builds

**Files Modified:**
- `frontend/.firebaseignore` (new)
- `frontend/firebase.json`
- `frontend/scripts/safe-build.js` (new)
- `frontend/scripts/validate-env.js`
- `frontend/package.json` (added `build:safe` script)

**Result:** Prevents env var issues but doesn't fix React error #310.

## Current State (2026-01-15 - Latest Logs)

### What the Logs Reveal:
1. **Only ONE `useTaskManager` instance** - Context is working ✅
2. **Still TWO `useUserData` instances:**
   - `useUserData-okaqljjhd` - from `UserDataContext` (expected)
   - `useUserData-r4oj486ay` - from `useTaskManager` calling `useUserData()` directly (problem!)
3. **Error occurs on render #3** of `useTaskManager` in component `eK` (minified)
4. **Error location:** `at eK (57991d46f98479e6.js:1:27042)` - this is likely a component that uses `useTaskManager`

### The Real Problem:
**`useTaskManager` calls `useUserData()` directly instead of using `useUserDataContext()`**

This creates a second instance of `useUserData` hooks. When auth state changes or components re-render, React sees:
- Render 1: UserDataContext hooks + useTaskManager hooks (including its own useUserData)
- Render 2: Same hooks but in potentially different order
- Render 3: Hook count or order changes → React error #310

## Why the Problem Persists

### Root Cause Analysis:

1. **Duplicate Hook Instances:**
   - `UserDataContext` provides `useUserData()` via context
   - `useTaskManager` calls `useUserData()` directly (line 80)
   - This creates TWO separate hook instances with their own state
   - When these instances render at different times or in different orders, React detects inconsistent hook counts

2. **Hook Order Dependency on Auth State:**
   - When `authLoading` changes from `true` → `false`, all hooks re-render
   - `useTaskManager`'s internal `useUserData()` might render at a different point in the component tree than `UserDataContext`'s `useUserData()`
   - React tracks hooks by call order, and if the order changes between renders, it throws error #310

3. **Component Tree Complexity:**
   - Multiple providers wrapping components
   - Components conditionally rendering based on auth state
   - Each provider/hook combination creates a different hook execution path

### Why Previous Fixes Didn't Work:

1. **Auth checks** - Fixed premature API calls but didn't address duplicate hook instances
2. **Dependency arrays** - Fixed stale closures but didn't address hook count inconsistency
3. **Cleanup functions** - Fixed cleanup consistency but didn't address duplicate instances
4. **TaskManagerContext** - Fixed multiple `useTaskManager` instances but didn't fix `useTaskManager` calling `useUserData()` directly

## Future Debug Directions

### Immediate Next Steps:

1. **Fix `useTaskManager` to use `useUserDataContext()`:**
   ```typescript
   // In useTaskManager.ts, line 80
   // BEFORE:
   const { user, quota } = useUserData();
   
   // AFTER:
   import { useUserDataContext } from '@/contexts/UserDataContext';
   const { user, quota } = useUserDataContext();
   ```
   **Expected Result:** Eliminates duplicate `useUserData` instance, ensuring only ONE instance exists.

2. **Verify Hook Count Consistency:**
   - Count total hooks in `useTaskManager` (should be constant)
   - Count total hooks in `useUserData` (should be constant)
   - Ensure no conditional hook calls anywhere

3. **Deploy Dev Build Temporarily:**
   - Change `next.config.ts` to disable minification temporarily
   - Deploy to staging to get unminified error messages
   - Identify exact component `eK` that's failing

### Long-term Debugging Strategy:

1. **Hook Counting Tool:**
   - Create a dev-only hook counter that logs total hooks per render
   - Compare hook counts between renders to identify discrepancies
   - Add to `hook-tracker.ts`

2. **Component Isolation:**
   - Temporarily remove `TaskManagerProvider` and see if error persists
   - Test with minimal provider hierarchy
   - Gradually add providers back to identify which combination causes the issue

3. **React DevTools Profiler:**
   - Use React DevTools to track component render order
   - Identify which components render when and in what order
   - Look for components that conditionally render hooks

4. **Static Analysis:**
   - Use ESLint rule `react-hooks/rules-of-hooks` to catch conditional hook calls
   - Run exhaustive dependency checks
   - Verify no hooks are called inside loops, conditions, or nested functions

5. **Alternative Architecture:**
   - Consider if `useTaskManager` should be a context from the start
   - Evaluate if hook composition is causing the issue
   - Consider splitting `useTaskManager` into smaller hooks

### Critical Questions to Answer:

1. **Why does `useTaskManager` need to call `useUserData()` directly?**
   - Can it use `useUserDataContext()` instead?
   - Is there a circular dependency preventing this?

2. **What is component `eK`?**
   - Need unminified build to identify
   - Is it a component that conditionally renders?
   - Does it have its own hook calls?

3. **Is the error timing-dependent?**
   - Does it always happen on render #3?
   - Does it happen at a specific auth state transition?
   - Can we reproduce it consistently?

## Conclusion

The root cause is **duplicate hook instances**: `useTaskManager` creates its own `useUserData()` instance instead of using the shared `useUserDataContext()`. This causes React to see inconsistent hook counts between renders, triggering error #310.

**The fix should be simple:** Change `useTaskManager` to use `useUserDataContext()` instead of calling `useUserData()` directly. However, this may require careful testing to ensure no circular dependencies or other issues arise.

**Status:** 🔴 **Unresolved** - Need to fix `useTaskManager` to use context instead of direct hook call.

---

## Reflection: Why Previous Fixes Didn't Work

### What We Learned:

1. **Symptom vs Root Cause:**
   - We fixed symptoms (premature API calls, dependency arrays, cleanup functions)
   - But didn't address the fundamental issue: duplicate hook instances
   - React error #310 is about hook COUNT consistency, not just hook ORDER

2. **Context Pattern Inconsistency:**
   - Created `UserDataContext` to share `useUserData` instance
   - Created `TaskManagerContext` to share `useTaskManager` instance
   - But `useTaskManager` still calls `useUserData()` directly, breaking the pattern
   - This creates two separate `useUserData` instances with independent state

3. **Hook Composition Problem:**
   - Hooks calling other hooks is fine in theory
   - But when those hooks are also provided via context, you get duplicate instances
   - The solution: hooks that are provided via context should NOT be called directly by other hooks
   - Instead, they should use the context version

4. **Debugging Approach:**
   - Adding logs helped identify the duplicate instances
   - But we should have checked hook instances FIRST before fixing other issues
   - The logs clearly showed two `useUserData` instances from the start

### Why We Missed It:

1. **Assumed Context Would Fix It:**
   - We thought creating `TaskManagerContext` would solve everything
   - Didn't realize `useTaskManager` itself was creating duplicate instances

2. **Focused on Wrong Symptoms:**
   - Fixed auth checks, dependencies, cleanup functions
   - These were all valid fixes but didn't address the core issue

3. **Didn't Verify Hook Instances:**
   - Should have counted hook instances from the beginning
   - Should have verified only ONE instance of each hook exists

### The Correct Fix (Not Yet Applied):

Change `useTaskManager.ts` line 80:
```typescript
// BEFORE (creates duplicate instance):
const { user, quota } = useUserData();

// AFTER (uses shared instance):
import { useUserDataContext } from '@/contexts/UserDataContext';
const { user, quota } = useUserDataContext();
```

This should eliminate the duplicate `useUserData` instance and ensure consistent hook counts.
