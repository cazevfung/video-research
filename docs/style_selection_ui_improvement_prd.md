# PRD: Summary Style Selection UI Enhancement

**Product**: Video Research Summarization Engine  
**Document Type**: Product Requirements Document  
**Date**: January 15, 2026  
**Status**: Proposed  
**Related PRD**: `summarization_prompt_improvement_prd.md`

---

## Executive Summary

The current style selection UI displays summary styles as compact toggle buttons with minimal labels (e.g., "TL;DR", "Tutorial", "Detailed"). Users lack sufficient context to confidently choose the right style for their needs. This PRD proposes expanding the style selection component to provide clear, descriptive explanations for each style, similar to the effective "TED Talk Extract" and "McKinsey Way" descriptions that give users confidence in their selection.

**Impact**: Users will make more informed style selections, reducing summary regeneration rates and improving overall satisfaction with the summarization output.

---

## Problem Statement

### Current State

The style selection component (`ControlPanel.tsx`) displays styles as horizontal toggle buttons:

```
┌─────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
│  TL;DR  │ │Bullet Points │ │ Deep Dive│ │Tutorial │ │ Detailed │
└─────────┘ └──────────────┘ └──────────┘ └─────────┘ └──────────┘
```

**Issues**:
1. **No context**: Users see only style names without understanding what each style produces
2. **No differentiation**: Without descriptions, styles appear interchangeable
3. **Low confidence**: Users must guess which style fits their use case
4. **No framework reference**: Missing the helpful context like "TED Talk Extract" or "McKinsey Way" that builds trust

### User Pain Points

- **Uncertainty**: "What's the difference between 'Detailed' and 'Deep Dive'?"
- **Trial and error**: Users regenerate summaries multiple times to find the right style
- **Missed opportunities**: Users may not realize "Tutorial" style is perfect for how-to content
- **Lack of trust**: Without understanding the methodology, users question summary quality

### Evidence

From the main PRD (`summarization_prompt_improvement_prd.md`), we know:
- **Tutorial** uses "Talk Like TED + Visual Thinking" framework
- **Detailed** uses "McKinsey Way + Pyramid Principle" framework
- **TLDR** uses "Smart Brevity + Pyramid Principle" framework
- **Bullet Points** uses "Smart Brevity format"
- **Deep Dive** uses "Research Paper structure + McKinsey Way"

These framework references (like "TED Talk Extract" and "McKinsey Way") are effective because they:
- Reference well-known methodologies users trust
- Set clear expectations about output quality
- Help users match their use case to the right style

---

## Proposed Solution

### Design Concept

Transform the style selection from compact toggle buttons to an expanded card-based layout where each style has dedicated space to display:

1. **Style Name** (prominent)
2. **Framework Reference** (e.g., "TED Talk Extract", "McKinsey Way")
3. **Brief Description** (1-2 sentences explaining what the style produces)
4. **Best For** (use case guidance)
5. **Key Characteristics** (2-3 bullet points)

### Visual Layout Options

#### Option A: Grid Layout (Recommended)
```
┌─────────────────────┐ ┌─────────────────────┐
│   TL;DR             │ │   Bullet Points      │
│   (Smart Brevity)   │ │   (Smart Brevity)   │
│                     │ │                     │
│   Ultra-concise...  │ │   Scannable key...  │
│   Best for: Quick   │ │   Best for: Meeting │
│   • 100 words max   │ │   • 500 words max   │
│   • Lead w/ answer  │ │   • Topline format  │
└─────────────────────┘ └─────────────────────┘
┌─────────────────────┐ ┌─────────────────────┐
│   Tutorial          │ │   Detailed         │
│   (TED Talk Extract)│ │   (McKinsey Way)    │
│                     │ │                     │
│   Step-by-step...   │ │   Comprehensive... │
│   Best for: How-to  │ │   Best for: Full    │
│   • 1500 words max  │ │   • 3000 words max │
│   • Code examples   │ │   • Executive sum   │
└─────────────────────┘ └─────────────────────┘
┌─────────────────────┐
│   Deep Dive         │
│   (Research Paper)  │
│                     │
│   Technical depth...│
│   Best for: Analysis│
│   • 3000 words max  │
│   • Benchmarks      │
└─────────────────────┘
```

#### Option B: Accordion/Collapsible Cards
Each style expands to show full description when clicked/hovered.

#### Option C: Side-by-Side Comparison
Show all styles in a single scrollable view with consistent sections.

### Content Specifications

#### TLDR Style
- **Name**: TL;DR
- **Framework Reference**: Smart Brevity + Pyramid Principle
- **Description**: Ultra-concise summary that leads with the main conclusion. Perfect for quick scanning and mobile reading.
- **Best For**: Executives, quick overviews, mobile users, time-constrained readers
- **Key Characteristics**:
  - Maximum 100 words
  - Leads with the answer (Pyramid Principle)
  - Passes Twitter Test (core idea in 280 characters)
  - Bold topline with concrete data

#### Bullet Points Style
- **Name**: Bullet Points
- **Framework Reference**: Smart Brevity Format
- **Description**: Scannable key points in structured format. Topline summary followed by prioritized bullets with concrete details.
- **Best For**: Meeting notes, quick reference, scannable takeaways, team sharing
- **Key Characteristics**:
  - Maximum 500 words
  - Topline + Why it matters + Key points
  - Each bullet passes "so what?" test
  - Bold keywords frontload each bullet

#### Tutorial Style
- **Name**: Tutorial
- **Framework Reference**: TED Talk Extract + Visual Thinking
- **Description**: Step-by-step guide with code examples and visual analogies. Extracts the "one technique worth learning" with actionable instructions.
- **Best For**: How-to content, code tutorials, technical guides, learning new skills
- **Key Characteristics**:
  - Maximum 1500 words
  - Core idea with analogy
  - Step-by-step with code snippets
  - Common pitfalls highlighted
  - Can replicate without watching video

#### Detailed Style
- **Name**: Detailed
- **Framework Reference**: McKinsey Way + Pyramid Principle
- **Description**: Comprehensive article-style summary with executive summary, structured sections, and actionable recommendations. Designed to replace watching all videos.
- **Best For**: Comprehensive analysis, strategic decisions, replacing video viewing, in-depth research
- **Key Characteristics**:
  - Maximum 3000 words
  - Executive summary (standalone)
  - Situation-Complication-Resolution structure
  - Each section leads with conclusion
  - Separate analysis section

#### Deep Dive Style
- **Name**: Deep Dive
- **Framework Reference**: Research Paper Structure + McKinsey Way
- **Description**: Technical deep dive with comprehensive analysis, performance benchmarks, and multiple implementation approaches. Maximum depth and detail.
- **Best For**: Technical analysis, performance evaluation, trade-off discussions, research-level detail
- **Key Characteristics**:
  - Maximum 3000 words
  - Extensive code examples
  - Performance benchmarks
  - Multiple implementation approaches
  - Trade-off discussions

---

## Requirements

### Functional Requirements

#### FR-1: Expand Style Selection Component
**Priority**: P0 (Blocking)

Transform `ControlPanel.tsx` style selection from toggle buttons to card-based layout.

**Acceptance Criteria**:
- [ ] Each style displayed as a card with dedicated space (minimum 200px width per card)
- [ ] Cards arranged in responsive grid (2-3 columns on desktop, 1 column on mobile)
- [ ] Each card shows: name, framework reference, description, "Best for", key characteristics
- [ ] Selected style clearly indicated (border highlight, background change)
- [ ] Cards are clickable to select style
- [ ] Hover states provide visual feedback
- [ ] Maintains accessibility (keyboard navigation, screen reader support)

#### FR-2: Add Style Descriptions Content
**Priority**: P0 (Blocking)

Create content definitions for each style with framework references and use case guidance.

**Acceptance Criteria**:
- [ ] Content stored in translation files (`frontend/src/locales/*/summary.json`)
- [ ] Each style has: name, framework, description (1-2 sentences), "Best for" (3-5 use cases), characteristics (2-4 bullets)
- [ ] Framework references match backend prompt definitions
- [ ] Content is concise but informative (scannable in 5-10 seconds)
- [ ] All content is translatable (i18n support)

#### FR-3: Responsive Design
**Priority**: P1 (High)

Ensure style selection works across all device sizes.

**Acceptance Criteria**:
- [ ] Desktop (≥1024px): 2-3 column grid
- [ ] Tablet (768-1023px): 2 column grid
- [ ] Mobile (<768px): 1 column stack
- [ ] Cards maintain readability at all sizes
- [ ] Touch targets meet accessibility standards (minimum 44x44px)

#### FR-4: Visual Hierarchy
**Priority**: P1 (High)

Ensure selected style is clearly distinguished and framework references are prominent.

**Acceptance Criteria**:
- [ ] Selected card has distinct visual treatment (border, background, or both)
- [ ] Framework reference is visually prominent (e.g., smaller text, different color)
- [ ] Style name is largest text element
- [ ] Description and characteristics are scannable (proper spacing, bullet formatting)
- [ ] Follows existing design system (colors, typography, spacing from `visual-effects.ts`)

### Non-Functional Requirements

#### NFR-1: Performance
- Style selection component should render in <100ms
- No layout shift when switching between styles
- Smooth hover/selection transitions (<200ms)

#### NFR-2: Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation (Tab to navigate, Enter/Space to select)
- Screen reader announcements for style selection
- Focus indicators clearly visible

#### NFR-3: Maintainability
- Style content stored in i18n files (not hardcoded)
- Component structure allows easy addition of new styles
- Framework references can be updated without code changes

#### NFR-4: Backward Compatibility
- Existing API contracts unchanged
- Style values (`tldr`, `tutorial`, etc.) remain the same
- No breaking changes to parent component props

---

## Implementation Plan

### Phase 1: Content Definition (Day 1)
1. **Define style descriptions**
   - Write content for all 5 styles
   - Include framework references matching backend
   - Add to translation files (`en/summary.json`)

2. **Review with stakeholders**
   - Ensure descriptions are clear and accurate
   - Verify framework references match user expectations
   - Confirm "Best for" use cases are helpful

### Phase 2: Component Design (Day 2-3)
3. **Design card component**
   - Create `StyleCard.tsx` component
   - Implement responsive grid layout
   - Add selection and hover states

4. **Update ControlPanel**
   - Replace `ToggleGroup` with grid of `StyleCard` components
   - Maintain existing selection logic
   - Ensure proper state management

### Phase 3: Styling & Polish (Day 4)
5. **Apply design system**
   - Use colors, typography, spacing from `visual-effects.ts`
   - Ensure consistent with existing UI
   - Add smooth transitions

6. **Responsive testing**
   - Test on desktop, tablet, mobile
   - Verify touch interactions
   - Check accessibility

### Phase 4: Testing & Refinement (Day 5)
7. **User testing**
   - Test with 5-10 users
   - Gather feedback on clarity and usefulness
   - Iterate on descriptions if needed

8. **Final polish**
   - Address any UX issues
   - Optimize performance
   - Documentation updates

---

## Success Metrics

### Quantitative Metrics

1. **Style Selection Confidence** (Baseline: TBD)
   - Measure: User survey question "I felt confident choosing a style" (1-5 scale)
   - Target: Average score ≥4.0
   - Method: Post-selection survey

2. **Summary Regeneration Rate** (Baseline: TBD)
   - Measure: % of summaries regenerated with different style
   - Target: <20% regeneration rate (down from current)
   - Method: Analytics tracking

3. **Time to Selection** (Baseline: TBD)
   - Measure: Average time from page load to style selection
   - Target: No increase (maintains current speed)
   - Method: User session tracking

### Qualitative Metrics

4. **Clarity Test**
   - Question: "Could you explain the difference between styles?"
   - Target: 80%+ of users can articulate differences
   - Method: User interviews (10 participants)

5. **Use Case Matching**
   - Question: "Did you choose the right style for your needs?"
   - Target: 90%+ satisfaction
   - Method: Post-summary survey

---

## Design Mockups

### Desktop View (Recommended Layout)
```
┌─────────────────────────────────────────────────────────────┐
│ Prompt Presets                                               │
├──────────────────────────────┬──────────────────────────────┤
│ ┌──────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ TL;DR                     │ │ │ Bullet Points             │ │
│ │ Smart Brevity             │ │ │ Smart Brevity Format      │ │
│ │                           │ │ │                           │ │
│ │ Ultra-concise summary     │ │ │ Scannable key points in   │ │
│ │ that leads with the main  │ │ │ structured format.        │ │
│ │ conclusion.               │ │ │                           │ │
│ │                           │ │ │ Best for: Meeting notes,  │ │
│ │ Best for: Quick overviews,│ │ │ quick reference, team     │ │
│ │ mobile users              │ │ │ sharing                   │ │
│ │                           │ │ │                           │ │
│ │ • 100 words maximum       │ │ │ • 500 words maximum       │ │
│ │ • Leads with answer       │ │ │ • Topline format          │ │
│ │ • Twitter Test ready      │ │ │ • Prioritized bullets     │ │
│ └──────────────────────────┘ │ └──────────────────────────┘ │
├──────────────────────────────┼──────────────────────────────┤
│ ┌──────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ Tutorial                  │ │ │ Detailed                 │ │
│ │ TED Talk Extract          │ │ │ McKinsey Way             │ │
│ │                           │ │ │                           │ │
│ │ Step-by-step guide with   │ │ │ Comprehensive article-    │ │
│ │ code examples. Extracts   │ │ │ style summary designed   │ │
│ │ the "one technique worth  │ │ │ to replace watching all  │ │
│ │ learning."                │ │ │ videos.                  │ │
│ │                           │ │ │                           │ │
│ │ Best for: How-to content, │ │ │ Best for: Comprehensive   │ │
│ │ code tutorials            │ │ │ analysis, strategic       │ │
│ │                           │ │ │ decisions                │ │
│ │                           │ │ │                           │ │
│ │ • 1500 words maximum      │ │ │ • 3000 words maximum     │ │
│ │ • Code examples           │ │ │ • Executive summary       │ │
│ │ • Visual analogies        │ │ │ • SCQA structure         │ │
│ └──────────────────────────┘ │ └──────────────────────────┘ │
├──────────────────────────────┴──────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Deep Dive                                                 │ │
│ │ Research Paper Structure                                  │ │
│ │                                                           │ │
│ │ Technical deep dive with comprehensive analysis,          │ │
│ │ performance benchmarks, and multiple approaches.          │ │
│ │                                                           │ │
│ │ Best for: Technical analysis, performance evaluation      │ │
│ │                                                           │ │
│ │ • 3000 words maximum                                      │ │
│ │ • Performance benchmarks                                 │ │
│ │ • Multiple implementations                               │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Mobile View
```
┌─────────────────────────┐
│ Prompt Presets          │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ TL;DR               │ │
│ │ Smart Brevity       │ │
│ │                     │ │
│ │ Ultra-concise...    │ │
│ │                     │ │
│ │ Best for: Quick...  │ │
│ │                     │ │
│ │ • 100 words max     │ │
│ │ • Leads w/ answer   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Bullet Points       │ │
│ │ ...                 │ │
│ └─────────────────────┘ │
│ [Scroll for more...]    │
└─────────────────────────┘
```

---

## Content Examples

### Translation File Structure
```json
{
  "form": {
    "promptPresets": "Prompt Presets",
    "styleDescriptions": {
      "tldr": {
        "name": "TL;DR",
        "framework": "Smart Brevity + Pyramid Principle",
        "description": "Ultra-concise summary that leads with the main conclusion. Perfect for quick scanning and mobile reading.",
        "bestFor": "Quick overviews, mobile users, executives, time-constrained readers",
        "characteristics": [
          "100 words maximum",
          "Leads with the answer (Pyramid Principle)",
          "Passes Twitter Test (core idea in 280 characters)",
          "Bold topline with concrete data"
        ]
      },
      "tutorial": {
        "name": "Tutorial",
        "framework": "TED Talk Extract + Visual Thinking",
        "description": "Step-by-step guide with code examples and visual analogies. Extracts the 'one technique worth learning' with actionable instructions.",
        "bestFor": "How-to content, code tutorials, technical guides, learning new skills",
        "characteristics": [
          "1500 words maximum",
          "Core idea with analogy",
          "Step-by-step with code snippets",
          "Common pitfalls highlighted",
          "Can replicate without watching video"
        ]
      },
      "detailed": {
        "name": "Detailed",
        "framework": "McKinsey Way + Pyramid Principle",
        "description": "Comprehensive article-style summary with executive summary, structured sections, and actionable recommendations. Designed to replace watching all videos.",
        "bestFor": "Comprehensive analysis, strategic decisions, replacing video viewing, in-depth research",
        "characteristics": [
          "3000 words maximum",
          "Executive summary (standalone)",
          "Situation-Complication-Resolution structure",
          "Each section leads with conclusion",
          "Separate analysis section"
        ]
      }
    }
  }
}
```

---

## Risk Assessment

### Risk 1: Information Overload
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**: 
- Keep descriptions concise (1-2 sentences)
- Use progressive disclosure (show more on hover/click if needed)
- Test with users to find optimal information density

### Risk 2: Layout Complexity
**Probability**: Low  
**Impact**: Medium  
**Mitigation**: 
- Start with simple grid layout
- Use existing design system components
- Test responsive behavior early

### Risk 3: Translation Burden
**Probability**: Low  
**Impact**: Low  
**Mitigation**: 
- Structure content for easy translation
- Provide clear context for translators
- Use i18n framework already in place

### Risk 4: Performance Impact
**Probability**: Low  
**Impact**: Low  
**Mitigation**: 
- Lazy load style cards if needed
- Optimize images/icons
- Monitor render performance

---

## Open Questions

1. **Should we show word count ranges prominently?**
   - Context: Word limits are important but may clutter the UI
   - Decision needed by: End of Phase 1

2. **Should framework references be clickable/tooltips?**
   - Context: Users might want to learn more about "McKinsey Way" or "TED Talk Extract"
   - Decision needed by: End of Phase 2

3. **Should we add style previews or examples?**
   - Context: Showing example output could help users choose
   - Decision needed by: Before Phase 4

4. **How should we handle the "Pre-Condense" style?**
   - Context: This appears in the architecture diagram but isn't a user-selectable style
   - Decision needed by: End of Phase 1

---

## Appendix: Style Comparison Matrix

| Style | Framework | Word Limit | Best For | Key Differentiator |
|-------|-----------|------------|----------|-------------------|
| **TLDR** | Smart Brevity + Pyramid | 100 | Quick scans | Ultra-concise, leads with answer |
| **Bullet Points** | Smart Brevity | 500 | Scannable notes | Structured topline + bullets |
| **Tutorial** | TED Talk Extract | 1500 | How-to guides | Code examples + analogies |
| **Detailed** | McKinsey Way | 3000 | Comprehensive | Executive summary + SCQA |
| **Deep Dive** | Research Paper | 3000 | Technical analysis | Benchmarks + trade-offs |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | AI Assistant | Initial draft |
