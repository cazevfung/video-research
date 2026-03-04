# Phase 5: User Acceptance Testing Scenarios

This document outlines test scenarios for user acceptance testing (UAT) of the Video Research application.

## Test Environment Setup

- **Frontend URL:** `https://video-research-40c4b.firebaseapp.com`
- **Backend URL:** (Cloud Run URL)
- **Test Accounts:** Create test accounts for each tier (free, starter, pro, premium)

---

## Scenario 1: New User Sign Up and First Login

### Steps:
1. Navigate to the login page
2. Click "Sign in with Google"
3. Select a Google account (or create a new one)
4. Complete OAuth flow
5. Verify redirect to main application page

### Expected Results:
- ✅ User is redirected to login page if not authenticated
- ✅ Google OAuth popup appears
- ✅ After successful authentication, user is redirected to `/app`
- ✅ User sees welcome message or dashboard
- ✅ User's email and name are displayed correctly

### Test Data:
- Use a new Google account that hasn't been used before

---

## Scenario 2: Login Page Usability

### Steps:
1. Navigate to login page
2. Observe page layout and design
3. Test theme toggle (light/dark mode)
4. Test responsive design on mobile device
5. Test keyboard navigation (Tab, Enter, Escape)

### Expected Results:
- ✅ Login page matches design requirements (Animate UI aesthetic)
- ✅ Theme toggle works correctly
- ✅ Page is responsive on mobile (375px, 414px widths)
- ✅ All interactive elements are keyboard accessible
- ✅ Focus indicators are visible
- ✅ Color contrast meets WCAG AA standards

### Test Data:
- Test on multiple devices: Desktop (1920px), Tablet (768px), Mobile (375px)

---

## Scenario 3: Create Video Summary (Free Tier)

### Steps:
1. Log in as a free tier user
2. Navigate to summary creation page
3. Enter 1 YouTube video URL
4. Select preset style (e.g., "Bullet Points")
5. Optionally add custom prompt
6. Select language (English)
7. Click "Create Summary"
8. Wait for processing to complete

### Expected Results:
- ✅ Form validation works (invalid URLs are rejected)
- ✅ Credit balance is displayed
- ✅ Required credits for batch are shown
- ✅ Processing starts successfully
- ✅ Progress updates are shown during processing
- ✅ Summary is generated and displayed
- ✅ Credits are deducted from balance
- ✅ Summary appears in history page

### Test Data:
- **Video URL:** `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- **Preset:** Bullet Points
- **Language:** English

---

## Scenario 4: Insufficient Credits Error

### Steps:
1. Log in as a free tier user with low credits (e.g., 5 credits)
2. Navigate to summary creation page
3. Enter 1 YouTube video URL (requires 20 credits)
4. Click "Create Summary"

### Expected Results:
- ✅ Error message is displayed: "Insufficient credits"
- ✅ Required credits and current balance are shown
- ✅ Link to request tier upgrade is provided
- ✅ User is not charged credits
- ✅ User can navigate to tier upgrade page

### Test Data:
- **User Credits:** 5
- **Required Credits:** 20 (for 1 video)

---

## Scenario 5: Credit Balance Display

### Steps:
1. Log in as any tier user
2. Navigate to dashboard/main page
3. Observe credit balance display
4. Create a summary (deducts credits)
5. Observe credit balance update

### Expected Results:
- ✅ Credit balance is prominently displayed
- ✅ Balance updates in real-time after credit deduction
- ✅ Balance shows correct amount
- ✅ Tier information is displayed
- ✅ Link to request tier upgrade is available

### Test Data:
- Test with different tiers: free, starter, pro, premium

---

## Scenario 6: Request Tier Upgrade

### Steps:
1. Log in as a free tier user
2. Navigate to tier upgrade page (or click upgrade link)
3. View available tiers (starter, pro, premium)
4. Click "Request Tier Upgrade" for desired tier
5. Fill in email contact information
6. Submit request
7. Verify confirmation message

### Expected Results:
- ✅ Available tiers are displayed with credit allocations
- ✅ Tier upgrade request form is accessible
- ✅ Form validation works (email required)
- ✅ Request submission is successful
- ✅ Confirmation message is shown
- ✅ Email link to contact admin is provided (cazevfung@gmail.com)
- ✅ Request status can be checked

### Test Data:
- **Requested Tier:** Starter
- **User Email:** test@example.com

---

## Scenario 7: View Summary History

### Steps:
1. Log in as a user with existing summaries
2. Navigate to history page
3. View list of summaries
4. Click on a summary to view details
5. Test pagination (if multiple pages)
6. Test search/filter (if available)

### Expected Results:
- ✅ All user's summaries are displayed
- ✅ Summaries are sorted by date (newest first)
- ✅ Summary cards show: title, date, video count, preset style
- ✅ Clicking summary opens detail view
- ✅ Summary detail shows: full text, source videos, metadata
- ✅ Only user's own summaries are visible (not other users')
- ✅ Pagination works correctly (if >20 summaries)

### Test Data:
- User should have at least 3-5 summaries created

---

## Scenario 8: Credit Reset (Daily for Free Tier)

### Steps:
1. Log in as a free tier user
2. Use all credits (create summaries until balance is 0)
3. Wait for daily reset (or manually trigger reset job)
4. Verify credits are reset to daily amount (40 credits)

### Expected Results:
- ✅ Credits are reset at midnight UTC (for free tier)
- ✅ Balance returns to daily amount (40 credits)
- ✅ Transaction record is created for reset
- ✅ User can create summaries again after reset

### Test Data:
- **Tier:** Free
- **Reset Time:** Midnight UTC
- **Reset Amount:** 40 credits

---

## Scenario 9: Credit Reset (Monthly for Premium Tiers)

### Steps:
1. Log in as a premium tier user (starter, pro, or premium)
2. Use some credits
3. Wait for monthly reset (or manually trigger reset job)
4. Verify credits are reset to tier allocation

### Expected Results:
- ✅ Credits are reset on first day of month at midnight UTC
- ✅ Balance returns to tier allocation:
  - Starter: 500 credits
  - Pro: 2,000 credits
  - Premium: 5,000 credits
- ✅ Transaction record is created for reset
- ✅ User can create summaries again after reset

### Test Data:
- **Tier:** Starter, Pro, or Premium
- **Reset Time:** First day of month, midnight UTC

---

## Scenario 10: Batch Processing (Multiple Videos)

### Steps:
1. Log in as a user with sufficient credits
2. Navigate to summary creation page
3. Enter 3 YouTube video URLs
4. Select preset style
5. Click "Create Summary"
6. Wait for processing to complete

### Expected Results:
- ✅ All videos are processed
- ✅ Progress updates show status for each video
- ✅ Combined summary is generated
- ✅ Correct credits are deducted (based on video count)
- ✅ Summary includes information from all videos

### Test Data:
- **Video URLs:** 3 different YouTube videos
- **Required Credits:** 40 (for 3 videos)

---

## Scenario 11: Error Handling - Invalid Video URL

### Steps:
1. Log in as any user
2. Navigate to summary creation page
3. Enter an invalid URL (e.g., `https://example.com/video`)
4. Click "Create Summary"

### Expected Results:
- ✅ Error message is displayed: "Invalid YouTube URL"
- ✅ Invalid URLs are highlighted
- ✅ User can correct URLs and retry
- ✅ No credits are deducted
- ✅ No processing is attempted

### Test Data:
- **Invalid URLs:**
  - `https://example.com/video`
  - `not-a-url`
  - `https://youtube.com/invalid`

---

## Scenario 12: Error Handling - Network Failure

### Steps:
1. Log in as any user
2. Navigate to summary creation page
3. Enter valid YouTube video URL
4. Disconnect internet connection
5. Click "Create Summary"

### Expected Results:
- ✅ Error message is displayed: "Network error" or "Failed to fetch"
- ✅ User can retry after reconnecting
- ✅ No credits are deducted for failed attempts
- ✅ Error is logged for debugging

### Test Data:
- Simulate network failure (disable WiFi/ethernet)

---

## Scenario 13: Session Management

### Steps:
1. Log in as any user
2. Use the application for 30+ minutes
3. Verify session remains active
4. Close browser tab
5. Reopen application
6. Verify authentication state

### Expected Results:
- ✅ Session remains active during use
- ✅ After closing tab, user must re-authenticate (or session persists based on Firebase Auth settings)
- ✅ User data (credits, summaries) persists across sessions
- ✅ No data loss occurs

### Test Data:
- Test with different browsers: Chrome, Firefox, Safari, Edge

---

## Scenario 14: Responsive Design - Mobile

### Steps:
1. Open application on mobile device (375px width)
2. Test login page
3. Test summary creation form
4. Test history page
5. Test navigation menu

### Expected Results:
- ✅ All pages are usable on mobile
- ✅ Text is readable (not too small)
- ✅ Touch targets are at least 44px × 44px
- ✅ Forms are easy to fill on mobile
- ✅ Navigation menu works on mobile
- ✅ No horizontal scrolling required

### Test Data:
- **Devices:** iPhone (375px), Android (414px)

---

## Scenario 15: Accessibility - Screen Reader

### Steps:
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate through login page
3. Navigate through summary creation form
4. Navigate through history page

### Expected Results:
- ✅ All interactive elements are announced correctly
- ✅ Form labels are associated with inputs
- ✅ Error messages are announced
- ✅ Navigation is logical and sequential
- ✅ ARIA labels are present where needed

### Test Data:
- Use VoiceOver (Mac) or NVDA (Windows)

---

## Scenario 16: Performance - Large Batch

### Steps:
1. Log in as a premium tier user
2. Navigate to summary creation page
3. Enter 10 YouTube video URLs (maximum)
4. Click "Create Summary"
5. Measure time to completion

### Expected Results:
- ✅ Processing completes within reasonable time (< 5 minutes for 10 videos)
- ✅ Progress updates are shown regularly
- ✅ No timeout errors occur
- ✅ Summary quality is maintained

### Test Data:
- **Video Count:** 10 videos
- **Expected Time:** < 5 minutes

---

## Bug Reporting Template

When reporting bugs during UAT, include:

1. **Scenario:** Which scenario number
2. **Steps to Reproduce:** Detailed steps
3. **Expected Result:** What should happen
4. **Actual Result:** What actually happened
5. **Screenshots:** If applicable
6. **Browser/Device:** Chrome on Windows 10, iPhone 12, etc.
7. **User Tier:** Free, Starter, Pro, or Premium
8. **Timestamp:** When the issue occurred

---

## Success Criteria

Phase 5 UAT is considered successful when:

- ✅ All scenarios pass without critical bugs
- ✅ No data loss occurs
- ✅ Performance is acceptable (< 5s for API calls, < 5min for large batches)
- ✅ Security is maintained (users can't access other users' data)
- ✅ Accessibility requirements are met (WCAG AA)
- ✅ User feedback is positive (> 80% satisfaction)

---

**Last Updated:** 2024  
**Version:** 1.0

