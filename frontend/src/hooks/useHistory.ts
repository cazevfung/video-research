'use client';

import { useState, useEffect, useCallback } from 'react';
import { getHistory } from '@/lib/api';
import { HistoryResponse, SummaryListItem } from '@/types';
import { validateHistoryResponse, sanitizeHistoryResponse } from '@/utils/validation';

// Define ApiError type locally
interface ApiError {
  code: string;
  message: string;
  details?: any;
}
import { isDevelopmentMode, getDevUserId } from '@/config/env';

// Safe stringify function to handle circular references and deeply nested objects
function safeStringify(obj: any, maxDepth = 3, currentDepth = 0): string {
  if (currentDepth >= maxDepth) return '[Max Depth Reached]';
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== 'object') return String(obj);
  
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
  } catch (e) {
    return `[Stringify Error: ${e instanceof Error ? e.message : 'Unknown'}]`;
  }
}

interface UseHistoryReturn {
  summaries: SummaryListItem[];
  pagination: HistoryResponse['pagination'] | null;
  loading: boolean;
  error: ApiError | null;
  fetchHistory: (page?: number, limit?: number) => Promise<void>;
  hasMore: boolean;
  // Phase 5: Debug information for local development
  debugInfo?: {
    userId: string;
    lastResponse?: HistoryResponse;
    lastError?: ApiError;
    isDevMode: boolean;
  };
}

/**
 * Hook for fetching and managing history data
 */
export function useHistory(initialPage = 1, initialLimit = 20): UseHistoryReturn {
  const [summaries, setSummaries] = useState<SummaryListItem[]>([]);
  const [pagination, setPagination] = useState<HistoryResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentLimit] = useState(initialLimit);
  // Phase 5: Debug information for local development
  const [lastResponse, setLastResponse] = useState<HistoryResponse | undefined>(undefined);
  const [lastError, setLastError] = useState<ApiError | undefined>(undefined);
  const isDev = isDevelopmentMode();
  const devUserId = getDevUserId();

  const fetchHistory = useCallback(
    async (page = currentPage, limit = currentLimit) => {
      // Phase 1: Comprehensive logging for API calls
      console.log('[useHistory] fetchHistory called', {
        page,
        limit,
        currentPage,
        currentLimit,
        userId: devUserId,
        isDev,
        timestamp: new Date().toISOString(),
      });

      setLoading(true);
      setError(null);

      try {
        // Phase 1: Log request details before API call
        const apiUrl = typeof window !== 'undefined' ? window.location.origin : 'unknown';
        console.log('[useHistory] Making API request:', {
          endpoint: '/api/history',
          queryParams: { page, limit },
          apiUrl,
          userId: devUserId,
        });

        const startTime = Date.now();
        const response = await getHistory(page, limit);
        const duration = Date.now() - startTime;

        // Phase 1: Log response details
        console.log('[useHistory] API response received', {
          duration: `${duration}ms`,
          hasError: !!response.error,
          hasData: !!response.data,
          error: response.error ? {
            code: response.error.code,
            message: response.error.message,
            details: response.error.details,
          } : null,
          dataSummary: response.data ? {
            summariesCount: response.data.summaries?.length || 0,
            pagination: response.data.pagination,
          } : null,
        });

        if (response.error) {
          setError(response.error);
          setLastError(response.error);
          setSummaries([]);
          setPagination(null);
          
          // Phase 1 & 5: Enhanced error logging
          // Use console.warn for connection errors (expected when backend is down)
          // Use console.error only for unexpected errors
          const isConnectionError = response.error.code === 'CONNECTION_FAILED' || response.error.code === 'NETWORK_ERROR';
          const logMethod = isConnectionError ? console.warn : console.error;
          
          console.group(isConnectionError ? '⚠️ History Fetch Connection Issue' : '❌ History Fetch Error');
          logMethod('Error Code:', response.error.code);
          logMethod('Error Message:', response.error.message);
          console.log('User ID:', devUserId);
          console.log('Page:', page, 'Limit:', limit);
          if (response.error.details !== undefined) {
            try {
              console.log('Error Details:', safeStringify(response.error.details));
            } catch (e) {
              console.log('Error Details:', '[Unable to stringify - may contain circular references]');
            }
          }
          console.log('Request Duration:', `${duration}ms`);
          if (isDev) {
            try {
              console.log('Full Response:', safeStringify(response));
            } catch (e) {
              console.log('Full Response:', '[Unable to stringify - may contain circular references]');
            }
          }
          console.groupEnd();
        } else if (response.data) {
          // Phase 3: Validate response data
          const validation = validateHistoryResponse(response.data);
          
          if (!validation.isValid) {
            // Phase 3: Try to sanitize the data
            const sanitized = sanitizeHistoryResponse(response.data);
            
            if (sanitized) {
              // Use sanitized data with warning
              console.warn('[useHistory] Response validation failed, using sanitized data', {
                errors: validation.errors,
                originalData: response.data,
                sanitizedData: sanitized,
              });
              
              setSummaries(sanitized.summaries);
              setPagination(sanitized.pagination);
              setLastResponse(sanitized);
              setCurrentPage(page);
            } else {
              // Data is too corrupted, treat as error
              const validationError: ApiError = {
                code: 'DATA_VALIDATION_ERROR',
                message: 'Received invalid data format from server',
                details: {
                  validationErrors: validation.errors,
                  receivedData: response.data,
                },
              };
              
              setError(validationError);
              setLastError(validationError);
              setSummaries([]);
              setPagination(null);
              
              console.group('❌ History Data Validation Error');
              console.error('Validation Errors:', validation.errors);
              console.log('Received Data:', response.data);
              console.log('User ID:', devUserId);
              console.log('Page:', page, 'Limit:', limit);
              console.groupEnd();
            }
          } else {
            // Data is valid
            setSummaries(validation.data!.summaries);
            setPagination(validation.data!.pagination);
            setLastResponse(validation.data!);
            setCurrentPage(page);
            
            // Phase 1 & 5: Enhanced success logging
            console.group('✅ History Fetch Success');
            console.log('User ID:', devUserId);
            console.log('Summaries found:', validation.data!.summaries.length);
            console.log('Pagination:', validation.data!.pagination);
            console.log('Page:', page, 'Limit:', limit);
            console.log('Request Duration:', `${duration}ms`);
            if (validation.data!.summaries.length > 0) {
              console.log('First Summary:', {
                id: validation.data!.summaries[0]._id,
                title: validation.data!.summaries[0].batch_title,
                createdAt: validation.data!.summaries[0].created_at,
                videoCount: validation.data!.summaries[0].video_count,
              });
            }
            if (isDev) {
              console.log('Full Response:', response);
            }
            console.groupEnd();
          }
        } else {
          // Phase 1: Log unexpected response format
          console.warn('[useHistory] Unexpected response format - no error and no data', {
            response,
            page,
            limit,
          });
        }
      } catch (err) {
        // Phase 1: Enhanced exception logging
        const apiError: ApiError = {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to fetch history',
        };
        setError(apiError);
        setLastError(apiError);
        setSummaries([]);
        setPagination(null);
        
        console.group('❌ History Fetch Exception');
        console.error('Exception Message:', err instanceof Error ? err.message : String(err));
        console.log('User ID:', devUserId);
        console.log('Page:', page, 'Limit:', limit);
        if (err instanceof Error) {
          console.log('Error Name:', err.name);
          console.log('Error Stack:', err.stack);
        }
        if (isDev) {
          try {
            console.log('Full Error Object:', safeStringify(err));
          } catch (e) {
            console.log('Full Error Object:', '[Unable to stringify - may contain circular references]');
          }
        }
        console.groupEnd();
      } finally {
        setLoading(false);
      }
    },
    [currentPage, currentLimit, isDev, devUserId]
  );

  // Phase 2: Fix useEffect dependencies - fetchHistory is stable via useCallback
  // Only run on mount with initial values
  useEffect(() => {
    fetchHistory(initialPage, initialLimit);
    // Phase 2: ESLint disable for intentional mount-only behavior
    // fetchHistory is stable via useCallback with proper dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const hasMore = pagination && pagination.totalPages !== undefined ? pagination.page < pagination.totalPages : false;

  return {
    summaries,
    pagination,
    loading,
    error,
    fetchHistory,
    hasMore,
    // Phase 5: Debug information for local development
    ...(isDev && {
      debugInfo: {
        userId: devUserId,
        lastResponse,
        lastError,
        isDevMode: true,
      },
    }),
  };
}

