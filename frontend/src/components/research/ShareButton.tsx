"use client";

import * as React from "react";
import { Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { shareResearch, shareSummary } from "@/lib/api";
import { streamingConfig, buttonConfig, iconSizes, spacing } from "@/config/visual-effects";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { trackShareButtonClicked, trackShareLinkCreated, trackShareLinkReused } from "@/utils/analytics";

export type ShareContentType = 'research' | 'summary';

export interface ShareButtonProps {
  /** ID of research or summary to share */
  contentId: string;
  /** Content type - determines which API to call */
  contentType?: ShareContentType;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  source?: "card" | "detail" | "header"; // Phase 5: Track where share button was clicked
  /** @deprecated Use contentId instead */
  researchId?: string;
}

/**
 * ShareButton Component
 * Phase 2: User-facing share functionality
 * 
 * Features:
 * - Generates or retrieves share link
 * - Copies link to clipboard
 * - Shows loading/success states
 * - Uses existing styling configs (not hardcoded)
 * - Handles errors gracefully
 */
export function ShareButton({
  contentId,
  contentType = 'research',
  className,
  size = "sm",
  variant = "outline",
  source = "header",
  researchId: researchIdProp,
}: ShareButtonProps) {
  const id = contentId || researchIdProp;
  const { t } = useTranslation('research');
  const toast = useToast();
  const [isSharing, setIsSharing] = React.useState(false);
  const [justShared, setJustShared] = React.useState(false);

  const handleShare = async () => {
    if (!id) {
      toast.error(t('share.errors.noResearchId', 'ID is required'));
      return;
    }

    trackShareButtonClicked(id, source);

    setIsSharing(true);
    try {
      const response = contentType === 'summary'
        ? await shareSummary(id)
        : await shareResearch(id);

      if (response.error) {
        const errorMessage = response.error.message || t('share.errors.failed', 'Failed to create share link');
        toast.error(errorMessage);
        return;
      }

      if (!response.data) {
        toast.error(t('share.errors.noData', 'No share data received'));
        return;
      }

      // Backend may return { data: { shareUrl, ... } } or nested { data: { data: { ... } } }
      const raw = response.data as { shareId?: string; shareUrl?: string; isNew?: boolean; createdAt?: number; accessCount?: number; data?: typeof response.data };
      const shareData = raw?.data ?? response.data;
      if (!shareData) {
        toast.error(t('share.errors.noData', 'No share data received'));
        return;
      }

      const { shareUrl, isNew, shareId, accessCount } = shareData;
      
      if (!shareUrl) {
        toast.error(t('share.errors.noShareUrl', 'Share URL is missing'));
        console.error('Share response missing shareUrl:', response);
        return;
      }

      if (isNew) {
        trackShareLinkCreated(id, shareId || '', true);
      } else {
        trackShareLinkReused(id, shareId || '', accessCount || 0);
      }

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        
        // Show success state
        setJustShared(true);
        setTimeout(() => setJustShared(false), streamingConfig.copyButton.resetTimeout);

        // Show toast notification
        toast.success(
          t('share.success.message', 'Share link is ready to share'),
          t('share.success.copied', 'Link copied to clipboard!')
        );
      } catch (clipboardError) {
        // Fallback: show URL in toast if clipboard fails
        console.error('Failed to copy to clipboard:', clipboardError);
        toast.info(
          t('share.info.copyFailed', 'Copy failed'),
          shareUrl
        );
      }
    } catch (error) {
      console.error('Error sharing research:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : t('share.errors.unknown', 'An unknown error occurred');
      toast.error(errorMessage);
    } finally {
      setIsSharing(false);
    }
  };

  // Determine icon and text based on state
  const icon = isSharing ? (
    <Loader2 className={cn(buttonConfig.sizes[size].iconSize, "animate-spin")} />
  ) : justShared ? (
    <Check className={cn(
      buttonConfig.sizes[size].iconSize,
      streamingConfig.copyButton.animations.successColor
    )} />
  ) : (
    <Share2 className={buttonConfig.sizes[size].iconSize} />
  );

  const label = justShared
    ? t('share.button.copied', 'Copied')
    : t('share.button.share', 'Share');

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={isSharing || !id}
      className={cn(
        "transition-all flex items-center",
        spacing.gap.sm,
        justShared && streamingConfig.copyButton.animations.successColor,
        className
      )}
      aria-label={label}
    >
      {icon}
      {label}
    </Button>
  );
}
