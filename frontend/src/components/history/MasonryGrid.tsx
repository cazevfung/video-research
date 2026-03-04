'use client';

import { useMemo } from 'react';
import { SummaryListItem } from '@/types';
import { EnhancedSummaryCard } from './EnhancedSummaryCard';
import { motion } from 'framer-motion';
import { masonryConfig } from '@/config/visual-effects';
import { calculateCardSizes, CardSize } from '@/utils/cardSizeCalculator';

interface MasonryGridProps {
  summaries: SummaryListItem[];
  onSummaryClick: (summary: SummaryListItem) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  showCheckboxes?: boolean;
}

/**
 * Dynamic Grid Component
 * CSS Grid-based layout with variable card sizes
 * - 4 columns on desktop (>1280px)
 * - 3 columns on laptop (1024-1280px)
 * - 2 columns on tablet (640-1024px)
 * - 1 column on mobile (<640px)
 */
export function MasonryGrid({
  summaries,
  onSummaryClick,
  selectedIds = new Set(),
  onSelect,
  showCheckboxes = false,
}: MasonryGridProps) {
  // Calculate card sizes for all summaries
  const cardSizes = useMemo(() => {
    if (summaries.length === 0) return [];
    const sizes = calculateCardSizes(summaries);
    // Debug: log sizes distribution
    const distribution = sizes.reduce((acc, size) => {
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {} as Record<CardSize, number>);
    console.log('Card sizes distribution:', distribution);
    console.log('Card sizes array:', sizes);
    return sizes;
  }, [summaries]);

  // Get grid column span classes
  const getGridSpan = (size: CardSize) => {
    const sizeConfig = masonryConfig.cardSizes[size];
    return {
      gridColumn: `span ${sizeConfig.columns}`,
      gridRow: `span ${sizeConfig.rows}`,
    };
  };

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="dynamic-grid">
      {summaries.map((summary, index) => {
        const size = cardSizes[index];
        const gridSpan = getGridSpan(size);

        return (
          <motion.div
            key={summary._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
              ease: 'easeOut' as const,
            }}
            style={{
              ...gridSpan,
            }}
            className="dynamic-grid-item"
            data-size={size}
          >
            <EnhancedSummaryCard
              summary={summary}
              onClick={() => onSummaryClick(summary)}
              isSelected={selectedIds.has(summary._id)}
              onSelect={onSelect ? (selected) => onSelect(summary._id, selected) : undefined}
              showCheckbox={showCheckboxes}
              animationDelay={index * 200}
              size={size}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

