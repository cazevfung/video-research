import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE_CODE } from '@/config/languages';

/**
 * Safe Date Utility Functions
 * Centralized date parsing and formatting logic that handles invalid dates gracefully
 * 
 * This utility provides safe date handling across the application to prevent
 * "Invalid time value" errors when dealing with corrupted or missing date data.
 * 
 * Date formatting now supports localization via Intl.DateTimeFormat when using
 * common format strings. Falls back to date-fns for unmapped formats.
 */

/**
 * Mapping from date-fns format strings to Intl.DateTimeFormat options
 * This allows us to use localized formatting while maintaining compatibility
 * with existing format strings used throughout the codebase.
 */
const FORMAT_MAP: Record<string, Intl.DateTimeFormatOptions> = {
  // 'PPp' - Preset format: "Month DD, YYYY at HH:MM AM/PM" (e.g., "Jan 15, 2026 at 1:44 PM")
  'PPp': {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
  // 'MMM d, yyyy h:mm a' - Custom format: "Jan 15, 2026 1:44 PM"
  'MMM d, yyyy h:mm a': {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
  // 'MMM d, h:mm a' - Custom format: "Jan 15, 1:44 PM" (no year)
  'MMM d, h:mm a': {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
  // 'MMMM d, yyyy' - Custom format: "January 15, 2026"
  'MMMM d, yyyy': {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  // 'MMM d, yyyy' - Custom format: "Jan 15, 2026" (no time)
  'MMM d, yyyy': {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
};

/**
 * Check if a date value is valid
 * @param date - Date value to validate (string, Date, null, or undefined)
 * @returns true if the date is valid, false otherwise
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  } catch {
    return false;
  }
}

/**
 * Safely parse a date value into a Date object
 * @param date - Date value to parse (string, Date, null, or undefined)
 * @returns Date object if valid, null otherwise
 */
export function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
      return dateObj;
    }
  } catch {
    // Invalid date, return null
  }
  
  return null;
}

/**
 * Safely format a date value using localized Intl.DateTimeFormat or date-fns
 * 
 * This function now supports localization for common format strings. If a format
 * string is mapped in FORMAT_MAP, it will use Intl.DateTimeFormat with the provided
 * locale. Otherwise, it falls back to date-fns for backward compatibility.
 * 
 * @param date - Date value to format (string, Date, null, or undefined)
 * @param formatStr - Format string (e.g., 'PPp', 'MMM d, yyyy h:mm a')
 * @param fallback - Fallback text to display if date is invalid (default: 'Unknown date')
 * @param locale - Optional locale code (e.g., 'en', 'es', 'fr'). If not provided, uses DEFAULT_LANGUAGE_CODE from config
 * @returns Formatted date string or fallback text
 */
export function safeFormatDate(
  date: string | Date | null | undefined,
  formatStr: string,
  fallback: string = 'Unknown date',
  locale?: string
): string {
  const parsedDate = parseDate(date);
  
  if (!parsedDate) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[safeFormatDate] Invalid date encountered:', date);
    }
    return fallback;
  }
  
  try {
    // Check if format string has a mapping to Intl.DateTimeFormat options
    const intlOptions = FORMAT_MAP[formatStr];
    
    if (intlOptions) {
      // Use Intl.DateTimeFormat for localized formatting
      const localeToUse = locale || DEFAULT_LANGUAGE_CODE;
      return new Intl.DateTimeFormat(localeToUse, intlOptions).format(parsedDate);
    } else {
      // Fall back to date-fns for unmapped format strings
      return format(parsedDate, formatStr);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[safeFormatDate] Format error:', error, 'Date:', parsedDate, 'Format:', formatStr);
    }
    return fallback;
  }
}

/**
 * Get days since a date
 * Safely calculates the number of days since a given date
 * @param date - Date value (string, Date, null, or undefined)
 * @param defaultValue - Default value to return if date is invalid (default: 0)
 * @returns Number of days since the date, or defaultValue if invalid
 */
export function getDaysSince(
  date: string | Date | null | undefined,
  defaultValue: number = 0
): number {
  const parsedDate = parseDate(date);
  
  if (!parsedDate) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getDaysSince] Invalid date encountered:', date);
    }
    return defaultValue;
  }
  
  try {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - parsedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getDaysSince] Error calculating days since:', error, 'Date:', parsedDate);
    }
    return defaultValue;
  }
}

/**
 * Get timestamp for safe date comparison
 * Safely gets the timestamp (getTime()) for a date, useful for sorting
 * @param date - Date value (string, Date, null, or undefined)
 * @param defaultValue - Default timestamp to return if date is invalid (default: 0)
 * @returns Timestamp in milliseconds, or defaultValue if invalid
 */
export function getDateTimestamp(
  date: string | Date | null | undefined,
  defaultValue: number = 0
): number {
  const parsedDate = parseDate(date);
  
  if (!parsedDate) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getDateTimestamp] Invalid date encountered:', date);
    }
    return defaultValue;
  }
  
  try {
    return parsedDate.getTime();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getDateTimestamp] Error getting timestamp:', error, 'Date:', parsedDate);
    }
    return defaultValue;
  }
}

/**
 * React hook version of safeFormatDate that automatically uses the current i18n language
 * 
 * This hook retrieves the current language from react-i18next and passes it to
 * safeFormatDate for automatic localization.
 * 
 * @param date - Date value to format (string, Date, null, or undefined)
 * @param formatStr - Format string (e.g., 'PPp', 'MMM d, yyyy h:mm a')
 * @param fallback - Fallback text to display if date is invalid (default: 'Unknown date')
 * @returns Formatted date string or fallback text
 * 
 * @example
 * ```tsx
 * const formattedDate = useSafeFormatDate(summary.created_at, 'PPp', 'Unknown date');
 * ```
 */
export function useSafeFormatDate(
  date: string | Date | null | undefined,
  formatStr: string,
  fallback: string = 'Unknown date'
): string {
  const { i18n } = useTranslation();
  return safeFormatDate(date, formatStr, fallback, i18n.language);
}

