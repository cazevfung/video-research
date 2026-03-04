/**
 * Guest Error Handler
 * Phase 4: Handles guest-specific errors gracefully
 * Provides utilities for handling expired sessions, network errors, and edge cases
 */

import { errorMessages } from '@/config/messages';
import { guestErrorCodes } from '@/config/guest';
import { trackGuestSessionExpired } from '@/utils/analytics';
import { getGuestSessionId, clearGuestSession } from '@/utils/guest-session.utils';

/**
 * Check if an error is a guest session expired error
 */
export function isGuestSessionExpiredError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code || error.error?.code;
  return errorCode === guestErrorCodes.sessionExpired || 
         errorCode === 'GUEST_SESSION_EXPIRED';
}

/**
 * Check if an error is a guest limit reached error
 */
export function isGuestLimitReachedError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code || error.error?.code;
  return errorCode === guestErrorCodes.limitReached || 
         errorCode === 'GUEST_LIMIT_REACHED';
}

/**
 * Handle guest session expired error
 * Clears session and tracks analytics
 */
export function handleGuestSessionExpired(): void {
  const sessionId = getGuestSessionId();
  if (sessionId) {
    trackGuestSessionExpired(sessionId);
    clearGuestSession();
  }
}

/**
 * Get user-friendly error message for guest errors
 */
export function getGuestErrorMessage(error: any): string {
  if (!error) return errorMessages.guestSessionExpired;
  
  const errorCode = error.code || error.error?.code;
  const errorMessage = error.message || error.error?.message;
  
  switch (errorCode) {
    case guestErrorCodes.limitReached:
    case 'GUEST_LIMIT_REACHED':
      return errorMessages.guestLimitReached;
    
    case guestErrorCodes.sessionExpired:
    case 'GUEST_SESSION_EXPIRED':
      handleGuestSessionExpired();
      return errorMessages.guestSessionExpired;
    
    case guestErrorCodes.summaryNotFound:
    case 'GUEST_SUMMARY_NOT_FOUND':
      return errorMessages.guestSummaryNotFound;
    
    case guestErrorCodes.sessionInvalid:
    case 'GUEST_SESSION_INVALID':
      return errorMessages.guestSessionInvalid;
    
    default:
      return errorMessage || errorMessages.guestSessionExpired;
  }
}

/**
 * Check if error is retryable for guest users
 */
export function isGuestErrorRetryable(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code || error.error?.code;
  
  // Network errors are retryable
  if (errorCode === 'NETWORK_ERROR' || errorCode === 'TIMEOUT_ERROR') {
    return true;
  }
  
  // Session expired/invalid errors are not retryable (need refresh)
  if (isGuestSessionExpiredError(error) || 
      errorCode === guestErrorCodes.sessionInvalid) {
    return false;
  }
  
  // Limit reached is not retryable
  if (isGuestLimitReachedError(error)) {
    return false;
  }
  
  // Other errors might be retryable
  return true;
}


