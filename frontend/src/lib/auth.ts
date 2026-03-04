/**
 * Minimal authentication stub for development
 * This will be replaced with real authentication later
 */

import { shouldSkipAuth as shouldSkipAuthConfig, getDevUserId, getDevUserEmail, getDevUserName } from '@/config/env';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Mock user data for development
 * Uses centralized config to match backend dev user
 * In production, this will be replaced with actual auth logic
 */
const MOCK_USER: User = {
  id: getDevUserId(),
  email: getDevUserEmail(),
  name: getDevUserName(),
  picture: undefined,
};

/**
 * Check if authentication should be bypassed (for development)
 * Uses centralized config
 */
export function shouldSkipAuth(): boolean {
  return shouldSkipAuthConfig();
}

/**
 * Get current user (mock implementation)
 * Returns mock user if auth is skipped, otherwise null
 */
export async function getCurrentUser(): Promise<User | null> {
  if (shouldSkipAuth()) {
    // Log in development mode for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 Auth bypassed - using dev user:', {
        id: MOCK_USER.id,
        email: MOCK_USER.email,
        name: MOCK_USER.name,
      });
    }
    return MOCK_USER;
  }
  // In production, this would check for a valid session/token
  return null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const skipAuth = shouldSkipAuth();
  if (skipAuth) {
    // Log in development mode for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 Auth bypassed - user is considered authenticated (dev mode)');
    }
    return true;
  }
  // In production, this would verify the session/token
  return false;
}

/**
 * Validate that auth is properly bypassed in development mode
 * Logs warnings if configuration seems incorrect
 */
export function validateAuthBypass(): void {
  if (process.env.NODE_ENV === 'development') {
    const skipAuth = shouldSkipAuth();
    const devUserId = getDevUserId();
    
    console.log('🔍 Auth Configuration:', {
      skipAuth,
      devUserId,
      devUserEmail: getDevUserEmail(),
      devUserName: getDevUserName(),
      nodeEnv: process.env.NODE_ENV,
    });
    
    // Warn if auth is not being skipped in development
    if (!skipAuth && process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Auth is not bypassed in development mode');
      console.warn('   Set NEXT_PUBLIC_SKIP_AUTH=true to enable dev mode');
    }
    
    // Log dev user info for debugging
    if (skipAuth) {
      console.log('✅ Auth bypass enabled - using dev user:', {
        id: devUserId,
        email: getDevUserEmail(),
        name: getDevUserName(),
      });
      console.log('   Make sure backend DEV_USER_ID matches:', devUserId);
    }
  }
}

/**
 * Sign out (placeholder for future implementation)
 */
export async function signOut(): Promise<void> {
  // In production, this would clear the session/token
  console.log('Sign out called (not implemented yet)');
}

