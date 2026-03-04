'use client';

/**
 * Phase 4: Settings Page - useSettings hook
 * Custom hook for fetching and managing user settings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserSettings, updateUserSettings } from '@/lib/api';
import { UserSettings } from '@/types';
import { apiConfig } from '@/config/api';
import { defaultSettings } from '@/config/settings';

// Define ApiError type locally
interface ApiError {
  code: string;
  message: string;
  details?: any;
}

interface UseSettingsReturn {
  settings: UserSettings | null;
  loading: boolean;
  error: ApiError | null;
  saving: boolean;
  saveError: ApiError | null;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<boolean>;
  refetch: () => Promise<void>;
}


/**
 * LocalStorage key for settings cache
 */
const SETTINGS_CACHE_KEY = 'user_settings_cache';
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached settings from localStorage
 */
function getCachedSettings(): UserSettings | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!cached) return null;
    
    const { settings, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > SETTINGS_CACHE_TTL) {
      localStorage.removeItem(SETTINGS_CACHE_KEY);
      return null;
    }
    
    return settings;
  } catch {
    return null;
  }
}

/**
 * Cache settings to localStorage
 */
function cacheSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
      settings,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Custom hook for fetching and managing user settings
 * Automatically syncs with localStorage for offline access
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  
  // Refs to manage cleanup
  const isMountedRef = useRef(true);

  /**
   * Fetch settings from API
   */
  const fetchSettings = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      
      // Try to load from cache first for instant display
      const cached = getCachedSettings();
      if (cached) {
        setSettings(cached);
      }
      
      // Fetch from API
      const response = await getUserSettings();
      
      if (response.error) {
        // If we have cached settings, use them even if API fails
        if (cached) {
          setError(response.error);
          return;
        }
        // If no cache and API fails, use defaults
        setError(response.error);
        setSettings(defaultSettings);
        return;
      }
      
      if (response.data?.settings) {
        const fetchedSettings = response.data.settings;
        setSettings(fetchedSettings);
        cacheSettings(fetchedSettings);
      } else {
        // No settings found, use defaults
        setSettings(defaultSettings);
      }
      
    } catch (err) {
      const apiError: ApiError = {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch settings',
      };
      setError(apiError);
      
      // Fallback to cached or default settings
      const cached = getCachedSettings();
      setSettings(cached || defaultSettings);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Update settings
   */
  const updateSettings = useCallback(async (
    newSettings: Partial<UserSettings>
  ): Promise<boolean> => {
    if (!isMountedRef.current) return false;

    setSaving(true);
    setSaveError(null);

    try {
      // Optimistically update local state
      const updatedSettings = settings 
        ? { ...settings, ...newSettings }
        : { ...defaultSettings, ...newSettings };
      setSettings(updatedSettings);
      cacheSettings(updatedSettings);

      // Update on backend
      const response = await updateUserSettings(newSettings);
      
      if (response.error) {
        setSaveError(response.error);
        // Revert to previous settings on error
        await fetchSettings();
        return false;
      }
      
      if (response.data?.settings) {
        setSettings(response.data.settings);
        cacheSettings(response.data.settings);
        return true;
      }
      
      return false;
    } catch (err) {
      const apiError: ApiError = {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'Failed to update settings',
      };
      setSaveError(apiError);
      
      // Revert to previous settings on error
      await fetchSettings();
      return false;
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }, [settings, fetchSettings]);

  /**
   * Refetch function exposed to components
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchSettings();
  }, [fetchSettings]);

  // Initial fetch on mount
  useEffect(() => {
    isMountedRef.current = true;
    fetchSettings();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    saving,
    saveError,
    updateSettings,
    refetch,
  };
}

