# Numbered Citation System - Product Requirements Document

**Status**: Draft  
**Version**: 1.0  
**Last Updated**: January 29, 2026  
**Owner**: Product Team  
**Contributors**: Engineering, Design

---

## Executive Summary

Replace the current narrative citation style (e.g., "Video 1 mentions...", "视频2提到...") with an academic-style numbered citation system (e.g., `[1]`, `[2]`) that provides:
- Inline numbered references in research reports
- Interactive hover tooltips showing video details
- Clickable citations that navigate to video sources
- Organized reference lists per section

This enhancement improves readability, professionalism, and user engagement with source material.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [User Stories](#user-stories)
4. [Feature Specifications](#feature-specifications)
5. [Technical Architecture](#technical-architecture)
6. [Data Structures](#data-structures)
7. [UI/UX Specifications](#uiux-specifications)
8. [API Specifications](#api-specifications)
9. [Implementation Plan](#implementation-plan)
10. [Testing Strategy](#testing-strategy)
11. [Future Enhancements](#future-enhancements)

---

## Problem Statement

### Current State
The AI currently generates citations in narrative format:
```
> "黄金在过去两年里像火箭一样冲向月球..." 
> ——《ULTIMATE Gold Scalping Strategy》（视频2，2个月前上传）

视频1提到，黄金与美元指数呈高度负相关...
```

**Pain Points:**
1. **Low Readability**: Narrative citations interrupt reading flow
2. **Verbosity**: Full video titles in-text consume space
3. **Unclear Source Mapping**: Hard to track which numbered video corresponds to which source
4. **Limited Interactivity**: No way to quickly preview video details without scrolling
5. **Unprofessional Appearance**: Doesn't match academic/professional research standards

### Desired State
Academic-style numbered citations:
```
Gold has shown significant volatility over the past two years[1]. 
Technical analysis suggests inverse correlation with USD[2, 3].

### Sources
[1] ULTIMATE Gold Scalping Strategy - Trade with Pat (14:25, 2 months ago)
[2] How to Trade Gold - The Moving Average (7:30, 8 months ago)
[3] 3 Key Tips for Trading Gold! - TraderNick (9:14, 1 year ago)
```

**With hover interaction:**
- Hovering `[1]` displays tooltip with video thumbnail, title, channel, duration
- Clicking `[1]` scrolls to reference list or opens video player

---

## Goals & Success Metrics

### Primary Goals
1. **Improve Readability**: Reduce in-text citation length by 80%
2. **Professional Presentation**: Match academic paper citation standards
3. **Enhanced Discoverability**: Enable instant source preview via hover
4. **Maintain Real-Time Streaming**: No significant latency impact

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Average citation text length | ~80 chars | ~5 chars | Character count analysis |
| User engagement with sources | Unknown | 30%+ hover rate | Analytics tracking |
| Citation generation latency | N/A | <200ms overhead | Performance monitoring |
| User satisfaction (survey) | Baseline | +20 points | Post-feature survey |

### Non-Goals (Out of Scope)
- ❌ Timestamp-level citations (e.g., `[1:23:45]`)
- ❌ Citation export to BibTeX/EndNote
- ❌ Cross-document citation linking
- ❌ User-editable citations

---

## User Stories

### As a Researcher
- **US-1**: I want to see clean, numbered citations so I can read reports without distraction
- **US-2**: I want to hover over citations to preview video details without losing my place
- **US-3**: I want to click citations to navigate to the source video or reference list
- **US-4**: I want to see all sources used in a section organized in one place

### As a Content Consumer
- **US-5**: I want citations in my preferred language (matching report language)
- **US-6**: I want to quickly verify which sources support a claim
- **US-7**: I want to watch cited videos directly from the report

### As a Developer
- **US-8**: I need a consistent citation data structure for parsing and rendering
- **US-9**: I need citation metadata stored in research JSON for future use
- **US-10**: I need real-time citation streaming without breaking UI

---

## Feature Specifications

### 1. Citation Generation (AI Output)

#### 1.1 Citation Number Assignment
- **Pre-generation Strategy**: Assign citation numbers based on `selected_videos` order before AI generation
- **Mapping**: `selected_videos[0]` → `[1]`, `selected_videos[1]` → `[2]`, etc.
- **Consistency**: Same video always gets same number throughout the entire report
- **Reusability**: A video cited multiple times reuses the same number

#### 1.2 Inline Citation Format
```markdown
Claim or statement[1].
Multiple sources[1, 3, 5].
Consecutive sources[1-4].
```

**Rules:**
- Place citation immediately after sentence, before punctuation
- No space between text and `[number]`
- Multiple citations: comma-separated within single brackets
- Range notation allowed for 3+ consecutive numbers

#### 1.3 Reference List Format
```markdown
### Sources

[1] Video Title - Channel Name (Duration, Upload Date)
[2] Video Title - Channel Name (Duration, Upload Date)
...
```

**Rules:**
- H3 heading: `### Sources` (localized)
- One reference per line
- Format: `[number] Title - Channel (MM:SS, Time ago)`
- Only list citations used in current section
- Ordered by citation number (not appearance order)

### 2. Interactive Hover Tooltip

#### 2.1 Trigger Behavior
- **Trigger**: Mouse hover over `[number]` badge
- **Delay**: 300ms hover delay before showing tooltip
- **Dismiss**: Mouse leave, or click elsewhere
- **No Trigger**: Touch devices (show on tap instead)

#### 2.2 Tooltip Content
```
┌─────────────────────────────────────┐
│ [Thumbnail Image]                   │
│ Video Title                         │
│ Channel Name                        │
│ 14:25 • 2 months ago • 72K views    │
│ [Watch Video →]                     │
└─────────────────────────────────────┐
```

**Data Displayed:**
- Video thumbnail (100x56px, 16:9 aspect ratio)
- Full video title (max 2 lines, ellipsis overflow)
- Channel name with icon
- Duration • Upload date • View count
- "Watch Video" button (opens video player or YouTube)

#### 2.3 Tooltip Positioning
- **Default**: Above citation badge, centered
- **Overflow**: If top space insufficient, show below
- **Edge Cases**: If right/left overflow, adjust horizontal alignment
- **Z-Index**: Above all content (z-index: 1000)

### 3. Click Interaction

#### 3.1 Citation Badge Click
**Desktop:**
- **Primary Click**: Scroll to reference list for that citation
- **Ctrl/Cmd + Click**: Open video in modal player
- **Right Click**: Show context menu (Copy URL, Open in new tab)

**Mobile/Tablet:**
- **Single Tap**: Show tooltip (if not already shown)
- **Long Press**: Show context menu with "Watch Video" option

#### 3.2 Reference List Click
- **Click on `[number]`**: Scroll to first occurrence in content
- **Click on title/thumbnail**: Open video in modal player
- **Click on channel**: Filter to show all videos from that channel (future enhancement)

### 4. Localization

| Language | "Sources" Heading | Citation Format |
|----------|-------------------|-----------------|
| English | `### Sources` | `[1] Title - Channel (14:25, 2 months ago)` |
| Chinese (Simplified) | `### 来源` | `[1] 标题 - 频道 (14:25，2个月前)` |
| Chinese (Traditional) | `### 來源` | `[1] 標題 - 頻道 (14:25，2個月前)` |
| Spanish | `### Fuentes` | `[1] Título - Canal (14:25, hace 2 meses)` |
| French | `### Sources` | `[1] Titre - Chaîne (14:25, il y a 2 mois)` |

---

## Technical Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Citation     │  │ Citation     │  │ Reference List  │  │
│  │ Badge        │──│ Tooltip      │  │ Component       │  │
│  │ Component    │  │ Component    │  │                 │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│           │                │                    │           │
│           └────────────────┴────────────────────┘           │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Citation Store │
                    │  (Context/Zustand)│
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                     Backend (Node.js)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Research Service (research.service.ts)       │  │
│  │  ┌─────────────────┐  ┌───────────────────────────┐  │  │
│  │  │ Citation        │  │ Prompt Generator          │  │  │
│  │  │ Mapper          │  │ (research.prompt.ts)      │  │  │
│  │  │ (new)           │  │                           │  │  │
│  │  └─────────────────┘  └───────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌────────────────────────▼─────────────────────────────┐  │
│  │         AI Service (ai.service.ts)                   │  │
│  │  - Qwen models via DashScope API                     │  │
│  │  - callQwenMax() for research summaries              │  │
│  │  - Modified prompts with citation instructions       │  │
│  │  - Streaming parser for citation detection           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### Backend Components

1. **Citation Mapper** (NEW)
   - Maps `selected_videos` to citation numbers
   - Generates citation metadata dictionary
   - Injects citation map into AI prompt

2. **Enhanced Prompt Generator** (research.prompt.ts)
   - Modifies `getResearchSummaryPrompt()` to include citation instructions
   - Passes pre-assigned citation numbers to Qwen
   - Includes reference list format examples

3. **Streaming Parser** (citation-parser.service.ts)
   - Detects citation patterns: `[number]`, `[n1, n2]`, `[n1-n3]`
   - Validates citation numbers against available sources
   - Tracks citation usage per section
   - Integrates with `callQwenMax()` streaming

#### Frontend Components

1. **CitationBadge** (NEW)
   - Renders `[number]` as styled badge
   - Handles hover/click events
   - Manages tooltip visibility

2. **CitationTooltip** (NEW)
   - Displays video preview card
   - Lazy-loads thumbnail images
   - Handles positioning logic

3. **ReferenceList** (NEW)
   - Renders "### Sources" sections
   - Groups citations by section
   - Provides video playback interface

4. **Citation Store** (NEW)
   - Manages citation metadata globally
   - Tracks hover states and interactions
   - Provides citation lookup functions

---

## Data Structures

### Backend Data Models

#### 1. Research Result Schema (Extended)

```typescript
interface ResearchResult {
  // ... existing fields ...
  
  // NEW: Citation system data
  citations: CitationMetadata;
  citationUsage: CitationUsageMap;
}

interface CitationMetadata {
  // Key: citation number (string "1", "2", etc.)
  [citationNumber: string]: {
    videoId: string;           // YouTube video ID
    title: string;             // Video title
    channel: string;           // Channel name
    thumbnail: string;         // Thumbnail URL
    url: string;               // Full YouTube URL
    duration_seconds: number;  // Duration in seconds
    upload_date: string;       // "2 months ago"
    view_count: number;        // View count
    firstAppearance: {
      section: string;         // Section title where first cited
      position: number;        // Character position in full text
    };
  };
}

interface CitationUsageMap {
  // Key: section heading (H2 title)
  // Value: array of citation numbers used in that section
  [sectionHeading: string]: number[];
}
```

**Example:**
```json
{
  "citations": {
    "1": {
      "videoId": "MKJz4yURCEs",
      "title": "How to Trade Gold - Ride Massive Trends Using this Method",
      "channel": "The Moving Average",
      "thumbnail": "https://i.ytimg.com/vi/MKJz4yURCEs/hq720.jpg",
      "url": "https://www.youtube.com/watch?v=MKJz4yURCEs",
      "duration_seconds": 450,
      "upload_date": "8 months ago",
      "view_count": 323241,
      "firstAppearance": {
        "section": "过去十年做空黄金的具体历史胜率数据是多少？",
        "position": 1245
      }
    },
    "2": {
      "videoId": "nCBF6wrOKic",
      "title": "ULTIMATE Gold Scalping Strategy in 14 Minutes",
      "channel": "Trade with Pat",
      "thumbnail": "https://i.ytimg.com/vi/nCBF6wrOKic/hq720.jpg",
      "url": "https://www.youtube.com/watch?v=nCBF6wrOKic",
      "duration_seconds": 865,
      "upload_date": "2 months ago",
      "view_count": 72755,
      "firstAppearance": {
        "section": "过去十年做空黄金的具体历史胜率数据是多少？",
        "position": 1876
      }
    }
  },
  "citationUsage": {
    "过去十年做空黄金的具体历史胜率数据是多少？": [1, 2, 3, 8],
    "哪些关键指标能预示做空黄金的高胜率时机？": [1, 2, 3, 10],
    "做空黄金的平均风险回报比通常处于什么水平？": [7, 8, 10]
  }
}
```

#### 2. Citation Prompt Context

```typescript
interface CitationPromptContext {
  videoReferences: string; // Formatted string for AI prompt
  citationInstructions: string; // Citation format rules
}

// Example videoReferences string:
`
You have access to these video sources (use these EXACT numbers):

[1] "How to Trade Gold - Ride Massive Trends Using this Method" - The Moving Average (7:30, 8 months ago)
[2] "ULTIMATE Gold Scalping Strategy in 14 Minutes" - Trade with Pat (14:25, 2 months ago)
[3] "Did Gold JUST Predict a Stock Market Crash?" - Bravos Research (17:27, 5 years ago)
...
`
```

### Frontend Data Models

#### 1. Citation Store State

```typescript
interface CitationStoreState {
  // Citation metadata indexed by number
  citations: Map<number, CitationData>;
  
  // Current hover state
  hoveredCitation: number | null;
  
  // Tooltip positioning
  tooltipPosition: { x: number; y: number } | null;
  
  // Active video player
  activeVideoId: string | null;
  
  // Actions
  setCitations: (citations: CitationMetadata) => void;
  setHoveredCitation: (num: number | null) => void;
  openVideo: (videoId: string) => void;
  scrollToCitation: (num: number) => void;
  scrollToReference: (num: number) => void;
}

interface CitationData {
  number: number;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  durationFormatted: string; // "14:25"
  uploadDate: string;         // "2 months ago"
  viewCountFormatted: string; // "72K"
}
```

#### 2. Component Props

```typescript
// CitationBadge props
interface CitationBadgeProps {
  number: number;              // Citation number to display
  citationData: CitationData;  // Full citation metadata
  onClick?: () => void;        // Optional custom click handler
  className?: string;          // Additional CSS classes
}

// CitationTooltip props
interface CitationTooltipProps {
  citationData: CitationData;
  position: { x: number; y: number };
  onClose: () => void;
  onWatchClick: (videoId: string) => void;
}

// ReferenceList props
interface ReferenceListProps {
  sectionTitle: string;              // Section heading
  citations: CitationData[];         // Citations used in this section
  onCitationClick: (num: number) => void;  // Scroll to citation in text
  onVideoClick: (videoId: string) => void; // Open video player
}
```

---

## UI/UX Specifications

### Visual Design

#### 1. Citation Badge Styling

```css
.citation-badge {
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  /* Sizing */
  min-width: 24px;
  height: 18px;
  padding: 0 6px;
  margin: 0 2px;
  
  /* Typography */
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  
  /* Colors */
  color: #2563eb; /* blue-600 */
  background: #dbeafe; /* blue-100 */
  border: 1px solid #93c5fd; /* blue-300 */
  border-radius: 4px;
  
  /* Interactive states */
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.citation-badge:hover {
  color: #1e40af; /* blue-700 */
  background: #bfdbfe; /* blue-200 */
  border-color: #60a5fa; /* blue-400 */
  transform: translateY(-1px);
}

.citation-badge:active {
  transform: translateY(0);
}

/* Dark mode */
.dark .citation-badge {
  color: #93c5fd; /* blue-300 */
  background: #1e3a8a; /* blue-900 */
  border-color: #1e40af; /* blue-700 */
}

.dark .citation-badge:hover {
  color: #dbeafe; /* blue-100 */
  background: #1e40af; /* blue-700 */
  border-color: #3b82f6; /* blue-500 */
}
```

#### 2. Citation Tooltip Styling

```css
.citation-tooltip {
  /* Container */
  position: fixed;
  width: 320px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15),
              0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  z-index: 1000;
  
  /* Animation */
  animation: tooltipFadeIn 0.2s ease;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.citation-tooltip__thumbnail {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
  background: #f3f4f6; /* gray-100 */
}

.citation-tooltip__content {
  padding: 12px 16px;
}

.citation-tooltip__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #111827; /* gray-900 */
  margin-bottom: 6px;
  
  /* Truncate to 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.citation-tooltip__channel {
  font-size: 12px;
  color: #6b7280; /* gray-500 */
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.citation-tooltip__meta {
  font-size: 11px;
  color: #9ca3af; /* gray-400 */
  margin-bottom: 12px;
}

.citation-tooltip__action {
  width: 100%;
  padding: 8px 12px;
  background: #2563eb; /* blue-600 */
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.citation-tooltip__action:hover {
  background: #1e40af; /* blue-700 */
}

/* Dark mode */
.dark .citation-tooltip {
  background: #1f2937; /* gray-800 */
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.1);
}

.dark .citation-tooltip__title {
  color: #f9fafb; /* gray-50 */
}

.dark .citation-tooltip__channel {
  color: #9ca3af; /* gray-400 */
}

.dark .citation-tooltip__meta {
  color: #6b7280; /* gray-500 */
}
```

#### 3. Reference List Styling

```css
.reference-list {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #e5e7eb; /* gray-200 */
}

.reference-list__heading {
  font-size: 18px;
  font-weight: 700;
  color: #111827; /* gray-900 */
  margin-bottom: 16px;
}

.reference-list__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  transition: background 0.15s ease;
  cursor: pointer;
}

.reference-list__item:hover {
  background: #f3f4f6; /* gray-100 */
}

.reference-list__number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe; /* blue-100 */
  color: #2563eb; /* blue-600 */
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

.reference-list__thumbnail {
  flex-shrink: 0;
  width: 120px;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 6px;
  background: #f3f4f6; /* gray-100 */
}

.reference-list__details {
  flex: 1;
  min-width: 0; /* Enable text truncation */
}

.reference-list__title {
  font-size: 14px;
  font-weight: 600;
  color: #111827; /* gray-900 */
  margin-bottom: 4px;
  line-height: 1.4;
}

.reference-list__channel {
  font-size: 12px;
  color: #6b7280; /* gray-500 */
  margin-bottom: 4px;
}

.reference-list__meta {
  font-size: 11px;
  color: #9ca3af; /* gray-400 */
}

/* Dark mode */
.dark .reference-list {
  border-top-color: #374151; /* gray-700 */
}

.dark .reference-list__heading {
  color: #f9fafb; /* gray-50 */
}

.dark .reference-list__item:hover {
  background: #374151; /* gray-700 */
}

.dark .reference-list__number {
  background: #1e3a8a; /* blue-900 */
  color: #93c5fd; /* blue-300 */
}

.dark .reference-list__title {
  color: #f9fafb; /* gray-50 */
}

.dark .reference-list__channel {
  color: #9ca3af; /* gray-400 */
}

.dark .reference-list__meta {
  color: #6b7280; /* gray-500 */
}
```

### Responsive Design

#### Desktop (≥1024px)
- Tooltip width: 320px
- Reference list: 2-column grid
- Full thumbnail images shown

#### Tablet (768px - 1023px)
- Tooltip width: 280px
- Reference list: Single column
- Thumbnail size: 100px

#### Mobile (<768px)
- No hover tooltips (use tap)
- Tooltip appears as bottom sheet
- Reference list: Compact cards
- Thumbnail size: 80px

### Accessibility

#### Keyboard Navigation
- **Tab**: Focus next citation badge
- **Enter/Space**: Open tooltip or video
- **Escape**: Close tooltip
- **Arrow Keys**: Navigate between citations

#### Screen Reader Support
```html
<span 
  class="citation-badge" 
  role="button" 
  tabindex="0"
  aria-label="Citation 1: How to Trade Gold by The Moving Average"
  aria-describedby="citation-tooltip-1"
>
  [1]
</span>

<div 
  id="citation-tooltip-1" 
  role="tooltip" 
  aria-live="polite"
  class="citation-tooltip"
>
  <!-- Tooltip content -->
</div>
```

#### Color Contrast
- Citation badges: 4.5:1 contrast ratio minimum
- Tooltip text: 7:1 contrast ratio for accessibility AAA
- Focus indicators: 3:1 contrast ratio

---

## API Specifications

### Backend API Changes

#### 1. Research Generation Endpoint (Modified)

**Endpoint**: `POST /api/research/generate`

**Request**: (Unchanged)
```json
{
  "research_query": "做空黄金有多少胜率和可能性？",
  "language": "Chinese (Simplified)",
  "questions": ["Question 1", "Question 2", ...]
}
```

**Response**: (Extended)
```json
{
  "research_id": "1769657489007-cr2wctf",
  "final_summary_text": "# Research Report\n\n...",
  "citations": {
    "1": {
      "videoId": "MKJz4yURCEs",
      "title": "How to Trade Gold...",
      "channel": "The Moving Average",
      "thumbnail": "https://...",
      "url": "https://youtube.com/watch?v=...",
      "duration_seconds": 450,
      "upload_date": "8 months ago",
      "view_count": 323241,
      "firstAppearance": {
        "section": "Section Title",
        "position": 1245
      }
    },
    "2": { /* ... */ }
  },
  "citationUsage": {
    "Section Title 1": [1, 2, 3],
    "Section Title 2": [1, 4, 5]
  }
}
```

#### 2. Research Retrieval Endpoint (Modified)

**Endpoint**: `GET /api/research/:researchId`

**Response**: Same as generation response, includes `citations` and `citationUsage`

#### 3. Citation Metadata Endpoint (NEW)

**Endpoint**: `GET /api/research/:researchId/citations`

**Purpose**: Fetch only citation metadata (for lazy loading)

**Response**:
```json
{
  "citations": {
    "1": { /* citation data */ },
    "2": { /* citation data */ }
  },
  "citationUsage": {
    "Section 1": [1, 2],
    "Section 2": [3]
  }
}
```

### WebSocket Events (Streaming)

#### 1. Citation Metadata Event (NEW)

**Event**: `citations:metadata`

**Payload**:
```json
{
  "type": "citations:metadata",
  "data": {
    "citations": {
      "1": { /* citation data */ },
      "2": { /* citation data */ }
    }
  }
}
```

**Timing**: Sent once at start of research generation, before content streaming

#### 2. Content Chunk Event (Modified)

**Event**: `research:chunk`

**Payload**: (Unchanged - content includes `[1]`, `[2]` in text)
```json
{
  "type": "research:chunk",
  "data": {
    "chunk": "Gold prices have shown significant volatility[1]. ...",
    "section": "Section Title",
    "chunkIndex": 12
  }
}
```

#### 3. Section Complete Event (NEW)

**Event**: `citations:section-complete`

**Payload**:
```json
{
  "type": "citations:section-complete",
  "data": {
    "section": "Section Title",
    "citationsUsed": [1, 2, 3, 8]
  }
}
```

**Purpose**: Frontend knows when to render "### Sources" for the section

---

## Implementation Plan

### Phase 1: Backend Foundation (Week 1-2)

**Goal**: Establish citation mapping and prompt engineering

#### Tasks

1. **Create Citation Mapper Service** (3 days)
   - [ ] Create `src/services/citation-mapper.service.ts`
   - [ ] Implement `generateCitationMap(selected_videos[]): CitationMetadata`
   - [ ] Implement `formatCitationPromptContext(CitationMetadata): string`
   - [ ] Add unit tests for citation mapping logic

2. **Modify Prompt Templates** (2 days)
   - [ ] Update `research-summary.md` with citation instructions
   - [ ] Add `{citationReferences}` placeholder
   - [ ] Add example citation format in multiple languages
   - [ ] Create citation format validation rules

3. **Update Prompt Generator** (2 days)
   - [ ] Modify `getResearchSummaryPrompt()` to accept citation map
   - [ ] Inject citation references into prompt context
   - [ ] Add citation validation logic
   - [ ] Update prompt generator tests

4. **Extend Data Models** (1 day)
   - [ ] Update `ResearchResult` interface with `citations` and `citationUsage`
   - [ ] Create TypeScript types for citation metadata
   - [ ] Update database schema if persisting
   - [ ] Create migration scripts

5. **Testing & Validation** (2 days)
   - [ ] Test citation generation with various video counts (1, 10, 50)
   - [ ] Validate citation numbers in AI output
   - [ ] Test multi-language citation formats
   - [ ] Verify JSON structure compliance

**Deliverables:**
- ✅ Citation metadata included in research JSON
- ✅ AI generates numbered citations in reports
- ✅ Backend tests passing (>90% coverage)

**Success Criteria:**
- AI uses pre-assigned citation numbers >95% of the time
- Citation metadata correctly maps video data
- No regression in existing research generation

---

### Phase 2: Streaming & Real-Time Parsing (Week 3)

**Goal**: Enable real-time citation detection and validation during streaming

#### Tasks

1. **Create Streaming Citation Parser** (3 days)
   - [ ] Create `src/services/citation-parser.service.ts`
   - [ ] Implement regex patterns for citation detection
     - Single: `\[(\d+)\]`
     - Multiple: `\[(\d+(?:,\s*\d+)*)\]`
     - Range: `\[(\d+)-(\d+)\]`
   - [ ] Implement citation validation against metadata
   - [ ] Track citation usage per section

2. **Integrate with Research Service** (2 days)
   - [ ] Hook parser into `callQwenMax()` streaming callback
   - [ ] Modify `research.service.ts` to emit `citations:metadata` event
   - [ ] Detect section boundaries in Qwen stream output
   - [ ] Emit `citations:section-complete` on section end
   - [ ] Log invalid citation warnings

3. **Update WebSocket Events** (1 day)
   - [ ] Add new event types to WebSocket handler
   - [ ] Update event documentation
   - [ ] Add event payload validation

4. **Error Handling** (1 day)
   - [ ] Handle invalid citation numbers gracefully
   - [ ] Log citation mismatches for monitoring
   - [ ] Add fallback for missing metadata
   - [ ] Create error recovery mechanisms

5. **Testing** (1 day)
   - [ ] Test streaming with citation detection
   - [ ] Validate event emission timing
   - [ ] Test error scenarios (invalid numbers, missing metadata)
   - [ ] Performance testing (citation parsing overhead)

**Deliverables:**
- ✅ Real-time citation detection during streaming
- ✅ Citation metadata pushed before content
- ✅ Section-level citation tracking

**Success Criteria:**
- Citation parsing adds <50ms latency per chunk
- 100% of valid citations detected
- Invalid citations logged and tracked

---

### Phase 3: Frontend Components (Week 4-5)

**Goal**: Build interactive citation UI components

#### Tasks

1. **Create Citation Store** (2 days)
   - [ ] Set up Zustand store or React Context
   - [ ] Implement citation metadata state
   - [ ] Add hover state management
   - [ ] Create citation lookup functions
   - [ ] Add video player state management

2. **Build CitationBadge Component** (2 days)
   - [ ] Create React component with styling
   - [ ] Implement hover event handlers
   - [ ] Add click navigation logic
   - [ ] Implement keyboard navigation (Tab, Enter)
   - [ ] Add accessibility attributes (aria-label, role)

3. **Build CitationTooltip Component** (3 days)
   - [ ] Create tooltip component with positioning logic
   - [ ] Implement show/hide animations
   - [ ] Add thumbnail lazy loading
   - [ ] Format video metadata (duration, views)
   - [ ] Handle edge cases (screen boundaries)
   - [ ] Add dark mode support

4. **Build ReferenceList Component** (2 days)
   - [ ] Create reference list layout
   - [ ] Implement video card design
   - [ ] Add click-to-scroll functionality
   - [ ] Add click-to-play functionality
   - [ ] Group citations by section

5. **Markdown Parser Integration** (2 days)
   - [ ] Extend markdown parser to detect `[number]` patterns
   - [ ] Replace citations with CitationBadge components
   - [ ] Detect `### Sources` sections
   - [ ] Replace with ReferenceList components
   - [ ] Handle edge cases (code blocks, inline code)

**Deliverables:**
- ✅ Interactive citation badges in reports
- ✅ Hover tooltips with video previews
- ✅ Organized reference lists per section

**Success Criteria:**
- Tooltip appears within 300ms of hover
- Tooltip positioning works in all screen regions
- Components accessible via keyboard
- Dark mode fully supported

---

### Phase 4: Integration & Polish (Week 6)

**Goal**: Connect frontend/backend, optimize performance, polish UX

#### Tasks

1. **WebSocket Integration** (2 days)
   - [ ] Listen for `citations:metadata` event
   - [ ] Populate citation store on event
   - [ ] Listen for `citations:section-complete`
   - [ ] Update UI when sections complete
   - [ ] Handle disconnection/reconnection

2. **Performance Optimization** (2 days)
   - [ ] Lazy load tooltip content
   - [ ] Virtualize long reference lists
   - [ ] Debounce hover events
   - [ ] Optimize re-renders with React.memo
   - [ ] Add loading states for thumbnails

3. **Responsive Design** (2 days)
   - [ ] Implement mobile-friendly tooltips (bottom sheets)
   - [ ] Adjust reference list layout for tablets
   - [ ] Test on various screen sizes
   - [ ] Optimize touch interactions

4. **Localization** (1 day)
   - [ ] Translate "Sources" heading
   - [ ] Localize duration format (14:25)
   - [ ] Localize upload dates ("2 months ago")
   - [ ] Localize view counts ("72K views")

5. **Testing & Bug Fixes** (2 days)
   - [ ] Cross-browser testing (Chrome, Firefox, Safari)
   - [ ] Test on mobile devices (iOS, Android)
   - [ ] Fix positioning bugs
   - [ ] Fix accessibility issues
   - [ ] Performance profiling

**Deliverables:**
- ✅ Fully integrated citation system
- ✅ Responsive design working on all devices
- ✅ Localization complete for all languages

**Success Criteria:**
- Works on Chrome, Firefox, Safari (last 2 versions)
- Mobile experience smooth and intuitive
- Lighthouse accessibility score >95
- No memory leaks during long sessions

---

### Phase 5: Testing & Rollout (Week 7)

**Goal**: Comprehensive testing and gradual rollout

#### Tasks

1. **Automated Testing** (2 days)
   - [ ] Write E2E tests for citation interactions
     - Hover tooltip display
     - Click navigation to reference
     - Click to play video
   - [ ] Write unit tests for all components
   - [ ] Write integration tests for citation parsing
   - [ ] Achieve >90% code coverage

2. **User Acceptance Testing** (2 days)
   - [ ] Internal team testing with real research queries
   - [ ] Collect feedback on UX and interactions
   - [ ] Test in different languages
   - [ ] Test with various video counts (1-50)

3. **Bug Fixes & Refinements** (2 days)
   - [ ] Fix bugs discovered in UAT
   - [ ] Refine tooltip positioning edge cases
   - [ ] Optimize performance based on profiling
   - [ ] Polish animations and transitions

4. **Documentation** (1 day)
   - [ ] Update user documentation
   - [ ] Create developer documentation for citation system
   - [ ] Document citation prompt format for AI team
   - [ ] Create troubleshooting guide

5. **Rollout** (1 day)
   - [ ] Deploy to staging environment
   - [ ] Smoke test critical flows
   - [ ] Enable for 10% of users (feature flag)
   - [ ] Monitor error rates and performance
   - [ ] Gradual rollout to 50%, then 100%

**Deliverables:**
- ✅ Comprehensive test suite
- ✅ Feature deployed to production
- ✅ Documentation complete

**Success Criteria:**
- All E2E tests passing
- No critical bugs in production
- Error rate <0.1%
- User feedback positive (>4.5/5 rating)

---

## Testing Strategy

### Unit Testing

#### Backend Tests
- **Citation Mapper** (citation-mapper.service.ts)
  - Test video → citation number mapping
  - Test citation metadata generation
  - Test prompt context formatting for Qwen
  
- **Citation Parser** (citation-parser.service.ts)
  - Test regex pattern matching
  - Test validation logic
  - Test citation usage tracking
  - Test integration with Qwen streaming output

- **AI Service Integration** (ai.service.ts)
  - Test citation instructions in Qwen prompts
  - Test streaming with citation detection via `callQwenMax()`
  - Test DashScope API compatibility

#### Frontend Tests
- **CitationBadge Component**
  - Test rendering with different numbers
  - Test hover event handlers
  - Test click event handlers
  
- **CitationTooltip Component**
  - Test positioning logic
  - Test show/hide animations
  - Test video metadata formatting
  
- **ReferenceList Component**
  - Test citation grouping
  - Test click interactions
  - Test responsive layout

### Integration Testing

#### Backend Integration
- Test full research flow with citations
- Test streaming with citation parsing
- Test WebSocket event emission
- Test error recovery mechanisms

#### Frontend Integration
- Test WebSocket event handling
- Test citation store updates
- Test component interactions
- Test markdown parsing with citations

### End-to-End Testing

#### Critical User Flows
1. **Research Generation with Citations**
   - Start research query
   - Verify citations:metadata event received
   - Verify content streams with [number] badges
   - Verify reference lists render correctly

2. **Hover Interaction**
   - Hover over citation badge
   - Verify tooltip appears within 300ms
   - Verify tooltip contains correct video data
   - Verify tooltip disappears on mouse leave

3. **Click to Reference**
   - Click citation badge
   - Verify scroll to reference list
   - Verify correct reference is highlighted

4. **Click to Video**
   - Click "Watch Video" in tooltip
   - Verify video player opens
   - Verify correct video loads

5. **Mobile Interactions**
   - Tap citation badge on mobile
   - Verify bottom sheet tooltip appears
   - Tap outside to dismiss
   - Long-press for context menu

### Performance Testing

#### Metrics to Monitor
- **Citation parsing latency**: <50ms per chunk
- **Tooltip render time**: <100ms from hover
- **Memory usage**: No leaks during 30-minute session
- **Bundle size impact**: <20KB gzipped

#### Load Testing
- Test with 50 citations in single report
- Test with 10 concurrent users generating research
- Test streaming with slow network (3G simulation)

### Accessibility Testing

#### Manual Checks
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Keyboard navigation (Tab, Enter, Escape)
- Color contrast (WCAG AAA compliance)
- Focus indicators visibility

#### Automated Checks
- Run axe-core accessibility checks
- Run Lighthouse accessibility audit (score >95)
- Test with keyboard-only navigation tools

---

## Success Metrics & KPIs

### User Engagement Metrics

| Metric | Definition | Target | Tracking Method |
|--------|-----------|--------|-----------------|
| **Citation Hover Rate** | % of users who hover at least 1 citation | >30% | Analytics event |
| **Citation Click Rate** | % of users who click citation to navigate | >20% | Analytics event |
| **Video Watch Rate** | % of users who play video from citation | >15% | Analytics event |
| **Avg Hovers per Report** | Average number of citation hovers per user | >5 | Analytics aggregation |
| **Reference List Engagement** | % of users who click reference list items | >25% | Analytics event |

### Quality Metrics

| Metric | Definition | Target | Tracking Method |
|--------|-----------|--------|-----------------|
| **Citation Accuracy** | % of AI outputs with valid citation numbers | >98% | Backend validation |
| **Citation Coverage** | % of videos actually cited in reports | >80% | Citation usage analysis |
| **Invalid Citation Rate** | % of citations with incorrect numbers | <2% | Error logging |
| **Missing Metadata Rate** | % of citations with incomplete data | <1% | Data validation |

### Performance Metrics

| Metric | Definition | Target | Tracking Method |
|--------|-----------|--------|-----------------|
| **Tooltip Render Time** | Time from hover to tooltip display | <300ms | Performance API |
| **Citation Parsing Overhead** | Added latency per chunk from parsing | <50ms | Server-side timing |
| **Memory Leak Incidents** | Number of memory leak reports | 0 | Error monitoring |
| **Page Load Impact** | Increase in initial page load time | <100ms | Lighthouse |

### User Satisfaction Metrics

| Metric | Definition | Target | Tracking Method |
|--------|-----------|--------|-----------------|
| **Feature Satisfaction** | User rating of citation system (1-5) | >4.5 | In-app survey |
| **Readability Improvement** | User rating of report readability | >4.5 | In-app survey |
| **NPS Impact** | Change in Net Promoter Score | +5 points | Quarterly survey |

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| **AI fails to use correct citation numbers** | Medium | High | - Validate in prompt with explicit examples<br>- Add citation number validation in parser<br>- Log mismatches for retraining |
| **Tooltip positioning bugs on edge cases** | High | Medium | - Comprehensive edge case testing<br>- Fallback positioning logic<br>- User feedback mechanism |
| **Performance degradation with many citations** | Low | Medium | - Implement lazy loading<br>- Virtualize long lists<br>- Cache tooltip content |
| **WebSocket disconnection during streaming** | Medium | Low | - Implement reconnection logic<br>- Cache citations locally<br>- Graceful degradation |

### UX Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| **Users don't discover hover interaction** | Medium | High | - Add subtle animation hint<br>- Show onboarding tooltip<br>- Add "Learn More" in UI |
| **Tooltips obstruct reading** | Low | Medium | - Smart positioning logic<br>- Quick dismiss on scroll<br>- User preference setting |
| **Mobile tap experience confusing** | Medium | Medium | - Use bottom sheets<br>- Clear visual feedback<br>- User testing with mobile users |

### Business Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| **Users prefer old citation style** | Low | Medium | - Feature flag for A/B testing<br>- User preference toggle<br>- Collect feedback data |
| **Increased AI costs from longer prompts** | Low | Low | - Monitor token usage<br>- Optimize prompt length<br>- Cache citation mappings |

---

## Future Enhancements

### Post-MVP Features (Not in Initial Scope)

#### 1. Timestamp-Level Citations (Q2 2026)
- Enable citations to specific video timestamps: `[1:23:45]`
- Jump to exact moment in video when cited
- Useful for long-form interviews and lectures

#### 2. Citation Export (Q3 2026)
- Export citations to BibTeX, EndNote, APA formats
- Generate bibliography for academic use
- Enable "Copy citation" feature

#### 3. Cross-Document Citations (Q3 2026)
- Link citations across multiple research reports
- Build citation graph for related queries
- Show "Also cited in: [Report A, Report B]"

#### 4. Smart Citation Suggestions (Q4 2026)
- AI suggests additional citations for weak claims
- Highlight under-cited sections
- Recommend re-watching specific videos

#### 5. User-Editable Citations (Q4 2026)
- Allow users to add custom notes to citations
- Enable manual citation reordering
- Support user-uploaded documents as sources

#### 6. Citation Analytics Dashboard (Q1 2027)
- Show most-cited videos across all reports
- Track citation patterns and trends
- Identify influential sources

---

## Appendices

### Appendix A: Citation Format Examples

#### English
```markdown
Gold has shown significant volatility[1]. Multiple factors contribute[2, 3].

### Sources
[1] How to Trade Gold - The Moving Average (7:30, 8 months ago)
[2] Gold Scalping Strategy - Trade with Pat (14:25, 2 months ago)
[3] Gold Market Analysis - Bravos Research (17:27, 5 years ago)
```

#### Chinese (Simplified)
```markdown
黄金显示出显著的波动性[1]。多种因素共同作用[2, 3]。

### 来源
[1] 如何交易黄金 - The Moving Average（7:30，8个月前）
[2] 黄金剥头皮策略 - Trade with Pat（14:25，2个月前）
[3] 黄金市场分析 - Bravos Research（17:27，5年前）
```

#### Spanish
```markdown
El oro ha mostrado una volatilidad significativa[1]. Múltiples factores contribuyen[2, 3].

### Fuentes
[1] Cómo operar con oro - The Moving Average (7:30, hace 8 meses)
[2] Estrategia de scalping de oro - Trade with Pat (14:25, hace 2 meses)
[3] Análisis del mercado del oro - Bravos Research (17:27, hace 5 años)
```

### Appendix B: Component File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── research/
│   │   │   ├── citations/
│   │   │   │   ├── CitationBadge.tsx
│   │   │   │   ├── CitationBadge.test.tsx
│   │   │   │   ├── CitationTooltip.tsx
│   │   │   │   ├── CitationTooltip.test.tsx
│   │   │   │   ├── ReferenceList.tsx
│   │   │   │   ├── ReferenceList.test.tsx
│   │   │   │   └── index.ts
│   │   │   └── ResearchReport.tsx (modified)
│   ├── stores/
│   │   ├── citationStore.ts
│   │   └── citationStore.test.ts
│   ├── hooks/
│   │   ├── useCitationHover.ts
│   │   ├── useCitationNavigation.ts
│   │   └── useCitationTooltip.ts
│   └── utils/
│       ├── citationParser.ts
│       └── citationFormatter.ts

backend/
├── src/
│   ├── services/
│   │   ├── ai.service.ts (modified - Qwen/DashScope integration)
│   │   ├── research.service.ts (modified - citation streaming)
│   │   ├── citation-mapper.service.ts (new)
│   │   ├── citation-mapper.service.test.ts (new)
│   │   ├── citation-parser.service.ts (new)
│   │   └── citation-parser.service.test.ts (new)
│   ├── prompts/
│   │   └── research/
│   │       ├── research-summary.md (modified)
│   │       └── citation-examples.md (new)
│   └── types/
│       └── citation.types.ts
```

### Appendix C: Glossary

- **Citation Badge**: The clickable `[number]` element in the text
- **Citation Metadata**: Full video details (title, channel, URL, etc.)
- **Citation Number**: The integer assigned to each video source
- **Citation Usage Map**: Tracks which citations appear in which sections
- **Reference List**: The "### Sources" section showing all cited videos
- **Tooltip**: The hover-triggered preview card showing video details

---

## Approval & Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Manager | [Name] | _________ | _____ |
| Engineering Lead | [Name] | _________ | _____ |
| Design Lead | [Name] | _________ | _____ |
| QA Lead | [Name] | _________ | _____ |

---

**Document End**
