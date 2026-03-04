'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUserDataContext } from '@/contexts/UserDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { updateLanguagePreference } from '@/lib/api';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE, getLanguageByCode } from '@/config/languages';
import { getGuestLanguagePreference, setGuestLanguagePreference } from '@/utils/cookies';

interface UseLanguagePreferenceReturn {
  currentLanguage: string; // ISO code
  currentLanguageLabel: string; // Native name for display
  availableLanguages: Array<{ value: string; label: string }>;
  isChanging: boolean;
  changeLanguage: (newLanguageCode: string) => Promise<boolean>;
}

/**
 * Unified hook for managing user language preference
 * 
 * This hook:
 * - Reads from user.language_preference (authenticated users) or cookie (guest users)
 * - Updates language preference via dedicated API (authenticated) or cookie (guest)
 * - Immediately applies change to i18n
 * - Invalidates cache and refetches user data (authenticated only)
 * - Shows success/error toasts
 * 
 * Phase 2: Guest Language Preference Support
 * - Guest users: language preference stored in cookie
 * - Authenticated users: language preference stored in user account
 * 
 * Usage:
 * ```tsx
 * const { currentLanguage, availableLanguages, changeLanguage } = useLanguagePreference();
 * 
 * <SelectDropdown
 *   value={currentLanguage}
 *   options={availableLanguages}
 *   onValueChange={changeLanguage}
 * />
 * ```
 */
export function useLanguagePreference(): UseLanguagePreferenceReturn {
  const { user, refetchUserData } = useUserDataContext();
  const { isGuest } = useAuth();
  const { changeLanguage: changeI18nLanguage, currentLanguage: i18nLanguage } = useLanguage();
  const toast = useToast();
  const [isChanging, setIsChanging] = useState(false);

  // Get current language with priority:
  // 1. i18n's current language (what's actually displayed)
  // 2. user.language_preference (if authenticated)
  // 3. guest language cookie (if guest)
  // 4. default language
  // This ensures the dropdown always matches what's shown in the UI
  const currentLanguage = useMemo(() => {
    if (i18nLanguage) return i18nLanguage;
    if (user?.language_preference) return user.language_preference;
    if (isGuest) {
      const cookieLang = getGuestLanguagePreference();
      if (cookieLang) return cookieLang;
    }
    return DEFAULT_LANGUAGE_CODE;
  }, [i18nLanguage, user?.language_preference, isGuest]);

  // Get display label for current language
  const currentLanguageInfo = getLanguageByCode(currentLanguage);
  const currentLanguageLabel = currentLanguageInfo?.label || 'English';

  // Available languages for dropdown (from centralized config, not hardcoded)
  const availableLanguages = SUPPORTED_LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.label,
  }));

  /**
   * Change language preference
   * 
   * For authenticated users:
   * 1. Update backend user.language_preference via API
   * 2. Update i18n immediately
   * 3. Invalidate cache and refetch user data
   * 4. Show success toast
   * 
   * For guest users:
   * 1. Save to cookie
   * 2. Update i18n immediately
   * 3. Show success toast
   */
  const changeLanguage = useCallback(async (newLanguageCode: string): Promise<boolean> => {
    if (isChanging) return false;
    
    // Validate language code against centralized config (not hardcoded)
    const isValidLanguage = SUPPORTED_LANGUAGES.some(
      lang => lang.code === newLanguageCode
    );
    if (!isValidLanguage) {
      toast.error(`Invalid language code: ${newLanguageCode}`);
      return false;
    }

    // Don't update if it's already the current language
    if (newLanguageCode === currentLanguage) {
      return true;
    }

    setIsChanging(true);

    try {
      // 1. Update i18n immediately (don't wait for backend/cookie)
      await changeI18nLanguage(newLanguageCode);

      if (isGuest) {
        // Guest user: save to cookie (no API call needed)
        setGuestLanguagePreference(newLanguageCode);
        
        // Success feedback
        const newLanguageInfo = getLanguageByCode(newLanguageCode);
        const newLanguageLabel = newLanguageInfo?.nativeName || newLanguageCode;
        toast.success(`Language changed to ${newLanguageLabel}`);
        
        return true;
      } else {
        // Authenticated user: save to backend via API
        const response = await updateLanguagePreference(newLanguageCode);

        if (response.error) {
          toast.error(response.error.message || 'Failed to update language preference');
          return false;
        }

        // Invalidate cache and refetch user data
        await refetchUserData();

        // Success feedback
        const newLanguageInfo = getLanguageByCode(newLanguageCode);
        const newLanguageLabel = newLanguageInfo?.nativeName || newLanguageCode;
        toast.success(`Language changed to ${newLanguageLabel}`);
        
        return true;
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error('Failed to update language preference');
      return false;
    } finally {
      setIsChanging(false);
    }
  }, [isChanging, currentLanguage, changeI18nLanguage, refetchUserData, toast, isGuest]);

  return {
    currentLanguage,
    currentLanguageLabel,
    availableLanguages,
    isChanging,
    changeLanguage,
  };
}
