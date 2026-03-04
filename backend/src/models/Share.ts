/**
 * Share model
 * Handles share link creation and retrieval for research documents
 */

import { nanoid } from 'nanoid';
import db from '../config/database';
import { useLocalStorage } from '../config';
import logger from '../utils/logger';
import * as localStorage from '../storage/local-share.storage';

const SHARED_LINKS_COLLECTION = 'shared_links';

// Check if we should use local storage (for testing) or Firestore (production)
const USE_LOCAL_STORAGE = useLocalStorage();

if (USE_LOCAL_STORAGE) {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📁 LOCAL STORAGE MODE ENABLED - Share links will be saved to local directory');
  logger.info('ℹ️  To use Firestore, set NODE_ENV=production or USE_LOCAL_STORAGE=false');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

export type ShareContentType = 'research' | 'summary';

/**
 * Share record interface
 */
export interface ShareRecord {
  id: string;                    // Unique share ID (document ID in Firestore)
  shareId: string;                // Also the document ID (for consistency)
  researchId: string;            // Original research ID (empty for summary shares)
  userId: string;                // Owner user ID
  createdAt: number;             // Unix timestamp
  lastAccessedAt?: number;       // Last view timestamp
  accessCount: number;           // View counter
  isActive: boolean;             // Revocation flag
  expiresAt?: number;            // Optional expiration (null = permanent)
  /** Content type: research or summary. Default 'research' for backward compat */
  contentType?: ShareContentType;
  /** Content ID: researchId or summaryId depending on contentType */
  contentId?: string;
}

/**
 * Share creation data
 */
export interface ShareCreateData {
  researchId: string;
  userId: string;
}

/**
 * Create or get existing share link for a research
 */
export async function createOrGetShare(
  researchId: string,
  userId: string
): Promise<ShareRecord> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.createOrGetShare(researchId, userId);
  }

  // Firestore implementation
  const { Timestamp } = await import('firebase-admin/firestore');

  try {
    // Check for existing active share
    const existingShares = await db
      .collection(SHARED_LINKS_COLLECTION)
      .where('researchId', '==', researchId)
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!existingShares.empty) {
      const doc = existingShares.docs[0];
      const data = doc.data();
      logger.info('Found existing share link', {
        shareId: doc.id,
        researchId,
        userId,
        accessCount: data.accessCount,
      });
      return {
        id: doc.id,
        shareId: doc.id,
        researchId: data.researchId,
        userId: data.userId,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt,
        lastAccessedAt: data.lastAccessedAt?.toMillis?.() || data.lastAccessedAt,
        accessCount: data.accessCount || 0,
        isActive: data.isActive !== false,
        expiresAt: data.expiresAt?.toMillis?.() || data.expiresAt,
      } as ShareRecord;
    }

    // Create new share
    const shareId = nanoid(10);
    const now = Timestamp.now();
    const shareData = {
      shareId,
      researchId,
      userId,
      createdAt: now,
      lastAccessedAt: null,
      accessCount: 0,
      isActive: true,
      expiresAt: null,
    };

    await db.collection(SHARED_LINKS_COLLECTION).doc(shareId).set(shareData);

    logger.info('Created new share link', {
      shareId,
      researchId,
      userId,
    });

    return {
      id: shareId,
      shareId,
      researchId,
      userId,
      createdAt: now.toMillis(),
      lastAccessedAt: undefined,
      accessCount: 0,
      isActive: true,
      expiresAt: undefined,
    };
  } catch (error) {
    logger.error('Error creating share link', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create share link: ${errorMessage}`);
  }
}

/**
 * Create or get existing share link for a summary
 */
export async function createOrGetShareForSummary(
  summaryId: string,
  userId: string
): Promise<ShareRecord> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.createOrGetShareForSummary(summaryId, userId);
  }

  const { Timestamp } = await import('firebase-admin/firestore');

  try {
    const existingShares = await db
      .collection(SHARED_LINKS_COLLECTION)
      .where('contentType', '==', 'summary')
      .where('contentId', '==', summaryId)
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!existingShares.empty) {
      const doc = existingShares.docs[0];
      const data = doc.data();
      logger.info('Found existing share link for summary', {
        shareId: doc.id,
        summaryId,
        userId,
        accessCount: data.accessCount,
      });
      return docToShareRecord(doc);
    }

    const shareId = nanoid(10);
    const now = Timestamp.now();
    const shareData = {
      shareId,
      researchId: '', // Not used for summaries
      userId,
      contentType: 'summary',
      contentId: summaryId,
      createdAt: now,
      lastAccessedAt: null,
      accessCount: 0,
      isActive: true,
      expiresAt: null,
    };

    await db.collection(SHARED_LINKS_COLLECTION).doc(shareId).set(shareData);

    logger.info('Created new share link for summary', {
      shareId,
      summaryId,
      userId,
    });

    return {
      id: shareId,
      shareId,
      researchId: '',
      userId,
      contentType: 'summary',
      contentId: summaryId,
      createdAt: now.toMillis(),
      lastAccessedAt: undefined,
      accessCount: 0,
      isActive: true,
      expiresAt: undefined,
    };
  } catch (error) {
    logger.error('Error creating share link for summary', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create share link: ${errorMessage}`);
  }
}

function docToShareRecord(doc: { id: string; data: () => Record<string, unknown> | undefined }): ShareRecord {
  const data = (doc.data() || {}) as Record<string, unknown>;
  return {
    id: doc.id,
    shareId: doc.id,
    researchId: (data.researchId as string) ?? '',
    userId: data.userId as string,
    createdAt: (data.createdAt as { toMillis?: () => number })?.toMillis?.() ?? (data.createdAt as number),
    lastAccessedAt: (data.lastAccessedAt as { toMillis?: () => number })?.toMillis?.() ?? (data.lastAccessedAt as number | undefined),
    accessCount: (data.accessCount as number) || 0,
    isActive: data.isActive !== false,
    expiresAt: (data.expiresAt as { toMillis?: () => number })?.toMillis?.() ?? (data.expiresAt as number | undefined),
    contentType: data.contentType as ShareContentType | undefined,
    contentId: data.contentId as string | undefined,
  };
}

/**
 * Get share by share ID
 */
export async function getShareById(shareId: string): Promise<ShareRecord | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getShareById(shareId);
  }

  // Firestore implementation
  try {
    const doc = await db.collection(SHARED_LINKS_COLLECTION).doc(shareId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return docToShareRecord(doc);
  } catch (error) {
    logger.error('Error getting share by ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get share: ${errorMessage}`);
  }
}

/**
 * Get share by research ID and user ID
 */
export async function getShareByResearchId(
  researchId: string,
  userId: string
): Promise<ShareRecord | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getShareByResearchId(researchId, userId);
  }

  // Firestore implementation
  try {
    const snapshot = await db
      .collection(SHARED_LINKS_COLLECTION)
      .where('researchId', '==', researchId)
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      shareId: doc.id,
      researchId: data.researchId,
      userId: data.userId,
      createdAt: data.createdAt?.toMillis?.() || data.createdAt,
      lastAccessedAt: data.lastAccessedAt?.toMillis?.() || data.lastAccessedAt,
      accessCount: data.accessCount || 0,
      isActive: data.isActive !== false,
      expiresAt: data.expiresAt?.toMillis?.() || data.expiresAt,
    } as ShareRecord;
  } catch (error) {
    logger.error('Error getting share by research ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get share: ${errorMessage}`);
  }
}

/**
 * Increment access count for a share
 */
export async function incrementAccessCount(shareId: string): Promise<void> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.incrementAccessCount(shareId);
  }

  // Firestore implementation
  try {
    const { Timestamp } = await import('firebase-admin/firestore');
    const docRef = db.collection(SHARED_LINKS_COLLECTION).doc(shareId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Share not found');
    }

    const data = doc.data();
    const currentCount = data?.accessCount || 0;

    await docRef.update({
      accessCount: currentCount + 1,
      lastAccessedAt: Timestamp.now(),
    });

    logger.debug('Incremented access count', {
      shareId,
      newCount: currentCount + 1,
    });
  } catch (error) {
    logger.error('Error incrementing access count', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to increment access count: ${errorMessage}`);
  }
}
