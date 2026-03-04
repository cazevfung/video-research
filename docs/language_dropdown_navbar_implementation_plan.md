# Language Preference Dropdown in Navigation Bar - Implementation Plan

## Overview
Add a language preference dropdown to the top navigation bar, positioned between the dark/light mode toggle and the user profile button. The dropdown should be simple (no icon), and user preference changes should immediately sync, just like in the language preference settings.

## Current State Analysis

### Navigation Bar Structure
- **Location**: `frontend/src/components/AppLayoutWrapper.tsx` and `frontend/src/app/app/layout.tsx`
- **Current Order**: History Link → UserMenu → ThemeToggle
- **Target Order**: History Link → ThemeToggle → LanguageDropdown → UserMenu
- **Spacing**: Uses `spacing.gap.md` (gap-4, 16px) between navigation items
- **Container**: Flex container with `flex items-center` alignment

### Language Preference System
- **Hook**: `useLanguagePreference` in `frontend/src/hooks/useLanguagePreference.ts`
  - Reads from `user.language_preference` (single source of truth)
  - Updates via `updateLanguagePreference` API endpoint
  - Immediately syncs to i18n for instant UI updates
  - Shows success/error toast notifications
  - Invalidates cache and refetches user data after update
- **Available Languages**: From `frontend/src/config/languages.ts` (SUPPORTED_LANGUAGES)
- **Current Implementation**: `LanguageSelector` component uses full `SelectDropdown` with label/description (too complex for nav bar)

### Existing Components
- **ThemeToggle**: Uses Radix UI Switch component with Sun/Moon icons
- **UserMenu**: Uses Radix UI DropdownMenu component
- **SelectDropdown**: Full-featured dropdown with label/description (not suitable for nav bar)

## Requirements

1. **Position**: Between ThemeToggle and UserMenu
2. **Design**: Simple dropdown without icon
3. **Spacing**: Reasonable padding between all buttons (maintain `spacing.gap.md`)
4. **Functionality**: Immediate sync using existing `useLanguagePreference` hook
5. **Styling**: Consistent with existing navigation items

## Implementation Steps

### Step 1: Create LanguageDropdown Component

**File**: `frontend/src/components/ui/LanguageDropdown.tsx`

**Purpose**: A simple, icon-free dropdown component for the navigation bar that uses the existing language preference system.

**Features**:
- Simple native HTML `<select>` element (no icon)
- Uses `useLanguagePreference` hook for state and change handling
- Styled to match navigation bar aesthetic
- Shows current language label
- Displays loading state during language change
- Consistent height with other nav items (h-10)

**Implementation Details**:
```typescript
'use client';

import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { cn } from '@/lib/utils';
import { spacing, colors, typography } from '@/config/visual-effects';

export function LanguageDropdown() {
  const {
    currentLanguage,
    currentLanguageLabel,
    availableLanguages,
    isChanging,
    changeLanguage,
  } = useLanguagePreference();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      disabled={isChanging}
      className={cn(
        "h-10 px-3 py-2",
        "border-2 border-theme-border-primary bg-theme-bg",
        "rounded-md",
        typography.fontSize.base,
        colors.text.secondary,
        "hover:text-theme-text-primary",
        "focus:outline-none focus:ring-2 focus:ring-theme-border-strong focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:border-theme-border-strong transition-colors",
        "cursor-pointer",
        "min-w-[120px]" // Ensure reasonable width for language names
      )}
      aria-label="Select language"
      title="Select language"
    >
      {availableLanguages.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
```

**Design Considerations**:
- No icon (as per requirements)
- Uses native select for simplicity and accessibility
- Matches height of other nav items (h-10)
- Uses theme colors consistent with navigation
- Includes hover and focus states
- Shows loading state via disabled attribute
- Minimum width to accommodate longer language names

### Step 2: Update AppLayoutWrapper Component

**File**: `frontend/src/components/AppLayoutWrapper.tsx`

**Changes**:
1. Import `LanguageDropdown` component
2. Reorder navigation items: move `ThemeToggle` before `UserMenu`
3. Add `LanguageDropdown` between `ThemeToggle` and `UserMenu`
4. Verify spacing is maintained (should already be correct with `spacing.gap.md`)

**Location**: Line 126-147 (nav section)

**Before**:
```tsx
<nav className={cn("flex items-center", spacing.gap.md)}>
  <Link href={routes.history} ...>
    ...
  </Link>
  <UserMenu />
  <ThemeToggle />
</nav>
```

**After**:
```tsx
<nav className={cn("flex items-center", spacing.gap.md)}>
  <Link href={routes.history} ...>
    ...
  </Link>
  <ThemeToggle />
  <LanguageDropdown />
  <UserMenu />
</nav>
```

**Note**: Order is ThemeToggle → LanguageDropdown → UserMenu (as per requirement: between theme toggle and user profile button)

### Step 3: Update App Layout Component

**File**: `frontend/src/app/app/layout.tsx`

**Changes**:
1. Import `LanguageDropdown` component
2. Reorder navigation items: move `ThemeToggle` before `UserMenu`
3. Add `LanguageDropdown` between `ThemeToggle` and `UserMenu`
4. Verify spacing is maintained

**Location**: Line 110-131 (nav section)

**Before**:
```tsx
<nav className={cn("flex items-center", spacing.gap.md)}>
  <Link href={`${routes.app}/history`} ...>
    ...
  </Link>
  <UserMenu />
  <ThemeToggle />
</nav>
```

**After**:
```tsx
<nav className={cn("flex items-center", spacing.gap.md)}>
  <Link href={`${routes.app}/history`} ...>
    ...
  </Link>
  <ThemeToggle />
  <LanguageDropdown />
  <UserMenu />
</nav>
```

### Step 4: Verify Spacing

**Action**: Check that spacing between all navigation items is consistent

**Current Spacing**:
- Navigation container uses `spacing.gap.md` (gap-4, 16px)
- This applies uniform spacing between all flex children
- No additional changes needed if spacing looks good

**If spacing needs adjustment**:
- Can adjust `spacing.gap.md` to `spacing.gap.lg` (gap-6, 24px) for more space
- Or add individual margin classes if needed: `ml-2`, `mr-2`, etc.
- Should test on different screen sizes to ensure responsive behavior

### Step 5: Testing Checklist

1. **Visual Testing**:
   - [ ] Navigation order is: History → ThemeToggle → LanguageDropdown → UserMenu
   - [ ] Language dropdown appears between ThemeToggle and UserMenu
   - [ ] No icon is displayed (simple dropdown only)
   - [ ] Spacing between all nav items is consistent and reasonable
   - [ ] Dropdown height matches other nav items (h-10)
   - [ ] Dropdown width accommodates language names without truncation
   - [ ] Styling matches theme (dark/light mode)
   - [ ] Hover and focus states work correctly

2. **Functionality Testing**:
   - [ ] Current language is correctly displayed in dropdown
   - [ ] Selecting a different language immediately updates the UI
   - [ ] Language preference syncs to backend via API
   - [ ] Success toast appears after language change
   - [ ] Loading state (disabled) works during language change
   - [ ] Error handling works if API call fails
   - [ ] Language persists after page refresh
   - [ ] Language syncs across all app components

3. **Responsive Testing**:
   - [ ] Dropdown works on mobile screens
   - [ ] Dropdown works on tablet screens
   - [ ] Dropdown works on desktop screens
   - [ ] Navigation items don't overflow on small screens
   - [ ] Spacing remains consistent across screen sizes

4. **Accessibility Testing**:
   - [ ] Dropdown has proper aria-label
   - [ ] Keyboard navigation works (Tab, Arrow keys, Enter)
   - [ ] Screen reader announces language selection
   - [ ] Focus indicators are visible

5. **Integration Testing**:
   - [ ] Language change in nav bar syncs with settings page
   - [ ] Language change in settings page updates nav bar
   - [ ] Language persists across page navigations
   - [ ] No conflicts with existing language preference system

## Technical Details

### Dependencies
- `useLanguagePreference` hook (already exists)
- `SUPPORTED_LANGUAGES` from `@/config/languages` (already exists)
- Theme styling utilities from `@/config/visual-effects` (already exists)

### API Integration
- Uses existing `updateLanguagePreference` API endpoint
- No new API endpoints needed
- Leverages existing cache invalidation and refetch logic

### State Management
- Language state managed by `useLanguagePreference` hook
- Hook handles:
  - Reading current language from user profile
  - Updating language via API
  - Immediate i18n sync
  - Toast notifications
  - Loading states

### Styling Approach
- Uses existing theme system (`colors`, `spacing`, `typography`)
- Matches existing navigation item styling
- No custom CSS needed (Tailwind classes only)
- Responsive by default (Tailwind responsive utilities)

## Files to Modify

1. **New File**:
   - `frontend/src/components/ui/LanguageDropdown.tsx` (create)

2. **Modified Files**:
   - `frontend/src/components/AppLayoutWrapper.tsx` (add import and component)
   - `frontend/src/app/app/layout.tsx` (add import and component)

## Files to Review (No Changes Needed)

- `frontend/src/hooks/useLanguagePreference.ts` (already handles all functionality)
- `frontend/src/config/languages.ts` (already has language data)
- `frontend/src/config/visual-effects.ts` (already has spacing/color config)
- `frontend/src/lib/api.ts` (already has updateLanguagePreference function)

## Edge Cases to Handle

1. **Loading State**: Dropdown should be disabled during language change
2. **Error State**: If API fails, error toast shows but UI language may still change (graceful degradation)
3. **Guest Users**: Language preference should still work (stored in localStorage)
4. **Network Issues**: Should handle offline scenarios gracefully
5. **Rapid Clicks**: Hook already prevents multiple simultaneous changes via `isChanging` state

## Future Enhancements (Not in Scope)

- Custom styled dropdown (currently using native select)
- Language flag icons (explicitly not requested)
- Keyboard shortcuts for language switching
- Language detection from browser settings

## Notes

- The `useLanguagePreference` hook already handles all the complex logic (API calls, i18n sync, cache invalidation, toasts)
- The component is intentionally simple - just a select dropdown that uses the hook
- Spacing should already be correct with `spacing.gap.md`, but should be verified visually
- The dropdown will automatically update when language changes from settings page (via user data refetch)
- No need to create a separate component for settings page - existing `LanguageSelector` is fine

## Implementation Order

1. Create `LanguageDropdown` component
2. Update `AppLayoutWrapper.tsx`
3. Update `app/app/layout.tsx`
4. Test visual appearance and spacing
5. Test functionality and integration
6. Test responsive behavior
7. Test accessibility
