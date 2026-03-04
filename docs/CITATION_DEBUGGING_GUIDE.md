# Citation Debugging Guide - Shared Page

## Issue
Citations appear as plain text `[3]`, `[7]`, `[1]` instead of styled circle badges on shared pages.

## Debugging Steps

### 1. Check Browser Console

Open browser DevTools console and look for:

**Expected logs:**
```
[SharedResearchCard] Research object received
[SharedResearchCard] ✅ Citation metadata initialized
[CitationTextProcessor] ✅ Processing citations
```

**If you see warnings:**
```
[SharedResearchCard] ⚠️ No citations found in research object
[CitationTextProcessor] ⚠️ Citation pattern found but no citations loaded
```

### 2. Check Network Tab

1. Open Network tab in DevTools
2. Filter by "shared" or the shareId
3. Click on the API request: `GET /api/shared/:shareId`
4. Check Response tab
5. Verify `data.research.citations` exists and contains citation data

**Expected response structure:**
```json
{
  "success": true,
  "data": {
    "research": {
      "citations": {
        "1": {
          "videoId": "...",
          "title": "...",
          "channel": "...",
          ...
        },
        "2": { ... },
        "3": { ... }
      },
      "citationUsage": { ... },
      "final_summary_text": "..."
    }
  }
}
```

### 3. Check React DevTools

1. Install React DevTools extension
2. Open Components tab
3. Find `CitationProvider` component
4. Check `citations` Map in state
5. Verify it contains citation data

**Expected:**
- `citations` Map should have entries like `Map(3) { 1 => {...}, 2 => {...}, 3 => {...} }`

### 4. Check CitationTextProcessor

1. In React DevTools, find a `<p>` element with citation text
2. Look for `CitationTextProcessor` component inside
3. Check its props - `children` should contain the text with `[3]` pattern
4. Check if `getCitation` function is available

## Common Issues & Fixes

### Issue 1: Citations Not in API Response

**Symptom:** Console shows `⚠️ No citations found in research object`

**Fix:** 
- Backend must include `citations` in share controller response ✅ (Already fixed)
- Verify backend is running latest code
- Check database - research document should have `citations` field

### Issue 2: Citations Not Initializing

**Symptom:** Console shows research object has citations but `Citation metadata initialized` doesn't appear

**Fix:**
- Check `SharedResearchCard` useEffect dependencies
- Verify `setCitations` is being called
- Check for errors in console

### Issue 3: CitationTextProcessor Not Processing

**Symptom:** Citations loaded but still showing as plain text

**Possible causes:**
1. ReactMarkdown structure - children might be nested differently
2. Text nodes split across multiple elements
3. CitationTextProcessor not wrapping correct elements

**Fix:**
- Check console logs from CitationTextProcessor
- Verify children structure matches expected format
- Check if `parseCitationsInText` is being called

### Issue 4: Citations Loaded But Badges Not Rendering

**Symptom:** Console shows citations loaded and processing, but badges don't appear

**Possible causes:**
1. CitationBadge component not rendering
2. CSS styles not applied
3. Citation data format incorrect

**Fix:**
- Check if CitationBadge components are in DOM (use React DevTools)
- Verify CitationBadge styles are loaded
- Check citation data format matches CitationData interface

## Testing Checklist

After fixes, verify:

- [ ] API response includes `citations` field
- [ ] Console shows citation initialization logs
- [ ] React DevTools shows citations in CitationContext
- [ ] CitationTextProcessor logs show processing
- [ ] CitationBadge components appear in DOM
- [ ] Citations render as circle badges
- [ ] Hover tooltips work
- [ ] Click navigation works

## Files to Check

1. **Backend:**
   - `backend/src/controllers/share.controller.ts` - Must include citations in response
   - `backend/src/models/Research.ts` - Research document must have citations field

2. **Frontend:**
   - `frontend/src/components/shared/SharedResearchCard.tsx` - Must initialize citations
   - `frontend/src/components/research/citations/CitationTextProcessor.tsx` - Must process text
   - `frontend/src/contexts/CitationContext.tsx` - Must provide citation data
   - `frontend/src/utils/citationParser.ts` - Must parse citation patterns

## Next Steps

1. Check browser console for the debug logs
2. Verify API response includes citations
3. Check React DevTools for citation state
4. Report findings so we can fix the specific issue
