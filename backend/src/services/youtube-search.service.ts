/**
 * YouTube Search Service
 * Interacts with Supadata YouTube Search API
 */

import axios, { AxiosError } from 'axios';
import env from '../config/env';
import { getSupadataSearchConfig, getAPIConfig, getResearchConfig } from '../config';
import logger from '../utils/logger';

/**
 * Video search result from Supadata API
 */
export interface VideoSearchResult {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration_seconds: number;
  view_count: number;
  upload_date: string;
  url: string;
}

/**
 * Supadata API search response structure
 */
interface SupadataSearchResponse {
  results: Array<{
    id: string;
    title: string;
    channel: {
      name: string;
    };
    thumbnail: string;
    duration: number;
    viewCount: number;
    uploadDate: string;
  }>;
  totalResults?: number;
}

/**
 * Search options for YouTube video search
 */
export interface SearchOptions {
  limit?: number;
  sortBy?: 'views' | 'date' | 'relevance';
  duration?: 'short' | 'medium' | 'long';
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  if (error instanceof AxiosError) {
    // Network errors, timeouts, and 5xx errors are retryable
    if (!error.response) {
      return true; // Network error or timeout
    }
    const status = error.response.status;
    return status >= 500 || status === 429; // Server error or rate limit
  }
  // Timeout errors are retryable
  if (error instanceof Error && error.message.includes('timeout')) {
    return true;
  }
  return false;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search YouTube videos using Supadata API
 * @param query Search query
 * @param options Search options
 * @returns Array of video search results
 */
export async function searchYouTubeVideos(
  query: string,
  options: SearchOptions = {}
): Promise<VideoSearchResult[]> {
  const searchConfig = getSupadataSearchConfig();
  const apiConfig = getAPIConfig();
  const maxRetries = apiConfig.supadata.max_retries || 3;
  let lastError: Error | null = null;

  const researchConfig = getResearchConfig();
  const limit = options.limit || researchConfig.videos_per_query;
  const sortBy = options.sortBy || searchConfig.sort_by;
  const duration = options.duration;

  // Use research-specific timeout if available, otherwise fall back to API config timeout
  // Ensure minimum 60 seconds for search operations (they can be slow)
  const timeoutMs = Math.max(
    researchConfig.search_timeout_ms || apiConfig.supadata.timeout_ms || 60000,
    60000 // Minimum 60 seconds
  );

  // Build params object once (used in both try and catch blocks)
  const params: Record<string, any> = {
    query: query,
    type: searchConfig.video_type,
    limit: limit,
    sortBy: sortBy,
  };

  // Add duration filter if specified
  if (duration) {
    params.duration = duration;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {

      // Build full URL for logging
      const urlObj = new URL(searchConfig.search_url);
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, String(value));
      });
      const fullUrl = urlObj.toString();

      logger.info('[Supadata Search] Starting search request', {
        query,
        attempt,
        maxRetries,
        timeoutMs,
        limit,
        sortBy,
        duration: duration || 'none',
        url: searchConfig.search_url,
        fullUrl: fullUrl.replace(env.SUPADATA_API_KEY, '***MASKED***'),
        params,
        configSource: researchConfig.search_timeout_ms ? 'research.search_timeout_ms' : 
                      apiConfig.supadata.timeout_ms ? 'api.supadata.timeout_ms' : 'default',
        hasApiKey: !!env.SUPADATA_API_KEY,
        apiKeyLength: env.SUPADATA_API_KEY?.length || 0,
      });

      const requestStartTime = Date.now();
      const response = await axios.get<SupadataSearchResponse>(
        searchConfig.search_url,
        {
          headers: {
            'x-api-key': env.SUPADATA_API_KEY,
          },
          params,
          timeout: timeoutMs,
        }
      );
      const requestDuration = Date.now() - requestStartTime;

      logger.info('[Supadata Search] Request completed successfully', {
        query,
        attempt,
        status: response.status,
        statusText: response.statusText,
        duration: `${requestDuration}ms`,
        resultsCount: response.data?.results?.length || 0,
        hasTotalResults: !!response.data?.totalResults,
        totalResults: response.data?.totalResults,
      });

      // Transform Supadata response to our VideoSearchResult format
      const results: VideoSearchResult[] = response.data.results.map((item) => {
        // Extract video ID from URL or use id field
        const videoId = item.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        return {
          video_id: videoId,
          title: item.title,
          channel: item.channel.name,
          thumbnail: item.thumbnail,
          duration_seconds: item.duration,
          view_count: item.viewCount,
          upload_date: item.uploadDate,
          url: videoUrl,
        };
      });

      logger.info('[Supadata Search] Search completed', {
        query,
        resultsCount: results.length,
        attempt,
      });

      return results;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isTimeout = error instanceof AxiosError && 
        (error.code === 'ECONNABORTED' || error.message.includes('timeout'));
      const is429 = error instanceof AxiosError && error.response?.status === 429;
      const is500 = error instanceof AxiosError && error.response?.status === 500;

      // Extract detailed error information
      let errorDetails: Record<string, any> = {
        query,
        attempt,
        maxRetries,
        errorMessage: lastError.message,
        errorName: lastError.name,
        isTimeout,
        isRateLimit: is429,
        isServerError: is500,
        timeoutMs,
        url: searchConfig.search_url,
        params,
      };

      if (error instanceof AxiosError) {
        errorDetails = {
          ...errorDetails,
          axiosError: true,
          code: error.code,
          responseStatus: error.response?.status,
          responseStatusText: error.response?.statusText,
          responseHeaders: error.response?.headers ? 
            Object.keys(error.response.headers).reduce((acc, key) => {
              acc[key] = String(error.response?.headers[key]).substring(0, 100); // Limit header value length
              return acc;
            }, {} as Record<string, string>) : undefined,
          responseData: error.response?.data ? 
            (typeof error.response.data === 'string' 
              ? error.response.data.substring(0, 500) // Limit response data length
              : JSON.stringify(error.response.data).substring(0, 500)) : undefined,
          requestUrl: error.config?.url,
          requestMethod: error.config?.method,
          requestHeaders: error.config?.headers ? 
            Object.keys(error.config.headers).reduce((acc, key) => {
              const value = error.config?.headers?.[key];
              if (key.toLowerCase() === 'x-api-key') {
                acc[key] = '***MASKED***';
              } else {
                acc[key] = String(value).substring(0, 100);
              }
              return acc;
            }, {} as Record<string, string>) : undefined,
          requestParams: error.config?.params,
        };
      }

      // Extract Supadata-specific error details
      let supadataErrorDetails: any = undefined;
      if (error instanceof AxiosError && error.response?.data) {
        const responseData = error.response.data;
        if (typeof responseData === 'object' && responseData !== null) {
          supadataErrorDetails = {
            error: (responseData as any).error,
            message: (responseData as any).message,
            details: (responseData as any).details,
            documentationUrl: (responseData as any).documentationUrl,
          };
        }
      }

      // Log full error details
      logger.error('[Supadata Search] Request failed - Full error details', {
        ...errorDetails,
        supadataError: supadataErrorDetails,
        stack: lastError.stack,
      });

      if (isRetryableError(error) && attempt < maxRetries) {
        // Use longer backoff for 500 (server errors), 429 (rate limit), and timeouts
        // 500 errors indicate Supadata's backend is having issues, so wait longer
        let baseMs: number;
        if (is500) {
          baseMs = 5000; // 5 seconds for server errors - give Supadata time to recover
        } else if (is429) {
          baseMs = 3000; // 3 seconds for rate limits
        } else if (isTimeout) {
          baseMs = 2000; // 2 seconds for client timeouts
        } else {
          baseMs = apiConfig.supadata.retry_backoff_ms || 1000;
        }
        const backoffMs = baseMs * Math.pow(2, attempt - 1);
        logger.warn(`[Supadata Search] Retryable error, retrying in ${backoffMs}ms`, {
          query,
          attempt,
          maxRetries,
          error: lastError.message,
          isRateLimit: is429,
          isTimeout,
          isServerError: is500,
          timeoutMs,
          backoffMs,
          supadataError: error instanceof AxiosError && error.response?.data ? 
            (typeof error.response.data === 'object' ? error.response.data : String(error.response.data).substring(0, 200)) : undefined,
        });
        await sleep(backoffMs);
        continue;
      }

      // Non-retryable error or max retries reached
      // Create a more informative error message
      let errorMessage = lastError.message;
      if (error instanceof AxiosError && error.response?.data) {
        const responseData = error.response.data;
        if (typeof responseData === 'object' && responseData !== null) {
          const supadataError = responseData as any;
          if (supadataError.details) {
            errorMessage = `Supadata API Error: ${supadataError.message || 'Internal Error'} - ${supadataError.details}`;
          } else if (supadataError.message) {
            errorMessage = `Supadata API Error: ${supadataError.message}`;
          }
        }
      }

      logger.error('[Supadata Search] Search failed - Final error (no more retries)', {
        ...errorDetails,
        finalErrorMessage: errorMessage,
        stack: lastError.stack,
      });

      // Throw error with improved message
      const finalError = new Error(errorMessage);
      finalError.stack = lastError.stack;
      throw finalError;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Search failed after retries');
}

/**
 * Batch search for multiple queries with throttling to avoid Supadata 429 rate limits.
 * Runs queries in small concurrency batches with a delay between batches.
 * @param queries Array of search queries
 * @param options Search options (applied to all queries)
 * @returns Array of video search results (flattened from all queries)
 */
export async function searchYouTubeVideosBatch(
  queries: string[],
  options?: SearchOptions
): Promise<VideoSearchResult[]> {
  const searchConfig = getSupadataSearchConfig();
  const concurrency = searchConfig.concurrency ?? 2;
  const delayBetweenMs = searchConfig.delay_between_requests_ms ?? 600;

  logger.info('[Supadata Search] Starting batch search', {
    queryCount: queries.length,
    options,
    concurrency,
    delayBetweenMs,
  });

  const allResults: VideoSearchResult[] = [];
  const failedQueries: Array<{ query: string; error: string }> = [];
  
  // Run in chunks of `concurrency` with delay between chunks to stay under rate limits
  for (let i = 0; i < queries.length; i += concurrency) {
    const chunk = queries.slice(i, i + concurrency);
    
    // Use Promise.allSettled to continue even if some queries fail
    const chunkResults = await Promise.allSettled(
      chunk.map((query) => searchYouTubeVideos(query, options))
    );
    
    // Process results: collect successes, log failures
    chunkResults.forEach((result, index) => {
      const query = chunk[index];
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        const errorMessage = result.reason instanceof Error 
          ? result.reason.message 
          : String(result.reason);
        failedQueries.push({ query, error: errorMessage });
        
        logger.warn('[Supadata Search] Query failed in batch (continuing with others)', {
          query,
          error: errorMessage,
          chunkIndex: i,
          queryIndexInChunk: index,
          successfulQueriesInChunk: chunkResults.filter(r => r.status === 'fulfilled').length,
          totalQueriesInChunk: chunk.length,
        });
      }
    });
    
    if (i + concurrency < queries.length) {
      await sleep(delayBetweenMs);
    }
  }

  const successCount = queries.length - failedQueries.length;
  const successRate = queries.length > 0 ? (successCount / queries.length) * 100 : 0;

  logger.info('[Supadata Search] Batch search completed', {
    queryCount: queries.length,
    successCount,
    failedCount: failedQueries.length,
    successRate: `${successRate.toFixed(1)}%`,
    totalResults: allResults.length,
    failedQueries: failedQueries.length > 0 ? failedQueries.map(fq => fq.query) : undefined,
  });

  // Only fail if ALL queries failed
  if (allResults.length === 0 && failedQueries.length > 0) {
    const errorMessage = `All ${queries.length} search queries failed. Last error: ${failedQueries[failedQueries.length - 1].error}`;
    logger.error('[Supadata Search] Batch search failed - All queries failed', {
      queryCount: queries.length,
      failedQueries: failedQueries.map(fq => ({ query: fq.query, error: fq.error })),
    });
    throw new Error(errorMessage);
  }

  // If we have some results, return them even if some queries failed
  if (failedQueries.length > 0) {
    logger.warn('[Supadata Search] Batch search completed with partial results', {
      successCount,
      failedCount: failedQueries.length,
      totalResults: allResults.length,
      message: `Continuing with ${allResults.length} videos from ${successCount} successful queries`,
    });
  }

  return allResults;
}
