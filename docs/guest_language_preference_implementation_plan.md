# Guest Language Preference Implementation Plan

| Version | 1.0 |
| :--- | :--- |
| **Status** | Planning |
| **Created** | 2024 |
| **Priority** | Medium - Enhances guest user experience |
| **Related Features** | Language settings, Guest access, Authentication |

---

## Executive Summary

This document outlines the implementation plan to enable guest users to change the system language through the language dropdown in the navigation bar. The language preference will be stored in cookies for guest users, displayed in the UI, and automatically migrated to the user's account when they log in.

**Key Features:**
- Guest users can change language via the existing language dropdown
- Language preference stored in cookies (persistent across sessions)
- UI immediately reflects the selected language
- Preference automatically saved to user account on login
- Seamless transition from guest to authenticated user

---

## Problem Analysis

### Current Behavior

1. **Authenticated Users:**
   - ✅ Can change language via `LanguageDropdown` component
   - ✅ Language preference stored in `user.language_preference` (database)
   - ✅ Changes sync via `/api/user/language` endpoint
   - ✅ Preference persists across sessions

2. **Guest Users:**
   - ❌ Language dropdown exists but doesn't work (401 error)
   - ❌ `/api/user/language` endpoint requires authentication
   - ❌ No mechanism to store guest language preference
   - ❌ Language defaults to browser/system language or 'en'

### Root Causes

1. **API Endpoint Requires Authentication:**
   - `PATCH /api/user/language` uses `requireAuth` middleware
   - Returns 401 Unauthorized for guest users
   - `useLanguagePreference` hook calls this endpoint unconditionally

2. **No Guest Preference Storage:**
   - No cookie/localStorage mechanism for guest language preference
   - `LanguageContext` only reads from `user.language_preference` or localStorage `i18nextLng`
   - No persistence strategy for guest users

3. **No Migration Logic:**
   - When guest user logs in, cookie preference is not transferred to account
   - User loses their language preference on login

---

## Requirements

### Functional Requirements

1. **Guest Language Selection:**
   - Guest users can click the language dropdown in navigation bar
   - Dropdown shows current language and available options
   - Selection immediately updates the UI language

2. **Cookie Storage:**
   - Guest language preference stored in HTTP cookie
   - Cookie name: `guest_language_preference`
   - Cookie expiration: 1 year (or configurable)
   - Cookie path: `/` (available across entire app)
   - Cookie SameSite: `Lax` (for security)

3. **Language Initialization:**
   - On app load, check for guest language cookie
   - If cookie exists, use it to initialize i18n
   - Priority: User preference > Cookie > Browser language > 'en'

4. **Login Migration:**
   - On successful login, check for `guest_language_preference` cookie
   - If cookie exists and user doesn't have a language preference, save cookie value to user account
   - Clear cookie after migration (optional, or keep as fallback)

5. **UI Consistency:**
   - Language dropdown works identically for guest and authenticated users
   - No visual differences or disabled states
   - Loading states and error handling work for both user types

### Non-Functional Requirements

1. **Performance:**
   - Cookie read/write operations should be synchronous and fast
   - No additional API calls for guest language changes
   - Language change should be instant (no loading delay)

2. **Security:**
   - Cookie should be HTTP-only (optional, but recommended if not needed by JS)
   - Cookie should use SameSite=Lax to prevent CSRF
   - Validate language code before saving (prevent XSS)

3. **Compatibility:**
   - Works with existing language dropdown component
   - No breaking changes to authenticated user flow
   - Backward compatible with existing language preferences

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Language Dropdown UI                      │
│              (frontend/src/components/ui/                    │
│                    LanguageDropdown.tsx)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            useLanguagePreference Hook                        │
│         (frontend/src/hooks/useLanguagePreference.ts)        │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Authenticated   │         │   Guest User     │          │
│  │      User        │         │                  │          │
│  │                  │         │                  │          │
│  │  API Call:       │         │  Cookie Write:   │          │
│  │  /api/user/      │         │  guest_language_ │          │
│  │  language        │         │  preference      │          │
│  └──────────────────┘         └──────────────────┘          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              LanguageContext                                 │
│         (frontend/src/contexts/LanguageContext.tsx)          │
│                                                              │
│  Initialization Priority:                                    │
│  1. user.language_preference (if authenticated)              │
│  2. guest_language_preference cookie (if guest)             │
│  3. localStorage i18nextLng                                 │
│  4. Browser language                                         │
│  5. Default: 'en'                                            │
└──────────────────────────────────────────────────────────────┘
```

### Component Changes

#### 1. Cookie Utility Functions

**File:** `frontend/src/utils/cookies.ts` (new file)

```typescript
/**
 * Cookie utility functions for guest language preference
 */

const GUEST_LANGUAGE_COOKIE_NAME = 'guest_language_preference';
const COOKIE_EXPIRY_DAYS = 365;

/**
 * Set guest language preference cookie
 */
export function setGuestLanguagePreference(languageCode: string): void {
  if (typeof document === 'undefined') return;
  
  const expiryDate = new Date();
  expiryDate.setTime(expiryDate.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
  
  document.cookie = `${GUEST_LANGUAGE_COOKIE_NAME}=${encodeURIComponent(languageCode)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Get guest language preference from cookie
 */
export function getGuestLanguagePreference(): string | null {
  if (typeof document === 'undefined') return null;
  
  const name = `${GUEST_LANGUAGE_COOKIE_NAME}=`;
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(name) === 0) {
      return decodeURIComponent(cookie.substring(name.length));
    }
  }
  
  return null;
}

/**
 * Clear guest language preference cookie
 */
export function clearGuestLanguagePreference(): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${GUEST_LANGUAGE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}
```

#### 2. Update `useLanguagePreference` Hook

**File:** `frontend/src/hooks/useLanguagePreference.ts`

**Changes:**
- Detect if user is guest or authenticated
- For guest users: save to cookie instead of API call
- For authenticated users: keep existing API call behavior
- Read from cookie for guest users when determining current language

**Key Modifications:**

```typescript
// Add import
import { useAuth } from '@/contexts/AuthContext';
import { setGuestLanguagePreference, getGuestLanguagePreference } from '@/utils/cookies';

// In hook:
export function useLanguagePreference(): UseLanguagePreferenceReturn {
  const { user, refetchUserData } = useUserDataContext();
  const { isGuest } = useAuth(); // Add this
  const { changeLanguage: changeI18nLanguage, currentLanguage: i18nLanguage } = useLanguage();
  const toast = useToast();
  const [isChanging, setIsChanging] = useState(false);

  // Get current language with guest cookie support
  const currentLanguage = useMemo(() => {
    // Priority: i18n current > user preference > guest cookie > default
    if (i18nLanguage) return i18nLanguage;
    if (user?.language_preference) return user.language_preference;
    if (isGuest) {
      const cookieLang = getGuestLanguagePreference();
      if (cookieLang) return cookieLang;
    }
    return DEFAULT_LANGUAGE_CODE;
  }, [i18nLanguage, user?.language_preference, isGuest]);

  // Update changeLanguage function
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

    if (newLanguageCode === currentLanguage) {
      return true;
    }

    setIsChanging(true);

    try {
      // Update i18n immediately
      await changeI18nLanguage(newLanguageCode);

      if (isGuest) {
        // Guest user: save to cookie
        setGuestLanguagePreference(newLanguageCode);
        toast.success(`Language changed to ${getLanguageByCode(newLanguageCode)?.nativeName || newLanguageCode}`);
        return true;
      } else {
        // Authenticated user: save to backend
        const response = await updateLanguagePreference(newLanguageCode);
        if (response.error) {
          toast.error(response.error.message || 'Failed to update language preference');
          return false;
        }
        await refetchUserData();
        toast.success(`Language changed to ${getLanguageByCode(newLanguageCode)?.nativeName || newLanguageCode}`);
        return true;
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error('Failed to update language preference');
      return false;
    } finally {
      setIsChanging(false);
    }
  }, [isChanging, currentLanguage, changeI18nLanguage, refetchUserData, toast, isGuest]);

  // ... rest of hook
}
```

#### 3. Update `LanguageContext`

**File:** `frontend/src/contexts/LanguageContext.tsx`

**Changes:**
- Read from guest language cookie on initialization
- Initialize i18n with cookie value if user is guest
- Support guest users in language initialization

**Key Modifications:**

```typescript
// Add import
import { getGuestLanguagePreference } from '@/utils/cookies';
import { useAuth } from './AuthContext';

// In LanguageProvider:
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // ... existing code ...
  const { user, isAuthenticated, isGuest } = useAuth(); // Add isGuest

  // Initialize language from user profile, cookie, or localStorage
  useEffect(() => {
    if (!isReady) return;
    
    // Priority: user preference > guest cookie > localStorage > browser > default
    if (isAuthenticated && user?.language_preference) {
      i18n.changeLanguage(user.language_preference);
    } else if (isGuest) {
      const cookieLang = getGuestLanguagePreference();
      if (cookieLang) {
        i18n.changeLanguage(cookieLang);
      } else {
        // Fallback to localStorage or browser language
        const storedLang = localStorage.getItem('i18nextLng');
        if (storedLang) {
          i18n.changeLanguage(storedLang);
        }
      }
    }
  }, [isReady, isAuthenticated, isGuest, user?.language_preference]);
  
  // ... rest of component
}
```

#### 4. Backend: Login Migration Endpoint

**File:** `backend/src/controllers/auth.controller.ts`

**Changes:**
- After successful login, check for `guest_language_preference` cookie
- If cookie exists and user doesn't have language preference, save it
- Optionally clear cookie after migration

**Key Modifications:**

```typescript
// In login/signup success handler:
// After user is created/authenticated, check for guest language cookie
const guestLanguage = req.cookies?.guest_language_preference;
if (guestLanguage && !user.language_preference) {
  // Validate and save guest language preference
  const validation = validateLanguagePreference(guestLanguage);
  if (validation.valid) {
    await updateUser(user.id, {
      language_preference: guestLanguage.toLowerCase().trim(),
    });
    // Optionally clear cookie
    res.clearCookie('guest_language_preference', { path: '/' });
  }
}
```

**Alternative Approach:** Handle in frontend after login

**File:** `frontend/src/contexts/AuthContext.tsx`

**Changes:**
- After successful login, check for guest language cookie
- If cookie exists and user doesn't have language preference, call API to save it
- Clear cookie after successful migration

**Key Modifications:**

```typescript
// In onAuthStateChanged or login success handler:
useEffect(() => {
  if (user && !user.language_preference) {
    const guestLang = getGuestLanguagePreference();
    if (guestLang) {
      // Migrate guest language preference to user account
      updateLanguagePreference(guestLang)
        .then(() => {
          clearGuestLanguagePreference();
        })
        .catch((error) => {
          console.error('Failed to migrate guest language preference:', error);
        });
    }
  }
}, [user]);
```

---

## Implementation Steps

### Phase 1: Cookie Utility Functions

1. **Create cookie utility file**
   - File: `frontend/src/utils/cookies.ts`
   - Functions: `setGuestLanguagePreference`, `getGuestLanguagePreference`, `clearGuestLanguagePreference`
   - Add TypeScript types
   - Add JSDoc comments

2. **Testing:**
   - Test cookie set/get/clear operations
   - Test cookie expiration
   - Test cookie path and SameSite attributes
   - Test in different browsers

### Phase 2: Update Language Preference Hook

1. **Modify `useLanguagePreference` hook**
   - Add `useAuth` to detect guest vs authenticated
   - Add cookie read logic for current language
   - Modify `changeLanguage` to handle guest users
   - Add cookie write for guest users

2. **Testing:**
   - Test guest user language change (should save to cookie)
   - Test authenticated user language change (should call API)
   - Test language dropdown UI updates immediately
   - Test error handling for invalid language codes

### Phase 3: Update Language Context

1. **Modify `LanguageContext`**
   - Add guest cookie read on initialization
   - Update initialization priority logic
   - Ensure guest users get correct language on app load

2. **Testing:**
   - Test app initialization with guest cookie
   - Test app initialization without cookie (should use browser/default)
   - Test language persistence across page refreshes
   - Test language priority (user > cookie > localStorage > browser > default)

### Phase 4: Login Migration

1. **Implement migration logic**
   - Choose approach: backend or frontend
   - Add cookie read on login
   - Add API call to save preference if user doesn't have one
   - Clear cookie after migration

2. **Testing:**
   - Test guest user changes language, then logs in
   - Verify language preference is saved to account
   - Verify cookie is cleared after migration
   - Test user who already has language preference (should not overwrite)
   - Test user who logs in without guest cookie (should work normally)

### Phase 5: Integration Testing

1. **End-to-end testing**
   - Test complete guest flow: visit app → change language → refresh → verify persistence
   - Test login migration: guest → change language → login → verify account has preference
   - Test authenticated user flow (should remain unchanged)
   - Test edge cases: invalid cookies, expired cookies, missing cookies

2. **Browser compatibility**
   - Test in Chrome, Firefox, Safari, Edge
   - Test cookie behavior in incognito/private mode
   - Test cookie behavior with third-party cookie restrictions

### Phase 6: Documentation & Cleanup

1. **Update documentation**
   - Update language settings documentation
   - Add guest language preference to user guide
   - Update API documentation if backend changes made

2. **Code cleanup**
   - Remove any debug logs
   - Ensure consistent error handling
   - Add comments for complex logic
   - Review and optimize performance

---

## File Changes Summary

### New Files

1. `frontend/src/utils/cookies.ts` - Cookie utility functions

### Modified Files

1. `frontend/src/hooks/useLanguagePreference.ts` - Add guest user support
2. `frontend/src/contexts/LanguageContext.tsx` - Add guest cookie initialization
3. `frontend/src/contexts/AuthContext.tsx` - Add login migration logic (if frontend approach)
4. `backend/src/controllers/auth.controller.ts` - Add login migration logic (if backend approach)

### No Changes Required

- `frontend/src/components/ui/LanguageDropdown.tsx` - Already uses `useLanguagePreference` hook
- `frontend/src/components/settings/LanguageSelector.tsx` - Already uses `useLanguagePreference` hook
- Backend `/api/user/language` endpoint - No changes needed (still requires auth for authenticated users)

---

## Testing Strategy

### Unit Tests

1. **Cookie Utilities:**
   - Test `setGuestLanguagePreference` sets cookie correctly
   - Test `getGuestLanguagePreference` reads cookie correctly
   - Test `clearGuestLanguagePreference` removes cookie
   - Test cookie encoding/decoding
   - Test cookie expiration

2. **useLanguagePreference Hook:**
   - Test guest user language change (cookie write)
   - Test authenticated user language change (API call)
   - Test current language detection (priority order)
   - Test error handling

3. **LanguageContext:**
   - Test initialization with guest cookie
   - Test initialization without cookie
   - Test language priority logic

### Integration Tests

1. **Guest User Flow:**
   - Guest user changes language → cookie is set
   - Guest user refreshes page → language persists
   - Guest user changes language multiple times → cookie updates

2. **Login Migration:**
   - Guest user changes language → logs in → preference saved to account
   - Guest user with cookie → logs in → preference migrated
   - Authenticated user logs in → no cookie → no migration

3. **UI Tests:**
   - Language dropdown shows correct current language for guest
   - Language dropdown shows correct current language for authenticated
   - Language change updates UI immediately
   - Loading states work correctly

### Manual Testing Checklist

- [ ] Guest user can change language via dropdown
- [ ] Language preference persists after page refresh
- [ ] Language preference persists across browser sessions (cookie expiry)
- [ ] Guest user logs in → language preference saved to account
- [ ] Authenticated user language change still works (API call)
- [ ] Language dropdown works in all browsers
- [ ] Cookie is set with correct attributes (path, SameSite, expiry)
- [ ] Invalid language codes are rejected
- [ ] Error messages display correctly
- [ ] No console errors or warnings

---

## Security Considerations

1. **Cookie Security:**
   - Use `SameSite=Lax` to prevent CSRF attacks
   - Validate language code before saving (prevent XSS)
   - Consider HTTP-only flag if cookie doesn't need JS access (but we need JS access for reading)

2. **Input Validation:**
   - Validate language code against `SUPPORTED_LANGUAGES` list
   - Sanitize cookie values before reading
   - Handle malformed cookies gracefully

3. **Privacy:**
   - Cookie only stores language preference (no sensitive data)
   - Cookie expiration is reasonable (1 year)
   - User can clear cookie by clearing browser cookies

---

## Edge Cases & Error Handling

1. **Cookie Disabled:**
   - If cookies are disabled, fall back to localStorage
   - Show warning if neither cookies nor localStorage work
   - Language changes still work (just don't persist)

2. **Invalid Cookie Value:**
   - If cookie contains invalid language code, ignore it
   - Fall back to default language
   - Clear invalid cookie

3. **Cookie Too Large:**
   - Language codes are short (2-5 chars), unlikely to exceed cookie size
   - If it does, fall back to localStorage

4. **Migration Failure:**
   - If migration fails on login, log error but don't block login
   - Cookie remains, user can try again later
   - Show toast notification if migration fails

5. **Concurrent Language Changes:**
   - Multiple tabs changing language simultaneously
   - Use storage event listener to sync across tabs
   - Last write wins (acceptable for language preference)

---

## Performance Considerations

1. **Cookie Operations:**
   - Cookie read/write is synchronous and fast
   - No network calls for guest language changes
   - Minimal performance impact

2. **Initialization:**
   - Cookie read happens once on app load
   - No additional API calls for guest users
   - Language initialization is already optimized

3. **Memory:**
   - Cookie storage is minimal (few bytes)
   - No additional memory overhead

---

## Rollback Plan

If issues arise, rollback steps:

1. **Remove cookie utility functions** (if causing issues)
2. **Revert `useLanguagePreference` hook** to original version
3. **Revert `LanguageContext`** to original version
4. **Remove migration logic** from auth controller/context

All changes are additive and don't break existing functionality, so rollback is straightforward.

---

## Future Enhancements

1. **Backend Cookie Support:**
   - Store guest language preference in backend session storage
   - Sync across devices for same guest session
   - More secure than client-side cookies

2. **Language Detection:**
   - Auto-detect language from browser on first visit
   - Save to cookie automatically
   - User can override if needed

3. **Multiple Preferences:**
   - Store other guest preferences in cookies (theme, etc.)
   - Migrate all preferences on login
   - Unified preference migration system

---

## Success Criteria

✅ Guest users can change language via dropdown  
✅ Language preference persists in cookies  
✅ UI immediately reflects language change  
✅ Preference migrates to account on login  
✅ No breaking changes to authenticated user flow  
✅ All tests pass  
✅ No console errors or warnings  
✅ Works in all major browsers  

---

## Timeline Estimate

- **Phase 1:** Cookie utilities - 1 hour
- **Phase 2:** Hook updates - 2 hours
- **Phase 3:** Context updates - 1 hour
- **Phase 4:** Migration logic - 2 hours
- **Phase 5:** Testing - 3 hours
- **Phase 6:** Documentation - 1 hour

**Total:** ~10 hours

---

## Dependencies

- Existing language dropdown component
- Existing `useLanguagePreference` hook
- Existing `LanguageContext`
- Existing authentication system
- Cookie support in browsers (standard feature)

---

## Related Documents

- `docs/language_settings_unification_plan.md` - Language settings system
- `docs/language_dropdown_navbar_implementation_plan.md` - Language dropdown implementation
- `docs/implementation_complete/guest_access_prd.md` - Guest access feature
- `docs/dropdown_standardization_plan.md` - Dropdown component standards

---

## Approval

- [ ] Technical review
- [ ] Security review
- [ ] UX review
- [ ] Product owner approval

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** AI Assistant  
**Status:** Ready for Implementation
