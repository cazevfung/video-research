'use client';

import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { cn } from '@/lib/utils';
import { spacing, typography, borderRadius } from '@/config/visual-effects';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ChevronDown, Loader2 } from 'lucide-react';

/**
 * LanguageDropdown Component
 * A dropdown for the navigation bar that allows users to change their language preference.
 * Uses DropdownMenu component with smooth animations. Changes sync immediately via the
 * useLanguagePreference hook.
 */
export function LanguageDropdown() {
  const {
    currentLanguage,
    currentLanguageLabel,
    availableLanguages,
    isChanging,
    changeLanguage,
  } = useLanguagePreference();

  // Find the current language option
  const currentOption = availableLanguages.find(
    (option) => option.value === currentLanguage
  ) || { value: currentLanguage, label: currentLanguageLabel };

  const handleLanguageChange = async (newLanguageCode: string) => {
    if (newLanguageCode !== currentLanguage && !isChanging) {
      await changeLanguage(newLanguageCode);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isChanging}
        className={cn(
          "h-10 px-2 py-1",
          "flex items-center justify-between gap-2",
          "bg-transparent border-0",
          borderRadius.md,
          typography.fontSize.base,
          "min-w-[120px]", // Ensure reasonable width for language names
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors",
          "cursor-pointer",
          "focus:outline-none focus:ring-1 focus:ring-theme-border-primary focus:ring-offset-1"
        )}
        style={{
          color: "var(--color-theme-text-secondary)", // CSS variable
        }}
        aria-label="Select language"
        title="Select language"
      >
        <span className="flex-1 text-left">{currentOption.label}</span>
        {isChanging ? (
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--color-theme-text-secondary)" }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: "var(--color-theme-text-secondary)" }} />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[120px]"
      >
        {availableLanguages.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleLanguageChange(option.value)}
            disabled={isChanging || option.value === currentLanguage}
            className={cn(
              option.value === currentLanguage && "bg-theme-bg-secondary" // Highlight current selection
            )}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
