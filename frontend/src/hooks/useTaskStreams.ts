'use client';

/**
 * Phase 3: Multiple Simultaneous Tasks
 * Hook to manage multiple stream instances for tasks
 * Creates and manages SSE connections for each active task
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSummaryStreamInstance, UseSummaryStreamInstanceReturn } from './useSummaryStreamInstance';

interface UseTaskStreamsReturn {
  getStream: (jobId: string) => UseSummaryStreamInstanceReturn | undefined;
  createStream: (jobId: string) => void;
  removeStream: (jobId: string) => void;
  getAllStreams: () => Map<string, UseSummaryStreamInstanceReturn>;
}

/**
 * Hook to manage multiple stream instances
 * Note: This is a workaround since hooks can't be called conditionally
 * We'll use a component-based approach instead
 */
export function useTaskStreams(jobIds: string[]): UseTaskStreamsReturn {
  const streamsRef = useRef<Map<string, UseSummaryStreamInstanceReturn>>(new Map());

  const getStream = useCallback((jobId: string) => {
    return streamsRef.current.get(jobId);
  }, []);

  const createStream = useCallback((jobId: string) => {
    if (!streamsRef.current.has(jobId)) {
      // Stream will be created by TaskStreamWrapper component
      // This is just a placeholder
    }
  }, []);

  const removeStream = useCallback((jobId: string) => {
    const stream = streamsRef.current.get(jobId);
    if (stream) {
      stream.disconnect();
      streamsRef.current.delete(jobId);
    }
  }, []);

  const getAllStreams = useCallback(() => {
    return streamsRef.current;
  }, []);

  // Cleanup streams for removed jobIds
  useEffect(() => {
    const currentJobIds = new Set(jobIds);
    for (const [jobId, stream] of streamsRef.current.entries()) {
      if (!currentJobIds.has(jobId)) {
        stream.disconnect();
        streamsRef.current.delete(jobId);
      }
    }
  }, [jobIds]);

  return {
    getStream,
    createStream,
    removeStream,
    getAllStreams,
  };
}


