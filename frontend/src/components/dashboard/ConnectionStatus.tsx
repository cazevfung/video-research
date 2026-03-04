"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { errorMessages, successMessages, warningMessages, infoMessages, a11yMessages } from "@/config/messages";
import { spacing, headerConfig, zIndex, colors, typography, borderRadius, shadows } from "@/config/visual-effects";
import { reconnectConfig } from "@/config/streaming";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  onManualReconnect?: () => void;
}

/**
 * ConnectionStatus Component
 * Displays connection status and reconnection progress
 * Phase 7: Connection recovery UI (PRD Section 6.2)
 */
export function ConnectionStatus({
  isConnected,
  isReconnecting,
  reconnectAttempts,
  onManualReconnect,
}: ConnectionStatusProps) {
  const toast = useToast();
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    if (!isConnected && !isReconnecting) {
      setShowBanner(true);
    } else {
      // Hide banner after a short delay when connected
      const timer = setTimeout(() => setShowBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isReconnecting]);

  // Don't show banner when reconnecting
  if (isReconnecting) {
    return null;
  }

  if (!showBanner && isConnected) {
    return null;
  }

  // Use connectionLostPermanent only when:
  // - Not reconnecting AND
  // - Max retries exceeded
  const isPermanentFailure = !isConnected && !isReconnecting && reconnectAttempts >= reconnectConfig.maxRetries;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed left-1/2 transform -translate-x-1/2",
            zIndex.banner
          )}
          style={{ top: `${headerConfig.heightPx + headerConfig.bannerSpacing}px` }}
          role="alert"
          aria-live="polite"
          aria-label={
            !isConnected
              ? a11yMessages.connectionStatus("disconnected")
              : a11yMessages.connectionStatus("connected")
          }
        >
          <div className={cn(
            colors.background.gray900,
            "border",
            colors.border.gray700,
            borderRadius.md,
            spacing.padding.md,
            shadows.card,
            "flex items-center",
            spacing.gap.md,
            "min-w-[300px] max-w-md"
          )}>
            {isPermanentFailure ? (
              <>
                <WifiOff className={cn("h-5 w-5", colors.text.gray400)} aria-hidden="true" />
                <div className="flex-1">
                  <p className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.gray200)}>
                    {errorMessages.connectionLostPermanent}
                  </p>
                  {onManualReconnect && (
                    <button
                      onClick={onManualReconnect}
                      className={cn(typography.fontSize.xs, colors.text.gray300, "hover:text-gray-200", "underline", spacing.margin.xs)}
                      aria-label="Manually reconnect"
                    >
                      Try reconnecting
                    </button>
                  )}
                </div>
              </>
            ) : !isConnected ? (
              <>
                <Loader2 className={cn("h-5 w-5", colors.text.gray500, "animate-spin")} aria-hidden="true" />
                <div className="flex-1">
                  <p className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.gray200)}>
                    {errorMessages.connectionLost}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Wifi className={cn("h-5 w-5", colors.text.gray300)} aria-hidden="true" />
                <p className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.gray200)}>
                  {successMessages.connectionRestored}
                </p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

