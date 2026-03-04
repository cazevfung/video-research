# Login Page PRD: YouTube Batch Summary Service

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Framework** | **Next.js 14+ (App Router)** |
| **Styling** | Tailwind CSS + Lucide React (Icons) |
| **Animation** | Framer Motion (subtle, minimal animations) |
| **Design Reference** | [Animate UI](https://animate-ui.com/) - Minimalist, clean, focused |
| **Platform** | Desktop Web + Mobile Responsive |

---

## 1. Executive Summary

A minimalist login page that provides a clean, distraction-free authentication experience. The design follows the simplistic aesthetic of [Animate UI](https://animate-ui.com/), emphasizing white space, minimal elements, and clear typography. The page serves as a seamless entry point to the application, maintaining visual consistency with the marketing landing page while focusing on a single, clear task: user authentication.

**Key Principles:**
- **Minimalism First:** Only essential elements—logo, form, and minimal navigation
- **Clear Purpose:** Immediately obvious what the user needs to do
- **Single Focus:** The login form is the hero of the page
- **Fast Loading:** Optimize for instant visual feedback and quick authentication
- **Mobile-First:** Responsive design that works beautifully on all devices
- **Consistent Design:** Matches marketing landing page aesthetic and visual config

---

## 2. Design Philosophy & Inspiration

### 2.1 Design Reference: Animate UI

The login page should emulate the clean, minimal aesthetic of [Animate UI](https://animate-ui.com/):

**Key Design Elements to Adopt:**
- **Centered Layout:** Login form centered with generous margins
- **Minimal Header:** Simple logo/brand name, theme toggle (no social links on login)
- **Large Typography:** Welcome heading uses large, clean text
- **White Space:** Generous padding and margins around form
- **Simple Color Palette:** Monochrome slate scheme matching `visual-effects.ts`
- **Clean Form Design:** Minimal inputs with subtle borders and clear focus states
- **Subtle Animations:** Fade-in effects, smooth transitions

**What NOT to Include:**
- Complex navigation menus
- Multiple CTAs competing for attention
- Dense content blocks
- Heavy animations or distractions
- Unnecessary decorative elements
- Pop-ups or modals beyond error messages

### 2.2 Color & Theme

The login page uses the color scheme defined in `frontend/src/config/visual-effects.ts`:

**Dark Mode (Primary - matches visual-effects.ts):**
- **Background:** `bg-slate-950` (primary background)
- **Card/Form Background:** `bg-slate-900` (secondary background)
- **Text:** `text-slate-200` (primary), `text-slate-300` (secondary), `text-slate-400` (tertiary)
- **Borders:** `border-slate-700` (default), `border-slate-400` (focus)
- **CTA Button:** Gradient or `bg-slate-600` to `bg-slate-400` with white text

**Light Mode (Optional - for landing page consistency):**
- **Background:** `bg-white`
- **Card/Form Background:** `bg-white` or subtle `bg-slate-50`
- **Text:** `text-slate-900` (primary), `text-slate-600` (secondary), `text-slate-500` (tertiary)
- **Borders:** `border-slate-200` (default), `border-slate-400` (focus)
- **CTA Button:** `bg-slate-900` with white text

**Theme Toggle:**
- Simple switch/button in header (top right)
- Smooth transition between themes
- Respects system preference on first load
- Uses `next-themes` for management

### 2.3 Typography

**Font Stack:**
- **Primary:** Inter (matches Animate UI: `var(--font-inter)`)
- **Monospace:** JetBrains Mono (for code: `var(--font-jetbrains-mono)`)
- **Fallback:** System font stack (`system-ui, sans-serif`)

**Type Scale (extends `typography.fontSize` from visual-effects.ts):**
- **Welcome Heading:** `text-3xl md:text-4xl lg:text-5xl` (extends beyond config max of `typography.fontSize["3xl"]` = "text-3xl")
- **Subheading:** `typography.fontSize.lg` or `typography.fontSize.xl` → `text-lg md:text-xl` (18px - 20px)
- **Body Text:** `typography.fontSize.sm` or `typography.fontSize.base` → `text-sm md:text-base` (14px - 16px)
- **Label Text:** `typography.fontSize.sm` → `text-sm` (14px)
- **Helper Text:** `typography.fontSize.xs` → `text-xs` (12px)

**Font Weights (from `typography.fontWeight` in visual-effects.ts):**
- **Heading:** `typography.fontWeight.bold` (700) or `typography.fontWeight.semibold` (600)
- **Labels:** `typography.fontWeight.medium` (500)
- **Body:** `typography.fontWeight.normal` (400)

---

## 3. Page Structure & Layout

### 3.1 Overall Layout

**Structure:**
```
┌─────────────────────────────────────┐
│ Header (Fixed, minimal)            │
│ - Logo/Brand                        │
│ - Theme Toggle                      │
├─────────────────────────────────────┤
│                                     │
│   Login Form (Centered)            │
│   - Welcome Heading                 │
│   - Subheading                      │
│   - Email Input                     │
│   - Password Input                  │
│   - Submit Button                   │
│   - Helper Links                    │
│   - Error/Success Messages          │
│                                     │
├─────────────────────────────────────┤
│   Footer (Minimal, optional)       │
│   - Back to Home link               │
│                                     │
└─────────────────────────────────────┘
```

**Layout Constraints:**
- **Max Width:** `max-w-md` (448px) for login form
- **Centering:** `mx-auto` with padding `px-4 md:px-6 lg:px-8`
- **Vertical Spacing:** Centered vertically with `min-h-screen flex items-center justify-center`
- **Form Card:** Optional subtle card background with padding `p-8 md:p-10`

---

## 4. Component Specifications

### 4.1 Header Component

**Location:** Fixed at top of page (or static if preferred)

**Elements:**
1. **Logo/Brand Name:** "Video Research" or product name (left side)
   - Font: `text-xl font-bold`
   - Link to home (`/`)
   - No icon, just text
   - Color: `text-slate-200 dark:text-slate-900` (adapts to theme)

2. **Theme Toggle** (right side):
   - Simple toggle switch or icon button
   - Sun/Moon icons from Lucide React
   - Smooth transition
   - Uses `next-themes` package

**Styling:**
- Background: Transparent or subtle backdrop blur `bg-slate-950/80 dark:bg-white/80 backdrop-blur-sm`
- Height: `h-16` (64px)
- Padding: `px-4 md:px-6 lg:px-8`
- Border bottom (optional): `border-b border-slate-700 dark:border-slate-200`

**Responsive:**
- Logo always visible
- Theme toggle always visible
- Minimal header on mobile

---

### 4.2 Login Form Section

**Layout:** Centered, vertically centered in viewport

#### 4.2.1 Form Container

**Styling:**
- Background: `bg-slate-900 dark:bg-white` (card background, matches `colors.background.secondary`)
- Border (optional): `border border-slate-700` (matches `colors.border.default` from visual-effects.ts)
- Border radius: `rounded-xl` (matches `borderRadius.lg` from visual-effects.ts)
- Padding: `p-6` on desktop, `p-4 md:p-6` on mobile (matches `spacing.container.cardPadding` and `cardPaddingMobile`)
- Max width: `max-w-md` (448px)
- Width: `w-full`
- Shadow: `shadow-lg` (matches `shadows.card` from visual-effects.ts)

**Animation:**
- Fade in on load: `opacity: 0 → 1` (500ms, delay: 100ms)
- Slight upward motion: `y: 20 → 0` (500ms, matches `motionVariants.fadeInUp` from visual-effects.ts)

#### 4.2.2 Welcome Heading

**Text:** "Welcome back" or "Sign in"

**Styling:**
- Font size: `text-3xl md:text-4xl lg:text-5xl`
- Font weight: `font-bold` or `font-semibold`
- Line height: `leading-tight`
- Color: `text-slate-200 dark:text-slate-900`
- Centered: `text-center`
- Margin bottom: `mb-2`

**Animation:**
- Fade in: `opacity: 0 → 1` (400ms, delay: 200ms)

#### 4.2.3 Subheading

**Text:** "Sign in to continue to Video Research" or brief description

**Styling:**
- Font size: `text-base md:text-lg`
- Font weight: `font-normal`
- Color: `text-slate-400 dark:text-slate-600`
- Centered: `text-center`
- Margin bottom: `mb-8 md:mb-10`

**Animation:**
- Fade in: `opacity: 0 → 1` (400ms, delay: 300ms)

#### 4.2.4 Email Input Field

**Label:**
- Text: "Email" or "Email address"
- Font: `text-sm font-medium`
- Color: `text-slate-300 dark:text-slate-700`
- Margin bottom: `mb-2`

**Input:**
- Type: `email`
- Placeholder: "you@example.com"
- Styling (matches `inputConfig` from visual-effects.ts):
  - Background: `bg-slate-950` (matches `colors.background.primary`)
  - Border: `border border-slate-700` (matches `colors.border.default`)
  - Border radius: `rounded-lg` (matches `borderRadius.md` from visual-effects.ts)
  - Padding: `px-4 py-3` (matches `spacing.padding.md` = "px-4 py-3")
  - Text color: `text-slate-200` (matches `colors.text.primary`)
  - Placeholder color: `placeholder:text-slate-500` (matches `colors.text.muted`)
  - Font: `text-base` (matches `typography.fontSize.base`)
  - Width: `w-full`
  - Focus: `focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400` (matches `shadows.focus.ring` and `colors.border.focus`)
  - Transition: `transition-all duration-200` (matches `inputConfig.transitionDuration` = "duration-200")
  - Focus scale (optional): `focus:scale-[1.01]` (matches `inputConfig.focusScale` = "1.01")

**Animation:**
- Fade in: `opacity: 0 → 1` (400ms, delay: 400ms)

#### 4.2.5 Password Input Field

**Label:**
- Text: "Password"
- Font: `text-sm font-medium`
- Color: `text-slate-300 dark:text-slate-700`
- Margin bottom: `mb-2`
- Margin top: `mt-6`

**Input:**
- Type: `password`
- Placeholder: "••••••••"
- Styling: Same as email input
- Show/Hide toggle (optional):
  - Icon button (eye icon from Lucide React)
  - Position: Absolute right within input container
  - Color: `text-slate-400 dark:text-slate-500`
  - Hover: `hover:text-slate-300 dark:hover:text-slate-700`

**Animation:**
- Fade in: `opacity: 0 → 1` (400ms, delay: 500ms)

#### 4.2.6 Helper Links

**Layout:** Space between row (`flex justify-between items-center`)

**Forgot Password Link:**
- Text: "Forgot password?"
- Font: `text-sm`
- Color: `text-slate-400 dark:text-slate-500`
- Hover: `hover:text-slate-300 dark:hover:text-slate-700`
- Link: `/forgot-password` or `#` (if not implemented)
- Margin top: `mt-2`

**Remember Me (Optional):**
- Checkbox with label
- Font: `text-sm`
- Color: `text-slate-400 dark:text-slate-600`
- Spacing: `gap-2`

**Margin top:** `mt-6`

**Animation:**
- Fade in: `opacity: 0 → 1` (400ms, delay: 600ms)

#### 4.2.7 Submit Button

**Text:** "Sign in"

**Styling (matches `buttonConfig` from visual-effects.ts):**
- Background: `bg-gradient-to-r from-slate-600 to-slate-400` (matches `colors.gradients.button` = "bg-gradient-to-r from-slate-600 to-slate-400")
- Text: `text-white` (matches `colors.text.inverse`)
- Padding: `px-8 py-3` (note: `buttonConfig.sizes.lg.padding` = "px-8", add `py-3` for vertical padding)
- Height: `h-11` (matches `buttonConfig.sizes.lg.height` = "h-11")
- Font: `font-semibold text-base` (matches `typography.fontWeight.semibold` and `typography.fontSize.base`)
- Border radius: `rounded-lg` (matches `borderRadius.md` from visual-effects.ts)
- Width: `w-full`
- Margin top: `mt-8` (matches `spacing.margin.xl` = "mb-8", adapted for top margin)
- Hover: `hover:scale-105` (matches `buttonConfig.hoverScale` = "hover:scale-105") with `transition-transform duration-200`
- Hover gradient (optional): `hover:from-slate-500 hover:to-slate-300` (matches `colors.gradients.buttonHover`)
- Shadow: `shadow-lg` (matches `shadows.card`)
- Disabled state: `opacity-50 cursor-not-allowed`

**States:**
- **Default:** Gradient background, hover scale
- **Loading:** Show spinner, disable button
- **Error:** Maintain button, show error message above

**Animation:**
- Fade in: `opacity: 0 → 1` (400ms, delay: 700ms)

#### 4.2.8 Error/Success Messages

**Error Message:**
- Background: `bg-red-950/20` (matches `colors.statusBackground.error` = "bg-red-950/20")
- Border: `border border-red-600` (matches `colors.statusBorder.error` = "border-red-600")
- Text: `text-red-500` (matches `colors.status.error` = "text-red-500")
- Padding: `p-4`
- Border radius: `rounded-lg` (matches `borderRadius.md`)
- Font: `text-sm` (matches `typography.fontSize.sm`)
- Margin: `mt-4` (matches `spacing.margin.md` = "mb-4", adapted for top margin)
- Icon: Alert circle icon from Lucide React (optional)

**Success Message:**
- Background: `bg-green-950/20` (matches `colors.statusBackground.success` = "bg-green-950/20")
- Border: `border border-green-600` (matches `colors.statusBorder.success` = "border-green-600")
- Text: `text-green-400` (matches `colors.status.success` = "text-green-400")
- Styling: Same padding, border radius, font, and margin as error message (using config values)

**Animation:**
- Slide down and fade in: `opacity: 0, y: -10 → opacity: 1, y: 0` (300ms)
- Use Framer Motion for smooth animation

#### 4.2.9 Sign Up Link (Optional)

**Layout:** Centered below submit button

**Text:** "Don't have an account? Sign up"

**Styling:**
- Font: `text-sm`
- Color: `text-slate-400 dark:text-slate-600`
- Link color: `text-slate-300 dark:text-slate-700 font-medium`
- Hover: `hover:text-slate-200 dark:hover:text-slate-900`
- Margin top: `mt-6`
- Centered: `text-center`

**Link:** `/signup` or `/register`

**Animation:**
- Fade in: `opacity: 0 → 1` (400ms, delay: 800ms)

---

### 4.3 Footer (Optional)

**Layout:** Minimal, centered at bottom

**Content:**
- Link: "← Back to home"
- Link: Link to landing page (`/`)

**Styling:**
- Font: `text-sm text-slate-500 dark:text-slate-400`
- Padding: `py-8`
- Centered: `text-center`

**Responsive:**
- Hide on mobile if space is constrained
- Show on desktop

---

## 5. Animations & Interactions

### 5.1 Animation Philosophy

**Principle:** Subtle, purposeful, never distracting (matches marketing PRD)

**Guidelines:**
- Animations should enhance, not distract
- Keep durations short (200-500ms, references `animationDurations` from visual-effects.ts):
  - Page transitions: `animationDurations.pageTransition` (0.3s)
  - Status messages: `animationDurations.statusMessage` (0.2s)
  - Overlay fade in/out: `animationDurations.overlayFadeIn` (0.4s)
- Use easing functions (`ease-out`, `ease-in-out`)
- Respect `prefers-reduced-motion` media query
- Use Framer Motion `motionVariants` from visual-effects.ts for consistency

### 5.2 Specific Animations

#### 5.2.1 Page Load

**Sequence (durations align with `animationDurations` from visual-effects.ts):**
1. Form container fades in: `opacity: 0 → 1, y: 20 → 0` (500ms, delay: 100ms, uses `motionVariants.fadeInUp`)
2. Welcome heading fades in: `opacity: 0 → 1` (400ms, delay: 200ms, matches `animationDurations.overlayFadeIn`)
3. Subheading fades in: `opacity: 0 → 1` (400ms, delay: 300ms)
4. Email input fades in: `opacity: 0 → 1` (400ms, delay: 400ms)
5. Password input fades in: `opacity: 0 → 1` (400ms, delay: 500ms)
6. Helper links fade in: `opacity: 0 → 1` (400ms, delay: 600ms)
7. Submit button fades in: `opacity: 0 → 1` (400ms, delay: 700ms)
8. Sign up link fades in: `opacity: 0 → 1` (400ms, delay: 800ms)

**Implementation:**
- Use Framer Motion `motion` components with `initial`, `animate`, and `transition` props
- Stagger children using `staggerChildren` for form fields

#### 5.2.2 Input Focus

**Email/Password Inputs:**
- Border color: `border-slate-700 → border-slate-400` (matches `colors.border.focus`)
- Ring: `focus:ring-2 focus:ring-slate-400/20` (matches `shadows.focus.ring`)
- Scale (optional): `scale: 1 → 1.01` (matches `inputConfig.focusScale`)
- Transition: `duration-200` (matches `inputConfig.transitionDuration`)

#### 5.2.3 Input Validation

**Invalid Input:**
- Border color: `border-red-500` (matches `colors.status.error` = "text-red-500", adapted for border)
- Pulse animation: Shake or pulse effect (2000ms duration, matches `inputConfig.pulseDuration` = 2000)
- Error message appears below input

**Valid Input:**
- Border color: `border-green-500` (subtle, optional)
- Smooth transition

#### 5.2.4 Button Hover

**Submit Button:**
- Scale: `scale: 1 → 1.05` (200ms, matches `buttonConfig.hoverScale` = "hover:scale-105")
- Shadow: Increase shadow intensity slightly (uses `shadows.card` = "shadow-lg")
- Smooth transition: `transition-transform duration-200` (matches `inputConfig.transitionDuration` = "duration-200")

#### 5.2.5 Form Submission

**Loading State:**
- Button shows spinner (Lucide React `Loader2` icon with rotation animation)
- Button disabled with `opacity-50`
- Form inputs disabled

**Success State:**
- Success message appears
- Redirect to `/app` after brief delay (500ms)
- Smooth page transition

**Error State:**
- Error message appears with slide-down animation
- Button returns to normal state
- Inputs remain filled (preserve user input)

---

## 6. Responsive Design

### 6.1 Breakpoints

**Tailwind Defaults (matches marketing PRD):**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### 6.2 Mobile Adaptations

**Form Container:**
- Max width: `max-w-md` (maintains on mobile)
- Padding: `p-4 md:p-6` (matches `spacing.container.cardPaddingMobile` = "p-4 md:p-6" from visual-effects.ts)
- Margin: `mx-4` on mobile (vs centered on desktop)

**Welcome Heading:**
- Font size: `text-2xl` on mobile (vs `text-5xl` on desktop)
- Smaller margins

**Inputs:**
- Full width: `w-full`
- Padding: Maintains `px-4 py-3`
- Touch-friendly: Minimum 44px height for touch targets

**Submit Button:**
- Full width: `w-full`
- Touch-friendly: Minimum 44px height

**Header:**
- Smaller padding: `px-4` on mobile (vs `px-8` on desktop)
- Logo: `text-lg` on mobile (vs `text-xl` on desktop)

**Spacing:**
- Reduce margins: `mt-4` on mobile (vs `mt-8` on desktop)
- Tighter vertical spacing on mobile

### 6.3 Touch Targets

**Mobile Considerations:**
- Buttons: Minimum `44px × 44px` touch target
- Inputs: Adequate padding for comfortable typing
- Links: Adequate spacing between clickable elements
- No hover-only interactions (ensure tap works)

---

## 7. Form Validation & Error Handling

### 7.1 Client-Side Validation

**Email Validation:**
- Required field validation
- Email format validation (regex)
- Real-time validation on blur (optional)

**Password Validation:**
- Required field validation
- Minimum length (if applicable): 8 characters
- Show requirements (optional, minimal)

**Error Display:**
- Inline error below input field
- Red border on invalid input (matches `status.error`)
- Error icon (optional, Lucide React)
- Font: `text-sm text-red-500`

### 7.2 Server-Side Error Handling

**API Error Responses:**
- Display server error messages in error message area
- Common errors:
  - "Invalid email or password"
  - "Account not found"
  - "Account is disabled"
  - "Network error. Please try again."

**Error Message Styling:**
- Matches error message component (Section 4.2.8)
- Clear, user-friendly copy
- Actionable when possible

### 7.3 Success Handling

**Successful Login:**
- Show brief success message (optional)
- Redirect to `/app` or dashboard
- Store authentication token/session
- Smooth page transition

---

## 8. Accessibility

### 8.1 WCAG Compliance

**Target:** WCAG 2.1 Level AA (matches marketing PRD)

**Requirements:**
- **Color Contrast:** Minimum 4.5:1 for text (slate colors meet this)
- **Keyboard Navigation:** All interactive elements accessible via keyboard
  - Tab through inputs and buttons
  - Enter submits form
  - Escape closes modals (if any)
- **Screen Readers:** Proper ARIA labels and semantic HTML
  - Form labels properly associated with inputs
  - Error messages announced
  - Loading states announced
- **Focus Indicators:** Visible focus states on all interactive elements
  - Ring on focus (matches `shadows.focus.ring`)
  - Border color change on focus

### 8.2 Semantic HTML

**Structure:**
- Use `<form>` element with proper `action` and `method`
- Proper `<label>` elements associated with inputs
- Use `<main>` for main content
- Proper heading hierarchy (`h1` for welcome heading)
- Use `<fieldset>` and `<legend>` if grouping fields (optional)

### 8.3 ARIA Attributes

**Required:**
- `aria-label` for icon-only buttons (theme toggle, password toggle)
- `aria-invalid` for invalid inputs
- `aria-describedby` linking inputs to error messages
- `aria-busy` for loading state on submit button
- `role="alert"` for error messages

### 8.4 Reduced Motion

**Implementation:**
- Use Framer Motion's `useReducedMotion` hook
- Or CSS media query:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Performance Requirements

### 9.1 Loading Performance

**Targets (matches marketing PRD):**
- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.5s
- **Cumulative Layout Shift (CLS):** < 0.1

### 9.2 Optimization Strategies

**JavaScript:**
- Code splitting with Next.js
- Lazy load non-critical components
- Minimize bundle size
- Optimize form validation logic

**CSS:**
- Use Tailwind CSS (purged in production)
- Critical CSS inlined
- Defer non-critical styles

**Forms:**
- Debounce validation (if real-time)
- Optimize API calls
- Cache authentication tokens

---

## 10. Security Considerations

### 10.1 Authentication Security

**Password Handling:**
- Never display passwords in plain text
- Use secure password input type
- Consider password strength requirements (if applicable)

**API Security:**
- Use HTTPS for all authentication requests
- Implement CSRF protection (if applicable)
- Rate limiting on login attempts
- Secure token storage (httpOnly cookies preferred)

### 10.2 User Privacy

**Data Handling:**
- Clear privacy policy link (optional, in footer)
- Secure session management
- Proper logout functionality

---

## 11. Technical Implementation

### 11.1 Technology Stack

**Framework:** Next.js 14+ (App Router)
- Server-side rendering for SEO (optional for login)
- Client-side form handling
- API routes for authentication

**Styling:** Tailwind CSS
- Utility-first CSS
- Consistent with `visual-effects.ts` config
- Easy theming

**Icons:** Lucide React
- Consistent icon set
- Tree-shakeable
- Accessible

**Animations:** Framer Motion
- Smooth, performant animations
- Reduced motion support
- Consistent with marketing page

**Form Handling:**
- React Hook Form (recommended)
- Or native form handling
- Validation with Zod or Yup (optional)

**Type Safety:** TypeScript
- Type safety throughout
- Better developer experience

### 11.2 File Structure

```
app/
  login/
    page.tsx            # Login page component
    layout.tsx          # Optional login-specific layout

components/
  auth/
    LoginForm.tsx       # Main login form component
    LoginInput.tsx      # Reusable input component
    ThemeToggle.tsx     # Theme toggle (reusable from landing)
  
lib/
  auth.ts               # Authentication utilities
  validation.ts         # Form validation schemas
```

### 11.3 Form State Management

**React Hook Form Example:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    // Handle login
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### 11.4 Theme Management

**Implementation:**
- Use `next-themes` package (matches marketing PRD)
- Store preference in `localStorage`
- Respect system preference on first load
- Smooth transitions between themes

**Integration with visual-effects.ts:**
- Use color classes from `colors` object
- Adapt for light/dark mode using Tailwind `dark:` modifier
- Ensure consistency across themes

---

## 12. Content & Copy

### 12.1 Welcome Heading

**Options:**
- "Welcome back"
- "Sign in"
- "Welcome to Video Research"

**Why This Works:**
- Short and friendly
- Clear purpose
- Professional yet approachable

### 12.2 Subheading

**Options:**
- "Sign in to continue to Video Research"
- "Enter your credentials to get started"
- "Access your account"

**Keep It Short:**
- One sentence
- Clear and direct

### 12.3 Button Copy

**Primary:** "Sign in"
- Action-oriented
- Clear next step
- Standard convention

### 12.4 Helper Text

**Forgot Password:** "Forgot password?"
- Direct question format
- Clear link text

**Sign Up:** "Don't have an account? Sign up"
- Conversational
- Clear call to action

---

## 13. Integration Points

### 13.1 Landing Page Integration

**Navigation Flow:**
- Landing page "Get Started" button → `/login`
- Login page "Back to home" link → `/`
- Consistent header/theme across pages

**Visual Consistency:**
- Same header component (logo, theme toggle)
- Same color scheme (adapts to theme)
- Same typography
- Same animation style

### 13.2 App Integration

**Post-Login Flow:**
- Successful login → `/app` (dashboard)
- Store authentication state
- Redirect if already authenticated (if visiting `/login` while logged in)

### 13.3 API Integration

**Authentication Endpoint:**
- POST `/api/auth/login`
- Request: `{ email: string, password: string }`
- Response: `{ token: string, user: User }` or error

**Error Handling:**
- Network errors
- Invalid credentials
- Server errors
- Rate limiting

---

## 14. Testing Requirements

### 14.1 Visual Testing

**Browsers:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Devices:**
- Desktop (1920×1080, 1440×900, 1280×720)
- Tablet (768×1024, 1024×768)
- Mobile (375×667, 414×896)

### 14.2 Functional Testing

**Test Cases:**
- Valid login with correct credentials
- Invalid email format
- Invalid password
- Empty fields validation
- Forgot password link (if implemented)
- Theme toggle works correctly
- Responsive layout works on all breakpoints
- Keyboard navigation works
- Screen reader compatibility
- Error message display
- Loading state during submission
- Redirect after successful login

### 14.3 Performance Testing

**Tools:**
- Lighthouse (Chrome DevTools)
- WebPageTest
- Next.js Analytics

**Targets:**
- Lighthouse score: 90+ (Performance, Accessibility, Best Practices, SEO)

---

## 15. Success Metrics

### 15.1 Primary Goals

**Conversion Rate:**
- Target: 80%+ of visitors complete login
- Measure: Successful logins / Total page views

**Error Rate:**
- Target: < 5% error rate on login attempts
- Measure: Failed logins / Total login attempts

**Performance:**
- Target: LCP < 2.5s for 75% of users
- Measure: Real User Monitoring (RUM)

### 15.2 Secondary Goals

- Low bounce rate (< 30%)
- High time on page for successful logins
- Low form abandonment rate
- Fast form submission (< 2s)

---

## 16. Future Enhancements

### 16.1 Potential Additions

**Phase 2:**
- Social login (Google, GitHub, etc.)
- Two-factor authentication (2FA)
- Password strength indicator
- "Remember me" functionality
- Sign up page integration

**Phase 3:**
- Biometric authentication (WebAuthn)
- Magic link login (passwordless)
- Account recovery flow
- Email verification

### 16.2 A/B Testing Opportunities

- Welcome heading variations
- Form layout (centered vs. left-aligned)
- Button copy variations
- Color scheme variations
- Animation variations

---

## 17. Open Questions

Before finalizing implementation, please clarify:

1. **Authentication Method:** What authentication system will be used? (JWT, session-based, OAuth, etc.)
2. **Sign Up Flow:** Will there be a separate sign up page, or should it be integrated?
3. **Social Login:** Should social login options be included?
4. **Password Requirements:** What are the password requirements? (length, complexity, etc.)
5. **Remember Me:** Should "Remember me" functionality be included?
6. **Forgot Password:** Should forgot password functionality be on this page or separate?
7. **Redirect After Login:** Where should users be redirected after successful login? (`/app`, dashboard, etc.)
8. **Already Authenticated:** What should happen if an authenticated user visits `/login`?

---

## Appendix: Design Reference

### A.1 Animate UI Analysis

**What Makes It Work:**
- **Extreme Minimalism:** Only essential elements
- **Large Typography:** Clear hierarchy
- **Centered Layout:** Everything draws attention to center
- **White Space:** Generous spacing creates breathing room
- **Subtle Animations:** Smooth, not distracting
- **Clear Hierarchy:** Heading → Description → Form → Actions

**Key Takeaways for Our Login Page:**
1. Don't overcrowd the form
2. Make the login action immediately clear
3. Use large, clean typography for impact
4. Keep animations subtle and purposeful
5. Focus on the form as the hero
6. Use white space liberally

### A.2 Visual Config Integration

**Colors to Use (from visual-effects.ts):**
- Backgrounds: `colors.background.primary`, `colors.background.secondary`
- Text: `colors.text.primary`, `colors.text.secondary`, `colors.text.tertiary`
- Borders: `colors.border.default`, `colors.border.focus`
- Status: `colors.status.error`, `colors.status.success`

**Spacing to Use:**
- Padding: `spacing.padding.md`, `spacing.padding.lg`
- Margins: `spacing.margin.md`, `spacing.margin.lg`
- Gaps: `spacing.gap.md`

**Typography to Use (from visual-effects.ts):**
- Font sizes: `typography.fontSize.xs` ("text-xs"), `typography.fontSize.sm` ("text-sm"), `typography.fontSize.base` ("text-base"), `typography.fontSize.lg` ("text-lg"), `typography.fontSize.xl` ("text-xl"), `typography.fontSize["2xl"]` ("text-2xl"), `typography.fontSize["3xl"]` ("text-3xl")
- Font weights: `typography.fontWeight.normal` ("font-normal"), `typography.fontWeight.medium` ("font-medium"), `typography.fontWeight.semibold` ("font-semibold"), `typography.fontWeight.bold` ("font-bold")
- Line heights: `typography.lineHeight.tight` ("leading-tight"), `typography.lineHeight.relaxed` ("leading-relaxed")

**Border Radius:**
- Form container: `borderRadius.lg`
- Inputs/Button: `borderRadius.md`

**Animations:**
- Page transition: `animationDurations.pageTransition` (0.3s)
- Component animations: Use `motionVariants` from visual-effects.ts

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Draft - Ready for Review

