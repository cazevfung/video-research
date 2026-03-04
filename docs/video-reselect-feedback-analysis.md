# Video Reselect Feedback – Analysis and Fix Plan

## Summary

Feedback on video selection (requesting a reselect with user feedback) can fail or behave incorrectly due to (1) a **feedback count field name mismatch** in the regenerate endpoint, (2) in some environments missing **raw_video_results** in job state, and (3) **prompts** that do not mirror the question generation/regeneration pattern (dedicated regeneration prompt with original output + feedback + injected criteria). This document explains causes and recommended fixes without implementing them.

---

## 1. Root cause: feedback count field name mismatch

### What’s wrong

In `backend/src/controllers/research.controller.ts`, `regenerateResearchStage` derives the feedback count field from the stage name:

```ts
const feedbackCountField = `${stage}_feedback_count`;
```

So:

- Stage `'questions'` → `'questions_feedback_count'`
- Stage `'search_terms'` → `'search_terms_feedback_count'`
- Stage `'videos'` → `'videos_feedback_count'`

Everywhere else in the app (types, status response, frontend) uses **singular** names:

- `question_feedback_count`
- `search_term_feedback_count`
- `video_feedback_count`

So for **video** reselect (and similarly for questions/search_terms):

1. **Write**: `updateJobStatus` is called with `research_data: { [feedbackCountField]: currentFeedbackCount + 1 }`, i.e. `videos_feedback_count: 1`.
2. **Read (max check)**: `currentFeedbackCount = researchData['videos_feedback_count']` → 1 after first use, so a second regeneration is correctly blocked.
3. **Status response**: `buildResearchJobStatusResponse` sends `job.research_data.video_feedback_count`. That key is **never** set by the regenerate controller (only `videos_feedback_count` is). So it stays 0.
4. **Broadcast**: The controller explicitly sends `video_feedback_count: currentFeedbackCount + 1` in the SSE payload, so the first refilter event has the correct count.

### Observed behavior

- **First reselect**: Can work (backend uses `videos_feedback_count` for the limit; broadcast sends correct `video_feedback_count` in the event).
- **Status/polling**: After one video reselect, any response built from `job.research_data` still has `video_feedback_count: 0`, so the UI can show “1 regeneration remaining” when it should show 0.
- **Second reselect**: Correctly rejected (backend reads `videos_feedback_count === 1`).

So “feedback on video selection to reselect isn’t working” can mean:

- Reselect appears to “not work” because the UI never reflects that the feedback was used (count stays 0), or
- In some flows (e.g. polling-heavy or reconnects) the inconsistent keys could contribute to confusing or incorrect behavior.

The same pattern exists for **questions** and **search_terms**: the controller writes `questions_feedback_count` / `search_terms_feedback_count` but the rest of the app expects `question_feedback_count` / `search_term_feedback_count`.

---

## 2. Fix for feedback count (recommended)

Use a **stage → feedback count field** map so the stored field matches the rest of the app:

- `'questions'` → `'question_feedback_count'`
- `'search_terms'` → `'search_term_feedback_count'`
- `'videos'` → `'video_feedback_count'`

**Where to change**

- In `regenerateResearchStage`, replace:
  - `const feedbackCountField = `${stage}_feedback_count`;`
  - with a lookup from the map above (and use that same field when reading `currentFeedbackCount` and when calling `updateJobStatus`).
- Ensure the broadcast payload for each stage still sends the same canonical key (e.g. `video_feedback_count` for videos); it already does for videos, but the job update must write that same key so status and SSE stay in sync.

Result:

- Job state and status responses will show the correct count after each regeneration.
- Frontend “regenerations remaining” will be correct for video (and for questions/search_terms if you fix those the same way).

---

## 3. Optional: guard for missing raw video pool

Reselect runs on the same pool of candidates stored in `research_data.raw_video_results`. If that is missing or empty (e.g. job created before this field existed, or a bug), the controller does:

```ts
const videoResults = lockedResearchData.raw_video_results || [];
// ...
const regeneratedVideos = await filterVideos(researchQuery, videoResultsFormatted, ...);
```

If `raw_video_results` is empty, `filterVideos` is called with an empty list. That can lead to parse errors, empty selection, or unclear server errors.

**Recommendation**

- Before calling `filterVideos` for the `'videos'` stage, check that `videoResults.length > 0`.
- If it’s 0, respond with a clear client error (e.g. 400 or 409) and a message like “Cannot reselect videos: video pool not available. Please start a new research run.” Do not call `filterVideos` with an empty array.

---

## 4. Prompts: mirror question generation / regeneration pattern

Video reselect should use the same **two-prompt** pattern as questions: a base prompt for initial selection and a dedicated **regeneration** prompt for reselect-with-feedback, instead of one prompt plus an appended feedback block.

### Current question pattern (to mirror)

- **`question-generation.md`**: Full prompt for initial question generation (criteria, framework, output format).
- **`question-regeneration.md`**: Dedicated regeneration prompt that:
  - Injects **original output** (`{original_questions}`).
  - Injects **user feedback** (`{user_feedback}`).
  - Injects **criteria from the base prompt** via `{questionGenerationCriteria}` (loaded from `question-generation.md` from “## Question Quality Criteria” onward).
  - Instructs the model to incorporate feedback while preserving quality and output format.

### Current video behavior (to change)

- **`video-filtering.md`**: Single prompt for both initial selection and reselect.
- When `userFeedback` is present, `getVideoFilteringPrompt()` **appends** a “User Feedback” section to the same template (in `research.prompt.ts`), and there is no separate regeneration template or injected criteria.

### Recommended prompt structure for video

1. **Keep `video-filtering.md`** as the **initial selection only** prompt (like `question-generation.md`). Remove or do not use any `{user_feedback}` placeholder there; it is used only when there is no user feedback.

2. **Add `video-filtering-regeneration.md`** (like `question-regeneration.md`) that:
   - **Context**: Date, language, research query.
   - **Previous selection**: `{original_selected_videos}` — e.g. a short list of previously selected videos (title, channel, classification) so the model knows what was chosen before.
   - **User feedback**: `{user_feedback}` — the user’s reselect instructions.
   - **Same pool**: The same search results and research questions as the initial run — i.e. the regeneration prompt must receive `{searchResults}` and `{questions_section}` (or equivalent) so the model reselects from the **same candidate set** and same research questions.
   - **Criteria**: `{videoFilteringCriteria}` — content loaded from `video-filtering.md` (e.g. from “## YOUR GOAL” or “**CRITICAL: PRIMARY SELECTION CRITERIA**” through credibility/selection rules, up to but not necessarily including the full output format). This keeps regeneration aligned with the same selection rules and quality bar.
   - **Instructions**: Explicit steps to (1) analyze feedback, (2) preserve what still fits, (3) adjust selection based on feedback, (4) still apply credibility/quality rules, (5) output the same JSON format.
   - **Output format**: Same JSON structure as in `video-filtering.md` (can be injected from the base file or repeated in the regeneration template so the model outputs valid JSON with no extra text).

3. **Code changes** in `backend/src/prompts/research.prompt.ts`:
   - Add **`loadVideoFilteringCriteria()`**: Load a defined section of `video-filtering.md` (e.g. from a marker like “## YOUR GOAL” or “**CRITICAL: PRIMARY SELECTION CRITERIA**” through the selection/credibility sections, stopping before “## OUTPUT FORMAT”) and return it as a string for injection into the regeneration prompt.
   - In **`getVideoFilteringPrompt()`**: When `params.userFeedback` is present, **do not** use `video-filtering.md` with an appended feedback block. Instead:
     - Load the template **`video-filtering-regeneration.md`**.
     - Replace placeholders: `{original_selected_videos}`, `{user_feedback}`, `{searchResults}`, `{questions_section}` (or equivalent), `{language}`, `{date}`, `{researchQuery}`, and `{videoFilteringCriteria}`.
     - Use the same `formatVideoResults(params.videoResults)` for `{searchResults}` and the same questions section logic for `{questions_section}`.
     - Ensure the regeneration prompt receives the **previous selection** (e.g. from the service layer: pass `previousSelectedVideos` or `originalVideos` into the prompt builder when building the regeneration prompt).
   - The **research service** (e.g. `filterVideos` or the controller) must pass the **previous selection** into the prompt builder when calling it with feedback (e.g. `originalVideos` / `previousSelectedVideos`), so the regeneration template can show “You previously selected: …” and “User feedback: …”.

4. **Service/controller**: When calling `getVideoFilteringPrompt(..., userFeedback)` for the videos regeneration path, pass the **original/previous selected videos** (e.g. `lockedResearchData.previous_selected_videos` or `lockedResearchData.selected_videos` before regeneration) so the prompt can populate `{original_selected_videos}`.

### Result

- Initial video selection: unchanged flow using `video-filtering.md` only (no feedback).
- Reselect with feedback: uses a dedicated `video-filtering-regeneration.md` with original selection + feedback + same pool + same criteria and output format, aligned with how `question-generation.md` and `question-regeneration.md` work.

---

## 5. Flow summary (for reference)

1. User is on video approval; clicks “Request changes” and submits feedback.
2. Frontend calls `POST /api/research/:job_id/regenerate/videos` with body `{ feedback }`.
3. Controller: reads `req.body.feedback`, checks `researchData[feedbackCountField]` (currently `videos_feedback_count`) against `max_feedback_per_stage`, sets status to `regenerating`, then loads `raw_video_results` and calls `filterVideos(..., feedback)`.
4. On success: `updateJobStatus` with new `selected_videos`, `[feedbackCountField]` (currently `videos_feedback_count`), etc.; then `broadcastJobProgress` with `video_feedback_count` and `selected_videos`.
5. Frontend: receives SSE, updates `selectedVideos` and `research_data`; if it later polls or reconnects, it gets status from `job.research_data`, where only the canonical keys (`video_feedback_count`, etc.) are used.

Fixing the feedback count key (section 2), adding the empty-pool guard (section 3), and aligning prompts with the question generation/regeneration pattern (section 4) will make video reselect feedback behave correctly and predictably and keep prompt structure consistent across research stages.
