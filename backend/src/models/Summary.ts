import logger from '../utils/logger';
import { PresetStyle } from '../prompts';
import { useLocalStorage, getSummariesDirectory, getSystemConfig } from '../config';
import env from '../config/env';
import * as localStorage from '../storage/local-summary.storage';
import { USER_UID_FIELD, USER_ID_FIELD, getUserIdentifierField } from '../config/field-names';

/**
 * Source video metadata structure
 * Include upload_date when available (from transcript/Supadata) so citations show real publish dates.
 */
export interface SourceVideo {
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration_seconds: number;
  word_count: number;
  was_pre_condensed: boolean;
  transcript_length?: number; // Original transcript word count before condensing
  video_id?: string;
  /** Video publish/upload date when available. Preserve from transcript pipeline; use constants.ensureVideoUploadDate at display boundary. */
  upload_date?: string;
}

/**
 * Processing statistics
 */
export interface ProcessingStats {
  total_videos: number;
  total_tokens_used?: number;
  processing_time_seconds?: number;
  failed_videos_count?: number; // Number of videos that failed to fetch transcript
}

/**
 * Summary interface matching Firestore document structure
 */
export interface Summary {
  id?: string; // Firestore document ID or local storage ID
  user_id: string | null; // Deprecated: kept for backward compatibility during migration
  user_uid: string | null; // Firebase Auth UID (stable identifier) - preferred
  job_id: string; // For tracking
  batch_title: string;
  source_videos: SourceVideo[];
  user_prompt_focus?: string; // Optional custom prompt
  preset_style: PresetStyle;
  final_summary_text: string;
  language: string;
  processing_stats?: ProcessingStats;
  created_at: Date | string; // Support both Date and ISO string (for local storage compatibility)
  updated_at?: Date | string; // Optional for updates
}

/**
 * Summary creation data (without auto-generated fields)
 */
export interface SummaryCreateData {
  user_id?: string | null; // Deprecated: kept for backward compatibility
  user_uid?: string | null; // Firebase Auth UID (stable identifier) - preferred
  job_id: string;
  batch_title: string;
  source_videos: SourceVideo[];
  user_prompt_focus?: string;
  preset_style: PresetStyle;
  final_summary_text: string;
  language: string;
  processing_stats?: ProcessingStats;
}

/**
 * Summary update data (partial)
 */
export interface SummaryUpdateData {
  batch_title?: string;
  final_summary_text?: string;
  processing_stats?: ProcessingStats;
}

/**
 * Summary list item (for history endpoint - lighter weight)
 */
export interface SummaryListItem {
  _id: string;
  batch_title: string;
  created_at: Date | string; // Support string for local storage
  source_videos: Array<{
    thumbnail: string;
    title: string;
  }>;
  video_count: number;
}

const SUMMARIES_COLLECTION = 'summaries';

// Check if we should use local storage (for testing) or Firestore (production)
// Auto-detects based on NODE_ENV: production → Firestore, development → local storage
const USE_LOCAL_STORAGE = useLocalStorage();

if (USE_LOCAL_STORAGE) {
  const summariesDir = getSummariesDirectory();
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📁 LOCAL STORAGE MODE ENABLED - Summaries will be saved to local directory');
  logger.info(`📂 Data location: ${summariesDir}`);
  logger.info('ℹ️  To use Firestore, set NODE_ENV=production or USE_LOCAL_STORAGE=false');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Create a new summary
 */
export async function createSummary(
  data: SummaryCreateData
): Promise<Summary> {
  // Use local storage for testing if configured
  if (USE_LOCAL_STORAGE) {
    logger.info('[Local Storage] Using local file storage for summaries');
    // Prefer user_uid (Firebase Auth UID), fallback to user_id for backward compatibility
    const userUid = data.user_uid || data.user_id || null;
    return localStorage.createSummary({
      [USER_UID_FIELD]: userUid, // Store Firebase Auth UID (stable identifier) - PRIMARY FIELD
      // Set user_id to same value as user_uid for backward compatibility during migration
      [USER_ID_FIELD]: userUid, // Keep for backward compatibility - set to same value as user_uid
      job_id: data.job_id,
      batch_title: data.batch_title,
      source_videos: data.source_videos,
      user_prompt_focus: data.user_prompt_focus || undefined,
      preset_style: data.preset_style,
      final_summary_text: data.final_summary_text,
      language: data.language,
      processing_stats: data.processing_stats || undefined,
    });
  }

  // Use Firestore
  const db = (await import('../config/database')).default;
  const { Timestamp } = await import('firebase-admin/firestore');

  try {
    // Prefer user_uid (Firebase Auth UID), fallback to user_id for backward compatibility
    const userUid = data.user_uid || data.user_id || null;
    const summaryData = {
      [USER_UID_FIELD]: userUid, // Store Firebase Auth UID (stable identifier) - PRIMARY FIELD
      // Set user_id to same value as user_uid for backward compatibility during migration
      // This ensures queries can find records whether they use user_uid or user_id
      [USER_ID_FIELD]: userUid, // Keep for backward compatibility - set to same value as user_uid
      job_id: data.job_id,
      batch_title: data.batch_title,
      source_videos: data.source_videos,
      user_prompt_focus: data.user_prompt_focus || undefined,
      preset_style: data.preset_style,
      final_summary_text: data.final_summary_text,
      language: data.language,
      processing_stats: data.processing_stats || undefined,
      created_at: Timestamp.now(),
    };

    const docRef = await db.collection(SUMMARIES_COLLECTION).add(summaryData);
    const doc = await docRef.get();

    logger.info(`Created new summary: ${data.batch_title}`, {
      summaryId: docRef.id,
      jobId: data.job_id,
      userUid: userUid,
    });

    return {
      id: docRef.id,
      ...doc.data(),
    } as Summary;
  } catch (error) {
    logger.error('Error creating summary', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create summary: ${errorMessage}`);
  }
}

/**
 * Get summary by document ID
 */
export async function getSummaryById(id: string): Promise<Summary | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getSummaryById(id);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    const doc = await db.collection(SUMMARIES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Summary;
  } catch (error) {
    logger.error('Error getting summary by ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve summary: ${errorMessage}`);
  }
}

/**
 * Get summary by job ID
 */
export async function getSummaryByJobId(jobId: string): Promise<Summary | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getSummaryByJobId(jobId);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    const snapshot = await db
      .collection(SUMMARIES_COLLECTION)
      .where('job_id', '==', jobId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Summary;
  } catch (error) {
    logger.error('Error getting summary by job ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve summary by job ID: ${errorMessage}`);
  }
}

/**
 * Get summaries by user ID (for history)
 * @param userId User ID (can be null if auth disabled)
 * @param page Page number (1-indexed)
 * @param limit Number of items per page
 * @returns Object with summaries array and pagination info
 */
export async function getSummariesByUserId(
  userId: string | null,
  page: number = 1,
  limit?: number
): Promise<{
  summaries: Summary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const systemConfig = getSystemConfig();
  const pageNum = Math.max(1, page);
  const defaultLimit = limit ?? systemConfig.history_pagination_default_limit;
  const limitNum = Math.min(systemConfig.history_pagination_max_limit, Math.max(1, defaultLimit));

  if (USE_LOCAL_STORAGE) {
    const result = await localStorage.getSummariesByUserId(
      userId || env.DEV_USER_ID,
      pageNum,
      limitNum
    );
    return {
      summaries: result.summaries,
      pagination: {
        page: result.pagination.currentPage,
        limit: result.pagination.itemsPerPage,
        total: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
      },
    };
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    // Validate pagination params
    const offset = (pageNum - 1) * limitNum;

    // Build query - must apply where clause before orderBy in Firestore
    let query: FirebaseFirestore.Query = db.collection(SUMMARIES_COLLECTION);
    let total = 0;
    let summaries: Summary[] = [];

    // Filter by user_uid if provided (when auth is enabled)
    // userId should now be Firebase Auth UID (stable identifier)
    if (userId !== null) {
      // Always use user_uid (primary field) - this is the correct field to query
      // Both user_uid and user_id are set to the same value when creating summaries
      // for backward compatibility, but we always query by user_uid
      try {
        const primaryField = getUserIdentifierField(); // Returns 'user_uid'
        let userUidQuery = db.collection(SUMMARIES_COLLECTION)
          .where(primaryField, '==', userId)
          .orderBy('created_at', 'desc');
        
        const totalSnapshot = await userUidQuery.get();
        total = totalSnapshot.size;
        
        const snapshot = await userUidQuery.limit(limitNum).offset(offset).get();
        summaries = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
          id: doc.id,
          ...doc.data(),
        })) as Summary[];
      } catch (userUidError) {
        // If user_uid query fails (e.g., missing index), log error with clear instructions
        const errorMessage = userUidError instanceof Error ? userUidError.message : String(userUidError);
        if (errorMessage.includes('index') || errorMessage.includes('Index')) {
          logger.error('Missing Firestore composite index for user_uid query', {
            userId,
            error: errorMessage,
            field: USER_UID_FIELD,
            hint: `Create composite index in Firestore Console:
              Collection: ${SUMMARIES_COLLECTION}
              Fields: ${USER_UID_FIELD} (Ascending), created_at (Descending)
              Query scope: Collection`,
          });
          
          // Re-throw with helpful message - don't fallback to user_id as it may have null values
          throw new Error(
            `Missing Firestore index for ${USER_UID_FIELD} field. ` +
            `Please create a composite index: Collection: ${SUMMARIES_COLLECTION}, ` +
            `Fields: ${USER_UID_FIELD} (Ascending), created_at (Descending). ` +
            `Check Firestore Console → Indexes tab for the index creation link.`
          );
        } else {
          // Re-throw non-index errors
          throw userUidError;
        }
      }
    } else {
      // No user filter - get all summaries (auth disabled)
      query = query.orderBy('created_at', 'desc');
      const totalSnapshot = await query.get();
      total = totalSnapshot.size;
      const snapshot = await query.limit(limitNum).offset(offset).get();
      summaries = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      })) as Summary[];
    }

    const totalPages = Math.ceil(total / limitNum);

    logger.debug(`Retrieved summaries for user: ${userId}`, {
      userId,
      page: pageNum,
      limit: limitNum,
      total,
      returned: summaries.length,
    });

    return {
      summaries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  } catch (error) {
    logger.error('Error getting summaries by user ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve summaries: ${errorMessage}`);
  }
}

/**
 * Update summary data
 */
export async function updateSummary(
  summaryId: string,
  data: SummaryUpdateData
): Promise<Summary> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.updateSummary(summaryId, data);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    await db.collection(SUMMARIES_COLLECTION).doc(summaryId).update(data as any);

    const updatedDoc = await db
      .collection(SUMMARIES_COLLECTION)
      .doc(summaryId)
      .get();

    if (!updatedDoc.exists) {
      throw new Error('Summary not found after update');
    }

    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Summary;
  } catch (error) {
    logger.error('Error updating summary', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update summary: ${errorMessage}`);
  }
}

/**
 * Update summary title
 * @param summaryId Summary document ID
 * @param title New title to set
 */
export async function updateSummaryTitle(
  summaryId: string,
  title: string
): Promise<void> {
  if (USE_LOCAL_STORAGE) {
    await localStorage.updateSummary(summaryId, { batch_title: title });
    logger.debug(`Updated summary title: ${summaryId}`, { title });
    return;
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    await db.collection(SUMMARIES_COLLECTION).doc(summaryId).update({
      batch_title: title,
    });
    logger.debug(`Updated summary title: ${summaryId}`, { title });
  } catch (error) {
    logger.error(`Failed to update summary title: ${summaryId}`, { error, title });
    throw error;
  }
}

/**
 * Check if user owns the summary (for authorization)
 * @param summaryId Summary document ID
 * @param userId User ID to check (can be null if auth disabled)
 * @returns True if user owns the summary or auth is disabled
 */
export async function userOwnsSummary(
  summaryId: string,
  userId: string | null
): Promise<boolean> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.checkSummaryOwnership(summaryId, userId || env.DEV_USER_ID);
  }

  try {
    // If auth is disabled (userId is null), allow access
    if (userId === null) {
      return true;
    }

    const summary = await getSummaryById(summaryId);
    if (!summary) {
      return false;
    }

    // Check both user_uid (preferred) and user_id (backward compatibility)
    return summary.user_uid === userId || summary.user_id === userId;
  } catch (error) {
    logger.error('Error checking summary ownership', error);
    return false;
  }
}

