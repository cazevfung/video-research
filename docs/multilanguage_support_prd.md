# Multi-Language Support PRD

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Tech Stack** | React (TypeScript), Node.js (TypeScript), i18next (or react-i18next) |
| **Dependencies** | Existing user profile system, summary generation system |

---

## 1. Executive Summary

This PRD outlines a comprehensive multi-language (i18n) support system for the Video Research application. The system will enable users to select their preferred language, which will be saved to their profile and automatically applied across the entire UI. Additionally, the user's language preference will be used as the default language for AI-generated summaries. The implementation is designed to be easily expandable and scalable, allowing seamless addition of new languages and features without requiring significant refactoring.

**Key Features:**
- User-selectable language preference stored in profile
- Complete UI translation system
- Automatic language detection and fallback
- Summary generation defaults to user's preferred language
- Scalable architecture for adding new languages
- Support for RTL (Right-to-Left) languages
- Language-specific formatting (dates, numbers, currency)

---

## 2. Current State Analysis

### 2.1 What Exists

1. **Backend Language Support**
   - ✅ Summary generation already supports 12 languages (English, Spanish, French, German, Chinese Simplified/Traditional, Japanese, Korean, Portuguese, Italian, Russian, Arabic)
   - ✅ Language validation in `backend/src/utils/validators.ts`
   - ✅ Language configuration in `backend/config.yaml` (`summary.supported_languages`)
   - ✅ Language parameter accepted in summary requests

2. **Frontend Language Options**
   - ⚠️ Basic language options defined in `frontend/src/config/settings.ts` (7 languages with codes: en, zh, es, fr, de, ja, ko)
   - ⚠️ Language dropdown exists in settings but not fully functional
   - ❌ No i18n library integration
   - ❌ No translation files or system

3. **User Profile**
   - ✅ User model supports extensible fields (`User` interface in `backend/src/models/User.ts`)
   - ✅ User update functionality exists (`updateUser` function)
   - ❌ No `language_preference` field in user profile
   - ❌ No API endpoint to update language preference

4. **UI Text**
   - ✅ Centralized error messages in `frontend/src/config/messages.ts`
   - ✅ Centralized validation messages in `frontend/src/config/validation-messages.ts`
   - ❌ All text is hardcoded in English
   - ❌ No translation infrastructure

### 2.2 Gaps to Address

1. **Backend**
   - Add `language_preference` field to User model
   - Add language preference to user creation/update endpoints
   - Return user's language preference in `GET /auth/me`
   - Validate language preference against supported languages

2. **Frontend**
   - Install and configure i18n library (react-i18next recommended)
   - Create translation file structure
   - Extract all hardcoded strings to translation files
   - Implement language selector component
   - Create language context/provider
   - Update summary form to use user's language preference as default
   - Implement language persistence (localStorage + profile)

3. **Translation Files**
   - Create translation files for all supported languages
   - Organize translations by feature/module
   - Support for pluralization and interpolation
   - Support for date/number formatting

---

## 3. Goals & Objectives

### 3.1 Primary Goals

1. **User Language Preference**
   - Users can select their preferred language from settings
   - Language preference is saved to user profile
   - Language preference persists across sessions
   - Language preference syncs across devices (for logged-in users)

2. **Complete UI Translation**
   - All UI text is translatable
   - Navigation, buttons, labels, messages, errors, tooltips
   - Settings page, account page, history page, dashboard
   - Loading states, error states, empty states

3. **Summary Language Integration**
   - Summary form defaults to user's preferred language
   - User can override language per summary request
   - Language preference is sent to backend for summary generation

4. **Scalable Architecture**
   - Easy to add new languages (just add translation files)
   - Easy to add new features (follow translation patterns)
   - Namespaced translations (organized by feature)
   - Type-safe translations (TypeScript support)

5. **Developer Experience**
   - Clear guidelines for adding new translations
   - TypeScript autocomplete for translation keys
   - Translation key validation
   - Missing translation detection

### 3.2 Success Criteria

- ✅ User can change language in settings and see immediate UI update
- ✅ Language preference persists after page refresh
- ✅ Language preference syncs to backend profile
- ✅ Summary form shows user's preferred language as default
- ✅ All UI text is translated (no hardcoded English strings)
- ✅ New languages can be added by creating translation files only
- ✅ New features automatically support all languages
- ✅ No performance degradation from i18n system

---

## 4. System Architecture

### 4.1 Technology Choices

**Frontend i18n Library: react-i18next**
- Industry standard for React applications
- Built on i18next (mature, well-maintained)
- Excellent TypeScript support
- Supports lazy loading of translation files
- Supports pluralization, interpolation, formatting
- Good performance with caching

**Alternative Considered:**
- `next-intl` (if using Next.js App Router exclusively)
- `react-intl` (Format.js, more complex setup)

**Backend:**
- No i18n library needed (backend only validates language codes)
- Language preference stored as string in user profile
- Language validation against `config.yaml` supported languages

### 4.2 Translation File Structure

```
frontend/
  src/
    locales/
      en/
        common.json          # Common UI elements (buttons, labels, etc.)
        navigation.json       # Navigation items
        dashboard.json       # Dashboard page
        history.json          # History page
        settings.json        # Settings page
        account.json         # Account page
        summary.json         # Summary form and results
        errors.json          # Error messages
        validation.json      # Validation messages
        auth.json            # Authentication pages
      es/
        common.json
        navigation.json
        # ... (same structure for all languages)
      fr/
        # ...
      # ... (all supported languages)
      index.ts               # Export all translations
      types.ts               # TypeScript types for translation keys
```

### 4.3 Data Flow

1. **User Changes Language:**
   ```
   User selects language in Settings
   → Language context updates
   → UI re-renders with new language
   → Language saved to localStorage (immediate)
   → API call to update user profile (async)
   → Profile updated in backend
   ```

2. **User Loads Application:**
   ```
   App initializes
   → Check localStorage for language preference
   → If logged in, fetch user profile (includes language_preference)
   → Use profile language if available, else localStorage, else browser language, else 'en'
   → Load translation files for selected language
   → Render UI with translations
   ```

3. **Summary Generation:**
   ```
   User opens summary form
   → Form loads user's language preference
   → Language dropdown defaults to user preference
   → User can override if needed
   → Summary request includes language parameter
   → Backend generates summary in requested language
   ```

### 4.4 Language Detection Priority

1. **User Profile** (if logged in) - Highest priority
2. **LocalStorage** (if exists)
3. **Browser Language** (navigator.language)
4. **Default: English** ('en')

---

## 5. Database Schema Changes

### 5.1 User Model Update

**File:** `backend/src/models/User.ts`

Add `language_preference` field to `User` interface:

```typescript
export interface User {
  id?: string;
  email: string;
  uid?: string;
  googleId?: string;
  name: string;
  tier: UserTier;
  credits_remaining: number;
  created_at: Date | string;
  last_reset?: Date | string;
  language_preference?: string; // NEW: ISO 639-1 language code (e.g., 'en', 'es', 'fr')
}
```

**File:** `backend/src/models/User.ts` (UserUpdateData)

Add `language_preference` to update data:

```typescript
export interface UserUpdateData {
  email?: string;
  name?: string;
  tier?: UserTier;
  credits_remaining?: number;
  last_reset?: Date | string;
  language_preference?: string; // NEW
}
```

### 5.2 Firestore Schema

**Collection: `users`**

Add optional field:
```json
{
  "language_preference": "en" // ISO 639-1 code, optional, defaults to "en"
}
```

**Migration:**
- Existing users without `language_preference` will default to "en"
- No data migration needed (handled in application code)

---

## 6. Backend Implementation

### 6.1 User Model Updates

**File:** `backend/src/models/User.ts`

1. Add `language_preference` to `User` interface
2. Add `language_preference` to `UserUpdateData` interface
3. Add validation for language preference in `updateUser` function
4. Default to "en" if not provided

**Validation:**
- Must be a valid ISO 639-1 language code
- Must be in the list of supported languages from config
- Case-insensitive (normalize to lowercase)

### 6.2 API Endpoints

#### 6.2.1 Update User Language Preference

**PATCH /api/user/language**

Update user's language preference.

**Request:**
```json
{
  "language": "es"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "language_preference": "es",
      // ... other user fields
    }
  }
}
```

**Validation:**
- `language` must be a string
- `language` must be in supported languages list
- Returns 400 if invalid language

**Alternative:** Use existing `PATCH /api/user/profile` endpoint and add `language_preference` to the accepted fields.

#### 6.2.2 Get User Profile (Update Existing)

**GET /auth/me** (already exists)

Ensure response includes `language_preference`:

```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "free",
    "language_preference": "es", // NEW
    // ... other fields
  },
  "quota": {
    // ... quota fields
  }
}
```

### 6.3 Language Validation

**File:** `backend/src/utils/validators.ts`

Add function to validate language preference:

```typescript
export function validateLanguagePreference(language: string): ValidationResult {
  const summaryConfig = getSummaryConfig();
  const supportedLanguages = summaryConfig.supported_languages || ['English'];
  
  // Map language codes to full names (e.g., 'en' -> 'English')
  const languageMap: Record<string, string> = {
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
  
  const languageName = languageMap[language.toLowerCase()];
  if (!languageName || !supportedLanguages.includes(languageName)) {
    return {
      valid: false,
      errors: [{
        field: 'language_preference',
        message: `Unsupported language code: ${language}. Supported: ${Object.keys(languageMap).join(', ')}`,
        value: language,
      }],
    };
  }
  
  return { valid: true, errors: [] };
}
```

### 6.4 Summary Request Default Language

**File:** `backend/src/controllers/summary.controller.ts`

When processing summary request:
1. If `language` not provided in request, check user's `language_preference`
2. If user has `language_preference`, use it
3. Otherwise, use default from config

---

## 7. Frontend Implementation

### 7.1 Installation & Setup

**Install dependencies:**
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

**File:** `frontend/src/lib/i18n.ts`

Create i18n configuration:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
// ... import all English translations
import esCommon from '../locales/es/common.json';
// ... import all Spanish translations
// ... import all other languages

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        navigation: enNavigation,
        // ... all English namespaces
      },
      es: {
        common: esCommon,
        // ... all Spanish namespaces
      },
      // ... all other languages
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

### 7.2 Language Context

**File:** `frontend/src/contexts/LanguageContext.tsx`

Create context to manage language state and sync with backend:

```typescript
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
        await updateUserProfile({ language_preference: lang });
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

### 7.3 Language Selector Component

**File:** `frontend/src/components/settings/LanguageSelector.tsx`

Create language selector component:

```typescript
import { useLanguage } from '../../contexts/LanguageContext';
import { SelectDropdown } from '../ui/SelectDropdown';
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

### 7.4 Translation File Examples

**File:** `frontend/src/locales/en/common.json`

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

**File:** `frontend/src/locales/es/common.json`

```json
{
  "buttons": {
    "submit": "Enviar",
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar",
    "edit": "Editar",
    "close": "Cerrar",
    "back": "Atrás",
    "next": "Siguiente",
    "previous": "Anterior"
  },
  "labels": {
    "email": "Correo electrónico",
    "password": "Contraseña",
    "name": "Nombre",
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito"
  }
}
```

**File:** `frontend/src/locales/en/summary.json`

```json
{
  "form": {
    "title": "YouTube Summary Generator",
    "urlLabel": "YouTube URLs",
    "urlPlaceholder": "Paste YouTube URLs here, one per line",
    "presetLabel": "Summary Style",
    "languageLabel": "Summary Language",
    "customPromptLabel": "Custom Prompt (Optional)",
    "submitButton": "Generate Summary"
  },
  "language": {
    "default": "Default (Your Preference)",
    "english": "English",
    "spanish": "Spanish",
    "french": "French"
  }
}
```

### 7.5 Using Translations in Components

**Example:** Update dashboard page

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

### 7.6 Update Summary Form

**File:** `frontend/src/hooks/useSummaryForm.ts`

Update to use user's language preference as default:

```typescript
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export function useSummaryForm() {
  const { currentLanguage } = useLanguage();
  const { user } = useAuth();
  
  // Map language code to full name for backend
  const languageCodeToName: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    // ... all mappings
  };
  
  const defaultLanguage = user?.language_preference 
    ? languageCodeToName[user.language_preference] || 'English'
    : languageCodeToName[currentLanguage] || 'English';
  
  // Use defaultLanguage in form state
  // ...
}
```

### 7.7 Extract All Hardcoded Strings

**Priority Order:**
1. Common components (buttons, labels, errors)
2. Navigation
3. Dashboard page
4. Settings page
5. Account page
6. History page
7. Summary form and results
8. Authentication pages
9. Error messages
10. Validation messages

**Process:**
1. Identify hardcoded string
2. Add to appropriate translation file
3. Replace with `t('namespace.key')`
4. Test in all languages

---

## 8. Supported Languages

### 8.1 Initial Language Support

Based on backend configuration and common usage:

1. **English (en)** - Default
2. **Spanish (es)** - Español
3. **French (fr)** - Français
4. **German (de)** - Deutsch
5. **Chinese Simplified (zh)** - 中文
6. **Chinese Traditional (zh-tw)** - 繁體中文
7. **Japanese (ja)** - 日本語
8. **Korean (ko)** - 한국어
9. **Portuguese (pt)** - Português
10. **Italian (it)** - Italiano
11. **Russian (ru)** - Русский
12. **Arabic (ar)** - العربية

### 8.2 Adding New Languages

**Process:**
1. Add language code to `languageOptions` in `LanguageSelector.tsx`
2. Create translation files in `frontend/src/locales/{code}/`
3. Import and add to i18n resources in `i18n.ts`
4. Add language to backend `config.yaml` if needed for summaries
5. Update language mapping in validation functions

**No code changes needed beyond translation files!**

---

## 9. RTL (Right-to-Left) Support

### 9.1 RTL Languages

- **Arabic (ar)** - Requires RTL layout

### 9.2 Implementation

**File:** `frontend/src/app/app/layout.tsx`

Add direction based on language:

```typescript
import { useTranslation } from 'react-i18next';

const rtlLanguages = ['ar', 'he', 'fa']; // Arabic, Hebrew, Farsi

export default function AppLayout({ children }) {
  const { i18n } = useTranslation();
  const isRTL = rtlLanguages.includes(i18n.language);
  
  return (
    <html dir={isRTL ? 'rtl' : 'ltr'} lang={i18n.language}>
      {/* ... */}
    </html>
  );
}
```

**CSS Considerations:**
- Use logical properties (`margin-inline-start` instead of `margin-left`)
- Or use CSS classes that switch based on `[dir="rtl"]` attribute
- Test all layouts in RTL mode

---

## 10. Date & Number Formatting

### 10.1 Localization

Use i18next's formatting capabilities:

```typescript
import { useTranslation } from 'react-i18next';

function DateDisplay({ date }: { date: Date }) {
  const { i18n } = useTranslation();
  
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function NumberDisplay({ value }: { value: number }) {
  const { i18n } = useTranslation();
  
  return new Intl.NumberFormat(i18n.language).format(value);
}
```

### 10.2 Configuration

Add formatting configuration to i18n setup:

```typescript
i18n.init({
  // ... other config
  interpolation: {
    escapeValue: false,
    format: (value, format, lng) => {
      if (format === 'date') {
        return new Intl.DateTimeFormat(lng).format(value);
      }
      if (format === 'number') {
        return new Intl.NumberFormat(lng).format(value);
      }
      return value;
    },
  },
});
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

1. **Language Context**
   - Test language change
   - Test localStorage persistence
   - Test API sync
   - Test fallback logic

2. **Language Validation**
   - Test valid language codes
   - Test invalid language codes
   - Test case insensitivity
   - Test fallback to default

3. **Translation Files**
   - Test all keys exist in all languages
   - Test no missing translations
   - Test interpolation works
   - Test pluralization

### 11.2 Integration Tests

1. **User Flow**
   - User changes language in settings
   - Language updates immediately
   - Language persists after refresh
   - Language syncs to backend

2. **Summary Flow**
   - Summary form shows user's language preference
   - User can override language
   - Summary generated in correct language

### 11.3 E2E Tests

1. **Language Selection**
   - Select language from dropdown
   - Verify UI updates
   - Verify persistence
   - Verify backend sync

2. **Summary Generation**
   - Generate summary with different languages
   - Verify summary is in correct language
   - Verify language preference is used as default

### 11.4 Manual Testing Checklist

- [ ] All UI text is translated
- [ ] Language selector works
- [ ] Language persists after refresh
- [ ] Language syncs to backend
- [ ] Summary form uses language preference
- [ ] RTL layout works for Arabic
- [ ] Date/number formatting is localized
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] All languages load correctly

---

## 12. Performance Considerations

### 12.1 Lazy Loading

Load translation files on demand:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend'; // Load translations via HTTP

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    // ... other config
  });
```

### 12.2 Caching

- i18next caches translations automatically
- localStorage caches language preference
- No need for additional caching

### 12.3 Bundle Size

- Initial bundle includes only default language (English)
- Other languages loaded on demand
- Consider code splitting for large translation files

---

## 13. Migration Plan

### 13.1 Phase 1: Foundation (Week 1)

1. Install i18n dependencies
2. Set up i18n configuration
3. Create translation file structure
4. Create LanguageContext
5. Add language_preference to User model
6. Update backend API endpoints

### 13.2 Phase 2: Core Translations (Week 2)

1. Extract common UI strings
2. Translate navigation
3. Translate dashboard
4. Translate settings page
5. Create LanguageSelector component
6. Test language switching

### 13.3 Phase 3: Feature Translations (Week 3)

1. Translate summary form
2. Translate history page
3. Translate account page
4. Translate authentication pages
5. Translate error messages
6. Translate validation messages

### 13.4 Phase 4: Integration (Week 4)

1. Integrate language preference with summary form
2. Update summary form to use user preference
3. Test end-to-end flows
4. Add RTL support for Arabic
5. Add date/number formatting

### 13.5 Phase 5: Polish & Testing (Week 5)

1. Complete all translations
2. Test all languages
3. Fix any missing translations
4. Performance testing
5. Documentation
6. User acceptance testing

---

## 14. Developer Guidelines

### 14.1 Adding New Translations

**When adding a new feature:**

1. **Identify all user-facing strings**
   - Buttons, labels, messages, tooltips, placeholders

2. **Create translation keys**
   - Use namespace (e.g., `newFeature`)
   - Use descriptive keys (e.g., `newFeature.form.submitButton`)
   - Follow existing naming conventions

3. **Add to all language files**
   - Start with English
   - Add to all other languages (use translation service if needed)
   - Mark as `[TODO]` if not yet translated

4. **Use in components**
   ```typescript
   import { useTranslation } from 'react-i18next';
   
   const { t } = useTranslation('newFeature');
   return <button>{t('form.submitButton')}</button>;
   ```

### 14.2 Translation Key Naming

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

### 14.3 TypeScript Support

**File:** `frontend/src/locales/types.ts`

Generate types for translation keys:

```typescript
import 'react-i18next';
import enCommon from './en/common.json';
import enDashboard from './en/dashboard.json';
// ... all namespaces

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      dashboard: typeof enDashboard;
      // ... all namespaces
    };
  }
}
```

This provides autocomplete for translation keys!

---

## 15. Security Considerations

### 15.1 Input Validation

- Validate language codes on backend
- Sanitize language preference before saving
- Prevent injection attacks via language codes

### 15.2 XSS Prevention

- i18next escapes values by default
- React also escapes, so double protection
- Be careful with HTML in translations (use `Trans` component if needed)

### 15.3 Data Privacy

- Language preference is not sensitive data
- No PII in translation files
- Translation files can be public

---

## 16. Accessibility

### 16.1 Language Attribute

Always set `lang` attribute on HTML:

```typescript
<html lang={i18n.language}>
```

### 16.2 Screen Readers

- Screen readers will read in correct language
- Ensure all translated text is accessible
- Test with screen readers in different languages

### 16.3 RTL Support

- Ensure RTL layout is accessible
- Test keyboard navigation in RTL
- Test screen readers in RTL

---

## 17. Monitoring & Analytics

### 17.1 Language Usage

Track language preferences:
- Most popular languages
- Language distribution
- Language changes over time

### 17.2 Missing Translations

Monitor for:
- Missing translation keys
- Fallback to English
- Translation errors

### 17.3 Performance

Monitor:
- Translation file load times
- Language switch performance
- Bundle size impact

---

## 18. Future Enhancements

### 18.1 Advanced Features

1. **Regional Variants**
   - English (US) vs English (UK)
   - Spanish (Spain) vs Spanish (Mexico)
   - Chinese (Simplified) vs Chinese (Traditional)

2. **Auto-Translation**
   - Use AI to auto-translate new strings
   - Human review process
   - Translation memory

3. **Community Translations**
   - Allow users to contribute translations
   - Translation review system
   - Crowdsourced translations

4. **Context-Aware Translations**
   - Different translations for different contexts
   - Formal vs informal
   - Technical vs casual

### 18.2 Integration Opportunities

1. **Browser Language Detection**
   - Auto-detect on first visit
   - Suggest language based on location

2. **Language Learning Mode**
   - Show translations in user's learning language
   - Bilingual mode

3. **Voice Interface**
   - Voice commands in user's language
   - Text-to-speech in user's language

---

## 19. Success Metrics

### 19.1 User Adoption

- % of users who change language from default
- Most popular languages
- Language retention rate

### 19.2 Quality Metrics

- % of UI translated (target: 100%)
- Missing translation rate (target: 0%)
- Translation error rate (target: 0%)

### 19.3 Performance Metrics

- Language switch time (target: <100ms)
- Translation file load time (target: <200ms)
- Bundle size increase (target: <50KB per language)

---

## 20. Dependencies & Requirements

### 20.1 External Dependencies

- `i18next` - Core i18n library
- `react-i18next` - React bindings
- `i18next-browser-languagedetector` - Language detection

### 20.2 Internal Dependencies

- User profile system (existing)
- Settings page (existing)
- Summary generation system (existing)
- API infrastructure (existing)

### 20.3 Browser Support

- All modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 not supported (application doesn't support IE11)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 21. Risks & Mitigation

### 21.1 Risks

1. **Translation Quality**
   - Risk: Poor translations affect UX
   - Mitigation: Professional translation services, native speaker review

2. **Missing Translations**
   - Risk: Some strings not translated
   - Mitigation: Automated testing, translation coverage reports

3. **Performance Impact**
   - Risk: i18n adds overhead
   - Mitigation: Lazy loading, caching, performance testing

4. **Maintenance Burden**
   - Risk: Hard to keep translations up to date
   - Mitigation: Clear guidelines, automated tools, translation memory

### 21.2 Mitigation Strategies

- Start with high-quality English source text
- Use professional translators for initial translations
- Implement automated testing for missing translations
- Create clear developer guidelines
- Use translation management tools if needed

---

## 22. Appendix

### 22.1 Language Code Reference

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| es | Spanish | Español |
| fr | French | Français |
| de | German | Deutsch |
| zh | Chinese (Simplified) | 中文 |
| zh-tw | Chinese (Traditional) | 繁體中文 |
| ja | Japanese | 日本語 |
| ko | Korean | 한국어 |
| pt | Portuguese | Português |
| it | Italian | Italiano |
| ru | Russian | Русский |
| ar | Arabic | العربية |

### 22.2 Translation File Template

```json
{
  "section": {
    "subsection": {
      "key": "Translation value",
      "keyWithInterpolation": "Hello {{name}}",
      "keyWithPlural": "{{count}} item",
      "keyWithPlural_plural": "{{count}} items"
    }
  }
}
```

### 22.3 Useful Commands

```bash
# Extract translation keys from code
npm run i18n:extract

# Validate translation files
npm run i18n:validate

# Generate TypeScript types
npm run i18n:types

# Check for missing translations
npm run i18n:check
```

---

## 23. Conclusion

This PRD outlines a comprehensive, scalable multi-language support system that will enhance the user experience for international users. The implementation is designed to be maintainable, performant, and easily extensible. By following this plan, we can deliver a world-class internationalization system that supports the application's growth into global markets.

**Next Steps:**
1. Review and approve this PRD
2. Allocate resources for implementation
3. Begin Phase 1: Foundation
4. Set up translation workflow
5. Start with English source text refinement

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Author:** [Your Name]  
**Status:** Draft - Pending Review

