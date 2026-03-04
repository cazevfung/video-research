'use client';

import * as React from 'react';
import { Copy, Check, Download, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/AlertDialog';
import { ShareButton } from '@/components/research/ShareButton';
import { useToast } from '@/contexts/ToastContext';
import { iconSizes, spacing, colors, buttonConfig, contentActionsLayoutConfig } from '@/config/visual-effects';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface ResearchActionButtonsProps {
  // Research data
  researchId?: string;
  researchType?: 'summary' | 'research';
  
  // Content to copy/export
  content: string;
  title: string;
  
  // Callbacks
  onDelete?: (id: string, type: 'summary' | 'research') => void | Promise<void>;
  
  // Button visibility
  showShare?: boolean;
  showCopy?: boolean;
  showExport?: boolean;
  showDelete?: boolean;
  
  // Styling
  className?: string;
  buttonSize?: 'sm' | 'default' | 'lg';
  buttonVariant?: 'default' | 'outline' | 'ghost';
  
  // Share button source tracking
  shareSource?: 'card' | 'detail' | 'header';
}

/**
 * ResearchActionButtons Component
 * Unified action buttons for research/summary views
 *
 * Used across all views for consistency:
 * - ResultCard (summary generation flow, test/layout)
 * - ResearchResultCard
 * - SummaryDetailView (history detail modal)
 *
 * Configurable buttons: Copy, Share, Export, Delete
 * Each button can be shown/hidden via props.
 */
export function ResearchActionButtons({
  researchId,
  researchType = 'research',
  content,
  title,
  onDelete,
  showShare = true,
  showCopy = true,
  showExport = true,
  showDelete = !!onDelete,
  className,
  buttonSize = 'sm',
  buttonVariant = 'outline',
  shareSource = 'detail',
}: ResearchActionButtonsProps) {
  const { t } = useTranslation('summary');
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t('toasts.copiedToClipboard'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t('toasts.failedToCopy'));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate async operation for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(researchType === 'research' ? t('toasts.researchExported') : t('toasts.summaryExported'));
    } catch (err) {
      toast.error(t('toasts.failedToExport'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !researchId) return;
    
    setIsDeleting(true);
    try {
      await onDelete(researchId, researchType);
      toast.success(researchType === 'research' ? t('toasts.researchDeleted') : t('toasts.summaryDeleted'));
    } catch (err) {
      toast.error(t('toasts.failedToDelete'));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const actionButtonClass = contentActionsLayoutConfig.actionButtons.className;

  return (
    <div className={cn("flex items-center", spacing.gap.sm, className)}>
      {/* Copy Button */}
      {showCopy && (
        <Button
          variant={buttonVariant}
          size={buttonSize}
          onClick={handleCopy}
          className={cn("flex items-center", spacing.gap.sm, actionButtonClass)}
        >
          {copied ? (
            <>
              <Check className={iconSizes.sm} />
              {t('buttons.copiedExclamation')}
            </>
          ) : (
            <>
              <Copy className={iconSizes.sm} />
              {t('buttons.copy')}
            </>
          )}
        </Button>
      )}

      {/* Share Button */}
      {showShare && researchId && (
        <ShareButton
          contentId={researchId}
          contentType={researchType}
          size={buttonSize}
          variant={buttonVariant}
          source={shareSource}
          className={actionButtonClass}
        />
      )}

      {/* Export Button */}
      {showExport && (
        <Button
          variant={buttonVariant}
          size={buttonSize}
          onClick={handleExport}
          disabled={isExporting}
          className={cn("flex items-center", spacing.gap.sm, actionButtonClass)}
        >
          {isExporting ? (
            <>
              <Loader2 className={cn(iconSizes.sm, "animate-spin")} />
              {t('buttons.exporting')}
            </>
          ) : (
            <>
              <Download className={iconSizes.sm} />
              {t('buttons.export')}
            </>
          )}
        </Button>
      )}

      {/* Delete Button */}
      {showDelete && onDelete && researchId && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant={buttonVariant}
              size={buttonSize}
              className={cn(
                "flex items-center",
                spacing.gap.sm,
                actionButtonClass,
                colors.text.muted,
                "hover:text-theme-text-secondary",
                "hover:border-theme-border-tertiary"
              )}
            >
              <Trash2 className={iconSizes.sm} />
              {t('buttons.delete')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteDialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t('deleteDialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className={cn(spacing.marginHorizontal.sm, iconSizes.sm, "animate-spin")} />
                    {t('buttons.deleting')}
                  </>
                ) : (
                  t('deleteDialog.delete')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
