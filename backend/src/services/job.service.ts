/**
 * Job management service
 * Handles job state tracking and status updates
 */

import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { JobStatus, JobInfo, SummaryProgress } from '../types/summary.types';
import { getSystemConfig, getJobCleanupConfig } from '../config';
import logger from '../utils/logger';
import { SSEConnection, isConnectionAlive, sendSSEMessage } from '../utils/sse';

/**
 * In-memory job storage
 * In production, this could be replaced with Redis for persistence
 */
const jobs = new Map<string, JobInfo>();

/**
 * Active SSE connections per job
 * Maps jobId -> Set of SSE connections
 */
const sseConnections = new Map<string, Set<SSEConnection>>();

/**
 * Cleanup interval (runs every hour)
 */
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Heartbeat interval for SSE connections
 */
let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Initialize job cleanup interval
 */
function initializeCleanup(): void {
  if (cleanupInterval) {
    return; // Already initialized
  }

  const systemConfig = getSystemConfig();
  const cleanupConfig = getJobCleanupConfig();
  const retentionMs = systemConfig.job_retention_hours * 60 * 60 * 1000;
  const cleanupIntervalMs = cleanupConfig.cleanup_interval_hours * 60 * 60 * 1000;

  // Run cleanup at configured interval
  cleanupInterval = setInterval(() => {
    cleanupOldJobs(retentionMs);
  }, cleanupIntervalMs);

  logger.info('Job cleanup interval initialized', {
    interval_hours: cleanupConfig.cleanup_interval_hours,
  });
}

/**
 * Clean up old jobs
 */
function cleanupOldJobs(retentionMs: number): void {
  const now = Date.now();
  let cleaned = 0;
  const cleanupConfig = getJobCleanupConfig();
  const errorRetentionMs = cleanupConfig.error_job_retention_hours * 60 * 60 * 1000;

  for (const [jobId, job] of jobs.entries()) {
    const age = now - job.created_at.getTime();
    
    // Keep completed jobs for retention period
    // Keep error jobs for configured retention period (for debugging)
    const shouldKeep =
      (job.status === 'completed' && age < retentionMs) ||
      (job.status === 'error' && age < errorRetentionMs) ||
      (job.status !== 'completed' && job.status !== 'error');

    if (!shouldKeep) {
      jobs.delete(jobId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} old jobs`);
  }
}

/**
 * Create a new job
 * @param userId User ID (can be null if auth disabled)
 * @returns Job ID
 */
export function createJob(userId: string | null): string {
  const jobId = uuidv4();
  const now = new Date();

  const job: JobInfo = {
    job_id: jobId,
    user_id: userId,
    status: 'pending',
    progress: 0,
    created_at: now,
    updated_at: now,
  };

  jobs.set(jobId, job);
  logger.info(`Created new job: ${jobId}`, { userId });

  // Initialize cleanup if not already done
  initializeCleanup();

  return jobId;
}

/**
 * Get job status
 * @param jobId Job ID
 * @returns Job info or null if not found
 */
export function getJobStatus(jobId: string): JobInfo | null {
  return jobs.get(jobId) || null;
}

/**
 * Update job status
 * CRITICAL: Always reads latest state from Map to prevent race conditions
 * @param jobId Job ID
 * @param status New status
 * @param data Optional additional data (progress, error, summary_id)
 */
export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  data?: {
    progress?: number;
    error?: string;
    summary_id?: string;
    title?: string | null;
    // Research-specific intermediate data (using JobInfo's research_data type)
    research_data?: JobInfo['research_data'];
  }
): void {
  console.error(`[UPDATE-JOB-STATUS] ===== START UPDATE =====`);
  console.error(`[UPDATE-JOB-STATUS] JobId: ${jobId}, Status: ${status}`);
  
  // CRITICAL: Always read fresh from Map to get latest state (prevents race conditions)
  const job = jobs.get(jobId);
  if (!job) {
    console.error(`[UPDATE-JOB-STATUS] Job not found: ${jobId}`);
    logger.warn(`Attempted to update non-existent job: ${jobId}`);
    return;
  }

  console.error(`[UPDATE-JOB-STATUS] Current job status: ${job.status}, Progress: ${job.progress}`);
  console.error(`[UPDATE-JOB-STATUS] Current research_data before update:`, JSON.stringify(job.research_data, null, 2));

  // Update basic fields
  job.status = status;
  job.updated_at = new Date();

  if (data?.progress !== undefined) {
    job.progress = Math.max(0, Math.min(100, data.progress));
  }

  if (data?.error) {
    job.error = data.error;
  }

  if (data?.summary_id) {
    job.summary_id = data.summary_id;
  }

  if (data?.title !== undefined) {
    job.title = data.title;
  }

  // Store research data if provided
  if (data?.research_data) {
    console.error(`[UPDATE-JOB-STATUS] ===== UPDATING RESEARCH_DATA =====`);
    console.error(`[UPDATE-JOB-STATUS] JobId: ${jobId}`);
    console.error(`[UPDATE-JOB-STATUS] Current research_data keys:`, job.research_data ? Object.keys(job.research_data) : 'none');
    console.error(`[UPDATE-JOB-STATUS] Current research_data:`, JSON.stringify(job.research_data, null, 2));
    console.error(`[UPDATE-JOB-STATUS] New research_data keys:`, Object.keys(data.research_data));
    console.error(`[UPDATE-JOB-STATUS] New research_data:`, JSON.stringify(data.research_data, null, 2));
    
    // CRITICAL FIX: Always preserve existing research_data by merging properly
    // Deep clone to avoid reference issues
    const existingResearchData = job.research_data ? JSON.parse(JSON.stringify(job.research_data)) : {};
    
    // Merge: existing data first, then new data (new data overwrites existing)
    const mergedResearchData = {
      ...existingResearchData, // Preserve ALL existing fields
      ...data.research_data,   // Overwrite with new/updated fields
    };
    
    console.error(`[UPDATE-JOB-STATUS] Existing research_data (cloned):`, JSON.stringify(existingResearchData, null, 2));
    console.error(`[UPDATE-JOB-STATUS] Merged research_data:`, JSON.stringify(mergedResearchData, null, 2));
    
    // Assign the merged data back
    job.research_data = mergedResearchData;
    
    // Use mergedResearchData directly since we know it's always an object
    console.error(`[UPDATE-JOB-STATUS] Final research_data keys:`, Object.keys(mergedResearchData));
    console.error(`[UPDATE-JOB-STATUS] Final research_data:`, JSON.stringify(mergedResearchData, null, 2));
    
    // Log the update for debugging
    logger.debug(`Updated research_data for job ${jobId}`, {
      status,
      researchDataKeys: Object.keys(mergedResearchData),
      newDataKeys: Object.keys(data.research_data),
    });
  }

  // Save back to Map
  jobs.set(jobId, job);
  
  // Verify the data was actually saved to the Map
  const verifyJob = jobs.get(jobId);
  if (verifyJob) {
    const verifyResearchData = verifyJob.research_data || {};
    console.error(`[UPDATE-JOB-STATUS] Verification after Map.set:`);
    console.error(`[UPDATE-JOB-STATUS] Verified research_data keys:`, Object.keys(verifyResearchData));
    console.error(`[UPDATE-JOB-STATUS] Verified research_data:`, JSON.stringify(verifyResearchData, null, 2));
  } else {
    console.error(`[UPDATE-JOB-STATUS] CRITICAL: Job not found in Map after set!`);
  }
  
  console.error(`[UPDATE-JOB-STATUS] Job saved to Map. Status: ${status}, Has research_data: ${!!job.research_data}`);
  console.error(`[UPDATE-JOB-STATUS] ===== END UPDATE =====`);
  
  logger.debug(`Updated job status: ${jobId}`, {
    status,
    progress: job.progress,
    title: job.title,
    hasResearchData: !!job.research_data,
  });
}

/**
 * Check if user owns the job
 * @param jobId Job ID
 * @param userId User ID (can be null if auth disabled)
 * @returns True if user owns the job or auth is disabled
 */
export function userOwnsJob(jobId: string, userId: string | null): boolean {
  const job = jobs.get(jobId);
  if (!job) {
    return false;
  }

  // If auth is disabled (userId is null), allow access
  if (userId === null) {
    return true;
  }

  return job.user_id === userId;
}

/**
 * Get all active jobs for a user (for monitoring/debugging)
 * @param userId User ID
 * @returns Array of job IDs
 */
export function getUserJobs(userId: string | null): string[] {
  const userJobs: string[] = [];

  for (const [jobId, job] of jobs.entries()) {
    if (userId === null || job.user_id === userId) {
      userJobs.push(jobId);
    }
  }

  return userJobs;
}

/**
 * Get all active jobs for a user with full job info
 * @param userId User ID
 * @returns Array of job info objects
 */
export function getUserJobsWithInfo(userId: string | null): JobInfo[] {
  const userJobs: JobInfo[] = [];

  for (const [jobId, job] of jobs.entries()) {
    if (userId === null || job.user_id === userId) {
      userJobs.push(job);
    }
  }

  return userJobs;
}

/**
 * Cancel a job
 * Marks the job as cancelled and sets error status
 * @param jobId Job ID
 * @param userId User ID (for verification)
 * @returns True if job was cancelled, false if not found or not owned by user
 */
export function cancelJob(jobId: string, userId: string | null): boolean {
  const job = jobs.get(jobId);
  if (!job) {
    logger.warn(`Attempted to cancel non-existent job: ${jobId}`);
    return false;
  }

  // Verify ownership
  if (userId !== null && job.user_id !== userId) {
    logger.warn(`User ${userId} attempted to cancel job ${jobId} owned by ${job.user_id}`);
    return false;
  }

  // Mark as cancelled
  job.cancelled = true;
  job.status = 'error';
  job.error = 'Cancelled by user';
  job.updated_at = new Date();

  jobs.set(jobId, job);
  logger.info(`Cancelled job: ${jobId}`, { userId });

  return true;
}

/**
 * Add SSE connection for a job
 * @param jobId Job ID
 * @param connection SSE connection
 */
export function addSSEConnection(jobId: string, connection: SSEConnection): void {
  if (!sseConnections.has(jobId)) {
    sseConnections.set(jobId, new Set());
  }
  sseConnections.get(jobId)!.add(connection);
  logger.debug(`Added SSE connection for job ${jobId}`, {
    totalConnections: sseConnections.get(jobId)!.size,
  });

  // Initialize heartbeat if not already done
  initializeHeartbeat();
}

/**
 * Remove SSE connection for a job
 * @param jobId Job ID
 * @param connection SSE connection
 */
export function removeSSEConnection(
  jobId: string,
  connection: SSEConnection
): void {
  const connections = sseConnections.get(jobId);
  if (connections) {
    connections.delete(connection);
    if (connections.size === 0) {
      sseConnections.delete(jobId);
    }
    logger.debug(`Removed SSE connection for job ${jobId}`, {
      remainingConnections: connections.size,
    });
  }
}

/**
 * Broadcast progress update to all connected clients for a job
 * @param jobId Job ID
 * @param progress Progress data
 */
export function broadcastJobProgress(
  jobId: string,
  progress: SummaryProgress
): void {
  const connections = sseConnections.get(jobId);
  if (!connections || connections.size === 0) {
    // Log warning when trying to send chunks but no connections exist
    // This is critical for debugging streaming issues
    if (progress.chunk !== undefined) {
      logger.warn('[SSE Broadcast] Attempted to send chunk but no active SSE connections', {
        jobId,
        status: progress.status,
        chunkLength: progress.chunk.length,
        chunkPreview: progress.chunk.substring(0, 50),
        message: 'Frontend may have disconnected. Chunks will be lost.',
      });
    } else {
      logger.debug('[SSE Broadcast] No active connections for job', {
        jobId,
        status: progress.status,
      });
    }
    return; // No active connections
  }

  const deadConnections: SSEConnection[] = [];
  let successfulBroadcasts = 0;

  for (const connection of connections) {
    if (isConnectionAlive(connection.res)) {
      try {
        sendSSEMessage(connection.res, progress);
        connection.lastHeartbeat = new Date();
        connection.resetTimeout?.();
        successfulBroadcasts++;
      } catch (error) {
        logger.warn('Error broadcasting to SSE connection', {
          jobId,
          error,
        });
        deadConnections.push(connection);
      }
    } else {
      deadConnections.push(connection);
    }
  }

  // Log successful broadcasts for chunks (helps debug streaming)
  if (progress.chunk !== undefined && successfulBroadcasts > 0) {
    logger.debug('[SSE Broadcast] Successfully sent chunk', {
      jobId,
      status: progress.status,
      chunkLength: progress.chunk.length,
      connectionsBroadcasted: successfulBroadcasts,
    });
  }

  // Remove dead connections
  for (const deadConnection of deadConnections) {
    removeSSEConnection(jobId, deadConnection);
  }
}

/**
 * Initialize heartbeat interval for SSE connections
 */
function initializeHeartbeat(): void {
  if (heartbeatInterval) {
    return; // Already initialized
  }

  const systemConfig = getSystemConfig();
  const heartbeatIntervalMs =
    systemConfig.sse_heartbeat_interval_seconds * 1000;

  heartbeatInterval = setInterval(() => {
    sendHeartbeats();
  }, heartbeatIntervalMs);

  logger.info('SSE heartbeat interval initialized', {
    interval_seconds: systemConfig.sse_heartbeat_interval_seconds,
  });
}

/**
 * Send heartbeat to all active SSE connections
 */
function sendHeartbeats(): void {
  const now = new Date();
  const deadConnections: Array<{ jobId: string; connection: SSEConnection }> =
    [];

  for (const [jobId, connections] of sseConnections.entries()) {
    for (const connection of connections) {
      if (isConnectionAlive(connection.res)) {
        try {
          sendSSEMessage(connection.res, {
            status: 'heartbeat',
            progress: 0,
            timestamp: now.toISOString(),
          });
          connection.lastHeartbeat = now;
          connection.resetTimeout?.();
        } catch (error) {
          logger.warn('Error sending heartbeat', { jobId, error });
          deadConnections.push({ jobId, connection });
        }
      } else {
        deadConnections.push({ jobId, connection });
      }
    }
  }

  // Remove dead connections
  for (const { jobId, connection } of deadConnections) {
    removeSSEConnection(jobId, connection);
  }
}

/**
 * Clean up all SSE connections for a job
 * @param jobId Job ID
 */
export function cleanupSSEConnections(jobId: string): void {
  sseConnections.delete(jobId);
  logger.debug(`Cleaned up SSE connections for job ${jobId}`);
}

/**
 * Get the number of active SSE connections for a job
 * @param jobId Job ID
 * @returns Number of active connections
 */
export function getSSEConnectionCount(jobId: string): number {
  const connections = sseConnections.get(jobId);
  if (!connections) {
    return 0;
  }
  
  // Count only alive connections
  let aliveCount = 0;
  for (const connection of connections) {
    if (isConnectionAlive(connection.res)) {
      aliveCount++;
    }
  }
  
  return aliveCount;
}

/**
 * Cleanup on shutdown
 */
export function shutdown(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  jobs.clear();
  sseConnections.clear();
  logger.info('Job service shut down');
}

