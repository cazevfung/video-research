'use client';

/**
 * Phase 3: Multiple Simultaneous Tasks
 * Wrapper component that creates and manages stream instance for a task
 * This allows each task to have its own SSE connection
 */

import { useEffect, useRef } from 'react';
import { useSummaryStreamInstance } from '@/hooks/useSummaryStreamInstance';
import { TaskInfo } from '@/hooks/useTaskManager';

interface TaskStreamWrapperProps {
  task: TaskInfo;
  onStreamUpdate: (jobId: string, stream: ReturnType<typeof useSummaryStreamInstance>) => void;
}

/**
 * Component that wraps a task and creates its stream instance
 * The stream instance is passed back to the parent via onStreamUpdate callback
 */
export function TaskStreamWrapper({ task, onStreamUpdate }: TaskStreamWrapperProps) {
  const stream = useSummaryStreamInstance(task.jobId);
  const streamRef = useRef(stream);
  const lastNotifiedRef = useRef<string | null>(null);
  const onStreamUpdateRef = useRef(onStreamUpdate);

  // Update refs when they change
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    onStreamUpdateRef.current = onStreamUpdate;
  }, [onStreamUpdate]);

  // Notify parent of stream instance - only when stream actually changes
  // Use a stable identifier to prevent infinite loops
  useEffect(() => {
    if (stream.jobId === task.jobId) {
      // Create a stable identifier from stream properties
      const streamId = `${stream.jobId}-${stream.status}-${stream.progress}-${stream.isConnected}`;
      
      // Only notify if this is a new stream state
      if (lastNotifiedRef.current !== streamId) {
        lastNotifiedRef.current = streamId;
        onStreamUpdateRef.current(task.jobId, stream);
      }
    }
  }, [stream.jobId, stream.status, stream.progress, stream.isConnected, task.jobId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream.disconnect();
    };
  }, [stream]);

  // This component doesn't render anything
  // It just manages the stream instance lifecycle
  return null;
}


