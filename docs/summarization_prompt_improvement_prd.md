# PRD: Summarization Prompt System Improvement

**Product**: Video Research Summarization Engine  
**Document Type**: Product Requirements Document  
**Date**: January 15, 2026  
**Status**: Proposed

---

## Executive Summary

Our current summarization prompt system produces functional summaries but lacks the structural rigor and cognitive frameworks that produce truly exceptional, unbiased summaries. This PRD identifies specific deficiencies in our current prompts and proposes a two-tier architecture: **Core Principles** (universal foundation) + **Style-Specific Instructions** (targeted variations).

**Impact**: Implementing these improvements will result in summaries that are more actionable, memorable, and respectful of user time while maintaining objectivity and accuracy.

---

## Problem Statement

### Current System Architecture

Our summarization system uses:
- **Pre-condense prompt** (`pre-condense.prompt.md`): Reduces long video transcripts
- **Final summary prompt** (`final-summary.prompt.md`): Generates final summary from aggregated content
- **Style templates**: TLDR, Bullet Points, Tutorial, Detailed (metadata only)
- **Dynamic variables**: Language, style description, user focus, additional context

### Critical Deficiencies

#### 1. **Lack of Structural Framework** (HIGH SEVERITY)

**Current State**:
```
Style: {styleDescription}
Instructions:
- Maintain accuracy and preserve important technical details
- Cite which video each key point comes from when relevant
- Follow the {presetStyle} format exactly
```

**Problem**: 
- No implementation of Pyramid Principle (lead with conclusion)
- Style descriptions are generic: "Ultra-concise summary in 2-3 sentences (~100 words)"
- No guidance on SCQA framework (Situation, Complication, Question, Answer)
- Missing structural scaffolding for different content types

**Evidence**: Current prompts tell the AI *what* to produce (word count, format) but not *how* to think about the content (lead with answer, apply "so what?" test, use SCQA structure).

#### 2. **Absence of Objectivity Guardrails** (HIGH SEVERITY)

**Current State**:
- Single mention: "Maintain accuracy and preserve important technical details"
- No guidance on separating facts from interpretation
- No instruction to avoid charged language or emotional adjectives
- No framework for presenting multiple perspectives

**Problem**:
- Summaries may inadvertently inject bias
- No clear distinction between what the video states vs. what the AI infers
- Lack of neutral language enforcement

**Impact**: Users cannot trust summaries to be objective, especially for controversial or nuanced topics.

#### 3. **No Cognitive Stickiness Principles** (MEDIUM SEVERITY)

**Current State**: Zero implementation of SUCCESs framework (Simple, Unexpected, Concrete, Credible, Emotional, Stories)

**Problem**:
- Summaries may be forgettable
- No guidance on highlighting unexpected insights
- Abstract rather than concrete language
- No emphasis on practical, actionable takeaways

**Example**: A tutorial summary should identify the "one core technique worth learning" (Simple) and highlight "surprising gotchas" (Unexpected), but current prompts don't guide this.

#### 4. **Weak Conciseness Enforcement** (MEDIUM SEVERITY)

**Current State**:
- Word count targets: "~100 words", "~500 words", "~3000 words"
- No application of "so what?" test
- No BRIEF acronym guidance
- No instruction to "earn each sentence's place"

**Problem**: 
- Prompts specify length but not density
- No guidance on eliminating filler words
- Missing ruthless prioritization framework

**Impact**: Summaries may hit word counts while lacking information density.

#### 5. **Generic Style Descriptions** (MEDIUM SEVERITY)

**Current Style Descriptions**:
```typescript
tldr: 'Ultra-concise summary in 2-3 sentences (~100 words). 
      Focus on the most important takeaway.'

bullet_points: 'Key points in bullet format (~500 words). 
                Each bullet should be a distinct, important point.'

tutorial: 'Step-by-step guide with code examples where applicable (~1500 words). 
           Focus on actionable instructions and practical examples.'

detailed: 'Full article-style summary with multiple sections (~3000 words). 
           Comprehensive coverage with detailed explanations and context.'
```

**Problems**:
- **TLDR**: No guidance on Pyramid Principle or Twitter Test (280 characters)
- **Bullet Points**: No Smart Brevity structure (topline, why it matters, key points, what's next)
- **Tutorial**: No "one idea worth spreading" extraction or visual thinking analogies
- **Detailed**: No McKinsey Way or Situation-Complication-Resolution structure

#### 6. **Pre-Condense Prompt Issues** (LOW-MEDIUM SEVERITY)

**Current Pre-Condense Prompt**:
```
Your task is to summarize the following transcript, reducing its length 
by approximately {reductionPercent}% while maintaining:
- All technical details, numbers, and statistics
- Key arguments and nuanced points
- Important examples and case studies
- Specific terminology and jargon
- Actionable insights and recommendations
```

**Problems**:
- **Percentage reduction target is too restrictive** — Forces AI to focus on hitting an arbitrary length target rather than maximizing information density while preserving quality
- Lists what to preserve but not what to prioritize
- No guidance on structural preservation (e.g., "maintain argument hierarchy")
- Missing instruction to flag controversial claims or multiple perspectives
- No emphasis on preserving causal relationships ("X leads to Y")

---

## Proposed Solution

### Architecture: Two-Tier Prompt System

```
┌─────────────────────────────────────────────────────┐
│         Core Principles (Universal Base)            │
│  • Pyramid Principle                                │
│  • Objectivity Framework                            │
│  • SUCCESs Principles                               │
│  • Conciseness Enforcement                          │
│  • Content Type Awareness                           │
└─────────────────────────────────────────────────────┘
                         ↓
        ┌────────────────┴────────────────┐
        ↓                ↓                 ↓
┌───────────────┐ ┌──────────────┐ ┌─────────────┐
│ Pre-Condense  │ │    TLDR      │ │   Tutorial  │
│   Prompt      │ │   (Smart     │ │  (TED Talk  │
│               │ │   Brevity)   │ │   Extract)  │
└───────────────┘ └──────────────┘ └─────────────┘
        ↓                ↓                 ↓
┌───────────────┐ ┌──────────────┐ ┌─────────────┐
│ Bullet Points │ │   Detailed   │ │   Deep Dive │
│  (Smart Brev) │ │  (McKinsey   │ │  (Research  │
│               │ │    Way)      │ │    Paper)   │
└───────────────┘ └──────────────┘ └─────────────┘
```

### Core Principles Document

Create `summarization-principles.md` that defines:

1. **Pyramid Principle Application**
   - Lead with the main conclusion/answer
   - Support with 3-5 key points
   - Use SCQA framework
   - "So what?" test for every statement

2. **Objectivity Framework**
   - Separate facts from interpretation (label as "Analysis:" or "Interpretation:")
   - Use neutral verbs ("states", "explains", "demonstrates" vs. "claims", "admits")
   - Present multiple perspectives when they exist
   - Avoid charged adjectives

3. **SUCCESs Integration**
   - **Simple**: Extract the core idea first
   - **Unexpected**: Flag surprising insights or contradictions
   - **Concrete**: Use specific examples over abstractions
   - **Credible**: Cite sources and data
   - **Emotional**: (when appropriate) Connect to human impact
   - **Stories**: Use narrative structure sparingly

4. **Ruthless Conciseness**
   - BRIEF acronym (Background, Reason, Information, Ending, Follow-up)
   - Eliminate filler words
   - "Earn each sentence's place"
   - Aim for 1/3 original length (or specified ratio)

5. **Content Type Awareness**
   - Technical content → Problem-Solution-Benefit structure
   - Strategic content → Situation-Complication-Resolution
   - Tutorial content → Visual thinking (Can this be a diagram?)
   - Research content → Question-Answer-Methodology-Findings

### Style-Specific Instructions

Each prompt variation builds on Core Principles with specific guidance:

#### **TLDR Prompt**
- **Framework**: Smart Brevity + Pyramid Principle
- **Structure**: 
  1. One strong headline (the answer)
  2. Why it matters (1 sentence)
  3. Optional: One critical detail
- **Tests**: Twitter Test (can it fit in 280 characters?), Elevator Pitch Test
- **Word limit**: 100 words MAXIMUM

#### **Bullet Points Prompt**
- **Framework**: Smart Brevity format
- **Structure**:
  1. **Topline**: The main takeaway (1 sentence, bold)
  2. **Why it matters**: Context in 1 sentence
  3. **Key points**: 3-7 bullets (each must pass "so what?" test)
  4. **What's next**: Action items or implications
- **Tests**: Each bullet must be actionable or insightful
- **Word limit**: 500 words

#### **Tutorial Prompt**
- **Framework**: Talk Like TED + Visual Thinking
- **Structure**:
  1. **The One Idea**: Extract the "one technique worth learning"
  2. **Three Supporting Themes**: Core concepts
  3. **Step-by-Step**: Actionable instructions with code examples
  4. **Visual Analogies**: Use analogies to familiar concepts
  5. **Common Pitfalls**: Surprising gotchas (Unexpected)
- **Tests**: Can a developer replicate this without watching the video?
- **Word limit**: 1500 words

#### **Detailed Prompt**
- **Framework**: McKinsey Way + Pyramid Principle
- **Structure**:
  1. **Executive Summary** (1 paragraph): Key recommendation/finding
  2. **Situation-Complication-Resolution**: Frame the narrative
  3. **3-5 Main Sections**: Each led by a clear conclusion
  4. **Supporting Evidence**: Quantify when possible
  5. **Implications**: "So what?" answered explicitly
- **Tests**: Could this replace watching all videos?
- **Word limit**: 3000 words

#### **Pre-Condense Prompt Improvements**
- **Remove**: Percentage reduction target (too restrictive, forces artificial length goals)
- **Replace with**: Focus on maximizing information density while preserving ALL critical information
- **Add**: Preserve argument hierarchy (main claims → supporting evidence)
- **Add**: Flag multiple perspectives or controversial claims
- **Add**: Maintain causal relationships ("X causes Y", "If X then Y")
- **Add**: Prioritize actionable insights over descriptive content
- **Add**: Guidance on HOW to condense (eliminate filler, compress narrative, consolidate similar points)
- **Keep**: All numbers, dates, measurements (existing strength)
- **Philosophy**: Quality-first—condense as much as needed naturally while preserving information, not to hit a percentage target

---

## Requirements

### Functional Requirements

#### FR-1: Core Principles Document
**Priority**: P0 (Blocking)

Create `backend/src/prompts/principles/summarization-principles.md` containing:
- Pyramid Principle guidelines (with examples)
- Objectivity framework (with neutral vs. biased language examples)
- SUCCESs principles (with application examples)
- Conciseness enforcement (BRIEF acronym, "so what?" test)
- Content type detection and structural guidance

**Acceptance Criteria**:
- [ ] Document is 1500-2000 words
- [ ] Includes 5-10 concrete examples (good vs. bad)
- [ ] Can be referenced by all prompt variations
- [ ] Written in clear, instructional language

#### FR-2: Amend Pre-Condense Prompt
**Priority**: P0 (Blocking)

Update `pre-condense.prompt.md` to:
- Reference Core Principles
- Add argument hierarchy preservation
- Add perspective flagging
- Add causal relationship preservation
- Maintain existing strengths (technical details, numbers)

**Acceptance Criteria**:
- [ ] Includes explicit reference to Core Principles
- [ ] Adds 3-5 new structural guidelines
- [ ] Removes percentage reduction target (focuses on information density instead)
- [ ] Emphasizes quality preservation over length targets
- [ ] Word count: 300-400 words

#### FR-3: Amend Final Summary Prompt
**Priority**: P0 (Blocking)

Update `final-summary.prompt.md` to:
- Reference Core Principles explicitly
- Replace generic style descriptions with framework-specific instructions
- Add dynamic style-specific structural guidance

**Acceptance Criteria**:
- [ ] Injects Core Principles before style-specific instructions
- [ ] Each style variation includes framework reference (e.g., "Apply Smart Brevity format")
- [ ] Maintains existing placeholders: {language}, {styleDescription}, {userFocus}, etc.
- [ ] Word count: 400-600 words (base template)

#### FR-4: Create Enhanced Style Descriptions
**Priority**: P0 (Blocking)

Update `final-summary.prompt.ts` `getPresetStyleDescription()` function:

```typescript
// OLD (example)
tldr: 'Ultra-concise summary in 2-3 sentences (~100 words). 
       Focus on the most important takeaway.'

// NEW (example)
tldr: `Apply Smart Brevity + Pyramid Principle:
1. Lead with the main conclusion (1 sentence, bold)
2. Why it matters (1 sentence)
3. Optional critical detail
Pass the Twitter Test: Can the essence fit in 280 characters?
MAXIMUM 100 words.`
```

**Acceptance Criteria**:
- [ ] All 5 styles (tldr, bullet_points, tutorial, detailed, deep_dive) updated
- [ ] Each includes framework reference
- [ ] Each includes structural guidance (numbered steps)
- [ ] Each includes specific test/validation criteria
- [ ] Maintains TypeScript type safety

#### FR-5: Add Style-Specific Structural Templates
**Priority**: P1 (High)

Create new markdown files for each style:
- `prompts/templates/tldr-instructions.md`
- `prompts/templates/bullet-points-instructions.md`
- `prompts/templates/tutorial-instructions.md`
- `prompts/templates/detailed-instructions.md`

**Acceptance Criteria**:
- [ ] Each file contains 500-800 word detailed instructions
- [ ] Includes examples (good vs. bad)
- [ ] References Core Principles
- [ ] Provides structural scaffolding
- [ ] Can be dynamically injected into final prompt

#### FR-6: Update Final Summary Prompt Assembly
**Priority**: P1 (High)

Modify `getFinalSummaryPrompt()` in `final-summary.prompt.ts`:

```typescript
export function getFinalSummaryPrompt(
  options: FinalSummaryPromptOptions
): string {
  const { presetStyle, customPrompt, language, context } = options;

  // NEW: Load Core Principles
  const corePrinciples = loadCorePrinciples();
  
  // NEW: Load style-specific instructions
  const styleInstructions = loadStyleInstructions(presetStyle);
  
  // Assemble prompt
  let prompt = `${corePrinciples}\n\n---\n\n${styleInstructions}\n\n---\n\n`;
  // ... existing logic
}
```

**Acceptance Criteria**:
- [ ] Loads and injects Core Principles
- [ ] Loads style-specific instructions dynamically
- [ ] Maintains backward compatibility
- [ ] Properly handles file loading errors
- [ ] Updates unit tests

### Non-Functional Requirements

#### NFR-1: Performance
- Loading additional markdown files must not increase prompt generation time by >50ms
- Consider caching loaded principles/instructions

#### NFR-2: Maintainability
- Core Principles should be editable without code changes
- Style instructions should be independently modifiable
- Clear separation of concerns (principles vs. style vs. assembly logic)

#### NFR-3: Testability
- Create example outputs for each style showing before/after improvements
- Unit tests for prompt assembly logic
- Integration tests with sample transcripts

#### NFR-4: Backward Compatibility
- Existing summaries should not be affected
- API contracts remain unchanged
- Gradual rollout possible (A/B testing)

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. **Create Core Principles Document**
   - Write `summarization-principles.md`
   - Include 10 concrete examples
   - Review with team

2. **Create Style-Specific Instructions**
   - Write 4 instruction files (tldr, bullet_points, tutorial, detailed)
   - Include structural templates and examples
   - Document framework applications

### Phase 2: Code Changes (Week 1-2)
3. **Update Prompt Assembly Logic**
   - Add `loadCorePrinciples()` function
   - Add `loadStyleInstructions()` function
   - Update `getFinalSummaryPrompt()`
   - Add file caching mechanism

4. **Update Style Descriptions**
   - Modify `getPresetStyleDescription()` with new framework-aware descriptions
   - Ensure TypeScript type safety

5. **Amend Existing Prompts**
   - Update `pre-condense.prompt.md`
   - Update `final-summary.prompt.md`

### Phase 3: Testing & Validation (Week 2)
6. **Create Test Cases**
   - 5 sample transcripts (technical, tutorial, strategic, research, controversial)
   - Generate summaries with old vs. new prompts
   - Compare quality metrics:
     - Clarity (leads with conclusion?)
     - Objectivity (neutral language?)
     - Conciseness (information density)
     - Actionability (can user act on this?)
     - Memorability (SUCCESs principles applied?)

7. **A/B Testing**
   - Roll out to 10% of users
   - Collect feedback via surveys
   - Monitor summary regeneration rates (lower = better satisfaction)

### Phase 4: Documentation & Rollout (Week 3)
8. **Documentation**
   - Update API documentation
   - Create internal guide for prompt editing
   - Document framework applications

9. **Full Rollout**
   - Deploy to 100% of users
   - Monitor metrics
   - Iterate based on feedback

---

## Success Metrics

### Quantitative Metrics

1. **Information Density** (Baseline: TBD)
   - Measure: Key insights per 100 words
   - Target: +30% improvement
   - Method: Expert review of 50 summaries

2. **Objectivity Score** (Baseline: TBD)
   - Measure: % of statements that are factual vs. interpretive (properly labeled)
   - Target: 95% factual statements or properly labeled interpretations
   - Method: Automated text analysis + manual review

3. **Structural Compliance** (Baseline: 0%)
   - Measure: % of summaries that follow prescribed structure
   - Target: 90%+ compliance
   - Method: Automated pattern matching

4. **User Satisfaction** (Baseline: TBD)
   - Measure: Net Promoter Score (NPS) for summaries
   - Target: +10 points improvement
   - Method: Post-summary survey

### Qualitative Metrics

5. **Clarity Test**
   - Question: "Does the summary lead with the conclusion?"
   - Target: 95%+ compliance
   - Method: Expert review panel (5 reviewers)

6. **Actionability Test**
   - Question: "Can the user act on this summary without watching the video?"
   - Target: 80%+ for Tutorial/Detailed styles
   - Method: User testing with 20 participants

7. **Memorability Test**
   - Question: "Can users recall 3+ key points 24 hours later?"
   - Target: 70%+ recall rate
   - Method: Delayed user testing

---

## Risk Assessment

### Risk 1: Increased Prompt Complexity
**Probability**: High  
**Impact**: Medium  
**Mitigation**: 
- Keep Core Principles under 1500 words
- Use clear, instructional language
- Test with multiple AI models (ensure Claude, GPT-4 can parse effectively)

### Risk 2: Longer Generation Times
**Probability**: Medium  
**Impact**: Low  
**Mitigation**: 
- Implement file caching for principles/instructions
- Monitor generation latency
- Optimize if latency increases >100ms

### Risk 3: Style Drift (AI Doesn't Follow Structure)
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**: 
- Use explicit structural scaffolding (numbered steps)
- Include examples in prompts
- Implement post-processing validation
- Iterate on prompt phrasing based on results

### Risk 4: Backward Compatibility Issues
**Probability**: Low  
**Impact**: High  
**Mitigation**: 
- Maintain existing API contracts
- Gradual rollout with A/B testing
- Keep old prompt system as fallback
- Monitor error rates

---

## Open Questions

1. **Should we create a "Controversial Content" flag?**
   - Context: Some videos present biased or controversial viewpoints
   - Question: Should the system flag these and explicitly present multiple perspectives?
   - Decision needed by: End of Phase 1

2. **How to handle multi-language Core Principles?**
   - Context: Summaries can be generated in multiple languages
   - Question: Should Core Principles be translated, or kept in English?
   - Decision needed by: Before Phase 2

3. **Should users be able to select frameworks?**
   - Context: Power users might want to choose "Smart Brevity" vs. "McKinsey Way"
   - Question: Expose framework selection in UI, or keep internal?
   - Decision needed by: Before Phase 4

4. **Validation layer for summary quality?**
   - Context: We could implement automated checks (e.g., "Does first sentence contain a conclusion?")
   - Question: Build validation layer or rely on prompt engineering?
   - Decision needed by: Before Phase 3

---

## Appendix A: Example Improvements

### Before (Current TLDR)
```
This video discusses the new features in [Technology X], including the 
[Feature A] and [Feature B] for better [capability]. 
It covers performance improvements and shows examples of implementing 
these features in a [Framework Y] application. The speaker emphasizes the 
importance of understanding the trade-offs between [Approach A] and [Approach B] 
[components].
```
**Word count**: 58 words  
**Issues**: 
- Doesn't lead with conclusion
- Generic description ("discusses", "covers")
- No clear takeaway
- Fails Twitter Test (too long)

### After (Improved TLDR with Smart Brevity)
```
**[Technology X]'s biggest win: [Feature A] cuts [metric] by 40% 
by [how it works].**

Why it matters: You can now [capability] without [constraint], 
but you must choose wisely—[Approach A] can't use [feature].

Key tradeoff: [Tradeoff A] vs. [Tradeoff B].
```
**Word count**: 52 words  
**Improvements**: 
- ✅ Leads with concrete conclusion (40% improvement)
- ✅ Bold topline
- ✅ "Why it matters" section
- ✅ Clear tradeoff highlighted
- ✅ Passes Twitter Test (core idea: "use server cuts load times 40%")

---

### Before (Current Tutorial - excerpt)
```
The video explains how to set up [feature] in [Framework X] using 
[Library Y]. First, you need to install the [Library Y] package. Then you 
configure the [providers] in the API route. The tutorial 
shows how to protect routes and handle [management]...
```
**Issues**:
- Describes the video's structure, not the tutorial content
- No "one core idea"
- Missing visual analogies
- Not actionable without video

### After (Improved Tutorial)
```
**Core Idea**: [Library Y] is a [type] wrapper—think of it as a [analogy] 
checking [what] before letting requests into your app.

**Three-Step Setup**:
1. **Install & Configure** (5 min)
   ```bash
   [install command]
   # [file path]
   ```
   Configure providers ([Provider A], [Provider B], [Provider C])

2. **Protect Routes** (2 min)
   Wrap components: `[method]` → check session → redirect

3. **Access User Data** (1 min)
   `[hook]()` hook returns {user, status}

**Surprising Gotcha**: [Default behavior] expires in 30 days by default—users 
get [problem] unexpectedly. Set `[config option]` to extend.

**Visual Mental Model**:
[Request] → [[Library Y] Analogy] → {Valid Session? → [App] | No Session → [Login]}
```
**Improvements**:
- ✅ Core idea with analogy (bouncer)
- ✅ Step-by-step with time estimates
- ✅ Code snippets (actionable)
- ✅ "Surprising Gotcha" (Unexpected principle)
- ✅ Visual mental model (could be a diagram)

---

## Appendix B: Core Principles Preview (Excerpt)

```markdown
# Core Principles for Unbiased, Effective Summaries

## Principle 1: Lead with the Conclusion (Pyramid Principle)

**Rule**: The first sentence must contain the main finding, recommendation, 
or answer.

**Why**: Readers decide in 3 seconds whether to continue. Give them the 
payoff immediately.

**Good Example**:
"React Server Components reduce JavaScript bundle sizes by 70%, but require 
rethinking component architecture from client-first to server-first."

**Bad Example**:
"This video discusses [Feature X], a new feature in [Technology Y] 
that changes how [components] work."

**Application**: 
- TLDR: First sentence is the entire summary
- Bullet Points: Topline = conclusion
- Tutorial: Lead with the "one core technique"
- Detailed: Executive summary = conclusion + 3 key supports

---

## Principle 2: Separate Facts from Interpretation

**Rule**: Clearly label anything that isn't directly stated in the source.

**Labels to use**:
- "Analysis:" (your synthesis)
- "Interpretation:" (reading between the lines)
- "Implication:" (likely consequences)
- "Note:" (editorial comment)

**Good Example**:
"The video shows a 40% performance improvement. Analysis: This makes [Technology X] 
viable for [use case]."

**Bad Example**:
"The 40% improvement proves [Technology X] are superior to 
traditional approaches."
(Problem: "proves" and "superior" inject bias)

**Neutral Verbs**: states, explains, demonstrates, shows, presents, describes
**Biased Verbs**: claims, admits, insists, argues (use only if the source 
is actually making an argument)
```

---

## Appendix C: References

This PRD incorporates principles from:
- **Pyramid Principle** - Barbara Minto (McKinsey)
- **Smart Brevity** - Jim VandeHei, Mike Allen, Roy Schwartz (Axios)
- **Made to Stick (SUCCESs)** - Chip Heath, Dan Heath
- **BRIEF** - Joseph McCormack
- **Talk Like TED** - Carmine Gallo
- **The Back of the Napkin** - Dan Roam
- **Slide:ology** - Nancy Duarte

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | AI Assistant | Initial draft |

