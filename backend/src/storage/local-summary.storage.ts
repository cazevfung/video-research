import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';
import type { Summary } from '../models/Summary';
import { getSummariesDirectory, getUsersDirectory } from '../config';

// Get centralized directory paths
const DATA_DIR = getSummariesDirectory();
const USERS_DIR = getUsersDirectory();

// File locking map for concurrent write protection
const fileLocks = new Map<string, Promise<void>>();

/**
 * Safely parse a date value to a Date object or null
 * Handles string, Date, null, undefined, and invalid dates
 * @param dateValue The date value to parse
 * @returns Valid Date object or null if invalid
 */
function safeParseDate(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) {
    return null;
  }
  
  if (dateValue instanceof Date) {
    // Check if Date is valid
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    // Check if parsed date is valid
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

/**
 * Get timestamp for sorting, treating invalid dates as oldest (0)
 * @param dateValue The date value to get timestamp from
 * @returns Timestamp in milliseconds, or 0 for invalid dates
 */
function getSortableTimestamp(dateValue: string | Date | null | undefined): number {
  const date = safeParseDate(dateValue);
  return date ? date.getTime() : 0;
}

/**
 * Acquire a lock for a file to prevent concurrent writes
 * @param filePath Path to the file to lock
 * @returns Promise that resolves with a release function when lock is acquired
 */
async function acquireLock(filePath: string): Promise<() => void> {
  // Wait for any existing lock on this file
  while (fileLocks.has(filePath)) {
    const existingLock = fileLocks.get(filePath);
    if (existingLock) {
      await existingLock;
    }
  }

  // Create a new lock promise
  let releaseLock: (() => void) | undefined;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  fileLocks.set(filePath, lockPromise);

  // Return release function
  return () => {
    if (releaseLock) {
      fileLocks.delete(filePath);
      releaseLock();
    }
  };
}

/**
 * Validate JSON file content and ensure it matches Summary structure
 * @param data Raw file content
 * @param filePath Path to the file (for error messages)
 * @returns Parsed and validated Summary object
 * @throws Error if file is invalid or corrupted
 */
function validateSummaryFile(data: string, filePath: string): Summary {
  try {
    // Parse with type that allows both id and _id for backward compatibility
    const parsed = JSON.parse(data) as Summary & { _id?: string };

    // Basic validation - ensure required fields exist
    if (!parsed.id && !parsed._id) {
      throw new Error('Summary missing required field: id');
    }
    if (!parsed.job_id) {
      throw new Error('Summary missing required field: job_id');
    }
    if (!parsed.batch_title) {
      throw new Error('Summary missing required field: batch_title');
    }
    if (!parsed.final_summary_text) {
      throw new Error('Summary missing required field: final_summary_text');
    }
    if (!parsed.source_videos || !Array.isArray(parsed.source_videos)) {
      throw new Error('Summary missing or invalid field: source_videos');
    }

    // Normalize id field (handle both id and _id)
    const normalized: Summary = {
      ...parsed,
      id: parsed.id || parsed._id || undefined,
    };
    // Remove _id if it exists to ensure clean Summary type
    delete (normalized as any)._id;

    // Validate and fix created_at field
    if (!normalized.created_at) {
      // If missing, use current time
      normalized.created_at = new Date().toISOString();
      logger.warn('Summary missing created_at, using current time', {
        filePath,
        id: normalized.id,
      });
    } else {
      // Validate that created_at is a valid ISO string
      const parsedDate = safeParseDate(normalized.created_at);
      if (!parsedDate) {
        // Invalid date, replace with current time
        logger.warn('Summary has invalid created_at, replacing with current time', {
          filePath,
          id: normalized.id,
          originalCreatedAt: normalized.created_at,
        });
        normalized.created_at = new Date().toISOString();
      } else if (typeof normalized.created_at !== 'string') {
        // Convert Date object to ISO string
        normalized.created_at = parsedDate.toISOString();
      }
      // If it's already a valid ISO string, keep it as is
    }

    return normalized;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Ensure data directories exist with proper error handling
 * @throws Error if directories cannot be created
 */
async function ensureDataDirs(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
    logger.debug('Local storage directories ready', {
      summariesDir: DATA_DIR,
      usersDir: USERS_DIR,
    });
  } catch (error) {
    logger.error('Failed to create data directories', {
      error,
      summariesDir: DATA_DIR,
      usersDir: USERS_DIR,
    });
    throw new Error(
      `Cannot initialize local storage directories: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Initialize on module load
ensureDataDirs().catch((error) => {
  logger.error('Failed to initialize local storage directories on module load', error);
});

/**
 * Generate a simple ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new summary (local file storage)
 */
export async function createSummary(
  data: Omit<Summary, 'id' | 'created_at' | 'updated_at'>
): Promise<Summary> {
  await ensureDataDirs();

  const id = generateId();
  const now = new Date().toISOString();

  const summary: Summary = {
    id,
    ...data,
    created_at: now, // ISO string for local storage
    updated_at: now,
  };

  const filePath = path.join(DATA_DIR, `${id}.json`);

  // Acquire lock for file write
  const releaseLock = await acquireLock(filePath);

  try {
    // Write file atomically using temporary file then rename
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(summary, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);

    logger.info('Summary created in local storage', {
      id,
      jobId: data.job_id,
      userId: data.user_id,
      filePath,
      batchTitle: data.batch_title,
    });

    return summary;
  } catch (error) {
    logger.error('Error creating summary in local storage', {
      error,
      id,
      jobId: data.job_id,
      userId: data.user_id,
      filePath,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create summary (local storage): ${errorMessage}`);
  } finally {
    releaseLock();
  }
}

/**
 * Get summary by document ID (local file storage)
 */
export async function getSummaryById(id: string): Promise<Summary | null> {
  const filePath = path.join(DATA_DIR, `${id}.json`);

  try {
    logger.debug('Reading summary from local storage', { id, filePath });
    const data = await fs.readFile(filePath, 'utf-8');
    const summary = validateSummaryFile(data, filePath);
    logger.debug('Successfully read summary from local storage', { id });
    return summary;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.debug('Summary file not found', { id, filePath });
      return null; // File not found
    }
    logger.error('Error getting summary by ID from local storage', {
      error,
      id,
      filePath,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve summary (local storage): ${errorMessage}`);
  }
}

/**
 * Get summary by job ID (local file storage)
 */
export async function getSummaryByJobId(jobId: string): Promise<Summary | null> {
  await ensureDataDirs();

  try {
    logger.debug('Searching for summary by job ID', { jobId, dataDir: DATA_DIR });
    const files = await fs.readdir(DATA_DIR);
    logger.debug(`Found ${files.length} files in data directory`);

    const errors: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(DATA_DIR, file);

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const summary = validateSummaryFile(data, filePath);

        if (summary.job_id === jobId) {
          logger.debug('Found summary by job ID', { jobId, id: summary.id });
          return summary;
        }
      } catch (error) {
        // Log error but continue processing other files
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to parse ${file}: ${errorMsg}`);
        logger.warn(`Skipping corrupted file: ${file}`, { error, filePath });
      }
    }

    if (errors.length > 0) {
      logger.warn('Some files could not be parsed while searching for job ID', {
        jobId,
        errors: errors.slice(0, 5), // Log first 5 errors
        totalErrors: errors.length,
      });
    }

    logger.debug('Summary not found by job ID', { jobId });
    return null;
  } catch (error) {
    logger.error('Error getting summary by job ID from local storage', {
      error,
      jobId,
      dataDir: DATA_DIR,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve summary by job ID (local storage): ${errorMessage}`);
  }
}

/**
 * Get summaries by user ID (local file storage)
 */
export async function getSummariesByUserId(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  summaries: Summary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}> {
  await ensureDataDirs();

  try {
    logger.debug('Reading summaries from local storage', {
      userId,
      page,
      limit,
      dataDir: DATA_DIR,
    });

    const files = await fs.readdir(DATA_DIR);
    logger.debug(`Found ${files.length} files in data directory`);

    const allSummaries: Summary[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(DATA_DIR, file);

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const summary = validateSummaryFile(data, filePath);

        // Validate user match - check user_uid first (primary field), then user_id (backward compatibility)
        const userMatches = 
          summary.user_uid === userId || 
          summary.user_id === userId || 
          (summary.user_uid === null && summary.user_id === null && userId === null);
        if (userMatches) {
          allSummaries.push(summary);
        }
      } catch (error) {
        // Log error but continue processing other files
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to parse ${file}: ${errorMsg}`);
        logger.warn(`Skipping corrupted file: ${file}`, { error, filePath });
      }
    }

    if (errors.length > 0) {
      logger.warn('Some files could not be parsed', {
        userId,
        errors: errors.slice(0, 5), // Log first 5 errors
        totalErrors: errors.length,
      });
    }

    logger.debug(`Found ${allSummaries.length} summaries for user ${userId} (before filtering)`);

    // Sort by created_at descending (newest first)
    // Invalid dates are treated as oldest (timestamp 0) and will appear last
    allSummaries.sort((a, b) => {
      const timestampB = getSortableTimestamp(b.created_at);
      const timestampA = getSortableTimestamp(a.created_at);
      return timestampB - timestampA;
    });

    // Pagination
    const totalItems = allSummaries.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const summaries = allSummaries.slice(startIndex, endIndex);

    logger.debug(`Returning ${summaries.length} summaries for user ${userId}`, {
      page,
      limit,
      totalItems,
      totalPages,
    });

    return {
      summaries,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    };
  } catch (error) {
    logger.error('Error getting summaries by user ID from local storage', {
      error,
      userId,
      page,
      limit,
      dataDir: DATA_DIR,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve summaries (local storage): ${errorMessage}`);
  }
}

/**
 * Update summary data (local file storage)
 */
export async function updateSummary(
  id: string,
  updates: Partial<Omit<Summary, 'id' | 'created_at'>>
): Promise<Summary> {
  const filePath = path.join(DATA_DIR, `${id}.json`);

  // Acquire lock for file write
  const releaseLock = await acquireLock(filePath);

  try {
    logger.debug('Updating summary in local storage', { id, updates: Object.keys(updates) });

    const data = await fs.readFile(filePath, 'utf-8');
    const summary = validateSummaryFile(data, filePath);

    const updatedSummary: Summary = {
      ...summary,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Write file atomically using temporary file then rename
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(updatedSummary, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);

    logger.info('Summary updated in local storage', {
      id,
      updates: Object.keys(updates),
      batchTitle: updatedSummary.batch_title,
    });

    return updatedSummary;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.error('Summary file not found for update', { id, filePath });
      throw new Error(`Summary not found: ${id}`);
    }
    logger.error('Error updating summary in local storage', {
      error,
      id,
      updates: Object.keys(updates),
      filePath,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update summary (local storage): ${errorMessage}`);
  } finally {
    releaseLock();
  }
}

/**
 * Check if user owns the summary (local file storage)
 */
export async function checkSummaryOwnership(
  summaryId: string,
  userId: string
): Promise<boolean> {
  try {
    const summary = await getSummaryById(summaryId);
    // Check both user_uid (primary field) and user_id (backward compatibility)
    return summary !== null && (summary.user_uid === userId || summary.user_id === userId);
  } catch (error) {
    logger.error('Error checking summary ownership in local storage', error);
    return false;
  }
}

