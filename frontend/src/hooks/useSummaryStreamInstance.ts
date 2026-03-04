'use client';

/**
 * Phase 3: Multiple Simultaneous Tasks
 * Stream instance manager for individual task streams
 * Each task gets its own stream instance tied to a specific jobId
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SummaryProgress, SummaryRequest, SummaryResponse, JobStatus } from '@/types';
import { reconnectConfig, heartbeatConfig, chunkConfig, apiConfig, streamingMessages } from '@/config/streaming';
import { animationDurations } from '@/config/visual-effects';
import { AuthenticatedSSE } from '@/lib/authenticated-sse';
import { apiBaseUrl, apiEndpoints } from '@/config/api';

export type StreamingErrorType =
  | "stream_parsing"
  | "connection"
  | "timeout"
  | "fallback"
  | "unknown";

export interface UseSummaryStreamInstanceReturn {
  jobId: string | null;
  status: JobStatus | 'idle' | 'connected';
  progress: number;
  message: string | null;
  streamedText: string;
  title: string | null;
  error: string | null;
  errorType?: StreamingErrorType;
  errorCode?: string;
  isStreaming: boolean;
  chunkCount: number;
  videoCount: number;
  completedVideos: number;
  summary: SummaryResponse | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  isCompleted: boolean;
  isCompleting: boolean;
  connect: (jobId: string) => Promise<void>;
  disconnect: () => void;
  reset: () => void;
}

/**
 * Factory function to create a stream instance for a specific job
 * This allows multiple concurrent streams, one per task
 */
export function useSummaryStreamInstance(jobId: string | null): UseSummaryStreamInstanceReturn {
  const [status, setStatus] = useState<JobStatus | 'idle' | 'connected'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<StreamingErrorType | undefined>(undefined);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [completedVideos, setCompletedVideos] = useState(0);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Refs for managing connection lifecycle
  const eventSourceRef = useRef<AuthenticatedSSE | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  const accumulatedTextRef = useRef<string>('');
  const emptyChunkWarningCountRef = useRef(0);
  const chunkBatchRef = useRef<string[]>([]);
  const chunkBatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentJobIdRef = useRef<string | null>(jobId);
  const isProcessingBatchRef = useRef(false);

  // Update current job ID when prop changes
  useEffect(() => {
    currentJobIdRef.current = jobId;
  }, [jobId]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      if (chunkBatchTimerRef.current) {
        clearTimeout(chunkBatchTimerRef.current);
      }
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  /**
   * Reset heartbeat timer
   */
  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    lastHeartbeatRef.current = Date.now();

    heartbeatTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
      if (timeSinceLastHeartbeat >= heartbeatConfig.timeout) {
        console.warn(`[StreamInstance ${currentJobIdRef.current}] Heartbeat timeout`);
      }
    }, heartbeatConfig.timeout);
  }, []);

  /**
   * Close SSE connection
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setIsReconnecting(false);
  }, []);

  /**
   * Process batched chunks
   */
  const processChunkBatch = useCallback(() => {
    if (chunkBatchRef.current.length === 0) return;
    
    // Prevent multiple simultaneous batch processing
    if (isProcessingBatchRef.current) return;
    
    isProcessingBatchRef.current = true;

    const batch = chunkBatchRef.current;
    chunkBatchRef.current = [];

    const combinedChunk = batch.join('');
    const currentAccumulated = accumulatedTextRef.current;
    const newText = currentAccumulated + combinedChunk;

    accumulatedTextRef.current = newText;
    setStreamedText(newText);
    setChunkCount((prev) => prev + batch.length);
    
    // Use requestAnimationFrame to ensure state update completes before allowing next batch
    requestAnimationFrame(() => {
      isProcessingBatchRef.current = false;
    });
  }, []);

  /**
   * Accumulate chunk with deduplication and batching
   */
  const accumulateChunk = useCallback((chunk: string) => {
    if (!chunk || chunk.trim().length === 0) {
      emptyChunkWarningCountRef.current += 1;
      if (emptyChunkWarningCountRef.current > chunkConfig.emptyChunkWarningThreshold) {
        console.warn(`[StreamInstance ${currentJobIdRef.current}] Received many empty chunks`);
        emptyChunkWarningCountRef.current = 0;
      }
      return;
    }

    const currentAccumulated = accumulatedTextRef.current;

    if (currentAccumulated.includes(chunk) && currentAccumulated.length > chunk.length) {
      const lastPartOfAccumulated = currentAccumulated.slice(-chunk.length);
      if (lastPartOfAccumulated === chunk) {
        return;
      }
    }

    chunkBatchRef.current.push(chunk);

    if (chunkBatchTimerRef.current) {
      clearTimeout(chunkBatchTimerRef.current);
    }

    chunkBatchTimerRef.current = setTimeout(() => {
      processChunkBatch();
    }, chunkConfig.rapidChunkBatchMs);
  }, [processChunkBatch]);

  /**
   * Detect error type from error message
   */
  const detectErrorType = useCallback((errorMessage: string): StreamingErrorType => {
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('stream parsing') || 
        lowerMessage.includes('parse') || 
        lowerMessage.includes('malformed')) {
      return 'stream_parsing';
    }
    
    if (lowerMessage.includes('connection') || 
        lowerMessage.includes('connect') ||
        lowerMessage.includes('network')) {
      return 'connection';
    }
    
    if (lowerMessage.includes('timeout') || 
        lowerMessage.includes('timed out')) {
      return 'timeout';
    }
    
    if (lowerMessage.includes('fallback') || 
        lowerMessage.includes('non-streaming') ||
        lowerMessage.includes('standard mode')) {
      return 'fallback';
    }
    
    return 'unknown';
  }, []);

  /**
   * Handle SSE event data
   */
  const handleSSEEvent = useCallback((data: SummaryProgress) => {
    if (!isMountedRef.current) return;

    if (data.title) {
      setTitle((prevTitle) => data.title || prevTitle);
    }

    switch (data.status) {
      case 'connected':
        setStatus('connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
        resetHeartbeatTimer();
        break;

      case 'fetching':
      case 'processing':
      case 'condensing':
      case 'aggregating':
        setStatus(data.status);
        setProgress(data.progress);
        setMessage(data.message || null);
        resetHeartbeatTimer();
        break;

      case 'generating':
        setStatus('generating');
        setProgress(data.progress);
        setMessage(data.message || null);
        setIsStreaming(true);
        
        // Update source_videos if provided (sent after processing, before generation)
        if (data.source_videos && data.source_videos.length > 0) {
          setSummary(prevSummary => ({
            ...(prevSummary || {}),
            source_videos: data.source_videos,
          } as SummaryResponse));
        }
        
        if (data.chunk !== undefined) {
          accumulateChunk(data.chunk);
        }
        
        resetHeartbeatTimer();
        break;

      case 'completed':
        setStatus('completed');
        setProgress(100);
        setMessage(data.message || streamingMessages.summaryCompleted);
        setIsStreaming(false);
        
        setIsCompleted(true);
        setIsCompleting(true);
        
        const completionTimer = setTimeout(() => {
          if (isMountedRef.current) {
            setIsCompleting(false);
          }
        }, animationDurations.completionAnimationDuration * 1000);
        completionTimerRef.current = completionTimer;
        
        if (data.data) {
          const summaryData = { ...data.data };
          if (summaryData.created_at) {
            try {
              if (summaryData.created_at instanceof Date) {
                summaryData.created_at = summaryData.created_at.toISOString();
              } else if (typeof summaryData.created_at === 'string') {
                const dateObj = new Date(summaryData.created_at);
                if (isNaN(dateObj.getTime())) {
                  summaryData.created_at = new Date().toISOString();
                } else {
                  summaryData.created_at = dateObj.toISOString();
                }
              }
            } catch (error) {
              summaryData.created_at = new Date().toISOString();
            }
          } else {
            summaryData.created_at = new Date().toISOString();
          }
          
          setSummary(summaryData);
          if (summaryData.final_summary_text) {
            const finalText = summaryData.final_summary_text;
            accumulatedTextRef.current = finalText;
            setStreamedText(finalText);
          }
          if (summaryData.batch_title) {
            setTitle(summaryData.batch_title);
          }
        }
        
        if (chunkBatchRef.current.length > 0) {
          processChunkBatch();
        }
        
        emptyChunkWarningCountRef.current = 0;
        disconnect();
        break;

      case 'error':
        setStatus('error');
        const errorMessage = data.error || streamingMessages.unknownError;
        setError(errorMessage);
        
        const detectedErrorType = detectErrorType(errorMessage);
        setErrorType(detectedErrorType);
        
        const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
        if (errorCodeMatch) {
          setErrorCode(errorCodeMatch[1]);
        }
        
        setIsStreaming(false);
        setIsCompleted(false);
        setIsCompleting(false);
        
        if (chunkBatchRef.current.length > 0) {
          processChunkBatch();
        }
        
        emptyChunkWarningCountRef.current = 0;
        disconnect();
        break;

      case 'heartbeat':
        resetHeartbeatTimer();
        break;

      default:
        console.warn(`[StreamInstance ${currentJobIdRef.current}] Unknown SSE event status:`, data.status);
    }
  }, [disconnect, resetHeartbeatTimer, accumulateChunk, detectErrorType, processChunkBatch]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(
    (targetJobId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!targetJobId) {
          reject(new Error('Job ID is required'));
          return;
        }

        const url = `${apiBaseUrl}${apiEndpoints.status(targetJobId)}`;
        
        console.log(`[StreamInstance] Connecting to SSE endpoint`, {
          url,
          jobId: targetJobId,
        });

        const eventSource = new AuthenticatedSSE(url, {
          withCredentials: false,
          enableAutoReconnect: false,
          onStreamEnd: () => {
            if (heartbeatTimeoutRef.current) {
              clearTimeout(heartbeatTimeoutRef.current);
              heartbeatTimeoutRef.current = null;
            }
          },
        });
        eventSourceRef.current = eventSource;
        
        let connectionTimeout: NodeJS.Timeout | null = setTimeout(() => {
          if (eventSourceRef.current === eventSource && eventSource.readyStateValue !== 1) {
            console.warn(`[StreamInstance ${targetJobId}] Connection timeout`);
          }
          connectionTimeout = null;
        }, 10000);

        eventSource.addEventListener('open', () => {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          reconnectAttemptsRef.current = 0;
          setIsConnected(true);
          setIsReconnecting(false);
          resetHeartbeatTimer();
          
          console.log(`[StreamInstance ${targetJobId}] SSE connection opened`);
        });

        eventSource.onmessage = (event) => {
          try {
            const data: SummaryProgress = JSON.parse(event.data);
            handleSSEEvent(data);

            if (data.status === 'completed' || data.status === 'error') {
              resolve();
            }
          } catch (err) {
            console.error(`[StreamInstance ${targetJobId}] Failed to parse SSE event:`, err);
          }
        };

        eventSource.onerror = (err) => {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          console.error(`[StreamInstance ${targetJobId}] SSE connection error:`, err);
          setIsConnected(false);
          
          eventSource.close();
          eventSourceRef.current = null;

          const shouldRetry = reconnectAttemptsRef.current < reconnectConfig.maxRetries && isMountedRef.current;
          
          if (shouldRetry) {
            setIsReconnecting(true);
            const delay = Math.min(
              reconnectConfig.initialDelay *
                Math.pow(reconnectConfig.backoffMultiplier, reconnectAttemptsRef.current),
              reconnectConfig.maxDelay
            );

            reconnectAttemptsRef.current += 1;
            
            console.log(`[StreamInstance ${targetJobId}] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${reconnectConfig.maxRetries})...`);

            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                reconnectTimeoutRef.current = null;
                connect(targetJobId).catch((reconnectError) => {
                  console.error(`[StreamInstance ${targetJobId}] Reconnection failed:`, reconnectError);
                  if (isMountedRef.current) {
                    setIsReconnecting(false);
                    setError(streamingMessages.connectionLost);
                    setErrorType('connection');
                    setIsStreaming(false);
                  }
                  reject(reconnectError);
                });
              }
            }, delay);
          } else {
            setIsReconnecting(false);
            if (isMountedRef.current) {
              const errorMessage = reconnectAttemptsRef.current >= reconnectConfig.maxRetries
                ? `Connection lost after ${reconnectConfig.maxRetries} retry attempts`
                : streamingMessages.connectionLost;
              setError(errorMessage);
              setErrorType('connection');
              setIsStreaming(false);
            }
            reject(new Error(streamingMessages.connectionLost));
          }
        };
      });
    },
    [handleSSEEvent, resetHeartbeatTimer]
  );

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    disconnect();
    setStatus('idle');
    setProgress(0);
    setMessage(null);
    setStreamedText('');
    accumulatedTextRef.current = '';
    setTitle(null);
    setError(null);
    setErrorType(undefined);
    setErrorCode(undefined);
    setIsStreaming(false);
    setChunkCount(0);
    setVideoCount(0);
    setCompletedVideos(0);
    setSummary(null);
    setIsConnected(false);
    setIsReconnecting(false);
    setIsCompleted(false);
    setIsCompleting(false);
    emptyChunkWarningCountRef.current = 0;
    chunkBatchRef.current = [];
    reconnectAttemptsRef.current = 0;
    if (chunkBatchTimerRef.current) {
      clearTimeout(chunkBatchTimerRef.current);
      chunkBatchTimerRef.current = null;
    }
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, [disconnect]);

  // Auto-connect when jobId is provided
  // Phase 3: Connect automatically when jobId is set
  useEffect(() => {
    if (jobId && isMountedRef.current) {
      // Connect to the stream for this job
      connect(jobId).catch((err) => {
        console.error(`[StreamInstance] Failed to connect to job ${jobId}:`, err);
      });
    }
    return () => {
      // Cleanup on unmount or jobId change
      disconnect();
    };
  }, [jobId, connect, disconnect]);

  return {
    jobId: currentJobIdRef.current,
    status,
    progress,
    message,
    streamedText,
    title,
    error,
    errorType,
    errorCode,
    isStreaming,
    chunkCount,
    videoCount,
    completedVideos,
    summary,
    isConnected,
    isReconnecting,
    reconnectAttempts: reconnectAttemptsRef.current,
    isCompleted,
    isCompleting,
    connect,
    disconnect,
    reset,
  };
}

