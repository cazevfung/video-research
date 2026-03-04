"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/hooks/useConfig";
import { spacing, colors, borderRadius, typography, statusBackground, statusBorder, shadows } from "@/config/visual-effects";
import { Button } from "@/components/ui/Button";
import { SUPPORTED_LANGUAGES, getLanguageByFullName, DEFAULT_LANGUAGE_CODE, LANGUAGE_CODE_TO_NAME } from "@/config/languages";
import { StyleCard } from "./StyleCard";

export type PromptPreset = string; // Dynamic based on config

export interface ControlPanelProps {
  selectedPreset: PromptPreset | null;
  onPresetChange: (preset: PromptPreset | null) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
}

export function ControlPanel({
  selectedPreset,
  onPresetChange,
  customPrompt,
  onCustomPromptChange,
  language,
  onLanguageChange,
}: ControlPanelProps) {
  const { t } = useTranslation('summary');
  const [customPromptOpen, setCustomPromptOpen] = React.useState(false);
  const [presetsExpanded, setPresetsExpanded] = React.useState(false);
  // Phase 3: Fix hydration error - Only render Radix UI components after client mount
  const [mounted, setMounted] = React.useState(false);
  const { config, loading, error } = useConfig();

  // Phase 3: Set mounted to true after component mounts on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Keep hook order consistent across all renders:
  // this effect must not appear after early returns (loading/error)
  React.useEffect(() => {
    if (selectedPreset === "tldr" || selectedPreset === "detailed") {
      onPresetChange(null);
    }
  }, [selectedPreset, onPresetChange]);

  // Phase 2: Show loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Prompt Presets Skeleton */}
        <div className="space-y-2">
          <div className={cn("h-5 w-32 animate-pulse", colors.background.secondary, borderRadius.md)} />
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          )}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn("h-48 animate-pulse", colors.background.secondary, borderRadius.lg)} />
            ))}
          </div>
        </div>

        {/* Custom Prompt Skeleton */}
        <div className="space-y-2">
          <div className={cn("h-5 w-32 animate-pulse", colors.background.secondary, borderRadius.md)} />
          <div className={cn("h-24 w-full animate-pulse", colors.background.secondary, borderRadius.md)} />
        </div>

        {/* Language Selector Skeleton */}
        <div className="space-y-2">
          <div className={cn("h-5 w-20 animate-pulse", colors.background.secondary, borderRadius.md)} />
          <div className={cn("h-10 w-full animate-pulse", colors.background.secondary, borderRadius.md)} />
        </div>
      </div>
    );
  }

  // Phase 2: Show error state with retry
  if (error) {
    return (
      <div className="space-y-6">
        <div className={cn(
          statusBackground.error,
          "border",
          statusBorder.error,
          borderRadius.lg,
          spacing.padding.md
        )}>
          <p className={cn(typography.fontSize.base, colors.status.error, spacing.margin.sm)}>
            {t('errors.configLoadFailed')}
          </p>
          <p className={cn(typography.fontSize.base, colors.text.muted, spacing.margin.sm)}>
            {error}
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className={cn(spacing.margin.sm)}
          >
            {t('errors.retry')}
          </Button>
        </div>
      </div>
    );
  }

  // Get presets from config, fallback to defaults (must match backend/config.yaml)
  // Filter out disabled styles: tldr and detailed
  const allPresets = config?.preset_styles || ["tldr", "bullet_points", "deep_dive", "tutorial", "detailed"];
  const presets = allPresets.filter(preset => preset !== "tldr" && preset !== "detailed");
  
  // ✅ Use centralized language config (not hardcoded)
  // Map SUPPORTED_LANGUAGES to format needed for dropdown
  // language prop comes in as backend English name (e.g., "Chinese (Simplified)")
  // We display native names but send backend names to API
  const supportedLanguages = SUPPORTED_LANGUAGES.map(lang => ({
    code: lang.code,
    displayName: lang.label, // For UI display: "简体中文 (Chinese Simplified)"
    backendName: lang.fullName, // For API calls: "Chinese (Simplified)"
  }));
  
  const defaultLanguage = config?.default_language || LANGUAGE_CODE_TO_NAME[DEFAULT_LANGUAGE_CODE] || "English";
  const maxPromptLength = config?.custom_prompt_max_length || 500;

  // language prop is backend name (e.g., "Chinese (Simplified)")
  // Convert to display name for UI
  const selectedLanguageBackend = language || defaultLanguage;
  const selectedLanguageInfo = getLanguageByFullName(selectedLanguageBackend);
  const selectedLanguageDisplay = selectedLanguageInfo?.label || selectedLanguageBackend;

  const handlePresetChange = (value: string) => {
    // If clicking the same preset, deselect it
    if (selectedPreset === value) {
      onPresetChange(null);
    } else {
      onPresetChange(value);
    }
  };

  const handleCustomPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxPromptLength) {
      onCustomPromptChange(newValue);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt Presets */}
      <div className="space-y-2">
        <div className={cn("flex items-center justify-between")}>
          <label className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary)}>
            {t('form.promptPresets')}
          </label>
          <button
            type="button"
            onClick={() => setPresetsExpanded(!presetsExpanded)}
            className={cn(
              "flex items-center gap-1 p-1 rounded hover:bg-theme-bg-secondary transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-theme-border-strong",
              typography.fontSize.xs,
              colors.text.secondary
            )}
            aria-label={presetsExpanded ? t('form.collapseStylesAria') : t('form.expandStylesAria')}
            aria-expanded={presetsExpanded}
          >
            <span>{presetsExpanded ? t('form.collapseStyles') : t('form.expandStyles')}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                presetsExpanded && "rotate-180"
              )}
            />
          </button>
        </div>
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        )}>
          {presets.map((preset) => (
            <StyleCard
              key={preset}
              preset={preset}
              isSelected={selectedPreset === preset}
              isExpanded={presetsExpanded}
              onSelect={handlePresetChange}
            />
          ))}
        </div>
      </div>

      {/* Custom Prompt Accordion */}
      {/* Phase 3: Only render Accordion after mount to prevent hydration errors */}
      {mounted ? (
        <Accordion
          type="single"
          collapsible
          value={customPromptOpen ? "custom-prompt" : ""}
          onValueChange={(value) => setCustomPromptOpen(value === "custom-prompt")}
        >
          <AccordionItem value="custom-prompt" className="border-transparent">
            <AccordionTrigger className={cn(typography.fontWeight.medium, colors.text.secondary, "hover:no-underline")}>
              {t('form.customPrompt')}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <textarea
                  value={customPrompt}
                  onChange={handleCustomPromptChange}
                  placeholder={t('form.customPromptPlaceholder')}
                  maxLength={maxPromptLength}
                  className={cn(
                    "w-full",
                    borderRadius.md,
                    "border-2",
                    colors.border.default,
                    "bg-theme-bg-chat-input",
                    spacing.padding.sm,
                    typography.fontSize.sm, // Textarea uses text-sm (12px) to match accordion content
                    "backdrop-blur-sm",
                    "placeholder:text-theme-text-quaternary",
                    colors.text.primary,
                    "focus:" + colors.border.focus,
                    "focus:outline-none focus:ring-2",
                    shadows.focus.ring,
                    "resize-none min-h-[100px]"
                  )}
                />
                <div className={cn("flex justify-between", typography.fontSize.sm, colors.text.tertiary)}>
                  <span>{t('form.customPromptHelper')}</span>
                  <span>{customPrompt.length}/{maxPromptLength}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        // Fallback during SSR - simple div with same structure
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setCustomPromptOpen(!customPromptOpen)}
            className={cn(
              typography.fontSize.base,
              typography.fontWeight.medium,
              colors.text.secondary,
              "hover:no-underline w-full text-left flex items-center justify-between",
              spacing.padding.md
            )}
          >
            {t('form.customPrompt')}
            <ChevronDown className={cn("h-4 w-4 transition-transform", customPromptOpen && "rotate-180")} />
          </button>
          {customPromptOpen && (
            <div className="space-y-2">
              <textarea
                value={customPrompt}
                onChange={handleCustomPromptChange}
                placeholder={t('form.customPromptPlaceholder')}
                maxLength={maxPromptLength}
                className={cn(
                  "w-full",
                  borderRadius.md,
                  "border-2",
                  colors.border.default,
                  "bg-theme-bg-chat-input",
                  spacing.padding.sm,
                  typography.fontSize.base,
                  "backdrop-blur-sm",
                  "placeholder:text-theme-text-quaternary",
                  colors.text.primary,
                  "focus:" + colors.border.focus,
                  "focus:outline-none focus:ring-2",
                  shadows.focus.ring,
                  "resize-none min-h-[100px]"
                )}
              />
              <div className={cn("flex justify-between", typography.fontSize.base, colors.text.tertiary)}>
                <span>{t('form.customPromptHelper')}</span>
                <span>{customPrompt.length}/{maxPromptLength}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Language Selector */}
      <div className="space-y-2">
        <label
          className={cn(typography.fontSize.sm, typography.fontWeight.medium)}
          style={{
            color: "var(--color-theme-text-secondary)", // CSS variable
          }}
        >
          {t('form.language')}
        </label>
        {/* Phase 3: Only render DropdownMenu after mount to prevent hydration errors */}
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex h-10 w-full items-center justify-between",
                  spacing.padding.sm,
                  typography.fontSize.sm,
                  "bg-theme-bg-card hover:bg-theme-bg-card-hover"
                )}
                style={{
                  backgroundColor: "var(--color-theme-bg-card)", // CSS variable
                }}
              >
                <span>{selectedLanguageDisplay}</span>
                <ChevronDown
                  className="h-4 w-4 opacity-50"
                  style={{ color: "var(--color-theme-text-secondary)" }} // CSS variable
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width]"
              style={{
                backgroundColor: "var(--color-theme-bg-card)", // CSS variable
                borderColor: "var(--color-theme-border-primary)", // CSS variable
              }}
            >
              {supportedLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onSelect={() => onLanguageChange(lang.backendName)}
                  className={cn(
                    "cursor-pointer",
                    selectedLanguageBackend === lang.backendName && "bg-theme-bg-card-hover" // Uses CSS variable via Tailwind
                  )}
                >
                  {lang.displayName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Fallback during SSR - simple select
          <select
            value={selectedLanguageBackend}
            onChange={(e) => onLanguageChange(e.target.value)}
            className={cn(
              "flex h-10 w-full items-center justify-between",
              borderRadius.md,
              "border-0 bg-transparent",
              spacing.padding.sm,
              typography.fontSize.sm,
              "focus:outline-none"
            )}
            style={{
              color: "var(--color-theme-text-primary)", // CSS variable
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
    </div>
  );
}

