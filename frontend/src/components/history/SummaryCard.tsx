'use client';

import * as React from 'react';
import { SummaryListItem } from '@/types';
import { useSafeFormatDate } from '@/utils/date';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { Play, Calendar, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { getSummary } from '@/lib/api';
import { colors, spacing, typography, borderRadius, historyConfig, shadows, iconSizes } from '@/config/visual-effects';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  summary: SummaryListItem;
  onClick: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  showCheckbox?: boolean;
}

/**
 * Summary Card Component
 * Displays a summary item in the history grid
 */
export function SummaryCard({
  summary,
  onClick,
  isSelected = false,
  onSelect,
  showCheckbox = false,
}: SummaryCardProps) {
  const toast = useToast();
  const [isExporting, setIsExporting] = React.useState(false);

  const formattedDate = useSafeFormatDate(summary.created_at, 'PPp', 'Unknown date');

  // Get first few thumbnails (max 4)
  const thumbnails = summary.source_videos.slice(0, 4);
  const remainingCount = summary.video_count - thumbnails.length;

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExporting(true);
    try {
      const response = await getSummary(summary._id);
      if (response.error) {
        toast.error(response.error.message || 'Failed to load summary for export');
        return;
      }
      if (response.data) {
        const blob = new Blob([response.data.final_summary_text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${response.data.batch_title || 'summary'}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Summary exported!');
      }
    } catch (err) {
      toast.error('Failed to export summary');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(!isSelected);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: historyConfig.cardHover.scale }}
      whileTap={{ scale: historyConfig.cardHover.tapScale }}
      transition={{ duration: historyConfig.cardHover.transitionDuration }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all",
          "hover:border-theme-border-strong",
          shadows.card,
          isSelected && `border-2 ${colors.border.focus}`
        )}
        onClick={onClick}
      >
        <CardHeader>
          <div className={cn("flex items-start justify-between", spacing.gap.sm)}>
            <div className={cn("flex items-start flex-1", spacing.gap.sm)}>
              {showCheckbox && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={handleCheckboxChange}
                  className={cn(
                    spacing.marginTop.sm,
                    iconSizes.sm,
                    "rounded",
                    colors.border.default,
                    colors.background.secondary,
                    shadows.focus.ring
                  )}
                />
              )}
              <CardTitle className={cn(typography.fontSize.lg, typography.fontWeight.semibold, colors.text.primary, "line-clamp-2 flex-1")}>
                {summary.batch_title}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className={cn("h-8 w-8 p-0 flex-shrink-0")}
              aria-label={isExporting ? "Exporting summary" : "Export summary"}
            >
              {isExporting ? (
                <Loader2 className={cn(iconSizes.sm, "animate-spin")} />
              ) : (
                <Download className={iconSizes.sm} />
              )}
            </Button>
          </div>
          <CardDescription className={cn("flex items-center", spacing.gap.sm, typography.fontSize.sm)}>
            <Calendar className={iconSizes.xs} />
            {formattedDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Thumbnails */}
          {thumbnails.length > 0 && (
            <div className={cn("flex overflow-x-auto", spacing.gap.sm)}>
              {thumbnails.map((video, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative flex-shrink-0 overflow-hidden",
                    borderRadius.md,
                    `border ${colors.border.default} ${colors.background.secondary}`
                  )}
                  style={{
                    height: `${historyConfig.thumbnail.height}px`,
                    width: `${historyConfig.thumbnail.width}px`,
                  }}
                >
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className={cn(
                        "h-full w-full",
                        historyConfig.thumbnail.objectFit,
                        historyConfig.thumbnail.objectPosition
                      )}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className={cn(iconSizes.lg, colors.text.muted)} />
                    </div>
                  )}
                </div>
              ))}
              {remainingCount > 0 && (
                <div
                  className={cn(
                    "flex flex-shrink-0 items-center justify-center",
                    borderRadius.md,
                    `border ${colors.border.default} ${colors.background.secondary}`,
                    typography.fontSize.xs,
                    typography.fontWeight.medium,
                    colors.text.tertiary
                  )}
                  style={{
                    height: `${historyConfig.thumbnail.height}px`,
                    width: `${historyConfig.thumbnail.height}px`,
                  }}
                >
                  +{remainingCount}
                </div>
              )}
            </div>
          )}

          {/* Video Count */}
          <div className={cn("flex items-center", spacing.gap.sm, typography.fontSize.sm, colors.text.tertiary)}>
            <Play className={iconSizes.sm} />
            <span>
              {summary.video_count} {summary.video_count === 1 ? 'video' : 'videos'}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

