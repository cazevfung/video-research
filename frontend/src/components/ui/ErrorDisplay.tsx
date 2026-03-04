'use client';

/**
 * Phase 7: Error Display Component
 * Provides a consistent error display UI with retry functionality
 */

import * as React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { RetryButton } from './RetryButton';
import { cn } from '@/lib/utils';
import { colors, typography } from '@/config/visual-effects';
import { ApiError } from '@/lib/api';

export interface ErrorDisplayProps {
  error: ApiError | string | null;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  retrying?: boolean;
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * ErrorDisplay Component
 * Displays error messages with optional retry functionality
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  retrying = false,
  compact = false,
  showDetails = false,
  className,
}: ErrorDisplayProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorCode = typeof error === 'object' ? error.code : undefined;
  const errorDetails = typeof error === 'object' ? error.details : undefined;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-2 p-2 rounded-md',
          colors.statusBackground.error,
          className
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertCircle className={cn('h-4 w-4 flex-shrink-0', colors.status.error)} />
          <p className={cn(typography.fontSize.sm, colors.status.error, 'truncate')}>
            {errorMessage}
          </p>
        </div>
        {onRetry && (
          <RetryButton onRetry={onRetry} retrying={retrying} size="sm" variant="ghost" />
        )}
        {onDismiss && !onRetry && (
          <button
            onClick={onDismiss}
            className={cn(
              'p-1 rounded hover:bg-black/10 transition-colors',
              colors.text.secondary
            )}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        colors.statusBackground.error,
        'border-red-500/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className={cn('h-5 w-5 mt-0.5 flex-shrink-0', colors.status.error)} />
        <div className="flex-1 min-w-0">
          <p className={cn(typography.fontSize.base, typography.fontWeight.medium, colors.status.error)}>
            {errorMessage}
          </p>
          {errorCode && showDetails && (
            <p className={cn(typography.fontSize.xs, colors.text.tertiary, 'mt-1 font-mono')}>
              Error Code: {errorCode}
            </p>
          )}
          {errorDetails && showDetails && typeof errorDetails === 'object' && (
            <div className={cn(typography.fontSize.xs, colors.text.tertiary, 'mt-2')}>
              {errorDetails.suggestions && Array.isArray(errorDetails.suggestions) && (
                <ul className="list-disc list-inside space-y-1">
                  {errorDetails.suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      {(onRetry || onDismiss) && (
        <div className="flex items-center justify-end gap-2 mt-4">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={cn(
                cn('px-3 py-1.5 rounded-md font-medium transition-colors', typography.fontSize.sm),
                colors.text.secondary,
                'hover:bg-black/10'
              )}
            >
              Dismiss
            </button>
          )}
          {onRetry && (
            <RetryButton onRetry={onRetry} retrying={retrying} size="sm" />
          )}
        </div>
      )}
    </div>
  );
}

