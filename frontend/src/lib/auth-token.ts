/**
 * Token getter function for API client
 * This allows the API client to access Firebase tokens outside of React context
 */

let currentTokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Set the token getter function (called by AuthContext)
 */
export function setTokenGetter(getter: () => Promise<string | null>): void {
  currentTokenGetter = getter;
}

/**
 * Get the current authentication token
 * Returns null if no token getter is set or if token retrieval fails
 */
export async function getAuthToken(): Promise<string | null> {
  if (!currentTokenGetter) {
    return null;
  }
  try {
    return await currentTokenGetter();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}


