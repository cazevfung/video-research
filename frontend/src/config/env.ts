/**
 * Frontend Environment Configuration
 * Centralized configuration for environment detection and development mode
 */

/**
 * Check if the application is running in development mode
 * Detects development mode from:
 * - NODE_ENV === 'development'
 * - NEXT_PUBLIC_DEV_MODE === 'true'
 * - API URL contains 'localhost'
 */
export function isDevelopmentMode(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
    (process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ?? false)
  );
}

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // In production, validate API URL
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname !== 'localhost' && 
                         !window.location.hostname.includes('127.0.0.1');
    
    if (isProduction) {
      if (!apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
        console.error('❌ CRITICAL: NEXT_PUBLIC_API_URL is misconfigured!');
        throw new Error('API URL configuration error');
      }
    }
  }
  
  // Phase 7: Use environment variable for default localhost port
  const defaultPort = process.env.NEXT_PUBLIC_API_DEFAULT_PORT || '5000';
  return apiUrl || `http://localhost:${defaultPort}`;
}

/**
 * Check if authentication should be skipped (for development ONLY)
 * 
 * SECURITY: This should NEVER be true in production!
 */
export function shouldSkipAuth(): boolean {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';
  const isProduction = process.env.NODE_ENV === 'production' ||
                       (typeof window !== 'undefined' && 
                        window.location.hostname !== 'localhost' &&
                        !window.location.hostname.includes('127.0.0.1'));
  
  // In production, NEVER skip auth (security requirement)
  if (isProduction && skipAuth) {
    console.error('❌ SECURITY WARNING: NEXT_PUBLIC_SKIP_AUTH is true in production!');
    console.error('   This is a security risk. Authentication will be enforced.');
    return false; // Force authentication in production
  }
  
  return skipAuth;
}

/**
 * Get development user ID (must match backend DEV_USER_ID)
 */
export function getDevUserId(): string {
  return process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user-id';
}

/**
 * Get development user email
 */
export function getDevUserEmail(): string {
  return process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'dev@example.com';
}

/**
 * Get development user name
 */
export function getDevUserName(): string {
  return process.env.NEXT_PUBLIC_DEV_USER_NAME || 'Development User';
}

/**
 * Check if Firebase Authentication is enabled
 * Uses centralized config from environment variable
 * 
 * In localhost development, automatically uses backend JWT login for better isolation
 */
export function isFirebaseAuthEnabled(): boolean {
  // In localhost development, always use backend JWT login for better isolation
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  if (isLocalhost && process.env.NODE_ENV === 'development') {
    return false; // Use backend JWT login in localhost dev mode
  }
  
  return process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true';
}

/**
 * Get the base URL for share links
 * Phase 2: Environment-aware share URL generation (not hardcoded)
 * 
 * Development: http://localhost:3000/shared
 * Production: Uses window.location.origin or NEXT_PUBLIC_FRONTEND_URL env variable
 */
export function getShareBaseUrl(): string {
  if (typeof window === 'undefined') {
    // SSR safety - return empty string for server-side rendering
    return '';
  }
  
  // Check for explicit frontend URL in environment (for production)
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
  if (frontendUrl) {
    return `${frontendUrl}/shared`;
  }
  
  // Development: use localhost
  if (isDevelopmentMode()) {
    const port = process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000';
    return `http://localhost:${port}/shared`;
  }
  
  // Production: use current origin
  return `${window.location.origin}/shared`;
}