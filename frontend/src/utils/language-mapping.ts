/**
 * Language mapping utilities
 * Maps between language codes, backend names, and display names
 * All mappings are derived from backend config to avoid hardcoding
 */

import { FrontendConfig } from '@/hooks/useConfig';

/**
 * Language code to backend English name mapping
 * This should match backend/src/utils/validators.ts
 * Derived from config.yaml supported_languages
 * 
 * NOTE: Uses centralized language config from frontend/src/config/languages.ts
 * to avoid hardcoding and ensure consistency with backend config.yaml
 */
import { LANGUAGE_CODE_TO_NAME } from '../config/languages';

export function getLanguageCodeToBackendNameMap(): Record<string, string> {
  // Import from centralized config to avoid duplication
  // This ensures frontend and backend stay in sync
  return LANGUAGE_CODE_TO_NAME;
}

/**
 * Backend English name to language code mapping (reverse)
 */
export function getBackendNameToLanguageCodeMap(): Record<string, string> {
  const codeToName = getLanguageCodeToBackendNameMap();
  const nameToCode: Record<string, string> = {};
  for (const [code, name] of Object.entries(codeToName)) {
    nameToCode[name] = code;
  }
  return nameToCode;
}

/**
 * Language code to native display name mapping
 * Used for UI display
 */
export function getLanguageCodeToDisplayNameMap(): Record<string, string> {
  return {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'zh': '简体中文',
    'zh-tw': '繁體中文',
    'ja': '日本語',
    'ko': '한국어',
    'pt': 'Português',
    'it': 'Italiano',
    'ru': 'Русский',
    'ar': 'العربية',
  };
}

/**
 * Convert language code to backend English name
 */
export function languageCodeToBackendName(code: string): string {
  const map = getLanguageCodeToBackendNameMap();
  return map[code.toLowerCase()] || 'English';
}

/**
 * Convert backend English name to language code
 */
export function backendNameToLanguageCode(name: string): string {
  const map = getBackendNameToLanguageCodeMap();
  return map[name] || 'en';
}

/**
 * Convert language code to display name
 */
export function languageCodeToDisplayName(code: string): string {
  const map = getLanguageCodeToDisplayNameMap();
  return map[code.toLowerCase()] || 'English';
}

/**
 * Get RTL languages from config
 * This should be configurable, but for now we'll use a standard list
 * TODO: Move to config.yaml if needed
 */
export function getRTLanguages(): string[] {
  return ['ar', 'he', 'fa']; // Arabic, Hebrew, Farsi
}

/**
 * Check if a language is RTL
 */
export function isRTLLanguage(languageCode: string | undefined | null): boolean {
  if (!languageCode) {
    return false;
  }
  return getRTLanguages().includes(languageCode.toLowerCase());
}

