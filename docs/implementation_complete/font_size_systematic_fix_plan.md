# Font Size Systematic Fix Plan

## Problem Summary

1. **Too Many Font Size Variations**: Despite consolidation efforts, pages still show inconsistent font sizes
2. **Button Sizes Inconsistent**: Different buttons use different font sizes (text-sm, text-base, text-xs)
3. **Content Text Still Too Large**: Paragraphs and list items appear larger than normal despite using text-base
4. **No Systematic Approach**: Previous fixes were ad-hoc, missing many components

## Root Cause Analysis

### Current Issues

1. **Button Font Size Confusion**:
   - Some buttons use `text-sm` (now 12px - too small)
   - Some buttons use `text-base` (14px - user says this was good before)
   - Some buttons have no explicit size (inherit from parent)
   - Navigation links use `text-sm` which is now too small

2. **Content Text Issues**:
   - Some content uses `text-base` (14px) but still looks large
   - Some content may have custom CSS or inline styles overriding sizes
   - Some content may be using typography config that maps to wrong sizes
   - Markdown content may have its own font size rules

3. **Inconsistent Application**:
   - Not all components were updated in previous pass
   - Some components use direct Tailwind classes, others use typography config
   - Some components have hardcoded font sizes in CSS

## Solution Strategy

### Phase 1: Define Standard Sizes (FINAL)

Based on user feedback:
- **Content Text (Normal)**: 14px (`text-base`) - This is the standard normal size
- **Buttons**: 14px (`text-base`) - ALL buttons must use this
- **Headers**: 18px (`text-xl`) for section headers, 20px (`text-2xl`) for page titles
- **Small Text**: 12px (`text-sm`) - Only for truly necessary small text (rare)

### Phase 2: Systematic Component Audit

#### 2.1 Button Components Audit

**Goal**: Ensure ALL buttons use `text-base` (14px)

**Files to Check**:
1. `frontend/src/components/ui/Button.tsx` - Base button component
2. All components with buttons (search for `<button`, `Button`, `onClick` handlers)
3. Navigation links that act as buttons
4. Icon buttons
5. Action buttons in cards

**Fix Strategy**:
- Remove all `text-sm`, `text-xs` from buttons
- Ensure Button component defaults to `text-base`
- Override any button-specific size classes
- Check for inline styles or CSS that override button font size

#### 2.2 Content Text Audit

**Goal**: Ensure ALL content text (paragraphs, lists, descriptions) uses `text-base` (14px)

**Files to Check**:
1. All markdown renderers
2. All card components (ResultCard, SummaryCard, etc.)
3. All page components
4. All modal/dialog content
5. All form descriptions/helper text

**Fix Strategy**:
- Search for `<p>`, `<li>`, `<span>` with content text
- Check for any `text-lg`, `text-xl` on content
- Check for typography config usage that might map to wrong sizes
- Check for CSS classes that override font size
- Check for inline styles

#### 2.3 Header Text Audit

**Goal**: Ensure headers use appropriate sizes (18px or 20px only)

**Files to Check**:
1. All `<h1>`, `<h2>`, `<h3>`, `<h4>` elements
2. Card titles
3. Section headings
4. Page titles

**Fix Strategy**:
- Page titles: `text-2xl` (20px)
- Section headings: `text-xl` (18px)
- Card titles: `text-xl` (18px)
- No other header sizes allowed

#### 2.4 Metadata/Secondary Text Audit

**Goal**: Minimize use of small text, use `text-base` when possible

**Files to Check**:
1. Timestamps
2. Labels
3. Captions
4. Helper text

**Fix Strategy**:
- Default to `text-base` (14px) for all metadata
- Only use `text-sm` (12px) if absolutely necessary for hierarchy
- Prefer font weight/color for distinction over size

## Implementation Plan

### Step 1: Fix Button Component (Foundation)

**File**: `frontend/src/components/ui/Button.tsx`

**Changes**:
1. Remove any conditional font size based on button size
2. Force ALL buttons to use `text-base` (14px)
3. Remove `text-sm` from small buttons
4. Ensure no CSS overrides

**Code**:
```typescript
// BEFORE (WRONG):
size === "sm" && typography.fontSize.sm,

// AFTER (CORRECT):
typography.fontSize.base, // ALL buttons use text-base (14px)
```

### Step 2: Find All Buttons Systematically

**Search Patterns**:
1. `<button` - HTML buttons
2. `<Button` - React Button component
3. `className.*text-(sm|xs)` - Buttons with small text
4. Navigation links with button-like styling

**Action**: For each button found:
- Remove `text-sm`, `text-xs` classes
- Add `text-base` if missing
- Check for CSS overrides

### Step 3: Find All Content Text

**Search Patterns**:
1. `<p className` - Paragraphs
2. `<li className` - List items
3. `typography.fontSize.(lg|xl|md)` - Content using large sizes
4. `text-(lg|xl|2xl)` - Direct large text classes on content

**Action**: For each content element found:
- Change to `text-base` (14px)
- Remove any size classes larger than base
- Check for CSS overrides

### Step 4: Fix Markdown/Prose Content

**Files to Check**:
1. `MarkdownStreamer.tsx` - Main markdown renderer
2. Any prose plugin configurations
3. CSS for markdown content

**Action**:
- Ensure markdown paragraphs use `text-base` (14px)
- Ensure markdown lists use `text-base` (14px)
- Headers in markdown can be larger (18px/20px)
- Check for prose plugin overrides

### Step 5: Fix Navigation Links

**Files to Check**:
1. Navigation components
2. Sidebar links
3. Menu items

**Action**:
- Change `text-sm` to `text-base` (14px) for navigation links
- Ensure consistency across all navigation

### Step 6: Global CSS Audit

**Files to Check**:
1. `globals.css`
2. Any component-specific CSS files
3. Tailwind config custom CSS

**Action**:
- Remove any global font-size overrides
- Remove any CSS that sets font-size larger than 14px for content
- Ensure body text defaults to 14px

### Step 7: Typography Config Verification

**File**: `frontend/src/config/visual-effects.ts`

**Action**:
- Verify all mappings point to correct sizes
- Ensure `base` maps to `text-base` (14px)
- Remove any legacy mappings that cause confusion

## Systematic Search and Replace Strategy

### Pattern 1: Button Font Sizes

**Find**:
```typescript
// All variations of button font sizes
className={cn(..., typography.fontSize.sm, ...)}
className={cn(..., "text-sm", ...)}
className={cn(..., "text-xs", ...)}
size === "sm" && typography.fontSize.sm
```

**Replace**:
```typescript
// All buttons use text-base
className={cn(..., typography.fontSize.base, ...)}
// OR remove size-specific font size entirely
```

### Pattern 2: Content Text with Large Sizes

**Find**:
```typescript
// Content using large sizes
className={cn(typography.fontSize.lg, ...)} // on paragraphs/lists
className={cn(typography.fontSize.xl, ...)} // on paragraphs/lists
className={cn("text-lg", ...)} // on content
className={cn("text-xl", ...)} // on content
```

**Replace**:
```typescript
// All content uses text-base
className={cn(typography.fontSize.base, ...)}
className={cn("text-base", ...)}
```

### Pattern 3: Navigation Links

**Find**:
```typescript
className={cn(..., "text-sm", ...)} // on links
className={cn(..., typography.fontSize.sm, ...)} // on links
```

**Replace**:
```typescript
className={cn(..., "text-base", ...)} // on links
className={cn(..., typography.fontSize.base, ...)} // on links
```

## Testing Checklist

### Visual Consistency
- [ ] ALL buttons have the same font size (14px)
- [ ] ALL content text (paragraphs, lists) has the same font size (14px)
- [ ] Headers are appropriately sized (18px or 20px only)
- [ ] No more than 3-4 different font sizes visible on any page
- [ ] Simple components use only 1 font size

### Component Audit
- [ ] Button component forces text-base for all buttons
- [ ] Navigation links use text-base
- [ ] All card content uses text-base
- [ ] All form content uses text-base
- [ ] All modal/dialog content uses text-base
- [ ] Markdown content uses text-base for body text

### Code Quality
- [ ] No hardcoded font sizes in content areas
- [ ] No CSS overrides for font size
- [ ] Typography config is consistent
- [ ] All components use typography config or direct Tailwind classes consistently

## Execution Order

1. **Step 1**: Fix Button component (foundation)
2. **Step 2**: Search and fix all buttons (systematic)
3. **Step 3**: Search and fix all content text (systematic)
4. **Step 4**: Fix markdown/prose content
5. **Step 5**: Fix navigation links
6. **Step 6**: Global CSS audit
7. **Step 7**: Typography config verification
8. **Step 8**: Final visual review and testing

## Success Criteria

1. **Maximum 3-4 font sizes per page**:
   - `text-base` (14px) - All content, buttons, navigation
   - `text-xl` (18px) - Section headers, card titles
   - `text-2xl` (20px) - Page titles
   - `text-sm` (12px) - Only if truly necessary (rare)

2. **All buttons identical size**: Every button uses `text-base` (14px)

3. **All content text identical size**: Every paragraph, list item, description uses `text-base` (14px)

4. **No visual inconsistencies**: User should see uniform, professional typography

## Notes

- **14px is Normal**: This is the standard normal web font size. Not 16px, not 12px - 14px.
- **Buttons = Content**: Buttons are content, they should be the same size as content text.
- **Systematic Approach**: This plan ensures we find and fix EVERY instance, not just some.
- **One Size for Simple Components**: Alerts, banners, buttons, simple cards should use ONLY text-base.

