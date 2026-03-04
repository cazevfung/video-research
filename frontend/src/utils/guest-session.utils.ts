/**
 * Guest Session Utilities
 * Phase 3: Helper functions for managing guest sessions
 */

import { guestConfig } from '@/config/guest';

/**
 * Generate a unique guest session ID
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp + random
 */
export function generateGuestSessionId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // Fallback for browsers without crypto.randomUUID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `guest-${timestamp}-${random}`;
}

/**
 * Get or create guest session ID from sessionStorage
 * Returns existing session ID if present, otherwise creates a new one
 */
export function getOrCreateGuestSessionId(): string {
  if (typeof window === 'undefined') {
    // SSR: return a placeholder (will be replaced on client)
    return '';
  }

  let sessionId = sessionStorage.getItem(guestConfig.sessionStorageKey);
  
  if (!sessionId) {
    sessionId = generateGuestSessionId();
    sessionStorage.setItem(guestConfig.sessionStorageKey, sessionId);
  }
  
  return sessionId;
}

/**
 * Get guest session ID from sessionStorage
 * Returns null if not found
 */
export function getGuestSessionId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return sessionStorage.getItem(guestConfig.sessionStorageKey);
}

/**
 * Clear guest session from sessionStorage
 */
export function clearGuestSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  sessionStorage.removeItem(guestConfig.sessionStorageKey);
  sessionStorage.removeItem(guestConfig.summaryCountStorageKey);
  sessionStorage.removeItem(guestConfig.researchCountStorageKey);
}

/**
 * Get guest summary count from sessionStorage
 */
export function getGuestSummaryCount(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  
  const count = sessionStorage.getItem(guestConfig.summaryCountStorageKey);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment guest summary count in sessionStorage
 */
export function incrementGuestSummaryCount(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  
  const currentCount = getGuestSummaryCount();
  const newCount = currentCount + 1;
  sessionStorage.setItem(guestConfig.summaryCountStorageKey, newCount.toString());
  return newCount;
}

/**
 * Set guest summary count in sessionStorage
 */
export function setGuestSummaryCount(count: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  sessionStorage.setItem(guestConfig.summaryCountStorageKey, count.toString());
}

/**
 * Get guest research count from sessionStorage
 */
export function getGuestResearchCount(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  
  const count = sessionStorage.getItem(guestConfig.researchCountStorageKey);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment guest research count in sessionStorage
 */
export function incrementGuestResearchCount(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  
  const currentCount = getGuestResearchCount();
  const newCount = currentCount + 1;
  sessionStorage.setItem(guestConfig.researchCountStorageKey, newCount.toString());
  return newCount;
}

/**
 * Set guest research count in sessionStorage
 */
export function setGuestResearchCount(count: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  sessionStorage.setItem(guestConfig.researchCountStorageKey, count.toString());
}


