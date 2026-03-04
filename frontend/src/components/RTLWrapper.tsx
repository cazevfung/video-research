'use client';

import { useEffect, useState } from 'react';
import { isRTLLanguage } from '@/utils/language-mapping';
import i18n from '@/lib/i18n';

interface RTLWrapperProps {
  children: React.ReactNode;
}

/**
 * RTL Wrapper Component
 * Sets dir and lang attributes on document based on current language
 * Supports RTL languages from config (not hardcoded)
 * Handles case when i18n isn't initialized yet by using i18n instance directly
 * instead of useTranslation hook to avoid initialization errors
 */
export function RTLWrapper({ children }: RTLWrapperProps) {
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    // Function to update language from i18n
    const updateLanguage = () => {
      if (i18n.isInitialized && i18n.language) {
        setLanguage(i18n.language);
      } else {
        // Default to 'en' if not initialized
        setLanguage('en');
      }
    };

    // Initial update
    updateLanguage();

    // Wait for i18n to be initialized if it's not ready
    if (!i18n.isInitialized) {
      const checkInitialized = setInterval(() => {
        if (i18n.isInitialized) {
          updateLanguage();
          clearInterval(checkInitialized);
        }
      }, 100);
      
      // Listen for language changes once initialized
      i18n.on('languageChanged', updateLanguage);
      
      return () => {
        clearInterval(checkInitialized);
        i18n.off('languageChanged', updateLanguage);
      };
    } else {
      // Already initialized, listen for language changes
      i18n.on('languageChanged', updateLanguage);
      
      return () => {
        i18n.off('languageChanged', updateLanguage);
      };
    }
  }, []);

  const isRTL = isRTLLanguage(language);

  useEffect(() => {
    // Set dir attribute on document element
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    // Cleanup function to reset on unmount (optional, but good practice)
    return () => {
      // Reset to default if needed
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    };
  }, [isRTL, language]);

  return <>{children}</>;
}


