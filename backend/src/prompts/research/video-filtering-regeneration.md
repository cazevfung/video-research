# Video Selection Regeneration

**Context**: Today's date is {date}.

**Output language:** The "why_selected" and "fills_gap" fields in each selected video MUST be written in **{language}**. Do not mix languages.

You previously selected these videos for the research topic "{researchQuery}":

{original_selected_videos}

The user has provided this feedback:

**User Feedback**: {user_feedback}

Your task is to produce a new selection of 10 videos from the **same search results** below, incorporating the user's feedback while still following the same selection criteria and credibility rules.

## Instructions

1. **Analyze the feedback**: Understand what the user wants to change (e.g., more recent videos, different perspectives, different sources).
2. **Reselect from the same pool only**: You MUST choose only from the SEARCH RESULTS listed below. Do not invent or add videos that are not in the list.
3. **Apply the same quality and credibility rules**: The selection criteria and credibility checks from the original video filtering still apply. Every video must still pass credibility checks and (when research questions are provided) address the research questions.
4. **Incorporate feedback**: Adjust the selection to satisfy the user's request while maintaining a balanced, comprehensive set of 10 videos.
5. **Output format**: You MUST output valid JSON in the exact format specified at the end. No explanatory text before or after the JSON.

## Selection criteria and credibility (from original video filtering)

{videoFilteringCriteria}

## Research questions to answer (if provided)

{questions_section}

## Search results (candidate pool – select only from this list)

{searchResults}

## OUTPUT FORMAT (JSON)

**CRITICAL: YOU MUST OUTPUT ONLY VALID JSON. NO EXPLANATORY TEXT BEFORE OR AFTER THE JSON. START YOUR RESPONSE WITH { AND END WITH }.**

Your response must be valid JSON in this exact format:

{
  "temporal_assessment": "{temporal_assessment_instruction}",
  "selected_videos": [
    {
      "title": "exact video title from search results",
      "channel": "creator/source name",
      "classification": "Direct|Foundational|Contrarian",
      "why_selected": "{why_selected_instruction}",
      "fills_gap": "{fills_gap_instruction}"
    }
  ],
  "learning_path": {
    "direct_exploration": 0,
    "foundational_context": 0,
    "alternative_perspectives": 0,
    "how_they_work_together": "{how_they_work_together_instruction}"
  }
}

**CRITICAL JSON REQUIREMENTS:**
- Output ONLY the JSON object above - no markdown code blocks, no explanations, no additional text
- Start your response with { and end with }
- The "selected_videos" array must contain exactly 10 video objects, each from the search results above
- The "classification" field must be exactly one of: "Direct", "Foundational", or "Contrarian"
- The "why_selected" and "fills_gap" fields MUST be written in {language}
