# Dev Mode Panel - Testing Features PRD

## Executive Summary

This PRD outlines enhancements to the existing Dev Mode Panel to provide comprehensive testing capabilities for developers and QA testers. The panel will be transformed from a simple status indicator into a powerful testing tool that allows quick toggling between authentication modes, clearing data, simulating different scenarios, and monitoring system state—all without requiring page refreshes or manual configuration changes.

**Current State**: The Dev Mode Panel (`DevModeIndicator.tsx`) displays storage mode, auth status, file count, and user ID in a collapsible indicator.

**Proposed State**: An expanded, interactive panel with multiple testing features accessible through a clean, organized interface.

---

## Goals

1. **Rapid Testing**: Enable testers to quickly switch between guest and dev user accounts without login flows
2. **Data Management**: Provide easy ways to clear storage, reset sessions, and reset counters
3. **State Inspection**: Display comprehensive system state information for debugging
4. **Scenario Simulation**: Allow testing of different user tiers, error conditions, and edge cases
5. **Developer Productivity**: Reduce time spent on manual testing tasks and configuration changes

---

## User Stories

### Primary User Stories

1. **As a tester**, I want to toggle between guest account and dev user account instantly, so I can test both authentication flows without going through login/logout processes.

2. **As a QA engineer**, I want to override my credit balance to any value, so I can test credit deduction, insufficient credit errors, and tier limits without waiting for credits to reset or manually updating the database.

3. **As a developer**, I want to simulate SSE connection failures and network errors, so I can test reconnection logic, error handling, and recovery flows without actually breaking the network.

4. **As a tester**, I want to bypass rate limits and guest session limits, so I can test features repeatedly without waiting for cooldown periods or creating new sessions.

5. **As a developer**, I want to inject mock API responses or simulate API errors, so I can test error states, edge cases, and different response scenarios without modifying backend code.

### Secondary User Stories

6. **As a tester**, I want to simulate slow network conditions (3G, throttled), so I can test loading states, progress indicators, and timeout handling.

7. **As a developer**, I want to pre-populate test data (inject sample summaries/research into history), so I can test UI components and features without waiting for actual API responses.

8. **As a QA engineer**, I want to view and filter recent API requests with their responses, so I can debug integration issues and verify API calls are correct.

9. **As a developer**, I want to simulate different user tiers (free, pro, enterprise) and their associated limits, so I can test tier-specific features without changing backend configuration.

10. **As a tester**, I want to fast-forward time or simulate time-based events (credit resets, session expiration), so I can test time-dependent features without waiting.

---

## Feature Specifications

### Feature 1: Account Toggle

**Priority**: P0 (Critical)

**Description**: Allow instant switching between guest account and dev user account without page refresh.

**User Flow**:
1. User clicks on Dev Mode Panel to expand it
2. User sees "Account Mode" section with current mode highlighted
3. User clicks toggle button to switch between "Guest" and "Dev User"
4. System updates authentication state immediately
5. UI reflects new account state (user menu, guest warnings, etc.)

**Technical Implementation**:

**Frontend Changes**:
- Add account mode state management in `DevModePanel` component
- Create function to switch between guest and dev user:
  ```typescript
  const switchAccountMode = (mode: 'guest' | 'dev') => {
    if (mode === 'guest') {
      // Clear dev user auth state
      // Create/restore guest session
      clearDevUserAuth();
      initializeGuestSession();
    } else {
      // Clear guest session
      // Set dev user auth state
      clearGuestSession();
      setDevUserAuth();
    }
    // Force auth context refresh
    window.location.reload(); // Or use React state update if possible
  };
  ```

**State Management**:
- Store current account mode in localStorage: `dev_mode_account_type` ('guest' | 'dev')
- On app initialization, check this flag and set auth accordingly
- Update `AuthContext` to respect dev mode account type

**UI Design**:
```
┌─────────────────────────────┐
│ Account Mode                │
├─────────────────────────────┤
│ ○ Guest Account             │
│ ● Dev User Account          │
│                             │
│ [Switch to Guest]           │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Toggle switches between guest and dev user instantly
- [ ] Guest session is created/restored when switching to guest
- [ ] Dev user authentication is applied when switching to dev user
- [ ] UI updates reflect new account state (user menu, guest warnings)
- [ ] State persists across page refreshes (stored in localStorage)
- [ ] Works correctly with both `AUTH_ENABLED=true` and `AUTH_ENABLED=false` backend configs

**Edge Cases**:
- Handle case where guest session was previously cleared
- Handle case where dev user credentials are invalid
- Show error message if switch fails

---

### Feature 2: Credit Balance Override

**Priority**: P0 (Critical)

**Description**: Override credit balance to any value for testing credit deduction, insufficient credit errors, and tier limits.

**User Flow**:
1. User expands Dev Mode Panel
2. User sees "Credit Override" section showing current balance
3. User enters desired credit amount or selects preset (0, 10, 100, 1000, unlimited)
4. User clicks "Apply Override"
5. Credit balance updates immediately
6. User can test credit deduction and error states

**Technical Implementation**:

**Credit Override**:
```typescript
// Store override in localStorage
const setCreditOverride = (amount: number | 'unlimited') => {
  if (amount === 'unlimited') {
    localStorage.setItem('dev_mode_credit_override', 'unlimited');
  } else {
    localStorage.setItem('dev_mode_credit_override', amount.toString());
  }
  // Update credit context/state
  updateCreditBalance(amount);
  toast.success(`Credit balance set to ${amount === 'unlimited' ? 'unlimited' : amount}`);
};

// Intercept credit balance API calls
const originalGetCredits = api.getCredits;
api.getCredits = async () => {
  const override = localStorage.getItem('dev_mode_credit_override');
  if (override) {
    return override === 'unlimited' ? 999999 : parseInt(override, 10);
  }
  return originalGetCredits();
};
```

**UI Design**:
```
┌─────────────────────────────┐
│ Credit Override             │
├─────────────────────────────┤
│ Current: 150 credits        │
│                             │
│ [Presets]                   │
│ [0] [10] [100] [1000] [∞]  │
│                             │
│ Or enter custom:            │
│ [____] credits              │
│                             │
│ [Apply Override]            │
│ [Reset to Actual]           │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Credit balance updates immediately after override
- [ ] Preset buttons set common test values
- [ ] Custom input accepts any number
- [ ] "Unlimited" option sets very high value
- [ ] Credit deduction still works with override
- [ ] Insufficient credit errors trigger correctly
- [ ] Reset button restores actual balance from API
- [ ] Override persists across page refreshes

---

### Feature 3: SSE Connection Simulation

**Priority**: P0 (Critical)

**Description**: Simulate SSE connection failures, network errors, and reconnection scenarios to test error handling.

**User Flow**:
1. User expands Dev Mode Panel
2. User sees "SSE Simulation" section
3. User selects simulation type (connection drop, network error, timeout)
4. User clicks "Trigger Simulation"
5. SSE connection fails as simulated
6. User can observe reconnection logic and error handling

**Technical Implementation**:

**Connection Simulation**:
```typescript
// Intercept EventSource creation
const originalEventSource = window.EventSource;
window.EventSource = class MockEventSource extends originalEventSource {
  constructor(url: string, options?: EventSourceInit) {
    super(url, options);
    
    const simulation = localStorage.getItem('dev_mode_sse_simulation');
    if (simulation) {
      setTimeout(() => {
        if (simulation === 'drop') {
          this.close(); // Simulate connection drop
        } else if (simulation === 'error') {
          this.dispatchEvent(new Event('error')); // Simulate error
        } else if (simulation === 'timeout') {
          // Simulate timeout by not opening
        }
      }, 2000); // Fail after 2 seconds
    }
  }
};

const simulateSSEError = (type: 'drop' | 'error' | 'timeout') => {
  localStorage.setItem('dev_mode_sse_simulation', type);
  toast.success(`SSE ${type} simulation enabled. Next connection will fail.`);
  // Force reconnect to trigger simulation
  window.location.reload();
};
```

**UI Design**:
```
┌─────────────────────────────┐
│ SSE Connection Simulation   │
├─────────────────────────────┤
│ Status: Connected           │
│                             │
│ Simulate:                   │
│ ○ Connection Drop           │
│ ○ Network Error              │
│ ○ Timeout                    │
│                             │
│ [Trigger Simulation]         │
│ [Clear Simulation]           │
│                             │
│ ⚠️ Will affect next SSE     │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Connection drop simulation closes SSE connection
- [ ] Network error simulation triggers error event
- [ ] Timeout simulation prevents connection
- [ ] Reconnection logic activates after simulation
- [ ] Error messages display correctly
- [ ] Can clear simulation to restore normal behavior
- [ ] Works with both summary and research SSE streams

---

### Feature 4: Rate Limit & Guest Limit Bypass

**Priority**: P1 (High)

**Description**: Bypass rate limits and guest session limits to enable rapid testing without waiting periods.

**User Flow**:
1. User expands Dev Mode Panel
2. User sees "Limit Bypass" section
3. User toggles "Bypass Rate Limits" or "Bypass Guest Limits"
4. Limits are bypassed immediately
5. User can test features repeatedly without restrictions

**Technical Implementation**:

**Limit Bypass**:
```typescript
const bypassRateLimits = (enabled: boolean) => {
  localStorage.setItem('dev_mode_bypass_rate_limits', enabled.toString());
  toast.success(`Rate limits ${enabled ? 'bypassed' : 'enabled'}`);
};

const bypassGuestLimits = (enabled: boolean) => {
  localStorage.setItem('dev_mode_bypass_guest_limits', enabled.toString());
  // Update guest session hook to ignore limits
  toast.success(`Guest limits ${enabled ? 'bypassed' : 'enabled'}`);
};

// In useGuestSession hook
const hasReachedLimit = () => {
  if (localStorage.getItem('dev_mode_bypass_guest_limits') === 'true') {
    return false; // Always allow
  }
  // Normal limit check
  return summaryCount >= GUEST_SUMMARY_LIMIT;
};
```

**UI Design**:
```
┌─────────────────────────────┐
│ Limit Bypass                 │
├─────────────────────────────┤
│ ☑ Bypass Rate Limits        │
│ ☑ Bypass Guest Limits       │
│                             │
│ Current Limits:              │
│ • Rate: 5/hour               │
│ • Guest: 1 summary, 3 research│
│                             │
│ ⚠️ Bypassed - no restrictions│
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Rate limit bypass prevents rate limit errors
- [ ] Guest limit bypass allows unlimited summaries/research
- [ ] Toggle persists across page refreshes
- [ ] UI reflects bypassed state
- [ ] Can re-enable limits for normal testing
- [ ] Works with both guest and dev user accounts

---

### Feature 5: API Response Mocking

**Priority**: P1 (High)

**Description**: Mock API responses or inject errors to test different scenarios without backend changes.

**User Flow**:
1. User expands Dev Mode Panel
2. User navigates to "API Mocking" section
3. User selects endpoint to mock (e.g., `/api/research`, `/api/summary`)
4. User selects response type (success, error, custom JSON)
5. User enters mock response data
6. User enables mocking
7. Next API call returns mocked response

**Technical Implementation**:

**Response Mocking**:
```typescript
// Intercept fetch calls
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = args[0] as string;
  const mocks = JSON.parse(localStorage.getItem('dev_mode_api_mocks') || '{}');
  
  if (mocks[url]) {
    const mock = mocks[url];
    if (mock.enabled) {
      if (mock.type === 'error') {
        return Promise.reject(new Error(mock.error || 'Mocked error'));
      }
      return Promise.resolve(new Response(JSON.stringify(mock.data), {
        status: mock.status || 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
  }
  
  return originalFetch(...args);
};

const setApiMock = (url: string, response: any, enabled: boolean) => {
  const mocks = JSON.parse(localStorage.getItem('dev_mode_api_mocks') || '{}');
  mocks[url] = { enabled, ...response };
  localStorage.setItem('dev_mode_api_mocks', JSON.stringify(mocks));
  toast.success(`API mock ${enabled ? 'enabled' : 'disabled'} for ${url}`);
};
```

**UI Design**:
```
┌─────────────────────────────┐
│ API Response Mocking        │
├─────────────────────────────┤
│ Endpoint: /api/research     │
│                             │
│ Response Type:              │
│ ○ Success (200)             │
│ ○ Error (500)                │
│ ○ Custom JSON               │
│                             │
│ Response Data:              │
│ {                           │
│   "error": "Mocked error"   │
│ }                           │
│                             │
│ ☑ Enable Mock               │
│ [Save Mock] [Clear]         │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Can mock any API endpoint
- [ ] Success responses return mock data
- [ ] Error responses trigger error handling
- [ ] Custom JSON responses work correctly
- [ ] Mock can be enabled/disabled
- [ ] Multiple endpoint mocks can be active
- [ ] Mocks persist across page refreshes
- [ ] Clear button removes all mocks

---

### Feature 6: User Tier Simulation

**Priority**: P2 (Medium)

**Description**: Allow testing different user tiers (free, pro, enterprise) without backend changes.

**User Flow**:
1. User expands Dev Mode Panel
2. User sees "User Tier" section
3. User selects tier from dropdown
4. System updates user tier in localStorage
5. UI reflects tier changes (credit limits, feature access, etc.)

**Technical Implementation**:

**Tier Management**:
```typescript
const setUserTier = (tier: 'free' | 'pro' | 'enterprise') => {
  // Store in localStorage
  localStorage.setItem('dev_mode_user_tier', tier);
  // Update auth context or user state
  // Force UI refresh
  toast.success(`User tier set to ${tier}`);
  window.location.reload(); // Or update state if possible
};
```

**Backend Integration**:
- Frontend sends tier in API requests (if supported)
- Or backend reads from dev user configuration
- For local testing, frontend can override tier display

**UI Design**:
```
┌─────────────────────────────┐
│ User Tier Simulation        │
├─────────────────────────────┤
│ Current: Free               │
│                             │
│ [Select Tier ▼]             │
│   • Free                    │
│   • Pro                     │
│   • Enterprise              │
│                             │
│ ⚠️ Backend must support      │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Tier selection updates user tier
- [ ] UI reflects tier-specific features/limits
- [ ] Tier persists across page refreshes
- [ ] Works with both guest and dev user accounts
- [ ] Shows warning if backend doesn't support tier override

---

### Feature 6: Health Check Refresh

**Priority**: P2 (Medium)

**Description**: Manual trigger to refresh health check and update displayed status.

**User Flow**:
1. User expands Dev Mode Panel
2. User sees current health check status
3. User clicks "Refresh Health Check" button
4. Loading indicator appears
5. Health check is fetched
6. Status updates with latest information

**Technical Implementation**:

**Refresh Function**:
```typescript
const [healthLoading, setHealthLoading] = useState(false);

const refreshHealthCheck = async () => {
  setHealthLoading(true);
  try {
    const response = await healthCheck();
    // Update state with new health data
    updateHealthData(response.data);
    toast.success('Health check refreshed');
  } catch (error) {
    toast.error('Failed to refresh health check');
  } finally {
    setHealthLoading(false);
  }
};
```

**UI Design**:
```
┌─────────────────────────────┐
│ Backend Status              │
├─────────────────────────────┤
│ Storage: Local (38 files)   │
│ Auth: Disabled              │
│ Last Updated: 2s ago        │
│                             │
│ [🔄 Refresh Health Check]   │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Button triggers health check API call
- [ ] Loading indicator shows during fetch
- [ ] Status updates with latest data
- [ ] Error handling for failed health checks
- [ ] Shows timestamp of last update

---

### Feature 7: API Request Logger

**Priority**: P3 (Low)

**Description**: Display recent API requests and responses for debugging.

**User Flow**:
1. User expands Dev Mode Panel
2. User navigates to "API Logs" tab
3. User sees list of recent API requests
4. User can expand individual requests to see details
5. User can clear logs or export logs

**Technical Implementation**:

**Request Interception**:
```typescript
// Intercept fetch calls
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const startTime = Date.now();
  const response = await originalFetch(...args);
  const endTime = Date.now();
  
  // Log request
  logApiRequest({
    url: args[0],
    method: args[1]?.method || 'GET',
    status: response.status,
    duration: endTime - startTime,
    timestamp: new Date().toISOString(),
  });
  
  return response;
};
```

**UI Design**:
```
┌─────────────────────────────┐
│ API Request Logs            │
├─────────────────────────────┤
│ GET /api/health     200 45ms│
│ POST /api/research   201 2.3s│
│ GET /api/history    200 120ms│
│                             │
│ [Clear Logs] [Export]       │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Logs capture API requests and responses
- [ ] Shows method, URL, status, duration
- [ ] Expandable details show request/response bodies
- [ ] Clear button removes all logs
- [ ] Export button downloads logs as JSON
- [ ] Logs are limited to last 50 requests (performance)

---

### Feature 8: Cache Management

**Priority**: P2 (Medium)

**Description**: Clear various caches (API cache, browser cache, service worker cache).

**User Flow**:
1. User expands Dev Mode Panel
2. User sees "Cache Management" section
3. User clicks "Clear API Cache" or "Clear All Caches"
4. Cache is cleared and notification appears

**Technical Implementation**:

**Cache Clearing**:
```typescript
const clearApiCache = async () => {
  // Clear any API response cache
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
  }
  toast.success('API cache cleared');
};

const clearAllCaches = async () => {
  await clearApiCache();
  // Clear service worker cache if exists
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(reg => reg.unregister())
    );
  }
  toast.success('All caches cleared');
};
```

**UI Design**:
```
┌─────────────────────────────┐
│ Cache Management            │
├─────────────────────────────┤
│ [Clear API Cache]           │
│ [Clear Service Worker]      │
│ [Clear All Caches]          │
└─────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Each button clears respective cache type
- [ ] Toast notification confirms action
- [ ] Service worker cache is cleared if present
- [ ] API cache clearing works correctly

---

## UI/UX Design

### Panel Layout

**Collapsed State** (Current):
- Small floating indicator in top-right corner
- Shows: Storage mode, Auth status, File count
- Click to expand

**Expanded State** (New):
- Larger panel (400px width, max-height: 80vh, scrollable)
- Organized into sections with tabs or accordion
- Sticky header with minimize button
- Color-coded sections for different feature categories

**Layout Structure**:
```
┌─────────────────────────────────────┐
│ 🧪 DEV MODE PANEL            [×]    │
├─────────────────────────────────────┤
│ [Account] [Storage] [State] [Logs] │ ← Tabs
├─────────────────────────────────────┤
│                                     │
│ Account Mode                        │
│ ○ Guest  ● Dev User                 │
│ [Switch to Guest]                   │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ Storage Management                  │
│ [Clear Local] [Clear Session]      │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ System State                        │
│ User: Dev User (dev-user-id)        │
│ [View Details] [Copy JSON]          │
│                                     │
└─────────────────────────────────────┘
```

### Visual Design

**Color Scheme**:
- Background: Yellow/amber (matches current dev mode indicator)
- Sections: Subtle borders, light backgrounds
- Buttons: Primary action buttons, secondary outline buttons
- Status indicators: Green (success), Yellow (warning), Red (error)

**Typography**:
- Headers: Bold, 14px
- Body: Regular, 12px
- Monospace: For IDs, JSON, technical values

**Spacing**:
- Section padding: 12px
- Button spacing: 8px
- Section gap: 16px

**Responsive Design**:
- Panel width: 400px on desktop, 100% on mobile
- Max height: 80vh with scroll
- Position: Fixed top-right, but can be dragged (future enhancement)

---

## Technical Architecture

### Component Structure

```
DevModePanel (new, replaces DevModeIndicator)
├── DevModePanelHeader
├── DevModePanelTabs
├── AccountToggleSection
├── CreditOverrideSection
├── SSESimulationSection
├── LimitBypassSection
├── ApiMockingSection
├── UserTierSection
├── NetworkThrottlingSection
├── TestDataSection
├── ApiLoggerSection
└── HealthCheckSection
```

### State Management

**Local State** (React useState):
- Panel expanded/collapsed
- Current tab
- Health check data
- System state data
- API logs

**Persistent State** (localStorage):
- Account mode preference (`dev_mode_account_type`)
- Credit override (`dev_mode_credit_override`)
- SSE simulation type (`dev_mode_sse_simulation`)
- Limit bypass flags (`dev_mode_bypass_rate_limits`, `dev_mode_bypass_guest_limits`)
- API mocks (`dev_mode_api_mocks`)
- User tier override (`dev_mode_user_tier`)
- Panel preferences (last tab, panel position)

**Session State** (sessionStorage):
- Guest session data (existing)
- Temporary logs (optional)

### API Integration

**New API Endpoints** (if needed):
- None required initially (uses existing health check endpoint)

**Existing Endpoints Used**:
- `GET /api/health` - Health check
- All existing auth/user endpoints

### Dependencies

**New Dependencies** (if needed):
- None required (uses existing React, Tailwind, etc.)

**Existing Dependencies Used**:
- React hooks (useState, useEffect, useCallback)
- Tailwind CSS (styling)
- Lucide React (icons)
- Existing toast context

---

## Implementation Phases

### Phase 1: Core Features (Week 1)
- [ ] Account toggle (guest ↔ dev user)
- [ ] Credit balance override
- [ ] SSE connection simulation
- [ ] Panel expansion/collapse UI

**Deliverables**:
- Updated `DevModePanel` component
- Account switching logic
- Credit override system with API interception
- SSE error simulation
- Basic UI layout with tabs

### Phase 2: Enhanced Features (Week 2)
- [ ] Rate limit & guest limit bypass
- [ ] API response mocking
- [ ] User tier simulation
- [ ] Health check refresh

**Deliverables**:
- Limit bypass logic
- API mocking system with fetch interception
- Tier selection and override
- Health check refresh functionality

### Phase 3: Advanced Features (Week 3)
- [ ] Network throttling simulation
- [ ] Test data injection (pre-populate history)
- [ ] API request logger with filtering
- [ ] Time simulation (fast-forward)

**Deliverables**:
- Network throttling controls
- Test data injection UI
- API logging with request/response capture
- Time manipulation utilities

### Phase 4: Polish & Testing (Week 4)
- [ ] UI/UX refinements
- [ ] Error handling improvements
- [ ] Documentation
- [ ] Testing and bug fixes

**Deliverables**:
- Polished UI
- Error handling
- Developer documentation
- Test coverage

---

## Testing Requirements

### Unit Tests

**Component Tests**:
- DevModePanel renders correctly
- Account toggle switches modes
- Storage clearing functions work
- State inspector displays correct data

**Hook Tests**:
- Account switching logic
- State collection logic
- Storage management logic

### Integration Tests

**User Flow Tests**:
- Switch from guest to dev user and back
- Clear storage and verify state reset
- Reset guest counters and verify limits reset
- Export system state and verify JSON format

**API Integration Tests**:
- Health check refresh works
- Account switching triggers correct API calls
- State updates reflect API changes

### Manual Testing Checklist

- [ ] Account toggle works in both directions
- [ ] Credit override updates balance and allows testing deduction/errors
- [ ] SSE simulation triggers connection failures and reconnection
- [ ] Rate limit bypass allows unlimited requests
- [ ] Guest limit bypass allows unlimited summaries/research
- [ ] API mocking returns custom responses correctly
- [ ] User tier simulation works (if backend supports)
- [ ] Network throttling slows down requests appropriately
- [ ] Test data injection pre-populates history
- [ ] API logger captures requests and responses
- [ ] Panel UI is responsive
- [ ] All features work in both light and dark mode

---

## Security Considerations

### Data Protection

1. **Sensitive Information**:
   - Sanitize API keys, tokens, passwords from state export
   - Don't log sensitive request/response bodies
   - Mask user emails in logs (show only domain)

2. **Local Storage**:
   - Dev mode preferences stored in localStorage (safe)
   - No sensitive data in dev mode panel state

3. **Production Safety**:
   - Panel only visible in development mode
   - All dev mode features disabled in production
   - No risk of exposing dev tools in production

### Access Control

- Panel only accessible when `isDevelopmentMode()` returns true
- All dev mode features check development mode flag
- No way to enable dev mode in production

---

## Success Metrics

### Developer Productivity

- **Time Saved**: Reduce manual testing setup time by 70%
- **Testing Speed**: Enable account switching in < 2 seconds (vs 30+ seconds for login/logout)
- **Credit Testing**: Test credit scenarios in seconds (vs minutes waiting for resets)
- **Error Testing**: Test error scenarios instantly (vs modifying backend code)
- **Debug Efficiency**: Reduce debugging time by 50% with API mocking and SSE simulation

### Feature Adoption

- **Usage Rate**: 80% of developers use panel at least once per day
- **Feature Usage**: Account toggle and credit override used most frequently (target: 60% of panel interactions)
- **Satisfaction**: 90% of developers rate panel as "very useful"

### Quality Improvements

- **Bug Discovery**: Increase bug discovery rate by 30% with easier testing
- **Test Coverage**: Enable testing of edge cases that were previously difficult
- **Regression Prevention**: Catch 20% more regressions with easier scenario testing

---

## Future Enhancements

### v2.0 Features

1. **Test Presets**: Save and load testing presets (account + tier + credit + mocks)
2. **Performance Monitoring**: Display performance metrics (render times, API latency, SSE connection quality)
3. **Drag & Drop**: Make panel draggable to different positions
4. **Screenshot Export**: Export current UI state as screenshot for bug reports
5. **Video Recording**: Record testing sessions for documentation
6. **Automated Test Runner**: Run predefined test scenarios from panel
7. **State Snapshots**: Save/restore entire app state for regression testing
8. **Collaborative Testing**: Share testing scenarios with team members

### v3.0 Features

1. **Automated Testing**: Run automated test suites from panel
2. **Mock Server**: Local mock API server for offline testing
3. **State Snapshots**: Save/restore entire app state
4. **Collaboration**: Share testing scenarios with team
5. **Analytics**: Track which features are tested most

---

## Appendix

### A. Component File Structure

```
frontend/src/components/dev-mode/
├── DevModePanel.tsx (main component)
├── DevModePanelHeader.tsx
├── DevModePanelTabs.tsx
├── sections/
│   ├── AccountToggleSection.tsx
│   ├── StorageManagementSection.tsx
│   ├── GuestSessionSection.tsx
│   ├── SystemStateSection.tsx
│   ├── UserTierSection.tsx
│   ├── HealthCheckSection.tsx
│   ├── ApiLoggerSection.tsx
│   └── CacheManagementSection.tsx
└── utils/
    ├── dev-mode-storage.ts
    ├── dev-mode-state.ts
    └── dev-mode-account.ts
```

### B. State Management Structure

```typescript
interface DevModeState {
  accountMode: 'guest' | 'dev';
  userTier?: 'free' | 'pro' | 'enterprise';
  healthData: HealthCheckResponse | null;
  systemState: SystemState | null;
  apiLogs: ApiLogEntry[];
  panelExpanded: boolean;
  currentTab: string;
}

interface SystemState {
  timestamp: string;
  user: UserState;
  storage: StorageState;
  auth: AuthState;
  config: ConfigState;
  guest: GuestState;
}
```

### C. API Integration Points

**Existing APIs Used**:
- `GET /api/health` - Health check
- `GET /api/user/current` - Current user info
- `POST /api/auth/login` - Dev user login (if needed)

**No New APIs Required** (all features use frontend state management)

---

## Conclusion

This PRD outlines a comprehensive set of testing features for the Dev Mode Panel that will significantly improve developer productivity and testing efficiency. The phased implementation approach allows for incremental delivery of value, starting with the most critical features (account toggle, storage management) and building up to advanced features (API logging, cache management).

**Key Benefits**:
1. **Faster Testing**: Account switching in seconds vs minutes
2. **Better Debugging**: Comprehensive state inspection
3. **Easier Scenarios**: Quick setup of different testing conditions
4. **Improved Quality**: More thorough testing leads to fewer bugs

**Next Steps**:
1. Review and approve this PRD
2. Begin Phase 1 implementation (core features)
3. Gather feedback from developers during implementation
4. Iterate based on usage patterns

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-23  
**Owner**: Frontend Engineering Team  
**Status**: Draft → Awaiting Approval
