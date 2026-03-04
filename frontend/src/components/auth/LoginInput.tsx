'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colors, spacing, borderRadius, shadows, inputConfig, iconSizes, typography } from '@/config/visual-effects';

export interface LoginInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  showPasswordToggle?: boolean;
}

/**
 * LoginInput Component
 * Reusable input component with label, error display, and password toggle
 * All styling uses centralized config from visual-effects.ts
 */
export const LoginInput = forwardRef<HTMLInputElement, LoginInputProps>(
  ({ label, error, showPasswordToggle = false, type, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = showPasswordToggle && type === 'password' 
      ? (showPassword ? 'text' : 'password')
      : type;

    return (
      <div className="w-full">
        {/* Label */}
        <label
          className={cn(
            'block',
            typography.fontSize.sm,
            'font-medium',
            colors.text.secondary,
            spacing.margin.sm
          )}
          htmlFor={props.id}
        >
          {label}
        </label>

        {/* Input Container */}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full',
              colors.background.primary,
              'border',
              error ? colors.statusBorder.error : colors.border.default,
              borderRadius.md,
              spacing.padding.md,
              colors.text.primary,
              'placeholder:text-theme-text-quaternary',
              'focus:outline-none',
              shadows.focus.ring,
              colors.border.focus,
              inputConfig.transitionDuration,
              'focus:scale-[1.01]',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          />

          {/* Password Toggle */}
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'p-1',
                colors.text.tertiary,
                'hover:text-theme-text-secondary',
                'transition-colors',
                inputConfig.transitionDuration
              )}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className={iconSizes.sm} />
              ) : (
                <Eye className={iconSizes.sm} />
              )}
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${props.id}-error`}
            className={cn(
              'mt-2',
              typography.fontSize.sm,
              colors.status.error,
              'flex items-center gap-1'
            )}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

LoginInput.displayName = 'LoginInput';

