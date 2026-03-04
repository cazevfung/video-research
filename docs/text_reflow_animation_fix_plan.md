# Text Reflow Animation Fix Plan

## Problem Statement

During the sidebar exit animation, the summary container expands using Framer Motion's `layout` prop. However, this causes text to appear **malformed/stretched** during the transition because:

1. **`layout` prop animates both position AND size** - When size animates, Framer Motion uses CSS transforms which stretch/squeeze the text
2. **Text doesn't reflow naturally** - The text is forced to fit the animating dimensions rather than gracefully flowing into the new space
3. **Visual distortion** - Text appears stretched or compressed during the transition instead of smoothly reflowing

## Root Cause

The `layout` prop on line 109 of `UnifiedStreamingContainer.tsx` animates the container's dimensions using transforms. This causes:
- Text to be visually stretched/squeezed during animation
- Text to not reflow naturally as the container expands
- An appearance of "forced expansion" rather than graceful text flow

## Solution Approach

### Option 1: Use `layout="position"` (Recommended) ⭐
**Change:** Replace `layout` with `layout="position"`

**How it works:**
- Only animates **position** changes (smooth)
- Size changes happen **instantly** (no stretching)
- Text reflows naturally into new dimensions
- Creates a "graceful fall" effect where text flows into space

**Pros:**
- Text reflows naturally
- No stretching/distortion
- Simple one-line change
- Smooth position animation

**Cons:**
- Size change is instant (but text reflows immediately, which is desired)

### Option 2: Animate Width Explicitly
**Change:** Remove `layout` prop, animate width explicitly

**How it works:**
- Use explicit width animation with smooth transition
- Text reflows as width changes naturally
- More control over animation timing

**Pros:**
- Full control over animation
- Text reflows naturally
- Can coordinate with sidebar exit

**Cons:**
- More complex (need to calculate widths)
- Requires responsive breakpoint handling

### Option 3: Add Layout to Children (Scale Correction)
**Change:** Keep `layout` on container, add `layout` to ResultCard

**How it works:**
- Framer Motion's scale correction feature
- Child elements correct for parent's transform distortions

**Pros:**
- Keeps smooth size animation
- Text distortion corrected

**Cons:**
- More complex
- May not fully solve the issue
- Requires changes to ResultCard component

---

## Recommended Solution: Option 1 (`layout="position"`)

This is the simplest and most effective solution. It allows:
- Smooth position animation (if sidebar position changes)
- Instant size change with natural text reflow
- Text gracefully "falls" into new dimensions
- No stretching or distortion

---

## Implementation Plan

### Task 1: Change Layout Prop Type
**File:** `frontend/src/components/dashboard/UnifiedStreamingContainer.tsx`

**Current code (line 109):**
```tsx
<motion.div 
  className="flex-1 min-w-0"
  layout
  transition={{ 
    duration: animationDurations.summaryExpansion,
    ease: "easeInOut" as const,
    delay: 0.05
  }}
>
```

**New code:**
```tsx
<motion.div 
  className="flex-1 min-w-0"
  layout="position"
  transition={{ 
    duration: animationDurations.summaryExpansion,
    ease: "easeInOut" as const,
    delay: 0.05
  }}
>
```

**Why this works:**
- `layout="position"` only animates position changes
- Size changes happen instantly, allowing text to reflow naturally
- Text gracefully flows into the new dimensions without stretching

**Estimated Time:** 2 minutes

### Task 2: Test Text Reflow (Optional Enhancement)
If `layout="position"` doesn't provide enough visual smoothness, we can:

**Option A: Remove delay**
- The delay might make the instant size change more noticeable
- Remove delay to make transition feel more immediate

**Option B: Adjust transition easing**
- Try `ease: "easeOut"` for faster start, slower end
- Makes the transition feel more natural

**Option C: Use explicit width animation (if needed)**
- Only if `layout="position"` doesn't provide desired effect
- More complex but gives full control

---

## Complete Code Change

### Updated UnifiedStreamingContainer.tsx

```tsx
{/* Summary container with layout animation - expands smoothly when sidebar exits */}
<motion.div 
  className="flex-1 min-w-0"
  layout="position"
  transition={{ 
    duration: animationDurations.summaryExpansion,
    ease: "easeInOut" as const,
    delay: 0.05 // 50ms delay for staggered effect - summary starts slightly after sidebar begins exiting
  }}
>
  {children}
</motion.div>
```

### Key Change
- Line 109: Changed `layout` to `layout="position"`

---

## Expected Behavior After Fix

### Before (Current - with `layout`):
- Container size animates smoothly
- Text stretches/squeezes during animation
- Text appears malformed
- Looks like "forced expansion"

### After (With `layout="position"`):
- Container position animates smoothly (if needed)
- Container size changes instantly
- Text reflows naturally into new dimensions
- Text gracefully "falls" into the new space
- No stretching or distortion
- Looks like a "dynamic change" with natural text flow

---

## Testing Checklist

### Visual Tests
- [ ] Text reflows naturally when sidebar exits
- [ ] No text stretching or distortion during transition
- [ ] Text gracefully flows into new dimensions
- [ ] No malformed characters or awkward line breaks
- [ ] Transition feels smooth and natural
- [ ] Works correctly on desktop (>1024px)
- [ ] Works correctly on mobile (<1024px)

### Functional Tests
- [ ] Summary expands when sidebar exits
- [ ] Animation completes without glitches
- [ ] No layout shifts or content jumps
- [ ] Works correctly with long text content
- [ ] Works correctly with short text content
- [ ] Rapid toggling still works consistently

### Edge Cases
- [ ] Very long paragraphs reflow correctly
- [ ] Lists reflow correctly
- [ ] Code blocks reflow correctly (if any)
- [ ] Headers and subheadings reflow correctly
- [ ] Mixed content (text + lists + headers) reflows correctly

---

## Alternative: If `layout="position"` Doesn't Feel Right

If the instant size change feels too abrupt, we can try:

### Option: Hybrid Approach
Use `layout="position"` but add a subtle width transition via CSS:

```tsx
<motion.div 
  className="flex-1 min-w-0 transition-all duration-400 ease-in-out"
  layout="position"
  transition={{ 
    duration: animationDurations.summaryExpansion,
    ease: "easeInOut" as const,
    delay: 0.05
  }}
>
```

This combines:
- Framer Motion position animation
- CSS width transition for smoother size change
- Natural text reflow

---

## Success Criteria

### Must Have
- ✅ Text reflows naturally without stretching
- ✅ No malformed or distorted text during transition
- ✅ Text gracefully flows into new dimensions
- ✅ Smooth, polished appearance

### Nice to Have
- ✅ Subtle size animation (if possible without distortion)
- ✅ Perfect timing coordination

---

## Timeline Estimate

**Total Estimated Time:** 5-10 minutes

**Breakdown:**
- Task 1 (Change layout prop): 2 minutes
- Testing: 3-8 minutes

---

## Next Steps

1. **Implement Task 1** - Change `layout` to `layout="position"`
2. **Test visually** - Verify text reflows naturally
3. **Iterate if needed** - Try alternatives if desired effect isn't achieved

---

## References

- [Framer Motion Layout Prop Types](https://www.framer.com/motion/layout-animations/)
- [Framer Motion Layout Position](https://www.framer.com/motion/layout-animations/#position-only)
- Current implementation: `frontend/src/components/dashboard/UnifiedStreamingContainer.tsx`
