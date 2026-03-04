'use client';

/**
 * Phase 4: Settings Page - SelectDropdown component
 * A select dropdown component for enum settings using DropdownMenu
 */

import { cn } from '@/lib/utils';
import { spacing, typography, borderRadius } from '@/config/visual-effects';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * SelectDropdown Component
 * A styled select dropdown for enum settings using DropdownMenu component
 * with smooth animations and consistent styling
 */
export function SelectDropdown({
  value,
  onValueChange,
  options,
  label,
  description,
  disabled = false,
  className,
}: SelectDropdownProps) {
  // Find the current option
  const currentOption = options.find((option) => option.value === value) || {
    value,
    label: value,
  };

  const handleValueChange = (newValue: string) => {
    if (newValue !== value && !disabled) {
      onValueChange(newValue);
    }
  };

  return (
    <div className={cn("flex flex-col", spacing.gap.sm, className)}>
      <div className={cn("flex flex-col", spacing.gap.xs)}>
        <label
          htmlFor={`select-${label}`}
          className={cn(
            typography.fontSize.base,
            typography.fontWeight.medium,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            color: "var(--color-theme-text-primary)", // CSS variable
          }}
        >
          {label}
        </label>
        {description && (
          <p
            className={cn(typography.fontSize.sm)}
            style={{
              color: "var(--color-theme-text-secondary)", // CSS variable
            }}
          >
            {description}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          id={`select-${label}`}
          className={cn(
            "h-10 px-3 py-2",
            "flex items-center justify-between gap-2",
            "border bg-theme-bg-card",
            borderRadius.md,
            typography.fontSize.base,
            "focus:outline-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "cursor-pointer",
            "w-full text-left",
            "hover:bg-theme-bg-card-hover",
            "transition-colors"
          )}
          style={{
            color: "var(--color-theme-text-primary)", // CSS variable
            borderColor: "var(--color-theme-border-primary)", // CSS variable
            backgroundColor: "var(--color-theme-bg-card)", // CSS variable
          }}
          aria-label={label}
        >
          <span className="flex-1 text-left">{currentOption.label}</span>
          <ChevronDown
            className="h-4 w-4"
            style={{ color: "var(--color-theme-text-secondary)" }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleValueChange(option.value)}
              disabled={disabled || option.value === value}
              className={cn(
                option.value === value && "bg-theme-bg-secondary" // Highlight current selection
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

