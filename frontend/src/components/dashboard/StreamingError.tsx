"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { errorMessages } from "@/config/messages";
import { animationDurations, typography } from "@/config/visual-effects";
import { cn } from "@/lib/utils";
import type { StreamingErrorType as ResearchStreamingErrorType } from "@/types";

/** Union of research (@/types) and summary stream error types for shared component */
export type StreamingErrorType =
  | ResearchStreamingErrorType
  | "connection"
  | "stream_parsing"
  | "fallback";

interface StreamingErrorProps {
  error: string;
  errorType?: StreamingErrorType;
  errorCode?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

/**
 * StreamingError Component
 * Displays streaming-specific errors with user-friendly messages and recovery options
 * Phase 5: Error Handling & Polish (PRD Section 5.2)
 */
export function StreamingError({
  error,
  errorType = "unknown",
  errorCode,
  onRetry,
  onCancel,
  onDismiss,
}: StreamingErrorProps) {
  const { t } = useTranslation('errors');
  const [open, setOpen] = React.useState(true);

  const errorString = error || errorMessages.somethingWentWrong;

  // Translate technical errors to user-friendly messages
  const getUserFriendlyMessage = (): string => {
    // If error already contains user-friendly message, use it
    if (
      errorString.includes("Connection lost") ||
      errorString.includes("Failed to connect") ||
      errorString.includes("Please try")
    ) {
      return errorString;
    }

    // Map error types to user-friendly messages (research + summary stream types)
    const errorKey = errorType === "network" ? "connection" : errorType;
    return t(`streamingErrors.${errorKey}.message`, { defaultValue: errorString });
  };

  const getErrorTitle = (): string => {
    const errorKey = errorType === "network" ? "connection" : errorType;
    return t(`streamingErrors.${errorKey}.title`, { defaultValue: "Error" });
  };

  const getActionGuidance = (): string | null => {
    const errorKey = errorType === "network" ? "connection" : errorType;
    return t(`streamingErrors.${errorKey}.guidance`, { defaultValue: null });
  };

  const handleClose = () => {
    setOpen(false);
    onDismiss?.();
  };

  const handleRetry = () => {
    setOpen(false);
    onRetry?.();
  };

  const handleCancel = () => {
    setOpen(false);
    onCancel?.();
  };

  const userFriendlyMessage = getUserFriendlyMessage();
  const actionGuidance = getActionGuidance();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent
        className="animate-in zoom-in-95 fade-in"
        onEscapeKeyDown={handleClose}
      >
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: animationDurations.errorState }}
            >
              <AlertCircle className="h-12 w-12 text-gray-400" />
            </motion.div>
          </div>
          <AlertDialogTitle>{getErrorTitle()}</AlertDialogTitle>
          <div className="space-y-2">
            <AlertDialogDescription>{userFriendlyMessage}</AlertDialogDescription>
            {actionGuidance && (
              <p className={cn(typography.fontSize.sm, "text-gray-400 mt-2")}>{actionGuidance}</p>
            )}
            {errorCode && (
              <p className={cn(typography.fontSize.xs, "text-gray-500 mt-2 font-mono")}>
                {t('streamingErrors.errorCode', { code: errorCode })}
              </p>
            )}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {onCancel && (
            <AlertDialogCancel onClick={handleCancel}>{t('common:buttons.cancel')}</AlertDialogCancel>
          )}
          {onRetry && (
            <AlertDialogAction onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('streamingErrors.tryAgain')}
            </AlertDialogAction>
          )}
          {!onRetry && !onCancel && (
            <AlertDialogAction onClick={handleClose}>{t('streamingErrors.ok')}</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


