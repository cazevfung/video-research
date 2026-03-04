/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracking and correlation
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware to add request ID to each request
 * Request ID is available via req.requestId
 * Also sets X-Request-ID header in response
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;

  // Set response header
  res.setHeader('X-Request-ID', requestId);

  next();
}

