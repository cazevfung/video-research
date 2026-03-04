/**
 * Centralized error handling middleware
 * Formats all errors consistently for frontend consumption
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Error handling middleware
 * Must be registered after all routes
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known application errors
  if (err instanceof AppError) {
    const statusCode = err.statusCode;
    const errorResponse: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    };

    // Log error with appropriate level using structured logging
    if (statusCode >= 500) {
      logger.structuredError(err, {
        operation: 'http_request',
        metadata: {
          code: err.code,
          statusCode,
          path: req.path,
          method: req.method,
          details: err.details,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });
    } else if (statusCode >= 400) {
      logger.warn('Client error', {
        error: err.message,
        code: err.code,
        statusCode,
        path: req.path,
        method: req.method,
        details: err.details,
      });
    }

    res.status(statusCode).json(errorResponse);
    return;
  }

  // Handle validation errors from express-validator or similar
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    logger.warn('Validation error', {
      error: err.message,
      path: req.path,
      method: req.method,
    });

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Invalid input provided',
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn('Authentication error', {
      error: err.message,
      path: req.path,
      method: req.method,
    });

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Session expired. Please log in again.',
      },
    });
    return;
  }

  // Handle unknown errors (500)
  logger.structuredError(err, {
    operation: 'http_request',
    metadata: {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          message: err.message,
          name: err.name,
        },
      }),
    },
  });
}

/**
 * 404 Not Found handler
 * Should be registered after all routes but before error handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

