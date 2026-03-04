/**
 * Research controller
 * Handles research creation requests
 */

import { Request, Response } from 'express';
import { ResearchRequest, ResearchProgress } from '../services/research.service';
import { getResearchConfig, getSummaryConfig, getSystemConfig } from '../config';
import { ValidationError } from '../utils/errors';
import {
  createJob,
  getJobStatus,
  userOwnsJob,
  addSSEConnection,
  removeSSEConnection,
  cleanupSSEConnections,
  updateJobStatus,
  broadcastJobProgress,
} from '../services/job.service';
import { JobInfo } from '../types/summary.types';
import {
  reserveTaskSlot,
  registerActiveTask,
  releaseTaskSlot,
} from '../services/task-concurrency.service';
import { processResearch, continueResearchAfterApproval, regenerateSearchTerms, filterVideos } from '../services/research.service';
import { regenerateResearchQuestions } from '../services/research-question.service';
import { validateStateTransition, ResearchStatus } from '../utils/research-state-validator';
import { VideoSearchResult } from '../services/youtube-search.service';
import { AuthenticatedUser } from '../types/auth.types';
import logger from '../utils/logger';
import { generateCitationMap } from '../services/citation-mapper.service';
import {
  setupSSEHeaders,
  sendSSEMessage,
  closeSSEConnection,
  handleClientDisconnect,
  SSEConnection,
} from '../utils/sse';
import { getResearchByJobId, getResearchById as getResearchByIdFromModel, userOwnsResearch, deleteResearch as deleteResearchFromModel, Research } from '../models/Research';
import { AuthenticatedRequest } from '../middleware/optional-auth.middleware';
import { getUserByUid } from '../models/User';
import { languageCodeToName } from '../utils/language-mapping';

/**
 * Mutex for regeneration operations to prevent race conditions
 * Key format: `${jobId}:${stage}`
 */
const regenerationLocks = new Map<string, Promise<{ lockedJob: JobInfo; lockedResearchData: any; approvalStatusField: string } | undefined>>();

/**
 * Get supported languages from config
 */
function getSupportedLanguages(): string[] {
  const summaryConfig = getSummaryConfig();
  return summaryConfig.supported_languages;
}

/**
 * Get default language from config
 */
function getDefaultLanguage(): string {
  const summaryConfig = getSummaryConfig();
  return summaryConfig.default_language;
}

/**
 * Validate research request
 */
function validateResearchRequest(body: any): {
  valid: boolean;
  errors: Array<{ field: string; message: string; value?: any }>;
  request?: ResearchRequest;
} {
  logger.debug('validateResearchRequest called', {
    bodyKeys: Object.keys(body || {}),
    researchQuery: body?.research_query,
    language: body?.language,
    researchQueryType: typeof body?.research_query,
    languageType: typeof body?.language,
  });

  const errors: Array<{ field: string; message: string; value?: any }> = [];

  // Validate research_query
  if (!body.research_query || typeof body.research_query !== 'string') {
    errors.push({
      field: 'research_query',
      message: 'research_query is required and must be a string',
    });
  }

  // Validate language
  const supportedLanguages = getSupportedLanguages();
  const defaultLanguage = getDefaultLanguage();
  
  if (!body.language || typeof body.language !== 'string') {
    errors.push({
      field: 'language',
      message: 'language is required and must be a string',
    });
  } else if (!supportedLanguages.includes(body.language)) {
    // Default to configured default language if invalid, but log warning
    logger.warn(`Unsupported language: ${body.language}, defaulting to ${defaultLanguage}`);
    body.language = defaultLanguage;
  }

  if (errors.length > 0) {
    logger.debug('Validation failed with errors', { errors });
    return { valid: false, errors };
  }

  const request: ResearchRequest = {
    research_query: body.research_query.trim(),
    language: body.language || getDefaultLanguage(),
  };

  logger.debug('Validation passed', {
    researchQuery: request.research_query.substring(0, 50),
    language: request.language,
  });

  return { valid: true, errors: [], request };
}

/**
 * Create research job
 * POST /api/research
 */
export async function createResearchJob(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    logger.debug('createResearchJob called', {
      path: req.path,
      method: req.method,
      hasUser: !!req.user,
      hasGuest: !!req.guest,
      bodyKeys: Object.keys(req.body || {}),
      researchQuery: req.body.research_query?.substring(0, 100),
      language: req.body.language,
    });

    // If language not provided, try to use user's language preference
    if (!req.body.language && req.user) {
      logger.debug('Language not provided, checking user preference', {
        userId: req.user.uid || req.user.id,
      });
      try {
        const user = await getUserByUid(req.user.uid || req.user.id || '');
        if (user?.language_preference) {
          // Map language code to backend language name
          const backendLanguageName = languageCodeToName(user.language_preference);
          req.body.language = backendLanguageName;
          logger.debug(`Using user language preference: ${user.language_preference} -> ${backendLanguageName}`, {
            userId: req.user.uid || req.user.id,
          });
        } else {
          logger.debug('No language preference found for user', {
            userId: req.user.uid || req.user.id,
          });
        }
      } catch (error) {
        logger.warn('Failed to fetch user language preference, using default', { error });
        // Continue with default language
      }
    }

    logger.debug('Validating request body', {
      researchQuery: req.body.research_query,
      language: req.body.language,
      bodyKeys: Object.keys(req.body || {}),
    });

    // Validate request body
    const validation = validateResearchRequest(req.body);
    logger.debug('Validation result', {
      valid: validation.valid,
      errors: validation.errors,
    });
    
    if (!validation.valid) {
      logger.warn('Validation failed', {
        errors: validation.errors,
        body: req.body,
      });
      throw new ValidationError('Invalid request data', {
        errors: validation.errors,
      });
    }

    const request = validation.request!;
    const userId = req.user?.uid || req.user?.id || null;
    const userTier = req.user?.tier || 'free';

    logger.debug('Request validated, proceeding with job creation', {
      userId,
      userTier,
      researchQuery: request.research_query,
      language: request.language,
    });

    // Check task limit before creating job
    logger.debug('Checking task slot availability', { userId, userTier });
    const slotReservation = await reserveTaskSlot(userId, userTier);
    logger.debug('Task slot reservation result', {
      success: slotReservation.success,
      reason: slotReservation.reason,
    });
    
    if (!slotReservation.success) {
      logger.warn('Task limit exceeded', {
        userId,
        userTier,
        reason: slotReservation.reason,
      });
      res.status(429).json({
        error: {
          code: 'TASK_LIMIT_EXCEEDED',
          message: slotReservation.reason || 'Task limit exceeded',
        },
      });
      return;
    }

    // Create job
    logger.debug('Creating research job', { userId });
    const jobId = createJob(userId);
    await registerActiveTask(userId, jobId);

    logger.info(`Created research job: ${jobId}`, {
      userId,
      researchQuery: request.research_query,
      language: request.language,
    });

    // Start async processing (don't await)
    processResearch(userId, request, jobId)
      .then(() => {
        // Release slot on completion
        releaseTaskSlot(userId, jobId);
      })
      .catch((error) => {
        // Release slot on error
        releaseTaskSlot(userId, jobId);
        logger.error(`Error processing research for job ${jobId}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
        });
        // Error handling is done in processResearch
      });

    // Return job ID immediately
    res.status(200).json({
      job_id: jobId,
    });
  } catch (error) {
    logger.error('Error creating research job', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      userId: req.user?.uid || req.user?.id || null,
    });
    
    if (error instanceof ValidationError) {
      logger.debug('Returning validation error response', {
        message: error.message,
        details: error.details,
      });
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    logger.debug('Returning internal server error response');
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create research job',
      },
    });
  }
}

/**
 * Build research job status response (used for both SSE and polling)
 */
async function buildResearchJobStatusResponse(
  jobId: string,
  job: any
): Promise<ResearchProgress> {
  const researchConfig = getResearchConfig();
  const progressPercentages = researchConfig.progress_percentages;

  const currentProgress: ResearchProgress = {
    status: job.status as ResearchProgress['status'],
    progress: job.progress,
    message: getStatusMessage(job.status, job) ?? '',
  };

  // Include intermediate data from job object if available
  if (job.research_data) {
    // Include full research_data for approval stages (Phase 3: Enhanced workflow)
    currentProgress.research_data = {
      research_query: job.research_data.research_query,
      language: job.research_data.language,
      generated_questions: job.research_data.generated_questions,
      question_approval_status: job.research_data.question_approval_status,
      question_feedback_count: job.research_data.question_feedback_count,
      question_user_feedback: job.research_data.question_user_feedback,
      previous_questions: job.research_data.previous_questions,
      generated_search_terms: job.research_data.generated_search_terms,
      search_term_approval_status: job.research_data.search_term_approval_status,
      search_term_feedback_count: job.research_data.search_term_feedback_count,
      search_term_user_feedback: job.research_data.search_term_user_feedback,
      previous_search_terms: job.research_data.previous_search_terms,
      video_approval_status: job.research_data.video_approval_status,
      video_feedback_count: job.research_data.video_feedback_count,
      video_user_feedback: job.research_data.video_user_feedback,
      previous_selected_videos: job.research_data.previous_selected_videos,
    };
    
    // Legacy fields for backward compatibility
    if (job.research_data.generated_queries) {
      currentProgress.generated_queries = job.research_data.generated_queries;
    }
    if (job.research_data.raw_video_results) {
      currentProgress.raw_video_results = job.research_data.raw_video_results;
    }
    if (job.research_data.selected_videos) {
      currentProgress.selected_videos = job.research_data.selected_videos;
    }
    if (job.research_data.video_count !== undefined) {
      currentProgress.video_count = job.research_data.video_count;
    }
  }

  // If job is completed, include research data from database
  if (job.status === 'completed') {
    try {
      const research = await getResearchByJobId(jobId);
      if (research) {
        // Back-compat: older research docs may not have citations persisted.
        const citations =
          research.citations ??
          generateCitationMap(
            (research.selected_videos ?? []) as any,
            (research.video_search_results ?? []) as any
          );

        currentProgress.data = {
          _id: research.id || jobId,
          research_query: research.research_query,
          generated_queries: research.generated_queries || [],
          selected_videos: research.selected_videos || [],
          final_summary_text: research.final_summary_text || '',
          processing_stats: research.processing_stats || {
            total_queries_generated: 0,
            total_videos_searched: 0,
            total_videos_selected: 0,
            total_transcripts_fetched: 0,
          },
          citations, // Include citation metadata
          citationUsage: research.citationUsage, // Include citation usage tracking
          created_at:
            typeof research.created_at === 'string'
              ? new Date(research.created_at)
              : research.created_at,
        };
        
        // Also include raw video results if available
        if (research.video_search_results) {
          currentProgress.raw_video_results = research.video_search_results;
        }
      }
    } catch (error) {
      logger.error('Error fetching research data for job status', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return currentProgress;
}

/**
 * Get status message for research job status
 * Updated to support enhanced workflow with approval stages
 * 
 * NOTE: Returns null to let frontend handle localization based on status code.
 * Frontend components (StatusMessage, ResearchProgressSidebar) translate based on status.
 */
function getStatusMessage(status: string, job?: any): string | null {
  // Return null to let frontend handle translation based on status
  // Frontend components translate based on status codes for proper localization
  return null;

  // Legacy fallback removed - frontend handles all translation based on status
  // Dynamic messages with counts are handled by frontend pattern matching
  return null;
}

/**
 * Get research job status (SSE or polling)
 * GET /api/research/:job_id/status
 */
export async function getResearchJobStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const jobId = req.params.job_id;
    const userId = req.user?.uid || req.user?.id || null;

    if (!jobId) {
      res.status(400).json({
        error: {
          code: 'INVALID_JOB_ID',
          message: 'Job ID is required',
        },
      });
      return;
    }

    // Check if user owns the job
    if (!userOwnsJob(jobId, userId)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this research job',
        },
      });
      return;
    }

    const job = getJobStatus(jobId);
    if (!job) {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Research job not found',
        },
      });
      return;
    }

    // Check if client wants SSE
    const acceptHeader = req.headers.accept || '';
    const wantsSSE = acceptHeader.includes('text/event-stream');

    if (wantsSSE) {
      // Set up SSE connection
      setupSSEHeaders(res);

      const connection: SSEConnection = {
        res,
        jobId,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
      };

      addSSEConnection(jobId, connection);

      // Send initial status
      const initialProgress = await buildResearchJobStatusResponse(jobId, job);
      sendSSEMessage(res, initialProgress);

      // Handle client disconnect
      handleClientDisconnect(res, () => {
        removeSSEConnection(jobId, connection);
        cleanupSSEConnections(jobId);
      });

      // Progress-aware connection timeout: reset whenever we send (progress or heartbeat)
      const systemConfig = getSystemConfig();
      const connectionTimeoutMs = systemConfig.job_timeout_minutes * 60 * 1000;
      let timeoutId: NodeJS.Timeout = setTimeout(() => {
        logger.info(`SSE connection timeout for research job ${jobId}`, { userId });
        removeSSEConnection(jobId, connection);
        cleanupSSEConnections(jobId);
        closeSSEConnection(res);
      }, connectionTimeoutMs);

      connection.resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          logger.info(`SSE connection timeout for research job ${jobId}`, { userId });
          removeSSEConnection(jobId, connection);
          cleanupSSEConnections(jobId);
          closeSSEConnection(res);
        }, connectionTimeoutMs);
      };

      // Clear timeout on disconnect
      res.on('close', () => {
        clearTimeout(timeoutId);
      });

      // Keep connection alive - job service will send heartbeats and call resetTimeout on every send
    } else {
      // Polling mode - return JSON response
      const progress = await buildResearchJobStatusResponse(jobId, job);
      res.status(200).json(progress);
    }
  } catch (error) {
    logger.error('Error getting research job status', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get research job status',
      },
    });
  }
}

/**
 * Phase 4: Get full details of a specific research document by ID
 * GET /api/research/:id
 */
export async function getResearchById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const researchId = req.params.id;
    // Use uid (Firebase Auth UID) if available, fallback to id for backward compatibility
    const userId = req.user?.uid || req.user?.id || null;

    if (!researchId) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Research ID is required',
        },
      });
      return;
    }

    logger.debug('Fetching research by ID', { researchId, userId });

    // Get research from database
    const research = await getResearchByIdFromModel(researchId);

    if (!research) {
      res.status(404).json({
        error: {
          code: 'RESEARCH_NOT_FOUND',
          message: 'Research not found',
        },
      });
      return;
    }

    // Check ownership (skip if auth disabled)
    const ownsResearch = await userOwnsResearch(researchId, userId);
    if (!ownsResearch) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this research',
        },
      });
      return;
    }

    // Format response (full research document)
    const citations =
      research.citations ??
      generateCitationMap(
        (research.selected_videos ?? []) as any,
        (research.video_search_results ?? []) as any
      );

    const response = {
      _id: research.id!,
      user_id: research.user_id,
      user_uid: research.user_uid,
      job_id: research.job_id,
      research_query: research.research_query,
      language: research.language,
      generated_queries: research.generated_queries,
      video_search_results: research.video_search_results,
      selected_videos: research.selected_videos,
      source_transcripts: research.source_transcripts,
      final_summary_text: research.final_summary_text,
      processing_stats: research.processing_stats,
      citations, // Include citation metadata
      citationUsage: research.citationUsage, // Include citation usage tracking
      created_at: research.created_at,
      completed_at: research.completed_at,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching research by ID', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve research',
      },
    });
  }
}

/**
 * Delete a research document by ID
 * DELETE /api/research/:id
 * Validates ownership before deletion
 */
export async function deleteResearchById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const researchId = req.params.id;
    const userId = req.user?.uid || req.user?.id || null;

    if (!researchId) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Research ID is required',
        },
      });
      return;
    }

    const ownsResearch = await userOwnsResearch(researchId, userId);
    if (!ownsResearch) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this research',
        },
      });
      return;
    }

    const deleted = await deleteResearchFromModel(researchId);

    if (!deleted) {
      res.status(404).json({
        error: {
          code: 'RESEARCH_NOT_FOUND',
          message: 'Research not found',
        },
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Error deleting research by ID', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete research',
      },
    });
  }
}

/**
 * Approve a research stage
 * POST /api/research/:job_id/approve/:stage
 * Stages: questions, search_terms, videos
 */
export async function approveResearchStage(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const startTime = Date.now();
  const jobId = req.params.job_id;
  const stage = req.params.stage as 'questions' | 'search_terms' | 'videos';
  const userId = req.user?.uid || req.user?.id || null;

  console.error(`[APPROVE-STAGE] ===== START APPROVAL REQUEST =====`);
  console.error(`[APPROVE-STAGE] JobId: ${jobId}, Stage: ${stage}, UserId: ${userId || 'null'}`);

  try {
    if (!jobId) {
      console.error(`[APPROVE-STAGE] ERROR: No jobId provided`);
      res.status(400).json({
        error: {
          code: 'INVALID_JOB_ID',
          message: 'Job ID is required',
        },
      });
      return;
    }

    if (!['questions', 'search_terms', 'videos'].includes(stage)) {
      console.error(`[APPROVE-STAGE] ERROR: Invalid stage: ${stage}`);
      res.status(400).json({
        error: {
          code: 'INVALID_STAGE',
          message: 'Stage must be one of: questions, search_terms, videos',
        },
      });
      return;
    }

    // Check ownership
    if (!userOwnsJob(jobId, userId)) {
      console.error(`[APPROVE-STAGE] ERROR: User does not own job`);
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this research job',
        },
      });
      return;
    }

    const job = getJobStatus(jobId);
    if (!job) {
      console.error(`[APPROVE-STAGE] ERROR: Job not found: ${jobId}`);
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Research job not found',
        },
      });
      return;
    }

    console.error(`[APPROVE-STAGE] Job found. Status: ${job.status}, Progress: ${job.progress}`);

    const researchConfig = getResearchConfig();
    const researchData = job.research_data || {};

    console.error(`[APPROVE-STAGE] Current research_data keys:`, Object.keys(researchData));
    console.error(`[APPROVE-STAGE] Current research_data:`, JSON.stringify(researchData, null, 2));

    // Validate current state
    // CRITICAL FIX: Map stage names to correct field names (stage names are plural, field names are singular)
    const stageToFieldMap: Record<string, string> = {
      'questions': 'question_approval_status',
      'search_terms': 'search_term_approval_status',
      'videos': 'video_approval_status',
    };
    const approvalStatusField = stageToFieldMap[stage] || `${stage}_approval_status`;
    const currentStatus = researchData[approvalStatusField as keyof typeof researchData] as string | undefined;
    
    console.error(`[APPROVE-STAGE] Approval status field: ${approvalStatusField}`);
    console.error(`[APPROVE-STAGE] Current status value: ${currentStatus || 'undefined'}`);

    // Determine expected awaiting status based on stage
    const expectedAwaitingStatus = `awaiting_${stage}_approval`;
    
    // Check if we have questions/search_terms/videos generated (indicates we're in approval stage)
    const hasGeneratedData = 
      (stage === 'questions' && researchData.generated_questions && researchData.generated_questions.length > 0) ||
      (stage === 'search_terms' && researchData.generated_search_terms && researchData.generated_search_terms.length > 0) ||
      (stage === 'videos' && researchData.selected_videos && researchData.selected_videos.length > 0);
    
    // Allow approval if:
    // 1. Status is 'pending', OR
    // 2. Status is undefined but we have generated data (indicates we're awaiting approval)
    const isPending = currentStatus === 'pending' || 
                     (currentStatus === undefined && hasGeneratedData);

    if (!isPending) {
      // Already approved - return success
      if (currentStatus === 'approved') {
        res.status(200).json({
          success: true,
          message: 'Stage already approved',
          already_approved: true,
        });
        return;
      }
      
      // Regenerating - don't allow approval yet
      if (currentStatus === 'regenerating') {
        res.status(400).json({
          error: {
            code: 'REGENERATING',
            message: 'Stage is currently being regenerated. Please wait.',
          },
        });
        return;
      }
      
      res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: `Stage is not in pending state (current: ${currentStatus || 'undefined'}, job status: ${job.status}, hasGeneratedData: ${hasGeneratedData})`,
        },
      });
      return;
    }

    // Update approval status - ensure we merge with existing research_data
    console.error(`[APPROVE-STAGE] ===== BEFORE UPDATE =====`);
    console.error(`[APPROVE-STAGE] Current research_data before update:`, JSON.stringify(job.research_data, null, 2));
    
    const currentResearchData = job.research_data || {};
    const updatePayload = {
      research_data: {
        ...currentResearchData, // Preserve all existing research_data
        [approvalStatusField]: 'approved', // Update the specific approval status
      },
    };
    
    console.error(`[APPROVE-STAGE] Update payload:`, JSON.stringify(updatePayload, null, 2));
    console.error(`[APPROVE-STAGE] Calling updateJobStatus with field: ${approvalStatusField}`);
    
    updateJobStatus(jobId, job.status, updatePayload);

    console.error(`[APPROVE-STAGE] ===== AFTER UPDATE =====`);
    
    // Verify the update was applied by re-fetching the job
    const updatedJob = getJobStatus(jobId);
    if (!updatedJob) {
      console.error(`[APPROVE-STAGE] CRITICAL ERROR: Job not found after update!`);
      logger.error('[Research] Job not found after update', { jobId, stage });
      res.status(500).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found after approval update',
        },
      });
      return;
    }

    const updatedResearchData = updatedJob.research_data || {};
    const updatedStatus = updatedResearchData[approvalStatusField as keyof typeof updatedResearchData] as string | undefined;
    
    console.error(`[APPROVE-STAGE] Updated research_data keys:`, Object.keys(updatedResearchData));
    console.error(`[APPROVE-STAGE] Updated research_data:`, JSON.stringify(updatedResearchData, null, 2));
    console.error(`[APPROVE-STAGE] Expected status: 'approved', Actual status: '${updatedStatus || 'undefined'}'`);
    
    logger.info('[Research] Approval status update verification', {
      jobId,
      stage,
      approvalStatusField,
      expected: 'approved',
      actual: updatedStatus,
      researchDataKeys: Object.keys(updatedResearchData),
      fullResearchData: JSON.stringify(updatedResearchData),
    });
    
    if (updatedStatus !== 'approved') {
      console.error(`[APPROVE-STAGE] ===== UPDATE FAILED =====`);
      console.error(`[APPROVE-STAGE] Approval status update FAILED!`);
      console.error(`[APPROVE-STAGE] Field: ${approvalStatusField}`);
      console.error(`[APPROVE-STAGE] Expected: 'approved'`);
      console.error(`[APPROVE-STAGE] Actual: '${updatedStatus || 'undefined'}'`);
      console.error(`[APPROVE-STAGE] All research_data keys:`, Object.keys(updatedResearchData));
      console.error(`[APPROVE-STAGE] Full research_data:`, JSON.stringify(updatedResearchData, null, 2));
      
      logger.error('[Research] Approval status update failed', {
        jobId,
        stage,
        approvalStatusField,
        expected: 'approved',
        actual: updatedStatus,
        researchDataKeys: Object.keys(updatedResearchData),
        fullResearchData: JSON.stringify(updatedResearchData),
      });
      res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: `Failed to update approval status for ${stage}. Please try again.`,
        },
      });
      return;
    }

    console.error(`[APPROVE-STAGE] ===== UPDATE SUCCESSFUL =====`);
    console.error(`[APPROVE-STAGE] Approval status successfully set to 'approved'`);
    
    logger.info('[Research] Approval status updated successfully', {
      jobId,
      stage,
      approvalStatusField,
      status: updatedStatus,
    });

    // Continue workflow
    console.error(`[APPROVE-STAGE] ===== CALLING continueResearchAfterApproval =====`);
    console.error(`[APPROVE-STAGE] JobId: ${jobId}, Stage: ${stage}`);
    
    // CRITICAL FIX: Re-verify approval status one more time right before calling continueResearchAfterApproval
    // This ensures we have the absolute latest state
    const finalCheckJob = getJobStatus(jobId);
    const finalCheckData = finalCheckJob?.research_data || {};
    const finalCheckStatus = finalCheckData[approvalStatusField as keyof typeof finalCheckData] as string | undefined;
    
    console.error(`[APPROVE-STAGE] Final check before continueResearchAfterApproval:`);
    console.error(`[APPROVE-STAGE] Approval status field: ${approvalStatusField}`);
    console.error(`[APPROVE-STAGE] Final status value: ${finalCheckStatus || 'undefined'}`);
    console.error(`[APPROVE-STAGE] Final research_data:`, JSON.stringify(finalCheckData, null, 2));
    
    if (finalCheckStatus !== 'approved') {
      console.error(`[APPROVE-STAGE] CRITICAL: Approval status lost before continueResearchAfterApproval!`);
      console.error(`[APPROVE-STAGE] This indicates a race condition or update failure`);
      res.status(500).json({
        error: {
          code: 'APPROVAL_LOST',
          message: `Approval status was lost before processing. Please try again.`,
        },
      });
      return;
    }
    
    try {
      await continueResearchAfterApproval(jobId, stage, userId);
      
      console.error(`[APPROVE-STAGE] ===== continueResearchAfterApproval SUCCESS =====`);
      const duration = Date.now() - startTime;
      console.error(`[APPROVE-STAGE] Total approval time: ${duration}ms`);
      
      res.status(200).json({
        success: true,
        message: `${stage} approved. Processing next stage...`,
      });
    } catch (continueError) {
      console.error(`[APPROVE-STAGE] ===== continueResearchAfterApproval FAILED =====`);
      console.error(`[APPROVE-STAGE] Error:`, continueError);
      console.error(`[APPROVE-STAGE] Error message:`, continueError instanceof Error ? continueError.message : String(continueError));
      console.error(`[APPROVE-STAGE] Error stack:`, continueError instanceof Error ? continueError.stack : 'No stack trace');
      
      // Get current job state for debugging
      const errorCheckJob = getJobStatus(jobId);
      const errorCheckData = errorCheckJob?.research_data || {};
      const errorCheckStatus = errorCheckData[approvalStatusField as keyof typeof errorCheckData] as string | undefined;
      
      console.error(`[APPROVE-STAGE] Current state when error occurred:`);
      console.error(`[APPROVE-STAGE] Approval status field: ${approvalStatusField}`);
      console.error(`[APPROVE-STAGE] Current status: ${errorCheckStatus || 'undefined'}`);
      console.error(`[APPROVE-STAGE] Full research_data:`, JSON.stringify(errorCheckData, null, 2));
      
      logger.error('[Research] Failed to continue after approval', {
        jobId,
        stage,
        error: continueError instanceof Error ? continueError.message : String(continueError),
        stack: continueError instanceof Error ? continueError.stack : undefined,
        currentApprovalStatus: errorCheckStatus,
        researchDataKeys: Object.keys(errorCheckData),
      });
      
      // Build debugInfo from actual error; only mention approval when it's an approval-related failure
      const errMsg = continueError instanceof Error ? continueError.message : String(continueError);
      const isApprovalError = /approval|approved|status check/i.test(errMsg) && !/EMPTY_RESPONSE|AI service|research summary/i.test(errMsg);
      const debugInfo = isApprovalError
        ? `Approval status check failed. Field: ${approvalStatusField}, Expected: 'approved', Actual: '${errorCheckStatus || 'undefined'}'`
        : `Continuation failed at stage '${stage}': ${errMsg}. Current ${approvalStatusField}: '${errorCheckStatus || 'undefined'}'`;

      // Return error with detailed debugging info
      res.status(500).json({
        error: {
          code: 'CONTINUATION_FAILED',
          message: errMsg,
          details: {
            stage,
            approvalStatusField,
            currentApprovalStatus: errorCheckStatus,
            researchDataKeys: Object.keys(errorCheckData),
            debugInfo,
          },
        },
      });
      return;
    }
  } catch (error) {
    console.error(`[APPROVE-STAGE] ===== OUTER CATCH BLOCK =====`);
    console.error(`[APPROVE-STAGE] Unexpected error:`, error);
    console.error(`[APPROVE-STAGE] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[APPROVE-STAGE] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    logger.error('Error approving research stage', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to approve research stage',
      },
    });
  }
  
  console.error(`[APPROVE-STAGE] ===== END APPROVAL REQUEST =====`);
}

/**
 * Request regeneration of a research stage
 * POST /api/research/:job_id/regenerate/:stage
 * Stages: questions, search_terms, videos
 */
export async function regenerateResearchStage(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const jobId = req.params.job_id;
    const stage = req.params.stage as 'questions' | 'search_terms' | 'videos';
    const userId = req.user?.uid || req.user?.id || null;
    const feedback = req.body.feedback as string;

    if (!jobId) {
      res.status(400).json({
        error: {
          code: 'INVALID_JOB_ID',
          message: 'Job ID is required',
        },
      });
      return;
    }

    if (!['questions', 'search_terms', 'videos'].includes(stage)) {
      res.status(400).json({
        error: {
          code: 'INVALID_STAGE',
          message: 'Stage must be one of: questions, search_terms, videos',
        },
      });
      return;
    }

    // Validate feedback - allow empty strings, but must be a string type
    if (typeof feedback !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_FEEDBACK',
          message: 'Feedback must be a string',
        },
      });
      return;
    }

    const feedbackLength = feedback.trim().length;
    // Only validate max length, no minimum requirement
    const maxFeedbackLength = 500;
    if (feedbackLength > maxFeedbackLength) {
      res.status(400).json({
        error: {
          code: 'INVALID_FEEDBACK_LENGTH',
          message: `Feedback must not exceed ${maxFeedbackLength} characters`,
        },
      });
      return;
    }

    // Check ownership
    if (!userOwnsJob(jobId, userId)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this research job',
        },
      });
      return;
    }

    const job = getJobStatus(jobId);
    if (!job) {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Research job not found',
        },
      });
      return;
    }

    const researchConfig = getResearchConfig();
    const researchData = job.research_data || {};

    // Check feedback count – use canonical field names (singular) to match research_data contract
    const stageToFeedbackCountField: Record<string, string> = {
      questions: 'question_feedback_count',
      search_terms: 'search_term_feedback_count',
      videos: 'video_feedback_count',
    };
    const feedbackCountField = stageToFeedbackCountField[stage] ?? `${stage}_feedback_count`;
    const currentFeedbackCount = (researchData[feedbackCountField as keyof typeof researchData] as number) || 0;
    
    if (currentFeedbackCount >= researchConfig.max_feedback_per_stage) {
      res.status(400).json({
        error: {
          code: 'MAX_FEEDBACK_EXCEEDED',
          message: `Maximum feedback attempts (${researchConfig.max_feedback_per_stage}) reached for this stage`,
        },
      });
      return;
    }

    // CRITICAL: Use mutex to prevent race conditions
    // Multiple requests could pass the status check simultaneously without this
    const lockKey = `${jobId}:${stage}`;
    const existingLock = regenerationLocks.get(lockKey);
    
    // Wait for any existing regeneration to complete
    if (existingLock) {
      await existingLock;
    }
    
    // Create new lock promise for this regeneration
    const lockPromise = (async () => {
      // Re-read job status after acquiring lock (may have changed)
      const lockedJob = getJobStatus(jobId);
      if (!lockedJob) {
        res.status(404).json({
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Research job not found',
          },
        });
        return;
      }
      
      const lockedResearchData = lockedJob.research_data || {};
      
      // Validate current state
      // CRITICAL FIX: Map stage names to correct field names (stage names are plural, field names are singular)
      const stageToFieldMap: Record<string, string> = {
        'questions': 'question_approval_status',
        'search_terms': 'search_term_approval_status',
        'videos': 'video_approval_status',
      };
      const approvalStatusField = stageToFieldMap[stage] || `${stage}_approval_status`;
      const currentStatus = lockedResearchData[approvalStatusField as keyof typeof lockedResearchData] as string | undefined;

      // Check if we have questions/search_terms/videos generated (indicates we're in approval stage)
      const hasGeneratedData = 
        (stage === 'questions' && lockedResearchData.generated_questions && lockedResearchData.generated_questions.length > 0) ||
        (stage === 'search_terms' && lockedResearchData.generated_search_terms && lockedResearchData.generated_search_terms.length > 0) ||
        (stage === 'videos' && lockedResearchData.selected_videos && lockedResearchData.selected_videos.length > 0);
      
      // Allow regeneration if:
      // 1. Status is 'pending', OR
      // 2. Status is undefined but we have generated data (indicates we're awaiting approval)
      const isPending = currentStatus === 'pending' || 
                       (currentStatus === undefined && hasGeneratedData);

      if (!isPending) {
        // Already approved - can't regenerate
        if (currentStatus === 'approved') {
          res.status(400).json({
            error: {
              code: 'ALREADY_APPROVED',
              message: 'Stage is already approved. Cannot regenerate.',
            },
          });
          return;
        }
        
        // Already regenerating - don't allow duplicate regeneration
        if (currentStatus === 'regenerating') {
          res.status(400).json({
            error: {
              code: 'ALREADY_REGENERATING',
              message: 'Stage is currently being regenerated. Please wait.',
            },
          });
          return;
        }
        
        res.status(400).json({
          error: {
            code: 'INVALID_STATE',
            message: `Stage is not in pending state (current: ${currentStatus || 'undefined'}, job status: ${lockedJob.status}, hasGeneratedData: ${hasGeneratedData})`,
          },
        });
        return;
      }

      // ATOMIC: Update status to regenerating (now protected by mutex)
      updateJobStatus(jobId, lockedJob.status, {
        research_data: {
          [approvalStatusField]: 'regenerating',
          [`${stage}_user_feedback`]: feedback.trim(),
        },
      });
      
      // Continue with regeneration logic (moved below)
      return { lockedJob, lockedResearchData, approvalStatusField };
    })();
    
    regenerationLocks.set(lockKey, lockPromise);
    
    let lockResult;
    try {
      lockResult = await lockPromise;
      
      // If lockResult is undefined, it means we already sent a response (error case)
      if (!lockResult) {
        regenerationLocks.delete(lockKey);
        return;
      }
      
      const { lockedJob, lockedResearchData, approvalStatusField } = lockResult;
      
      // Update references to use locked data
      const researchQuery = lockedResearchData.research_query || '';
      const language = lockedResearchData.language || 'English';

      // Regenerate based on stage
      try {
        if (stage === 'questions') {
          const originalQuestions = lockedResearchData.generated_questions || [];
          const regeneratedQuestions = await regenerateResearchQuestions(
            researchQuery,
            language,
            originalQuestions,
            feedback.trim(),
            researchConfig.question_count
          );

          // Store regenerated questions
          updateJobStatus(jobId, lockedJob.status, {
            progress: researchConfig.progress_percentages.awaiting_question_approval,
            research_data: {
              generated_questions: regeneratedQuestions,
              [approvalStatusField]: 'pending',
              [feedbackCountField]: currentFeedbackCount + 1,
              previous_questions: originalQuestions,
            },
          });

          // Get updated job to include all research_data
          const updatedJob = getJobStatus(jobId);
          const updatedResearchData = updatedJob?.research_data || lockedResearchData;
        
          broadcastJobProgress(jobId, {
            status: 'awaiting_question_approval' as any,
            progress: researchConfig.progress_percentages.awaiting_question_approval,
            message: `Regenerated ${regeneratedQuestions.length} questions. Please review.`,
            research_data: {
              ...updatedResearchData,
              generated_questions: regeneratedQuestions,
              question_approval_status: 'pending',
              question_feedback_count: currentFeedbackCount + 1,
              previous_questions: originalQuestions,
            },
          } as any);

        } else if (stage === 'search_terms') {
          const originalTerms = lockedResearchData.generated_search_terms || [];
          const approvedQuestions = lockedResearchData.generated_questions || [];
        
        const regeneratedTerms = await regenerateSearchTerms(
          researchQuery,
          approvedQuestions,
          originalTerms,
          feedback.trim(),
          language
        );

          updateJobStatus(jobId, lockedJob.status, {
            progress: researchConfig.progress_percentages.awaiting_search_term_approval,
            research_data: {
              generated_search_terms: regeneratedTerms,
              [approvalStatusField]: 'pending',
              [feedbackCountField]: currentFeedbackCount + 1,
              previous_search_terms: originalTerms,
            },
          });

          // Get updated job to include all research_data
          const updatedJob = getJobStatus(jobId);
          const updatedResearchData = updatedJob?.research_data || lockedResearchData;
          
          broadcastJobProgress(jobId, {
            status: 'awaiting_search_term_approval' as any,
            progress: researchConfig.progress_percentages.awaiting_search_term_approval,
            message: `Regenerated ${regeneratedTerms.length} search terms. Please review.`,
            research_data: {
              ...updatedResearchData,
              generated_search_terms: regeneratedTerms,
              search_term_approval_status: 'pending',
              search_term_feedback_count: currentFeedbackCount + 1,
              previous_search_terms: originalTerms,
            },
          } as any);

        } else if (stage === 'videos') {
          const originalVideos = lockedResearchData.selected_videos || [];
          const videoResults = lockedResearchData.raw_video_results || [];
          const approvedQuestions = lockedResearchData.generated_questions || [];

          if (!videoResults || videoResults.length === 0) {
            res.status(400).json({
              error: {
                code: 'VIDEO_POOL_UNAVAILABLE',
                message: 'Cannot reselect videos: video pool not available. Please start a new research run.',
              },
            });
            regenerationLocks.delete(lockKey);
            return;
          }

          // Refilter videos with feedback
          // Convert raw video results back to VideoSearchResult format
          const videoResultsFormatted: VideoSearchResult[] = videoResults.map((v: any) => ({
            video_id: v.video_id,
            title: v.title,
            channel: v.channel,
            thumbnail: v.thumbnail,
            duration_seconds: v.duration_seconds,
            view_count: v.view_count,
            upload_date: v.upload_date,
            url: v.url,
          }));

          const regeneratedVideos = await filterVideos(
            researchQuery,
            videoResultsFormatted,
            language,
            approvedQuestions,
            feedback.trim(),
            originalVideos
          );

          updateJobStatus(jobId, lockedJob.status, {
            progress: researchConfig.progress_percentages.awaiting_video_approval,
            research_data: {
              selected_videos: regeneratedVideos,
              [approvalStatusField]: 'pending',
              [feedbackCountField]: currentFeedbackCount + 1,
              previous_selected_videos: originalVideos,
            },
          });

          // Get updated job to include all research_data
          const updatedJob = getJobStatus(jobId);
          const updatedResearchData = updatedJob?.research_data || lockedResearchData;
          
          broadcastJobProgress(jobId, {
            status: 'awaiting_video_approval' as any,
            progress: researchConfig.progress_percentages.awaiting_video_approval,
            message: `Refiltered ${regeneratedVideos.length} videos. Please review.`,
            research_data: {
              ...updatedResearchData,
              selected_videos: regeneratedVideos,
              video_approval_status: 'pending',
              video_feedback_count: currentFeedbackCount + 1,
              previous_selected_videos: originalVideos,
            },
            selected_videos: regeneratedVideos, // Also include at top level for backward compatibility
          } as any);
        }

        res.status(200).json({
          success: true,
          message: `${stage} regenerated successfully`,
          status: `awaiting_${stage}_approval`,
        });
      } catch (regenerationError) {
        logger.error('[Research] Regeneration failed', {
          jobId,
          stage,
          error: regenerationError instanceof Error ? regenerationError.message : String(regenerationError),
        });

        // Revert to pending state
        updateJobStatus(jobId, lockedJob.status, {
          research_data: {
            [approvalStatusField]: 'pending',
          },
        });

        res.status(500).json({
          error: {
            code: 'REGENERATION_FAILED',
            message: regenerationError instanceof Error ? regenerationError.message : 'Failed to regenerate',
          },
        });
      } finally {
        // Always release the lock
        regenerationLocks.delete(lockKey);
      }
    } catch (error) {
      logger.error('Error in regenerateResearchStage', error);
      regenerationLocks.delete(lockKey); // Release lock on error
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to regenerate research stage',
        },
      });
    }
  } catch (error) {
    logger.error('Error in regenerateResearchStage outer handler', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to regenerate research stage',
      },
    });
  }
}

