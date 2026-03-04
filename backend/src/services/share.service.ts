/**
 * Share service
 * Handles share link generation and URL building
 */

import env from '../config/env';
import {
  createOrGetShare,
  createOrGetShareForSummary,
  getShareById,
  incrementAccessCount,
  ShareRecord,
} from '../models/Share';
import logger from '../utils/logger';

// Phase 5: Simple in-memory cache for frequently accessed shares
// In production, consider using Redis or Firestore cache
const shareCache = new Map<string, { data: ShareRecord; timestamp: number }>();

/**
 * Phase 5: Get cached share or fetch from database
 */
function getCachedShare(shareId: string): ShareRecord | null {
  const cached = shareCache.get(shareId);
  if (cached) {
    const now = Date.now();
    const cacheAge = now - cached.timestamp;
    const cacheTtl = env.SHARE_CACHE_TTL_SECONDS * 1000;
    
    if (cacheAge < cacheTtl) {
      logger.debug('Share cache hit', { shareId });
      return cached.data;
    } else {
      // Cache expired, remove it
      shareCache.delete(shareId);
    }
  }
  return null;
}

/**
 * Phase 5: Cache a share record
 */
function cacheShare(shareId: string, share: ShareRecord): void {
  shareCache.set(shareId, {
    data: share,
    timestamp: Date.now(),
  });
  
  // Limit cache size (keep only last 100 entries)
  if (shareCache.size > 100) {
    const firstKey = shareCache.keys().next().value;
    if (firstKey) {
      shareCache.delete(firstKey);
    }
  }
}

/**
 * Phase 5: Check for abuse (high-frequency access)
 */
function checkAbuse(share: ShareRecord): boolean {
  const threshold = env.SHARE_ABUSE_DETECTION_THRESHOLD;
  const windowHours = env.SHARE_ABUSE_DETECTION_WINDOW_HOURS;
  
  // Check if access count exceeds threshold
  if (share.accessCount >= threshold) {
    // Check if accesses happened within the detection window
    const now = Date.now();
    const windowMs = windowHours * 60 * 60 * 1000;
    const lastAccess = share.lastAccessedAt || share.createdAt;
    const timeSinceLastAccess = now - lastAccess;
    
    // If last access was recent and count is high, flag as potential abuse
    if (timeSinceLastAccess < windowMs) {
      logger.warn('Potential share abuse detected', {
        shareId: share.shareId,
        accessCount: share.accessCount,
        threshold,
        windowHours,
      });
      return true;
    }
  }
  
  return false;
}

/**
 * Build share URL based on environment
 */
export function buildShareUrl(shareId: string): string {
  const baseUrl = env.FRONTEND_URL;
  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  // Static-export friendly URL: use query param (no dynamic route needed)
  return `${cleanBaseUrl}/shared?shareId=${encodeURIComponent(shareId)}`;
}

/**
 * Create or get existing share link for a research
 */
export async function createOrGetShareLink(
  researchId: string,
  userId: string
): Promise<{
  shareId: string;
  shareUrl: string;
  isNew: boolean;
  createdAt: number;
  accessCount?: number;
}> {
  const share = await createOrGetShare(researchId, userId);
  const shareUrl = buildShareUrl(share.shareId);

  logger.info('Share link created/retrieved', {
    shareId: share.shareId,
    researchId,
    userId,
    isNew: share.accessCount === 0,
    shareUrl,
  });

  return {
    shareId: share.shareId,
    shareUrl,
    isNew: share.accessCount === 0,
    createdAt: share.createdAt,
    accessCount: share.accessCount,
  };
}

/**
 * Create or get existing share link for a summary
 */
export async function createOrGetShareLinkForSummary(
  summaryId: string,
  userId: string
): Promise<{
  shareId: string;
  shareUrl: string;
  isNew: boolean;
  createdAt: number;
  accessCount?: number;
}> {
  const share = await createOrGetShareForSummary(summaryId, userId);
  const shareUrl = buildShareUrl(share.shareId);

  logger.info('Share link created/retrieved for summary', {
    shareId: share.shareId,
    summaryId,
    userId,
    isNew: share.accessCount === 0,
    shareUrl,
  });

  return {
    shareId: share.shareId,
    shareUrl,
    isNew: share.accessCount === 0,
    createdAt: share.createdAt,
    accessCount: share.accessCount,
  };
}

/**
 * Get shared research data by share ID
 * Also increments access count
 * Phase 5: Includes caching and abuse detection
 */
export async function getSharedResearch(shareId: string, clientIp?: string): Promise<{
  share: ShareRecord;
  requiresCaptcha?: boolean;
}> {
  // Phase 5: Try cache first
  let share = getCachedShare(shareId);
  
  if (!share) {
    // Fetch from database
    share = await getShareById(shareId);
    
    if (!share) {
      throw new Error('Share not found');
    }
    
    // Phase 5: Cache the share (before incrementing)
    cacheShare(shareId, share);
  }

  if (!share.isActive) {
    throw new Error('Share has been revoked');
  }

  // Check expiration (if set)
  if (share.expiresAt && share.expiresAt < Date.now()) {
    throw new Error('Share has expired');
  }

  // Phase 5: Check for abuse before incrementing
  const isAbuse = checkAbuse(share);
  const requiresCaptcha = isAbuse && env.SHARE_ENABLE_CAPTCHA;

  // Increment access count (always, even if abuse detected - for tracking)
  await incrementAccessCount(shareId);
  
  // Phase 5: Invalidate cache after increment
  shareCache.delete(shareId);

  logger.info('Shared research accessed', {
    shareId,
    researchId: share.researchId,
    accessCount: share.accessCount + 1,
    requiresCaptcha,
    clientIp: clientIp?.substring(0, 12), // Only log first 12 chars for privacy
  });

  return {
    share,
    requiresCaptcha,
  };
}
