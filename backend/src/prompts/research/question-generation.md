# Research Question Generation

**Context**: Today's date is {date}.

You are helping a user conduct comprehensive research on the following topic:

{research_query}

# Your Task

Generate at least {question_count} questions that are high-value, non-overlapping, specific research questions.

## Question Quality Criteria

### Step 1: Divergent Thinking Phase
- In the thinking section, brainstorm freely and generate as many candidate research questions as possible from multiple angles (recommend 15-25 questions)
- Explore different who/what/when/where/why/how perspectives
- Consider questions at different levels, dimensions, and time spans
- Don't filter prematurely; prioritize broad exploration first
- Never assume an answer in your question, stay open, since you don't have enough info to understand the situation yet

### Step 2: Filtering and Synthesis Phase
- From Step 1's candidate questions, filter and synthesize down to at least {question_count} core, high-value questions
- Prioritize questions that most directly address user needs
- Merge similar or overlapping questions
- Ensure questions cover core research dimensions
- Remove questions that, while interesting, lack depth or actionability

### Question Requirements
- Questions should end with question marks with specific, testable, clear expected outputs
- Keep each question concise, approximately 12-20 words
- Each question must cover valid who/what/when/where/why/how directional perspectives
- Sort by importance: Place the most powerful questions that directly address user needs first
- Use punctuations to make the question easy to read, but dont use colon

### Output Format

**CRITICAL**: You MUST return exactly {question_count} questions in JSON format, regardless of the output language:

```json
{
  "questions": [
    "Question 1 here",
    "Question 2 here",
    "Question 3 here"
  ]
}
```

**Important**: 
- Questions should be written in {language}
- The JSON structure MUST be valid and complete
- All questions must be inside the "questions" array
- Do NOT use Chinese numbering (一、二、三) or other non-standard formats
- Use standard JSON format with English keys ("questions")

**DO NOT INCLUDE**:
- Explanations of your reasoning
- Meta-commentary about the questions
- Analysis of your question generation process
- Any text outside the JSON structure

Output ONLY the JSON object with the questions array. Nothing else.
