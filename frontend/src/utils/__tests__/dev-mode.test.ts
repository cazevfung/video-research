/**
 * Phase 4: Dev Mode utils – unit tests
 */

import {
  getDevModeAccountType,
  setDevModeAccountType,
  getDevModeCreditOverride,
  setDevModeCreditOverride,
  clearDevModeCreditOverride,
  getDevModeSSESimulation,
  setDevModeSSESimulation,
  clearDevModeSSESimulation,
  getDevModeBypassRateLimits,
  setDevModeBypassRateLimits,
  getDevModeBypassGuestLimits,
  setDevModeBypassGuestLimits,
  getDevModeApiMocks,
  setDevModeApiMock,
  clearDevModeApiMocks,
  getDevModeUserTier,
  setDevModeUserTier,
  clearDevModeUserTier,
  getDevModePanelTab,
  setDevModePanelTab,
} from '../dev-mode';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('dev-mode utils', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('account type', () => {
    it('defaults to dev when unset', () => {
      expect(getDevModeAccountType()).toBe('dev');
    });
    it('returns guest when set', () => {
      setDevModeAccountType('guest');
      expect(getDevModeAccountType()).toBe('guest');
    });
    it('returns dev when set', () => {
      setDevModeAccountType('dev');
      expect(getDevModeAccountType()).toBe('dev');
    });
    it('ignores invalid value', () => {
      localStorageMock.setItem('dev_mode_account_type', 'invalid');
      expect(getDevModeAccountType()).toBe('dev');
    });
  });

  describe('credit override', () => {
    it('returns null when unset', () => {
      expect(getDevModeCreditOverride()).toBeNull();
    });
    it('returns number when set', () => {
      setDevModeCreditOverride(100);
      expect(getDevModeCreditOverride()).toBe(100);
    });
    it('returns unlimited when set', () => {
      setDevModeCreditOverride('unlimited');
      expect(getDevModeCreditOverride()).toBe('unlimited');
    });
    it('clears on clearDevModeCreditOverride', () => {
      setDevModeCreditOverride(50);
      clearDevModeCreditOverride();
      expect(getDevModeCreditOverride()).toBeNull();
    });
  });

  describe('SSE simulation', () => {
    it('returns null when unset', () => {
      expect(getDevModeSSESimulation()).toBeNull();
    });
    it('returns drop/error/timeout when set', () => {
      setDevModeSSESimulation('drop');
      expect(getDevModeSSESimulation()).toBe('drop');
      setDevModeSSESimulation('error');
      expect(getDevModeSSESimulation()).toBe('error');
      setDevModeSSESimulation('timeout');
      expect(getDevModeSSESimulation()).toBe('timeout');
    });
    it('clears on clearDevModeSSESimulation', () => {
      setDevModeSSESimulation('error');
      clearDevModeSSESimulation();
      expect(getDevModeSSESimulation()).toBeNull();
    });
  });

  describe('limit bypass', () => {
    it('returns false when unset', () => {
      expect(getDevModeBypassRateLimits()).toBe(false);
      expect(getDevModeBypassGuestLimits()).toBe(false);
    });
    it('returns true when set', () => {
      setDevModeBypassRateLimits(true);
      setDevModeBypassGuestLimits(true);
      expect(getDevModeBypassRateLimits()).toBe(true);
      expect(getDevModeBypassGuestLimits()).toBe(true);
    });
  });

  describe('API mocks', () => {
    it('returns {} when unset', () => {
      expect(getDevModeApiMocks()).toEqual({});
    });
    it('stores and retrieves mock by path', () => {
      setDevModeApiMock('/api/x', { enabled: true, type: 'success', data: { a: 1 } });
      expect(getDevModeApiMocks()).toMatchObject({ '/api/x': { enabled: true, type: 'success' } });
    });
    it('clears all on clearDevModeApiMocks', () => {
      setDevModeApiMock('/api/x', { enabled: true, type: 'success' });
      clearDevModeApiMocks();
      expect(getDevModeApiMocks()).toEqual({});
    });
  });

  describe('user tier', () => {
    it('returns null when unset', () => {
      expect(getDevModeUserTier()).toBeNull();
    });
    it('returns tier when set', () => {
      setDevModeUserTier('pro');
      expect(getDevModeUserTier()).toBe('pro');
    });
    it('clears on clearDevModeUserTier', () => {
      setDevModeUserTier('starter');
      clearDevModeUserTier();
      expect(getDevModeUserTier()).toBeNull();
    });
  });

  describe('panel tab (Phase 4)', () => {
    it('defaults to status when unset', () => {
      expect(getDevModePanelTab()).toBe('status');
    });
    it('returns tab when set', () => {
      setDevModePanelTab('account');
      expect(getDevModePanelTab()).toBe('account');
      setDevModePanelTab('testing');
      expect(getDevModePanelTab()).toBe('testing');
    });
    it('falls back to status for invalid value', () => {
      localStorageMock.setItem('dev_mode_panel_tab', 'invalid');
      expect(getDevModePanelTab()).toBe('status');
    });
  });
});
