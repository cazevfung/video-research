"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
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
import { WhimsicalLoader } from "./WhimsicalLoader";
import { animationDurations, colors, headerConfig, zIndex } from "@/config/visual-effects";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

/**
 * ErrorState Component
 * Displays error state with shaking orb animation
 * Matches PRD Section 6.1 specifications
 */
export function ErrorState({
  error,
  onRetry,
  onCancel,
}: ErrorStateProps) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      {/* Central Visualization with Error State */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: animationDurations.errorState }}
        className={cn(
          "fixed left-0 right-0 bottom-0 backdrop-blur-sm flex items-center justify-center pointer-events-none",
          zIndex.overlay,
          colors.background.overlay
        )}
        style={{ top: `${headerConfig.heightPx}px` }}
      >
        <div className="flex items-center justify-center min-h-[40vh] md:min-h-[50vh]">
          <WhimsicalLoader status="error" progress={0} />
        </div>
      </motion.div>

      {/* Error Dialog - Using Animate UI Alert Dialog as per PRD Section 6.1 */}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className={cn("h-12 w-12", colors.text.gray400)} />
            </div>
            <AlertDialogTitle>Something went wrong</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {onCancel && (
              <AlertDialogCancel onClick={onCancel}>
                Cancel
              </AlertDialogCancel>
            )}
            {onRetry && (
              <AlertDialogAction onClick={onRetry}>
                Try Again
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

