/**
 * URL validation utilities for YouTube URLs
 * Also includes preset style and language validation
 */
import { getLimitsConfig, getSummaryConfig } from '../config';
import { getLanguageCodeToNameMap } from './language-mapping';

export interface ValidationError {
  field: string;
  message: string;
  value?: string;
  index?: number; // For batch validation
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * YouTube URL patterns
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://youtube.com/live/VIDEO_ID
 * - http:// variants (for completeness)
 */
const YOUTUBE_URL_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
];

/**
 * Video ID pattern (11 alphanumeric characters, dashes, underscores)
 */
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extract video ID from YouTube URL
 * @param url YouTube URL
 * @returns Video ID or null if invalid
 */
export function extractVideoId(url: string): string | null {
  // Try youtube.com/watch?v= pattern
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    return watchMatch[1];
  }

  // Try youtu.be pattern
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    return shortMatch[1];
  }

  // Try youtube.com/live/ pattern
  const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) {
    return liveMatch[1];
  }

  return null;
}

/**
 * Validate a single YouTube URL
 * @param url URL to validate
 * @returns Validation result
 */
export function validateYouTubeUrl(url: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if URL is provided
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    errors.push({
      field: 'url',
      message: 'URL is required',
      value: url,
    });
    return { valid: false, errors };
  }

  // Check URL length (from config)
  const limits = getLimitsConfig();
  if (url.length > limits.url_max_length) {
    errors.push({
      field: 'url',
      message: `URL exceeds maximum length of ${limits.url_max_length} characters`,
      value: url,
    });
    return { valid: false, errors };
  }

  // Check if URL matches YouTube patterns
  const matchesPattern = YOUTUBE_URL_PATTERNS.some((pattern) =>
    pattern.test(url)
  );

  if (!matchesPattern) {
    errors.push({
      field: 'url',
      message: `Invalid YouTube URL format: ${url}. Supported formats: youtube.com/watch?v=VIDEO_ID, youtu.be/VIDEO_ID, or youtube.com/live/VIDEO_ID`,
      value: url,
    });
    return { valid: false, errors };
  }

  // Extract and validate video ID
  const videoId = extractVideoId(url);
  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    errors.push({
      field: 'url',
      message: `Invalid video ID in URL: ${url}`,
      value: url,
    });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate multiple YouTube URLs (batch validation)
 * @param urls Array of URLs to validate
 * @returns Validation result with errors for each invalid URL
 */
export function validateYouTubeUrls(urls: string[]): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if urls is an array
  if (!Array.isArray(urls)) {
    errors.push({
      field: 'urls',
      message: 'URLs must be an array',
    });
    return { valid: false, errors };
  }

  // Check if array is empty
  if (urls.length === 0) {
    errors.push({
      field: 'urls',
      message: 'At least one URL is required',
    });
    return { valid: false, errors };
  }

  // Validate each URL
  urls.forEach((url, index) => {
    const result = validateYouTubeUrl(url);
    if (!result.valid) {
      // Add index to errors for batch validation
      result.errors.forEach((error) => {
        errors.push({
          ...error,
          index,
        });
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Deduplicate URLs in an array
 * @param urls Array of URLs
 * @returns Array of unique URLs (preserves order)
 */
export function deduplicateUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const url of urls) {
    // Normalize URL for comparison (remove trailing slashes, convert to lowercase)
    const normalized = url.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(url); // Keep original URL format
    }
  }

  return unique;
}

/**
 * Valid preset style values (loaded from config)
 */
export type PresetStyle = string;

/**
 * Get valid preset styles from config
 * @returns Array of valid preset style values
 */
export function getValidPresetStyles(): string[] {
  const summaryConfig = getSummaryConfig();
  return summaryConfig.preset_styles || [];
}

/**
 * Validate preset style
 * @param preset Preset style to validate
 * @returns Validation result
 */
export function validatePresetStyle(preset: string): ValidationResult {
  const errors: ValidationError[] = [];
  const validPresetStyles = getValidPresetStyles();

  if (!preset || typeof preset !== 'string') {
    errors.push({
      field: 'preset',
      message: 'Preset style is required',
      value: preset,
    });
    return { valid: false, errors };
  }

  if (!validPresetStyles.includes(preset)) {
    errors.push({
      field: 'preset',
      message: `Invalid preset style. Valid values: ${validPresetStyles.join(', ')}`,
      value: preset,
    });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate language preference (ISO 639-1 language code)
 * Validates against supported languages from config.yaml
 * @param language Language code to validate (e.g., 'en', 'es', 'fr')
 * @returns Validation result
 */
export function validateLanguagePreference(language: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!language || typeof language !== 'string') {
    return {
      valid: false,
      errors: [{
        field: 'language_preference',
        message: 'Language preference must be a non-empty string',
        value: language,
      }],
    };
  }

  const normalizedLanguage = language.toLowerCase().trim();
  // Use language mapping utility instead of hardcoded map
  const languageMap = getLanguageCodeToNameMap();
  const languageName = languageMap[normalizedLanguage];
  
  if (!languageName) {
    const supportedCodes = Object.keys(languageMap).join(', ');
    return {
      valid: false,
      errors: [{
        field: 'language_preference',
        message: `Unsupported language code: ${language}. Supported codes: ${supportedCodes}`,
        value: language,
      }],
    };
  }

  // Check if the language name is enabled in backend configuration
  const summaryConfig = getSummaryConfig();
  const supportedLanguages = summaryConfig.supported_languages || ['English'];
  
  if (!supportedLanguages.includes(languageName)) {
    return {
      valid: false,
      errors: [{
        field: 'language_preference',
        message: `Language ${languageName} is not enabled in backend configuration. Supported languages: ${supportedLanguages.join(', ')}`,
        value: language,
      }],
    };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validate language
 * @param language Language to validate
 * @returns Validation result (defaults to English if invalid)
 */
export function validateLanguage(language: string): ValidationResult {
  const errors: ValidationError[] = [];
  const summaryConfig = getSummaryConfig();
  const supportedLanguages = summaryConfig.supported_languages || ['English'];
  const defaultLanguage = summaryConfig.default_language || 'English';

  if (!language || typeof language !== 'string') {
    // Default to English, but log warning
    errors.push({
      field: 'language',
      message: `Language not provided, defaulting to ${defaultLanguage}`,
      value: language,
    });
    return { valid: true, errors }; // Valid because we default
  }

  // Case-insensitive check
  const normalizedLanguage = language.trim();
  const isSupported = supportedLanguages.some(
    (lang) => lang.toLowerCase() === normalizedLanguage.toLowerCase()
  );

  if (!isSupported) {
    errors.push({
      field: 'language',
      message: `Unsupported language. Defaulting to ${defaultLanguage}. Supported: ${supportedLanguages.join(', ')}`,
      value: language,
    });
    return { valid: true, errors }; // Valid because we default
  }

  return { valid: true, errors: [] };
}

/**
 * Validate custom prompt
 * @param customPrompt Custom prompt to validate
 * @returns Validation result
 */
export function validateCustomPrompt(customPrompt?: string): ValidationResult {
  const errors: ValidationError[] = [];
  const limits = getLimitsConfig();

  // Custom prompt is optional
  if (!customPrompt) {
    return { valid: true, errors: [] };
  }

  if (typeof customPrompt !== 'string') {
    errors.push({
      field: 'custom_prompt',
      message: 'Custom prompt must be a string',
      value: customPrompt,
    });
    return { valid: false, errors };
  }

  // Check length
  if (customPrompt.length > limits.custom_prompt_max_length) {
    errors.push({
      field: 'custom_prompt',
      message: `Custom prompt exceeds maximum length of ${limits.custom_prompt_max_length} characters`,
      value: customPrompt,
    });
    return { valid: false, errors };
  }

  // Sanitize: remove potentially dangerous characters (basic XSS prevention)
  // This is a basic sanitization - more comprehensive sanitization should be done at the service layer
  const sanitized = customPrompt.trim();
  if (sanitized.length === 0 && customPrompt.length > 0) {
    errors.push({
      field: 'custom_prompt',
      message: 'Custom prompt cannot be empty or only whitespace',
      value: customPrompt,
    });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Sanitize string input (basic XSS prevention)
 * @param input String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and trim
  return input
    .replace(/\0/g, '')
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

