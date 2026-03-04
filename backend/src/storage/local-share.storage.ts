/**
 * Local share storage
 * Stores share links in JSON files for development/testing
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import logger from '../utils/logger';
import { ShareRecord, ShareCreateData } from '../models/Share';
import { getSharedDirectory } from '../config';

// Get centralized directory path
const DATA_DIR = getSharedDirectory();

/**
 * Ensure data directory exists
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create shared links directory', { error, dataDir: DATA_DIR });
    throw new Error(`Failed to create shared links directory: ${DATA_DIR}`);
  }
}

/**
 * Get file path for a share ID
 */
function getShareFilePath(shareId: string): string {
  return path.join(DATA_DIR, `${shareId}.json`);
}

/**
 * Validate share file data
 */
function validateShareFile(data: any, filePath: string): ShareRecord {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid share file format: ${filePath}`);
  }

  const requiredFields = ['shareId', 'userId', 'createdAt', 'accessCount', 'isActive'];
  for (const field of requiredFields) {
    if (data[field] === undefined) {
      throw new Error(`Missing required field '${field}' in share file: ${filePath}`);
    }
  }

  return {
    id: data.shareId || data.id,
    shareId: data.shareId || data.id,
    researchId: data.researchId ?? '',
    userId: data.userId,
    createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : data.createdAt,
    lastAccessedAt: data.lastAccessedAt
      ? typeof data.lastAccessedAt === 'string'
        ? new Date(data.lastAccessedAt).getTime()
        : data.lastAccessedAt
      : undefined,
    accessCount: data.accessCount || 0,
    isActive: data.isActive !== false,
    expiresAt: data.expiresAt
      ? typeof data.expiresAt === 'string'
        ? new Date(data.expiresAt).getTime()
        : data.expiresAt
      : undefined,
    contentType: data.contentType,
    contentId: data.contentId,
  };
}

/**
 * Create or get existing share link for a summary (local file storage)
 */
export async function createOrGetShareForSummary(
  summaryId: string,
  userId: string
): Promise<ShareRecord> {
  await ensureDataDir();

  try {
    const files = await fs.readdir(DATA_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(DATA_DIR, file);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const share = validateShareFile(JSON.parse(data), filePath);

        if (
          share.contentType === 'summary' &&
          share.contentId === summaryId &&
          share.userId === userId &&
          share.isActive
        ) {
          logger.info('Found existing share link for summary in local storage', {
            shareId: share.shareId,
            summaryId,
            userId,
            accessCount: share.accessCount,
          });
          return share;
        }
      } catch {
        continue;
      }
    }

    const shareId = nanoid(10);
    const now = Date.now();
    const share: ShareRecord = {
      id: shareId,
      shareId,
      researchId: '',
      userId,
      contentType: 'summary',
      contentId: summaryId,
      createdAt: now,
      lastAccessedAt: undefined,
      accessCount: 0,
      isActive: true,
      expiresAt: undefined,
    };

    const filePath = getShareFilePath(shareId);
    await fs.writeFile(filePath, JSON.stringify(share, null, 2), 'utf-8');

    logger.info('Created new share link for summary in local storage', {
      shareId,
      summaryId,
      userId,
      filePath,
    });

    return share;
  } catch (error) {
    logger.error('Error creating share for summary in local storage', {
      error,
      summaryId,
      userId,
      dataDir: DATA_DIR,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create share for summary (local storage): ${errorMessage}`);
  }
}

/**
 * Create or get existing share link (local file storage)
 */
export async function createOrGetShare(
  researchId: string,
  userId: string
): Promise<ShareRecord> {
  await ensureDataDir();

  try {
    // Check for existing share
    const files = await fs.readdir(DATA_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(DATA_DIR, file);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const share = validateShareFile(JSON.parse(data), filePath);

        if (
          share.researchId === researchId &&
          share.userId === userId &&
          share.isActive
        ) {
          logger.info('Found existing share link in local storage', {
            shareId: share.shareId,
            researchId,
            userId,
            accessCount: share.accessCount,
          });
          return share;
        }
      } catch (error) {
        // Skip corrupted files
        logger.warn(`Skipping corrupted share file: ${file}`, { error, filePath });
        continue;
      }
    }

    // Create new share
    const shareId = nanoid(10);
    const now = Date.now();
    const share: ShareRecord = {
      id: shareId,
      shareId,
      researchId,
      userId,
      createdAt: now,
      lastAccessedAt: undefined,
      accessCount: 0,
      isActive: true,
      expiresAt: undefined,
    };

    const filePath = getShareFilePath(shareId);
    await fs.writeFile(filePath, JSON.stringify(share, null, 2), 'utf-8');

    logger.info('Created new share link in local storage', {
      shareId,
      researchId,
      userId,
      filePath,
    });

    return share;
  } catch (error) {
    logger.error('Error creating share in local storage', {
      error,
      researchId,
      userId,
      dataDir: DATA_DIR,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create share (local storage): ${errorMessage}`);
  }
}

/**
 * Get share by ID (local file storage)
 */
export async function getShareById(shareId: string): Promise<ShareRecord | null> {
  await ensureDataDir();

  const filePath = getShareFilePath(shareId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return validateShareFile(JSON.parse(data), filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    logger.error('Error reading share file', { error, shareId, filePath });
    throw error;
  }
}

/**
 * Get share by research ID and user ID (local file storage)
 */
export async function getShareByResearchId(
  researchId: string,
  userId: string
): Promise<ShareRecord | null> {
  await ensureDataDir();

  try {
    const files = await fs.readdir(DATA_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(DATA_DIR, file);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const share = validateShareFile(JSON.parse(data), filePath);

        if (
          share.researchId === researchId &&
          share.userId === userId &&
          share.isActive
        ) {
          return share;
        }
      } catch (error) {
        // Skip corrupted files
        logger.warn(`Skipping corrupted share file: ${file}`, { error, filePath });
        continue;
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting share by research ID', {
      error,
      researchId,
      userId,
      dataDir: DATA_DIR,
    });
    throw error;
  }
}

/**
 * Increment access count (local file storage)
 */
export async function incrementAccessCount(shareId: string): Promise<void> {
  await ensureDataDir();

  const filePath = getShareFilePath(shareId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const share = validateShareFile(JSON.parse(data), filePath);

    share.accessCount = (share.accessCount || 0) + 1;
    share.lastAccessedAt = Date.now();

    await fs.writeFile(filePath, JSON.stringify(share, null, 2), 'utf-8');

    logger.debug('Incremented access count in local storage', {
      shareId,
      newCount: share.accessCount,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('Share not found');
    }
    logger.error('Error incrementing access count', { error, shareId, filePath });
    throw error;
  }
}
