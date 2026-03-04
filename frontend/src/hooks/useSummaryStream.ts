'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SummaryProgress, SummaryRequest, SummaryResponse, JobStatus } from '@/types';
import { startSummaryJob } from '@/lib/api';
import { reconnectConfig, heartbeatConfig, chunkConfig, apiConfig, streamingMessages } from '@/config/streaming';
import { animationDurations } from '@/config/visual-effects';
import { AuthenticatedSSE } from '@/lib/authenticated-sse';

/**
 * Phase 5: Detect error type from error message
 * Helps provide better error handling and user-friendly messages
 */
function detectErrorType(errorMessage: string): StreamingErrorType {
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
}

export type StreamingErrorType =
  | "stream_parsing"
  | "connection"
  | "timeout"
  | "fallback"
  | "unknown";

export interface UseSummaryStreamReturn {
  startJob: (payload: SummaryRequest) => Promise<void>;
  status: JobStatus | 'idle' | 'connected';
  progress: number;
  message: string | null;
  streamedText: string;
  title: string | null; // AI-generated title (quick or refined)
  error: string | null;
  errorType?: StreamingErrorType; // Phase 5: Error type for better error handling
  errorCode?: string; // Phase 5: Error code if available
  isStreaming: boolean;
  chunkCount: number; // Phase 3: Number of chunks received
  videoCount: number;
  completedVideos: number;
  summary: SummaryResponse | null;
  reset: () => void;
  // Phase 7: Connection status for recovery UI
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  manualReconnect: () => void;
  // Phase 2: Completion state for smooth transitions
  isCompleted: boolean; // true when status is 'completed'
  isCompleting: boolean; // true during completion animation phase
}

/**
 * Custom hook for managing SSE connection to summary job status
 * Implements auto-reconnect with exponential backoff
 * Matches PRD Section 8.2 specification
 * 
 * Phase 3: Integration & Testing - Enhanced edge case handling and completion state tracking
 * 
 * Key Features:
 * - SSE connection management with auto-reconnect
 * - Chunk accumulation with deduplication
 * - Rapid chunk batching (50ms batches)
 * - Completion state tracking (isCompleted, isCompleting)
 * - Error handling with error type detection
 * - Heartbeat monitoring
 * 
 * State Management:
 * - status: Current job status (idle, connected, fetching, processing, generating, completed, error)
 * - isStreaming: True when actively receiving chunks
 * - isCompleted: True when status is 'completed'
 * - isCompleting: True during completion animation phase (1.5s)
 * 
 * Edge Cases Handled:
 * - Network interruptions (auto-reconnect with exponential backoff)
 * - Empty chunks (ignored with warning threshold)
 * - Duplicate chunks (deduplication logic)
 * - Rapid chunk arrival (batching)
 * - Content reset (new summary starts)
 * - Connection loss (reconnection attempts)
 * 
 * Performance Optimizations:
 * - Chunk batching for rapid arrivals
 * - Debounced state updates
 * - Memory cleanup on unmount
 * - Timer cleanup to prevent leaks
 */
export function useSummaryStream(): UseSummaryStreamReturn {
  const [status, setStatus] = useState<JobStatus | 'idle' | 'connected'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const [title, setTitle] = useState<string | null>(null); // Phase 3: AI-generated title
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<StreamingErrorType | undefined>(undefined);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunkCount, setChunkCount] = useState(0); // Phase 3: Track number of chunks received
  const [videoCount, setVideoCount] = useState(0);
  const [completedVideos, setCompletedVideos] = useState(0);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  // Phase 7: Connection status state
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  // Phase 2: Completion state tracking
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Refs for managing connection lifecycle
  const eventSourceRef = useRef<AuthenticatedSSE | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  // Phase 3: Refs for chunk accumulation optimization
  const accumulatedTextRef = useRef<string>(''); // Track accumulated text for deduplication
  const emptyChunkWarningCountRef = useRef(0); // Track empty chunks for warnings
  // Phase 5: Refs for rapid chunk batching
  const chunkBatchRef = useRef<string[]>([]); // Batch rapid chunks
  const chunkBatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingBatchRef = useRef(false);
  // Phase 3: Use centralized config for rapid chunk batching
  const RAPID_CHUNK_BATCH_MS = chunkConfig.rapidChunkBatchMs;
  // Phase 2: Ref for completion timer
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      closeConnection();
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
        console.warn('Heartbeat timeout - connection may be lost');
        // Don't close connection, but log warning
        // The SSE error handler will handle reconnection
      }
    }, heartbeatConfig.timeout);
  }, []);

  /**
   * Close SSE connection
   */
  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    // Clear any pending reconnect timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Phase 5: Process batched chunks
   * Flushes accumulated chunks and updates state
   */
  const processChunkBatch = useCallback(() => {
    if (chunkBatchRef.current.length === 0) return;
    
    // Prevent multiple simultaneous batch processing
    if (isProcessingBatchRef.current) return;
    
    isProcessingBatchRef.current = true;

    const batch = chunkBatchRef.current;
    chunkBatchRef.current = [];

    // Combine all chunks in batch
    const combinedChunk = batch.join('');
    const currentAccumulated = accumulatedTextRef.current;
    const newText = currentAccumulated + combinedChunk;

    // Update accumulated text
    accumulatedTextRef.current = newText;
    setStreamedText(newText);
    setChunkCount((prev) => prev + batch.length);
    
    // Use requestAnimationFrame to ensure state update completes before allowing next batch
    requestAnimationFrame(() => {
      isProcessingBatchRef.current = false;
    });
  }, []);

  /**
   * Phase 3 & 5: Accumulate chunk with deduplication and batching for rapid chunks
   * Handles empty chunks, prevents duplicate content, and batches rapid arrivals
   */
  const accumulateChunk = useCallback((chunk: string) => {
    if (!chunk || chunk.trim().length === 0) {
      // Handle empty chunks - ignore but track for warnings
      emptyChunkWarningCountRef.current += 1;
      if (emptyChunkWarningCountRef.current > chunkConfig.emptyChunkWarningThreshold) {
        console.warn('Received many empty chunks - this may indicate an issue');
        emptyChunkWarningCountRef.current = 0; // Reset counter
      }
      return;
    }

    const currentAccumulated = accumulatedTextRef.current;

    // Phase 5: Check for duplicate content before batching
    if (currentAccumulated.includes(chunk) && currentAccumulated.length > chunk.length) {
      // Check if this is truly a duplicate or just a substring match
      const lastPartOfAccumulated = currentAccumulated.slice(-chunk.length);
      if (lastPartOfAccumulated === chunk) {
        // This chunk is already at the end, skip it
        console.warn('Skipping duplicate chunk:', chunk.substring(0, chunkConfig.chunkPreviewLength));
        return;
      }
    }

    // Phase 5: Add to batch for rapid chunk handling
    chunkBatchRef.current.push(chunk);

    // Clear existing timer
    if (chunkBatchTimerRef.current) {
      clearTimeout(chunkBatchTimerRef.current);
    }

    // Set timer to process batch
    chunkBatchTimerRef.current = setTimeout(() => {
      processChunkBatch();
    }, RAPID_CHUNK_BATCH_MS);
  }, [processChunkBatch]);

  /**
   * Handle SSE event data
   * Phase 3: Enhanced with chunk accumulation and deduplication
   * Phase 3: Added title handling for quick and refined titles
   */
  const handleSSEEvent = useCallback((data: SummaryProgress) => {
    if (!isMountedRef.current) return;

    // Phase 3: Handle title updates (can come with any status)
    if (data.title) {
      setTitle((prevTitle) => {
        // Log title update for debugging
        if (prevTitle && prevTitle !== data.title) {
          console.debug('[useSummaryStream] Title updated', { 
            previousTitle: prevTitle,
            newTitle: data.title 
          });
        } else if (!prevTitle) {
          console.debug('[useSummaryStream] Title received', { title: data.title });
        }
        return data.title || null;
      });
    }

    switch (data.status) {
      case 'connected':
        setStatus('connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
        if (data.job_id) {
          setCurrentJobId(data.job_id);
        }
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
        
        // Phase 3: Handle chunk accumulation with deduplication
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
        
        // Phase 2: Set completion states
        setIsCompleted(true);
        setIsCompleting(true);
        
        // Phase 2: Reset isCompleting after completion animation duration
        const completionTimer = setTimeout(() => {
          if (isMountedRef.current) {
            setIsCompleting(false);
          }
        }, animationDurations.completionAnimationDuration * 1000); // Convert seconds to milliseconds
        
        if (data.data) {
          // Phase 4: Ensure created_at is always an ISO string
          const summaryData = { ...data.data };
          if (summaryData.created_at) {
            try {
              // Convert Date objects to ISO string, validate string dates
              if (summaryData.created_at instanceof Date) {
                summaryData.created_at = summaryData.created_at.toISOString();
              } else if (typeof summaryData.created_at === 'string') {
                // Validate the string is a valid date and convert to ISO if needed
                const dateObj = new Date(summaryData.created_at);
                if (isNaN(dateObj.getTime())) {
                  // Invalid date string, use current time as fallback
                  console.warn('[useSummaryStream] Invalid created_at date received, using current time', {
                    received: summaryData.created_at,
                  });
                  summaryData.created_at = new Date().toISOString();
                } else {
                  // Ensure it's in ISO format
                  summaryData.created_at = dateObj.toISOString();
                }
              }
            } catch (error) {
              // If conversion fails, use current time as fallback
              console.warn('[useSummaryStream] Error converting created_at to ISO string, using current time', {
                error,
                received: summaryData.created_at,
              });
              summaryData.created_at = new Date().toISOString();
            }
          } else {
            // No created_at provided, use current time
            summaryData.created_at = new Date().toISOString();
          }
          
          setSummary(summaryData);
          // Use final_summary_text if available, otherwise keep accumulated text
          if (summaryData.final_summary_text) {
            const finalText = summaryData.final_summary_text;
            accumulatedTextRef.current = finalText;
            setStreamedText(finalText);
          }
          // Phase 3: Use title from data if available
          if (summaryData.batch_title) {
            setTitle(summaryData.batch_title);
          }
        }
        
        // Phase 5: Process any remaining batched chunks before completion
        if (chunkBatchRef.current.length > 0) {
          processChunkBatch();
        }
        
        // Reset streaming state
        emptyChunkWarningCountRef.current = 0;
        closeConnection();
        
        // Cleanup completion timer on unmount
        return () => {
          clearTimeout(completionTimer);
        };

      case 'error':
        setStatus('error');
        const errorMessage = data.error || streamingMessages.unknownError;
        setError(errorMessage);
        
        // Phase 5: Detect error type from error message
        const detectedErrorType = detectErrorType(errorMessage);
        setErrorType(detectedErrorType);
        
        // Extract error code if available (format: "ERROR_CODE: message")
        const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
        if (errorCodeMatch) {
          setErrorCode(errorCodeMatch[1]);
        }
        
        setIsStreaming(false);
        // Phase 2: Reset completion states on error
        setIsCompleted(false);
        setIsCompleting(false);
        
        // Phase 5: Process any remaining batched chunks before error
        if (chunkBatchRef.current.length > 0) {
          processChunkBatch();
        }
        
        // Reset streaming state on error
        emptyChunkWarningCountRef.current = 0;
        closeConnection();
        break;

      case 'heartbeat':
        // Keep connection alive, no state update needed
        resetHeartbeatTimer();
        break;

      default:
        console.warn('Unknown SSE event status:', data.status);
    }
  }, [closeConnection, resetHeartbeatTimer, accumulateChunk]);

  /**
   * Connect to SSE endpoint with auto-reconnect using authenticated SSE client
   * Uses Fetch API with ReadableStream to support authentication headers
   * Phase 2: Enhanced error recovery and connection timeout handling
   */
  const connectSSE = useCallback(
    (jobId: string, retryCount = 0): Promise<void> => {
      return new Promise((resolve, reject) => {
        const url = `${apiConfig.baseUrl}${apiConfig.sseEndpoint(jobId)}`;
        
        // Phase 2: Log connection attempt
        console.log(`[useSummaryStream] Connecting to SSE endpoint (attempt ${retryCount + 1})`, {
          url,
          jobId,
          retryCount,
        });

        // Create authenticated SSE client (handles authentication automatically)
        // Disable auto-reconnect in AuthenticatedSSE since we handle it in the hook
        const eventSource = new AuthenticatedSSE(url, {
          withCredentials: false, // Don't send cookies
          enableAutoReconnect: false, // Let hook handle reconnection
          onStreamEnd: () => {
            if (heartbeatTimeoutRef.current) {
              clearTimeout(heartbeatTimeoutRef.current);
              heartbeatTimeoutRef.current = null;
            }
          },
        });
        eventSourceRef.current = eventSource;
        
        // Phase 2: Add connection timeout to detect stuck connections
        let connectionTimeout: NodeJS.Timeout | null = setTimeout(() => {
          if (eventSourceRef.current === eventSource && eventSource.readyStateValue !== 1) {
            console.warn('[useSummaryStream] Connection timeout - no connection established within expected time', {
              readyState: eventSource.readyStateValue,
              jobId,
            });
            // Don't close here, let the error handler deal with it
            // But log for debugging
          }
          connectionTimeout = null;
        }, 10000); // 10 second timeout for initial connection

        // Configure reconnection settings
        eventSource.addEventListener('open', () => {
          // Phase 2: Clear connection timeout on successful connection
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          reconnectAttemptsRef.current = 0;
          setIsConnected(true);
          setIsReconnecting(false);
          resetHeartbeatTimer();
          
          // Phase 2: Log successful connection
          console.log('[useSummaryStream] SSE connection opened successfully', {
            jobId,
            retryCount,
          });
        });

        eventSource.onmessage = (event) => {
          try {
            const data: SummaryProgress = JSON.parse(event.data);
            handleSSEEvent(data);

            // Resolve on completion or error
            if (data.status === 'completed' || data.status === 'error') {
              resolve();
            }
          } catch (err) {
            console.error('Failed to parse SSE event:', err);
          }
        };

        eventSource.onerror = (err) => {
          // Phase 2: Clear connection timeout on error
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          console.error('SSE connection error:', err);
          setIsConnected(false);
          
          // Phase 2: Get connection health for debugging
          if (eventSourceRef.current) {
            const health = (eventSourceRef.current as any).getConnectionHealth?.();
            if (health) {
              console.log('[useSummaryStream] Connection health before error:', health);
            }
          }
          
          // Close the current connection
          eventSource.close();
          eventSourceRef.current = null;

          // Phase 2: Check if we should attempt reconnection with improved logic
          const shouldRetry = retryCount < reconnectConfig.maxRetries && isMountedRef.current;
          
          if (shouldRetry) {
            setIsReconnecting(true);
            const delay = Math.min(
              reconnectConfig.initialDelay *
                Math.pow(reconnectConfig.backoffMultiplier, retryCount),
              reconnectConfig.maxDelay
            );

            reconnectAttemptsRef.current = retryCount + 1;
            
            // Phase 2: Log reconnection attempt with details
            console.log(`[useSummaryStream] Reconnecting in ${delay}ms (attempt ${retryCount + 1}/${reconnectConfig.maxRetries})...`, {
              jobId,
              delay,
              retryCount: retryCount + 1,
            });

            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                // Phase 2: Clear timeout ref before attempting reconnection
                reconnectTimeoutRef.current = null;
                connectSSE(jobId, retryCount + 1).catch((reconnectError) => {
                  console.error('[useSummaryStream] Reconnection failed:', reconnectError);
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
            // Max retries reached
            setIsReconnecting(false);
            if (isMountedRef.current) {
              const errorMessage = retryCount >= reconnectConfig.maxRetries
                ? `Connection lost after ${reconnectConfig.maxRetries} retry attempts`
                : streamingMessages.connectionLost;
              setError(errorMessage);
              setErrorType('connection');
              setIsStreaming(false);
            }
            reject(new Error(streamingMessages.connectionLost));
          }
        };
        
        // Phase 2: Note: connectionTimeout is already cleared in 'open' and 'error' handlers
        // The timeout will be cleared when connection is established or fails
      });
    },
    [handleSSEEvent, resetHeartbeatTimer]
  );

  /**
   * Start a new summary job
   */
  const startJob = useCallback(
    async (payload: SummaryRequest): Promise<void> => {
      // Reset state
    setStreamedText('');
    accumulatedTextRef.current = ''; // Phase 3: Reset accumulated text ref
    setTitle(null); // Phase 3: Reset title
    setError(null);
    setErrorType(undefined);
    setErrorCode(undefined);
    setIsStreaming(false); // Will be set to true when streaming actually starts
      setChunkCount(0); // Phase 3: Reset chunk count
      setStatus('idle');
      setProgress(0);
      setMessage(null);
      setVideoCount(payload.urls.length);
      setCompletedVideos(0);
      emptyChunkWarningCountRef.current = 0; // Phase 3: Reset empty chunk counter
      chunkBatchRef.current = []; // Phase 5: Reset chunk batch
    if (chunkBatchTimerRef.current) {
      clearTimeout(chunkBatchTimerRef.current);
      chunkBatchTimerRef.current = null;
    }
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
      // Phase 2: Reset completion states
      setIsCompleted(false);
      setIsCompleting(false);

      // Close any existing connection
      closeConnection();

      try {
        // 1. POST /api/summarize
        const response = await startSummaryJob(payload);

        if (response.error) {
          setError(response.error.message);
          setIsStreaming(false);
          setStatus('error');
          return;
        }

        if (!response.data?.job_id) {
          setError(streamingMessages.invalidResponse);
          setIsStreaming(false);
          setStatus('error');
          return;
        }

        const jobId = response.data.job_id;
        setCurrentJobId(jobId);

        // 2. Open SSE connection
        await connectSSE(jobId);
      } catch (err) {
        if (!isMountedRef.current) return;

        setError(err instanceof Error ? err.message : streamingMessages.failedToStartJob);
        setIsStreaming(false);
        setStatus('error');
      }
    },
    [closeConnection, connectSSE]
  );

  /**
   * Manual reconnect function
   * Phase 7: Allows user to manually trigger reconnection
   */
  const manualReconnect = useCallback(() => {
    if (currentJobId && isMountedRef.current) {
      setIsReconnecting(true);
      reconnectAttemptsRef.current = 0;
      connectSSE(currentJobId, 0).catch((err) => {
        if (isMountedRef.current) {
          setError(streamingMessages.reconnectFailed);
          setIsReconnecting(false);
        }
      });
    }
  }, [currentJobId, connectSSE]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    closeConnection();
    setStatus('idle');
    setProgress(0);
    setMessage(null);
    setStreamedText('');
    accumulatedTextRef.current = ''; // Phase 3: Reset accumulated text ref
    setTitle(null); // Phase 3: Reset title
    setError(null);
    setErrorType(undefined);
    setErrorCode(undefined);
    setIsStreaming(false);
    setChunkCount(0); // Phase 3: Reset chunk count
    setVideoCount(0);
    setCompletedVideos(0);
    setSummary(null);
    setIsConnected(false);
    setIsReconnecting(false);
    setCurrentJobId(null);
    emptyChunkWarningCountRef.current = 0; // Phase 3: Reset empty chunk counter
    chunkBatchRef.current = []; // Phase 5: Reset chunk batch
    reconnectAttemptsRef.current = 0;
    // Phase 2: Reset completion states
    setIsCompleted(false);
    setIsCompleting(false);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (chunkBatchTimerRef.current) {
      clearTimeout(chunkBatchTimerRef.current);
      chunkBatchTimerRef.current = null;
    }
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, [closeConnection]);

  return {
    startJob,
    status,
    progress,
    message,
    streamedText,
    title, // Phase 3: Return title
    error,
    errorType, // Phase 5: Return error type
    errorCode, // Phase 5: Return error code
    isStreaming,
    chunkCount, // Phase 3: Return chunk count
    videoCount,
    completedVideos,
    summary,
    reset,
    isConnected,
    isReconnecting,
    reconnectAttempts: reconnectAttemptsRef.current,
    manualReconnect,
    // Phase 2: Return completion states
    isCompleted,
    isCompleting,
  };
}

