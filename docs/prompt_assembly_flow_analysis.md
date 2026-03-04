# Prompt Assembly Flow Analysis

**Date**: January 15, 2026  
**Status**: ✅ FIXED - Redundancy removed

---

## Current Flow

### 1. User Input Collection
**Location**: API endpoint receives `SummaryRequest`

```typescript
interface SummaryRequest {
  urls: string[];
  preset: PresetStyle;           // ✅ Used
  custom_prompt?: string;         // ✅ Used
  language: string;               // ✅ Used
}
```

**Files**:
- `backend/src/types/summary.types.ts` - Request type definition
- `backend/src/controllers/summary.controller.ts` - API endpoint handler
- `backend/src/services/summary.service.ts` - Business logic

---

### 2. Transcript Aggregation
**Location**: `backend/src/services/summary.service.ts` (lines 400-553)

**Process**:
1. Fetch transcripts from all video URLs
2. Pre-condense long videos (if needed)
3. Aggregate into `finalContextBuffer`:
   ```typescript
   finalContextBuffer.push(
     `\n\n--- Video: ${transcript.title} ---\n\n${processedText}`
   );
   ```
4. Join into `aggregatedContent`
5. Further condense if exceeds context window → `finalContent`

**Result**: `finalContent` = All transcripts combined with separators

---

### 3. Prompt Assembly
**Location**: `backend/src/services/summary.service.ts` (lines 585-592)

```typescript
// Build final prompt
const finalPrompt = getFinalSummaryPrompt({
  presetStyle: request.preset,        // ✅ Custom prompt style
  customPrompt: request.custom_prompt, // ✅ User's custom prompt focus
  language: request.language,          // ✅ Language preference
});

const promptWithContent = injectContentIntoPrompt(finalPrompt, finalContent);
```

**What happens**:
1. `getFinalSummaryPrompt()` creates template with placeholders:
   - `{language}` → Replaced with `request.language`
   - `{userFocus}` → Replaced with `request.custom_prompt` (if provided)
   - `{styleDescription}`, `{styleFramework}`, `{styleStructure}` → Style-specific content
   - `[CONTENT_PLACEHOLDER]` → **NOT replaced yet**

2. `injectContentIntoPrompt()` replaces `[CONTENT_PLACEHOLDER]` with `finalContent`

**Result**: `promptWithContent` = Complete prompt with instructions + transcript content

---

### 4. AI Service Call
**Location**: `backend/src/services/summary.service.ts` (lines 761-762, 789-790, 819-820)

```typescript
aiResult = usePremiumModel
  ? await callQwenMax(promptWithContent, finalContent, onChunk)
  : await callQwenPlus(promptWithContent, finalContent, onChunk);
```

**What happens**:
- `callQwenMax/Plus` takes TWO parameters:
  1. `prompt` = `promptWithContent` (system prompt with transcript already injected)
  2. `aggregatedText` = `finalContent` (transcript content again!)

---

### 5. Message Construction
**Location**: `backend/src/services/ai.service.ts` (lines 362-373, 672-683)

```typescript
const requestBody: DashScopeRequest = {
  model,
  messages: [
    {
      role: 'system',
      content: systemPrompt,  // = promptWithContent (includes transcript!)
    },
    {
      role: 'user',
      content: userContent,   // = finalContent (transcript again!)
    },
  ],
  // ...
};
```

---

## The Problem

**Transcript content is sent TWICE**:

1. **System message** contains:
   - Core Principles
   - Style-specific instructions
   - User's custom prompt focus
   - Language preference
   - **Transcript content** (via `[CONTENT_PLACEHOLDER]` replacement)

2. **User message** contains:
   - **Transcript content again** (via `finalContent` parameter)

**Impact**:
- ❌ Wastes tokens (doubles transcript content)
- ❌ Potentially confusing for AI (content appears in both system and user messages)
- ❌ Inefficient (unnecessary redundancy)

---

## Expected Behavior

The system should use **ONE of these approaches**:

### Option A: Content in System Message Only (Current Template Design)
```typescript
// System message = promptWithContent (includes transcript)
// User message = empty or simple instruction
messages: [
  { role: 'system', content: promptWithContent }, // Has transcript
  { role: 'user', content: 'Please generate the summary.' } // Simple instruction
]
```

### Option B: Content in User Message Only (More Common Pattern)
```typescript
// System message = instructions only (no transcript)
// User message = transcript content
messages: [
  { role: 'system', content: finalPrompt }, // Instructions only, NO transcript
  { role: 'user', content: finalContent } // Transcript here
]
```

---

## Fix Implemented ✅

**Option B** (Content in User Message) has been implemented:

### 1. Updated Template
**File**: `backend/src/prompts/final-summary.prompt.md`

**Change**: Removed `[CONTENT_PLACEHOLDER]` from template
- Added note: "The transcript content from videos will be provided in a separate user message."

### 2. Updated `summary.service.ts`
**File**: `backend/src/services/summary.service.ts` (lines 585-590)

**Before**:
```typescript
const finalPrompt = getFinalSummaryPrompt({...});
const promptWithContent = injectContentIntoPrompt(finalPrompt, finalContent);
// Then passes both promptWithContent AND finalContent to AI
```

**After**:
```typescript
const finalPrompt = getFinalSummaryPrompt({...});
// Transcript sent separately as user message
// Pass finalPrompt (instructions only) and finalContent (transcript) separately
```

### 3. Updated AI Calls
**File**: `backend/src/services/summary.service.ts` (lines 761-762, 789-790, 819-820)

**Before**: `callQwenMax(promptWithContent, finalContent, ...)`

**After**: `callQwenMax(finalPrompt, finalContent, ...)`

### 4. Updated Token Estimation
**File**: `backend/src/services/summary.service.ts` (lines 642-662)

**Before**: Estimated tokens from combined `promptWithContent`

**After**: Estimates system tokens (`finalPrompt`) and user tokens (`finalContent`) separately

### 5. Removed Unused Import
**File**: `backend/src/services/summary.service.ts` (line 29)

Removed `injectContentIntoPrompt` import (no longer used)

**Result**: Transcript content is now sent only once (in user message), eliminating redundancy and token waste.

---

## Where to Locate These Materials

### User's Custom Prompt
- **Input**: `request.custom_prompt` (from `SummaryRequest`)
- **Injected at**: `backend/src/prompts/final-summary.prompt.ts:244-246`
- **Template placeholder**: `{userFocus}`
- **Final location**: System message (in `promptWithContent`)

### Language Preference
- **Input**: `request.language` (from `SummaryRequest`)
- **Injected at**: `backend/src/prompts/final-summary.prompt.ts:255`
- **Template placeholder**: `{language}`
- **Final location**: System message (in `promptWithContent`)

### Transcript Content
- **Input**: Aggregated from all video transcripts
- **Created at**: `backend/src/services/summary.service.ts:490` (`aggregatedContent`)
- **Further processed at**: `backend/src/services/summary.service.ts:498-553` → `finalContent`
- **Injected at**: `backend/src/prompts/final-summary.prompt.ts:276` (via `injectContentIntoPrompt`)
- **Also sent separately at**: `backend/src/services/summary.service.ts:761-762` (as `finalContent` parameter)
- **Final location**: 
  - ❌ **System message** (via `[CONTENT_PLACEHOLDER]` replacement) - **REDUNDANT**
  - ❌ **User message** (via separate parameter) - **REDUNDANT**

---

## Summary

**Current Status**: ✅ All materials are being collected and used, but transcript is duplicated

**Files to Check**:
1. `backend/src/services/summary.service.ts:585-592` - Prompt assembly
2. `backend/src/prompts/final-summary.prompt.ts:226-264` - Prompt generation
3. `backend/src/prompts/final-summary.prompt.ts:272-277` - Content injection
4. `backend/src/services/ai.service.ts:362-373` - Message construction
5. `backend/src/prompts/final-summary.prompt.md:68` - Template with `[CONTENT_PLACEHOLDER]`

**Recommendation**: Remove `[CONTENT_PLACEHOLDER]` from template and use user message for transcript content only.
