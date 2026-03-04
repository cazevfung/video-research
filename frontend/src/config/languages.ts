/**
 * Language Configuration
 * Centralized configuration for all supported languages
 * Syncs with backend config.yaml supported_languages
 * 
 * DO NOT HARDCODE - This configuration should match backend/config.yaml
 */

export interface LanguageOption {
  code: string;           // ISO 639-1 code (e.g., 'en', 'es')
  label: string;          // Display label with native name
  fullName: string;       // Full English name (matches backend)
  nativeName: string;     // Native language name
  dir: 'ltr' | 'rtl';    // Text direction
}

/**
 * Language code to full name mapping
 * Must match backend/config.yaml summary.supported_languages
 */
export const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'zh': 'Chinese (Simplified)',
  'zh-tw': 'Chinese (Traditional)',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt': 'Portuguese',
  'it': 'Italian',
  'ru': 'Russian',
  'ar': 'Arabic',
};

/**
 * Full name to language code mapping (reverse of above)
 */
export const LANGUAGE_NAME_TO_CODE: Record<string, string> = Object.entries(
  LANGUAGE_CODE_TO_NAME
).reduce((acc, [code, name]) => {
  acc[name] = code;
  return acc;
}, {} as Record<string, string>);

/**
 * All supported languages with complete metadata
 * Used by LanguageSelector component
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    fullName: 'English',
    nativeName: 'English',
    dir: 'ltr',
  },
  {
    code: 'es',
    label: 'Español',
    fullName: 'Spanish',
    nativeName: 'Español',
    dir: 'ltr',
  },
  {
    code: 'fr',
    label: 'Français',
    fullName: 'French',
    nativeName: 'Français',
    dir: 'ltr',
  },
  {
    code: 'de',
    label: 'Deutsch',
    fullName: 'German',
    nativeName: 'Deutsch',
    dir: 'ltr',
  },
  {
    code: 'zh',
    label: '简体中文',
    fullName: 'Chinese (Simplified)',
    nativeName: '简体中文',
    dir: 'ltr',
  },
  {
    code: 'zh-tw',
    label: '繁體中文',
    fullName: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    dir: 'ltr',
  },
  {
    code: 'ja',
    label: '日本語',
    fullName: 'Japanese',
    nativeName: '日本語',
    dir: 'ltr',
  },
  {
    code: 'ko',
    label: '한국어',
    fullName: 'Korean',
    nativeName: '한국어',
    dir: 'ltr',
  },
  {
    code: 'pt',
    label: 'Português',
    fullName: 'Portuguese',
    nativeName: 'Português',
    dir: 'ltr',
  },
  {
    code: 'it',
    label: 'Italiano',
    fullName: 'Italian',
    nativeName: 'Italiano',
    dir: 'ltr',
  },
  {
    code: 'ru',
    label: 'Русский',
    fullName: 'Russian',
    nativeName: 'Русский',
    dir: 'ltr',
  },
  {
    code: 'ar',
    label: 'العربية',
    fullName: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
  },
];

/**
 * RTL (Right-to-Left) languages
 */
export const RTL_LANGUAGES = ['ar', 'he', 'fa'];

/**
 * Get language option by code
 */
export function getLanguageByCode(code: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Get language option by full name
 */
export function getLanguageByFullName(name: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.fullName === name);
}

/**
 * Check if a language code is RTL
 */
export function isRTL(languageCode: string): boolean {
  return RTL_LANGUAGES.includes(languageCode);
}

/**
 * Format language options for SelectDropdown component
 */
export function getLanguageOptionsForDropdown() {
  return SUPPORTED_LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.label,
  }));
}

/**
 * Default language code
 */
export const DEFAULT_LANGUAGE_CODE = 'en';


