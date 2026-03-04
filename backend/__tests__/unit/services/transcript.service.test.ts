/**
 * Unit tests for transcript service
 */
import nock from 'nock';
import {
  fetchTranscript,
  fetchTranscriptsBatch,
} from '../../../src/services/transcript.service';
import env from '../../../src/config/env';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('transcript.service', () => {
  const mockApiKey = 'test-api-key';
  const mockBaseUrl = 'https://api.supadata.com/v1';

  beforeEach(() => {
    nock.cleanAll();
    // Set environment variable
    process.env.SUPADATA_API_KEY = mockApiKey;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('fetchTranscript', () => {
    it('should fetch transcript successfully', async () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const mockResponse = {
        success: true,
        data: {
          video_id: 'dQw4w9WgXcQ',
          title: 'Test Video',
          channel: 'Test Channel',
          thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg',
          duration_seconds: 212,
          transcript: 'This is a test transcript.',
          word_count: 5,
        },
      };

      nock(mockBaseUrl)
        .post('/transcript')
        .reply(200, mockResponse);

      const result = await fetchTranscript(url);

      expect('title' in result).toBe(true);
      if ('title' in result) {
        expect(result.title).toBe('Test Video');
        expect(result.transcript_text).toBe('This is a test transcript.');
        expect(result.url).toBe(url);
      }
    });

    it('should handle video unavailable error', async () => {
      const url = 'https://www.youtube.com/watch?v=invalid';
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'VIDEO_UNAVAILABLE',
          message: 'Video is unavailable',
        },
      };

      nock(mockBaseUrl).post('/transcript').reply(200, mockErrorResponse);

      const result = await fetchTranscript(url);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Video is unavailable');
        expect(result.url).toBe(url);
      }
    });

    it('should handle network errors with retry', async () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const mockResponse = {
        success: true,
        data: {
          video_id: 'dQw4w9WgXcQ',
          title: 'Test Video',
          channel: 'Test Channel',
          thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg',
          duration_seconds: 212,
          transcript: 'This is a test transcript.',
          word_count: 5,
        },
      };

      // First request fails, second succeeds
      nock(mockBaseUrl).post('/transcript').replyWithError('Network error');
      nock(mockBaseUrl).post('/transcript').reply(200, mockResponse);

      const result = await fetchTranscript(url);

      expect('title' in result).toBe(true);
      if ('title' in result) {
        expect(result.title).toBe('Test Video');
      }
    });

    it('should handle timeout errors', async () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      nock(mockBaseUrl).post('/transcript').delay(35000).reply(200, {});

      const result = await fetchTranscript(url);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('timeout');
      }
    }, 40000);
  });

  describe('fetchTranscriptsBatch', () => {
    it('should fetch multiple transcripts in parallel', async () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=abc123def45',
      ];

      const mockResponses = [
        {
          success: true,
          data: {
            video_id: 'dQw4w9WgXcQ',
            title: 'Video 1',
            channel: 'Channel 1',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg',
            duration_seconds: 100,
            transcript: 'Transcript 1',
            word_count: 10,
          },
        },
        {
          success: true,
          data: {
            video_id: 'abc123def45',
            title: 'Video 2',
            channel: 'Channel 2',
            thumbnail: 'https://img.youtube.com/vi/abc123def45/default.jpg',
            duration_seconds: 200,
            transcript: 'Transcript 2',
            word_count: 20,
          },
        },
      ];

      mockResponses.forEach((response, index) => {
        nock(mockBaseUrl).post('/transcript').reply(200, response);
      });

      const results = await fetchTranscriptsBatch(urls);

      expect(results).toHaveLength(2);
      expect('title' in results[0]).toBe(true);
      expect('title' in results[1]).toBe(true);
    });

    it('should handle partial failures in batch', async () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=invalid',
      ];

      nock(mockBaseUrl)
        .post('/transcript')
        .reply(200, {
          success: true,
          data: {
            video_id: 'dQw4w9WgXcQ',
            title: 'Video 1',
            channel: 'Channel 1',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg',
            duration_seconds: 100,
            transcript: 'Transcript 1',
            word_count: 10,
          },
        });

      nock(mockBaseUrl).post('/transcript').reply(200, {
        success: false,
        error: {
          code: 'VIDEO_UNAVAILABLE',
          message: 'Video is unavailable',
        },
      });

      const results = await fetchTranscriptsBatch(urls);

      expect(results).toHaveLength(2);
      expect('title' in results[0]).toBe(true);
      expect('error' in results[1]).toBe(true);
    });
  });
});



