/**
 * Custom error classes for the application
 * Each error includes appropriate HTTP status code and user-friendly message
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation error for invalid input
 * HTTP Status: 400
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'INVALID_INPUT', details);
  }
}

/**
 * Quota exceeded error
 * HTTP Status: 403
 */
export class QuotaExceededError extends AppError {
  constructor(message: string = 'Daily limit reached. Upgrade to Premium for more.', details?: any) {
    super(message, 403, 'QUOTA_EXCEEDED', details);
  }
}

/**
 * Transcript fetch error
 * HTTP Status: 400
 */
export class TranscriptError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'TRANSCRIPT_ERROR', details);
  }
}

/**
 * Video unavailable error
 * HTTP Status: 400
 */
export class VideoUnavailableError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VIDEO_UNAVAILABLE', details);
  }
}

/**
 * AI API error
 * HTTP Status: 500 or 504 (for timeouts)
 */
export class AIError extends AppError {
  constructor(message: string, statusCode: number = 500, details?: any) {
    const code = statusCode === 504 ? 'AI_API_TIMEOUT' : 'AI_API_ERROR';
    super(message, statusCode, code, details);
  }
}

/**
 * Job not found error
 * HTTP Status: 404
 */
export class JobNotFoundError extends AppError {
  constructor(message: string = 'Job not found.', details?: any) {
    super(message, 404, 'JOB_NOT_FOUND', details);
  }
}

/**
 * Unauthorized error
 * HTTP Status: 401
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Session expired. Please log in again.', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

/**
 * Forbidden error (authorization)
 * HTTP Status: 403
 */
export class ForbiddenError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

/**
 * Rate limit exceeded error
 * HTTP Status: 429
 */
export class RateLimitExceededError extends AppError {
  constructor(message: string = 'Rate limit exceeded. Please try again later.', details?: any) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * Batch size exceeded error
 * HTTP Status: 403
 */
export class BatchSizeExceededError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 403, 'BATCH_SIZE_EXCEEDED', details);
  }
}

/**
 * Context window exceeded error
 * HTTP Status: 400
 */
export class ContextWindowExceededError extends AppError {
  constructor(message: string = 'Batch too large. Please reduce number of videos.', details?: any) {
    super(message, 400, 'CONTEXT_WINDOW_EXCEEDED', details);
  }
}

/**
 * Invalid preset style error
 * HTTP Status: 400
 */
export class InvalidPresetError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'INVALID_PRESET', details);
  }
}

/**
 * Invalid language error
 * HTTP Status: 400
 */
export class InvalidLanguageError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'INVALID_LANGUAGE', details);
  }
}



