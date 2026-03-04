'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useUserDataContext } from './UserDataContext';
import { updateUserProfile } from '../lib/api';
import { getGuestLanguagePreference } from '@/utils/cookies';
import { DEFAULT_LANGUAGE_CODE } from '@/config/languages';
import i18n from 'i18next';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  isLoading: boolean;
  refetchFromUser: () => void; // Phase 2: Refetch language from user profile
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * LanguageProvider
 * Manages application language state and synchronization
 * 
 * Phase 1 Fix: Enhanced defensive initialization checks
 * - Uses i18n.on('initialized') event for proper async waiting
 * - Eliminates race conditions with proper event handling
 * 
 * Phase 3: Guest Language Preference Support
 * - Initializes language from guest cookie for guest users
 * - Priority: user preference > guest cookie > localStorage > browser > default
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(i18n.isInitialized);
  const { i18n: i18nInstance } = useTranslation();
  const { isAuthenticated, isGuest } = useAuth();
  const { user } = useUserDataContext(); // Backend User type with language_preference
  const [isLoading, setIsLoading] = useState(false);

  // Defensive initialization check - wait for i18n to be fully initialized
  useEffect(() => {
    if (i18n.isInitialized) {
      setIsReady(true);
    } else {
      // Fallback: Listen for initialization event (should rarely happen with sync init)
      const onInit = () => setIsReady(true);
      i18n.on('initialized', onInit);
      
      return () => {
        i18n.off('initialized', onInit);
      };
    }
  }, []);

  // Initialize language with priority:
  // 1. user.language_preference (if authenticated)
  // 2. guest language cookie (if guest)
  // 3. localStorage i18nextLng
  // 4. browser language (handled by i18n default)
  // 5. default language ('en')
  useEffect(() => {
    if (!isReady) return;
    
    // Priority 1: Authenticated user preference
    if (isAuthenticated && user?.language_preference) {
      i18n.changeLanguage(user.language_preference);
      return;
    }
    
    // Priority 2: Guest user cookie
    if (isGuest) {
      const cookieLang = getGuestLanguagePreference();
      if (cookieLang) {
        i18n.changeLanguage(cookieLang);
        return;
      }
    }
    
    // Priority 3: localStorage (fallback for both guest and authenticated)
    const storedLang = localStorage.getItem('i18nextLng');
    if (storedLang) {
      i18n.changeLanguage(storedLang);
      return;
    }
    
    // Priority 4 & 5: Browser language or default (handled by i18n)
    // i18n will use browser language if available, otherwise default
  }, [isReady, isAuthenticated, isGuest, user?.language_preference]);

  // Phase 2: Add method to refetch language from user profile or guest cookie
  const refetchFromUser = useCallback(() => {
    if (!isReady) return;
    
    // Priority 1: Authenticated user preference
    if (isAuthenticated && user?.language_preference) {
      i18n.changeLanguage(user.language_preference);
      return;
    }
    
    // Priority 2: Guest user cookie
    if (isGuest) {
      const cookieLang = getGuestLanguagePreference();
      if (cookieLang) {
        i18n.changeLanguage(cookieLang);
        return;
      }
    }
    
    // Fallback to localStorage
    const storedLang = localStorage.getItem('i18nextLng');
    if (storedLang) {
      i18n.changeLanguage(storedLang);
    }
  }, [isReady, isAuthenticated, isGuest, user?.language_preference]);

  /**
   * Change the application language
   * 
   * Phase 1 Fix: Removed legacy settings.language update
   * - Only updates user profile (language_preference)
   * - settings.language field was removed in backend unification
   * - Fails gracefully if backend sync fails (UI still changes)
   */
  const changeLanguage = async (lang: string) => {
    if (!isReady) {
      console.warn('i18n not ready yet');
      return;
    }
    
    setIsLoading(true);
    try {
      // 1. Update i18n immediately for instant UI response
      await i18n.changeLanguage(lang);
      
      // 2. Save to localStorage for persistence
      localStorage.setItem('i18nextLng', lang);
      
      // 3. Sync to backend if user is authenticated
      if (isAuthenticated && user) {
        try {
          await updateUserProfile({ language_preference: lang });
        } catch (error) {
          console.error('Failed to sync language to backend:', error);
          // Don't fail the language change if backend sync fails
          // User will still see the language change in UI
        }
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    // Return a minimal provider while waiting for i18n
    return (
      <LanguageContext.Provider
        value={{
          currentLanguage: DEFAULT_LANGUAGE_CODE,
          changeLanguage: async () => {},
          isLoading: true,
          refetchFromUser: () => {},
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage: i18n.language || DEFAULT_LANGUAGE_CODE,
        changeLanguage,
        isLoading,
        refetchFromUser,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}


