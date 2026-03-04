/**
 * Phase 3: Completion State Tests for useSummaryStream Hook
 * Tests for completion state tracking and transitions
 * 
 * Tests:
 * - Completion state tracking (isCompleted, isCompleting)
 * - Completion animation timing
 * - Edge cases (rapid completion, error during completion)
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

describe('useSummaryStream - Phase 3: Completion State Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventSources = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Completion State Tracking', () => {
    it('should set isCompleted and isCompleting when status becomes completed', async () => {
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
        // Send completion event
        const completionEvent: SummaryProgress = {
          status: 'completed',
          progress: 100,
          message: 'Summary completed!',
          data: {
            final_summary_text: 'Complete summary',
            source_videos: [],
          },
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(completionEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(true);
        expect(result.current.isCompleting).toBe(true);
        expect(result.current.status).toBe('completed');
      });
    });

    it('should reset isCompleting after completion animation duration (1.5s)', async () => {
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
        const completionEvent: SummaryProgress = {
          status: 'completed',
          progress: 100,
          data: {
            final_summary_text: 'Complete summary',
            source_videos: [],
          },
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(completionEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.isCompleting).toBe(true);
      });

      // Advance time past completion animation duration (1.5s)
      act(() => {
        jest.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(result.current.isCompleting).toBe(false);
        expect(result.current.isCompleted).toBe(true); // Still completed
      });
    });

    it('should reset completion states when starting new job', async () => {
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
        const completionEvent: SummaryProgress = {
          status: 'completed',
          progress: 100,
          data: {
            final_summary_text: 'Complete summary',
            source_videos: [],
          },
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(completionEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(true);
      });

      // Start new job
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
        expect(result.current.isCompleted).toBe(false);
        expect(result.current.isCompleting).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should not set completion states on error', async () => {
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
          progress: 90,
          error: 'An error occurred',
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(errorEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(false);
        expect(result.current.isCompleting).toBe(false);
        expect(result.current.status).toBe('error');
      });
    });

    it('should handle rapid completion (completes very quickly)', async () => {
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

      // Immediately complete (rapid completion)
      await act(async () => {
        const completionEvent: SummaryProgress = {
          status: 'completed',
          progress: 100,
          data: {
            final_summary_text: 'Rapid summary',
            source_videos: [],
          },
        };
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: JSON.stringify(completionEvent) });
        }
      });

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(true);
        expect(result.current.isCompleting).toBe(true);
      });

      // Should still show completion animation even if rapid
      expect(result.current.isCompleting).toBe(true);
    });
  });
});



