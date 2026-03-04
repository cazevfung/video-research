/**
 * Centralized Validation Messages Configuration
 * Phase 3: Updated to use i18n translations when available, with fallback to English
 * This ensures consistency and makes it easy to update messages
 */

import i18n from '@/lib/i18n';

/**
 * Get validation messages using i18n translations
 * Falls back to English if i18n is not initialized or translation is not available
 */
function getValidationMessage(key: string, fallback: string): string {
  try {
    if (i18n.isInitialized) {
      const translated = i18n.t(`validation:${key}`, { defaultValue: fallback });
      return translated;
    }
  } catch (error) {
    // i18n not initialized or error, use fallback
  }
  return fallback;
}

/**
 * Validation error messages for form fields
 * Uses i18n translations when available, falls back to English
 */
export const validationMessages = {
  // Email validation
  get emailInvalid() {
    return getValidationMessage('email.invalid', 'Invalid email address');
  },
  get emailRequired() {
    return getValidationMessage('email.required', 'Email is required');
  },
  
  // Password validation
  get passwordMinLength() {
    return getValidationMessage('password.minLength', 'Password must be at least 8 characters');
  },
  get passwordRequiresLetter() {
    return getValidationMessage('password.requiresLetter', 'Password must contain at least one letter');
  },
  get passwordRequiresNumber() {
    return getValidationMessage('password.requiresNumber', 'Password must contain at least one number');
  },
  get passwordRequired() {
    return getValidationMessage('password.required', 'Password is required');
  },
  get passwordsDontMatch() {
    return getValidationMessage('password.dontMatch', "Passwords don't match");
  },
  
  // Name validation
  get nameMinLength() {
    return getValidationMessage('name.minLength', 'Name must be at least 2 characters');
  },
  get nameMaxLength() {
    return getValidationMessage('name.maxLength', 'Name must be less than 50 characters');
  },
  get nameRequired() {
    return getValidationMessage('name.required', 'Name is required');
  },
} as const;

