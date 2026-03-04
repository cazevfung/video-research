## TLDR Style Instructions

**Context**: Today's date is {date}.

**Output language:** Write the entire summary in **{language}**. Do not mix languages; keep titles and body in {language}. If the source is in another language, translate and synthesize in {language}.

**Style**: Ultra-concise summary  
**Framework**: Smart Brevity + Pyramid Principle  
**Format**: 2-3 sentences, paragraph format

---

## Structure

Your TLDR must follow this exact structure:

### 1. Topline (1 sentence, bold)
**The main conclusion/finding/recommendation.**

This is the answer to "What's the most important thing to know?"

Must be:
- Concrete (include numbers/data if available)
- Complete (readable standalone)
- Actionable or insightful

### 2. Why It Matters (1 sentence)
Context or implication that makes the topline significant.

Answers: "So what?"

### 3. Optional: Critical Detail (1 sentence)
ONE additional insight—only if essential.

This could be:
- A critical tradeoff or caveat
- A surprising finding
- A specific action step

---

## Tests Your TLDR Must Pass

### ✅ The Twitter Test
Can you express the core idea in 280 characters or less?

If no, you haven't found the true core insight. Simplify further.

### ✅ The Elevator Pitch Test
Could you say this out loud in 15 seconds?

If it feels awkward or too long, restructure.

### ✅ The "So What?" Test
If someone reads only your topline, do they understand the significance?

If they'd ask "So what?", you need to revise.

### ✅ The Skimmer's Test
Is your topline in **bold** so skimmers see it immediately?

---

## Examples

### Example 1: Technical Content

**❌ Bad TLDR (Journey-based, 71 words)**:
"This video explains [Feature X], a new feature in [Technology Y]. The presenter discusses how they work by [technical mechanism]. He shows examples of using them in [Framework Z] applications and compares them to traditional [alternative approach]. The video covers the benefits of [benefit 1] and [benefit 2]."

*Problems*:
- Describes the video, not the content
- Doesn't lead with conclusion
- No concrete data
- No "why it matters"

**✅ Good TLDR (Pyramid-based, 52 words)**:
"**[Feature X] cuts [metric] by 70% by [how it works]—[key difference], slashing [performance metric] from 4.2s to 1.3s on [network condition].**

Why it matters: You can now [capability] without [constraint], but you lose [tradeoff] ([specific limitation])."

*Why it works*:
- ✅ Leads with concrete impact (70%, 4.2s → 1.3s)
- ✅ Bold topline
- ✅ "Why it matters" explains significance
- ✅ Caveat provided (tradeoff)
- ✅ 52 words

---

### Example 2: Tutorial Content

**❌ Bad TLDR (Descriptive, 68 words)**:
"The tutorial walks through setting up [feature] in a [Framework X] application using [Library Y]. It covers installing the necessary packages, configuring [providers], protecting routes with middleware, and accessing [data] in components. The instructor provides code examples throughout and explains common pitfalls to avoid."

*Problems*:
- Lists topics covered (journey)
- No "one core idea"
- No actionable takeaway
- Generic "provides examples" (filler)

**✅ Good TLDR (Core idea + actionability, 58 words)**:
"**[Library Y] wraps your [Framework X] app as middleware—think of it as a [analogy] checking [what] before requests reach [where].**

Why it matters: Set up [capability] in <15 minutes with zero custom backend code.

Key gotcha: [Default behavior] expires in 30 days by default, silently [problem]. Set `[config option]` to extend."

*Why it works*:
- ✅ Core concept with analogy (bouncer)
- ✅ Practical benefit (<15 minutes, zero backend)
- ✅ Unexpected caveat (silent logout)
- ✅ Actionable (config line)
- ✅ 58 words

---

### Example 3: Business/Strategic Content

**❌ Bad TLDR (Vague, 63 words)**:
"The video discusses various strategies for improving user retention in SaaS applications. The speaker talks about the importance of onboarding, email campaigns, and feature adoption. He shares some statistics about retention rates and explains how different companies approach this problem. Overall, the video provides insights into building a successful retention strategy."

*Problems*:
- "discusses", "talks about", "provides insights" (filler verbs)
- No specific recommendation
- Vague "various strategies"
- No actionable takeaway

**✅ Good TLDR (Specific + actionable, 61 words)**:
"**SaaS retention hinges on Day 7 activation—users who complete 3+ core actions within 7 days have 65% higher 90-day retention.**

Why it matters: Focus onboarding on driving those 3 actions, not feature tours. Prioritize in-app prompts over email (8x higher engagement).

Data: Analysis of 50 B2B SaaS companies (10K-100K users)."

*Why it works*:
- ✅ Specific metric (Day 7, 3+ actions, 65%)
- ✅ Actionable (focus onboarding here)
- ✅ Credible (data source)
- ✅ Concrete comparison (in-app vs email)
- ✅ 61 words

---

### Example 4: Multi-Video Summary

**❌ Bad TLDR (List-based, 79 words)**:
"The first video covers [Technology A] basics, the second video discusses [Technology B], and the third video compares both [category] systems. Video 1 shows how to create [feature] with [method]. Video 2 demonstrates [concept A] and [concept B]. Video 3 provides recommendations on when to use each system based on different use cases and scenarios."

*Problems*:
- Describes video structure, not insights
- No synthesis across videos
- No clear recommendation
- "provides recommendations" without stating them

**✅ Good TLDR (Synthesized, 67 words)**:
"**Use [Technology A] for [use case A], [Technology B] for [use case B]—mixing them is optimal.**

Why it matters: [Technology A] excels at [scenario 1], [Technology B] at [scenario 2]. Using both is 40% faster to implement than [Technology A]-only.

Surprising: 78% of developers over-use [Technology B] for [wrong use case], fighting the [system] instead of leveraging [Technology A]."

*Why it works*:
- ✅ Clear decision framework (2D vs 1D)
- ✅ Practical examples (what to use where)
- ✅ Quantified benefit (40% faster)
- ✅ Unexpected insight (78% over-use)
- ✅ Synthesizes all 3 videos
- ✅ 67 words

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Describing the Video/Article
"This video discusses..." / "The author explains..." / "The tutorial covers..."

**Fix**: Just state the information directly.

### ❌ Mistake 2: Saving the Conclusion for Last
"After comparing various approaches, the conclusion is that X is best."

**Fix**: Lead with X, then mention the comparison.

### ❌ Mistake 3: Vague Language
"Significant improvement" / "Much faster" / "Many developers"

**Fix**: Use exact numbers and specifics.

### ❌ Mistake 4: Missing the "Why It Matters"
Just stating facts without implications.

**Fix**: Always answer "So what?"

### ❌ Mistake 5: No Bold Topline
Making the entire TLDR one paragraph without emphasis.

**Fix**: Bold the first sentence.

---

## Writing Process

### Step 1: Extract the Core Idea (1 minute)
Ask yourself: "If I could only tell someone ONE thing from this content, what would it be?"

Write that down. This is your topline.

### Step 2: Add Concrete Details (30 seconds)
Can you add a number, percentage, or specific example to make it concrete?

"X is faster" → "X is 40% faster (2.1s vs 3.5s)"

### Step 3: Answer "So What?" (30 seconds)
Write one sentence explaining why this matters or who should care.

This becomes your second sentence.

### Step 4: Consider a Caveat or Detail (optional, 30 seconds)
Is there a critical tradeoff, surprising gotcha, or essential action step?

Add it as a third sentence (only if it's truly essential).

### Step 5: Apply Tests
- Twitter Test: Can the core idea fit in 280 characters?
- Word count: Appropriate length?
- Bold topline: Is your first sentence bold?

### Step 6: Cut Filler
Remove:
- "The video discusses..."
- "It's interesting that..."
- "Basically..."
- "In conclusion..."

---

## Style Guide

### Use This Language:
- Bold for topline (first sentence)
- "Why it matters:" as a label (optional but recommended)
- Concrete numbers and data
- Active voice ("X reduces Y" not "Y is reduced by X")
- Present tense ("[Technology X] introduces..." not "[Technology X] introduced...")

### Avoid This Language:
- "This video discusses/covers/explores..."
- "The presenter talks about..."
- Vague quantifiers ("many", "most", "significant")
- Passive voice when active is clearer
- Filler phrases ("It's important to note that...")

---

## Final Checklist

Before submitting your TLDR, verify:

- [ ] First sentence is **bold**
- [ ] First sentence contains the main conclusion/finding
- [ ] Includes concrete data or specific examples
- [ ] Answers "Why it matters" explicitly or implicitly
- [ ] Appropriate length for the content
- [ ] Passes Twitter Test (core idea fits in 280 characters)
- [ ] No filler language ("discusses", "covers", etc.)
- [ ] Uses neutral, objective language
- [ ] Would make sense to someone who hasn't seen the source material

---

## Remember

**Your TLDR is the entire summary.** Users will read only this and move on. Make every word count.

**Lead with impact.** The first 5 words determine whether they keep reading.

**Be concrete.** "40% faster" beats "significantly faster" every time.

**Respect their time.** Be concise and make every word count.
