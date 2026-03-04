# Testing Style Guide Generation Fix

This guide explains how to test the style guide generation improvements that were made to handle edge cases and improve error logging.

## Prerequisites

1. **Ensure style guide is enabled** in `backend/config.yaml`:
   ```yaml
   research:
     enable_style_guide: true
     style_guide_transcript_preview_length: 1000
   ```

2. **Start the backend server**:
   ```bash
   cd backend
   npm run dev
   ```

## Testing Methods

### Method 1: Manual Testing via Test Script

The easiest way to test is using the provided test script:

1. **Start the backend server** (in one terminal):
   ```bash
   cd backend
   npm run dev
   ```

2. **Run the test script** (in another terminal):
   ```bash
   cd backend
   npm run test:research
   ```

3. **Enter a research query** when prompted:
   - Example: `"How to make sourdough bread"`
   - Example: `"Impact of AI on healthcare in 2024"`
   - Example: `"Best practices for React performance optimization"`

4. **Follow the workflow**:
   - Approve questions
   - Approve search terms
   - Approve videos
   - Wait for transcripts to be fetched
   - **Watch for style guide generation** - you should see progress message: "Analyzing content to determine writing style..."

5. **Check the logs** in the backend terminal for:
   - `[Research] Generating style guide` - confirms it started
   - `[Research] Created transcript previews for style guide` - confirms previews were created
   - `[Research] Style guide prompt generated` - confirms prompt was assembled
   - `[Research] Style guide generated` - confirms success
   - OR error messages with detailed information if it fails

### Method 2: Testing via Frontend UI

1. **Start both frontend and backend**:
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

2. **Navigate to Research page**: `http://localhost:3000/research`

3. **Start a research job**:
   - Enter a research query
   - Click "Start Research"
   - Go through the approval workflow (questions → search terms → videos)

4. **Monitor the progress**:
   - Watch for the "Analyzing content to determine writing style..." message
   - Check browser console for any errors
   - Check backend logs for detailed information

### Method 3: Testing Edge Cases

To test the fixes specifically, you can simulate edge cases:

#### Test Case 1: Empty Transcripts Array

This should now be handled gracefully. The function should:
- Log: `[Research] Style guide generation skipped: no transcripts available`
- Return empty string without crashing
- Continue with research summary generation

**How to test**: This is difficult to simulate manually, but you can check logs if all transcript fetches fail.

#### Test Case 2: Empty Transcript Text

If transcripts exist but have empty `transcript_text`, they should be filtered out:
- Log: `[Research] Style guide generation skipped: no transcripts with valid text`
- Return empty string without crashing

**How to test**: This would require modifying transcript data, but the fix ensures it won't crash.

#### Test Case 3: Successful Generation

With valid transcripts, you should see:
- Detailed debug logs about preview creation
- Prompt generation logs
- Success message with style guide length
- Style guide saved to research data

## What to Look For in Logs

### Success Case:
```
[Research] Generating style guide { jobId: '...', researchQuery: '...', transcriptCount: 10, previewLength: 1000 }
[Research] Created transcript previews for style guide { jobId: '...', previewCount: 10, totalPreviewLength: 12345 }
[Research] Style guide prompt generated { jobId: '...', promptLength: 15000 }
[Research] Style guide generated { jobId: '...', styleGuideLength: 450, tokensUsed: 120 }
[Research] Style guide saved to research data { jobId: '...', styleGuideLength: 450 }
```

### Error Case (with improved logging):
```
[Research] Style guide generation failed, continuing without style guide {
  jobId: '...',
  error: 'AI service error message',
  error_code: 'TIMEOUT',  // or 'RATE_LIMIT', 'AUTH_ERROR', etc.
  model: 'qwen-flash',
  transcriptCount: 10,
  promptLength: 15000
}
```

### Edge Case Handling:
```
[Research] Style guide generation skipped: no transcripts available { jobId: '...', transcriptCount: 0 }
```
OR
```
[Research] Style guide generation skipped: no transcripts with valid text { jobId: '...', totalTranscripts: 5 }
```

## Verifying the Fix

### Check 1: Error Logging Improvement
- ✅ Error logs now include `error_code`, `model`, `transcriptCount`, and `promptLength`
- ✅ This helps diagnose what went wrong

### Check 2: Edge Case Handling
- ✅ Empty transcripts array is validated before processing
- ✅ Empty transcript text is filtered out
- ✅ Function returns gracefully without crashing

### Check 3: Debug Information
- ✅ Debug logs show preview count and total preview length
- ✅ Debug logs show prompt length before API call
- ✅ This helps identify if prompt is too long or other issues

## Checking Research Data

After a research job completes, you can check if the style guide was generated:

1. **Check the research data file**:
   ```bash
   # Files are saved in backend/data/research/
   # Look for the most recent JSON file
   cat backend/data/research/[job-id].json | jq '.research_data.style_guide'
   ```

2. **Check via API** (if you have the job ID):
   ```bash
   curl http://localhost:5000/api/research/[job-id]/status | jq '.research_data.style_guide'
   ```

## Troubleshooting

### Style guide not generating?

1. **Check config**: Ensure `enable_style_guide: true` in `backend/config.yaml`
2. **Check logs**: Look for the reason in backend logs
3. **Check transcripts**: Ensure transcripts were successfully fetched
4. **Check API**: Verify DashScope API key is configured correctly

### Getting errors?

1. **Check error_code**: The new logging will show the specific error code
2. **Check prompt length**: If prompt is too long, you might see `CONTEXT_LENGTH_EXCEEDED`
3. **Check API limits**: Rate limit errors will show `RATE_LIMIT` error code
4. **Check network**: Network errors will show `NETWORK_ERROR` or similar

## Unit Test Example

If you want to add a unit test, here's an example structure:

```typescript
// __tests__/unit/services/research-style-guide.test.ts
import { generateStyleGuide } from '../../../src/services/research.service';
import { TranscriptData } from '../../../src/services/transcript.service';

describe('generateStyleGuide', () => {
  it('should handle empty transcripts array', async () => {
    const result = await generateStyleGuide(
      'test query',
      [],
      'English',
      undefined,
      'test-job-id'
    );
    expect(result).toBe('');
  });

  it('should filter out transcripts with empty text', async () => {
    const transcripts: TranscriptData[] = [
      {
        video_id: '1',
        title: 'Video 1',
        transcript_text: '', // Empty!
        // ... other fields
      },
      {
        video_id: '2',
        title: 'Video 2',
        transcript_text: 'Valid transcript text here',
        // ... other fields
      },
    ];
    
    // Mock the AI call to return success
    // Test that only valid transcript is used
  });
});
```

## Summary

The fixes ensure that:
1. ✅ Empty transcripts are handled gracefully
2. ✅ Invalid transcripts are filtered out
3. ✅ Error logging includes detailed diagnostic information
4. ✅ Debug information helps identify issues
5. ✅ Function continues gracefully even if style guide generation fails

Test the happy path first, then check logs for any edge cases that occur naturally during testing.
