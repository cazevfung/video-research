"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ResearchForm } from "@/components/research/ResearchForm";
import { ResearchProgressSidebar } from "@/components/research/ResearchProgressSidebar";
import { UnifiedStreamingContainer } from "@/components/dashboard/UnifiedStreamingContainer";
import { ResearchResultCard } from "@/components/research/ResearchResultCard";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { StreamingError } from "@/components/dashboard/StreamingError";
import { ConnectionStatus } from "@/components/dashboard/ConnectionStatus";
import { QuestionApprovalCard } from "@/components/research/QuestionApprovalCard";
import { SearchTermApprovalCard } from "@/components/research/SearchTermApprovalCard";
import { VideoApprovalCard } from "@/components/research/VideoApprovalCard";
import { useResearchForm } from "@/hooks/useResearchForm";
import { useResearchWorkflow } from "@/hooks/useResearchWorkflow";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestSession } from "@/hooks/useGuestSession";
import { GuestWarningBanner } from "@/components/GuestWarningBanner";
import { errorMessages } from "@/config/messages";
import { animationDurations, spacing, colors, typography, borderRadius, researchParticleConfig } from "@/config/visual-effects";
import { cn } from "@/lib/utils";

type ResearchState = "idle" | "processing" | "streaming" | "error" | "awaiting_approval";

/**
 * Main Research Page
 * Phase 4: Main Page Integration
 * 
 * State machine:
 * - idle: Configuration state (form visible)
 * - processing: Processing state with UnifiedStreamingContainer (ResearchProgressSidebar + ResearchResultCard)
 * - streaming: Streaming state with UnifiedStreamingContainer (ResearchProgressSidebar + ResearchResultCard)
 * - error: Error state with ErrorState
 * 
 * Layout: Sidebar always visible during processing/streaming/completed for cleaner UX
 */
export default function ResearchPage() {
  const { t } = useTranslation('research');
  const [state, setState] = React.useState<ResearchState>("idle");
  const form = useResearchForm();
  const workflow = useResearchWorkflow();
  const toast = useToast();
  const { isGuest } = useAuth();
  const { researchCount, hasReachedResearchLimit, canCreateResearch, incrementResearchCount, maxSummaryLimit } = useGuestSession();

  // Sync workflow status with page state
  React.useEffect(() => {
    if (workflow.status === 'idle' && state !== 'idle') {
      setState('idle');
    } else if (
      workflow.status === 'awaiting_question_approval' ||
      workflow.status === 'awaiting_search_term_approval' ||
      workflow.status === 'awaiting_video_approval'
    ) {
      setState('awaiting_approval');
    } else if (
      (workflow.status === 'generating_questions' ||
        workflow.status === 'regenerating_questions' ||
        workflow.status === 'generating_search_terms' ||
        workflow.status === 'regenerating_search_terms' ||
        workflow.status === 'generating_queries' ||
        workflow.status === 'searching_videos' ||
        workflow.status === 'filtering_videos' ||
        workflow.status === 'refiltering_videos' ||
        workflow.status === 'fetching_transcripts') &&
      state !== 'processing'
    ) {
      setState('processing');
    } else if (
      (workflow.status === 'generating_summary' || workflow.status === 'completed') &&
      state !== 'streaming'
    ) {
      setState('streaming');
      if (workflow.status === 'completed') {
        toast.success(t('toasts.researchCompleted'));
      }
    } else if (workflow.status === 'error') {
      setState('error');
    }
  }, [workflow.status, state, toast, t]);

  const handleStartResearch = async () => {
    const formData = form.getFormData();
    if (!formData) {
      toast.warning(t('messages.enterQuery'));
      return;
    }

    if (isGuest && hasReachedResearchLimit) {
      toast.error(errorMessages.researchGuestLimitReached);
      return;
    }

    try {
      await workflow.startJob(formData);
      if (isGuest && canCreateResearch) {
        incrementResearchCount();
      }
    } catch (err) {
      console.error('Failed to start research:', err);
      // Error is already handled in useResearchWorkflow
    }
  };

  const handleNewResearch = () => {
    form.reset();
    workflow.reset();
    setState("idle");
  };

  const handleRetry = () => {
    const formData = form.getFormData();
    if (formData) {
      workflow.startJob(formData).catch(console.error);
    }
  };

  const canSubmit = form.hasValidQuery && !workflow.isStreaming && state === "idle";
  const isSubmitting = workflow.isStreaming && workflow.status === 'idle';

  const showProcessingSidebar =
    (state === "processing" || state === "streaming" || state === "awaiting_approval") &&
    workflow.status !== 'idle' &&
    workflow.status !== 'error';

  // Container visible during processing, streaming, and approval stages
  const showUnifiedContainer = state === "processing" || state === "streaming" || state === "awaiting_approval";

  // Determine which approval card to show
  // Phase 3: Show approval cards during streaming (generating) and awaiting approval
  const showQuestionApproval = 
    workflow.status === 'generating_questions' || 
    workflow.status === 'awaiting_question_approval' || 
    workflow.status === 'regenerating_questions';
  const showSearchTermApproval = 
    workflow.status === 'generating_search_terms' || 
    workflow.status === 'awaiting_search_term_approval' || 
    workflow.status === 'regenerating_search_terms';
  const showVideoApproval = workflow.status === 'awaiting_video_approval' || workflow.status === 'refiltering_videos';

  return (
    <div className={cn(spacing.container.pagePadding, "pointer-events-auto")}>
      {/* Connection Status Banner */}
      {workflow.isStreaming && (
        <ConnectionStatus
          isConnected={workflow.isConnected}
          isReconnecting={workflow.isReconnecting}
          reconnectAttempts={workflow.reconnectAttempts}
          onManualReconnect={workflow.manualReconnect}
        />
      )}

      <div className={cn("mx-auto", spacing.container.maxWidthContent)}>
        {/* Guest Warning Banner */}
        {isGuest && (
          <GuestWarningBanner
            summaryCount={researchCount}
            maxSummaryLimit={maxSummaryLimit}
            dismissible={false}
          />
        )}

        {/* Header - Only show when idle (initial query entry) */}
        {state === "idle" && (
          <div className={cn(spacing.margin.xl, "text-center")}>
            <h1 className={cn(typography.fontSize["3xl"], typography.fontWeight.bold, colors.text.primary, spacing.margin.sm, "px-[15%]")}>
              {t('header.title')}
            </h1>
            <p className={cn(colors.text.secondary, "px-[15%]")}>
              {t('header.subtitle')}
            </p>
          </div>
        )}

        {/* Idle State (Form) - Phase 7: Enhanced transitions */}
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ 
                duration: researchParticleConfig.animationTiming.pageTransition,
                ease: "easeOut"
              }}
              className="pointer-events-auto"
            >
              <div className={cn(
                colors.background.secondary,
                borderRadius.lg,
                "border",
                colors.border.default,
                spacing.padding.lg,
                "space-y-6",
                "pointer-events-auto" // Ensure form container is clickable
              )}>
                <ResearchForm
                  query={form.query}
                  onQueryChange={form.setQuery}
                  language={form.language}
                  onLanguageChange={form.setLanguage}
                  onSubmit={handleStartResearch}
                  disabled={workflow.isStreaming || state !== "idle"}
                  canSubmit={canSubmit}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {state === "error" && workflow.error && (
          workflow.errorType ? (
            <StreamingError
              error={workflow.error}
              errorType={workflow.errorType}
              errorCode={workflow.errorCode}
              onRetry={handleRetry}
              onCancel={handleNewResearch}
            />
          ) : (
            <ErrorState
              error={workflow.error}
              onRetry={handleRetry}
              onCancel={handleNewResearch}
            />
          )
        )}
      </div>

      {/* Unified Container: Processing/Streaming/Approval - Phase 1: UI Layout Unification */}
      <AnimatePresence mode="wait">
        {showUnifiedContainer && (
          <motion.div
            key="unified-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: researchParticleConfig.animationTiming.stateTransition,
              ease: "easeOut"
            }}
            className={cn(spacing.margin.xl, "w-full")}
          >
            <UnifiedStreamingContainer
              showSidebar={showProcessingSidebar}
              sidebar={
                <ResearchProgressSidebar
                  status={workflow.status}
                  progress={workflow.progress}
                  message={workflow.message}
                  generatedQueries={workflow.generatedQueries}
                  rawVideoResults={workflow.rawVideoResults}
                  selectedVideos={workflow.selectedVideos}
                  videoCount={workflow.rawVideoResults?.length}
                  onCancel={state === "processing" ? handleNewResearch : undefined}
                />
              }
            >
              {/* Content Area: Dynamic based on state */}
              {state === "awaiting_approval" ? (
                <motion.div
                  key="approval-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: researchParticleConfig.animationTiming.stateTransition,
                    ease: "easeOut"
                  }}
                  className="space-y-6"
                >
                  {/* Question Approval */}
                  {showQuestionApproval && (workflow.workflowState.questions || workflow.workflowState.partialQuestions) && (
                    <QuestionApprovalCard
                      questions={workflow.workflowState.questions || []}
                      researchQuery={workflow.workflowState.researchQuery || ''}
                      feedbackCount={workflow.workflowState.questionFeedbackCount || 0}
                      isProcessing={workflow.isRegenerating && workflow.regeneratingStage === 'questions'}
                      onApprove={workflow.approveQuestions}
                      onRequestChanges={workflow.regenerateQuestions}
                      // Phase 3: Streaming support
                      isStreaming={workflow.isStreamingQuestions}
                      partialQuestions={workflow.workflowState.partialQuestions}
                    />
                  )}
                  
                  {/* Search Term Approval */}
                  {showSearchTermApproval && (workflow.workflowState.searchTerms || workflow.workflowState.partialSearchTerms) && (
                    <SearchTermApprovalCard
                      searchTerms={workflow.workflowState.searchTerms || []}
                      researchQuery={workflow.workflowState.researchQuery || ''}
                      questions={workflow.workflowState.questions || []}
                      feedbackCount={workflow.workflowState.searchTermFeedbackCount || 0}
                      isProcessing={workflow.isRegenerating && workflow.regeneratingStage === 'search_terms'}
                      onApprove={workflow.approveSearchTerms}
                      onRequestChanges={workflow.regenerateSearchTerms}
                      // Phase 3: Streaming support
                      isStreaming={workflow.isStreamingSearchTerms}
                      partialSearchTerms={workflow.workflowState.partialSearchTerms}
                    />
                  )}
                  
                  {/* Video Approval */}
                  {showVideoApproval && workflow.workflowState.videos && (
                    <VideoApprovalCard
                      videos={workflow.workflowState.videos.map(v => ({
                        ...v,
                        classification: v.classification || 'Direct',
                        why_selected: v.why_selected || '',
                        fills_gap: v.fills_gap || '',
                      }))}
                      researchQuery={workflow.workflowState.researchQuery || ''}
                      questions={workflow.workflowState.questions || []}
                      feedbackCount={workflow.workflowState.videoFeedbackCount || 0}
                      isProcessing={workflow.isRegenerating && workflow.regeneratingStage === 'videos'}
                      onApprove={workflow.approveVideos}
                      onRequestChanges={workflow.regenerateVideos}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="result-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: researchParticleConfig.animationTiming.stateTransition,
                    ease: "easeOut"
                  }}
                >
                  <ResearchResultCard
                    research={workflow.research}
                    streamedText={workflow.streamedText}
                    isStreaming={workflow.status === 'generating_summary'}
                    progress={workflow.progress}
                    title={workflow.title}
                    selectedVideos={workflow.selectedVideos}
                  />
                </motion.div>
              )}
            </UnifiedStreamingContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
