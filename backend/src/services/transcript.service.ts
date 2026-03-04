import axios, { AxiosError } from 'axios';
import env from '../config/env';
import logger from '../utils/logger';
import { getLimitsConfig, getAPIConfig } from '../config';
import { extractVideoId } from '../utils/validators';

/**
 * Transcript data structure returned from Supadata API
 * upload_date: from Supadata/YouTube metadata; use constants.ensureVideoUploadDate at display boundary if missing.
 */
export interface TranscriptData {
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration_seconds: number;
  transcript_text: string;
  word_count: number;
  video_id: string;
  /** Video publish/upload date when available (Supadata/YouTube metadata). Preserve through pipeline. */
  upload_date?: string;
  error?: never; // Ensure error is not present when data is valid
}

/**
 * Transcript error structure
 */
export interface TranscriptError {
  url: string;
  error: string;
  error_code?: string;
  title?: never;
  channel?: never;
  thumbnail?: never;
  duration_seconds?: never;
  transcript_text?: never;
  word_count?: never;
  video_id?: never;
}

export type TranscriptResult = TranscriptData | TranscriptError;

/**
 * Supadata API response structure (when text=true)
 */
interface SupadataTranscriptResponse {
  content: string;
  lang: string;
  availableLangs: string[];
}

/**
 * Supadata Video Metadata API response structure
 */
interface SupadataVideoMetadataResponse {
  id: string;
  title: string;
  description: string;
  duration: number; // Duration in seconds
  channel: {
    id: string;
    name: string;
  };
  tags: string[];
  thumbnail: string;
  uploadDate: string;
  viewCount: number;
  likeCount: number;
  transcriptLanguages: string[];
}

/**
 * YouTube Data API response structure
 */
interface YouTubeDataApiResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string; // ISO 8601, e.g. "2024-01-15T12:00:00Z"
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
        standard?: { url: string };
        maxres?: { url: string };
      };
    };
    contentDetails: {
      duration: string; // ISO 8601 format (e.g., PT4M13S)
    };
  }>;
}

/**
 * Normalized metadata structure (common between YouTube and Supadata)
 * Always populate upload_date when the API provides it so it flows to citations.
 */
interface VideoMetadata {
  title: string;
  channel: string;
  thumbnail: string;
  duration_seconds: number;
  /** Video publish/upload date when available. Pass through to TranscriptData. */
  upload_date?: string;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (network errors, timeouts)
 */
function isRetryableError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    // Retry on network errors, timeouts, or 5xx errors
    return (
      !axiosError.response ||
      axiosError.response.status >= 500 ||
      axiosError.code === 'ECONNABORTED' ||
      axiosError.code === 'ETIMEDOUT'
    );
  }
  return false;
}

/**
 * Parse ISO 8601 duration string to seconds
 * @param duration ISO 8601 duration (e.g., PT4M13S = 4 minutes 13 seconds)
 * @returns Duration in seconds
 */
function parseISODuration(duration: string | undefined | null): number {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch video metadata from YouTube Data API with key rotation
 * @param videoId YouTube video ID
 * @returns Video metadata or null if all keys failed
 */
async function fetchVideoMetadataFromYouTube(
  videoId: string
): Promise<VideoMetadata | null> {
  const apiConfigs = getAPIConfig();
  const youtubeConfig = apiConfigs.youtube;
  const timeout = youtubeConfig.timeout_ms;
  const apiKeys = env.YOUTUBE_API_KEYS;

  logger.info(`[YouTube Metadata] Starting metadata fetch`, {
    videoId,
    apiKeyCount: apiKeys?.length || 0,
    timeout,
  });

  if (!apiKeys || apiKeys.length === 0) {
    logger.warn('[YouTube Metadata] No YouTube API keys configured');
    return null;
  }

  // Try each API key until one works
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const apiKeyStatus = {
      index: i + 1,
      total: apiKeys.length,
      prefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A',
      suffix: apiKey && apiKey.length > 8 ? `...${apiKey.substring(apiKey.length - 4)}` : 'N/A',
      length: apiKey?.length || 0,
    };
    
    logger.info(`[YouTube Metadata] Attempting with API key ${i + 1}/${apiKeys.length}`, {
      videoId,
      apiKeyStatus,
    });
    
    try {
      const apiConfigs = getAPIConfig();
      const youtubeConfig = apiConfigs.youtube;
      const youtubeUrl = youtubeConfig.base_url;
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        id: videoId,
        key: apiKey,
      });

      const requestUrl = `${youtubeUrl}?${params.toString()}`;
      logger.debug(`[YouTube Metadata] Sending request`, {
        videoId,
        url: youtubeUrl,
        apiKeyIndex: i + 1,
      });

      const response = await axios.get<YouTubeDataApiResponse>(
        requestUrl,
        { timeout: youtubeConfig.timeout_ms }
      );

      logger.debug(`[YouTube Metadata] Received response`, {
        videoId,
        status: response.status,
        statusText: response.statusText,
        hasItems: !!response.data.items,
        itemCount: response.data.items?.length || 0,
        apiKeyIndex: i + 1,
      });

      if (!response.data.items || response.data.items.length === 0) {
        logger.warn(`[YouTube Metadata] No video found for ID ${videoId}`, {
          apiKeyIndex: i + 1,
          responseStatus: response.status,
        });
        return null;
      }

      const video = response.data.items[0];
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;

      // Get best available thumbnail
      const thumbnails = snippet.thumbnails;
      const thumbnail =
        thumbnails.maxres?.url ||
        thumbnails.standard?.url ||
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        youtubeConfig.thumbnail_fallback_pattern.replace('{video_id}', videoId);

      // Parse duration from ISO 8601 format
      // Handle cases where contentDetails or duration might be undefined
      const durationString = contentDetails?.duration;
      const durationSeconds = durationString ? parseISODuration(durationString) : 0;

      // Format publish date for display (YouTube returns ISO 8601; use as-is or short date)
      const publishedAt = snippet.publishedAt;
      const uploadDate = publishedAt
        ? (() => {
            try {
              const d = new Date(publishedAt);
              return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10); // YYYY-MM-DD
            } catch {
              return publishedAt;
            }
          })()
        : undefined;

      logger.info(`[YouTube Metadata] Successfully fetched metadata`, {
        videoId,
        apiKeyIndex: i + 1,
        title: snippet.title,
        channel: snippet.channelTitle,
        durationSeconds,
        uploadDate,
        thumbnail: thumbnail.substring(0, 100) + '...',
      });

      return {
        title: snippet.title,
        channel: snippet.channelTitle,
        thumbnail,
        duration_seconds: durationSeconds,
        upload_date: uploadDate,
      };
    } catch (error) {
      const isLastKey = i === apiKeys.length - 1;
      
      logger.error(`[YouTube Metadata] API key ${i + 1} failed`, {
        videoId,
        apiKeyIndex: i + 1,
        isLastKey,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data as any;
        
        logger.error(`[YouTube Metadata] Axios error details`, {
          videoId,
          apiKeyIndex: i + 1,
          status,
          statusText: error.response?.statusText,
          errorCode: error.code,
          errorMessage: error.message,
          responseData: errorData,
          responseHeaders: error.response?.headers,
        });
        
        // If quota exceeded or invalid key, try next key
        if (status === 403 && errorData?.error?.errors?.[0]?.reason === 'quotaExceeded') {
          logger.warn(`[YouTube Metadata] API key ${i + 1} quota exceeded, trying next key...`, {
            videoId,
            apiKeyIndex: i + 1,
          });
          continue;
        }
        
        if (status === 400 && errorData?.error?.message?.includes('API key')) {
          logger.warn(`[YouTube Metadata] API key ${i + 1} invalid, trying next key...`, {
            videoId,
            apiKeyIndex: i + 1,
            errorMessage: errorData?.error?.message,
          });
          continue;
        }
        
        // For other errors, log and try next key if available
        if (!isLastKey) {
          logger.warn(`[YouTube Metadata] API key ${i + 1} failed (status: ${status}), trying next key...`, {
            videoId,
            apiKeyIndex: i + 1,
            status,
            error: errorData?.error?.message || error.message,
          });
          continue;
        }
      }

      // Last key failed or non-retryable error
      if (isLastKey) {
        logger.error(`[YouTube Metadata] All API keys failed for video ${videoId}`, {
          videoId,
          totalKeys: apiKeys.length,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : error,
        });
        return null;
      }
    }
  }

  return null;
}

/**
 * Fetch video metadata from Supadata API (fallback)
 * @param urlOrId YouTube video URL or ID
 * @returns Video metadata or null if failed
 */
async function fetchVideoMetadataFromSupadata(
  urlOrId: string
): Promise<VideoMetadata | null> {
  const apiConfig = getAPIConfig().supadata;
  const timeout = apiConfig.timeout_ms;

  const apiKey = env.SUPADATA_API_KEY;
  const apiKeyStatus = {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A',
    suffix: apiKey && apiKey.length > 8 ? `...${apiKey.substring(apiKey.length - 4)}` : 'N/A',
    hasWhitespace: apiKey ? /\s/.test(apiKey) : false,
  };

  logger.info(`[Supadata Metadata] Starting metadata fetch`, {
    urlOrId,
    timeout,
    apiKeyStatus,
  });

  try {
    // Construct metadata URL from base URL (replace /transcript with /video)
    const baseUrl = apiConfig.base_url;
    const metadataUrl = baseUrl.replace('/transcript', '/video');
    const params = new URLSearchParams({
      id: urlOrId, // Can be URL or video ID
    });

    const requestUrl = `${metadataUrl}?${params.toString()}`;
    logger.debug(`[Supadata Metadata] Sending request`, {
      urlOrId,
      url: metadataUrl,
      headers: {
        'x-api-key': apiKeyStatus.prefix + apiKeyStatus.suffix,
      },
    });

    const response = await axios.get<SupadataVideoMetadataResponse>(
      requestUrl,
      {
        headers: {
          'x-api-key': apiKey,
        },
        timeout,
      }
    );

    logger.debug(`[Supadata Metadata] Received response`, {
      urlOrId,
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
    });

    const meta = response.data;
    
    // Handle cases where duration might be undefined or null
    const durationSeconds = meta.duration != null ? meta.duration : 0;
    
    logger.info(`[Supadata Metadata] Successfully fetched metadata`, {
      urlOrId,
      title: meta.title,
      channel: meta.channel.name,
      duration: durationSeconds,
      uploadDate: meta.uploadDate,
      thumbnail: meta.thumbnail.substring(0, 100) + '...',
    });

    return {
      title: meta.title,
      channel: meta.channel.name,
      thumbnail: meta.thumbnail,
      duration_seconds: durationSeconds,
      upload_date: meta.uploadDate,
    };
  } catch (error) {
    logger.error(`[Supadata Metadata] Failed to fetch metadata`, {
      urlOrId,
      apiKeyStatus,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (axios.isAxiosError(error)) {
      logger.error(`[Supadata Metadata] Axios error details`, {
        urlOrId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorCode: error.code,
        errorMessage: error.message,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
      });
    }

    return null;
  }
}

/**
 * Fetch video metadata - tries YouTube Data API first, then Supadata as fallback
 * Includes retry logic for better reliability
 * @param urlOrId YouTube video URL or ID
 * @param videoId Extracted video ID (for YouTube API)
 * @param retryCount Current retry attempt (0 = first attempt)
 * @param maxRetries Maximum number of retries
 * @returns Video metadata or null if both failed after all retries
 */
/**
 * Fetches video metadata: tries YouTube first, then Supadata.
 * CRITICAL: Both paths must set upload_date when the API provides it, so citations
 * never show "Unknown" for publish date. YouTube is the common path (used when it succeeds).
 */
async function fetchVideoMetadata(
  urlOrId: string,
  videoId: string,
  retryCount = 0,
  maxRetries = 2
): Promise<VideoMetadata | null> {
  logger.info(`[Metadata Fetch] Starting metadata fetch for video`, {
    urlOrId,
    videoId,
    retryCount,
    maxRetries,
  });

  // Try YouTube Data API first (primary path for most requests)
  const youtubeMetadata = await fetchVideoMetadataFromYouTube(videoId);
  if (youtubeMetadata) {
    logger.info(`[Metadata Fetch] Successfully fetched from YouTube Data API`, {
      videoId,
      title: youtubeMetadata.title,
      attempt: retryCount + 1,
    });
    return youtubeMetadata;
  }

  // Fallback to Supadata
  logger.info(`[Metadata Fetch] YouTube Data API failed, falling back to Supadata`, {
    videoId,
    urlOrId,
    attempt: retryCount + 1,
  });
  const supadataMetadata = await fetchVideoMetadataFromSupadata(urlOrId);
  
  if (supadataMetadata) {
    logger.info(`[Metadata Fetch] Successfully fetched from Supadata`, {
      videoId,
      title: supadataMetadata.title,
      attempt: retryCount + 1,
    });
    return supadataMetadata;
  }

  // Both failed - retry if we haven't exceeded max retries
  if (retryCount < maxRetries) {
    const backoffMs = 1000 * (retryCount + 1); // Exponential backoff: 1s, 2s, 3s
    logger.warn(`[Metadata Fetch] Both APIs failed, retrying in ${backoffMs}ms`, {
      videoId,
      urlOrId,
      retryCount: retryCount + 1,
      maxRetries,
      backoffMs,
    });
    
    await new Promise(resolve => setTimeout(resolve, backoffMs));
    return fetchVideoMetadata(urlOrId, videoId, retryCount + 1, maxRetries);
  }

  logger.warn(`[Metadata Fetch] Both YouTube and Supadata failed after ${retryCount + 1} attempts`, {
    videoId,
    urlOrId,
    totalAttempts: retryCount + 1,
  });
  
  return null;
}

/**
 * Fetch video metadata only (YouTube then Supadata).
 * Use to backfill upload_date when transcript was fetched but metadata failed, so citations don't show "Unknown".
 * @param url YouTube video URL
 * @returns Metadata with upload_date when available, or null
 */
export async function getVideoMetadata(url: string): Promise<VideoMetadata | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  return fetchVideoMetadata(url, videoId, 0, 2);
}

/**
 * Fetch transcript for a single YouTube video
 * @param url YouTube video URL
 * @param retryCount Current retry attempt (0 = first attempt, 1 = first retry)
 * @returns Transcript data or error
 */
export async function fetchTranscript(
  url: string,
  retryCount = 0
): Promise<TranscriptResult> {
  const apiConfig = getAPIConfig().supadata;
  const maxRetries = apiConfig.max_retries;
  const timeout = apiConfig.timeout_ms;

  const apiKey = env.SUPADATA_API_KEY;
  const apiKeyStatus = {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A',
    suffix: apiKey && apiKey.length > 8 ? `...${apiKey.substring(apiKey.length - 4)}` : 'N/A',
    hasWhitespace: apiKey ? /\s/.test(apiKey) : false,
  };

  logger.info(`[Transcript Fetch] Starting transcript fetch`, {
    url,
    retryCount,
    maxRetries,
    timeout,
    apiKeyStatus,
  });

  try {
    // Extract video ID for validation
    const videoId = extractVideoId(url);
    if (!videoId) {
      logger.error(`[Transcript Fetch] Invalid YouTube URL format`, {
        url,
      });
      return {
        url,
        error: 'Invalid YouTube URL format',
        error_code: 'INVALID_URL',
      };
    }

    logger.info(`[Transcript Fetch] Extracted video ID`, {
      url,
      videoId,
    });

    const transcriptUrl = apiConfig.base_url;
    const transcriptRequestUrl = `${transcriptUrl}?${new URLSearchParams({ url: url, text: 'true' }).toString()}`;

    logger.info(`[Transcript Fetch] Starting parallel fetch (metadata + transcript)`, {
      url,
      videoId,
      transcriptUrl: transcriptRequestUrl,
    });

    // Fetch metadata and transcript in parallel for better performance
    // Metadata fetch includes retry logic for better reliability
    const [metadata, transcriptResponse] = await Promise.allSettled([
      fetchVideoMetadata(url, videoId, 0, 2), // Try YouTube first, then Supadata, with retries
      axios.get<SupadataTranscriptResponse>(
        transcriptRequestUrl,
        {
          headers: {
            'x-api-key': apiKey,
          },
          timeout,
        }
      ),
    ]);

    logger.info(`[Transcript Fetch] Parallel fetch completed`, {
      url,
      videoId,
      metadataStatus: metadata.status,
      transcriptStatus: transcriptResponse.status,
      metadataFulfilled: metadata.status === 'fulfilled',
      transcriptFulfilled: transcriptResponse.status === 'fulfilled',
    });

    // Handle transcript response
    if (transcriptResponse.status === 'rejected') {
      const error = transcriptResponse.reason;
      
      logger.error(`[Transcript Fetch] Transcript fetch rejected`, {
        url,
        videoId,
        retryCount,
        maxRetries,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        logger.error(`[Transcript Fetch] Axios error details`, {
          url,
          videoId,
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorCode: error.code,
          errorMessage: error.message,
          responseData: error.response?.data,
          responseHeaders: error.response?.headers,
          requestUrl: error.config?.url,
          requestMethod: error.config?.method,
          requestHeaders: error.config?.headers ? {
            ...error.config.headers,
            'x-api-key': error.config.headers['x-api-key'] 
              ? `${(error.config.headers['x-api-key'] as string).substring(0, 20)}...` 
              : 'NOT SET',
          } : undefined,
        });
      }
      
      // Check if retryable
      if (isRetryableError(error) && retryCount < maxRetries) {
        logger.warn(
          `[Transcript Fetch] Network error, retrying (${retryCount + 1}/${maxRetries})`,
          {
            url,
            videoId,
            retryCount: retryCount + 1,
            maxRetries,
            error: error instanceof Error ? error.message : String(error),
          }
        );
        await sleep(apiConfig.retry_backoff_ms * (retryCount + 1));
        return fetchTranscript(url, retryCount + 1);
      }

      // Handle HTTP error responses
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const responseData = error.response.data as any;
        
        logger.error(`[Transcript Fetch] HTTP error response`, {
          url,
          videoId,
          status,
          responseData,
        });
        
        if (status === 400 || status === 404) {
          const errorMessage = responseData?.error?.message || responseData?.message || 'Video not found or transcript unavailable';
          logger.error(`[Transcript Fetch] Video unavailable or invalid request`, {
            url,
            videoId,
            status,
            errorMessage,
          });
          return {
            url,
            error: errorMessage,
            error_code: status === 404 ? 'VIDEO_UNAVAILABLE' : 'INVALID_REQUEST',
          };
        }
        
        if (status === 401 || status === 403) {
          logger.error(`[Transcript Fetch] Authentication/authorization failed`, {
            url,
            videoId,
            status,
            apiKeyStatus,
            responseData,
          });
          return {
            url,
            error: 'Invalid API key or unauthorized access',
            error_code: 'UNAUTHORIZED',
          };
        }
        
        if (status === 429) {
          logger.error(`[Transcript Fetch] Rate limit exceeded`, {
            url,
            videoId,
            status,
            responseData,
          });
          return {
            url,
            error: 'Rate limit exceeded. Please try again later.',
            error_code: 'RATE_LIMIT',
          };
        }
      }

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          logger.error(`[Transcript Fetch] Request timeout`, {
            url,
            videoId,
            errorCode: error.code,
            timeout,
          });
          return {
            url,
            error: 'Request timeout. Please try again.',
            error_code: 'TIMEOUT',
          };
        }
      }

      logger.error(`[Transcript Fetch] Failed after all retries`, {
        url,
        videoId,
        retryCount,
        maxRetries,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      return {
        url,
        error: 'Failed to fetch transcript. Please try again.',
        error_code: 'NETWORK_ERROR',
      };
    }

    // Success - extract transcript data
    const transcriptData = transcriptResponse.value.data;
    const transcriptText = transcriptData.content || '';
    const wordCount = transcriptText.split(/\s+/).filter(word => word.length > 0).length;

    logger.info(`[Transcript Fetch] Transcript response received`, {
      url,
      videoId,
      transcriptLength: transcriptText.length,
      wordCount,
      language: transcriptData.lang,
      availableLanguages: transcriptData.availableLangs,
    });

    // Extract metadata (use fetched metadata if available, otherwise try to extract from transcript)
    const apiConfigs = getAPIConfig();
    const youtubeConfig = apiConfigs.youtube;
    let title = `Video ${videoId}`;
    let channel = 'Unknown';
    let thumbnail = youtubeConfig.thumbnail_fallback_pattern.replace('{video_id}', videoId);
    let durationSeconds = 0;

    let uploadDate: string | undefined;
    if (metadata.status === 'fulfilled' && metadata.value) {
      const meta = metadata.value;
      title = meta.title;
      channel = meta.channel;
      thumbnail = meta.thumbnail;
      durationSeconds = meta.duration_seconds;
      uploadDate = meta.upload_date;
      
      logger.info(`[Transcript Fetch] Metadata available from fetch`, {
        url,
        videoId,
        title,
        channel,
        durationSeconds,
        uploadDate,
      });
    } else {
      // Metadata fetch failed - try to extract title from transcript text as fallback
      if (transcriptText && transcriptText.trim().length > 0) {
        // Try to extract title from first line or first sentence of transcript
        const firstLine = transcriptText.split('\n')[0].trim();
        const firstSentence = transcriptText.split(/[.!?]\s+/)[0].trim();
        
        // Use first meaningful line (not too short, not too long) as potential title
        const potentialTitle = firstLine.length > 10 && firstLine.length < 200 
          ? firstLine 
          : (firstSentence.length > 10 && firstSentence.length < 200 ? firstSentence : null);
        
        if (potentialTitle) {
          // Truncate if too long, but keep original format
          const maxTitleLength = 100;
          title = potentialTitle.length > maxTitleLength 
            ? potentialTitle.substring(0, maxTitleLength - 3) + '...' 
            : potentialTitle;
          
          logger.info(`[Transcript Fetch] Extracted title from transcript as fallback`, {
            url,
            videoId,
            extractedTitle: title,
            originalLength: potentialTitle.length,
          });
        } else {
          logger.warn(`[Transcript Fetch] Metadata fetch failed, using video ID fallback`, {
            url,
            videoId,
            metadataStatus: metadata.status,
            metadataRejected: metadata.status === 'rejected' ? metadata.reason : undefined,
            transcriptLength: transcriptText.length,
          });
        }
      } else {
        logger.warn(`[Transcript Fetch] Metadata fetch failed and no transcript text available for extraction`, {
          url,
          videoId,
          metadataStatus: metadata.status,
          metadataRejected: metadata.status === 'rejected' ? metadata.reason : undefined,
        });
      }
    }

    logger.info(`[Transcript Fetch] Successfully fetched transcript and metadata`, {
      url,
      videoId,
      title,
      channel,
      durationSeconds,
      wordCount,
      transcriptLength: transcriptText.length,
      language: transcriptData.lang,
      hasMetadata: metadata.status === 'fulfilled' && metadata.value !== null,
    });

    return {
      url,
      title,
      channel,
      thumbnail,
      duration_seconds: durationSeconds,
      transcript_text: transcriptText,
      word_count: wordCount,
      video_id: videoId,
      upload_date: uploadDate,
    };
  } catch (error) {
    logger.error(`[Transcript Fetch] Unexpected error caught`, {
      url,
      retryCount,
      maxRetries,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      isAxiosError: axios.isAxiosError(error),
    });

    if (axios.isAxiosError(error)) {
      logger.error(`[Transcript Fetch] Unexpected axios error`, {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorCode: error.code,
        errorMessage: error.message,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
      });
    }

    // Handle unexpected errors
    if (isRetryableError(error) && retryCount < maxRetries) {
      logger.warn(
        `[Transcript Fetch] Unexpected error, retrying (${retryCount + 1}/${maxRetries})`,
        {
          url,
          retryCount: retryCount + 1,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      await sleep(apiConfig.retry_backoff_ms * (retryCount + 1));
      return fetchTranscript(url, retryCount + 1);
    }

    logger.error(`[Transcript Fetch] Failed after all retries (unexpected error)`, {
      url,
      retryCount,
      maxRetries,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });
    return {
      url,
      error: 'Failed to fetch transcript. Please try again.',
      error_code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Fetch transcripts for multiple YouTube videos in parallel
 * @param urls Array of YouTube video URLs
 * @returns Array of transcript results (data or error for each URL)
 */
export async function fetchTranscriptsBatch(
  urls: string[]
): Promise<TranscriptResult[]> {
  logger.info(`[Transcript Batch] Starting batch transcript fetch`, {
    totalUrls: urls.length,
    urls,
  });

  const startTime = Date.now();

  // Fetch all transcripts in parallel
  const promises = urls.map((url) => fetchTranscript(url));
  const results = await Promise.all(promises);

  const duration = Date.now() - startTime;

  // Log detailed summary
  const successCount = results.filter((r) => !('error' in r)).length;
  const errorCount = results.filter((r) => 'error' in r).length;
  const successfulResults = results.filter((r) => !('error' in r)) as TranscriptData[];
  const errorResults = results.filter((r) => 'error' in r) as TranscriptError[];

  logger.info(`[Transcript Batch] Batch fetch completed`, {
    total: urls.length,
    success: successCount,
    errors: errorCount,
    durationMs: duration,
    durationSeconds: (duration / 1000).toFixed(2),
    successRate: `${((successCount / urls.length) * 100).toFixed(1)}%`,
  });

  // Log successful results summary
  if (successfulResults.length > 0) {
    const totalWords = successfulResults.reduce((sum, r) => sum + r.word_count, 0);
    const totalDuration = successfulResults.reduce((sum, r) => sum + r.duration_seconds, 0);
    
    logger.info(`[Transcript Batch] Successful results summary`, {
      count: successfulResults.length,
      totalWords,
      totalDurationSeconds: totalDuration,
      totalDurationMinutes: (totalDuration / 60).toFixed(2),
      averageWords: Math.round(totalWords / successfulResults.length),
      averageDurationSeconds: Math.round(totalDuration / successfulResults.length),
      videos: successfulResults.map(r => ({
        videoId: r.video_id,
        title: r.title,
        wordCount: r.word_count,
        durationSeconds: r.duration_seconds,
      })),
    });
  }

  // Log error results details
  if (errorResults.length > 0) {
    logger.error(`[Transcript Batch] Error results details`, {
      count: errorResults.length,
      errors: errorResults.map(r => ({
        url: r.url,
        error: r.error,
        errorCode: r.error_code,
      })),
    });
  }

  return results;
}

/**
 * Check if a video is considered "long" based on duration and word count
 * @param durationSeconds Video duration in seconds
 * @param wordCount Word count of transcript
 * @returns True if video is considered long
 */
export function isLongVideo(
  durationSeconds: number,
  wordCount: number
): boolean {
  const limits = getLimitsConfig();
  const durationMinutes = durationSeconds / 60;

  return (
    durationMinutes > limits.long_video_threshold_minutes ||
    wordCount > limits.long_video_word_count
  );
}

