"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { UrlInputArea } from "@/components/dashboard/UrlInputArea";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { Button } from "@/components/ui/Button";
import { ProcessingSidebar } from "@/components/dashboard/ProcessingSidebar";
import { UnifiedStreamingContainer } from "@/components/dashboard/UnifiedStreamingContainer";
import { ResultCard } from "@/components/dashboard/ResultCard";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { StreamingError } from "@/components/dashboard/StreamingError";
import { ConnectionStatus } from "@/components/dashboard/ConnectionStatus";
import { OnboardingTooltip } from "@/components/ui/OnboardingTooltip";
import { useSummaryForm } from "@/hooks/useSummaryForm";
import { useSummaryStream } from "@/hooks/useSummaryStream";
import { useToast } from "@/contexts/ToastContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestSession } from "@/hooks/useGuestSession";
import { GuestWarningBanner } from "@/components/GuestWarningBanner";
import { errorMessages } from "@/config/messages";
import { Loader2 } from "lucide-react";
import { animationDurations, spacing, colors, typography, borderRadius } from "@/config/visual-effects";
import { TaskPanel } from "@/components/tasks/TaskPanel";
import { cn } from "@/lib/utils";

type DashboardState = "idle" | "processing" | "streaming" | "error";

/**
 * Main Dashboard Page
 * Phase 5: Animation & Visual Effects
 * Unified Layout: Clean sidebar layout with always-visible ProcessingSidebar
 * 
 * State machine:
 * - idle: Configuration state
 * - processing: Processing state with UnifiedStreamingContainer (ProcessingSidebar + ResultCard)
 * - streaming: Streaming state with UnifiedStreamingContainer (ProcessingSidebar + ResultCard)
 * - error: Error state with ErrorState
 * 
 * Layout: Sidebar always visible during processing/streaming/completed for cleaner UX
 */
export default function DashboardPage() {
  const { t } = useTranslation('summary');
  const [state, setState] = React.useState<DashboardState>("idle");
  const [submittedUrls, setSubmittedUrls] = React.useState<string[]>([]);
  const form = useSummaryForm();
  const stream = useSummaryStream();
  const toast = useToast();
  const { isGuest } = useAuth();
  const { summaryCount, hasReachedLimit, incrementCount, maxSummaryLimit } = useGuestSession();

  // Sync stream status with dashboard state
  React.useEffect(() => {
    if (stream.status === 'idle' && state !== 'idle') {
      setState('idle');
    } else if (
      (stream.status === 'connected' ||
        stream.status === 'fetching' ||
        stream.status === 'processing' ||
        stream.status === 'condensing' ||
        stream.status === 'aggregating') &&
      state !== 'processing'
    ) {
      setState('processing');
    } else if (
      (stream.status === 'generating' || stream.status === 'completed') &&
      state !== 'streaming'
    ) {
      setState('streaming');
      if (stream.status === 'completed') {
        toast.success('Summary completed!');
      }
    } else if (stream.status === 'error') {
      setState('error');
    }
  }, [stream.status, state, toast]);

  const handleSummarize = async () => {
    const formData = form.getFormData();
    if (!formData) {
      toast.warning('Please provide at least one valid YouTube URL');
      return;
    }

    // Phase 3: Check guest limit before creating summary
    if (isGuest && hasReachedLimit) {
      toast.error(errorMessages.guestLimitReached);
      return;
    }

    // Phase 2: Store submitted URLs for display
    setSubmittedUrls(formData.urls);

    try {
      // Phase 4: Track summary creation started
      const analytics = await import('@/utils/analytics');
      analytics.trackSummaryCreationStarted(isGuest || false, formData.urls.length);
      
      await stream.startJob(formData);
      // Phase 3: Increment guest summary count after successful job start
      if (isGuest && !hasReachedLimit) {
        incrementCount();
      }
      // Phase 4: Track summary creation completed
      analytics.trackSummaryCreationCompleted(isGuest || false, true);
      // State will be updated via useEffect when stream.status changes
    } catch (err) {
      // Phase 4: Track summary creation failed
      const analytics = await import('@/utils/analytics');
      const errorCode = err instanceof Error && 'code' in err ? String(err.code) : undefined;
      analytics.trackSummaryCreationFailed(isGuest || false, errorCode);
      // Error is already handled by the stream hook and displayed via toast
      console.error('Failed to start job:', err);
    }
  };

  const handleNewBatch = () => {
    form.reset();
    stream.reset();
    setSubmittedUrls([]); // Phase 2: Clear submitted URLs
    setState("idle");
  };

  const handleRetry = () => {
    const formData = form.getFormData();
    if (formData) {
      stream.startJob(formData).catch(console.error);
    }
  };

  const canSubmit = form.hasValidUrls && form.preset !== null && !stream.isStreaming && state === "idle";
  const isSubmitting = stream.isStreaming && stream.status === 'idle';

  // Unified Layout: Sidebar always visible during processing/streaming/completed
  // Show sidebar during all processing states (not just streaming)
  const showProcessingSidebar = 
    (state === "processing" || state === "streaming") &&
    stream.status !== 'idle' &&
    stream.status !== 'error';

  // Show unified container during processing and streaming (not just streaming)
  const showUnifiedContainer = state === "processing" || state === "streaming";

  // Phase 7: Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Enter',
      ctrl: true,
      action: () => {
        if (canSubmit && state === "idle") {
          handleSummarize();
        }
      },
      description: 'Submit form',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => {
        if (state !== "idle") {
          handleNewBatch();
        }
      },
      description: 'New batch',
    },
  ], state === "idle" || state === "streaming");

  return (
    <div className={spacing.container.pagePadding}>
      {/* Phase 7: Connection Status Banner */}
      {stream.isStreaming && (
        <ConnectionStatus
          isConnected={stream.isConnected}
          isReconnecting={stream.isReconnecting}
          reconnectAttempts={stream.reconnectAttempts}
          onManualReconnect={stream.manualReconnect}
        />
      )}

      <div className={cn("mx-auto", spacing.container.maxWidthContent)}>
        {/* Phase 3: Guest Warning Banner */}
        {isGuest && (
          <GuestWarningBanner
            summaryCount={summaryCount}
            maxSummaryLimit={maxSummaryLimit}
            dismissible={false}
          />
        )}

        {/* State Machine: Idle State (Configuration) */}
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: animationDurations.pageTransition }}
            >
              <div className={cn(
                colors.background.secondary,
                "backdrop-blur",
                borderRadius.lg,
                "border",
                colors.border.default,
                spacing.padding.lg,
                "space-y-6"
              )}>
                {/* URL Input Area */}
                <div>
                  <OnboardingTooltip
                    content={t('tooltips.urlInput')}
                    storageKey="onboarding-url-input-seen"
                  >
                    <label className={cn("block", typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary, spacing.margin.md)}>
                      {t('form.urlLabel')}
                    </label>
                  </OnboardingTooltip>
                  <UrlInputArea
                    value={form.urlText}
                    onChange={form.setUrlText}
                  />
                </div>

                {/* Control Panel */}
                <OnboardingTooltip
                  content={t('tooltips.controlPanel')}
                  storageKey="onboarding-control-panel-seen"
                >
                  <div>
                    <ControlPanel
                      selectedPreset={form.preset}
                      onPresetChange={form.setPreset}
                      customPrompt={form.customPrompt}
                      onCustomPromptChange={form.setCustomPrompt}
                      language={form.language}
                      onLanguageChange={form.setLanguage}
                    />
                  </div>
                </OnboardingTooltip>

                {/* Action Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSummarize}
                    disabled={!canSubmit}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting || stream.isStreaming ? (
                      <>
                        <Loader2 className={cn("mr-2 h-4 w-4 animate-spin")} />
                        {isSubmitting ? t('form.starting') : t('form.processing')}
                      </>
                    ) : (
                      t('form.summarize')
                    )}
                  </Button>
                  {!form.hasValidUrls && form.urlText.trim().length > 0 && (
                    <p className={cn(spacing.margin.sm, typography.fontSize.sm, colors.text.tertiary, "text-center")}>
                      {t('messages.pasteUrl')}
                    </p>
                  )}
                  {form.hasValidUrls && !form.preset && (
                    <p className={cn(spacing.margin.sm, typography.fontSize.sm, colors.text.tertiary, "text-center")}>
                      {t('messages.selectPreset')}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State - Phase 5: Use StreamingError for streaming-specific errors */}
        {state === "error" && stream.error && (
          stream.errorType ? (
            <StreamingError
              error={stream.error}
              errorType={stream.errorType}
              errorCode={stream.errorCode}
              onRetry={handleRetry}
              onCancel={handleNewBatch}
            />
          ) : (
            <ErrorState
              error={stream.error}
              onRetry={handleRetry}
              onCancel={handleNewBatch}
            />
          )
        )}
      </div>

      {/* Unified container for processing and streaming (ProcessingSidebar + ResultCard) */}
      {/* Sidebar always visible during processing/streaming/completed for cleaner layout */}
      {/* Layout matches test/layout page: w-full wrapper with spacing.margin.xl, outside max-width container */}
      {showUnifiedContainer && (
        <div className={cn(spacing.margin.xl, "w-full")}>
          <UnifiedStreamingContainer
            showSidebar={showProcessingSidebar}
            sidebar={
              <ProcessingSidebar
                status={stream.status}
                progress={stream.progress}
                message={stream.message}
                isStreaming={stream.status === 'generating'}
                isCompleted={stream.isCompleted || stream.status === 'completed'}
                isCompleting={stream.isCompleting}
                videoCount={stream.videoCount}
                completedVideos={stream.completedVideos}
                submittedUrls={submittedUrls}
                onCancel={state === "processing" ? handleNewBatch : undefined}
              />
            }
          >
            <ResultCard
              summary={stream.summary}
              streamedText={stream.streamedText}
              isStreaming={stream.status === 'generating'}
              progress={stream.progress}
              title={stream.title}
              submittedUrls={submittedUrls}
            />
          </UnifiedStreamingContainer>
        </div>
      )}

      {/* Phase 3: Task Panel for multiple simultaneous tasks */}
      <TaskPanel />
    </div>
  );
}
