"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { ResearchQueryInput } from "./ResearchQueryInput";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { spacing, colors, typography, borderRadius, animationDurations } from "@/config/visual-effects";
import { researchFormConfig } from "@/config/research";
import { SUPPORTED_LANGUAGES, getLanguageByFullName, DEFAULT_LANGUAGE_CODE, LANGUAGE_CODE_TO_NAME } from "@/config/languages";

export interface ResearchFormProps {
  query: string;
  onQueryChange: (query: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  canSubmit?: boolean;
}

/**
 * ResearchForm Component
 * Form container for research query input and language selection
 * 
 * Features:
 * - Research query textarea with validation
 * - Language dropdown selection (controlled)
 * - Submit button with loading state
 * - Button disable during submission (prevents double-clicks)
 * - Race condition prevention
 */
export function ResearchForm({
  query,
  onQueryChange,
  language,
  onLanguageChange,
  onSubmit,
  disabled = false,
  canSubmit = false,
}: ResearchFormProps) {
  const { t } = useTranslation('research');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration errors with Radix UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting || !canSubmit) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit();
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, researchFormConfig.submitButtonCooldownMs);
    }
  };

  const isButtonDisabled = !canSubmit || isSubmitting || disabled;

  // Prepare language options from config
  const supportedLanguages = React.useMemo(() => {
    return SUPPORTED_LANGUAGES.map(lang => ({
      code: lang.code,
      displayName: lang.label,
      backendName: lang.fullName, // For API calls
    }));
  }, []);

  // Get current language display name
  const selectedLanguageBackend = language || LANGUAGE_CODE_TO_NAME[DEFAULT_LANGUAGE_CODE] || 'English';
  const selectedLanguageInfo = getLanguageByFullName(selectedLanguageBackend);
  const selectedLanguageDisplay = selectedLanguageInfo?.label || selectedLanguageBackend;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className={cn("space-y-6", "pointer-events-auto")}
    >
      {/* Query Input */}
      <div className="space-y-2">
        <label
          htmlFor="research-query"
          className={cn(
            typography.fontSize.base,
            typography.fontWeight.medium,
            colors.text.primary
          )}
        >
          {t('form.queryLabel')}
        </label>
        <ResearchQueryInput
          value={query}
          onChange={onQueryChange}
          disabled={disabled || isSubmitting}
        />
      </div>

      {/* Language Selection */}
      <div className="space-y-2">
        <label
          htmlFor="research-language"
          className={cn(
            typography.fontSize.base,
            typography.fontWeight.medium,
            colors.text.primary
          )}
        >
          {t('form.languageLabel')}
        </label>
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={disabled || isSubmitting}
              className={cn(
                "flex h-10 w-full items-center justify-between",
                borderRadius.md,
                "border-2",
                colors.border.default,
                "bg-theme-bg-chat-input",
                spacing.padding.sm,
                typography.fontSize.base,
                "backdrop-blur-sm",
                "focus:outline-none focus:ring-2",
                colors.text.primary,
                "focus:" + colors.border.focus,
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
              style={{
                color: "var(--color-theme-text-primary)",
              }}
            >
              <span>{selectedLanguageDisplay}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width]"
              style={{
                backgroundColor: "var(--color-theme-bg-card)",
                borderColor: "var(--color-theme-border-primary)",
              }}
            >
              {supportedLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onSelect={() => onLanguageChange(lang.backendName)}
                  className={cn(
                    "cursor-pointer",
                    selectedLanguageBackend === lang.backendName && "bg-theme-bg-secondary"
                  )}
                >
                  {lang.displayName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Fallback during SSR
          <select
            value={selectedLanguageBackend}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={disabled || isSubmitting}
            className={cn(
              "flex h-10 w-full items-center justify-between",
              borderRadius.md,
              "border-2",
              colors.border.default,
              "bg-theme-bg-chat-input",
              spacing.padding.sm,
              typography.fontSize.base,
              "focus:outline-none",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{
              color: "var(--color-theme-text-primary)",
            }}
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.backendName}>
                {lang.displayName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isButtonDisabled}
          className={cn(
            "min-w-[140px]",
            "transition-all",
            animationDurations.pageTransition
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('form.starting')}
            </>
          ) : (
            t('form.startResearch')
          )}
        </Button>
      </div>
    </form>
  );
}
