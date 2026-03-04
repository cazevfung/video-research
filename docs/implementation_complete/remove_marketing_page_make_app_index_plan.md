# Remove Marketing Page and Make App the Index Page - Implementation Plan

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | 2025-01-26 |
| **Goal** | Remove marketing landing page and make the app itself the index page (accessible to both authenticated and guest users) |

---

## 1. Executive Summary

Currently, the application has a marketing landing page at the root route (`/`) and the actual application at `/app`. This plan outlines the steps to remove the marketing page and make the application dashboard accessible directly at the root route (`/`), while maintaining guest user access.

**Key Changes:**
- Move app dashboard from `/app` to `/` (root)
- Remove/archive marketing landing page components
- Update all route references throughout the codebase
- Maintain guest user access at root level
- Update navigation and links

---

## 2. Current State Analysis

### 2.1 Current Route Structure

**Current Routes:**
- `/` → Marketing landing page (`frontend/src/app/page.tsx`)
- `/app` → Main dashboard (`frontend/src/app/app/page.tsx`)
- `/app/layout.tsx` → App layout with header, AuthGuard, etc.
- `/app/history` → History page
- `/app/settings` → Settings page
- `/app/account` → Account page
- `/login` → Login page
- `/signup` → Signup page

### 2.2 Current Architecture

1. **Root Layout** (`frontend/src/app/layout.tsx`)
   - Wraps all routes
   - Provides theme and providers
   - No authentication guard

2. **App Layout** (`frontend/src/app/app/layout.tsx`)
   - Wraps `/app/*` routes
   - Includes AuthGuard (supports guest users)
   - Header with navigation
   - Toast provider, error boundary

3. **Marketing Landing Page** (`frontend/src/app/page.tsx`)
   - Renders landing page components
   - No authentication required
   - Links to `/app` for "Get Started"

4. **Routes Configuration** (`frontend/src/config/routes.ts`)
   - Centralized route definitions
   - `home: '/'` → Marketing page
   - `app: '/app'` → Dashboard

### 2.3 Key Components & Dependencies

**Landing Page Components:**
- `frontend/src/components/landing/Header.tsx`
- `frontend/src/components/landing/Hero.tsx`
- `frontend/src/components/landing/Features.tsx`
- `frontend/src/components/landing/Footer.tsx`
- `frontend/src/components/landing/LandingPageTracker.tsx`

**App Components:**
- Dashboard page uses `AuthGuard` (supports guests)
- Navigation in app layout references `routes.app`
- Logo link points to `routes.app`
- History link points to `${routes.app}/history`

---

## 3. Proposed Changes

### 3.1 New Route Structure

**Target Routes:**
- `/` → Main dashboard (previously `/app`)
- `/history` → History page (previously `/app/history`)
- `/settings` → Settings page (previously `/app/settings`)
- `/account` → Account page (previously `/app/account`)
- `/login` → Login page (unchanged)
- `/signup` → Signup page (unchanged)

### 3.2 Architectural Changes

1. **Move app layout to root level**
   - Convert `/app/layout.tsx` to root-level layout wrapper
   - Keep AuthGuard and all app features
   - Ensure guest users can access root

2. **Update route configuration**
   - Change `home` route to point to dashboard (already `/`)
   - Change `app` route references (or deprecate if not needed)
   - Update all nested routes

3. **Remove marketing page**
   - Archive landing page components (optional)
   - Remove landing page route

---

## 4. Detailed Implementation Steps

### Phase 1: Route Configuration Updates

#### Task 1.1: Update Routes Configuration
**File:** `frontend/src/config/routes.ts`

**Changes:**
- Update route definitions to reflect new structure
- `home` remains `'/'` (now points to dashboard)
- `app` route can be deprecated or kept for backward compatibility
- Update nested routes (`history`, `settings`, `account`) to remove `/app` prefix

**Before:**
```typescript
export const routes = {
  home: '/',
  app: '/app',
  account: '/app/account',
  history: '/history',
  settings: '/app/settings',
};
```

**After:**
```typescript
export const routes = {
  home: '/',
  app: '/',  // Deprecated, use 'home' instead
  account: '/account',
  accountCredits: '/account/credits',
  history: '/history',
  settings: '/settings',
};
```

---

### Phase 2: File Structure Reorganization

#### Task 2.1: Move Dashboard Page to Root
**Actions:**
1. Copy `frontend/src/app/app/page.tsx` → `frontend/src/app/page.tsx` (replace marketing page)
2. Verify all imports work correctly
3. Test that dashboard renders properly

#### Task 2.2: Move App Layout to Root Level
**Challenge:** Next.js App Router structure
- Root layout (`frontend/src/app/layout.tsx`) must remain at root for theme/providers
- App layout needs to wrap only specific routes

**Solution Options:**

**Option A: Conditional Layout (Recommended)**
- Keep root layout minimal (theme/providers only)
- Create a new layout wrapper that applies to routes that need app features
- Use route groups or conditional rendering

**Option B: Merge Layouts**
- Merge app layout features into root layout
- Use pathname detection to conditionally show header/nav
- Simpler but less flexible

**Recommended: Option B (Merge Layouts)**
- Simpler for this use case
- All routes now use app layout anyway
- Root layout can include app layout features

**Implementation:**
1. Merge `app/layout.tsx` features into root `layout.tsx`
2. Use conditional rendering based on pathname for login/signup pages
3. Or create a wrapper component that handles this logic

**Alternative Approach: Route Groups**
- Use Next.js route groups: `(app)/page.tsx`, `(app)/history/page.tsx`
- Keep app layout separate but apply to route group
- More complex but cleaner separation

**Decision: Merge into root layout with conditional rendering**
- Login/signup pages don't need header/nav
- All other pages need app layout
- Conditional rendering based on pathname

#### Task 2.3: Move Sub-routes
**Files to move:**
- `frontend/src/app/app/history/page.tsx` → `frontend/src/app/history/page.tsx`
- `frontend/src/app/app/settings/page.tsx` → `frontend/src/app/settings/page.tsx`
- `frontend/src/app/app/account/page.tsx` → `frontend/src/app/account/page.tsx`
- `frontend/src/app/app/account/credits/page.tsx` → `frontend/src/app/account/credits/page.tsx`

**Actions:**
1. Create new directories at root level
2. Move files
3. Update imports if needed
4. Delete old `/app/app/` directory structure

#### Task 2.4: Archive Marketing Page Components (Optional)
**Decision:** Archive, don't delete (in case needed later)

**Actions:**
1. Create archive directory: `frontend/src/components/landing/_archive/`
2. Move landing components to archive
3. Or simply leave them (they won't be used but won't hurt)

---

### Phase 3: Code Updates

#### Task 3.1: Update Root Layout
**File:** `frontend/src/app/layout.tsx`

**Changes:**
- Merge app layout features (header, navigation, AuthGuard, etc.)
- Add conditional rendering for login/signup pages
- Keep providers and theme logic

**Implementation:**
- Import app layout components
- Use pathname to conditionally render header/nav
- Wrap children with AuthGuard (except login/signup)

#### Task 3.2: Update Navigation Links
**Files to update:**
- `frontend/src/app/layout.tsx` (logo link)
- `frontend/src/components/ui/UserMenu.tsx` (account, settings links)
- `frontend/src/components/ui/Breadcrumbs.tsx` (if uses routes.app)
- Any other components referencing `/app`

**Changes:**
- Update `routes.app` references to `routes.home` or `/`
- Update nested route references (remove `/app` prefix)
- Update logo href to point to `/`

#### Task 3.3: Update Route References in Components
**Files to check:**
- Login/Signup forms (redirect after login)
- Navigation components
- Breadcrumbs
- Any hardcoded `/app` paths

**Search for:**
- `routes.app`
- `/app`
- `href="/app`
- `router.push('/app`

#### Task 3.4: Update AuthGuard and Authentication Logic
**File:** `frontend/src/components/auth/AuthGuard.tsx`

**Verification:**
- Ensure AuthGuard works at root level
- Guest users can access root route
- Login/signup pages bypass AuthGuard
- Redirect logic still works correctly

**Changes needed:**
- Verify guest session creation works at root
- Ensure login redirects go to `/` instead of `/app`

#### Task 3.5: Update Login/Signup Redirects
**Files:**
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/components/auth/LoginForm.tsx`
- `frontend/src/components/auth/SignupForm.tsx`

**Changes:**
- Update redirect logic to go to `/` instead of `/app`
- Update route parameter handling

---

### Phase 4: Cleanup and Testing

#### Task 4.1: Remove Old App Directory
**Actions:**
- Delete `frontend/src/app/app/` directory (after confirming all files moved)
- Verify no broken imports

#### Task 4.2: Update Documentation
**Files to update:**
- README files
- Route documentation
- Any developer guides

#### Task 4.3: Testing Checklist

**Functional Testing:**
- [ ] Root route (`/`) shows dashboard
- [ ] Guest users can access root route
- [ ] Authenticated users can access root route
- [ ] Login page works and redirects to `/`
- [ ] Signup page works and redirects to `/`
- [ ] History page accessible at `/history`
- [ ] Settings page accessible at `/settings`
- [ ] Account page accessible at `/account`
- [ ] Account credits page accessible at `/account/credits`
- [ ] Navigation links work correctly
- [ ] Logo links to home
- [ ] User menu links work
- [ ] Breadcrumbs work (if applicable)
- [ ] Guest session creation works
- [ ] Guest-to-authenticated transition works

**Edge Cases:**
- [ ] Direct URL navigation to all routes
- [ ] Browser back/forward buttons
- [ ] Page refresh on all routes
- [ ] Deep links work correctly

---

## 5. Files to Modify

### 5.1 Files to Move/Create

1. **Move:**
   - `frontend/src/app/app/page.tsx` → `frontend/src/app/page.tsx`
   - `frontend/src/app/app/history/page.tsx` → `frontend/src/app/history/page.tsx`
   - `frontend/src/app/app/settings/page.tsx` → `frontend/src/app/settings/page.tsx`
   - `frontend/src/app/app/account/page.tsx` → `frontend/src/app/account/page.tsx`
   - `frontend/src/app/app/account/credits/page.tsx` → `frontend/src/app/account/credits/page.tsx`

2. **Create:**
   - New root-level layout (merged from app layout)

3. **Delete:**
   - `frontend/src/app/app/` directory (after migration)

### 5.2 Files to Modify

1. **Route Configuration:**
   - `frontend/src/config/routes.ts`

2. **Layouts:**
   - `frontend/src/app/layout.tsx` (merge app layout features)

3. **Navigation & Links:**
   - `frontend/src/components/ui/UserMenu.tsx`
   - `frontend/src/components/ui/Breadcrumbs.tsx` (if applicable)
   - Any components with hardcoded `/app` references

4. **Authentication:**
   - `frontend/src/app/login/page.tsx`
   - `frontend/src/app/signup/page.tsx`
   - `frontend/src/components/auth/LoginForm.tsx`
   - `frontend/src/components/auth/SignupForm.tsx`

5. **Other Components:**
   - Any component referencing `routes.app` or `/app`

### 5.3 Files to Archive (Optional)

- `frontend/src/components/landing/` directory (optional archive)

---

## 6. Implementation Strategy

### 6.1 Recommended Approach

**Step-by-Step:**
1. **Update route configuration first** (non-breaking, just definitions)
2. **Move files in order:**
   - Move sub-routes first (history, settings, account)
   - Move dashboard page
   - Merge layouts
3. **Update code references:**
   - Update navigation links
   - Update redirect logic
   - Update any hardcoded paths
4. **Test thoroughly**
5. **Clean up old files**

### 6.2 Risk Mitigation

**Potential Issues:**
1. **Breaking changes:** Update all references simultaneously
2. **Guest access:** Verify AuthGuard works at root level
3. **Route conflicts:** Ensure no duplicate routes
4. **Import errors:** Update imports after moving files
5. **Redirect loops:** Test authentication redirects carefully

**Mitigation:**
- Test in development first
- Update route config early (centralized)
- Use search/replace for route references
- Test guest access explicitly
- Verify all navigation paths

---

## 7. Alternative Considerations

### 7.1 Keep Marketing Page but Redirect

**Alternative:** Keep marketing page but redirect to `/app` automatically

**Pros:**
- Less code changes
- Can keep marketing page for SEO

**Cons:**
- Doesn't meet requirement (remove marketing page)
- Extra redirect adds latency
- User still sees marketing page briefly

### 7.2 Route Groups Approach

**Alternative:** Use Next.js route groups `(app)/` to organize routes

**Pros:**
- Cleaner separation
- Can keep app layout separate
- More organized structure

**Cons:**
- More complex
- Requires more restructuring
- Overkill for this change

**Decision:** Not using route groups (simpler merge approach)

---

## 8. Testing Plan

### 8.1 Manual Testing

1. **Route Access:**
   - Visit `/` - should show dashboard
   - Visit `/history` - should show history
   - Visit `/settings` - should show settings
   - Visit `/account` - should show account
   - Visit `/login` - should show login (no header)
   - Visit `/signup` - should show signup (no header)

2. **Guest User Flow:**
   - Clear cookies/localStorage
   - Visit `/` - should show dashboard as guest
   - Create summary as guest
   - Verify guest warning banner appears

3. **Authenticated User Flow:**
   - Login
   - Visit `/` - should show dashboard
   - Navigate to all routes
   - Verify navigation works

4. **Navigation:**
   - Click logo - should go to `/`
   - Click history link - should go to `/history`
   - User menu links work
   - Browser back/forward works

### 8.2 Automated Testing (if applicable)

- Update any route-based tests
- Update navigation tests
- Update authentication tests

---

## 9. Rollback Plan

If issues arise:

1. **Quick Rollback:**
   - Revert route configuration
   - Restore files from git
   - Revert layout changes

2. **Partial Rollback:**
   - Keep route changes but restore old file structure
   - Update routes to point to old locations temporarily

---

## 10. Timeline Estimate

**Estimated Duration:** 2-4 hours

**Breakdown:**
- Route configuration: 15 min
- File moves: 30 min
- Layout merge: 45 min
- Code updates: 60 min
- Testing: 45 min
- Cleanup: 15 min

---

## 11. Success Criteria

✅ Root route (`/`) shows application dashboard  
✅ Guest users can access root route  
✅ Authenticated users can access root route  
✅ All sub-routes work correctly (history, settings, account)  
✅ Navigation links work correctly  
✅ Login/signup redirects work correctly  
✅ No broken imports or references  
✅ Marketing page removed/archived  
✅ All tests pass (if applicable)  

---

## 12. Notes

- **Guest Access:** Critical to verify guest users can access root route. AuthGuard already supports guests, but need to verify it works at root level.
- **SEO Impact:** Removing marketing page may impact SEO. Consider adding metadata to dashboard page if needed.
- **Marketing Components:** Can be archived for potential future use, but not necessary to delete immediately.
- **Backward Compatibility:** Consider if any external links point to `/app` - may want to add redirects or handle gracefully.

---

## Appendix: Route Mapping

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/` | `/` | Changed (dashboard instead of marketing) |
| `/app` | `/` | Redirect or deprecated |
| `/app/history` | `/history` | Changed |
| `/app/settings` | `/settings` | Changed |
| `/app/account` | `/account` | Changed |
| `/app/account/credits` | `/account/credits` | Changed |
| `/login` | `/login` | Unchanged |
| `/signup` | `/signup` | Unchanged |

