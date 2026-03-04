"use client";

import * as React from "react";
import { ResearchRequest } from "@/types";
import { useUserDataContext } from "@/contexts/UserDataContext";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE, getLanguageByCode, LANGUAGE_CODE_TO_NAME } from "@/config/languages";
import { researchConfig } from "@/config/research";

export interface UseResearchFormReturn {
  query: string;
  setQuery: (query: string) => void;
  language: string;
  setLanguage: (language: string) => void;
  hasValidQuery: boolean;
  getFormData: () => ResearchRequest | null;
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
 * Validates research query
 * Uses configurable min length from research config
 */
function validateQuery(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length >= researchConfig.query.minLength;
}

/**
 * Hook for managing research form state
 * Validates query length using configurable min length from research config
 */
const STORAGE_KEY = researchConfig.form.storageKey;
const DEBOUNCE_DELAY = researchConfig.form.debounceDelay;
const MIN_QUERY_LENGTH = researchConfig.query.minLength;

export function useResearchForm(): UseResearchFormReturn {
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
  const [query, setQueryState] = React.useState("");
  const [language, setLanguageState] = React.useState(defaultLanguage);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = React.useState(false);

  // Load from localStorage only on client-side after mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setQueryState(parsed.query || "");
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
          query,
          language,
        }));
      } catch (err) {
        console.warn('Failed to save form to localStorage:', err);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [query, language, hasLoadedFromStorage]);

  // Wrapped setters to ensure state updates
  const setQuery = React.useCallback((text: string) => {
    setQueryState(text);
  }, []);

  const setLanguage = React.useCallback((lang: string) => {
    setLanguageState(lang);
  }, []);

  // Validate query
  const hasValidQuery = React.useMemo(() => {
    return validateQuery(query);
  }, [query]);

  const getFormData = (): ResearchRequest | null => {
    if (!hasValidQuery) {
      return null;
    }

    // Convert native language name back to English for backend
    const backendLanguage = toBackendLanguage(language || defaultLanguage);

    return {
      research_query: query.trim(),
      language: backendLanguage,
    };
  };

  const reset = React.useCallback(() => {
    setQueryState("");
    setLanguageState(defaultLanguage);
    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear form from localStorage:', err);
    }
  }, [defaultLanguage]);

  return {
    query,
    setQuery,
    language,
    setLanguage,
    hasValidQuery,
    getFormData,
    reset,
  };
}
