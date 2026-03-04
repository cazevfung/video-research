'use client';

import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { useTranslation } from 'react-i18next';

/**
 * Language Selector Component
 * 
 * Uses the unified language preference system:
 * - Reads from user.language_preference (single source of truth)
 * - Updates via dedicated API endpoint
 * - Immediately applies to UI
 * - Syncs across entire app
 * 
 * Language options are NOT hardcoded - they come from config/languages.ts
 * which syncs with backend config.yaml
 */
export function LanguageSelector() {
  const { t, ready } = useTranslation('settings', { useSuspense: false });
  const {
    currentLanguage,
    availableLanguages,
    isChanging,
    changeLanguage,
  } = useLanguagePreference();

  // Fallback labels if translations aren't ready
  const label = ready ? t('general.language.label', 'Language') : 'Language';
  const description = ready ? t('general.language.description', 'Select your preferred language') : 'Select your preferred language';

  return (
    <SelectDropdown
      value={currentLanguage}
      onValueChange={changeLanguage}
      options={availableLanguages}
      label={label}
      description={description}
      disabled={isChanging}
    />
  );
}


