/**
 * User settings structure
 * Matches frontend UserSettings type
 * 
 * Note: Language preference is now managed via user.language_preference field
 * and updated through the dedicated /api/user/language endpoint.
 * This removes duplicate language fields and ensures single source of truth.
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  // language field removed - use user.language_preference instead
  notifications: {
    email: boolean;
    creditLowThreshold: number;
    summaryComplete: boolean;
    tierUpgrade: boolean;
  };
  privacy: {
    dataSharing: boolean;
    analytics: boolean;
  };
  preferences: {
    defaultPreset: string;
    // defaultLanguage removed - use user.language_preference instead
    autoSave: boolean;
  };
}

/**
 * Default user settings
 */
export const defaultUserSettings: UserSettings = {
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
    autoSave: true,
  },
};
