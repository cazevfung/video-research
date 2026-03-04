# Debug Panel Implementation Plan

| Version | 1.0 |
| :--- | :--- |
| **Status** | Planning |
| **Created** | 2024 |
| **Priority** | Medium - Development Tool |
| **Related PRD** | N/A - Internal Development Feature |

---

## Executive Summary

This document outlines the implementation plan to create a debug panel feature that is only visible when running the application on localhost. The debug panel will provide developers with various toggles and settings to facilitate testing, including a critical feature to unlock unlimited credits for any logged-in account.

**Key Features:**
- Debug button visible only on localhost
- Collapsible debug panel with multiple settings
- Unlimited credits toggle (bypasses credit checks)
- Additional debug toggles for testing scenarios
- Settings persist in localStorage for convenience

**Security**: This feature is **STRICTLY** limited to localhost/development environments and will never be accessible in production builds.

---

## Problem Analysis

### Current State

**Development Challenges:**
1. **Credit Limitations**: Developers need to manually add credits or wait for resets when testing
2. **No Quick Testing Tools**: No easy way to toggle features or bypass restrictions during development
3. **Manual Configuration**: Developers must modify code or database to test different scenarios
4. **Time-Consuming**: Testing credit-related features requires manual intervention

### Desired State

**Development Benefits:**
1. **Unlimited Credits Toggle**: Instantly enable unlimited credits for testing
2. **Quick Feature Toggles**: Easily enable/disable features for testing
3. **Persistent Settings**: Settings saved in localStorage for convenience
4. **Visual Feedback**: Clear indication when debug features are active

---

## Implementation Plan

### Phase 1: Frontend Debug Panel Component

**Goal**: Create a debug panel component that is only visible on localhost.

#### Task 1.1: Create Debug Panel Component
**File**: `frontend/src/components/debug/DebugPanel.tsx`

**Features:**
- Floating button (bottom-left corner) that opens/closes panel
- Panel slides in from left or bottom
- Only visible when `isDevelopmentMode()` returns true
- Settings stored in localStorage
- Clean, minimal UI that doesn't interfere with app

**Implementation Structure:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { isDevelopmentMode } from '@/config/env';
import { DebugSettings } from './DebugSettings';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<DebugSettings>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('debug_settings');
      return saved ? JSON.parse(saved) : getDefaultSettings();
    }
    return getDefaultSettings();
  });

  // Save to localStorage when settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug_settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Only render in development mode
  if (!isDevelopmentMode()) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg"
        title="Debug Panel"
      >
        🐛
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-80 max-h-96 overflow-y-auto">
          <DebugSettings
            settings={settings}
            onChange={setSettings}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}
```

**Acceptance Criteria:**
- ✅ Button only visible on localhost
- ✅ Panel opens/closes smoothly
- ✅ Settings persist across page refreshes
- ✅ No impact on production builds

#### Task 1.2: Create Debug Settings Component
**File**: `frontend/src/components/debug/DebugSettings.tsx`

**Settings to Include:**

1. **Unlimited Credits Toggle** (Primary Feature)
   - Label: "Unlimited Credits"
   - Description: "Bypass credit checks for the current user"
   - Effect: When enabled, all credit checks return positive

2. **Skip Credit Deduction Toggle**
   - Label: "Skip Credit Deduction"
   - Description: "Prevent credits from being deducted"
   - Effect: When enabled, credit deduction is skipped

3. **Show Credit Balance Override**
   - Label: "Override Credit Balance"
   - Description: "Set a custom credit balance to display"
   - Type: Number input
   - Effect: Overrides displayed credit balance

4. **Bypass Rate Limits Toggle**
   - Label: "Bypass Rate Limits"
   - Description: "Skip rate limiting checks"
   - Effect: When enabled, rate limits are ignored

5. **Show API Request Logs Toggle**
   - Label: "Log API Requests"
   - Description: "Log all API requests to console"
   - Effect: When enabled, logs all API calls

6. **Mock Slow Network Toggle**
   - Label: "Simulate Slow Network"
   - Description: "Add artificial delay to API calls"
   - Type: Number input (delay in ms)
   - Effect: Adds delay to API responses

**Implementation:**
```typescript
'use client';

import { useState } from 'react';

export interface DebugSettings {
  unlimitedCredits: boolean;
  skipCreditDeduction: boolean;
  overrideCreditBalance: number | null;
  bypassRateLimits: boolean;
  logApiRequests: boolean;
  simulateSlowNetwork: boolean;
  networkDelayMs: number;
}

export function getDefaultSettings(): DebugSettings {
  return {
    unlimitedCredits: false,
    skipCreditDeduction: false,
    overrideCreditBalance: null,
    bypassRateLimits: false,
    logApiRequests: false,
    simulateSlowNetwork: false,
    networkDelayMs: 1000,
  };
}

interface DebugSettingsProps {
  settings: DebugSettings;
  onChange: (settings: DebugSettings) => void;
  onClose: () => void;
}

export function DebugSettings({ settings, onChange, onClose }: DebugSettingsProps) {
  const updateSetting = <K extends keyof DebugSettings>(
    key: K,
    value: DebugSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Debug Panel</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      {/* Unlimited Credits Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="font-medium">Unlimited Credits</label>
          <p className="text-xs text-gray-500">Bypass credit checks</p>
        </div>
        <input
          type="checkbox"
          checked={settings.unlimitedCredits}
          onChange={(e) => updateSetting('unlimitedCredits', e.target.checked)}
          className="w-4 h-4"
        />
      </div>

      {/* Skip Credit Deduction Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="font-medium">Skip Credit Deduction</label>
          <p className="text-xs text-gray-500">Prevent credit deduction</p>
        </div>
        <input
          type="checkbox"
          checked={settings.skipCreditDeduction}
          onChange={(e) => updateSetting('skipCreditDeduction', e.target.checked)}
          className="w-4 h-4"
        />
      </div>

      {/* Override Credit Balance */}
      <div>
        <label className="font-medium block mb-1">Override Credit Balance</label>
        <input
          type="number"
          value={settings.overrideCreditBalance ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            updateSetting('overrideCreditBalance', value === '' ? null : parseInt(value, 10));
          }}
          placeholder="Leave empty to use real balance"
          className="w-full px-2 py-1 border rounded"
        />
      </div>

      {/* Additional toggles... */}
      
      {/* Reset Button */}
      <button
        onClick={() => onChange(getDefaultSettings())}
        className="w-full mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
      >
        Reset to Defaults
      </button>
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ All toggles work correctly
- ✅ Settings update in real-time
- ✅ Clear labels and descriptions
- ✅ Responsive layout

#### Task 1.3: Create Debug Context
**File**: `frontend/src/contexts/DebugContext.tsx`

**Purpose**: Provide debug settings to all components via React Context.

**Implementation:**
```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { DebugSettings, getDefaultSettings } from '@/components/debug/DebugSettings';
import { isDevelopmentMode } from '@/config/env';

interface DebugContextType {
  settings: DebugSettings;
  isEnabled: boolean;
}

const DebugContext = createContext<DebugContextType>({
  settings: getDefaultSettings(),
  isEnabled: false,
});

export function DebugProvider({ children }: { children: ReactNode }) {
  const isEnabled = isDevelopmentMode();
  
  // Load settings from localStorage
  const settings = typeof window !== 'undefined'
    ? (() => {
        const saved = localStorage.getItem('debug_settings');
        return saved ? JSON.parse(saved) : getDefaultSettings();
      })()
    : getDefaultSettings();

  return (
    <DebugContext.Provider value={{ settings, isEnabled }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug(): DebugContextType {
  return useContext(DebugContext);
}
```

**Acceptance Criteria:**
- ✅ Context provides settings to all components
- ✅ Settings loaded from localStorage
- ✅ Returns default settings in production

#### Task 1.4: Integrate Debug Panel into Layout
**File**: `frontend/src/app/layout.tsx`

**Changes:**
1. Add `DebugProvider` to wrap the app
2. Add `DebugPanel` component to render

**Implementation:**
```typescript
import { DebugProvider } from '@/contexts/DebugContext';
import { DebugPanel } from '@/components/debug/DebugPanel';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <DebugProvider>
            {children}
            <DebugPanel />
          </DebugProvider>
        </Providers>
      </body>
    </html>
  );
}
```

**Acceptance Criteria:**
- ✅ Debug panel available throughout app
- ✅ Only visible on localhost
- ✅ No impact on production

---

### Phase 2: Frontend Credit Check Integration

**Goal**: Integrate debug settings into credit checking logic.

#### Task 2.1: Update Credit Balance Hook
**File**: `frontend/src/hooks/useUserData.ts` (or similar)

**Changes:**
1. Check debug settings for `overrideCreditBalance`
2. Return overridden value if set
3. Check `unlimitedCredits` setting

**Implementation:**
```typescript
import { useDebug } from '@/contexts/DebugContext';

export function useUserData() {
  const { settings, isEnabled } = useDebug();
  // ... existing code ...

  // Override credit balance if debug setting is enabled
  const displayCredits = isEnabled && settings.overrideCreditBalance !== null
    ? settings.overrideCreditBalance
    : credits;

  return {
    // ... existing returns ...
    credits: displayCredits,
    hasUnlimitedCredits: isEnabled && settings.unlimitedCredits,
  };
}
```

**Acceptance Criteria:**
- ✅ Credit balance overridden when setting is active
- ✅ Unlimited credits flag available to components
- ✅ No impact when debug is disabled

#### Task 2.2: Update API Client to Bypass Credit Checks
**File**: `frontend/src/lib/api.ts`

**Changes:**
1. Check debug settings before API calls
2. Add headers to indicate debug mode
3. Handle unlimited credits flag

**Implementation:**
```typescript
import { useDebug } from '@/contexts/DebugContext';

async function buildHeaders(includeAuth = true): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add debug headers if in debug mode
  if (typeof window !== 'undefined') {
    const debugSettings = localStorage.getItem('debug_settings');
    if (debugSettings) {
      const settings = JSON.parse(debugSettings);
      if (settings.unlimitedCredits) {
        headers['X-Debug-Unlimited-Credits'] = 'true';
      }
      if (settings.skipCreditDeduction) {
        headers['X-Debug-Skip-Credit-Deduction'] = 'true';
      }
    }
  }

  // ... existing auth header logic ...
  
  return headers;
}
```

**Acceptance Criteria:**
- ✅ Debug headers sent with API requests
- ✅ Headers only sent in development mode
- ✅ No impact on production requests

---

### Phase 3: Backend Debug Support

**Goal**: Add backend support for debug mode features.

#### Task 3.1: Create Debug Middleware
**File**: `backend/src/middleware/debug.middleware.ts`

**Purpose**: Check for debug headers and apply debug settings.

**Implementation:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './optional-auth.middleware';
import logger from '../utils/logger';
import { getSystemConfig } from '../config/system.config';

/**
 * Debug middleware to handle debug mode features
 * Only active in development/localhost environments
 * Checks for X-Debug-* headers and applies debug settings
 */
export function debugMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const systemConfig = getSystemConfig();
  
  // Only enable debug mode in development
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.USE_LOCAL_STORAGE === 'true' ||
                       req.hostname === 'localhost' ||
                       req.hostname === '127.0.0.1';

  if (!isDevelopment) {
    // In production, ignore debug headers
    return next();
  }

  // Check for debug headers
  const unlimitedCredits = req.headers['x-debug-unlimited-credits'] === 'true';
  const skipCreditDeduction = req.headers['x-debug-skip-credit-deduction'] === 'true';

  // Attach debug flags to request
  (req as any).debug = {
    unlimitedCredits,
    skipCreditDeduction,
  };

  if (unlimitedCredits || skipCreditDeduction) {
    logger.debug('Debug mode active', {
      userId: req.user?.id,
      unlimitedCredits,
      skipCreditDeduction,
      path: req.path,
    });
  }

  next();
}
```

**Acceptance Criteria:**
- ✅ Debug middleware only active in development
- ✅ Debug flags attached to request
- ✅ Logged for debugging purposes

#### Task 3.2: Update Credit Check Middleware
**File**: `backend/src/middleware/credit-check.middleware.ts`

**Changes:**
1. Check for `req.debug.unlimitedCredits` flag
2. Skip credit check if flag is set
3. Log when debug mode bypasses credit check

**Implementation:**
```typescript
export async function checkCreditsMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check for debug unlimited credits flag
    const debugUnlimitedCredits = (req as any).debug?.unlimitedCredits === true;
    
    if (debugUnlimitedCredits) {
      logger.debug('Debug mode: Bypassing credit check', {
        userId: req.user?.id,
        path: req.path,
      });
      
      // Attach credit cost to request (for logging) but don't enforce
      const videoCount = req.body.urls?.length || 0;
      const requiredCredits = await getBatchPrice(videoCount);
      (req as any).creditCost = requiredCredits;
      (req as any).videoCount = videoCount;
      (req as any).debugBypassedCreditCheck = true;
      
      return next();
    }

    // ... existing credit check logic ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Acceptance Criteria:**
- ✅ Credit check bypassed when debug flag is set
- ✅ Logged for debugging purposes
- ✅ No impact when debug is disabled

#### Task 3.3: Update Credit Deduction Logic
**File**: `backend/src/services/summary.service.ts`

**Changes:**
1. Check for `req.debug.skipCreditDeduction` flag
2. Skip credit deduction if flag is set
3. Log when debug mode skips deduction

**Implementation:**
```typescript
// In processBatch function, around line 1152
if (userId) {
  try {
    // Check for debug skip credit deduction flag
    const debugSkipDeduction = (req as any)?.debug?.skipCreditDeduction === true;
    
    if (debugSkipDeduction) {
      logger.debug('Debug mode: Skipping credit deduction', {
        userId,
        batchId: summary.id || jobId,
        wouldHaveDeducted: creditCost,
      });
      // Skip deduction but still track costs for analytics
    } else {
      // Normal credit deduction
      const creditCost = await getBatchPrice(request.urls.length);
      await deductCredits(userId, creditCost, {
        batchId: summary.id || jobId,
        description: `Batch processing: ${request.urls.length} video(s)`,
      });
    }
    
    // ... rest of cost tracking logic ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Note**: The `processBatch` function doesn't have direct access to `req`. We need to pass debug flags through the job system or check them differently. Alternative approach: Check debug settings in the credit service itself.

**Alternative Implementation:**
```typescript
// In credit.service.ts - modify checkCreditBalance
export async function checkCreditBalance(userId: string): Promise<number> {
  // Check for debug unlimited credits (via environment or request context)
  // For now, we'll use a simpler approach: check a debug flag in the service
  
  // ... existing logic ...
  
  // If debug mode with unlimited credits, return a very large number
  if (process.env.DEBUG_UNLIMITED_CREDITS === 'true' && 
      process.env.NODE_ENV === 'development') {
    logger.debug('Debug mode: Returning unlimited credits', { userId });
    return 999999; // Effectively unlimited
  }
  
  // ... rest of existing logic ...
}
```

**Acceptance Criteria:**
- ✅ Credit deduction skipped when debug flag is set
- ✅ Logged for debugging purposes
- ✅ Cost tracking still occurs

#### Task 3.4: Register Debug Middleware
**File**: `backend/src/server.ts` or route files

**Changes:**
1. Add debug middleware before credit check middleware
2. Only register in development mode

**Implementation:**
```typescript
import { debugMiddleware } from './middleware/debug.middleware';

// In route registration
if (process.env.NODE_ENV === 'development') {
  router.use(debugMiddleware);
}
router.use(checkCreditsMiddleware);
```

**Acceptance Criteria:**
- ✅ Debug middleware registered correctly
- ✅ Only active in development
- ✅ Executes before credit checks

---

### Phase 4: Additional Debug Features

**Goal**: Add additional useful debug toggles and features.

#### Task 4.1: API Request Logging
**File**: `frontend/src/lib/api.ts`

**Changes:**
1. Check `logApiRequests` debug setting
2. Log all API requests/responses to console
3. Include request/response details

**Implementation:**
```typescript
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<ApiResponse<T>> {
  // Check debug settings
  const debugSettings = typeof window !== 'undefined'
    ? (() => {
        const saved = localStorage.getItem('debug_settings');
        return saved ? JSON.parse(saved) : null;
      })()
    : null;

  const shouldLog = debugSettings?.logApiRequests === true;

  if (shouldLog) {
    console.group(`🔵 API Request: ${options.method || 'GET'} ${endpoint}`);
    console.log('Options:', options);
  }

  try {
    // ... existing fetch logic ...
    
    if (shouldLog) {
      console.log('Response:', response);
      console.groupEnd();
    }
    
    return response;
  } catch (error) {
    if (shouldLog) {
      console.error('Error:', error);
      console.groupEnd();
    }
    throw error;
  }
}
```

**Acceptance Criteria:**
- ✅ API requests logged when setting is enabled
- ✅ Clear, readable log format
- ✅ No performance impact when disabled

#### Task 4.2: Network Delay Simulation
**File**: `frontend/src/lib/api.ts`

**Changes:**
1. Check `simulateSlowNetwork` debug setting
2. Add artificial delay to API calls
3. Use `networkDelayMs` for delay duration

**Implementation:**
```typescript
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<ApiResponse<T>> {
  // Check debug settings
  const debugSettings = typeof window !== 'undefined'
    ? (() => {
        const saved = localStorage.getItem('debug_settings');
        return saved ? JSON.parse(saved) : null;
      })()
    : null;

  // Simulate slow network if enabled
  if (debugSettings?.simulateSlowNetwork === true) {
    const delay = debugSettings.networkDelayMs || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // ... rest of existing logic ...
}
```

**Acceptance Criteria:**
- ✅ Network delay applied when setting is enabled
- ✅ Configurable delay duration
- ✅ No impact when disabled

---

### Phase 5: Testing & Verification

**Goal**: Ensure the debug panel works correctly and is secure.

#### Test Cases

##### Test 1: Debug Panel Visibility
**Steps:**
1. Run app on localhost
2. **Expected**: Debug button visible in bottom-left corner
3. Run app in production build
4. **Expected**: Debug button NOT visible

**Verification:**
- ✅ Button only appears on localhost
- ✅ No console errors
- ✅ No impact on production

##### Test 2: Unlimited Credits Toggle
**Steps:**
1. Enable "Unlimited Credits" toggle
2. Check credit balance display
3. Try to create a batch with insufficient credits
4. **Expected**: Batch creation succeeds despite low credits

**Verification:**
- ✅ Toggle works correctly
- ✅ Credit checks bypassed
- ✅ Settings persist on refresh

##### Test 3: Skip Credit Deduction Toggle
**Steps:**
1. Note current credit balance
2. Enable "Skip Credit Deduction" toggle
3. Create a batch
4. **Expected**: Credits not deducted after batch completion

**Verification:**
- ✅ Credits not deducted
- ✅ Batch still processes successfully
- ✅ Settings persist

##### Test 4: Override Credit Balance
**Steps:**
1. Set "Override Credit Balance" to 9999
2. Check credit balance display
3. **Expected**: Display shows 9999 instead of actual balance

**Verification:**
- ✅ Balance overridden correctly
- ✅ Returns to actual balance when cleared
- ✅ Settings persist

##### Test 5: Settings Persistence
**Steps:**
1. Enable multiple toggles
2. Refresh page
3. **Expected**: All settings remain enabled

**Verification:**
- ✅ Settings persist across refreshes
- ✅ localStorage working correctly
- ✅ Default settings load correctly on first visit

##### Test 6: Production Build Security
**Steps:**
1. Build production version
2. Try to access debug panel
3. Try to manually set debug headers
4. **Expected**: Debug features completely unavailable

**Verification:**
- ✅ Debug panel not visible
- ✅ Debug headers ignored
- ✅ No debug code in production bundle

---

## Implementation Checklist

### Frontend Changes

#### Components
- [ ] Create `DebugPanel.tsx` component
- [ ] Create `DebugSettings.tsx` component
- [ ] Create `DebugContext.tsx` context provider
- [ ] Add `DebugPanel` to root layout
- [ ] Style debug panel with Tailwind CSS

#### Hooks & Utilities
- [ ] Update `useUserData` hook to use debug settings
- [ ] Update API client to send debug headers
- [ ] Add API request logging
- [ ] Add network delay simulation

#### Integration
- [ ] Integrate debug context into app
- [ ] Test all toggles work correctly
- [ ] Verify settings persist in localStorage
- [ ] Ensure no production impact

### Backend Changes

#### Middleware
- [ ] Create `debug.middleware.ts`
- [ ] Update `credit-check.middleware.ts` to check debug flags
- [ ] Register debug middleware in routes
- [ ] Add logging for debug mode usage

#### Services
- [ ] Update credit service to handle debug flags
- [ ] Update summary service to skip deduction when flagged
- [ ] Add debug logging throughout

#### Security
- [ ] Ensure debug middleware only active in development
- [ ] Verify no debug code executes in production
- [ ] Add environment checks

### Testing
- [ ] Test debug panel visibility (localhost vs production)
- [ ] Test unlimited credits toggle
- [ ] Test skip credit deduction toggle
- [ ] Test override credit balance
- [ ] Test settings persistence
- [ ] Test production build security
- [ ] Test API request logging
- [ ] Test network delay simulation

### Documentation
- [ ] Document debug panel usage
- [ ] Add comments to debug code
- [ ] Update developer README if needed

---

## Files to Modify

### Frontend Files

1. **`frontend/src/components/debug/DebugPanel.tsx`** (NEW)
   - Main debug panel component

2. **`frontend/src/components/debug/DebugSettings.tsx`** (NEW)
   - Debug settings UI component

3. **`frontend/src/contexts/DebugContext.tsx`** (NEW)
   - Debug context provider

4. **`frontend/src/app/layout.tsx`**
   - Add DebugProvider and DebugPanel

5. **`frontend/src/hooks/useUserData.ts`** (or similar)
   - Integrate debug settings for credit display

6. **`frontend/src/lib/api.ts`**
   - Add debug headers
   - Add request logging
   - Add network delay simulation

### Backend Files

1. **`backend/src/middleware/debug.middleware.ts`** (NEW)
   - Debug middleware to handle debug headers

2. **`backend/src/middleware/credit-check.middleware.ts`**
   - Check for debug unlimited credits flag

3. **`backend/src/services/summary.service.ts`**
   - Skip credit deduction when debug flag is set

4. **`backend/src/services/credit.service.ts`**
   - Optionally handle debug unlimited credits

5. **`backend/src/server.ts`** or route files
   - Register debug middleware

---

## Risk Assessment

### Low Risk
- Changes are isolated to development/debug features
- No impact on production builds
- Settings stored locally (localStorage)
- Backend checks environment before enabling

### Potential Issues

1. **Debug Code in Production Bundle**
   - **Mitigation**: Use `isDevelopmentMode()` checks and tree-shaking
   - **Verification**: Build production and verify no debug code

2. **localStorage Persistence**
   - **Mitigation**: Clear localStorage when switching environments
   - **Note**: Settings persist across sessions (by design)

3. **Backend Debug Headers**
   - **Mitigation**: Backend only processes debug headers in development
   - **Verification**: Test that production backend ignores headers

4. **Credit System Bypass**
   - **Mitigation**: Only works in development, logged for debugging
   - **Note**: This is the intended behavior for testing

---

## Success Criteria

### Must Have
- ✅ Debug panel visible only on localhost
- ✅ Unlimited credits toggle works correctly
- ✅ Skip credit deduction toggle works correctly
- ✅ Settings persist in localStorage
- ✅ No impact on production builds
- ✅ Backend respects debug flags only in development

### Nice to Have
- ✅ Additional debug toggles (rate limits, API logging, etc.)
- ✅ Network delay simulation
- ✅ Credit balance override
- ✅ Clean, intuitive UI
- ✅ Keyboard shortcuts for quick access

---

## Timeline

**Estimated Duration**: 4-6 hours

- **Phase 1** (Frontend Debug Panel): 2 hours
- **Phase 2** (Frontend Integration): 1 hour
- **Phase 3** (Backend Support): 1-2 hours
- **Phase 4** (Additional Features): 1 hour
- **Phase 5** (Testing): 1 hour

**Priority**: Medium - Development tool, not blocking production features

---

## Post-Implementation

### Monitoring
- Monitor debug panel usage (console logs)
- Track which debug features are used most
- Watch for any accidental production deployments

### Future Improvements
- Add more debug toggles as needed
- Add preset debug configurations
- Add export/import of debug settings
- Add debug panel keyboard shortcut
- Add visual indicators when debug features are active (e.g., banner)

---

## Related Documents

- `frontend/src/config/env.ts` - Environment detection utilities
- `backend/src/services/credit.service.ts` - Credit system implementation
- `backend/src/middleware/credit-check.middleware.ts` - Credit check middleware
- `docs/freemium_credit_system_prd.md` - Credit system documentation

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation  
**Next Steps**: Begin Phase 1 - Create Frontend Debug Panel Component

