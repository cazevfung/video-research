"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { colors, typography, spacing, borderRadius, animationDurations } from "@/config/visual-effects";
import { useConfig } from "@/hooks/useConfig";

export interface ApprovalCardProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  showFeedback: boolean;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  feedbackPlaceholder: string;
  regenerationsRemaining: number;
  isProcessing: boolean;
  contextInfo?: React.ReactNode;
  minFeedbackLength?: number;
  maxFeedbackLength?: number;
  // Phase 3: Streaming support
  isStreaming?: boolean; // Whether items are currently streaming
  streamingMessage?: string; // Message to show while streaming
}

/**
 * ApprovalCard Component
 * Phase 3: Generic reusable component for all approval stages
 * 
 * Features:
 * - Display items with custom renderer
 * - Approve/Request Changes buttons
 * - Feedback input with validation
 * - Regeneration count display
 * - Loading states
 * - Race condition prevention (double-click prevention)
 */
export function ApprovalCard<T>({
  title,
  subtitle,
  items = [],
  renderItem,
  showFeedback,
  onApprove,
  onRequestChanges,
  feedbackPlaceholder,
  regenerationsRemaining,
  isProcessing,
  contextInfo,
  minFeedbackLength,
  maxFeedbackLength,
  // Phase 3: Streaming support
  isStreaming = false,
  streamingMessage,
}: ApprovalCardProps<T>) {
  const { t } = useTranslation('research');
  const { config } = useConfig();
  
  // Phase 3: Use config values instead of hardcoded defaults
  // No minimum length requirement - users can submit empty feedback
  const effectiveMinFeedbackLength = minFeedbackLength ?? 0;
  const effectiveMaxFeedbackLength = maxFeedbackLength ?? config?.research?.max_feedback_length ?? 500;
  const [feedback, setFeedback] = React.useState('');
  const [showFeedbackInput, setShowFeedbackInput] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const feedbackLength = feedback.trim().length;
  // Only validate max length, no minimum requirement
  const isValidFeedback = feedbackLength <= effectiveMaxFeedbackLength;
  // Phase 3: Prevent approval/regeneration during streaming
  // Disable approve button when user is typing feedback
  const canApprove = !isSubmitting && !isProcessing && !isStreaming && !(showFeedbackInput && feedback.length > 0);
  const canRequestChanges = showFeedback && regenerationsRemaining > 0 && !isSubmitting && !isProcessing && !isStreaming;

  const handleApprove = async () => {
    if (!canApprove) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onApprove();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('approval.approveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!canRequestChanges) return;
    
    if (!showFeedbackInput) {
      setShowFeedbackInput(true);
      // Focus textarea after animation
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return;
    }

    if (!isValidFeedback) {
      setError(t('approval.maxLength', { max: effectiveMaxFeedbackLength }));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      await onRequestChanges(feedback.trim());
      setFeedback('');
      setShowFeedbackInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('approval.regenerateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelFeedback = () => {
    setFeedback('');
    setShowFeedbackInput(false);
    setError(null);
  };

  return (
    <div
      className={cn(
        colors.background.secondary,
        borderRadius.lg,
        "border",
        colors.border.default,
        spacing.padding.lg,
        "space-y-6",
        "relative"
      )}
    >
      {/* Header */}
      <div className="space-y-2">
        <h2 className={cn(typography.fontSize.xl, typography.fontWeight.bold, colors.text.primary)}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn(typography.fontSize.sm, colors.text.secondary)}>
            {subtitle}
          </p>
        )}
        {contextInfo && (
          <div className="mt-3">
            {contextInfo}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items && items.length > 0 ? (
          <>
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={isStreaming ? { opacity: 0, y: 10 } : false}
                animate={isStreaming ? { opacity: 1, y: 0 } : false}
                transition={{ duration: animationDurations.pageTransition }}
              >
                {renderItem(item, index)}
              </motion.div>
            ))}
            {/* Phase 3: Streaming indicator */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex items-center gap-2",
                  typography.fontSize.sm,
                  colors.text.secondary,
                  spacing.padding.sm,
                  "mt-2"
                )}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{streamingMessage || t('approval.streaming')}</span>
              </motion.div>
            )}
          </>
        ) : (
          <div className="text-sm text-theme-text-secondary text-center py-4">
            {isStreaming ? (
              <div className={cn("flex items-center justify-center gap-2")}>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{streamingMessage || t('approval.streaming')}</span>
              </div>
            ) : (
              t('approval.noItemsAvailable', 'No items available')
            )}
          </div>
        )}
      </div>

      {/* Regeneration Info */}
      {showFeedback && (
        <div className={cn(
          "flex items-center gap-2",
          typography.fontSize.sm,
          regenerationsRemaining > 0 ? colors.text.secondary : colors.status.error
        )}>
          {regenerationsRemaining > 0 ? (
            <>
              <AlertCircle className="h-4 w-4" />
              {t('approval.regenerationsRemaining', { count: regenerationsRemaining })}
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              {t('approval.noRegenerationsLeft')}
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: animationDurations.pageTransition }}
            className={cn(
              "flex items-center gap-2",
              typography.fontSize.sm,
              colors.status.error,
              spacing.padding.sm,
              colors.statusBackground.error,
              borderRadius.md
            )}
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Input */}
      <AnimatePresence>
        {showFeedbackInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: animationDurations.pageTransition }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <label
                htmlFor="feedback-input"
                className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}
              >
                {t('approval.feedbackLabel')}
              </label>
              <textarea
                ref={textareaRef}
                id="feedback-input"
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  setError(null);
                }}
                placeholder={feedbackPlaceholder}
                disabled={isSubmitting || isProcessing}
                rows={4}
                className={cn(
                  "w-full rounded-md border-2 border-theme-border-primary bg-theme-bg-chat-input px-3 py-2",
                  typography.fontSize.sm,
                  "text-theme-text-primary",
                  "backdrop-blur-sm",
                  "placeholder:text-theme-text-quaternary",
                  "focus:border-theme-border-strong focus:outline-none focus:ring-2 focus:ring-theme-border-strong/20",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "resize-none"
                )}
                style={{
                  color: "var(--color-theme-text-primary)",
                }}
              />
              <div className={cn(
                "flex justify-between items-center",
                typography.fontSize.xs,
                isValidFeedback || feedbackLength === 0
                  ? colors.text.secondary
                  : colors.status.error
              )}>
                <span>
                  {feedbackLength}/{effectiveMaxFeedbackLength} {t('approval.characters')}
                </span>
                {feedbackLength > 0 && !isValidFeedback && (
                  <span>
                    {t('approval.maxLength', { max: effectiveMaxFeedbackLength })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelFeedback}
                disabled={isSubmitting || isProcessing}
              >
                {t('approval.cancel')}
              </Button>
              <Button
                onClick={handleRequestChanges}
                disabled={feedback.length === 0 || !isValidFeedback || isSubmitting || isProcessing}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('approval.submitting')}
                  </>
                ) : (
                  t('approval.submitFeedback')
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-theme-border-primary">
        {showFeedback && regenerationsRemaining > 0 && !showFeedbackInput && (
          <Button
            variant="outline"
            onClick={handleRequestChanges}
            disabled={!canRequestChanges}
          >
            {t('approval.requestChanges')}
          </Button>
        )}
        <Button
          onClick={handleApprove}
          disabled={!canApprove}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('approval.approving')}
            </>
          ) : (
            t('approval.approveContinue')
          )}
        </Button>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          colors.background.overlay,
          borderRadius.lg,
          "backdrop-blur-sm"
        )}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className={cn(typography.fontSize.sm, colors.text.primary)}>
              {t('approval.processing')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
