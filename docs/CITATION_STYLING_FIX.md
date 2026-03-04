# Citation Styling Fix - Generation & Shared Pages

## Problem

Citations were appearing as plain text `[1]`, `[2]` instead of styled circle badges with hover tooltips on:
1. **Generation page** (during streaming)
2. **Shared page** (viewing shared research)

## Root Causes

### 1. Shared Page Not Initializing Citations ✅ FIXED

**Issue**: `SharedResearchCard` component wasn't loading citation metadata from the research object.

**Fix**: Added citation initialization in `SharedResearchCard`:
```typescript
React.useEffect(() => {
  if (research) {
    const citations = (research as any).citations as CitationMetadata | undefined;
    const citationUsage = (research as any).citationUsage as CitationUsageMap | undefined;
    
    if (citations) {
      setCitations(citations);
    }
    if (citationUsage) {
      setCitationUsage(citationUsage);
    }
  }
}, [research, setCitations, setCitationUsage]);
```

### 2. CitationTextProcessor Not Processing All Text Nodes ✅ IMPROVED

**Issue**: `CitationTextProcessor` might not handle all edge cases with ReactMarkdown's nested structure.

**Fix**: Enhanced `processChildren` function to:
- Handle null/undefined children
- Handle number types (convert to string)
- Handle boolean types
- Better array processing with key preservation
- Skip code/pre elements (don't process citations in code blocks)
- Recursively process all nested children

## Files Changed

1. **`frontend/src/components/shared/SharedResearchCard.tsx`**
   - Added citation initialization from research object
   - Imported `useCitation` hook and citation types

2. **`frontend/src/components/research/citations/CitationTextProcessor.tsx`**
   - Enhanced `processChildren` function to handle more edge cases
   - Better handling of nested React elements
   - Improved array processing

## How It Works Now

### Generation Page (Streaming):
1. Backend sends `citations:metadata` event ✅
2. Frontend receives event via `useResearchStream` ✅
3. `setCitations(metadata)` populates citation store ✅
4. `CitationTextProcessor` processes text nodes ✅
5. Citations render as `CitationBadge` components ✅

### Shared Page:
1. Research object loaded from API ✅
2. `SharedResearchCard` initializes citations from `research.citations` ✅
3. `CitationTextProcessor` processes text nodes ✅
4. Citations render as `CitationBadge` components ✅

## Testing Checklist

After deploying, verify:

- [ ] Citations appear as circle badges on generation page during streaming
- [ ] Citations appear as circle badges on shared pages
- [ ] Hover tooltips work on both pages
- [ ] Click navigation works (scroll to reference)
- [ ] Citations persist when reloading shared page
- [ ] Citations don't appear in code blocks
- [ ] Multiple citations `[1, 2, 3]` render correctly
- [ ] Range citations `[1-3]` render correctly

## Debugging

If citations still don't appear:

1. **Check Browser Console**:
   ```
   [SharedResearchCard] Citation metadata initialized
   ```
   Should appear when shared page loads.

2. **Check Citation Store**:
   - Open React DevTools
   - Check `CitationContext` provider
   - `citations` Map should contain citation data

3. **Check Citation Parsing**:
   - Verify text contains citation patterns: `[1]`, `[1, 2]`, `[1-3]`
   - Check if `CitationTextProcessor` is wrapping text nodes
   - Verify `parseCitationsInText` is being called

4. **Check Network Tab**:
   - Verify research object includes `citations` field
   - Check if citation metadata is in API response

## Related Components

- `CitationBadge` - Renders styled circle badge
- `CitationTooltip` - Shows hover tooltip
- `CitationTextProcessor` - Processes text to replace citations
- `CitationContext` - Manages citation state globally
- `MarkdownStreamer` - Wraps all text nodes with CitationTextProcessor
