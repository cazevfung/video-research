'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, borderRadius, zIndex, shadows } from '@/config/visual-effects';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { animationDurations } from '@/config/visual-effects';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onClearSelection: () => void;
  isDeleting?: boolean;
}

/**
 * Bulk Actions Bar Component
 * Shows actions for selected items in bulk selection mode
 */
export function BulkActionsBar({
  selectedCount,
  onDelete,
  onClearSelection,
  isDeleting = false,
}: BulkActionsBarProps) {
  const { t } = useTranslation('history');
  
  if (selectedCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: animationDurations.pageTransition }}
      className={cn(
        'fixed bottom-0 left-0 right-0',
        zIndex.modal,
        'border-t',
        colors.border.default,
        colors.background.secondary,
        spacing.padding.md,
        shadows.card
      )}
    >
      <div className={cn('mx-auto max-w-7xl flex items-center justify-between', spacing.gap.md)}>
        <div className={cn('flex items-center', spacing.gap.md)}>
          <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
            {t('selection.itemsSelected', { count: selectedCount })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className={cn('flex items-center', spacing.gap.xs)}
          >
            <X className="h-4 w-4" />
            {t('selection.clear')}
          </Button>
        </div>
        <div className={cn('flex items-center', spacing.gap.sm)}>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className={cn(
              'flex items-center',
              spacing.gap.sm,
              colors.status.error,
              colors.statusBorder.error,
              'opacity-50 hover:opacity-100',
              'hover:bg-dashboard-bg-error-secondary/10'
            )}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? t('actions.deleting') : t('actions.delete')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

