/**
 * Centralized normalization for created_at and other date fields in API responses.
 * Use everywhere we return summary/research creation dates so missing or invalid
 * dates are handled in one place and never break the client.
 */

import logger from './logger';

/**
 * Normalize a created_at (or any date) value to a valid ISO string for API responses.
 * Use when returning summary.created_at, research.created_at, etc.
 *
 * @param date Value from model (Date, ISO string, or undefined)
 * @param itemId Item identifier for logging (e.g. summary.id)
 * @param itemType Label for logging (e.g. 'Summary', 'Research')
 * @param context Optional context (e.g. userId) for logging
 * @returns Valid ISO date string; falls back to current time if missing/invalid
 */
export function normalizeCreatedAtToISO(
  date: Date | string | undefined,
  itemId: string,
  itemType: string,
  context?: Record<string, unknown>
): string {
  if (!date) {
    logger.warn(`${itemType} missing created_at field`, { itemId, ...context });
    return new Date().toISOString();
  }

  if (typeof date === 'string') {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      logger.warn(`${itemType} has invalid created_at date string`, {
        itemId,
        invalidDate: date,
        ...context,
      });
      return new Date().toISOString();
    }
    return date;
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      logger.warn(`${itemType} has invalid created_at Date object`, { itemId, ...context });
      return new Date().toISOString();
    }
    return date.toISOString();
  }

  logger.warn(`${itemType} has unexpected created_at type`, {
    itemId,
    type: typeof date,
    ...context,
  });
  return new Date().toISOString();
}
