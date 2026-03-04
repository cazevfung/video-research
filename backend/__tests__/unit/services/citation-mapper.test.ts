/**
 * Regression: Citation map must preserve video upload_date when present.
 * If the pipeline (transcript → SourceVideo → SelectedVideo) provides upload_date,
 * it must appear in the citation metadata so Sources never show "Unknown" when
 * the API (YouTube or Supadata) provided a date.
 */
import { generateCitationMap } from '../../../src/services/citation-mapper.service';
import { VIDEO_DATE_UNKNOWN } from '../../../src/constants/dates';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Minimal SelectedVideo shape for tests (required fields for generateCitationMap)
const video = (overrides: { upload_date?: string; video_id?: string; title?: string } = {}) => ({
  video_id: overrides.video_id ?? 'abc123',
  title: overrides.title ?? 'Test Video',
  channel: 'Test Channel',
  thumbnail: 'https://example.com/thumb.jpg',
  url: 'https://www.youtube.com/watch?v=abc123',
  duration_seconds: 120,
  classification: 'Direct' as const,
  why_selected: '',
  fills_gap: '',
  ...overrides,
});

describe('citation-mapper.service', () => {
  describe('generateCitationMap', () => {
    it('preserves upload_date when present (so Sources show real date)', () => {
      const selectedVideos = [
        video({ upload_date: '2024-01-15' }),
        video({ upload_date: '2 months ago', video_id: 'def456', title: 'Other' }),
      ];
      const map = generateCitationMap(selectedVideos);
      expect(map['1'].upload_date).toBe('2024-01-15');
      expect(map['2'].upload_date).toBe('2 months ago');
    });

    it('uses VIDEO_DATE_UNKNOWN only when upload_date is missing', () => {
      const selectedVideos = [video({ upload_date: undefined })];
      const map = generateCitationMap(selectedVideos);
      expect(map['1'].upload_date).toBe(VIDEO_DATE_UNKNOWN);
    });

    it('uses fallback for empty string upload_date', () => {
      const selectedVideos = [video({ upload_date: '' })];
      const map = generateCitationMap(selectedVideos);
      expect(map['1'].upload_date).toBe(VIDEO_DATE_UNKNOWN);
    });
  });
});
