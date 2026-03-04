# Dev Mode Panel – Developer Guide

The Dev Mode Panel provides in-app testing controls for developers and QA. It is **only visible when running in development mode** and is hidden in production.

---

## Enabling the panel

1. **Development mode**: The panel is shown when `isDevelopmentMode()` is true (e.g. `NODE_ENV=development` or `NEXT_PUBLIC_APP_ENV=development`).
2. **Location**: Fixed in the top-right (below the top bar). Click the header to expand or collapse.

---

## Tabs

| Tab      | Contents                                                                 |
|----------|--------------------------------------------------------------------------|
| **Status**  | Backend health (storage, auth, version, user ID) and Refresh.           |
| **Account** | Account Mode (when skip-auth dev), Credit Override, User Tier.          |
| **Testing** | SSE Simulation, Limit Bypass, API Mocking.                              |

The last selected tab is stored in `localStorage` and restored on reload.

---

## Features

### Backend Status (Status tab)

- **Refresh**: Calls `GET /api/health` with cache bypass. Errors are shown in the panel and as toasts.
- All values (storage mode, auth, version, file count) come from the health API.

### Account Mode (Account tab, when `shouldSkipAuth()`)

- **Switch to Guest / Dev User**: Sets `dev_mode_account_type`, clears guest session, and reloads the page.
- Stored in `localStorage` under `dev_mode_account_type` (`'guest'` \| `'dev'`).

### Credit Override (Account tab)

- **Presets**: 0, 10, 100, 1000, ∞ (unlimited).
- **Custom**: Enter a number and click Apply (or press Enter).
- **Reset to actual**: Clears the override and refetches from the API.
- Stored in `localStorage` as `dev_mode_credit_override` (number or `'unlimited'`).
- Credit APIs are intercepted in `lib/api.ts` and return the override when set.

### User Tier (Account tab)

- **Select tier**: Overrides the tier in UI and in some API responses (e.g. credits, tier status) when the backend supports it.
- **Clear override**: Removes the override and refetches.
- Stored in `localStorage` as `dev_mode_user_tier` (`'free'` \| `'starter'` \| `'pro'` \| `'premium'`).
- **Note**: Backend may still enforce real tier for billing and limits.

### SSE Simulation (Testing tab)

- **drop / error / timeout**: Next SSE connection will simulate that behavior (handled in `lib/authenticated-sse.ts`).
- **Clear**: Removes the simulation.
- Stored in `localStorage` as `dev_mode_sse_simulation`. Cleared automatically after the next connection.

### Limit Bypass (Testing tab)

- **Bypass Rate Limits**: Sends `X-Dev-Bypass-Rate-Limit: true`. Backend must honor this.
- **Bypass Guest Limits**: `useGuestSession` skips guest summary/research limits when set.
- Stored in `localStorage` as `dev_mode_bypass_rate_limits` and `dev_mode_bypass_guest_limits` (`'true'` \| `'false'`).

### API Mocking (Testing tab)

- **Endpoint**: Path as used by the API layer (e.g. `/api/research`, `/api/credits/balance`). Normalized to start with `/`.
- **Success**: Optional status (default 200) and JSON body. Body must be valid JSON.
- **Error**: Returns a mocked error with the given message.
- **Enable & Save**: Saves the mock and enables it. Matches by path (pathname) in `lib/api.ts`.
- **Clear All Mocks**: Removes all mocks.
- Stored in `localStorage` as `dev_mode_api_mocks` (JSON object keyed by path).

---

## LocalStorage keys

| Key                         | Values / shape                                                        |
|-----------------------------|-----------------------------------------------------------------------|
| `dev_mode_account_type`     | `'guest'` \| `'dev'`                                                  |
| `dev_mode_credit_override`  | number \| `'unlimited'`                                               |
| `dev_mode_sse_simulation`   | `'drop'` \| `'error'` \| `'timeout'`                                  |
| `dev_mode_bypass_rate_limits` | `'true'` \| `'false'`                                              |
| `dev_mode_bypass_guest_limits` | `'true'` \| `'false'`                                             |
| `dev_mode_api_mocks`        | `{ [path]: { enabled, type, status?, data?, error? } }`               |
| `dev_mode_user_tier`        | `'free'` \| `'starter'` \| `'pro'` \| `'premium'`                     |
| `dev_mode_panel_tab`        | `'status'` \| `'account'` \| `'testing'`                              |

---

## Error handling

All panel actions are wrapped in `try/catch`. On failure:

- An **error toast** is shown with a short title and the error message.
- **Health check**: Also sets `healthError` in the panel.
- **Account switch**: If an error occurs before `reload()`, a toast is shown; the page is not reloaded.

---

## Troubleshooting

- **Panel not visible**  
  - Ensure `NODE_ENV=development` or the app’s dev flag is on.  
  - Ensure `DevModePanel` is mounted (e.g. in `app/layout.tsx`).

- **Credit override not applied**  
  - Credits are overridden in `lib/api.ts` for `getCreditsBalance` (and related).  
  - Ensure `dev_mode_credit_override` is set in `localStorage` and the credits API is called through the app’s API layer.

- **API mocks not used**  
  - Mock key must match the pathname used in `apiFetch` (e.g. `/api/research` without query or origin).  
  - Mocks are only applied when `isDevelopmentMode()` is true.

- **SSE simulation not triggering**  
  - Simulation is read on **next** SSE connection. Start a new summary/research or reload after setting it.  
  - Implemented in `lib/authenticated-sse.ts`; only affects that client.

- **Tier override has no effect**  
  - Override is applied in the frontend (credits, tier status, auth/me).  
  - The backend may still use the real tier for rate limits, billing, and features.

---

## Related code

- **Components**: `frontend/src/components/DevModePanel.tsx`
- **Utils**: `frontend/src/utils/dev-mode.ts`
- **API**: `frontend/src/lib/api.ts` (credit override, tier override, API mocks, rate-limit bypass header)
- **SSE**: `frontend/src/lib/authenticated-sse.ts` (SSE simulation)
- **Auth**: `frontend/src/contexts/AuthContext.tsx` (account type)
- **Guest**: `frontend/src/hooks/useGuestSession.ts` (guest limit bypass)

---

## PRD

See `docs/dev_mode_panel_testing_features_prd.md` for the full product spec and phased plan.
