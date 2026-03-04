'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ResearchProgress, 
  ResearchRequest, 
  ResearchResponse, 
  ResearchStatus,
  SelectedVideo,
  UseResearchStreamReturn,
  StreamingErrorType,
} from '@/types';
import { startResearchJob } from '@/lib/api';
import { reconnectConfig, heartbeatConfig, chunkConfig, streamingMessages, connectionConfig, deduplicationConfig } from '@/config/streaming';
import { apiBaseUrl, apiEndpoints } from '@/config/api';
import { animationDurations } from '@/config/visual-effects';
import { AuthenticatedSSE } from '@/lib/authenticated-sse';
import { useToast } from '@/contexts/ToastContext';
import { errorMessages } from '@/config/messages';
import { useCitation } from '@/contexts/CitationContext';
import type { CitationMetadata, CitationUsageMap } from '@/types/citations';

/**
 * Detect error type from error message
 * Helps provide better error handling and user-friendly messages
 */
function detectErrorType(errorMessage: string): StreamingErrorType {
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('stream parsing') || 
      lowerMessage.includes('parse') || 
      lowerMessage.includes('malformed')) {
    return 'network';
  }
  
  if (lowerMessage.includes('connection') || 
      lowerMessage.includes('connect') ||
      lowerMessage.includes('network')) {
    return 'network';
  }
  
  if (lowerMessage.includes('timeout') || 
      lowerMessage.includes('timed out')) {
    return 'timeout';
  }
  
  if (lowerMessage.includes('quota') || 
      lowerMessage.includes('limit') ||
      lowerMessage.includes('429')) {
    return 'quota';
  }
  
  if (lowerMessage.includes('auth') || 
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('401')) {
    return 'auth';
  }
  
  if (lowerMessage.includes('server') || 
      lowerMessage.includes('500') ||
      lowerMessage.includes('502') ||
      lowerMessage.includes('503')) {
    return 'server';
  }
  
  return 'unknown';
}

/**
 * Get request fingerprint for deduplication
 * Creates a unique identifier for a research request
 */
function getRequestFingerprint(request: ResearchRequest): string {
  return JSON.stringify({
    research_query: request.research_query.trim().toLowerCase(),
    language: request.language,
  });
}

/**
 * Custom hook for managing SSE connection to research job status
 * Implements auto-reconnect with exponential backoff
 * Follows SSE connection guidance to prevent duplicate connections
 * 
 * Key Features:
 * - SSE connection management with auto-reconnect
 * - Connection state checks to prevent duplicate connections
 * - Request deduplication to prevent duplicate job submissions
 * - Chunk accumulation with deduplication
 * - Rapid chunk batching (50ms batches)
 * - Completion state tracking (isCompleted, isCompleting)
 * - Error handling with error type detection
 * - Heartbeat monitoring
 * - Intermediate data extraction (generated_queries, raw_video_results, selected_videos)
 * 
 * State Management:
 * - status: Current job status (idle, connected, generating_queries, searching_videos, etc.)
 * - isStreaming: True when actively receiving chunks
 * - isCompleted: True when status is 'completed'
 * - isCompleting: True during completion animation phase (1.5s)
 * 
 * Edge Cases Handled:
 * - Network interruptions (auto-reconnect with exponential backoff)
 * - Duplicate connections (connection state checks)
 * - Duplicate job submissions (request deduplication)
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
export function useResearchStream(): UseResearchStreamReturn {
  const { setCitations, setCitationUsage } = useCitation();
  const [status, setStatus] = useState<ResearchStatus | 'idle' | 'connected'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<StreamingErrorType | undefined>(undefined);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [research, setResearch] = useState<ResearchResponse | null>(null);
  
  // Connection status state
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  // Completion state tracking
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Intermediate data state
  const [generatedQueries, setGeneratedQueries] = useState<string[]>([]);
  const [rawVideoResults, setRawVideoResults] = useState<Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    view_count: number;
    upload_date: string;
    url: string;
  }>>([]);
  const [selectedVideos, setSelectedVideos] = useState<SelectedVideo[]>([]);
  const [researchQuery, setResearchQuery] = useState<string>('');
  
  // Phase 4: Research data for approval stages
  const [researchData, setResearchData] = useState<ResearchProgress['research_data'] | null>(null);

  // Refs for managing connection lifecycle
  const eventSourceRef = useRef<AuthenticatedSSE | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  
  // Connection state tracking (SSE guidance)
  const isConnectingRef = useRef<boolean>(false);
  const currentJobIdRef = useRef<string | null>(null);
  // Track if we received any SSE message (so we can detect "stream ended with no progress")
  const hasReceivedProgressRef = useRef<boolean>(false);
  
  // Request deduplication (PRD Race Condition Prevention)
  const inFlightRequestsRef = useRef<Set<string>>(new Set());
  
  // Refs for chunk accumulation optimization
  const accumulatedTextRef = useRef<string>('');
  const emptyChunkWarningCountRef = useRef(0);
  const chunkBatchRef = useRef<string[]>([]);
  const chunkBatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingBatchRef = useRef(false);
  const RAPID_CHUNK_BATCH_MS = chunkConfig.rapidChunkBatchMs;
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const toast = useToast();

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
        console.warn('[useResearchStream] Heartbeat timeout - connection may be lost');
      }
    }, heartbeatConfig.timeout);
  }, []);

  /**
   * Disconnect from SSE endpoint
   * SSE guidance: Proper cleanup to prevent memory leaks
   * Phase 3: Clear chunk/completion timers; lifecycle logging via config
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      if (connectionConfig.logConnectionLifecycle) {
        console.log(`[useResearchStream] Disconnecting from job ${currentJobIdRef.current}`);
      }
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
    if (chunkBatchTimerRef.current) {
      clearTimeout(chunkBatchTimerRef.current);
      chunkBatchTimerRef.current = null;
    }
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    currentJobIdRef.current = null;
    isConnectingRef.current = false;
    setIsConnected(false);
  }, []);

  /**
   * Process batched chunks
   * Flushes accumulated chunks and updates state
   */
  const processChunkBatch = useCallback(() => {
    if (chunkBatchRef.current.length === 0) return;
    
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
    
    requestAnimationFrame(() => {
      isProcessingBatchRef.current = false;
    });
  }, []);

  /**
   * Accumulate chunk with deduplication and batching for rapid chunks
   */
  const accumulateChunk = useCallback((chunk: string) => {
    if (!chunk || chunk.trim().length === 0) {
      emptyChunkWarningCountRef.current += 1;
      if (emptyChunkWarningCountRef.current > chunkConfig.emptyChunkWarningThreshold) {
        console.warn('[useResearchStream] Received many empty chunks - this may indicate an issue');
        emptyChunkWarningCountRef.current = 0;
      }
      return;
    }

    const currentAccumulated = accumulatedTextRef.current;

    // Check for duplicate content before batching
    if (currentAccumulated.includes(chunk) && currentAccumulated.length > chunk.length) {
      const lastPartOfAccumulated = currentAccumulated.slice(-chunk.length);
      if (lastPartOfAccumulated === chunk) {
        console.warn('[useResearchStream] Skipping duplicate chunk:', chunk.substring(0, chunkConfig.chunkPreviewLength));
        return;
      }
    }

    chunkBatchRef.current.push(chunk);

    if (chunkBatchTimerRef.current) {
      clearTimeout(chunkBatchTimerRef.current);
    }

    chunkBatchTimerRef.current = setTimeout(() => {
      processChunkBatch();
    }, RAPID_CHUNK_BATCH_MS);
  }, [processChunkBatch]);

  /**
   * Handle SSE event data
   * Extracts intermediate data and updates state
   */
  const handleSSEEvent = useCallback((data: ResearchProgress) => {
    if (!isMountedRef.current) return;

    // Phase 3: Out-of-order guard – ignore events from a different job
    if (data.job_id != null && currentJobIdRef.current != null && data.job_id !== currentJobIdRef.current) {
      return;
    }

    hasReceivedProgressRef.current = true;

    // Handle title updates
    if (data.title) {
      setTitle((prevTitle) => {
        if (prevTitle && prevTitle !== data.title) {
          console.debug('[useResearchStream] Title updated', { 
            previousTitle: prevTitle,
            newTitle: data.title 
          });
        }
        return data.title || null;
      });
    }

    // Extract intermediate data
    if (data.generated_queries) {
      setGeneratedQueries(data.generated_queries);
    }
    
    if (data.raw_video_results) {
      setRawVideoResults(data.raw_video_results);
    }
    
    if (data.selected_videos) {
      // Deduplicate videos by video_id to prevent race condition duplicates
      const uniqueVideos = data.selected_videos.reduce((acc: SelectedVideo[], video) => {
        if (!acc.find(v => v.video_id === video.video_id)) {
          acc.push(video);
        }
        return acc;
      }, []);
      setSelectedVideos(uniqueVideos);
    }
    
    if (data.research_query) {
      setResearchQuery(data.research_query);
    }
    
    // Phase 4: Extract research_data for approval stages
    if (data.research_data) {
      setResearchData(data.research_data);
      if (data.research_data.research_query) {
        setResearchQuery(data.research_data.research_query);
      }
    }

    const status = data.status as ResearchStatus | 'processing' | 'generating';
    switch (status) {
      case 'connected':
        setStatus('connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
        if (data.job_id) {
          setCurrentJobId(data.job_id);
          currentJobIdRef.current = data.job_id;
        }
        resetHeartbeatTimer();
        break;

      case 'processing':
      case 'generating':
        // Legacy backend statuses when connection first opens or reconnects
        setStatus(status === 'generating' ? 'generating_summary' : 'generating_queries');
        setProgress(data.progress ?? progress);
        setMessage(data.message ?? message);
        resetHeartbeatTimer();
        break;

      case 'generating_questions':
      case 'regenerating_questions':
        setStatus(data.status);
        setProgress(data.progress || 0);
        setMessage(data.message || null);
        setIsStreaming(true);
        
        // Phase 3: Handle partial questions during streaming
        const rdQ = data.research_data;
        if (rdQ?.partial_questions) {
          setResearchData(prev => ({
            ...prev,
            partial_questions: rdQ.partial_questions,
            generated_questions: undefined,
          }));
        }
        if (rdQ?.generated_questions) {
          setResearchData(prev => ({
            ...prev,
            generated_questions: rdQ.generated_questions,
            partial_questions: undefined,
          }));
          setIsStreaming(false);
        }
        
        resetHeartbeatTimer();
        break;

      case 'awaiting_question_approval':
        setStatus(data.status);
        setProgress(data.progress || 0);
        setMessage(data.message || null);
        setIsStreaming(false);
        
        // Phase 3: Ensure complete questions are set when awaiting approval
        const rdAq = data.research_data;
        if (rdAq?.generated_questions) {
          setResearchData(prev => ({
            ...prev,
            generated_questions: rdAq.generated_questions,
            partial_questions: undefined,
          }));
        }
        
        resetHeartbeatTimer();
        break;

      case 'generating_search_terms':
      case 'regenerating_search_terms':
        setStatus(data.status);
        setProgress(data.progress || 0);
        setMessage(data.message || null);
        setIsStreaming(true);
        
        // Phase 3: Handle partial search terms during streaming
        const rdSt = data.research_data;
        if (rdSt?.partial_search_terms) {
          setResearchData(prev => ({
            ...prev,
            partial_search_terms: rdSt.partial_search_terms,
            generated_search_terms: undefined,
          }));
        }
        if (rdSt?.generated_search_terms) {
          setResearchData(prev => ({
            ...prev,
            generated_search_terms: rdSt.generated_search_terms,
            partial_search_terms: undefined,
          }));
          setIsStreaming(false);
        }
        
        resetHeartbeatTimer();
        break;

      case 'awaiting_search_term_approval':
        setStatus(data.status);
        setProgress(data.progress || 0);
        setMessage(data.message || null);
        setIsStreaming(false);
        
        // Phase 3: Ensure complete search terms are set when awaiting approval
        const rdAs = data.research_data;
        if (rdAs?.generated_search_terms) {
          setResearchData(prev => ({
            ...prev,
            generated_search_terms: rdAs.generated_search_terms,
            partial_search_terms: undefined,
          }));
        }
        
        resetHeartbeatTimer();
        break;

      case 'generating_queries': // Legacy
      case 'searching_videos':
      case 'videos_found':
      case 'filtering_videos':
      case 'awaiting_video_approval':
      case 'refiltering_videos':
      case 'fetching_transcripts':
      case 'transcripts_ready':
      case 'generating_style_guide':
        setStatus(data.status);
        setProgress(data.progress || 0);
        setMessage(data.message || null);
        
        // Phase 3: Handle chunk accumulation for AI generation stages (legacy/other)
        if (
          data.status === 'refiltering_videos'
        ) {
          if (data.chunk !== undefined) {
            accumulateChunk(data.chunk);
          }
        }
        
        resetHeartbeatTimer();
        break;

      case 'generating_summary':
        setStatus('generating_summary');
        setProgress(data.progress || 0);
        setMessage(data.message || null);
        setIsStreaming(true);
        
        // Handle chunk accumulation with deduplication
        if (data.chunk !== undefined) {
          accumulateChunk(data.chunk);
        }
        
        resetHeartbeatTimer();
        break;

      case 'completed': {
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

        // Phase 3: Flush pending chunks before applying final text (avoids overwriting final with batch)
        if (chunkBatchRef.current.length > 0) {
          processChunkBatch();
        }
        emptyChunkWarningCountRef.current = 0;

        if (data.data) {
          const researchData = { ...data.data };
          if (researchData.created_at) {
            try {
              if (researchData.created_at instanceof Date) {
                researchData.created_at = researchData.created_at.toISOString();
              } else if (typeof researchData.created_at === 'string') {
                const dateObj = new Date(researchData.created_at);
                if (isNaN(dateObj.getTime())) {
                  console.warn('[useResearchStream] Invalid created_at date received, using current time', {
                    received: researchData.created_at,
                  });
                  researchData.created_at = new Date().toISOString();
                } else {
                  researchData.created_at = dateObj.toISOString();
                }
              }
            } catch (error) {
              console.warn('[useResearchStream] Error converting created_at to ISO string, using current time', {
                error,
                received: researchData.created_at,
              });
              researchData.created_at = new Date().toISOString();
            }
          } else {
            researchData.created_at = new Date().toISOString();
          }

          setResearch(researchData);
          if (researchData.final_summary_text) {
            const finalText = researchData.final_summary_text;
            accumulatedTextRef.current = finalText;
            setStreamedText(finalText);
          }
          if (researchData.research_query) {
            setResearchQuery(researchData.research_query);
          }
        }

        disconnect();
        break;
      }

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

      // Phase 4: Citation events
      case 'citations:metadata':
        // Citation metadata received - populate citation store
        if (data.citation_metadata) {
          setCitations(data.citation_metadata);
          console.debug('[useResearchStream] Citation metadata received', {
            citationCount: Object.keys(data.citation_metadata).length,
          });
        }
        resetHeartbeatTimer();
        break;

      case 'citations:section-complete':
        // Section complete - update citation usage map
        if (data.citation_section_complete) {
          const { section, citations_used } = data.citation_section_complete;
          setCitationUsage((prevUsage: CitationUsageMap) => ({
            ...prevUsage,
            [section]: citations_used,
          }));
          console.debug('[useResearchStream] Section complete', {
            section,
            citationsUsed: citations_used,
          });
        }
        resetHeartbeatTimer();
        break;

      default:
        console.warn('[useResearchStream] Unknown SSE event status:', data.status);
    }
  }, [disconnect, resetHeartbeatTimer, accumulateChunk, processChunkBatch, setCitations, setCitationUsage]);

  /**
   * Connect to SSE endpoint with connection state checks
   * SSE guidance: Prevents duplicate connections
   */
  const connect = useCallback(
    (jobId: string, retryCount = 0): Promise<void> => {
      return new Promise((resolve, reject) => {
        // SSE guidance: CHECK 1 - Already connected to this job?
        // Using readyStateValue === 1 (OPEN) as per AuthenticatedSSE implementation
        if (eventSourceRef.current &&
            currentJobIdRef.current === jobId &&
            eventSourceRef.current.readyStateValue === 1) { // 1 = OPEN
          if (connectionConfig.logConnectionLifecycle) {
            console.log(`[useResearchStream] Already connected to job ${jobId}`);
          }
          resolve();
          return;
        }

        // Reconnect after stream ended (e.g. user approved late): same job but connection closed
        if (eventSourceRef.current &&
            currentJobIdRef.current === jobId &&
            eventSourceRef.current.readyStateValue !== 1) {
          if (connectionConfig.logConnectionLifecycle) {
            console.log(`[useResearchStream] Reconnecting to job ${jobId} (previous connection closed)`);
          }
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // SSE guidance: CHECK 2 - Currently connecting to this job?
        if (isConnectingRef.current && currentJobIdRef.current === jobId) {
          if (connectionConfig.logConnectionLifecycle) {
            console.log(`[useResearchStream] Already connecting to job ${jobId}`);
          }
          resolve();
          return;
        }

        // SSE guidance: CHECK 3 - Close existing connection if different job
        if (eventSourceRef.current && currentJobIdRef.current !== jobId) {
          if (connectionConfig.logConnectionLifecycle) {
            console.log(`[useResearchStream] Closing connection to job ${currentJobIdRef.current}`);
          }
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          currentJobIdRef.current = null;
        }
        
        // SSE guidance: CHECK 4 - Don't create if already connecting
        if (isConnectingRef.current) {
          if (connectionConfig.logConnectionLifecycle) {
            console.warn('[useResearchStream] Connection attempt while already connecting');
          }
          resolve();
          return;
        }

        // Mark as connecting
        isConnectingRef.current = true;
        currentJobIdRef.current = jobId;

        const url = `${apiBaseUrl}${apiEndpoints.researchStatus(jobId)}`;

        if (connectionConfig.logConnectionLifecycle) {
          console.log(`[useResearchStream] Connecting to SSE endpoint (attempt ${retryCount + 1})`, {
            url,
            jobId,
            retryCount,
          });
        }

        hasReceivedProgressRef.current = false;
        const eventSource = new AuthenticatedSSE(url, {
          withCredentials: false,
          enableAutoReconnect: false,
          onStreamEnd: () => {
            if (heartbeatTimeoutRef.current) {
              clearTimeout(heartbeatTimeoutRef.current);
              heartbeatTimeoutRef.current = null;
            }
            if (isMountedRef.current && !hasReceivedProgressRef.current) {
              const msg = errorMessages.connectionClosedNoProgress;
              setError(msg);
              setErrorType('network');
              toast.error(msg);
            }
          },
        });
        eventSourceRef.current = eventSource;
        
        let connectionTimeout: NodeJS.Timeout | null = setTimeout(() => {
          if (eventSourceRef.current === eventSource && eventSource.readyStateValue !== 1) {
            if (connectionConfig.logConnectionLifecycle) {
              console.warn('[useResearchStream] Connection timeout - no connection established within expected time', {
                readyState: eventSource.readyStateValue,
                jobId,
              });
            }
          }
          connectionTimeout = null;
        }, connectionConfig.timeout);

        eventSource.addEventListener('open', () => {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          if (!isMountedRef.current) {
            eventSource.close();
            return;
          }
          
          isConnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
          setIsConnected(true);
          setIsReconnecting(false);
          resetHeartbeatTimer();

          if (connectionConfig.logConnectionLifecycle) {
            const disconnectTime = reconnectAttemptsRef.current > 0 ? Date.now() : undefined;
            console.log('[useResearchStream] SSE connection opened successfully', { 
              jobId, 
              retryCount,
              reconnectAttempts: reconnectAttemptsRef.current
            });
            if (retryCount > 0) {
              console.debug('[useResearchStream] Reconnection successful', {
                retryCount,
                reconnectAttempts: reconnectAttemptsRef.current
              });
            }
          }
        });

        eventSource.onmessage = (event) => {
          try {
            const data: ResearchProgress = JSON.parse(event.data);
            handleSSEEvent(data);

            if (data.status === 'completed' || data.status === 'error') {
              resolve();
            }
          } catch (err) {
            console.error('[useResearchStream] Failed to parse SSE event:', err);
          }
        };

        eventSource.onerror = (err) => {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }

          eventSource.close();
          eventSourceRef.current = null;
          if (currentJobIdRef.current === jobId) {
            currentJobIdRef.current = null;
          }
          isConnectingRef.current = false;

          if (connectionConfig.logConnectionLifecycle) {
            console.warn('[useResearchStream] SSE connection error:', err || 'Unknown error');
          }

          // Phase 3: Strict Mode – no state updates if unmounted
          if (!isMountedRef.current) {
            reject(new Error(streamingMessages.connectionLost));
            return;
          }

          setIsConnected(false);

          // Debug logging for connection loss
          if (connectionConfig.logConnectionLifecycle) {
            console.debug('[useResearchStream] Connection lost during phase', {
              status,
              progress,
              retryCount,
              willReconnect: retryCount < reconnectConfig.maxRetries
            });
          }

          const shouldRetry = retryCount < reconnectConfig.maxRetries && isMountedRef.current;

          if (shouldRetry) {
            setIsReconnecting(true);
            const delay = Math.min(
              reconnectConfig.initialDelay *
                Math.pow(reconnectConfig.backoffMultiplier, retryCount),
              reconnectConfig.maxDelay
            );

            reconnectAttemptsRef.current = retryCount + 1;

            if (connectionConfig.logConnectionLifecycle) {
              console.log(`[useResearchStream] Reconnecting in ${delay}ms (attempt ${retryCount + 1}/${reconnectConfig.maxRetries})...`, {
                jobId,
                delay,
                retryCount: retryCount + 1,
              });
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                reconnectTimeoutRef.current = null;
                connect(jobId, retryCount + 1).catch((reconnectError) => {
                  console.error('[useResearchStream] Reconnection failed:', reconnectError);
                  if (isMountedRef.current) {
                    setIsReconnecting(false);
                    setError(streamingMessages.connectionLost);
                    setErrorType('network');
                    setIsStreaming(false);
                  }
                  reject(reconnectError);
                });
              }
            }, delay);
          } else {
            setIsReconnecting(false);
            if (isMountedRef.current) {
              const errorMessage = retryCount >= reconnectConfig.maxRetries
                ? `Connection lost after ${reconnectConfig.maxRetries} retry attempts`
                : streamingMessages.connectionLost;
              setError(errorMessage);
              setErrorType('network');
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
   * Start a new research job
   * PRD Race Condition Prevention: Request deduplication
   */
  const startJob = useCallback(
    async (payload: ResearchRequest): Promise<void> => {
      // PRD: Request deduplication
      const fingerprint = getRequestFingerprint(payload);
      
      if (inFlightRequestsRef.current.has(fingerprint)) {
        if (deduplicationConfig.logDeduplicationEvents) {
          console.log('[useResearchStream] Deduplication: skipping duplicate request', {
            fingerprint: fingerprint.slice(0, 80) + (fingerprint.length > 80 ? '…' : ''),
          });
        }
        toast.warning('This research is already being processed');
        return;
      }

      // Add to in-flight set
      inFlightRequestsRef.current.add(fingerprint);
      
      try {
        // Reset state
        setStreamedText('');
        accumulatedTextRef.current = '';
        setTitle(null);
        setError(null);
        setErrorType(undefined);
        setErrorCode(undefined);
        setIsStreaming(false);
        setChunkCount(0);
        setStatus('idle');
        setProgress(0);
        setMessage(null);
        setResearch(null);
        setGeneratedQueries([]);
        setRawVideoResults([]);
        setSelectedVideos([]);
        setResearchQuery('');
        emptyChunkWarningCountRef.current = 0;
        chunkBatchRef.current = [];
        if (chunkBatchTimerRef.current) {
          clearTimeout(chunkBatchTimerRef.current);
          chunkBatchTimerRef.current = null;
        }
        if (completionTimerRef.current) {
          clearTimeout(completionTimerRef.current);
          completionTimerRef.current = null;
        }
        reconnectAttemptsRef.current = 0;
        setIsCompleted(false);
        setIsCompleting(false);

        // Close any existing connection
        disconnect();

        // Create research job
        const response = await startResearchJob(payload);

        if (response.error) {
          // Defensive check: ensure error object exists and has expected properties
          const errorObj = response.error;
          const errorMessage = (errorObj && typeof errorObj === 'object' && 'message' in errorObj)
            ? errorObj.message 
            : errorMessages.researchJobStartFailed;
          const errorCode = (errorObj && typeof errorObj === 'object' && 'code' in errorObj)
            ? errorObj.code
            : undefined;
          
          // Detect error type from error code or message
          let detectedErrorType: StreamingErrorType = 'unknown';
          if (errorCode && typeof errorCode === 'string') {
            if (errorCode.includes('QUOTA') || errorCode.includes('LIMIT') || errorCode === '429') {
              detectedErrorType = 'quota';
            } else if (errorCode === '401' || errorCode.includes('UNAUTHORIZED')) {
              detectedErrorType = 'auth';
            } else if (errorCode === '402' || errorCode.includes('INSUFFICIENT_CREDITS')) {
              detectedErrorType = 'quota';
              setError(errorMessages.researchInsufficientCredits);
              setErrorType(detectedErrorType);
              setErrorCode(errorCode);
              setIsStreaming(false);
              setStatus('error');
              return;
            } else if (errorCode.includes('RATE_LIMIT')) {
              detectedErrorType = 'quota';
              setError(errorMessages.researchRateLimitExceeded);
              setErrorType(detectedErrorType);
              setErrorCode(errorCode);
              setIsStreaming(false);
              setStatus('error');
              return;
            } else if (errorCode.includes('TIMEOUT')) {
              detectedErrorType = 'timeout';
            } else if (errorCode.includes('500') || errorCode.includes('502') || errorCode.includes('503')) {
              detectedErrorType = 'server';
            }
          } else {
            detectedErrorType = detectErrorType(errorMessage);
          }
          
          setError(errorMessage);
          setErrorType(detectedErrorType);
          if (errorCode) {
            setErrorCode(errorCode);
          }
          setIsStreaming(false);
          setStatus('error');
          return;
        }

        if (!response.data?.job_id) {
          setError(errorMessages.researchJobStartFailed);
          setErrorType('unknown');
          setIsStreaming(false);
          setStatus('error');
          return;
        }

        const jobId = response.data.job_id;
        setCurrentJobId(jobId);
        currentJobIdRef.current = jobId;

        // Connect to SSE
        await connect(jobId);
      } catch (err) {
        if (!isMountedRef.current) return;

        const errorMessage = err instanceof Error ? err.message : errorMessages.researchJobStartFailed;
        const detectedErrorType = detectErrorType(errorMessage);
        
        setError(errorMessage);
        setErrorType(detectedErrorType);
        setIsStreaming(false);
        setStatus('error');
      } finally {
        // PRD: Remove from in-flight set after delay (TTL from config, min 5s)
        const ttl = Math.max(
          deduplicationConfig.fingerprintTtl,
          deduplicationConfig.minFingerprintTtl
        );
        setTimeout(() => {
          inFlightRequestsRef.current.delete(fingerprint);
        }, ttl);
      }
    },
    [disconnect, connect, toast]
  );

  /**
   * Manual reconnect function
   */
  const manualReconnect = useCallback(() => {
    if (currentJobId && isMountedRef.current) {
      setIsReconnecting(true);
      reconnectAttemptsRef.current = 0;
      connect(currentJobId, 0).catch((err) => {
        if (isMountedRef.current) {
          setError(streamingMessages.reconnectFailed);
          setIsReconnecting(false);
        }
      });
    }
  }, [currentJobId, connect]);

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
    setResearch(null);
    setIsConnected(false);
    setIsReconnecting(false);
    setCurrentJobId(null);
    currentJobIdRef.current = null;
    hasReceivedProgressRef.current = false;
    setGeneratedQueries([]);
    setRawVideoResults([]);
    setSelectedVideos([]);
    setResearchQuery('');
    emptyChunkWarningCountRef.current = 0;
    chunkBatchRef.current = [];
    reconnectAttemptsRef.current = 0;
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
  }, [disconnect]);

  return {
    startJob,
    status,
    progress,
    message,
    streamedText,
    title,
    error,
    errorType,
    errorCode,
    isStreaming,
    generatedQueries,
    rawVideoResults,
    selectedVideos,
    research,
    researchData, // Phase 4: Approval stage data
    researchQuery,
    currentJobId, // Phase 4: Current job ID
    reset,
    isConnected,
    isReconnecting,
    reconnectAttempts: reconnectAttemptsRef.current,
    manualReconnect,
    isCompleted,
    isCompleting,
  };
}
