/**
 * Cookie Utility Functions
 * Helper functions for managing guest language preference cookies
 * 
 * Phase 1: Guest Language Preference Implementation
 * 
 * Cookie Details:
 * - Name: guest_language_preference
 * - Expiry: 365 days
 * - Path: / (available across entire app)
 * - SameSite: Lax (for security)
 */

const GUEST_LANGUAGE_COOKIE_NAME = 'guest_language_preference';
const COOKIE_EXPIRY_DAYS = 365;

/**
 * Set guest language preference cookie
 * 
 * @param languageCode - ISO 639-1 language code (e.g., 'en', 'es', 'fr')
 * @throws {Error} If languageCode is empty or invalid
 * 
 * @example
 * ```ts
 * setGuestLanguagePreference('es');
 * ```
 */
export function setGuestLanguagePreference(languageCode: string): void {
  if (typeof document === 'undefined') {
    // SSR: cookies can only be set on client side
    return;
  }

  if (!languageCode || typeof languageCode !== 'string') {
    console.warn('Invalid language code provided to setGuestLanguagePreference:', languageCode);
    return;
  }

  // Calculate expiration date
  const expiryDate = new Date();
  expiryDate.setTime(expiryDate.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));

  // Encode the language code to handle special characters
  const encodedValue = encodeURIComponent(languageCode.trim().toLowerCase());

  // Set cookie with proper attributes
  // SameSite=Lax: Prevents CSRF attacks while allowing normal navigation
  // path=/: Makes cookie available across entire app
  // expires: Sets expiration date (1 year from now)
  document.cookie = `${GUEST_LANGUAGE_COOKIE_NAME}=${encodedValue}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Get guest language preference from cookie
 * 
 * @returns Language code string if cookie exists, null otherwise
 * 
 * @example
 * ```ts
 * const lang = getGuestLanguagePreference();
 * if (lang) {
 *   console.log('Guest language:', lang);
 * }
 * ```
 */
export function getGuestLanguagePreference(): string | null {
  if (typeof document === 'undefined') {
    // SSR: cookies can only be read on client side
    return null;
  }

  const name = `${GUEST_LANGUAGE_COOKIE_NAME}=`;
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(name) === 0) {
      // Extract and decode the cookie value
      const value = cookie.substring(name.length);
      try {
        return decodeURIComponent(value);
      } catch (error) {
        // If decoding fails, return the raw value
        console.warn('Failed to decode guest language cookie:', error);
        return value;
      }
    }
  }

  return null;
}

/**
 * Clear guest language preference cookie
 * 
 * Removes the cookie by setting it to expire in the past.
 * This ensures the cookie is deleted from the browser.
 * 
 * @example
 * ```ts
 * clearGuestLanguagePreference();
 * ```
 */
export function clearGuestLanguagePreference(): void {
  if (typeof document === 'undefined') {
    // SSR: cookies can only be cleared on client side
    return;
  }

  // Set cookie with expiration date in the past to delete it
  // Using same path and SameSite attributes as when setting
  document.cookie = `${GUEST_LANGUAGE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}
