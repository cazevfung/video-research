/**
 * Data validation utilities
 * Phase 3: Runtime validation for API responses
 */

import { HistoryResponse, SummaryListItem, PaginationInfo } from '@/types';
import { isValidDate as isValidDateUtil } from '@/utils/date';

/**
 * Validate that a value is a non-empty string
 */
function isValidString(value: any): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validate that a value is a valid date (string or Date object)
 */
function isValidDate(value: any): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validate that a value is a positive integer
 */
function isValidPositiveInteger(value: any): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validate that a value is a non-negative integer
 */
function isValidNonNegativeInteger(value: any): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Validate a SummaryListItem
 * Phase 4: Updated to support optional type discriminator
 */
export function validateSummaryListItem(item: any): item is SummaryListItem {
  if (!item || typeof item !== 'object') {
    return false;
  }

  // Required fields
  if (!isValidString(item._id)) {
    return false;
  }

  if (!isValidString(item.batch_title)) {
    return false;
  }

  if (!isValidDate(item.created_at)) {
    return false;
  }

  // Validate source_videos array
  if (!Array.isArray(item.source_videos)) {
    return false;
  }

  for (const video of item.source_videos) {
    if (!video || typeof video !== 'object') {
      return false;
    }
    if (!isValidString(video.thumbnail)) {
      return false;
    }
    if (!isValidString(video.title)) {
      return false;
    }
  }

  // Validate video_count
  if (!isValidNonNegativeInteger(item.video_count)) {
    return false;
  }

  // Validate video_count matches source_videos length
  if (item.video_count !== item.source_videos.length) {
    return false;
  }

  // Phase 4: Validate optional type discriminator (if present)
  if (item.type !== undefined && item.type !== 'summary' && item.type !== 'research') {
    return false;
  }

  return true;
}

/**
 * Validate PaginationInfo
 */
export function validatePaginationInfo(pagination: any): pagination is PaginationInfo {
  if (!pagination || typeof pagination !== 'object') {
    return false;
  }

  if (!isValidPositiveInteger(pagination.page)) {
    return false;
  }

  if (!isValidPositiveInteger(pagination.limit)) {
    return false;
  }

  if (!isValidNonNegativeInteger(pagination.total)) {
    return false;
  }

  if (!isValidPositiveInteger(pagination.totalPages)) {
    return false;
  }

  // Validate pagination consistency
  const calculatedTotalPages = Math.ceil(pagination.total / pagination.limit);
  if (pagination.totalPages !== calculatedTotalPages) {
    return false;
  }

  // Validate page is within bounds
  if (pagination.page > pagination.totalPages) {
    return false;
  }

  return true;
}

/**
 * Validate HistoryResponse
 */
export function validateHistoryResponse(response: any): {
  isValid: boolean;
  errors: string[];
  data?: HistoryResponse;
} {
  const errors: string[] = [];

  if (!response || typeof response !== 'object') {
    return {
      isValid: false,
      errors: ['Response is not an object'],
    };
  }

  // Validate summaries array
  if (!Array.isArray(response.summaries)) {
    errors.push('summaries must be an array');
  } else {
    // Validate each summary item
    response.summaries.forEach((item: any, index: number) => {
      if (!validateSummaryListItem(item)) {
        errors.push(`summaries[${index}] is invalid`);
      }
    });
  }

  // Validate pagination
  if (!validatePaginationInfo(response.pagination)) {
    errors.push('pagination is invalid or inconsistent');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    errors: [],
    data: response as HistoryResponse,
  };
}

/**
 * Sanitize and fix common data issues
 */
export function sanitizeHistoryResponse(response: any): HistoryResponse | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  // Ensure summaries is an array
  const summaries = Array.isArray(response.summaries) ? response.summaries : [];

  // Sanitize each summary item
  const sanitizedSummaries: SummaryListItem[] = summaries
    .map((item: any) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      // Ensure required fields exist
      if (!item._id || !item.batch_title) {
        return null;
      }

      // Ensure source_videos is an array
      const sourceVideos = Array.isArray(item.source_videos) ? item.source_videos : [];

      // Sanitize video_count to match source_videos length
      const videoCount = item.video_count ?? sourceVideos.length;

      // Phase 3: Validate date before using it
      // Only use fallback if date is invalid or missing
      let createdAt: string;
      if (item.created_at && isValidDateUtil(item.created_at)) {
        // Date is valid, ensure it's an ISO string
        if (typeof item.created_at === 'string') {
          // Already a string, use it directly (should be ISO format)
          createdAt = item.created_at;
        } else if (item.created_at instanceof Date) {
          // Date object, convert to ISO string
          createdAt = item.created_at.toISOString();
        } else {
          // Unexpected type but validated, try conversion
          const dateObj = new Date(item.created_at);
          createdAt = dateObj.toISOString();
        }
      } else {
        // Invalid or missing date, use fallback and log warning
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[sanitizeHistoryResponse] Invalid or missing created_at date for summary:',
            {
              _id: item._id,
              batch_title: item.batch_title,
              created_at: item.created_at,
              fallback: new Date().toISOString(),
            }
          );
        }
        createdAt = new Date().toISOString();
      }

      return {
        _id: String(item._id),
        batch_title: String(item.batch_title),
        created_at: createdAt,
        source_videos: sourceVideos.map((video: any) => ({
          thumbnail: String(video.thumbnail || ''),
          title: String(video.title || ''),
        })),
        video_count: videoCount,
        // Phase 4: Preserve type discriminator if present
        ...(item.type && (item.type === 'summary' || item.type === 'research') && { type: item.type }),
      } as SummaryListItem;
    })
    .filter((item: SummaryListItem | null): item is SummaryListItem => item !== null);

  // Sanitize pagination
  const pagination: PaginationInfo = {
    page: Math.max(1, parseInt(String(response.pagination?.page || 1), 10)),
    limit: Math.max(1, parseInt(String(response.pagination?.limit || 10), 10)),
    total: Math.max(0, parseInt(String(response.pagination?.total || 0), 10)),
    totalPages: Math.max(
      1,
      Math.ceil(
        Math.max(0, parseInt(String(response.pagination?.total || 0), 10)) /
          Math.max(1, parseInt(String(response.pagination?.limit || 10), 10))
      )
    ),
  };

  // Ensure page is within bounds
  if (pagination.totalPages !== undefined && pagination.page > pagination.totalPages) {
    pagination.page = pagination.totalPages;
  }

  return {
    summaries: sanitizedSummaries,
    pagination,
  };
}

