/**
 * Guest session management service
 * Handles creation, validation, and expiration of guest sessions
 */

import { v4 as uuidv4 } from 'uuid';
import env from '../config/env';
import { getGuestAccessConfig } from '../config';
import logger from '../utils/logger';
import { GuestSession } from '../types/guest.types';

/**
 * In-memory storage for guest sessions
 * In production with Redis, this would be replaced with Redis storage
 */
const guestSessions = new Map<string, GuestSession>();

/**
 * IP address to session count mapping (for abuse prevention)
 */
const ipSessionCounts = new Map<string, { count: number; resetAt: Date }>();

/**
 * Cleanup interval for expired sessions
 */
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Session expiry in milliseconds (from config)
 */
function getSessionExpiryMs(): number {
  return env.GUEST_SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
}

/**
 * Initialize cleanup job for expired sessions
 */
function initializeCleanup(): void {
  if (cleanupInterval) {
    return; // Already initialized
  }

  const guestConfig = getGuestAccessConfig();
  const cleanupIntervalMs = guestConfig.cleanup_interval_hours * 60 * 60 * 1000;

  // Run cleanup at configured interval
  cleanupInterval = setInterval(() => {
    cleanupExpiredSessions();
  }, cleanupIntervalMs);

  logger.info('Guest session cleanup interval initialized', {
    expiry_hours: env.GUEST_SESSION_EXPIRY_HOURS,
    cleanup_interval_hours: guestConfig.cleanup_interval_hours,
  });
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = new Date();
  let cleaned = 0;
  const expiryMs = getSessionExpiryMs();

  for (const [sessionId, session] of guestSessions.entries()) {
    if (session.expiresAt < now) {
      guestSessions.delete(sessionId);
      cleaned++;
    }
  }

  // Clean up IP session counts that have expired
  for (const [ip, data] of ipSessionCounts.entries()) {
    if (data.resetAt < now) {
      ipSessionCounts.delete(ip);
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired guest sessions`);
  }
}

/**
 * Get IP address from request
 */
function getIpAddress(req: any): string {
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Check if IP address has exceeded session limit
 */
export function checkIpSessionLimit(ipAddress: string): {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
} {
  const limit = env.GUEST_RATE_LIMIT_PER_IP;
  const windowHours = env.GUEST_RATE_LIMIT_WINDOW_HOURS;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const ipData = ipSessionCounts.get(ipAddress);
  if (!ipData || ipData.resetAt < now) {
    // Reset or initialize
    ipSessionCounts.set(ipAddress, { count: 0, resetAt });
    return { allowed: true, remaining: limit, resetAt };
  }

  const remaining = Math.max(0, limit - ipData.count);
  return {
    allowed: ipData.count < limit,
    remaining,
    resetAt: ipData.resetAt,
  };
}

/**
 * Increment IP session count
 */
function incrementIpSessionCount(ipAddress: string): void {
  const limit = env.GUEST_RATE_LIMIT_PER_IP;
  const windowHours = env.GUEST_RATE_LIMIT_WINDOW_HOURS;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const ipData = ipSessionCounts.get(ipAddress);
  if (!ipData || ipData.resetAt < now) {
    ipSessionCounts.set(ipAddress, { count: 1, resetAt });
  } else {
    ipData.count++;
  }
}

/**
 * Create a new guest session
 * @param req Express request (for IP extraction)
 * @returns Guest session ID
 */
export function createGuestSession(req: any): string {
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getSessionExpiryMs());
  const ipAddress = getIpAddress(req);

  // Check IP limit
  const ipCheck = checkIpSessionLimit(ipAddress);
  if (!ipCheck.allowed) {
    throw new Error(
      `IP address has exceeded guest session limit. Please try again after ${ipCheck.resetAt.toISOString()}`
    );
  }

  const session: GuestSession = {
    sessionId,
    createdAt: now,
    expiresAt,
    summaryCount: 0,
    ipAddress,
  };

  guestSessions.set(sessionId, session);
  incrementIpSessionCount(ipAddress);

  logger.info('Created guest session', {
    sessionId,
    ipAddress,
    expiresAt: expiresAt.toISOString(),
  });

  // Initialize cleanup if not already done
  initializeCleanup();

  return sessionId;
}

/**
 * Get guest session by ID
 * @param sessionId Session ID
 * @returns Guest session or null if not found/expired
 */
export function getGuestSession(sessionId: string): GuestSession | null {
  const session = guestSessions.get(sessionId);
  if (!session) {
    return null;
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    guestSessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Increment summary count for a guest session
 * @param sessionId Session ID
 * @returns True if increment was successful, false if limit reached
 */
export function incrementGuestSummaryCount(sessionId: string): boolean {
  const session = getGuestSession(sessionId);
  if (!session) {
    return false;
  }

  const guestConfig = getGuestAccessConfig();
  if (
    guestConfig.max_summaries != null &&
    session.summaryCount >= guestConfig.max_summaries
  ) {
    return false; // Limit reached
  }

  session.summaryCount++;
  guestSessions.set(sessionId, session);

  logger.debug('Incremented guest summary count', {
    sessionId,
    summaryCount: session.summaryCount,
    max_summaries: guestConfig.max_summaries,
  });

  return true;
}

/**
 * Clear guest session
 * @param sessionId Session ID
 */
export function clearGuestSession(sessionId: string): void {
  guestSessions.delete(sessionId);
  logger.debug('Cleared guest session', { sessionId });
}

/**
 * Extract guest session ID from request headers or cookies
 * @param req Express request
 * @returns Session ID or null
 */
export function extractGuestSessionId(req: any): string | null {
  // Check X-Guest-Session-Id header first
  const headerSessionId = req.headers['x-guest-session-id'];
  if (headerSessionId && typeof headerSessionId === 'string') {
    return headerSessionId;
  }

  // Check cookie (if cookies are used)
  const cookieSessionId = req.cookies?.guestSessionId;
  if (cookieSessionId && typeof cookieSessionId === 'string') {
    return cookieSessionId;
  }

  return null;
}

/**
 * Shutdown cleanup
 */
export function shutdown(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  guestSessions.clear();
  ipSessionCounts.clear();
  logger.info('Guest session service shut down');
}

