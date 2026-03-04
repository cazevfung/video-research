import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';
import type { Research, ResearchCreateData } from '../models/Research';
import { getResearchDirectory } from '../config';
import { USER_UID_FIELD, USER_ID_FIELD } from '../config/field-names';

// Get centralized directory path
const DATA_DIR = getResearchDirectory();

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
 * Validate JSON file content and ensure it matches Research structure
 * @param data Raw file content
 * @param filePath Path to the file (for error messages)
 * @returns Parsed and validated Research object
 * @throws Error if file is invalid or corrupted
 */
function validateResearchFile(data: string, filePath: string): Research {
  try {
    // Parse with type that allows both id and _id for backward compatibility
    const parsed = JSON.parse(data) as Research & { _id?: string };

    // Basic validation - ensure required fields exist
    if (!parsed.id && !parsed._id) {
      throw new Error('Research missing required field: id');
    }
    if (!parsed.job_id) {
      throw new Error('Research missing required field: job_id');
    }
    if (!parsed.research_query) {
      throw new Error('Research missing required field: research_query');
    }
    if (!parsed.language) {
      throw new Error('Research missing required field: language');
    }

    // Normalize id field (handle both id and _id)
    const normalized: Research = {
      ...parsed,
      id: parsed.id || parsed._id || undefined,
    };
    // Remove _id if it exists to ensure clean Research type
    delete (normalized as any)._id;

    // Validate and fix created_at field
    if (!normalized.created_at) {
      // If missing, use current time
      normalized.created_at = new Date().toISOString();
      logger.warn('Research missing created_at, using current time', {
        filePath,
        id: normalized.id,
      });
    } else {
      // Validate that created_at is a valid ISO string
      const parsedDate = safeParseDate(normalized.created_at);
      if (!parsedDate) {
        // Invalid date, replace with current time
        logger.warn('Research has invalid created_at, replacing with current time', {
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
    logger.debug('Local research storage directory ready', {
      researchDir: DATA_DIR,
    });
  } catch (error) {
    logger.error('Failed to create research data directory', {
      error,
      researchDir: DATA_DIR,
    });
    throw new Error(
      `Cannot initialize local research storage directory: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Initialize on module load
ensureDataDirs().catch((error) => {
  logger.error('Failed to initialize local research storage directory on module load', error);
});

/**
 * Generate a simple ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new research (local file storage)
 */
export async function createResearch(
  data: ResearchCreateData
): Promise<Research> {
  await ensureDataDirs();

  const id = generateId();
  const now = new Date().toISOString();

  const research: Research = {
    id,
    [USER_UID_FIELD]: data.user_uid || data.user_id || null,
    [USER_ID_FIELD]: data.user_uid || data.user_id || null,
    job_id: data.job_id,
    research_query: data.research_query,
    language: data.language,
    generated_queries: data.generated_queries,
    video_search_results: data.video_search_results,
    selected_videos: data.selected_videos,
    source_transcripts: data.source_transcripts,
    style_guide: data.style_guide,
    final_summary_text: data.final_summary_text,
    citations: data.citations, // Include citation metadata
    citationUsage: data.citationUsage, // Include citation usage tracking
    processing_stats: data.processing_stats,
    created_at: now, // ISO string for local storage
  };

  const filePath = path.join(DATA_DIR, `${id}.json`);

  // Acquire lock for file write
  const releaseLock = await acquireLock(filePath);

  try {
    // Write file atomically using temporary file then rename
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(research, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);

    logger.info('Research created in local storage', {
      id,
      jobId: data.job_id,
      userId: data.user_uid || data.user_id,
      filePath,
      researchQuery: data.research_query,
      hasSummary: !!data.final_summary_text,
    });

    return research;
  } catch (error) {
    logger.error('Error creating research in local storage', {
      error,
      id,
      jobId: data.job_id,
      userId: data.user_uid || data.user_id,
      filePath,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create research (local storage): ${errorMessage}`);
  } finally {
    releaseLock();
  }
}

/**
 * Get research by document ID (local file storage)
 */
export async function getResearchById(id: string): Promise<Research | null> {
  const filePath = path.join(DATA_DIR, `${id}.json`);

  try {
    logger.debug('Reading research from local storage', { id, filePath });
    const data = await fs.readFile(filePath, 'utf-8');
    const research = validateResearchFile(data, filePath);
    logger.debug('Successfully read research from local storage', { id });
    return research;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.debug('Research file not found', { id, filePath });
      return null; // File not found
    }
    logger.error('Error getting research by ID from local storage', {
      error,
      id,
      filePath,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve research (local storage): ${errorMessage}`);
  }
}

/**
 * Get research by job ID (local file storage)
 */
export async function getResearchByJobId(jobId: string): Promise<Research | null> {
  await ensureDataDirs();

  try {
    logger.debug('Searching for research by job ID', { jobId, dataDir: DATA_DIR });
    const files = await fs.readdir(DATA_DIR);
    logger.debug(`Found ${files.length} files in research directory`);

    const errors: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(DATA_DIR, file);

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const research = validateResearchFile(data, filePath);

        if (research.job_id === jobId) {
          logger.debug('Found research by job ID', { jobId, id: research.id });
          return research;
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

    logger.debug('Research not found by job ID', { jobId });
    return null;
  } catch (error) {
    logger.error('Error getting research by job ID from local storage', {
      error,
      jobId,
      dataDir: DATA_DIR,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve research by job ID (local storage): ${errorMessage}`);
  }
}

/**
 * Get researches by user ID (local file storage)
 */
export async function getUserResearches(
  userUid: string,
  limit: number = 20
): Promise<Research[]> {
  await ensureDataDirs();

  try {
    logger.debug('Reading researches from local storage', {
      userUid,
      limit,
      dataDir: DATA_DIR,
    });

    const files = await fs.readdir(DATA_DIR);
    logger.debug(`Found ${files.length} files in research directory`);

    const allResearches: Research[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(DATA_DIR, file);

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const research = validateResearchFile(data, filePath);

        // Validate user match - check user_uid first (primary field), then user_id (backward compatibility)
        const userMatches = 
          research.user_uid === userUid || 
          research.user_id === userUid || 
          (research.user_uid === null && research.user_id === null && userUid === null);
        if (userMatches) {
          allResearches.push(research);
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
        userUid,
        errors: errors.slice(0, 5), // Log first 5 errors
        totalErrors: errors.length,
      });
    }

    logger.debug(`Found ${allResearches.length} researches for user ${userUid} (before filtering)`);

    // Sort by created_at descending (newest first)
    // Invalid dates are treated as oldest (timestamp 0) and will appear last
    allResearches.sort((a, b) => {
      const timestampB = getSortableTimestamp(b.created_at);
      const timestampA = getSortableTimestamp(a.created_at);
      return timestampB - timestampA;
    });

    // Apply limit
    const researches = allResearches.slice(0, limit);

    logger.debug(`Returning ${researches.length} researches for user ${userUid}`, {
      limit,
      totalFound: allResearches.length,
    });

    return researches;
  } catch (error) {
    logger.error('Error getting researches by user ID from local storage', {
      error,
      userUid,
      limit,
      dataDir: DATA_DIR,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve researches (local storage): ${errorMessage}`);
  }
}

/**
 * Check if user owns the research (local file storage)
 */
export async function userOwnsResearch(
  researchId: string,
  userId: string | null
): Promise<boolean> {
  try {
    const research = await getResearchById(researchId);
    if (!research) {
      return false;
    }
    // Check both user_uid (primary field) and user_id (backward compatibility)
    return research.user_uid === userId || research.user_id === userId;
  } catch (error) {
    logger.error('Error checking research ownership in local storage', error);
    return false;
  }
}

/**
 * Delete a research document by ID (local file storage)
 */
export async function deleteResearch(id: string): Promise<boolean> {
  const filePath = path.join(DATA_DIR, `${id}.json`);

  try {
    await fs.unlink(filePath);
    logger.info('Research deleted from local storage', { id, filePath });
    return true;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.debug('Research file not found for deletion', { id, filePath });
      return false; // File doesn't exist
    }
    logger.error('Error deleting research from local storage', {
      error,
      id,
      filePath,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete research (local storage): ${errorMessage}`);
  }
}
