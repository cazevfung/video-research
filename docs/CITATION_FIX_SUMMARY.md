# Citation System Fix Summary

## Issues Fixed

### 1. ✅ Backend Now Sends Citation Metadata

**Problem**: Citation metadata was generated but never sent to frontend.

**Fix**: 
- Added `citation_metadata` and `citation_usage` fields to `ResearchProgress` interface
- Generate citation map **before** summary generation starts
- Send `citations:metadata` SSE event **before** content streaming begins
- Frontend receives citation data and can render CitationBadge components immediately

**Files Changed**:
- `backend/src/services/research.service.ts`:
  - Updated `ResearchProgress` interface to include citation fields
  - Generate citation map before streaming (line ~1647)
  - Send `citations:metadata` event before summary generation (line ~1650-1660)

### 2. ✅ Citation Metadata Included in Final Response

**Problem**: Citations weren't included in the completed research response.

**Fix**:
- Added `citations` and `citationUsage` to `ResearchProgress.data` object
- Frontend can now access citations when research completes

**Files Changed**:
- `backend/src/services/research.service.ts`:
  - Include citations in `completedProgress.data` (line ~1921-1934)

### 3. ✅ Citation Metadata Saved to Database

**Problem**: Citations weren't persisted, so they disappeared on page reload.

**Fix**:
- Added `citations` field to `ResearchCreateData`
- Citation metadata is now saved to database with research document

**Files Changed**:
- `backend/src/services/research.service.ts`:
  - Include `citations` in `researchDataForCreate` (line ~1877-1889)

## How It Works Now

### Data Flow (Fixed):

```
1. Backend: Generate citation map from selected videos ✅
   ↓
2. Backend: Send citations:metadata SSE event ✅
   ↓
3. Frontend: Receive event, call setCitations(metadata) ✅
   ↓
4. Frontend: CitationTextProcessor finds [1] patterns ✅
   ↓
5. Frontend: getCitation(1) returns CitationData ✅
   ↓
6. UI: Renders CitationBadge component ✅
   ↓
7. Backend: Save citations to database ✅
   ↓
8. Frontend: Load citations from saved research ✅
```

### What Users Will See:

1. **During Streaming**:
   - Citation badges appear as content streams
   - Hover tooltips work immediately (once metadata received)
   - Citations are styled as clickable badges, not plain text

2. **After Completion**:
   - Citations persist in saved research
   - Citations work when viewing historical research
   - Reference lists can be generated (if Sources sections are parsed)

## Remaining Work (Future Enhancements)

### 1. Citation Usage Tracking Per Section

**Status**: Not implemented

**What's Missing**:
- Parser to extract citation numbers from each section during streaming
- Track which citations appear in which sections
- Generate `citationUsage` map: `{ "Section Title": [1, 2, 3] }`

**Impact**: Reference lists can't be generated per section automatically.

**Files Needed**:
- `backend/src/services/citation-parser.service.ts` (NEW)
- Parse citations from summary text as it streams
- Track section boundaries and citation usage

### 2. Sources Section Parsing

**Status**: Partially implemented

**What's Missing**:
- MarkdownStreamer should detect `### Sources` sections
- Replace Sources sections with `ReferenceList` components
- Extract citation numbers from Sources section text

**Current State**: Sources sections render as plain markdown text.

**Files to Update**:
- `frontend/src/components/dashboard/MarkdownStreamer.tsx`
- Add Sources section detection in H3 renderer
- Replace with ReferenceList component

### 3. Citation Usage in Completed Response

**Status**: Empty object `{}` sent

**What's Missing**:
- Parse citation usage from final summary text
- Group citations by section heading
- Include in `citationUsage` field

**Current State**: `citationUsage: {}` is sent (empty).

## Testing Checklist

After deploying these fixes, verify:

- [x] Citation metadata sent before streaming starts
- [ ] Citation badges render correctly during streaming
- [ ] Citation badges render correctly after completion
- [ ] Citations persist when reloading page
- [ ] Hover tooltips show video details
- [ ] Click navigation works (scroll to reference)
- [ ] Citations work in historical research views
- [ ] Sources sections render correctly (if implemented)

## Debugging

If citations still don't work:

1. **Check Backend Logs**:
   ```
   [Research] Citation metadata sent to frontend
   ```
   Should appear before summary generation starts.

2. **Check Frontend Console**:
   ```
   [useResearchStream] Citation metadata received
   ```
   Should appear when `citations:metadata` event is received.

3. **Check Citation Store**:
   - Open React DevTools
   - Check `CitationContext` state
   - `citations` Map should contain citation data

4. **Check Citation Parsing**:
   - Verify regex patterns match citation format: `[1]`, `[1, 2]`, `[1-3]`
   - Check `CitationTextProcessor` is wrapping text nodes correctly

## Related Files

### Backend:
- `backend/src/services/research.service.ts` - Main fix location
- `backend/src/services/citation-mapper.service.ts` - Citation map generation
- `backend/src/types/citation.types.ts` - Type definitions
- `backend/src/models/Research.ts` - Database schema

### Frontend:
- `frontend/src/hooks/useResearchStream.ts` - Event handler (already correct)
- `frontend/src/contexts/CitationContext.tsx` - Citation store (already correct)
- `frontend/src/components/research/citations/CitationTextProcessor.tsx` - Parser (already correct)
- `frontend/src/utils/citationParser.ts` - Regex patterns (already correct)
