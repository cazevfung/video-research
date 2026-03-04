import logger from '../utils/logger';
import { useLocalStorage, getSystemConfig } from '../config';
import env from '../config/env';
import { SourceVideo } from './Summary';
import { USER_UID_FIELD, USER_ID_FIELD, getUserIdentifierField } from '../config/field-names';
import * as localStorage from '../storage/local-research.storage';
import { CitationMetadata, CitationUsageMap } from '../types/citation.types';

/**
 * Selected video with classification and rationale
 */
export interface SelectedVideo {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration_seconds: number;
  url: string;
  upload_date?: string; // Upload date from video metadata
  classification: 'Direct' | 'Foundational' | 'Contrarian';
  why_selected: string;
  fills_gap: string;
}

/**
 * Research processing statistics
 */
export interface ResearchProcessingStats {
  total_queries_generated: number;
  total_videos_searched: number;
  total_videos_selected: number;
  total_transcripts_fetched: number;
  total_tokens_used?: number;
  processing_time_seconds?: number;
  failed_transcripts_count?: number;
}

/**
 * Research data structure for enhanced workflow
 */
export interface ResearchData {
  // Core fields
  research_query?: string;
  language?: string;
  
  // Stage 1: Questions
  generated_questions?: string[];
  question_approval_status?: 'pending' | 'approved' | 'regenerating';
  question_feedback_count?: 0 | 1;
  question_user_feedback?: string;
  previous_questions?: string[];
  
  // Stage 2: Search Terms
  generated_search_terms?: string[];
  search_term_approval_status?: 'pending' | 'approved' | 'regenerating';
  search_term_feedback_count?: 0 | 1;
  search_term_user_feedback?: string;
  previous_search_terms?: string[];
  
  // Stage 3: Video Search (no approval)
  raw_video_results?: any[]; // VideoSearchResult[]
  video_count?: number;
  
  // Stage 4: Video Selection
  video_approval_status?: 'pending' | 'approved' | 'regenerating';
  video_feedback_count?: 0 | 1;
  video_user_feedback?: string;
  previous_selected_videos?: SelectedVideo[];
  
  // Stage 5: Style Guide
  style_guide?: string; // AI-generated style guide for adaptive writing style
  
  // Citation system (Phase 1)
  citations?: CitationMetadata; // Citation metadata indexed by citation number
  citationUsage?: CitationUsageMap; // Tracks which citations appear in which sections
  
  // Legacy fields (for backward compatibility)
  generated_queries?: string[];
  video_search_results?: any[]; // VideoSearchResult[] from youtube-search.service
}

/**
 * Research interface matching Firestore document structure
 */
export interface Research {
  id?: string; // Firestore document ID or local storage ID
  user_id: string | null; // Deprecated: kept for backward compatibility during migration
  user_uid: string | null; // Firebase Auth UID (stable identifier) - preferred
  job_id: string; // For tracking
  research_query: string;
  language: string;
  
  // Enhanced workflow data (new structure)
  research_data?: ResearchData;
  
  // Legacy fields (for backward compatibility)
  generated_queries?: string[];
  
  // Video selection phase
  video_search_results?: any[]; // VideoSearchResult[] from youtube-search.service
  selected_videos?: SelectedVideo[];
  
  // Summary phase
  source_transcripts?: SourceVideo[];
  style_guide?: string; // AI-generated style guide for adaptive writing style
  final_summary_text?: string;
  
  // Citation system (Phase 1)
  citations?: CitationMetadata; // Citation metadata indexed by citation number
  citationUsage?: CitationUsageMap; // Tracks which citations appear in which sections
  
  // Metadata
  processing_stats?: ResearchProcessingStats;
  created_at: Date | string; // Support both Date and ISO string (for local storage compatibility)
  completed_at?: Date | string; // Optional for updates
}

/**
 * Research creation data (without auto-generated fields)
 */
export interface ResearchCreateData {
  user_id?: string | null; // Deprecated: kept for backward compatibility
  user_uid?: string | null; // Firebase Auth UID (stable identifier) - preferred
  job_id: string;
  research_query: string;
  language: string;
  generated_queries?: string[];
  video_search_results?: any[]; // VideoSearchResult[]
  selected_videos?: SelectedVideo[];
  source_transcripts?: SourceVideo[];
  style_guide?: string; // AI-generated style guide for adaptive writing style
  final_summary_text: string;
  citations?: CitationMetadata; // Citation metadata indexed by citation number
  citationUsage?: CitationUsageMap; // Tracks which citations appear in which sections
  processing_stats: ResearchProcessingStats;
}

/**
 * Get question approval status from research
 */
export function getQuestionApprovalStatus(research: Research): 'pending' | 'approved' | 'regenerating' | undefined {
  return research.research_data?.question_approval_status;
}

/**
 * Check if user can provide feedback for a stage
 */
export function canProvideFeedback(research: Research, stage: 'questions' | 'search_terms' | 'videos'): boolean {
  const feedbackCount = research.research_data?.[`${stage}_feedback_count` as keyof ResearchData] as number | undefined;
  return (feedbackCount ?? 0) < 1;
}

const RESEARCHES_COLLECTION = 'researches';

// Check if we should use local storage (for testing) or Firestore (production)
const USE_LOCAL_STORAGE = useLocalStorage();

if (USE_LOCAL_STORAGE) {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📁 LOCAL STORAGE MODE ENABLED - Research documents will be saved to local directory');
  logger.info('ℹ️  To use Firestore, set NODE_ENV=production or USE_LOCAL_STORAGE=false');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Create a new research document
 */
export async function createResearch(
  data: ResearchCreateData
): Promise<Research> {
  // Use local storage for testing if configured
  if (USE_LOCAL_STORAGE) {
    return localStorage.createResearch(data);
  }

  // Use Firestore
  const db = (await import('../config/database')).default;
  const { Timestamp } = await import('firebase-admin/firestore');

  try {
    // Prefer user_uid (Firebase Auth UID), fallback to user_id for backward compatibility
    const userUid = data.user_uid || data.user_id || null;
    const researchData = {
      [USER_UID_FIELD]: userUid, // Store Firebase Auth UID (stable identifier) - PRIMARY FIELD
      // Set user_id to same value as user_uid for backward compatibility during migration
      [USER_ID_FIELD]: userUid, // Keep for backward compatibility - set to same value as user_uid
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
      created_at: Timestamp.now(),
    };

    const docRef = await db.collection(RESEARCHES_COLLECTION).add(researchData);
    const doc = await docRef.get();

    logger.info(`Created new research: ${data.research_query}`, {
      researchId: docRef.id,
      jobId: data.job_id,
      userUid: userUid,
    });

    return {
      id: docRef.id,
      ...doc.data(),
    } as Research;
  } catch (error) {
    logger.error('Error creating research', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create research: ${errorMessage}`);
  }
}

/**
 * Get research by ID
 */
export async function getResearchById(id: string): Promise<Research | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getResearchById(id);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    const doc = await db.collection(RESEARCHES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Research;
  } catch (error) {
    logger.error('Error getting research by ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve research: ${errorMessage}`);
  }
}

/**
 * Get research by job ID
 */
export async function getResearchByJobId(jobId: string): Promise<Research | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getResearchByJobId(jobId);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    const snapshot = await db
      .collection(RESEARCHES_COLLECTION)
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
    } as Research;
  } catch (error) {
    logger.error('Error getting research by job ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve research by job ID: ${errorMessage}`);
  }
}

/**
 * Phase 4: Check if user owns a research document
 */
export async function userOwnsResearch(
  researchId: string,
  userId: string | null
): Promise<boolean> {
  if (USE_LOCAL_STORAGE) {
    const effectiveUserId = userId || env.DEV_USER_ID;
    return localStorage.userOwnsResearch(researchId, effectiveUserId);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    const doc = await db.collection(RESEARCHES_COLLECTION).doc(researchId).get();

    if (!doc.exists) {
      return false;
    }

    const research = doc.data() as Research;
    const effectiveUserId = userId || env.DEV_USER_ID;
    const primaryField = getUserIdentifierField() as 'user_uid' | 'user_id'; // Returns 'user_uid'
    
    // Check primary field (user_uid) and fallback (user_id) for backward compatibility
    return research[primaryField] === effectiveUserId || research[USER_ID_FIELD] === effectiveUserId;
  } catch (error) {
    logger.error('Error checking research ownership', error);
    return false;
  }
}

/**
 * Delete a research document by ID
 * Removes from Firestore or local in-memory cache
 */
export async function deleteResearch(id: string): Promise<boolean> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.deleteResearch(id);
  }

  const db = (await import('../config/database')).default;
  try {
    const doc = await db.collection(RESEARCHES_COLLECTION).doc(id).get();
    if (!doc.exists) {
      return false;
    }
    await db.collection(RESEARCHES_COLLECTION).doc(id).delete();
    logger.info('Deleted research', { researchId: id });
    return true;
  } catch (error) {
    logger.error('Error deleting research', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete research: ${errorMessage}`);
  }
}

/**
 * Get user's research history
 */
export async function getUserResearches(
  userUid: string,
  limit: number = 20
): Promise<Research[]> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getUserResearches(userUid, limit);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    const primaryField = getUserIdentifierField(); // Returns 'user_uid'
    const snapshot = await db
      .collection(RESEARCHES_COLLECTION)
      .where(primaryField, '==', userUid)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as Research[];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('index') || errorMessage.includes('Index')) {
      logger.error('Missing Firestore composite index for user_uid query (researches)', {
        userUid,
        error: errorMessage,
        field: USER_UID_FIELD,
        hint: `Create composite index in Firestore Console:
          Collection: ${RESEARCHES_COLLECTION}
          Fields: ${USER_UID_FIELD} (Ascending), created_at (Descending)
          Query scope: Collection`,
      });
      throw new Error(
        `Missing Firestore index for ${USER_UID_FIELD} field (researches). ` +
          `Please create a composite index: Collection: ${RESEARCHES_COLLECTION}, ` +
          `Fields: ${USER_UID_FIELD} (Ascending), created_at (Descending). ` +
          `Check Firestore Console → Indexes tab for the index creation link.`
      );
    }
    logger.error('Error getting user researches', error);
    throw new Error(`Failed to retrieve user researches: ${errorMessage}`);
  }
}
