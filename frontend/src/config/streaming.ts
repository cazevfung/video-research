/**
 * Centralized Streaming Configuration
 * Phase 3: All streaming-related configurations in one place
 * This ensures consistency and makes it easy to update values
 */

/**
 * Reconnection configuration for SSE connections
 */
export const reconnectConfig = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
} as const;

/**
 * Heartbeat (idle) timeout configuration
 * Time in milliseconds with no SSE activity before considering connection lost.
 * Timer resets on any received message (heartbeat, status, chunks). Cleared on stream end.
 */
export const heartbeatConfig = {
  timeout: 60000, // 60 seconds as per PRD Section 6.2
} as const;

/**
 * Connection timeout configuration
 * Time in milliseconds to wait for SSE connection to establish
 */
export const connectionConfig = {
  timeout: parseInt(
    process.env.NEXT_PUBLIC_SSE_CONNECTION_TIMEOUT_MS || '10000',
    10
  ), // Default: 10 seconds
  /** Log connection lifecycle (open/close/error) when true. Default: development only. */
  logConnectionLifecycle:
    process.env.NEXT_PUBLIC_SSE_LOG_CONNECTION_LIFECYCLE === 'true' ||
    process.env.NODE_ENV === 'development',
} as const;

/**
 * Request deduplication configuration
 * Time in milliseconds to keep request fingerprints in memory
 */
const _fingerprintTtl = parseInt(
  process.env.NEXT_PUBLIC_REQUEST_DEDUP_TTL_MS || '5000',
  10
);
export const deduplicationConfig = {
  /** Minimum TTL 5 seconds per Phase 3 plan. Use max(env, min). */
  minFingerprintTtl: 5000,
  fingerprintTtl: Math.max(_fingerprintTtl, 5000),
  /** Log deduplication events (skip duplicate request) when true. Default: development only. */
  logDeduplicationEvents:
    process.env.NEXT_PUBLIC_REQUEST_DEDUP_LOG === 'true' ||
    process.env.NODE_ENV === 'development',
} as const;

/**
 * Chunk accumulation configuration
 * Phase 3: Settings for handling streaming chunks
 * Phase 5: All values configurable via env to avoid hardcoded config
 */
export const chunkConfig = {
  /**
   * Threshold for empty chunk warnings.
   * After this many empty chunks, a warning will be logged.
   * Configurable via NEXT_PUBLIC_CHUNK_EMPTY_WARNING_THRESHOLD (default: 10)
   */
  emptyChunkWarningThreshold: parseInt(
    process.env.NEXT_PUBLIC_CHUNK_EMPTY_WARNING_THRESHOLD || '10',
    10
  ),

  /**
   * Maximum length of chunk preview in warning messages.
   * Configurable via NEXT_PUBLIC_CHUNK_PREVIEW_LENGTH (default: 50)
   */
  chunkPreviewLength: parseInt(
    process.env.NEXT_PUBLIC_CHUNK_PREVIEW_LENGTH || '50',
    10
  ),

  /**
   * Rapid chunk batching delay (milliseconds).
   * Chunks arriving within this time window will be batched together.
   * Phase 3: Centralized from useSummaryStream hook.
   * Configurable via NEXT_PUBLIC_CHUNK_RAPID_BATCH_MS (default: 50)
   */
  rapidChunkBatchMs: parseInt(
    process.env.NEXT_PUBLIC_CHUNK_RAPID_BATCH_MS || '50',
    10
  ),
} as const;

/**
 * API Configuration
 * Re-exported from centralized API config
 */
import { apiBaseUrl, apiEndpoints } from './api';

export const apiConfig = {
  /**
   * Base API URL
   * Can be overridden via NEXT_PUBLIC_API_URL environment variable
   */
  baseUrl: apiBaseUrl,
  
  /**
   * SSE endpoint path template for summary jobs
   * {jobId} will be replaced with actual job ID
   */
  sseEndpoint: apiEndpoints.status,
  
  /**
   * SSE endpoint path template for research jobs
   * {jobId} will be replaced with actual job ID
   */
  researchSseEndpoint: apiEndpoints.researchStatus,
} as const;

/**
 * Canonical streaming/API message strings.
 * Used as fallbacks when backend doesn't send a message. Components translate
 * these at render time via status-messages config - do not display directly.
 */
export const streamingMessages = {
  summaryCompleted: 'Summary completed!', // Maps to common:messages.summaryCompleted
  connectionLost: 'Connection lost. Please try again.',
  reconnectFailed: 'Failed to reconnect. Please try starting a new job.',
  unknownError: 'Unknown error occurred',
  invalidResponse: 'Invalid response from server',
  failedToStartJob: 'Failed to start job',
} as const;

