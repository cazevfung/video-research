"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { typography, spacing, colors, borderRadius, inputConfig, shadows } from "@/config/visual-effects";
import { researchConfig } from "@/config/research";

export interface ResearchQueryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MIN_QUERY_LENGTH = researchConfig.query.minLength;

/**
 * Validates research query length
 */
function validateQuery(query: string): { isValid: boolean; isTooShort: boolean } {
  const trimmed = query.trim();
  const length = trimmed.length;
  
  if (length === 0) {
    return { isValid: false, isTooShort: false };
  }
  
  const isTooShort = length < MIN_QUERY_LENGTH;
  const isValid = !isTooShort;
  
  return { isValid, isTooShort };
}

export function ResearchQueryInput({ 
  value, 
  onChange, 
  placeholder,
  disabled = false 
}: ResearchQueryInputProps) {
  const { t } = useTranslation('research');
  const [focused, setFocused] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const validation = React.useMemo(() => validateQuery(value), [value]);
  const characterCount = value.length;

  // Track error state for pulse animation
  React.useEffect(() => {
    if (!validation.isValid && value.trim().length > 0) {
      setHasError(true);
      // Remove pulse animation after 2 seconds
      const timer = setTimeout(() => {
        setHasError(false);
      }, inputConfig.pulseDuration);
      return () => clearTimeout(timer);
    } else {
      setHasError(false);
    }
  }, [validation.isValid, value]);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(textarea.scrollHeight, inputConfig.textarea.maxHeightPx);
      textarea.style.height = `${Math.max(scrollHeight, inputConfig.textarea.minHeightPx)}px`;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const getValidationMessage = (): string | null => {
    if (value.trim().length === 0) {
      return null;
    }
    
    if (validation.isTooShort) {
      return t('messages.queryTooShort', { min: MIN_QUERY_LENGTH });
    }
    
    return null;
  };

  const validationMessage = getValidationMessage();
  const showWarning = characterCount > 0 && !validation.isValid;
  const showSuccess = validation.isValid;

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", "pointer-events-auto")}>
        <div className="relative block" style={{ minHeight: inputConfig.textarea.minHeight, height: 'auto' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || t('form.queryPlaceholder')}
            disabled={disabled}
            autoComplete="off"
            className={cn(
              "w-full rounded-md border-2 bg-white dark:bg-theme-bg-chat-input px-4 py-3",
              typography.fontSize.base,
              "font-mono backdrop-blur-sm",
              "border-theme-border-primary focus:border-theme-border-strong",
              "placeholder:text-theme-text-quaternary text-theme-text-primary",
              "focus:outline-none focus:ring-2 focus:ring-theme-border-strong/20",
              inputConfig.transitionDuration,
              focused && `scale-[${inputConfig.focusScale}] ${shadows.focus.glow}`,
              showWarning && "border-theme-status-error",
              showSuccess && "border-theme-status-success",
              hasError && "animate-pulse",
              disabled && "opacity-50 cursor-not-allowed",
              "resize-none overflow-y-auto"
            )}
            style={{ minHeight: inputConfig.textarea.minHeight, maxHeight: inputConfig.textarea.maxHeight }}
            aria-label={t('form.queryLabel')}
            aria-describedby="query-validation-status"
            aria-invalid={showWarning}
          />
        </div>

        {/* Validation Indicators */}
        <div 
          id="query-validation-status" 
          className={cn("flex flex-wrap items-center gap-4", typography.fontSize.sm)} 
          role="status" 
          aria-live="polite"
        >
          {/* Character Counter */}
          <div className={cn(
            "flex items-center gap-2",
            colors.text.secondary
          )}>
            <span>
              {t('form.characterCount', { count: characterCount })}
            </span>
          </div>

          {/* Success Indicator */}
          {showSuccess && (
            <div className={cn("flex items-center gap-2", colors.text.secondary)}>
              <CheckCircle2 className="h-4 w-4 text-theme-status-success" />
              <span>{t('form.queryHint', { min: MIN_QUERY_LENGTH })}</span>
            </div>
          )}

          {/* Error Indicator */}
          {showWarning && validationMessage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("flex items-center gap-2", colors.text.tertiary, "cursor-help")}>
                  <AlertTriangle className="h-4 w-4 text-theme-status-error" />
                  <span>{validationMessage}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {t('messages.queryTooShort', { min: MIN_QUERY_LENGTH })}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
