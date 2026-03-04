"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { spacing, colors, borderRadius, typography, animationDurations } from "@/config/visual-effects";

interface SubmittedUrlsProps {
  urls: string[];
  className?: string;
}

/**
 * SubmittedUrls Component
 * Displays submitted URLs with validation status
 * Phase 2: Dashboard Improvements
 */
export function SubmittedUrls({ urls, className }: SubmittedUrlsProps) {
  const { t } = useTranslation('summary');
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!urls || urls.length === 0) {
    return null;
  }

  // Validate YouTube URLs
  const validateYouTubeUrl = (url: string): boolean => {
    const trimmed = url.trim();
    if (!trimmed) return false;
    
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
      /^https?:\/\/youtu\.be\/[\w-]+/i,
    ];
    
    return patterns.some(pattern => pattern.test(trimmed));
  };

  const validUrls = urls.filter(url => validateYouTubeUrl(url));
  const invalidUrls = urls.filter(url => !validateYouTubeUrl(url));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animationDurations.pageTransition }}
      className={cn(
        "border",
        colors.border.default,
        borderRadius.md,
        spacing.padding.md,
        colors.background.secondary,
        className
      )}
    >
      <div className={cn("flex items-center justify-between", spacing.margin.sm)}>
        <h3 className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary)}>
          {t('submittedUrls.title', { count: urls.length })}
        </h3>
        {urls.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              typography.fontSize.xs,
              colors.text.muted,
              "hover:text-gray-300 underline"
            )}
          >
            {isExpanded ? t('submittedUrls.showLess') : t('submittedUrls.showAll')}
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {(isExpanded ? urls : urls.slice(0, 3)).map((url, index) => {
          const isValid = validateYouTubeUrl(url);
          return (
            <div
              key={index}
              className={cn(
                "flex items-center",
                spacing.gap.sm,
                spacing.padding.xs,
                borderRadius.sm,
                "hover:bg-gray-800/50"
              )}
            >
              {isValid ? (
                <CheckCircle2 className={cn("h-4 w-4 flex-shrink-0", colors.status.success)} />
              ) : (
                <XCircle className={cn("h-4 w-4 flex-shrink-0", colors.status.error)} />
              )}
              <span className={cn(
                typography.fontSize.xs,
                isValid ? colors.text.secondary : colors.status.error,
                "truncate flex-1"
              )}>
                {url}
              </span>
              {isValid && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex-shrink-0",
                    colors.text.muted,
                    "hover:text-gray-300"
                  )}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {invalidUrls.length > 0 && (
        <div className={cn(
          spacing.margin.sm,
          typography.fontSize.xs,
          colors.status.error
        )}>
          {t('submittedUrls.invalidUrlsDetected', { count: invalidUrls.length })}
        </div>
      )}
    </motion.div>
  );
}

