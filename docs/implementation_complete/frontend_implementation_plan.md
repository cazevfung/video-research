# Frontend Implementation Plan: YouTube Batch Summary Service

| Version | 2.0 |
| :--- | :--- |
| **Status** | Planning |
| **Framework** | Next.js 14+ (App Router) |
| **Styling** | Tailwind CSS + Lucide React (Icons) |
| **Animation** | Framer Motion + Tailwind Animate |
| **Component Library** | Animate UI (Radix UI primitives) |
| **Target Completion** | Phased rollout |

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Project Setup & Foundation](#phase-1-project-setup--foundation)
3. [Phase 2: Authentication & Routing](#phase-2-authentication--routing)
4. [Phase 3: Core Dashboard Components](#phase-3-core-dashboard-components)
5. [Phase 4: State Management & API Integration](#phase-4-state-management--api-integration)
6. [Phase 5: Animation & Visual Effects](#phase-5-animation--visual-effects)
7. [Phase 6: History & Library](#phase-6-history--library)
8. [Phase 7: Polish & Optimization](#phase-7-polish--optimization)
9. [Testing Strategy](#testing-strategy)
10. [Dependencies & Tools](#dependencies--tools)

---

## Overview

This implementation plan breaks down the frontend development into 7 phases, progressing from foundational setup to polished features. Each phase builds upon the previous one, ensuring a stable and incremental development process.

**Note:** This plan focuses on the core service UI first. Landing page and login/authentication are deferred and will be added later.

### Key Principles

- **Desktop-first design** with mobile responsiveness
- **Dark mode default** for a "Pro Tool" aesthetic
- **Real-time feedback** via Server-Sent Events (SSE)
- **Whimsical animations** to make AI processing feel engaging
- **Type safety** throughout with TypeScript
- **Component reusability** for maintainability
- **Focus on core functionality** - authentication and marketing pages deferred

---

## Phase 1: Project Setup & Foundation

**Duration:** 1-2 days  
**Goal:** Establish the Next.js project structure with all core dependencies and configuration.

### Tasks

#### 1.1 Initialize Next.js Project
- [ ] Create Next.js 14+ project with TypeScript
- [ ] Configure App Router structure
- [ ] Set up base directory structure per `directory_structure.md`
- [ ] Initialize Git repository (if not already done)

#### 1.2 Install Core Dependencies
```bash
# Core framework
npm install next@latest react@latest react-dom@latest

# TypeScript
npm install -D typescript @types/react @types/node

# Styling
npm install tailwindcss postcss autoprefixer
npm install -D @tailwindcss/typography  # For prose markdown styling
npm install clsx tailwind-merge  # For dynamic class management

# Icons
npm install lucide-react

# Animation
npm install framer-motion

# Markdown rendering
npm install react-markdown remark-gfm

# UI Components (Animate UI / Radix UI)
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-accordion
npm install @radix-ui/react-toggle-group
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-alert-dialog
npm install @radix-ui/react-progress

# Authentication (optional - skip for now)
# npm install next-auth  # Will be added later
# npm install js-cookie  # Will be added later

# Utilities
npm install zod  # For validation
npm install date-fns  # For date formatting
```

#### 1.3 Configure Tailwind CSS
- [ ] Run `npx tailwindcss init -p`
- [ ] Configure `tailwind.config.js`:
  - Dark mode: `darkMode: 'class'` (default dark mode)
  - Extend theme with monochrome slate palette (slate-950 backgrounds, slate gray variations)
  - Add typography plugin configuration for markdown prose styling
  - Configure custom animations for whimsical effects (pulse, scale, glow)
- [ ] Set up `globals.css` with Tailwind directives
- [ ] Import Inter font (via `next/font`) - matches Animate UI typography
- [ ] Set default dark mode class on `<html>` element

#### 1.4 Set Up TypeScript Configuration
- [ ] Configure `tsconfig.json` with strict mode
- [ ] Set up path aliases (`@/components`, `@/lib`, etc.)
- [ ] Create base type definitions in `src/types/`

#### 1.5 Environment Variables
- [ ] Create `.env.local.example` with required variables:
  - `NEXT_PUBLIC_API_URL` (backend API URL)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (optional, for future auth)
  - `NEXTAUTH_SECRET` (optional, for future auth)
  - `NEXTAUTH_URL` (optional, for future auth)
  - `NEXT_PUBLIC_SKIP_AUTH` (optional, for development - bypass auth)

#### 1.6 Create Base UI Components
- [ ] `src/components/ui/Button.tsx` - Reusable button with variants
- [ ] `src/components/ui/Input.tsx` - Text input component
- [ ] `src/components/ui/Card.tsx` - Card container component
- [ ] `src/components/ui/Toast.tsx` - Toast notification component (or use a library like `sonner`)

**Deliverables:**
- ✅ Working Next.js app with Tailwind styling
- ✅ Base UI component library
- ✅ TypeScript configuration
- ✅ Development environment ready

---

## Phase 2: Basic Routing & App Layout

**Duration:** 0.5-1 day  
**Goal:** Set up basic routing structure and app layout. **Skip marketing landing page and login page for now.**

### Tasks

#### 2.1 Basic Authentication Setup (Minimal)
- [ ] Create minimal auth mock/stub for development:
  - Simple `useAuth` hook that returns mock user data
  - Or use environment variable to bypass auth during development
  - Will be replaced with real auth later
- [ ] Create `src/lib/auth.ts` with placeholder functions
- [ ] Create `src/hooks/useAuth.ts` with mock implementation

#### 2.2 Skip Landing & Login Pages
- [ ] **SKIPPED:** Landing page (`/`) - Will be added later
- [ ] **SKIPPED:** Login page (`/login`) - Will be added later
- [ ] **SKIPPED:** Protected route middleware - Will be added later

#### 2.3 App Layout (`/app/layout.tsx`)
- [ ] Create basic app layout wrapper
- [ ] Set up dark mode default (class on `<html>` element)
- [ ] Add navigation header (optional: Settings, History links)
- [ ] Add basic page structure
- [ ] Skip logout functionality for now (will add with real auth)

#### 2.4 Root Route Setup
- [ ] Set up root route (`/`) to redirect to `/app` (temporary)
- [ ] Or make `/app` the default route directly

**Deliverables:**
- ✅ Basic app layout structure
- ✅ Dark mode enabled
- ✅ Ready to build core dashboard UI
- ⏭️ Authentication flow deferred (will add later)
- ⏭️ Landing/login pages deferred (will add later)

---

## Phase 3: Core Dashboard Components

**Duration:** 3-4 days  
**Goal:** Build the main dashboard UI components for the idle/configuration state.

### Tasks

#### 3.1 Main Dashboard Page (`/app/page.tsx`)
- [ ] Create page structure with state machine:
  - `idle` - Configuration state (Phase 1)
  - `processing` - Active/whimsical state (Phase 2)
  - `streaming` - Result display state (Phase 3)
- [ ] Implement state transitions using Framer Motion `AnimatePresence`
- [ ] Layout: Centered single column, max-width `4xl` (1024px) with subtle background gradient
- [ ] Add responsive layout considerations (desktop-first, mobile adaptations)

#### 3.2 URL Input Component (`UrlInputArea.tsx`)
- [ ] Create large textarea with auto-resize:
  - `min-h-[200px]` and `max-h-[400px]`
  - Border: `border-2 border-slate-700` with `focus:border-slate-400`
  - Background: `bg-slate-900/50` with backdrop blur
  - Font: Monospace (`font-mono text-sm`)
- [ ] Add placeholder text: "Paste YouTube links here (one per line)..."
- [ ] Implement real-time line-by-line URL validation:
  - Regex for `youtube.com` and `youtu.be` patterns
  - Validate on paste/blur events
  - Invalid lines: Dark gray underline (`border-b-2 border-slate-500`)
  - Use [Animate UI Tooltip](https://animate-ui.com/docs/components/radix-ui/tooltip) for validation feedback
  - Invalid line highlight: Pulse animation (`animate-pulse`) for 2 seconds
- [ ] Add validation indicators below textarea:
  - Valid line count: "✓ 5 valid links detected"
  - Error count: "⚠ 1 invalid link (line 3)"
- [ ] Implement paste handling
- [ ] Add focus animations:
  - Subtle scale animation (`scale-[1.01]`) with white/slate glow
- [ ] **Props:** `value` (string), `onChange` (fn)

#### 3.3 Control Panel Component (`ControlPanel.tsx`)
- [ ] **Prompt Presets Section:**
  - Create horizontal scrollable row of chips/cards
  - Presets: `['tldr', 'deep_dive', 'tutorial', 'bullet_points', 'detailed']`
  - Selected state: Ring border (`ring-2 ring-slate-400`) + background change
  - Hover: Scale effect (`hover:scale-105`)
  - Use [Animate UI Toggle Group](https://animate-ui.com/docs/components/radix-ui/toggle-group) component
- [ ] **Custom Prompt Section:**
  - Create collapsible accordion (default: collapsed)
  - Use [Animate UI Accordion](https://animate-ui.com/docs/components/radix-ui/accordion) component
  - When expanded: Textarea with `maxLength={500}` and character counter
  - Placeholder: "Add specific instructions (e.g., 'Focus on code examples' or 'Emphasize key takeaways')..."
- [ ] **Language Selector:**
  - Create dropdown component
  - Default: "English"
  - Use [Animate UI Dropdown Menu](https://animate-ui.com/docs/components/radix-ui/dropdown-menu) or native select styled with Tailwind
  - Add common language options

#### 3.4 Action Button
- [ ] Create full-width "Summarize" button
- [ ] Style with gradient background: `bg-gradient-to-r from-slate-600 to-slate-400`
- [ ] Hover: Scale (`scale-105`) + brighter gradient (`from-slate-500 to-slate-300`)
- [ ] Disabled state: When no valid URLs or processing
- [ ] Loading state: Spinner icon when clicked (before SSE connection)
- [ ] Use [Animate UI Button](https://animate-ui.com/docs/components/buttons/button) as reference
- [ ] Implement click handler (will trigger Phase 2 transition)

#### 3.5 Form State Management
- [ ] Create form state hook or context
- [ ] Manage:
  - URL list
  - Selected preset
  - Custom prompt
  - Language selection
- [ ] Add validation logic
- [ ] Prepare payload structure for API

**Deliverables:**
- ✅ Complete configuration UI
- ✅ URL validation working
- ✅ Form state management
- ✅ Ready for API integration

---

## Phase 4: State Management & API Integration

**Duration:** 3-4 days  
**Goal:** Connect frontend to backend API with real-time SSE updates.

### Tasks

#### 4.1 API Client Setup (`src/lib/api.ts`)
- [ ] Create base API client with fetch wrapper
- [ ] Add authentication header injection (mock for now, will use real auth later)
- [ ] Implement error handling
- [ ] Add request/response interceptors
- [ ] Create typed API functions:
  - `startSummaryJob(payload)` - POST `/api/summarize`
  - `getHistory()` - GET `/api/history`
  - `getSummary(id)` - GET `/api/summary/:id`
- [ ] Note: For development, may need to mock auth headers or use backend dev mode

#### 4.2 Custom SSE Hook (`useSummaryStream.ts`)
- [ ] Create hook in `src/hooks/useSummaryStream.ts`
- [ ] Implement EventSource connection management with proper cleanup
- [ ] Handle SSE events matching `SummaryProgress` interface:
  - `connected` - Set status to 'connected', store job_id
  - `fetching` - Update status, progress (5-20%), and message
  - `processing` - Update status, progress (20-40%), and message
  - `condensing` - Update status, progress (40-60%), and message
  - `aggregating` - Update status, progress (70%), and message
  - `generating` - Update status, progress (85-99%), message, and append chunks
  - `completed` - Set status to 'completed', progress to 100%, finalize text, close connection
  - `error` - Set error state, close connection
  - `heartbeat` - Keep connection alive (no state update)
- [ ] Manage connection lifecycle (open, close, cleanup on unmount)
- [ ] Implement auto-reconnect with exponential backoff for connection failures
- [ ] Return state: `{ startJob, status, progress, message, streamedText, error, isStreaming, videoCount, completedVideos }`
- [ ] Match exact interface from PRD Section 8.2

#### 4.3 Type Definitions (`src/types/`)
- [ ] Create `api.types.ts`:
  - `SummaryProgress` interface matching PRD Section 3.2:
    - `status: 'connected' | 'fetching' | 'processing' | 'condensing' | 'aggregating' | 'generating' | 'completed' | 'error' | 'heartbeat'`
    - `progress: number` (0-100)
    - `message?: string`
    - `chunk?: string`
    - `data?: SummaryResponse`
    - `error?: string`
    - `job_id?: string`
  - `SummaryRequest` interface
  - `SummaryResponse` interface
  - `JobStatus` type alias
- [ ] Create `summary.types.ts`:
  - Summary data structure
  - Video metadata types
  - User prompt types
- [ ] Create `hooks.types.ts`:
  - `UseSummaryStreamReturn` interface matching PRD Section 8.2

#### 4.4 Integrate API with Dashboard
- [ ] Connect `useSummaryStream` to dashboard
- [ ] Wire up "Summarize" button to `startJob`
- [ ] Pass form data as payload
- [ ] Handle loading states
- [ ] Implement error handling with user feedback

#### 4.5 Error Handling & User Feedback
- [ ] Create error boundary component
- [ ] Implement toast notifications for errors
- [ ] Add retry logic for failed requests
- [ ] Display user-friendly error messages

**Deliverables:**
- ✅ Working API integration
- ✅ Real-time SSE updates
- ✅ Error handling
- ✅ Type-safe API calls

---

## Phase 5: Animation & Visual Effects

**Duration:** 4-5 days  
**Goal:** Implement the whimsical processing state ("The Alchemist's Orb") and streaming result display.

**Note:** This phase aligns with PRD Section 5.2 (The Whimsical Processing) and Section 5.3 (The Result). The animation system should match PRD Section 7.1 (Framer Motion Variants).

### Tasks

#### 5.1 Whimsical Loader Component (`WhimsicalLoader.tsx`)
- [ ] Design "The Alchemist's Orb" - large circular element:
  - 200px diameter on desktop, 150px on mobile
  - Gradient background: `bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500`
  - Base pulsing animation: Continuous scale (`scale: [1, 1.1, 1]`) with 2s duration
  - Glow effect: `shadow-[0_0_60px_rgba(148,163,184,0.5)]`
- [ ] Implement state-specific visuals with Framer Motion variants (matching PRD Section 7.1):
  - **`fetching`:** Light gray (`from-slate-500 to-slate-400`), particles fly INTO orb from all directions (8-12 particles), gentle pulsing (1.5s cycle)
  - **`processing`:** Medium gray (`from-slate-400 to-slate-500`), orb rotates slowly (360° over 4s), fewer particles (4-6)
  - **`condensing`:** Dark gray (`from-slate-600 to-slate-500`), orb COMPRESSES rapidly (`scale: [1, 0.7, 1]` with 1s cycle), particles spiral INTO orb (tornado effect)
  - **`aggregating`:** Medium-light gray (`from-slate-400 to-slate-500`), orb GLOWS brighter (`opacity: [0.8, 1, 0.8]` with 1.5s cycle), particles orbit around orb
  - **`generating`:** Light gray (`from-slate-300 to-slate-500`), orb emits "waves" downward (ripple effect), particles flow DOWNWARD
  - **`error`:** Dark gray (`from-slate-700 to-slate-800`), orb "shakes" animation (horizontal shake, 3 times)
- [ ] Create reusable `ParticleSystem` component:
  - Use CSS keyframes for particle animations (better performance)
  - Reference [Animate UI Backgrounds](https://animate-ui.com/docs/components/backgrounds) for inspiration
  - Particle behaviors: fly in, spiral, orbit, flow downward
- [ ] **Props:** `status` (string), `currentStep` (enum), `progress` (number)
- [ ] Make responsive for mobile (smaller orb size)

#### 5.2 Processing Overlay Layout
- [ ] Create full-screen overlay (`fixed inset-0 z-50`)
- [ ] Background: `bg-slate-950/95` with backdrop blur
- [ ] Centered content area (max-width `2xl`)
- [ ] Structure:
  1. **Central Visualization** (top 60% of viewport) - Contains `WhimsicalLoader`
  2. **Status Text** (below visualization) - `StatusMessage` component
  3. **Progress Indicator** (bottom 20%) - `ProgressBar` component
- [ ] Transition animations:
  - Enter: Fade in (`opacity-0` → `opacity-100`, `scale-95` → `scale-100`) over 400ms
  - Exit: Fade out when transitioning to streaming state
  - Use Framer Motion `AnimatePresence` for smooth transitions

#### 5.2.1 Status Message Component (`StatusMessage.tsx`)
- [ ] Position: Below central visualization
- [ ] Font: `text-xl font-semibold text-slate-200`
- [ ] Animation: Fade in/out when status changes (`opacity-0` → `opacity-100` over 200ms)
- [ ] Content: Display `message` from SSE event
- [ ] Sub-text: Show progress percentage: "45% complete"
- [ ] Add ARIA live region: `<div role="status" aria-live="polite">`

#### 5.2.2 Progress Bar Component (`ProgressBar.tsx`)
- [ ] Position: Bottom of overlay (above status text)
- [ ] Visual: Thin progress bar (`h-1 bg-slate-800 rounded-full`)
- [ ] Fill: Gradient fill (`bg-gradient-to-r from-slate-400 to-slate-500`)
- [ ] Animation: Smooth width transition (`transition-all duration-300`)
- [ ] Percentage: Display numeric progress (e.g., "45%") on right side
- [ ] Optional: Use [Animate UI Progress](https://animate-ui.com/docs/components/radix-ui/progress) as reference

#### 5.2.3 Video Success Badge Component (`VideoSuccessBadge.tsx`)
- [ ] When a video transcript is successfully fetched:
  - Small checkmark icon appears near orb (use Lucide React `CheckCircle`)
  - Floats upward with fade-out
  - Animation: `translateY(-20px)` + `opacity: [1, 0]` over 1s
  - Use Framer Motion for animation

#### 5.3 Markdown Streamer Component (`MarkdownStreamer.tsx`)
- [ ] **Props:** `content` (string - growing in real-time)
- [ ] Create component to display streaming text
- [ ] Use `react-markdown` with `remark-gfm` for rendering
- [ ] Style with Tailwind Typography (`prose prose-invert prose-lg`)
- [ ] **Typing Cursor:** Blinking cursor at end of text (`|`) when actively streaming
  - Cursor Animation: `animate-pulse` with 1s cycle
  - Remove cursor: When status changes to `completed`
- [ ] Performance optimizations:
  - Use `useMemo` to debounce markdown parsing (every 100ms)
  - Virtual scrolling for very long summaries (future optimization)
- [ ] Styling details:
  - Code blocks: Dark background with syntax highlighting
  - Links: Slate-300 color with hover underline
  - Headers: Gradient text (`bg-gradient-to-r from-slate-300 to-slate-400 bg-clip-text text-transparent`)
  - Lists: Proper spacing and indentation
- [ ] Handle markdown formatting:
  - Headers (`#`, `##`, etc.)
  - Lists (`-`, `*`, numbered)
  - Bold, italic, code blocks
  - Links

#### 5.4 Result Card Component (`ResultCard.tsx`)
- [ ] Create card layout:
  - Main container: `bg-slate-900 rounded-xl border border-slate-700 p-6`
  - Max-width: `4xl` (1024px)
  - Centered on screen
- [ ] **Header Section:**
  - Batch Title: Large text (`text-2xl font-bold`)
  - Source Videos Summary: "5 Videos Analyzed" with expandable list
  - Metadata: Processing time, date created
  - Actions: Copy, Save, New Batch buttons (top right)
- [ ] **Content Section:**
  - Markdown Renderer: Full-width scrollable area
  - Styling: Use `prose prose-invert prose-lg` (Tailwind Typography)
  - Max-height: `max-h-[60vh]` with `overflow-y-auto`
  - Integrate MarkdownStreamer component
- [ ] **Action Buttons:**
  - **Copy to Clipboard:**
    - Icon: `Copy` from Lucide React
    - On click: Copy markdown text, show toast "Copied to clipboard!"
    - Use [Animate UI Copy Button](https://animate-ui.com/docs/components/buttons/copy-button) as reference
  - **Save to Library:**
    - Icon: `Bookmark` from Lucide React
    - Auto-saved on completion, but show visual confirmation
    - Toast: "Saved to library"
  - **New Batch:**
    - Icon: `Plus` from Lucide React
    - Resets all state to Phase 1
    - Smooth transition back to configuration view
- [ ] Implement slide-in animation:
  - Desktop: Slides in from right (70% width)
  - Mobile: Slides up from bottom (80% of screen)
  - Animation: 600ms ease-out with slight bounce
  - Use Framer Motion `layout` prop for smooth layout animations

#### 5.5 State Transition Animations
- [ ] Implement smooth transitions between states:
  - **Idle → Processing:**
    - Input form fades out (`opacity-0`, `scale-95`) over 300ms
    - Processing overlay fades in (`opacity-100`, `scale-100`) over 400ms
    - Use Framer Motion `AnimatePresence` for smooth transitions
  - **Processing → Streaming:**
    - Desktop (>1024px): Processing overlay slides to left side (30% width), result card slides in from right (70% width)
    - Mobile (<1024px): Processing overlay shrinks to top 20% of screen, result card slides up from bottom (80% of screen)
    - Animation timing: Overlay transition 500ms ease-in-out, result card entrance 600ms ease-out with slight bounce
    - Use Framer Motion `layout` prop for smooth layout animations
  - **Streaming → Idle:**
    - Result card fades out
    - Processing overlay fades out completely (if still visible)
    - Input form fades in
- [ ] **Completion State:**
  - When `completed` event arrives:
    - Remove typing cursor
    - Show completion animation: Subtle scale pulse on result card
    - Display success toast: "Summary completed!"
    - Enable all action buttons
    - Processing overlay fades out completely (if still visible)
- [ ] Use Framer Motion variants from PRD Section 7.1:
  - `pageVariants` for page transitions
  - `fadeInUp` for component entrance
  - `orbVariants` for orb state transitions
- [ ] Add loading skeletons for better perceived performance

#### 5.6 Polish Animations
- [ ] Add micro-interactions:
  - Button hover effects
  - Input focus animations
  - Chip selection animations
- [ ] Implement page transitions
- [ ] Add scroll animations (if needed)

**Deliverables:**
- ✅ Engaging processing visualization
- ✅ Smooth state transitions
- ✅ Streaming markdown display
- ✅ Polished animations throughout

---

## Phase 6: History & Library

**Duration:** 2-3 days  
**Goal:** Implement the history page to view past summaries.

### Tasks

#### 6.1 History Page (`/app/history/page.tsx`)
- [ ] Create page layout
- [ ] Implement data fetching with `useHistory` hook
- [ ] Add loading and error states
- [ ] Create empty state (no summaries yet)

#### 6.2 Summary Grid Component (`SummaryGrid.tsx`)
- [ ] Design grid layout (responsive: 1 col mobile, 2-3 cols desktop)
- [ ] Create summary card component:
  - Display batch title
  - Show video count and thumbnails
  - Display creation date
  - Show preview snippet
- [ ] Add hover effects
- [ ] Implement click to view full summary

#### 6.3 Summary Detail View
- [ ] Create modal or detail page for viewing full summary
- [ ] Display complete markdown content
- [ ] Show source videos with metadata
- [ ] Add actions: Copy, Delete, Export
- [ ] Implement navigation back to grid

#### 6.4 History Hook (`useHistory.ts`)
- [ ] Create hook for fetching history data
- [ ] Implement pagination (if needed)
- [ ] Add filtering/search functionality (optional)
- [ ] Handle loading and error states

#### 6.5 Navigation Integration
- [ ] Add "History" link to app header/navigation
- [ ] Implement active state styling
- [ ] Add breadcrumbs if needed

**Deliverables:**
- ✅ History page with grid view
- ✅ Summary detail view
- ✅ Data fetching and display
- ✅ Navigation integration

---

## Phase 7: Polish & Optimization

**Duration:** 2-3 days  
**Goal:** Final polish, performance optimization, and edge case handling.

### Tasks

#### 7.1 Performance Optimization (matching PRD Section 7.2)
- [ ] Use `will-change` CSS property for animated elements
- [ ] Prefer CSS animations for particles (better performance than JavaScript)
- [ ] Debounce markdown parsing during streaming (every 100ms)
- [ ] Virtualize long result lists if needed (future optimization)
- [ ] Implement code splitting for routes
- [ ] Optimize images (Next.js Image component)
- [ ] Add loading states and skeletons
- [ ] Optimize bundle size (analyze with `@next/bundle-analyzer`)
- [ ] Implement React.memo for expensive components
- [ ] Add debouncing for input validation

#### 7.2 Accessibility (a11y) (matching PRD Section 11)
- [ ] **Keyboard Navigation:**
  - Tab through all interactive elements
  - Enter/Space to activate buttons
  - Escape to close modals/dialogs
- [ ] **Screen Reader Support:**
  - ARIA labels for all buttons and status messages
  - Live region for progress updates: `<div role="status" aria-live="polite">`
  - Announce status changes: "Processing: 45% complete"
- [ ] **Reduced Motion:**
  - Respect `prefers-reduced-motion` media query
  - Disable particle animations if reduced motion preferred
  - Use simpler fade transitions instead of complex animations
  - Use Framer Motion's `useReducedMotion` hook for accessibility
- [ ] Add focus indicators
- [ ] Ensure color contrast meets WCAG standards
- [ ] Test with screen readers

#### 7.3 Error Handling & Edge Cases
- [ ] **Error State Visualization** (matching PRD Section 6.1):
  - When `error` event arrives:
    - Processing overlay stops all animations
    - Orb changes to dark gray (`from-slate-700 to-slate-800`)
    - Orb "shakes" animation (horizontal shake, 3 times)
    - Error message displayed prominently:
      - Large error icon (Lucide `AlertCircle`)
      - Error text from `error` field
      - "Try Again" button
    - Use [Animate UI Alert Dialog](https://animate-ui.com/docs/components/radix-ui/alert-dialog) for error modal
- [ ] **Connection Issues** (matching PRD Section 6.2):
  - SSE Connection Lost:
    - Show warning banner: "Connection lost. Reconnecting..."
    - Auto-reconnect with exponential backoff
    - Show reconnection spinner
  - Heartbeat Timeout:
    - If no `heartbeat` event for 60 seconds, show warning
    - Option to manually reconnect
- [ ] **Empty States** (matching PRD Section 6.3):
  - No URLs: Disable "Summarize" button, show hint: "Paste at least one YouTube URL to continue"
  - No Valid URLs: Show error message in input area, highlight all invalid lines
- [ ] Handle network failures gracefully
- [ ] Add timeout handling for long-running jobs
- [ ] Implement retry mechanisms
- [ ] Handle quota/rate limit errors from backend

#### 7.4 User Experience Enhancements
- [ ] Add tooltips for unclear actions
- [ ] Implement keyboard shortcuts (optional)
- [ ] Add confirmation dialogs for destructive actions
- [ ] Improve error messages (user-friendly)
- [ ] Add success animations/celebrations
- [ ] Implement auto-save for form inputs (localStorage)

#### 7.5 Responsive Design (matching PRD Section 10)
- [ ] **Breakpoints:**
  - Mobile: `< 640px` (sm)
  - Tablet: `640px - 1024px` (md-lg)
  - Desktop: `> 1024px` (xl+)
- [ ] **Mobile Adaptations:**
  - Processing Overlay:
    - Orb size: 150px (vs 200px on desktop)
    - Status text: `text-lg` (vs `text-xl`)
    - Progress bar: Full width with padding
  - Result Card:
    - Full-width on mobile
    - Reduced padding: `p-4` (vs `p-6`)
    - Smaller font sizes for headers
  - Input Area:
    - Full-width textarea
    - Larger touch targets for buttons (min 44px height)
- [ ] Desktop-first design with Tailwind responsive prefixes (`md:`, `lg:`)
- [ ] Test WhimsicalLoader on small screens
- [ ] Ensure touch interactions work
- [ ] Test on mobile devices

#### 7.6 Browser Compatibility
- [ ] Test on Chrome, Edge, Safari, Firefox
- [ ] Ensure SSE works across browsers
- [ ] Fix any CSS compatibility issues
- [ ] Test dark mode on all browsers

#### 7.7 Documentation
- [ ] Add JSDoc comments to complex functions
- [ ] Document component props
- [ ] Create component usage examples
- [ ] Update README with setup instructions

**Deliverables:**
- ✅ Optimized performance
- ✅ Accessible interface
- ✅ Robust error handling
- ✅ Polished user experience
- ✅ Cross-browser compatible

---

## Testing Strategy

### Unit Testing
- [ ] Set up Jest and React Testing Library
- [ ] Test utility functions
- [ ] Test custom hooks
- [ ] Test component rendering

### Integration Testing
- [ ] Test API integration
- [ ] Test SSE connection handling
- [ ] Test authentication flow
- [ ] Test form submission

### E2E Testing (Optional)
- [ ] Set up Playwright or Cypress
- [ ] Test complete user flows
- [ ] Test error scenarios

### Manual Testing Checklist
- [ ] Test all user flows
- [ ] Test on different screen sizes
- [ ] Test with various input scenarios
- [ ] Test error conditions
- [ ] Test performance with large inputs

---

## Dependencies & Tools

### Core Dependencies
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "framer-motion": "^10.0.0",
  "lucide-react": "^0.300.0",
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0",
  "@radix-ui/react-tooltip": "^1.0.0",
  "@radix-ui/react-accordion": "^1.0.0",
  "@radix-ui/react-toggle-group": "^1.0.0",
  "@radix-ui/react-dropdown-menu": "^2.0.0",
  "@radix-ui/react-alert-dialog": "^1.0.0",
  "@radix-ui/react-progress": "^1.0.0",
  "zod": "^3.22.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0",
  "date-fns": "^2.30.0"
}
```

### Development Dependencies
```json
{
  "@types/react": "^18.0.0",
  "@types/node": "^20.0.0",
  "@tailwindcss/typography": "^0.5.0",
  "eslint": "^8.0.0",
  "eslint-config-next": "^14.0.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0"
}
```

### Recommended Tools
- **VS Code Extensions:**
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

- **Browser DevTools:**
  - React DevTools
  - Network tab for SSE debugging

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Setup | 1-2 days | 1-2 days |
| Phase 2: Basic Routing & Layout | 0.5-1 day | 1.5-3 days |
| Phase 3: Dashboard Components | 3-4 days | 4.5-7 days |
| Phase 4: API Integration | 3-4 days | 7.5-11 days |
| Phase 5: Animation & Effects | 4-5 days | 11.5-16 days |
| Phase 6: History & Library | 2-3 days | 13.5-19 days |
| Phase 7: Polish & Optimization | 2-3 days | 15.5-22 days |

**Total Estimated Duration: 2-3 weeks** (assuming one developer, full-time)

**Note:** Phase 2 reduced significantly by skipping landing/login pages. Authentication will be added later.

**Note:** This timeline aligns with PRD Section 12 (Development Roadmap), which breaks down into:
- Phase 1: Core Functionality (Scaffold, Auth UI, State Management, API Connection)
- Phase 2: Enhanced Visualizations (WhimsicalLoader, Orb visualization, Particle system)
- Phase 3: Polish & Refinement (Markdown View, Error handling, Accessibility, Performance)

---

## Success Criteria

- ✅ All pages render correctly
- ⏭️ Authentication works end-to-end (deferred - will add later)
- ✅ URL validation and form submission work
- ✅ SSE connection provides real-time updates
- ✅ Whimsical loader animates based on backend status
- ✅ Markdown streams and renders correctly
- ✅ History page displays past summaries
- ✅ Responsive design works on mobile
- ✅ No console errors
- ✅ Performance is acceptable (< 3s initial load)
- ✅ Accessibility standards met

---

## Notes & Considerations

1. **Focus on Core Service:** Landing page (`/`) and login page (`/login`) are skipped for now. Focus is on building the main dashboard (`/app`) and core functionality. Authentication can be added later with minimal impact.

2. **PRD Alignment:** This implementation plan aligns with `frontend_prd.md` version 2.0. All component specifications, animations, and design details should match the PRD (except for deferred auth/marketing pages).

3. **Animate UI Components:** Reference [Animate UI](https://animate-ui.com/docs) components for:
   - Tooltip (URL validation feedback)
   - Accordion (custom prompt expansion)
   - Toggle Group (preset selection)
   - Button (action buttons)
   - Copy Button (copy functionality)
   - Alert Dialog (error modals)
   - Progress (optional, custom implementation preferred)
   - Backgrounds (particle system inspiration)

3. **Backend Dependency:** Frontend development can proceed in parallel with backend, but Phase 4 requires a working backend API. Consider using mock data initially. SSE event structure must match PRD Section 3.2.

4. **Design Iteration:** The whimsical loader ("The Alchemist's Orb") may require multiple iterations to achieve the desired "fun" feeling. Allocate extra time for experimentation. Reference PRD Section 5.2.2 for detailed specifications.

5. **SSE Reliability:** Implement reconnection logic for SSE connections that may drop due to network issues. Handle heartbeat timeouts (60 seconds) as specified in PRD Section 6.2.

6. **State Management:** Consider using Zustand or Context API if component state becomes too complex. Start simple, refactor if needed.

7. **Error Messages:** Work with backend team to ensure error messages are user-friendly and actionable. Error visualization must match PRD Section 6.1.

8. **Performance:** Monitor bundle size and performance metrics throughout development. Optimize early if issues arise. Follow PRD Section 7.2 performance considerations.

9. **Animation Variants:** Use Framer Motion variants as specified in PRD Section 7.1 for consistent animations across the app.

10. **Color Scheme:** Use monochrome slate palette (slate-950 backgrounds, slate gray variations) as specified in PRD Section 2.1. No violet/indigo accents - pure monochrome.

---

## Next Steps

1. Review this plan with the team
2. Set up project repository and initial structure (Phase 1)
3. Begin Phase 1 implementation
4. Schedule regular check-ins to review progress
5. Adjust timeline based on actual development pace

---

**Document Version:** 2.0  
**Last Updated:** [Current Date]  
**Status:** Updated to align with Frontend PRD v2.0  
**PRD Reference:** `docs/frontend_prd.md`

