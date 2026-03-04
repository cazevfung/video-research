/**
 * Visual Effects Configuration
 * Centralized configuration for all animation, visual effects, colors, and styling
 * This keeps all visual settings in one place for easy adjustment
 */

/**
 * Color Palette Configuration
 * Updated to use new semantic design system (matches style_update_prd.md)
 * All values are Tailwind class names that can be used directly in className props
 */
export const colors = {
  // Background colors (Tailwind classes)
  background: {
    primary: "bg-theme-bg", // Main app background
    secondary: "bg-theme-bg-card", // Card backgrounds
    tertiary: "bg-theme-bg-tertiary", // Semi-transparent backgrounds
    overlay: "bg-theme-bg-secondary", // Overlay backgrounds
    // Legacy gray variants for backward compatibility
    gray900: "bg-gray-900", // For banner background (can be replaced with theme colors)
    gray90050: "bg-gray-900/50", // Semi-transparent gray (can be replaced with theme colors)
    gray800: "bg-gray-800", // For button hover states (can be replaced with theme colors)
    gray950: "bg-gray-950", // For app background (can be replaced with theme colors)
  },
  // Text colors (Tailwind classes)
  text: {
    primary: "text-theme-text-primary", // Main text
    secondary: "text-theme-text-secondary", // Secondary text
    tertiary: "text-theme-text-tertiary", // Tertiary/muted text
    muted: "text-theme-text-quaternary", // Placeholder/muted text
    inverse: "text-theme-text-inverted", // Text on dark backgrounds
    // Legacy gray variants for backward compatibility (use theme colors when possible)
    gray200: "text-gray-200", // For banner text (can be replaced with theme colors)
    gray300: "text-gray-300", // For secondary text (can be replaced with theme colors)
    gray400: "text-gray-400", // For muted text (can be replaced with theme colors)
    gray500: "text-gray-500", // For very muted text (can be replaced with theme colors)
  },
  // Border colors (Tailwind classes - use with border- prefix)
  border: {
    default: "border-theme-border-primary", // Default borders
    focus: "border-theme-border-strong", // Focused input borders
    muted: "border-theme-border-tertiary", // Muted borders
    // Legacy gray variants for backward compatibility
    gray700: "border-gray-700", // For borders (can be replaced with theme colors)
  },
  // Status colors (Tailwind classes)
  status: {
    success: "text-theme-status-success", // Success indicators
    error: "text-theme-status-error", // Error indicators
    warning: "text-theme-status-warning", // Warning indicators
    info: "text-theme-status-info", // Info indicators
  },
  // Status backgrounds (for toasts, badges)
  statusBackground: {
    success: "bg-dashboard-bg-success-secondary",
    error: "bg-dashboard-bg-error-secondary",
    warning: "bg-dashboard-bg-warning-secondary",
  },
  // Status borders
  statusBorder: {
    success: "border-dashboard-stroke-success-primary",
    error: "border-dashboard-stroke-error-primary",
    warning: "border-dashboard-stroke-warning-primary",
  },
  // Phase 2: Success ring border (for completion animation)
  successRing: {
    border: "border-green-400/50", // Tailwind class for success ring
  },
  // Gradient classes (complete Tailwind gradient classes)
  gradients: {
    button: "bg-gradient-to-r from-theme-fg-02 to-theme-fg",
    buttonHover: "hover:from-theme-fg hover:to-theme-fg-02",
    header: "bg-gradient-to-r from-theme-text-primary to-theme-text-secondary bg-clip-text text-transparent",
  },
  // Particle colors (for inline styles)
  particle: {
    default: "rgba(156, 163, 175, 0.6)", // gray-400/60 as RGBA - kept for backward compatibility
  },
} as const;

/**
 * Status Background Colors
 * Exported separately for convenience
 */
export const statusBackground = colors.statusBackground;

/**
 * Status Border Colors
 * Exported separately for convenience
 */
export const statusBorder = colors.statusBorder;

/**
 * Spacing Configuration
 * All values are Tailwind class names
 */
export const spacing = {
  // Padding (Tailwind classes)
  padding: {
    xs: "px-1 py-0.5",
    sm: "px-3 py-2",
    md: "px-4 py-3",
    lg: "p-4 md:p-6",
    xl: "p-6",
    "2xl": "p-8",
  },
  // Margins (Tailwind classes)
  margin: {
    xs: "mb-2",
    sm: "mb-3",
    md: "mb-4",
    lg: "mb-6",
    xl: "mb-8",
  },
  // Margin bottom (mb utilities) - alias for margin for clarity
  marginBottom: {
    xs: "mb-2",
    sm: "mb-3",
    md: "mb-4",
    lg: "mb-6",
    xl: "mb-8",
  },
  // Margin top (mt utilities)
  marginTop: {
    xs: "mt-0.5",
    sm: "mt-1",
    md: "mt-2",
    lg: "mt-4",
    xl: "mt-6",
  },
  // Gaps (Tailwind classes)
  gap: {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  },
  // Container spacing (Tailwind classes)
  container: {
    pagePadding: "py-8 px-4 sm:px-6 lg:px-8",
    cardPadding: "p-6",
    cardPaddingMobile: "p-4 md:p-6",
    maxWidth: "max-w-7xl", // Standard container max width
    maxWidthContent: "max-w-4xl", // Content area max width
    horizontalPadding: "px-4 sm:px-6 lg:px-8", // Horizontal padding only (for header/footer)
  },
  // Vertical spacing (space-y utilities)
  vertical: {
    xs: "space-y-1",
    sm: "space-y-1.5",
    md: "space-y-2",
    lg: "space-y-4",
  },
  // Padding top (pt utilities)
  paddingTop: {
    sm: "pt-2",
    md: "pt-4",
    lg: "pt-6",
    xl: "pt-8",
    header: "pt-4", // For main content below header
  },
  // Horizontal margin (mx utilities)
  marginHorizontal: {
    xs: "mx-0.5",
    sm: "mx-1",
    md: "mx-2",
    lg: "mx-4",
  },
} as const;

/**
 * Typography Configuration
 * Matches Animate UI's typography system:
 * - Font: Google Sans (regular text), JetBrains Mono (monospace)
 * - Font Size: 12-step scale (12px to 96px)
 * All values are Tailwind class names
 */
export const typography = {
  // Font families
  fontFamily: {
    sans: "var(--font-cursor-gothic-beta), system-ui, sans-serif",
    mono: "var(--font-jetbrains-mono), monospace",
  },
  // Font sizes (Tailwind classes) - Simplified 4-step scale for consistency
  // Use 1-4 sizes per component, prefer 1-2 sizes. All content text should be text-base (14px)
  fontSize: {
    // Core sizes (4-step scale)
    sm: "text-sm",      // 12px - Only when small text is truly necessary (rare)
    base: "text-base",  // 14px - ALL content text, descriptions, buttons, alerts (NORMAL SIZE)
    lg: "text-xl",      // 18px - Card titles, subheadings, section headings
    xl: "text-2xl",     // 20px - Page titles, major headings
    
    // Legacy mappings (for backward compatibility during migration)
    xs: "text-sm",      // 12px (maps to sm)
    md: "text-xl",      // 18px (maps to lg)
    
    // Legacy numeric mapping
    "1": "text-sm",     // 12px
    "2": "text-sm",     // 12px
    "3": "text-base",   // 14px
    "4": "text-xl",     // 18px (maps to lg)
    "5": "text-2xl",    // 20px (maps to xl)
    "6": "text-2xl",    // 20px (maps to xl)
    // All larger sizes map to xl
    "7": "text-2xl",
    "8": "text-2xl",
    "9": "text-2xl",
    "10": "text-2xl",
    "11": "text-2xl",
    "12": "text-2xl",
    
    // Legacy aliases
    "2xl": "text-2xl",  // 20px
    "3xl": "text-2xl",  // 20px
    "4xl": "text-2xl",  // 20px
    "5xl": "text-2xl",  // 20px
    "6xl": "text-2xl",  // 20px
    "7xl": "text-2xl",  // 20px
    "8xl": "text-2xl",  // 20px
  },
  // Font weights (Tailwind classes)
  fontWeight: {
    normal: "font-normal", // 400
    medium: "font-medium", // 500
    semibold: "font-semibold", // 600
    bold: "font-bold", // 700
  },
  // Line heights (Tailwind classes)
  lineHeight: {
    none: "leading-none",
    tight: "leading-tight",
    snug: "leading-snug",
    normal: "leading-normal",
    relaxed: "leading-relaxed",
    loose: "leading-loose",
  },
} as const;

/**
 * Border Radius Configuration
 * All values are Tailwind class names
 */
export const borderRadius = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-full",
} as const;

/**
 * Shadow Configuration
 * All values are Tailwind class names or CSS values
 */
export const shadows = {
  // Focus shadows (Tailwind classes)
  focus: {
    ring: "focus:ring-2 focus:ring-gray-400/20",
    glow: "shadow-[0_0_20px_rgba(156,163,175,0.3)]",
  },
  // Orb glow (CSS value for inline styles)
  orbGlow: "0 0 60px rgba(156,163,175,0.5)",
  // Card shadows (Tailwind class)
  card: "shadow-lg",
} as const;

/**
 * Input/Form Configuration
 */
export const inputConfig = {
  // Textarea dimensions (CSS values for inline styles)
  textarea: {
    minHeight: "200px",
    maxHeight: "400px",
    minHeightPx: 200,
    maxHeightPx: 400,
  },
  // Input focus scale (CSS transform value)
  focusScale: "1.01",
  // Transition duration (Tailwind class)
  transitionDuration: "duration-200",
  // Pulse animation duration (for invalid inputs)
  pulseDuration: 2000, // milliseconds
} as const;

/**
 * Icon Sizes Configuration
 * All values are Tailwind class names
 */
export const iconSizes = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  "2xl": "h-12 w-12",
} as const;

/**
 * Button Configuration
 * All values are Tailwind class names
 */
export const buttonConfig = {
  sizes: {
    sm: {
      height: "h-9",
      padding: "px-3",
      fontSize: typography.fontSize.base, // All buttons use text-base (14px) - uses typography.fontSize.base
      iconSize: iconSizes.sm, // "h-4 w-4"
    },
    default: {
      height: "h-10",
      padding: "px-4 py-2",
      fontSize: typography.fontSize.base, // All buttons use text-base (14px) - uses typography.fontSize.base
      iconSize: iconSizes.sm, // "h-4 w-4"
    },
    lg: {
      height: "h-11",
      padding: "px-8",
      fontSize: typography.fontSize.base, // All buttons use text-base (14px) - uses typography.fontSize.base
      iconSize: iconSizes.md, // "h-5 w-5"
    },
  },
  // Icon button sizes (for standalone icon buttons)
  iconButton: {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  },
  hoverScale: "hover:scale-105",
} as const;

/**
 * Switch Configuration
 * All values are Tailwind class names
 */
export const switchConfig = {
  // Switch root (track) sizes
  root: {
    height: "h-6",
    width: "w-11",
    borderRadius: borderRadius.full,
    transition: "transition-colors duration-200",
  },
  // Switch thumb (handle) sizes
  thumb: {
    height: "h-5",
    width: "w-5",
    borderRadius: borderRadius.full,
    background: "bg-white",
    shadow: "shadow-sm",
    transition: "transition-transform duration-200",
  },
  // Switch states
  states: {
    checked: {
      background: "bg-theme-fg",
      // Track is 44px (w-11), thumb is 20px (w-5), so 44-20=24px available
      // Position thumb at 22px to leave 2px padding on right (22+20=42px, 44-42=2px)
      thumbTranslate: "translate-x-[22px]",
    },
    unchecked: {
      background: "bg-theme-bg-tertiary",
      // Position thumb at 2px to leave 2px padding on left
      thumbTranslate: "translate-x-0.5",
    },
  },
  // Focus styles
  focus: {
    outline: "focus:outline-none",
    ring: "focus:ring-2",
    ringColor: "focus:ring-theme-border-strong",
    ringOffset: "focus:ring-offset-2",
  },
} as const;

/**
 * Card Configuration
 * All values are Tailwind class names
 */
export const cardConfig = {
  borderRadius: borderRadius.lg,
  border: "border border-theme-border-primary",
  background: "bg-theme-bg-card",
  padding: spacing.container.cardPadding,
} as const;

/**
 * Content + Actions layout (summary & research result cards)
 * Buttons sit outside the content column, sticky, with consistent padding.
 * Use this config in ResultCard and ResearchResultCard so changes apply to all.
 */
export const contentActionsLayoutConfig = {
  /** Row wrapping content column + actions column */
  row: "flex-1 flex min-h-0",
  /** Zero-width sticky column so content stays full width; actions float outside */
  actionsColumn: "w-0 flex-shrink-0 overflow-visible sticky top-16 self-start relative",
  /** Inner wrapper for buttons: uniform padding on all sides for consistency */
  actionsInner: [
    "absolute top-0 left-full flex flex-col items-end",
    "p-4",
  ] as const,
  actionButtons: {
    size: "sm" as const,
    variant: "outline" as const,
    /** Language-adaptive: no wrap, no shrink, comfortable padding for long translations */
    className: "whitespace-nowrap flex-shrink-0 px-4",
  },
} as const;

/**
 * Markdown Styling Configuration (Visual Cleanup)
 * Focus: Reduced visual noise, correct list alignment, better spacing
 */
export const markdownConfig = {
  // HEADER: Clean, solid color
  headerGradient: "text-theme-text-primary font-bold tracking-tight",
  
  // CODE BLOCKS
  code: {
    background: "bg-theme-bg-tertiary",
    text: "text-theme-text-primary",
    fontSize: "text-sm",
    inlinePadding: "px-1.5 py-0.5 rounded-md bg-theme-bg-tertiary font-medium",
    blockPadding: "p-4 overflow-x-auto",
    border: "border border-theme-border-primary",
    borderRadius: "rounded-lg",
    copyButton: {
      background: "bg-transparent",
      backgroundHover: "hover:bg-theme-bg-secondary",
      border: "border border-theme-border-primary",
      text: "text-theme-text-secondary",
      textHover: "hover:text-theme-text-primary",
      iconSize: "h-4 w-4",
      successColor: "text-green-500",
    },
    languageBadge: {
      fontSize: "text-xs",
      color: "text-theme-text-quaternary",
      fontFamily: "font-mono",
    },
  },
  
  // LINKS
  link: {
    default: "text-blue-500 font-medium hover:text-blue-600 no-underline",
    hover: "hover:underline",
    underline: "underline",
  },
  
  // BLOCKQUOTES: Softer border color to be less intrusive
  blockquote: {
    border: "border-l-4 border-theme-border-tertiary", 
    text: "text-theme-text-secondary italic",
    padding: "pl-4 py-1",
    margin: "my-6",
    style: "italic",
  },
  
  // LISTS
  list: {
    spacing: "space-y-2",
    margin: "mb-6",
    padding: "pl-5", 
    // Ensures markers are outside but aligned, and nested paragraphs don't break flow
    disc: "list-disc list-outside marker:text-theme-text-tertiary block [&>li>p]:inline",
    decimal: "list-decimal list-outside marker:text-theme-text-tertiary block [&>li>p]:inline",
    itemParagraph: "[&>li>p]:inline", // Paragraph styling within list items
  },
  
  // PARAGRAPHS
  paragraph: {
    margin: "mb-6",
    lineHeight: "leading-7",
  },
  
  // MAJOR SECTIONS (H2)
  // FIX: Removed 'border-b' and 'pb-2' to eliminate double-line effect with <hr> tags
  majorSection: {
    marginTop: "mt-12",
    marginBottom: "mb-4",
    fontSize: "text-3xl", // 30px - Prominent size for H2 (was text-2xl/24px)
    fontWeight: "font-bold",
    divider: "", // Intentionally empty to rely on natural whitespace or Markdown separators
  },
  
  // SUBSECTIONS (H3)
  subsection: {
    marginTop: "mt-8",
    marginBottom: "mb-3",
    fontSize: "text-xl", // 20px - Medium size for H3
    fontWeight: "font-semibold",
    hover: { transition: "", transitionDuration: 0, scale: 1, opacity: "" },
  },
  // SOURCES SECTION (H3 "Sources") – extra padding above to separate from body
  sourcesSection: {
    marginTop: "mt-12",
  },
  
  // MINOR SUBSECTIONS (H4, H5, H6)
  // Phase 5: marginTop for H4 (was hardcoded "mt-10") - configurable via NEXT_PUBLIC_MARKDOWN_H4_MARGIN_TOP
  minorSubsection: {
    marginTop: process.env.NEXT_PUBLIC_MARKDOWN_H4_MARGIN_TOP || "mt-10",
    fontSize: "text-lg", // 18px - Smallest size for H4-H6
    fontWeight: "font-semibold",
  },
  
  // SUBSECTION GROUPING
  subsectionBlock: {
    background: "bg-transparent",
    backgroundHover: "",
    borderRadius: "",
    padding: "",
    transition: "",
    connectionBorder: "",
  },
  
  // EXECUTIVE SUMMARY BOX
  introduction: {
    border: "border-l-4 border-blue-500",
    fontSize: typography.fontSize.base, // Uses typography.fontSize.base (14px)
    lineHeight: "leading-relaxed",
    margin: "mb-8 bg-blue-50/10 p-6 rounded-r-lg",
  },
  
  // SUBSECTION LISTS (Indented)
  subsectionList: {
    indent: "ml-4",
    itemSpacing: "space-y-2",
    border: "", 
    padding: "pl-5", 
    margin: "mb-4",
    background: "", 
    backgroundHover: "", 
    transition: "",
    bullet: {
      listStyle: "list-disc",
      bulletClass: "marker:text-theme-text-tertiary",
      itemPadding: "", itemPosition: "", bulletPosition: "", bulletLeft: "", bulletTop: "", bulletWidth: "", bulletHeight: "", bulletShape: "", bulletBorder: "", bulletBorderColor: "", bulletBackground: "", bulletContent: "",
    },
  },
  
  // SUBSECTION PARAGRAPHS (no indent)
  subsectionParagraph: {
    margin: "mb-4",
    indent: "",
  },
  
  // TABLES: Smaller font size for better readability in dense data
  table: {
    fontSize: typography.fontSize.sm, // Smaller than normal text (12px) - uses typography.fontSize.sm
    margin: "my-6",
    width: "w-full",
    borderCollapse: "border-collapse",
    border: "border border-theme-border-primary",
    borderRadius: "rounded-lg",
    overflow: "overflow-hidden",
  },
  thead: {
    background: "bg-theme-bg-tertiary",
    borderBottom: "border-b border-theme-border-primary",
  },
  tbody: {
    background: "bg-transparent",
  },
  tr: {
    borderBottom: "border-b border-theme-border-tertiary",
    lastChild: "last:border-b-0",
  },
  th: {
    padding: "px-4 py-3",
    textAlign: "text-left",
    fontWeight: "font-semibold",
    fontSize: typography.fontSize.sm, // Smaller than normal text (12px) - uses typography.fontSize.sm
    color: "text-theme-text-primary",
    background: "bg-theme-bg-tertiary",
  },
  td: {
    padding: "px-4 py-3",
    fontSize: typography.fontSize.sm, // Smaller than normal text (12px) - uses typography.fontSize.sm
    color: "text-theme-text-primary",
  },
} as const;

/**
 * Mermaid Diagram Configuration
 * Font sizes and styling for Mermaid diagrams to match normal text
 */
export const mermaidConfig = {
  // Font configuration - uses normal text size (matches typography.fontSize.base = 14px)
  // Using 13px to better match normal content appearance (Mermaid tends to render larger)
  fontSize: "13px", // Adjusted to match normal content visual size
  fontSizeRem: "0.8125rem", // Alternative rem unit (13px)
  fontFamily: "inherit", // Use inherit to match parent font (which uses typography.fontFamily.sans)
  // Mermaid initialization options
  initialize: {
    startOnLoad: false,
    securityLevel: 'loose' as const,
  },
  // Expand button styling
  expandButton: {
    position: "absolute top-2 right-2 z-10",
    size: "h-8 w-8",
    padding: "p-1.5",
    background: "bg-theme-bg-secondary/80 backdrop-blur-sm",
    backgroundHover: "hover:bg-theme-bg-tertiary",
    border: "border border-theme-border-primary",
    borderRadius: "rounded-md",
    text: "text-theme-text-secondary",
    textHover: "hover:text-theme-text-primary",
    iconSize: "h-4 w-4",
    transition: "transition-all duration-200",
  },
  // Expanded view configuration
  expandedView: {
    maxWidth: "max-w-[95vw]",
    maxHeight: "max-h-[95vh]",
    padding: "p-4",
    background: "bg-theme-bg-card",
    borderRadius: "rounded-lg",
    border: "border border-theme-border-primary",
  },
  // Zoom controls configuration
  zoom: {
    min: 0.25,
    max: 4,
    step: 0.25,
    default: 1,
  },
} as const;

/**
 * Phase 4: Streaming Component Configuration
 */
export const streamingConfig = {
  // Streaming progress bar
  progress: {
    min: 85, // Minimum progress percentage during streaming
    max: 99, // Maximum progress percentage during streaming
    height: "h-1", // Tailwind height class
    background: "bg-theme-bg-tertiary", // Tailwind background class
    gradient: "bg-gradient-to-r from-theme-text-secondary to-theme-text-primary", // Tailwind gradient class
    pulseOpacity: [0.5, 0.7, 0.5] as [number, number, number], // Pulse animation opacity values
    pulseBaseOpacity: 0.5, // Base opacity for pulse effect
  },
  // Scroll progress indicator
  scrollProgress: {
    height: "h-1", // Tailwind height class
    background: "bg-theme-bg-card", // Tailwind background class
    gradient: "bg-gradient-to-r from-theme-text-secondary to-theme-text-primary", // Tailwind gradient class
    zIndex: "z-50", // Tailwind z-index class
  },
  // Copy button configuration
  copyButton: {
    sizes: {
      sm: {
        height: "h-8",
        padding: "px-2",
        fontSize: "text-xs",
        iconSize: "h-3.5 w-3.5",
      },
      md: {
        height: "h-9",
        padding: "px-3",
        fontSize: "text-sm",
        iconSize: "h-4 w-4",
      },
      lg: {
        height: "h-10",
        padding: "px-4",
        fontSize: "text-base",
        iconSize: "h-4 w-4",
      },
    },
    variants: {
      default: {
        background: "bg-theme-bg-secondary",
        backgroundHover: "hover:bg-theme-bg-tertiary",
        text: "text-theme-text-primary",
        border: "border-theme-border-secondary",
      },
      outline: {
        background: "bg-transparent",
        backgroundHover: "hover:bg-theme-bg-secondary",
        text: "text-theme-text-secondary",
        border: "border-theme-border-secondary",
      },
      ghost: {
        background: "bg-transparent",
        backgroundHover: "hover:bg-theme-bg-secondary",
        text: "text-theme-text-secondary",
        border: "border-transparent",
      },
    },
    animations: {
      hoverScale: 1.05,
      tapScale: 0.95,
      successColor: "text-theme-status-success", // Tailwind color class
    },
    resetTimeout: 2000, // milliseconds
  },
  // Text chunk animations
  textChunk: {
    initialY: 10, // pixels
    linkHoverScale: 1.02,
  },
  // Scroll detection
  scroll: {
    bottomThreshold: 10, // pixels - threshold for detecting bottom of scroll
    throttleMs: 16, // milliseconds - throttle scroll updates to ~60fps
  },
  // Content limits and truncation (Phase 5: env-overridable to avoid hardcoded config)
  content: {
    maxLength: parseInt(
      process.env.NEXT_PUBLIC_STREAMING_CONTENT_MAX_LENGTH || '50000',
      10
    ), // ~10K words; NEXT_PUBLIC_STREAMING_CONTENT_MAX_LENGTH
    truncationMessage:
      process.env.NEXT_PUBLIC_STREAMING_TRUNCATION_MESSAGE ||
      "\n\n*[Content truncated for performance]*", // NEXT_PUBLIC_STREAMING_TRUNCATION_MESSAGE
  },
  // Typing cursor configuration
  cursor: {
    width: "w-0.5", // Tailwind width class
    height: "h-5", // Tailwind height class
    margin: "ml-1", // Tailwind margin class
    color: "bg-theme-text-tertiary", // Tailwind background color class (using theme color instead of hardcoded gray)
  },
} as const;

/**
 * Toast Configuration
 * All values are Tailwind class names
 */
export const toastConfig = {
  padding: "p-6 pr-8",
  borderRadius: borderRadius.md,
  border: "border border-theme-border-primary",
  background: "bg-theme-bg-card",
  shadow: shadows.card,
} as const;

/**
 * Orb (WhimsicalLoader) Configuration
 * Phase 2: Added blur configuration for Gaussian blur enhancement
 */
export const orbConfig = {
  // Orb sizes (in pixels)
  size: {
    mobile: 150,
    desktop: 200,
  },
  // Glow effect shadow
  glowShadow: "0_0_60px_rgba(156,163,175,0.5)",
  // Minimum heights for container
  minHeight: {
    mobile: 300,
    desktop: 400,
  },
  // Phase 2: Gaussian blur configuration
  // Updated with tested optimal values
  blur: {
    enabled: true, // Can be disabled for performance or reduced motion
    radius: 11, // pixels - tested optimal value (updated from 35px)
    opacity: 0.50, // Blend opacity - tested optimal value (updated from 0.3)
    // Note: CSS filter:blur() doesn't have iterations parameter like After Effects,
    // but we can achieve similar effect with appropriate radius and opacity
  },
  // Optional: Radial blur (more complex, requires SVG filters or canvas)
  // Currently disabled - can be implemented in Phase 3 if desired
  radialBlur: {
    enabled: false,
    amount: 85, // percentage
  },
} as const;

/**
 * Orb State-Specific Animations
 */
export const orbAnimations = {
  fetching: {
    duration: 1.5, // seconds
    scale: [1, 1.1, 1] as [number, number, number],
  },
  processing: {
    duration: 4, // seconds
    rotate: 360, // degrees
  },
  condensing: {
    duration: 1, // seconds
    scale: [1, 0.7, 1] as [number, number, number],
  },
  aggregating: {
    duration: 1.5, // seconds
    opacity: [0.8, 1, 0.8] as [number, number, number],
  },
  generating: {
    duration: 2, // seconds
    y: [0, 10, 0] as [number, number, number],
  },
  error: {
    duration: 0.5, // seconds
    repeat: 3,
    shake: [0, -10, 10, -10, 10, 0] as number[],
  },
  connected: {
    duration: 2, // seconds
    scale: [1, 1.1, 1] as [number, number, number],
  },
  // Phase 2: Completion animation
  completed: {
    duration: 1.5, // seconds
    scale: [1, 0.95, 0.9] as [number, number, number],
    opacity: [1, 0.9, 0.8] as [number, number, number],
    ease: "easeOut" as const,
  },
} as const;

/**
 * Orb State-Specific Particle Counts
 * Updated with tested optimal values
 */
export const orbParticleCounts = {
  fetching: 24,
  processing: 24,
  condensing: 24,
  aggregating: 24,
  generating: 24,
  error: 0,
  connected: 24,
} as const;

/**
 * Particle System Configuration
 * Updated with tested optimal values for best visual effect
 */
export const particleConfig = {
  // Particle size range (in pixels)
  size: {
    min: 7,
    max: 10,
  },
  // Particle distance from orb (in pixels)
  distance: {
    base: 400,
    random: 200, // base + random(0-200) - updated from 160
  },
  // Particle speed range
  speed: {
    min: 1.8, // Updated from 1.6
    max: 2.0, // Updated from 1.8
  },
  // Animation durations by behavior (in seconds)
  durations: {
    "fly-in": {
      base: 1.5,
      random: 0.5, // base + random(0-0.5)
      delay: 0.5, // max random delay
    },
    spiral: {
      base: 1,
      random: 0.3, // base + random(0-0.3)
    },
    orbit: {
      base: 3,
      random: 1, // base + random(0-1)
    },
    "flow-down": {
      base: 2,
      random: 1, // base + random(0-1)
      startY: -50, // pixels
      endY: 200, // pixels
      xVariance: 20, // pixels
    },
  },
  // Particle opacity
  opacity: {
    default: 0.0,
    orbit: 0.0,
  },
} as const;

/**
 * Wave Effect Configuration (for generating state)
 */
export const waveConfig = {
  count: 3, // number of wave rings
  duration: 2, // seconds per wave
  delay: 0.6, // seconds between each wave
  scale: {
    start: 1,
    mid: 1.5,
    end: 2,
  },
  opacity: {
    start: 0.6,
    mid: 0.3,
    end: 0,
  },
} as const;

/**
 * Component Animation Durations (in seconds)
 */
export const animationDurations = {
  // Page/State transitions
  pageTransition: 0.3,
  overlayFadeIn: 0.4,
  overlayFadeOut: 0.4,
  resultCardSlide: 0.6,
  
  // Component animations
  statusMessage: 0.2,
  progressBar: 0.3,
  errorState: 0.4,
  errorStateDelay: 0.2,
  videoSuccessBadge: 1,
  markdownCursor: 1,
  
  // Markdown streaming
  markdownDebounce: 0.05, // 50ms - Reduced from 0.3 for smoother updates (Phase 1: Text Flashing Fix)
  newChunkFadeIn: 0.2, // Fade-in duration for new streaming chunks (Phase 1)
  completionFadeIn: 0.3, // Fade-in duration when streaming completes (Phase 1)
  
  // Phase 2: Completion animation configuration
  completionAnimationDuration: 1.5, // Duration for completion animation (seconds)
  overlayFadeOutDuration: 0.5, // Duration for overlay fade-out after completion (seconds)
  completionInitialOpacity: 0.8, // Initial opacity for completion animation (Phase 1)
  
  // Phase 4 (Unified Layout): Sidebar and unified container animations
  sidebarSlideIn: 0.3, // Duration for sidebar slide-in animation (seconds)
  sidebarSlideOut: 0.4, // Duration for sidebar slide-out animation (seconds)
  unifiedContainerFadeIn: 0.3, // Duration for unified container fade-in (seconds)
  summaryExpansion: 0.4, // Duration for summary expansion when sidebar exits (seconds) - coordinates with sidebarSlideOut
  
  // Phase 4: Streaming components
  codeBlockFadeIn: 0.3,
  codeBlockSlideOffset: 2, // pixels
  copyButtonCheckmark: 0.2,
  copyButtonReset: 2000, // milliseconds
  streamingProgressTransition: 0.3,
  streamingProgressPulse: 2, // seconds
  textChunkFadeIn: 0.3,
  textChunkSlideOffset: 10, // pixels
  scrollProgressTransition: 0.1,
  linkHoverScale: 1.02,
  
  // Dropdown menu animations
  dropdownTransition: 0.2, // Duration for dropdown open/close animations (seconds)
  
  // Phase 7: Research feature animations
  research: {
    particleSystemFadeIn: 0.4, // Duration for particle system to fade in
    particleSystemFadeOut: 0.3, // Duration for particle system to fade out
    resultCardFadeIn: 0.5, // Duration for result card to fade in
    stateChangeTransition: 0.3, // Duration for state changes (idle -> processing -> streaming)
  },
} as const;

/**
 * Layout Configuration (responsive breakpoints and percentages)
 */
export const layoutConfig = {
  // Breakpoints (matches Tailwind)
  breakpoints: {
    mobile: 640, // sm
    tablet: 1024, // lg
    desktop: 1024, // lg+
  },
  // @deprecated Processing overlay when streaming - Replaced by processingSidebar in unified layout
  overlayStreaming: {
    desktop: {
      width: "30%", // slides to left side
    },
    mobile: {
      height: "20vh", // shrinks to top
    },
  },
  // Result card when streaming
  resultCardStreaming: {
    desktop: {
      width: "70%", // takes right side
    },
    mobile: {
      height: "80vh", // slides up from bottom
    },
  },
  // Result card max height
  resultCardMaxHeight: "60vh",
  // Phase 4 (Unified Layout): Processing sidebar (replaces overlay streaming config)
  processingSidebar: {
    desktop: {
      width: "280px",
      minWidth: "280px",
      maxWidth: "280px",
    },
    mobile: {
      width: "100%",
      height: "140px",
      minHeight: "140px",
      maxHeight: "140px",
    },
  },
  // Phase 4 (Unified Layout): WhimsicalLoader container sizes
  whimsicalContainer: {
    desktop: {
      height: "240px",
    },
    mobile: {
      width: "140px",
      height: "140px",
    },
  },
  // Phase 4 (Unified Layout): Unified container spacing
  unifiedContainer: {
    gap: {
      desktop: "24px", // gap-6
      mobile: "16px",  // gap-4
    },
    padding: {
      desktop: "24px", // p-6
      mobile: "16px",  // p-4
    },
  },
  // Workflow Progress Tracker configuration
  workflowProgressTracker: {
    iconSize: iconSizes.lg, // "h-6 w-6"
    connectorLine: {
      width: "w-0.5", // Tailwind class
      height: "2rem", // Fixed height value
      completedColor: "bg-green-500",
      defaultColor: "bg-gray-300",
    },
    spacing: {
      itemGap: spacing.gap.md, // "gap-4"
      verticalGap: spacing.vertical.lg, // "space-y-4"
      rightPadding: "pr-4", // Right padding for sidebar placement
    },
    colors: {
      completed: "text-green-500",
      processing: "text-blue-500",
      current: "text-blue-500",
      awaiting: "text-gray-400",
    },
  },
  // Approval Item configuration (for QuestionItem, SearchTermItem, etc.)
  approvalItem: {
    layout: {
      container: "flex items-center", // Container flex layout - center align for proper vertical alignment
      gap: spacing.gap.md, // "gap-4" - horizontal gap between badge and content
    },
    badge: {
      size: "w-8 h-8", // Badge size (32px × 32px)
      alignment: "", // No offset needed with items-center alignment
      container: "flex-shrink-0 rounded-full flex items-center justify-center",
    },
    content: {
      container: "flex-1 min-w-0", // Content container
      textLineHeight: "leading-relaxed", // Line height for text (~1.625)
    },
  },
} as const;

/**
 * Orb Gradient Colors (Tailwind classes)
 */
export const orbGradients = {
  fetching: "from-gray-500 to-gray-400",
  processing: "from-gray-400 to-gray-500",
  condensing: "from-gray-600 to-gray-500",
  aggregating: "from-gray-400 to-gray-500",
  generating: "from-gray-300 to-gray-500",
  error: "from-gray-700 to-gray-800",
  connected: "from-gray-400 via-gray-300 to-gray-500",
  // Phase 2: Success gradient for completion state
  completed: "from-green-500 via-blue-500 to-purple-500",
} as const;

/**
 * Particle Behavior Types
 */
export type ParticleBehavior = "fly-in" | "spiral" | "orbit" | "flow-down";

/**
 * Get particle behavior for a given status
 */
export function getParticleBehavior(status: string): ParticleBehavior {
  switch (status) {
    case "fetching":
    case "processing":
    case "connected":
      return "fly-in";
    case "condensing":
      return "spiral";
    case "aggregating":
      return "orbit";
    case "generating":
      return "flow-down";
    default:
      return "fly-in";
  }
}

/**
 * Get particle count for a given status
 */
export function getParticleCount(status: string): number {
  return orbParticleCounts[status as keyof typeof orbParticleCounts] ?? 8;
}

/**
 * Get orb gradient for a given status
 */
export function getOrbGradient(status: string): string {
  return orbGradients[status as keyof typeof orbGradients] ?? orbGradients.connected;
}

/**
 * Get orb animation config for a given status
 */
export function getOrbAnimation(status: string) {
  const config = orbAnimations[status as keyof typeof orbAnimations];
  if (!config) {
    return orbAnimations.connected;
  }
  return config;
}

/**
 * Framer Motion Variants (PRD Section 7.1)
 * Centralized animation variants for consistent animations across the app
 */
export const motionVariants = {
  /**
   * Page Transitions (PRD Section 7.1)
   */
  pageVariants: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  
  /**
   * Component Entrance (PRD Section 7.1)
   */
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  },
  
  /**
   * Orb State Transitions (PRD Section 7.1)
   * Note: These are implemented in orbAnimations config above
   * This is a reference mapping to PRD specification
   */
  orbVariants: {
    fetching: { scale: [1, 1.1, 1], rotate: 0 },
    condensing: { scale: [1, 0.7, 1] },
    aggregating: { opacity: [0.8, 1, 0.8] },
    generating: { scale: 1, y: [0, 10, 0] },
  },
} as const;

/**
 * Phase 2: Success Ring Animation Configuration
 */
export const successRingAnimation = {
  duration: 1, // seconds
  scale: [1, 1.1, 1] as [number, number, number],
  opacity: [0.5, 0.8, 0.5] as [number, number, number],
  ease: "easeInOut" as const,
} as const;

/**
 * Header Configuration
 * Used for positioning elements relative to header
 */
export const headerConfig = {
  height: "h-16", // 4rem = 64px (Tailwind class)
  heightPx: 64, // pixels (for calculations)
  zIndex: "z-50", // Above overlays (matches historyConfig.modal.zIndex)
  bannerSpacing: 16, // pixels - spacing between header and banner (1rem = gap-4)
} as const;

/**
 * Task Panel Configuration
 * Centralized configuration for task panel component
 */
export const taskPanelConfig = {
  // Panel dimensions
  panel: {
    maxHeight: "max-h-[40vh]", // Maximum panel height (40% of viewport)
    maxWidth: {
      default: "max-w-md", // Default max width
      sm: "sm:max-w-md", // Small screens
      md: "md:max-w-lg", // Medium screens
      mobile: "max-sm:max-w-none", // Mobile (full width)
    },
  },
  // Panel positioning
  position: {
    badge: {
      bottom: "bottom-24", // Badge bottom position
      right: "right-6", // Badge right position
    },
    panel: {
      bottom: {
        default: "bottom-24", // Default bottom position
        sm: "sm:bottom-24", // Small screens
        mobile: "max-sm:bottom-20", // Mobile bottom position
      },
      right: {
        default: "right-6", // Default right position
        sm: "sm:right-6", // Small screens
        mobile: "max-sm:right-4", // Mobile right position
      },
      left: {
        mobile: "max-sm:left-4", // Mobile left position
      },
    },
  },
  // Badge configuration
  badge: {
    size: "w-12 h-12", // Badge size (48x48px)
    iconSize: 14, // Icon size in pixels for badge content
    errorIndicator: {
      size: "w-3 h-3", // Error indicator dot size
      position: "-top-1 -right-1", // Error indicator position
    },
  },
  // Header configuration
  header: {
    padding: "p-2.5", // Header padding
    titleSize: "text-base", // Title font size
    countSize: "text-xs", // Task count font size
    iconSize: 14, // Network error icon size in pixels
  },
  // Task card configuration
  taskCard: {
    padding: "p-3", // Card padding
    progressBar: {
      height: "h-1.5", // Progress bar height
    },
    iconSizes: {
      status: 14, // Status icon size in pixels
      error: 12, // Error icon size in pixels
      cancel: 16, // Cancel button icon size in pixels
    },
  },
  // Animation configuration
  animation: {
    // Panel slide animation (spring)
    panelSlide: {
      type: "spring" as const,
      damping: 25,
      stiffness: 200,
    },
    // Card animation
    card: {
      duration: 0.2, // Card animation duration in seconds
    },
    // Progress bar animation
    progressBar: {
      duration: 0.3, // Progress bar animation duration in seconds
      ease: "easeOut" as const,
    },
  },
  // Focus management
  focus: {
    delay: 100, // Delay in milliseconds before focusing panel after expansion
  },
  // Session storage key
  sessionStorage: {
    expandedKey: "taskPanelExpanded", // Key for storing expanded state
  },
} as const;

/**
 * Z-Index Layers
 * Centralized z-index values for consistent layering
 */
export const zIndex = {
  floatingActionButton: "z-[60]", // Floating action button (above all other UI elements)
  header: "z-50", // Header (matches historyConfig.modal.zIndex)
  modal: "z-50", // Modals (matches historyConfig.modal.zIndex)
  taskPanel: "z-50", // Task panel when expanded
  taskPanelBackdrop: "z-40", // Task panel backdrop (below panel)
  overlay: "z-40", // Processing/Error overlays (below header)
  banner: "z-30", // Connection status banner (below header, above content)
  content: "z-10", // Regular content
} as const;

/**
 * History/Grid Configuration
 */
export const historyConfig = {
  // Grid layout (Tailwind classes)
  grid: {
    mobile: "grid-cols-1",
    tablet: "md:grid-cols-2",
    desktop: "lg:grid-cols-3",
    gap: spacing.gap.md, // "gap-4"
  },
  // Card hover effects
  cardHover: {
    scale: 1.02,
    tapScale: 0.98,
    transitionDuration: 0.2,
  },
  // Thumbnail sizes (in pixels)
  thumbnail: {
    height: 64, // h-16
    width: 112, // w-28
    borderRadius: borderRadius.md, // "rounded"
    objectFit: "object-cover", // Tailwind class
    objectPosition: "object-top", // Align thumbnail to top vertically
  },
  // Modal configuration
  modal: {
    overlay: colors.background.overlay, // "bg-theme-bg-secondary"
    maxWidth: "max-w-4xl",
    padding: spacing.padding.md, // Use config spacing for consistency
    maxHeight: "max-h-[90vh]", // Prevent modal from exceeding viewport height
    animationDuration: animationDurations.pageTransition, // 0.3 seconds
    zIndex: "z-50", // Z-index for modal and backdrop
    backdropBlur: "backdrop-blur-sm", // Backdrop blur effect
  },
  // Pagination
  pagination: {
    gap: spacing.gap.sm, // "gap-2"
  },
} as const;

/**
 * Tooltip Configuration
 * Centralized configuration for tooltip styling, positioning, and animations
 */
export const tooltipConfig = {
  // Colors (Tailwind classes)
  colors: {
    background: colors.background.gray900, // "bg-gray-900"
    border: colors.border.gray700, // "border-gray-700"
    text: colors.text.gray200, // "text-gray-200"
    pointerBackground: colors.background.gray900, // "bg-gray-900" - for pointer fill
    pointerBorder: colors.border.gray700, // "border-gray-700" - for pointer border
  },
  // Spacing (Tailwind classes)
  spacing: {
    padding: "px-4 py-3", // Tooltip content padding - refined for better spacing
    contentGap: "gap-3", // Gap between icon and content
    sideOffset: 16, // Distance from target element (pixels) - increased to prevent overlap
    defaultSideOffset: 4, // Default Radix UI sideOffset (pixels)
  },
  // Pointer/Arrow configuration
  pointer: {
    size: 8, // Pointer size in pixels (border width)
    offset: 8, // Pointer offset from bubble edge (pixels)
    borderOffset: 9, // Pointer border offset for layered effect (pixels)
    // Complete Tailwind class strings for pointer colors (must be complete class names for Tailwind)
    colors: {
      right: {
        background: "border-r-gray-900",
        border: "border-r-gray-700",
      },
      left: {
        background: "border-l-gray-900",
        border: "border-l-gray-700",
      },
      top: {
        background: "border-t-gray-900",
        border: "border-t-gray-700",
      },
      bottom: {
        background: "border-b-gray-900",
        border: "border-b-gray-700",
      },
    },
  },
  // Z-index
  zIndex: zIndex.modal, // "z-50" - Same as modals
  // Shadow
  shadow: shadows.card, // "shadow-lg"
  // Border radius
  borderRadius: borderRadius.sm, // "rounded-md"
  // Max width
  maxWidth: "max-w-sm", // Tailwind class
  // Animation configuration
  animation: {
    // Framer Motion animation values
    scale: {
      initial: 0.95,
      animate: 1,
    },
    slide: {
      horizontal: 20, // pixels for left/right slide
      vertical: 10, // pixels for top/bottom slide
    },
    // Animation duration (seconds)
    duration: animationDurations.pageTransition, // 0.3 seconds
    // Easing
    ease: "easeOut" as const,
  },
} as const;

/**
 * Masonry Layout Configuration
 * Pinterest-inspired responsive masonry grid layout
 */
export const masonryConfig = {
  breakpoints: {
    default: 4,
    xl: 4, // >1280px
    lg: 3, // 1024-1280px
    md: 2, // 640-1024px
    sm: 1, // <640px
  },
  gaps: {
    desktop: 20,
    tablet: 16,
    mobile: 12,
  },
  thumbnailRotation: {
    interval: 4000, // 4 seconds per thumbnail
    transitionDuration: 800, // 800ms fade
    maxThumbnails: 6, // Limit thumbnails per card
    pauseOnHover: true,
  },
  card: {
    minHeight: 280,
    borderRadius: '12px',
    shadow: {
      default: '0 8px 32px rgba(0, 0, 0, 0.15)',
      hover: '0 12px 40px rgba(0, 0, 0, 0.2)',
    },
    hover: {
      scale: 1.02,
      y: -4,
      duration: 0.2,
    },
    tap: {
      scale: 0.98,
    },
  },
  glassEffect: {
    background: {
      light: 'rgba(255, 255, 255, 0.95)',
      dark: 'rgba(0, 0, 0, 0.85)',
    },
    blur: {
      default: '12px',
      hover: '16px',
    },
    border: {
      light: 'rgba(255, 255, 255, 0.2)',
      dark: 'rgba(255, 255, 255, 0.1)',
    },
  },
  gradient: {
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.75) 100%)',
    fallback: {
      light: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      dark: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
    },
  },
  cardSizes: {
    small: {
      columns: 1,
      rows: 2,  // 2 × 140px = 280px
      minHeight: 280,
      maxHeight: 300,
    },
    medium: {
      columns: 1,
      rows: 3,  // 3 × 140px = 420px
      minHeight: 380,
      maxHeight: 440,
    },
    wide: {
      columns: 2,
      rows: 2,  // 2 columns × 2 rows = 280px tall
      minHeight: 280,
      maxHeight: 300,
    },
    tall: {
      columns: 1,
      rows: 4,  // 4 × 140px = 560px
      minHeight: 520,
      maxHeight: 600,
    },
    // Keeping large for backwards compatibility but not used
    large: {
      columns: 2,
      rows: 2,
      minHeight: 280,
      maxHeight: 320,
    },
  },
  sizeDistribution: {
    small: 0.50,   // 50% - base cards
    medium: 0.30,  // 30% - slightly taller
    wide: 0.15,    // 15% - horizontal variety
    tall: 0.05,    // 5% - vertical accent
  },
  textOverlay: {
    gradient: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.5) 60%, transparent 100%)',
    padding: {
      horizontal: 20,
      vertical: 16,
    },
    title: {
      fontSize: { base: 17, large: 19 },
      fontWeight: 700,
      lineClamp: { small: 2, medium: 2, wide: 2, tall: 3, large: 3 },
    },
    metadata: {
      fontSize: 13,
      opacity: 0.9,
    },
  },
} as const;

/**
 * Source Videos List Configuration
 * Centralized configuration for source videos display component
 */
export const sourceVideosConfig = {
  // Container spacing
  container: {
    marginBottom: spacing.margin.lg, // "mb-6"
  },
  
  // Heading styles
  heading: {
    fontSize: typography.fontSize.xl, // "text-xl"
    fontWeight: typography.fontWeight.semibold, // "font-semibold"
    marginBottom: spacing.margin.sm, // "mb-3"
    color: colors.text.primary, // "text-theme-text-primary"
  },
  
  // Expand/collapse button
  expandButton: {
    fontSize: typography.fontSize.sm, // "text-sm"
    color: colors.text.secondary, // "text-theme-text-secondary"
    hoverColor: "hover:text-theme-text-primary", // Hover state
    gap: spacing.gap.xs, // "gap-1"
    transition: "transition-colors", // Smooth color transition
  },
  
  // Video card container
  card: {
    display: "flex items-start", // Flex layout - items-start aligns thumbnails to top
    gap: spacing.gap.md, // "gap-4"
    borderRadius: borderRadius.lg, // "rounded-lg"
    border: `border ${colors.border.muted}`, // "border border-theme-border-tertiary"
    background: colors.background.tertiary, // "bg-theme-bg-tertiary"
    padding: `${spacing.padding.sm} ${spacing.padding.md}`, // "px-3 py-2"
    spacing: spacing.vertical.xs, // "space-y-1.5" for card container
  },
  
  // Thumbnail configuration (slightly smaller radius than card for nested look)
  thumbnail: {
    flexShrink: 0, // "flex-shrink-0"
    objectFit: "object-cover", // "object-cover"
    objectPosition: "object-top", // "object-top" - aligns thumbnail to top vertically
    borderRadius: borderRadius.md, // "rounded-lg" - smaller than card (rounded-xl)
    height: 64, // pixels (matches historyConfig.thumbnail.height)
    width: 112, // pixels (matches historyConfig.thumbnail.width)
    // Wrapper: slight top padding so thumbnail aligns visually with card left padding (used by SourceVideosList, SelectedVideosList, VideoApprovalCard)
    wrapperClass: "pt-0.5 flex-shrink-0",
  },
  
  // Content area
  content: {
    flex: "flex-1 min-w-0", // "flex-1 min-w-0"
    title: {
      truncate: "truncate", // "truncate"
      fontWeight: typography.fontWeight.medium, // "font-medium"
      color: colors.text.primary, // "text-theme-text-primary"
    },
    channel: {
      fontSize: typography.fontSize.base, // "text-base" - 14px (same as all content)
      color: colors.text.tertiary, // "text-theme-text-tertiary"
    },
    link: {
      marginTop: spacing.marginTop.xs, // "mt-1"
      display: "inline-flex items-center", // "inline-flex items-center"
      gap: spacing.gap.xs, // "gap-1"
      fontSize: typography.fontSize.base, // "text-base" - 14px (same as all content)
      color: colors.text.muted, // "text-theme-text-quaternary"
      hoverColor: markdownConfig.link.hover, // Reuse existing link hover
      transition: "transition-colors", // Smooth color transition
    },
  },
  
  // Fade effect for collapsed state
  fade: {
    height: 40, // pixels
    // Gradient will use CSS variable for theme compatibility
    // background: linear-gradient(to bottom, transparent, var(--theme-bg-card))
  },
  
  // Behavior configuration
  defaultVisibleCount: 3, // Show 3 videos by default when collapsed
} as const;

/**
 * Research Particle System Configuration
 * Centralized configuration for research feature particle animations
 */
export const researchParticleConfig = {
  // Orb configuration
  orb: {
    size: {
      mobile: 60,
      desktop: 80,
    },
    pulseDuration: 2, // seconds
    glowShadow: "0 0 60px rgba(156,163,175,0.5)",
  },
  // Query particle configuration
  queryParticle: {
    size: 12, // pixels
    fadeInDuration: 0.4, // seconds
    moveDuration: {
      min: 1.5,
      max: 2.0,
    },
    staggerDelay: 0.2, // seconds between particles
    trailOpacity: 0.2,
  },
  // Video particle configuration
  videoParticle: {
    /** Separator for composite list key (video_id + separator + index) to avoid duplicate React keys */
    compositeKeySeparator: '-',
    thumbnailSize: {
      width: 40,
      height: 30,
    },
    thumbnail: {
      objectFit: "object-cover", // Tailwind class
      objectPosition: "object-top", // Tailwind class - aligns thumbnail to top vertically
    },
    orbitRadius: {
      min: 80,
      max: 140,
      step: 20,
    },
    orbitSpeed: {
      min: 20,
      max: 30,
      step: 5,
    },
    fadeInDuration: 0.3,
    scaleRange: {
      selected: [1, 1.2],
      unselected: [1, 0.8],
    },
    transitionDurations: {
      scale: 0.5, // seconds for scale transitions
      opacity: 0.8, // seconds for opacity transitions
    },
  },
  // Phase colors (Tailwind classes for gradients)
  phaseColors: {
    generating_queries: {
      particle: "bg-cyan-400",
      text: "text-cyan-300",
      orb: "from-cyan-500 to-cyan-400",
      glow: "shadow-cyan-400/50",
    },
    searching_videos: {
      particle: "bg-purple-400",
      text: "text-purple-300",
      orb: "from-purple-500 to-purple-400",
      glow: "shadow-purple-400/50",
    },
    filtering_videos: {
      particle: "bg-green-400",
      text: "text-green-300",
      orb: "from-green-500 to-green-400",
      glow: "shadow-green-400/50",
    },
    generating_summary: {
      particle: "bg-yellow-400",
      text: "text-yellow-300",
      orb: "from-yellow-400 to-white",
      glow: "shadow-yellow-400/50",
    },
  },
  // Performance limits
  maxVisibleParticles: {
    queries: 20,
    videos: 30,
  },
  // Phase 7: Loading states and animations
  loading: {
    // Skeleton loader configuration
    skeleton: {
      shimmerDuration: 1.5, // seconds for shimmer animation
      shimmerDelay: 0.1, // delay between skeleton items
      particleSkeleton: {
        count: 5, // number of skeleton particles to show
        size: 12, // size of skeleton particles
        spacing: 40, // spacing between skeleton particles
      },
    },
    // Performance monitoring
    performance: {
      targetFPS: 60,
      frameTimeThreshold: 16.67, // milliseconds (1000ms / 60fps)
      monitoringInterval: 1000, // check performance every second
      enableLogging: false, // set to true for debugging
    },
  },
  // Phase 7: Enhanced animation timing
  animationTiming: {
    particleFadeIn: 0.4, // seconds
    particleMove: {
      min: 1.5,
      max: 2.0,
    },
    stateTransition: 0.3, // seconds for state changes
    pageTransition: animationDurations.pageTransition,
    cardShimmer: 1.5, // seconds for card shimmer effect
  },
} as const;

/**
 * Table of Contents Configuration
 * Centralized configuration for TOC component styling, dimensions, and behavior
 */
export const tocConfig = {
  // Dimensions
  width: {
    desktop: "280px",
    tablet: "240px",
    mobile: "100%",
  },
  // Spacing
  padding: {
    container: "pe-4", // padding-end
    item: "py-1.5", // vertical padding per item
    nested: {
      1: "ps-3", // H1 base
      2: "ps-3", // H2 base (or ps-6 if nested)
      3: "ps-6", // H3
      4: "ps-9", // H4
      5: "ps-12", // H5
      6: "ps-15", // H6
    },
  },
  // Typography
  fontSize: "text-sm",
  // Colors (reuse existing theme)
  colors: {
    text: colors.text.tertiary, // "text-theme-text-tertiary"
    textActive: colors.text.primary, // "text-theme-text-primary"
    border: colors.border.muted, // "border-theme-border-tertiary"
    indicator: colors.text.primary, // "text-theme-text-primary"
  },
  // Animation
  animation: {
    entrance: {
      duration: animationDurations.sidebarSlideIn, // 0.3s
      ease: "easeOut" as const,
    },
    exit: {
      duration: animationDurations.sidebarSlideOut, // 0.4s
      ease: "easeIn" as const,
    },
    indicator: {
      duration: animationDurations.pageTransition, // 0.3s
    },
  },
  // Scroll behavior
  scroll: {
    behavior: "smooth" as const,
    block: "start" as const,
    offset: 0, // Offset from top when scrolling
  },
} as const;
