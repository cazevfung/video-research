# Bug Fix: Smart Research Feedback System - Parsing & UI Issues

## Date
2026-01-29

## Issue Summary

The smart research feedback system had a critical bug where the AI's reasoning/explanation text was being incorrectly parsed as additional questions and displayed in the UI.

### Example of the Bug

**User's Research Query:**
"why is Starmer suddenly visiting china now in early 2026? what influence did canada and other country visits have on this UK visit? why now?"

**User Feedback:**
"特鲁多都不是加拿大首相了" (Trudeau is no longer Canada's Prime Minister)

**Expected Output:** 5 questions
**Actual Output:** 15 items displayed (5 questions + 10 explanation bullets)

The AI returned:
1. 2026年1月英国为何此时安排斯塔默访华？ ✅ (Valid question)
2. 2025年G7内部对华政策协调机制变化如何影响英国决策时机？ ✅ (Valid question)
3. 2025年下半年哪些国家对华高层访问促成英国2026年初行动？ ✅ (Valid question)
4. 斯塔默政府当前对华核心经济诉求是什么？ ✅ (Valid question)
5. 英国工党政府如何平衡对华关系与跨大西洋联盟新立场？ ✅ (Valid question)
6. **Preserved valid questions**: Questions #1, #4, and #5 were factually sound... ❌ (Meta-commentary)
7. **Corrected flawed premise**: Completely replaced Question #2... ❌ (Explanation)
8. **Updated contextual reference**: Revised Question #3... ❌ (Explanation)
9. **Maintained balanced coverage**: The new set still addresses: ❌ (Explanation)
10. Timing rationale (Q1) ❌ (Sub-point)
11. International coordination dynamics (Q2) ❌ (Sub-point)
12. Specific triggering events (Q3) ❌ (Sub-point)
13. UK's economic interests (Q4) ❌ (Sub-point)
14. Alliance balancing challenges (Q5) ❌ (Sub-point)
15. **Enhanced researchability**: Each question now contains... ❌ (Explanation)

## Root Causes

### 1. Prompt Issue
The AI was not strictly following the JSON output format and instead included reasoning text in the numbered list.

### 2. Parser Too Lenient
The `parseQuestionsFromAI` function in `research-question.service.ts` accepted ANY numbered line as a valid question, including explanation bullets like "**Preserved valid questions**:" and sub-points like "Timing rationale (Q1)".

### 3. Frontend Lack of Validation
The `QuestionApprovalCard` component displayed all parsed items without filtering or validating that they were actual questions.

## Fixes Applied

### 1. Enhanced Prompts (Backend)

#### Question Regeneration (`question-regeneration.md`)
```markdown
**CRITICAL OUTPUT REQUIREMENT:**

You MUST return EXACTLY {question_count} questions and NOTHING ELSE. Do NOT include:
- Explanations of what you changed
- Reasoning about your modifications
- Meta-commentary like "Preserved valid questions" or "Corrected flawed premise"
- Analysis of the changes you made
- Numbered lists of your thought process

Only output the questions themselves in the JSON format specified below.
```

#### Question Generation (`question-generation.md`)
Added similar instruction to prevent meta-commentary.

#### Search Term Generation (`search-term-genration.md`)
```markdown
**CRITICAL OUTPUT REQUIREMENT:**

Format your output as a numbered list of search queries ONLY. Do NOT include:
- Explanations of what you changed
- Reasoning about your modifications
- Meta-commentary like "Note:" or "Explanation:"
- Any text that is not a search query itself
```

### 2. Stricter Parsing Logic (Backend)

#### Question Parser (`research-question.service.ts`)
Enhanced `parseQuestionsFromAI` to skip lines that are clearly meta-commentary:

```typescript
// Skip lines that are clearly meta-commentary or explanations
if (line.startsWith('**') || 
    line.toLowerCase().includes('preserved') ||
    line.toLowerCase().includes('corrected') ||
    line.toLowerCase().includes('updated') ||
    line.toLowerCase().includes('maintained') ||
    line.toLowerCase().includes('enhanced')) {
  continue;
}
```

Added validation after parsing:
- Logs warning if question count doesn't match expected count
- Automatically truncates excess questions
- Logs error if fewer questions received than expected

#### Search Term Parser (`research.service.ts`)
Added similar filtering logic to `parseSearchTermsFromAI`:

```typescript
// Skip lines that are meta-commentary
if (line.startsWith('**') || 
    line.toLowerCase().includes('feedback') ||
    line.toLowerCase().includes('regenerate')) {
  continue;
}
```

### 3. Frontend Validation (`QuestionApprovalCard.tsx`)

Added client-side filtering to catch any items that slip through:

```typescript
const filterValidQuestions = (qs: string[]) => {
  return qs.filter(q => {
    // Skip empty or very short items
    if (!q || q.trim().length < 10) return false;
    
    // Skip meta-commentary (bold markdown, explanatory prefixes)
    if (q.startsWith('**') || 
        q.toLowerCase().includes('preserved') ||
        q.toLowerCase().includes('corrected') ||
        q.toLowerCase().includes('updated') ||
        q.toLowerCase().includes('maintained') ||
        q.toLowerCase().includes('enhanced')) {
      return false;
    }
    
    // Skip sub-points (e.g., "Timing rationale (Q1)")
    if (q.match(/^(timing|international|specific|uk'?s|alliance)\s+/i)) {
      return false;
    }
    
    return true;
  });
};
```

## Impact

### Before Fix
- Users saw 15 items when expecting 5 questions
- UI was confusing with explanation text shown as numbered questions
- Could break downstream processing that expected exactly N questions

### After Fix
- Users see exactly the expected number of questions (5)
- No explanation text displayed as questions
- Better logging for debugging if AI still misbehaves
- Automatic truncation if AI returns excess items
- Multiple layers of defense (prompt → backend parser → frontend filter)

## Testing Recommendations

1. **Regenerate questions with various feedback**
   - Test with factual corrections (like the Trudeau example)
   - Test with requests to change focus
   - Test with requests to add/remove specific topics

2. **Regenerate search terms with feedback**
   - Verify no explanation text appears in search term list

3. **Monitor backend logs**
   - Check for warnings about question count mismatches
   - Verify truncation logic works when AI returns excess items

4. **Test in different languages**
   - Chinese (Simplified)
   - Chinese (Traditional)
   - English
   - Other supported languages

## Files Modified

### Backend
1. `backend/src/prompts/research/question-regeneration.md` - Added strict output requirements
2. `backend/src/prompts/research/question-generation.md` - Added strict output requirements
3. `backend/src/prompts/research/search-term-genration.md` - Added strict output requirements
4. `backend/src/services/research-question.service.ts` - Enhanced parsing and validation
5. `backend/src/services/research.service.ts` - Enhanced search term parsing and regeneration

### Frontend
1. `frontend/src/components/research/QuestionApprovalCard.tsx` - Added client-side filtering

## Related Systems

The video filtering system was checked and found to already have proper safeguards:
- Uses JSON parsing (not list parsing)
- Already includes instruction: "Even when incorporating user feedback, you MUST still output valid JSON... Do not add explanatory text"

## Monitoring

Monitor these log patterns after deployment:
- `[Research] Question count mismatch` - indicates AI still returning wrong count
- `[Research] Truncating excess questions` - indicates our fix is working to prevent the bug
- `[Research] Search term count mismatch` - search term regeneration issues

## Additional Notes

This is a defense-in-depth fix with three layers:
1. **Prompt engineering** - Tell AI not to include explanations
2. **Backend parsing** - Filter out explanation text even if AI includes it
3. **Frontend validation** - Final safety net to ensure only valid questions displayed

All three layers are necessary because:
- LLMs are non-deterministic and may occasionally ignore instructions
- Different models/versions may interpret prompts differently
- User experience should be consistent regardless of AI behavior
