/**
 * Date and number formatting utilities
 * Uses Intl API for locale-aware formatting based on current i18n language
 */

import { useTranslation } from 'react-i18next';

/**
 * Format a date using the current locale
 * @param date Date to format (Date object or ISO string)
 * @param options Intl.DateTimeFormatOptions (optional)
 * @returns Formatted date string
 */
export function useFormattedDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const { i18n } = useTranslation();
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  return new Intl.DateTimeFormat(i18n.language, formatOptions).format(new Date(date));
}

/**
 * Format a number using the current locale
 * @param value Number to format
 * @param options Intl.NumberFormatOptions (optional)
 * @returns Formatted number string
 */
export function useFormattedNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const { i18n } = useTranslation();
  
  return new Intl.NumberFormat(i18n.language, options).format(value);
}

/**
 * Format a currency value using the current locale
 * @param value Amount to format
 * @param currency Currency code (default: 'USD')
 * @param options Intl.NumberFormatOptions (optional)
 * @returns Formatted currency string
 */
export function useFormattedCurrency(
  value: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  const { i18n } = useTranslation();
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  return new Intl.NumberFormat(i18n.language, formatOptions).format(value);
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 * @param date Date to format
 * @returns Formatted relative time string
 */
export function useFormattedRelativeTime(date: Date | string): string {
  const { i18n } = useTranslation();
  
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
  
  const intervals = [
    { unit: 'year' as const, seconds: 31536000 },
    { unit: 'month' as const, seconds: 2592000 },
    { unit: 'week' as const, seconds: 604800 },
    { unit: 'day' as const, seconds: 86400 },
    { unit: 'hour' as const, seconds: 3600 },
    { unit: 'minute' as const, seconds: 60 },
    { unit: 'second' as const, seconds: 1 },
  ];
  
  for (const { unit, seconds } of intervals) {
    const interval = Math.floor(Math.abs(diffInSeconds) / seconds);
    if (interval >= 1) {
      return rtf.format(diffInSeconds < 0 ? -interval : interval, unit);
    }
  }
  
  return rtf.format(0, 'second');
}

/**
 * Format a date range
 * @param startDate Start date
 * @param endDate End date
 * @param options Intl.DateTimeFormatOptions (optional)
 * @returns Formatted date range string
 */
export function useFormattedDateRange(
  startDate: Date | string,
  endDate: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const { i18n } = useTranslation();
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  const start = new Intl.DateTimeFormat(i18n.language, formatOptions).format(new Date(startDate));
  const end = new Intl.DateTimeFormat(i18n.language, formatOptions).format(new Date(endDate));
  
  return `${start} - ${end}`;
}

/**
 * Non-hook versions for use outside React components
 * These require the language code to be passed explicitly
 */

/**
 * Format a date using a specific locale
 */
export function formatDate(
  date: Date | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  return new Intl.DateTimeFormat(locale, formatOptions).format(new Date(date));
}

/**
 * Format a number using a specific locale
 */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a currency value using a specific locale
 */
export function formatCurrency(
  value: number,
  locale: string,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  return new Intl.NumberFormat(locale, formatOptions).format(value);
}


