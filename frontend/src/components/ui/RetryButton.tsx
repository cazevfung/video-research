'use client';

/**
 * Phase 7: Retry Button Component
 * Provides a consistent retry UI for failed operations
 */

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface RetryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onRetry: () => void | Promise<void>;
  retrying?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
}

/**
 * RetryButton Component
 * Displays a retry button with loading state
 */
export function RetryButton({
  onRetry,
  retrying = false,
  variant = 'outline',
  size = 'default',
  showIcon = true,
  className,
  children,
  disabled,
  ...props
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (isRetrying || retrying || disabled) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const isLoading = isRetrying || retrying;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRetry}
      disabled={disabled || isLoading}
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {showIcon && (
        <RefreshCw
          className={cn(
            'h-4 w-4 transition-transform',
            isLoading && 'animate-spin'
          )}
        />
      )}
      {children || (isLoading ? 'Retrying...' : 'Retry')}
    </Button>
  );
}


