/**
 * API Client for YouTube Batch Summary Service
 * Handles all API communication with the backend
 * Phase 5: Enhanced error handling for local development
 */

import { 
  SummaryRequest, 
  SummaryResponse, 
  HistoryResponse,
  CurrentUserData,
  UserCredits,
  CreditBalanceResponse,
  CreditTransactionsResponse,
  TierStatus,
  UserSettings,
  User,
  CreditTransaction,
  ResearchRequest,
  ResearchResponse,
} from '@/types';
import { apiBaseUrl, apiEndpoints, apiConfig } from '@/config/api';
import { getAuthToken as getFirebaseToken } from './auth-token';
import { isDevelopmentMode, getApiBaseUrl, getDevUserId } from '@/config/env';
import { getGuestSessionId } from '@/utils/guest-session.utils';
import {
  getDevModeCreditOverride,
  getDevModeBypassRateLimits,
  getDevModeApiMocks,
  getDevModeUserTier,
} from '@/utils/dev-mode';
import { guestConfig } from '@/config/guest';
import { requestDeduplicator } from './request-deduplicator';
import { recordAPIRequest, recordAPIError, recordAPISuccess, recordRateLimit } from './metrics';

/**
 * Base API URL - using centralized config
 */
const API_URL = apiBaseUrl;

/**
 * Phase 7: Request cache for GET requests (simple in-memory cache)
 * Cache duration from centralized config
 */
const requestCache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(endpoint: string): string {
  return endpoint;
}

function getCachedResponse<T>(endpoint: string): ApiResponse<T> | null {
  const key = getCacheKey(endpoint);
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < apiConfig.cacheDuration) {
    return { data: cached.data };
  }
  return null;
}

function setCachedResponse<T>(endpoint: string, data: T): void {
  const key = getCacheKey(endpoint);
  requestCache.set(key, { data, timestamp: Date.now() });
  
  // Clean up old cache entries periodically
  if (requestCache.size > apiConfig.maxCacheEntries) {
    const now = Date.now();
    for (const [k, v] of requestCache.entries()) {
      if (now - v.timestamp > apiConfig.cacheDuration) {
        requestCache.delete(k);
      }
    }
  }
}

/**
 * Phase 7: Invalidate cache for a specific endpoint or all endpoints matching a pattern
 * @param pattern - Endpoint pattern to invalidate (use '*' for all)
 */
export function invalidateCache(pattern: string = '*'): void {
  if (pattern === '*') {
    requestCache.clear();
    return;
  }
  
  // Invalidate exact match or pattern match
  for (const [key] of requestCache.entries()) {
    if (key === pattern || key.includes(pattern)) {
      requestCache.delete(key);
    }
  }
}

/**
 * Phase 7: Check if an error is retryable
 */
function isRetryableError(error: ApiError | null, status?: number): boolean {
  if (!error) return false;
  
  // Don't retry 429 (rate limit) - handled separately with longer delays
  if (status === 429) {
    return false; // Handled separately in apiFetch
  }
  
  // Don't retry client errors (4xx) except 408 (timeout)
  if (status && status >= 400 && status < 500) {
    return status === 408;
  }
  
  // Retry network errors and server errors (5xx)
  return (
    error.code === 'NETWORK_ERROR' ||
    error.code === 'UNKNOWN_ERROR' ||
    error.code === 'TIMEOUT_ERROR'
  );
}

/**
 * Phase 7: Calculate exponential backoff delay
 */
function calculateRetryDelay(retryCount: number): number {
  const { initialDelay, multiplier, maxDelay } = apiConfig.retry;
  const delay = initialDelay * Math.pow(multiplier, retryCount);
  return Math.min(delay, maxDelay);
}

/**
 * Phase 7: Sleep utility for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * API Error Response Structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

/**
 * Get authentication token
 * Uses Firebase token if Firebase Auth is enabled, otherwise falls back to localStorage JWT
 */
async function getAuthToken(): Promise<string | null> {
  // Check if Firebase Auth is enabled
  const useFirebaseAuth = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true';
  
  if (useFirebaseAuth) {
    // Use Firebase token getter
    return await getFirebaseToken();
  }
  
  // Fallback to JWT token from localStorage (for Passport.js auth)
  return localStorage.getItem('auth_token');
}

/**
 * Build request headers with authentication
 * Phase 2: Enhanced authentication verification and logging
 * Phase 3: Added guest session ID support
 */
async function buildHeaders(includeAuth = true): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      
      // Phase 2: Log auth token presence in development mode
      if (isDevelopmentMode()) {
        console.debug('[api] Auth token included in request', {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20) + '...',
        });
      }
    } else {
      // Phase 3: If no auth token, check for guest session ID
      const guestSessionId = getGuestSessionId();
      if (guestSessionId) {
        headers[guestConfig.sessionHeaderName] = guestSessionId;
        
        if (isDevelopmentMode()) {
          console.debug('[api] Guest session ID included in request', {
            sessionId: guestSessionId.substring(0, 20) + '...',
          });
        }
      }
      
      // Phase 2: Log missing token in development mode
      if (isDevelopmentMode()) {
        const useFirebaseAuth = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true';
        console.debug('[api] No auth token available', {
          useFirebaseAuth,
          hasGuestSession: !!guestSessionId,
          endpoint: 'current request',
          note: useFirebaseAuth 
            ? 'Firebase auth may not be initialized yet'
            : 'JWT token not found in localStorage',
        });
      }
    }
  }

  // Phase 2: Dev mode rate limit bypass header (backend may support X-Dev-Bypass-Rate-Limit)
  if (isDevelopmentMode() && getDevModeBypassRateLimits()) {
    (headers as Record<string, string>)['X-Dev-Bypass-Rate-Limit'] = 'true';
  }

  return headers;
}

/**
 * Base fetch wrapper with error handling and retry logic
 * Phase 7: Added request caching, retry mechanisms with exponential backoff
 * Phase 4: Added cache bypass support for language changes
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { bypassCache?: boolean } = {},
  retryCount = 0
): Promise<ApiResponse<T>> {
  const { bypassCache, ...fetchOptions } = options;
  
  // Check cache for GET requests (skip cache on retry or if bypassCache is true)
  if ((fetchOptions.method === 'GET' || !fetchOptions.method) && retryCount === 0 && !bypassCache) {
    const cached = getCachedResponse<T>(endpoint);
    if (cached) {
      return cached;
    }
  }

  // Phase 2: Dev mode API mocking (before real request)
  if (typeof window !== 'undefined' && isDevelopmentMode()) {
    const pathname = (endpoint.startsWith('http') ? new URL(endpoint).pathname : endpoint).split('?')[0];
    const mocks = getDevModeApiMocks();
    const mock = mocks[pathname];
    if (mock?.enabled) {
      if (mock.type === 'error') {
        return { error: { code: 'MOCKED_ERROR', message: mock.error || 'Mocked error' } };
      }
      return { data: (mock.data ?? {}) as T };
    }
  }

  const startTime = Date.now();
  const endpointPath = endpoint.startsWith('http')
    ? new URL(endpoint).pathname
    : endpoint;

  // Phase 3: Record API request
  recordAPIRequest(endpointPath);

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const baseHeaders = await buildHeaders();
    
    // Phase 4: Add cache control headers when bypassCache is true
    // Convert HeadersInit to plain object for modification
    const headersObj: Record<string, string> = 
      baseHeaders instanceof Headers
        ? Object.fromEntries(baseHeaders.entries())
        : Array.isArray(baseHeaders)
        ? Object.fromEntries(baseHeaders)
        : (baseHeaders as Record<string, string>);
    
    if (bypassCache) {
      headersObj['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headersObj['Pragma'] = 'no-cache';
      headersObj['Expires'] = '0';
    }
    
    // Merge with any headers from fetchOptions
    const fetchHeadersObj = fetchOptions.headers instanceof Headers
      ? Object.fromEntries(fetchOptions.headers.entries())
      : Array.isArray(fetchOptions.headers)
      ? Object.fromEntries(fetchOptions.headers)
      : (fetchOptions.headers as Record<string, string> | undefined) || {};
    
    const finalHeaders: HeadersInit = {
      ...headersObj,
      ...fetchHeadersObj,
    };
    
    // Phase 7: Add timeout support using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, apiConfig.timeout);
    
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: finalHeaders,
    });
    
    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;

    // Handle non-JSON responses (e.g., SSE)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      // SSE endpoints should use AuthenticatedSSE client (from lib/authenticated-sse.ts)
      // which uses fetch with ReadableStream to support authentication headers
      throw new Error('SSE endpoint should use AuthenticatedSSE client, not fetch');
    }

    // Parse JSON response with error handling
    let data: any;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      // If JSON parsing fails, create a proper error response
      if (!response.ok) {
        return {
          error: {
            code: 'PARSE_ERROR',
            message: `Failed to parse server response (status ${response.status})`,
            details: {
              status: response.status,
              endpoint,
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
            },
          },
        };
      }
      // If response is OK but parsing fails, return empty data
      data = {};
    }

    if (!response.ok) {
      const isDev = isDevelopmentMode();
      
      // Phase 7: Better error messages for quota/rate limit errors
      if (response.status === 429) {
        const error: ApiError = {
          code: 'RATE_LIMIT',
          message: data.error?.message || 'Too many requests. Please try again later.',
          details: data.error?.details,
        };
        
        // Phase 3: Record rate limit metric
        const retryAfter = data.error?.details?.retryAfter || apiConfig.rateLimit.defaultRetryAfterSeconds;
        recordRateLimit(endpointPath, retryAfter);
        
        // Don't retry 429 errors immediately - wait much longer or don't retry at all
        // Retrying 429 errors too quickly makes the rate limiting worse
        // Only retry if it's the first attempt and wait at least 30 seconds
        if (retryCount === 0) {
          const delay = Math.max(30000, calculateRetryDelay(retryCount) * 10); // At least 30 seconds
          await sleep(delay);
          return apiFetch<T>(endpoint, options, retryCount + 1);
        }
        
        // After first retry, don't retry again - return error immediately
        return { error };
      }
      
      if (response.status === 403 && data.error?.code === 'QUOTA_EXCEEDED') {
        // Phase 3: Record API error
        recordAPIError(endpointPath, 'QUOTA_EXCEEDED');
        return {
          error: {
            code: 'QUOTA_EXCEEDED',
            message: data.error?.message || 'Daily quota exceeded. Please try again tomorrow.',
            details: data.error?.details,
          },
        };
      }
      
      if (response.status === 408) {
        // Phase 3: Better timeout error messages
        const timeoutMs = apiConfig.timeout;
        const error: ApiError = {
          code: 'TIMEOUT_ERROR',
          message: `Request timed out after ${timeoutMs / 1000} seconds. The server may be slow or overloaded.`,
          details: { 
            status: response.status, 
            endpoint,
            timeout: timeoutMs,
            suggestions: [
              'Try again in a few moments',
              'Check if the server is experiencing high load',
              'Verify your internet connection is stable',
            ],
          },
        };
        
        if (isRetryableError(error, response.status) && retryCount < apiConfig.retry.maxRetries) {
          const delay = calculateRetryDelay(retryCount);
          await sleep(delay);
          return apiFetch<T>(endpoint, options, retryCount + 1);
        }
        
        return { error };
      }
      
      // Phase 5: Enhanced error messages for local development
      if (isDev) {
        const devUserId = getDevUserId();
        let enhancedMessage = data.error?.message || `Request failed with status ${response.status}`;
        const suggestions: string[] = [];
        
        if (response.status === 401 || response.status === 403) {
          // Phase 3: Record API error
          recordAPIError(endpointPath, response.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN');
          
          const useFirebaseAuth = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true';
          const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false';
          
          suggestions.push(`Current dev user ID: ${devUserId}`);
          suggestions.push(`Firebase Auth: ${useFirebaseAuth ? 'enabled' : 'disabled'}`);
          suggestions.push(`Auth Enabled: ${authEnabled ? 'yes' : 'no'}`);
          
          if (!useFirebaseAuth) {
            suggestions.push('Ensure backend DEV_USER_ID matches frontend NEXT_PUBLIC_DEV_USER_ID');
            suggestions.push('Check that AUTH_ENABLED=false in backend for local dev');
          } else {
            suggestions.push('Check Firebase Auth configuration');
            suggestions.push('Verify Firebase token is being generated correctly');
          }
          
          enhancedMessage += '\n\n💡 Auth Error - Check user ID consistency and auth configuration between frontend and backend';
        }
        
        if (response.status === 404) {
          suggestions.push(`Endpoint: ${endpoint}`);
          suggestions.push('Verify the route exists in backend');
          suggestions.push('Check backend server logs for routing errors');
          enhancedMessage += '\n\n💡 Not Found - Verify endpoint exists in backend';
        }
        
        if (response.status === 500) {
          suggestions.push('Check backend logs for detailed error');
          suggestions.push('Verify local storage directories exist if using local storage');
          suggestions.push('Check backend config.yaml for correct settings');
          enhancedMessage += '\n\n💡 Server Error - Check backend logs for details';
        }
        
        return {
          error: {
            code: data.error?.code || 'HTTP_ERROR',
            message: enhancedMessage,
            details: {
              ...data.error?.details,
              status: response.status,
              endpoint,
              suggestions,
              devMode: true,
            },
          },
        };
      }
      
      // Check if data.error exists and has required properties
      // If it's an empty object or missing required fields, create a proper error
      const hasValidError = data.error && 
        typeof data.error === 'object' && 
        Object.keys(data.error).length > 0 &&
        'code' in data.error && 
        'message' in data.error &&
        typeof data.error.code === 'string' &&
        typeof data.error.message === 'string' &&
        data.error.code.length > 0 &&
        data.error.message.length > 0;
      
      const error: ApiError = hasValidError
        ? data.error 
        : {
            code: (data.error?.code && typeof data.error.code === 'string' && data.error.code.length > 0) 
              ? data.error.code 
              : 'HTTP_ERROR',
            message: (data.error?.message && typeof data.error.message === 'string' && data.error.message.length > 0)
              ? data.error.message 
              : `Request failed with status ${response.status}`,
            details: { 
              ...(data.error?.details && typeof data.error.details === 'object' ? data.error.details : {}),
              status: response.status, 
              endpoint,
              originalError: data.error && Object.keys(data.error).length > 0 ? data.error : undefined,
              rawData: data,
            },
          };
      
      // Phase 3: Record API error
      recordAPIError(endpointPath, error.code || `HTTP_${response.status}`);
      
      // Phase 7: Retry server errors (5xx)
      if (response.status >= 500 && isRetryableError(error, response.status) && retryCount < apiConfig.retry.maxRetries) {
        const delay = calculateRetryDelay(retryCount);
        await sleep(delay);
        return apiFetch<T>(endpoint, options, retryCount + 1);
      }
      
      return { error };
    }

    // Check if successful response contains an error object (shouldn't happen, but handle it)
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      // If response is OK but contains an error, treat it as an error response
      const errorObj = data.error;
      const hasValidError = errorObj && 
        typeof errorObj === 'object' && 
        Object.keys(errorObj).length > 0 &&
        'code' in errorObj && 
        'message' in errorObj &&
        typeof errorObj.code === 'string' &&
        typeof errorObj.message === 'string' &&
        errorObj.code.length > 0 &&
        errorObj.message.length > 0;
      
      if (hasValidError) {
        return { error: errorObj };
      } else {
        // Invalid or empty error object in successful response
        return {
          error: {
            code: errorObj?.code || 'INVALID_RESPONSE',
            message: errorObj?.message || 'Server returned an invalid error object in successful response',
            details: {
              endpoint,
              originalError: errorObj && Object.keys(errorObj).length > 0 ? errorObj : undefined,
              rawData: data,
            },
          },
        };
      }
    }

    // Cache successful GET responses
    if (options.method === 'GET' || !options.method) {
      setCachedResponse(endpoint, data);
    }

    // Phase 3: Record API success
    recordAPISuccess(endpointPath, duration);

    return { data };
  } catch (error) {
    // Handle abort (timeout)
    // Defensive check: ensure error is defined before accessing properties
    if (error && error instanceof Error && error.name === 'AbortError') {
      // Phase 3: Better timeout error messages
      const timeoutMs = apiConfig.timeout;
      const timeoutError: ApiError = {
        code: 'TIMEOUT_ERROR',
        message: `Request timed out after ${timeoutMs / 1000} seconds. The server may be slow or overloaded.`,
        details: { 
          endpoint, 
          timeout: timeoutMs,
          suggestions: [
            'Try again in a few moments',
            'Check if the server is experiencing high load',
            'Verify your internet connection is stable',
          ],
        },
      };
      
      // Phase 3: Record API error
      recordAPIError(endpointPath, 'TIMEOUT_ERROR');
      
      // Phase 7: Retry timeout errors
      if (retryCount < apiConfig.retry.maxRetries) {
        const delay = calculateRetryDelay(retryCount);
        await sleep(delay);
        return apiFetch<T>(endpoint, options, retryCount + 1);
      }
      
      return { error: timeoutError };
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiUrl = getApiBaseUrl();
      const isDev = isDevelopmentMode();
      
      // Phase 3: Better error messages for network errors
      let message = 'Failed to connect to server. Please check your connection.';
      let suggestions: string[] = [];
      let errorCode = 'NETWORK_ERROR';
      
      // Phase 3: More specific error detection
      if (error.message.includes('Failed to fetch')) {
        // Most common network error
        message = 'Unable to reach the server. Please check your internet connection and try again.';
        errorCode = 'CONNECTION_FAILED';
        
        if (isDev) {
          suggestions.push(`Backend URL: ${apiUrl}`);
          suggestions.push('1. Ensure backend server is running (npm run dev in backend/)');
          suggestions.push('2. Check that backend is listening on the correct port');
          suggestions.push('3. Verify NEXT_PUBLIC_API_URL matches your backend URL');
          suggestions.push('4. Check browser console for CORS errors');
          
          if (apiUrl.includes('localhost')) {
            suggestions.push('5. Check backend logs for startup errors');
            suggestions.push('6. Verify USE_LOCAL_STORAGE=true if using local storage');
            suggestions.push('7. Try accessing the backend URL directly in your browser');
          }
        } else {
          suggestions.push('• Check your internet connection');
          suggestions.push('• Verify the service is available');
          suggestions.push('• Try refreshing the page');
        }
      } else if (error.message.includes('NetworkError') || error.message.includes('network')) {
        message = 'Network error occurred. Please check your connection and try again.';
        errorCode = 'NETWORK_ERROR';
        
        if (isDev) {
          suggestions.push(`Backend URL: ${apiUrl}`);
          suggestions.push('1. Check if backend server is running');
          suggestions.push('2. Verify network connectivity');
          suggestions.push('3. Check for firewall or proxy issues');
        } else {
          suggestions.push('• Check your internet connection');
          suggestions.push('• Try again in a few moments');
        }
      } else {
        // Generic network error
        if (isDev) {
          suggestions.push(`Backend URL: ${apiUrl}`);
          suggestions.push('1. Ensure backend server is running (npm run dev in backend/)');
          suggestions.push('2. Check that backend is listening on the correct port');
          suggestions.push('3. Verify NEXT_PUBLIC_API_URL matches your backend URL');
          
          if (apiUrl.includes('localhost')) {
            suggestions.push('4. Check backend logs for startup errors');
            suggestions.push('5. Verify USE_LOCAL_STORAGE=true if using local storage');
          }
        }
      }
      
      const networkError: ApiError = {
        code: errorCode,
        message: isDev && suggestions.length > 0 
          ? `${message}\n\n${suggestions.join('\n')}`
          : message,
        details: isDev ? {
          apiUrl,
          devMode: true,
          suggestions,
          originalError: error.message,
        } : {
          suggestions: suggestions.filter(s => !s.match(/^\d+\./)), // Filter out numbered dev suggestions
        },
      };
      
      // Phase 3: Record API error
      recordAPIError(endpointPath, networkError.code);
      
      // Phase 7: Retry network errors
      if (isRetryableError(networkError) && retryCount < apiConfig.retry.maxRetries) {
        const delay = calculateRetryDelay(retryCount);
        await sleep(delay);
        return apiFetch<T>(endpoint, options, retryCount + 1);
      }
      
      return { error: networkError };
    }

    // Phase 5: Enhanced error messages for local dev
    const isDev = isDevelopmentMode();
    let message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    if (isDev && error instanceof Error) {
      // Add helpful context for common local dev issues
      if (message.includes('JSON') || message.includes('parse')) {
        message += '\n\n💡 Tip: Check backend logs for detailed error information.';
      }
      
      if (message.includes('401') || message.includes('Unauthorized')) {
        const devUserId = getDevUserId();
        message += `\n\n💡 Local Dev Tip: Ensure backend AUTH_ENABLED=false or user ID matches: ${devUserId}`;
      }
      
      if (message.includes('404')) {
        message += '\n\n💡 Tip: Verify the API endpoint exists and backend routes are configured correctly.';
      }
    }

    // Phase 3: Record API error
    recordAPIError(endpointPath, 'UNKNOWN_ERROR');
    
    return {
      error: {
        code: 'UNKNOWN_ERROR',
        message,
        details: isDev ? {
          originalError: error instanceof Error ? error.message : String(error),
          devMode: true,
        } : undefined,
      },
    };
  }
}

/**
 * Start a new summary job
 * POST /api/summarize
 * Phase 7: Invalidates user data cache after job starts (credits deducted)
 */
export async function startSummaryJob(
  payload: SummaryRequest
): Promise<ApiResponse<{ job_id: string }>> {
  const response = await apiFetch<{ job_id: string }>(apiEndpoints.summarize, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  // Phase 7: Invalidate user data cache after job starts (credits may have been deducted)
  if (response.data && !response.error) {
    invalidateCache(apiEndpoints.authMe);
    invalidateCache(apiEndpoints.creditsBalance);
  }
  
  return response;
}

/**
 * Start a new research job
 * POST /api/research
 * Invalidates user data cache after job starts (credits deducted)
 */
export async function startResearchJob(
  payload: ResearchRequest
): Promise<ApiResponse<{ job_id: string }>> {
  const response = await apiFetch<{ job_id: string }>(apiEndpoints.research, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  // Invalidate user data cache after job starts (credits may have been deducted)
  if (response.data && !response.error) {
    invalidateCache(apiEndpoints.authMe);
    invalidateCache(apiEndpoints.creditsBalance);
  }
  
  return response;
}

/**
 * Get summary by ID
 * GET /api/summary/:id
 */
export async function getSummary(id: string): Promise<ApiResponse<SummaryResponse>> {
  return apiFetch<SummaryResponse>(apiEndpoints.summary(id));
}

/**
 * Phase 4: Get research by document ID
 * GET /api/research/:id
 */
export async function getResearch(id: string): Promise<ApiResponse<ResearchResponse>> {
  return apiFetch<ResearchResponse>(apiEndpoints.researchDocument(id));
}

/**
 * Phase 3: Approve a research stage
 * POST /api/research/:job_id/approve/:stage
 * Stages: 'questions', 'search_terms', 'videos'
 */
export async function approveResearchStage(
  jobId: string,
  stage: 'questions' | 'search_terms' | 'videos'
): Promise<ApiResponse<{ success: boolean; next_status?: string; message?: string }>> {
  return apiFetch<{ success: boolean; next_status?: string; message?: string }>(
    apiEndpoints.researchApprove(jobId, stage),
    {
      method: 'POST',
    }
  );
}

/**
 * Phase 3: Request regeneration of a research stage with feedback
 * POST /api/research/:job_id/regenerate/:stage
 * Stages: 'questions', 'search_terms', 'videos'
 */
export async function regenerateResearchStage(
  jobId: string,
  stage: 'questions' | 'search_terms' | 'videos',
  feedback: string
): Promise<ApiResponse<{ success: boolean; status?: string; message?: string }>> {
  return apiFetch<{ success: boolean; status?: string; message?: string }>(
    apiEndpoints.researchRegenerate(jobId, stage),
    {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }
  );
}

/**
 * Phase 2: Create or get existing share link for a research
 * POST /api/research/:researchId/share
 */
export async function shareResearch(
  researchId: string
): Promise<ApiResponse<{
  shareId: string;
  shareUrl: string;
  isNew: boolean;
  createdAt: number;
  accessCount?: number;
}>> {
  return apiFetch<{
    shareId: string;
    shareUrl: string;
    isNew: boolean;
    createdAt: number;
    accessCount?: number;
  }>(apiEndpoints.researchShare(researchId), {
    method: 'POST',
  });
}

/**
 * Create or get existing share link for a summary
 * POST /api/history/:summaryId/share
 */
export async function shareSummary(
  summaryId: string
): Promise<ApiResponse<{
  shareId: string;
  shareUrl: string;
  isNew: boolean;
  createdAt: number;
  accessCount?: number;
}>> {
  return apiFetch<{
    shareId: string;
    shareUrl: string;
    isNew: boolean;
    createdAt: number;
    accessCount?: number;
  }>(apiEndpoints.summaryShare(summaryId), {
    method: 'POST',
  });
}

/** Shared metadata returned for both research and summary shares */
export interface SharedMetadata {
  shareId: string;
  sharedAt: number;
  viewCount: number;
  sharedBy: string | null;
  requiresCaptcha?: boolean;
}

/** Response for shared research */
export interface SharedResearchData {
  contentType: 'research';
  research: ResearchResponse;
  metadata: SharedMetadata;
}

/** Response for shared summary */
export interface SharedSummaryData {
  contentType: 'summary';
  summary: SummaryResponse;
  metadata: SharedMetadata;
}

/** Union of shared content types */
export type SharedContentData = SharedResearchData | SharedSummaryData;

/**
 * Phase 2: Get shared research or summary data (public endpoint, no auth required)
 * GET /api/shared/:shareId
 */
export async function getSharedResearch(
  shareId: string
): Promise<ApiResponse<SharedContentData>> {
  const response = await apiFetch<{ data: SharedContentData }>(apiEndpoints.sharedResearch(shareId));

  // Backend returns: { success: true, data: { contentType, research|summary, metadata } }
  const wrapped: unknown = response.data;
  if (wrapped && typeof wrapped === 'object') {
    const wrappedRecord = wrapped as Record<string, unknown>;
    const inner = wrappedRecord['data'];
    if (inner && typeof inner === 'object') {
      return { data: inner as SharedContentData };
    }
  }

  return response as unknown as ApiResponse<SharedContentData>;
}

/**
 * Get guest summary by session ID
 * GET /api/guest/summary/:sessionId
 * Phase 3: Guest access support
 */
export async function getGuestSummary(sessionId: string): Promise<ApiResponse<SummaryResponse>> {
  return apiFetch<SummaryResponse>(apiEndpoints.guestSummary(sessionId));
}

/**
 * Get history of summaries
 * GET /api/history?page=1&limit=10
 */
export async function getHistory(
  page = 1,
  limit = 10
): Promise<ApiResponse<HistoryResponse>> {
  return apiFetch<HistoryResponse>(`${apiEndpoints.history}?page=${page}&limit=${limit}`);
}

/**
 * Delete a summary
 * DELETE /api/summary/:id
 * Phase 7: Invalidates history cache after successful deletion
 */
export async function deleteSummary(id: string): Promise<ApiResponse<void>> {
  const response = await apiFetch<void>(apiEndpoints.summary(id), {
    method: 'DELETE',
  });
  
  // Phase 7: Invalidate history cache after successful deletion
  if (response.data !== undefined && !response.error) {
    invalidateCache(apiEndpoints.history);
  }
  
  return response;
}

/**
 * Delete a research document by ID
 * DELETE /api/research/:id
 * Invalidates history cache after successful deletion
 */
export async function deleteResearch(id: string): Promise<ApiResponse<void>> {
  const response = await apiFetch<void>(apiEndpoints.researchDocument(id), {
    method: 'DELETE',
  });
  
  if (response.data !== undefined && !response.error) {
    invalidateCache(apiEndpoints.history);
  }
  
  return response;
}

/**
 * Health check
 * GET /health
 * @param bypassCache - when true, skip cache (e.g. for manual refresh in DevModePanel)
 */
export async function healthCheck(bypassCache?: boolean): Promise<ApiResponse<{
  status: string;
  timestamp: string;
  services: Record<string, string>;
  storage?: {
    mode: 'local' | 'firestore';
    enabled: boolean;
    fileCount?: number;
    dataDirectory?: string;
  };
  auth?: {
    enabled: boolean;
    mode: 'firebase' | 'jwt';
  };
  version: string;
}>> {
  return apiFetch('/health', bypassCache ? { bypassCache: true } : {});
}

// ============================================================================
// User API Functions
// Phase 1: Foundation - User management API functions
// ============================================================================

/**
 * Get current user data and quota
 * GET /auth/me
 * Phase 2: Dev mode user tier override merged into user.tier
 * Phase 3: Request deduplication to prevent multiple simultaneous requests
 */
export async function getCurrentUserData(): Promise<ApiResponse<CurrentUserData>> {
  const res = await requestDeduplicator.deduplicate('getCurrentUserData', async () => {
    return apiFetch<CurrentUserData>(apiEndpoints.authMe);
  });
  if (res.data && typeof window !== 'undefined' && isDevelopmentMode()) {
    const t = getDevModeUserTier();
    if (t) {
      return { ...res, data: { ...res.data, user: { ...res.data.user, tier: t } } };
    }
  }
  return res;
}

/**
 * Update user profile (name, email)
 * PATCH /api/user/profile
 * Phase 7: Invalidates user data cache after successful update
 */
export async function updateUserProfile(data: {
  name?: string;
  email?: string;
  language_preference?: string;
}): Promise<ApiResponse<{ user: User }>> {
  const response = await apiFetch<{ user: User }>(apiEndpoints.userProfile, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  
  // Phase 7: Invalidate user data cache after successful update
  if (response.data && !response.error) {
    invalidateCache(apiEndpoints.authMe);
    invalidateCache(apiEndpoints.userProfile);
  }
  
  return response;
}

/**
 * Get user credit balance and statistics
 * GET /api/credits/balance
 * Phase 1: Dev mode credit override - when set, returns overridden balance instead of API
 */
export async function getUserCredits(): Promise<ApiResponse<CreditBalanceResponse>> {
  if (typeof window !== 'undefined' && isDevelopmentMode()) {
    const override = getDevModeCreditOverride();
    if (override != null) {
      const balance = override === 'unlimited' ? 999999 : override;
      const tierOverride = getDevModeUserTier();
      return {
        data: {
          balance,
          totalEarned: 0,
          totalSpent: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          tier: (tierOverride as string) || 'free',
        },
      };
    }
  }
  return apiFetch<CreditBalanceResponse>(apiEndpoints.creditsBalance);
}

/**
 * Get credit transaction history
 * GET /api/credits/transactions?page=1&limit=20
 */
export async function getCreditTransactions(
  page = 1,
  limit = 20
): Promise<ApiResponse<CreditTransactionsResponse>> {
  return apiFetch<CreditTransactionsResponse>(
    `${apiEndpoints.creditsTransactions}?page=${page}&limit=${limit}`
  );
}

/**
 * Get tier status and pending requests
 * GET /api/tier/status
 * Phase 2: Dev mode user tier override
 * Phase 3: Request deduplication to prevent multiple simultaneous requests
 */
export async function getTierStatus(): Promise<ApiResponse<TierStatus>> {
  if (typeof window !== 'undefined' && isDevelopmentMode()) {
    const t = getDevModeUserTier();
    if (t) {
      return { data: { tier: t, balance: 0, pendingRequest: null } };
    }
  }
  return requestDeduplicator.deduplicate('getTierStatus', async () => {
    return apiFetch<TierStatus>(apiEndpoints.tierStatus);
  });
}

/**
 * Request tier upgrade
 * POST /api/tier/request
 * Phase 7: Invalidates tier status cache after successful request
 */
export async function requestTierUpgrade(
  requestedTier: 'starter' | 'pro' | 'premium'
): Promise<ApiResponse<{
  requestId: string;
  status: 'pending';
}>> {
  const response = await apiFetch<{
    requestId: string;
    status: 'pending';
  }>(apiEndpoints.tierRequest, {
    method: 'POST',
    body: JSON.stringify({ requestedTier }),
  });
  
  // Phase 7: Invalidate tier status cache after successful request
  if (response.data && !response.error) {
    invalidateCache(apiEndpoints.tierStatus);
  }
  
  return response;
}

/**
 * Get user settings
 * GET /api/user/settings
 */
export async function getUserSettings(): Promise<ApiResponse<{
  settings: UserSettings;
}>> {
  return apiFetch<{ settings: UserSettings }>(apiEndpoints.userSettings);
}

/**
 * Update user settings
 * PATCH /api/user/settings
 * Phase 7: Invalidates settings cache after successful update
 */
export async function updateUserSettings(
  settings: Partial<UserSettings>
): Promise<ApiResponse<{ settings: UserSettings }>> {
  const response = await apiFetch<{ settings: UserSettings }>(apiEndpoints.userSettings, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
  
  // Phase 7: Invalidate settings cache after successful update
  if (response.data && !response.error) {
    invalidateCache(apiEndpoints.userSettings);
  }
  
  return response;
}

/**
 * Update user language preference
 * PATCH /api/user/language
 * Phase 2: Language Settings Unification - Dedicated endpoint for language changes
 * Updates user.language_preference (single source of truth for language)
 * Phase 4: Uses cache bypass to ensure fresh data after language change
 * Phase 7: Invalidates user data cache after successful update
 */
export async function updateLanguagePreference(
  language: string
): Promise<ApiResponse<{ user: User }>> {
  const response = await apiFetch<{ user: User }>(apiEndpoints.userLanguage, {
    method: 'PATCH',
    body: JSON.stringify({ language }),
    bypassCache: true, // Phase 4: Force fresh data, bypass cache
  });
  
  // Phase 7: Invalidate user data cache after successful update
  if (response.data && !response.error) {
    invalidateCache(apiEndpoints.authMe);
    invalidateCache(apiEndpoints.userProfile);
  }
  
  return response;
}

/**
 * Get all active tasks for the current user
 * GET /api/tasks/active
 * Phase 2: Multiple simultaneous tasks
 * Phase 3: Request deduplication to prevent multiple simultaneous requests
 */
export async function getActiveTasks(): Promise<ApiResponse<{
  tasks: Array<{
    job_id: string;
    title: string | null;
    status: string;
    progress: number;
    message: string | null;
    created_at: string;
  }>;
}>> {
  return requestDeduplicator.deduplicate('getActiveTasks', async () => {
    return apiFetch<{
      tasks: Array<{
        job_id: string;
        title: string | null;
        status: string;
        progress: number;
        message: string | null;
        created_at: string;
      }>;
    }>(apiEndpoints.tasksActive);
  });
}

/**
 * Cancel a specific task
 * DELETE /api/tasks/:jobId/cancel
 * Phase 2: Multiple simultaneous tasks
 */
export async function cancelTask(jobId: string): Promise<ApiResponse<{
  success: boolean;
  message: string;
}>> {
  const response = await apiFetch<{
    success: boolean;
    message: string;
  }>(apiEndpoints.taskCancel(jobId), {
    method: 'DELETE',
  });
  
  // Invalidate active tasks cache after cancellation
  if (response.data && !response.error) {
    invalidateCache(apiEndpoints.tasksActive);
  }
  
  return response;
}