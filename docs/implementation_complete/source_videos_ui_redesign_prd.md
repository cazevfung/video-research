# Source Videos UI Redesign PRD

## Overview

This PRD outlines the redesign of the "Source Videos" section in the summary generation page (`ResultCard` component). The current accordion-based design will be replaced with a modern card-based layout that matches the design pattern used in `SummaryDetailView`, with enhanced features for handling large video lists.

## Goals

1. **Replace Accordion Design**: Replace the current "View source videos" accordion with a modern card-based layout
2. **Centralized Configuration**: Ensure all design values come from centralized config (`visual-effects.ts`)
3. **Expand/Collapse Functionality**: Add expand/collapse feature for lists with more than 3 videos
4. **Fade Effect**: Implement a fade effect at the bottom when collapsed to indicate more content
5. **Consistency**: Match the design pattern from `SummaryDetailView` while maintaining consistency across the app

## Current State

### Current Implementation Location
- **File**: `frontend/src/components/dashboard/ResultCard.tsx`
- **Lines**: 250-288
- **Current Design**: Accordion component with simple list items showing bullet points and links

### Current Code Structure
```tsx
{summary?.source_videos && summary.source_videos.length > 0 && (
  <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="videos" className="border border-transparent">
      <AccordionTrigger>
        View source videos ({summary.source_videos.length})
      </AccordionTrigger>
      <AccordionContent>
        <ul className={cn("list-none", spacing.margin.xs, markdownConfig.list.spacing)}>
          {summary.source_videos.map((video, idx) => (
            <li key={idx} className={cn("flex items-start", spacing.gap.sm)}>
              <span className={cn(colors.text.muted, "mt-1")}>•</span>
              <a href={video.url} target="_blank" rel="noopener noreferrer">
                {video.title || video.url}
              </a>
              {video.channel && (
                <span className={cn(colors.text.muted, typography.fontSize.sm)}> • {video.channel}</span>
              )}
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
)}
```

## Target Design

### Design Reference
The new design should match the pattern from `SummaryDetailView.tsx` (lines 258-319) but adapted for the `ResultCard` context:

```html
<div class="mb-6">
  <h3 class="mb-3 text-xl font-semibold text-theme-text-primary">Source Videos</h3>
  <div class="space-y-1.5">
    <div class="flex items-center gap-4 rounded-lg border border-theme-border-tertiary bg-theme-bg-tertiary px-3 py-2">
      <img alt="..." class="flex-shrink-0 object-cover rounded-lg" src="..." style="height: 64px; width: 112px;">
      <div class="flex-1 min-w-0">
        <p class="truncate font-medium text-theme-text-primary">Video Title</p>
        <p class="text-sm text-theme-text-tertiary">Channel Name</p>
        <a href="..." target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex items-center gap-1 text-xs text-theme-text-quaternary hover:text-theme-text-primary">
          View on YouTube <ExternalLink icon />
        </a>
      </div>
    </div>
  </div>
</div>
```

### Key Features

1. **Card-Based Layout**: Each video displayed in a card with thumbnail, title, channel, and YouTube link
2. **Thumbnail Display**: Show video thumbnails (64px height × 112px width)
3. **Expand/Collapse**: 
   - Show first 3 videos when collapsed
   - Fade effect at bottom when collapsed
   - Expand button next to "Source Videos" heading
   - Button shows "Show X more" when collapsed, "Show less" when expanded
4. **Responsive Design**: Maintains responsive behavior across screen sizes

## Requirements

### Functional Requirements

1. **FR1**: Display source videos in card format with thumbnail, title, channel, and YouTube link
2. **FR2**: When there are 3 or fewer videos, show all videos without expand/collapse
3. **FR3**: When there are more than 3 videos:
   - Show first 3 videos by default
   - Apply fade effect at the bottom of the 3rd video
   - Display expand button next to heading
   - On expand, show all videos and change button to "Show less"
   - On collapse, return to showing 3 videos with fade
4. **FR4**: All styling values must come from centralized config (`visual-effects.ts`)
5. **FR5**: Component must be reusable and not hardcoded in `ResultCard`

### Non-Functional Requirements

1. **NFR1**: Performance: Component should render efficiently with large video lists (50+ videos)
2. **NFR2**: Accessibility: Proper ARIA labels, keyboard navigation support
3. **NFR3**: Responsive: Works on mobile, tablet, and desktop
4. **NFR4**: Consistency: Matches existing design system and theme tokens
5. **NFR5**: Maintainability: Centralized config allows easy design updates

## Technical Design

### Component Structure

#### New Component: `SourceVideosList`
- **Location**: `frontend/src/components/dashboard/SourceVideosList.tsx`
- **Purpose**: Reusable component for displaying source videos in card format
- **Props**:
  ```typescript
  interface SourceVideosListProps {
    videos: Array<{
      url: string;
      title: string;
      channel: string;
      thumbnail?: string;
    }>;
    maxVisible?: number; // Default: 3
    showExpandButton?: boolean; // Default: true
    className?: string;
  }
  ```

#### Configuration Addition
- **Location**: `frontend/src/config/visual-effects.ts`
- **New Section**: `sourceVideosConfig`
- **Structure**:
  ```typescript
  export const sourceVideosConfig = {
    // Container
    container: {
      marginBottom: spacing.margin.lg, // "mb-6"
    },
    // Heading
    heading: {
      fontSize: typography.fontSize.xl, // "text-xl"
      fontWeight: typography.fontWeight.semibold, // "font-semibold"
      marginBottom: spacing.margin.sm, // "mb-3"
      color: colors.text.primary, // "text-theme-text-primary"
    },
    // Expand button
    expandButton: {
      fontSize: typography.fontSize.sm, // "text-sm"
      color: colors.text.secondary, // "text-theme-text-secondary"
      hoverColor: colors.text.primary, // "hover:text-theme-text-primary"
      gap: spacing.gap.xs, // "gap-1"
    },
    // Video card
    card: {
      display: "flex items-center",
      gap: spacing.gap.md, // "gap-4"
      borderRadius: borderRadius.lg, // "rounded-lg"
      border: `border ${colors.border.tertiary}`, // "border border-theme-border-tertiary"
      background: colors.background.tertiary, // "bg-theme-bg-tertiary"
      padding: `${spacing.padding.sm} ${spacing.padding.md}`, // "px-3 py-2"
      spacing: spacing.vertical.xs, // "space-y-1.5"
    },
    // Thumbnail
    thumbnail: {
      flexShrink: 0,
      objectFit: "object-cover",
      borderRadius: borderRadius.lg, // "rounded-lg"
      height: 64, // pixels
      width: 112, // pixels
    },
    // Content
    content: {
      flex: "flex-1 min-w-0",
      title: {
        truncate: "truncate",
        fontWeight: typography.fontWeight.medium, // "font-medium"
        color: colors.text.primary, // "text-theme-text-primary"
      },
      channel: {
        fontSize: typography.fontSize.sm, // "text-sm"
        color: colors.text.tertiary, // "text-theme-text-tertiary"
      },
      link: {
        marginTop: spacing.marginTop.xs, // "mt-1"
        display: "inline-flex items-center",
        gap: spacing.gap.xs, // "gap-1"
        fontSize: typography.fontSize.xs, // "text-xs"
        color: colors.text.muted, // "text-theme-text-quaternary"
        hoverColor: markdownConfig.link.hover, // Use existing link hover
      },
    },
    // Fade effect
    fade: {
      height: 40, // pixels
      gradient: "linear-gradient(to bottom, transparent, var(--theme-bg-card))",
    },
    // Default visible count
    defaultVisibleCount: 3,
  } as const;
  ```

### Implementation Plan

#### Phase 1: Configuration Setup
1. Add `sourceVideosConfig` to `frontend/src/config/visual-effects.ts`
2. Export the new config
3. Ensure all values reference existing config tokens (colors, spacing, typography, etc.)

#### Phase 2: Component Creation
1. Create `frontend/src/components/dashboard/SourceVideosList.tsx`
2. Implement the component with:
   - Card-based video display
   - Expand/collapse state management
   - Fade effect implementation
   - Responsive design
3. Use centralized config for all styling
4. Add proper TypeScript types
5. Add accessibility attributes (ARIA labels, keyboard support)

#### Phase 3: Integration
1. Update `ResultCard.tsx`:
   - Remove accordion import and usage
   - Import `SourceVideosList` component
   - Replace accordion section with `SourceVideosList`
   - Pass `summary.source_videos` as prop
2. Ensure proper positioning (before progress bar, after header)

#### Phase 4: Testing & Refinement
1. Test with 0 videos (should not render)
2. Test with 1-3 videos (no expand button, all visible)
3. Test with 4+ videos (expand/collapse functionality)
4. Test with 50+ videos (performance)
5. Test responsive behavior
6. Test accessibility (keyboard navigation, screen readers)
7. Verify theme consistency (light/dark mode)

## File Changes

### New Files
1. `frontend/src/components/dashboard/SourceVideosList.tsx` - New reusable component

### Modified Files
1. `frontend/src/config/visual-effects.ts` - Add `sourceVideosConfig`
2. `frontend/src/components/dashboard/ResultCard.tsx` - Replace accordion with `SourceVideosList`

### Dependencies
- Existing: `lucide-react` (for ExternalLink icon)
- Existing: `framer-motion` (optional, for smooth expand/collapse animation)
- Existing: `@/config/visual-effects` (for centralized config)
- Existing: `@/lib/utils` (for `cn` utility)

## Detailed Component Implementation

### SourceVideosList Component Structure

```typescript
'use client';

import * as React from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { sourceVideosConfig, colors, spacing, typography, borderRadius, iconSizes } from '@/config/visual-effects';
import { cn } from '@/lib/utils';

interface SourceVideo {
  url: string;
  title: string;
  channel: string;
  thumbnail?: string;
}

interface SourceVideosListProps {
  videos: SourceVideo[];
  maxVisible?: number;
  showExpandButton?: boolean;
  className?: string;
}

export function SourceVideosList({
  videos,
  maxVisible = sourceVideosConfig.defaultVisibleCount,
  showExpandButton = true,
  className,
}: SourceVideosListProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const shouldShowExpand = videos.length > maxVisible && showExpandButton;
  const visibleVideos = isExpanded ? videos : videos.slice(0, maxVisible);
  const remainingCount = videos.length - maxVisible;

  if (videos.length === 0) return null;

  return (
    <div className={cn(sourceVideosConfig.container.marginBottom, className)}>
      {/* Header with Expand Button */}
      <div className={cn("flex items-center justify-between", spacing.marginBottom.sm)}>
        <h3 className={cn(
          sourceVideosConfig.heading.fontSize,
          sourceVideosConfig.heading.fontWeight,
          sourceVideosConfig.heading.color
        )}>
          Source Videos
        </h3>
        {shouldShowExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "inline-flex items-center",
              sourceVideosConfig.expandButton.gap,
              sourceVideosConfig.expandButton.fontSize,
              sourceVideosConfig.expandButton.color,
              sourceVideosConfig.expandButton.hoverColor,
              "transition-colors"
            )}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse videos" : `Show ${remainingCount} more videos`}
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUp className={iconSizes.xs} />
              </>
            ) : (
              <>
                Show {remainingCount} more
                <ChevronDown className={iconSizes.xs} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Video Cards Container */}
      <div className={cn("relative", sourceVideosConfig.card.spacing)}>
        {visibleVideos.map((video, index) => (
          <div
            key={index}
            className={cn(
              sourceVideosConfig.card.display,
              sourceVideosConfig.card.gap,
              sourceVideosConfig.card.borderRadius,
              sourceVideosConfig.card.border,
              sourceVideosConfig.card.background,
              sourceVideosConfig.card.padding
            )}
          >
            {/* Thumbnail */}
            {video.thumbnail ? (
              <img
                src={video.thumbnail}
                alt={video.title}
                className={cn(
                  sourceVideosConfig.thumbnail.flexShrink,
                  sourceVideosConfig.thumbnail.objectFit,
                  sourceVideosConfig.thumbnail.borderRadius
                )}
                style={{
                  height: `${sourceVideosConfig.thumbnail.height}px`,
                  width: `${sourceVideosConfig.thumbnail.width}px`,
                }}
              />
            ) : (
              <div
                className={cn(
                  sourceVideosConfig.thumbnail.flexShrink,
                  sourceVideosConfig.thumbnail.borderRadius,
                  colors.background.secondary,
                  "flex items-center justify-center"
                )}
                style={{
                  height: `${sourceVideosConfig.thumbnail.height}px`,
                  width: `${sourceVideosConfig.thumbnail.width}px`,
                }}
              >
                <span className={cn(colors.text.muted, typography.fontSize.xs)}>No image</span>
              </div>
            )}

            {/* Content */}
            <div className={cn(sourceVideosConfig.content.flex)}>
              <p className={cn(
                sourceVideosConfig.content.title.truncate,
                sourceVideosConfig.content.title.fontWeight,
                sourceVideosConfig.content.title.color
              )}>
                {video.title}
              </p>
              {video.channel && (
                <p className={cn(
                  sourceVideosConfig.content.channel.fontSize,
                  sourceVideosConfig.content.channel.color
                )}>
                  {video.channel}
                </p>
              )}
              {video.url && (
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    sourceVideosConfig.content.link.marginTop,
                    sourceVideosConfig.content.link.display,
                    sourceVideosConfig.content.link.gap,
                    sourceVideosConfig.content.link.fontSize,
                    sourceVideosConfig.content.link.color,
                    sourceVideosConfig.content.link.hoverColor,
                    "transition-colors"
                  )}
                >
                  View on YouTube <ExternalLink className={iconSizes.xs} />
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Fade Effect (only when collapsed and more videos exist) */}
        {!isExpanded && shouldShowExpand && (
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: `${sourceVideosConfig.fade.height}px`,
              background: `linear-gradient(to bottom, transparent, var(--theme-bg-card))`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
```

### ResultCard Integration

Replace lines 250-288 in `ResultCard.tsx`:

```typescript
// Remove Accordion imports
// import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/Accordion";

// Add new import
import { SourceVideosList } from "./SourceVideosList";

// Replace the accordion section with:
{summary?.source_videos && summary.source_videos.length > 0 && (
  <SourceVideosList videos={summary.source_videos} />
)}
```

## Configuration Details

### Complete sourceVideosConfig Structure

```typescript
export const sourceVideosConfig = {
  // Container spacing
  container: {
    marginBottom: spacing.margin.lg, // "mb-6"
  },
  
  // Heading styles
  heading: {
    fontSize: typography.fontSize.xl, // "text-xl"
    fontWeight: typography.fontWeight.semibold, // "font-semibold"
    marginBottom: spacing.margin.sm, // "mb-3"
    color: colors.text.primary, // "text-theme-text-primary"
  },
  
  // Expand/collapse button
  expandButton: {
    fontSize: typography.fontSize.sm, // "text-sm"
    color: colors.text.secondary, // "text-theme-text-secondary"
    hoverColor: "hover:text-theme-text-primary", // Hover state
    gap: spacing.gap.xs, // "gap-1"
    transition: "transition-colors", // Smooth color transition
  },
  
  // Video card container
  card: {
    display: "flex items-center", // Flex layout
    gap: spacing.gap.md, // "gap-4"
    borderRadius: borderRadius.lg, // "rounded-lg"
    border: `border ${colors.border.tertiary}`, // "border border-theme-border-tertiary"
    background: colors.background.tertiary, // "bg-theme-bg-tertiary"
    padding: `${spacing.padding.sm} ${spacing.padding.md}`, // "px-3 py-2"
    spacing: spacing.vertical.xs, // "space-y-1.5" for card container
  },
  
  // Thumbnail configuration
  thumbnail: {
    flexShrink: 0, // "flex-shrink-0"
    objectFit: "object-cover", // "object-cover"
    borderRadius: borderRadius.lg, // "rounded-lg"
    height: 64, // pixels (matches historyConfig.thumbnail.height)
    width: 112, // pixels (matches historyConfig.thumbnail.width)
  },
  
  // Content area
  content: {
    flex: "flex-1 min-w-0", // "flex-1 min-w-0"
    title: {
      truncate: "truncate", // "truncate"
      fontWeight: typography.fontWeight.medium, // "font-medium"
      color: colors.text.primary, // "text-theme-text-primary"
    },
    channel: {
      fontSize: typography.fontSize.sm, // "text-sm"
      color: colors.text.tertiary, // "text-theme-text-tertiary"
    },
    link: {
      marginTop: spacing.marginTop.xs, // "mt-1"
      display: "inline-flex items-center", // "inline-flex items-center"
      gap: spacing.gap.xs, // "gap-1"
      fontSize: typography.fontSize.xs, // "text-xs"
      color: colors.text.muted, // "text-theme-text-quaternary"
      hoverColor: markdownConfig.link.hover, // Reuse existing link hover
      transition: "transition-colors", // Smooth color transition
    },
  },
  
  // Fade effect for collapsed state
  fade: {
    height: 40, // pixels
    // Gradient will use CSS variable for theme compatibility
    // background: linear-gradient(to bottom, transparent, var(--theme-bg-card))
  },
  
  // Behavior configuration
  defaultVisibleCount: 3, // Show 3 videos by default when collapsed
} as const;
```

## Accessibility Considerations

1. **ARIA Labels**: 
   - Expand button has `aria-expanded` and `aria-label`
   - Fade effect has `aria-hidden="true"`

2. **Keyboard Navigation**:
   - Expand button is focusable and keyboard accessible
   - Links are properly accessible

3. **Screen Readers**:
   - Button text clearly indicates action ("Show X more" / "Show less")
   - Video cards have proper semantic structure

## Testing Checklist

### Functional Testing
- [ ] Component renders with 0 videos (should not render)
- [ ] Component renders with 1 video (no expand button)
- [ ] Component renders with 3 videos (no expand button)
- [ ] Component renders with 4 videos (expand button appears)
- [ ] Expand button shows correct count ("Show 1 more", "Show 5 more", etc.)
- [ ] Clicking expand shows all videos
- [ ] Clicking "Show less" collapses to 3 videos
- [ ] Fade effect appears when collapsed with 4+ videos
- [ ] Fade effect disappears when expanded
- [ ] Thumbnails display correctly
- [ ] Missing thumbnails show placeholder
- [ ] YouTube links open in new tab
- [ ] Channel names display correctly
- [ ] Video titles truncate properly

### Visual Testing
- [ ] Design matches reference design
- [ ] Spacing is consistent with design system
- [ ] Colors match theme tokens
- [ ] Typography matches design system
- [ ] Responsive on mobile (< 640px)
- [ ] Responsive on tablet (640px - 1024px)
- [ ] Responsive on desktop (> 1024px)
- [ ] Dark mode works correctly
- [ ] Light mode works correctly (if applicable)

### Performance Testing
- [ ] Renders quickly with 10 videos
- [ ] Renders quickly with 50 videos
- [ ] Expand/collapse is smooth (no lag)
- [ ] No unnecessary re-renders

### Accessibility Testing
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Screen reader announces button state correctly
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards

## Future Enhancements (Out of Scope)

1. **Search/Filter**: Add search functionality for large video lists
2. **Sorting**: Allow sorting by title, channel, or date
3. **Pagination**: For extremely large lists (100+ videos)
4. **Video Preview**: Hover to show video preview
5. **Bulk Actions**: Select multiple videos for actions
6. **Analytics**: Track which videos are viewed most

## Success Criteria

1. ✅ Accordion design replaced with card-based layout
2. ✅ All styling values come from centralized config
3. ✅ Expand/collapse works correctly for 4+ videos
4. ✅ Fade effect appears when collapsed
5. ✅ Component is reusable (not hardcoded)
6. ✅ Design matches reference design
7. ✅ Responsive across all screen sizes
8. ✅ Accessible (keyboard navigation, screen readers)
9. ✅ Performance is acceptable with large lists
10. ✅ No breaking changes to existing functionality

## Implementation Notes

1. **Theme Compatibility**: The fade effect uses CSS variable `var(--theme-bg-card)` to ensure it works with both light and dark themes
2. **Icon Sizes**: Use `iconSizes.xs` from config for ExternalLink and Chevron icons
3. **Config Reuse**: Reuse existing config values where possible (e.g., `historyConfig.thumbnail` for thumbnail dimensions)
4. **Type Safety**: Ensure proper TypeScript types for all props and config values
5. **Error Handling**: Handle missing thumbnails gracefully with placeholder

## Timeline Estimate

- **Phase 1 (Configuration)**: 30 minutes
- **Phase 2 (Component Creation)**: 2-3 hours
- **Phase 3 (Integration)**: 30 minutes
- **Phase 4 (Testing & Refinement)**: 1-2 hours

**Total Estimated Time**: 4-6 hours

---

## Appendix: Design Reference

### HTML Structure Reference
```html
<div class="mb-6">
  <h3 class="mb-3 text-xl font-semibold text-theme-text-primary">Source Videos</h3>
  <div class="space-y-1.5">
    <div class="flex items-center gap-4 rounded-lg border border-theme-border-tertiary bg-theme-bg-tertiary px-3 py-2">
      <img alt="Why Trump's Venezuela War is a Gift to China" 
           class="flex-shrink-0 object-cover rounded-lg" 
           src="https://i.ytimg.com/vi/Ljje62uP5YA/maxresdefault.jpg" 
           style="height: 64px; width: 112px;">
      <div class="flex-1 min-w-0">
        <p class="truncate font-medium text-theme-text-primary">Why Trump's Venezuela War is a Gift to China</p>
        <p class="text-sm text-theme-text-tertiary">Cyrus Janssen</p>
        <a href="https://www.youtube.com/watch?v=Ljje62uP5YA&pp=0gcJCU0KAYcqIYzv" 
           target="_blank" 
           rel="noopener noreferrer" 
           class="mt-1 inline-flex items-center gap-1 text-xs text-theme-text-quaternary hover:text-theme-text-primary">
          View on YouTube 
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link h-3 w-3" aria-hidden="true">
            <path d="M15 3h6v6"></path>
            <path d="M10 14 21 3"></path>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          </svg>
        </a>
      </div>
    </div>
  </div>
</div>
```

### Current Accordion Design (To Be Replaced)
```html
<div data-state="open" data-orientation="vertical" class="border border-transparent">
  <h3 data-orientation="vertical" data-state="open" class="flex">
    <button type="button" aria-controls="radix-_r_5k_" aria-expanded="true" data-state="open" data-orientation="vertical" id="radix-_r_5j_" class="flex flex-1 items-center justify-between py-3 font-medium transition-all hover:no-underline [&[data-state=open]>svg]:rotate-180 text-sm text-theme-text-tertiary hover:text-theme-text-secondary" data-radix-collection-item="">
      View source videos (1)
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400" aria-hidden="true">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    </button>
  </h3>
  <div data-state="open" id="radix-_r_5k_" role="region" aria-labelledby="radix-_r_5j_" data-orientation="vertical" class="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down text-sm">
    <div class="pb-3 pt-0">
      <ul class="list-none mb-2 space-y-2">
        <li class="flex items-start gap-2">
          <span class="text-theme-text-quaternary mt-1">•</span>
          <a href="https://www.youtube.com/watch?v=be-hvAgT2Ac" target="_blank" rel="noopener noreferrer" class="text-theme-text-secondary hover:text-theme-text-primary underline flex-1">
            Apple Picks Gemini AI in Win for Google's Tensor Chip
          </a>
          <span class="text-theme-text-quaternary text-sm"> • Bloomberg Technology</span>
        </li>
      </ul>
    </div>
  </div>
</div>
```

