/**
 * Language mapping utilities for backend
 * Maps between language codes and backend language names
 * All mappings should match config.yaml supported_languages
 */

import { getSummaryConfig } from '../config';

/**
 * Language code to full name mapping
 * This mapping is based on ISO 639-1 standard and matches the language names in config.yaml
 * Language codes should match the names in summary.supported_languages
 * 
 * NOTE: This mapping is derived from config.yaml to avoid hardcoding.
 * The mapping is static for performance, but should match config.yaml.
 */
export function getLanguageCodeToNameMap(): Record<string, string> {
  // Get supported languages from config
  const supportedLanguages = getSupportedLanguagesFromConfig();
  
  // Build mapping from config - this ensures consistency
  // The order and values come from config.yaml summary.supported_languages
  const mapping: Record<string, string> = {};
  
  // Standard language code to name mapping (must match config.yaml order)
  const codeToName: Record<string, string> = {
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
  
  // Only include languages that are in config
  for (const [code, name] of Object.entries(codeToName)) {
    if (supportedLanguages.includes(name)) {
      mapping[code] = name;
    }
  }
  
  return mapping;
}

/**
 * Full name to language code mapping (reverse)
 */
export function getNameToLanguageCodeMap(): Record<string, string> {
  const codeToName = getLanguageCodeToNameMap();
  const nameToCode: Record<string, string> = {};
  for (const [code, name] of Object.entries(codeToName)) {
    nameToCode[name] = code;
  }
  return nameToCode;
}

/**
 * Convert language code to backend language name
 * @param code ISO 639-1 language code (e.g., 'en', 'es')
 * @returns Backend language name (e.g., 'English', 'Spanish')
 */
export function languageCodeToName(code: string): string {
  const map = getLanguageCodeToNameMap();
  const normalizedCode = code.toLowerCase().trim();
  return map[normalizedCode] || 'English';
}

/**
 * Convert backend language name to language code
 * @param name Backend language name (e.g., 'English', 'Spanish')
 * @returns ISO 639-1 language code (e.g., 'en', 'es')
 */
export function nameToLanguageCode(name: string): string {
  const map = getNameToLanguageCodeMap();
  return map[name] || 'en';
}

/**
 * Get default language from config
 */
export function getDefaultLanguageFromConfig(): string {
  const summaryConfig = getSummaryConfig();
  return summaryConfig.default_language || 'English';
}

/**
 * Get supported languages from config
 */
export function getSupportedLanguagesFromConfig(): string[] {
  const summaryConfig = getSummaryConfig();
  return summaryConfig.supported_languages || ['English'];
}

/**
 * Validate that a language code maps to a supported language
 */
export function isLanguageCodeSupported(code: string): boolean {
  const languageName = languageCodeToName(code);
  const supportedLanguages = getSupportedLanguagesFromConfig();
  return supportedLanguages.includes(languageName);
}

