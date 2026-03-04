"use client";

import * as React from "react";
import { apiBaseUrl, apiEndpoints } from '@/config/api';

export interface FrontendConfig {
  preset_styles: string[];
  supported_languages: string[];
  default_language: string;
  custom_prompt_max_length: number;
  tasks?: {
    polling_interval_seconds: number;
  };
  research?: {
    question_count: number;
    enable_question_approval: boolean;
    enable_search_term_approval: boolean;
    enable_video_approval: boolean;
    search_terms_per_question: number;
    max_feedback_per_stage: number;
    min_feedback_length: number;
    max_feedback_length: number;
    target_selected_videos: number;
  };
}

interface UseConfigReturn {
  config: FrontendConfig | null;
  loading: boolean;
  error: string | null;
}

// Map backend English language names to native language names
const LANGUAGE_DISPLAY_MAP: Record<string, string> = {
  "English": "English",
  "Spanish": "Español",
  "French": "Français",
  "German": "Deutsch",
  "Chinese (Simplified)": "简体中文",
  "Chinese (Traditional)": "繁體中文",
  "Japanese": "日本語",
  "Korean": "한국어",
  "Portuguese": "Português",
  "Italian": "Italiano",
  "Russian": "Русский",
  "Arabic": "العربية",
};

// Default config values (must match backend/config.yaml)
const DEFAULT_CONFIG: FrontendConfig = {
  preset_styles: ["tldr", "bullet_points", "deep_dive", "tutorial", "detailed"],
  supported_languages: [
    "English",
    "Español",
    "Français",
    "Deutsch",
    "简体中文",
    "繁體中文",
    "日本語",
    "한국어",
    "Português",
    "Italiano",
    "Русский",
    "العربية",
  ],
  default_language: "English",
  custom_prompt_max_length: 500,
  research: {
    question_count: 5,
    enable_question_approval: true,
    enable_search_term_approval: true,
    enable_video_approval: true,
    search_terms_per_question: 2,
    max_feedback_per_stage: 1,
    min_feedback_length: 100,
    max_feedback_length: 500,
    target_selected_videos: 10,
  },
};

// Cache for config to prevent rate limiting during hot reloads
let configCache: { config: FrontendConfig; timestamp: number } | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch frontend configuration from backend API
 * Configuration is loaded from backend/config.yaml
 * Uses default values initially to prevent hydration mismatches
 * Includes caching to prevent rate limiting during development hot reloads
 */
export function useConfig(): UseConfigReturn {
  // Initialize with default values to ensure consistent server/client rendering
  const [config, setConfig] = React.useState<FrontendConfig | null>(DEFAULT_CONFIG);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchConfig = async () => {
      // Check cache first
      const now = Date.now();
      if (configCache && (now - configCache.timestamp) < CACHE_DURATION_MS) {
        setConfig(configCache.config);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}${apiEndpoints.config}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Map backend English language names to native names
        const mappedConfig = {
          ...data,
          supported_languages: data.supported_languages?.map(
            (lang: string) => LANGUAGE_DISPLAY_MAP[lang] || lang
          ) || DEFAULT_CONFIG.supported_languages,
          default_language: LANGUAGE_DISPLAY_MAP[data.default_language] || data.default_language || DEFAULT_CONFIG.default_language,
        };
        
        // Update cache
        configCache = {
          config: mappedConfig,
          timestamp: now,
        };
        
        setConfig(mappedConfig);
        setError(null);
      } catch (err) {
        // Handle network/connection errors gracefully
        const isConnectionError = err instanceof TypeError && 
          (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message === 'Failed to fetch');
        
        // Don't set error state for connection errors - just use defaults silently
        // This prevents UI from showing errors when backend is intentionally down
        if (!isConnectionError) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load configuration";
          setError(errorMessage);
        } else {
          setError(null); // Clear any previous errors
        }
        
        // Use console.warn for connection errors (expected when backend is down)
        // Use console.error only for unexpected errors
        if (isConnectionError) {
          console.warn("⚠️ Config fetch connection issue (backend may be down, using defaults):", err instanceof Error ? err.message : String(err));
        } else {
          console.error("❌ Failed to fetch config:", err);
        }
        
        // Fallback to default values if API fails
        setConfig(DEFAULT_CONFIG);
      } finally {
        setLoading(false);
      }
    };

    // Wrap in try-catch to prevent unhandled promise rejections
    fetchConfig().catch((err) => {
      console.error("❌ Unhandled error in fetchConfig:", err);
      setConfig(DEFAULT_CONFIG);
      setLoading(false);
    });
  }, []);

  return { config, loading, error };
}

