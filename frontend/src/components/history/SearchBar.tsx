'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Search Bar Component
 * Provides search functionality for the history page
 */
export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const { t } = useTranslation('history');
  const searchPlaceholder = placeholder || t('search.placeholder');
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4',
          colors.text.muted
        )} />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className={cn(
            'pl-10 pr-10',
            colors.background.secondary,
            colors.border.default,
            colors.text.primary,
            borderRadius.md
          )}
        />
        {value && (
          <button
            onClick={handleClear}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'flex items-center justify-center',
              'h-5 w-5 rounded-full',
              colors.text.muted,
              'hover:text-theme-text-secondary',
              'transition-colors'
            )}
            aria-label={t('search.clear')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

