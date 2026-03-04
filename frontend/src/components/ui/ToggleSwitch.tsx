'use client';

/**
 * Phase 4: Settings Page - ToggleSwitch component
 * A toggle switch component for boolean settings
 */

import * as Switch from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';
import { spacing, colors, iconSizes, switchConfig, typography } from '@/config/visual-effects';

export interface ToggleSwitchProps {
  checked?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * ToggleSwitch Component
 * A styled toggle switch for boolean settings
 */
export function ToggleSwitch({
  checked = false,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  // Ensure checked is always a boolean
  const isChecked = Boolean(checked);
  
  return (
    <div className={cn("flex items-start justify-between", spacing.gap.md, className)}>
      <div className={cn("flex-1", spacing.gap.sm)}>
        <label
          htmlFor={`toggle-${label}`}
          className={cn(
            "block",
            typography.fontSize.base,
            typography.fontWeight.medium,
            colors.text.primary,
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {label}
        </label>
        {description && (
          <p className={cn(
            typography.fontSize.sm,
            colors.text.secondary,
            spacing.marginTop.xs
          )}>
            {description}
          </p>
        )}
      </div>
      <Switch.Root
        id={`toggle-${label}`}
        checked={isChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative inline-flex items-center",
          switchConfig.root.height,
          switchConfig.root.width,
          switchConfig.root.borderRadius,
          switchConfig.root.transition,
          isChecked 
            ? switchConfig.states.checked.background 
            : switchConfig.states.unchecked.background,
          switchConfig.focus.outline,
          switchConfig.focus.ring,
          switchConfig.focus.ringColor,
          switchConfig.focus.ringOffset,
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label={label}
      >
        <Switch.Thumb
          className={cn(
            "block rounded-full",
            switchConfig.thumb.height,
            switchConfig.thumb.width,
            switchConfig.thumb.background,
            switchConfig.thumb.shadow,
            switchConfig.thumb.transition,
            isChecked 
              ? switchConfig.states.checked.thumbTranslate 
              : switchConfig.states.unchecked.thumbTranslate
          )}
        />
      </Switch.Root>
    </div>
  );
}

