# Smart Research UI & Streaming Improvement Plan

**Document Version**: 1.0  
**Created**: 2026-01-28  
**Status**: Planning  
**Priority**: High  
**Estimated Effort**: 2-3 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Problem Statement](#problem-statement)
4. [Solution Overview](#solution-overview)
5. [Detailed Analysis](#detailed-analysis)
6. [Implementation Plan](#implementation-plan)
7. [Technical Specifications](#technical-specifications)
8. [Testing Strategy](#testing-strategy)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Criteria](#success-criteria)

---

## Executive Summary

### Overview

The smart research feature currently has two critical UX issues that need to be addressed:

1. **UI Jumping Problem**: When interim AI outputs (questions, search terms, videos) are ready for user approval, the page jumps to a completely different UI structure, breaking the visual continuity of the whimsical sidebar + content layout.

2. **No Real-Time Streaming**: Interim AI outputs (questions and search terms) are only displayed after generation completes, rather than streaming in real-time as they're being generated. This reduces user engagement and makes the wait feel longer.

### Goals

- **Unified Layout**: Maintain the whimsical sidebar + content right structure throughout all stages, including approval stages
- **Real-Time Streaming**: Stream interim AI outputs (questions, search terms) as they're generated, similar to how the final summary streams
- **Seamless UX**: Eliminate page jumps and provide smooth transitions between processing and approval stages
- **Consistent Experience**: Users should see the same visual structure whether processing or reviewing interim outputs

### Success Criteria

- ✅ Approval UI uses the same whimsical sidebar + content right structure
- ✅ No page jumps when transitioning between processing and approval stages
- ✅ Questions stream in real-time as they're generated
- ✅ Search terms stream in real-time as they're generated
- ✅ Visual continuity maintained throughout the entire research workflow
- ✅ Performance remains optimal (no degradation from streaming)

---

## Current State Analysis

### Architecture Overview

**Current Layout Structure:**

```
ResearchPage
├── Idle State: ResearchForm (standalone card)
├── Processing/Streaming State: UnifiedStreamingContainer
│   ├── ResearchProgressSidebar (whimsical visualization)
│   └── ResearchResultCard (content area)
└── Approval State: Standalone approval cards (NO sidebar)
```

### Problem 1: UI Jumping

**Current Implementation** (`frontend/src/app/research/page.tsx`):

```typescript
// Lines 224-291: Approval UI renders separately
{state === "awaiting_approval" && (
  <motion.div>
    <div className="...standalone container...">
      <WorkflowProgressTracker />
      {showQuestionApproval && <QuestionApprovalCard />}
      {showSearchTermApproval && <SearchTermApprovalCard />}
      {showVideoApproval && <VideoApprovalCard />}
    </div>
  </motion.div>
)}

// Lines 294-334: Processing/Streaming UI renders separately
{showUnifiedContainer && (
  <motion.div>
    <UnifiedStreamingContainer>
      <ResearchProgressSidebar />
      <ResearchResultCard />
    </UnifiedStreamingContainer>
  </motion.div>
)}
```

**Issues:**
1. **Separate Rendering Contexts**: Approval UI and processing UI are completely separate components
2. **No Sidebar**: Approval stage doesn't use `UnifiedStreamingContainer`, so no whimsical sidebar
3. **Layout Discontinuity**: Page structure changes dramatically when transitioning states
4. **Visual Jump**: User sees a completely different layout, breaking visual continuity

**User Experience Impact:**
- Page "jumps" when approval stage starts
- Whimsical visualization disappears during approval
- Inconsistent visual experience
- Confusing state transitions

### Problem 2: No Real-Time Streaming

**Current Backend Implementation:**

**Question Generation** (`backend/src/services/research-question.service.ts`):
```typescript
// Line 46: Uses callQwenPlus without streaming
const aiResult = await callQwenPlus(prompt, undefined, {
  enable_thinking: searchTermConfig.enable_thinking,
  thinking_budget: searchTermConfig.thinking_budget,
});

// Questions only sent after completion
broadcastJobProgress(jobId, {
  status: 'awaiting_question_approval',
  research_data: { generated_questions: questions }, // Complete array
});
```

**Search Term Generation** (`backend/src/services/research.service.ts`):
```typescript
// Line 176: Uses callQwenPlus without streaming
const aiResult = await callQwenPlus(prompt, undefined, searchTermConfig);

// Search terms only sent after completion
broadcastJobProgress(jobId, {
  status: 'awaiting_search_term_approval',
  research_data: { generated_search_terms: searchTerms }, // Complete array
});
```

**Frontend Handling** (`frontend/src/hooks/useResearchStream.ts`):
```typescript
// Lines 410-420: Only handles complete arrays, no streaming
if (data.research_data?.generated_questions) {
  setWorkflowState(prev => ({
    ...prev,
    questions: data.research_data.generated_questions, // Complete array
  }));
}
```

**Issues:**
1. **No Chunk Streaming**: Questions and search terms are generated but not streamed
2. **All-or-Nothing Display**: Users see nothing until generation completes
3. **Long Wait Times**: 10-15 seconds of "generating..." with no visible progress
4. **Inconsistent with Summary**: Summary streams, but interim outputs don't

**User Experience Impact:**
- Users wait 10-15 seconds with no visible progress
- No engagement during generation
- Perceived wait time feels longer
- Inconsistent experience compared to summary streaming

### Current Streaming Implementation (Summary Only)

**What Works Well:**

The final summary generation already streams correctly:

**Backend** (`backend/src/services/research.service.ts`):
```typescript
// Lines 971-988: Streaming with onChunk callback
const onChunk = (chunk: string) => {
  accumulatedChunkLength += chunk.length;
  broadcastJobProgress(jobId, {
    status: 'generating_summary',
    progress: Math.min(85 + (accumulatedChunkLength / 5000) * 15, 99),
    chunk, // Streamed chunk
  });
};

const aiResult = await callQwenMax(fullPrompt, onChunk);
```

**Frontend** (`frontend/src/hooks/useResearchStream.ts`):
```typescript
// Lines 424-433: Handles streaming chunks
case 'generating_summary':
  if (data.chunk !== undefined) {
    accumulateChunk(data.chunk); // Accumulates chunks
  }
  break;
```

**This pattern should be replicated for questions and search terms.**

---

## Problem Statement

### Problem 1: UI Layout Discontinuity

**Symptom**: Page jumps to a different UI when approval stages begin

**Root Cause**: 
- Approval UI is rendered separately from processing UI
- Approval UI doesn't use `UnifiedStreamingContainer`
- No whimsical sidebar during approval stages

**Impact**:
- Breaks visual continuity
- Confusing user experience
- Inconsistent with rest of application

**User Feedback**: "The page jumps around when I need to approve things"

### Problem 2: No Real-Time Feedback

**Symptom**: Users wait 10-15 seconds with no visible progress during question/search term generation

**Root Cause**:
- Backend doesn't stream chunks for questions/search terms
- Frontend only displays complete arrays
- No incremental updates during generation

**Impact**:
- Poor perceived performance
- Reduced user engagement
- Inconsistent experience (summary streams, but interim outputs don't)

**User Feedback**: "Why can't I see questions being generated like the summary?"

---

## Solution Overview

### Solution 1: Unified Layout Architecture

**Approach**: Integrate approval cards into `UnifiedStreamingContainer` as the content area

**New Layout Structure:**

```
ResearchPage
├── Idle State: ResearchForm (standalone card)
└── Processing/Streaming/Approval State: UnifiedStreamingContainer
    ├── ResearchProgressSidebar (whimsical visualization - ALWAYS VISIBLE)
    └── Content Area (dynamic based on state)
        ├── Processing: ResearchResultCard (with streaming summary)
        ├── Approval: ApprovalCard (questions/search terms/videos)
        └── Transition: Smooth animations between states
```

**Key Changes:**
1. Approval cards render inside `UnifiedStreamingContainer` as content
2. Sidebar remains visible during approval stages
3. Smooth transitions between processing and approval states
4. Consistent visual structure throughout workflow

### Solution 2: Real-Time Streaming

**Approach**: Add streaming support to question and search term generation

**Backend Changes:**
1. Use `callQwenStream` instead of `callQwenPlus` for questions/search terms
2. Implement `onChunk` callbacks to stream partial outputs
3. Parse and broadcast chunks as they arrive
4. Maintain backward compatibility with non-streaming fallback

**Frontend Changes:**
1. Handle streaming chunks for questions/search terms
2. Accumulate and display partial outputs in real-time
3. Update approval cards to show streaming content
4. Maintain existing approval functionality

**Streaming Pattern:**

```
Backend: AI generates → Parse chunks → Broadcast via SSE
Frontend: Receive chunks → Accumulate → Display incrementally
```

---

## Detailed Analysis

### Analysis 1: UI Layout Architecture

#### Current Flow

```
State: idle
  ↓ User submits
State: processing
  ↓ (UnifiedStreamingContainer visible)
State: awaiting_approval
  ↓ (COMPLETE UI REPLACEMENT - NO CONTAINER)
State: processing
  ↓ (UnifiedStreamingContainer visible again)
State: awaiting_approval
  ↓ (COMPLETE UI REPLACEMENT - NO CONTAINER)
... (repeats)
State: streaming
  ↓ (UnifiedStreamingContainer visible)
State: completed
```

**Problems:**
- Multiple UI replacements cause jumps
- Sidebar disappears during approval
- No visual continuity

#### Proposed Flow

```
State: idle
  ↓ User submits
State: processing
  ↓ (UnifiedStreamingContainer visible)
State: awaiting_approval
  ↓ (Same container, content area changes)
State: processing
  ↓ (Same container, content area changes)
State: awaiting_approval
  ↓ (Same container, content area changes)
... (repeats)
State: streaming
  ↓ (Same container, content area changes)
State: completed
```

**Benefits:**
- Single container throughout
- Sidebar always visible
- Smooth content transitions
- Visual continuity maintained

#### Component Structure

**Current:**
```tsx
{state === "awaiting_approval" && (
  <StandaloneApprovalContainer>
    <ApprovalCard />
  </StandaloneApprovalContainer>
)}

{showUnifiedContainer && (
  <UnifiedStreamingContainer>
    <Sidebar />
    <ResultCard />
  </UnifiedStreamingContainer>
)}
```

**Proposed:**
```tsx
{(state === "processing" || state === "streaming" || state === "awaiting_approval") && (
  <UnifiedStreamingContainer>
    <Sidebar />
    {state === "awaiting_approval" ? (
      <ApprovalCard /> // Content area
    ) : (
      <ResultCard /> // Content area
    )}
  </UnifiedStreamingContainer>
)}
```

### Analysis 2: Streaming Implementation

#### Current Backend Flow

**Question Generation:**
```
generateResearchQuestions()
  → callQwenPlus() [NO STREAMING]
  → Wait for complete response
  → Parse questions
  → broadcastJobProgress({ generated_questions: [...] })
```

**Search Term Generation:**
```
generateSearchQueries()
  → callQwenPlus() [NO STREAMING]
  → Wait for complete response
  → Parse search terms
  → broadcastJobProgress({ generated_search_terms: [...] })
```

#### Proposed Backend Flow

**Question Generation:**
```
generateResearchQuestions()
  → callQwenStream() [WITH STREAMING]
  → onChunk callback receives chunks
  → Parse partial questions from chunks
  → broadcastJobProgress({ chunk: "...", partial_questions: [...] })
  → Continue until complete
  → broadcastJobProgress({ generated_questions: [...] })
```

**Search Term Generation:**
```
generateSearchQueries()
  → callQwenStream() [WITH STREAMING]
  → onChunk callback receives chunks
  → Parse partial search terms from chunks
  → broadcastJobProgress({ chunk: "...", partial_search_terms: [...] })
  → Continue until complete
  → broadcastJobProgress({ generated_search_terms: [...] })
```

#### Streaming Challenges

1. **Parsing Partial Outputs**: AI may generate incomplete questions/terms mid-stream
   - **Solution**: Accumulate chunks, parse incrementally, display what's complete

2. **Format Consistency**: Questions/terms may be in JSON or list format
   - **Solution**: Support both formats, parse incrementally

3. **Error Handling**: Streaming may fail mid-generation
   - **Solution**: Fallback to non-streaming mode (like summary does)

4. **State Management**: Need to track partial vs complete outputs
   - **Solution**: Use `partial_questions`/`partial_search_terms` during streaming, `generated_questions`/`generated_search_terms` when complete

### Analysis 3: Frontend State Management

#### Current State Structure

```typescript
// useResearchWorkflow.ts
workflowState: {
  questions: string[]; // Complete array only
  searchTerms: string[]; // Complete array only
  videos: SelectedVideo[]; // Complete array only
}
```

#### Proposed State Structure

```typescript
workflowState: {
  questions: string[]; // Complete array
  partialQuestions: string[]; // During streaming
  isStreamingQuestions: boolean;
  
  searchTerms: string[]; // Complete array
  partialSearchTerms: string[]; // During streaming
  isStreamingSearchTerms: boolean;
  
  videos: SelectedVideo[]; // Complete array
}
```

#### Streaming Display Logic

**Approval Cards:**
```tsx
<ApprovalCard
  items={isStreamingQuestions ? partialQuestions : questions}
  isStreaming={isStreamingQuestions}
  // Show streaming indicator while streaming
/>
```

---

## Implementation Plan

### Phase 1: UI Layout Unification (Week 1)

**Goal**: Integrate approval UI into UnifiedStreamingContainer

#### Task 1.1: Refactor ResearchPage Layout

**Files to Modify:**
- `frontend/src/app/research/page.tsx`

**Changes:**
1. Remove separate approval UI rendering block
2. Integrate approval cards into `UnifiedStreamingContainer` content area
3. Update state logic to keep container visible during approval
4. Add smooth transitions between content types

**Acceptance Criteria:**
- [ ] Approval UI renders inside UnifiedStreamingContainer
- [ ] Sidebar remains visible during approval stages
- [ ] No page jumps when transitioning states
- [ ] Smooth animations between processing and approval
- [ ] Visual continuity maintained

**Estimated Time**: 4 hours

#### Task 1.2: Update UnifiedStreamingContainer

**Files to Modify:**
- `frontend/src/components/dashboard/UnifiedStreamingContainer.tsx`

**Changes:**
1. Ensure container supports dynamic content types
2. Add transition animations for content changes
3. Maintain sidebar visibility throughout

**Acceptance Criteria:**
- [ ] Container supports approval cards as content
- [ ] Smooth content transitions
- [ ] Sidebar always visible when container is visible

**Estimated Time**: 2 hours

#### Task 1.3: Update Approval Cards Styling

**Files to Modify:**
- `frontend/src/components/research/QuestionApprovalCard.tsx`
- `frontend/src/components/research/SearchTermApprovalCard.tsx`
- `frontend/src/components/research/VideoApprovalCard.tsx`

**Changes:**
1. Ensure cards fit within UnifiedStreamingContainer content area
2. Adjust spacing and layout for sidebar + content structure
3. Maintain responsive design

**Acceptance Criteria:**
- [ ] Cards fit properly in content area
- [ ] Responsive layout works correctly
- [ ] Visual consistency with ResultCard

**Estimated Time**: 3 hours

#### Task 1.4: Update State Management

**Files to Modify:**
- `frontend/src/app/research/page.tsx`
- `frontend/src/hooks/useResearchWorkflow.ts`

**Changes:**
1. Update state transitions to keep container visible
2. Ensure approval state doesn't hide container
3. Update showSidebar logic

**Acceptance Criteria:**
- [ ] Container visible during approval stages
- [ ] State transitions work correctly
- [ ] No duplicate rendering

**Estimated Time**: 2 hours

**Phase 1 Total**: 11 hours (~1.5 days)

---

### Phase 2: Backend Streaming Support (Week 1-2)

**Goal**: Add streaming support for questions and search terms

#### Task 2.1: Update Question Generation Service

**Files to Modify:**
- `backend/src/services/research-question.service.ts`

**Changes:**
1. Add streaming support using `callQwenStream`
2. Implement `onChunk` callback to parse and broadcast partial questions
3. Add incremental parsing logic
4. Maintain backward compatibility

**Implementation Details:**

```typescript
export async function generateResearchQuestions(
  researchQuery: string,
  language: string,
  questionCount: number,
  jobId?: string, // NEW: For streaming
  onProgress?: (partialQuestions: string[]) => void // NEW: Progress callback
): Promise<string[]> {
  // ... existing prompt setup ...
  
  let accumulatedContent = '';
  let partialQuestions: string[] = [];
  
  const onChunk = (chunk: string) => {
    accumulatedContent += chunk;
    
    // Parse partial questions incrementally
    const parsed = parseQuestionsFromAI(accumulatedContent);
    if (parsed.length > partialQuestions.length) {
      partialQuestions = parsed;
      
      // Broadcast progress if jobId provided
      if (jobId) {
        broadcastJobProgress(jobId, {
          status: 'generating_questions',
          progress: calculateProgress(partialQuestions.length, questionCount),
          research_data: {
            partial_questions: partialQuestions,
          },
        });
      }
      
      // Call progress callback
      if (onProgress) {
        onProgress(partialQuestions);
      }
    }
  };
  
  // Use streaming version
  const aiResult = await callQwenStream(
    'qwen-plus',
    prompt,
    { enable_thinking: true },
    onChunk
  );
  
  // Final parse and return
  const finalQuestions = parseQuestionsFromAI(aiResult.content);
  return finalQuestions;
}
```

**Acceptance Criteria:**
- [ ] Questions stream in real-time
- [ ] Partial questions broadcasted via SSE
- [ ] Final questions sent on completion
- [ ] Fallback to non-streaming on error
- [ ] Backward compatibility maintained

**Estimated Time**: 6 hours

#### Task 2.2: Update Search Term Generation Service

**Files to Modify:**
- `backend/src/services/research.service.ts` (generateSearchQueries function)

**Changes:**
1. Add streaming support similar to questions
2. Implement incremental parsing for search terms
3. Broadcast partial search terms

**Implementation Details:**

```typescript
async function generateSearchQueries(
  researchQuery: string,
  language: string,
  questions?: string[],
  jobId?: string, // NEW: For streaming
  onProgress?: (partialTerms: string[]) => void // NEW: Progress callback
): Promise<string[]> {
  // ... existing setup ...
  
  let accumulatedContent = '';
  let partialTerms: string[] = [];
  
  const onChunk = (chunk: string) => {
    accumulatedContent += chunk;
    const parsed = parseSearchTermsFromAI(accumulatedContent);
    if (parsed.length > partialTerms.length) {
      partialTerms = parsed;
      
      if (jobId) {
        broadcastJobProgress(jobId, {
          status: 'generating_search_terms',
          progress: calculateProgress(partialTerms.length, targetCount),
          research_data: {
            partial_search_terms: partialTerms,
          },
        });
      }
      
      if (onProgress) {
        onProgress(partialTerms);
      }
    }
  };
  
  const aiResult = await callQwenStream(
    'qwen-plus',
    prompt,
    searchTermConfig,
    onChunk
  );
  
  return parseSearchTermsFromAI(aiResult.content);
}
```

**Acceptance Criteria:**
- [ ] Search terms stream in real-time
- [ ] Partial terms broadcasted via SSE
- [ ] Final terms sent on completion
- [ ] Fallback to non-streaming on error

**Estimated Time**: 6 hours

#### Task 2.3: Update Research Service Orchestration

**Files to Modify:**
- `backend/src/services/research.service.ts` (startResearchJob, continueResearchAfterApproval)

**Changes:**
1. Pass `jobId` to generation functions
2. Update calls to use streaming versions
3. Handle streaming progress updates

**Acceptance Criteria:**
- [ ] Job ID passed to generation functions
- [ ] Streaming progress updates work
- [ ] Error handling maintains fallback

**Estimated Time**: 4 hours

#### Task 2.4: Add Parsing Utilities

**Files to Create/Modify:**
- `backend/src/services/research-question.service.ts` (parseQuestionsFromAI - enhance for partial parsing)
- `backend/src/services/research.service.ts` (parseSearchTermsFromAI - new function)

**Changes:**
1. Enhance parsing to handle partial/incomplete outputs
2. Support both JSON and list formats incrementally
3. Handle edge cases (incomplete questions, malformed JSON)

**Acceptance Criteria:**
- [ ] Partial parsing works correctly
- [ ] Handles incomplete outputs gracefully
- [ ] Supports both JSON and list formats
- [ ] Robust error handling

**Estimated Time**: 4 hours

**Phase 2 Total**: 20 hours (~2.5 days)

---

### Phase 3: Frontend Streaming Support (Week 2)

**Goal**: Handle streaming chunks for questions and search terms

#### Task 3.1: Update Research Progress Types

**Files to Modify:**
- `frontend/src/types/research.ts`

**Changes:**
1. Add `partial_questions` and `partial_search_terms` to ResearchProgress
2. Add streaming flags

**Acceptance Criteria:**
- [ ] Types updated correctly
- [ ] Backward compatible

**Estimated Time**: 1 hour

#### Task 3.2: Update useResearchStream Hook

**Files to Modify:**
- `frontend/src/hooks/useResearchStream.ts`

**Changes:**
1. Handle `partial_questions` chunks
2. Handle `partial_search_terms` chunks
3. Accumulate partial outputs
4. Update state with streaming data

**Implementation Details:**

```typescript
case 'generating_questions':
  setStatus('generating_questions');
  setProgress(data.progress || 0);
  setMessage(data.message || null);
  
  // Handle streaming partial questions
  if (data.research_data?.partial_questions) {
    setWorkflowState(prev => ({
      ...prev,
      partialQuestions: data.research_data.partial_questions,
      isStreamingQuestions: true,
    }));
  }
  
  // Handle complete questions
  if (data.research_data?.generated_questions) {
    setWorkflowState(prev => ({
      ...prev,
      questions: data.research_data.generated_questions,
      partialQuestions: [],
      isStreamingQuestions: false,
    }));
  }
  break;

case 'generating_search_terms':
  // Similar pattern for search terms
  break;
```

**Acceptance Criteria:**
- [ ] Partial questions handled correctly
- [ ] Partial search terms handled correctly
- [ ] State updates smoothly
- [ ] No duplicate entries

**Estimated Time**: 4 hours

#### Task 3.3: Update useResearchWorkflow Hook

**Files to Modify:**
- `frontend/src/hooks/useResearchWorkflow.ts`

**Changes:**
1. Expose streaming state flags
2. Update state structure to include partial outputs
3. Handle transitions between partial and complete

**Acceptance Criteria:**
- [ ] Streaming flags exposed
- [ ] State structure updated
- [ ] Transitions work correctly

**Estimated Time**: 3 hours

#### Task 3.4: Update Approval Cards for Streaming

**Files to Modify:**
- `frontend/src/components/research/QuestionApprovalCard.tsx`
- `frontend/src/components/research/SearchTermApprovalCard.tsx`

**Changes:**
1. Display partial items while streaming
2. Show streaming indicator
3. Smooth transition to complete items
4. Prevent approval while streaming

**Implementation Details:**

```tsx
<ApprovalCard
  items={isStreamingQuestions ? partialQuestions : questions}
  isProcessing={isStreamingQuestions || isRegenerating}
  // Show streaming indicator
  contextInfo={
    isStreamingQuestions && (
      <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Generating questions...
      </div>
    )
  }
/>
```

**Acceptance Criteria:**
- [ ] Partial items display while streaming
- [ ] Streaming indicator shown
- [ ] Smooth transition to complete
- [ ] Approval disabled during streaming

**Estimated Time**: 4 hours

**Phase 3 Total**: 12 hours (~1.5 days)

---

### Phase 4: Testing & Refinement (Week 2-3)

**Goal**: Comprehensive testing and bug fixes

#### Task 4.1: Unit Tests

**Files to Create/Modify:**
- `backend/src/services/__tests__/research-question.service.test.ts`
- `backend/src/services/__tests__/research.service.test.ts` (search terms)
- `frontend/src/hooks/__tests__/useResearchStream.test.ts`
- `frontend/src/components/research/__tests__/ApprovalCard.test.tsx`

**Acceptance Criteria:**
- [ ] Unit tests cover streaming logic
- [ ] Parsing tests cover partial outputs
- [ ] State management tests pass
- [ ] Component tests cover streaming display

**Estimated Time**: 8 hours

#### Task 4.2: Integration Tests

**Files to Create:**
- `backend/src/__tests__/integration/research-streaming.test.ts`
- `frontend/src/__tests__/integration/research-workflow-streaming.test.tsx`

**Acceptance Criteria:**
- [ ] End-to-end streaming works
- [ ] UI transitions work smoothly
- [ ] Error handling works
- [ ] Fallback to non-streaming works

**Estimated Time**: 6 hours

#### Task 4.3: Performance Testing

**Tasks:**
1. Measure streaming performance impact
2. Test with slow connections
3. Test with large outputs
4. Optimize if needed

**Acceptance Criteria:**
- [ ] No performance degradation
- [ ] Works on slow connections
- [ ] Handles large outputs gracefully

**Estimated Time**: 4 hours

#### Task 4.4: UX Testing

**Tasks:**
1. Test visual continuity
2. Test streaming display
3. Test state transitions
4. Gather user feedback

**Acceptance Criteria:**
- [ ] No page jumps
- [ ] Streaming feels smooth
- [ ] Visual continuity maintained
- [ ] User feedback positive

**Estimated Time**: 4 hours

**Phase 4 Total**: 22 hours (~3 days)

---

### Phase 5: Documentation & Deployment (Week 3)

**Goal**: Document changes and deploy

#### Task 5.1: Update Documentation

**Files to Update:**
- `docs/enhanced_research_workflow_prd.md`
- `docs/enhanced_research_workflow_implementation_plan.md`
- API documentation

**Acceptance Criteria:**
- [ ] Streaming behavior documented
- [ ] UI changes documented
- [ ] API changes documented

**Estimated Time**: 4 hours

#### Task 5.2: Deployment

**Tasks:**
1. Deploy backend changes
2. Deploy frontend changes
3. Monitor for issues
4. Rollback plan ready

**Acceptance Criteria:**
- [ ] Deployment successful
- [ ] No critical issues
- [ ] Monitoring in place

**Estimated Time**: 2 hours

**Phase 5 Total**: 6 hours (~1 day)

---

## Technical Specifications

### Backend Streaming API

#### ResearchProgress Event Format

**During Streaming:**
```typescript
{
  status: 'generating_questions' | 'generating_search_terms',
  progress: number, // 0-100
  message: string,
  research_data: {
    partial_questions?: string[], // During streaming
    partial_search_terms?: string[], // During streaming
  },
  chunk?: string, // Optional: raw chunk for debugging
}
```

**On Completion:**
```typescript
{
  status: 'awaiting_question_approval' | 'awaiting_search_term_approval',
  progress: number,
  message: string,
  research_data: {
    generated_questions?: string[], // Complete array
    generated_search_terms?: string[], // Complete array
    question_approval_status: 'pending',
    search_term_approval_status: 'pending',
  },
}
```

### Frontend State Structure

```typescript
interface ResearchWorkflowState {
  // Questions
  questions: string[];
  partialQuestions: string[];
  isStreamingQuestions: boolean;
  
  // Search Terms
  searchTerms: string[];
  partialSearchTerms: string[];
  isStreamingSearchTerms: boolean;
  
  // Videos (no streaming needed)
  videos: SelectedVideo[];
  
  // Other fields...
}
```

### Parsing Logic

#### Partial Question Parsing

```typescript
function parsePartialQuestions(content: string): string[] {
  // Try JSON first
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions.map(q => q.trim()).filter(Boolean);
      }
    } catch (e) {
      // Continue to list parsing
    }
  }
  
  // Parse numbered list
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: string[] = [];
  
  for (const line of lines) {
    const match = line.match(/^(?:\d+[.)]\s*|[-•]\s*)(.+)$/);
    if (match) {
      const question = match[1].trim();
      // Only add if it looks like a complete question
      if (question.length > 10) {
        questions.push(question);
      }
    }
  }
  
  return questions;
}
```

### Error Handling

#### Streaming Failure Fallback

```typescript
try {
  const aiResult = await callQwenStream(prompt, config, onChunk);
  return parseQuestions(aiResult.content);
} catch (error) {
  if (error.isStreamParseError || error.message.includes('stream')) {
    logger.warn('[Research] Streaming failed, falling back to non-streaming');
    // Fallback to non-streaming
    const aiResult = await callQwenPlus(prompt, undefined, config);
    return parseQuestions(aiResult.content);
  }
  throw error;
}
```

---

## Testing Strategy

### Unit Tests

1. **Parsing Tests**
   - Test partial question parsing
   - Test partial search term parsing
   - Test edge cases (incomplete JSON, malformed lists)

2. **Streaming Tests**
   - Test chunk accumulation
   - Test progress calculation
   - Test state transitions

3. **Component Tests**
   - Test approval card streaming display
   - Test state transitions
   - Test UI layout

### Integration Tests

1. **End-to-End Streaming**
   - Start research job
   - Verify questions stream
   - Verify search terms stream
   - Verify approval UI appears correctly

2. **Error Scenarios**
   - Test streaming failure fallback
   - Test network interruption
   - Test malformed responses

3. **Performance Tests**
   - Measure streaming overhead
   - Test with slow connections
   - Test with large outputs

### Manual Testing Checklist

- [ ] Questions stream in real-time
- [ ] Search terms stream in real-time
- [ ] No page jumps during transitions
- [ ] Sidebar remains visible during approval
- [ ] Approval cards display correctly
- [ ] Streaming indicator shows during generation
- [ ] Approval disabled during streaming
- [ ] Smooth transitions between states
- [ ] Error handling works correctly
- [ ] Fallback to non-streaming works
- [ ] Performance is acceptable
- [ ] Responsive design works

---

## Risk Mitigation

### Risk 1: Streaming Parsing Complexity

**Risk**: Parsing partial outputs may be complex and error-prone

**Mitigation**:
- Start with simple list format parsing
- Add JSON support incrementally
- Comprehensive test coverage
- Fallback to non-streaming on errors

### Risk 2: Performance Impact

**Risk**: Streaming may impact performance

**Mitigation**:
- Measure performance before/after
- Optimize parsing logic
- Batch updates if needed
- Monitor in production

### Risk 3: UI Complexity

**Risk**: Integrating approval UI into container may be complex

**Mitigation**:
- Incremental implementation
- Test each change
- Maintain backward compatibility
- Rollback plan ready

### Risk 4: State Management

**Risk**: Managing partial vs complete state may be error-prone

**Mitigation**:
- Clear state structure
- Comprehensive tests
- Type safety (TypeScript)
- Clear separation of concerns

---

## Success Criteria

### Functional Requirements

- ✅ Approval UI uses UnifiedStreamingContainer
- ✅ Sidebar remains visible during approval
- ✅ No page jumps during transitions
- ✅ Questions stream in real-time
- ✅ Search terms stream in real-time
- ✅ Streaming indicator shows during generation
- ✅ Approval disabled during streaming
- ✅ Error handling works correctly
- ✅ Fallback to non-streaming works

### Non-Functional Requirements

- ✅ Performance: No degradation (< 5% overhead)
- ✅ Reliability: Streaming works 99%+ of the time
- ✅ UX: Smooth transitions, no jarring jumps
- ✅ Compatibility: Backward compatible with existing jobs
- ✅ Maintainability: Code is well-documented and tested

### User Experience Goals

- ✅ Users see progress in real-time
- ✅ Visual continuity maintained throughout
- ✅ Reduced perceived wait time
- ✅ Consistent experience across all stages
- ✅ Professional, polished feel

---

## Timeline Summary

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: UI Layout Unification | 1.5 days | Week 1 Day 1 | Week 1 Day 2 |
| Phase 2: Backend Streaming | 2.5 days | Week 1 Day 2 | Week 2 Day 1 |
| Phase 3: Frontend Streaming | 1.5 days | Week 2 Day 1 | Week 2 Day 3 |
| Phase 4: Testing & Refinement | 3 days | Week 2 Day 3 | Week 3 Day 1 |
| Phase 5: Documentation & Deployment | 1 day | Week 3 Day 1 | Week 3 Day 2 |
| **Total** | **~10 days** | | |

---

## Conclusion

This plan addresses both critical UX issues with the smart research feature:

1. **UI Layout Unification**: Maintains visual continuity by integrating approval UI into the unified container structure
2. **Real-Time Streaming**: Provides immediate feedback by streaming interim outputs as they're generated

The implementation is phased to minimize risk and ensure quality, with comprehensive testing at each stage. The solution maintains backward compatibility and includes fallback mechanisms for reliability.

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Regular check-ins to track progress
4. User testing after Phase 4
5. Deployment after successful testing
