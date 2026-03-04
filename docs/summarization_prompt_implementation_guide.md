# Implementation Guide: Summarization Prompt Improvements

**Related Documents**:
- PRD: `summarization_prompt_improvement_prd.md`
- Core Principles: `backend/src/prompts/principles/summarization-principles.md`
- Style Instructions: `backend/src/prompts/templates/*-instructions.md`

**Status**: Implementation Ready  
**Estimated Effort**: 2-3 weeks

---

## Overview

This guide walks through implementing the two-tier prompt architecture:

```
Core Principles (Universal) + Style-Specific Instructions = Final Prompt
```

---

## Phase 1: File Structure Updates

### 1.1 Create New Directory Structure

**Create the principles directory**:

```
backend/src/prompts/
├── principles/
│   └── summarization-principles.md [CREATED]
├── templates/
│   ├── tldr-instructions.md [CREATED]
│   ├── bullet-points-instructions.md [CREATED]
│   ├── tutorial-instructions.md [CREATED]
│   └── detailed-instructions.md [CREATED]
├── pre-condense.prompt.md [TO UPDATE]
├── final-summary.prompt.md [TO UPDATE]
└── final-summary.prompt.ts [TO UPDATE]
```

**Status**: ✅ Files created by this guide

---

## Phase 2: Update Pre-Condense Prompt

### 2.1 Amend `pre-condense.prompt.md`

**Current version** (18 lines):
```markdown
You are an expert at condensing long-form content while preserving all critical information.

Your task is to summarize the following transcript, reducing its length by approximately {reductionPercent}% while maintaining:
- All technical details, numbers, and statistics
- Key arguments and nuanced points
- Important examples and case studies
- Specific terminology and jargon
- Actionable insights and recommendations
...
```

**Updated version** (add these sections):

```markdown
You are an expert at condensing long-form content while preserving all critical information.

## Core Principles to Apply

1. **Preserve Pyramid Structure**: Maintain argument hierarchy (main claims → supporting evidence → details)
2. **Flag Multiple Perspectives**: If the transcript presents multiple viewpoints or controversial claims, preserve these distinctly
3. **Maintain Causal Relationships**: Keep "X causes Y", "If X then Y", "X leads to Y" structures intact
4. **Prioritize Actionable Insights**: When choosing what to condense, keep actionable information over descriptive content
5. **Maintain Objectivity**: Preserve neutral language; if source uses charged language, note it explicitly

Your task is to condense the following transcript by maximizing information density while maintaining ALL critical information. Focus on quality and completeness over arbitrary length targets.

**What to preserve (non-negotiable)**:
- All technical details, numbers, and statistics (exact numbers, dates, measurements)
- Key arguments and nuanced points **with their logical relationships**
- Important examples and case studies
- Specific terminology and jargon
- Actionable insights and recommendations **prioritized over background**
- Multiple perspectives or contradictory claims (label clearly: "Perspective A: ...", "Perspective B: ...")
- Causal structures (if source says "X causes Y", preserve this relationship)

**How to condense**:
- Eliminate filler words, repetition, and verbose phrasing
- Remove redundant explanations (keep only the clearest version)
- Compress narrative flow while preserving logical structure
- Consolidate similar points without losing nuance
- Use concise language without sacrificing precision

Guidelines:
- Preserve exact numbers, dates, and measurements
- Maintain the logical flow and argument hierarchy (don't flatten structure)
- Keep all important technical terms
- Do not add information that wasn't in the original
- Focus on information density over narrative flow
- Label controversial or debatable claims as such
- Preserve "surprising" or counterintuitive findings explicitly

**Quality over quantity**: The condensed version should be as short as possible while remaining comprehensive enough for further summarization. Don't sacrifice information for length—instead, make every word count.
```

**Changes**:
- ✅ References core principles (numbered list at top)
- ✅ Adds argument hierarchy preservation
- ✅ Adds perspective flagging
- ✅ Adds causal relationship emphasis
- ✅ Prioritizes actionability
- ✅ **REMOVED percentage reduction target** (focuses on information density instead)
- ✅ Emphasizes "preserve ALL critical information" as primary goal
- ✅ Provides clear guidance on HOW to condense (eliminate filler, compress narrative, etc.)
- ✅ Quality-first approach: "as short as possible while remaining comprehensive"

**File to update**: `backend/src/prompts/pre-condense.prompt.md`

### 2.2 Update TypeScript Code (Remove Reduction Percent Dependency)

**File**: `backend/src/prompts/pre-condense.prompt.ts`

**Current code** (uses config reductionPercent):
```typescript
export function getPreCondensePrompt(): string {
  const aiSettings = getAISettingsConfig();
  const reductionPercent = aiSettings.pre_condense_reduction_percent;
  
  const template = loadPromptTemplate();
  
  // Replace placeholder in template
  return template.replace(/{reductionPercent}/g, reductionPercent.toString());
}
```

**Updated code** (no reduction percent dependency):
```typescript
export function getPreCondensePrompt(): string {
  // Load template (no placeholders to replace)
  return loadPromptTemplate();
}
```

**Alternative** (if you want to keep the config option for backward compatibility):
```typescript
export function getPreCondensePrompt(): string {
  const template = loadPromptTemplate();
  
  // Optional: If config still has reductionPercent, mention it as guidance only
  // (not a strict requirement)
  const aiSettings = getAISettingsConfig();
  const reductionPercent = aiSettings.pre_condense_reduction_percent;
  
  if (reductionPercent) {
    // Add as optional guidance note (not requirement)
    return template + `\n\nNote: Target reduction of approximately ${reductionPercent}% is a guideline, but prioritize information preservation over meeting this target.`;
  }
  
  return template;
}
```

**Recommendation**: Use the simpler version (no dependency) to avoid artificial constraints. The AI should focus on maximizing information density while naturally condensing, not hitting a specific percentage target.

---

## Phase 3: Update Final Summary Prompt Template

### 3.1 Amend `final-summary.prompt.md`

**Current version** (20 lines, generic):
```markdown
You are an expert summarizer. You have been provided with transcripts from multiple YouTube videos. Your task is to synthesize them into a single coherent summary in {language}.

Style: {styleDescription}

{userFocus}

{additionalContext}

Instructions:
- Maintain accuracy and preserve important technical details
- Cite which video each key point comes from when relevant (use format: "Video: [Title]")
- Follow the {presetStyle} format exactly
- Write in {language}
- Ensure the summary is coherent and flows naturally
- If multiple videos cover the same topic, synthesize the information rather than repeating it
- Prioritize the most important and actionable information

Content from videos:
[CONTENT_PLACEHOLDER]
```

**Updated version** (add core principles reference):

```markdown
You are an expert summarizer following proven frameworks for clear, unbiased, actionable summaries.

## Core Principles (Apply to All Summaries)

**READ THESE CAREFULLY** — These principles are universal regardless of style:

1. **Lead with the Conclusion (Pyramid Principle)**
   - Your FIRST sentence must contain the main finding, answer, or conclusion
   - Never make readers wait for the payoff
   - Structure: Conclusion → Supporting points → Details

2. **Maintain Objectivity**
   - Separate facts from interpretation (label interpretations clearly: "Analysis:", "Interpretation:")
   - Use neutral verbs: "states", "explains", "demonstrates" (not "claims", "admits")
   - Present multiple perspectives when sources disagree
   - Avoid charged adjectives and superlatives

3. **Be Ruthlessly Concise**
   - Every sentence must pass the "so what?" test (does it add value?)
   - Eliminate filler language: "The video discusses..." → just state the information
   - Use concrete data over vague language: "40% faster" not "significantly faster"
   - Aim for maximum information density

4. **Make It Stick (SUCCESs Framework)**
   - **Simple**: Extract the core idea first
   - **Unexpected**: Flag surprising or counterintuitive findings
   - **Concrete**: Use specific numbers, examples, measurements
   - **Credible**: Cite sources (which video)
   - **Emotional**: (when appropriate) Connect to practical impact
   - **Stories**: Use sparingly for complex concepts

5. **Prioritize Actionability**
   - Help readers make decisions or take action
   - Include tradeoffs and caveats (not just benefits)
   - Provide "when to use" / "when not to use" guidance

---

## Style-Specific Instructions

**Style**: {styleDescription}

**Framework to apply**: {styleFramework}

**Structure to follow**: {styleStructure}

---

## Task

Synthesize the content from multiple videos into a single coherent summary in **{language}**.

{userFocus}

{additionalContext}

### Universal Requirements:
- ✅ Lead with conclusion (Pyramid Principle)
- ✅ Use objective, neutral language
- ✅ Include concrete data (numbers, measurements, specifics)
- ✅ Flag surprising findings when present
- ✅ Cite sources: "Video: [Title]" for key points
- ✅ Synthesize across videos (don't repeat same info)
- ✅ Provide actionable takeaways
- ✅ Follow the {presetStyle} format precisely

### Content from Videos:
[CONTENT_PLACEHOLDER]
```

**Changes**:
- ✅ Injects Core Principles explicitly (5 principles, expanded)
- ✅ Uses "Style-Specific Instructions" section (to be dynamically filled)
- ✅ Maintains all existing placeholders
- ✅ Adds checklist format for requirements (scannable)
- ✅ Emphasizes leading with conclusion

**File to update**: `backend/src/prompts/final-summary.prompt.md`

---

## Phase 4: Update TypeScript Prompt Assembly Logic

### 4.1 Add Loading Functions

**File**: `backend/src/prompts/final-summary.prompt.ts`

Add these functions after imports:

```typescript
/**
 * Load Core Principles from markdown file
 */
function loadCorePrinciples(): string {
  const principlesPath = path.join(__dirname, 'principles', 'summarization-principles.md');
  
  if (!fs.existsSync(principlesPath)) {
    logger.warn(`Core principles not found at ${principlesPath}, using fallback`);
    return 'Apply standard summarization best practices: clarity, accuracy, conciseness.';
  }
  
  return fs.readFileSync(principlesPath, 'utf-8');
}

/**
 * Load style-specific instructions from markdown file
 * @param presetStyle Style identifier (tldr, bullet_points, tutorial, detailed)
 * @returns Style instructions or fallback
 */
function loadStyleInstructions(presetStyle: PresetStyle): string {
  // Map preset style to instruction file
  const styleFileMap: Record<string, string> = {
    'tldr': 'tldr-instructions.md',
    'bullet_points': 'bullet-points-instructions.md',
    'tutorial': 'tutorial-instructions.md',
    'detailed': 'detailed-instructions.md',
    'deep_dive': 'detailed-instructions.md', // Use detailed for deep_dive
  };
  
  const fileName = styleFileMap[presetStyle];
  if (!fileName) {
    logger.warn(`No style instructions found for preset: ${presetStyle}`);
    return '';
  }
  
  const instructionsPath = path.join(__dirname, 'templates', fileName);
  
  if (!fs.existsSync(instructionsPath)) {
    logger.warn(`Style instructions not found at ${instructionsPath}`);
    return '';
  }
  
  return fs.readFileSync(instructionsPath, 'utf-8');
}

/**
 * Cache for loaded files (avoid re-reading on every request)
 */
const fileCache = new Map<string, string>();

/**
 * Load file with caching
 */
function loadCached(filePath: string): string {
  if (fileCache.has(filePath)) {
    return fileCache.get(filePath)!;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  fileCache.set(filePath, content);
  return content;
}
```

### 4.2 Update `getPresetStyleDescription()`

**Current function** (returns generic descriptions):

```typescript
function getPresetStyleDescription(style: PresetStyle): string {
  const descriptions: Record<string, string> = {
    tldr: 'Ultra-concise summary in 2-3 sentences (~100 words). Focus on the most important takeaway.',
    bullet_points: 'Key points in bullet format (~500 words). Each bullet should be a distinct, important point.',
    // ...
  };
  return descriptions[style] || `Summary in ${style} style`;
}
```

**Updated function** (framework-aware):

```typescript
/**
 * Get comprehensive style description with framework guidance
 */
function getPresetStyleDescription(style: PresetStyle): string {
  const descriptions: Record<string, string> = {
    tldr: `**TLDR Style** (MAXIMUM 100 words)

Framework: Smart Brevity + Pyramid Principle

Structure:
1. **Topline** (1 sentence, bold): Main conclusion with specific impact/data
2. **Why it matters** (1 sentence): Context or implication
3. **Optional critical detail** (1 sentence): Key tradeoff, caveat, or action

Tests to pass:
- ✅ Twitter Test: Core idea fits in 280 characters
- ✅ Topline is bold and contains conclusion
- ✅ Includes concrete data (numbers, percentages)
- ✅ No filler language ("discusses", "covers")

Word limit: STRICT 100 word maximum`,

    bullet_points: `**Bullet Points Style** (MAXIMUM 500 words)

Framework: Smart Brevity format

Structure:
1. **Topline** (1 sentence, bold, ~15 words): Most important takeaway
2. **Why it matters** (1 sentence, ~20 words): Context/implication
3. **Key points** (3-7 bullets): Distinct insights, each with concrete details
4. **Bottom line** (optional, 1-2 sentences): Action items or recommendations

Bullet format: **Key term/finding** — Explanation with data

Tests to pass:
- ✅ Each bullet passes "so what?" test
- ✅ Bullets in priority order (most important first)
- ✅ Concrete details in every bullet (numbers, examples)
- ✅ Scannable (bold keywords frontload each bullet)

Word limit: 500 words maximum`,

    tutorial: `**Tutorial Style** (MAXIMUM 1500 words)

Framework: Talk Like TED + Visual Thinking

Structure:
1. **Core Idea** (2-3 sentences with analogy): The "one technique worth learning"
2. **Why this matters** (1-2 sentences): Practical benefit
3. **Prerequisites** (optional, brief): Required knowledge/tools
4. **Step-by-step instructions** (3-7 steps with code examples)
5. **Visual mental model** (describe as diagram concept)
6. **Common pitfalls** (2-4 bullets): Surprising gotchas
7. **Validation** (how to verify success)
8. **Next steps** (optional): What to explore next

Code snippet guidelines:
- Minimal, runnable examples (not full apps)
- Comments for non-obvious parts
- Clear input/output

Tests to pass:
- ✅ Starts with analogy for core concept
- ✅ Each step is independently verifiable
- ✅ Includes actual code (not descriptions of code)
- ✅ Flags surprising gotchas

Word limit: 1500 words maximum`,

    detailed: `**Detailed Style** (MAXIMUM 3000 words)

Framework: McKinsey Way + Pyramid Principle + Situation-Complication-Resolution

Structure:
1. **Executive Summary** (150-200 words): Complete summary in miniature
   - Main conclusion (bold)
   - 3-5 key supporting points
   - Critical implication
2. **Introduction** (200-300 words): SCQA (Situation-Complication-Question-Answer)
3. **Main Body** (2000-2400 words): 3-6 sections, each leading with conclusion
4. **Analysis/Synthesis** (200-400 words): Interpretation and meta-insights (labeled)
5. **Recommendations** (100-200 words): Decision framework, migration path

Each section must:
- Lead with conclusion (Pyramid Principle)
- Support with data and examples
- Use subheadings for complex sections
- Cite sources

Tests to pass:
- ✅ Executive summary could standalone
- ✅ Each section leads with conclusion
- ✅ Data throughout (not vague language)
- ✅ Separate analysis section
- ✅ Actionable recommendations

Word limit: 3000 words maximum`,

    deep_dive: `**Deep Dive Style** (MAXIMUM 3000 words)

(Uses same structure as Detailed style with emphasis on technical depth)

Framework: Research Paper structure + McKinsey Way

Focus on:
- Comprehensive technical analysis
- Extensive code examples
- Performance benchmarks
- Trade-off discussions
- Multiple implementation approaches

Word limit: 3000 words maximum`,
  };

  return descriptions[style] || `Summary in ${style} style (follow Core Principles)`;
}
```

**Changes**:
- ✅ Each style includes framework reference
- ✅ Structural guidance (numbered steps)
- ✅ Tests to pass (actionable validation)
- ✅ Word limits emphasized
- ✅ Maintains backward compatibility (fallback for unknown styles)

### 4.3 Update `getFinalSummaryPrompt()`

**Current function**:

```typescript
export function getFinalSummaryPrompt(
  options: FinalSummaryPromptOptions
): string {
  const { presetStyle, customPrompt, language, context } = options;

  const styleDescription = getPresetStyleDescription(presetStyle);
  const template = loadPromptTemplate();

  // Build user focus section
  const userFocus = customPrompt
    ? `User's specific focus: ${customPrompt}\n\n`
    : '';

  // Build additional context section
  const additionalContext = context ? `Additional context: ${context}\n\n` : '';

  // Replace placeholders in template
  let prompt = template
    .replace(/{language}/g, language)
    .replace(/{styleDescription}/g, styleDescription)
    .replace(/{userFocus}/g, userFocus)
    .replace(/{additionalContext}/g, additionalContext)
    .replace(/{presetStyle}/g, presetStyle);

  return prompt;
}
```

**Updated function** (inject core principles + style instructions):

```typescript
export function getFinalSummaryPrompt(
  options: FinalSummaryPromptOptions
): string {
  const { presetStyle, customPrompt, language, context } = options;

  // Load template (updated with Core Principles section)
  const template = loadPromptTemplate();
  
  // Get style description (now includes framework guidance)
  const styleDescription = getPresetStyleDescription(presetStyle);
  
  // Load style-specific instructions (detailed instructions from md files)
  const styleInstructions = loadStyleInstructions(presetStyle);
  
  // Extract framework name from style description for template
  const styleFramework = extractFramework(presetStyle);
  
  // Build user focus section
  const userFocus = customPrompt
    ? `**User's specific focus**: ${customPrompt}\n\n`
    : '';

  // Build additional context section
  const additionalContext = context 
    ? `**Additional context**: ${context}\n\n` 
    : '';

  // Replace placeholders in template
  let prompt = template
    .replace(/{language}/g, language)
    .replace(/{styleDescription}/g, styleDescription)
    .replace(/{styleFramework}/g, styleFramework)
    .replace(/{styleStructure}/g, styleInstructions) // Inject full instructions
    .replace(/{userFocus}/g, userFocus)
    .replace(/{additionalContext}/g, additionalContext)
    .replace(/{presetStyle}/g, presetStyle);

  return prompt;
}

/**
 * Extract framework name for display in prompt
 */
function extractFramework(style: PresetStyle): string {
  const frameworks: Record<string, string> = {
    'tldr': 'Smart Brevity + Pyramid Principle',
    'bullet_points': 'Smart Brevity format',
    'tutorial': 'Talk Like TED + Visual Thinking',
    'detailed': 'McKinsey Way + Pyramid Principle',
    'deep_dive': 'Research Paper structure + McKinsey Way',
  };
  
  return frameworks[style] || 'Standard summarization frameworks';
}
```

**Changes**:
- ✅ Loads style-specific instructions from markdown files
- ✅ Injects full instructions into template
- ✅ Adds framework extraction helper
- ✅ Maintains backward compatibility
- ✅ Adds error handling (fallbacks)

---

## Phase 5: Testing & Validation

### 5.1 Create Test Suite

**Create**: `backend/__tests__/prompts/summarization-prompts.test.ts`

```typescript
import {
  getFinalSummaryPrompt,
  getPreCondensePrompt,
} from '../../src/prompts';
import { PresetStyle } from '../../src/prompts/final-summary.prompt';

describe('Summarization Prompts', () => {
  describe('Pre-Condense Prompt', () => {
    it('should include core principles', () => {
      const prompt = getPreCondensePrompt();
      
      expect(prompt).toContain('Preserve Pyramid Structure');
      expect(prompt).toContain('Flag Multiple Perspectives');
      expect(prompt).toContain('Causal Relationships');
    });
    
    it('should focus on information density, not percentage reduction', () => {
      const prompt = getPreCondensePrompt();
      
      // Should NOT have percentage reduction requirement
      expect(prompt).not.toContain('{reductionPercent}');
      expect(prompt).not.toMatch(/reduc.*by.*%/i);
      
      // Should emphasize information preservation
      expect(prompt).toContain('information density');
      expect(prompt).toContain('preserving');
      expect(prompt).toMatch(/preserve.*critical.*information/i);
    });
  });

  describe('Final Summary Prompt', () => {
    const styles: PresetStyle[] = ['tldr', 'bullet_points', 'tutorial', 'detailed'];
    
    styles.forEach(style => {
      describe(`${style} style`, () => {
        it('should include Core Principles section', () => {
          const prompt = getFinalSummaryPrompt({
            presetStyle: style,
            language: 'English',
          });
          
          expect(prompt).toContain('Core Principles');
          expect(prompt).toContain('Pyramid Principle');
          expect(prompt).toContain('Objectivity');
          expect(prompt).toContain('Concise');
        });
        
        it('should include style-specific structure', () => {
          const prompt = getFinalSummaryPrompt({
            presetStyle: style,
            language: 'English',
          });
          
          expect(prompt).toContain('Style-Specific Instructions');
          expect(prompt).toContain('Framework');
          expect(prompt).toContain('Structure');
        });
        
        it('should include word limit', () => {
          const prompt = getFinalSummaryPrompt({
            presetStyle: style,
            language: 'English',
          });
          
          const wordLimits: Record<string, string> = {
            'tldr': '100',
            'bullet_points': '500',
            'tutorial': '1500',
            'detailed': '3000',
          };
          
          expect(prompt).toContain(wordLimits[style]);
        });
        
        it('should preserve content placeholder', () => {
          const prompt = getFinalSummaryPrompt({
            presetStyle: style,
            language: 'English',
          });
          
          expect(prompt).toContain('[CONTENT_PLACEHOLDER]');
        });
      });
    });
    
    it('should inject custom prompt when provided', () => {
      const prompt = getFinalSummaryPrompt({
        presetStyle: 'tldr',
        language: 'English',
        customPrompt: 'Focus on security implications',
      });
      
      expect(prompt).toContain('Focus on security implications');
    });
    
    it('should inject additional context when provided', () => {
      const prompt = getFinalSummaryPrompt({
        presetStyle: 'bullet_points',
        language: 'Spanish',
        context: 'These videos are from a conference',
      });
      
      expect(prompt).toContain('These videos are from a conference');
      expect(prompt).toContain('Spanish');
    });
  });
  
  describe('Style Descriptions', () => {
    it('should include framework references', () => {
      const prompt = getFinalSummaryPrompt({
        presetStyle: 'tldr',
        language: 'English',
      });
      
      expect(prompt).toContain('Smart Brevity');
      expect(prompt).toContain('Pyramid Principle');
    });
    
    it('should include structural guidance', () => {
      const prompt = getFinalSummaryPrompt({
        presetStyle: 'bullet_points',
        language: 'English',
      });
      
      expect(prompt).toContain('Topline');
      expect(prompt).toContain('Why it matters');
      expect(prompt).toContain('Key points');
    });
  });
});
```

**Run tests**:
```bash
cd backend
npm test -- prompts/summarization-prompts.test.ts
```

### 5.2 Integration Testing with Sample Content

**Create**: `backend/__tests__/integration/prompt-assembly.test.ts`

```typescript
import { getFinalSummaryPrompt, injectContentIntoPrompt } from '../../src/prompts';

describe('Prompt Assembly Integration', () => {
  const sampleContent = `
Video: "React 19 Overview"
- React 19 introduces Server Components
- Bundle sizes reduced by 70%
- New compiler auto-optimizes components
  `;
  
  it('should assemble complete prompt with content', () => {
    const basePrompt = getFinalSummaryPrompt({
      presetStyle: 'tldr',
      language: 'English',
      customPrompt: 'Focus on performance',
    });
    
    const finalPrompt = injectContentIntoPrompt(basePrompt, sampleContent);
    
    // Should include core principles
    expect(finalPrompt).toContain('Pyramid Principle');
    
    // Should include style instructions
    expect(finalPrompt).toContain('TLDR Style');
    
    // Should include custom focus
    expect(finalPrompt).toContain('Focus on performance');
    
    // Should include content
    expect(finalPrompt).toContain('React 19 introduces Server Components');
    
    // Should NOT contain placeholder
    expect(finalPrompt).not.toContain('[CONTENT_PLACEHOLDER]');
  });
  
  it('should have reasonable prompt length', () => {
    const styles: Array<'tldr' | 'bullet_points' | 'tutorial' | 'detailed'> = [
      'tldr',
      'bullet_points',
      'tutorial',
      'detailed',
    ];
    
    styles.forEach(style => {
      const prompt = getFinalSummaryPrompt({
        presetStyle: style,
        language: 'English',
      });
      
      const wordCount = prompt.split(/\s+/).length;
      
      // Prompts should be substantial but not excessive
      // Core principles + style instructions + template
      expect(wordCount).toBeGreaterThan(500); // Has substance
      expect(wordCount).toBeLessThan(5000);   // Not overwhelming
    });
  });
});
```

---

## Phase 6: Performance Optimization

### 6.1 Implement File Caching

**Update**: `backend/src/prompts/final-summary.prompt.ts`

Add caching to avoid re-reading files on every request:

```typescript
/**
 * Simple in-memory cache for loaded markdown files
 */
class FileCache {
  private cache = new Map<string, { content: string; mtime: number }>();
  
  get(filePath: string): string | null {
    const cached = this.cache.get(filePath);
    if (!cached) return null;
    
    // Check if file was modified (invalidate cache if so)
    try {
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs > cached.mtime) {
        this.cache.delete(filePath);
        return null;
      }
    } catch (error) {
      // File doesn't exist or can't be read
      this.cache.delete(filePath);
      return null;
    }
    
    return cached.content;
  }
  
  set(filePath: string, content: string): void {
    try {
      const stats = fs.statSync(filePath);
      this.cache.set(filePath, {
        content,
        mtime: stats.mtimeMs,
      });
    } catch (error) {
      // If we can't stat the file, don't cache
      logger.warn(`Failed to cache file ${filePath}:`, error);
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const fileCache = new FileCache();

/**
 * Load file with caching (checks modification time)
 */
function loadCached(filePath: string): string {
  // Check cache first
  const cached = fileCache.get(filePath);
  if (cached) {
    return cached;
  }
  
  // Read from disk
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Cache for next time
  fileCache.set(filePath, content);
  
  return content;
}

/**
 * Update loadPromptTemplate to use caching
 */
function loadPromptTemplate(): string {
  const templatePath = path.join(__dirname, 'final-summary.prompt.md');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Prompt template not found at ${templatePath}. Please ensure final-summary.prompt.md exists.`
    );
  }
  
  return loadCached(templatePath);
}

// Update other loading functions similarly
function loadStyleInstructions(presetStyle: PresetStyle): string {
  const styleFileMap: Record<string, string> = {
    'tldr': 'tldr-instructions.md',
    'bullet_points': 'bullet-points-instructions.md',
    'tutorial': 'tutorial-instructions.md',
    'detailed': 'detailed-instructions.md',
    'deep_dive': 'detailed-instructions.md',
  };
  
  const fileName = styleFileMap[presetStyle];
  if (!fileName) {
    logger.warn(`No style instructions found for preset: ${presetStyle}`);
    return '';
  }
  
  const instructionsPath = path.join(__dirname, 'templates', fileName);
  
  if (!fs.existsSync(instructionsPath)) {
    logger.warn(`Style instructions not found at ${instructionsPath}`);
    return '';
  }
  
  return loadCached(instructionsPath);
}
```

**Benefits**:
- ✅ Avoids re-reading files on every summary generation
- ✅ Automatically invalidates cache if files are modified (checks mtime)
- ✅ Minimal memory overhead (<50KB total for all prompt files)

---

## Phase 7: Monitoring & Metrics

### 7.1 Add Prompt Assembly Metrics

**Update**: `backend/src/prompts/final-summary.prompt.ts`

```typescript
import logger from '../utils/logger';

export function getFinalSummaryPrompt(
  options: FinalSummaryPromptOptions
): string {
  const startTime = Date.now();
  
  try {
    // ... existing assembly logic ...
    
    const assemblyTime = Date.now() - startTime;
    
    // Log assembly metrics
    logger.debug('Prompt assembly completed', {
      presetStyle: options.presetStyle,
      language: options.language,
      hasCustomPrompt: !!options.customPrompt,
      assemblyTimeMs: assemblyTime,
      promptLength: prompt.length,
    });
    
    // Warn if assembly is slow
    if (assemblyTime > 50) {
      logger.warn('Slow prompt assembly detected', {
        assemblyTimeMs: assemblyTime,
        presetStyle: options.presetStyle,
      });
    }
    
    return prompt;
  } catch (error) {
    logger.error('Prompt assembly failed', {
      error,
      options,
    });
    throw error;
  }
}
```

### 7.2 Track Prompt Performance

**Create**: `backend/src/utils/prompt-metrics.ts`

```typescript
/**
 * Metrics tracking for prompt assembly and usage
 */
export class PromptMetrics {
  private static assemblyTimes: number[] = [];
  private static styleUsage: Record<string, number> = {};
  
  static recordAssembly(style: string, timeMs: number): void {
    this.assemblyTimes.push(timeMs);
    this.styleUsage[style] = (this.styleUsage[style] || 0) + 1;
    
    // Keep only last 1000 measurements
    if (this.assemblyTimes.length > 1000) {
      this.assemblyTimes.shift();
    }
  }
  
  static getStats() {
    const times = this.assemblyTimes;
    if (times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    
    return {
      count: times.length,
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      max: Math.max(...times),
      styleUsage: this.styleUsage,
    };
  }
}
```

---

## Phase 8: Documentation

### 8.1 Update API Documentation

**Create/Update**: `docs/api/summarization-api.md`

Document new prompt behavior:

```markdown
# Summarization API

## Summary Styles

Our summarization system uses a two-tier prompt architecture:

1. **Core Principles** (universal): Pyramid Principle, Objectivity, Conciseness, SUCCESs framework, Actionability
2. **Style-Specific Instructions**: Framework-specific guidance for each style

### Available Styles

#### TLDR (`tldr`)
- **Framework**: Smart Brevity + Pyramid Principle
- **Word limit**: 100 words maximum
- **Structure**: Topline (bold) + Why it matters + Optional detail
- **Best for**: Quick overviews, mobile users, executives

#### Bullet Points (`bullet_points`)
- **Framework**: Smart Brevity format
- **Word limit**: 500 words maximum
- **Structure**: Topline + Why it matters + 3-7 key bullets + Bottom line
- **Best for**: Scannable takeaways, meeting notes, quick reference

#### Tutorial (`tutorial`)
- **Framework**: Talk Like TED + Visual Thinking
- **Word limit**: 1500 words maximum
- **Structure**: Core idea (with analogy) + Steps + Code + Gotchas + Validation
- **Best for**: How-to content, code tutorials, technical guides

#### Detailed (`detailed`)
- **Framework**: McKinsey Way + Pyramid Principle
- **Word limit**: 3000 words maximum
- **Structure**: Executive summary + SCQA intro + Body sections + Analysis + Recommendations
- **Best for**: Comprehensive analysis, replacing video viewing, strategic decisions

[... rest of API docs ...]
```

### 8.2 Create Internal Prompt Editing Guide

**Create**: `docs/internal/editing-summarization-prompts.md`

```markdown
# Editing Summarization Prompts

## Quick Reference

To update prompt behavior:

1. **Universal principles** → Edit `backend/src/prompts/principles/summarization-principles.md`
2. **Style-specific guidance** → Edit `backend/src/prompts/templates/{style}-instructions.md`
3. **Pre-condense logic** → Edit `backend/src/prompts/pre-condense.prompt.md`
4. **Base template** → Edit `backend/src/prompts/final-summary.prompt.md`

Changes take effect immediately (prompts are loaded at runtime, cached with modification time checks).

## Editing Guidelines

### When to Edit Core Principles
- Universal best practices that apply to ALL styles
- New framework adoption (e.g., adding a new principle)
- Objectivity improvements
- General quality issues across styles

### When to Edit Style Instructions
- Style-specific issues (TLDR too long, Tutorials missing code)
- Framework application improvements
- Adding examples (good vs bad)
- Structural refinements

### Testing Changes
After editing:
1. Run unit tests: `npm test -- prompts`
2. Generate test summaries in each style
3. Compare before/after quality
4. Monitor metrics for 1-2 days

[... rest of guide ...]
```

---

## Phase 9: Rollout Plan

### 9.1 Gradual Rollout Strategy

**Option A: Feature Flag**

Add feature flag to toggle between old and new prompts:

```typescript
// In getSummaryConfig() or similar
export interface SummaryConfig {
  // ... existing config ...
  use_enhanced_prompts: boolean; // Feature flag
}

// In final-summary.prompt.ts
export function getFinalSummaryPrompt(
  options: FinalSummaryPromptOptions
): string {
  const config = getSummaryConfig();
  
  if (!config.use_enhanced_prompts) {
    return getLegacyPrompt(options); // Old behavior
  }
  
  // New enhanced behavior
  // ... (new code)
}
```

**Rollout phases**:
1. **Week 1**: 10% of users (canary)
2. **Week 2**: 50% of users (if no issues)
3. **Week 3**: 100% of users (full rollout)

**Monitor**:
- Summary quality (manual review of samples)
- User satisfaction (surveys)
- Regeneration rates (lower is better)
- Error rates

**Option B: A/B Test**

Randomly assign users to old vs new prompts, measure:
- User engagement (time on summary page)
- Explicit feedback (thumbs up/down)
- Summary regeneration requests
- Qualitative feedback

**Decision criteria** (deploy new prompts if):
- User satisfaction ≥ baseline
- Summary quality scores ≥ baseline (expert review)
- No increase in error rates
- Positive qualitative feedback

---

## Phase 10: Success Validation

### 10.1 Quality Metrics

**Before/After Comparison**:

Generate 50 summaries with old prompts, then regenerate with new prompts. Compare:

| Metric | How to Measure | Target |
|--------|----------------|--------|
| **Leads with conclusion** | % of summaries starting with main point | 90%+ |
| **Objectivity** | % using neutral language (no biased verbs) | 95%+ |
| **Conciseness** | Information density (key points per 100 words) | +30% vs baseline |
| **Actionability** | % including clear recommendations/next steps | 80%+ |
| **Structure compliance** | % following prescribed structure | 90%+ |

### 10.2 User Feedback

**Survey questions** (after summary generation):

1. "How clear was the summary?" (1-5 scale)
2. "Could you understand the main point immediately?" (Yes/No)
3. "Did the summary help you decide whether to watch the video?" (Yes/No)
4. "What could be improved?" (open text)

**Targets**:
- Clarity: 4.5+ average
- Immediate understanding: 90%+ yes
- Decision help: 85%+ yes

---

## Appendix A: File Checklist

**Files to create** (✅ all created by this guide):
- ✅ `backend/src/prompts/principles/summarization-principles.md`
- ✅ `backend/src/prompts/templates/tldr-instructions.md`
- ✅ `backend/src/prompts/templates/bullet-points-instructions.md`
- ✅ `backend/src/prompts/templates/tutorial-instructions.md`
- ✅ `backend/src/prompts/templates/detailed-instructions.md`

**Files to update**:
- [ ] `backend/src/prompts/pre-condense.prompt.md` (Section 2.1)
- [ ] `backend/src/prompts/final-summary.prompt.md` (Section 3.1)
- [ ] `backend/src/prompts/final-summary.prompt.ts` (Sections 4.1-4.3)

**Files to create for testing**:
- [ ] `backend/__tests__/prompts/summarization-prompts.test.ts` (Section 5.1)
- [ ] `backend/__tests__/integration/prompt-assembly.test.ts` (Section 5.2)

**Files to create for documentation**:
- [ ] `docs/api/summarization-api.md` (Section 8.1)
- [ ] `docs/internal/editing-summarization-prompts.md` (Section 8.2)

---

## Appendix B: Rollback Plan

If issues arise, rollback procedure:

1. **Immediate** (< 5 minutes):
   - Set feature flag `use_enhanced_prompts: false` in config
   - Deploy config change
   - Prompts revert to old behavior

2. **Code rollback** (if needed):
   - Git revert commits
   - Redeploy backend
   - Verify old prompts work

3. **Investigation**:
   - Review error logs
   - Analyze failing summaries
   - Identify root cause
   - Fix and re-test before re-deploying

---

## Appendix C: Estimated Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| 1 | File structure | 30 min | None |
| 2 | Update pre-condense | 1 hour | Phase 1 |
| 3 | Update final template | 1 hour | Phase 1 |
| 4 | Update TypeScript logic | 4-6 hours | Phases 2-3 |
| 5 | Testing | 4-6 hours | Phase 4 |
| 6 | Performance optimization | 2-3 hours | Phase 4 |
| 7 | Monitoring | 2-3 hours | Phase 4 |
| 8 | Documentation | 3-4 hours | Phase 4 |
| 9 | Rollout | 1-3 weeks | Phases 4-8 |
| 10 | Validation | Ongoing | Phase 9 |

**Total implementation time**: 2-3 weeks (including rollout and validation)

---

## Appendix D: FAQ

**Q: Will this break existing summaries?**  
A: No. Existing summaries are stored and won't change. Only new summaries use the updated prompts.

**Q: Can we A/B test old vs new prompts?**  
A: Yes. Use feature flags to randomly assign users to old or new prompt versions, then compare metrics.

**Q: How do we know if the new prompts are better?**  
A: Compare before/after on metrics: clarity, objectivity, conciseness, actionability, user satisfaction.

**Q: What if the AI doesn't follow the new instructions?**  
A: Iterate on prompt phrasing. Use explicit structural scaffolding (numbered steps), examples, and validation criteria.

**Q: Can we customize prompts per user or tier?**  
A: Yes. The prompt assembly functions accept options—you can add tier-based logic to inject additional instructions.

**Q: How much will this increase prompt token usage?**  
A: Estimate: +1000-1500 tokens per summary (Core Principles + Style Instructions). At $0.03/1k tokens (Claude pricing), ~$0.03-0.045 per summary. Marginal cost increase.

---

## Next Steps

1. **Review PRD** (`summarization_prompt_improvement_prd.md`) for context
2. **Review Core Principles** (`backend/src/prompts/principles/summarization-principles.md`)
3. **Review Style Instructions** (all 4 files in `templates/`)
4. **Begin Phase 2**: Update `pre-condense.prompt.md`
5. **Continue through phases** 3-10
6. **Deploy with feature flag** for gradual rollout
7. **Monitor and iterate**

---

**Questions or issues?** Contact the AI team or create an issue in the project repository.
