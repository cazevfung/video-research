/**
 * Summary controller
 * Handles summary creation requests
 */

import { Request, Response } from 'express';
import { SummaryRequest, JobResponse, SummaryProgress, JobInfo } from '../types/summary.types';
import { validateYouTubeUrls } from '../utils/validators';
import { isValidPresetStyle, getPresetStyles } from '../prompts';
import { getValidPresetStyles } from '../utils/validators';
import { getLimitsConfig, getSummaryConfig, getSystemConfig } from '../config';
import { ValidationError } from '../utils/errors';
import {
  createJob,
  getJobStatus,
  userOwnsJob,
  addSSEConnection,
  removeSSEConnection,
  cleanupSSEConnections,
} from '../services/job.service';
import {
  reserveTaskSlot,
  registerActiveTask,
  releaseTaskSlot,
} from '../services/task-concurrency.service';
import { processBatch } from '../services/summary.service';
import { AuthenticatedUser } from '../types/auth.types';
import logger from '../utils/logger';
import {
  setupSSEHeaders,
  sendSSEMessage,
  closeSSEConnection,
  handleClientDisconnect,
  SSEConnection,
} from '../utils/sse';
import { getSummaryById } from '../models/Summary';
import { AuthenticatedRequest } from '../middleware/optional-auth.middleware';
import {
  getGuestSession,
  incrementGuestSummaryCount,
} from '../services/guest-session.service';
import { getGuestAccessConfig } from '../config';
import {
  storeGuestSummary,
  getGuestSummaryByJobId,
} from '../services/guest-summary.service';
import { getUserByUid } from '../models/User';
import { languageCodeToName } from '../utils/language-mapping';

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
 * Validate summary request
 */
function validateSummaryRequest(body: any): {
  valid: boolean;
  errors: Array<{ field: string; message: string; value?: any }>;
  request?: SummaryRequest;
} {
  const errors: Array<{ field: string; message: string; value?: any }> = [];

  // Validate urls
  if (!body.urls || !Array.isArray(body.urls)) {
    errors.push({
      field: 'urls',
      message: 'urls is required and must be an array',
    });
  } else if (body.urls.length === 0) {
    errors.push({
      field: 'urls',
      message: 'At least one URL is required',
    });
  } else {
    const urlValidation = validateYouTubeUrls(body.urls);
    if (!urlValidation.valid) {
      urlValidation.errors.forEach((err) => {
        errors.push({
          field: 'urls',
          message: err.message,
          value: err.value,
        });
      });
    }
  }

  // Validate preset
  if (!body.preset || typeof body.preset !== 'string') {
    errors.push({
      field: 'preset',
      message: 'preset is required and must be a string',
    });
  } else if (!isValidPresetStyle(body.preset)) {
    const validPresets = getValidPresetStyles();
    errors.push({
      field: 'preset',
      message: `Invalid preset style. Valid values: ${validPresets.join(', ')}`,
      value: body.preset,
    });
  }

  // Validate custom_prompt (optional)
  if (body.custom_prompt !== undefined) {
    if (typeof body.custom_prompt !== 'string') {
      errors.push({
        field: 'custom_prompt',
        message: 'custom_prompt must be a string',
      });
    } else {
      const limits = getLimitsConfig();
      if (body.custom_prompt.length > limits.custom_prompt_max_length) {
        errors.push({
          field: 'custom_prompt',
          message: `custom_prompt exceeds maximum length of ${limits.custom_prompt_max_length} characters`,
          value: body.custom_prompt,
        });
      }
    }
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
    return { valid: false, errors };
  }

  const request: SummaryRequest = {
    urls: body.urls,
    preset: body.preset as SummaryRequest['preset'],
    custom_prompt: body.custom_prompt,
    language: body.language || getDefaultLanguage(),
  };

  return { valid: true, errors: [], request };
}

/**
 * Create summary job
 * POST /api/summarize
 */
export async function createSummaryJob(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // If language not provided, try to use user's language preference
    if (!req.body.language && req.user) {
      try {
        const user = await getUserByUid(req.user.uid || req.user.id || '');
        if (user?.language_preference) {
          // Map language code to backend language name
          const backendLanguageName = languageCodeToName(user.language_preference);
          req.body.language = backendLanguageName;
          logger.debug(`Using user language preference: ${user.language_preference} -> ${backendLanguageName}`, {
            userId: req.user.uid || req.user.id,
          });
        }
      } catch (error) {
        logger.warn('Failed to fetch user language preference, using default', { error });
        // Continue with default language
      }
    }

    // Validate request body
    const validation = validateSummaryRequest(req.body);
    if (!validation.valid) {
      throw new ValidationError('Invalid request data', {
        errors: validation.errors,
      });
    }

    const request = validation.request!;
    const isGuest = !req.user && !!req.guest;
    const userId = req.user?.uid || req.user?.id || null;
    const userTier = req.user?.tier || 'free';
    const guestSessionId = req.guest?.sessionId || null;

    // Check guest limit if guest user
    if (isGuest && guestSessionId) {
      const guestSession = getGuestSession(guestSessionId);
      if (!guestSession) {
        res.status(401).json({
          error: {
            code: 'GUEST_SESSION_EXPIRED',
            message: 'Guest session expired. Please refresh the page.',
          },
        });
        return;
      }

      const guestConfig = getGuestAccessConfig();
      if (
        guestConfig.max_summaries != null &&
        guestSession.summaryCount >= guestConfig.max_summaries
      ) {
        res.status(429).json({
          error: {
            code: 'GUEST_LIMIT_REACHED',
            message:
              `Guest users are limited to ${guestConfig.max_summaries} summary${guestConfig.max_summaries > 1 ? 'ies' : ''}. Please login to create more summaries.`,
          },
        });
        return;
      }
    }

    // Check task limit before creating job
    const slotReservation = await reserveTaskSlot(userId, userTier);
    if (!slotReservation.success) {
      res.status(429).json({
        error: {
          code: 'TASK_LIMIT_EXCEEDED',
          message: slotReservation.reason || 'Task limit exceeded',
        },
      });
      return;
    }

    // Create job (use guest session ID as identifier for guests)
    const jobUserId = isGuest ? `guest:${guestSessionId}` : userId;
    const jobId = createJob(jobUserId);
    await registerActiveTask(jobUserId, jobId);

    logger.info(`Created summary job: ${jobId}`, {
      userId: isGuest ? `guest:${guestSessionId}` : userId,
      isGuest,
      urlCount: request.urls.length,
      preset: request.preset,
    });

    // Start async processing (don't await)
    processBatch(userId, request, jobId, isGuest, guestSessionId)
      .then(() => {
        // Release slot on completion
        releaseTaskSlot(jobUserId, jobId);
      })
      .catch((error) => {
        // Release slot on error
        releaseTaskSlot(jobUserId, jobId);
        logger.error(`Error processing batch for job ${jobId}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: isGuest ? `guest:${guestSessionId}` : userId,
          isGuest,
        });
        // Error handling is done in processBatch
      });

    // Return job ID immediately
    const response: JobResponse = {
      job_id: jobId,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error creating summary job', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create summary job',
      },
    });
  }
}

/**
 * Build job status response (used for both SSE and polling)
 */
async function buildJobStatusResponse(jobId: string, job: JobInfo): Promise<SummaryProgress> {
  const currentProgress: SummaryProgress = {
    status: job.status,
    progress: job.progress,
    message: getStatusMessage(job.status) ?? undefined,
  };

    // If job is completed, include summary data
    if (job.status === 'completed' && job.summary_id) {
      try {
        // Check if this is a guest summary
        const guestSummary = getGuestSummaryByJobId(job.summary_id);
        if (guestSummary) {
          // Return guest summary data
          currentProgress.data = {
            _id: guestSummary.summaryData.id || '',
            user_id: null,
            batch_title: guestSummary.summaryData.batch_title,
            source_videos: guestSummary.summaryData.source_videos.map((v) => ({
              url: v.url,
              title: v.title,
              channel: v.channel,
              thumbnail: v.thumbnail,
              duration_seconds: v.duration_seconds,
              was_pre_condensed: v.was_pre_condensed,
              upload_date: v.upload_date,
            })),
            user_prompt_focus: guestSummary.summaryData.user_prompt_focus,
            preset_style: guestSummary.summaryData.preset_style,
            final_summary_text: guestSummary.summaryData.final_summary_text,
            language: guestSummary.summaryData.language,
            processing_stats: guestSummary.summaryData.processing_stats,
            created_at:
              typeof guestSummary.summaryData.created_at === 'string'
                ? new Date(guestSummary.summaryData.created_at)
                : guestSummary.summaryData.created_at,
          };
        } else {
          // Regular authenticated summary
          const summary = await getSummaryById(job.summary_id);
          if (summary) {
            currentProgress.data = {
              _id: summary.id!,
              user_id: summary.user_id,
              batch_title: summary.batch_title,
              source_videos: summary.source_videos.map((v) => ({
                url: v.url,
                title: v.title,
                channel: v.channel,
                thumbnail: v.thumbnail,
                duration_seconds: v.duration_seconds,
                was_pre_condensed: v.was_pre_condensed,
                upload_date: v.upload_date,
              })),
              user_prompt_focus: summary.user_prompt_focus,
              preset_style: summary.preset_style,
              final_summary_text: summary.final_summary_text,
              language: summary.language,
              processing_stats: summary.processing_stats,
              created_at:
                typeof summary.created_at === 'string'
                  ? new Date(summary.created_at)
                  : summary.created_at,
            };
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch summary data', { error });
      }
    }

  // If job has error, include error message
  if (job.status === 'error' && job.error) {
    currentProgress.error = job.error;
  }

  return currentProgress;
}

/**
 * Get job status via SSE or polling
 * GET /api/status/:job_id
 * Supports both SSE (Accept: text/event-stream) and regular polling (JSON response)
 */
export async function getJobStatusSSE(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const jobId = req.params.job_id;
  // Use uid (Firebase Auth UID) if available, fallback to id for backward compatibility
  const userId = req.user?.uid || req.user?.id || null;
  const isGuest = !req.user && req.guest;
  const guestSessionId = req.guest?.sessionId || null;
  const jobUserId = isGuest ? `guest:${guestSessionId}` : userId;

  try {
    // Validate job exists
    const job = getJobStatus(jobId);
    if (!job) {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      });
      return;
    }

    // Check user owns the job (for guests, check by guest session ID)
    if (!userOwnsJob(jobId, jobUserId)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this job',
        },
      });
      return;
    }

    // Check if this is an SSE request or a polling request
    const acceptHeader = req.headers.accept || '';
    const isSSERequest = acceptHeader.includes('text/event-stream');

    if (isSSERequest) {
      // SSE mode: set up streaming connection
      setupSSEHeaders(res, req);

      // Create SSE connection
      const connection: SSEConnection = {
        res,
        jobId,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
      };

      // Add connection to job service
      addSSEConnection(jobId, connection);

      logger.info(`SSE connection established for job ${jobId}`, { userId });

      // Send initial connection event
      sendSSEMessage(res, {
        status: 'connected',
        job_id: jobId,
        progress: job.progress,
        message: 'Connected to job status stream',
      });

      // Send current job status if job is already in progress
      if (job.status !== 'pending') {
        const currentProgress = await buildJobStatusResponse(jobId, job);
        sendSSEMessage(res, currentProgress);
      }

      // Handle client disconnect
      handleClientDisconnect(res, () => {
        removeSSEConnection(jobId, connection);
        logger.info(`SSE connection closed for job ${jobId}`, { userId });
      });

      // Progress-aware connection timeout: reset whenever we send (progress or heartbeat)
      const systemConfig = getSystemConfig();
      const connectionTimeoutMs = systemConfig.job_timeout_minutes * 60 * 1000;
      let timeoutId: NodeJS.Timeout = setTimeout(() => {
        logger.info(`SSE connection timeout for job ${jobId}`, { userId });
        removeSSEConnection(jobId, connection);
        closeSSEConnection(res);
      }, connectionTimeoutMs);

      connection.resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          logger.info(`SSE connection timeout for job ${jobId}`, { userId });
          removeSSEConnection(jobId, connection);
          closeSSEConnection(res);
        }, connectionTimeoutMs);
      };

      // Clear timeout on disconnect
      res.on('close', () => {
        clearTimeout(timeoutId);
      });

      // Keep connection alive - job service will send heartbeats and call resetTimeout on every send
    } else {
      // Polling mode: return JSON response immediately
      const statusResponse = await buildJobStatusResponse(jobId, job);
      res.status(200).json(statusResponse);
      logger.debug(`Job status polled for job ${jobId}`, { userId, status: job.status });
    }
  } catch (error) {
    logger.error('Error getting job status', { error, jobId, userId });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get job status',
      },
    });
  }
}

/**
 * Get human-readable status message
 * 
 * NOTE: Returns null to let frontend handle localization based on status code.
 * Frontend components translate based on status for proper localization.
 */
function getStatusMessage(status: string): string | null {
  // Return null to let frontend handle translation based on status
  return null;
}

