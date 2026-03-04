/**
 * Dev Mode utilities for testing features
 * Used by DevModePanel - localStorage keys and helpers
 * Phase 1: Account toggle, credit override, SSE simulation
 * Phase 2: Limit bypass, API mocks, user tier
 */

import type { UserTier } from '@/types/user';

const STORAGE_KEYS = {
  accountType: 'dev_mode_account_type',
  creditOverride: 'dev_mode_credit_override',
  sseSimulation: 'dev_mode_sse_simulation',
  bypassRateLimits: 'dev_mode_bypass_rate_limits',
  bypassGuestLimits: 'dev_mode_bypass_guest_limits',
  apiMocks: 'dev_mode_api_mocks',
  userTier: 'dev_mode_user_tier',
  panelTab: 'dev_mode_panel_tab',
} as const;

export type DevModeAccountType = 'guest' | 'dev';

/**
 * Get dev mode account type from localStorage.
 * Defaults to 'dev' when in skipAuth dev mode so existing behavior is preserved.
 */
export function getDevModeAccountType(): DevModeAccountType {
  if (typeof window === 'undefined') return 'dev';
  const v = localStorage.getItem(STORAGE_KEYS.accountType);
  if (v === 'guest' || v === 'dev') return v;
  return 'dev';
}

export function setDevModeAccountType(value: DevModeAccountType): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.accountType, value);
}

/**
 * Get credit override: number or 'unlimited', or null if not set.
 */
export function getDevModeCreditOverride(): number | 'unlimited' | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEYS.creditOverride);
  if (v == null || v === '') return null;
  if (v === 'unlimited') return 'unlimited';
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

export function setDevModeCreditOverride(value: number | 'unlimited'): void {
  if (typeof window === 'undefined') return;
  if (value === 'unlimited') {
    localStorage.setItem(STORAGE_KEYS.creditOverride, 'unlimited');
  } else {
    localStorage.setItem(STORAGE_KEYS.creditOverride, String(value));
  }
}

export function clearDevModeCreditOverride(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.creditOverride);
}

export type DevModeSSESimulation = 'drop' | 'error' | 'timeout';

export function getDevModeSSESimulation(): DevModeSSESimulation | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEYS.sseSimulation);
  if (v === 'drop' || v === 'error' || v === 'timeout') return v;
  return null;
}

export function setDevModeSSESimulation(value: DevModeSSESimulation): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.sseSimulation, value);
}

export function clearDevModeSSESimulation(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.sseSimulation);
}

// --- Phase 2: Limit bypass ---

export function getDevModeBypassRateLimits(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.bypassRateLimits) === 'true';
}

export function setDevModeBypassRateLimits(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.bypassRateLimits, String(enabled));
}

export function getDevModeBypassGuestLimits(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.bypassGuestLimits) === 'true';
}

export function setDevModeBypassGuestLimits(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.bypassGuestLimits, String(enabled));
}

// --- Phase 2: API mocks ---

export interface DevModeApiMock {
  enabled: boolean;
  type: 'error' | 'success' | 'custom';
  status?: number;
  data?: unknown;
  error?: string;
}

export function getDevModeApiMocks(): Record<string, DevModeApiMock> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.apiMocks);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DevModeApiMock>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function setDevModeApiMock(path: string, mock: DevModeApiMock): void {
  if (typeof window === 'undefined') return;
  const key = path.startsWith('/') ? path : `/${path}`;
  const mocks = getDevModeApiMocks();
  mocks[key] = mock;
  localStorage.setItem(STORAGE_KEYS.apiMocks, JSON.stringify(mocks));
}

export function clearDevModeApiMocks(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.apiMocks);
}

// --- Phase 2: User tier ---

export function getDevModeUserTier(): UserTier | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEYS.userTier);
  if (v === 'free' || v === 'starter' || v === 'pro' || v === 'premium') return v;
  return null;
}

export function setDevModeUserTier(tier: UserTier): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.userTier, tier);
}

export function clearDevModeUserTier(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.userTier);
}

// --- Phase 4: Panel preferences (last tab) ---

export type DevModePanelTab = 'status' | 'account' | 'testing';

export function getDevModePanelTab(): DevModePanelTab {
  if (typeof window === 'undefined') return 'status';
  const v = localStorage.getItem(STORAGE_KEYS.panelTab);
  if (v === 'status' || v === 'account' || v === 'testing') return v;
  return 'status';
}

export function setDevModePanelTab(tab: DevModePanelTab): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.panelTab, tab);
}
