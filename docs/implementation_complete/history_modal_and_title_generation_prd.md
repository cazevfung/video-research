# History Modal Fix & AI-Generated Title Feature PRD

## Document Information
- **Version:** 1.0
- **Date:** January 2026
- **Status:** Draft
- **Related Documents:**
  - `frontend_prd.md`
  - `backend_prd.md`
  - `streaming_ai_output_prd.md`

---

## Table of Contents
1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Requirements](#requirements)
4. [Technical Specifications](#technical-specifications)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Success Metrics](#success-metrics)

---

## 1. Overview

This PRD addresses two critical issues:

1. **History Modal Positioning Bug**: The summary detail modal appears at the bottom of the screen instead of being centered, and summary content may not be visible properly.

2. **AI-Generated Title Feature**: Implement intelligent title generation using qwen-flash model to create contextual, meaningful titles for summaries at two stages:
   - Quick title generation after transcripts are obtained (for immediate user feedback)
   - Refined title generation after summary completion (for final, context-aware title)

---

## 2. Problem Statement

### 2.1 History Modal Issues

**Current Behavior:**
- When clicking a summary card in the history page, the modal appears at the bottom of the viewport
- The modal uses `inset-4` positioning which doesn't properly center it vertically
- Summary content may be cut off or not fully visible
- Modal may not be scrollable or properly contained

**Root Cause:**
- The modal positioning uses `fixed inset-4` which sets all sides to 1rem, but doesn't center the modal
- Missing proper vertical centering mechanism
- Modal height calculation may not account for viewport constraints

### 2.2 Title Generation Gap

**Current Behavior:**
- Titles are generated using simple string concatenation: "Summary of X Videos" or first video title
- No AI-powered contextual understanding
- Titles don't reflect the actual content or themes of the videos
- No progressive title updates during processing

**User Impact:**
- Generic, unhelpful titles in history
- Users can't quickly identify summaries by content
- Poor user experience when browsing multiple summaries

---

## 3. Requirements

### 3.1 History Modal Fix (Priority: High)

#### 3.1.1 Functional Requirements

**FR-1.1: Modal Positioning**
- Modal must be centered both horizontally and vertically in the viewport
- Modal must maintain proper spacing from viewport edges (minimum 1rem/16px)
- Modal must be responsive and work on mobile, tablet, and desktop
- Modal must remain centered when content height changes

**FR-1.2: Modal Visibility**
- Summary content must be fully visible and scrollable
- Modal must not be cut off at viewport edges
- Modal backdrop must properly cover entire viewport
- Modal must handle long content gracefully with internal scrolling

**FR-1.3: Modal Behavior**
- Modal must close on backdrop click
- Modal must close on Escape key press
- Modal must maintain focus trap for accessibility
- Modal must prevent body scroll when open

#### 3.1.2 Non-Functional Requirements

**NFR-1.1: Performance**
- Modal open/close animation must be smooth (< 300ms)
- No layout shift when modal opens
- Smooth scrolling within modal content

**NFR-1.2: Accessibility**
- Modal must be keyboard navigable
- Focus must be trapped within modal
- ARIA labels must be properly set
- Screen reader announcements must work correctly

### 3.2 AI-Generated Title Feature (Priority: High)

#### 3.2.1 Functional Requirements

**FR-2.1: Quick Title Generation**
- After all transcripts are successfully fetched, immediately call qwen-flash to generate a quick title
- Quick title must be generated within 2-3 seconds
- Quick title must be displayed in the summarizing UI immediately
- Quick title must be stored temporarily in the summary document

**FR-2.2: Refined Title Generation**
- After final summary is completed, call qwen-flash again with the full summary text
- Refined title must replace the quick title
- Refined title must be contextually aware of the summary content
- Refined title must be stored permanently in the summary document

**FR-2.3: Title Display**
- Title must appear in:
  - Summarizing UI (during processing)
  - History page (summary cards)
  - Summary detail modal
  - Any other pages displaying summaries
- Title must update smoothly when refined title replaces quick title
- Title must be editable by users (future enhancement, out of scope)

**FR-2.4: Title Quality**
- Titles must be concise (max 60 characters recommended)
- Titles must be descriptive and reflect content themes
- Titles must avoid generic phrases like "Summary of X Videos"
- Titles must be grammatically correct

**FR-2.5: Error Handling**
- If quick title generation fails, fall back to default title generation
- If refined title generation fails, keep quick title
- Errors must not block summary processing
- Errors must be logged but not shown to users

#### 3.2.2 Non-Functional Requirements

**NFR-2.1: Performance**
- Quick title generation must not delay transcript processing
- Refined title generation must not delay summary completion
- Title generation must be asynchronous and non-blocking
- Total additional processing time must be < 5 seconds

**NFR-2.2: Cost Efficiency**
- Use qwen-flash (cheapest model) for both title generations
- Minimize token usage in title generation prompts
- Cache title generation results if possible

**NFR-2.3: Reliability**
- Title generation must have retry logic (max 2 retries)
- Title generation must have timeout (5 seconds)
- Graceful degradation if AI service is unavailable

---

## 4. Technical Specifications

### 4.1 History Modal Fix

#### 4.1.1 Frontend Changes

**File: `frontend/src/components/history/SummaryDetailView.tsx`**

**Current Implementation:**
```tsx
<motion.div
  className={cn("fixed z-50 mx-auto overflow-hidden", historyConfig.modal.inset, historyConfig.modal.maxWidth)}
>
```

**Proposed Implementation:**
```tsx
<motion.div
  className={cn(
    "fixed z-50 mx-auto overflow-hidden",
    "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    "max-h-[90vh] w-full",
    historyConfig.modal.maxWidth
  )}
  style={{
    maxHeight: '90vh',
  }}
>
```

**Alternative Approach (Flexbox Centering):**
```tsx
{/* Backdrop with flex centering */}
<motion.div
  className={cn(
    "fixed inset-0 z-50 backdrop-blur-sm",
    "flex items-center justify-center",
    spacing.padding.md, // Use config spacing
    historyConfig.modal.overlay
  )}
  onClick={onClose}
>
  {/* Modal */}
  <motion.div
    className={cn(
      "relative z-50 overflow-hidden w-full",
      historyConfig.modal.maxWidth,
      historyConfig.modal.maxHeight // Use config value
    )}
    onClick={(e) => e.stopPropagation()}
  >
```

**Key Changes:**
1. Use flexbox centering on backdrop OR transform-based centering on modal
2. Add `max-h-[90vh]` to prevent modal from exceeding viewport height
3. Ensure CardContent has `overflow-y-auto` for internal scrolling
4. Use `spacing.padding.md` from config for consistent spacing

**File: `frontend/src/config/visual-effects.ts`**

**Update `historyConfig.modal`:**
```typescript
modal: {
  overlay: colors.background.overlay,
  maxWidth: "max-w-4xl",
  // Remove inset, use flexbox or transform centering instead
  padding: spacing.padding.md, // Use config spacing for consistency
  animationDuration: animationDurations.pageTransition,
  maxHeight: "max-h-[90vh]", // Prevent overflow
},
```

#### 4.1.2 CSS/Animation Considerations

- Ensure modal animation starts from center, not bottom
- Update initial animation state: `y: 0` instead of `y: 20`
- Add smooth scroll behavior to modal content area
- Ensure backdrop fade-in doesn't cause layout shift

### 4.2 AI-Generated Title Feature

#### 4.2.1 Backend Changes

**File: `backend/src/services/ai.service.ts`**

**New Function: Generate Title**
```typescript
/**
 * Generate a title using qwen-flash model
 * @param content Transcript text or summary text
 * @param context Optional context (e.g., "transcripts" or "summary")
 * @returns Generated title
 */
export async function generateTitle(
  content: string,
  context: 'transcripts' | 'summary' = 'summary'
): Promise<string> {
  const systemPrompt = context === 'transcripts'
    ? `You are a title generator. Generate a concise, descriptive title (max 60 characters) based on video transcripts. 
       The title should capture the main themes and topics discussed. 
       Return ONLY the title, no quotes, no explanation.`
    : `You are a title generator. Generate a concise, descriptive title (max 60 characters) based on a video summary. 
       The title should capture the key insights and main topics. 
       Return ONLY the title, no quotes, no explanation.`;

  const userPrompt = context === 'transcripts'
    ? `Based on these video transcripts, generate a concise title:\n\n${content.substring(0, 2000)}`
    : `Based on this video summary, generate a concise title:\n\n${content}`;

  try {
    const result = await callQwenFlash(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.7,
        max_tokens: 100, // Titles are short
      }
    );

    if (result.error) {
      logger.warn('[Title Generation] Failed to generate title', { error: result.error });
      return null;
    }

    // Clean up the title (remove quotes, trim, etc.)
    let title = result.content.trim();
    title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    title = title.substring(0, 60); // Enforce max length
    
    return title || null;
  } catch (error) {
    logger.error('[Title Generation] Error generating title', { error });
    return null;
  }
}
```

**File: `backend/src/services/summary.service.ts`**

**Update `processBatch` function:**

1. **After transcripts are fetched (around line 300-400):**
```typescript
// After all transcripts are successfully fetched
const transcripts = await fetchTranscriptsBatch(...);

// Generate quick title from transcripts
let quickTitle: string | null = null;
try {
  logger.info('[Summary Service] Generating quick title from transcripts', { jobId });
  const allTranscriptText = transcripts
    .map(t => `${t.title}: ${t.transcript}`)
    .join('\n\n');
  
  quickTitle = await generateTitle(allTranscriptText, 'transcripts');
  
  if (quickTitle) {
    logger.info('[Summary Service] Quick title generated', { jobId, title: quickTitle });
    
    // Update summary document with quick title
    await updateSummaryTitle(jobId, quickTitle);
    
    // Broadcast title update to clients
    broadcastJobProgress(jobId, {
      status: 'processing', // Keep current status
      progress: currentProgress,
      message: currentMessage,
      title: quickTitle, // Add title to progress event
    });
  }
} catch (titleError) {
  logger.warn('[Summary Service] Quick title generation failed, continuing', {
    jobId,
    error: titleError,
  });
  // Don't fail the whole process if title generation fails
}
```

2. **After summary is completed (around line 800-900):**
```typescript
// After final summary is generated
const finalSummary = aiResult.content;

// Generate refined title from summary
let refinedTitle: string | null = null;
try {
  logger.info('[Summary Service] Generating refined title from summary', { jobId });
  
  refinedTitle = await generateTitle(finalSummary, 'summary');
  
  if (refinedTitle) {
    logger.info('[Summary Service] Refined title generated', { jobId, title: refinedTitle });
    
    // Update summary document with refined title
    await updateSummaryTitle(jobId, refinedTitle);
    
    // Broadcast title update to clients
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
  } else if (quickTitle) {
    // Keep quick title if refined title generation fails
    logger.info('[Summary Service] Refined title generation failed, keeping quick title', { jobId });
  }
} catch (titleError) {
  logger.warn('[Summary Service] Refined title generation failed, keeping quick title', {
    jobId,
    error: titleError,
  });
  // Don't fail the whole process if title generation fails
}
```

**File: `backend/src/models/Summary.ts`**

**Add helper function:**
```typescript
/**
 * Update summary title
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

**File: `backend/src/types/summary.types.ts`**

**Update `SummaryProgress` interface:**
```typescript
export interface SummaryProgress {
  status: JobStatus;
  progress: number;
  message?: string;
  chunk?: string;
  title?: string; // Add title field
  data?: SummaryResponse;
  error?: string;
  job_id?: string;
}
```

#### 4.2.2 Frontend Changes

**File: `frontend/src/types/index.ts`**

**Update `SummaryProgress` interface:**
```typescript
export interface SummaryProgress {
  status: JobStatus;
  progress: number;
  message?: string;
  chunk?: string;
  title?: string; // Add title field
  data?: SummaryResponse;
  error?: string;
  job_id?: string;
}
```

**File: `frontend/src/hooks/useSummaryStream.ts`**

**Add title state and handling:**
```typescript
const [title, setTitle] = useState<string | null>(null);

// In the SSE event handler:
if (event.title) {
  setTitle(event.title);
}

// Return title in hook return:
return {
  // ... existing returns
  title, // Add title
};
```

**File: `frontend/src/components/dashboard/SummaryResult.tsx` (or wherever summary is displayed)**

**Display title:**
```typescript
import { typography, spacing, colors } from '@/config/visual-effects';

{title && (
  <motion.h2
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
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
```

**File: `frontend/src/app/app/history/page.tsx`**

**Title is already displayed via `summary.batch_title` in SummaryCard component - no changes needed**

#### 4.2.3 Prompt Engineering

**Quick Title Prompt (from transcripts):**
```
System: You are a title generator. Generate a concise, descriptive title (max 60 characters) based on video transcripts. 
The title should capture the main themes and topics discussed. 
Return ONLY the title, no quotes, no explanation.

User: Based on these video transcripts, generate a concise title:

[First 2000 characters of combined transcripts]
```

**Refined Title Prompt (from summary):**
```
System: You are a title generator. Generate a concise, descriptive title (max 60 characters) based on a video summary. 
The title should capture the key insights and main topics. 
Return ONLY the title, no quotes, no explanation.

User: Based on this video summary, generate a concise title:

[Full summary text]
```

---

## 5. Implementation Plan

### 5.1 Phase 1: History Modal Fix (Priority: Critical)

**Estimated Time:** 2-4 hours

**Tasks:**
1. Update `SummaryDetailView.tsx` modal positioning
2. Test on mobile, tablet, desktop viewports
3. Verify scrolling behavior
4. Test accessibility (keyboard navigation, screen readers)
5. Verify animation smoothness

**Acceptance Criteria:**
- Modal is centered vertically and horizontally
- Modal content is fully visible and scrollable
- Modal works on all screen sizes
- No layout shift when opening modal

### 5.2 Phase 2: Quick Title Generation (Priority: High)

**Estimated Time:** 4-6 hours

**Tasks:**
1. Implement `generateTitle` function in `ai.service.ts`
2. Add quick title generation after transcript fetch in `summary.service.ts`
3. Add `title` field to `SummaryProgress` type
4. Update frontend to display quick title
5. Add error handling and fallback logic
6. Test title generation with various transcript lengths

**Acceptance Criteria:**
- Quick title appears within 3 seconds of transcript fetch
- Title is displayed in summarizing UI
- Title is stored in database
- Fallback to default title if generation fails
- No impact on summary processing time

### 5.3 Phase 3: Refined Title Generation (Priority: High)

**Estimated Time:** 3-4 hours

**Tasks:**
1. Add refined title generation after summary completion
2. Update summary document with refined title
3. Broadcast title update to clients
4. Update frontend to handle title updates
5. Test title replacement flow
6. Verify title quality

**Acceptance Criteria:**
- Refined title replaces quick title after summary completion
- Title update is broadcast to connected clients
- Title is stored permanently in database
- Title quality is better than quick title
- Fallback to quick title if refined generation fails

### 5.4 Phase 4: Testing & Polish (Priority: Medium)

**Estimated Time:** 2-3 hours

**Tasks:**
1. End-to-end testing of title generation flow
2. Test error scenarios (AI service down, timeout, etc.)
3. Performance testing (ensure no delays)
4. Title quality review and prompt tuning
5. Documentation updates

**Acceptance Criteria:**
- All error scenarios handled gracefully
- Performance impact is minimal (< 5 seconds total)
- Titles are high quality and contextual
- Documentation is updated

---

## 6. Testing Strategy

### 6.1 History Modal Fix Testing

**Unit Tests:**
- Test modal positioning calculations
- Test responsive breakpoints
- Test animation states

**Integration Tests:**
- Test modal open/close flow
- Test scrolling within modal
- Test keyboard navigation

**Manual Testing:**
- Test on Chrome, Firefox, Safari
- Test on mobile (iOS Safari, Chrome Android)
- Test on tablet (iPad)
- Test with various content lengths
- Test with screen readers (NVDA, VoiceOver)

### 6.2 Title Generation Testing

**Unit Tests:**
- Test `generateTitle` function with various inputs
- Test title cleaning logic (quote removal, truncation)
- Test error handling

**Integration Tests:**
- Test quick title generation after transcript fetch
- Test refined title generation after summary completion
- Test title update broadcast
- Test fallback to default title on failure

**Manual Testing:**
- Test with 1 video, 3 videos, 10 videos
- Test with short transcripts (< 500 words)
- Test with long transcripts (> 5000 words)
- Test with various video topics
- Test error scenarios (AI service timeout, network error)

**Performance Testing:**
- Measure time to generate quick title
- Measure time to generate refined title
- Verify no blocking of summary processing
- Monitor token usage

---

## 7. Success Metrics

### 7.1 History Modal Fix

- **Modal Centering:** 100% of modals properly centered on all devices
- **Content Visibility:** 100% of summary content visible and scrollable
- **Performance:** Modal open animation < 300ms
- **Accessibility:** Keyboard navigation works, screen reader compatible

### 7.2 Title Generation

- **Quick Title Generation:** 
  - Success rate > 95%
  - Generation time < 3 seconds
  - Displayed within 5 seconds of transcript fetch

- **Refined Title Generation:**
  - Success rate > 90%
  - Generation time < 2 seconds
  - Replaces quick title within 2 seconds of summary completion

- **Title Quality:**
  - Average title length: 30-50 characters
  - Titles are descriptive (not generic)
  - User satisfaction with titles (future survey)

- **Performance Impact:**
  - Total additional processing time < 5 seconds
  - No blocking of summary processing
  - Token usage < 500 tokens per title generation

---

## 8. Future Enhancements (Out of Scope)

1. **User-Editable Titles:** Allow users to edit generated titles
2. **Title Suggestions:** Provide multiple title options for user selection
3. **Title History:** Track title changes over time
4. **Custom Title Prompts:** Allow users to customize title generation style
5. **Title Templates:** Pre-defined title formats (e.g., "Topic: Key Insight")

---

## 9. Risks & Mitigations

### 9.1 History Modal Fix

**Risk:** Breaking existing modal functionality
**Mitigation:** Thorough testing on all devices, gradual rollout

**Risk:** Performance impact from centering calculations
**Mitigation:** Use CSS transforms (GPU-accelerated), minimal JavaScript

### 9.2 Title Generation

**Risk:** AI service latency affecting user experience
**Mitigation:** Async generation, don't block summary processing, use fast model (qwen-flash)

**Risk:** Poor title quality
**Mitigation:** Iterative prompt tuning, fallback to default titles, user feedback collection

**Risk:** Increased API costs
**Mitigation:** Use cheapest model (qwen-flash), limit token usage, cache results if possible

**Risk:** Title generation failures blocking summary completion
**Mitigation:** Comprehensive error handling, fallback to default titles, non-blocking implementation

---

## 10. Dependencies

### 10.1 History Modal Fix
- Framer Motion (already installed)
- Tailwind CSS (already installed)
- No new dependencies

### 10.2 Title Generation
- qwen-flash model access (already available)
- DashScope API (already integrated)
- No new dependencies

---

## 11. Rollout Plan

### 11.1 History Modal Fix
1. Deploy to staging
2. Test on staging for 24 hours
3. Deploy to production
4. Monitor for issues

### 11.2 Title Generation
1. Deploy backend changes (title generation)
2. Deploy frontend changes (title display)
3. Test on staging with real summaries
4. Monitor title quality and performance
5. Deploy to production
6. Monitor error rates and title quality

---

## Appendix A: Code Examples

### A.1 Complete Modal Fix Example

```tsx
// SummaryDetailView.tsx - Complete fix
import { colors, spacing, historyConfig, animationDurations } from '@/config/visual-effects';

return (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop with flex centering */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 backdrop-blur-sm",
            "flex items-center justify-center",
            spacing.padding.md, // Use config spacing
            historyConfig.modal.overlay
          )}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: historyConfig.modal.animationDuration }}
          className={cn(
            "relative z-50 mx-auto w-full overflow-hidden",
            historyConfig.modal.maxWidth,
            historyConfig.modal.maxHeight // Use config value
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className={cn(
            "flex h-full flex-col",
            `border ${colors.border.default} ${colors.background.secondary}`
          )}>
            {/* ... rest of modal content ... */}
          </Card>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
```

### A.2 Complete Title Generation Example

```typescript
// ai.service.ts - Complete implementation
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

---

## Document Approval

- **Author:** AI Assistant
- **Reviewers:** [To be assigned]
- **Status:** Ready for Review

