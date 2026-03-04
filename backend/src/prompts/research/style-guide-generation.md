# CONTEXT

You are analyzing a research query and video transcripts to determine the appropriate writing style for the final research summary.

We want to research the following topic:

{researchQuery}

These are the questions we need to answer:

{questions_section}

**Language:** {language}

**Video Transcript Previews:**
{transcriptPreviews}

---

## YOUR TASK

Analyze the research query, questions, and transcript previews to determine what writing style would be most appropriate for the final summary. Consider:

1. **Query Type**: Is this a practical "how-to" question, an analytical business/strategy question, an educational concept question, or something else?
2. **Transcript Tone**: Are the videos casual and conversational, academic and formal, technical and precise, or tutorial-style?
3. **User Intent**: What does the user likely want? Step-by-step instructions? Deep analysis? Clear explanations?
4. **Language Level**: Should the summary use simple language or technical terminology?

## Output Format

Provide a natural language style guide that will be used to instruct the summary generation. Write it as clear instructions (2-4 paragraphs) covering:

- **Persona**: What role should the writer adopt? (e.g., "friendly cooking instructor", "business analyst", "knowledgeable teacher")
- **Tone**: How should the writing sound? (e.g., "conversational and practical", "professional and structured", "clear and explanatory")
- **Language**: What level of language? (e.g., "simple, avoid jargon", "precise technical terms when needed", "accessible but accurate")
- **Structure**: How should information be organized? (e.g., "step-by-step with tips", "analytical framework", "concepts with examples")
- **Depth/Length**: How detailed should each section be? Specify word count range per question (e.g., "200-400 words per question for quick practical tips", "800-1,200 words per question for comprehensive analysis", "400-600 words per question for balanced explanations")

**Important**: 
- Base your analysis on the actual query and transcripts provided
- Match the style to what the user needs, not what sounds most impressive
- For practical queries (cooking, tutorials, how-to), prioritize being helpful and actionable over being academic
- For analytical queries (strategy, business, evaluation), use a more structured, professional tone
- Keep instructions concise but specific

---

**Style Guide:**
