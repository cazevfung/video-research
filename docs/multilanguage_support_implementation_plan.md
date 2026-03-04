# Multi-Language Support Implementation Plan

| Version | 1.0 |
| :--- | :--- |
| **Status** | Implementation Guide |
| **Based on PRD** | `multilanguage_support_prd.md` v1.0 |
| **Estimated Duration** | 5 weeks |

---

## Overview

This document provides a detailed, phase-by-phase implementation plan for adding comprehensive multi-language (i18n) support to the Video Research application. Each phase includes specific tasks, file paths, code changes, and testing steps.

---

## Phase 1: Foundation (Week 1)

**Goal:** Set up the core infrastructure for i18n support, including backend user model updates, frontend i18n library installation, and basic configuration.

### 1.1 Backend: User Model Updates

#### Task 1.1.1: Add `language_preference` to User Interface

**File:** `backend/src/models/User.ts`

**Changes:**
1. Add `language_preference?: string` to `User` interface (after line 41)
2. Add `language_preference?: string` to `UserUpdateData` interface (after line 84)

**Code:**
```typescript
export interface User {
  // ... existing fields ...
  legacy_credits_remaining?: number;
  language_preference?: string; // ISO 639-1 language code (e.g., 'en', 'es', 'fr')
}

export interface UserUpdateData {
  // ... existing fields ...
  legacy_credits_remaining?: number;
  language_preference?: string; // ISO 639-1 language code
}
```

**Testing:**
- Verify TypeScript compiles without errors
- Verify existing code still works

---

#### Task 1.1.2: Add Language Validation Function

**File:** `backend/src/utils/validators.ts`

**Changes:**
1. Read the file to understand existing validation structure
2. Add `validateLanguagePreference` function
3. Import `getSummaryConfig` if needed

**Code:**
```typescript
import { getSummaryConfig } from '../config';

/**
 * Language code to full name mapping
 */
const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'zh': 'Chinese (Simplified)',
  'zh-tw': 'Chinese (Traditional)',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt': 'Portuguese',
  'it': 'Italian',
  'ru': 'Russian',
  'ar': 'Arabic',
};

/**
 * Validates language preference against supported languages
 */
export function validateLanguagePreference(language: string): ValidationResult {
  if (!language || typeof language !== 'string') {
    return {
      valid: false,
      errors: [{
        field: 'language_preference',
        message: 'Language preference must be a non-empty string',
        value: language,
      }],
    };
  }

  const normalizedLanguage = language.toLowerCase().trim();
  const summaryConfig = getSummaryConfig();
  const supportedLanguages = summaryConfig.supported_languages || ['English'];
  
  const languageName = LANGUAGE_CODE_TO_NAME[normalizedLanguage];
  if (!languageName) {
    return {
      valid: false,
      errors: [{
        field: 'language_preference',
        message: `Unsupported language code: ${language}. Supported codes: ${Object.keys(LANGUAGE_CODE_TO_NAME).join(', ')}`,
        value: language,
      }],
    };
  }

  if (!supportedLanguages.includes(languageName)) {
    return {
      valid: false,
      errors: [{
        field: 'language_preference',
        message: `Language ${languageName} is not enabled in backend configuration`,
        value: language,
      }],
    };
  }
  
  return { valid: true, errors: [] };
}
```

**Testing:**
- Test with valid language codes ('en', 'es', 'fr', etc.)
- Test with invalid codes ('xx', 'invalid')
- Test with empty string
- Test with null/undefined
- Test case insensitivity ('EN', 'Es', 'FR')

---

#### Task 1.1.3: Update User Update Function to Validate Language

**File:** `backend/src/models/User.ts`

**Changes:**
1. Import `validateLanguagePreference` from validators
2. Add validation in `updateUser` function before updating

**Code:**
```typescript
import { validateLanguagePreference } from '../utils/validators';

// In updateUser function, before the updateData assignment:
if (data.language_preference !== undefined) {
  const validation = validateLanguagePreference(data.language_preference);
  if (!validation.valid) {
    throw new Error(validation.errors[0].message);
  }
  // Normalize to lowercase
  data.language_preference = data.language_preference.toLowerCase().trim();
}
```

**Testing:**
- Test updating user with valid language
- Test updating user with invalid language (should throw error)
- Test updating user without language (should work)

---

### 1.2 Backend: API Endpoints

#### Task 1.2.1: Update GET /auth/me to Include language_preference

**File:** `backend/src/controllers/auth.controller.ts`

**Changes:**
1. Find the endpoint that returns user profile
2. Ensure `language_preference` is included in response
3. Default to 'en' if not set

**Code:**
```typescript
// In the response, ensure user object includes language_preference:
const user = await getUserByUid(req.user.uid);
return res.json({
  user: {
    ...user,
    language_preference: user.language_preference || 'en',
  },
  quota: { /* ... */ }
});
```

**Testing:**
- Test with user that has language_preference set
- Test with user that doesn't have language_preference (should default to 'en')
- Verify response structure

---

#### Task 1.2.2: Update PATCH /api/user/profile to Accept language_preference

**File:** `backend/src/controllers/user.controller.ts` or `backend/src/routes/user.routes.ts`

**Changes:**
1. Find the user profile update endpoint
2. Add `language_preference` to accepted fields
3. Ensure validation is called

**Code:**
```typescript
// In the update profile handler:
const { language_preference, ...otherFields } = req.body;

if (language_preference !== undefined) {
  const validation = validateLanguagePreference(language_preference);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.errors[0].message,
    });
  }
}

await updateUser(req.user.uid, {
  ...otherFields,
  language_preference: language_preference?.toLowerCase().trim(),
});
```

**Testing:**
- Test updating language_preference via API
- Test with invalid language (should return 400)
- Test with valid language (should succeed)
- Verify language is saved to database

---

### 1.3 Frontend: Install Dependencies

#### Task 1.3.1: Install i18n Packages

**Location:** `frontend/` directory

**Command:**
```bash
cd frontend
npm install i18next react-i18next i18next-browser-languagedetector
npm install --save-dev @types/i18next-browser-languagedetector
```

**Verification:**
- Check `package.json` for new dependencies
- Verify no conflicts with existing packages

---

### 1.4 Frontend: Create Translation File Structure

#### Task 1.4.1: Create Locales Directory Structure

**Location:** `frontend/src/locales/`

**Structure to create:**
```
frontend/src/locales/
  en/
    common.json
    navigation.json
    dashboard.json
    history.json
    settings.json
    account.json
    summary.json
    errors.json
    validation.json
    auth.json
  es/
    (same structure)
  fr/
    (same structure)
  de/
    (same structure)
  zh/
    (same structure)
  zh-tw/
    (same structure)
  ja/
    (same structure)
  ko/
    (same structure)
  pt/
    (same structure)
  it/
    (same structure)
  ru/
    (same structure)
  ar/
    (same structure)
  index.ts
  types.ts
```

**Action:**
- Create all directories
- Create empty JSON files for each language/namespace
- Start with English translations only (other languages will be added in Phase 2)

---

#### Task 1.4.2: Create Initial English Translation Files

**Files:** `frontend/src/locales/en/*.json`

**Start with minimal content:**

**`common.json`:**
```json
{
  "buttons": {
    "submit": "Submit",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "previous": "Previous"
  },
  "labels": {
    "email": "Email",
    "password": "Password",
    "name": "Name",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  }
}
```

**`navigation.json`:**
```json
{
  "dashboard": "Dashboard",
  "history": "History",
  "settings": "Settings",
  "account": "Account"
}
```

**`settings.json`:**
```json
{
  "title": "Settings",
  "language": {
    "label": "Language",
    "description": "Select your preferred language"
  }
}
```

**Other files:** Create empty JSON objects `{}` for now

---

#### Task 1.4.3: Create TypeScript Types for Translations

**File:** `frontend/src/locales/types.ts`

**Code:**
```typescript
import 'react-i18next';
import enCommon from './en/common.json';
import enNavigation from './en/navigation.json';
import enDashboard from './en/dashboard.json';
import enHistory from './en/history.json';
import enSettings from './en/settings.json';
import enAccount from './en/account.json';
import enSummary from './en/summary.json';
import enErrors from './en/errors.json';
import enValidation from './en/validation.json';
import enAuth from './en/auth.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      navigation: typeof enNavigation;
      dashboard: typeof enDashboard;
      history: typeof enHistory;
      settings: typeof enSettings;
      account: typeof enAccount;
      summary: typeof enSummary;
      errors: typeof enErrors;
      validation: typeof enValidation;
      auth: typeof enAuth;
    };
  }
}
```

---

### 1.5 Frontend: Configure i18n

#### Task 1.5.1: Create i18n Configuration

**File:** `frontend/src/lib/i18n.ts`

**Code:**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import English translations
import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
import enDashboard from '../locales/en/dashboard.json';
import enHistory from '../locales/en/history.json';
import enSettings from '../locales/en/settings.json';
import enAccount from '../locales/en/account.json';
import enSummary from '../locales/en/summary.json';
import enErrors from '../locales/en/errors.json';
import enValidation from '../locales/en/validation.json';
import enAuth from '../locales/en/auth.json';

// Import other languages (will be added in Phase 2)
// For now, import empty objects
import esCommon from '../locales/es/common.json';
// ... import all other languages

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        navigation: enNavigation,
        dashboard: enDashboard,
        history: enHistory,
        settings: enSettings,
        account: enAccount,
        summary: enSummary,
        errors: enErrors,
        validation: enValidation,
        auth: enAuth,
      },
      // Other languages will be added in Phase 2
      es: {
        common: esCommon,
        // ... other namespaces
      },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
```

---

#### Task 1.5.2: Initialize i18n in App

**File:** `frontend/src/app/layout.tsx` or root layout file

**Changes:**
1. Import i18n configuration
2. Ensure it's initialized before app renders

**Code:**
```typescript
import '../lib/i18n'; // Initialize i18n
```

**Testing:**
- Verify app starts without errors
- Check browser console for i18n initialization messages

---

### 1.6 Frontend: Create Language Context

#### Task 1.6.1: Create LanguageContext

**File:** `frontend/src/contexts/LanguageContext.tsx`

**Code:**
```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { updateUserProfile } from '../lib/api';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize language from user profile or localStorage
  useEffect(() => {
    if (isAuthenticated && user?.language_preference) {
      i18n.changeLanguage(user.language_preference);
    }
  }, [isAuthenticated, user?.language_preference, i18n]);

  const changeLanguage = async (lang: string) => {
    setIsLoading(true);
    try {
      // Update i18n immediately
      await i18n.changeLanguage(lang);
      
      // Save to localStorage
      localStorage.setItem('i18nextLng', lang);
      
      // Update user profile if authenticated
      if (isAuthenticated && user) {
        try {
          await updateUserProfile({ language_preference: lang });
        } catch (error) {
          console.error('Failed to sync language to backend:', error);
          // Don't fail the language change if backend sync fails
        }
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage: i18n.language,
        changeLanguage,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
```

---

#### Task 1.6.2: Add LanguageProvider to App

**File:** `frontend/src/components/providers.tsx` or root provider file

**Changes:**
1. Import `LanguageProvider`
2. Wrap app with `LanguageProvider` (should be inside `AuthProvider` to access auth context)

**Code:**
```typescript
import { LanguageProvider } from '@/contexts/LanguageContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </AuthProvider>
  );
}
```

**Testing:**
- Verify app renders without errors
- Check that LanguageContext is available

---

### 1.7 Phase 1 Testing Checklist

- [ ] Backend User model includes `language_preference` field
- [ ] Language validation function works correctly
- [ ] User update validates language preference
- [ ] GET /auth/me returns language_preference
- [ ] PATCH /api/user/profile accepts language_preference
- [ ] Frontend i18n packages installed
- [ ] Translation file structure created
- [ ] i18n configuration file created
- [ ] LanguageContext created and integrated
- [ ] App initializes without errors
- [ ] TypeScript compiles without errors

---

## Phase 2: Core Translations (Week 2)

**Goal:** Extract and translate common UI strings, navigation, and core pages. Create the language selector component.

### 2.1 Extract Common UI Strings

#### Task 2.1.1: Update Common Translation File

**File:** `frontend/src/locales/en/common.json`

**Action:**
1. Review all UI components for common strings
2. Extract buttons, labels, messages
3. Add to `common.json`

**Key areas to cover:**
- Buttons (submit, cancel, save, delete, edit, close, back, next, previous)
- Labels (email, password, name, loading, error, success)
- Messages (confirmations, warnings, info)
- Placeholders
- Tooltips

---

#### Task 2.1.2: Replace Hardcoded Strings in Common Components

**Files to update:**
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Input.tsx`
- Any other shared UI components

**Process:**
1. Import `useTranslation` hook
2. Replace hardcoded strings with `t('common.key')`
3. Test component still works

**Example:**
```typescript
import { useTranslation } from 'react-i18next';

export function Button({ children, ...props }) {
  const { t } = useTranslation('common');
  // If children is a common string, use translation
  return <button {...props}>{children}</button>;
}
```

---

### 2.2 Translate Navigation

#### Task 2.2.1: Update Navigation Translation File

**File:** `frontend/src/locales/en/navigation.json`

**Content:**
```json
{
  "dashboard": "Dashboard",
  "history": "History",
  "settings": "Settings",
  "account": "Account",
  "login": "Login",
  "signup": "Sign Up",
  "logout": "Logout"
}
```

---

#### Task 2.2.2: Update Navigation Components

**Files to check:**
- Navigation menu components
- Breadcrumbs
- Sidebar (if exists)

**Process:**
1. Find navigation components
2. Replace hardcoded labels with translations
3. Test navigation still works

---

### 2.3 Translate Dashboard Page

#### Task 2.3.1: Create Dashboard Translation File

**File:** `frontend/src/locales/en/dashboard.json`

**Content to extract:**
- Page title
- Form labels (URL input, preset selector, language selector)
- Button labels
- Status messages
- Error messages
- Placeholders

---

#### Task 2.3.2: Update Dashboard Page

**File:** `frontend/src/app/app/page.tsx` or `frontend/src/app/page.tsx`

**Process:**
1. Import `useTranslation`
2. Replace all hardcoded strings
3. Test page functionality

**Example:**
```typescript
import { useTranslation } from 'react-i18next';

export default function DashboardPage() {
  const { t } = useTranslation(['common', 'dashboard']);
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button>{t('common.buttons.submit')}</button>
    </div>
  );
}
```

---

### 2.4 Translate Settings Page

#### Task 2.4.1: Create Settings Translation File

**File:** `frontend/src/locales/en/settings.json`

**Content:**
```json
{
  "title": "Settings",
  "sections": {
    "general": {
      "title": "General",
      "description": "Appearance and language preferences"
    },
    "notifications": {
      "title": "Notifications",
      "description": "Manage your notification preferences"
    },
    "privacy": {
      "title": "Privacy",
      "description": "Control your data sharing and analytics preferences"
    },
    "account": {
      "title": "Account",
      "description": "Account management and security settings"
    },
    "preferences": {
      "title": "Preferences",
      "description": "Default settings for summary generation"
    }
  },
  "language": {
    "label": "Language",
    "description": "Select your preferred language"
  },
  "theme": {
    "label": "Theme",
    "description": "Choose your preferred color theme"
  }
}
```

---

#### Task 2.4.2: Update Settings Page

**File:** `frontend/src/app/app/settings/page.tsx` or `frontend/src/app/settings/page.tsx`

**Process:**
1. Replace hardcoded section titles and descriptions
2. Update language selector labels
3. Test settings page

---

### 2.5 Create Language Selector Component

#### Task 2.5.1: Create LanguageSelector Component

**File:** `frontend/src/components/settings/LanguageSelector.tsx`

**Code:**
```typescript
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { useTranslation } from 'react-i18next';

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'de', label: 'Deutsch (German)' },
  { value: 'zh', label: '中文 (Chinese Simplified)' },
  { value: 'zh-tw', label: '繁體中文 (Chinese Traditional)' },
  { value: 'ja', label: '日本語 (Japanese)' },
  { value: 'ko', label: '한국어 (Korean)' },
  { value: 'pt', label: 'Português (Portuguese)' },
  { value: 'it', label: 'Italiano (Italian)' },
  { value: 'ru', label: 'Русский (Russian)' },
  { value: 'ar', label: 'العربية (Arabic)' },
];

export function LanguageSelector() {
  const { currentLanguage, changeLanguage, isLoading } = useLanguage();
  const { t } = useTranslation('settings');

  return (
    <SelectDropdown
      value={currentLanguage}
      onValueChange={changeLanguage}
      options={languageOptions}
      label={t('language.label')}
      description={t('language.description')}
      disabled={isLoading}
    />
  );
}
```

---

#### Task 2.5.2: Integrate LanguageSelector in Settings Page

**File:** `frontend/src/app/app/settings/page.tsx`

**Changes:**
1. Import `LanguageSelector`
2. Replace existing language dropdown with `LanguageSelector` component

**Code:**
```typescript
import { LanguageSelector } from '@/components/settings/LanguageSelector';

// Replace the existing SelectDropdown for language with:
<LanguageSelector />
```

---

### 2.6 Update i18n Configuration with All Languages

#### Task 2.6.1: Import All Language Translations

**File:** `frontend/src/lib/i18n.ts`

**Changes:**
1. Import all language translation files
2. Add all languages to resources object

**Note:** For now, other languages can use English translations as placeholders (will be translated in Phase 3)

---

### 2.7 Phase 2 Testing Checklist

- [ ] Common UI strings extracted and translated
- [ ] Navigation translated
- [ ] Dashboard page translated
- [ ] Settings page translated
- [ ] LanguageSelector component created
- [ ] LanguageSelector integrated in settings
- [ ] Language switching works (UI updates immediately)
- [ ] Language persists in localStorage
- [ ] Language syncs to backend (for logged-in users)
- [ ] All pages render without errors
- [ ] No hardcoded English strings in translated components

---

## Phase 3: Feature Translations (Week 3)

**Goal:** Translate remaining pages and features: history, account, summary form, authentication, errors, and validation messages.

### 3.1 Translate History Page

#### Task 3.1.1: Create History Translation File

**File:** `frontend/src/locales/en/history.json`

**Content to extract:**
- Page title
- Empty state messages
- Search placeholder
- Sort options
- Filter labels
- Action buttons
- Date labels

---

#### Task 3.1.2: Update History Page Components

**Files:**
- `frontend/src/app/app/history/page.tsx` or `frontend/src/app/history/page.tsx`
- `frontend/src/components/history/*.tsx`

**Process:**
1. Extract all strings
2. Add to translation file
3. Replace in components
4. Test functionality

---

### 3.2 Translate Account Page

#### Task 3.2.1: Create Account Translation File

**File:** `frontend/src/locales/en/account.json`

**Content to extract:**
- Page title
- Section titles (Profile, Credits, Tier, etc.)
- Form labels
- Button labels
- Status messages

---

#### Task 3.2.2: Update Account Page Components

**Files:**
- `frontend/src/app/app/account/page.tsx` or `frontend/src/app/account/page.tsx`
- `frontend/src/components/account/*.tsx`

**Process:**
1. Extract strings
2. Translate
3. Update components
4. Test

---

### 3.3 Translate Summary Form

#### Task 3.3.1: Create Summary Translation File

**File:** `frontend/src/locales/en/summary.json`

**Content:**
```json
{
  "form": {
    "title": "YouTube Summary Generator",
    "urlLabel": "YouTube URLs",
    "urlPlaceholder": "Paste YouTube URLs here, one per line",
    "presetLabel": "Summary Style",
    "languageLabel": "Summary Language",
    "customPromptLabel": "Custom Prompt (Optional)",
    "submitButton": "Generate Summary",
    "processing": "Processing...",
    "starting": "Starting..."
  },
  "language": {
    "default": "Default (Your Preference)",
    "english": "English",
    "spanish": "Spanish",
    "french": "French",
    "german": "German",
    "chineseSimplified": "Chinese (Simplified)",
    "chineseTraditional": "Chinese (Traditional)",
    "japanese": "Japanese",
    "korean": "Korean",
    "portuguese": "Portuguese",
    "italian": "Italian",
    "russian": "Russian",
    "arabic": "Arabic"
  },
  "messages": {
    "pasteUrl": "Paste at least one YouTube URL to continue",
    "selectPreset": "Please select a prompt preset to continue"
  }
}
```

---

#### Task 3.3.2: Update Summary Form Components

**Files:**
- `frontend/src/components/dashboard/ControlPanel.tsx`
- `frontend/src/components/dashboard/UrlInputArea.tsx`
- `frontend/src/hooks/useSummaryForm.ts` (if it has UI strings)

**Process:**
1. Extract strings
2. Update components
3. Test form functionality

---

### 3.4 Translate Authentication Pages

#### Task 3.4.1: Create Auth Translation File

**File:** `frontend/src/locales/en/auth.json`

**Content to extract:**
- Login page title, labels, buttons
- Signup page title, labels, buttons
- Error messages
- Success messages
- Placeholders

---

#### Task 3.4.2: Update Authentication Components

**Files:**
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/components/auth/*.tsx`

**Process:**
1. Extract strings
2. Update components
3. Test login/signup flow

---

### 3.5 Translate Error Messages

#### Task 3.5.1: Create Errors Translation File

**File:** `frontend/src/locales/en/errors.json`

**Action:**
1. Review `frontend/src/config/messages.ts`
2. Extract all error messages
3. Add to translation file

**Content structure:**
```json
{
  "api": {
    "networkError": "Network error. Please check your connection.",
    "serverError": "Server error. Please try again later.",
    "unauthorized": "You are not authorized to perform this action.",
    "forbidden": "Access forbidden.",
    "notFound": "Resource not found."
  },
  "summary": {
    "generationFailed": "Failed to generate summary.",
    "invalidUrl": "Invalid YouTube URL."
  },
  "auth": {
    "loginFailed": "Login failed. Please check your credentials.",
    "signupFailed": "Sign up failed. Please try again."
  }
}
```

---

#### Task 3.5.2: Update Error Handling

**Files:**
- `frontend/src/config/messages.ts` (consider deprecating or converting to use i18n)
- Error display components
- Toast/notification components

**Process:**
1. Update error handling to use translations
2. Test error scenarios

---

### 3.6 Translate Validation Messages

#### Task 3.6.1: Create Validation Translation File

**File:** `frontend/src/locales/en/validation.json`

**Action:**
1. Review `frontend/src/config/validation-messages.ts`
2. Extract all validation messages
3. Add to translation file

---

#### Task 3.6.2: Update Validation

**Files:**
- `frontend/src/config/validation-messages.ts`
- Validation utility functions
- Form validation components

**Process:**
1. Update validation to use translations
2. Test form validation

---

### 3.7 Phase 3 Testing Checklist

- [ ] History page translated
- [ ] Account page translated
- [ ] Summary form translated
- [ ] Authentication pages translated
- [ ] Error messages translated
- [ ] Validation messages translated
- [ ] All pages functional in English
- [ ] No hardcoded strings remaining
- [ ] All translation keys exist

---

## Phase 4: Integration & Advanced Features (Week 4)

**Goal:** Integrate language preference with summary form, add RTL support, implement date/number formatting, and complete all language translations.

### 4.1 Integrate Language Preference with Summary Form

#### Task 4.1.1: Update useSummaryForm Hook

**File:** `frontend/src/hooks/useSummaryForm.ts`

**Changes:**
1. Import `useLanguage` and `useAuth`
2. Use user's language preference as default
3. Map language code to backend language name

**Code:**
```typescript
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// Language code to backend name mapping
const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'zh': 'Chinese (Simplified)',
  'zh-tw': 'Chinese (Traditional)',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt': 'Portuguese',
  'it': 'Italian',
  'ru': 'Russian',
  'ar': 'Arabic',
};

export function useSummaryForm(): UseSummaryFormReturn {
  const { currentLanguage } = useLanguage();
  const { user } = useAuth();
  const { config } = useConfig();
  
  // Determine default language: user preference > current UI language > config default > English
  const getDefaultLanguage = () => {
    if (user?.language_preference) {
      return LANGUAGE_CODE_TO_NAME[user.language_preference] || 'English';
    }
    if (currentLanguage && LANGUAGE_CODE_TO_NAME[currentLanguage]) {
      return LANGUAGE_CODE_TO_NAME[currentLanguage];
    }
    return config?.default_language || 'English';
  };
  
  const defaultLanguage = getDefaultLanguage();
  
  // Initialize language state with default
  const [language, setLanguageState] = React.useState(defaultLanguage);
  
  // Update when user preference changes
  React.useEffect(() => {
    const newDefault = getDefaultLanguage();
    setLanguageState(newDefault);
  }, [user?.language_preference, currentLanguage]);
  
  // ... rest of hook
}
```

---

#### Task 4.1.2: Update Backend Summary Controller

**File:** `backend/src/controllers/summary.controller.ts`

**Changes:**
1. If language not provided in request, use user's language_preference
2. Map language code to full name if needed

**Code:**
```typescript
// In createSummaryJob function:
let summaryLanguage = req.body.language;

// If language not provided, use user's preference
if (!summaryLanguage && req.user) {
  const user = await getUserByUid(req.user.uid);
  if (user?.language_preference) {
    // Map language code to full name
    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      // ... all mappings
    };
    summaryLanguage = languageMap[user.language_preference] || 'English';
  }
}

// Use summaryLanguage in summary request
```

**Testing:**
- Test summary generation with user language preference
- Test summary generation without language (should use preference)
- Test summary generation with explicit language (should override preference)

---

### 4.2 Add RTL (Right-to-Left) Support

#### Task 4.2.1: Update Root Layout for RTL

**File:** `frontend/src/app/layout.tsx` or `frontend/src/app/app/layout.tsx`

**Changes:**
1. Detect RTL languages
2. Set `dir` attribute on HTML element
3. Set `lang` attribute

**Code:**
```typescript
'use client';

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

const rtlLanguages = ['ar', 'he', 'fa']; // Arabic, Hebrew, Farsi

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const isRTL = rtlLanguages.includes(i18n.language);
  
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [isRTL, i18n.language]);
  
  return (
    <html dir={isRTL ? 'rtl' : 'ltr'} lang={i18n.language}>
      <body>{children}</body>
    </html>
  );
}
```

---

#### Task 4.2.2: Test RTL Layout

**Action:**
1. Switch to Arabic language
2. Verify layout direction changes
3. Test all pages in RTL mode
4. Fix any layout issues

**Common issues to check:**
- Text alignment
- Icons and images
- Margins and padding
- Navigation menus
- Forms

---

### 4.3 Add Date & Number Formatting

#### Task 4.3.1: Create Formatting Utilities

**File:** `frontend/src/utils/formatting.ts`

**Code:**
```typescript
import { useTranslation } from 'react-i18next';

export function useFormattedDate(date: Date | string) {
  const { i18n } = useTranslation();
  
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function useFormattedNumber(value: number) {
  const { i18n } = useTranslation();
  
  return new Intl.NumberFormat(i18n.language).format(value);
}

export function useFormattedCurrency(value: number, currency: string = 'USD') {
  const { i18n } = useTranslation();
  
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency,
  }).format(value);
}
```

---

#### Task 4.3.2: Update Components to Use Formatting

**Files:**
- Date display components
- Number display components
- History page (dates)
- Account page (numbers, dates)

**Process:**
1. Replace hardcoded date/number formatting
2. Use formatting utilities
3. Test in different languages

---

### 4.4 Complete All Language Translations

#### Task 4.4.1: Translate to Spanish (es)

**Action:**
1. Copy English translation files
2. Translate all strings to Spanish
3. Update `frontend/src/lib/i18n.ts` to import Spanish translations

**Priority files:**
- common.json
- navigation.json
- dashboard.json
- settings.json
- summary.json

---

#### Task 4.4.2: Translate to Other Languages

**Languages to translate:**
- French (fr)
- German (de)
- Chinese Simplified (zh)
- Chinese Traditional (zh-tw)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)
- Italian (it)
- Russian (ru)
- Arabic (ar)

**Process for each language:**
1. Create translation files
2. Translate all strings
3. Import in i18n.ts
4. Test language switching

**Note:** Use professional translation services or native speakers for quality translations.

---

### 4.5 Update i18n Configuration with All Languages

#### Task 4.5.1: Complete i18n Resources

**File:** `frontend/src/lib/i18n.ts`

**Changes:**
1. Import all language translations
2. Add all languages to resources object
3. Ensure all namespaces are included for each language

---

### 4.6 Phase 4 Testing Checklist

- [ ] Summary form uses user language preference as default
- [ ] User can override language in summary form
- [ ] Backend uses user preference when language not specified
- [ ] RTL layout works for Arabic
- [ ] Date formatting is localized
- [ ] Number formatting is localized
- [ ] All 12 languages have complete translations
- [ ] Language switching works for all languages
- [ ] No missing translation keys
- [ ] All pages render correctly in all languages

---

## Phase 5: Polish & Testing (Week 5)

**Goal:** Complete testing, fix any issues, optimize performance, and prepare for production.

### 5.1 Complete Translation Coverage

#### Task 5.1.1: Audit All Strings

**Action:**
1. Review entire codebase for hardcoded strings
2. Check all components
3. Verify all strings are in translation files
4. Add any missing strings

---

#### Task 5.1.2: Verify All Languages Have All Keys

**Action:**
1. Create script to check translation key coverage
2. Ensure all languages have all keys
3. Add missing translations

**Script example:**
```typescript
// scripts/check-translations.ts
import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';
// ... all languages

function checkKeys(base: any, compare: any, path: string = '') {
  const missing: string[] = [];
  
  for (const key in base) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof base[key] === 'object') {
      if (!compare[key]) {
        missing.push(currentPath);
      } else {
        missing.push(...checkKeys(base[key], compare[key], currentPath));
      }
    } else if (!compare[key]) {
      missing.push(currentPath);
    }
  }
  
  return missing;
}

// Check all languages against English
const missing = checkKeys(enCommon, esCommon);
console.log('Missing keys:', missing);
```

---

### 5.2 Performance Optimization

#### Task 5.2.1: Implement Lazy Loading (Optional)

**File:** `frontend/src/lib/i18n.ts`

**Changes:**
1. Consider using `i18next-http-backend` for lazy loading
2. Or keep current approach if bundle size is acceptable

**Note:** Current approach (importing all translations) is simpler but increases bundle size. Lazy loading reduces initial bundle but adds complexity.

---

#### Task 5.2.2: Optimize Translation File Size

**Action:**
1. Review translation files for redundancy
2. Remove unused keys
3. Optimize JSON structure if needed

---

### 5.3 Testing

#### Task 5.3.1: Manual Testing Checklist

**Test each language:**
- [ ] Language selector works
- [ ] UI updates immediately when language changes
- [ ] Language persists after page refresh
- [ ] Language syncs to backend (for logged-in users)
- [ ] All pages render correctly
- [ ] No missing translations
- [ ] No console errors
- [ ] Forms work correctly
- [ ] Navigation works
- [ ] Summary generation works with language preference
- [ ] RTL layout works (for Arabic)
- [ ] Date/number formatting is correct

---

#### Task 5.3.2: Cross-Browser Testing

**Browsers to test:**
- Chrome
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

**Test:**
- Language switching
- Translation display
- RTL layout
- Date/number formatting

---

#### Task 5.3.3: Integration Testing

**Test scenarios:**
1. User changes language in settings → UI updates → Language persists after refresh
2. User logs in → Language preference loads from profile
3. User generates summary → Language preference used as default
4. User overrides language in summary form → Override works
5. Guest user changes language → Language persists in localStorage only

---

### 5.4 Documentation

#### Task 5.4.1: Update Developer Documentation

**Create/update:**
- Translation key naming conventions
- How to add new translations
- How to add new languages
- Translation workflow

---

#### Task 5.4.2: Create User Documentation

**Create:**
- How to change language
- Supported languages list
- Language preference sync explanation

---

### 5.5 Final Checklist

- [ ] All translations complete
- [ ] All languages tested
- [ ] No missing translation keys
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] RTL layout works
- [ ] Date/number formatting works
- [ ] Summary form integration works
- [ ] Backend validation works
- [ ] API endpoints work correctly
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Ready for production

---

## Post-Implementation

### Monitoring

1. **Track language usage:**
   - Most popular languages
   - Language distribution
   - Language changes

2. **Monitor for issues:**
   - Missing translations
   - Translation errors
   - Performance issues

3. **User feedback:**
   - Translation quality
   - Missing features
   - Language requests

---

## Rollback Plan

If issues arise:

1. **Frontend:**
   - Revert i18n changes
   - Keep language_preference in backend (for future use)
   - Restore hardcoded English strings

2. **Backend:**
   - Keep language_preference field (optional, won't break existing code)
   - Remove validation if causing issues

---

## Success Metrics

Track these metrics after deployment:

1. **Adoption:**
   - % of users who change language from default
   - Most popular languages
   - Language retention rate

2. **Quality:**
   - Missing translation rate (target: 0%)
   - Translation error rate (target: 0%)
   - % of UI translated (target: 100%)

3. **Performance:**
   - Language switch time (target: <100ms)
   - Translation file load time (target: <200ms)
   - Bundle size increase (target: <50KB per language)

---

## Appendix

### A. Translation Key Naming Convention

**Structure:** `namespace.section.item`

**Examples:**
- `common.buttons.submit`
- `dashboard.form.urlLabel`
- `errors.api.networkError`
- `validation.email.invalid`

**Best Practices:**
- Use nested structure for organization
- Keep keys descriptive
- Group related keys together
- Avoid deep nesting (max 3-4 levels)

---

### B. Adding a New Language

**Steps:**
1. Add language code to `languageOptions` in `LanguageSelector.tsx`
2. Create translation files in `frontend/src/locales/{code}/`
3. Import and add to i18n resources in `i18n.ts`
4. Add language to backend `config.yaml` if needed for summaries
5. Update language mapping in validation functions
6. Test language switching

---

### C. Useful Commands

```bash
# Check for missing translations (custom script)
npm run i18n:check

# Validate translation files
npm run i18n:validate

# Extract translation keys from code (if using i18next-scanner)
npm run i18n:extract
```

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Status:** Ready for Implementation

