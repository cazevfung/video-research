'use client';

import { SummaryListItem } from '@/types';
import { SummaryCard } from './SummaryCard';
import { motion } from 'framer-motion';
import { historyConfig, animationDurations } from '@/config/visual-effects';

interface SummaryGridProps {
  summaries: SummaryListItem[];
  onSummaryClick: (summary: SummaryListItem) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  showCheckboxes?: boolean;
}

/**
 * Summary Grid Component
 * Responsive grid layout for displaying summary cards
 * - 1 column on mobile (< 640px)
 * - 2 columns on tablet (640px - 1024px)
 * - 3 columns on desktop (> 1024px)
 */
export function SummaryGrid({
  summaries,
  onSummaryClick,
  selectedIds = new Set(),
  onSelect,
  showCheckboxes = false,
}: SummaryGridProps) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className={`grid ${historyConfig.grid.mobile} ${historyConfig.grid.tablet} ${historyConfig.grid.desktop} ${historyConfig.grid.gap}`}>
      {summaries.map((summary, index) => (
        <motion.div
          key={summary._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: animationDurations.pageTransition, delay: index * 0.05 }}
        >
          <SummaryCard
            summary={summary}
            onClick={() => onSummaryClick(summary)}
            isSelected={selectedIds.has(summary._id)}
            onSelect={onSelect ? (selected) => onSelect(summary._id, selected) : undefined}
            showCheckbox={showCheckboxes}
          />
        </motion.div>
      ))}
    </div>
  );
}

