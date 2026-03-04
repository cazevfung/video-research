# Mermaid Chart Component Enhancement Checklist

## Overview
This checklist outlines enhancements for the Mermaid diagram component in `frontend/src/components/ui/Code.tsx` to improve font sizing, theme support, and user interaction.

---

## 1. Font Size Configuration (Non-Hardcoded)

### 1.1 Add Mermaid Configuration to visual-effects.ts
- [ ] Add `mermaid` section to `frontend/src/config/visual-effects.ts`
- [ ] Define font size configuration using `typography.fontSize.base` (14px - normal text size)
- [ ] Include font family configuration using `typography.fontFamily.sans`
- [ ] Add any additional Mermaid-specific styling options (e.g., node spacing, edge thickness)

### 1.2 Update Mermaid Initialize Function
- [ ] Import mermaid config from `visual-effects.ts` in `Code.tsx`
- [ ] Replace hardcoded `fontFamily: 'inherit'` with config-based value
- [ ] Add `fontSize` property to Mermaid `initialize()` config
- [ ] Ensure font size uses CSS units (e.g., `14px` or `0.875rem`) compatible with Mermaid's config API
- [ ] Apply font size to all text elements in diagrams (node labels, edge labels, table text, etc.)

### 1.3 Post-Render Font Size Adjustment
- [ ] After SVG is rendered, apply CSS styles to override any hardcoded font sizes in the SVG
- [ ] Use CSS selector targeting SVG text elements: `.mermaid-diagram svg text`
- [ ] Apply font size from config using CSS custom properties or inline styles
- [ ] Ensure table text within Mermaid diagrams uses the same font size as regular text

### 1.4 Testing
- [ ] Verify font sizes match normal text (14px) in rendered diagrams
- [ ] Test with different diagram types (flowchart, sequence, table, etc.)
- [ ] Ensure font sizes are consistent across all Mermaid diagram elements

---

## 2. Dark/Light Mode Support (Non-Hardcoded)

### 2.1 Use Theme Hook/Context
- [ ] Import `useTheme` from `next-themes` in `Code.tsx`
- [ ] Replace `MutationObserver` theme detection with `useTheme()` hook
- [ ] Get current theme from `useTheme()`: `const { theme, resolvedTheme } = useTheme()`
- [ ] Determine if dark mode: `const isDark = resolvedTheme === 'dark' || theme === 'dark'`

### 2.2 Update Theme Detection in initializeMermaid
- [ ] Remove hardcoded `document.documentElement.classList.contains('dark')` check
- [ ] Pass theme state as parameter to `initializeMermaid()` function
- [ ] Update function signature: `async function initializeMermaid(isDark: boolean)`
- [ ] Use passed `isDark` parameter instead of detecting from DOM

### 2.3 Dynamic Theme Updates
- [ ] Update `MermaidDiagram` component to use `useTheme()` hook
- [ ] Remove `MutationObserver` logic (replaced by `useTheme()`)
- [ ] Update `isDark` state when theme changes via `useTheme()` hook
- [ ] Ensure `useLayoutEffect` dependency array includes theme state
- [ ] Re-render diagram when theme changes (already handled by `isDark` dependency)

### 2.4 Mermaid Theme Configuration
- [ ] Ensure Mermaid theme switches between 'dark' and 'default' based on current theme
- [ ] Verify Mermaid themes properly adapt colors for dark/light mode
- [ ] Test theme switching while diagram is visible (should re-render with new theme)

### 2.5 Testing
- [ ] Test theme switching from dark to light mode
- [ ] Test theme switching from light to dark mode
- [ ] Verify diagram colors update correctly in both themes
- [ ] Test with system theme preference changes
- [ ] Ensure no flash of incorrect theme on initial load

---

## 3. Expand Button with Popup/Modal

### 3.1 UI Components Setup
- [ ] Check if dialog/modal component exists (e.g., Radix UI Dialog, custom modal)
- [ ] If not available, plan to use/create a modal component for the popup
- [ ] Import necessary icons (e.g., `Expand`, `X` from `lucide-react`)

### 3.2 Add Expand Button to MermaidDiagram
- [ ] Add expand button positioned in top-right corner of diagram container
- [ ] Style button to match existing UI (use config from `visual-effects.ts`)
- [ ] Add hover states and transitions for button
- [ ] Ensure button is visible but not intrusive
- [ ] Add proper accessibility attributes (aria-label, etc.)

### 3.3 Create Expanded View Component
- [ ] Create new component or section for expanded diagram view
- [ ] Design modal/dialog layout with:
  - Full-screen or large viewport coverage
  - Close button (X) in top-right
  - Zoom controls (zoom in, zoom out, reset)
  - Pan/drag capability for navigation
  - Preserve diagram aspect ratio

### 3.4 Implement Zoom Functionality
- [ ] Add zoom state management (zoom level, pan position)
- [ ] Implement zoom in/out controls (buttons or mouse wheel)
- [ ] Add zoom reset button to return to default view
- [ ] Use CSS transform (scale) or SVG viewBox manipulation for zooming
- [ ] Ensure zoom maintains diagram center or user's focus point

### 3.5 Implement Pan/Drag Functionality
- [ ] Add pan state management (x, y offset)
- [ ] Implement drag-to-pan interaction (mouse drag or touch)
- [ ] Add visual feedback during dragging (cursor changes)
- [ ] Ensure pan works correctly with zoom applied
- [ ] Add boundary constraints to prevent panning too far

### 3.6 Modal/Dialog Integration
- [ ] Use dialog component to show expanded view
- [ ] Pass diagram SVG/code to expanded view
- [ ] Handle modal open/close state
- [ ] Ensure modal closes on escape key
- [ ] Add backdrop/overlay for modal
- [ ] Prevent body scroll when modal is open

### 3.7 State Management
- [ ] Add state for modal open/closed: `const [isExpanded, setIsExpanded] = useState(false)`
- [ ] Add zoom state: `const [zoomLevel, setZoomLevel] = useState(1)`
- [ ] Add pan state: `const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })`
- [ ] Reset zoom/pan when modal closes

### 3.8 Responsive Design
- [ ] Ensure expand button works on mobile devices
- [ ] Make modal responsive (full screen on mobile, centered on desktop)
- [ ] Ensure touch gestures work for pan/zoom on mobile
- [ ] Test with different screen sizes

### 3.9 Accessibility
- [ ] Add keyboard navigation (arrow keys for pan, +/- for zoom)
- [ ] Add proper ARIA labels for all controls
- [ ] Ensure focus management when modal opens/closes
- [ ] Test with screen readers

### 3.10 Testing
- [ ] Test expand button click opens modal
- [ ] Test zoom in/out functionality
- [ ] Test pan/drag functionality
- [ ] Test zoom + pan combination
- [ ] Test reset zoom functionality
- [ ] Test modal close (button, escape key, backdrop click)
- [ ] Test on mobile devices
- [ ] Test with different diagram sizes

---

## 4. Code Organization & Refactoring

### 4.1 Component Structure
- [ ] Consider extracting `MermaidDiagram` to separate file if it grows large
- [ ] Create separate component for expanded view if needed
- [ ] Ensure proper TypeScript types for all props and state

### 4.2 Configuration Management
- [ ] Centralize all Mermaid-related config in `visual-effects.ts`
- [ ] Document config options and their purposes
- [ ] Ensure config is easily maintainable and extensible

### 4.3 Performance Optimization
- [ ] Ensure diagram re-renders only when necessary (code or theme changes)
- [ ] Consider memoization for expensive operations
- [ ] Optimize SVG manipulation for zoom/pan

---

## 5. Documentation

### 5.1 Code Comments
- [ ] Add JSDoc comments for new functions/components
- [ ] Document config options and their effects
- [ ] Add inline comments for complex logic

### 5.2 User Documentation (if applicable)
- [ ] Document expand/zoom/pan features for users
- [ ] Add tooltips or help text for controls

---

## Implementation Notes

### Dependencies to Check
- `next-themes` - Already installed (v0.4.6)
- `mermaid` - Already installed (v11.12.2)
- Modal/Dialog component - Check if Radix UI Dialog is available or create custom

### Key Files to Modify
1. `frontend/src/components/ui/Code.tsx` - Main component file
2. `frontend/src/config/visual-effects.ts` - Configuration file
3. Potentially create: `frontend/src/components/ui/MermaidExpandedView.tsx` - Expanded view component

### Testing Strategy
- Test with various Mermaid diagram types (flowchart, sequence, table, etc.)
- Test theme switching in both directions
- Test expand/zoom/pan on different devices
- Test with large and small diagrams
- Test accessibility features

---

## Priority Order
1. **Font Size Configuration** - High priority (affects readability)
2. **Dark/Light Mode Support** - High priority (affects user experience)
3. **Expand Button with Popup** - Medium priority (enhancement feature)
