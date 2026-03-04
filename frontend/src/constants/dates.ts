/**
 * Centralized date constants (mirror backend constants/dates.ts)
 * Use everywhere we display video publish dates so missing dates are handled in one place.
 */

/** Fallback when video upload/publish date is unavailable. Use only at display boundary. */
export const VIDEO_DATE_UNKNOWN = 'Unknown';

/**
 * Return a safe display value for video upload date.
 * Use when building citation metadata or UI; prefer passing through real values from API.
 */
export function ensureVideoUploadDate(value: string | undefined | null): string {
  if (value != null && String(value).trim() !== '') {
    return value.trim();
  }
  return VIDEO_DATE_UNKNOWN;
}
