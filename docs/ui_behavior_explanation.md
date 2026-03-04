# UI Behavior After Implementation - Visual Guide

**Document Version**: 1.0  
**Created**: 2026-01-28  
**Related Plan**: `smart_research_ui_streaming_improvement_plan.md`

---

## Overview

After implementing the plan, the UI will maintain a **consistent layout structure** throughout the entire research workflow, with **real-time streaming** of interim outputs. This document explains the visual behavior step-by-step.

---

## Layout Structure (Always Consistent)

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         Research Page                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Header (Title & Subtitle)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer (ALWAYS SAME)           │  │
│  │  ┌──────────────┐  ┌──────────────────────────────────┐ │  │
│  │  │              │  │                                  │ │  │
│  │  │   Sidebar    │  │      Content Area                │ │  │
│  │  │  (Whimsical  │  │   (Changes based on state)       │ │  │
│  │  │  Animation) │  │                                  │ │  │
│  │  │              │  │                                  │ │  │
│  │  │  [Fixed 280px│  │  [Flexible, takes remaining]     │ │  │
│  │  │   width]     │  │                                  │ │  │
│  │  │              │  │                                  │ │  │
│  │  └──────────────┘  └──────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Point**: The container structure NEVER changes. Only the **content area** changes based on the current state.

---

## Complete User Journey

### Stage 1: Initial State (Idle)

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Header                                │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │         Research Form (Standalone Card)           │  │
│  │                                                    │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Research Query: [_________________]        │  │  │
│  │  │  Language: [English ▼]                     │  │  │
│  │  │  [Start Research]                           │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Form is displayed in a standalone card
- User enters query and clicks "Start Research"
- Form fades out smoothly

---

### Stage 2: Generating Questions (Processing - WITH STREAMING)

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer                  │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │              │  │                          │  │
│  │  │   Sidebar    │  │    Content Area          │  │
│  │  │              │  │                          │  │
│  │  │  [Whimsical   │  │  ┌────────────────────┐ │  │
│  │  │   Orb with    │  │  │  Generating...     │ │  │
│  │  │   pulsing     │  │  │  Progress: 5%      │ │  │
│  │  │   animation]  │  │  │                    │ │  │
│  │  │              │  │  │  Status:           │ │  │
│  │  │  Progress: 5% │  │  │  "Generating       │ │  │
│  │  │              │  │  │   questions..."    │ │  │
│  │  │  [Cancel]     │  │  │                    │ │  │
│  │  │              │  │  └────────────────────┘ │  │
│  │  └──────────────┘  └──────────────────────────┘  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**NEW BEHAVIOR (Streaming):**
- **Real-time updates**: As AI generates questions, they appear incrementally
- **Visual feedback**: User sees questions appearing one by one (or in small groups)
- **Progress indication**: Progress bar updates as questions are generated

**Timeline Example:**
```
Time 0s:   "Generating questions..." (no questions yet)
Time 2s:   "1. What are the latest developments..."
Time 4s:   "1. What are the latest developments..."
          "2. How does AI improve..."
Time 6s:   "1. What are the latest developments..."
          "2. How does AI improve..."
          "3. What are the challenges..."
Time 8s:   "1. What are the latest developments..."
          "2. How does AI improve..."
          "3. What are the challenges..."
          "4. What are the benefits..."
Time 10s:  "1. What are the latest developments..."
          "2. How does AI improve..."
          "3. What are the challenges..."
          "4. What are the benefits..."
          "5. What is the future outlook..."
          ✅ Complete - Ready for approval
```

**Visual Indicator:**
- Small spinner/loading icon next to "Generating questions..."
- Questions fade in smoothly as they appear
- Progress bar gradually fills

---

### Stage 3: Question Approval (Approval State)

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer                  │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │              │  │                          │  │
│  │  │   Sidebar    │  │    Content Area          │  │
│  │  │              │  │    (APPROVAL CARD)      │  │
│  │  │  [Whimsical   │  │                          │  │
│  │  │   Orb -       │  │  ┌────────────────────┐ │  │
│  │  │   STILL       │  │  │ Review Questions   │ │  │
│  │  │   VISIBLE]    │  │  │                    │ │  │
│  │  │              │  │  │ 1. What are the    │ │  │
│  │  │  Progress: 10%│  │  │    latest...      │ │  │
│  │  │              │  │  │                    │ │  │
│  │  │  Status:      │  │  │ 2. How does AI...  │ │  │
│  │  │  "Awaiting    │  │  │                    │ │  │
│  │  │   approval"   │  │  │ 3. What are the... │ │  │
│  │  │              │  │  │                    │ │  │
│  │  │              │  │  │ [Request Changes]   │ │  │
│  │  │              │  │  │ [Approve & Continue]│ │  │
│  │  │              │  │  └────────────────────┘ │  │
│  │  └──────────────┘  └──────────────────────────┘  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**KEY DIFFERENCE FROM BEFORE:**
- ✅ **Sidebar STAYS VISIBLE** (whimsical animation continues)
- ✅ **NO PAGE JUMP** - smooth content transition
- ✅ **Same container structure** - only content area changed

**Transition Animation:**
- Content area smoothly fades/swipes from "Generating..." to "Approval Card"
- Sidebar remains static (no movement)
- Duration: ~300ms smooth transition

---

### Stage 4: Generating Search Terms (Processing - WITH STREAMING)

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer                  │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │              │  │                          │  │
│  │  │   Sidebar    │  │    Content Area          │  │
│  │  │              │  │                          │  │
│  │  │  [Whimsical   │  │  ┌────────────────────┐ │  │
│  │  │   Orb]        │  │  │  Generating...     │ │  │
│  │  │              │  │  │  Progress: 20%      │ │  │
│  │  │  Progress: 20%│  │  │                    │ │  │
│  │  │              │  │  │  Status:           │ │  │
│  │  │  Status:      │  │  │  "Generating       │ │  │
│  │  │  "Generating  │  │  │   search terms..." │ │  │
│  │  │   search      │  │  │                    │ │  │
│  │  │   terms..."   │  │  │  🔄 Streaming...  │ │  │
│  │  │              │  │  │                    │ │  │
│  │  │  [Cancel]     │  │  │  Terms appearing: │ │  │
│  │  │              │  │  │  • AI healthcare   │ │  │
│  │  │              │  │  │  • Medical AI...    │ │  │
│  │  │              │  │  │  • (more coming)    │ │  │
│  │  └──────────────┘  └──────────────────────────┘  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**NEW BEHAVIOR (Streaming):**
- Search terms appear incrementally as they're generated
- User sees real-time progress
- Visual feedback keeps user engaged

**Timeline Example:**
```
Time 0s:   "Generating search terms..." (no terms yet)
Time 2s:   • "AI healthcare diagnosis"
Time 4s:   • "AI healthcare diagnosis"
          • "Medical AI accuracy"
Time 6s:   • "AI healthcare diagnosis"
          • "Medical AI accuracy"
          • "Healthcare AI 2026"
Time 8s:   • "AI healthcare diagnosis"
          • "Medical AI accuracy"
          • "Healthcare AI 2026"
          • "AI diagnostic tools"
          • "Medical AI research"
          ✅ Complete - Ready for approval
```

---

### Stage 5: Search Term Approval (Approval State)

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer                  │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │              │  │                          │  │
│  │  │   Sidebar    │  │    Content Area          │  │
│  │  │              │  │    (APPROVAL CARD)       │  │
│  │  │  [Whimsical   │  │                          │  │
│  │  │   Orb -       │  │  ┌────────────────────┐ │  │
│  │  │   STILL       │  │  │ Review Search Terms│ │  │
│  │  │   VISIBLE]    │  │  │                    │ │  │
│  │  │              │  │  │ • AI healthcare... │ │  │
│  │  │  Progress: 25%│  │  │ • Medical AI...   │ │  │
│  │  │              │  │  │ • Healthcare AI... │ │  │
│  │  │  Status:      │  │  │ • AI diagnostic... │ │  │
│  │  │  "Awaiting    │  │  │ • Medical AI...    │ │  │
│  │  │   approval"   │  │  │                    │ │  │
│  │  │              │  │  │ [Request Changes]  │ │  │
│  │  │              │  │  │ [Approve & Continue]│ │  │
│  │  │              │  │  └────────────────────┘ │  │
│  │  └──────────────┘  └──────────────────────────┘  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**KEY POINT:**
- ✅ **Same container** - no structural change
- ✅ **Sidebar visible** - maintains visual continuity
- ✅ **Smooth transition** - content area changes smoothly

---

### Stage 6: Video Search & Selection (Processing)

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer                  │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  │              │  │                          │  │
│  │  │   Sidebar    │  │    Content Area          │  │
│  │  │              │  │                          │  │
│  │  │  [Whimsical   │  │  ┌────────────────────┐ │  │
│  │  │   Orb with    │  │  │  Searching videos  │ │  │
│  │  │   video       │  │  │  Progress: 45%    │ │  │
│  │  │   particles]  │  │  │                    │ │  │
│  │  │              │  │  │  Found: 12 videos   │ │  │
│  │  │  Progress: 45%│  │  │                    │ │  │
│  │  │              │  │  │  Filtering...       │ │  │
│  │  │  Videos: 12  │  │  │                    │ │  │
│  │  │              │  │  └────────────────────┘ │  │
│  │  └──────────────┘  └──────────────────────────┘  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Video particles orbit around the orb in sidebar
- Progress updates as videos are found and filtered
- No streaming needed (videos are discrete items)

---

### Stage 7: Video Approval (Approval State)

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer                  │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  │              │  │                          │  │
│  │  │   Sidebar    │  │    Content Area          │  │
│  │  │              │  │    (VIDEO APPROVAL CARD) │  │
│  │  │  [Whimsical   │  │                          │  │
│  │  │   Orb -       │  │  ┌────────────────────┐ │  │
│  │  │   STILL       │  │  │ Review Videos      │ │  │
│  │  │   VISIBLE]    │  │  │                    │ │  │
│  │  │              │  │  │  [Video Card 1]    │ │  │
│  │  │  Progress: 55%│  │  │  [Video Card 2]   │ │  │
│  │  │              │  │  │  [Video Card 3]    │ │  │
│  │  │  Status:      │  │  │  ...               │ │  │
│  │  │  "Awaiting    │  │  │                    │ │  │
│  │  │   approval"   │  │  │ [Request Changes] │ │  │
│  │  │              │  │  │ [Approve & Continue]│ │  │
│  │  │              │  │  └────────────────────┘ │  │
│  │  └──────────────┘  └──────────────────────────┘  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**KEY POINT:**
- ✅ **Same structure** - container never changes
- ✅ **Sidebar visible** - maintains visual continuity
- ✅ **Video cards** displayed in content area

---

### Stage 8: Generating Summary (Streaming)

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer                  │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │              │  │                          │  │
│  │  │   Sidebar    │  │    Content Area          │  │
│  │  │              │  │    (RESULT CARD)         │  │
│  │  │  [Whimsical   │  │                          │  │
│  │  │   Orb]        │  │  ┌────────────────────┐ │  │
│  │  │              │  │  │  Research Summary   │ │  │
│  │  │  Progress: 85%│  │  │                    │ │  │
│  │  │              │  │  │  # AI in Healthcare│ │  │
│  │  │  Status:      │  │  │                    │ │  │
│  │  │  "Generating  │  │  │  AI has...         │ │  │
│  │  │   summary"    │  │  │                    │ │  │
│  │  │              │  │  │  The latest...      │ │  │
│  │  │              │  │  │                    │ │  │
│  │  │              │  │  │  🔄 Streaming...   │ │  │
│  │  │              │  │  │                    │ │  │
│  │  │              │  │  │  [Text appears     │ │  │
│  │  │              │  │  │   incrementally]  │ │  │
│  │  └──────────────┘  └──────────────────────────┘  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Summary text streams in real-time (already working)
- Sidebar shows progress
- Content area displays streaming text

---

### Stage 9: Completed

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    Research Page                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         UnifiedStreamingContainer                  │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  │              │  │                          │  │
│  │  │   Sidebar    │  │    Content Area          │  │
│  │  │              │  │    (RESULT CARD)         │  │
│  │  │  [Whimsical   │  │                          │  │
│  │  │   Orb -       │  │  ┌────────────────────┐ │  │
│  │  │   Complete]   │  │  │  Research Summary   │ │  │
│  │  │              │  │  │                    │ │  │
│  │  │  Progress: 100%│  │  │  # AI in Healthcare│ │  │
│  │  │              │  │  │                    │ │  │
│  │  │  Status:      │  │  │  [Full summary     │ │  │
│  │  │  "Completed"   │  │  │   text displayed]  │ │  │
│  │  │              │  │  │                    │ │  │
│  │  │              │  │  │  [Copy] [New Research]│ │  │
│  │  │              │  │  └────────────────────┘ │  │
│  │  └──────────────┘  └──────────────────────────┘  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Sidebar shows completion state
- Full summary displayed
- Action buttons available

---

## Key Visual Behaviors

### 1. Container Persistence

**Before (Current):**
```
Processing → [Container appears]
Approval → [Container DISAPPEARS, new UI appears] ❌ JUMP
Processing → [Container appears again] ❌ JUMP
```

**After (Planned):**
```
Processing → [Container appears]
Approval → [Container STAYS, content changes] ✅ SMOOTH
Processing → [Container STAYS, content changes] ✅ SMOOTH
```

### 2. Sidebar Visibility

**Before (Current):**
- Sidebar visible during processing
- Sidebar **disappears** during approval ❌
- Sidebar reappears during processing

**After (Planned):**
- Sidebar visible during processing ✅
- Sidebar **stays visible** during approval ✅
- Sidebar stays visible throughout ✅

### 3. Streaming Behavior

**Before (Current):**
- Questions: Wait 10-15s → All appear at once ❌
- Search Terms: Wait 10-15s → All appear at once ❌
- Summary: Streams in real-time ✅

**After (Planned):**
- Questions: Stream in real-time ✅
- Search Terms: Stream in real-time ✅
- Summary: Streams in real-time ✅

### 4. Content Transitions

**Before (Current):**
- Abrupt replacement of entire UI
- No smooth transitions
- Visual discontinuity

**After (Planned):**
- Smooth fade/slide transitions (~300ms)
- Only content area changes
- Visual continuity maintained

---

## Animation Details

### Content Area Transitions

**Transition Types:**

1. **Processing → Approval:**
   - Current content fades out (opacity: 1 → 0)
   - Approval card fades in (opacity: 0 → 1)
   - Duration: 300ms
   - Easing: easeOut

2. **Approval → Processing:**
   - Approval card slides out (x: 0 → -20px, opacity: 1 → 0)
   - Processing content slides in (x: 20px → 0, opacity: 0 → 1)
   - Duration: 300ms
   - Easing: easeOut

3. **Streaming Updates:**
   - New items fade in smoothly
   - Existing items remain static
   - No jarring movements

### Sidebar Behavior

**Always:**
- Remains in fixed position
- No movement during content transitions
- Smooth progress updates
- Consistent visual presence

---

## Responsive Behavior

### Desktop (>1024px)

```
┌──────────────┐  ┌────────────────────────────┐
│   Sidebar    │  │      Content Area          │
│   (280px)    │  │      (flex-1)              │
│              │  │                            │
│   [Orb]      │  │                            │
│              │  │                            │
└──────────────┘  └────────────────────────────┘
```

### Mobile (<1024px)

```
┌────────────────────────────────────────────┐
│         Sidebar (140px height)             │
│  ┌──────────┐  ┌──────────────────────┐  │
│  │   [Orb]  │  │   Status & Progress  │  │
│  └──────────┘  └──────────────────────┘  │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│         Content Area (full width)          │
│                                            │
│  [Approval Card or Result Card]           │
│                                            │
└────────────────────────────────────────────┘
```

**Key Point:** Layout adapts responsively, but structure remains consistent.

---

## User Experience Improvements

### Before Implementation

**Issues:**
1. ❌ Page jumps when approval stages start
2. ❌ Sidebar disappears during approval
3. ❌ No visual feedback during question/search term generation
4. ❌ Long wait times with no progress
5. ❌ Inconsistent visual experience

**User Feelings:**
- Confused by layout changes
- Frustrated by lack of feedback
- Disengaged during long waits

### After Implementation

**Improvements:**
1. ✅ Smooth transitions - no page jumps
2. ✅ Sidebar always visible - visual continuity
3. ✅ Real-time streaming - immediate feedback
4. ✅ Progress visible - reduced perceived wait time
5. ✅ Consistent experience - professional feel

**User Feelings:**
- Confident - knows what's happening
- Engaged - sees progress in real-time
- Satisfied - smooth, polished experience

---

## Technical Implementation Notes

### State Management

**State Transitions:**
```typescript
idle → processing → awaiting_approval → processing → awaiting_approval → streaming → completed
```

**Container Visibility:**
```typescript
// Before: Container only visible during processing/streaming
showUnifiedContainer = state === "processing" || state === "streaming"

// After: Container visible during processing/streaming/approval
showUnifiedContainer = state === "processing" || state === "streaming" || state === "awaiting_approval"
```

### Content Rendering

**Content Area Logic:**
```typescript
{showUnifiedContainer && (
  <UnifiedStreamingContainer>
    <Sidebar />
    {state === "awaiting_approval" ? (
      <ApprovalCard /> // Questions/Search Terms/Videos
    ) : state === "streaming" ? (
      <ResultCard /> // Summary streaming
    ) : (
      <ProcessingCard /> // Processing state
    )}
  </UnifiedStreamingContainer>
)}
```

### Streaming Display

**Questions/Search Terms:**
```typescript
// Display partial items while streaming
items={isStreaming ? partialItems : completeItems}

// Show streaming indicator
{isStreaming && (
  <div className="streaming-indicator">
    <Spinner /> Generating...
  </div>
)}
```

---

## Summary

After implementation, the UI will:

1. **Maintain consistent structure** - Same container throughout
2. **Keep sidebar visible** - Visual continuity maintained
3. **Stream in real-time** - Questions and search terms appear incrementally
4. **Smooth transitions** - No jarring jumps or replacements
5. **Professional feel** - Polished, consistent experience

The user will experience a **seamless, engaging workflow** with real-time feedback and visual continuity throughout the entire research process.
