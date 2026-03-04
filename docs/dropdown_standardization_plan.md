# Dropdown Standardization Plan - Animate UI Integration

## Overview
This plan outlines the strategy to standardize all dropdown components across the application using [Animate UI's Dropdown Menu component](https://animate-ui.com/docs/components/radix/dropdown-menu). This will provide consistent, beautiful animations and styling across all dropdown implementations.

## Current State Analysis

### Existing Dropdown Implementations

#### 1. **DropdownMenu.tsx** (Base Component)
- **Location**: `frontend/src/components/ui/DropdownMenu.tsx`
- **Type**: Custom Radix UI wrapper
- **Status**: Currently uses manual styling with CSS variables
- **Features**: 
  - Basic animations (fade, zoom, slide) via Tailwind classes
  - Manual hover/focus state management
  - Theme-aware styling
- **Used By**: UserMenu, HelpMenu, SortDropdown, ControlPanel

#### 2. **SelectDropdown.tsx** (Settings Form)
- **Location**: `frontend/src/components/ui/SelectDropdown.tsx`
- **Type**: Native HTML `<select>` element
- **Status**: No animations, basic styling
- **Features**: Label, description, disabled state
- **Used By**: LanguageSelector (settings page)

#### 3. **LanguageDropdown.tsx** (Navigation Bar)
- **Location**: `frontend/src/components/ui/LanguageDropdown.tsx`
- **Type**: Native HTML `<select>` element
- **Status**: Basic styling, no animations
- **Features**: Simple language selection for navbar
- **Used By**: AppLayoutWrapper, app layout

#### 4. **SortDropdown.tsx** (History Page)
- **Location**: `frontend/src/components/history/SortDropdown.tsx`
- **Type**: Uses DropdownMenu component
- **Status**: Functional but uses current DropdownMenu implementation
- **Features**: Sort options with icons, selected state indication

#### 5. **UserMenu.tsx** (Navigation)
- **Location**: `frontend/src/components/ui/UserMenu.tsx`
- **Type**: Uses DropdownMenu component
- **Status**: Functional but uses current DropdownMenu implementation
- **Features**: User profile menu with account, settings, logout

#### 6. **HelpMenu.tsx** (Navigation)
- **Location**: `frontend/src/components/ui/HelpMenu.tsx`
- **Type**: Uses DropdownMenu component
- **Status**: Functional but uses current DropdownMenu implementation
- **Features**: Help links, documentation, support

#### 7. **ControlPanel.tsx** (Dashboard)
- **Location**: `frontend/src/components/dashboard/ControlPanel.tsx`
- **Type**: Uses DropdownMenu component for language selector
- **Status**: Functional but uses current DropdownMenu implementation
- **Features**: Language selection dropdown

### Current Issues

1. **Inconsistent Styling**: Native `<select>` elements look different from Radix UI dropdowns
2. **No Smooth Animations**: Current animations are basic Tailwind transitions
3. **Manual State Management**: Hover/focus states managed manually with event handlers
4. **Mixed Patterns**: Some components use native selects, others use Radix UI
5. **Limited Customization**: Native selects have limited styling options

## Animate UI Benefits

### Advantages

1. **Beautiful Animations**: Built-in Framer Motion animations for smooth transitions
2. **Consistent API**: Same component structure across all dropdowns
3. **Better Accessibility**: Enhanced keyboard navigation and screen reader support
4. **Theme Integration**: Works seamlessly with existing theme system
5. **Flexible Styling**: Easy to customize while maintaining consistency
6. **Sub-menus Support**: Built-in support for nested dropdowns
7. **Checkbox/Radio Items**: Built-in support for complex menu items

### Key Features from Animate UI

- **Smooth Transitions**: `{ duration: 0.2 }` default transition
- **Side Offset**: Configurable positioning (default: 4px)
- **Container Support**: Can render in specific containers
- **Motion Props**: Full Framer Motion integration
- **Sub-menu Support**: Nested dropdowns with animations

## Implementation Plan

### Phase 1: Install and Setup Animate UI

#### Step 1.1: Install Animate UI Package
```bash
npm install @animate-ui/react
```

**Note**: Check if Animate UI is available as a package or if we need to copy the component code. Based on the documentation, it appears to be a component library that may need to be installed or copied.

#### Step 1.2: Verify Dependencies
- ✅ `framer-motion` (already installed: ^12.24.0)
- ✅ `@radix-ui/react-dropdown-menu` (already installed: ^2.1.16)
- ✅ `react` (already installed: ^19.2.3)

#### Step 1.3: Create Animate UI DropdownMenu Component
**File**: `frontend/src/components/ui/DropdownMenuAnimate.tsx`

**Purpose**: Create a new component that wraps Animate UI's DropdownMenu with our theme system integration.

**Key Features**:
- Integrate with existing theme CSS variables
- Maintain backward compatibility with current API
- Add smooth animations via Framer Motion
- Support all existing props and features

### Phase 2: Migrate Base DropdownMenu Component

#### Step 2.1: Update DropdownMenu.tsx
**File**: `frontend/src/components/ui/DropdownMenu.tsx`

**Changes**:
1. Replace manual animations with Animate UI's Framer Motion animations
2. Remove manual hover/focus event handlers (use Animate UI's built-in states)
3. Integrate theme CSS variables with Animate UI's styling
4. Maintain all existing exports and API compatibility
5. Add transition configuration for smooth animations
6. **CRITICAL**: Ensure all colors use CSS variables (no hardcoded hex/rgb values)
7. **CRITICAL**: Test theme switching with dropdowns open/closed

**Key Updates**:
- `DropdownMenuContent`: Add `transition={{ duration: 0.2 }}` prop
- `DropdownMenuSubContent`: Add `transition={{ duration: 0.2 }}` prop
- Remove manual `onFocus`, `onBlur`, `onMouseEnter`, `onMouseLeave` handlers
- Use Animate UI's built-in hover states
- Keep theme CSS variable integration
- **Verify inline styles use CSS variables**: `backgroundColor: "var(--color-theme-bg-card)"`
- **Verify border colors use CSS variables**: `borderColor: "var(--color-theme-border-primary)"`
- **Verify text colors use CSS variables**: `color: "var(--color-theme-text-primary)"`
- **Verify hover states use CSS variables**: `backgroundColor: "var(--color-theme-bg-card-hover)"`

#### Step 2.2: Preserve Existing Features
- ✅ Theme-aware colors (CSS variables)
- ✅ Typography system integration
- ✅ Spacing system integration
- ✅ All sub-components (Label, Separator, Item, etc.)
- ✅ Checkbox and Radio item support
- ✅ Sub-menu support
- ✅ **Dark/light mode automatic switching** (via `.dark` class on `:root`)
- ✅ **CSS variable reactivity** (colors update when theme changes)

### Phase 3: Migrate Native Select Dropdowns

#### Step 3.1: Replace LanguageDropdown.tsx
**File**: `frontend/src/components/ui/LanguageDropdown.tsx`

**Current**: Native HTML `<select>` element
**New**: Animate UI DropdownMenu component

**Changes**:
1. Replace `<select>` with `DropdownMenu` structure
2. Use `DropdownMenuTrigger` with current language display
3. Use `DropdownMenuItem` for each language option
4. Maintain same API (uses `useLanguagePreference` hook)
5. Add smooth animations
6. Keep same styling (height, width, etc.)
7. **CRITICAL**: Use CSS variables for all colors (not hardcoded)
8. **CRITICAL**: Test theme switching while dropdown is open

**Benefits**:
- Consistent look with other dropdowns
- Smooth animations
- Better mobile experience
- Enhanced accessibility

#### Step 3.2: Replace SelectDropdown.tsx
**File**: `frontend/src/components/ui/SelectDropdown.tsx`

**Current**: Native HTML `<select>` with label/description
**New**: Animate UI DropdownMenu with label/description wrapper

**Changes**:
1. Keep label and description structure (outside dropdown)
2. Replace `<select>` with `DropdownMenu` component
3. Use `DropdownMenuTrigger` styled as select button
4. Use `DropdownMenuItem` for each option
5. Maintain disabled state support
6. Add smooth animations
7. **CRITICAL**: Use CSS variables for label/description colors
8. **CRITICAL**: Ensure trigger button uses theme colors
9. **CRITICAL**: Test theme switching in settings page

**Benefits**:
- Consistent styling with other dropdowns
- Better visual feedback
- Enhanced accessibility
- Smooth animations

### Phase 4: Update Existing DropdownMenu Users

#### Step 4.1: Verify SortDropdown.tsx
**File**: `frontend/src/components/history/SortDropdown.tsx`

**Status**: Already uses DropdownMenu component
**Action**: No changes needed (will automatically benefit from Phase 2 updates)

**Verification**:
- ✅ Check that animations work correctly
- ✅ Verify selected state indication still works
- ✅ Test icon display
- ✅ Verify responsive behavior

#### Step 4.2: Verify UserMenu.tsx
**File**: `frontend/src/components/ui/UserMenu.tsx`

**Status**: Already uses DropdownMenu component
**Action**: No changes needed (will automatically benefit from Phase 2 updates)

**Verification**:
- ✅ Check that menu opens/closes smoothly
- ✅ Verify all menu items work correctly
- ✅ Test guest vs. authenticated states
- ✅ Verify credit display formatting

#### Step 4.3: Verify HelpMenu.tsx
**File**: `frontend/src/components/ui/HelpMenu.tsx`

**Status**: Already uses DropdownMenu component
**Action**: No changes needed (will automatically benefit from Phase 2 updates)

**Verification**:
- ✅ Check that menu opens/closes smoothly
- ✅ Verify all menu items work correctly
- ✅ Test external link handling

#### Step 4.4: Update ControlPanel.tsx Language Selector
**File**: `frontend/src/components/dashboard/ControlPanel.tsx`

**Status**: Uses DropdownMenu component (lines 283-316)
**Action**: Verify it works with updated DropdownMenu

**Current Implementation**:
- Uses DropdownMenu with custom styling
- Has SSR fallback to native select
- Custom transparent background styling

**Updates Needed**:
- Verify animations work correctly
- Test SSR fallback still works
- Ensure custom styling is preserved
- **CRITICAL**: Verify transparent background works in both themes
- **CRITICAL**: Test theme switching with language selector open

### Phase 5: Testing and Verification

#### Step 5.0: Dark/Light Mode Verification (CRITICAL)

**Before proceeding with other tests, verify theme compatibility:**

1. **Code Review**:
   - [ ] Search codebase for hardcoded colors (hex, rgb, rgba) in dropdown components
   - [ ] Verify all colors use CSS variables (`var(--color-theme-*)`)
   - [ ] Check inline styles use CSS variables
   - [ ] Verify Tailwind classes use theme-aware utilities

2. **Theme Switching Tests**:
   - [ ] Open app in light mode, verify all dropdowns use light theme colors
   - [ ] Open app in dark mode, verify all dropdowns use dark theme colors
   - [ ] Switch from light to dark with all dropdowns closed
   - [ ] Switch from dark to light with all dropdowns closed
   - [ ] Open dropdown in light mode, switch to dark - colors update immediately
   - [ ] Open dropdown in dark mode, switch to light - colors update immediately
   - [ ] Verify no color flicker during theme transitions
   - [ ] Verify animations remain smooth during theme switch

3. **Component-Specific Theme Tests**:
   - [ ] LanguageDropdown: Navbar colors correct in both themes
   - [ ] SelectDropdown: Settings page colors correct in both themes
   - [ ] SortDropdown: History page colors correct in both themes
   - [ ] UserMenu: User menu colors correct in both themes
   - [ ] HelpMenu: Help menu colors correct in both themes
   - [ ] ControlPanel: Dashboard colors correct in both themes

#### Step 5.1: Visual Testing Checklist

**All Dropdowns**:
- [ ] Smooth open/close animations
- [ ] Consistent styling across all dropdowns
- [ ] Theme colors applied correctly (light/dark mode)
- [ ] Hover states work smoothly
- [ ] Focus states are visible and accessible
- [ ] Selected states are clearly indicated
- [ ] Disabled states are properly styled
- [ ] Icons display correctly
- [ ] Text alignment is consistent
- [ ] Spacing is uniform

#### Step 5.1.1: Dark/Light Mode Testing Checklist

**Theme Switching Tests**:
- [ ] Switch theme while dropdown is closed - colors update correctly
- [ ] Switch theme while dropdown is open - colors update immediately
- [ ] Open dropdown in light mode, verify all colors are correct
- [ ] Open dropdown in dark mode, verify all colors are correct
- [ ] Switch from light to dark with dropdown open - no visual glitches
- [ ] Switch from dark to light with dropdown open - no visual glitches
- [ ] All CSS variables resolve correctly in both themes
- [ ] No hardcoded colors (all use CSS variables)
- [ ] Background colors adapt correctly (`--color-theme-bg-card`)
- [ ] Border colors adapt correctly (`--color-theme-border-primary`)
- [ ] Text colors adapt correctly (`--color-theme-text-primary`, `--color-theme-text-secondary`)
- [ ] Hover states work in both themes (`--color-theme-bg-card-hover`)
- [ ] Focus states visible in both themes
- [ ] Selected states visible in both themes
- [ ] Disabled states visible in both themes
- [ ] Icons have proper contrast in both themes
- [ ] Shadows/overlays work correctly in both themes
- [ ] Animations are smooth in both themes (no color flicker during transitions)

**Specific Components**:
- [ ] LanguageDropdown: Works in navbar, shows current language
- [ ] SelectDropdown: Label and description display correctly
- [ ] SortDropdown: Icons and selected state work
- [ ] UserMenu: All menu items functional, credit display works
- [ ] HelpMenu: All links work, external link indicator visible
- [ ] ControlPanel: Language selector works, SSR fallback functions

**Component-Specific Dark/Light Mode Tests**:
- [ ] **LanguageDropdown**: Theme colors in navbar (both themes)
- [ ] **SelectDropdown**: Label/description colors adapt correctly
- [ ] **SortDropdown**: Icons visible in both themes, selected state clear
- [ ] **UserMenu**: Credit display readable in both themes
- [ ] **UserMenu**: User info section readable in both themes
- [ ] **HelpMenu**: All text/icons visible in both themes
- [ ] **ControlPanel**: Language selector matches dashboard theme

#### Step 5.2: Functional Testing Checklist

**Interactions**:
- [ ] Click to open/close works
- [ ] Keyboard navigation (Arrow keys, Enter, Escape)
- [ ] Click outside to close
- [ ] Selection updates correctly
- [ ] Callbacks fire on selection
- [ ] Disabled items don't respond to clicks
- [ ] Loading states work (LanguageDropdown during change)

**Edge Cases**:
- [ ] Very long option text (truncation/overflow)
- [ ] Many options (scroll behavior)
- [ ] Empty options list
- [ ] Rapid open/close clicks
- [ ] Mobile touch interactions
- [ ] Screen reader announcements

#### Step 5.3: Responsive Testing Checklist

**Breakpoints**:
- [ ] Mobile (< 640px): Dropdowns fit on screen
- [ ] Tablet (640px - 1024px): Dropdowns position correctly
- [ ] Desktop (> 1024px): Full functionality
- [ ] Large screens: Dropdowns don't overflow

**Specific Tests**:
- [ ] LanguageDropdown in navbar on mobile
- [ ] UserMenu on small screens
- [ ] SortDropdown on history page (all screen sizes)
- [ ] ControlPanel language selector (all screen sizes)

#### Step 5.4: Accessibility Testing Checklist

**WCAG Compliance**:
- [ ] Keyboard navigation works (Tab, Arrow keys, Enter, Escape)
- [ ] Focus indicators are visible
- [ ] Screen reader announces menu state
- [ ] ARIA labels are correct
- [ ] Color contrast meets WCAG AA standards
- [ ] No keyboard traps
- [ ] Focus management is correct

**Tools**:
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Test with keyboard only
- [ ] Run accessibility audit (Lighthouse)
- [ ] Check color contrast ratios

### Phase 6: Performance Optimization

#### Step 6.1: Animation Performance
- [ ] Verify animations are smooth (60fps)
- [ ] Check for layout shifts during animations
- [ ] Test on lower-end devices
- [ ] Optimize transition durations if needed
- [ ] **Verify theme switching doesn't cause performance issues**
- [ ] **Test animations during theme transitions**

#### Step 6.2: Bundle Size
- [ ] Check bundle size impact of Animate UI
- [ ] Verify tree-shaking works correctly
- [ ] Consider lazy loading if needed

#### Step 6.3: SSR Compatibility
- [ ] Verify SSR rendering works (ControlPanel fallback)
- [ ] Check hydration errors
- [ ] Test with Next.js SSR

## Implementation Details

### Animate UI Integration Pattern

Based on the [Animate UI documentation](https://animate-ui.com/docs/components/radix/dropdown-menu), the component structure is:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent 
    sideOffset={4}
    transition={{ duration: 0.2 }}
  >
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Theme Integration Strategy

**Current Theme System**:
- CSS variables: `--color-theme-bg-card`, `--color-theme-border-primary`, etc.
- Visual effects config: `colors`, `spacing`, `typography` from `@/config/visual-effects`
- Theme switching: `.dark` class on `:root` element (via ThemeToggle component)
- Automatic color switching: CSS variables change based on `.dark` class presence

**Integration Approach**:
1. Use inline styles for CSS variables (already done in current DropdownMenu)
2. Use Tailwind classes from visual-effects config
3. Maintain backward compatibility with existing theme system
4. Add Framer Motion transitions for animations
5. **CRITICAL**: Ensure all colors use CSS variables (not hardcoded values)
6. **CRITICAL**: Test theme switching with dropdowns open/closed
7. **CRITICAL**: Verify animations work correctly in both themes

### Migration Pattern for Native Selects

**Before (Native Select)**:
```tsx
<select value={value} onChange={onChange}>
  {options.map(option => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
```

**After (Animate UI)**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      {selectedLabel} <ChevronDown />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {options.map(option => (
      <DropdownMenuItem
        key={option.value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

### Dark/Light Mode Implementation Pattern

**Correct Implementation (Theme-Aware)**:
```tsx
// ✅ CORRECT: Uses CSS variables that automatically adapt to theme
const DropdownMenuContent = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Content
    ref={ref}
    className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border p-1", className)}
    style={{
      backgroundColor: "var(--color-theme-bg-card)", // ✅ CSS variable
      borderColor: "var(--color-theme-border-primary)", // ✅ CSS variable
      color: "var(--color-theme-text-primary)", // ✅ CSS variable
    }}
    {...props}
  />
));

const DropdownMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn("px-2 py-1.5 rounded-sm", className)}
    style={{
      // ✅ CSS variables for hover state (handled via CSS or inline)
      // Hover state will use: var(--color-theme-bg-card-hover)
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // ✅ CSS variable
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    {...props}
  />
));
```

**Incorrect Implementation (Hardcoded Colors)**:
```tsx
// ❌ WRONG: Hardcoded colors don't adapt to theme
const DropdownMenuContent = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Content
    ref={ref}
    className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border p-1", className)}
    style={{
      backgroundColor: "#F5F4F0", // ❌ Hardcoded light mode color
      borderColor: "#1F1E18", // ❌ Hardcoded dark color
      color: "#1F1E18", // ❌ Hardcoded dark color
    }}
    {...props}
  />
));
```

**Key Principles**:
1. ✅ Always use CSS variables: `var(--color-theme-*)`
2. ✅ Never hardcode colors: No hex (#), rgb(), or rgba() values
3. ✅ Test in both themes: Verify colors are correct in light and dark
4. ✅ Test theme switching: Verify colors update when theme changes
5. ✅ Use theme-aware Tailwind classes: Prefer `colors.text.primary` over hardcoded classes

## Files to Modify

### New Files
1. `frontend/src/components/ui/DropdownMenuAnimate.tsx` (if needed as wrapper)

### Modified Files
1. `frontend/src/components/ui/DropdownMenu.tsx` - Update with Animate UI animations
2. `frontend/src/components/ui/LanguageDropdown.tsx` - Replace native select
3. `frontend/src/components/ui/SelectDropdown.tsx` - Replace native select
4. `frontend/src/components/dashboard/ControlPanel.tsx` - Verify compatibility

### Files to Review (No Changes Expected)
1. `frontend/src/components/ui/UserMenu.tsx` - Will benefit from base component updates
2. `frontend/src/components/ui/HelpMenu.tsx` - Will benefit from base component updates
3. `frontend/src/components/history/SortDropdown.tsx` - Will benefit from base component updates

## Dependencies

### Required Packages
- `@radix-ui/react-dropdown-menu` (already installed: ^2.1.16)
- `framer-motion` (already installed: ^12.24.0)
- `@animate-ui/react` (to be installed - verify package name/installation method)

### Package Installation Options

**Option 1: NPM Package** (if available)
```bash
npm install @animate-ui/react
```

**Option 2: Copy Component Code** (if no package)
- Copy Animate UI DropdownMenu component code
- Adapt to our theme system
- Maintain as internal component

**Option 3: Manual Implementation**
- Use Animate UI as reference
- Implement similar animations with Framer Motion
- Integrate with existing Radix UI primitives

## Risk Assessment

### Low Risk
- ✅ Updating existing DropdownMenu component (backward compatible)
- ✅ Components already using DropdownMenu (automatic benefits)

### Medium Risk
- ⚠️ Replacing native selects (requires testing)
- ⚠️ SSR compatibility (ControlPanel has fallback)
- ⚠️ Animate UI package availability/installation

### High Risk
- ⚠️ Breaking changes in API (mitigated by maintaining compatibility)
- ⚠️ Performance impact (mitigated by testing)

### Mitigation Strategies
1. **Gradual Migration**: Update base component first, then migrate selects
2. **Backward Compatibility**: Maintain existing API and props
3. **Testing**: Comprehensive testing at each phase
4. **Fallbacks**: Keep SSR fallbacks where needed
5. **Rollback Plan**: Keep old implementation until verified

## Success Criteria

### Visual Consistency
- ✅ All dropdowns have consistent styling
- ✅ Smooth animations across all dropdowns
- ✅ Theme colors applied uniformly
- ✅ No visual regressions
- ✅ **Dark/light mode works correctly for all dropdowns**
- ✅ **Theme switching is smooth with no visual glitches**

### Functional Completeness
- ✅ All existing functionality preserved
- ✅ No breaking changes
- ✅ All interactions work correctly
- ✅ Accessibility maintained/improved

### Performance
- ✅ Animations run at 60fps
- ✅ No significant bundle size increase
- ✅ No layout shifts
- ✅ Fast interaction response

### Code Quality
- ✅ Consistent component structure
- ✅ Reusable patterns
- ✅ Well-documented
- ✅ Type-safe

## Timeline Estimate

### Phase 1: Setup (1-2 hours)
- Install/verify Animate UI
- Create wrapper component if needed

### Phase 2: Base Component (2-3 hours)
- Update DropdownMenu.tsx
- Test with existing components

### Phase 3: Native Select Migration (3-4 hours)
- Replace LanguageDropdown
- Replace SelectDropdown
- Test thoroughly

### Phase 4: Verification (1-2 hours)
- Verify all existing components
- Update ControlPanel if needed

### Phase 5: Testing (2-3 hours)
- Visual testing
- Functional testing
- Accessibility testing
- Responsive testing

### Phase 6: Optimization (1-2 hours)
- Performance checks
- Bundle size optimization
- Final polish

**Total Estimate**: 10-16 hours

## Dark/Light Mode Implementation Guidelines

### Critical Requirements

1. **Always Use CSS Variables**: Never hardcode colors (hex, rgb, rgba values)
   - ✅ Correct: `backgroundColor: "var(--color-theme-bg-card)"`
   - ❌ Wrong: `backgroundColor: "#F5F4F0"` (hardcoded light mode color)

2. **Test Theme Switching**: Verify dropdowns work correctly when theme changes
   - Test with dropdown closed
   - Test with dropdown open
   - Verify no color flicker or visual glitches
   - Verify animations remain smooth during theme switch

3. **CSS Variable Reference**:
   - Backgrounds: `--color-theme-bg-card`, `--color-theme-bg-card-hover`
   - Borders: `--color-theme-border-primary`, `--color-theme-border-strong`
   - Text: `--color-theme-text-primary`, `--color-theme-text-secondary`
   - See `frontend/src/styles/variables.css` for complete list

4. **Theme Toggle Behavior**:
   - ThemeToggle adds/removes `.dark` class on `document.documentElement`
   - CSS variables automatically switch based on `.dark` class
   - No JavaScript needed in dropdown components - CSS handles it

5. **Common Pitfalls to Avoid**:
   - ❌ Hardcoding light/dark colors
   - ❌ Using Tailwind color classes that don't use CSS variables
   - ❌ Forgetting to test with dropdown open during theme switch
   - ❌ Using opacity without considering theme background
   - ❌ Not testing all states (hover, focus, selected, disabled) in both themes

6. **Verification Checklist**:
   - [ ] All colors use CSS variables
   - [ ] No hardcoded hex/rgb colors found
   - [ ] Theme switch works with dropdown closed
   - [ ] Theme switch works with dropdown open
   - [ ] All states visible in light mode
   - [ ] All states visible in dark mode
   - [ ] Contrast ratios meet WCAG AA in both themes
   - [ ] Animations smooth in both themes

## Notes

1. **Animate UI Package**: Verify the exact installation method for Animate UI. The documentation shows it as a component library, but the package name/installation may vary.

2. **Framer Motion**: Already installed, so animations are ready to use.

3. **Theme System**: Current theme system uses CSS variables which work well with inline styles. This should integrate smoothly with Animate UI. **CRITICAL**: Always use CSS variables, never hardcode colors.

4. **SSR Considerations**: ControlPanel has SSR fallback logic. Ensure Animate UI components work with Next.js SSR or maintain fallbacks.

5. **Backward Compatibility**: Maintain all existing props and APIs to avoid breaking changes.

6. **Gradual Rollout**: Consider updating one component at a time and testing before proceeding to the next.

7. **Documentation**: Update component documentation after migration to reflect new animation capabilities.

8. **Dark/Light Mode**: The theme system uses CSS variables that automatically switch when `.dark` class is added to `:root`. All dropdown components must use these CSS variables exclusively - no hardcoded colors. Test theme switching with dropdowns both open and closed.

## Future Enhancements (Out of Scope)

- Custom animation presets
- Advanced sub-menu animations
- Drag-and-drop support in dropdowns
- Virtual scrolling for long lists
- Search/filter within dropdowns
