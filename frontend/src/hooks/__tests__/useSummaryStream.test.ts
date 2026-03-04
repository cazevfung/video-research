/**
 * Unit tests for useSummaryStream hook
 * Phase 3: Frontend Chunk Accumulation
 * 
 * Tests:
 * - Chunk accumulation
 * - Chunk deduplication
 * - Empty chunk handling
 * - Completion handling
 * - Error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSummaryStream } from '../useSummaryStream';
import { SummaryProgress, SummaryRequest } from '@/types';
import { startSummaryJob } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  startSummaryJob: jest.fn(),
}));

// Store EventSource instances for testing
let mockEventSources: Array<{
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: Event) => void) | null;
  readyState: number;
  close: jest.Mock;
  url: string;
}> = [];

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 0; // CONNECTING
  close: jest.Mock;

  constructor(url: string) {
    this.url = url;
    this.close = jest.fn();
    const instance = this as any;
    mockEventSources.push(instance);
    
    // Simulate connection opening asynchronously
    Promise.resolve().then(() => {
      instance.readyState = 1; // OPEN
      if (instance.onmessage) {
        instance.onmessage({ 
          data: JSON.stringify({ status: 'connected', job_id: 'test-job-id' }) 
        });
      }
    });
  }

  addEventListener(event: string, handler: () => void) {
    if (event === 'open') {
      Promise.resolve().then(() => {
        this.readyState = 1; // OPEN
        handler();
      });
    }
  }
}

// Mock global EventSource
(global as any).EventSource = MockEventSource;
(global.EventSource as any).CONNECTING = 0;
(global.EventSource as any).OPEN = 1;
(global.EventSource as any).CLOSED = 2;

describe('useSummaryStream - Phase 3: Chunk Accumulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventSources = [];
  });

  describe('Chunk Accumulation', () => {
    it('should accumulate chunks correctly', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        const payload: SummaryRequest = {
          urls: ['https://example.com/video1'],
        };
        await result.current.startJob(payload);
      });

      // Wait for EventSource to be created
      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      // Simulate streaming chunks
      await act(async () => {
        const chunks = ['Hello', ' world', '!'];
        
        for (const chunk of chunks) {
          const progressEvent: SummaryProgress = {
            status: 'generating',
            progress: 85,
            chunk: chunk,
            message: 'Generating summary...',
          };
          if (eventSource.onmessage) {
            eventSource.onmessage({ data: JSON.stringify(progressEvent) });
          }
        }
      });

      await waitFor(() => {
        expect(result.current.streamedText).toBe('Hello world!');
        expect(result.current.chunkCount).toBe(3);
        expect(result.current.isStreaming).toBe(true);
      });
    });

    it('should increment chunkCount for each chunk', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        // Send 5 chunks
        for (let i = 0; i < 5; i++) {
          const progressEvent: SummaryProgress = {
            status: 'generating',
            progress: 85 + i,
            chunk: `chunk-${i}`,
          };
          if (eventSource.onmessage) {
            eventSource.onmessage({ data: JSON.stringify(progressEvent) });
          }
        }
      });

      await waitFor(() => {
        expect(result.current.chunkCount).toBe(5);
      });
    });
  });

  describe('Chunk Deduplication', () => {
    it('should skip duplicate chunks at the end of accumulated text', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        // Send initial chunk
        const event1: SummaryProgress = {
          status: 'generating',
          progress: 85,
          chunk: 'Hello world',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(event1) });
        }

        // Send duplicate chunk (same as last part)
        const event2: SummaryProgress = {
          status: 'generating',
          progress: 86,
          chunk: 'Hello world', // Duplicate
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(event2) });
        }
      });

      await waitFor(() => {
        expect(result.current.streamedText).toBe('Hello world');
        expect(result.current.chunkCount).toBe(1); // Only first chunk counted
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Skipping duplicate chunk'),
          expect.any(String)
        );
      });

      consoleWarnSpy.mockRestore();
    });

    it('should not skip chunks that are substrings but not duplicates', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        // Send chunk with "the" in it
        const event1: SummaryProgress = {
          status: 'generating',
          progress: 85,
          chunk: 'This is the summary',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(event1) });
        }

        // Send chunk with "the" but different content
        const event2: SummaryProgress = {
          status: 'generating',
          progress: 86,
          chunk: ' that contains the word',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(event2) });
        }
      });

      await waitFor(() => {
        expect(result.current.streamedText).toBe('This is the summary that contains the word');
        expect(result.current.chunkCount).toBe(2); // Both chunks counted
      });
    });
  });

  describe('Empty Chunk Handling', () => {
    it('should ignore empty chunks', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        // Send valid chunk
        const event1: SummaryProgress = {
          status: 'generating',
          progress: 85,
          chunk: 'Valid chunk',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(event1) });
        }

        // Send empty chunk
        const event2: SummaryProgress = {
          status: 'generating',
          progress: 86,
          chunk: '',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(event2) });
        }

        // Send whitespace-only chunk
        const event3: SummaryProgress = {
          status: 'generating',
          progress: 87,
          chunk: '   ',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(event3) });
        }
      });

      await waitFor(() => {
        expect(result.current.streamedText).toBe('Valid chunk');
        expect(result.current.chunkCount).toBe(1); // Only valid chunk counted
      });
    });

    it('should log warning after many empty chunks', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        // Send 11 empty chunks (more than threshold of 10)
        for (let i = 0; i < 11; i++) {
          const event: SummaryProgress = {
            status: 'generating',
            progress: 85,
            chunk: '',
          };
          if (eventSource.onmessage) {
            eventSource.onmessage({ data: JSON.stringify(event) });
          }
        }
      });

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Received many empty chunks - this may indicate an issue'
        );
      });

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Completion Handling', () => {
    it('should reset streaming state on completion', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        // Send streaming chunk
        const streamingEvent: SummaryProgress = {
          status: 'generating',
          progress: 90,
          chunk: 'Streaming content',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(streamingEvent) });
        }

        // Send completion event
        const completionEvent: SummaryProgress = {
          status: 'completed',
          progress: 100,
          message: 'Summary completed!',
          data: {
            final_summary_text: 'Complete summary text',
            source_videos: [],
          },
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(completionEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
        expect(result.current.status).toBe('completed');
        expect(result.current.progress).toBe(100);
        expect(result.current.streamedText).toBe('Complete summary text');
      });
    });

    it('should use final_summary_text from completion event', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        // Send some streaming chunks
        const streamingEvent: SummaryProgress = {
          status: 'generating',
          progress: 90,
          chunk: 'Partial content',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(streamingEvent) });
        }

        // Send completion with final text
        const completionEvent: SummaryProgress = {
          status: 'completed',
          progress: 100,
          data: {
            final_summary_text: 'Final complete summary',
            source_videos: [],
          },
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(completionEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.streamedText).toBe('Final complete summary');
      });
    });
  });

  describe('Error Handling', () => {
    it('should reset streaming state on error', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        // Send streaming chunk
        const streamingEvent: SummaryProgress = {
          status: 'generating',
          progress: 90,
          chunk: 'Streaming content',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(streamingEvent) });
        }

        // Send error event
        const errorEvent: SummaryProgress = {
          status: 'error',
          progress: 90,
          error: 'Stream parsing failed',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(errorEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('Stream parsing failed');
      });
    });

    it('should handle recoverable errors gracefully', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        const errorEvent: SummaryProgress = {
          status: 'error',
          progress: 85,
          error: 'Connection lost. Falling back to non-streaming mode.',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(errorEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
        expect(result.current.error).toContain('Connection lost');
      });
    });
  });

  describe('State Management', () => {
    it('should reset chunkCount when starting new job', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      // First job
      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource1 = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        const event: SummaryProgress = {
          status: 'generating',
          progress: 85,
          chunk: 'First job chunk',
        };
        if (eventSource1.onmessage) {
          eventSource1.onmessage({ data: JSON.stringify(event) });
        }
      });

      await waitFor(() => {
        expect(result.current.chunkCount).toBe(1);
      });

      // Second job - should reset chunkCount
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id-2' },
        error: null,
      });

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video2'],
        });
      });

      await waitFor(() => {
        expect(result.current.chunkCount).toBe(0);
        expect(result.current.streamedText).toBe('');
      });
    });

    it('should reset all streaming state when reset() is called', async () => {
      const mockStartSummaryJob = startSummaryJob as jest.MockedFunction<typeof startSummaryJob>;
      mockStartSummaryJob.mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null,
      });

      const { result } = renderHook(() => useSummaryStream());

      await act(async () => {
        await result.current.startJob({
          urls: ['https://example.com/video1'],
        });
      });

      await waitFor(() => {
        expect(mockEventSources.length).toBeGreaterThan(0);
      });

      const eventSource = mockEventSources[mockEventSources.length - 1];

      await act(async () => {
        const event: SummaryProgress = {
          status: 'generating',
          progress: 90,
          chunk: 'Some content',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(event) });
        }
      });

      await waitFor(() => {
        expect(result.current.chunkCount).toBe(1);
        expect(result.current.isStreaming).toBe(true);
      });

      // Reset
      await act(async () => {
        result.current.reset();
      });

      expect(result.current.chunkCount).toBe(0);
      expect(result.current.streamedText).toBe('');
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.status).toBe('idle');
    });
  });
});

