/**
 * Unit tests for AI service
 */
import nock from 'nock';
import { Readable } from 'stream';
import {
  callQwenFlash,
  callQwenPlus,
  callQwenMax,
  generateTitle,
} from '../../../src/services/ai.service';

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

describe('ai.service', () => {
  const mockApiKey = 'test-api-key';
  const mockBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

  beforeEach(() => {
    nock.cleanAll();
    process.env.DASHSCOPE_BEIJING_API_KEY = mockApiKey;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('callQwenFlash', () => {
    it('should call Qwen Flash successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Condensed summary text',
            },
          },
        ],
        usage: {
          total_tokens: 100,
        },
      };

      nock(mockBaseUrl)
        .post('')
        .reply(200, mockResponse);

      const result = await callQwenFlash('Test prompt', 'Test transcript');

      expect('content' in result).toBe(true);
      if ('content' in result) {
        expect(result.content).toBe('Condensed summary text');
        expect(result.model).toBe('qwen-flash');
      }
    });

    it('should handle API errors', async () => {
      nock(mockBaseUrl).post('').reply(400, {
        code: 'InvalidParameter',
        message: 'Invalid prompt',
      });

      const result = await callQwenFlash('Invalid prompt', 'Test transcript');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error_code).toBeDefined();
      }
    });

    it('should handle timeout errors', async () => {
      nock(mockBaseUrl).post('').delay(65000).reply(200, {});

      const result = await callQwenFlash('Test prompt', 'Test transcript');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('timeout');
      }
    }, 70000);
  });

  describe('callQwenPlus', () => {
    it('should call Qwen Plus successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Final summary text',
            },
          },
        ],
        usage: {
          total_tokens: 500,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await callQwenPlus('Test prompt', 'Test context');

      expect('content' in result).toBe(true);
      if ('content' in result) {
        expect(result.content).toBe('Final summary text');
        expect(result.model).toBe('qwen-plus');
      }
    });
  });

  describe('callQwenMax', () => {
    it('should call Qwen Max successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Premium summary text',
            },
          },
        ],
        usage: {
          total_tokens: 800,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await callQwenMax('Test prompt', 'Test context');

      expect('content' in result).toBe(true);
      if ('content' in result) {
        expect(result.content).toBe('Premium summary text');
        expect(result.model).toBe('qwen-max');
      }
    });

    it('should accept onChunk callback parameter', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Premium summary text',
            },
          },
        ],
        usage: {
          total_tokens: 800,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const onChunk = jest.fn();
      const result = await callQwenMax('Test prompt', 'Test context', onChunk);

      // In non-streaming mode, onChunk should not be called
      expect(onChunk).not.toHaveBeenCalled();
      expect('content' in result).toBe(true);
    });
  });

  describe('callQwenPlus streaming', () => {
    it('should accept onChunk callback parameter', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Final summary text',
            },
          },
        ],
        usage: {
          total_tokens: 500,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const onChunk = jest.fn();
      const result = await callQwenPlus('Test prompt', 'Test context', onChunk);

      // In non-streaming mode (when config.stream is false), onChunk should not be called
      expect('content' in result).toBe(true);
    });
  });

  describe('stream parsing', () => {
    // Note: Full stream parsing tests require integration tests or complex stream mocking
    // These tests verify the API accepts streaming callbacks correctly
    
    it('should handle streaming callback in callQwenPlus', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test content',
            },
          },
        ],
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const chunks: string[] = [];
      const onChunk = jest.fn((chunk: string) => {
        chunks.push(chunk);
      });

      const result = await callQwenPlus('Test prompt', 'Test context', onChunk);

      expect('content' in result).toBe(true);
      // Note: Actual streaming behavior depends on config.stream setting
      // This test verifies the function signature accepts the callback
    });

    it('should handle streaming callback in callQwenMax', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test content',
            },
          },
        ],
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const chunks: string[] = [];
      const onChunk = jest.fn((chunk: string) => {
        chunks.push(chunk);
      });

      const result = await callQwenMax('Test prompt', 'Test context', onChunk);

      expect('content' in result).toBe(true);
      // Note: Actual streaming behavior depends on config.stream setting
      // This test verifies the function signature accepts the callback
    });
  });

  describe('generateTitle', () => {
    it('should generate title from transcripts successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Understanding React Hooks',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const transcriptText = 'This video discusses React Hooks and how to use useState and useEffect. We will explore the benefits of hooks and how they simplify component logic.';
      const result = await generateTitle(transcriptText, 'transcripts');

      expect(result).toBe('Understanding React Hooks');
      expect(result?.length).toBeLessThanOrEqual(60);
    });

    it('should generate title from summary successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Complete Guide to TypeScript',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const summaryText = 'This comprehensive guide covers TypeScript fundamentals, advanced types, and best practices for building scalable applications.';
      const result = await generateTitle(summaryText, 'summary');

      expect(result).toBe('Complete Guide to TypeScript');
      expect(result?.length).toBeLessThanOrEqual(60);
    });

    it('should clean title by removing surrounding quotes', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '"Python Data Science Tutorial"',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await generateTitle('Test content', 'summary');

      expect(result).toBe('Python Data Science Tutorial');
      expect(result).not.toContain('"');
    });

    it('should clean title by removing single quotes', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "'JavaScript Best Practices'",
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await generateTitle('Test content', 'summary');

      expect(result).toBe('JavaScript Best Practices');
      expect(result).not.toContain("'");
    });

    it('should replace newlines with spaces', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Machine\nLearning\nBasics',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await generateTitle('Test content', 'summary');

      expect(result).toBe('Machine Learning Basics');
      expect(result).not.toContain('\n');
    });

    it('should enforce max length (60 characters)', async () => {
      const longTitle = 'A'.repeat(100);
      const mockResponse = {
        choices: [
          {
            message: {
              content: longTitle,
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await generateTitle('Test content', 'summary');

      expect(result).toBeTruthy();
      expect(result?.length).toBeLessThanOrEqual(60);
    });

    it('should return null for titles shorter than minimum length', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hi',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await generateTitle('Test content', 'summary');

      expect(result).toBeNull();
    });

    it('should return null when AI service returns error', async () => {
      nock(mockBaseUrl).post('').reply(400, {
        error: {
          code: 'InvalidParameter',
          message: 'Invalid prompt',
        },
      });

      const result = await generateTitle('Test content', 'summary');

      expect(result).toBeNull();
    });

    it('should return null on timeout', async () => {
      nock(mockBaseUrl).post('').delay(65000).reply(200, {});

      const result = await generateTitle('Test content', 'summary');

      expect(result).toBeNull();
    }, 70000);

    it('should limit transcript content to 2000 characters', async () => {
      const longTranscript = 'A'.repeat(5000);
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test Title',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      const scope = nock(mockBaseUrl)
        .post('', (body) => {
          // Verify that the user content is limited to 2000 chars
          const userMessage = body.messages.find((m: any) => m.role === 'user');
          expect(userMessage.content.length).toBeLessThanOrEqual(2000 + 100); // Allow some buffer for prompt text
          return true;
        })
        .reply(200, mockResponse);

      await generateTitle(longTranscript, 'transcripts');

      expect(scope.isDone()).toBe(true);
    });

    it('should use full summary content (not truncated)', async () => {
      const summaryText = 'A'.repeat(5000);
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test Title',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      const scope = nock(mockBaseUrl)
        .post('', (body) => {
          // Verify that the full summary content is used
          const userMessage = body.messages.find((m: any) => m.role === 'user');
          expect(userMessage.content.length).toBeGreaterThan(2000);
          return true;
        })
        .reply(200, mockResponse);

      await generateTitle(summaryText, 'summary');

      expect(scope.isDone()).toBe(true);
    });

    it('should handle empty content gracefully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '   ',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await generateTitle('', 'summary');

      expect(result).toBeNull();
    });

    it('should trim whitespace from title', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '   Clean Title   ',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      nock(mockBaseUrl).post('').reply(200, mockResponse);

      const result = await generateTitle('Test content', 'summary');

      expect(result).toBe('Clean Title');
      expect(result).not.toMatch(/^\s|\s$/);
    });
  });
});

