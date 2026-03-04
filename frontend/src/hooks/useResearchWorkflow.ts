'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useResearchStream } from './useResearchStream';
import { useConfig } from './useConfig';
import { approveResearchStage, regenerateResearchStage } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import type { ResearchStatus, ResearchProgress } from '@/types';

/**
 * Approval stage type
 */
export type ApprovalStage = 'questions' | 'search_terms' | 'videos';

/**
 * Approval status for a stage
 */
export type ApprovalStatus = 'pending' | 'approved' | 'regenerating';

/**
 * Research workflow state
 */
export interface ResearchWorkflowState {
  // Current job ID
  jobId: string | null;
  
  // Current status
  status: ResearchStatus | 'idle' | 'connected';
  
  // Approval stage data
  questions?: string[]; // Complete array
  partialQuestions?: string[]; // Partial array during streaming (Phase 3)
  isStreamingQuestions?: boolean; // Streaming flag (Phase 3)
  questionApprovalStatus?: ApprovalStatus;
  questionFeedbackCount?: number;
  
  searchTerms?: string[]; // Complete array
  partialSearchTerms?: string[]; // Partial array during streaming (Phase 3)
  isStreamingSearchTerms?: boolean; // Streaming flag (Phase 3)
  searchTermApprovalStatus?: ApprovalStatus;
  searchTermFeedbackCount?: number;
  
  videos?: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    url: string;
    classification: 'Direct' | 'Foundational' | 'Contrarian';
    why_selected: string;
    fills_gap: string;
    answers_questions?: string[];
  }>;
  videoApprovalStatus?: ApprovalStatus;
  videoFeedbackCount?: number;
  
  // Research query
  researchQuery?: string;
  
  // Processing state
  isProcessing: boolean;
}

/**
 * Hook return type
 */
export interface UseResearchWorkflowReturn {
  // State from useResearchStream
  status: ResearchStatus | 'idle' | 'connected';
  progress: number;
  message: string | null;
  streamedText: string;
  title: string | null;
  error: string | null;
  errorType?: 'network' | 'timeout' | 'server' | 'quota' | 'auth' | 'unknown';
  errorCode?: string;
  isStreaming: boolean;
  generatedQueries?: string[];
  rawVideoResults?: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    view_count: number;
    upload_date: string;
    url: string;
  }>;
  selectedVideos?: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    url: string;
    classification: 'Direct' | 'Foundational' | 'Contrarian';
    why_selected: string;
    fills_gap: string;
  }>;
  research: any;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  manualReconnect: () => void;
  isCompleted: boolean;
  isCompleting: boolean;
  
  // Workflow state
  workflowState: ResearchWorkflowState;
  
  // Actions
  startJob: (payload: { research_query: string; language: string }) => Promise<void>;
  reset: () => void;
  
  // Approval actions
  approveQuestions: () => Promise<void>;
  regenerateQuestions: (feedback: string) => Promise<void>;
  approveSearchTerms: () => Promise<void>;
  regenerateSearchTerms: (feedback: string) => Promise<void>;
  approveVideos: () => Promise<void>;
  regenerateVideos: (feedback: string) => Promise<void>;
  
  // Action states
  isApproving: boolean;
  isRegenerating: boolean;
  approvingStage: ApprovalStage | null;
  regeneratingStage: ApprovalStage | null;
  
  // Phase 3: Streaming state flags
  isStreamingQuestions: boolean;
  isStreamingSearchTerms: boolean;
}

/**
 * useResearchWorkflow Hook
 * Phase 4: Frontend Integration
 * 
 * Manages the enhanced research workflow with approval stages:
 * - Integrates with useResearchStream for SSE
 * - Handles approval and regeneration actions
 * - Uses config from useConfig (not hardcoded)
 * - Streams AI output in real time
 * - Prevents race conditions
 * 
 * Features:
 * - SSE integration via useResearchStream
 * - Approval workflow state management
 * - API calls for approve/regenerate
 * - Config-driven limits (max_feedback_per_stage)
 * - Real-time AI output streaming
 * - Race condition prevention
 */
export function useResearchWorkflow(): UseResearchWorkflowReturn {
  const { t } = useTranslation('research');
  const toast = useToast();
  const { config } = useConfig();
  const stream = useResearchStream();
  
  // Approval action states
  const [isApproving, setIsApproving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [approvingStage, setApprovingStage] = useState<ApprovalStage | null>(null);
  const [regeneratingStage, setRegeneratingStage] = useState<ApprovalStage | null>(null);
  
  // Workflow state
  const [workflowState, setWorkflowState] = useState<ResearchWorkflowState>({
    jobId: null,
    status: 'idle',
    isProcessing: false,
  });
  
  // Race condition prevention refs
  const inFlightApprovalsRef = useRef<Set<string>>(new Set());
  const inFlightRegenerationsRef = useRef<Set<string>>(new Set());
  
  // Extract approval data from stream
  useEffect(() => {
    // Get job ID from stream
    const jobId = stream.currentJobId || null;
    
    // Extract research_data from stream
    const researchData = stream.researchData;
    
    // Determine approval statuses from current status
    let questionApprovalStatus: ApprovalStatus | undefined;
    let searchTermApprovalStatus: ApprovalStatus | undefined;
    let videoApprovalStatus: ApprovalStatus | undefined;
    
    if (stream.status === 'awaiting_question_approval') {
      questionApprovalStatus = 'pending';
    } else if (stream.status === 'regenerating_questions') {
      questionApprovalStatus = 'regenerating';
    } else if (stream.status === 'generating_search_terms' || stream.status === 'searching_videos') {
      questionApprovalStatus = 'approved';
    }
    
    if (stream.status === 'awaiting_search_term_approval') {
      searchTermApprovalStatus = 'pending';
    } else if (stream.status === 'regenerating_search_terms') {
      searchTermApprovalStatus = 'regenerating';
    } else if (stream.status === 'searching_videos' || stream.status === 'filtering_videos') {
      searchTermApprovalStatus = 'approved';
    }
    
    if (stream.status === 'awaiting_video_approval') {
      videoApprovalStatus = 'pending';
    } else if (stream.status === 'refiltering_videos') {
      videoApprovalStatus = 'regenerating';
    } else if (stream.status === 'fetching_transcripts' || stream.status === 'generating_summary') {
      videoApprovalStatus = 'approved';
    }
    
    // Phase 3: Extract data from research_data, handling partial outputs during streaming
    const isStreamingQuestions = stream.status === 'generating_questions' || stream.status === 'regenerating_questions';
    const isStreamingSearchTerms = stream.status === 'generating_search_terms' || stream.status === 'regenerating_search_terms';
    
    // Use partial arrays during streaming, complete arrays when available
    const questions = isStreamingQuestions && researchData?.partial_questions
      ? researchData.partial_questions
      : researchData?.generated_questions;
    const partialQuestions = researchData?.partial_questions;
    
    const searchTerms = isStreamingSearchTerms && researchData?.partial_search_terms
      ? researchData.partial_search_terms
      : researchData?.generated_search_terms;
    const partialSearchTerms = researchData?.partial_search_terms;
    
    const videos = stream.selectedVideos; // Use selectedVideos from stream
    const researchQuery = researchData?.research_query || stream.researchQuery;
    
    setWorkflowState(prev => ({
      ...prev,
      jobId,
      status: stream.status,
      isProcessing: stream.status !== 'idle' && 
                    stream.status !== 'completed' && 
                    stream.status !== 'error' &&
                    !stream.status.includes('awaiting_'),
      questions,
      partialQuestions,
      isStreamingQuestions,
      questionApprovalStatus: questionApprovalStatus || researchData?.question_approval_status,
      questionFeedbackCount: researchData?.question_feedback_count,
      searchTerms,
      partialSearchTerms,
      isStreamingSearchTerms,
      searchTermApprovalStatus: searchTermApprovalStatus || researchData?.search_term_approval_status,
      searchTermFeedbackCount: researchData?.search_term_feedback_count,
      videos,
      videoApprovalStatus: videoApprovalStatus || researchData?.video_approval_status,
      videoFeedbackCount: researchData?.video_feedback_count,
      researchQuery,
    }));
  }, [stream.status, stream.currentJobId, stream.researchData, stream.selectedVideos, stream.researchQuery]);
  
  /**
   * Generic approve function
   */
  const approveStage = useCallback(async (stage: ApprovalStage) => {
    const jobId = workflowState.jobId;
    if (!jobId) {
      toast.error(t('approval.errors.noJobId'));
      return;
    }
    
    // Race condition prevention
    const cacheKey = `${jobId}:${stage}:approve`;
    if (inFlightApprovalsRef.current.has(cacheKey)) {
      console.warn(`[useResearchWorkflow] Duplicate approval request for ${stage}`);
      return;
    }
    
    inFlightApprovalsRef.current.add(cacheKey);
    setIsApproving(true);
    setApprovingStage(stage);
    
    try {
      const response = await approveResearchStage(jobId, stage);
      
      if (response.error) {
        // Enhanced error logging with backend details
        const errorDetails = response.error.details as any;
        console.error(`[useResearchWorkflow] Approval error for ${stage}:`, JSON.stringify({
          code: response.error.code,
          message: response.error.message,
          details: errorDetails,
        }, null, 2));
        
        // Build detailed error message
        let errorMessage = response.error.message || t('approval.errors.approveFailed');
        if (errorDetails) {
          errorMessage += `\n\nDebug Info:`;
          if (errorDetails.approvalStatusField) {
            errorMessage += `\nField: ${errorDetails.approvalStatusField}`;
          }
          if (errorDetails.currentApprovalStatus !== undefined) {
            errorMessage += `\nCurrent Status: ${errorDetails.currentApprovalStatus || 'undefined'}`;
          }
          if (errorDetails.debugInfo) {
            errorMessage += `\n${errorDetails.debugInfo}`;
          }
          if (errorDetails.researchDataKeys) {
            errorMessage += `\nResearch Data Keys: ${errorDetails.researchDataKeys.join(', ')}`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Check for warning in response data (backend may return warning on continuation error)
      const responseData = response.data as any;
      if (responseData?.warning) {
        console.warn(`[useResearchWorkflow] Warning after approving ${stage}:`, responseData.warning);
        toast.warning(responseData.warning);
      } else {
        toast.success(t(`approval.${stage}.approved`));
      }

      // Reconnect to job SSE so we receive progress after approve (fixes stuck UI when user approves late)
      stream.manualReconnect();
    } catch (error) {
      console.error(`[useResearchWorkflow] Failed to approve ${stage}:`, error);
      const errorMessage = error instanceof Error ? error.message : t('approval.errors.approveFailed');
      
      // Show detailed error in toast and console
      console.error(`[useResearchWorkflow] Full error details:`, error);
      toast.error(errorMessage);
      
      throw error; // Re-throw to allow caller to handle
    } finally {
      inFlightApprovalsRef.current.delete(cacheKey);
      setIsApproving(false);
      setApprovingStage(null);
    }
  }, [workflowState.jobId, toast, t, stream.manualReconnect]);

  /**
   * Generic regenerate function
   */
  const regenerateStage = useCallback(async (stage: ApprovalStage, feedback: string) => {
    const jobId = workflowState.jobId;
    if (!jobId) {
      toast.error(t('approval.errors.noJobId'));
      return;
    }
    
    // Validate feedback length (only max length, no minimum requirement)
    const maxFeedbackLength = config?.research?.max_feedback_length ?? 500;
    const feedbackLength = feedback.trim().length;
    
    if (feedbackLength > maxFeedbackLength) {
      toast.error(t('approval.errors.maxLength', { max: maxFeedbackLength }));
      return;
    }
    
    // Check max feedback per stage (from config)
    const maxFeedbackPerStage = config?.research?.max_feedback_per_stage ?? 1;
    const currentFeedbackCount = 
      stage === 'questions' ? workflowState.questionFeedbackCount ?? 0 :
      stage === 'search_terms' ? workflowState.searchTermFeedbackCount ?? 0 :
      workflowState.videoFeedbackCount ?? 0;
    
    if (currentFeedbackCount >= maxFeedbackPerStage) {
      toast.error(t('approval.errors.maxFeedbackExceeded'));
      return;
    }
    
    // Race condition prevention
    const cacheKey = `${jobId}:${stage}:regenerate`;
    if (inFlightRegenerationsRef.current.has(cacheKey)) {
      console.warn(`[useResearchWorkflow] Duplicate regeneration request for ${stage}`);
      return;
    }
    
    inFlightRegenerationsRef.current.add(cacheKey);
    setIsRegenerating(true);
    setRegeneratingStage(stage);
    
    try {
      const response = await regenerateResearchStage(jobId, stage, feedback.trim());
      
      if (response.error) {
        // Handle "ALREADY_REGENERATING" as informational, not an error
        if (response.error.code === 'ALREADY_REGENERATING') {
          toast.info(response.error.message || 'Stage is currently being regenerated. Please wait.');
          // Don't throw - this is expected when regeneration is already in progress
          return;
        }
        
        throw new Error(response.error.message || t('approval.errors.regenerateFailed'));
      }
      
      toast.success(t(`approval.${stage}.regenerating`));
      
      // State will be updated via SSE events
    } catch (error) {
      console.error(`[useResearchWorkflow] Failed to regenerate ${stage}:`, error);
      toast.error(error instanceof Error ? error.message : t('approval.errors.regenerateFailed'));
    } finally {
      inFlightRegenerationsRef.current.delete(cacheKey);
      setIsRegenerating(false);
      setRegeneratingStage(null);
    }
  }, [workflowState.jobId, workflowState.questionFeedbackCount, workflowState.searchTermFeedbackCount, workflowState.videoFeedbackCount, config, toast, t]);
  
  /**
   * Stage-specific approve functions
   */
  const approveQuestions = useCallback(() => approveStage('questions'), [approveStage]);
  const approveSearchTerms = useCallback(() => approveStage('search_terms'), [approveStage]);
  const approveVideos = useCallback(() => approveStage('videos'), [approveStage]);
  
  /**
   * Stage-specific regenerate functions
   */
  const regenerateQuestions = useCallback((feedback: string) => regenerateStage('questions', feedback), [regenerateStage]);
  const regenerateSearchTerms = useCallback((feedback: string) => regenerateStage('search_terms', feedback), [regenerateStage]);
  const regenerateVideos = useCallback((feedback: string) => regenerateStage('videos', feedback), [regenerateStage]);
  
  return {
    // Stream state (pass through)
    status: stream.status,
    progress: stream.progress,
    message: stream.message,
    streamedText: stream.streamedText,
    title: stream.title,
    error: stream.error,
    errorType: stream.errorType,
    errorCode: stream.errorCode,
    isStreaming: stream.isStreaming,
    generatedQueries: stream.generatedQueries,
    rawVideoResults: stream.rawVideoResults,
    selectedVideos: stream.selectedVideos,
    research: stream.research,
    isConnected: stream.isConnected,
    isReconnecting: stream.isReconnecting,
    reconnectAttempts: stream.reconnectAttempts,
    manualReconnect: stream.manualReconnect,
    isCompleted: stream.isCompleted,
    isCompleting: stream.isCompleting,
    
    // Workflow state
    workflowState,
    
    // Actions
    startJob: stream.startJob,
    reset: stream.reset,
    
    // Approval actions
    approveQuestions,
    regenerateQuestions,
    approveSearchTerms,
    regenerateSearchTerms,
    approveVideos,
    regenerateVideos,
    
    // Action states
    isApproving,
    isRegenerating,
    approvingStage,
    regeneratingStage,
    
    // Phase 3: Streaming state flags
    isStreamingQuestions: workflowState.isStreamingQuestions ?? false,
    isStreamingSearchTerms: workflowState.isStreamingSearchTerms ?? false,
  };
}
