# Enhanced Research Workflow - Implementation Plan

**Document Version**: 1.0  
**Last Updated**: 2026-01-28  
**Status**: Planning  
**Related PRD**: `enhanced_research_workflow_prd.md`

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Backend Foundation](#phase-1-backend-foundation)
3. [Phase 2: Backend API & Orchestration](#phase-2-backend-api--orchestration)
4. [Phase 3: Frontend Components](#phase-3-frontend-components)
5. [Phase 4: Frontend Integration](#phase-4-frontend-integration)
6. [Phase 5: Testing & Quality Assurance](#phase-5-testing--quality-assurance)
7. [Phase 6: Deployment & Rollout](#phase-6-deployment--rollout)
8. [Risk Mitigation](#risk-mitigation)
9. [Success Criteria](#success-criteria)

---

## Overview

### Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Backend Foundation | 1 week | PRD approval |
| Phase 2: Backend API & Orchestration | 1 week | Phase 1 |
| Phase 3: Frontend Components | 1 week | Phase 2 |
| Phase 4: Frontend Integration | 1 week | Phase 3 |
| Phase 5: Testing & QA | 1 week | Phase 4 |
| Phase 6: Deployment & Rollout | 1 week | Phase 5 |
| **Total** | **6 weeks** | |

### Key Principles

1. **Incremental Development**: Each phase builds on the previous
2. **Backward Compatibility**: Legacy workflow remains functional during migration
3. **Feature Flags**: Use flags to enable/disable enhanced workflow
4. **Comprehensive Testing**: Test at each phase before proceeding
5. **Documentation**: Update docs as code is written

---

## Phase 1: Backend Foundation

**Duration**: 1 week  
**Goal**: Implement core service functions and data models for enhanced workflow

### Tasks

#### Task 1.1: Update Configuration

**Files to Modify**:
- `backend/config.yaml`

**Changes**:
```yaml
research:
  # New fields
  question_count: 5
  enable_question_approval: true
  enable_search_term_approval: true
  enable_video_approval: true
  search_terms_per_question: 2
  max_feedback_per_stage: 1
  approval_timeout_hours: 1
  cleanup_pending_jobs_interval_hours: 1
  
  # Updated progress percentages
  progress_percentages:
    created: 0
    generating_questions: 5
    awaiting_question_approval: 10
    regenerating_questions: 11
    generating_search_terms: 20
    awaiting_search_term_approval: 25
    regenerating_search_terms: 26
    searching_videos: 35
    videos_found: 45
    filtering_videos: 50
    awaiting_video_approval: 55
    refiltering_videos: 56
    fetching_transcripts: 65
    transcripts_ready: 75
    generating_summary: 85
    completed: 100
```

**Acceptance Criteria**:
- [ ] All new config values added to `config.yaml`
- [ ] Config loader updated to read new values
- [ ] Default values documented
- [ ] Config validation tests pass

**Estimated Time**: 2 hours

---

#### Task 1.2: Extend Research Model

**Files to Modify**:
- `backend/src/models/Research.ts`

**Changes**:
```typescript
// Add to Research interface
export interface Research {
  // ... existing fields ...
  
  research_data?: {
    // Core fields
    research_query?: string;
    language?: string;
    
    // Stage 1: Questions
    generated_questions?: string[];
    question_approval_status?: 'pending' | 'approved' | 'regenerating';
    question_feedback_count?: 0 | 1;
    question_user_feedback?: string;
    previous_questions?: string[];
    
    // Stage 2: Search Terms
    generated_search_terms?: string[];
    search_term_approval_status?: 'pending' | 'approved' | 'regenerating';
    search_term_feedback_count?: 0 | 1;
    search_term_user_feedback?: string;
    previous_search_terms?: string[];
    
    // Stage 4: Video Selection
    video_approval_status?: 'pending' | 'approved' | 'regenerating';
    video_feedback_count?: 0 | 1;
    video_user_feedback?: string;
    previous_selected_videos?: SelectedVideo[];
    
    // ... existing fields ...
  };
}

// Add helper functions
export function getQuestionApprovalStatus(research: Research): 'pending' | 'approved' | 'regenerating' | undefined {
  return research.research_data?.question_approval_status;
}

export function canProvideFeedback(research: Research, stage: 'questions' | 'search_terms' | 'videos'): boolean {
  const feedbackCount = research.research_data?.[`${stage}_feedback_count`] ?? 0;
  return feedbackCount < 1;
}
```

**Acceptance Criteria**:
- [ ] Research interface extended with new fields
- [ ] Helper functions implemented
- [ ] TypeScript compilation passes
- [ ] Model tests updated

**Estimated Time**: 3 hours

---

#### Task 1.3: Create Question Generation Service Functions

**Files to Create**:
- `backend/src/services/research-question.service.ts` (new file)

**Files to Modify**:
- `backend/src/services/research.service.ts`

**Implementation**:
```typescript
// research-question.service.ts
import { callQwenPlus } from './ai.service';
import { getQuestionGenerationPrompt, getQuestionRegenerationPrompt } from '../prompts';
import logger from '../utils/logger';

export interface QuestionGenerationResult {
  questions: string[];
}

/**
 * Generate research questions from query
 */
export async function generateResearchQuestions(
  researchQuery: string,
  language: string,
  questionCount: number
): Promise<string[]> {
  logger.info('[Research] Generating research questions', {
    researchQuery: researchQuery.substring(0, 100),
    language,
    questionCount,
  });

  const prompt = getQuestionGenerationPrompt({
    researchQuery,
    language,
    questionCount,
  });

  try {
    const aiResult = await callQwenPlus(prompt, undefined, {
      enable_thinking: true,
      thinking_budget: 4000,
    });

    if ('error' in aiResult) {
      throw new Error(`AI service error: ${aiResult.error}`);
    }

    const questions = parseQuestionsFromAI(aiResult.content);
    
    logger.info('[Research] Questions generated', {
      questionCount: questions.length,
      questions: questions.map((q, i) => `${i + 1}. ${q.substring(0, 50)}...`),
    });

    return questions;
  } catch (error) {
    logger.error('[Research] Failed to generate questions', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Regenerate questions based on user feedback
 */
export async function regenerateResearchQuestions(
  researchQuery: string,
  language: string,
  originalQuestions: string[],
  userFeedback: string,
  questionCount: number
): Promise<string[]> {
  logger.info('[Research] Regenerating questions with feedback', {
    researchQuery: researchQuery.substring(0, 100),
    feedbackLength: userFeedback.length,
    originalQuestionCount: originalQuestions.length,
  });

  const prompt = getQuestionRegenerationPrompt({
    researchQuery,
    language,
    originalQuestions,
    userFeedback,
    questionCount,
  });

  try {
    const aiResult = await callQwenPlus(prompt, undefined, {
      enable_thinking: true,
      thinking_budget: 4000,
    });

    if ('error' in aiResult) {
      throw new Error(`AI service error: ${aiResult.error}`);
    }

    const updatedQuestions = parseQuestionsFromAI(aiResult.content);
    
    logger.info('[Research] Questions regenerated', {
      questionCount: updatedQuestions.length,
    });

    return updatedQuestions;
  } catch (error) {
    logger.error('[Research] Failed to regenerate questions', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Parse questions from AI response
 */
function parseQuestionsFromAI(content: string): string[] {
  // Try to extract JSON first
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions.map((q: string) => q.trim()).filter(Boolean);
      }
    } catch (e) {
      logger.warn('[Research] Failed to parse JSON from AI response', { error: e });
    }
  }

  // Fallback: parse numbered list
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: string[] = [];
  
  for (const line of lines) {
    // Match patterns like "1. question" or "1) question" or "- question"
    const match = line.match(/^(?:\d+[.)]\s*|[-•]\s*)(.+)$/);
    if (match) {
      questions.push(match[1].trim());
    }
  }

  return questions;
}
```

**Acceptance Criteria**:
- [ ] `generateResearchQuestions()` implemented and tested
- [ ] `regenerateResearchQuestions()` implemented and tested
- [ ] JSON parsing handles both JSON and list formats
- [ ] Error handling comprehensive
- [ ] Logging added for debugging
- [ ] Unit tests pass (>90% coverage)

**Estimated Time**: 6 hours

---

#### Task 1.4: Update Search Term Generation Service

**Files to Modify**:
- `backend/src/services/research.service.ts`

**Changes**:
```typescript
// Update generateSearchQueries to accept questions
async function generateSearchQueries(
  researchQuery: string,
  questions: string[], // NEW: Pass approved questions
  language: string
): Promise<string[]> {
  const researchConfig = getResearchConfig();
  const prompt = getSearchQueryPrompt({ 
    researchQuery,
    questions, // NEW: Include questions in prompt
    queryCount: questions.length * researchConfig.search_terms_per_question
  });
  
  // ... rest of implementation
}

// Add regeneration function
async function regenerateSearchTerms(
  researchQuery: string,
  questions: string[],
  originalSearchTerms: string[],
  userFeedback: string,
  language: string
): Promise<string[]> {
  const researchConfig = getResearchConfig();
  const prompt = getSearchTermRegenerationPrompt({
    researchQuery,
    questions,
    originalSearchTerms,
    userFeedback,
    targetTermCount: questions.length * researchConfig.search_terms_per_question,
  });
  
  // ... implementation similar to generateSearchQueries
}
```

**Acceptance Criteria**:
- [ ] `generateSearchQueries()` updated to use questions
- [ ] `regenerateSearchTerms()` implemented
- [ ] Backward compatibility maintained (questions optional)
- [ ] Unit tests updated

**Estimated Time**: 4 hours

---

#### Task 1.5: Update Video Filtering Service

**Files to Modify**:
- `backend/src/services/research.service.ts`

**Changes**:
```typescript
// Update filterVideos to accept questions
async function filterVideos(
  researchQuery: string,
  questions: string[], // NEW: Pass approved questions
  videoResults: VideoSearchResult[],
  language: string,
  userFeedback?: string // NEW: Optional feedback for regeneration
): Promise<SelectedVideo[]> {
  const researchConfig = getResearchConfig();
  const prompt = getVideoFilteringPrompt({
    researchQuery,
    questions, // NEW: Include questions
    videoResults,
    userFeedback, // NEW: Include feedback if provided
  });

  // ... rest of implementation
}
```

**Acceptance Criteria**:
- [ ] `filterVideos()` updated to use questions
- [ ] User feedback incorporated into filtering logic
- [ ] Backward compatibility maintained
- [ ] Unit tests updated

**Estimated Time**: 4 hours

---

#### Task 1.6: Create Prompt Templates

**Files to Create**:
- `backend/src/prompts/research/question-generation.md`
- `backend/src/prompts/research/question-regeneration.md`

**Files to Modify**:
- `backend/src/prompts/research/search-term-genration.md` (update existing)
- `backend/src/prompts/research/video-filtering.md` (update existing)
- `backend/src/prompts/research.prompt.ts` (add prompt loading functions)

**Implementation**:
```typescript
// research.prompt.ts additions
import { loadPromptTemplate } from './index';

export function getQuestionGenerationPrompt(params: {
  researchQuery: string;
  language: string;
  questionCount: number;
}): string {
  let prompt = loadPromptTemplate('research/question-generation.md');
  
  prompt = prompt.replace(/{research_query}/g, params.researchQuery);
  prompt = prompt.replace(/{question_count}/g, params.questionCount.toString());
  prompt = prompt.replace(/{language}/g, params.language);
  
  return prompt;
}

export function getQuestionRegenerationPrompt(params: {
  researchQuery: string;
  language: string;
  originalQuestions: string[];
  userFeedback: string;
  questionCount: number;
}): string {
  let prompt = loadPromptTemplate('research/question-regeneration.md');
  
  prompt = prompt.replace(/{research_query}/g, params.researchQuery);
  prompt = prompt.replace(/{language}/g, params.language);
  prompt = prompt.replace(/{question_count}/g, params.questionCount.toString());
  prompt = prompt.replace(/{original_questions}/g, params.originalQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
  prompt = prompt.replace(/{user_feedback}/g, params.userFeedback);
  
  return prompt;
}

// Update existing functions
export function getSearchQueryPrompt(params: {
  researchQuery: string;
  questions?: string[]; // NEW
  queryCount: number;
}): string {
  let prompt = loadPromptTemplate('research/search-term-genration.md');
  
  prompt = prompt.replace(/{research_query}/g, params.researchQuery);
  prompt = prompt.replace(/{query_count}/g, params.queryCount.toString());
  
  // NEW: Add questions section if provided
  if (params.questions && params.questions.length > 0) {
    const questionsSection = `
## Research Questions to Answer

These questions will guide the search term generation:

${params.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Generate search terms that will help find videos answering these questions.
`;
    prompt = prompt.replace(/{questions_section}/g, questionsSection);
  } else {
    prompt = prompt.replace(/{questions_section}/g, '');
  }
  
  return prompt;
}
```

**Acceptance Criteria**:
- [ ] All prompt templates created
- [ ] Prompt loading functions implemented
- [ ] Placeholders replaced correctly
- [ ] Prompt templates reviewed for quality
- [ ] Unit tests for prompt assembly

**Estimated Time**: 6 hours

---

#### Task 1.7: Add State Transition Validation

**Files to Create**:
- `backend/src/utils/research-state-validator.ts`

**Implementation**:
```typescript
export type ResearchStatus =
  | 'pending'
  | 'generating_questions'
  | 'awaiting_question_approval'
  | 'regenerating_questions'
  | 'generating_search_terms'
  | 'awaiting_search_term_approval'
  | 'regenerating_search_terms'
  | 'searching_videos'
  | 'filtering_videos'
  | 'awaiting_video_approval'
  | 'refiltering_videos'
  | 'fetching_transcripts'
  | 'generating_summary'
  | 'completed'
  | 'error';

const VALID_TRANSITIONS: Record<ResearchStatus, ResearchStatus[]> = {
  'pending': ['generating_questions', 'error'],
  'generating_questions': ['awaiting_question_approval', 'error'],
  'awaiting_question_approval': ['regenerating_questions', 'generating_search_terms', 'error'],
  'regenerating_questions': ['awaiting_question_approval', 'error'],
  'generating_search_terms': ['awaiting_search_term_approval', 'error'],
  'awaiting_search_term_approval': ['regenerating_search_terms', 'searching_videos', 'error'],
  'regenerating_search_terms': ['awaiting_search_term_approval', 'error'],
  'searching_videos': ['filtering_videos', 'error'],
  'filtering_videos': ['awaiting_video_approval', 'error'],
  'awaiting_video_approval': ['refiltering_videos', 'fetching_transcripts', 'error'],
  'refiltering_videos': ['awaiting_video_approval', 'error'],
  'fetching_transcripts': ['generating_summary', 'error'],
  'generating_summary': ['completed', 'error'],
  'completed': [],
  'error': [],
};

export function validateStateTransition(
  from: ResearchStatus,
  to: ResearchStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidNextStates(current: ResearchStatus): ResearchStatus[] {
  return VALID_TRANSITIONS[current] || [];
}
```

**Acceptance Criteria**:
- [ ] State validator implemented
- [ ] All valid transitions defined
- [ ] Unit tests for all transitions
- [ ] Invalid transitions rejected

**Estimated Time**: 3 hours

---

### Phase 1 Deliverables

- [ ] Configuration updated
- [ ] Research model extended
- [ ] Question generation service implemented
- [ ] Search term generation updated
- [ ] Video filtering updated
- [ ] Prompt templates created
- [ ] State validation implemented
- [ ] Unit tests passing (>90% coverage)
- [ ] Documentation updated

**Phase 1 Total Estimated Time**: 28 hours (~3.5 days)

---

## Phase 2: Backend API & Orchestration

**Duration**: 1 week  
**Goal**: Implement API endpoints and orchestration logic for approval workflow

### Tasks

#### Task 2.1: Update Research Service Orchestration

**Files to Modify**:
- `backend/src/services/research.service.ts`

**Changes**:
Refactor `processResearch()` to stop at approval stages and add `continueResearchAfterApproval()` function.

**Key Changes**:
1. Generate questions and wait for approval
2. After approval, generate search terms and wait
3. After approval, search videos and filter
4. After approval, fetch transcripts and generate summary

**Acceptance Criteria**:
- [ ] `processResearch()` refactored to stop at approval stages
- [ ] `continueResearchAfterApproval()` implemented
- [ ] Stage continuation functions implemented
- [ ] State transitions validated
- [ ] Progress tracking accurate
- [ ] Unit tests pass

**Estimated Time**: 8 hours

---

#### Task 2.2: Implement Approval Endpoints

**Files to Modify**:
- `backend/src/controllers/research.controller.ts`
- `backend/src/routes/research.routes.ts`

**New Endpoints**:
1. `POST /api/research/:job_id/approve/:stage` - Approve a stage
2. `POST /api/research/:job_id/regenerate/:stage` - Request regeneration

**Implementation Details**:
- Validation (stage, feedback length, ownership)
- Race condition prevention (duplicate approval cache)
- State transition validation
- Error handling

**Acceptance Criteria**:
- [ ] Approval endpoint implemented
- [ ] Regeneration endpoint implemented
- [ ] Validation comprehensive
- [ ] Race condition prevention works
- [ ] Error handling robust
- [ ] Integration tests pass

**Estimated Time**: 10 hours

---

#### Task 2.3: Implement Job Cleanup Service

**Files to Create**:
- `backend/src/services/research-cleanup.service.ts`

**Implementation**:
- Clean up expired jobs awaiting approval
- Refund credits for expired jobs
- Start cleanup interval on server startup

**Acceptance Criteria**:
- [ ] Cleanup service implemented
- [ ] Expired jobs detected correctly
- [ ] Credits refunded appropriately
- [ ] Interval starts on server startup
- [ ] Unit tests pass

**Estimated Time**: 4 hours

---

#### Task 2.4: Update Summary Generation to Use Questions

**Files to Modify**:
- `backend/src/services/research.service.ts`

**Changes**:
Update `generateResearchSummary()` to structure summary around approved questions.

**Acceptance Criteria**:
- [ ] Summary prompt updated to include questions
- [ ] Summary structured around questions
- [ ] Backward compatibility maintained
- [ ] Unit tests updated

**Estimated Time**: 3 hours

---

### Phase 2 Deliverables

- [ ] Research service orchestration updated
- [ ] Approval endpoints implemented
- [ ] Regeneration endpoints implemented
- [ ] Job cleanup service implemented
- [ ] Summary generation updated
- [ ] Integration tests passing
- [ ] API documentation updated

**Phase 2 Total Estimated Time**: 25 hours (~3 days)

---

## Phase 3: Frontend Components

**Duration**: 1 week  
**Goal**: Build UI components for approval workflow

### Tasks

#### Task 3.1: Create WorkflowProgressTracker Component

**Files to Create**:
- `frontend/src/components/research/WorkflowProgressTracker.tsx`

**Features**:
- Visual progress indicator
- Stage status display (completed, current, awaiting, processing)
- Responsive design
- Accessibility support

**Acceptance Criteria**:
- [ ] Component renders correctly
- [ ] All stage states display properly
- [ ] Animations work smoothly
- [ ] Responsive design
- [ ] Accessibility (ARIA labels)
- [ ] Unit tests pass

**Estimated Time**: 4 hours

---

#### Task 3.2: Create Generic ApprovalCard Component

**Files to Create**:
- `frontend/src/components/research/ApprovalCard.tsx`

**Features**:
- Reusable for all approval stages
- Feedback input with validation
- Approve/Request Changes buttons
- Regeneration count display
- Loading states

**Acceptance Criteria**:
- [ ] Component renders correctly
- [ ] Feedback input validation works
- [ ] Button states correct
- [ ] Accessibility compliant
- [ ] Unit tests pass

**Estimated Time**: 6 hours

---

#### Task 3.3: Create Stage-Specific Approval Components

**Files to Create**:
- `frontend/src/components/research/QuestionApprovalCard.tsx`
- `frontend/src/components/research/QuestionItem.tsx`
- `frontend/src/components/research/SearchTermApprovalCard.tsx`
- `frontend/src/components/research/SearchTermItem.tsx`
- `frontend/src/components/research/VideoApprovalCard.tsx`

**Acceptance Criteria**:
- [ ] All components implemented
- [ ] Use ApprovalCard correctly
- [ ] Display data properly
- [ ] i18n support
- [ ] Unit tests pass

**Estimated Time**: 13 hours

---

### Phase 3 Deliverables

- [ ] WorkflowProgressTracker component
- [ ] ApprovalCard generic component
- [ ] All stage-specific components
- [ ] Unit tests passing
- [ ] Storybook stories (if applicable)

**Phase 3 Total Estimated Time**: 23 hours (~3 days)

---

## Phase 4: Frontend Integration

**Duration**: 1 week  
**Goal**: Integrate components with backend API and state management

### Tasks

#### Task 4.1: Create useResearchWorkflow Hook

**Files to Create**:
- `frontend/src/hooks/useResearchWorkflow.ts`

**Features**:
- State management
- SSE integration
- API calls (approve, regenerate)
- Error handling

**Acceptance Criteria**:
- [ ] Hook implemented
- [ ] SSE integration works
- [ ] State updates correctly
- [ ] Actions work properly
- [ ] Error handling robust
- [ ] Unit tests pass

**Estimated Time**: 6 hours

---

#### Task 4.2: Update Research Page Component

**Files to Modify**:
- `frontend/src/app/research/page.tsx`

**Changes**: Integrate new components and hook

**Acceptance Criteria**:
- [ ] Page uses new components
- [ ] Workflow progresses correctly
- [ ] Approval UI shows at right times
- [ ] Error states handled
- [ ] Loading states shown
- [ ] E2E tests pass

**Estimated Time**: 8 hours

---

#### Task 4.3: Add i18n Translations

**Files to Modify**:
- `frontend/src/locales/en/research.json`
- `frontend/src/locales/zh-tw/research.json` (and other languages)

**New Translation Keys**: All approval-related strings

**Acceptance Criteria**:
- [ ] All translations added
- [ ] Translations accurate
- [ ] All languages covered
- [ ] No missing keys

**Estimated Time**: 3 hours

---

#### Task 4.4: Add Race Condition Prevention

**Files to Modify**:
- `frontend/src/components/research/ApprovalCard.tsx`
- `frontend/src/hooks/useResearchWorkflow.ts`

**Changes**: Add double-click prevention, duplicate request handling

**Acceptance Criteria**:
- [ ] Double-click prevention works
- [ ] Duplicate requests prevented
- [ ] State synchronization correct
- [ ] Tests pass

**Estimated Time**: 4 hours

---

### Phase 4 Deliverables

- [ ] useResearchWorkflow hook implemented
- [ ] Research page updated
- [ ] i18n translations added
- [ ] Race condition prevention
- [ ] Integration tests passing
- [ ] E2E tests passing

**Phase 4 Total Estimated Time**: 21 hours (~2.5 days)

---

## Phase 5: Testing & Quality Assurance

**Duration**: 1 week  
**Goal**: Comprehensive testing and bug fixes

### Tasks

#### Task 5.1: Unit Tests

**Coverage Targets**:
- Backend services: >90%
- Frontend components: >85%
- Hooks: >90%

**Acceptance Criteria**:
- [ ] All unit tests written
- [ ] Coverage targets met
- [ ] Tests pass consistently
- [ ] Edge cases covered

**Estimated Time**: 12 hours

---

#### Task 5.2: Integration Tests

**Test Scenarios**:
1. Full workflow with approvals
2. Workflow with regenerations
3. Approval timeout handling
4. Race condition scenarios
5. Error recovery

**Acceptance Criteria**:
- [ ] All integration tests written
- [ ] All scenarios pass
- [ ] Performance acceptable
- [ ] Edge cases covered

**Estimated Time**: 10 hours

---

#### Task 5.3: E2E Tests

**Test Scenarios**:
1. User submits query → approves questions → approves terms → approves videos → sees summary
2. User provides feedback at each stage
3. User abandons workflow (timeout)
4. Multiple tabs scenario
5. Network failure recovery

**Acceptance Criteria**:
- [ ] E2E tests written
- [ ] All scenarios pass
- [ ] Tests stable
- [ ] CI/CD integration

**Estimated Time**: 8 hours

---

#### Task 5.4: Performance Testing

**Test Scenarios**:
1. Concurrent approval requests
2. Large question/video lists
3. SSE connection stability
4. Memory leaks

**Acceptance Criteria**:
- [ ] Performance benchmarks met
- [ ] No memory leaks
- [ ] SSE stable under load
- [ ] Response times acceptable

**Estimated Time**: 6 hours

---

#### Task 5.5: Accessibility Testing

**Test Areas**:
1. Keyboard navigation
2. Screen reader compatibility
3. ARIA labels
4. Color contrast
5. Focus management

**Acceptance Criteria**:
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation works
- [ ] Screen readers supported
- [ ] Accessibility audit passed

**Estimated Time**: 4 hours

---

### Phase 5 Deliverables

- [ ] Unit tests complete
- [ ] Integration tests complete
- [ ] E2E tests complete
- [ ] Performance tests complete
- [ ] Accessibility tests complete
- [ ] All bugs fixed
- [ ] Test documentation updated

**Phase 5 Total Estimated Time**: 40 hours (~5 days)

---

## Phase 6: Deployment & Rollout

**Duration**: 1 week  
**Goal**: Deploy to production with gradual rollout

### Tasks

#### Task 6.1: Feature Flag Setup

**Files to Modify**:
- `backend/src/config/env.ts`
- `frontend/src/config/feature-flags.ts`

**Acceptance Criteria**:
- [ ] Feature flags implemented
- [ ] Can enable/disable per environment
- [ ] Legacy workflow still works
- [ ] Documentation updated

**Estimated Time**: 2 hours

---

#### Task 6.2: Database Migration (if needed)

**Files to Create**:
- `backend/scripts/migrate-research-schema.ts`

**Acceptance Criteria**:
- [ ] Migration script created
- [ ] Migration tested
- [ ] Rollback plan documented
- [ ] Data integrity verified

**Estimated Time**: 4 hours

---

#### Task 6.3: Staging Deployment

**Steps**:
1. Deploy backend to staging
2. Deploy frontend to staging
3. Run smoke tests
4. Verify feature flags work
5. Test full workflow

**Acceptance Criteria**:
- [ ] Staging deployment successful
- [ ] Smoke tests pass
- [ ] Feature flags work
- [ ] No regressions

**Estimated Time**: 4 hours

---

#### Task 6.4: Beta Rollout (20% of users)

**Steps**:
1. Enable feature flag for 20% of users
2. Monitor metrics
3. Collect feedback
4. Fix critical bugs
5. Monitor error rates

**Acceptance Criteria**:
- [ ] Beta rollout successful
- [ ] Metrics within targets
- [ ] No critical bugs
- [ ] User feedback positive

**Estimated Time**: Ongoing (1 week monitoring)

---

#### Task 6.5: Full Rollout

**Steps**:
1. Enable for 50% of users
2. Monitor for 2 days
3. Enable for 100% of users
4. Disable legacy workflow
5. Monitor for 1 week

**Acceptance Criteria**:
- [ ] Full rollout successful
- [ ] Metrics stable
- [ ] Legacy workflow disabled
- [ ] Documentation updated

**Estimated Time**: Ongoing (1 week monitoring)

---

#### Task 6.6: Documentation Updates

**Files to Update**:
- `README.md`
- `API_DOCUMENTATION.md`
- User guides
- Developer guides

**Acceptance Criteria**:
- [ ] All documentation updated
- [ ] Examples provided
- [ ] Troubleshooting guide added
- [ ] API docs complete

**Estimated Time**: 4 hours

---

### Phase 6 Deliverables

- [ ] Feature flags implemented
- [ ] Database migrations complete
- [ ] Staging deployment successful
- [ ] Beta rollout complete
- [ ] Full rollout complete
- [ ] Documentation updated
- [ ] Monitoring dashboard configured

**Phase 6 Total Estimated Time**: 14 hours + ongoing monitoring (~2 days + 2 weeks monitoring)

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI generation failures | High | Medium | Fallback to original results, retry logic |
| Race conditions | High | Medium | Comprehensive prevention (see PRD) |
| Performance degradation | Medium | Low | Load testing, optimization |
| State synchronization issues | High | Medium | Single source of truth, validation |
| SSE connection drops | Medium | Medium | Reconnection logic, polling fallback |

### Product Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User confusion | Medium | Medium | Clear UI, tooltips, onboarding |
| Low approval rates | High | Low | User testing, iterate on prompts |
| Increased time to completion | Medium | High | Set expectations, show progress |
| Feature complexity | Medium | Medium | Gradual rollout, user feedback |

---

## Success Criteria

### Technical Success

- [ ] All phases completed on schedule
- [ ] Test coverage >85%
- [ ] Zero critical bugs in production
- [ ] Performance within targets
- [ ] Accessibility compliant

### Product Success

- [ ] Approval rates >70% (questions), >80% (terms), >85% (videos)
- [ ] Completion rate >75%
- [ ] User satisfaction >4.0/5
- [ ] Time to completion <6 min average
- [ ] Feature adoption >50%

### Business Success

- [ ] No increase in support tickets
- [ ] Credit efficiency maintained (200±20 credits)
- [ ] Tier upgrade impact +10%
- [ ] Research volume increases

---

## Appendix

### A. File Checklist

**Backend Files to Create**:
- [ ] `backend/src/services/research-question.service.ts`
- [ ] `backend/src/services/research-cleanup.service.ts`
- [ ] `backend/src/utils/research-state-validator.ts`
- [ ] `backend/src/prompts/research/question-generation.md`
- [ ] `backend/src/prompts/research/question-regeneration.md`

**Backend Files to Modify**:
- [ ] `backend/config.yaml`
- [ ] `backend/src/models/Research.ts`
- [ ] `backend/src/services/research.service.ts`
- [ ] `backend/src/controllers/research.controller.ts`
- [ ] `backend/src/routes/research.routes.ts`
- [ ] `backend/src/prompts/research.prompt.ts`
- [ ] `backend/src/prompts/research/search-term-genration.md`
- [ ] `backend/src/prompts/research/video-filtering.md`

**Frontend Files to Create**:
- [ ] `frontend/src/components/research/WorkflowProgressTracker.tsx`
- [ ] `frontend/src/components/research/ApprovalCard.tsx`
- [ ] `frontend/src/components/research/QuestionApprovalCard.tsx`
- [ ] `frontend/src/components/research/QuestionItem.tsx`
- [ ] `frontend/src/components/research/SearchTermApprovalCard.tsx`
- [ ] `frontend/src/components/research/SearchTermItem.tsx`
- [ ] `frontend/src/components/research/VideoApprovalCard.tsx`
- [ ] `frontend/src/hooks/useResearchWorkflow.ts`

**Frontend Files to Modify**:
- [ ] `frontend/src/app/research/page.tsx`
- [ ] `frontend/src/locales/*/research.json`
- [ ] `frontend/src/types/research.ts`

### B. Testing Checklist

**Unit Tests**:
- [ ] Question generation service
- [ ] Question regeneration service
- [ ] State validator
- [ ] Approval endpoints
- [ ] Regeneration endpoints
- [ ] All React components
- [ ] useResearchWorkflow hook

**Integration Tests**:
- [ ] Full approval workflow
- [ ] Regeneration workflow
- [ ] Timeout handling
- [ ] Error recovery
- [ ] Credit handling

**E2E Tests**:
- [ ] Complete user journey
- [ ] Feedback at each stage
- [ ] Multiple tabs
- [ ] Network failures
- [ ] Timeout scenarios

### C. Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing
- [ ] Code review complete
- [ ] Documentation updated
- [ ] Feature flags configured
- [ ] Database migrations ready
- [ ] Rollback plan documented

**Deployment**:
- [ ] Staging deployment successful
- [ ] Smoke tests pass
- [ ] Beta rollout (20%)
- [ ] Monitor for 1 week
- [ ] Full rollout (100%)
- [ ] Legacy workflow disabled

**Post-Deployment**:
- [ ] Monitor metrics
- [ ] Collect user feedback
- [ ] Fix bugs
- [ ] Optimize performance
- [ ] Update documentation

---

**END OF IMPLEMENTATION PLAN**
