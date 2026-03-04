'use client';

/**
 * Dev Mode Panel - Phase 1, 2 & 4
 * Phase 1: Account toggle, credit override, SSE simulation, health refresh
 * Phase 2: Limit bypass, API mocking, user tier simulation
 * Phase 4: UI/UX (tabs, section styling, responsive), error handling, last-tab persistence
 * All displayed configs from health API, guestConfig, or env — not hardcoded.
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { isDevelopmentMode, getDevUserId, shouldSkipAuth } from '@/config/env';
import { healthCheck, invalidateCache } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDataContext } from '@/contexts/UserDataContext';
import { useToast } from '@/contexts/ToastContext';
import { apiEndpoints } from '@/config/api';
import { guestConfig } from '@/config/guest';
import { getAllTiers, formatTierName } from '@/config/tier';
import type { UserTier } from '@/types/user';
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
  type DevModeAccountType,
  type DevModeSSESimulation,
  type DevModePanelTab,
} from '@/utils/dev-mode';
import { clearGuestSession } from '@/utils/guest-session.utils';

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  services: Record<string, string>;
  storage?: {
    mode: 'local' | 'firestore';
    enabled: boolean;
    fileCount?: number;
    dataDirectory?: string;
  };
  auth?: {
    enabled: boolean;
    mode: 'firebase' | 'jwt';
  };
  version: string;
}

export function DevModePanel() {
  const { t } = useTranslation('common');
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTab, setCurrentTabState] = useState<DevModePanelTab>('status');
  const [creditInput, setCreditInput] = useState('');

  const { isGuest } = useAuth();
  const { credits, refetchUserData, refetchTier, updateCreditsOptimistically } = useUserDataContext();
  const { showToast } = useToast();

  const [tick, setTick] = useState(0);
  const [mockEndpoint, setMockEndpoint] = useState('');
  const [mockType, setMockType] = useState<'success' | 'error'>('success');
  const [mockStatus, setMockStatus] = useState('200');
  const [mockError, setMockError] = useState('');
  const [mockBody, setMockBody] = useState('{}');

  const skipAuth = shouldSkipAuth();
  const accountType = getDevModeAccountType();
  const creditOverride = getDevModeCreditOverride();
  const sseSim = getDevModeSSESimulation();

  const fetchHealth = useCallback(async (bypass = false) => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await healthCheck(bypass);
      if (res.data) setHealth(res.data as HealthCheckResponse);
      else if (res.error) {
        setHealthError(res.error.message);
        showToast({ variant: 'error', title: 'Health check failed', description: res.error.message, duration: 4000 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Health check failed';
      setHealthError(msg);
      showToast({ variant: 'error', title: 'Health check failed', description: msg, duration: 4000 });
    } finally {
      setHealthLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setMounted(true);
    if (!isDevelopmentMode()) return;
    setCurrentTabState(getDevModePanelTab());
    fetchHealth();
  }, [fetchHealth]);

  const setCurrentTab = (tab: DevModePanelTab) => {
    setCurrentTabState(tab);
    setDevModePanelTab(tab);
  };

  if (!mounted || !isDevelopmentMode()) return null;

  const storageMode = health?.storage?.mode != null
    ? (health.storage.mode === 'local' ? 'Local' : 'Firestore')
    : '—';
  const authEnabled = health?.auth?.enabled ?? false;
  const authMode = health?.auth?.mode ?? '—';
  const fileCount = health?.storage?.fileCount ?? null;
  const version = health?.version ?? '—';
  const devUserId = getDevUserId();

  const switchAccountMode = (mode: DevModeAccountType) => {
    try {
      setDevModeAccountType(mode);
      clearGuestSession();
      showToast({
        variant: 'success',
        title: `Switching to ${mode === 'guest' ? 'Guest' : 'Dev User'}`,
        description: 'Reloading…',
        duration: 2000,
      });
      window.location.reload();
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Account switch failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };

  const applyCreditOverride = (value: number | 'unlimited') => {
    try {
      setDevModeCreditOverride(value);
      updateCreditsOptimistically({
        balance: value === 'unlimited' ? 999999 : value,
      });
      showToast({
        variant: 'success',
        title: 'Credit override applied',
        description: value === 'unlimited' ? 'Unlimited' : `${value} credits`,
        duration: 3000,
      });
      setCreditInput('');
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Credit override failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };

  const resetCreditOverride = async () => {
    try {
      clearDevModeCreditOverride();
      invalidateCache(apiEndpoints.creditsBalance);
      await refetchUserData();
      showToast({ variant: 'success', title: 'Credit override cleared', description: 'Using actual balance', duration: 3000 });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Reset credit override failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };

  const triggerSSE = (type: DevModeSSESimulation) => {
    try {
      setDevModeSSESimulation(type);
      showToast({
        variant: 'success',
        title: 'SSE simulation set',
        description: `Next connection will: ${type === 'drop' ? 'drop' : type === 'error' ? 'emit error' : 'timeout'}. Reload or start a new stream to trigger.`,
        duration: 4000,
      });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'SSE simulation failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };

  const clearSSE = () => {
    try {
      clearDevModeSSESimulation();
      showToast({ variant: 'success', title: 'SSE simulation cleared', duration: 2000 });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Clear SSE simulation failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };

  const refresh = () => setTick((t) => t + 1);
  
  // Dispatch custom event to notify other components of dev mode changes
  const notifyDevModeUpdate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dev-mode-update'));
    }
  };

  const bypassRate = getDevModeBypassRateLimits();
  const bypassGuest = getDevModeBypassGuestLimits();
  const toggleBypassRate = () => {
    try {
      setDevModeBypassRateLimits(!bypassRate);
      refresh();
      showToast({ variant: 'success', title: `Rate limits ${!bypassRate ? 'bypassed' : 'enabled'}`, duration: 2000 });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Toggle bypass failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };
  const toggleBypassGuest = () => {
    try {
      setDevModeBypassGuestLimits(!bypassGuest);
      refresh();
      notifyDevModeUpdate();
      showToast({ variant: 'success', title: `Guest limits ${!bypassGuest ? 'bypassed' : 'enabled'}`, duration: 2000 });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Toggle bypass failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };

  const apiMocks = getDevModeApiMocks();
  const saveMock = () => {
    try {
      const path = mockEndpoint.trim() ? (mockEndpoint.startsWith('/') ? mockEndpoint : `/${mockEndpoint}`) : null;
      if (!path) {
        showToast({ variant: 'error', title: 'Enter endpoint path (e.g. /api/research)', duration: 3000 });
        return;
      }
      let data: unknown = {};
      if (mockType !== 'error') {
        try {
          data = mockBody.trim() ? JSON.parse(mockBody) : {};
        } catch {
          showToast({ variant: 'error', title: 'Invalid JSON in response body', duration: 3000 });
          return;
        }
      }
      setDevModeApiMock(path, {
        enabled: true,
        type: mockType,
        status: mockType === 'success' ? (parseInt(mockStatus, 10) || 200) : undefined,
        data: mockType !== 'error' ? data : undefined,
        error: mockType === 'error' ? mockError || 'Mocked error' : undefined,
      });
      refresh();
      showToast({ variant: 'success', title: `Mock enabled for ${path}`, duration: 3000 });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Save API mock failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };
  const clearMocks = () => {
    try {
      clearDevModeApiMocks();
      refresh();
      showToast({ variant: 'success', title: 'All API mocks cleared', duration: 2000 });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Clear API mocks failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };

  const tierOverride = getDevModeUserTier();
  const applyTier = async (tier: UserTier) => {
    try {
      setDevModeUserTier(tier);
      invalidateCache(apiEndpoints.tierStatus);
      invalidateCache(apiEndpoints.authMe);
      await refetchUserData();
      await refetchTier();
      refresh();
      notifyDevModeUpdate();
      showToast({ variant: 'success', title: `Tier set to ${formatTierName(tier)}`, duration: 3000 });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Tier override failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };
  const clearTier = async () => {
    try {
      clearDevModeUserTier();
      invalidateCache(apiEndpoints.tierStatus);
      invalidateCache(apiEndpoints.authMe);
      await refetchUserData();
      await refetchTier();
      refresh();
      notifyDevModeUpdate();
      showToast({ variant: 'success', title: 'Tier override cleared', duration: 2000 });
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Clear tier override failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  };

  const currentBalance = creditOverride != null
    ? (creditOverride === 'unlimited' ? 999999 : creditOverride)
    : (credits?.balance ?? null);

  const sectionClass = 'rounded border border-amber-400/20 bg-black/5 dark:bg-white/5 p-2.5 space-y-1.5';
  const headingClass = 'text-xs font-bold uppercase tracking-wider opacity-80';

  return (
    <div className="fixed bottom-4 left-4 z-50 w-full max-w-[calc(100vw-2rem)] md:w-[400px]">
      <div
        className="bg-amber-500/95 dark:bg-amber-600/95 text-black dark:text-amber-50 rounded-lg shadow-lg border border-amber-400/50 overflow-hidden"
        style={{ maxHeight: isExpanded ? '80vh' : undefined }}
      >
        {/* Header - sticky when expanded */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left font-semibold hover:bg-amber-400/30 dark:hover:bg-amber-500/20 transition-colors sticky top-0 z-10 bg-amber-500/95 dark:bg-amber-600/95"
        >
          <span className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <span>{t('devMode.title')}</span>
          </span>
          <span className="text-sm opacity-80" aria-hidden>{isExpanded ? '▼' : '▶'}</span>
        </button>

        {isExpanded && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-amber-400/30 bg-amber-600/20 dark:bg-amber-700/20" role="tablist">
              {(['status', 'account', 'testing'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={currentTab === tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${currentTab === tab ? 'bg-amber-500/40 dark:bg-amber-600/40 text-black dark:text-amber-50' : 'hover:bg-amber-400/20 dark:hover:bg-amber-500/20'}`}
                >
                  {tab === 'status' ? 'Status' : tab === 'account' ? 'Account' : 'Testing'}
                </button>
              ))}
            </div>

            <div className="px-4 pb-4 pt-3 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 52px - 36px)' }} role="tabpanel">
              {/* --- Status tab --- */}
              {currentTab === 'status' && (
                <section className={sectionClass}>
                  <h3 className={headingClass}>Backend Status</h3>
              <div className="text-xs font-mono space-y-0.5 bg-black/10 dark:bg-white/10 rounded px-2 py-1.5">
                <div>Storage: <span className="font-semibold">{storageMode}</span>{fileCount != null && ` (${fileCount} files)`}</div>
                <div>Auth: <span className="font-semibold">{authEnabled ? 'Enabled' : 'Disabled'}</span></div>
                <div>Auth mode: <span className="font-semibold">{authMode}</span></div>
                <div>Version: <span className="font-semibold">{version}</span></div>
                <div>User ID: <span className="font-semibold">{devUserId}</span></div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fetchHealth(true)}
                  disabled={healthLoading}
                  className="text-xs px-2 py-1 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 disabled:opacity-50"
                >
                  {healthLoading ? '…' : '🔄 Refresh'}
                </button>
                {healthError && <span className="text-xs text-red-700 dark:text-red-300">{healthError}</span>}
              </div>
            </section>
              )}

              {/* --- Account tab --- */}
              {currentTab === 'account' && (
                <>
            {skipAuth && (
              <section className={sectionClass}>
                <h3 className={headingClass}>Account Mode</h3>
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={accountType === 'guest' ? 'font-bold' : ''}>○ Guest</span>
                    <span className={accountType === 'dev' ? 'font-bold' : ''}>○ Dev User</span>
                  </div>
                  <p className="opacity-75 mb-2">Active: {isGuest ? 'Guest' : 'Dev User'}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => switchAccountMode('guest')}
                      disabled={accountType === 'guest'}
                      className="px-2 py-1 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 disabled:opacity-50 text-xs"
                    >
                      Switch to Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => switchAccountMode('dev')}
                      disabled={accountType === 'dev'}
                      className="px-2 py-1 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 disabled:opacity-50 text-xs"
                    >
                      Switch to Dev User
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section className={sectionClass}>
              <h3 className={headingClass}>Credit Override</h3>
              <div className="text-xs">
                <p className="mb-1">Current: <span className="font-mono font-semibold">{currentBalance != null ? currentBalance : '—'}</span> credits</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {([0, 10, 100, 1000] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => applyCreditOverride(n)}
                      className="px-2 py-0.5 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 text-xs"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => applyCreditOverride('unlimited')}
                    className="px-2 py-0.5 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 text-xs"
                  >
                    ∞
                  </button>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    min={0}
                    value={creditInput}
                    onChange={(e) => setCreditInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { const n = parseInt(creditInput, 10); if (!isNaN(n) && n >= 0) applyCreditOverride(n); } }}
                    placeholder="Custom"
                    className="w-20 px-1.5 py-0.5 rounded bg-white/90 dark:bg-black/30 border border-amber-600/50 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => { const n = parseInt(creditInput, 10); if (!isNaN(n) && n >= 0) applyCreditOverride(n); }}
                    className="px-2 py-0.5 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 text-xs"
                  >
                    Apply
                  </button>
                </div>
                {creditOverride != null && (
                  <button
                    type="button"
                    onClick={resetCreditOverride}
                    className="text-xs underline hover:no-underline"
                  >
                    Reset to actual
                  </button>
                )}
              </div>
            </section>

            {/* Phase 2: User Tier — tiers from config */}
            <section className={sectionClass}>
              <h3 className={headingClass}>User Tier</h3>
              <div className="text-xs space-y-2">
                <p>Current override: <span className="font-mono font-semibold">{tierOverride ? formatTierName(tierOverride) : '—'}</span></p>
                <select
                  value={tierOverride || ''}
                  onChange={(e) => { const v = e.target.value as UserTier; if (v) applyTier(v); }}
                  className="px-2 py-1 rounded bg-white/90 dark:bg-black/30 border border-amber-600/50 font-mono"
                >
                  <option value="">— Select —</option>
                  {getAllTiers().map((t) => (
                    <option key={t} value={t}>{formatTierName(t)}</option>
                  ))}
                </select>
                {tierOverride && (
                  <button type="button" onClick={clearTier} className="text-xs underline hover:no-underline block">
                    Clear override
                  </button>
                )}
                <p className="opacity-75">⚠️ UI only; backend may enforce real tier.</p>
              </div>
            </section>
                </>
              )}

              {/* --- Testing tab --- */}
              {currentTab === 'testing' && (
                <>
            <section className={sectionClass}>
              <h3 className={headingClass}>SSE Simulation</h3>
              <div className="text-xs">
                {sseSim && <p className="mb-2 text-amber-800 dark:text-amber-200">Pending: next connection will simulate &quot;{sseSim}&quot;</p>}
                <div className="flex flex-wrap gap-1 mb-2">
                  {(['drop', 'error', 'timeout'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => triggerSSE(t)}
                      className="px-2 py-0.5 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 capitalize"
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearSSE}
                    className="px-2 py-0.5 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700"
                  >
                    Clear
                  </button>
                </div>
                <p className="opacity-75">⚠️ Affects next SSE connection only.</p>
              </div>
            </section>

            {/* Phase 2: Limit Bypass — limits from guestConfig */}
            <section className={sectionClass}>
              <h3 className={headingClass}>Limit Bypass</h3>
              <div className="text-xs space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={bypassRate} onChange={toggleBypassRate} className="rounded" />
                  Bypass Rate Limits
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={bypassGuest} onChange={toggleBypassGuest} className="rounded" />
                  Bypass Guest Limits
                </label>
                <div className="bg-black/10 dark:bg-white/10 rounded px-2 py-1.5 font-mono">
                  <div>Guest: {guestConfig.maxSummaries ?? 'Unlimited'} summary, {guestConfig.maxResearch} research</div>
                  <div>Rate: from backend</div>
                </div>
                {(bypassRate || bypassGuest) && (
                  <p className="text-amber-800 dark:text-amber-200">⚠️ Bypassed — no restrictions</p>
                )}
              </div>
            </section>

            {/* Phase 2: API Mocking */}
            <section className={sectionClass}>
              <h3 className={headingClass}>API Mocking</h3>
              <div className="text-xs space-y-2">
                <input
                  type="text"
                  value={mockEndpoint}
                  onChange={(e) => setMockEndpoint(e.target.value)}
                  placeholder="/api/research or /api/credits/balance"
                  className="w-full px-1.5 py-0.5 rounded bg-white/90 dark:bg-black/30 border border-amber-600/50 font-mono"
                />
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="radio" name="mockType" checked={mockType === 'success'} onChange={() => setMockType('success')} />
                    Success
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="mockType" checked={mockType === 'error'} onChange={() => setMockType('error')} />
                    Error
                  </label>
                </div>
                {mockType === 'success' && (
                  <>
                    <input
                      type="text"
                      value={mockStatus}
                      onChange={(e) => setMockStatus(e.target.value)}
                      placeholder="200"
                      className="w-14 px-1.5 py-0.5 rounded bg-white/90 dark:bg-black/30 border border-amber-600/50 font-mono"
                    />
                    <textarea
                      value={mockBody}
                      onChange={(e) => setMockBody(e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={2}
                      className="w-full px-1.5 py-0.5 rounded bg-white/90 dark:bg-black/30 border border-amber-600/50 font-mono text-[11px]"
                    />
                  </>
                )}
                {mockType === 'error' && (
                  <input
                    type="text"
                    value={mockError}
                    onChange={(e) => setMockError(e.target.value)}
                    placeholder="Mocked error message"
                    className="w-full px-1.5 py-0.5 rounded bg-white/90 dark:bg-black/30 border border-amber-600/50"
                  />
                )}
                <div className="flex flex-wrap gap-1">
                  <button type="button" onClick={saveMock} className="px-2 py-0.5 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 text-xs">
                    Enable &amp; Save
                  </button>
                  <button type="button" onClick={clearMocks} className="px-2 py-0.5 rounded bg-amber-600/80 dark:bg-amber-700/80 hover:bg-amber-600 dark:hover:bg-amber-700 text-xs">
                    Clear All Mocks
                  </button>
                </div>
                {Object.keys(apiMocks).length > 0 && (
                  <div className="font-mono text-[10px] opacity-90">
                    Active: {Object.entries(apiMocks).filter(([, m]) => m.enabled).map(([p]) => p).join(', ') || '—'}
                  </div>
                )}
              </div>
            </section>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
