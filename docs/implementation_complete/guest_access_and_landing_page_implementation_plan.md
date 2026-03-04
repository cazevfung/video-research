# Combined Implementation Plan: Guest Access + Marketing Landing Page

| Version | 1.0 |
| :--- | :--- |
| **Status** | Planning |
| **Created** | 2024 |
| **Scope** | Guest Access PRD + Marketing Landing Page PRD |

---

## Executive Summary

This document outlines a comprehensive implementation plan for two major features:
1. **Guest Access** - Allow users to create summaries without authentication (limited to 1 summary)
2. **Marketing Landing Page** - A minimalist, conversion-focused landing page

The plan coordinates both features to ensure seamless user experience: new visitors land on the marketing page, can try the service as guests, and are encouraged to sign up for full functionality.

---

## Current State Assessment

### Guest Access PRD
- **Status**: ❌ Not implemented
- **Current Behavior**: All summary operations require authentication via `requireAuth` middleware
- **Required Work**: Full implementation (backend + frontend)
- **Dependencies**: Authentication system, summary service, credit system, user tier system

### Marketing Landing Page PRD
- **Status**: ❌ Not implemented
- **Current Behavior**: Root route (`/`) likely redirects to `/app` or shows app directly
- **Required Work**: Full implementation (new feature)
- **Dependencies**: Design system (`visual-effects.ts`), theme system (existing)

---

## Implementation Strategy

### Approach: Sequential with Integration Points

**Rationale:**
- Landing page should be completed first to provide entry point for guest users
- Guest access requires both backend and frontend changes
- Both features work together: landing page → guest access → conversion to authenticated
- Landing page validates design system usage before guest access UI changes

**Priority Order:**
1. **Phase 1**: Marketing Landing Page (Standalone, High Priority)
2. **Phase 2**: Guest Access Backend (Core functionality)
3. **Phase 3**: Guest Access Frontend (UI/UX)
4. **Phase 4**: Integration & Polish (Both features working together)

---

## Phase 1: Marketing Landing Page Implementation

### 1.1 Goals
- Create minimalist, conversion-focused landing page
- Implement Animate UI-inspired design
- Integrate with existing design system
- Ensure SEO and performance optimization
- Provide entry point for guest users

### 1.2 Timeline
**Estimated Duration**: 3-5 days

### 1.3 Tasks Breakdown

#### Task 1.1.1: Setup & Routing
**Duration**: 0.5 days

**Tasks:**
- [ ] Update `frontend/src/app/page.tsx` to render landing page (remove redirect if exists)
- [ ] Create landing page layout structure
- [ ] Verify route structure: `/` = landing, `/login` = login, `/app` = dashboard
- [ ] Ensure landing page doesn't require authentication

**Files to Create/Modify:**
- `frontend/src/app/page.tsx` - Landing page component
- `frontend/src/app/layout.tsx` - Root layout (may need updates for landing page header/footer)

**Acceptance Criteria:**
- Root route (`/`) displays landing page
- No redirect to `/app` on root route
- Routes are properly configured
- Landing page accessible without authentication

---

#### Task 1.1.2: Landing Page Components
**Duration**: 2 days

**Components to Create:**
- [ ] `frontend/src/components/landing/Header.tsx` - Minimal header with logo, theme toggle
- [ ] `frontend/src/components/landing/Hero.tsx` - Hero section with headline, subheadline, CTAs
- [ ] `frontend/src/components/landing/Features.tsx` - Optional features section (3-4 cards)
- [ ] `frontend/src/components/landing/Footer.tsx` - Minimal footer

**Key Requirements:**
- All components MUST use `visual-effects.ts` config (colors, spacing, typography, etc.)
- Dark mode default (matches app)
- Responsive design (mobile-first)
- Framer Motion animations (subtle, purposeful)
- Accessibility (WCAG 2.1 AA)

**Design System Integration:**
```typescript
import {
  colors,
  spacing,
  typography,
  borderRadius,
  buttonConfig,
  shadows,
  motionVariants,
  animationDurations,
} from '@/config/visual-effects';
```

**Hero Section Specifications:**
- **Headline**: "Turn hours of video into minutes of reading"
- **Subheadline**: "Batch summarize multiple YouTube videos with AI. Get comprehensive summaries in your preferred style and language."
- **Primary CTA**: "Get Started" → Links to `/app` (allows guest access)
- **Secondary CTA**: "Learn More" (Optional) → Scroll to features or `/docs`
- **Tech Stack Badges**: React, TypeScript, Next.js, AI-Powered

**Files to Create:**
- `frontend/src/components/landing/Header.tsx`
- `frontend/src/components/landing/Hero.tsx`
- `frontend/src/components/landing/Features.tsx` (Optional)
- `frontend/src/components/landing/Footer.tsx`
- `frontend/src/components/landing/index.ts` (Barrel export)

**Acceptance Criteria:**
- All components use design system tokens (no hardcoded colors/spacing)
- Hero section matches PRD specifications
- Responsive on mobile, tablet, desktop
- Animations are subtle and smooth
- Theme toggle works correctly

---

#### Task 1.1.3: Landing Page Integration
**Duration**: 0.5 days

**Tasks:**
- [ ] Create `frontend/src/app/page.tsx` landing page
- [ ] Integrate Header, Hero, Features (optional), Footer
- [ ] Add proper page structure (`<header>`, `<main>`, `<footer>`)
- [ ] Implement page-level animations (Framer Motion)

**File Structure:**
```
frontend/src/app/
  page.tsx          # Landing page (replaces redirect)
  layout.tsx       # Root layout (may need header/footer updates)
```

**Acceptance Criteria:**
- Landing page renders correctly
- All sections are properly integrated
- Page animations work smoothly
- Semantic HTML structure

---

#### Task 1.1.4: Theme Integration
**Duration**: 0.5 days

**Tasks:**
- [ ] Verify theme toggle component works on landing page
- [ ] Ensure dark mode is default
- [ ] Test light mode support
- [ ] Verify theme persistence (localStorage)

**Components:**
- Reuse existing `ThemeToggle` component from `frontend/src/components/ui/ThemeToggle.tsx`
- Ensure theme system works across landing page and app

**Acceptance Criteria:**
- Theme toggle works on landing page
- Dark mode is default
- Theme persists across page navigation
- Smooth theme transitions

---

#### Task 1.1.5: SEO & Performance
**Duration**: 0.5 days

**Tasks:**
- [ ] Add meta tags (title, description, Open Graph, Twitter Card)
- [ ] Add structured data (Schema.org)
- [ ] Optimize images (if any)
- [ ] Implement lazy loading for non-critical components
- [ ] Verify Core Web Vitals (LCP, FID, CLS)

**Meta Tags:**
- Title: "Video Research - Turn Hours of Video into Minutes of Reading"
- Description: "Batch summarize multiple YouTube videos with AI. Get comprehensive summaries in your preferred style and language."

**Acceptance Criteria:**
- All meta tags present and correct
- Structured data validates
- Lighthouse score: 90+ (Performance, Accessibility, Best Practices, SEO)
- LCP < 2.5s

---

## Phase 2: Guest Access Backend Implementation

### 2.1 Goals
- Allow unauthenticated users to create summaries
- Enforce 1 summary limit for guest users
- Store guest summaries temporarily (session-based)
- Support guest-to-authenticated user transition
- Prevent abuse through rate limiting

### 2.2 Timeline
**Estimated Duration**: 4-6 days

### 2.3 Tasks Breakdown

#### Task 2.1.1: Guest Session Management
**Duration**: 1 day

**Tasks:**
- [ ] Create `backend/src/services/guest-session.service.ts`
- [ ] Implement guest session ID generation
- [ ] Create in-memory or Redis storage for guest sessions
- [ ] Implement session expiration (24 hours)
- [ ] Add session cleanup job

**Guest Session Model:**
```typescript
interface GuestSession {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  summaryCount: number; // Max 1
  ipAddress?: string; // For abuse prevention
}
```

**Files to Create:**
- `backend/src/services/guest-session.service.ts`
- `backend/src/types/guest.types.ts` (if needed)

**Storage Options:**
- **Option A**: In-memory Map (simple, but lost on restart)
- **Option B**: Redis (recommended for production, persistent)
- **Option C**: Database with TTL (Firestore with expiration)

**Acceptance Criteria:**
- Guest sessions can be created
- Session IDs are unique and secure
- Sessions expire after 24 hours
- Cleanup job removes expired sessions

---

#### Task 2.1.2: Optional Authentication Middleware
**Duration**: 1 day

**Tasks:**
- [ ] Create `backend/src/middleware/optional-auth.middleware.ts`
- [ ] Allow both authenticated and guest requests
- [ ] Extract guest session ID from headers or cookies
- [ ] Attach guest info to request object
- [ ] Update request type to support guest state

**Middleware Logic:**
```typescript
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Try to authenticate first
  if (authHeader) {
    verifyToken(req, res, () => {
      // Authenticated user
      next();
    });
  } else {
    // Check for guest session
    const guestSessionId = extractGuestSessionId(req);
    if (guestSessionId) {
      req.guest = { sessionId: guestSessionId };
      req.user = null;
    }
    next();
  }
}
```

**Request Type Extension:**
```typescript
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser | null;
  guest?: { sessionId: string } | null;
}
```

**Files to Create/Modify:**
- `backend/src/middleware/optional-auth.middleware.ts` (new)
- `backend/src/middleware/auth.middleware.ts` (may need updates)
- `backend/src/types/request.types.ts` (extend if needed)

**Acceptance Criteria:**
- Middleware allows both authenticated and guest requests
- Guest session ID is extracted correctly
- Request object has correct user/guest state
- Backward compatible with existing authenticated routes

---

#### Task 2.1.3: Guest Summary Storage
**Duration**: 1 day

**Tasks:**
- [ ] Create `backend/src/services/guest-summary.service.ts`
- [ ] Implement temporary summary storage
- [ ] Store guest summaries separately from authenticated summaries
- [ ] Add expiration handling
- [ ] Implement guest summary retrieval by session ID

**Guest Summary Model:**
```typescript
interface GuestSummary {
  sessionId: string;
  jobId: string;
  summaryData: Summary;
  createdAt: Date;
  expiresAt: Date;
}
```

**Storage Strategy:**
- **Backend**: In-memory Map or Redis with TTL
- **Frontend**: sessionStorage (temporary, cleared on tab close)

**Files to Create:**
- `backend/src/services/guest-summary.service.ts`
- `backend/src/storage/guest-summary.storage.ts` (if using file storage)

**Acceptance Criteria:**
- Guest summaries can be stored temporarily
- Summaries expire after 24 hours
- Guest summaries are not mixed with authenticated summaries
- Retrieval by session ID works correctly

---

#### Task 2.1.4: Summary Controller Updates
**Duration**: 1 day

**Tasks:**
- [ ] Update `backend/src/controllers/summary.controller.ts`
- [ ] Modify `createSummaryJob` to accept guest requests
- [ ] Check guest summary limit (1 summary)
- [ ] Store summaries appropriately (guest vs authenticated)
- [ ] Update summary retrieval endpoints

**Summary Creation Logic:**
```typescript
export async function createSummaryJob(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const isGuest = !req.user && req.guest;
  const userId = req.user?.id || null;
  const guestSessionId = req.guest?.sessionId || null;

  if (isGuest) {
    // Check guest limit
    const guestSession = await getGuestSession(guestSessionId);
    if (guestSession.summaryCount >= 1) {
      return res.status(429).json({
        error: {
          code: 'GUEST_LIMIT_REACHED',
          message: 'Guest users are limited to 1 summary. Please login to create more summaries.',
        },
      });
    }
  }

  // Create job and process...
  // Store summary in appropriate location (guest vs authenticated)
}
```

**Files to Modify:**
- `backend/src/controllers/summary.controller.ts`
- `backend/src/services/summary.service.ts` (may need updates for guest storage)

**Acceptance Criteria:**
- Guest users can create summaries
- Guest limit (1 summary) is enforced
- Summaries stored in correct location (guest vs authenticated)
- Error messages are clear and helpful

---

#### Task 2.1.5: Guest Summary Retrieval Endpoints
**Duration**: 0.5 days

**Tasks:**
- [ ] Create `GET /api/guest/summary/:sessionId` endpoint
- [ ] Validate session ID
- [ ] Return guest summary if exists and not expired
- [ ] Return 404 if not found or expired
- [ ] Update summary history endpoint to require authentication

**New Endpoints:**
```typescript
// GET /api/guest/summary/:sessionId
router.get('/guest/summary/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const summary = await getGuestSummary(sessionId);
  
  if (!summary || isExpired(summary)) {
    return res.status(404).json({
      error: {
        code: 'GUEST_SUMMARY_NOT_FOUND',
        message: 'Guest summary not found or session expired.',
      },
    });
  }
  
  res.json({ summary: summary.summaryData });
});
```

**Files to Create/Modify:**
- `backend/src/routes/summarize.routes.ts` (add guest routes)
- `backend/src/controllers/summary.controller.ts` (add guest retrieval handler)

**Acceptance Criteria:**
- Guest summary retrieval works
- Expired summaries return 404
- Invalid session IDs return 404
- History endpoint requires authentication

---

#### Task 2.1.6: Guest-to-Authenticated Transition
**Duration**: 1 day

**Tasks:**
- [ ] Create migration logic for guest summaries
- [ ] Handle login while guest summary exists
- [ ] Optionally save current guest summary to user account
- [ ] Clear guest session on successful login
- [ ] Update user credit balance (if applicable)

**Migration Logic:**
```typescript
export async function migrateGuestSummary(
  guestSessionId: string,
  userId: string
): Promise<void> {
  const guestSummary = await getGuestSummary(guestSessionId);
  
  if (guestSummary && !isExpired(guestSummary)) {
    // Save to user's account
    await createSummary({
      ...guestSummary.summaryData,
      user_uid: userId,
    });
    
    // Clear guest session
    await clearGuestSession(guestSessionId);
  }
}
```

**Files to Create/Modify:**
- `backend/src/services/guest-migration.service.ts` (new)
- `backend/src/controllers/auth.controller.ts` (add migration on login)

**Acceptance Criteria:**
- Guest summaries can be migrated to user account
- Migration happens automatically on login (or user is prompted)
- Guest session is cleared after migration
- User credit balance is updated correctly

---

#### Task 2.1.7: Abuse Prevention
**Duration**: 0.5 days

**Tasks:**
- [ ] Implement rate limiting for guest requests
- [ ] Track guest sessions per IP address
- [ ] Limit guest sessions per IP (e.g., 5 per hour)
- [ ] Add CAPTCHA for guest summary creation (optional)
- [ ] Monitor for suspicious patterns

**Rate Limiting:**
- Use existing rate limiting middleware
- Apply stricter limits for guest requests
- Track by IP address

**Files to Modify:**
- `backend/src/middleware/rate-limit.middleware.ts` (if exists)
- `backend/src/services/guest-session.service.ts` (add IP tracking)

**Acceptance Criteria:**
- Rate limiting prevents abuse
- IP-based tracking works
- Suspicious patterns are detected
- Legitimate users are not blocked

---

## Phase 3: Guest Access Frontend Implementation

### 3.1 Goals
- Support guest user state in frontend
- Display guest limitations clearly
- Provide seamless login prompts
- Handle guest-to-authenticated transition
- Update UserMenu for guest state

### 3.2 Timeline
**Estimated Duration**: 4-5 days

### 3.3 Tasks Breakdown

#### Task 3.1.1: Guest State Management
**Duration**: 1 day

**Tasks:**
- [ ] Create `frontend/src/hooks/useGuestSession.ts`
- [ ] Generate or retrieve guest session ID
- [ ] Store guest session ID in sessionStorage
- [ ] Track guest summary count
- [ ] Manage guest state transitions

**Guest Session Hook:**
```typescript
export function useGuestSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summaryCount, setSummaryCount] = useState(0);

  useEffect(() => {
    // Get or create guest session ID
    let id = sessionStorage.getItem('guestSessionId');
    if (!id) {
      id = generateGuestSessionId();
      sessionStorage.setItem('guestSessionId', id);
    }
    setSessionId(id);
  }, []);

  return { sessionId, summaryCount, incrementSummaryCount };
}
```

**Files to Create:**
- `frontend/src/hooks/useGuestSession.ts`
- `frontend/src/utils/guest-session.utils.ts` (helper functions)

**Acceptance Criteria:**
- Guest session ID is generated and stored
- Session persists across page refreshes (sessionStorage)
- Summary count is tracked correctly
- State updates when user logs in

---

#### Task 3.1.2: Authentication Context Updates
**Duration**: 1 day

**Tasks:**
- [ ] Update authentication context to support guest state
- [ ] Add `isGuest` flag to auth state
- [ ] Handle guest-to-authenticated transition
- [ ] Preserve guest summary during login

**Auth Context Updates:**
```typescript
interface AuthState {
  user: User | null;
  isGuest: boolean;
  guestSessionId: string | null;
  isLoading: boolean;
}

// On login, check for guest summary and migrate
const handleLogin = async (user: User) => {
  const guestSessionId = sessionStorage.getItem('guestSessionId');
  if (guestSessionId) {
    // Migrate guest summary (optional)
    await migrateGuestSummary(guestSessionId, user.id);
  }
  setAuthState({ user, isGuest: false, guestSessionId: null });
};
```

**Files to Modify:**
- `frontend/src/contexts/AuthContext.tsx` (or equivalent)
- `frontend/src/hooks/useAuth.ts` (if exists)

**Acceptance Criteria:**
- Auth context supports guest state
- Guest-to-authenticated transition works
- Guest summary is preserved (if migration enabled)
- State updates correctly on login/logout

---

#### Task 3.1.3: API Client Updates
**Duration**: 0.5 days

**Tasks:**
- [ ] Update API client to send guest session ID in headers
- [ ] Handle guest-specific API responses
- [ ] Add guest summary retrieval functions
- [ ] Update error handling for guest limits

**API Client Updates:**
```typescript
// Add guest session ID to requests
const apiClient = axios.create({
  headers: {
    'X-Guest-Session-Id': getGuestSessionId(),
  },
});

// Guest summary retrieval
export async function getGuestSummary(sessionId: string) {
  return apiClient.get(`/api/guest/summary/${sessionId}`);
}
```

**Files to Modify:**
- `frontend/src/services/api.ts` (or equivalent)
- `frontend/src/services/summary.service.ts` (add guest methods)

**Acceptance Criteria:**
- Guest session ID is sent with requests
- Guest-specific endpoints work
- Error handling for guest limits works
- API client handles both authenticated and guest states

---

#### Task 3.1.4: UserMenu Component Updates
**Duration**: 1 day

**Tasks:**
- [ ] Update `UserMenu` component to show guest state
- [ ] Display "Guest User" header when guest
- [ ] Show Login/Signup options for guests
- [ ] Hide authenticated-only features for guests
- [ ] Add guest limitation message

**Guest UserMenu:**
```typescript
{isGuest ? (
  <>
    <div className="px-4 py-2 border-b">
      <p className="text-sm font-medium">Guest User</p>
    </div>
    <MenuItem onClick={handleLogin}>Login</MenuItem>
    <MenuItem onClick={handleSignUp}>Sign Up</MenuItem>
    <div className="px-4 py-2 border-t text-xs text-muted-foreground">
      Login to save your summaries and unlock more features
    </div>
  </>
) : (
  // Authenticated menu
)}
```

**Files to Modify:**
- `frontend/src/components/UserMenu.tsx` (or equivalent)
- `frontend/src/components/ui/Menu.tsx` (if needed)

**Acceptance Criteria:**
- Guest state shows correct menu
- Login/Signup options are prominent
- Authenticated features are hidden for guests
- Guest limitation message is clear

---

#### Task 3.1.5: Guest Warning Banner Component
**Duration**: 1 day

**Tasks:**
- [ ] Create `frontend/src/components/GuestWarningBanner.tsx`
- [ ] Display after first summary completion
- [ ] Show when attempting second summary
- [ ] Include login CTA
- [ ] Make it dismissible but persistent

**Guest Warning Banner:**
```typescript
interface GuestWarningBannerProps {
  summaryCount: number;
  onLogin: () => void;
  onSignUp: () => void;
}

export function GuestWarningBanner({
  summaryCount,
  onLogin,
  onSignUp,
}: GuestWarningBannerProps) {
  if (summaryCount === 0) return null;

  return (
    <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
      <p className="text-sm">
        ⚠️ You're viewing as a guest. This summary will not be saved.{' '}
        <button onClick={onLogin} className="underline font-semibold">
          Login
        </button>{' '}
        to save your summaries and unlock 2 more free summaries.
      </p>
    </div>
  );
}
```

**Files to Create:**
- `frontend/src/components/GuestWarningBanner.tsx`

**Acceptance Criteria:**
- Banner appears at appropriate times
- Message is clear and actionable
- Login CTA works correctly
- Banner is visually prominent but not intrusive

---

#### Task 3.1.6: Summary Creation Flow Updates
**Duration**: 1 day

**Tasks:**
- [ ] Update summary creation to work for guests
- [ ] Check guest limit before creating summary
- [ ] Show appropriate error messages
- [ ] Display guest warning banner
- [ ] Handle guest summary storage

**Summary Creation Logic:**
```typescript
const handleCreateSummary = async () => {
  if (isGuest && summaryCount >= 1) {
    // Show limit reached message
    setError('You've reached your guest limit. Please login to create more summaries.');
    return;
  }

  // Create summary
  const response = await createSummaryJob(data, guestSessionId);
  
  if (isGuest) {
    incrementGuestSummaryCount();
  }
};
```

**Files to Modify:**
- `frontend/src/components/SummaryCreationForm.tsx` (or equivalent)
- `frontend/src/hooks/useSummaryCreation.ts` (if exists)

**Acceptance Criteria:**
- Guest users can create summaries
- Guest limit is enforced with clear messaging
- Guest summaries are stored correctly
- Warning banners appear at appropriate times

---

#### Task 3.1.7: Route Protection Updates
**Duration**: 0.5 days

**Tasks:**
- [ ] Update route guards to allow guest access to main page
- [ ] Protect authenticated-only routes (history, settings)
- [ ] Redirect guests to login with message
- [ ] Allow guest access to summary creation page

**Route Protection:**
```typescript
// Protected route guard
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth();

  if (isGuest) {
    return <Navigate to="/login" state={{ message: 'Please login to access this page.' }} />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
```

**Files to Modify:**
- `frontend/src/components/ProtectedRoute.tsx` (or equivalent)
- `frontend/src/app/history/page.tsx` (add protection)
- `frontend/src/app/settings/page.tsx` (add protection)

**Acceptance Criteria:**
- Guests can access main summary page
- Authenticated-only routes are protected
- Redirect messages are clear
- Guest users are guided to login

---

## Phase 4: Integration & Polish

### 4.1 Goals
- Ensure landing page and guest access work together seamlessly
- Test end-to-end user flows
- Optimize performance
- Add analytics tracking
- Final polish and bug fixes

### 4.2 Timeline
**Estimated Duration**: 2-3 days

### 4.3 Tasks Breakdown

#### Task 4.1.1: Landing Page to Guest Flow
**Duration**: 0.5 days

**Tasks:**
- [ ] Verify "Get Started" button on landing page leads to app
- [ ] Ensure guest users can immediately create summaries
- [ ] Test flow: Landing → Guest Summary → Login → Authenticated
- [ ] Verify no authentication required for initial access

**User Flow:**
1. User visits landing page (`/`)
2. Clicks "Get Started" → Goes to `/app`
3. Can immediately create summary as guest
4. Sees guest warning banner
5. Clicks "Login" → Authenticates
6. Guest summary is migrated (if enabled)
7. User now has full access

**Acceptance Criteria:**
- Flow works end-to-end
- No authentication required for initial access
- Guest state is properly initialized
- Login transition is smooth

---

#### Task 4.1.2: Analytics Integration
**Duration**: 0.5 days

**Tasks:**
- [ ] Add analytics tracking for guest events
- [ ] Track landing page conversions
- [ ] Track guest-to-authenticated conversions
- [ ] Monitor guest summary creation rate

**Events to Track:**
- `guest_session_started`
- `guest_summary_created`
- `guest_limit_reached`
- `guest_login_prompt_shown`
- `guest_to_authenticated_conversion`
- `landing_page_cta_clicked`

**Files to Modify:**
- `frontend/src/utils/analytics.ts` (or equivalent)
- Add tracking calls to relevant components

**Acceptance Criteria:**
- All key events are tracked
- Analytics data is accurate
- Conversion funnels are measurable

---

#### Task 4.1.3: Performance Optimization
**Duration**: 0.5 days

**Tasks:**
- [ ] Optimize guest session storage
- [ ] Minimize API calls for guest users
- [ ] Lazy load guest-specific components
- [ ] Verify Core Web Vitals

**Optimizations:**
- Use sessionStorage efficiently
- Cache guest session ID
- Minimize re-renders
- Code split guest components

**Acceptance Criteria:**
- Page load times are acceptable
- Guest experience is fast
- No performance regressions

---

#### Task 4.1.4: Error Handling & Edge Cases
**Duration**: 1 day

**Tasks:**
- [ ] Handle expired guest sessions gracefully
- [ ] Handle network errors during guest summary creation
- [ ] Handle multiple tabs (shared session)
- [ ] Handle browser refresh (preserve guest state)
- [ ] Handle login during summary processing

**Edge Cases:**
- Guest session expires while viewing summary
- Network error during summary creation
- User opens multiple tabs
- User refreshes page
- User logs in while summary is processing

**Files to Modify:**
- Error handling in summary creation
- Guest session management
- Auth transition logic

**Acceptance Criteria:**
- All edge cases are handled gracefully
- Error messages are clear
- User experience is smooth
- No data loss

---

#### Task 4.1.5: Testing & QA
**Duration**: 1 day

**Tasks:**
- [ ] Test guest access flow end-to-end
- [ ] Test landing page on all devices
- [ ] Test guest-to-authenticated transition
- [ ] Test guest limit enforcement
- [ ] Test abuse prevention
- [ ] Cross-browser testing
- [ ] Accessibility testing

**Test Scenarios:**
1. New user visits landing page → creates guest summary → logs in
2. Guest user tries to create second summary → blocked → logs in
3. Guest user refreshes page → session persists
4. Guest session expires → appropriate message shown
5. Multiple tabs → shared session works correctly

**Acceptance Criteria:**
- All test scenarios pass
- No critical bugs
- Accessibility requirements met
- Cross-browser compatibility verified

---

## Technical Considerations

### Backend Architecture

**Guest Session Storage:**
- **Development**: In-memory Map (simple, lost on restart)
- **Production**: Redis with TTL (recommended) or Firestore with expiration

**Guest Summary Storage:**
- **Backend**: Temporary storage (Redis/Firestore with TTL)
- **Frontend**: sessionStorage (temporary, cleared on tab close)

**Session Expiration:**
- Default: 24 hours
- Configurable via environment variable
- Automatic cleanup job

### Frontend Architecture

**State Management:**
- Guest state in authentication context
- Guest session ID in sessionStorage
- Summary count tracked in state

**Component Structure:**
- Reusable guest warning components
- Conditional rendering based on guest state
- Seamless transition to authenticated state

### Security Considerations

**Abuse Prevention:**
- Rate limiting per IP address
- Guest session limits per IP
- CAPTCHA (optional, for high-risk scenarios)
- Monitoring and alerting

**Data Privacy:**
- Guest summaries expire automatically
- No personal information collected for guests
- Clear privacy policy communication

---

## Dependencies & Prerequisites

### Backend Dependencies
- Existing authentication system
- Summary service
- Credit system (for authenticated users)
- Rate limiting middleware
- Redis (optional, for production guest storage)

### Frontend Dependencies
- Design system (`visual-effects.ts`)
- Theme system (`next-themes`)
- Authentication context
- API client
- Framer Motion (for animations)

### External Services
- Redis (optional, for guest session storage)
- Analytics service (optional)

---

## Success Metrics

### Guest Access Metrics
- **Guest Summary Creation Rate**: % of visitors who create guest summaries
- **Guest-to-Authenticated Conversion Rate**: Target 30-40%
- **Guest Limit Reached Rate**: % of guests who hit the 1 summary limit
- **Abuse Rate**: < 1% of guest requests

### Landing Page Metrics
- **CTA Click Rate**: Target 5-10% of visitors
- **Scroll Depth**: Target 60%+ scroll to features
- **Bounce Rate**: Target < 50%
- **Time on Page**: Target > 30 seconds

### Combined Metrics
- **Landing → Guest → Authenticated Funnel**: Track conversion at each step
- **Time to First Summary**: Target < 2 minutes
- **User Satisfaction**: Measure through feedback

---

## Risks & Mitigations

### Product Risks

**Risk**: Users never convert from guest to authenticated
- **Mitigation**: Clear value proposition, strategic login prompts, A/B test messaging

**Risk**: Abuse of guest access (creating multiple sessions)
- **Mitigation**: Rate limiting, IP tracking, session validation, CAPTCHA if needed

**Risk**: User confusion about guest limitations
- **Mitigation**: Clear messaging, prominent warnings, helpful tooltips

### Technical Risks

**Risk**: Performance impact from guest session management
- **Mitigation**: Efficient storage, cleanup jobs, monitoring

**Risk**: State management complexity
- **Mitigation**: Clear state management patterns, thorough testing, documentation

**Risk**: Guest summary migration failures
- **Mitigation**: Graceful fallback, user warnings, retry logic

### Business Risks

**Risk**: Reduced conversion to paid tiers
- **Mitigation**: Emphasize value of saving and history, show premium benefits

**Risk**: Increased server costs from guest usage
- **Mitigation**: Rate limiting, resource monitoring, cost tracking

---

## Open Questions

Before finalizing implementation, please clarify:

1. **Guest Summary Migration**: Should guest summaries be automatically saved when user logs in, or should user be prompted? [Recommendation: Auto-save if within session, prompt if expired]

2. **Session Duration**: What should be the guest session expiration time? [Recommendation: 24 hours]

3. **Storage Backend**: Should guest summaries be stored in-memory (Redis) or in database with expiration? [Recommendation: Redis for production, in-memory for development]

4. **Credit System**: Should guests use the credit system (with temporary credits) or simple counter? [Recommendation: Simple counter, no credit system for guests]

5. **Multiple Devices**: Should guest sessions work across devices? [Recommendation: No, session-based only]

6. **Guest History**: Should guests see any history UI (even if empty) or completely hide it? [Recommendation: Hide completely, redirect to login]

7. **Login Prompt Timing**: When is the best time to show login prompts? [Recommendation: After first summary completion, before limit reached]

---

## Appendix

### A. File Structure

```
backend/
  src/
    services/
      guest-session.service.ts      # NEW
      guest-summary.service.ts       # NEW
      guest-migration.service.ts     # NEW
    middleware/
      optional-auth.middleware.ts   # NEW
    controllers/
      summary.controller.ts         # MODIFY
      auth.controller.ts            # MODIFY (add migration)
    routes/
      summarize.routes.ts           # MODIFY (add guest routes)
    types/
      guest.types.ts                # NEW

frontend/
  src/
    app/
      page.tsx                      # MODIFY (landing page)
      layout.tsx                    # MODIFY (if needed)
    components/
      landing/
        Header.tsx                  # NEW
        Hero.tsx                    # NEW
        Features.tsx                # NEW
        Footer.tsx                  # NEW
      GuestWarningBanner.tsx        # NEW
      UserMenu.tsx                  # MODIFY
    hooks/
      useGuestSession.ts            # NEW
    services/
      api.ts                        # MODIFY
      summary.service.ts            # MODIFY
    contexts/
      AuthContext.tsx               # MODIFY
    utils/
      guest-session.utils.ts        # NEW
```

### B. API Endpoints

**New Endpoints:**
- `GET /api/guest/summary/:sessionId` - Get guest summary
- `POST /api/guest/session` - Create guest session (optional, can be implicit)

**Modified Endpoints:**
- `POST /api/summarize` - Now accepts guest requests (with `X-Guest-Session-Id` header)
- `GET /api/summaries/history` - Requires authentication (no guest access)

### C. Environment Variables

**Backend:**
- `GUEST_SESSION_EXPIRY_HOURS` (default: 24)
- `GUEST_RATE_LIMIT_PER_IP` (default: 5 per hour)
- `USE_REDIS_FOR_GUESTS` (default: false, use in-memory)

**Frontend:**
- No new environment variables needed

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Planning - Ready for Review  
**Next Steps:** Review requirements, clarify open questions, begin Phase 1 implementation

