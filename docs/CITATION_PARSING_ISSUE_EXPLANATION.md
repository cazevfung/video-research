# Citation Parsing and Display Issue - Root Cause Analysis

## Problem Summary

Citations appear as plain text `[1]`, `[2]`, etc. in the research reports instead of being parsed into interactive citation badges with hover tooltips and clickable references.

## Root Cause

The citation system has **three critical gaps** in the data flow:

### 1. **Backend Generates Citation Metadata But Doesn't Send It**

**Location**: `backend/src/services/research.service.ts` (line 868-869)

```typescript
// Citation map IS generated
const citationMap = generateCitationMap(selectedVideos, rawVideoResults);
const citationContext = formatCitationPromptContext(citationMap, language);

// BUT citationMap is never:
// - Sent via SSE events before streaming starts
// - Included in the final research response
// - Saved to the database
```

**Expected Behavior** (per PRD):
- Backend should send `citations:metadata` SSE event **before** content streaming starts
- This allows frontend to initialize citation store and render badges immediately

**Actual Behavior**:
- Citation metadata is generated but discarded
- Frontend never receives citation data
- Citations render as plain text because `getCitation(num)` returns `undefined`

### 2. **Frontend Expects Citation Metadata But Never Receives It**

**Location**: `frontend/src/hooks/useResearchStream.ts` (line 628-633)

```typescript
case 'citations:metadata':
  if (data.citation_metadata) {
    setCitations(data.citation_metadata);
    // ...
  }
```

**Problem**: This handler exists but the backend **never sends** this event.

**Location**: `frontend/src/components/research/citations/CitationTextProcessor.tsx` (line 104-133)

```typescript
const citationData = getCitation(num);
if (citationData) {
  // Render CitationBadge component ✅
} else {
  // Render placeholder badge with "Loading..." ❌
  // This is what users see - plain text citations
}
```

### 3. **Citation Metadata Not Saved to Database**

**Location**: `backend/src/services/research.service.ts` (line 1877-1889)

```typescript
const researchDataForCreate: ResearchCreateData = {
  // ... other fields ...
  // ❌ citations: citationMap,  // MISSING!
  // ❌ citationUsage: {},        // MISSING!
};
```

**Impact**: Even if citations worked during streaming, they wouldn't persist when users reload the page or view historical research.

## Data Flow Diagram

### Current (Broken) Flow:
```
Backend: generateCitationMap() ✅
    ↓
Backend: citationMap discarded ❌
    ↓
Frontend: No citation metadata received ❌
    ↓
Frontend: getCitation(num) returns undefined ❌
    ↓
UI: Citations render as plain text [1] ❌
```

### Expected (Fixed) Flow:
```
Backend: generateCitationMap() ✅
    ↓
Backend: Send citations:metadata SSE event ✅
    ↓
Frontend: setCitations(metadata) ✅
    ↓
Frontend: getCitation(num) returns CitationData ✅
    ↓
UI: Citations render as CitationBadge components ✅
    ↓
Backend: Save citations to database ✅
    ↓
Frontend: Load citations from saved research ✅
```

## Why Citations Appear as Plain Text

1. **CitationTextProcessor** processes markdown text and finds `[1]` patterns
2. It calls `getCitation(1)` to get citation metadata
3. Since backend never sent metadata, `getCitation(1)` returns `undefined`
4. Fallback renders a placeholder badge, but **the regex replacement might not be working correctly**
5. Result: Citations appear as plain text `[1]` instead of styled badges

## Additional Issues

### Citation Usage Tracking Missing

The PRD specifies tracking which citations appear in which sections (`citationUsage`), but:
- No parser extracts citation numbers from sections during streaming
- No `citations:section-complete` events are sent
- Reference lists can't be generated per section

### Sources Sections Not Parsed

The AI generates `### Sources` sections with citation references, but:
- These aren't parsed into `ReferenceList` components
- They appear as plain markdown text

## Fix Required

1. **Backend**: Send `citations:metadata` SSE event before streaming starts
2. **Backend**: Include citations in final research response
3. **Backend**: Save citations to database in `ResearchCreateData`
4. **Backend**: Parse citation usage from summary text and track per section
5. **Frontend**: Verify citation parsing regex works correctly
6. **Frontend**: Parse Sources sections into ReferenceList components

## Files That Need Changes

### Backend:
- `backend/src/services/research.service.ts` - Send citations:metadata event, save citations
- `backend/src/services/citation-parser.service.ts` - NEW: Parse citations from text, track usage

### Frontend:
- `frontend/src/utils/citationParser.ts` - Verify regex patterns work
- `frontend/src/components/dashboard/MarkdownStreamer.tsx` - Parse Sources sections

## Testing Checklist

- [ ] Citation metadata sent before streaming starts
- [ ] Citation badges render correctly during streaming
- [ ] Citation badges render correctly after completion
- [ ] Citations persist when reloading page
- [ ] Hover tooltips show video details
- [ ] Click navigation works (scroll to reference)
- [ ] Sources sections render as ReferenceList components
- [ ] Citation usage tracked per section
