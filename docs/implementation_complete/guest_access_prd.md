# Guest Access with Limited Functionality PRD

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | 2024 |
| **Tech Stack** | React (TypeScript), Node.js (TypeScript), Firebase Auth |
| **Dependencies** | Existing authentication system, summary service, credit system, user tier system |

---

## 1. Executive Summary

This PRD outlines the implementation of a guest access feature that allows new users to use the service without requiring authentication upfront. Guest users will be limited to creating **1 summary** and will not have their summaries saved permanently. Once a guest user logs in, they unlock the full free tier benefits (3 summaries) and gain the ability to save and access their summaries across sessions. This feature aims to reduce friction for new users while encouraging account creation for full functionality.

**Key Features:**
- Guest users can create summaries without authentication
- Guest users limited to 1 summary (vs 3 for logged-in free tier users)
- Summaries are not saved for guest users (temporary, session-only)
- Guest users cannot access summaries after leaving the page
- User profile icon behavior differs for guest vs authenticated users
- Seamless transition from guest to authenticated user

---

## 2. Current State Analysis

### 2.1 What Exists

1. **Authentication System**
   - ✅ Firebase Auth integration
   - ✅ JWT token verification middleware (`requireAuth`)
   - ✅ User session management
   - ✅ User profile data retrieval
   - ⚠️ Currently requires authentication for all summary operations

2. **Summary Service**
   - ✅ Summary creation and processing
   - ✅ Summary storage (Firestore/local storage)
   - ✅ Summary retrieval by user ID
   - ✅ Summary history tracking
   - ⚠️ All summaries require user ID for storage

3. **Credit System**
   - ✅ Credit balance tracking per user
   - ✅ Credit deduction on summary creation
   - ✅ Free tier credit allocation (120 credits = 3 summaries)
   - ⚠️ Requires user account for credit tracking

4. **Frontend User Interface**
   - ✅ UserMenu component with profile icon
   - ✅ User profile dropdown menu
   - ✅ Authentication flow (login/signup)
   - ✅ Summary creation UI
   - ⚠️ Assumes authenticated user state

### 2.2 Gaps to Address

1. **Backend**
   - Support for unauthenticated requests
   - Guest user identification and tracking
   - Temporary summary storage (in-memory or session-based)
   - Guest-to-authenticated user transition logic
   - Credit allocation for guest users (1 summary limit)

2. **Frontend**
   - Guest user state management
   - Guest user UI indicators
   - UserMenu behavior for guest users
   - Summary persistence warning for guests
   - Login prompts at appropriate moments

3. **Data Management**
   - Temporary summary storage mechanism
   - Session-based summary tracking
   - Cleanup of temporary summaries
   - Migration path for guest summaries when user logs in

---

## 3. Goals & Objectives

### 3.1 Primary Goals

1. **Lower Barrier to Entry**
   - Allow users to try the service without creating an account
   - Reduce friction in the onboarding process
   - Enable immediate value delivery

2. **Encourage Account Creation**
   - Show clear benefits of logging in (3 summaries vs 1, save history)
   - Provide natural conversion points throughout the user journey
   - Make login feel like an upgrade, not a requirement

3. **Maintain Service Quality**
   - Prevent abuse through guest access
   - Ensure fair resource allocation
   - Maintain performance for all users

4. **Seamless User Experience**
   - Smooth transition from guest to authenticated state
   - Clear communication of limitations
   - No data loss when transitioning

### 3.2 Success Criteria

- ✅ Guest users can create 1 summary without authentication
- ✅ Guest summaries are not saved permanently
- ✅ Guest users cannot access summaries after leaving the page
- ✅ User profile icon shows appropriate options for guest users
- ✅ Clear messaging about guest limitations
- ✅ Smooth transition when guest user logs in
- ✅ No performance degradation for authenticated users
- ✅ Abuse prevention mechanisms in place

---

## 4. User Experience Design

### 4.1 Guest User Journey

#### 4.1.1 First Visit (Unauthenticated)

1. **User arrives at the application**
   - No authentication required to access main page
   - User can immediately start creating summaries
   - Subtle indicator showing "Guest" status (optional)

2. **User creates first summary**
   - Summary creation flow works identically to authenticated users
   - No login prompt during creation (non-intrusive)
   - Summary processes normally

3. **Summary completion**
   - Summary is displayed to the user
   - **Warning banner appears:** "⚠️ You're viewing as a guest. This summary will not be saved. [Login] to save your summaries and unlock 2 more free summaries."
   - User can view, copy, and interact with the summary
   - Summary exists only in current browser session

4. **User attempts second summary**
   - User can initiate summary creation
   - **Before processing starts:** "You've reached your guest limit (1 summary). [Login] to unlock 2 more free summaries and save your work."
   - Summary creation is blocked until user logs in
   - Clear call-to-action to login

#### 4.1.2 User Profile Icon (Guest State)

**Visual Indicator:**
- Profile icon shows generic/default avatar (no user picture)
- Icon may have subtle "guest" indicator (optional: small badge or different styling)

**Dropdown Menu (Guest State):**
- **Header:** "Guest User" (instead of user name/email)
- **Menu Items:**
  - "Login" (primary action, highlighted)
  - "Sign Up" (secondary action)
  - "About" (optional)
  - "Help" (optional)
- **Footer:** "Login to save your summaries and unlock more features"

**Click Behavior:**
- Clicking profile icon opens dropdown with login/signup options
- No account settings, history, or other authenticated-only features

#### 4.1.3 Page Navigation (Guest State)

**Allowed Pages:**
- Main summary creation page
- Login page
- Signup page
- About/Help pages (if applicable)

**Restricted Pages:**
- History page (redirect to login with message)
- Account/Settings page (redirect to login with message)
- Any other authenticated-only pages

**Navigation Behavior:**
- Attempting to access restricted pages shows: "Please [Login] to access this page."

### 4.2 Authenticated User Journey (After Login)

#### 4.2.1 Transition from Guest to Authenticated

1. **User logs in while having a guest summary**
   - User completes login/signup flow
   - **Option A (Recommended):** Current guest summary is preserved in session
   - **Option B:** User is informed that guest summary will be lost (if not already saved)
   - User is redirected to main page

2. **Post-login state**
   - User now has access to 3 free tier summaries (instead of 1)
   - User can access history page (empty initially)
   - User profile icon shows authenticated state
   - All future summaries are saved permanently

3. **Guest summary handling**
   - If guest summary exists in session, it can be:
     - **Option A:** Automatically saved to user's account (if within session)
     - **Option B:** Lost (user warned before login)
     - **Option C:** User prompted to save current summary before login

#### 4.2.2 User Profile Icon (Authenticated State)

**Visual Indicator:**
- Profile icon shows user's avatar or initials
- Standard authenticated user appearance

**Dropdown Menu (Authenticated State):**
- **Header:** User name and email
- **Menu Items:**
  - "Account" (link to account page)
  - "History" (link to history page)
  - "Settings" (link to settings page)
  - "Logout" (sign out action)
- **Credit Display:** Current credit balance (if applicable)

**Click Behavior:**
- Standard authenticated user menu behavior
- All authenticated features accessible

### 4.3 Messaging & Communication

#### 4.3.1 Guest Limitation Messages

**Summary Creation (First Summary):**
- No intrusive message during creation
- After completion: Warning banner about temporary nature

**Summary Creation (After Limit):**
- Clear message: "You've reached your guest limit. Login to unlock 2 more free summaries."
- Prominent login button

**Summary Viewing (Guest):**
- Persistent banner: "⚠️ Guest Mode: This summary will not be saved. [Login] to save and unlock more."
- Banner appears above or below summary content

**Page Navigation (Restricted):**
- Message: "Please [Login] to access your summary history and account settings."

#### 4.3.2 Value Proposition Messages

**Key Messages to Communicate:**
- "Login to save your summaries permanently"
- "Unlock 2 more free summaries (3 total)"
- "Access your summary history anytime"
- "Get personalized recommendations" (if applicable)

**Placement:**
- After first summary completion
- In user profile dropdown (guest state)
- On restricted page access attempts
- Optional: Subtle footer message on main page

---

## 5. Technical Requirements

### 5.1 Backend Requirements

#### 5.1.1 Authentication Middleware Updates

**Current State:**
- `requireAuth` middleware blocks unauthenticated requests
- All summary endpoints require authentication

**Required Changes:**
- Create `optionalAuth` middleware that allows both authenticated and guest requests
- Guest requests have `req.user = null` or `req.guest = true`
- Authenticated requests work as before

**Guest Identification:**
- Use session ID or temporary guest ID for tracking
- Store guest state in session or generate temporary identifier
- Track guest summaries separately from authenticated summaries

#### 5.1.2 Summary Service Updates

**Guest Summary Storage:**
- Store guest summaries in temporary storage (in-memory or session-based)
- Use guest session ID as identifier
- Set expiration time for guest summaries (e.g., 24 hours)
- Do not persist to Firestore/local storage for guests

**Guest Summary Limits:**
- Enforce 1 summary limit for guest users
- Track guest summary count per session
- Return appropriate error when limit exceeded

**Summary Retrieval:**
- Guest summaries only accessible during same session
- No history endpoint for guest users
- Guest summaries not queryable after session ends

#### 5.1.3 Credit System Integration

**Guest User Credits:**
- Guest users have temporary credit allocation (enough for 1 summary)
- Credits are session-based, not persisted
- No credit balance tracking for guests
- Credit deduction works but is not saved

**Alternative Approach:**
- Skip credit system for guests entirely
- Use simple counter (1 summary allowed)
- No credit deduction needed

#### 5.1.4 API Endpoints

**Modified Endpoints:**
```
POST /api/summarize
- Accept both authenticated and guest requests
- Check guest limit (1 summary) vs authenticated limit (3 summaries)
- Store summary appropriately (temporary vs permanent)

GET /api/summaries/history
- Require authentication (no guest access)
- Return 401 if guest attempts access
```

**New Endpoints (Optional):**
```
GET /api/guest/summary/:sessionId
- Retrieve guest summary by session ID
- Only works during active session
- Returns 404 if session expired or invalid
```

#### 5.1.5 Guest-to-Authenticated Transition

**Migration Logic:**
- When guest user logs in, check for active guest summary in session
- Optionally save current guest summary to user's account
- Clear guest session data
- Update user's credit balance (if applicable)
- Return success response with user data

### 5.2 Frontend Requirements

#### 5.2.1 State Management

**Guest State:**
- Track guest status in application state
- Store guest session ID (if applicable)
- Track guest summary count
- Manage temporary summary data

**Authentication State:**
- Detect when user transitions from guest to authenticated
- Update UI accordingly
- Preserve current summary if possible

#### 5.2.2 UserMenu Component Updates

**Guest State Rendering:**
- Show generic/default avatar
- Display "Guest User" in dropdown header
- Show "Login" and "Sign Up" options
- Hide authenticated-only features (Account, History, Settings)
- Display guest limitation message

**Authenticated State Rendering:**
- Standard authenticated user menu
- All authenticated features visible

**State Detection:**
- Check authentication status on component mount
- Update UI when authentication state changes
- Handle transition from guest to authenticated

#### 5.2.3 Summary Creation Flow

**Guest User Flow:**
- Allow summary creation without authentication
- Show guest limitation warnings at appropriate points
- Display login prompts after limit reached
- Handle summary display for guest users

**Summary Display:**
- Show guest warning banner
- Display summary content normally
- Provide login CTA within warning banner
- Handle summary copy/export (works for guests)

#### 5.2.4 Navigation & Routing

**Route Protection:**
- Protect authenticated-only routes
- Redirect guest users to login with message
- Allow guest access to main summary page
- Allow guest access to login/signup pages

**Route Guards:**
- Check authentication status before rendering protected pages
- Show appropriate messages for restricted access
- Provide clear path to authentication

#### 5.2.5 Session Management

**Guest Session:**
- Generate or retrieve guest session ID
- Store in browser (localStorage or sessionStorage)
- Use for tracking guest summaries
- Clear on logout or session expiration

**Summary Persistence:**
- Store guest summary in sessionStorage (temporary)
- Clear on page close (if using sessionStorage)
- Optionally persist in localStorage with expiration
- Remove when user logs in (migrate if applicable)

---

## 6. Data Models & Storage

### 6.1 Guest User Model

**In-Memory/Session Storage:**
```typescript
interface GuestSession {
  sessionId: string; // Unique session identifier
  createdAt: Date; // Session creation timestamp
  expiresAt: Date; // Session expiration (e.g., 24 hours)
  summaryCount: number; // Number of summaries created (max 1)
  summaries: GuestSummary[]; // Temporary summaries
}

interface GuestSummary {
  sessionId: string; // Link to guest session
  jobId: string; // Summary job ID
  summaryData: Summary; // Full summary data
  createdAt: Date; // Creation timestamp
  expiresAt: Date; // Expiration timestamp
}
```

### 6.2 Summary Storage Strategy

**Guest Summaries:**
- **Backend:** In-memory storage (Redis or similar) with expiration
- **Frontend:** sessionStorage or localStorage with expiration
- **Lifetime:** 24 hours or until session ends
- **Cleanup:** Automatic expiration and cleanup jobs

**Authenticated Summaries:**
- **Backend:** Firestore or local storage (existing system)
- **Frontend:** Retrieved from backend API
- **Lifetime:** Permanent (until user deletion)
- **Access:** Available across sessions and devices

### 6.3 Session Management

**Guest Session ID Generation:**
- Generate unique ID on first guest request
- Store in browser (sessionStorage recommended)
- Send with each API request
- Validate on backend

**Session Expiration:**
- Set expiration time (e.g., 24 hours of inactivity)
- Clean up expired sessions and summaries
- Clear frontend storage on expiration
- Show appropriate message if session expired

---

## 7. Security Considerations

### 7.1 Abuse Prevention

**Rate Limiting:**
- Apply rate limiting to guest requests (same as authenticated)
- Limit requests per IP address
- Prevent excessive guest summary creation attempts
- Monitor for suspicious patterns

**Resource Protection:**
- Enforce strict 1 summary limit for guests
- Prevent guest users from bypassing limits
- Validate guest session IDs
- Prevent session ID manipulation

**Bot Detection:**
- Implement CAPTCHA for guest summary creation (optional)
- Monitor for automated requests
- Block suspicious IP addresses
- Track and limit guest sessions per IP

### 7.2 Data Privacy

**Guest Data:**
- Guest summaries contain user-provided content
- No personal information collected for guests
- Clear privacy policy communication
- Automatic data deletion on session expiration

**Session Security:**
- Use secure session ID generation
- Validate session IDs on backend
- Prevent session hijacking
- Clear sensitive data on logout

### 7.3 Authentication Security

**Login Flow:**
- Maintain existing authentication security
- No security degradation for authenticated users
- Secure guest-to-authenticated transition
- Prevent unauthorized access to user accounts

---

## 8. Edge Cases & Error Handling

### 8.1 Guest User Edge Cases

**Multiple Tabs:**
- Guest session shared across tabs (same sessionStorage)
- Summary count tracked per session, not per tab
- Consistent state across tabs

**Session Expiration:**
- Handle expired session gracefully
- Show message: "Your guest session has expired. Please refresh the page."
- Allow user to start new guest session
- Clear expired data

**Network Errors:**
- Handle network failures during summary creation
- Preserve guest state on reconnection
- Show appropriate error messages
- Allow retry for guest users

**Browser Refresh:**
- Preserve guest summary in sessionStorage
- Restore guest state on page reload
- Maintain summary count
- Show summary if available

### 8.2 Transition Edge Cases

**Login During Summary Processing:**
- Handle login while summary is being created
- Preserve summary job ID
- Associate summary with user account when complete
- Show appropriate status messages

**Multiple Guest Sessions:**
- Prevent multiple guest sessions from same user
- Clear previous guest session on login
- Handle concurrent guest and authenticated states
- Prevent state conflicts

**Summary Migration:**
- Handle case where guest summary cannot be migrated
- Provide clear messaging about data loss
- Option to save summary before login
- Graceful fallback if migration fails

### 8.3 Error Messages

**Guest Limit Reached:**
- Clear message: "You've reached your guest limit of 1 summary. Please login to create more summaries."
- Prominent login button
- Link to signup page

**Session Expired:**
- Message: "Your guest session has expired. Your summary is no longer available."
- Option to start new session
- Clear indication of data loss

**Network Errors:**
- Standard error handling
- Retry options for guest users
- Clear error messages
- No technical jargon

---

## 9. User Interface Components

### 9.1 Guest Warning Banner

**Component:** `GuestWarningBanner`

**Props:**
```typescript
interface GuestWarningBannerProps {
  summaryCount: number; // Current guest summary count
  onLogin: () => void; // Login action handler
  onSignUp: () => void; // Signup action handler
}
```

**Display Logic:**
- Show after first summary completion
- Show when attempting to create second summary
- Persistent on summary viewing page
- Dismissible (optional) but reappears on relevant actions

**Styling:**
- Warning color scheme (yellow/amber)
- Prominent but not intrusive
- Clear call-to-action buttons
- Responsive design

### 9.2 Guest UserMenu

**Component:** `UserMenu` (updated)

**Guest State Props:**
- `isGuest: true`
- `sessionId: string | null`
- `summaryCount: number`

**Rendering:**
- Generic avatar icon
- "Guest User" header
- Login/Signup menu items
- Guest limitation message

### 9.3 Login Prompt Modal (Optional)

**Component:** `LoginPromptModal`

**Triggers:**
- Guest limit reached
- Attempting to access restricted page
- User-initiated (from warning banner)

**Content:**
- Value proposition (save summaries, unlock more)
- Login form or link to login page
- Signup option
- Dismissible

---

## 10. Analytics & Tracking

### 10.1 Metrics to Track

**Guest User Metrics:**
- Number of guest users per day/week
- Guest summary creation rate
- Guest-to-authenticated conversion rate
- Average time to conversion
- Guest session duration
- Guest summary completion rate

**Conversion Metrics:**
- Login rate from guest state
- Signup rate from guest state
- Conversion points (when do guests convert?)
- Drop-off points (where do guests leave?)

**Engagement Metrics:**
- Guest user retention
- Guest summary quality/usage
- Feature usage by guest vs authenticated users
- Guest user satisfaction (if measured)

### 10.2 Event Tracking

**Key Events:**
- `guest_session_started`
- `guest_summary_created`
- `guest_limit_reached`
- `guest_login_prompt_shown`
- `guest_to_authenticated_conversion`
- `guest_session_expired`

**Event Properties:**
- Session ID (hashed/anonymized)
- Timestamp
- User actions leading to event
- Conversion source (where did they convert?)

---

## 11. Success Metrics

### 11.1 Primary Goals

**User Acquisition:**
- Increase in new user signups (target: +20-30%)
- Reduction in signup friction (measured by time to first summary)
- Higher engagement from new users

**Conversion Rate:**
- Guest-to-authenticated conversion rate (target: 30-40%)
- Login rate from guest state (target: 25-35%)
- Signup rate from guest state (target: 15-25%)

**User Experience:**
- Time to first summary (target: < 2 minutes)
- Guest user satisfaction (if measured)
- Reduction in support requests about login requirements

### 11.2 Secondary Goals

**Engagement:**
- Guest users who convert show higher engagement
- Guest summaries lead to more authenticated summaries
- Positive feedback on guest access feature

**Technical:**
- No performance degradation
- Low abuse rate (< 1% of guest requests)
- Minimal support burden

---

## 12. Risks & Mitigations

### 12.1 Product Risks

**Risk:** Users never convert from guest to authenticated
- **Mitigation:** Clear value proposition, strategic login prompts, A/B test messaging

**Risk:** Abuse of guest access (creating multiple sessions)
- **Mitigation:** Rate limiting, IP tracking, session validation, CAPTCHA if needed

**Risk:** User confusion about guest limitations
- **Mitigation:** Clear messaging, prominent warnings, helpful tooltips

**Risk:** Data loss when transitioning (if not handled properly)
- **Mitigation:** Careful migration logic, user warnings, option to save before login

### 12.2 Technical Risks

**Risk:** Performance impact from guest session management
- **Mitigation:** Efficient storage, cleanup jobs, monitoring

**Risk:** Session storage limitations
- **Mitigation:** Use appropriate storage (sessionStorage vs localStorage), size limits

**Risk:** State management complexity
- **Mitigation:** Clear state management patterns, thorough testing, documentation

### 12.3 Business Risks

**Risk:** Reduced conversion to paid tiers (if guests are satisfied with 1 summary)
- **Mitigation:** Emphasize value of saving and history, show premium benefits

**Risk:** Increased server costs from guest usage
- **Mitigation:** Rate limiting, resource monitoring, cost tracking

---

## 13. Future Enhancements

### 13.1 Potential Improvements

**Guest Experience:**
- Allow guests to "bookmark" summary (save URL for 24 hours)
- Email summary to guest (requires email, but no full account)
- Social sharing for guest summaries
- Guest summary export options

**Conversion Optimization:**
- Personalized login prompts based on usage
- Progressive disclosure (show more benefits as user engages)
- A/B testing different conversion messages
- Retargeting for guests who don't convert

**Feature Expansion:**
- Guest access to other features (with limitations)
- Guest collaboration features (if applicable)
- Guest summary templates or presets

---

## 14. Open Questions

Before finalizing implementation, please clarify:

1. **Guest Summary Migration:** Should guest summaries be automatically saved when user logs in, or should user be prompted?
2. **Session Duration:** What should be the guest session expiration time? (Recommended: 24 hours)
3. **Storage Backend:** Should guest summaries be stored in-memory (Redis) or in database with expiration?
4. **Credit System:** Should guests use the credit system (with temporary credits) or simple counter?
5. **Multiple Devices:** Should guest sessions work across devices? (Recommended: No, session-based only)
6. **Guest History:** Should guests see any history UI (even if empty) or completely hide it?
7. **Login Prompt Timing:** When is the best time to show login prompts? (After first summary? Before limit reached?)

---

## 15. Appendix

### 15.1 User Flow Diagrams

**Guest User Flow:**
```
User arrives → No auth required → Create summary → View summary → 
[Warning: Not saved] → Try second summary → [Blocked: Login required] → 
Login → Authenticated state → Full access
```

**Guest-to-Authenticated Transition:**
```
Guest with summary → Login → [Migrate summary?] → Authenticated → 
Summary saved → Full access unlocked
```

### 15.2 API Request/Response Examples

**Guest Summary Creation:**
```json
// Request
POST /api/summarize
Headers: {
  "X-Guest-Session-Id": "guest-session-abc123"
}
Body: {
  "urls": [...],
  "preset": "academic",
  ...
}

// Response (Success)
{
  "job_id": "job-xyz789"
}

// Response (Limit Reached)
{
  "error": {
    "code": "GUEST_LIMIT_REACHED",
    "message": "Guest users are limited to 1 summary. Please login to create more summaries."
  }
}
```

**Guest Summary Retrieval:**
```json
// Request
GET /api/guest/summary/guest-session-abc123

// Response (Success)
{
  "summary": { ... },
  "expires_at": "2024-01-16T10:00:00Z"
}

// Response (Not Found/Expired)
{
  "error": {
    "code": "GUEST_SUMMARY_NOT_FOUND",
    "message": "Guest summary not found or session expired."
  }
}
```

### 15.3 Component State Examples

**Guest State:**
```typescript
interface GuestState {
  isGuest: true;
  sessionId: string;
  summaryCount: number;
  currentSummary: Summary | null;
  sessionExpiresAt: Date;
}

interface AuthenticatedState {
  isGuest: false;
  user: User;
  summaries: Summary[];
  credits: CreditBalance;
}
```

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Draft - Ready for Review  
**Next Steps:** Review requirements, clarify open questions, begin implementation planning

