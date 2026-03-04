"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { typography } from "@/config/visual-effects";

export interface UrlInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  textareaWrapper?: (textarea: React.ReactNode) => React.ReactNode;
}

interface ValidationResult {
  isValid: boolean;
  lineNumber: number;
  url: string;
}

/**
 * Validates YouTube URLs
 * Supports youtube.com/watch?v=, youtube.com/embed/, youtube.com/live/, youtu.be/ patterns
 */
function validateYouTubeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/live\/[\w-]+/i,
    /^https?:\/\/youtu\.be\/[\w-]+/i,
  ];
  
  return patterns.some(pattern => pattern.test(trimmed));
}

/**
 * Validates all lines and returns validation results
 */
function validateUrls(text: string): ValidationResult[] {
  const lines = text.split('\n');
  return lines.map((line, index) => ({
    isValid: validateYouTubeUrl(line),
    lineNumber: index + 1,
    url: line.trim(),
  }));
}

export function UrlInputArea({ value, onChange, textareaWrapper }: UrlInputAreaProps) {
  const { t } = useTranslation('summary');
  const [focused, setFocused] = React.useState(false);
  const [invalidLines, setInvalidLines] = React.useState<Set<number>>(new Set());
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const validationResults = React.useMemo(() => validateUrls(value), [value]);
  const validCount = validationResults.filter(r => r.isValid).length;
  const invalidCount = validationResults.filter(r => !r.isValid && r.url).length;
  const invalidLineNumbers = validationResults
    .filter(r => !r.isValid && r.url)
    .map(r => r.lineNumber);

  // Track invalid lines for pulse animation
  React.useEffect(() => {
    if (invalidLineNumbers.length > 0) {
      setInvalidLines(new Set(invalidLineNumbers));
      // Remove pulse animation after 2 seconds
      const timer = setTimeout(() => {
        setInvalidLines(new Set());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [invalidLineNumbers.join(',')]);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(textarea.scrollHeight, 400); // max-h-[400px]
      textarea.style.height = `${Math.max(scrollHeight, 200)}px`; // min-h-[200px]
    }
  }, [value]);

  // Phase 7: Debounced onChange for better performance
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Update immediately for responsive UI
    onChange(value);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce validation-heavy operations if needed
    // For now, validation is already memoized, so this is just for future optimization
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Allow default paste behavior, validation will happen on change
    // This handler can be extended for custom paste handling if needed
  };

  // Get line content for tooltip
  const getLineContent = (lineNumber: number): string => {
    const lines = value.split('\n');
    return lines[lineNumber - 1]?.trim() || '';
  };

  const textareaElement = (
    <div className="relative block" style={{ minHeight: '200px', height: 'auto' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={t('form.urlPlaceholder')}
        autoComplete="off"
        className={cn(
          "w-full rounded-md border-2 bg-white dark:bg-theme-bg-chat-input px-4 py-3",
          typography.fontSize.base,
          "font-mono backdrop-blur-sm",
          "border-theme-border-primary focus:border-theme-border-strong",
          "placeholder:text-theme-text-quaternary text-theme-text-primary",
          "focus:outline-none focus:ring-2 focus:ring-theme-border-strong/20",
          "transition-all duration-200",
          focused && "scale-[1.01] shadow-[0_0_20px_rgba(156,163,175,0.3)]",
          "resize-none overflow-y-auto"
        )}
        style={{ minHeight: '200px', maxHeight: '400px' }}
        aria-label={t('urlValidation.ariaLabel')}
        aria-describedby="url-validation-status"
        aria-invalid={invalidCount > 0}
      />
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {textareaWrapper ? textareaWrapper(textareaElement) : textareaElement}

        {/* Validation Indicators */}
        <div id="url-validation-status" className={cn("flex flex-wrap items-center gap-4", typography.fontSize.sm)} role="status" aria-live="polite">
          {validCount > 0 && (
            <div className="flex items-center gap-2 text-theme-text-secondary">
              <CheckCircle2 className="h-4 w-4 text-theme-text-secondary" />
              <span>{t('urlValidation.validLinks', { count: validCount })}</span>
            </div>
          )}
          {invalidCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-theme-text-tertiary cursor-help">
                  <AlertTriangle className="h-4 w-4 text-theme-text-quaternary" />
                  <span>
                    {invalidLineNumbers.length > 0
                      ? t('urlValidation.invalidLinksWithLines', { count: invalidCount, lines: invalidLineNumbers.join(', ') })
                      : t('urlValidation.invalidLinks', { count: invalidCount })}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('urlValidation.invalidTooltip', { count: invalidLineNumbers.length || invalidCount })}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

      </div>
    </TooltipProvider>
  );
}

