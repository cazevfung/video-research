# Language Settings Unification - Implementation Plan

**Document Version:** 1.0  
**Date:** January 15, 2026  
**Status:** Planning  
**Priority:** High

---

## Executive Summary

This document outlines a comprehensive plan to fix critical issues with language settings across the application. Currently, language preferences are fragmented across multiple fields, don't sync properly, and use inconsistent data formats. This plan unifies all language settings under a single source of truth and ensures proper synchronization between UI language and summary language preferences.

### Key Problems Being Solved
1. System UI language changes in settings don't take effect
2. Preferred summary language doesn't sync to summary creation page
3. Three different language lists with inconsistent languages (some missing 简体中文/繁體中文 distinction)
4. Duplicate language fields (`language_preference`, `settings.language`, `settings.preferences.defaultLanguage`)
5. Cache invalidation issues preventing language changes from applying

### Expected Outcomes
- Single source of truth for language preference
- Immediate UI language changes when settings updated
- Consistent language list across all dropdowns (12 languages with native names)
- Summary form automatically uses user's language preference
- No duplicate or conflicting language fields

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Proposed Architecture](#2-proposed-architecture)
3. [Implementation Phases](#3-implementation-phases)
4. [Detailed Implementation Steps](#4-detailed-implementation-steps)
5. [Code Examples](#5-code-examples)
6. [Testing Strategy](#6-testing-strategy)
7. [Migration Guide](#7-migration-guide)
8. [Rollback Plan](#8-rollback-plan)

---

## 1. Current Architecture Analysis

### 1.1 Language Fields (Current State)

| Field | Type | Location | Used For | Issues |
|-------|------|----------|----------|---------|
| `user.language_preference` | ISO code | User Profile | i18n UI language | ✅ Works, but doesn't update from settings |
| `settings.language` | ISO code | User Settings | Settings page only | ⚠️ Changes don't affect UI |
| `settings.preferences.defaultLanguage` | ISO code | User Settings | Nothing (unused) | ❌ Dead code |

### 1.2 Language Lists (Current State)

**List 1: `frontend/src/config/languages.ts`** (RECOMMENDED - 12 languages)
```typescript
SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'es', label: 'Español (Spanish)', nativeName: 'Español' },
  { code: 'fr', label: 'Français (French)', nativeName: 'Français' },
  { code: 'de', label: 'Deutsch (German)', nativeName: 'Deutsch' },
  { code: 'zh', label: '简体中文 (Chinese Simplified)', nativeName: '简体中文' },
  { code: 'zh-tw', label: '繁體中文 (Chinese Traditional)', nativeName: '繁體中文' },
  { code: 'ja', label: '日本語 (Japanese)', nativeName: '日本語' },
  { code: 'ko', label: '한국어 (Korean)', nativeName: '한국어' },
  { code: 'pt', label: 'Português (Portuguese)', nativeName: 'Português' },
  { code: 'it', label: 'Italiano (Italian)', nativeName: 'Italiano' },
  { code: 'ru', label: 'Русский (Russian)', nativeName: 'Русский' },
  { code: 'ar', label: 'العربية (Arabic)', nativeName: 'العربية' }
]
```

**List 2: Backend config (English names)**
```yaml
supported_languages:
  - "English"
  - "Spanish"
  - "French"
  - "German"
  - "Chinese (Simplified)"   # Maps to 'zh'
  - "Chinese (Traditional)"  # Maps to 'zh-tw'
  - "Japanese"
  - "Korean"
  - "Portuguese"
  - "Italian"
  - "Russian"
  - "Arabic"
```

**List 3: Hardcoded fallback in `ControlPanel.tsx`** (DEPRECATED)
```typescript
const supportedLanguages = config?.supported_languages || [
  "English", "Spanish", "French", "German",
  "Chinese (Simplified)", "Chinese (Traditional)", // ✅ Good
  "Japanese", "Korean", "Portuguese", "Italian", "Russian", "Arabic"
];
```

**Issue**: Some components may be using abbreviated lists or missing the Simplified/Traditional distinction.

### 1.3 Data Flow (Current State)

```
User Changes Language in Settings
         ↓
   updates settings.language (ISO code)
         ↓
   Backend syncs to user.language_preference ✅
         ↓
   BUT Frontend doesn't refetch user data ❌
         ↓
   LanguageContext still reads old language_preference
         ↓
   UI doesn't change ❌
```

### 1.4 Component Analysis

| Component | Language Source | Language List | Issues |
|-----------|----------------|---------------|---------|
| `LanguageContext` | `user.language_preference` | N/A | Doesn't listen to settings changes |
| `LanguageSelector` (Settings) | `settings.language` | `SUPPORTED_LANGUAGES` | Disconnected from context |
| `ProfileForm` (Account) | N/A | N/A | No language selector at all |
| `ControlPanel` (Summary) | Props | Hardcoded fallback | Should use user preference |
| `useSummaryForm` | Multiple sources | N/A | Complex priority logic |

---

## 2. Proposed Architecture

### 2.1 Single Source of Truth

**Decision**: Use `user.language_preference` as the ONLY language field

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  tier: UserTier;
  language_preference: string; // ISO 639-1 code (e.g., 'en', 'es', 'zh-tw')
  // ... other fields
}
```

**Rationale**:
- Already used by i18n system
- Stored in user profile (persists across sessions)
- Single field = no sync issues
- ISO codes are standard and compact

### 2.2 Unified Language List

**Decision**: Always use `SUPPORTED_LANGUAGES` from `frontend/src/config/languages.ts`

**Format**:
```typescript
interface LanguageOption {
  code: string;           // ISO 639-1 code (e.g., 'en', 'zh-tw')
  label: string;          // Display with native name (e.g., '简体中文 (Chinese Simplified)')
  fullName: string;       // English name (e.g., 'Chinese (Simplified)')
  nativeName: string;     // Native name (e.g., '简体中文')
  dir: 'ltr' | 'rtl';    // Text direction
}
```

**Helper Function**:
```typescript
export function getLanguageOptionsForDropdown() {
  return SUPPORTED_LANGUAGES.map(lang => ({
    value: lang.code,        // 'zh', 'zh-tw'
    label: lang.label,       // '简体中文 (Chinese Simplified)'
  }));
}
```

### 2.3 New Data Flow

```
User Changes Language Anywhere
         ↓
   Update user.language_preference (API call)
         ↓
   Immediately update i18n (changeLanguage)
         ↓
   Invalidate user data cache
         ↓
   Refetch user data (with new language_preference)
         ↓
   UI updates immediately ✅
         ↓
   Summary form picks up new preference ✅
```

### 2.4 Conversion Strategy

**Internal Storage**: Always use ISO codes ('en', 'zh', 'zh-tw')
**UI Display**: Show native names ('English', '简体中文', '繁體中文')
**Backend LLM Prompts**: Convert to English names ('English', 'Chinese (Simplified)')

```typescript
// Frontend → Frontend (UI display)
'zh' → '简体中文' (via SUPPORTED_LANGUAGES)

// Frontend → Backend (API calls)
'zh' → 'zh' (ISO code)

// Backend → LLM (prompt generation)
'zh' → 'Chinese (Simplified)' (via languageCodeToName)
```

---

## 3. Implementation Phases

### Phase 1: Foundation (Backend Cleanup)
**Goal**: Remove duplicate fields and simplify backend
**Duration**: 1-2 hours
**Risk**: Low (backend changes only)

### Phase 2: Frontend State Management
**Goal**: Create unified language preference hook
**Duration**: 2-3 hours
**Risk**: Medium (affects multiple components)

### Phase 3: Component Updates
**Goal**: Update all language selectors to use new system
**Duration**: 3-4 hours
**Risk**: Medium (UI changes visible to users)

### Phase 4: Cache & Sync Fixes
**Goal**: Fix cache invalidation and data flow
**Duration**: 2-3 hours
**Risk**: High (affects auth and state management)

### Phase 5: Testing & Validation
**Goal**: Comprehensive testing of all language flows
**Duration**: 2-3 hours
**Risk**: Low (testing only)

**Total Estimated Time**: 10-15 hours

---

## 4. Detailed Implementation Steps

## Phase 1: Foundation (Backend Cleanup)

### Step 1.1: Update User Settings Type Definition

**File**: `backend/src/types/user-settings.ts`

**Current**:
```typescript
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string; // ❌ Remove this
  notifications: { ... };
  privacy: { ... };
  preferences: {
    defaultPreset: string;
    defaultLanguage: string; // ❌ Remove this
    autoSave: boolean;
  };
}

export const defaultUserSettings: UserSettings = {
  theme: 'system',
  language: 'en', // ❌ Remove this
  notifications: { ... },
  privacy: { ... },
  preferences: {
    defaultPreset: '',
    defaultLanguage: 'en', // ❌ Remove this
    autoSave: true,
  },
};
```

**New**:
```typescript
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
```

### Step 1.2: Remove Language Sync Logic from Settings Controller

**File**: `backend/src/controllers/user.controller.ts`

**Remove this code** (lines ~254-262):
```typescript
// Also update language_preference in user profile if language is being updated
if (settingsUpdate.language !== undefined) {
  try {
    await updateUser(userId, { language_preference: settingsUpdate.language });
  } catch (error) {
    logger.warn('Failed to sync language_preference to user profile', error);
    // Continue with settings update even if profile update fails
  }
}
```

**Remove language validation** (lines ~238-252):
```typescript
// Validate language if provided
if (settingsUpdate.language !== undefined) {
  const validation = validateLanguagePreference(settingsUpdate.language);
  if (!validation.valid) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: validation.errors[0].message,
      },
    });
    return;
  }
  // Normalize to lowercase
  settingsUpdate.language = settingsUpdate.language.toLowerCase().trim();
}
```

### Step 1.3: Add Dedicated Language Preference Endpoint

**File**: `backend/src/routes/user.routes.ts`

**Add new route**:
```typescript
/**
 * Update user language preference
 * PATCH /api/user/language
 */
router.patch('/language', async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    const { language } = req.body;
    
    // Validate language
    const validation = validateLanguagePreference(language);
    if (!validation.valid) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: validation.errors[0].message,
        },
      });
      return;
    }

    // Normalize and update
    const normalizedLanguage = language.toLowerCase().trim();
    const updatedUser = await updateUser(req.user.id, {
      language_preference: normalizedLanguage,
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name || '',
        tier: updatedUser.tier,
        language_preference: updatedUser.language_preference || 'en',
      },
    });
  } catch (error) {
    logger.error('Error updating language preference', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update language preference',
      },
    });
  }
});
```

---

## Phase 2: Frontend State Management

### Step 2.1: Create Unified Language Preference Hook

**New File**: `frontend/src/hooks/useLanguagePreference.ts`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { apiRequest } from '@/lib/api';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE } from '@/config/languages';

interface UseLanguagePreferenceReturn {
  currentLanguage: string; // ISO code
  currentLanguageLabel: string; // Native name for display
  availableLanguages: Array<{ value: string; label: string }>;
  isChanging: boolean;
  changeLanguage: (newLanguageCode: string) => Promise<boolean>;
}

/**
 * Unified hook for managing user language preference
 * 
 * This hook:
 * - Reads from user.language_preference (single source of truth)
 * - Updates language preference via dedicated API
 * - Immediately applies change to i18n
 * - Invalidates cache and refetches user data
 * - Shows success/error toasts
 * 
 * Usage:
 * ```tsx
 * const { currentLanguage, availableLanguages, changeLanguage } = useLanguagePreference();
 * 
 * <SelectDropdown
 *   value={currentLanguage}
 *   options={availableLanguages}
 *   onValueChange={changeLanguage}
 * />
 * ```
 */
export function useLanguagePreference(): UseLanguagePreferenceReturn {
  const { user, refetchUserData } = useAuth();
  const { changeLanguage: changeI18nLanguage } = useLanguage();
  const toast = useToast();
  const [isChanging, setIsChanging] = useState(false);

  // Get current language from user profile
  const currentLanguage = user?.language_preference || DEFAULT_LANGUAGE_CODE;

  // Get display label for current language
  const currentLanguageInfo = SUPPORTED_LANGUAGES.find(
    lang => lang.code === currentLanguage
  );
  const currentLanguageLabel = currentLanguageInfo?.label || 'English';

  // Available languages for dropdown
  const availableLanguages = SUPPORTED_LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.label,
  }));

  /**
   * Change language preference
   * 1. Update backend user.language_preference
   * 2. Update i18n immediately
   * 3. Invalidate cache and refetch user data
   * 4. Show success toast
   */
  const changeLanguage = useCallback(async (newLanguageCode: string): Promise<boolean> => {
    if (isChanging) return false;
    
    // Validate language code
    const isValidLanguage = SUPPORTED_LANGUAGES.some(
      lang => lang.code === newLanguageCode
    );
    if (!isValidLanguage) {
      toast.error(`Invalid language code: ${newLanguageCode}`);
      return false;
    }

    setIsChanging(true);

    try {
      // 1. Update backend
      const response = await apiRequest<{ user: any }>('/api/user/language', {
        method: 'PATCH',
        body: JSON.stringify({ language: newLanguageCode }),
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to update language preference');
        return false;
      }

      // 2. Update i18n immediately (don't wait for refetch)
      await changeI18nLanguage(newLanguageCode);

      // 3. Invalidate cache and refetch user data
      await refetchUserData();

      // 4. Success feedback
      const newLanguageLabel = SUPPORTED_LANGUAGES.find(
        lang => lang.code === newLanguageCode
      )?.nativeName || newLanguageCode;
      
      toast.success(`Language changed to ${newLanguageLabel}`);
      
      return true;
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error('Failed to update language preference');
      return false;
    } finally {
      setIsChanging(false);
    }
  }, [isChanging, changeI18nLanguage, refetchUserData, toast]);

  return {
    currentLanguage,
    currentLanguageLabel,
    availableLanguages,
    isChanging,
    changeLanguage,
  };
}
```

### Step 2.2: Update LanguageContext to Support Manual Refetch

**File**: `frontend/src/contexts/LanguageContext.tsx`

**Changes**:
```typescript
interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  isLoading: boolean;
  refetchFromUser: () => void; // ✅ Add this
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // ... existing code ...
  
  // ✅ Add method to refetch language from user profile
  const refetchFromUser = useCallback(() => {
    if (isAuthenticated && user?.language_preference) {
      i18n.changeLanguage(user.language_preference);
    }
  }, [isAuthenticated, user?.language_preference]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage: i18n.language || 'en',
        changeLanguage,
        isLoading,
        refetchFromUser, // ✅ Expose this
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
```

---

## Phase 3: Component Updates

### Step 3.1: Simplify Language Selector Component

**File**: `frontend/src/components/settings/LanguageSelector.tsx`

**Current** (connects to settings.language):
```typescript
export function LanguageSelector() {
  const { currentLanguage, changeLanguage, isLoading } = useLanguage();
  const { t } = useTranslation('settings');
  const languageOptions = getLanguageOptionsForDropdown();

  return (
    <SelectDropdown
      value={currentLanguage}
      onValueChange={changeLanguage}
      options={languageOptions}
      label={t('general.language.label')}
      description={t('general.language.description')}
      disabled={isLoading}
    />
  );
}
```

**New** (connects to user.language_preference):
```typescript
'use client';

import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { useTranslation } from 'react-i18next';

/**
 * Language Selector Component
 * 
 * Uses the unified language preference system:
 * - Reads from user.language_preference
 * - Updates via dedicated API endpoint
 * - Immediately applies to UI
 * - Syncs across entire app
 */
export function LanguageSelector() {
  const { t } = useTranslation('settings');
  const {
    currentLanguage,
    availableLanguages,
    isChanging,
    changeLanguage,
  } = useLanguagePreference();

  return (
    <SelectDropdown
      value={currentLanguage}
      onValueChange={changeLanguage}
      options={availableLanguages}
      label={t('general.language.label')}
      description={t('general.language.description')}
      disabled={isChanging}
    />
  );
}
```

### Step 3.2: Update Settings Page

**File**: `frontend/src/app/app/settings/page.tsx`

**Remove**:
1. Remove `language` field from formValues state (lines ~41, ~64, ~89-91)
2. Remove `handleLanguageChange` function (lines ~89-91)
3. Remove duplicate `LanguageSelector` in preferences section (line ~300)
4. Remove language change logic from `handleSave` (lines ~132-135)

**Keep**:
- One `LanguageSelector` in General section (line ~223) - this now uses the new hook

**Before**:
```typescript
const [formValues, setFormValues] = useState<Partial<UserSettings>>({
  theme: 'system',
  language: 'en', // ❌ Remove
  notifications: { ... },
  privacy: { ... },
  preferences: {
    defaultPreset: '',
    defaultLanguage: 'en', // ❌ Remove
    autoSave: true,
  },
});

// ❌ Remove this handler
const handleLanguageChange = (value: string) => {
  setFormValues(prev => ({ ...prev, language: value }));
};

// ❌ Remove this from save logic
if (formValues.language && formValues.language !== i18n.language) {
  await changeLanguage(formValues.language);
}
```

**After**:
```typescript
const [formValues, setFormValues] = useState<Partial<UserSettings>>({
  theme: 'system',
  // language removed - managed separately via LanguageSelector
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
    // defaultLanguage removed - use user.language_preference
    autoSave: true,
  },
});

// Language is now handled entirely by LanguageSelector component
// No manual handling needed in this page
```

### Step 3.3: Add Language Display to Account Page

**File**: `frontend/src/components/account/ProfileForm.tsx`

**Add read-only display**:
```typescript
import { useLanguagePreference } from '@/hooks/useLanguagePreference';

export function ProfileForm({ user, onUpdate, loading }: ProfileFormProps) {
  const { t } = useTranslation(['account', 'common']);
  const { currentLanguageLabel } = useLanguagePreference();
  
  // ... existing code ...
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.sections.profile.title')}</CardTitle>
        <CardDescription>{t('account.sections.profile.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn("space-y-4")}>
          {/* Existing name field */}
          <div className={cn("space-y-2")}>
            <label className={cn(typography.fontSize.sm, typography.fontWeight.medium)}>
              {t('account.profile.displayName')}
            </label>
            <Input ... />
          </div>

          {/* Existing email field */}
          <div className={cn("space-y-2")}>
            <label className={cn(typography.fontSize.sm, typography.fontWeight.medium)}>
              {t('account.profile.email')}
            </label>
            <Input ... />
          </div>

          {/* ✅ NEW: Language preference display */}
          <div className={cn("space-y-2")}>
            <label className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
              {t('account.profile.language')}
            </label>
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              colors.border.default,
              colors.background.secondary
            )}>
              <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                {currentLanguageLabel}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/app/settings')}
              >
                {t('account.profile.changeLanguage')}
              </Button>
            </div>
            <p className={cn(typography.fontSize.xs, colors.text.tertiary)}>
              {t('account.profile.languageNote')}
            </p>
          </div>
        </div>
      </CardContent>
      {/* ... existing footer ... */}
    </Card>
  );
}
```

**Add translations** to `frontend/src/locales/en/account.json`:
```json
{
  "profile": {
    "language": "Language Preference",
    "changeLanguage": "Change",
    "languageNote": "This affects both the interface language and default summary language"
  }
}
```

### Step 3.4: Update Control Panel to Use Centralized Config

**File**: `frontend/src/components/dashboard/ControlPanel.tsx`

**Remove hardcoded fallback** (lines ~117-130):
```typescript
// ❌ Remove this hardcoded list
const supportedLanguages = config?.supported_languages || [
  "English",
  "Spanish",
  "French",
  "German",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Japanese",
  "Korean",
  "Portuguese",
  "Italian",
  "Russian",
  "Arabic",
];
```

**Replace with centralized config**:
```typescript
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '@/config/languages';

export function ControlPanel({ ... }: ControlPanelProps) {
  // ... existing code ...

  // ✅ Use centralized language config
  const supportedLanguages = SUPPORTED_LANGUAGES.map(lang => ({
    code: lang.code,
    displayName: lang.label,
    backendName: lang.fullName, // For API calls
  }));

  // Show current selection with native name
  const selectedLanguage = language || defaultLanguage;
  const selectedLanguageInfo = getLanguageByCode(selectedLanguage);
  const selectedLanguageDisplay = selectedLanguageInfo?.label || selectedLanguage;

  return (
    <div className="space-y-6">
      {/* ... existing presets ... */}

      {/* Language Selector */}
      <div className="space-y-2">
        <label className={cn(typography.fontSize.sm, typography.fontWeight.medium)}>
          {t('form.language')}
        </label>
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(...)}>
              <span>{selectedLanguageDisplay}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
              {supportedLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.backendName)} // Send backend name to API
                  className={cn(
                    "cursor-pointer",
                    language === lang.backendName && "bg-theme-bg-card-hover"
                  )}
                >
                  {lang.displayName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Fallback during SSR
          <select ...>
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
```

### Step 3.5: Simplify Summary Form Language Logic

**File**: `frontend/src/hooks/useSummaryForm.ts`

**Current priority** (overly complex):
```typescript
// Priority 1: User's language preference
if (user?.language_preference) {
  const backendName = languageCodeToBackendName(user.language_preference);
  const displayName = languageCodeToDisplayName(user.language_preference);
  return displayName;
}

// Priority 2: Current UI language
if (currentLanguage && currentLanguage !== 'en') {
  const backendName = languageCodeToBackendName(currentLanguage);
  const displayName = languageCodeToDisplayName(currentLanguage);
  return displayName;
}

// Priority 3: Config default
if (config?.default_language) {
  return config.default_language;
}

// Priority 4: Fallback
return "English";
```

**Simplified priority**:
```typescript
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE, getLanguageByCode } from '@/config/languages';

const getDefaultLanguage = React.useCallback(() => {
  // Priority 1: User's language preference (ONLY source)
  if (user?.language_preference) {
    const langInfo = getLanguageByCode(user.language_preference);
    return langInfo?.fullName || 'English'; // Backend English name
  }
  
  // Priority 2: Fallback to English
  return 'English';
}, [user?.language_preference]);
```

**Rationale**: 
- User language preference is the single source of truth
- No need to check current UI language (they're the same now)
- No need to check config default (always English)
- Simpler = fewer bugs

---

## Phase 4: Cache & Sync Fixes

### Step 4.1: Add Cache Invalidation to Auth Context

**File**: `frontend/src/contexts/AuthContext.tsx`

**Ensure refetchUserData clears cache**:
```typescript
const refetchUserData = useCallback(async () => {
  setLoading(true);
  
  try {
    // ✅ Clear any cached user data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data_cache');
      sessionStorage.removeItem('user_data_cache');
    }

    // Fetch fresh data
    const response = await getCurrentUserData();
    
    if (response.error) {
      setError(response.error);
      return;
    }

    if (response.data) {
      setUser(response.data.user);
      setQuota(response.data.quota);
      setError(null);
    }
  } catch (err) {
    setError({
      code: 'UNKNOWN_ERROR',
      message: err instanceof Error ? err.message : 'Failed to fetch user data',
    });
  } finally {
    setLoading(false);
  }
}, []);
```

### Step 4.2: Update API Client to Support Cache Bypass

**File**: `frontend/src/lib/api.ts`

**Add cache control header**:
```typescript
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { bypassCache?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { bypassCache, ...fetchOptions } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // ✅ Add cache control for language changes
  if (bypassCache) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
  }

  // ... rest of implementation
}

// Language endpoint with cache bypass
export async function updateLanguagePreference(language: string): Promise<ApiResponse<{ user: User }>> {
  return apiRequest('/api/user/language', {
    method: 'PATCH',
    body: JSON.stringify({ language }),
    bypassCache: true, // ✅ Force fresh data
  });
}
```

---

## Phase 5: Testing & Validation

### Step 5.1: Manual Testing Checklist

**Test Case 1: Settings Page Language Change**
```
1. Navigate to /app/settings
2. Change language from English to 简体中文
3. ✅ UI should immediately switch to Chinese
4. ✅ Page should show success toast
5. Refresh page
6. ✅ Language should persist (still Chinese)
7. Navigate to dashboard
8. ✅ Summary form should show Chinese as default language
```

**Test Case 2: Account Page Language Display**
```
1. Navigate to /app/account
2. ✅ Should display current language (e.g., "简体中文")
3. Click "Change" button
4. ✅ Should navigate to /app/settings
5. Change language
6. Go back to /app/account
7. ✅ Should show updated language
```

**Test Case 3: Summary Creation with User Preference**
```
1. Set language preference to 한국어 (Korean)
2. Navigate to dashboard
3. ✅ Language dropdown should default to Korean
4. Create a summary without changing language
5. ✅ Summary should be generated in Korean
6. Change language to Français for a single summary
7. ✅ Summary should be in French (override works)
8. Next summary should default back to Korean
```

**Test Case 4: Cross-Component Consistency**
```
1. Open settings page in one tab
2. Open account page in another tab
3. Change language in settings tab
4. Refresh account page tab
5. ✅ Both tabs should show same language
6. ✅ All dropdowns should show same 12 languages
7. ✅ Chinese should appear as 简体中文 and 繁體中文
```

**Test Case 5: RTL Languages**
```
1. Change language to العربية (Arabic)
2. ✅ UI should flip to RTL layout
3. ✅ Text should align right
4. ✅ Navigation should reverse
5. Change back to English
6. ✅ UI should revert to LTR
```

### Step 5.2: Automated Tests

**Test File**: `frontend/src/hooks/__tests__/useLanguagePreference.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useLanguagePreference } from '../useLanguagePreference';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

describe('useLanguagePreference', () => {
  it('should return current language from user profile', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>
        <LanguageProvider>{children}</LanguageProvider>
      </AuthProvider>
    );

    const { result } = renderHook(() => useLanguagePreference(), { wrapper });

    expect(result.current.currentLanguage).toBe('en');
    expect(result.current.availableLanguages).toHaveLength(12);
  });

  it('should change language and update user profile', async () => {
    const { result } = renderHook(() => useLanguagePreference(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      await result.current.changeLanguage('zh');
    });

    await waitFor(() => {
      expect(result.current.currentLanguage).toBe('zh');
    });
  });

  it('should include both Chinese variants', () => {
    const { result } = renderHook(() => useLanguagePreference(), {
      wrapper: TestWrapper,
    });

    const chineseLanguages = result.current.availableLanguages.filter(
      lang => lang.value.startsWith('zh')
    );

    expect(chineseLanguages).toHaveLength(2);
    expect(chineseLanguages[0].value).toBe('zh');
    expect(chineseLanguages[1].value).toBe('zh-tw');
  });
});
```

### Step 5.3: Integration Tests

**Test File**: `frontend/cypress/e2e/language-settings.cy.ts`

```typescript
describe('Language Settings Integration', () => {
  beforeEach(() => {
    cy.login(); // Custom command for auth
    cy.visit('/app/settings');
  });

  it('should change language and persist across navigation', () => {
    // Change language to Chinese
    cy.get('[data-testid="language-selector"]').click();
    cy.contains('简体中文').click();

    // Verify UI updates
    cy.contains('设置').should('be.visible'); // "Settings" in Chinese

    // Navigate to dashboard
    cy.visit('/app');

    // Verify language persists
    cy.contains('创建摘要').should('be.visible'); // "Create Summary" in Chinese

    // Verify summary form uses Chinese as default
    cy.get('[data-testid="summary-language-dropdown"]')
      .should('contain', '简体中文');
  });

  it('should show consistent language list everywhere', () => {
    const expectedLanguages = [
      'English',
      'Español',
      'Français',
      'Deutsch',
      '简体中文',
      '繁體中文',
      '日本語',
      '한국어',
      'Português',
      'Italiano',
      'Русский',
      'العربية',
    ];

    // Check settings page
    cy.get('[data-testid="language-selector"]').click();
    expectedLanguages.forEach(lang => {
      cy.contains(lang).should('exist');
    });
    cy.get('[data-testid="language-selector"]').click(); // Close

    // Check dashboard
    cy.visit('/app');
    cy.get('[data-testid="summary-language-dropdown"]').click();
    expectedLanguages.forEach(lang => {
      cy.contains(lang).should('exist');
    });
  });
});
```

---

## 6. Code Examples

### Example 1: Using useLanguagePreference in a New Component

```typescript
'use client';

import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { SelectDropdown } from '@/components/ui/SelectDropdown';

export function MyLanguagePicker() {
  const {
    currentLanguage,
    currentLanguageLabel,
    availableLanguages,
    isChanging,
    changeLanguage,
  } = useLanguagePreference();

  return (
    <div>
      <p>Current language: {currentLanguageLabel}</p>
      
      <SelectDropdown
        value={currentLanguage}
        options={availableLanguages}
        onValueChange={changeLanguage}
        disabled={isChanging}
        label="Select Language"
      />
    </div>
  );
}
```

### Example 2: Accessing Language in Server Components

```typescript
import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE_CODE } from '@/config/languages';

export default async function ServerPage() {
  // Read language from cookie (set by i18n)
  const cookieStore = cookies();
  const languageCode = cookieStore.get('i18nextLng')?.value || DEFAULT_LANGUAGE_CODE;

  return (
    <div>
      <p>Server detected language: {languageCode}</p>
    </div>
  );
}
```

### Example 3: Converting Language Formats

```typescript
import { 
  getLanguageByCode, 
  LANGUAGE_CODE_TO_NAME 
} from '@/config/languages';

// ISO code → Native display name
const lang = getLanguageByCode('zh');
console.log(lang?.label); // "简体中文 (Chinese Simplified)"

// ISO code → Backend English name (for API)
const backendName = LANGUAGE_CODE_TO_NAME['zh'];
console.log(backendName); // "Chinese (Simplified)"

// Display in UI, send to API
function sendToBackend(isoCode: string) {
  const backendName = LANGUAGE_CODE_TO_NAME[isoCode];
  fetch('/api/summary', {
    method: 'POST',
    body: JSON.stringify({ language: backendName })
  });
}
```

---

## 7. Migration Guide

### 7.1 Database Migration (Optional)

If you want to clean up old settings data:

```sql
-- Backup existing settings
CREATE TABLE user_settings_backup AS 
SELECT * FROM user_settings;

-- Remove deprecated language fields from settings JSON
-- (This depends on your DB structure - skip if not applicable)
UPDATE user_settings 
SET settings = settings - 'language' - 'preferences.defaultLanguage'
WHERE settings IS NOT NULL;
```

### 7.2 Data Migration Script

For existing users, ensure `user.language_preference` is set:

**File**: `backend/scripts/migrate-language-settings.ts`

```typescript
import { getAllUsers, updateUser } from '../src/storage/local-user.storage';
import { logger } from '../src/utils/logger';

async function migrateLanguageSettings() {
  logger.info('Starting language settings migration...');
  
  const users = await getAllUsers();
  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    // Skip if language_preference already set
    if (user.language_preference) {
      skipped++;
      continue;
    }

    // Try to get language from settings (old system)
    const settings = user.settings as any;
    const oldLanguage = settings?.language || settings?.preferences?.defaultLanguage;

    if (oldLanguage) {
      await updateUser(user.id, {
        language_preference: oldLanguage.toLowerCase(),
      });
      migrated++;
      logger.info(`Migrated user ${user.id}: ${oldLanguage} → language_preference`);
    } else {
      // Set default
      await updateUser(user.id, {
        language_preference: 'en',
      });
      migrated++;
      logger.info(`Set default language for user ${user.id}`);
    }
  }

  logger.info(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
}

migrateLanguageSettings().catch(console.error);
```

Run with: `npm run migrate:language`

### 7.3 Frontend Migration (User-Facing)

**Optional**: Show a one-time notice to users:

```typescript
// In root layout or app component
useEffect(() => {
  const hasSeenLanguageMigrationNotice = 
    localStorage.getItem('language_migration_notice_seen');
  
  if (!hasSeenLanguageMigrationNotice && user) {
    toast.info(
      'We\'ve simplified language settings! Your preference is now managed in one place.',
      { duration: 5000 }
    );
    localStorage.setItem('language_migration_notice_seen', 'true');
  }
}, [user]);
```

---

## 8. Rollback Plan

### 8.1 If Issues Occur During Deployment

**Step 1**: Revert Backend Changes
```bash
git revert <commit-hash>
npm run deploy:backend
```

**Step 2**: Revert Frontend Changes
```bash
git revert <commit-hash>
npm run deploy:frontend
```

### 8.2 If Data Loss Occurs

Restore from backup (created in migration step):
```sql
-- Restore settings
DROP TABLE user_settings;
ALTER TABLE user_settings_backup RENAME TO user_settings;
```

### 8.3 Gradual Rollout Strategy

**Option 1: Feature Flag**
```typescript
const USE_UNIFIED_LANGUAGE_SYSTEM = process.env.NEXT_PUBLIC_UNIFIED_LANGUAGE === 'true';

export function LanguageSelector() {
  if (USE_UNIFIED_LANGUAGE_SYSTEM) {
    return <NewLanguageSelector />;
  }
  return <OldLanguageSelector />;
}
```

**Option 2: A/B Testing**
```typescript
const isInNewLanguageExperiment = user.experiments?.includes('unified_language');
```

---

## 9. Success Metrics

### 9.1 Technical Metrics

- [ ] Zero duplicate language fields in database
- [ ] 100% of language dropdowns use centralized config
- [ ] Language change latency < 500ms
- [ ] Cache hit rate for language data > 95%
- [ ] Zero console errors related to language

### 9.2 User Experience Metrics

- [ ] Language change success rate > 99%
- [ ] User confusion reports about language settings = 0
- [ ] Support tickets about "language not changing" = 0
- [ ] Average time to change language < 10 seconds

### 9.3 Code Quality Metrics

- [ ] Lines of language-related code reduced by > 30%
- [ ] Number of language conversion functions reduced from 6 to 2
- [ ] Test coverage for language features > 80%

---

## 10. Future Enhancements

### 10.1 Phase 2 Improvements (Post-Launch)

1. **Language Auto-Detection**
   - Detect user's browser language on first visit
   - Suggest language based on IP geolocation
   - Remember preference for anonymous users

2. **Language Learning Mode**
   - Show both native and English translations
   - Help users learn interface terminology

3. **Regional Variants**
   - Add more regional variants (es-MX, pt-BR, en-GB)
   - Support dialect preferences

4. **Voice Language Selection**
   - Add voice input for language preference
   - Accessibility improvement

### 10.2 Technical Improvements

1. **CDN Optimization**
   - Cache translation files on CDN
   - Lazy load language packs
   - Reduce bundle size

2. **Advanced Caching**
   - Service worker for offline language support
   - Pre-fetch user's language on login

3. **Analytics**
   - Track language distribution
   - Identify translation gaps
   - Monitor language change patterns

---

## 11. Appendix

### 11.1 Language Code Reference

| ISO Code | English Name | Native Name | Backend Name |
|----------|-------------|-------------|--------------|
| en | English | English | English |
| es | Spanish | Español | Spanish |
| fr | French | Français | French |
| de | German | Deutsch | German |
| zh | Chinese (Simplified) | 简体中文 | Chinese (Simplified) |
| zh-tw | Chinese (Traditional) | 繁體中文 | Chinese (Traditional) |
| ja | Japanese | 日本語 | Japanese |
| ko | Korean | 한국어 | Korean |
| pt | Portuguese | Português | Portuguese |
| it | Italian | Italiano | Italian |
| ru | Russian | Русский | Russian |
| ar | Arabic | العربية | Arabic |

### 11.2 File Change Summary

| File | Type | Changes |
|------|------|---------|
| `backend/src/types/user-settings.ts` | Modified | Remove language fields |
| `backend/src/controllers/user.controller.ts` | Modified | Remove sync logic, add endpoint |
| `backend/src/routes/user.routes.ts` | Modified | Add language endpoint |
| `frontend/src/hooks/useLanguagePreference.ts` | New | Unified language hook |
| `frontend/src/contexts/LanguageContext.tsx` | Modified | Add refetch support |
| `frontend/src/components/settings/LanguageSelector.tsx` | Modified | Use new hook |
| `frontend/src/app/app/settings/page.tsx` | Modified | Remove language fields |
| `frontend/src/components/account/ProfileForm.tsx` | Modified | Add language display |
| `frontend/src/components/dashboard/ControlPanel.tsx` | Modified | Use centralized config |
| `frontend/src/hooks/useSummaryForm.ts` | Modified | Simplify language logic |
| `frontend/src/contexts/AuthContext.tsx` | Modified | Add cache invalidation |
| `frontend/src/lib/api.ts` | Modified | Add language endpoint |

**Total Files Changed**: 12  
**Total Files Added**: 1  
**Total Lines Changed**: ~500-700 lines

---

## 12. Contact & Support

**Implementation Team**:
- Lead Developer: [Your Name]
- Backend Developer: [Name]
- Frontend Developer: [Name]
- QA Engineer: [Name]

**Timeline**:
- Planning: 1 day (complete)
- Implementation: 2-3 days
- Testing: 1-2 days
- Deployment: 1 day
- **Total**: 5-7 days

**Questions?** Open a GitHub issue with label `language-settings-unification`

---

**Document End**
