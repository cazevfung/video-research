/**
 * Centralized date constants and helpers
 * Use these everywhere we display or pass video publish dates so missing dates
 * are handled in one place and never lost in the pipeline.
 *
 * For summary/research creation dates (created_at):
 * - Always set created_at when creating records (e.g. Timestamp.now(), new Date()).
 * - When returning in API responses, use utils/date-normalizer.normalizeCreatedAtToISO().
 */

/** Fallback when video upload/publish date is unavailable. Use only at display boundary. */
export const VIDEO_DATE_UNKNOWN = 'Unknown';

/**
 * Return a safe display value for video upload date.
 * Use when building citation metadata or UI; prefer passing through real values in the pipeline.
 */
export function ensureVideoUploadDate(value: string | undefined | null): string {
  if (value != null && String(value).trim() !== '') {
    return value.trim();
  }
  return VIDEO_DATE_UNKNOWN;
}
