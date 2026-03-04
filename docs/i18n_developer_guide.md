# i18n Developer Guide

## Overview

This guide explains how to work with the multi-language (i18n) system in the Video Research application. The system uses `react-i18next` for frontend translations and supports 12 languages.

## Architecture

### Translation File Structure

```
frontend/src/locales/
  en/              # English (base language)
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
  es/              # Spanish
    (same structure)
  fr/              # French
    (same structure)
  ...              # All other languages
```

### Configuration Files

- **Frontend:** `frontend/src/config/languages.ts` - Language metadata and options
- **Backend:** `backend/config.yaml` - Supported languages for summaries
- **i18n Config:** `frontend/src/lib/i18n.ts` - i18next configuration

## Adding New Translations

### Step 1: Add Translation Keys

1. **Identify the namespace** - Choose the appropriate namespace:
   - `common` - Shared UI elements (buttons, labels, messages)
   - `navigation` - Navigation menu items
   - `dashboard` - Dashboard page
   - `history` - History page
   - `settings` - Settings page
   - `account` - Account page
   - `summary` - Summary form and results
   - `errors` - Error messages
   - `validation` - Form validation messages
   - `auth` - Authentication pages

2. **Add to English base** - Always add new keys to English first:
   ```json
   // frontend/src/locales/en/common.json
   {
     "buttons": {
       "newButton": "New Button"
     }
   }
   ```

3. **Add to all languages** - Add the same key to all language files:
   ```json
   // frontend/src/locales/es/common.json
   {
     "buttons": {
       "newButton": "Nuevo Botón"
     }
   }
   ```

### Step 2: Use in Components

```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('common');
  
  return (
    <button>{t('buttons.newButton')}</button>
  );
}
```

### Step 3: Verify Coverage

Run the translation checker:
```bash
npm run i18n:check
```

This will verify that all languages have all keys from the English base.

## Translation Key Naming Convention

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

## Adding a New Language

### Step 1: Add to Backend Config

Update `backend/config.yaml`:
```yaml
summary:
  supported_languages:
    - "English"
    - "Spanish"
    - "New Language"  # Add here
```

### Step 2: Add to Frontend Config

Update `frontend/src/config/languages.ts`:
```typescript
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  // ... existing languages
  {
    code: 'nl',  // ISO 639-1 code
    label: 'Nederlands (Dutch)',
    fullName: 'Dutch',
    nativeName: 'Nederlands',
    dir: 'ltr',
  },
];
```

### Step 3: Create Translation Files

Create directory structure:
```
frontend/src/locales/nl/
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
```

### Step 4: Update i18n Configuration

Update `frontend/src/lib/i18n.ts`:
```typescript
import nlCommon from '../locales/nl/common.json';
// ... import all namespaces

i18n.init({
  resources: {
    // ... existing languages
    nl: {
      common: nlCommon,
      // ... all namespaces
    },
  },
});
```

### Step 5: Verify

```bash
npm run i18n:check
```

## Language Code Mapping

The system uses ISO 639-1 language codes (e.g., `en`, `es`, `fr`). These map to backend language names (e.g., `English`, `Spanish`, `French`) which are used in summary generation.

**Mapping is centralized in:**
- Frontend: `frontend/src/config/languages.ts` → `LANGUAGE_CODE_TO_NAME`
- Backend: `backend/src/utils/language-mapping.ts` → `getLanguageCodeToNameMap()`

**Important:** These mappings must match `backend/config.yaml` → `summary.supported_languages`.

## RTL (Right-to-Left) Support

RTL languages are automatically detected and applied. Currently supported:
- Arabic (`ar`)
- Hebrew (`he`) - if added
- Farsi (`fa`) - if added

The `dir` attribute is set automatically based on language code.

## Date & Number Formatting

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
```

## Testing Translations

### Manual Testing

1. Switch language in settings
2. Verify UI updates immediately
3. Refresh page - language should persist
4. Check all pages in the new language

### Automated Testing

```bash
# Check translation coverage
npm run i18n:check

# Validate translation files
npm run i18n:validate
```

## Common Issues

### Missing Translation Keys

**Symptom:** Translation key shows as `namespace.key` instead of translated text.

**Solution:**
1. Add key to English base file
2. Add key to all other language files
3. Run `npm run i18n:check` to verify

### Language Not Persisting

**Symptom:** Language resets to English after page refresh.

**Solution:**
1. Check localStorage: `localStorage.getItem('i18nextLng')`
2. Verify LanguageContext is properly initialized
3. Check that user profile sync is working (if logged in)

### Config Mismatch

**Symptom:** Language codes don't match between frontend and backend.

**Solution:**
1. Verify `frontend/src/config/languages.ts` matches `backend/config.yaml`
2. Check `LANGUAGE_CODE_TO_NAME` mapping
3. Ensure all language names match exactly (case-sensitive)

## Performance Considerations

### Lazy Loading

Currently, all translations are loaded upfront. For better performance with many languages:

1. Install `i18next-http-backend`:
   ```bash
   npm install i18next-http-backend
   ```

2. Update `frontend/src/lib/i18n.ts` to use lazy loading (see i18next documentation)

### Bundle Size

Each language adds ~50-100KB to the bundle. Consider:
- Code splitting by language
- Lazy loading translations
- Removing unused languages in production builds

## TypeScript Support

Translation keys are type-safe through `frontend/src/locales/types.ts`. This provides:
- Autocomplete for translation keys
- Compile-time checking
- Refactoring support

## Best Practices

1. **Always add to English first** - English is the base language
2. **Use descriptive keys** - `dashboard.form.urlLabel` not `dashboard.url`
3. **Group related keys** - Use nested structure
4. **Test in all languages** - Especially RTL languages
5. **Keep configs in sync** - Frontend and backend must match
6. **Run i18n:check** - Before committing changes
7. **Don't hardcode strings** - Always use translation keys

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

---

**Last Updated:** Phase 5 Implementation  
**Maintainer:** Development Team


