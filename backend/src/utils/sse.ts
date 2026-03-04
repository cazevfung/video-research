/**
 * Server-Sent Events (SSE) utility functions
 * Handles SSE connection setup, event sending, and cleanup
 */

import { Response } from 'express';
import logger from './logger';

/**
 * SSE connection information
 */
export interface SSEConnection {
  res: Response;
  jobId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  /**
   * Reset the connection idle timeout. Called by job.service when progress or heartbeat is sent
   * so that active streams are not closed while data is flowing.
   */
  resetTimeout?: () => void;
}

/**
 * Set up SSE response headers
 * @param res Express response object
 * @param req Express request object (for CORS origin)
 */
export function setupSSEHeaders(res: Response, req?: any): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // CORS headers - use origin from request (CORS middleware handles preflight)
  // For SSE, we need to set these manually since CORS middleware may not handle streaming responses
  const origin = req?.headers?.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control, x-guest-session-id');
  }
}

/**
 * Send SSE event to client
 * @param res Express response object
 * @param event Event name
 * @param data Event data (will be JSON stringified)
 */
export function sendSSEEvent(res: Response, event: string, data: any): void {
  try {
    const jsonData = JSON.stringify(data);
    res.write(`event: ${event}\n`);
    res.write(`data: ${jsonData}\n\n`);
    res.flushHeaders?.(); // Flush headers if available
  } catch (error) {
    logger.error('Error sending SSE event', { error, event });
  }
}

/**
 * Send SSE message (default event type)
 * @param res Express response object
 * @param data Event data
 */
export function sendSSEMessage(res: Response, data: any): void {
  try {
    const jsonData = JSON.stringify(data);
    res.write(`data: ${jsonData}\n\n`);
    res.flushHeaders?.(); // Flush headers if available
    // Flush body so client receives progress immediately (avoids buffering until next write)
    const flush = (res as any).flush;
    if (typeof flush === 'function') {
      flush.call(res);
    }
  } catch (error) {
    logger.error('Error sending SSE message', { error });
  }
}

/**
 * Close SSE connection gracefully
 * @param res Express response object
 */
export function closeSSEConnection(res: Response): void {
  try {
    res.write('data: {"status":"closed"}\n\n');
    res.end();
  } catch (error) {
    logger.warn('Error closing SSE connection', { error });
    // Try to end the response anyway
    try {
      res.end();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
}

/**
 * Check if SSE connection is still alive
 * @param res Express response object
 * @returns True if connection is still active
 */
export function isConnectionAlive(res: Response): boolean {
  // Check if response is still writable
  return !res.closed && !res.destroyed && res.writable;
}

/**
 * Handle client disconnect
 * @param res Express response object
 * @param callback Optional callback to execute on disconnect
 */
export function handleClientDisconnect(
  res: Response,
  callback?: () => void
): void {
  res.on('close', () => {
    logger.debug('SSE client disconnected');
    if (callback) {
      callback();
    }
  });

  res.on('error', (error) => {
    logger.warn('SSE connection error', { error });
    if (callback) {
      callback();
    }
  });
}


