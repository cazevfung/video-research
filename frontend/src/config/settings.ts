/**
 * Phase 4: Settings Page - Settings Configuration
 * Centralized configuration for settings defaults and options
 * Ensures no hardcoded values in components
 */

import { UserSettings } from '@/types';
import { getLanguageOptionsForDropdown } from './languages';

/**
 * Default settings structure
 * Used when no settings are found or as fallback
 * 
 * Note: Language preference is now managed via user.language_preference field
 * Phase 1: Language Settings Unification - removed duplicate language fields
 */
export const defaultSettings: UserSettings = {
  theme: 'system',
  notifications: {
    email: true,
    creditLowThreshold: 5,
    summaryComplete: true,
    tierUpgrade: true,
  },
  privacy: {
    dataSharing: false,
    analytics: true,
  },
  preferences: {
    defaultPreset: '',
    defaultLanguage: 'English',
    autoSave: true,
  },
};

/**
 * Theme options for SelectDropdown
 */
export const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

/**
 * Language options for SelectDropdown
 * Phase 3 Fix: No longer hardcoded - pulls from centralized languages.ts config
 * This ensures consistency across the entire application
 */
export const languageOptions = getLanguageOptionsForDropdown();

/**
 * Credit low threshold options
 * Values represent the number of credits remaining before warning
 */
export const creditLowThresholdOptions = [
  { value: '1', label: '1 credit' },
  { value: '3', label: '3 credits' },
  { value: '5', label: '5 credits' },
  { value: '10', label: '10 credits' },
  { value: '20', label: '20 credits' },
] as const;

/**
 * Settings section configuration
 * Defines the structure and labels for each settings section
 */
export const settingsSections = {
  general: {
    title: 'General',
    description: 'Appearance and language preferences',
  },
  notifications: {
    title: 'Notifications',
    description: 'Manage your notification preferences',
  },
  privacy: {
    title: 'Privacy',
    description: 'Control your data sharing and analytics preferences',
  },
  account: {
    title: 'Account',
    description: 'Account management and security settings',
  },
  preferences: {
    title: 'Preferences',
    description: 'Default settings for summary generation',
  },
} as const;

