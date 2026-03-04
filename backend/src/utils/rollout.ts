/**
 * Phase 5: Gradual Rollout Utility Functions
 * 
 * Helper functions for gradual rollout of Firebase Auth
 */

import env from '../config/env';
import logger from './logger';

/**
 * Calculate hash of email for consistent user selection
 */
function hashEmail(email: string): number {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Determine if user should use Firebase Auth based on percentage rollout
 * 
 * @param email User's email address
 * @param percentage Rollout percentage (0-100)
 * @returns true if user should use Firebase Auth
 */
export function shouldUseFirebaseAuth(email: string, percentage: number = 100): boolean {
  if (percentage >= 100) {
    return true;
  }
  if (percentage <= 0) {
    return false;
  }
  
  const hash = hashEmail(email);
  const bucket = hash % 100;
  
  return bucket < percentage;
}

/**
 * Get rollout status for a user
 * 
 * @param email User's email address
 * @param percentage Rollout percentage (0-100)
 * @returns Rollout status information
 */
export function getRolloutStatus(email: string, percentage: number = 100): {
  useFirebaseAuth: boolean;
  bucket: number;
  percentage: number;
} {
  const hash = hashEmail(email);
  const bucket = hash % 100;
  const useFirebaseAuth = bucket < percentage;
  
  return {
    useFirebaseAuth,
    bucket,
    percentage,
  };
}

/**
 * Check if Firebase Auth should be enabled for a user
 * Uses environment variable USE_FIREBASE_AUTH_PERCENTAGE if set,
 * otherwise uses USE_FIREBASE_AUTH flag
 * 
 * @param email User's email address
 * @returns true if Firebase Auth should be enabled for this user
 */
export function isFirebaseAuthEnabledForUser(email: string): boolean {
  // Check for percentage-based rollout
  const rolloutPercentage = process.env.USE_FIREBASE_AUTH_PERCENTAGE 
    ? parseInt(process.env.USE_FIREBASE_AUTH_PERCENTAGE, 10)
    : null;

  if (rolloutPercentage !== null && !isNaN(rolloutPercentage)) {
    const enabled = shouldUseFirebaseAuth(email, rolloutPercentage);
    logger.debug('Firebase Auth rollout check', {
      email,
      rolloutPercentage,
      enabled,
    });
    return enabled;
  }

  // Fall back to feature flag
  return env.USE_FIREBASE_AUTH === true;
}

