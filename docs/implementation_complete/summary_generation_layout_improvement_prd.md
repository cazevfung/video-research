# PRD: Summary Generation Layout Improvement

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | January 2026 |
| **Priority** | High |
| **Estimated Effort** | 3-5 days |
| **Related Documents** | 
| - `streaming_ui_fixes_prd.md`
| - `frontend_prd.md`
| - `ui_fixes_prd.md`

---

## 1. Executive Summary

### 1.1 Overview

This PRD addresses layout and visual design issues during the summary generation phase. The current split-screen layout (processing overlay on left, result card on right) feels unbalanced and creates visual hierarchy problems. This document outlines improvements to create a more cohesive, polished, and user-friendly experience during active summary generation.

### 1.2 Goals

- **Primary Goal:** Improve visual balance and hierarchy during summary generation
- **Secondary Goal:** Create smoother transitions between processing and streaming states
- **Tertiary Goal:** Enhance mobile responsiveness and layout consistency
- **UX Goal:** Make the dual-panel layout feel intentional and polished rather than awkward

### 1.3 Success Criteria

- ✅ Layout feels balanced and intentional (not like two separate components)
- ✅ Visual hierarchy clearly guides user attention to the summary content
- ✅ Processing overlay is informative but not distracting
- ✅ Smooth, polished transitions between states
- ✅ Mobile layout is optimized and feels natural
- ✅ No visual awkwardness or "off" feeling
- ✅ Consistent spacing and alignment throughout

---

## 2. Current State Analysis

### 2.1 Current Layout Structure

#### Desktop Layout (>1024px)
- **Processing Overlay:** 30% width, fixed to left side
- **Result Card:** 70% width, positioned on right side
- Both visible simultaneously during streaming phase
- Processing overlay uses `fixed` positioning with backdrop blur

#### Mobile Layout (<1024px)
- **Processing Overlay:** 20vh height, positioned at top
- **Result Card:** 80vh height, positioned below overlay
- Overlay shrinks when streaming begins

### 2.2 Identified Issues

#### Visual Balance Problems
1. **Unbalanced Proportions**
   - 30/70 split feels lopsided
   - Processing overlay (30%) may be too narrow or too wide
   - Result card (70%) might feel cramped or too wide
   - No clear visual relationship between the two panels

2. **Lack of Visual Connection**
   - Two panels feel disconnected
   - No shared visual elements (borders, backgrounds, spacing)
   - Processing overlay feels like a separate overlay, not part of the layout
   - Missing visual flow between processing status and result content

3. **Inconsistent Spacing**
   - Gap between panels may be too large or too small
   - Padding within panels may not align
   - No consistent vertical rhythm

#### Hierarchy Issues
4. **Unclear Focus**
   - User attention split between processing status and summary
   - Processing overlay might be too prominent during streaming
   - Result card might not feel like the primary content
   - Status information competes with summary content

5. **Processing Overlay Prominence**
   - During streaming, processing overlay should be secondary
   - Current implementation may make it too prominent
   - Animation and visual weight might distract from summary

#### Layout Structure Issues
6. **Fixed Positioning Problems**
   - Processing overlay uses `fixed` positioning
   - May not align properly with result card
   - Can cause scrolling issues
   - Doesn't feel integrated with page flow

7. **Mobile Layout Concerns**
   - 20vh for processing overlay may be too small or too large
   - Vertical stacking might feel cramped
   - Transition from full-screen to split might be jarring

#### Visual Design Issues
8. **Missing Visual Polish**
   - No shared border or divider between panels
   - Background colors might not complement each other
   - No subtle visual connection (e.g., shared shadow, border)
   - Typography sizes might not create proper hierarchy

9. **Animation and Transition Issues**
   - Transition from full-screen to split might be abrupt
   - No easing or smooth animation between states
   - Processing overlay shrink animation might feel mechanical

---

## 3. User Experience Goals

### 3.1 Primary User Goals During Summary Generation

1. **Monitor Progress** - Users want to see that processing is happening
2. **Read Summary** - Users want to read the streaming summary as it appears
3. **Understand Status** - Users want to know what stage of processing is active
4. **Feel Confident** - Users want to feel the system is working correctly

### 3.2 Design Principles

1. **Content First** - The summary content should be the primary focus
2. **Status Secondary** - Processing status should be visible but not distracting
3. **Visual Harmony** - Both panels should feel like part of a cohesive design
4. **Clear Hierarchy** - User attention should naturally flow to the summary
5. **Smooth Transitions** - State changes should feel polished and intentional

---

## 4. Proposed Solutions

### 4.1 Layout Restructuring

#### Option A: Refined Split Layout (Recommended)
- **Desktop:** Adjust proportions to 25% processing / 75% result
- **Shared Container:** Both panels in a single flex container
- **Visual Connection:** Shared border, shadow, or background treatment
- **Alignment:** Consistent vertical alignment and spacing

**Benefits:**
- Better visual balance (25/75 feels more natural)
- Result card gets more space for content
- Processing overlay is appropriately sized for status display
- Single container creates visual unity

#### Option B: Sidebar Layout
- **Desktop:** Processing overlay becomes a true sidebar (fixed width ~280px)
- **Result Card:** Takes remaining space (flex-1)
- **Visual Treatment:** Sidebar has distinct background, subtle border
- **Collapsible:** Option to minimize sidebar to icon-only

**Benefits:**
- Clear sidebar pattern (familiar UX)
- Processing status always visible
- More space for summary content
- Can be collapsed if desired

#### Option C: Integrated Header Layout
- **Desktop:** Processing status moves to a compact header above result card
- **Result Card:** Full width below status header
- **Status Display:** Compact progress bar, status text, and animation
- **Visual Treatment:** Status header is part of result card

**Benefits:**
- Maximum space for summary content
- Status always visible but not competing
- Single unified card design
- Cleaner, simpler layout

**Recommendation:** Option A (Refined Split Layout) - Best balance of visibility and space

### 4.2 Visual Design Improvements

#### Shared Visual Elements
1. **Unified Container**
   - Single parent container for both panels
   - Shared background or border treatment
   - Consistent padding and spacing
   - Subtle shadow or elevation

2. **Visual Divider**
   - Subtle border or divider between panels
   - Use theme border color
   - Optional: subtle gradient or fade effect
   - Responsive: hidden on mobile if stacked

3. **Consistent Spacing**
   - Aligned padding within both panels
   - Consistent gap between panels (desktop)
   - Vertical rhythm matches page spacing
   - Responsive spacing adjustments

#### Processing Overlay Refinement
4. **Reduced Visual Weight**
   - Lighter background (more transparent)
   - Smaller animation size during streaming
   - Reduced padding/margins
   - Subtle, non-distracting animations

5. **Compact Status Display**
   - Smaller status text
   - More compact progress bar
   - Condensed animation area
   - Essential information only

6. **Better Typography Hierarchy**
   - Smaller font sizes for status text
   - Clearer distinction between status and content
   - Consistent with overall design system

#### Result Card Enhancement
7. **Primary Focus Treatment**
   - Slightly elevated appearance (shadow, border)
   - More prominent background
   - Clear content area boundaries
   - Better spacing for readability

8. **Streaming Indicators**
   - Subtle streaming indicator (not competing with overlay)
   - Clear visual feedback when content is streaming
   - Smooth text appearance animations

### 4.3 Transition Improvements

#### State Transitions
1. **Smooth Shrink Animation**
   - Processing overlay smoothly transitions from full-screen to sidebar
   - Use easing functions (ease-in-out)
   - Duration: 500-600ms
   - Scale and position animations synchronized

2. **Result Card Entrance**
   - Result card slides in from right (desktop) or bottom (mobile)
   - Fade in with slight scale animation
   - Duration: 400-500ms
   - Staggered with overlay shrink

3. **Completion Transition**
   - Processing overlay fades out smoothly
   - Result card expands slightly (breathing animation)
   - Success indicator appears
   - Duration: 300-400ms

### 4.4 Mobile Layout Optimization

#### Responsive Adjustments
1. **Vertical Stacking**
   - Processing overlay: 15-18vh (reduced from 20vh)
   - Result card: Remaining space with proper padding
   - Smooth transition between states
   - No awkward gaps or overlaps

2. **Compact Status Display**
   - Smaller animation size
   - Condensed text and progress bar
   - Essential information only
   - Horizontal layout for status elements

3. **Touch-Friendly Spacing**
   - Adequate padding for touch targets
   - No cramped feeling
   - Comfortable reading area for summary

---

## 5. Detailed Specifications

### 5.1 Desktop Layout (>1024px)

#### Container Structure
```tsx
<div className="flex flex-row gap-4 h-[calc(100vh-header-height)]">
  {/* Processing Overlay - 25% width */}
  <ProcessingOverlay className="w-[25%] min-w-[280px] max-w-[320px]" />
  
  {/* Result Card - 75% width */}
  <ResultCard className="flex-1 min-w-0" />
</div>
```

#### Processing Overlay Specifications
- **Width:** 25% of container (min: 280px, max: 320px)
- **Background:** `bg-theme-bg-card` with 80% opacity
- **Border:** Right border `border-theme-border-primary`
- **Padding:** `p-4 md:p-6`
- **Animation Area:** Reduced to 60% of current size
- **Status Text:** Smaller font size (`text-sm`)
- **Progress Bar:** Compact version

#### Result Card Specifications
- **Width:** 75% of container (flex-1)
- **Background:** `bg-theme-bg-card`
- **Border:** Full border `border-theme-border-primary`
- **Padding:** `p-6 md:p-8`
- **Shadow:** Subtle elevation shadow
- **Max Height:** `max-h-[calc(100vh-header-height-2rem)]`
- **Overflow:** `overflow-y-auto` for long content

#### Visual Connection
- **Shared Container:** `bg-theme-bg` with subtle border
- **Divider:** Vertical line between panels (1px, theme border color)
- **Spacing:** 16px gap between panels
- **Alignment:** Both panels top-aligned, same height

### 5.2 Mobile Layout (<1024px)

#### Container Structure
```tsx
<div className="flex flex-col h-[calc(100vh-header-height)]">
  {/* Processing Overlay - 15-18vh */}
  <ProcessingOverlay className="h-[18vh] min-h-[120px]" />
  
  {/* Result Card - Remaining space */}
  <ResultCard className="flex-1 min-h-0 overflow-y-auto" />
</div>
```

#### Processing Overlay Specifications
- **Height:** 18vh (min: 120px, max: 160px)
- **Background:** `bg-theme-bg-card` with 90% opacity
- **Border:** Bottom border `border-theme-border-primary`
- **Padding:** `p-3 md:p-4`
- **Layout:** Horizontal layout for status elements
- **Animation:** Smaller size (40% of desktop)

#### Result Card Specifications
- **Height:** Remaining space (flex-1)
- **Background:** `bg-theme-bg-card`
- **Padding:** `p-4 md:p-6`
- **Overflow:** Vertical scroll for content
- **Spacing:** Proper margin from overlay

### 5.3 Animation Specifications

#### Processing Overlay Shrink
```tsx
<motion.div
  animate={{
    width: isStreaming ? "25%" : "100%",
    scale: isStreaming ? 0.9 : 1,
  }}
  transition={{
    duration: 0.6,
    ease: "easeInOut",
  }}
/>
```

#### Result Card Entrance
```tsx
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{
    duration: 0.5,
    ease: "easeOut",
    delay: 0.1,
  }}
/>
```

#### Completion Animation
```tsx
<motion.div
  animate={{
    opacity: isCompleted ? 0 : 1,
    scale: isCompleted ? 0.95 : 1,
  }}
  transition={{
    duration: 0.4,
    ease: "easeInOut",
  }}
/>
```

### 5.4 Visual Design Details

#### Color Scheme
- **Container Background:** `bg-theme-bg` (page background)
- **Panel Backgrounds:** `bg-theme-bg-card` (consistent card background)
- **Borders:** `border-theme-border-primary` (subtle, theme-aware)
- **Text:** Theme text colors (primary for content, secondary for status)

#### Typography
- **Status Text:** `text-sm` (14px) - Secondary text color
- **Progress Label:** `text-xs` (12px) - Tertiary text color
- **Summary Content:** `text-base` (16px) - Primary text color
- **Summary Headers:** `text-xl` to `text-2xl` - Primary text color

#### Spacing
- **Container Padding:** `p-4 md:p-6 lg:p-8`
- **Panel Gap:** `gap-4` (16px) on desktop, `gap-2` (8px) on mobile
- **Internal Padding:** `p-4 md:p-6` for processing overlay, `p-6 md:p-8` for result card
- **Vertical Rhythm:** Consistent `space-y-4` or `space-y-6`

#### Shadows and Elevation
- **Container:** Subtle shadow `shadow-sm` or `shadow-md`
- **Result Card:** Slightly elevated `shadow-md`
- **Processing Overlay:** Minimal or no shadow (secondary element)

---

## 6. Implementation Plan

### 6.1 Phase 1: Layout Restructuring

#### Tasks
1. **Create Unified Container**
   - [ ] Add flex container wrapper in `page.tsx`
   - [ ] Set up responsive flex direction (row desktop, column mobile)
   - [ ] Configure proper height constraints
   - [ ] Add consistent spacing and padding

2. **Adjust Processing Overlay**
   - [ ] Change width from 30% to 25% (desktop)
   - [ ] Add min/max width constraints
   - [ ] Update height from 20vh to 18vh (mobile)
   - [ ] Remove fixed positioning, use flex layout
   - [ ] Add right border (desktop) or bottom border (mobile)

3. **Adjust Result Card**
   - [ ] Change width to flex-1 (75% on desktop)
   - [ ] Remove fixed positioning
   - [ ] Add proper flex constraints
   - [ ] Update max-height calculations
   - [ ] Ensure proper overflow handling

4. **Add Visual Connection**
   - [ ] Add shared container background/border
   - [ ] Add divider between panels (desktop)
   - [ ] Ensure consistent spacing
   - [ ] Add subtle shadow/elevation

**Files to Modify:**
- `frontend/src/app/app/page.tsx`
- `frontend/src/components/dashboard/ProcessingOverlay.tsx`
- `frontend/src/components/dashboard/ResultCard.tsx`
- `frontend/src/config/visual-effects.ts` (layout config)

### 6.2 Phase 2: Visual Refinement

#### Tasks
1. **Reduce Processing Overlay Visual Weight**
   - [ ] Reduce animation size during streaming
   - [ ] Make background more transparent
   - [ ] Reduce padding/margins
   - [ ] Use smaller font sizes for status text
   - [ ] Create compact progress bar variant

2. **Enhance Result Card**
   - [ ] Add subtle elevation (shadow)
   - [ ] Improve content spacing
   - [ ] Ensure proper typography hierarchy
   - [ ] Add streaming indicators

3. **Typography and Spacing**
   - [ ] Update status text sizes
   - [ ] Ensure consistent spacing throughout
   - [ ] Align vertical rhythm
   - [ ] Test readability in both themes

**Files to Modify:**
- `frontend/src/components/dashboard/ProcessingOverlay.tsx`
- `frontend/src/components/dashboard/ResultCard.tsx`
- `frontend/src/components/dashboard/StatusMessage.tsx`
- `frontend/src/components/dashboard/ProgressBar.tsx`
- `frontend/src/components/dashboard/WhimsicalLoader.tsx`

### 6.3 Phase 3: Animation Improvements

#### Tasks
1. **Smooth State Transitions**
   - [ ] Update overlay shrink animation
   - [ ] Add result card entrance animation
   - [ ] Synchronize timing between animations
   - [ ] Use proper easing functions
   - [ ] Test transition smoothness

2. **Completion Animation**
   - [ ] Refine overlay fade-out
   - [ ] Add result card completion pulse
   - [ ] Ensure smooth state changes
   - [ ] Test edge cases (rapid completion)

**Files to Modify:**
- `frontend/src/components/dashboard/ProcessingOverlay.tsx`
- `frontend/src/app/app/page.tsx`
- `frontend/src/config/visual-effects.ts` (animation config)

### 6.4 Phase 4: Mobile Optimization

#### Tasks
1. **Mobile Layout Adjustments**
   - [ ] Test and refine vertical stacking
   - [ ] Adjust overlay height (18vh)
   - [ ] Ensure proper spacing on mobile
   - [ ] Test touch interactions
   - [ ] Verify scrolling behavior

2. **Compact Status Display**
   - [ ] Create mobile-specific status layout
   - [ ] Reduce animation size
   - [ ] Condense text and progress
   - [ ] Test readability

**Files to Modify:**
- `frontend/src/components/dashboard/ProcessingOverlay.tsx`
- `frontend/src/components/dashboard/StatusMessage.tsx`
- `frontend/src/components/dashboard/ProgressBar.tsx`

### 6.5 Phase 5: Testing and Refinement

#### Tasks
1. **Visual Testing**
   - [ ] Test in light and dark themes
   - [ ] Verify spacing and alignment
   - [ ] Check typography hierarchy
   - [ ] Test at various screen sizes
   - [ ] Verify smooth transitions

2. **Functional Testing**
   - [ ] Test state transitions
   - [ ] Verify scrolling behavior
   - [ ] Test with various content lengths
   - [ ] Test edge cases (rapid completion, errors)
   - [ ] Verify responsive behavior

3. **User Testing**
   - [ ] Gather feedback on layout balance
   - [ ] Verify visual hierarchy is clear
   - [ ] Test user attention flow
   - [ ] Check for any "off" feeling

---

## 7. Configuration Updates

### 7.1 Layout Config Updates

Update `frontend/src/config/visual-effects.ts`:

```typescript
export const layoutConfig = {
  // ... existing config ...
  
  // Processing overlay when streaming
  overlayStreaming: {
    desktop: {
      width: "25%", // Changed from 30%
      minWidth: "280px",
      maxWidth: "320px",
    },
    mobile: {
      height: "18vh", // Changed from 20vh
      minHeight: "120px",
      maxHeight: "160px",
    },
  },
  
  // Result card when streaming
  resultCardStreaming: {
    desktop: {
      width: "75%", // Changed from 70%, now flex-1
    },
    mobile: {
      height: "82vh", // Adjusted for 18vh overlay
    },
  },
  
  // Container spacing
  streamingContainer: {
    gap: {
      desktop: "16px", // gap-4
      mobile: "8px",   // gap-2
    },
    padding: {
      desktop: "p-6 lg:p-8",
      mobile: "p-4",
    },
  },
} as const;
```

### 7.2 Animation Config Updates

```typescript
export const animationDurations = {
  // ... existing config ...
  
  overlayShrink: 0.6, // 600ms, changed from current
  resultCardEntrance: 0.5, // 500ms
  resultCardEntranceDelay: 0.1, // 100ms delay
  completionFadeOut: 0.4, // 400ms
} as const;
```

---

## 8. Success Metrics

### 8.1 Visual Quality Metrics
- ✅ Layout feels balanced (not lopsided)
- ✅ Visual hierarchy is clear (summary is primary focus)
- ✅ Processing overlay is informative but not distracting
- ✅ Both panels feel like part of unified design
- ✅ No "off" or awkward feeling

### 8.2 Technical Quality Metrics
- ✅ Smooth transitions between states (< 600ms, no jank)
- ✅ Proper responsive behavior at all breakpoints
- ✅ Consistent spacing and alignment
- ✅ No layout shifts or jumps
- ✅ Proper overflow handling

### 8.3 User Experience Metrics
- ✅ Users can easily read summary while monitoring progress
- ✅ Processing status is visible but not distracting
- ✅ Layout feels intentional and polished
- ✅ Mobile experience is comfortable and usable
- ✅ No confusion about where to focus attention

---

## 9. Edge Cases and Considerations

### 9.1 Edge Cases

1. **Very Long Summaries**
   - Result card should scroll properly
   - Processing overlay should remain visible
   - No layout breaking

2. **Rapid State Changes**
   - Smooth transitions even with rapid changes
   - No animation conflicts
   - Proper state cleanup

3. **Window Resize**
   - Layout adapts smoothly
   - No layout jumps
   - Proper responsive breakpoints

4. **Theme Switching**
   - Colors update correctly
   - No flash of incorrect colors
   - Smooth theme transitions

5. **Error States**
   - Error display doesn't break layout
   - Processing overlay handles errors gracefully
   - Result card shows error state properly

### 9.2 Accessibility Considerations

1. **Screen Readers**
   - Proper ARIA labels for both panels
   - Status updates announced
   - Content structure is clear

2. **Keyboard Navigation**
   - Focus management during transitions
   - Tab order is logical
   - Keyboard shortcuts still work

3. **Reduced Motion**
   - Respect `prefers-reduced-motion`
   - Provide static alternatives
   - Essential information still visible

### 9.3 Performance Considerations

1. **Animation Performance**
   - Use CSS transforms (not layout properties)
   - Avoid repaints/reflows
   - Use `will-change` sparingly

2. **Rendering Performance**
   - Virtual scrolling for long summaries (future)
   - Efficient re-renders
   - Proper memoization

---

## 10. Future Enhancements

### 10.1 Potential Improvements

1. **Collapsible Processing Overlay**
   - Option to minimize to icon-only
   - Expand on hover or click
   - Saves more space for summary

2. **Progress Visualization**
   - More detailed progress breakdown
   - Per-video progress indicators
   - Estimated time remaining

3. **Summary Preview**
   - Preview of summary structure
   - Section headings visible early
   - Jump to sections

4. **Customizable Layout**
   - User preference for panel sizes
   - Remember layout preference
   - Multiple layout options

---

## 11. Testing Checklist

### 11.1 Visual Testing

- [ ] **Desktop Layout (>1024px)**
  - [ ] 25/75 split looks balanced
  - [ ] Processing overlay is appropriately sized
  - [ ] Result card has adequate space
  - [ ] Visual connection between panels is clear
  - [ ] Spacing and alignment are consistent
  - [ ] Borders and dividers are subtle but visible

- [ ] **Mobile Layout (<1024px)**
  - [ ] Vertical stacking works well
  - [ ] Processing overlay height is appropriate
  - [ ] Result card has adequate space
  - [ ] No cramped feeling
  - [ ] Touch targets are accessible
  - [ ] Scrolling works properly

- [ ] **Theme Testing**
  - [ ] Light mode looks good
  - [ ] Dark mode looks good
  - [ ] Colors are consistent
  - [ ] Contrast is adequate
  - [ ] Borders are visible in both themes

### 11.2 Animation Testing

- [ ] **State Transitions**
  - [ ] Processing to streaming transition is smooth
  - [ ] Overlay shrink animation is polished
  - [ ] Result card entrance is smooth
  - [ ] Completion animation works well
  - [ ] No jank or stuttering
  - [ ] Timing feels natural

- [ ] **Edge Cases**
  - [ ] Rapid state changes handled gracefully
  - [ ] Window resize during animation
  - [ ] Theme switch during animation
  - [ ] Error during transition

### 11.3 Functional Testing

- [ ] **Layout Behavior**
  - [ ] Proper height constraints
  - [ ] Overflow handling works
  - [ ] Scrolling is smooth
  - [ ] No layout shifts
  - [ ] Responsive breakpoints work

- [ ] **Content Display**
  - [ ] Long summaries scroll properly
  - [ ] Markdown renders correctly
  - [ ] Streaming text appears smoothly
  - [ ] Action buttons are accessible

### 11.4 Accessibility Testing

- [ ] **Screen Readers**
  - [ ] Status updates are announced
  - [ ] Content structure is clear
  - [ ] ARIA labels are correct

- [ ] **Keyboard Navigation**
  - [ ] Tab order is logical
  - [ ] Focus management works
  - [ ] Keyboard shortcuts function

- [ ] **Reduced Motion**
  - [ ] Respects user preference
  - [ ] Essential information visible
  - [ ] No motion-dependent interactions

---

## 12. Rollback Plan

If issues arise during implementation:

1. **Revert Layout Changes**
   - Restore original 30/70 split
   - Restore fixed positioning
   - Revert container structure

2. **Revert Visual Changes**
   - Restore original overlay styling
   - Restore original result card styling
   - Revert spacing changes

3. **Revert Animation Changes**
   - Restore original transition timings
   - Revert animation implementations
   - Restore original state handling

**Note:** All changes should be made incrementally with commits, allowing for easy rollback of specific changes if needed.

---

## 13. Related Documentation

- `streaming_ui_fixes_prd.md` - Previous streaming UI improvements
- `frontend_prd.md` - Original frontend design specifications
- `ui_fixes_prd.md` - General UI fixes and improvements
- `visual-effects.ts` - Configuration file for layout and animations

---

**End of Document**


