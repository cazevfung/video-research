# Light Mode Color Refinement PRD

## Document Information
- **Version:** 1.0
- **Date:** January 2026
- **Status:** Draft
- **Priority:** Medium
- **Related Documents:**
  - `style_update_prd.md`
  - `ui_consistency_and_ux_fixes_implementation_plan.md`

---

## Table of Contents
1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Goals & Objectives](#goals--objectives)
4. [Proposed Color Refinements](#proposed-color-refinements)
5. [Implementation Plan](#implementation-plan)
6. [Success Criteria](#success-criteria)

---

## 1. Overview

This PRD outlines improvements to the light mode color palette to create a more refined, modern, and visually appealing user experience. The current light mode uses warm beige tones that, while functional, can be enhanced for better contrast, readability, and aesthetic appeal.

### Scope
- Refine base color palette (backgrounds, foregrounds, cards)
- Improve contrast ratios for better accessibility
- Enhance visual hierarchy through subtle color adjustments
- Maintain design system consistency with existing dark mode

### Out of Scope
- Complete color system redesign
- Dark mode changes
- Status color modifications
- Component-level styling changes

---

## 2. Current State Analysis

### Current Light Mode Colors

```css
/* Base Colors */
--color-theme-bg: #F7F7F4;           /* Off-white background */
--color-theme-fg: #26251E;           /* Dark brown foreground */
--color-theme-fg-02: #3B3A33;        /* Slightly lighter brown */
--color-theme-bg-card: #F2F1ED;      /* Card background */
--color-theme-bg-card-hover: #E8E7E2; /* Card hover state */
```

### Identified Issues

1. **Low Contrast**: The background (#F7F7F4) and card (#F2F1ED) are very similar, making card boundaries subtle
2. **Muted Appearance**: The beige tones can appear slightly washed out or dated
3. **Limited Visual Depth**: Insufficient contrast between background layers reduces visual hierarchy
4. **Card Distinction**: Cards blend too closely with the main background, reducing visual separation

### Strengths to Preserve

- Warm, approachable color tone
- Good text readability on light backgrounds
- Consistent use of color-mix() for derived colors
- Semantic color system structure

---

## 3. Goals & Objectives

### Primary Goals

1. **Enhanced Contrast**: Improve visual separation between background layers while maintaining readability
2. **Modern Aesthetic**: Refine colors to feel more contemporary and polished
3. **Better Hierarchy**: Strengthen visual hierarchy through improved color differentiation
4. **Accessibility**: Ensure WCAG AA contrast ratios are met or exceeded

### Design Principles

- Maintain warm, approachable tone
- Preserve existing color relationships (opacity-based system)
- Ensure smooth transition between light and dark modes
- Keep changes subtle and refined, not dramatic

---

## 4. Proposed Color Refinements

### Refined Base Color Palette

```css
/* Base Colors - Refined Light Mode */
--color-theme-bg: #FAFAF8;           /* Slightly brighter, cleaner white */
--color-theme-fg: #1F1E18;           /* Slightly darker, richer brown */
--color-theme-fg-02: #36352E;        /* Adjusted secondary foreground */
--color-theme-bg-card: #F5F4F0;      /* More distinct from background */
--color-theme-bg-card-hover: #EFEDE8; /* Clearer hover state */
```

### Color Rationale

#### Background (`--color-theme-bg`)
- **Current**: `#F7F7F4` (slightly beige)
- **Proposed**: `#FAFAF8` (cleaner, brighter white with subtle warmth)
- **Rationale**: Creates a fresher, more modern base while maintaining warmth

#### Foreground (`--color-theme-fg`)
- **Current**: `#26251E` (medium brown)
- **Proposed**: `#1F1E18` (richer, deeper brown)
- **Rationale**: Improves contrast and readability while maintaining the warm tone

#### Secondary Foreground (`--color-theme-fg-02`)
- **Current**: `#3B3A33` (lighter brown)
- **Proposed**: `#36352E` (slightly adjusted for better harmony)
- **Rationale**: Better balance with the refined primary foreground

#### Card Background (`--color-theme-bg-card`)
- **Current**: `#F2F1ED` (very similar to main background)
- **Proposed**: `#F5F4F0` (more distinct, cleaner)
- **Rationale**: Creates clearer visual separation while maintaining subtlety

#### Card Hover (`--color-theme-bg-card-hover`)
- **Current**: `#E8E7E2` (moderate contrast)
- **Proposed**: `#EFEDE8` (clearer hover feedback)
- **Rationale**: Provides more noticeable interactive feedback

### Contrast Improvements

| Element | Current Ratio | Proposed Ratio | Improvement |
|---------|---------------|----------------|-------------|
| Text on Background | ~15:1 | ~16:1 | Slight improvement |
| Card on Background | ~1.02:1 | ~1.05:1 | Better separation |
| Text on Card | ~15:1 | ~16:1 | Maintained |

### Visual Impact

- **Cards**: More clearly defined against the background
- **Text**: Slightly improved readability with richer foreground
- **Overall**: Cleaner, more modern appearance while preserving warmth
- **Hierarchy**: Better visual depth through improved contrast

---

## 5. Implementation Plan

### Phase 1: Color Variable Updates

**File**: `frontend/src/styles/variables.css`

Update the `:root` section (light mode) with refined color values:

```css
:root {
  /* Base Colors - Light Mode (Refined) */
  --color-theme-bg: #FAFAF8;
  --color-theme-fg: #1F1E18;
  --color-theme-fg-02: #36352E;
  --color-theme-bg-card: #F5F4F0;
  --color-theme-bg-card-hover: #EFEDE8;
  
  /* All other variables remain the same - they use color-mix() */
  /* and will automatically adjust based on the new base colors */
}
```

### Phase 2: Fallback Color Updates

Update the `@supports not (color-mix())` fallback section to match:

```css
@supports not (color: color-mix(in oklab, red, blue)) {
  :root {
    /* Update fallback colors to match new base */
    --color-theme-text-secondary: rgba(31, 30, 24, 0.6);
    --color-theme-text-tertiary: rgba(31, 30, 24, 0.4);
    --color-theme-text-quaternary: rgba(31, 30, 24, 0.2);
    --color-theme-bg-secondary: rgba(31, 30, 24, 0.08);
    --color-theme-bg-tertiary: rgba(31, 30, 24, 0.06);
    --color-theme-bg-quaternary: rgba(31, 30, 24, 0.025);
    --color-theme-border-strong: rgba(31, 30, 24, 0.8);
    --color-theme-border-primary: rgba(31, 30, 24, 0.12);
    --color-theme-border-secondary: rgba(31, 30, 24, 0.08);
    --color-theme-border-tertiary: rgba(31, 30, 24, 0.04);
    --color-theme-border-quaternary: rgba(31, 30, 24, 0.025);
  }
}
```

### Phase 3: Testing & Validation

1. **Visual Testing**
   - Review all pages in light mode
   - Check card visibility and separation
   - Verify text readability
   - Test hover states

2. **Accessibility Testing**
   - Verify WCAG AA contrast ratios
   - Test with screen readers
   - Check color-blind accessibility

3. **Cross-Browser Testing**
   - Test color-mix() support
   - Verify fallback colors
   - Check rendering consistency

4. **User Testing** (Optional)
   - Gather feedback on visual improvements
   - Compare before/after screenshots

### Implementation Checklist

- [ ] Update base colors in `variables.css`
- [ ] Update fallback colors for browsers without color-mix support
- [ ] Test all pages in light mode
- [ ] Verify contrast ratios meet WCAG AA
- [ ] Check card hover states
- [ ] Test on multiple browsers
- [ ] Review with design team (if applicable)
- [ ] Document changes in changelog

---

## 6. Success Criteria

### Visual Quality
- ✅ Cards are clearly distinguishable from the main background
- ✅ Overall appearance feels more modern and refined
- ✅ Warm, approachable tone is preserved
- ✅ Visual hierarchy is improved

### Technical Quality
- ✅ All color variables updated correctly
- ✅ Fallback colors work in older browsers
- ✅ No visual regressions introduced
- ✅ Color-mix() calculations work correctly

### Accessibility
- ✅ Text contrast ratios meet or exceed WCAG AA standards
- ✅ Interactive elements have clear hover states
- ✅ Color is not the only means of conveying information

### User Experience
- ✅ Interface feels more polished and professional
- ✅ Improved readability without being harsh
- ✅ Smooth transition between light and dark modes
- ✅ Consistent with overall design system

---

## 7. Notes & Considerations

### Color System Architecture
- The existing color system uses `color-mix()` to derive all secondary colors from base colors
- This means updating the base colors will automatically update all derived colors
- No changes needed to components or other CSS files

### Design Consistency
- These refinements maintain the existing warm, beige-toned aesthetic
- Changes are subtle and evolutionary, not revolutionary
- Dark mode remains unchanged

### Future Considerations
- Monitor user feedback after implementation
- Consider additional refinements based on usage patterns
- May want to create A/B test variants for user preference

### Rollback Plan
- Keep previous color values documented
- Simple revert by updating CSS variables
- No component changes required for rollback

---

## 8. Appendix

### Color Comparison Table

| Variable | Current | Proposed | Change |
|----------|---------|----------|--------|
| `--color-theme-bg` | `#F7F7F4` | `#FAFAF8` | Brighter, cleaner |
| `--color-theme-fg` | `#26251E` | `#1F1E18` | Richer, darker |
| `--color-theme-fg-02` | `#3B3A33` | `#36352E` | Slightly adjusted |
| `--color-theme-bg-card` | `#F2F1ED` | `#F5F4F0` | More distinct |
| `--color-theme-bg-card-hover` | `#E8E7E2` | `#EFEDE8` | Clearer feedback |

### Related Files
- `frontend/src/styles/variables.css` - Main color definitions
- `frontend/src/config/visual-effects.ts` - Color configuration references
- `docs/style_update_prd.md` - Original design system documentation

---

**End of Document**

