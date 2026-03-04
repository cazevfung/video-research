/**
 * Unit tests for validators utility
 */
import {
  validateYouTubeUrl,
  validateYouTubeUrls,
  extractVideoId,
  deduplicateUrls,
  validatePresetStyle,
  validateLanguage,
  validateCustomPrompt,
  sanitizeInput,
  getValidPresetStyles,
} from '../../src/utils/validators';

describe('validators', () => {
  describe('extractVideoId', () => {
    it('should extract video ID from youtube.com/watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtu.be URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/live URL', () => {
      const url = 'https://www.youtube.com/live/ckN5kIG9iOg';
      expect(extractVideoId(url)).toBe('ckN5kIG9iOg');
    });

    it('should extract video ID from youtube.com/live URL with query parameters', () => {
      const url = 'https://www.youtube.com/live/ckN5kIG9iOg?si=uNPBzZjg-W1AovJz';
      expect(extractVideoId(url)).toBe('ckN5kIG9iOg');
    });

    it('should extract video ID from URL with additional parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxx';
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL', () => {
      expect(extractVideoId('not-a-url')).toBeNull();
      expect(extractVideoId('https://example.com')).toBeNull();
    });
  });

  describe('validateYouTubeUrl', () => {
    it('should validate correct YouTube URLs', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/live/ckN5kIG9iOg',
        'https://youtube.com/live/ckN5kIG9iOg',
        'https://www.youtube.com/live/ckN5kIG9iOg?si=uNPBzZjg-W1AovJz',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ', // HTTP is also valid
      ];

      validUrls.forEach((url) => {
        const result = validateYouTubeUrl(url);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'https://example.com/video',
        'https://youtube.com/invalid',
        'https://youtu.be/invalidid', // Wrong length
      ];

      invalidUrls.forEach((url) => {
        const result = validateYouTubeUrl(url);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject URLs exceeding max length', () => {
      const longUrl = 'https://www.youtube.com/watch?v=' + 'a'.repeat(2049);
      const result = validateYouTubeUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('url');
    });
  });

  describe('validateYouTubeUrls', () => {
    it('should validate multiple URLs', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/abc123def45',
      ];
      const result = validateYouTubeUrls(urls);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify invalid URLs in batch', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'invalid-url',
        'https://youtu.be/abc123def45',
      ];
      const result = validateYouTubeUrls(urls);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].index).toBe(1); // Invalid URL is at index 1
    });

    it('should reject empty array', () => {
      const result = validateYouTubeUrls([]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('urls');
    });

    it('should reject non-array input', () => {
      const result = validateYouTubeUrls('not-an-array' as any);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('urls');
    });
  });

  describe('deduplicateUrls', () => {
    it('should remove duplicate URLs', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Duplicate
        'https://youtu.be/abc123def45',
      ];
      const unique = deduplicateUrls(urls);
      expect(unique).toHaveLength(2);
      expect(unique[0]).toBe(urls[0]);
      expect(unique[1]).toBe(urls[2]);
    });

    it('should handle case-insensitive duplicates', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'HTTPS://WWW.YOUTUBE.COM/WATCH?V=dQw4w9WgXcQ', // Case different
      ];
      const unique = deduplicateUrls(urls);
      expect(unique).toHaveLength(1);
    });

    it('should preserve order of first occurrence', () => {
      const urls = [
        'https://youtu.be/abc123def45',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/abc123def45', // Duplicate
      ];
      const unique = deduplicateUrls(urls);
      expect(unique[0]).toBe(urls[0]);
      expect(unique[1]).toBe(urls[1]);
    });
  });

  describe('validatePresetStyle', () => {
    it('should validate all preset styles', () => {
      const validPresetStyles = getValidPresetStyles();
      validPresetStyles.forEach((preset) => {
        const result = validatePresetStyle(preset);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid preset styles', () => {
      const invalidPresets = ['invalid', '', 'custom', 'blog'];
      invalidPresets.forEach((preset) => {
        const result = validatePresetStyle(preset);
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('preset');
      });
    });

    it('should reject non-string input', () => {
      const result = validatePresetStyle(123 as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateLanguage', () => {
    it('should validate supported languages', () => {
      const supportedLanguages = [
        'English',
        'Spanish',
        'French',
        'German',
        'Chinese (Simplified)',
        'Chinese (Traditional)',
        'Japanese',
        'Korean',
        'Portuguese',
        'Italian',
        'Russian',
        'Arabic',
      ];

      supportedLanguages.forEach((lang) => {
        const result = validateLanguage(lang);
        expect(result.valid).toBe(true);
      });
    });

    it('should accept case-insensitive language names', () => {
      const result = validateLanguage('english');
      expect(result.valid).toBe(true);
    });

    it('should default to valid for unsupported languages', () => {
      const result = validateLanguage('Klingon');
      // Should be valid but with a warning error
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateCustomPrompt', () => {
    it('should accept valid custom prompts', () => {
      const result = validateCustomPrompt('Focus on Python code examples');
      expect(result.valid).toBe(true);
    });

    it('should accept optional empty custom prompt', () => {
      const result = validateCustomPrompt(undefined);
      expect(result.valid).toBe(true);
    });

    it('should reject prompts exceeding max length', () => {
      const longPrompt = 'a'.repeat(501);
      const result = validateCustomPrompt(longPrompt);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('custom_prompt');
    });

    it('should reject non-string input', () => {
      const result = validateCustomPrompt(123 as any);
      expect(result.valid).toBe(false);
    });

    it('should reject whitespace-only prompts', () => {
      const result = validateCustomPrompt('   ');
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove null bytes', () => {
      const input = 'test\0string';
      expect(sanitizeInput(input)).toBe('teststring');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('should remove control characters', () => {
      const input = 'test\x00\x1F\x7Fstring';
      expect(sanitizeInput(input)).toBe('teststring');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(123 as any)).toBe('');
    });
  });
});



