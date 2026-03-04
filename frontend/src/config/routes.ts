/**
 * Centralized Route Configuration
 * All application routes are defined here to avoid hardcoded paths
 * 
 * IMPORTANT: If you change any route paths here, you must also update:
 * - frontend/src/middleware.ts (matcher array - must use static strings)
 * - Any route references in the codebase
 */
export const routes = {
  // Public routes
  home: '/',
  login: '/login',
  signup: '/signup',
  
  // Protected routes
  // Note: 'app' is deprecated - use 'home' instead. Kept for backward compatibility.
  app: '/',
  account: '/account',
  accountCredits: '/account/credits',
  history: '/history',
  settings: '/settings',
  
  // Development/Test routes
  testWhimsical: '/test/whimsical',
  
  // Research routes
  research: '/research',
  researchHistory: '/research/history', // Optional: separate research history
} as const;

/**
 * Helper function to build route with query parameters
 */
export function buildRoute(
  route: string,
  params?: Record<string, string>
): string {
  if (!params || Object.keys(params).length === 0) {
    return route;
  }
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  
  return `${route}?${searchParams.toString()}`;
}

/**
 * Helper function to get redirect URL with redirect parameter
 */
export function getLoginRoute(redirect?: string): string {
  return buildRoute(routes.login, redirect ? { redirect } : undefined);
}

export function getSignupRoute(redirect?: string): string {
  return buildRoute(routes.signup, redirect ? { redirect } : undefined);
}

