/**
 * Guest Access Configuration
 * Phase 3: Centralized configuration for guest access features
 * All guest-related settings are configurable via environment variables
 */

/**
 * Guest session storage key
 * Configurable via NEXT_PUBLIC_GUEST_SESSION_STORAGE_KEY
 */
export const guestConfig = {
  /**
   * Storage key for guest session ID in sessionStorage
   */
  sessionStorageKey: process.env.NEXT_PUBLIC_GUEST_SESSION_STORAGE_KEY || 'guestSessionId',

  /**
   * Storage key for guest summary count in sessionStorage
   */
  summaryCountStorageKey: process.env.NEXT_PUBLIC_GUEST_SUMMARY_COUNT_STORAGE_KEY || 'guestSummaryCount',

  /**
   * Storage key for guest research count in sessionStorage
   */
  researchCountStorageKey: process.env.NEXT_PUBLIC_GUEST_RESEARCH_COUNT_STORAGE_KEY || 'guestResearchCount',

  /**
   * Maximum number of summaries a guest can create (null = unlimited).
   * Configurable via NEXT_PUBLIC_GUEST_MAX_SUMMARIES. Omit or set to "" or "unlimited" for unlimited.
   * When guest fetches /me, backend quota.daily_limit overrides this (single source of truth).
   */
  maxSummaries: (() => {
    const v = process.env.NEXT_PUBLIC_GUEST_MAX_SUMMARIES;
    if (v === undefined || v === '' || v === 'unlimited') return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  })(),

  /**
   * Maximum number of research jobs a guest can create
   * Configurable via NEXT_PUBLIC_GUEST_MAX_RESEARCH (default: 1)
   */
  maxResearch: parseInt(
    process.env.NEXT_PUBLIC_GUEST_MAX_RESEARCH || '1',
    10
  ),

  /**
   * Guest session expiration time in hours
   * Configurable via NEXT_PUBLIC_GUEST_SESSION_EXPIRY_HOURS (default: 24)
   */
  sessionExpiryHours: parseInt(
    process.env.NEXT_PUBLIC_GUEST_SESSION_EXPIRY_HOURS || '24',
    10
  ),

  /**
   * Header name for guest session ID in API requests
   * Configurable via NEXT_PUBLIC_GUEST_SESSION_HEADER_NAME
   */
  sessionHeaderName: process.env.NEXT_PUBLIC_GUEST_SESSION_HEADER_NAME || 'X-Guest-Session-Id',
} as const;

/**
 * Guest-related error codes from backend
 */
export const guestErrorCodes = {
  limitReached: 'GUEST_LIMIT_REACHED',
  summaryNotFound: 'GUEST_SUMMARY_NOT_FOUND',
  sessionExpired: 'GUEST_SESSION_EXPIRED',
  sessionInvalid: 'GUEST_SESSION_INVALID',
  researchLimitReached: 'GUEST_RESEARCH_LIMIT_REACHED',
} as const;


