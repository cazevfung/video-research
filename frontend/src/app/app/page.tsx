"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { UrlInputArea } from "@/components/dashboard/UrlInputArea";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { Button } from "@/components/ui/Button";
import { ProcessingOverlay } from "@/components/dashboard/ProcessingOverlay";
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
import { animationDurations, layoutConfig, spacing, colors, typography, borderRadius } from "@/config/visual-effects";
import { TaskPanel } from "@/components/tasks/TaskPanel";
import { cn } from "@/lib/utils";

type DashboardState = "idle" | "processing" | "streaming" | "error";

/**
 * Main Dashboard Page
 * Phase 5: Animation & Visual Effects
 * 
 * State machine:
 * - idle: Configuration state
 * - processing: Active/whimsical state with ProcessingOverlay
 * - streaming: Result display state with ResultCard
 * - error: Error state with ErrorState
 */
export default function DashboardPage() {
  const { t } = useTranslation(['summary', 'common']);
  const [state, setState] = React.useState<DashboardState>("idle");
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [submittedUrls, setSubmittedUrls] = React.useState<string[]>([]);
  const form = useSummaryForm();
  const stream = useSummaryStream();
  const toast = useToast();
  const { isGuest } = useAuth();
  const { summaryCount, hasReachedLimit, incrementCount, maxSummaryLimit } = useGuestSession();

  // Detect desktop breakpoint
  React.useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= layoutConfig.breakpoints.desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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
        toast.success(t('common:messages.summaryCompleted'));
      }
    } else if (stream.status === 'error') {
      setState('error');
    }
  }, [stream.status, state, toast]);

  const handleSummarize = async () => {
    const formData = form.getFormData();
    if (!formData) {
      toast.warning(t('common:messages.pleaseProvideUrl'));
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
      const { trackSummaryCreationStarted, trackSummaryCreationCompleted, trackSummaryCreationFailed } = await import('@/utils/analytics');
      trackSummaryCreationStarted(isGuest || false, formData.urls.length);
      
      await stream.startJob(formData);
      // Phase 3: Increment guest summary count after successful job start
      if (isGuest && !hasReachedLimit) {
        incrementCount();
      }
      // Phase 4: Track summary creation completed
      trackSummaryCreationCompleted(isGuest || false, true);
      // State will be updated via useEffect when stream.status changes
    } catch (err) {
      // Phase 4: Track summary creation failed
      const { trackSummaryCreationFailed } = await import('@/utils/analytics');
      const errorCode = err instanceof Error && 'code' in err ? String(err.code) : undefined;
      trackSummaryCreationFailed(isGuest || false, errorCode);
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

  // Phase 2: Determine if processing overlay should be visible
  // Show overlay during processing or during completion animation
  const showProcessingOverlay = state === "processing" || 
    (state === "streaming" && (stream.status === "generating" || stream.isCompleting));

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

        {/* Header */}
        <div className={cn(spacing.margin.xl, "text-center")}>
          <h1 className={cn(typography.fontSize["3xl"], typography.fontWeight.bold, colors.text.primary, spacing.margin.sm, "px-[15%]")}>
            {t('dashboard:title')}
          </h1>
          <p className={cn(colors.text.secondary, "px-[15%]")}>
            {t('dashboard:subtitle')}
          </p>
        </div>

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
                  <label className={cn("block", typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary, spacing.margin.md)}>
                    {t('dashboard:form.urlLabel')}
                  </label>
                  <UrlInputArea
                    value={form.urlText}
                    onChange={form.setUrlText}
                    textareaWrapper={(textarea) => (
                      <OnboardingTooltip
                        content={t('common:tooltips.pasteUrls')}
                        storageKey="onboarding-url-input-seen"
                        side="left"
                      >
                        {textarea}
                      </OnboardingTooltip>
                    )}
                  />
                </div>

                {/* Control Panel */}
                <OnboardingTooltip
                  content={t('common:tooltips.selectPreset')}
                  storageKey="onboarding-control-panel-seen"
                  side="left"
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
                        {isSubmitting ? t('dashboard:buttons.starting') : t('dashboard:buttons.processing')}
                      </>
                    ) : (
                      t('dashboard:buttons.summarize')
                    )}
                  </Button>
                  {!form.hasValidUrls && form.urlText.trim().length > 0 && (
                    <p className={cn(spacing.margin.sm, typography.fontSize.sm, colors.text.tertiary, "text-center")}>
                      {t('dashboard:validation.atLeastOneUrl')}
                    </p>
                  )}
                  {form.hasValidUrls && !form.preset && (
                    <p className={cn(spacing.margin.sm, typography.fontSize.sm, colors.text.tertiary, "text-center")}>
                      {t('dashboard:validation.selectPreset')}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Overlay - Full screen when processing, shrinks when streaming */}
        <ProcessingOverlay
          status={stream.status}
          progress={stream.progress}
          message={stream.message}
          show={showProcessingOverlay}
          isStreaming={stream.status === 'generating'}
          isCompleted={stream.isCompleted}
          isCompleting={stream.isCompleting}
          videoCount={stream.videoCount}
          completedVideos={stream.completedVideos}
          submittedUrls={submittedUrls}
          onCancel={state === "processing" ? handleNewBatch : undefined}
        />

        {/* Streaming State - Result Card */}
        <AnimatePresence>
          {state === "streaming" && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animationDurations.pageTransition, ease: "easeOut" as const }}
              className={cn(spacing.margin.xl, "w-full")}
            >
              <ResultCard
                summary={stream.summary}
                streamedText={stream.streamedText}
                isStreaming={stream.status === 'generating'}
                progress={stream.progress}
                title={stream.title}
              />
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

      {/* Phase 3: Task Panel for multiple simultaneous tasks */}
      <TaskPanel />
    </div>
  );
}
