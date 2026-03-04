'use client';

import * as React from 'react';
import { X, Calendar, Play, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SummaryResponse, ResearchResponse } from '@/types';
import { MarkdownStreamer } from '@/components/dashboard/MarkdownStreamer';
import { Button } from '@/components/ui/Button';
import { ResearchActionButtons } from '@/components/shared/ResearchActionButtons';
import { useSafeFormatDate } from '@/utils/date';
import { colors, spacing, typography, borderRadius, historyConfig, sourceVideosConfig, animationDurations, markdownConfig, iconSizes, buttonConfig } from '@/config/visual-effects';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { CitationContent } from '@/components/shared/CitationContent';
import type { CitationMetadata, CitationUsageMap } from '@/types/citations';
import { generateCitationMap, generateCitationMapFromSourceVideos } from '@/utils/citationMapper';

interface SummaryDetailViewProps {
  summary: SummaryResponse | null;
  research?: ResearchResponse | null; // Phase 4: Support research detail view
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string, type: 'summary' | 'research') => void | Promise<void>;
}

/**
 * Summary Detail View Component
 * Modal for viewing full summary details
 */
export function SummaryDetailView({
  summary,
  research,
  isOpen,
  onClose,
  onDelete,
}: SummaryDetailViewProps) {
  const { t } = useTranslation(['research', 'summary']);
  const isResearch = !!research;
  const tResult = (key: string) => t(isResearch ? `research:result.${key}` : `summary:result.${key}`);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  // Centralized citation data for detail view (research or summary) – same behavior as research hover
  const { citationMetadata, citationUsage } = React.useMemo(() => {
    if (!isOpen) return { citationMetadata: null as CitationMetadata | null, citationUsage: null as CitationUsageMap | null };
    if (research) {
      const citations = (research as any).citations as CitationMetadata | undefined;
      const usage = (research as any).citationUsage as CitationUsageMap | undefined;
      const metadata = citations ?? (research.selected_videos?.length
        ? generateCitationMap(
            research.selected_videos,
            (research as any).raw_video_results ?? (research as any).research_data?.raw_video_results
          )
        : null);
      return { citationMetadata: metadata ?? null, citationUsage: usage ?? null };
    }
    const sourceVideos = summary?.source_videos ?? (summary as any)?.sourceVideos;
    if (sourceVideos?.length) {
      const metadata = generateCitationMapFromSourceVideos(sourceVideos);
      return { citationMetadata: metadata, citationUsage: {} };
    }
    return { citationMetadata: null, citationUsage: null };
  }, [isOpen, research, summary]);

  // Phase 4: Focus Management
  // Store the previously focused element when modal opens
  React.useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      // Restore focus to previously focused element when modal closes
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    }
  }, [isOpen]);

  // Phase 4: Focus trap - prevent tab from escaping modal
  React.useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset scroll position when modal opens
  React.useEffect(() => {
    if (isOpen && contentRef.current) {
      // Reset scroll position to top when modal opens
      contentRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Hide Mermaid error SVGs on history view — never show "Syntax error in text" diagrams
  const hideMermaidErrors = React.useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    el.querySelectorAll('svg[aria-roledescription="error"]').forEach((svg) => {
      const wrapper = (svg.closest('.mermaid-diagram') ?? svg.parentElement) as HTMLElement | null;
      if (wrapper) wrapper.style.display = 'none';
    });
    el.querySelectorAll('div[id^="dmermaid-"], div[id^="mermaid-"]').forEach((div) => {
      const svg = div.querySelector('svg[aria-roledescription="error"]');
      if (svg && div instanceof HTMLElement) div.style.display = 'none';
    });
  }, []);
  React.useEffect(() => {
    if (!isOpen) return;
    hideMermaidErrors();
    const t1 = setTimeout(hideMermaidErrors, 300);
    const t2 = setTimeout(hideMermaidErrors, 1000);
    const observer = new MutationObserver(hideMermaidErrors);
    const root = contentRef.current;
    if (root) observer.observe(root, { childList: true, subtree: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
    };
  }, [isOpen, hideMermaidErrors, summary?._id, research?._id]);

  // Phase 4: Determine which item to display (summary or research)
  const displayItem = summary || research;

  // Call hooks before any early returns to maintain hook order
  const formattedDate = useSafeFormatDate(displayItem?.created_at, 'PPp', 'Unknown date');

  if (!displayItem) return null;

  // Phase 5: Handlers moved to ResearchActionButtons component for consistency
  const handleDelete = async (id: string, type: 'summary' | 'research') => {
    if (!onDelete) return;
    try {
      await onDelete(id, type);
      onClose();
    } catch (err) {
      // Error handling is done in ResearchActionButtons
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0",
              historyConfig.modal.zIndex,
              historyConfig.modal.backdropBlur,
              historyConfig.modal.overlay
            )}
            onClick={onClose}
          />

          {/* Modal Container - Fixed and Centered */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: historyConfig.modal.animationDuration }}
              className={cn(
                "w-full h-full overflow-hidden pointer-events-auto",
                historyConfig.modal.maxWidth,
                historyConfig.modal.maxHeight
              )}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="summary-title"
            >
            <div className="rounded-xl p-6 hover:bg-theme-bg-card-hover transition-colors flex flex-col h-full border border-theme-border-primary bg-theme-bg-card overflow-hidden">
              {/* Header */}
              <div className={cn("flex-shrink-0", "border-b border-theme-border-tertiary pb-2 -mx-6 px-6")}>
                <div className={cn("flex items-start justify-between", spacing.gap.md)}>
                  <div className="flex-1">
                    <h3 
                      id="summary-title"
                      className={cn("tracking-tight", typography.fontSize["2xl"], typography.fontWeight.bold, colors.text.primary)}
                    >
                      {isResearch 
                        ? (research?.research_query || tResult('researchSummary'))
                        : (summary?.batch_title || tResult('summary'))}
                    </h3>
                    <div className={cn(spacing.marginTop.sm, "flex flex-wrap items-center", spacing.gap.md, typography.fontSize.sm, colors.text.tertiary)}>
                      <div className={cn("flex items-center", spacing.gap.xs)}>
                        <Calendar className={iconSizes.sm} />
                        {formattedDate}
                      </div>
                      {((!isResearch && summary?.source_videos && summary.source_videos.length > 0) ||
                        (isResearch && research?.selected_videos && research.selected_videos.length > 0)) && (
                        <div className={cn("flex items-center", spacing.gap.xs)}>
                          <Play className={iconSizes.sm} />
                          {isResearch
                            ? `${research?.selected_videos?.length || 0} ${(research?.selected_videos?.length || 0) === 1 ? t('metadata.video') : t('metadata.videos')}`
                            : `${summary?.source_videos?.length || 0} ${(summary?.source_videos?.length || 0) === 1 ? t('metadata.video') : t('metadata.videos')}`}
                        </div>
                      )}
                      {((!isResearch && summary?.processing_stats?.processing_time_seconds) ||
                        (isResearch && research?.processing_stats?.processing_time_seconds)) && (
                        <div className={colors.text.muted}>
                          {t('metadata.processedIn', { 
                            seconds: Math.round(
                              isResearch
                                ? (research?.processing_stats?.processing_time_seconds || 0)
                                : (summary?.processing_stats?.processing_time_seconds || 0)
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    ref={closeButtonRef}
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className={cn(buttonConfig.iconButton.sm, "p-0")}
                    aria-label="Close"
                  >
                    <X className={iconSizes.sm} />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div ref={contentRef} className="flex-1 overflow-y-auto -mx-6 px-6 pt-6">
                {/* Source Videos / Selected Videos */}
                {((!isResearch && summary?.source_videos && summary.source_videos.length > 0) ||
                  (isResearch && research?.selected_videos && research.selected_videos.length > 0)) && (
                  <div className={spacing.margin.lg}>
                    <h3 className={cn(spacing.margin.sm, typography.fontSize.lg, typography.fontWeight.semibold, colors.text.primary)}>
                      {tResult(isResearch ? 'selectedVideos' : 'sourceVideos')}
                    </h3>
                    <div className={spacing.vertical.sm}>
                      {(isResearch ? research?.selected_videos : summary?.source_videos)?.map((video, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center",
                            spacing.gap.md,
                            borderRadius.md,
                            `border ${colors.border.muted} ${colors.background.tertiary}`,
                            spacing.padding.sm
                          )}
                        >
                          {video.thumbnail && (
                            <div className={sourceVideosConfig.thumbnail.wrapperClass}>
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className={cn(
                                  sourceVideosConfig.thumbnail.objectFit,
                                  sourceVideosConfig.thumbnail.objectPosition,
                                  sourceVideosConfig.thumbnail.borderRadius
                                )}
                                style={{
                                  height: `${sourceVideosConfig.thumbnail.height}px`,
                                  width: `${sourceVideosConfig.thumbnail.width}px`,
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn("truncate", typography.fontWeight.medium, colors.text.primary)}>
                              {video.title}
                            </p>
                            {video.channel && (
                              <p className={cn(typography.fontSize.sm, colors.text.tertiary)}>{video.channel}</p>
                            )}
                            {isResearch && 'classification' in video && (
                              <p className={cn(typography.fontSize.xs, colors.text.muted, spacing.marginTop.xs)}>
                                {tResult('classification')}: {video.classification}
                              </p>
                            )}
                            {video.url && (
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  spacing.marginTop.sm,
                                  "inline-flex items-center",
                                  spacing.gap.xs,
                                  typography.fontSize.xs,
                                  colors.text.muted,
                                  markdownConfig.link.hover // Use markdown config for link hover
                                )}
                              >
                                {tResult('viewOnYouTube')} <ExternalLink className={iconSizes.xs} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary Content – CitationContent sets context so citation hover works for both research and summary */}
                <CitationContent citationMetadata={citationMetadata} citationUsage={citationUsage}>
                  <div>
                    <h3 className={cn(spacing.margin.sm, typography.fontSize.lg, typography.fontWeight.semibold, colors.text.primary)}>
                      {tResult(isResearch ? 'researchSummary' : 'summary')}
                    </h3>
                    <MarkdownStreamer 
                      content={isResearch 
                        ? (research?.final_summary_text || '')
                        : (summary?.final_summary_text || '')} 
                      isStreaming={false} 
                    />
                  </div>
                </CitationContent>
              </div>

              {/* Footer Actions */}
              <div className={cn("flex-shrink-0", "border-t border-theme-border-tertiary -mx-6 px-4 py-3")}>
                <div className={cn("flex items-center justify-end")}>
                  <ResearchActionButtons
                    researchId={isResearch ? (research?._id || (research as any)?.id) : summary?._id}
                    researchType={isResearch ? 'research' : 'summary'}
                    content={isResearch 
                      ? (research?.final_summary_text || '')
                      : (summary?.final_summary_text || '')}
                    title={isResearch
                      ? (research?.research_query || 'research')
                      : (summary?.batch_title || 'summary')}
                    onDelete={onDelete ? handleDelete : undefined}
                    showShare={true}
                    shareSource="detail"
                    buttonSize="sm"
                    buttonVariant="outline"
                  />
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

