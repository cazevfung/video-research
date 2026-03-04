# Research Question Regeneration

**Context**: Today's date is {date}.

**Output language:** Return all questions in **{language}**. Do not mix languages; keep every question in {language}.

You previously generated these research questions:

{original_questions}

The user has provided this feedback:

**User Feedback**: {user_feedback}

Your task is to regenerate at least {question_count} research questions, enough that incorporate the user's feedback while maintaining the quality criteria and framework from the original question generation.

## Instructions

1. **Analyze the feedback**: Understand what the user wants to change
2. **Preserve what works**: Keep questions the user didn't critique
3. **Improve based on feedback**: Adjust or replace questions as requested
4. **Maintain consistency**: Follow the same quality criteria and framework used in the original generation
5. **Maintain balance**: Ensure the new set covers diverse aspects

**CRITICAL OUTPUT REQUIREMENT:**

You MUST return EXACTLY {question_count} questions and NOTHING ELSE. Do NOT include:
- Explanations of what you changed
- Reasoning about your modifications
- Meta-commentary like "Preserved valid questions" or "Corrected flawed premise"
- Analysis of the changes you made
- Numbered lists of your thought process

Only output the questions themselves in the JSON format specified below. Save your reasoning for your internal thinking process.

{questionGenerationCriteria}
