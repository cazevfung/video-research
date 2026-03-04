/**
 * Centralized API Configuration
 * Shared configuration for all API-related settings
 */

/**
 * Base API URL from environment variable
 * In production, this MUST be set at build time
 * Falls back to localhost only in development
 */
function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // In production, fail loudly if API URL is not set or is localhost
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname !== 'localhost' && 
                         !window.location.hostname.includes('127.0.0.1');
    
    if (isProduction) {
      if (!apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
        console.error('❌ CRITICAL: NEXT_PUBLIC_API_URL is not set correctly in production!');
        console.error('   Current value:', apiUrl || '(not set)');
        console.error('   This build is misconfigured. Please rebuild with correct API URL.');
        // Show user-friendly error
        throw new Error(
          'Application configuration error. Please contact support if this persists.'
        );
      }
    }
  }
  
  // Phase 7: Use environment variable for default localhost port
  const defaultPort = process.env.NEXT_PUBLIC_API_DEFAULT_PORT || '5000';
  return apiUrl || `http://localhost:${defaultPort}`;
}

export const apiBaseUrl = getApiBaseUrl();

/**
 * API endpoint paths
 */
export const apiEndpoints = {
  // Summary endpoints
  summarize: '/api/summarize',
  status: (jobId: string) => `/api/status/${jobId}`,
  config: '/api/config',
  history: '/api/history',
  summary: (summaryId: string) => `/api/summary/${summaryId}`,
  
  // Auth endpoints
  authLogin: '/auth/login',
  authMe: '/auth/me',
  
  // User endpoints
  userProfile: '/api/user/profile',
  userSettings: '/api/user/settings',
  userLanguage: '/api/user/language',
  userStats: '/api/user/stats',
  
  // Credit endpoints
  creditsBalance: '/api/credits/balance',
  creditsTransactions: '/api/credits/transactions',
  
  // Tier endpoints
  tierStatus: '/api/tier/status',
  tierRequest: '/api/tier/request',
  
  // Task endpoints (Phase 2: Multiple simultaneous tasks)
  tasksActive: '/api/tasks/active',
  taskCancel: (jobId: string) => `/api/tasks/${jobId}/cancel`,
  
  // Guest endpoints
  guestSummary: (sessionId: string) => `/api/guest/summary/${sessionId}`,
  
  // Research endpoints
  research: '/api/research',
  researchStatus: (jobId: string) => `/api/research/${jobId}/status`,
  researchDocument: (id: string) => `/api/research/${id}`, // Phase 4: Get research by document ID
  researchApprove: (jobId: string, stage: string) => `/api/research/${jobId}/approve/${stage}`, // Phase 3: Approve research stage
  researchRegenerate: (jobId: string, stage: string) => `/api/research/${jobId}/regenerate/${stage}`, // Phase 3: Regenerate research stage
  researchShare: (researchId: string) => `/api/research/${researchId}/share`, // Phase 2: Create or get share link
  summaryShare: (summaryId: string) => `/api/history/${summaryId}/share`, // Create or get share link for summary
  
  // Share endpoints
  sharedResearch: (shareId: string) => `/api/shared/${shareId}`, // Phase 2: Get shared research/summary (public)
} as const;

/**
 * API cache and polling configuration
 * All timing values are in milliseconds
 * Configurable via environment variables with sensible defaults
 */
export const apiConfig = {
  // Request cache duration (default: 30 seconds, configurable via NEXT_PUBLIC_API_CACHE_DURATION_MS)
  cacheDuration: parseInt(
    process.env.NEXT_PUBLIC_API_CACHE_DURATION_MS || '30000',
    10
  ),
  
  // User data polling interval (default: 30 seconds, configurable via NEXT_PUBLIC_USER_DATA_POLLING_INTERVAL_MS)
  userDataPollingInterval: parseInt(
    process.env.NEXT_PUBLIC_USER_DATA_POLLING_INTERVAL_MS || '30000',
    10
  ),
  
  // Maximum cache entries before cleanup (default: 50, configurable via NEXT_PUBLIC_API_MAX_CACHE_ENTRIES)
  maxCacheEntries: parseInt(
    process.env.NEXT_PUBLIC_API_MAX_CACHE_ENTRIES || '50',
    10
  ),
  
  // Retry configuration
  retry: {
    // Maximum number of retries for failed requests (default: 3, configurable via NEXT_PUBLIC_API_MAX_RETRIES)
    maxRetries: parseInt(
      process.env.NEXT_PUBLIC_API_MAX_RETRIES || '3',
      10
    ),
    
    // Initial retry delay in milliseconds (default: 1000ms, configurable via NEXT_PUBLIC_API_RETRY_DELAY_MS)
    initialDelay: parseInt(
      process.env.NEXT_PUBLIC_API_RETRY_DELAY_MS || '1000',
      10
    ),
    
    // Maximum retry delay in milliseconds (default: 10000ms, configurable via NEXT_PUBLIC_API_MAX_RETRY_DELAY_MS)
    maxDelay: parseInt(
      process.env.NEXT_PUBLIC_API_MAX_RETRY_DELAY_MS || '10000',
      10
    ),
    
    // Retry multiplier for exponential backoff (default: 2, configurable via NEXT_PUBLIC_API_RETRY_MULTIPLIER)
    multiplier: parseFloat(
      process.env.NEXT_PUBLIC_API_RETRY_MULTIPLIER || '2',
    ),
  },
  
  // Request timeout in milliseconds (default: 30000ms, configurable via NEXT_PUBLIC_API_TIMEOUT_MS)
  timeout: parseInt(
    process.env.NEXT_PUBLIC_API_TIMEOUT_MS || '30000',
    10
  ),

  // Rate limiting configuration
  rateLimit: {
    // Default retry-after duration in seconds when backend doesn't provide one (default: 900 = 15 minutes)
    // Configurable via NEXT_PUBLIC_RATE_LIMIT_DEFAULT_RETRY_AFTER_SECONDS
    defaultRetryAfterSeconds: parseInt(
      process.env.NEXT_PUBLIC_RATE_LIMIT_DEFAULT_RETRY_AFTER_SECONDS || '900',
      10
    ),
    
    // Maximum pause duration in seconds (cap for rate limit pauses) (default: 300 = 5 minutes)
    // Configurable via NEXT_PUBLIC_RATE_LIMIT_MAX_PAUSE_SECONDS
    maxPauseSeconds: parseInt(
      process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_PAUSE_SECONDS || '300',
      10
    ),
  },

  // Toast notification configuration
  toast: {
    // Default toast duration in milliseconds (default: 5000 = 5 seconds)
    // Configurable via NEXT_PUBLIC_TOAST_DEFAULT_DURATION_MS
    defaultDuration: parseInt(
      process.env.NEXT_PUBLIC_TOAST_DEFAULT_DURATION_MS || '5000',
      10
    ),
    
    // Auth error toast duration (0 = don't auto-dismiss) (default: 0)
    // Configurable via NEXT_PUBLIC_TOAST_AUTH_ERROR_DURATION_MS
    authErrorDuration: parseInt(
      process.env.NEXT_PUBLIC_TOAST_AUTH_ERROR_DURATION_MS || '0',
      10
    ),
  },

  // Task management configuration
  tasks: {
    // Task restoration timeout in milliseconds (default: 300000 = 5 minutes)
    // Tasks older than this won't be restored from sessionStorage on page refresh
    // Configurable via NEXT_PUBLIC_TASK_RESTORATION_TIMEOUT_MS
    restorationTimeout: parseInt(
      process.env.NEXT_PUBLIC_TASK_RESTORATION_TIMEOUT_MS || '300000',
      10
    ),
  },
} as const;

