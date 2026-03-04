/**
 * Regression: Video publish date must never be lost at the display boundary.
 * ensureVideoUploadDate is the single fallback; all callers should pass through
 * real values from the pipeline (transcript → sourceVideo → citation map).
 */
import { VIDEO_DATE_UNKNOWN, ensureVideoUploadDate } from '../../../src/constants/dates';

describe('constants/dates', () => {
  describe('ensureVideoUploadDate', () => {
    it('returns value when present and non-empty', () => {
      expect(ensureVideoUploadDate('2024-01-15')).toBe('2024-01-15');
      expect(ensureVideoUploadDate('2 months ago')).toBe('2 months ago');
    });

    it('trims whitespace but preserves value', () => {
      expect(ensureVideoUploadDate('  2024-01-15  ')).toBe('2024-01-15');
    });

    it('returns VIDEO_DATE_UNKNOWN when undefined, null, or empty', () => {
      expect(ensureVideoUploadDate(undefined)).toBe(VIDEO_DATE_UNKNOWN);
      expect(ensureVideoUploadDate(null)).toBe(VIDEO_DATE_UNKNOWN);
      expect(ensureVideoUploadDate('')).toBe(VIDEO_DATE_UNKNOWN);
      expect(ensureVideoUploadDate('   ')).toBe(VIDEO_DATE_UNKNOWN);
    });
  });

  describe('VIDEO_DATE_UNKNOWN', () => {
    it('is the single fallback string used in citations', () => {
      expect(VIDEO_DATE_UNKNOWN).toBe('Unknown');
    });
  });
});
