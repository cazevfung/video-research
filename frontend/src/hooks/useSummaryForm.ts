"use client";

import * as React from "react";
import { PromptPreset } from "@/components/dashboard/ControlPanel";
import { SummaryRequest } from "@/types";
import { useUserDataContext } from "@/contexts/UserDataContext";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE, getLanguageByCode, LANGUAGE_CODE_TO_NAME } from "@/config/languages";

export interface UseSummaryFormReturn {
  urlText: string;
  setUrlText: (text: string) => void;
  validUrls: string[];
  hasValidUrls: boolean;
  preset: PromptPreset | null;
  setPreset: (preset: PromptPreset | null) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  language: string;
  setLanguage: (language: string) => void;
  getFormData: () => SummaryRequest | null;
  reset: () => void;
}

/**
 * Converts language display name or code to backend English name
 * Uses centralized config to avoid hardcoding
 */
function toBackendLanguage(languageInput: string): string {
  // If it's already a backend name (from centralized config), return as-is
  const backendNames = SUPPORTED_LANGUAGES.map(lang => lang.fullName);
  if (backendNames.includes(languageInput)) {
    return languageInput;
  }
  
  // Try to find by language code
  if (LANGUAGE_CODE_TO_NAME[languageInput]) {
    return LANGUAGE_CODE_TO_NAME[languageInput];
  }
  
  // Try to find by display label or native name
  const langInfo = SUPPORTED_LANGUAGES.find(
    lang => lang.label === languageInput || lang.nativeName === languageInput
  );
  if (langInfo) {
    return langInfo.fullName;
  }
  
  // Fallback to English
  return LANGUAGE_CODE_TO_NAME[DEFAULT_LANGUAGE_CODE] || 'English';
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
 * Hook for managing summary form state
 * Phase 7: Added auto-save to localStorage and debounced validation
 */
const STORAGE_KEY = 'summary-form-draft';
const DEBOUNCE_DELAY = 300; // ms

export function useSummaryForm(): UseSummaryFormReturn {
  const { user } = useUserDataContext(); // Backend User type with language_preference
  
  // Simplified: User's language preference is the single source of truth
  // Returns backend English name (e.g., "Chinese (Simplified)") for API compatibility
  const getDefaultLanguage = React.useCallback(() => {
    // Priority 1: User's language preference (ONLY source)
    if (user?.language_preference) {
      const langInfo = getLanguageByCode(user.language_preference);
      return langInfo?.fullName || LANGUAGE_CODE_TO_NAME[DEFAULT_LANGUAGE_CODE] || 'English';
    }
    
    // Priority 2: Fallback to English
    return LANGUAGE_CODE_TO_NAME[DEFAULT_LANGUAGE_CODE] || 'English';
  }, [user?.language_preference]);
  
  const defaultLanguage = getDefaultLanguage();
  const previousDefaultRef = React.useRef(defaultLanguage);
  
  // Initialize with default values (same on server and client to avoid hydration mismatch)
  const [urlText, setUrlTextState] = React.useState("");
  const [preset, setPresetState] = React.useState<PromptPreset | null>(null);
  const [customPrompt, setCustomPromptState] = React.useState("");
  const [language, setLanguageState] = React.useState(defaultLanguage);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = React.useState(false);

  // Load from localStorage only on client-side after mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUrlTextState(parsed.urlText || "");
        setPresetState(parsed.preset || null);
        setCustomPromptState(parsed.customPrompt || "");
        // Use stored language if available, otherwise use current default
        const currentDefault = getDefaultLanguage();
        setLanguageState(parsed.language || currentDefault);
      } else {
        // No stored data, use current default language
        const currentDefault = getDefaultLanguage();
        setLanguageState(currentDefault);
      }
    } catch (err) {
      console.warn('Failed to load form from localStorage:', err);
      const currentDefault = getDefaultLanguage();
      setLanguageState(currentDefault);
    } finally {
      setHasLoadedFromStorage(true);
    }
  }, []); // Only run once on mount

  // Update language when user preference changes
  React.useEffect(() => {
    if (hasLoadedFromStorage) {
      const newDefault = getDefaultLanguage();
      // Only update if current language matches the previous default (to avoid overwriting user selection)
      // This allows the form to update when user changes their language preference
      if (language === previousDefaultRef.current || !language) {
        setLanguageState(newDefault);
        previousDefaultRef.current = newDefault;
      }
    }
  }, [user?.language_preference, hasLoadedFromStorage, getDefaultLanguage, language]);

  // Auto-save to localStorage (debounced) - only after initial load to avoid overwriting
  React.useEffect(() => {
    if (!hasLoadedFromStorage) return; // Don't save until we've loaded from storage
    
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          urlText,
          preset,
          customPrompt,
          language,
        }));
      } catch (err) {
        console.warn('Failed to save form to localStorage:', err);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [urlText, preset, customPrompt, language, hasLoadedFromStorage]);

  // Wrapped setters to ensure state updates
  const setUrlText = React.useCallback((text: string) => {
    setUrlTextState(text);
  }, []);

  const setPreset = React.useCallback((newPreset: PromptPreset | null) => {
    setPresetState(newPreset);
  }, []);

  const setCustomPrompt = React.useCallback((prompt: string) => {
    setCustomPromptState(prompt);
  }, []);

  const setLanguage = React.useCallback((lang: string) => {
    setLanguageState(lang);
  }, []);

  // Extract valid URLs from text
  const validUrls = React.useMemo(() => {
    const lines = urlText.split('\n');
    return lines
      .map(line => line.trim())
      .filter(line => line.length > 0 && validateYouTubeUrl(line));
  }, [urlText]);

  const hasValidUrls = validUrls.length > 0;

  const getFormData = (): SummaryRequest | null => {
    if (!hasValidUrls) {
      return null;
    }

    // Preset is required by backend, default to 'detailed' if not selected
    if (!preset) {
      return null; // Return null to indicate form is incomplete
    }

    // Convert native language name back to English for backend
    const backendLanguage = toBackendLanguage(language || defaultLanguage);

    return {
      urls: validUrls,
      preset: preset,
      custom_prompt: customPrompt || undefined,
      language: backendLanguage,
    };
  };

  const reset = React.useCallback(() => {
    setUrlTextState("");
    setPresetState(null);
    setCustomPromptState("");
    setLanguageState(defaultLanguage);
    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear form from localStorage:', err);
    }
  }, [defaultLanguage]);

  return {
    urlText,
    setUrlText,
    validUrls,
    hasValidUrls,
    preset,
    setPreset,
    customPrompt,
    setCustomPrompt,
    language,
    setLanguage,
    getFormData,
    reset,
  };
}

