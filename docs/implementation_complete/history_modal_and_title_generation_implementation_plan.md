# Implementation Plan: History Modal Fix & AI-Generated Title Feature

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | January 2026 |
| **Related PRD** | `docs/history_modal_and_title_generation_prd.md` |
| **Target Timeline** | 2-3 days |
| **Priority** | High |

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Phases](#implementation-phases)
3. [Phase 1: History Modal Fix](#phase-1-history-modal-fix)
4. [Phase 2: Quick Title Generation (Backend)](#phase-2-quick-title-generation-backend)
5. [Phase 3: Quick Title Generation (Frontend)](#phase-3-quick-title-generation-frontend)
6. [Phase 4: Refined Title Generation](#phase-4-refined-title-generation)
7. [Phase 5: Testing & Polish](#phase-5-testing--polish)
8. [Dependencies & Prerequisites](#dependencies--prerequisites)
9. [Testing Strategy](#testing-strategy)
10. [Risk Mitigation](#risk-mitigation)
11. [Success Criteria](#success-criteria)

---

## Overview

This implementation plan breaks down the history modal fix and AI-generated title feature into 5 sequential phases. The plan prioritizes fixing the critical modal positioning bug first, then implements the two-stage title generation system (quick title from transcripts, refined title from summary).

**Key Principles:**
- **Fix Critical Bugs First:** Modal positioning fix is highest priority
- **Incremental Development:** Each phase delivers working, testable functionality
- **Non-Blocking Implementation:** Title generation must not delay summary processing
- **Graceful Degradation:** Fallback to default titles if AI generation fails
- **User Experience:** Smooth title updates and properly centered modals

---

## Implementation Phases

| Phase | Focus | Estimated Time | Dependencies | Deliverables |
|-------|-------|----------------|--------------|--------------|
| **Phase 1** | History Modal Fix | 2-4 hours | None | Centered modal, scrollable content |
| **Phase 2** | Quick Title Generation (Backend) | 3-4 hours | Phase 1 | Title generation function, integration |
| **Phase 3** | Quick Title Generation (Frontend) | 1-2 hours | Phase 2 | Title display in UI |
| **Phase 4** | Refined Title Generation | 2-3 hours | Phase 3 | Refined title replacement |
| **Phase 5** | Testing & Polish | 2-3 hours | Phase 4 | E2E tests, documentation |

**Total Estimated Time: 10-16 hours (2-3 days)**

---

## Phase 1: History Modal Fix

**Duration:** 2-4 hours  
**Goal:** Fix modal positioning to center it properly and ensure content is visible and scrollable

### Tasks

#### 1.1 Update Modal Positioning

**File:** `frontend/src/components/history/SummaryDetailView.tsx`

- [ ] Update backdrop to use flexbox centering
  - Change from `fixed inset-0` to `fixed inset-0 flex items-center justify-center`
  - Add `spacing.padding.md` from config for consistent mobile spacing
  - Ensure backdrop still covers entire viewport
  - Maintain backdrop blur and overlay styling using `historyConfig.modal.overlay`

- [ ] Update modal container positioning
  - Change from `fixed inset-4` to `relative` (since it's now inside flex container)
  - Add `max-h-[90vh]` to prevent overflow
  - Ensure `w-full` is maintained
  - Keep `max-w-4xl` from config

- [ ] Update animation initial state
  - Change `y: 20` to `y: 0` in initial animation (since modal is already centered)
  - Keep scale animation (0.95 to 1)
  - Ensure smooth transition

**Code Changes:**
```tsx
import { colors, spacing, historyConfig, animationDurations } from '@/config/visual-effects';

// Before:
<motion.div
  className={cn("fixed inset-0 z-50 backdrop-blur-sm", historyConfig.modal.overlay)}
  onClick={onClose}
/>

<motion.div
  className={cn("fixed z-50 mx-auto overflow-hidden", historyConfig.modal.inset, historyConfig.modal.maxWidth)}
  initial={{ opacity: 0, scale: 0.95, y: 20 }}
>

// After:
<motion.div
  className={cn(
    "fixed inset-0 z-50 backdrop-blur-sm",
    "flex items-center justify-center",
    spacing.padding.md, // Use config spacing
    historyConfig.modal.overlay
  )}
  onClick={onClose}
/>

<motion.div
  className={cn(
    "relative z-50 mx-auto w-full overflow-hidden",
    historyConfig.modal.maxWidth,
    historyConfig.modal.maxHeight // Use config value
  )}
  initial={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: historyConfig.modal.animationDuration }}
>
```

#### 1.2 Ensure Content Scrolling

**File:** `frontend/src/components/history/SummaryDetailView.tsx`

- [ ] Verify CardContent has proper overflow
  - Ensure `flex-1 overflow-y-auto` is applied
  - Check that Card component doesn't interfere with scrolling
  - Test with long summary content

- [ ] Verify Card height constraint
  - Ensure Card uses `flex h-full flex-col` to fill modal
  - Modal has `max-h-[90vh]` to prevent overflow
  - Content area scrolls independently

#### 1.3 Update Visual Effects Config (Optional)

**File:** `frontend/src/config/visual-effects.ts`

- [ ] Update `historyConfig.modal` if needed
  - Remove `inset` property (no longer used)
  - Add `maxHeight` property for reference
  - Keep `maxWidth` and `animationDuration`

**Code Changes:**
```typescript
modal: {
  overlay: colors.background.overlay,
  maxWidth: "max-w-4xl",
  // Remove: inset: "inset-4",
  padding: spacing.padding.md, // Use config spacing for consistency
  animationDuration: animationDurations.pageTransition,
  maxHeight: "max-h-[90vh]", // Prevent overflow
},
```

#### 1.4 Test Modal on Different Viewports

- [ ] Test on desktop (1920x1080, 1440x900)
  - Verify modal is centered
  - Verify content is scrollable
  - Verify animation is smooth

- [ ] Test on tablet (768x1024, 1024x768)
  - Verify modal fits within viewport
  - Verify padding is appropriate
  - Verify scrolling works

- [ ] Test on mobile (375x667, 414x896)
  - Verify modal takes appropriate width
  - Verify modal doesn't exceed viewport height
  - Verify touch scrolling works

#### 1.5 Test Accessibility

- [ ] Test keyboard navigation
  - Tab through modal elements
  - Verify Escape key closes modal
  - Verify focus trap works

- [ ] Test screen reader
  - Verify ARIA labels are present
  - Verify modal announcement works
  - Verify content is readable

#### 1.6 Manual Testing Checklist

- [ ] Open modal with short summary (should be centered)
- [ ] Open modal with long summary (should scroll)
- [ ] Open modal on mobile (should fit viewport)
- [ ] Close modal via backdrop click
- [ ] Close modal via Escape key
- [ ] Close modal via X button
- [ ] Verify no layout shift when opening
- [ ] Verify smooth animation

### Acceptance Criteria

- ✅ Modal is centered both vertically and horizontally
- ✅ Modal content is fully visible and scrollable
- ✅ Modal works on all screen sizes (mobile, tablet, desktop)
- ✅ No layout shift when opening modal
- ✅ Smooth animation (< 300ms)
- ✅ Keyboard navigation works
- ✅ Screen reader compatible

---

## Phase 2: Quick Title Generation (Backend)

**Duration:** 3-4 hours  
**Goal:** Implement AI-powered title generation using qwen-flash after transcripts are fetched

### Tasks

#### 2.1 Create Title Generation Function

**File:** `backend/src/services/ai.service.ts`

- [ ] Add `generateTitle()` function
  - Accept `content: string` (transcript or summary text)
  - Accept `context: 'transcripts' | 'summary'` parameter
  - Return `Promise<string | null>`
  - Use qwen-flash model (cheapest, fastest)
  - Set `max_tokens: 100` (titles are short)
  - Set `temperature: 0.7` for creativity

- [ ] Implement prompt engineering
  - Create system prompt for transcripts context
  - Create system prompt for summary context
  - Limit transcript content to first 2000 characters (save tokens)
  - Use full summary content for refined title

- [ ] Implement title cleaning
  - Remove surrounding quotes (`"` or `'`)
  - Replace newlines with spaces
  - Trim whitespace
  - Enforce max length (60 characters)
  - Validate minimum length (5 characters)

- [ ] Implement error handling
  - Catch AI service errors
  - Log warnings (don't fail silently)
  - Return `null` on failure (not throw)
  - Include context in error logs

**Code Implementation:**
```typescript
/**
 * Generate a title using qwen-flash model
 * @param content Transcript text or summary text
 * @param context Optional context (e.g., "transcripts" or "summary")
 * @returns Generated title or null if generation fails
 */
export async function generateTitle(
  content: string,
  context: 'transcripts' | 'summary' = 'summary'
): Promise<string | null> {
  const systemPrompt = context === 'transcripts'
    ? `You are a title generator. Generate a concise, descriptive title (max 60 characters) based on video transcripts. 
       The title should capture the main themes and topics discussed. 
       Return ONLY the title, no quotes, no explanation.`
    : `You are a title generator. Generate a concise, descriptive title (max 60 characters) based on a video summary. 
       The title should capture the key insights and main topics. 
       Return ONLY the title, no quotes, no explanation.`;

  // Limit content length for transcripts to save tokens
  const contentToUse = context === 'transcripts'
    ? content.substring(0, 2000)
    : content;

  const userPrompt = `Based on this ${context === 'transcripts' ? 'video transcripts' : 'video summary'}, generate a concise title:\n\n${contentToUse}`;

  try {
    const result = await callQwenFlash(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.7,
        max_tokens: 100,
      }
    );

    if (result.error) {
      logger.warn('[Title Generation] Failed to generate title', { 
        error: result.error,
        context,
      });
      return null;
    }

    // Clean up the title
    let title = result.content.trim();
    title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    title = title.replace(/\n/g, ' '); // Replace newlines with spaces
    title = title.substring(0, 60).trim(); // Enforce max length
    
    if (title.length < 5) {
      logger.warn('[Title Generation] Generated title too short', { title });
      return null;
    }
    
    return title;
  } catch (error) {
    logger.error('[Title Generation] Error generating title', { 
      error,
      context,
    });
    return null;
  }
}
```

#### 2.2 Add Title Update Helper Function

**File:** `backend/src/models/Summary.ts`

- [ ] Add `updateSummaryTitle()` function
  - Accept `summaryId: string` and `title: string`
  - Update `batch_title` field in database
  - Use `updateOne()` with `$set` operator
  - Log success and errors
  - Return `Promise<void>`

**Code Implementation:**
```typescript
/**
 * Update summary title
 * @param summaryId Summary document ID
 * @param title New title to set
 */
export async function updateSummaryTitle(
  summaryId: string,
  title: string
): Promise<void> {
  try {
    await SummaryModel.updateOne(
      { _id: summaryId },
      { $set: { batch_title: title } }
    );
    logger.debug(`Updated summary title: ${summaryId}`, { title });
  } catch (error) {
    logger.error(`Failed to update summary title: ${summaryId}`, { error, title });
    throw error;
  }
}
```

#### 2.3 Update Summary Progress Type

**File:** `backend/src/types/summary.types.ts`

- [ ] Add `title` field to `SummaryProgress` interface
  - Make it optional: `title?: string`
  - Add JSDoc comment explaining when it's present

**Code Changes:**
```typescript
export interface SummaryProgress {
  status: JobStatus;
  progress: number;
  message?: string;
  chunk?: string;
  title?: string; // AI-generated title (quick or refined)
  data?: SummaryResponse;
  error?: string;
  job_id?: string;
}
```

#### 2.4 Integrate Quick Title Generation

**File:** `backend/src/services/summary.service.ts`

- [ ] Find transcript fetch completion point
  - Locate where `fetchTranscriptsBatch()` completes
  - Should be around line 300-400 in `processBatch()`
  - After all transcripts are successfully fetched
  - Before pre-condensing starts

- [ ] Add quick title generation
  - Combine all transcript texts with video titles
  - Call `generateTitle()` with transcripts context
  - Handle null return (generation failed)
  - Log success/failure

- [ ] Update summary document with quick title
  - Get summary document ID (may need to create summary first or use jobId)
  - Call `updateSummaryTitle()` with quick title
  - Handle errors gracefully (don't fail summary processing)

- [ ] Broadcast title update to clients
  - Add `title: quickTitle` to `SummaryProgress` object
  - Call `broadcastJobProgress()` with title included
  - Maintain current status and progress
  - Don't change status just for title update

**Code Implementation:**
```typescript
// After transcripts are fetched (around line 300-400)
const transcripts = await fetchTranscriptsBatch(...);

// Generate quick title from transcripts (non-blocking)
let quickTitle: string | null = null;
try {
  logger.info('[Summary Service] Generating quick title from transcripts', { jobId });
  
  // Combine all transcripts with video titles
  const allTranscriptText = transcripts
    .map(t => `${t.title}: ${t.transcript}`)
    .join('\n\n');
  
  quickTitle = await generateTitle(allTranscriptText, 'transcripts');
  
  if (quickTitle) {
    logger.info('[Summary Service] Quick title generated', { jobId, title: quickTitle });
    
    // Update summary document if it exists, otherwise store for later
    // Note: Summary may not exist yet, so we'll update it when creating the summary
    // For now, just broadcast the title
    
    // Broadcast title update to clients
    broadcastJobProgress(jobId, {
      status: 'processing', // Keep current status
      progress: progressPercentages.transcripts_fetched, // Current progress
      message: 'Processing transcripts...', // Current message
      title: quickTitle,
    });
    
    if (progressCallback) {
      progressCallback({
        status: 'processing',
        progress: progressPercentages.transcripts_fetched,
        message: 'Processing transcripts...',
        title: quickTitle,
      });
    }
  } else {
    logger.warn('[Summary Service] Quick title generation returned null', { jobId });
  }
} catch (titleError) {
  logger.warn('[Summary Service] Quick title generation failed, continuing', {
    jobId,
    error: titleError instanceof Error ? titleError.message : String(titleError),
  });
  // Don't fail the whole process if title generation fails
}
```

#### 2.5 Update Summary Creation to Include Quick Title

**File:** `backend/src/services/summary.service.ts`

- [ ] Store quick title when creating summary
  - Pass quick title to `createSummary()` function
  - Use quick title in `batch_title` field if available
  - Fallback to default title generation if quick title is null

**Code Changes:**
```typescript
// When creating summary (around line 800-900)
const batchTitle = quickTitle || generateBatchTitle(sourceVideos);

const summaryId = await createSummary({
  // ... other fields
  batch_title: batchTitle,
  // ...
});
```

#### 2.6 Add Retry Logic (Optional Enhancement)

- [ ] Add retry mechanism for title generation
  - Retry up to 2 times on failure
  - Use exponential backoff (1s, 2s)
  - Only retry on network/timeout errors
  - Don't retry on invalid response errors

#### 2.7 Unit Tests

**File:** `backend/__tests__/unit/services/ai.service.test.ts`

- [ ] Test `generateTitle()` with valid transcripts
  - Mock `callQwenFlash()` to return valid title
  - Verify title is cleaned (quotes removed, trimmed)
  - Verify max length is enforced

- [ ] Test `generateTitle()` with valid summary
  - Mock `callQwenFlash()` to return valid title
  - Verify different prompt is used

- [ ] Test `generateTitle()` error handling
  - Mock `callQwenFlash()` to return error
  - Verify function returns null
  - Verify error is logged

- [ ] Test title cleaning logic
  - Test with quotes: `"Title Here"`
  - Test with newlines: `"Title\nHere"`
  - Test with long title (> 60 chars)
  - Test with short title (< 5 chars)

### Acceptance Criteria

- ✅ `generateTitle()` function exists and works correctly
- ✅ Quick title is generated after transcripts are fetched
- ✅ Title is broadcast to clients via SSE
- ✅ Title is stored in database
- ✅ Errors don't block summary processing
- ✅ Fallback to default title if generation fails
- ✅ Unit tests pass

---

## Phase 3: Quick Title Generation (Frontend)

**Duration:** 1-2 hours  
**Goal:** Display quick title in the summarizing UI and handle title updates

### Tasks

#### 3.1 Update Summary Progress Type

**File:** `frontend/src/types/index.ts`

- [ ] Add `title` field to `SummaryProgress` interface
  - Make it optional: `title?: string`
  - Add JSDoc comment

**Code Changes:**
```typescript
export interface SummaryProgress {
  status: JobStatus;
  progress: number;
  message?: string;
  chunk?: string;
  title?: string; // AI-generated title (quick or refined)
  data?: SummaryResponse;
  error?: string;
  job_id?: string;
}
```

#### 3.2 Update useSummaryStream Hook

**File:** `frontend/src/hooks/useSummaryStream.ts`

- [ ] Add title state
  - Add `const [title, setTitle] = useState<string | null>(null);`
  - Initialize to null

- [ ] Handle title in SSE event handler
  - Check if `event.title` exists
  - Update title state: `setTitle(event.title)`
  - Log title update for debugging

- [ ] Reset title on job start
  - Set title to null when starting new job
  - In `startJob()` function or `reset()` function

- [ ] Return title in hook return
  - Add `title` to return object
  - Export title for use in components

**Code Changes:**
```typescript
const [title, setTitle] = useState<string | null>(null);

// In SSE event handler:
if (event.title) {
  setTitle(event.title);
  logger.debug('[useSummaryStream] Title updated', { title: event.title });
}

// In reset function:
const reset = () => {
  // ... existing reset code
  setTitle(null);
};

// In return:
return {
  // ... existing returns
  title,
};
```

#### 3.3 Display Title in Summarizing UI

**File:** `frontend/src/components/dashboard/SummaryResult.tsx` (or relevant component)

- [ ] Import title from hook
  - Get `title` from `useSummaryStream()` hook
  - Or from props if passed down

- [ ] Display title when available
  - Show title above summary content
  - Use config values: `typography.fontSize["2xl"]`, `typography.fontWeight.bold`, `colors.text.primary`, `spacing.margin.md`
  - Show loading state if title is null but summary is processing
  - Animate title appearance using `motionVariants.fadeInUp` or similar

- [ ] Handle title updates
  - Title may update from quick to refined
  - Smoothly transition between titles using Framer Motion
  - Use `key` prop to trigger animation on title change

**Code Implementation:**
```tsx
import { motion } from 'framer-motion';
import { typography, spacing, colors, motionVariants } from '@/config/visual-effects';
import { useSummaryStream } from '@/hooks/useSummaryStream';

const { title, status, streamedText } = useSummaryStream();

return (
  <div>
    {title && (
      <motion.h2
        key={title} // Re-render when title changes
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{ duration: animationDurations.textChunkFadeIn }}
        className={cn(
          typography.fontSize["2xl"],
          typography.fontWeight.bold,
          spacing.margin.md,
          colors.text.primary
        )}
      >
        {title}
      </motion.h2>
    )}
    {/* Rest of summary content */}
  </div>
);
```

#### 3.4 Update Summary Card to Show Title

**File:** `frontend/src/components/history/SummaryCard.tsx`

- [ ] Verify title is displayed
  - Title should already be shown via `summary.batch_title`
  - No changes needed if using existing field
  - Test that title updates when refined title arrives

#### 3.5 Test Title Display

- [ ] Test quick title appears
  - Start summary job
  - Verify title appears after transcripts are fetched
  - Verify title is displayed in UI

- [ ] Test title update animation
  - Verify smooth transition when title updates
  - Verify no layout shift

### Acceptance Criteria

- ✅ Title state is managed in `useSummaryStream` hook
- ✅ Title is displayed in summarizing UI
- ✅ Title updates smoothly when received
- ✅ Title appears in history page (via existing `batch_title` field)
- ✅ No layout shift when title appears

---

## Phase 4: Refined Title Generation

**Duration:** 2-3 hours  
**Goal:** Generate refined title from completed summary and replace quick title

### Tasks

#### 4.1 Add Refined Title Generation

**File:** `backend/src/services/summary.service.ts`

- [ ] Find summary completion point
  - Locate where final summary is generated
  - Should be after `callQwenPlus()` or `callQwenMax()` completes
  - Around line 800-900 in `processBatch()`

- [ ] Add refined title generation
  - Call `generateTitle()` with summary context
  - Use full summary text (not truncated)
  - Handle null return (generation failed)
  - Log success/failure

- [ ] Update summary document with refined title
  - Call `updateSummaryTitle()` with refined title
  - Replace quick title with refined title
  - Handle errors gracefully

- [ ] Broadcast refined title update
  - Add `title: refinedTitle` to `SummaryProgress` object
  - Call `broadcastJobProgress()` with refined title
  - Include in `completed` status event
  - Include in final `data` object

**Code Implementation:**
```typescript
// After final summary is generated (around line 800-900)
const finalSummary = aiResult.content;

// Generate refined title from summary (non-blocking)
let refinedTitle: string | null = null;
try {
  logger.info('[Summary Service] Generating refined title from summary', { jobId });
  
  refinedTitle = await generateTitle(finalSummary, 'summary');
  
  if (refinedTitle) {
    logger.info('[Summary Service] Refined title generated', { jobId, title: refinedTitle });
    
    // Update summary document with refined title
    await updateSummaryTitle(summaryId, refinedTitle);
    
    // Broadcast refined title update to clients
    broadcastJobProgress(jobId, {
      status: 'completed',
      progress: 100,
      message: 'Summary completed',
      title: refinedTitle,
      data: {
        ...summaryData,
        batch_title: refinedTitle,
      },
    });
    
    if (progressCallback) {
      progressCallback({
        status: 'completed',
        progress: 100,
        message: 'Summary completed',
        title: refinedTitle,
        data: {
          ...summaryData,
          batch_title: refinedTitle,
        },
      });
    }
  } else if (quickTitle) {
    // Keep quick title if refined title generation fails
    logger.info('[Summary Service] Refined title generation failed, keeping quick title', { 
      jobId,
      quickTitle,
    });
    
    // Still broadcast completion with quick title
    broadcastJobProgress(jobId, {
      status: 'completed',
      progress: 100,
      message: 'Summary completed',
      title: quickTitle, // Use quick title as fallback
      data: {
        ...summaryData,
        batch_title: quickTitle,
      },
    });
  }
} catch (titleError) {
  logger.warn('[Summary Service] Refined title generation failed, keeping quick title', {
    jobId,
    error: titleError instanceof Error ? titleError.message : String(titleError),
    quickTitle,
  });
  
  // Fallback to quick title or default title
  const finalTitle = quickTitle || generateBatchTitle(sourceVideos);
  
  // Broadcast completion with fallback title
  broadcastJobProgress(jobId, {
    status: 'completed',
    progress: 100,
    message: 'Summary completed',
    title: finalTitle,
    data: {
      ...summaryData,
      batch_title: finalTitle,
    },
  });
}
```

#### 4.2 Update Summary Creation to Use Refined Title

**File:** `backend/src/services/summary.service.ts`

- [ ] Ensure summary is created with best available title
  - Use refined title if available
  - Fallback to quick title if refined failed
  - Fallback to default title if both failed
  - Update summary document after creation if needed

#### 4.3 Handle Title Update in Frontend

**File:** `frontend/src/hooks/useSummaryStream.ts`

- [ ] Handle refined title update
  - Title may update from quick to refined
  - Update state when new title arrives
  - Trigger re-render with new title

- [ ] Animate title update
  - Smoothly transition from quick to refined title
  - Use fade or slide animation
  - Don't cause layout shift

**Code Changes:**
```typescript
// In SSE event handler:
if (event.title) {
  // If title already exists, this is a refined title update
  if (title && title !== event.title) {
    logger.debug('[useSummaryStream] Title refined', { 
      quickTitle: title,
      refinedTitle: event.title,
    });
  }
  setTitle(event.title);
}
```

#### 4.4 Display Title Update Animation

**File:** `frontend/src/components/dashboard/SummaryResult.tsx`

- [ ] Add title update animation
  - Use `motion` component with `key` prop
  - Key changes when title changes, triggering animation
  - Use config animation duration: `animationDurations.textChunkFadeIn`
  - Use config typography and spacing values

**Code Implementation:**
```tsx
import { motion } from 'framer-motion';
import { typography, spacing, colors, animationDurations } from '@/config/visual-effects';

<motion.h2
  key={title} // Re-render when title changes
  initial={{ opacity: 0, y: -5 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 5 }}
  transition={{ duration: animationDurations.textChunkFadeIn }}
  className={cn(
    typography.fontSize["2xl"],
    typography.fontWeight.bold,
    spacing.margin.md,
    colors.text.primary
  )}
>
  {title}
</motion.h2>
```

#### 4.5 Test Title Replacement Flow

- [ ] Test quick title appears first
  - Verify quick title shows after transcripts
  - Verify title is stored in database

- [ ] Test refined title replaces quick title
  - Verify refined title appears after summary completion
  - Verify smooth transition
  - Verify database is updated

- [ ] Test fallback scenarios
  - Test when refined title generation fails (keep quick title)
  - Test when both fail (use default title)

### Acceptance Criteria

- ✅ Refined title is generated after summary completion
- ✅ Refined title replaces quick title in database
- ✅ Refined title update is broadcast to clients
- ✅ Frontend smoothly transitions from quick to refined title
- ✅ Fallback to quick title if refined generation fails
- ✅ All error scenarios handled gracefully

---

## Phase 5: Testing & Polish

**Duration:** 2-3 hours  
**Goal:** Comprehensive testing, error handling, and documentation

### Tasks

#### 5.1 End-to-End Testing

- [ ] Test complete title generation flow
  - Start summary job
  - Verify quick title appears after transcripts
  - Verify refined title replaces quick title
  - Verify title persists in database
  - Verify title appears in history

- [ ] Test with various scenarios
  - Single video summary
  - Multiple video summary (3 videos)
  - Large batch (10+ videos)
  - Short transcripts (< 500 words)
  - Long transcripts (> 5000 words)
  - Various video topics

#### 5.2 Error Scenario Testing

- [ ] Test AI service failures
  - Mock AI service timeout
  - Mock AI service error
  - Verify fallback to default title
  - Verify summary processing continues

- [ ] Test network failures
  - Simulate network error during title generation
  - Verify graceful degradation
  - Verify error logging

- [ ] Test invalid responses
  - Mock empty response from AI
  - Mock malformed response
  - Verify null handling

#### 5.3 Performance Testing

- [ ] Measure title generation time
  - Quick title generation: should be < 3 seconds
  - Refined title generation: should be < 2 seconds
  - Total additional time: should be < 5 seconds

- [ ] Verify non-blocking behavior
  - Summary processing should not wait for title generation
  - Title generation should be async
  - No delays in summary completion

- [ ] Monitor token usage
  - Verify token usage is reasonable (< 500 tokens per generation)
  - Verify cost impact is minimal

#### 5.4 Title Quality Review

- [ ] Review generated titles
  - Check title length (should be 30-50 characters)
  - Check title descriptiveness
  - Check title relevance to content
  - Identify patterns or issues

- [ ] Tune prompts if needed
  - Adjust system prompts for better quality
  - Adjust temperature if needed
  - Test with different prompt variations

#### 5.5 Modal Testing

- [ ] Test modal on all devices
  - Desktop (multiple resolutions)
  - Tablet (iPad, Android tablets)
  - Mobile (iPhone, Android phones)

- [ ] Test modal with various content
  - Short summaries
  - Long summaries (scrollable)
  - Multiple source videos
  - Edge cases

- [ ] Test modal accessibility
  - Keyboard navigation
  - Screen reader compatibility
  - Focus management

#### 5.6 Documentation Updates

- [ ] Update API documentation
  - Document `title` field in `SummaryProgress`
  - Document title generation behavior
  - Document error handling

- [ ] Update code comments
  - Add JSDoc comments to new functions
  - Document title generation flow
  - Document error handling strategies

- [ ] Update user-facing documentation
  - Explain AI-generated titles
  - Explain title updates
  - Update screenshots if needed

#### 5.7 Code Review Checklist

- [ ] Code follows project style guide
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate
- [ ] No console.log statements
- [ ] TypeScript types are correct
- [ ] No unused imports
- [ ] Comments are clear and helpful

### Acceptance Criteria

- ✅ All tests pass (unit, integration, E2E)
- ✅ Error scenarios handled gracefully
- ✅ Performance meets requirements (< 5 seconds total)
- ✅ Title quality is acceptable
- ✅ Modal works on all devices
- ✅ Documentation is updated
- ✅ Code review completed

---

## Dependencies & Prerequisites

### Backend Dependencies

- ✅ `qwen-flash` model access (already available)
- ✅ DashScope API integration (already integrated)
- ✅ `callQwenFlash()` function (already exists)
- ✅ Summary model and database (already exists)
- ✅ SSE broadcasting infrastructure (already exists)

### Frontend Dependencies

- ✅ Framer Motion (already installed)
- ✅ Tailwind CSS (already installed)
- ✅ React hooks (already available)
- ✅ SSE client infrastructure (already exists)

### No New Dependencies Required

All required dependencies are already in place. No new packages need to be installed.

---

## Testing Strategy

### Unit Tests

**Backend:**
- `generateTitle()` function with various inputs
- Title cleaning logic
- Error handling
- `updateSummaryTitle()` function

**Frontend:**
- Title state management in hook
- Title display component
- Modal positioning calculations

### Integration Tests

**Backend:**
- Quick title generation after transcript fetch
- Refined title generation after summary completion
- Title update broadcasting
- Database updates

**Frontend:**
- Title display in UI
- Title update animations
- Modal open/close flow

### End-to-End Tests

- Complete summary flow with title generation
- Title appears in history
- Title updates from quick to refined
- Error scenarios (AI service down, timeout)

### Manual Testing

- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on multiple devices (desktop, tablet, mobile)
- Test with various content lengths
- Test accessibility (keyboard, screen reader)
- Test error scenarios

---

## Risk Mitigation

### Risk 1: AI Service Latency

**Impact:** High  
**Probability:** Medium  
**Mitigation:**
- Use fastest model (qwen-flash)
- Make title generation async and non-blocking
- Set timeout (5 seconds)
- Fallback to default title on timeout

### Risk 2: Poor Title Quality

**Impact:** Medium  
**Probability:** Medium  
**Mitigation:**
- Iterative prompt tuning
- Test with various content types
- Collect user feedback
- Fallback to default title if quality is poor

### Risk 3: Increased API Costs

**Impact:** Low  
**Probability:** Low  
**Mitigation:**
- Use cheapest model (qwen-flash)
- Limit token usage (2000 chars for transcripts, 100 tokens max)
- Monitor token usage
- Cache results if possible (future enhancement)

### Risk 4: Title Generation Blocking Summary

**Impact:** High  
**Probability:** Low  
**Mitigation:**
- Make title generation completely async
- Don't await title generation before continuing
- Comprehensive error handling
- Fallback to default title

### Risk 5: Modal Breaking on Some Devices

**Impact:** Medium  
**Probability:** Low  
**Mitigation:**
- Test on multiple devices and browsers
- Use standard CSS (flexbox, transforms)
- Progressive enhancement
- Graceful degradation

---

## Success Criteria

### History Modal Fix

- ✅ **Modal Centering:** 100% of modals properly centered on all devices
- ✅ **Content Visibility:** 100% of summary content visible and scrollable
- ✅ **Performance:** Modal open animation < 300ms
- ✅ **Accessibility:** Keyboard navigation works, screen reader compatible
- ✅ **Responsiveness:** Works on mobile, tablet, desktop

### Title Generation

- ✅ **Quick Title Success Rate:** > 95%
- ✅ **Quick Title Generation Time:** < 3 seconds
- ✅ **Refined Title Success Rate:** > 90%
- ✅ **Refined Title Generation Time:** < 2 seconds
- ✅ **Total Additional Processing Time:** < 5 seconds
- ✅ **Title Quality:** Descriptive, relevant, 30-50 characters
- ✅ **Error Handling:** All errors handled gracefully, no blocking

### Overall

- ✅ **User Experience:** Smooth title updates, properly centered modals
- ✅ **Performance:** No degradation in summary processing time
- ✅ **Reliability:** System continues to work even if title generation fails
- ✅ **Documentation:** All code documented, user docs updated

---

## Timeline Summary

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Modal Fix | 2-4 hours | Day 1 AM | Day 1 PM |
| Phase 2: Quick Title (Backend) | 3-4 hours | Day 1 PM | Day 2 AM |
| Phase 3: Quick Title (Frontend) | 1-2 hours | Day 2 AM | Day 2 PM |
| Phase 4: Refined Title | 2-3 hours | Day 2 PM | Day 3 AM |
| Phase 5: Testing & Polish | 2-3 hours | Day 3 AM | Day 3 PM |

**Total: 10-16 hours (2-3 days)**

---

## Appendix: Code Snippets

### Complete Title Generation Function

See PRD Appendix A.2 for complete implementation.

### Complete Modal Fix

See PRD Appendix A.1 for complete implementation.

---

## Document Approval

- **Author:** AI Assistant
- **Reviewers:** [To be assigned]
- **Status:** Ready for Implementation

