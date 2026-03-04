# Summary Table of Contents (TOC) Navigation PRD

## 1. Problem Statement

### Current State
When viewing summaries that contain multiple sections with headers (H1-H6), users have no quick way to navigate between sections. They must manually scroll through potentially long documents to find specific content.

### User Pain Points
1. **Navigation Difficulty**: Long summaries require extensive scrolling to find specific sections
2. **No Overview**: Users can't quickly see the structure and organization of the content
3. **Context Loss**: While reading, users lose track of where they are in the document hierarchy
4. **Inefficient Browsing**: Users can't quickly jump to sections they're interested in

### Business Impact
- **Reduced User Engagement**: Frustration from navigation difficulties reduces time spent reading summaries
- **Lower Content Discoverability**: Users may miss relevant sections due to poor navigation
- **Decreased User Satisfaction**: Missing navigation feature makes the product feel less polished compared to modern documentation sites

---

## 2. Goals & Objectives

### Primary Goals
1. **Improve Navigation**: Enable users to quickly jump to any section in the summary
2. **Provide Structure Overview**: Show document hierarchy at a glance
3. **Enhance User Experience**: Make long-form content more accessible and navigable
4. **Maintain Visual Consistency**: Integrate seamlessly with existing design system

### Success Metrics
- **Navigation Efficiency**: Users can jump to sections in < 2 clicks
- **Adoption Rate**: > 60% of users with headers in summaries interact with TOC
- **User Satisfaction**: Positive feedback on navigation improvement
- **Performance**: TOC renders without impacting summary load time

---

## 3. Solution Overview

### Positioning Requirements

The TOC must be positioned **outside** the summary content containers as a sibling element:

1. **History Page**: 
   - Target Container XPath: `/html/body/div[2]/main/div/div/div[4]/div` (SummaryDetailView modal)
   - TOC Position: Right side, outside the modal container
   - Visibility: Only when modal is open and summary has headers

2. **Summary Generation Page**:
   - Target Container XPath: `/html/body/div[2]/main/div/div/div[2]/div` (UnifiedStreamingContainer wrapper)
   - TOC Position: Right side, outside the UnifiedStreamingContainer
   - Visibility: Only when summary is displayed and has headers

**Key Constraint**: TOC must NOT be nested inside the summary containers. It should be a sibling element positioned alongside them using flex layout.

### High-Level Approach
Add a **Table of Contents (TOC) component** that:
- Appears on the **right side** of summary content (whimsical is on the left during processing)
- **Positioned OUTSIDE** the summary containers as a sibling element
- **History Page**: Outside container at XPath `/html/body/div[2]/main/div/div/div[4]/div`
- **Summary Generation Page**: Outside container at XPath `/html/body/div[2]/main/div/div/div[2]/div`
- Automatically detects and displays all headers (H1-H6) from the markdown content
- Shows active section highlighting as user scrolls
- Only appears when headers are detected in the summary
- Uses smooth animations consistent with the existing design system

### Key Features
1. **Automatic Header Detection**: Parse markdown content to extract headers
2. **Hierarchical Display**: Show nested header structure with indentation
3. **Active Section Tracking**: Highlight current section based on scroll position
4. **Smooth Navigation**: Scroll to sections with smooth behavior
5. **Conditional Display**: Only show when headers exist
6. **Responsive Design**: Adapts to different screen sizes
7. **Animated Entrance**: Smooth appearance animation using existing configs

---

## 4. User Experience

### User Flow
1. User opens summary (via ResultCard or SummaryDetailView)
2. System analyzes markdown content for headers
3. If headers found:
   - TOC component appears on the right with fade-in animation
   - Headers are listed hierarchically with proper indentation
4. User scrolls through summary:
   - Current section is highlighted in TOC
   - Indicator line shows scroll position
5. User clicks TOC item:
   - Smooth scroll to target section
   - Section is briefly highlighted for visual feedback

### Visual Design
- **Position**: Fixed right sidebar (desktop) or collapsible section (mobile)
- **Styling**: Matches provided reference design with:
  - "On this page" header with icon
  - Nested list structure with left border indicator
  - Active item highlighting with primary color
  - Subtle scroll indicator line
  - Scrollable content area with fade masks

---

## 5. Technical Architecture

### Component Structure

#### Summary Generation Page
```
Page Container
├── UnifiedStreamingContainer (existing, flex-1)
│   ├── ProcessingSidebar (left, when streaming)
│   └── ResultCard
│       └── MarkdownStreamer
└── TableOfContents (sibling, fixed width, right side)
    ├── TOCHeader
    ├── TOCList (scrollable)
    │   ├── TOCItem (h1)
    │   ├── TOCItem (h2, nested)
    │   └── TOCItem (h3, nested)
    └── ActiveIndicator
```

#### History Page
```
Page Container
├── SummaryDetailView Modal (existing, flex-1)
│   └── MarkdownStreamer
└── TableOfContents (sibling, fixed width, right side)
    ├── TOCHeader
    ├── TOCList (scrollable)
    │   ├── TOCItem (h1)
    │   ├── TOCItem (h2, nested)
    │   └── TOCItem (h3, nested)
    └── ActiveIndicator
```

**Key Architecture Points**:
- TOC is a **sibling** to the summary containers, not nested inside
- TOC appears **outside** the containers at the specified XPath locations
- TOC is positioned on the **right side** using flex layout
- Summary content containers remain unchanged (no internal modifications needed)

### Key Components

#### 1. `TableOfContents` Component
**File**: `frontend/src/components/summary/TableOfContents.tsx`

**Props**:
```typescript
interface TableOfContentsProps {
  content: string; // Markdown content
  className?: string;
}
```

**Responsibilities**:
- Extract headers from markdown content
- Generate anchor IDs for headers
- Track scroll position
- Handle click navigation
- Manage active section state

#### 2. Header Extraction Utility
**File**: `frontend/src/utils/markdown.ts`

**Function**: `extractHeaders(content: string): HeaderItem[]`

**Returns**:
```typescript
interface HeaderItem {
  level: number; // 1-6 for h1-h6
  text: string;
  id: string; // Anchor ID (slugified)
  children?: HeaderItem[]; // Nested headers
}
```

**Algorithm**:
1. Parse markdown content using regex or markdown AST
2. Extract all headers (h1-h6) with their text
3. Generate unique anchor IDs (slugify header text)
4. Build hierarchical structure (nested children)
5. Return flat list for rendering with indentation logic

#### 3. Integration Points

**A. Summary Generation Page (Dashboard)**
- TOC positioned as sibling to `UnifiedStreamingContainer` wrapper
- Layout: `UnifiedStreamingContainer` (flex-1) + `TableOfContents` (fixed width)
- TOC appears outside the container at XPath `/html/body/div[2]/main/div/div/div[2]/div`
- Use flex layout with proper spacing

**B. History Page (SummaryDetailView Modal)**
- TOC positioned as sibling to `SummaryDetailView` modal container
- TOC appears outside the container at XPath `/html/body/div[2]/main/div/div/div[4]/div`
- Position on right side of page, visible when modal is open
- TOC only renders when modal is open and summary has headers

### Layout Specifications

#### Desktop (>1024px)

##### Summary Generation Page
```
┌─────────────────────────────────────────────────────────────────────┐
│ Page Container                                                      │
│                                                                     │
│  ┌──────────────────────────────────────┐  ┌──────────────┐        │
│  │ UnifiedStreamingContainer             │  │   TOC        │        │
│  │ (flex-1)                               │  │   (280px)    │        │
│  │                                        │  │              │        │
│  │  ┌──────────┐  ┌──────────────────┐  │  │  On this page│        │
│  │  │Whimsical │  │  Summary Content  │  │  │  ├─ Section1 │        │
│  │  │(280px)   │  │  (flex-1)         │  │  │  ├─ Section2 │        │
│  │  │          │  │                   │  │  │  └─ Section3 │        │
│  │  │          │  │  [Markdown]        │  │  │              │        │
│  │  └──────────┘  └──────────────────┘  │  └──────────────┘        │
│  └──────────────────────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

##### History Page (Modal View)
```
┌─────────────────────────────────────────────────────────────────────┐
│ Page Container                                                      │
│                                                                     │
│  ┌──────────────────────────────────────┐  ┌──────────────┐        │
│  │ SummaryDetailView Modal               │  │   TOC        │        │
│  │ (flex-1)                              │  │   (280px)    │        │
│  │                                       │  │              │        │
│  │  ┌─────────────────────────────────┐  │  │  On this page│        │
│  │  │  Summary Content                │  │  │  ├─ Section1 │        │
│  │  │                                 │  │  │  ├─ Section2 │        │
│  │  │  [Markdown Content]             │  │  │  └─ Section3 │        │
│  │  └─────────────────────────────────┘  │  │              │        │
│  └──────────────────────────────────────┘  └──────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Layout Points**:
- TOC is **outside** the summary content containers
- TOC is positioned as a **sibling** on the right side
- Both containers use flex layout with proper spacing
- TOC has fixed width (280px), summary content takes remaining space (flex-1)

#### Mobile (<1024px)
- TOC appears below summary content as a collapsible section
- Or hidden by default with toggle button
- Stacked layout: Summary → TOC

---

## 6. Implementation Details

### 6.1 Header Detection

**Approach**: Use regex pattern matching on markdown content

**Pattern**: Match markdown header syntax
- `# Header` (h1)
- `## Header` (h2)
- `### Header` (h3)
- etc.

**Alternative**: Use existing `react-markdown` AST if available

**Example Implementation**:
```typescript
function extractHeaders(content: string): HeaderItem[] {
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  const headers: HeaderItem[] = [];
  let match;

  while ((match = headerRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = slugify(text);

    headers.push({
      level,
      text,
      id,
    });
  }

  return headers;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
```

### 6.2 Anchor ID Injection

**Challenge**: Markdown content needs anchor IDs for navigation

**Solution**: Modify `MarkdownStreamer` header renderers to inject IDs

**Implementation**:
```typescript
// In MarkdownStreamer.tsx
h1: ({ children, ...props }) => {
  const id = slugify(children?.toString() || '');
  return (
    <h1 id={id} {...props}>
      {children}
    </h1>
  );
},
// Repeat for h2-h6
```

### 6.3 Active Section Detection

**Approach**: Intersection Observer API

**Implementation**:
```typescript
useEffect(() => {
  const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const observer = new IntersectionObserver(
    (entries) => {
      // Find header currently in viewport
      // Update active state
    },
    {
      rootMargin: '-20% 0px -70% 0px', // Trigger when header is near top
    }
  );

  headers.forEach(header => observer.observe(header));
  return () => headers.forEach(header => observer.unobserve(header));
}, [content]);
```

### 6.4 Smooth Scrolling

**Implementation**:
```typescript
const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
};
```

### 6.5 Animation Configuration

**Reuse Existing Configs**:
- **Entrance Animation**: `animationDurations.sidebarSlideIn` (0.3s)
- **Fade-in**: `animationDurations.unifiedContainerFadeIn` (0.3s)
- **Transition**: `animationDurations.pageTransition` (0.3s)

**Animation Pattern**:
```typescript
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 20 }}
  transition={{ duration: animationDurations.sidebarSlideIn }}
>
```

**Indicator Animation**: Use CSS transitions for smooth indicator movement

---

## 7. Design Specifications

### 7.1 TOC Component Styling

**Container**:
- Width: `280px` (desktop), `100%` (mobile)
- Max width: `100%`
- Height: `100%` (flex column)
- Padding: `pe-4` (padding-end)

**Header Section**:
- Title: "On this page" with icon (AlignJustify from lucide-react)
- Text: `text-sm text-fd-muted-foreground`
- Icon size: `size-4`
- Gap: `gap-1.5`

**Scrollable Content**:
- Min height: `0`
- Text size: `text-sm`
- Overflow: `overflow-auto`
- Scrollbar: Hidden (`[scrollbar-width:none]`)
- Mask: Fade gradient at top/bottom (`[mask-image:linear-gradient(...)]`)
- Padding: `py-3`

**Active Indicator**:
- Position: `absolute`
- Width: `1px`
- Background: `bg-fd-primary`
- Transition: `transition-all`
- CSS Variables: `--fd-top`, `--fd-height` for dynamic positioning

**List Items**:
- Border: Left border `border-s border-fd-foreground/10`
- Padding: `ps-3` (base), `ps-6` (nested)
- Text: `text-sm text-fd-muted-foreground`
- Active: `data-[active=true]:text-fd-primary`
- Transition: `transition-colors`
- Overflow: `[overflow-wrap:anywhere]`

### 7.2 Indentation Logic

**Rules**:
- H1: `ps-3` (base padding)
- H2: `ps-3` (same level as H1, or `ps-6` if nested)
- H3: `ps-6` (nested under H2)
- H4: `ps-9` (nested under H3)
- H5: `ps-12` (nested under H4)
- H6: `ps-15` (nested under H5)

**Alternative**: Use dynamic padding based on level
```typescript
const paddingMap = {
  1: 'ps-3',
  2: 'ps-3', // or ps-6 if nested
  3: 'ps-6',
  4: 'ps-9',
  5: 'ps-12',
  6: 'ps-15',
};
```

### 7.3 Color Scheme

**Reuse Theme Colors**:
- Primary: `text-fd-primary` → `colors.text.primary`
- Muted: `text-fd-muted-foreground` → `colors.text.tertiary`
- Border: `border-fd-foreground/10` → `colors.border.tertiary`
- Active indicator: `bg-fd-primary` → `colors.text.primary`

---

## 8. Animation Strategy

### 8.1 Entrance Animation

**When**: TOC appears when headers are detected

**Animation**:
- **Initial**: `opacity: 0, x: 20` (slightly to the right)
- **Animate**: `opacity: 1, x: 0`
- **Duration**: `animationDurations.sidebarSlideIn` (0.3s)
- **Easing**: `easeOut`

**Implementation**:
```typescript
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{
    duration: animationDurations.sidebarSlideIn,
    ease: "easeOut",
  }}
>
```

### 8.2 Exit Animation

**When**: TOC disappears when headers removed or summary closes

**Animation**:
- **Exit**: `opacity: 0, x: 20`
- **Duration**: `animationDurations.sidebarSlideOut` (0.4s)
- **Easing**: `easeIn`

### 8.3 Active Indicator Animation

**When**: Active section changes on scroll

**Animation**:
- **CSS Variables**: Update `--fd-top` and `--fd-height`
- **Transition**: `transition-all` with duration from config
- **Duration**: `animationDurations.pageTransition` (0.3s)

**Implementation**:
```typescript
const indicatorStyle = {
  '--fd-top': `${activeItemTop}px`,
  '--fd-height': `${activeItemHeight}px`,
} as React.CSSProperties;
```

### 8.4 Item Hover Animation

**When**: User hovers over TOC items

**Animation**:
- **Color Transition**: Use existing `transition-colors`
- **Duration**: Match link hover duration from `markdownConfig`

---

## 9. Responsive Behavior

### 9.1 Desktop (>1024px)
- **Position**: Fixed right sidebar
- **Width**: `280px` (matches ProcessingSidebar width)
- **Layout**: Flex row with summary content
- **Visibility**: Always visible when headers exist

### 9.2 Tablet (640px - 1024px)
- **Position**: Right sidebar (same as desktop if space allows)
- **Width**: `240px` (reduced for smaller screens)
- **Layout**: Flex row if space allows, else column

### 9.3 Mobile (<640px)
- **Position**: Below summary content
- **Layout**: Stacked column
- **Visibility**: Collapsible by default (hidden initially)
- **Toggle**: Button to show/hide TOC
- **Full Width**: `100%` width

**Alternative Mobile Approach**:
- **Fixed Bottom Sheet**: TOC as bottom drawer
- **Overlay**: Floating button opens TOC overlay

---

## 10. Accessibility

### 10.1 Keyboard Navigation
- **Tab Navigation**: TOC items are focusable
- **Enter/Space**: Activate item (scroll to section)
- **Arrow Keys**: Navigate between items (up/down)

### 10.2 Screen Readers
- **ARIA Labels**: 
  - `aria-label="Table of Contents"` on container
  - `aria-current="true"` on active item
- **Semantic HTML**: Use `<nav>` element for TOC container
- **List Structure**: Use `<ul>` and `<li>` for proper structure

### 10.3 Focus Management
- **Visible Focus**: Clear focus indicators on TOC items
- **Scroll to Focus**: When navigating with keyboard, ensure focused item is visible

### 10.4 Reduced Motion
- **Respect Preference**: Check `prefers-reduced-motion`
- **Fallback**: Use instant transitions when reduced motion enabled

---

## 11. Performance Considerations

### 11.1 Header Extraction
- **Memoization**: Cache extracted headers (only re-extract when content changes)
- **Lazy Parsing**: Only parse when TOC is needed (not hidden)

### 11.2 Intersection Observer
- **Efficient Watching**: Only observe headers that exist
- **Cleanup**: Properly disconnect observers on unmount
- **Throttling**: Debounce scroll updates if needed

### 11.3 Rendering Optimization
- **Virtual Scrolling**: If TOC has 100+ items, consider virtual scrolling
- **Memoized Components**: Memoize TOC items to prevent unnecessary re-renders

---

## 12. Edge Cases & Error Handling

### 12.1 No Headers
- **Behavior**: TOC component doesn't render
- **No Animation**: Since component doesn't exist, no exit animation needed

### 12.2 Duplicate Header Text
- **Solution**: Append counter to ID (e.g., `installation-1`, `installation-2`)
- **Uniqueness**: Ensure all anchor IDs are unique

### 12.3 Very Long Header Text
- **Solution**: Truncate in TOC display (keep full text on hover)
- **Overflow**: Use `[overflow-wrap:anywhere]` for wrapping

### 12.4 Special Characters in Headers
- **Solution**: Proper slugification handles special chars
- **Fallback**: Use index-based ID if slugification fails

### 12.5 Dynamic Content (Streaming)
- **Behavior**: TOC updates as headers appear during streaming
- **Animation**: New headers fade in smoothly
- **Performance**: Debounce TOC updates during rapid streaming

---

## 13. Integration Points

### 13.1 Summary Generation Page (Dashboard)
**File**: `frontend/src/app/page.tsx`

**XPath Target**: `/html/body/div[2]/main/div/div/div[2]/div` (UnifiedStreamingContainer wrapper)

**Changes**:
1. Wrap the existing `UnifiedStreamingContainer` in a flex container
2. Add `TableOfContents` as a sibling to `UnifiedStreamingContainer`, positioned on the right
3. Extract headers from `stream.summary?.final_summary_text` or `stream.streamedText`
4. Conditionally render TOC when headers exist

**Layout Structure**:
```tsx
{showResultCard && (
  <div className={cn(spacing.margin.xl, "w-full")}>
    <div className="flex flex-row gap-4 items-start">
      {/* Existing UnifiedStreamingContainer - stays as is */}
      <div className="flex-1 min-w-0">
        <UnifiedStreamingContainer
          showSidebar={showProcessingSidebar}
          sidebar={...}
        >
          <ResultCard ... />
        </UnifiedStreamingContainer>
      </div>
      
      {/* TOC positioned outside, on the right */}
      {hasHeaders && (
        <TableOfContents 
          content={stream.summary?.final_summary_text || stream.streamedText || ''} 
        />
      )}
    </div>
  </div>
)}
```

**Key Points**:
- TOC is a **sibling** to `UnifiedStreamingContainer`, not inside it
- TOC appears on the **right side** of the page
- TOC is **outside** the container at XPath `/html/body/div[2]/main/div/div/div[2]/div`
- Uses flex layout to position TOC alongside the summary container

### 13.2 History Page (SummaryDetailView Modal)
**File**: `frontend/src/app/history/page.tsx` and `frontend/src/components/history/SummaryDetailView.tsx`

**XPath Target**: `/html/body/div[2]/main/div/div/div[4]/div` (SummaryDetailView modal container)

**Changes**:
1. Modify the page layout to include TOC outside the modal
2. Extract headers from `selectedSummary?.final_summary_text`
3. Position TOC as a sibling to the modal container, on the right side
4. Ensure TOC is visible when modal is open

**Layout Structure in History Page**:
```tsx
<div className={spacing.container.pagePadding}>
  <div className="mx-auto max-w-7xl">
    {/* Existing content */}
    
    {/* Modal and TOC wrapper */}
    <div className="flex flex-row gap-4 items-start relative">
      {/* SummaryDetailView modal - existing container */}
      <div className="flex-1">
        <SummaryDetailView
          summary={selectedSummary}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onDelete={handleDelete}
        />
      </div>
      
      {/* TOC positioned outside modal, on the right */}
      {isDetailOpen && selectedSummary && hasHeaders && (
        <TableOfContents 
          content={selectedSummary.final_summary_text} 
        />
      )}
    </div>
  </div>
</div>
```

**Alternative Approach (Fixed Position)**:
If the modal is fixed/overlay, TOC can be positioned fixed on the right side of the viewport:

```tsx
{/* Fixed TOC on right side when modal is open */}
{isDetailOpen && selectedSummary && hasHeaders && (
  <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
    <TableOfContents 
      content={selectedSummary.final_summary_text} 
    />
  </div>
)}
```

**Key Points**:
- TOC is a **sibling** to `SummaryDetailView` modal container
- TOC appears on the **right side** of the page
- TOC is **outside** the container at XPath `/html/body/div[2]/main/div/div/div[4]/div`
- TOC only shows when modal is open and summary has headers

### 13.3 MarkdownStreamer Component
**File**: `frontend/src/components/dashboard/MarkdownStreamer.tsx`

**Changes**:
1. Add `id` prop to all header renderers (h1-h6)
2. Use `slugify` utility to generate anchor IDs
3. Ensure IDs match TOC generated IDs

---

## 14. Configuration

### 14.1 Add to visual-effects.ts

```typescript
// Table of Contents Configuration
export const tocConfig = {
  // Dimensions
  width: {
    desktop: "280px",
    tablet: "240px",
    mobile: "100%",
  },
  // Spacing
  padding: {
    container: "pe-4", // padding-end
    item: "py-1.5", // vertical padding per item
    nested: {
      1: "ps-3", // H1 base
      2: "ps-3", // H2 base (or ps-6 if nested)
      3: "ps-6", // H3
      4: "ps-9", // H4
      5: "ps-12", // H5
      6: "ps-15", // H6
    },
  },
  // Typography
  fontSize: "text-sm",
  // Colors (reuse existing theme)
  colors: {
    text: colors.text.tertiary,
    textActive: colors.text.primary,
    border: colors.border.tertiary,
    indicator: colors.text.primary,
  },
  // Animation
  animation: {
    entrance: {
      duration: animationDurations.sidebarSlideIn, // 0.3s
      ease: "easeOut" as const,
    },
    exit: {
      duration: animationDurations.sidebarSlideOut, // 0.4s
      ease: "easeIn" as const,
    },
    indicator: {
      duration: animationDurations.pageTransition, // 0.3s
    },
  },
  // Scroll behavior
  scroll: {
    behavior: "smooth" as const,
    block: "start" as const,
    offset: 0, // Offset from top when scrolling
  },
} as const;
```

---

## 15. Testing Strategy

### 15.1 Unit Tests
- **Header Extraction**: Test various markdown formats
- **Slugification**: Test special characters, unicode, duplicates
- **Hierarchy Building**: Test nested header structures

### 15.2 Integration Tests
- **TOC Rendering**: Verify TOC appears when headers exist
- **Navigation**: Test click navigation to sections
- **Active Tracking**: Test active section updates on scroll
- **Responsive**: Test layout on different screen sizes

### 15.3 E2E Tests
- **User Flow**: Open summary → See TOC → Click item → Verify scroll
- **Dynamic Content**: Test TOC updates during streaming
- **Edge Cases**: Very long headers, many headers, no headers

---

## 16. Implementation Plan

This section provides a detailed, phased approach to implementing the Table of Contents feature.

---

### Phase 1: Foundation & Core Utilities

**Objective**: Set up core functionality for header extraction and basic TOC structure.

#### Task 1.1: Create Header Extraction Utility
**File**: `frontend/src/utils/markdown.ts`

**Tasks**:
- [ ] Create `extractHeaders()` function that parses markdown content
- [ ] Implement regex pattern matching for headers (h1-h6)
- [ ] Create `slugify()` utility function for anchor ID generation
- [ ] Handle edge cases (duplicate headers, special characters, empty headers)
- [ ] Return structured array of `HeaderItem[]` with level, text, and id
- [ ] Add TypeScript types for `HeaderItem` interface
- [ ] Add JSDoc documentation
- [ ] Write unit tests for various markdown formats

**Dependencies**: None

**Estimated Time**: 2-3 hours

**Deliverables**:
- `extractHeaders()` function
- `slugify()` function
- TypeScript interfaces
- Unit tests with >80% coverage

---

#### Task 1.2: Create TOC Configuration
**File**: `frontend/src/config/visual-effects.ts`

**Tasks**:
- [ ] Add `tocConfig` object to visual-effects.ts
- [ ] Define width configurations (desktop, tablet, mobile)
- [ ] Define padding and spacing configurations
- [ ] Define color scheme (reuse existing theme colors)
- [ ] Define animation configurations (reuse existing durations)
- [ ] Export `tocConfig` for use in components

**Dependencies**: None

**Estimated Time**: 30 minutes

**Deliverables**:
- `tocConfig` configuration object
- Type-safe configuration exports

---

#### Task 1.3: Add Anchor IDs to Markdown Renderers
**File**: `frontend/src/components/dashboard/MarkdownStreamer.tsx`

**Tasks**:
- [ ] Import `slugify` utility function
- [ ] Update `h1` renderer to inject `id` prop
- [ ] Update `h2` renderer to inject `id` prop
- [ ] Update `h3` renderer to inject `id` prop
- [ ] Update `h4` renderer to inject `id` prop
- [ ] Update `h5` renderer to inject `id` prop
- [ ] Update `h6` renderer to inject `id` prop
- [ ] Ensure IDs match TOC extraction logic
- [ ] Test with various header formats

**Dependencies**: Task 1.1 (slugify function)

**Estimated Time**: 1-2 hours

**Deliverables**:
- All header renderers with anchor IDs
- Consistent ID generation matching TOC

---

### Phase 2: TOC Component Development

**Objective**: Build the core TOC component with basic styling and functionality.

#### Task 2.1: Create TableOfContents Component
**File**: `frontend/src/components/summary/TableOfContents.tsx`

**Tasks**:
- [ ] Create component file and structure
- [ ] Define component props interface (`TableOfContentsProps`)
- [ ] Implement header extraction from content prop
- [ ] Create TOC header section with "On this page" title and icon
- [ ] Implement TOC list rendering with proper indentation
- [ ] Add basic styling matching reference design
- [ ] Implement click navigation to sections
- [ ] Add smooth scroll behavior
- [ ] Handle empty/no headers state (component returns null)
- [ ] Add memoization for performance
- [ ] Add TypeScript types and JSDoc

**Dependencies**: Phase 1 (utilities and config)

**Estimated Time**: 4-5 hours

**Deliverables**:
- Functional TOC component
- Basic styling matching design reference
- Click navigation working

---

#### Task 2.2: Implement TOC Styling
**File**: `frontend/src/components/summary/TableOfContents.tsx`

**Tasks**:
- [ ] Style TOC container (width, height, padding)
- [ ] Style header section (icon, text, spacing)
- [ ] Style scrollable content area with fade masks
- [ ] Implement nested indentation logic (ps-3, ps-6, ps-9, etc.)
- [ ] Style TOC items (padding, text color, transitions)
- [ ] Add left border styling
- [ ] Implement active item styling (data-active attribute)
- [ ] Style scrollbar (hidden)
- [ ] Add hover states for items
- [ ] Ensure responsive behavior

**Dependencies**: Task 2.1, Phase 1 (tocConfig)

**Estimated Time**: 2-3 hours

**Deliverables**:
- Complete styling matching design reference
- Responsive design working

---

#### Task 2.3: Implement Active Section Tracking
**File**: `frontend/src/components/summary/TableOfContents.tsx`

**Tasks**:
- [ ] Set up Intersection Observer for header elements
- [ ] Track which header is currently in viewport
- [ ] Update active state in TOC component
- [ ] Highlight active TOC item
- [ ] Handle edge cases (multiple headers in view, no headers visible)
- [ ] Clean up observers on unmount
- [ ] Debounce/throttle scroll updates for performance
- [ ] Handle dynamic content changes

**Dependencies**: Task 2.1

**Estimated Time**: 3-4 hours

**Deliverables**:
- Active section highlighting working
- Smooth updates on scroll

---

#### Task 2.4: Implement Active Indicator Line
**File**: `frontend/src/components/summary/TableOfContents.tsx`

**Tasks**:
- [ ] Create indicator line element (absolute positioned)
- [ ] Calculate active item position (top, height)
- [ ] Update CSS variables (--fd-top, --fd-height) dynamically
- [ ] Add smooth transitions for indicator movement
- [ ] Position indicator correctly on active item
- [ ] Handle indicator for nested items
- [ ] Test indicator positioning accuracy

**Dependencies**: Task 2.3

**Estimated Time**: 2-3 hours

**Deliverables**:
- Animated indicator line following active section
- Smooth transitions

---

### Phase 3: Integration & Animation

**Objective**: Integrate TOC into both pages with proper animations and positioning.

#### Task 3.1: Integrate TOC into Summary Generation Page
**File**: `frontend/src/app/page.tsx`

**Tasks**:
- [ ] Identify container at XPath `/html/body/div[2]/main/div/div/div[2]/div`
- [ ] Wrap `UnifiedStreamingContainer` in flex container
- [ ] Import `TableOfContents` component
- [ ] Extract headers from `stream.summary?.final_summary_text` or `stream.streamedText`
- [ ] Conditionally render TOC when headers exist and summary is shown
- [ ] Position TOC as sibling on right side
- [ ] Add proper spacing (gap-4 or gap-6)
- [ ] Ensure TOC appears/disappears correctly with state changes
- [ ] Test with streaming content (TOC updates as headers appear)
- [ ] Test with completed summaries

**Dependencies**: Phase 2 (TOC component)

**Estimated Time**: 3-4 hours

**Deliverables**:
- TOC integrated into summary generation page
- Positioned correctly outside UnifiedStreamingContainer
- Conditional rendering working

---

#### Task 3.2: Integrate TOC into History Page
**File**: `frontend/src/app/history/page.tsx`

**Tasks**:
- [ ] Identify container at XPath `/html/body/div[2]/main/div/div/div[4]/div`
- [ ] Import `TableOfContents` component
- [ ] Extract headers from `selectedSummary?.final_summary_text`
- [ ] Wrap modal and TOC in flex container
- [ ] Position TOC as sibling to SummaryDetailView modal
- [ ] Conditionally render TOC only when modal is open and headers exist
- [ ] Add proper spacing and layout
- [ ] Handle modal open/close state changes
- [ ] Test TOC appears/disappears with modal
- [ ] Ensure TOC doesn't interfere with modal functionality

**Alternative (if fixed positioning needed)**:
- [ ] Consider fixed positioning if modal is overlay
- [ ] Position TOC fixed on right side of viewport
- [ ] Ensure z-index doesn't conflict with modal

**Dependencies**: Phase 2 (TOC component)

**Estimated Time**: 3-4 hours

**Deliverables**:
- TOC integrated into history page
- Positioned correctly outside SummaryDetailView
- Works correctly with modal open/close

---

#### Task 3.3: Implement Entrance/Exit Animations
**File**: `frontend/src/components/summary/TableOfContents.tsx`

**Tasks**:
- [ ] Import Framer Motion
- [ ] Wrap TOC component with `motion.div`
- [ ] Add initial state (opacity: 0, x: 20)
- [ ] Add animate state (opacity: 1, x: 0)
- [ ] Add exit state (opacity: 0, x: 20)
- [ ] Configure transition using `animationDurations.sidebarSlideIn`
- [ ] Use `easeOut` easing
- [ ] Test entrance animation when TOC appears
- [ ] Test exit animation when TOC disappears
- [ ] Ensure animations are smooth (60fps)
- [ ] Handle AnimatePresence wrapper in parent components

**Dependencies**: Phase 3 (integration tasks)

**Estimated Time**: 2-3 hours

**Deliverables**:
- Smooth entrance/exit animations
- Consistent with existing design system

---

### Phase 4: Responsive Design & Polish

**Objective**: Ensure TOC works well across all screen sizes and edge cases.

#### Task 4.1: Implement Responsive Behavior
**File**: `frontend/src/components/summary/TableOfContents.tsx`

**Desktop (>1024px)**:
- [ ] Verify TOC width is 280px
- [ ] Ensure TOC appears on right side
- [ ] Test with long TOC lists (scrollable)
- [ ] Verify spacing with summary content

**Tablet (640px - 1024px)**:
- [ ] Adjust TOC width to 240px
- [ ] Test layout with reduced space
- [ ] Ensure readability and usability

**Mobile (<640px)**:
- [ ] Implement collapsible behavior OR
- [ ] Position TOC below summary content
- [ ] Adjust width to 100%
- [ ] Add toggle button if collapsible
- [ ] Test touch interactions
- [ ] Ensure TOC doesn't obstruct content

**Tasks**:
- [ ] Add responsive breakpoints
- [ ] Adjust width using `tocConfig.width`
- [ ] Test on various screen sizes
- [ ] Ensure layout doesn't break
- [ ] Verify spacing and padding

**Dependencies**: Phase 3 (integration)

**Estimated Time**: 3-4 hours

**Deliverables**:
- Responsive TOC on all screen sizes
- Good UX on mobile devices

---

#### Task 4.2: Performance Optimization
**Files**: Multiple

**Tasks**:
- [ ] Memoize `extractHeaders()` results (only re-extract when content changes)
- [ ] Memoize TOC component to prevent unnecessary re-renders
- [ ] Optimize Intersection Observer (throttle/debounce updates)
- [ ] Use `React.memo` for TOC items
- [ ] Implement virtual scrolling if TOC has 100+ items (optional)
- [ ] Lazy parse headers only when TOC is visible
- [ ] Optimize scroll event handlers
- [ ] Profile performance with Chrome DevTools
- [ ] Ensure no performance regression

**Dependencies**: Phase 3

**Estimated Time**: 2-3 hours

**Deliverables**:
- Optimized performance
- No performance degradation
- Smooth 60fps animations

---

#### Task 4.3: Accessibility Enhancements
**File**: `frontend/src/components/summary/TableOfContents.tsx`

**Tasks**:
- [ ] Add `<nav>` semantic element with `aria-label="Table of Contents"`
- [ ] Add `aria-current="true"` to active item
- [ ] Ensure all TOC items are keyboard focusable
- [ ] Implement keyboard navigation (Arrow keys, Enter, Space)
- [ ] Add visible focus indicators
- [ ] Ensure sufficient color contrast
- [ ] Add screen reader announcements
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Respect `prefers-reduced-motion` setting
- [ ] Ensure WCAG 2.1 AA compliance

**Dependencies**: Phase 3

**Estimated Time**: 3-4 hours

**Deliverables**:
- Fully accessible TOC component
- Keyboard navigation working
- Screen reader compatible

---

#### Task 4.4: Edge Case Handling
**Files**: Multiple

**Tasks**:
- [ ] Handle summaries with no headers (TOC doesn't render)
- [ ] Handle duplicate header text (append counter to IDs)
- [ ] Handle very long header text (truncate with tooltip)
- [ ] Handle special characters in headers (proper slugification)
- [ ] Handle dynamic content during streaming (TOC updates)
- [ ] Handle rapid content changes (debounce updates)
- [ ] Handle window resize during display
- [ ] Handle scroll position restoration
- [ ] Handle modal close while scrolling
- [ ] Handle multiple summaries in quick succession

**Dependencies**: Phase 3

**Estimated Time**: 2-3 hours

**Deliverables**:
- All edge cases handled gracefully
- No crashes or visual glitches

---

### Phase 5: Testing & Quality Assurance

**Objective**: Comprehensive testing to ensure quality and reliability.

#### Task 5.1: Unit Testing
**Files**: Test files

**Tasks**:
- [ ] Write tests for `extractHeaders()` function
- [ ] Test various markdown formats (h1-h6, nested, mixed)
- [ ] Test `slugify()` function with special characters
- [ ] Test duplicate header handling
- [ ] Test edge cases (empty content, no headers, malformed markdown)
- [ ] Write tests for TOC component rendering
- [ ] Test conditional rendering (no headers case)
- [ ] Test click navigation
- [ ] Achieve >80% code coverage

**Dependencies**: Phase 1, Phase 2

**Estimated Time**: 4-5 hours

**Deliverables**:
- Comprehensive unit tests
- >80% code coverage
- All edge cases tested

---

#### Task 5.2: Integration Testing
**Files**: Test files

**Tasks**:
- [ ] Test TOC integration on summary generation page
- [ ] Test TOC integration on history page
- [ ] Test TOC appears/disappears correctly
- [ ] Test active section tracking
- [ ] Test scroll navigation
- [ ] Test with streaming content
- [ ] Test with completed summaries
- [ ] Test responsive breakpoints
- [ ] Test modal interactions

**Dependencies**: Phase 3, Phase 4

**Estimated Time**: 3-4 hours

**Deliverables**:
- Integration tests passing
- All integration scenarios covered

---

#### Task 5.3: Manual Testing & QA
**Tasks**:
- [ ] Test on Chrome (desktop and mobile)
- [ ] Test on Firefox (desktop and mobile)
- [ ] Test on Safari (desktop and mobile)
- [ ] Test on Edge
- [ ] Test with various summary lengths
- [ ] Test with various header structures
- [ ] Test rapid interactions
- [ ] Test keyboard navigation
- [ ] Test screen reader
- [ ] Test with reduced motion preference
- [ ] Verify visual consistency
- [ ] Check for visual glitches
- [ ] Verify animation smoothness
- [ ] Test performance with long summaries

**Dependencies**: All phases

**Estimated Time**: 4-6 hours

**Deliverables**:
- QA checklist completed
- Issues documented and fixed
- Ready for production

---

### Phase 6: Documentation & Launch

**Objective**: Document the feature and prepare for production launch.

#### Task 6.1: Code Documentation
**Files**: All component files

**Tasks**:
- [ ] Add JSDoc comments to all functions
- [ ] Document component props and interfaces
- [ ] Add usage examples in comments
- [ ] Document configuration options
- [ ] Update inline code comments
- [ ] Document edge cases and gotchas

**Dependencies**: All phases

**Estimated Time**: 2-3 hours

**Deliverables**:
- Well-documented codebase
- Clear JSDoc comments

---

#### Task 6.2: User Documentation (Optional)
**Tasks**:
- [ ] Create user guide for TOC feature
- [ ] Document keyboard shortcuts
- [ ] Add tooltips or help text
- [ ] Update feature changelog

**Dependencies**: All phases

**Estimated Time**: 1-2 hours

**Deliverables**:
- User documentation (if needed)

---

#### Task 6.3: Production Deployment
**Tasks**:
- [ ] Code review and approvals
- [ ] Merge to main branch
- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Verify feature is working in production

**Dependencies**: All phases complete

**Estimated Time**: 2-4 hours

**Deliverables**:
- Feature live in production
- Monitoring in place

---

#### Task 6.4: Post-Launch Monitoring
**Tasks**:
- [ ] Monitor error logs
- [ ] Track user interactions (analytics)
- [ ] Collect user feedback
- [ ] Monitor performance metrics
- [ ] Track adoption rate
- [ ] Document any issues
- [ ] Plan iterations based on feedback

**Dependencies**: Phase 6.3

**Estimated Time**: Ongoing

**Deliverables**:
- Analytics dashboard
- User feedback collection
- Issue tracking

---

## Implementation Timeline

### Estimated Total Time: 45-60 hours

**Breakdown by Phase**:
- **Phase 1 (Foundation)**: 4-6 hours
- **Phase 2 (Component Development)**: 11-15 hours
- **Phase 3 (Integration)**: 8-11 hours
- **Phase 4 (Polish)**: 10-14 hours
- **Phase 5 (Testing)**: 11-15 hours
- **Phase 6 (Documentation & Launch)**: 5-9 hours

### Recommended Sprint Planning

**Sprint 1** (2 weeks):
- Phase 1: Foundation & Core Utilities
- Phase 2: TOC Component Development (partial)

**Sprint 2** (2 weeks):
- Phase 2: Complete TOC Component
- Phase 3: Integration & Animation

**Sprint 3** (2 weeks):
- Phase 4: Responsive Design & Polish
- Phase 5: Testing & QA

**Sprint 4** (1 week):
- Phase 6: Documentation & Launch
- Post-launch monitoring setup

---

## Risk Mitigation

### Potential Risks

1. **Performance Impact**: TOC parsing and Intersection Observer might slow down page
   - **Mitigation**: Memoization, lazy parsing, performance profiling

2. **Layout Issues**: TOC positioning might cause layout shifts
   - **Mitigation**: Fixed width, proper flex layout, thorough responsive testing

3. **Accessibility Concerns**: TOC might not be accessible to all users
   - **Mitigation**: Comprehensive accessibility testing, ARIA labels, keyboard navigation

4. **Browser Compatibility**: Intersection Observer might not work in older browsers
   - **Mitigation**: Polyfill if needed, graceful degradation

5. **Content Changes**: Streaming content might cause TOC to flicker
   - **Mitigation**: Debounce updates, smooth transitions

---

## Success Criteria Checklist

Before considering the implementation complete, verify:

- [ ] TOC appears when headers are detected
- [ ] TOC hidden when no headers exist
- [ ] Click navigation works smoothly
- [ ] Active section highlighting works
- [ ] TOC positioned correctly on both pages
- [ ] Responsive on desktop, tablet, and mobile
- [ ] Smooth entrance/exit animations
- [ ] Keyboard navigation working
- [ ] Screen reader compatible
- [ ] No performance degradation
- [ ] All edge cases handled
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Manual QA completed
- [ ] Documentation complete
- [ ] Production deployment successful

---

## 17. Success Criteria

### Must Have
- ✅ TOC appears when headers are detected
- ✅ TOC hidden when no headers
- ✅ Click navigation works smoothly
- ✅ Active section highlighting works
- ✅ Responsive on desktop and mobile
- ✅ Smooth entrance/exit animations
- ✅ No performance degradation

### Nice to Have
- ✅ Keyboard navigation
- ✅ TOC updates during streaming
- ✅ Collapsible on mobile
- ✅ Visual indicator line animation
- ✅ Sticky positioning on scroll

---

## 18. Future Enhancements

### Potential Improvements
1. **Search in TOC**: Filter headers as user types
2. **Expand/Collapse**: Allow collapsing nested sections
3. **Progress Indicator**: Show reading progress
4. **Print Support**: Include TOC in print view
5. **Export**: Include TOC when exporting summary
6. **Customization**: Allow users to show/hide certain header levels

---

## 19. References

### Design Reference
- Provided HTML structure with classes and styling
- Existing animation configs from `visual-effects.ts`
- Current layout system (UnifiedStreamingContainer)

### Technical References
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- Existing components: `ProcessingSidebar`, `UnifiedStreamingContainer`

---

## 20. Appendix

### A. Header Extraction Regex Pattern
```javascript
/^(#{1,6})\s+(.+)$/gm
```

### B. Slugify Function
```typescript
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
```

### C. Example Header Structure
```markdown
# Installation
## Prerequisites
## Setup Steps
### Step 1: Download
### Step 2: Install
# Usage
## Basic Usage
## Advanced Features
# API Reference
```

**Extracted Structure**:
```typescript
[
  { level: 1, text: "Installation", id: "installation" },
  { level: 2, text: "Prerequisites", id: "prerequisites" },
  { level: 2, text: "Setup Steps", id: "setup-steps" },
  { level: 3, text: "Step 1: Download", id: "step-1-download" },
  { level: 3, text: "Step 2: Install", id: "step-2-install" },
  { level: 1, text: "Usage", id: "usage" },
  { level: 2, text: "Basic Usage", id: "basic-usage" },
  { level: 2, text: "Advanced Features", id: "advanced-features" },
  { level: 1, text: "API Reference", id: "api-reference" },
]
```

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: Development Team  
**Status**: Ready for Implementation
