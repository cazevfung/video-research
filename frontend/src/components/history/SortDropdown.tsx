'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/visual-effects';
import { cn } from '@/lib/utils';

export type SortField = 'date';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
  labelKey: string; // Translation key instead of hardcoded label
}

// Create SORT_OPTIONS with translation keys (date only: creation date)
export function getSortOptions(t: (key: string) => string): SortOption[] {
  return [
    { field: 'date', order: 'desc', labelKey: 'sort.dateNewest' },
    { field: 'date', order: 'asc', labelKey: 'sort.dateOldest' },
  ];
}

export const SORT_OPTIONS: SortOption[] = [
  { field: 'date', order: 'desc', labelKey: 'sort.dateNewest' },
  { field: 'date', order: 'asc', labelKey: 'sort.dateOldest' },
];

interface SortDropdownProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
}

/**
 * Sort Dropdown Component
 * Provides sorting options for the history page
 */
export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const { t } = useTranslation('history');
  const getIcon = (_field: SortField) => Calendar;

  const getOrderIcon = (order: SortOrder) => {
    return order === 'asc' ? ArrowUp : ArrowDown;
  };

  const Icon = getIcon(value.field);
  const OrderIcon = getOrderIcon(value.order);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'flex items-center',
            spacing.gap.sm,
            'bg-theme-bg-card hover:bg-theme-bg-card-hover'
          )}
          style={{
            backgroundColor: "var(--color-theme-bg-card)", // CSS variable
          }}
        >
          <ArrowUpDown className="h-4 w-4" />
          <span className={cn(typography.fontSize.base, 'hidden sm:inline')}>
            {t('sort.label')}
          </span>
          <OrderIcon className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('sort.sortBy')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SORT_OPTIONS.map((option) => {
          const OptionIcon = getIcon(option.field);
          const OptionOrderIcon = getOrderIcon(option.order);
          const isSelected = value.field === option.field && value.order === option.order;

          return (
            <DropdownMenuItem
              key={`${option.field}-${option.order}`}
              onClick={() => onChange(option)}
              className={cn(
                'flex items-center justify-between',
                spacing.gap.sm,
                isSelected && colors.background.tertiary
              )}
            >
              <div className={cn('flex items-center', spacing.gap.sm)}>
                <OptionIcon className="h-4 w-4" />
                <span>{t(option.labelKey)}</span>
              </div>
              {isSelected && (
                <OptionOrderIcon className={cn('h-3 w-3', colors.text.secondary)} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


