/**
 * Citation System Configuration
 * Phase 3: Centralized configuration for citation system
 * All values are configurable via environment variables with sensible defaults
 * No hardcoded values - all configs come from here or environment variables
 */

/**
 * Citation badge styling configuration
 * Configurable via environment variables
 */
export const citationBadgeConfig = {
  /**
   * Badge sizing - Perfect circle design
   * Diameter sized to accommodate 2-digit numbers (e.g., "99")
   * Configurable via NEXT_PUBLIC_CITATION_BADGE_DIAMETER
   */
  sizing: {
    diameter: parseInt(
      process.env.NEXT_PUBLIC_CITATION_BADGE_DIAMETER || '18',
      10
    ), // pixels - diameter for perfect circle (accommodates 2-digit numbers)
    marginX: parseInt(
      process.env.NEXT_PUBLIC_CITATION_BADGE_MARGIN_X || '2',
      10
    ), // pixels
  },
  /**
   * Badge typography
   */
  typography: {
    fontSize: parseInt(
      process.env.NEXT_PUBLIC_CITATION_BADGE_FONT_SIZE || '9',
      10
    ), // pixels
    fontWeight: parseInt(
      process.env.NEXT_PUBLIC_CITATION_BADGE_FONT_WEIGHT || '600',
      10
    ), // CSS font-weight value
  },
  /**
   * Badge colors (Tailwind classes)
   * Gray colors: light gray in light mode, dark gray in dark mode
   * These use theme-aware colors, not hardcoded values
   */
  colors: {
    // Light mode: light gray background with dark text
    text: 'text-gray-900',
    background: 'bg-gray-300',
    hoverBackground: 'hover:bg-gray-400',
    // Dark mode: dark gray background with light text
    darkText: 'dark:text-gray-100',
    darkBackground: 'dark:bg-gray-600',
    darkHoverBackground: 'dark:hover:bg-gray-500',
  },
  /**
   * Badge animations
   */
  animations: {
    hoverTranslateY: parseInt(
      process.env.NEXT_PUBLIC_CITATION_BADGE_HOVER_TRANSLATE_Y || '-1',
      10
    ), // pixels
    transitionDuration: parseFloat(
      process.env.NEXT_PUBLIC_CITATION_BADGE_TRANSITION_DURATION || '0.15'
    ), // seconds
  },
} as const;

/**
 * Citation tooltip configuration
 */
export const citationTooltipConfig = {
  /**
   * Tooltip dimensions
   */
  dimensions: {
    width: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_WIDTH || '320',
      10
    ), // pixels
    thumbnailWidth: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_THUMBNAIL_WIDTH || '100',
      10
    ), // pixels
    thumbnailHeight: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_THUMBNAIL_HEIGHT || '56',
      10
    ), // pixels
    aspectRatio: '16/9', // Thumbnail aspect ratio
  },
  /**
   * Tooltip thumbnail styling
   */
  thumbnail: {
    objectFit: 'object-cover', // Tailwind class
    objectPosition: 'object-top', // Tailwind class - aligns thumbnail to top vertically
  },
  /**
   * Tooltip spacing
   */
  spacing: {
    padding: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_PADDING || '8',
      10
    ), // pixels - reduced from 12 for cleaner look
    contentPadding: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_CONTENT_PADDING || '8',
      10
    ), // pixels - reduced from 16 for cleaner look
    contentPaddingTop: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_CONTENT_PADDING_TOP || '12',
      10
    ), // pixels - balanced top padding between thumbnail and content
    contentPaddingBottom: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_CONTENT_PADDING_BOTTOM || '12',
      10
    ), // pixels - balanced bottom padding
    contentPaddingX: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_CONTENT_PADDING_X || '12',
      10
    ), // pixels - balanced horizontal padding
    gap: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_GAP || '4',
      10
    ), // pixels - balanced spacing
    verticalGap: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_VERTICAL_GAP || '4',
      10
    ), // pixels - balanced spacing between content elements
    buttonPaddingX: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_BUTTON_PADDING_X || '8',
      10
    ), // pixels - horizontal padding for button
    buttonPaddingY: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_BUTTON_PADDING_Y || '4',
      10
    ), // pixels - vertical padding for button
    buttonMarginTop: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_BUTTON_MARGIN_TOP || '8',
      10
    ), // pixels - balanced margin above button
  },
  /**
   * Tooltip borders
   */
  borders: {
    enabled: process.env.NEXT_PUBLIC_CITATION_TOOLTIP_BORDER_ENABLED === 'true', // Default: false for cleaner look
    width: process.env.NEXT_PUBLIC_CITATION_TOOLTIP_BORDER_WIDTH || '1px',
    color: process.env.NEXT_PUBLIC_CITATION_TOOLTIP_BORDER_COLOR || 'border-gray-200',
    darkColor: process.env.NEXT_PUBLIC_CITATION_TOOLTIP_BORDER_DARK_COLOR || 'dark:border-gray-700',
  },
  /**
   * Tooltip typography
   */
  typography: {
    titleFontSize: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_TITLE_FONT_SIZE || '14',
      10
    ), // pixels
    titleFontWeight: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_TITLE_FONT_WEIGHT || '600',
      10
    ),
    channelFontSize: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_CHANNEL_FONT_SIZE || '12',
      10
    ), // pixels
    metaFontSize: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_META_FONT_SIZE || '11',
      10
    ), // pixels
    actionFontSize: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_ACTION_FONT_SIZE || '13',
      10
    ), // pixels
    titleMaxLines: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_TITLE_MAX_LINES || '2',
      10
    ),
  },
  /**
   * Tooltip colors (Tailwind classes)
   */
  colors: {
    background: 'bg-white',
    darkBackground: 'dark:bg-gray-800',
    title: 'text-gray-900',
    darkTitle: 'dark:text-gray-50',
    channel: 'text-gray-500',
    darkChannel: 'dark:text-gray-400',
    meta: 'text-gray-400',
    darkMeta: 'dark:text-gray-500',
    actionBackground: 'bg-blue-600',
    actionHoverBackground: 'bg-blue-700',
  },
  /**
   * Tooltip animations
   */
  animations: {
    fadeInDuration: parseFloat(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_FADE_IN_DURATION || '0.2'
    ), // seconds
    translateY: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_TRANSLATE_Y || '-8',
      10
    ), // pixels
  },
  /**
   * Tooltip positioning
   */
  positioning: {
    zIndex: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_Z_INDEX || '1000',
      10
    ),
    hoverDelay: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_HOVER_DELAY || '300',
      10
    ), // milliseconds
    sideOffset: parseInt(
      process.env.NEXT_PUBLIC_CITATION_TOOLTIP_SIDE_OFFSET || '8',
      10
    ), // pixels
  },
  /**
   * Tooltip border radius
   */
  borderRadius: parseInt(
    process.env.NEXT_PUBLIC_CITATION_TOOLTIP_BORDER_RADIUS || '12',
    10
  ), // pixels
} as const;

/**
 * Reference list configuration
 */
export const referenceListConfig = {
  /**
   * Reference list spacing
   */
  spacing: {
    marginTop: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_MARGIN_TOP || '32',
      10
    ), // pixels
    paddingTop: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_PADDING_TOP || '24',
      10
    ), // pixels
    itemMarginBottom: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_ITEM_MARGIN_BOTTOM || '8',
      10
    ), // pixels
    itemPadding: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_ITEM_PADDING || '12',
      10
    ), // pixels
    gap: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_GAP || '12',
      10
    ), // pixels
  },
  /**
   * Reference list typography
   */
  typography: {
    headingFontSize: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_HEADING_FONT_SIZE || '18',
      10
    ), // pixels
    headingFontWeight: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_HEADING_FONT_WEIGHT || '700',
      10
    ),
    titleFontSize: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_TITLE_FONT_SIZE || '14',
      10
    ), // pixels
    channelFontSize: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_CHANNEL_FONT_SIZE || '12',
      10
    ), // pixels
    metaFontSize: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_META_FONT_SIZE || '11',
      10
    ), // pixels
  },
  /**
   * Reference list colors (Tailwind classes)
   */
  colors: {
    borderTop: 'border-gray-200',
    darkBorderTop: 'border-gray-700',
    heading: 'text-gray-900',
    darkHeading: 'text-gray-50',
    itemHover: 'bg-gray-100',
    darkItemHover: 'bg-gray-700',
    numberBackground: 'bg-blue-100',
    numberText: 'text-blue-600',
    darkNumberBackground: 'bg-blue-900',
    darkNumberText: 'text-blue-300',
    title: 'text-gray-900',
    darkTitle: 'text-gray-50',
    channel: 'text-gray-500',
    darkChannel: 'text-gray-400',
    meta: 'text-gray-400',
    darkMeta: 'text-gray-500',
  },
  /**
   * Reference list dimensions
   */
  dimensions: {
    numberSize: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_NUMBER_SIZE || '32',
      10
    ), // pixels
    thumbnailWidth: parseInt(
      process.env.NEXT_PUBLIC_REFERENCE_LIST_THUMBNAIL_WIDTH || '120',
      10
    ), // pixels
    thumbnailAspectRatio: '16/9',
  },
  /**
   * Reference list thumbnail styling
   */
  thumbnail: {
    objectFit: 'object-cover', // Tailwind class
    objectPosition: 'object-top', // Tailwind class - aligns thumbnail to top vertically
  },
  /**
   * Reference list border radius
   */
  borderRadius: parseInt(
    process.env.NEXT_PUBLIC_REFERENCE_LIST_BORDER_RADIUS || '6',
    10
  ), // pixels
} as const;

/**
 * Citation parsing configuration
 */
export const citationParsingConfig = {
  /**
   * Regex patterns for citation detection
   * These are compiled regex patterns, not configurable
   */
  patterns: {
    single: /\[(\d+)\]/g, // [1]
    multiple: /\[(\d+(?:\s*,\s*\d+)+)\]/g, // [1, 2, 3]
    range: /\[(\d+)-(\d+)\]/g, // [1-3]
  },
  /**
   * Sources heading detection
   * Configurable via environment variable for localization
   */
  sourcesHeading: {
    en: process.env.NEXT_PUBLIC_CITATION_SOURCES_HEADING_EN || '### Sources',
    'zh-CN': process.env.NEXT_PUBLIC_CITATION_SOURCES_HEADING_ZH_CN || '### 来源',
    'zh-TW': process.env.NEXT_PUBLIC_CITATION_SOURCES_HEADING_ZH_TW || '### 來源',
    es: process.env.NEXT_PUBLIC_CITATION_SOURCES_HEADING_ES || '### Fuentes',
    fr: process.env.NEXT_PUBLIC_CITATION_SOURCES_HEADING_FR || '### Sources',
  },
} as const;

/**
 * Citation interaction configuration
 */
export const citationInteractionConfig = {
  /**
   * Scroll behavior
   */
  scroll: {
    behavior: 'smooth' as const,
    block: 'start' as const,
    offset: parseInt(
      process.env.NEXT_PUBLIC_CITATION_SCROLL_OFFSET || '0',
      10
    ), // pixels
  },
  /**
   * Keyboard navigation
   */
  keyboard: {
    debounceDelay: parseInt(
      process.env.NEXT_PUBLIC_CITATION_KEYBOARD_DEBOUNCE_DELAY || '100',
      10
    ), // milliseconds
  },
} as const;

/**
 * Citation system configuration export
 */
export const citationConfig = {
  badge: citationBadgeConfig,
  tooltip: citationTooltipConfig,
  referenceList: referenceListConfig,
  parsing: citationParsingConfig,
  interaction: citationInteractionConfig,
} as const;
