# Font Size Consolidation Plan

## Problem Summary

1. **Inconsistent Font Sizes**: Font sizes are still inconsistent across the application, creating visual clutter
2. **Content Text Too Large**: Normal content text is larger than standard (currently using sizes meant for emphasized text)
3. **Too Many Size Variations**: Current 6-step scale still allows for inconsistency; need further consolidation

## Goals

1. **Standardize Content Text**: Set normal content text to standard web size (14px)
2. **Reduce Variations**: Use 2-4 font sizes maximum per page/component, depending on context and complexity
3. **Clear Hierarchy**: Headers can be larger, but all body/content text should use normal size
4. **Consistency**: Ensure same semantic elements use the same font size everywhere
5. **Context-Appropriate**: Simple pages use fewer sizes; complex pages may need more for hierarchy

---

## Current State Analysis

### Current Font Size Scale

| Size | Tailwind Class | Pixels | Current Usage | Issue |
|------|---------------|--------|---------------|-------|
| xs | `text-xs` | 11px | Captions, timestamps | Too small for some uses |
| sm | `text-sm` | 13px | Labels, metadata | OK for secondary text |
| base | `text-base` | 15px | Body text (intended) | Often not used for content |
| lg | `text-lg` | 17px | Section headings, emphasized body | **Used for content text (WRONG)** |
| xl | `text-xl` | 19px | Card titles, subheadings | **Used for content text (WRONG)** |
| 2xl | `text-2xl` | 22px | Page titles, major headings | OK for headers |

### Issues Identified

1. **Content Text Using Wrong Sizes**: Many content areas use `text-lg` (17px) or `text-xl` (19px) instead of `text-base` (15px)
2. **No Standard Definition**: Unclear what "normal" content text size should be
3. **Inconsistent Application**: Same semantic elements (paragraphs, descriptions) use different sizes
4. **Standard Web Size**: Normal web body text is typically 14px; current `text-base` at 15px is too large, need to reduce to 14px

---

## Proposed Font Size System

### Available Font Sizes (Use 1-4 per page/component)

**Key Principle: Use the MINIMUM number of sizes needed. Many components only need ONE size.**

Maximum of 4 sizes available, but most components should use 1-2:

| Size Name | Tailwind Class | Pixels | Use Case | Notes |
|-----------|---------------|--------|----------|-------|
| **sm** | `text-sm` | 12px | Only when small text is truly necessary | Rare - avoid when possible |
| **base** | `text-base` | 14px | **ALL content text, descriptions, buttons, alerts** | **Standard normal text - DEFAULT for everything** |
| **lg** | `text-xl` | 18px | Page/section titles only | Optional - for headers only |
| **xl** | `text-2xl` | 20px | Major page titles only | Optional - rare use |

### Size Selection by Page/Component Complexity

**Simple Components (1 size - PREFERRED):**
- `text-base` (14px) - **ALL text** (titles, content, descriptions, buttons, labels)
- Use font weight (bold/semibold) for emphasis instead of different sizes
- **Examples**: Alerts, banners, simple cards, buttons, form inputs

**Simple Pages (1-2 sizes):**
- `text-base` (14px) - All content text
- `text-xl` (18px) - Page title (only if needed for hierarchy)

**Medium Complexity (2-3 sizes):**
- `text-base` (14px) - All content text (default)
- `text-xl` (18px) - Headers, titles (only if needed)
- `text-sm` (12px) - Only if metadata/labels are truly necessary

**Complex Pages (3-4 sizes - use sparingly):**
- `text-base` (14px) - All content text (default)
- `text-xl` (18px) - Section headings, card titles
- `text-2xl` (20px) - Major page titles (rare)
- `text-sm` (12px) - Only if metadata is essential

### Size Adjustments

1. **sm**: 13px → **12px** (rarely used, smaller for when truly needed)
2. **base**: 15px → **14px** (standard normal web body text size)
3. **lg (xl)**: 19px → **18px** (reduce from xl, consolidate lg into this)
4. **xl (2xl)**: 22px → **20px** (slightly reduce for headers)

### Eliminated Sizes

- **xs (11px)**: Merge into `sm` (12px) - too small, rarely needed
- **lg (17px)**: Eliminated - too close to base, causes confusion
- **xl (19px)**: Consolidate into new `lg` (18px)

### Choosing How Many Sizes to Use

**Use 1 size (PREFERRED):**
- Alerts, banners, notifications
- Simple cards
- Buttons
- Form inputs
- Most UI components
- **Example**: Everything uses `text-base` (14px), use font weight for emphasis

**Use 2 sizes when:**
- Simple content pages (e.g., settings, about)
- Cards with clear title/content distinction needed
- **Example**: `text-base` (all content) + `text-xl` (page title only)

**Use 3 sizes when:**
- Forms with essential labels
- Cards with essential metadata
- **Example**: `text-base` (content) + `text-xl` (title) + `text-sm` (essential metadata only)

**Use 4 sizes only when:**
- Complex dashboards with multiple hierarchy levels
- Very rare - prefer fewer sizes when possible

### Examples by Component Type

**Alert/Banner (1 size - SIMPLIFIED):**
```tsx
// BEFORE (WRONG - 2 sizes):
<div className="alert">
  <p className="text-sm font-medium">Guest limit reached</p>
  <p className="text-xs">You've used all 1 guest summary...</p>
</div>

// AFTER (CORRECT - 1 size):
<div className="alert">
  <p className="text-base font-semibold">Guest limit reached</p>
  <p className="text-base">You've used all 1 guest summary. Login to save your summaries and unlock more features.</p>
</div>
```

**Simple Card (1 size):**
```tsx
// All text uses same size
<div className="card">
  <h3 className="text-base font-semibold">Card Title</h3>
  <p className="text-base">Card description content...</p>
</div>
```

**Button (1 size):**
```tsx
// Buttons use normal text size
<button className="text-base font-medium">Login</button>
```

**Page with Title (2 sizes):**
```tsx
// Page title can be larger, everything else is base
<h1 className="text-xl font-semibold">Settings</h1>
<p className="text-base">Configure your preferences...</p>
```

**Card with Essential Metadata (2-3 sizes):**
```tsx
// Only if metadata is truly necessary
<h3 className="text-base font-semibold">Card Title</h3>
<p className="text-base">Card description content...</p>
<span className="text-sm text-gray-500">2 hours ago</span> // Only if essential
```

---

## Standard Font Size Rules

### Content Text (Normal Size)

**ALL content text must use `text-base` (14px) - this includes:**
- Paragraphs
- Descriptions
- Body text in cards
- Form input text
- Dialog/modal content
- Article/content areas
- Markdown-rendered content
- Summary text
- Explanatory text
- Alert/banner text (titles AND descriptions)
- Button text
- Label text
- Any regular reading content

**Key Rule: For simple components (alerts, banners, buttons, simple cards), use ONLY `text-base` (14px) for ALL text.**
- Use font weight (bold/semibold) for emphasis, NOT different font sizes
- Avoid `text-sm` and `text-xs` - they create unnecessary variation

**DO NOT use `text-lg`, `text-xl`, or larger for content text.**
**DO NOT use `text-sm` or `text-xs` unless absolutely necessary for hierarchy.**

### Headers (Can Be Larger)

Headers can use larger sizes:
- **Page Titles**: `text-2xl` (20px)
- **Section Headings**: `text-xl` (18px)
- **Card Titles**: `text-xl` (18px)
- **Subheadings**: `text-xl` (18px)

**Use font weight (bold/semibold) for emphasis, not larger sizes.**

### Secondary Text (Avoid When Possible)

**Avoid using smaller text sizes. Most text should use `text-base` (14px).**

Only use `text-sm` (14px) when:
- Metadata is essential for the UI
- There's a clear hierarchy requirement that can't be achieved with font weight
- It's part of a complex page that genuinely needs 3-4 sizes

**Default to `text-base` for:**
- Labels (use `text-base`)
- Metadata (use `text-base` unless essential)
- Captions (use `text-base`)
- Timestamps (use `text-base`)
- Helper text (use `text-base`)
- Button text (use `text-base`)
- Alert text (use `text-base` for all text)

---

## Implementation Plan

### Phase 1: Update Tailwind Configuration

**File**: `frontend/tailwind.config.ts`

Update font sizes to new 4-step scale:

```typescript
fontSize: {
  'sm': ['14px', { lineHeight: '1.5' }],      // Labels, metadata (was 13px)
  'base': ['14px', { lineHeight: '1.6' }],    // Body text (was 15px) - NORMAL SIZE
  'lg': ['18px', { lineHeight: '1.5' }],      // Headings, titles (was 17px, consolidate xl)
  'xl': ['20px', { lineHeight: '1.4' }],      // Page titles (was 22px, reduce)
  // Remove 'xs' - use 'sm' instead
  // Remove old '2xl' - use 'xl' instead
},
```

**Note**: Keep `xl` and `2xl` classes available in Tailwind (they're standard), but map them to our sizes:
- `text-xl` → 18px (our lg)
- `text-2xl` → 20px (our xl)

### Phase 2: Update Typography Config

**File**: `frontend/src/config/visual-effects.ts`

Update `typography.fontSize` mapping:

```typescript
fontSize: {
  // Core sizes (4-step scale)
  sm: "text-sm",      // 14px - Labels, metadata, captions
  base: "text-base",  // 14px - Body text, content, paragraphs (NORMAL SIZE)
  lg: "text-xl",      // 18px - Card titles, subheadings, section headings
  xl: "text-2xl",     // 20px - Page titles, major headings
  
  // Legacy mappings (for backward compatibility during migration)
  xs: "text-sm",      // 14px (maps to sm)
  md: "text-xl",      // 18px (maps to lg)
  
  // Legacy numeric mapping
  "1": "text-sm",     // 14px
  "2": "text-sm",     // 14px
    "3": "text-base",   // 14px
  "4": "text-xl",     // 18px (maps to lg)
  "5": "text-2xl",    // 20px (maps to xl)
  "6": "text-2xl",    // 20px (maps to xl)
  // All larger sizes map to xl
  "7": "text-2xl",
  "8": "text-2xl",
  "9": "text-2xl",
  "10": "text-2xl",
  "11": "text-2xl",
  "12": "text-2xl",
  
  // Legacy aliases
  "2xl": "text-2xl",  // 20px
  "3xl": "text-2xl",  // 20px
  "4xl": "text-2xl",  // 20px
  "5xl": "text-2xl",  // 20px
  "6xl": "text-2xl",  // 20px
  "7xl": "text-2xl",  // 20px
  "8xl": "text-2xl",  // 20px
},
```

### Phase 3: Audit and Fix Content Text

**Priority: HIGH**

Find and fix all places where content text uses wrong sizes, and ensure pages use appropriate number of sizes (2-4 max):

#### 3.1 Search for Content Text Using Wrong Sizes

**Target Patterns to Find:**
- `text-lg` used in content areas (should be `text-base`)
- `text-xl` used in content areas (should be `text-base`)
- `text-2xl` used in content areas (should be `text-base`)
- Any size larger than `text-base` used for paragraphs, descriptions, body text
- Pages using more than 4 different font sizes (reduce to 2-4)
- Pages that could use fewer sizes (simplify when possible)

**Files to Audit:**
- All card components (ResultCard, SummaryCard, etc.) - aim for 2-3 sizes
- All page components (content areas) - aim for 2-4 sizes based on complexity
- Dialog/Modal components - aim for 2-3 sizes
- Form components (descriptions, helper text) - aim for 2-3 sizes
- Markdown renderers - aim for 2-3 sizes
- Summary/content display components - aim for 2-3 sizes
- Dashboard components - may need 4 sizes (if complex)
- Task components (descriptions, content) - aim for 2-3 sizes

#### 3.2 Count Sizes Per Component

For each component/page, count the number of unique font sizes used:
- If > 4 sizes: Reduce to 2-4 sizes
- If 4 sizes: Consider if 3 sizes would work
- If 3 sizes: Good (optimal for most cases)
- If 2 sizes: Good (ideal for simple pages)

#### 3.2 Common Fixes

**Before (WRONG):**
```tsx
<p className="text-lg">Description text...</p>
<div className="text-xl">Content text...</div>
<span className={typography.fontSize.md}>Body text...</span>
```

**After (CORRECT):**
```tsx
<p className="text-base">Description text...</p>
<div className="text-base">Content text...</div>
<span className={typography.fontSize.base}>Body text...</span>
```

### Phase 4: Update Prose/Markdown Styling

**Files to Check:**
- Any components using `@tailwindcss/typography` plugin
- Markdown renderer components
- Content display components

**Ensure:**
- Prose classes use `text-base` for body text
- No custom font size overrides for content
- Headers in prose can be larger, but body text is `text-base` (14px)

**Example Fix:**
```tsx
// If using prose plugin
<article className="prose prose-base max-w-none">
  {/* Body text will be 14px by default */}
</article>

// If not using prose, ensure explicit class
<div className="text-base">
  {/* Content text */}
</div>
```

### Phase 5: Update Component-Specific Sizes

#### 5.1 Card Components

**ResultCard, SummaryCard, etc.:**
- **Title**: `text-xl` (18px) - OK, headers can be larger
- **Description/Content**: `text-base` (14px) - MUST be normal size
- **Metadata**: `text-sm` (14px) - OK for secondary text

#### 5.2 Form Components

**Input, Textarea, Select:**
- **Input text**: `text-base` (14px) - MUST be normal size
- **Label**: `text-sm` (14px) - OK for labels
- **Helper text**: `text-sm` (14px) - OK for secondary text
- **Error message**: `text-sm` (14px) - OK for secondary text

#### 5.3 Dialog/Modal Components

- **Title**: `text-xl` (18px) or `text-2xl` (20px) - OK for headers
- **Content**: `text-base` (14px) - MUST be normal size
- **Button text**: `text-base` (14px) - OK

#### 5.4 Page Components

- **Page title**: `text-2xl` (20px) - OK for headers
- **Section heading**: `text-xl` (18px) - OK for headers
- **Body content**: `text-base` (14px) - MUST be normal size
- **Metadata/info**: `text-sm` (14px) - OK for secondary text

### Phase 6: CSS Global Styles Check

**File**: `frontend/src/app/globals.css` or similar

Check for:
- Global font size overrides
- Body font size (should be 16px)
- Prose/typography plugin customizations
- Any CSS that sets font-size larger than 14px for content

**Ensure:**
```css
body {
  font-size: 14px; /* Normal size */
}

/* No overrides for content text */
```

---

## Migration Strategy

### Step 1: Update Configuration Files
1. Update `tailwind.config.ts` font sizes
2. Update `visual-effects.ts` typography config
3. Test that changes compile

### Step 2: Find All Violations
1. Search codebase for `text-lg` usage in content areas
2. Search for `text-xl` usage in content areas
3. Search for `text-2xl` usage in content areas (except headers)
4. Create a list of files to fix

### Step 3: Fix Content Text (Priority Order)
1. **High Priority**: Card content, modal content, form content
2. **Medium Priority**: Page content, dashboard content
3. **Low Priority**: Secondary/helper text (already using sm)

### Step 4: Fix Headers (If Needed)
1. Ensure headers use appropriate sizes (`text-xl` or `text-2xl`)
2. Verify headers are visually distinct from content
3. Use font weight for emphasis, not size

### Step 5: Testing
1. Visual review of all pages
2. Check content text is 14px (normal size)
3. Check headers are appropriately sized
4. Verify consistency across components
5. Test responsive behavior

---

## Testing Checklist

### Visual Consistency
- [ ] All content text uses `text-base` (14px)
- [ ] All headers use `text-xl` (18px) or `text-2xl` (20px)
- [ ] All labels/metadata use `text-sm` (14px) (when used)
- [ ] No content text uses sizes larger than `text-base`
- [ ] Size hierarchy is clear: headers > content > metadata
- [ ] Each page/component uses 2-4 font sizes maximum
- [ ] Simple pages use 2 sizes, medium pages use 3 sizes, complex pages use 4 sizes

### Component Audit
- [ ] Card components: content uses `text-base`, titles use `text-xl` (2-3 sizes max)
- [ ] Form components: input text uses `text-base`, labels use `text-sm` (2-3 sizes max)
- [ ] Dialog/Modal: content uses `text-base`, title uses `text-xl`/`text-2xl` (2-3 sizes max)
- [ ] Page components: body uses `text-base`, headings use `text-xl`/`text-2xl` (2-4 sizes max)
- [ ] Markdown/content: body uses `text-base`, headers can be larger (2-3 sizes max)
- [ ] No component uses more than 4 different font sizes
- [ ] Simple components use 2 sizes when possible

### Code Quality
- [ ] No hardcoded font sizes in content areas
- [ ] Consistent use of typography config
- [ ] No conflicting size classes
- [ ] Tailwind config matches visual-effects config
- [ ] Size count per component documented/commented if using 4 sizes

### Browser Testing
- [ ] Test in Chrome/Edge
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Verify font sizes render correctly
- [ ] Check line heights are appropriate

---

## Design Principles

### 1. Normal Content Text is 14px

**Rule**: All regular reading content must use `text-base` (14px).
- This is the standard web body text size
- No exceptions for "emphasized" content text
- Use font weight (bold) for emphasis, not size

### 2. Headers Can Be Larger

**Rule**: Headers can use `text-xl` (18px) or `text-2xl` (20px).
- Page titles: `text-2xl` (20px)
- Section headings: `text-xl` (18px)
- Card titles: `text-xl` (18px)
- Use font weight (bold/semibold) for hierarchy

### 3. Use One Size for Simple Components

**Rule**: Simple components (alerts, banners, buttons, cards) should use ONE font size (`text-base`).
- All text in alert/banner: `text-base` (14px)
- All button text: `text-base` (14px)
- All text in simple cards: `text-base` (14px)
- Use font weight (bold/semibold) for emphasis, NOT different sizes
- Avoid `text-sm` and `text-xs` - they create unnecessary complexity

### 4. Minimize Variations (1-4 Sizes Max, Prefer 1-2)

**Rule**: Use 1-4 font sizes maximum per page/component, but prefer 1 size for simple components.
- **Simple components**: 1 size (`base` for everything) - PREFERRED
- **Simple pages**: 1-2 sizes (`base` + optional header size)
- **Medium pages**: 2-3 sizes (`base` + optional header + rarely `sm` for essential metadata)
- **Complex pages**: 3-4 sizes - use sparingly
- **Always**: `base` (14px) for all content text, descriptions, buttons, alerts
- **Default**: Use `text-base` for labels, metadata, captions - don't default to `text-sm`
- **Optional**: `xl` (18px) for headers/titles only when needed
- **Optional**: `2xl` (20px) for major headers only (rare)
- **Avoid**: `sm` (14px) unless truly necessary
- No intermediate sizes
- **Prefer 1 size over 2, prefer 2 over 3, prefer 3 over 4**

### 5. Use Weight, Not Size, for Emphasis

**Rule**: Emphasize content text with font weight, not font size.
- Normal: `font-normal` (400)
- Emphasized: `font-semibold` (600) or `font-bold` (700)
- Keep size at `text-base` (14px)

---

## Expected Outcomes

### Before
- Content text uses `text-lg` (17px), `text-xl` (19px), or inconsistent sizes
- Too many size variations (6+ sizes available, many used inconsistently)
- Simple components like alerts use 2-3 sizes unnecessarily (`text-sm`, `text-xs`)
- Unclear what "normal" size is
- Visual inconsistency across components
- Over-complicated appearance with unnecessary size variations

### After
- All content text uses `text-base` (14px) - standard normal size
- Simple components (alerts, banners, buttons) use ONLY `text-base` (1 size)
- Each page/component uses 1-4 font sizes maximum, but prefer 1-2
- Simple components: 1 size (`base` for everything) - PREFERRED
- Simple pages: 1-2 sizes (base + optional header)
- Medium pages: 2-3 sizes (base + header + rarely sm for essential metadata)
- Complex pages: 3-4 sizes - rare, only when needed
- Clear hierarchy through font weight, not size variations
- Clean, uncomplicated appearance
- Consistent appearance across all components
- Professional, refined typography with minimal size variations

---

## Implementation Order

1. **Phase 1**: Update Tailwind config and typography config (foundation)
2. **Phase 2**: Audit codebase for violations (identify all issues)
3. **Phase 3**: Fix high-priority content text (cards, forms, modals)
4. **Phase 4**: Fix medium-priority content text (pages, dashboards)
5. **Phase 5**: Verify headers are appropriate sizes
6. **Phase 6**: Test and refine

---

## Notes

- **14px is Standard**: 14px is the standard normal web body text size. This is what users expect for "normal" text.
- **Content vs Headers**: The key distinction is content text (paragraphs, descriptions) vs headers (titles, headings). Content must be normal size.
- **Legacy Support**: Typography config maintains legacy mappings during migration, but new code should use the 4-step scale.
- **Prose Plugin**: If using `@tailwindcss/typography`, ensure it respects `text-base` for body text.
- **Responsive**: No responsive font size changes needed - same sizes work across all screen sizes.

