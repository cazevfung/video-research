# Style Update PRD
## Design System Modernization Based on Reference Implementation

**Version:** 1.0  
**Date:** 2024  
**Status:** Draft  
**Author:** Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Design System Architecture](#design-system-architecture)
4. [Color System](#color-system)
5. [Typography System](#typography-system)
6. [Implementation Plan](#implementation-plan)
7. [Migration Strategy](#migration-strategy)
8. [Testing & Validation](#testing--validation)
9. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

This PRD outlines a comprehensive style system update to modernize the application's design system. The update is inspired by a sophisticated reference implementation that uses advanced CSS features, semantic color systems, and a hierarchical opacity-based design approach.

### Key Objectives

1. **Implement a semantic color system** using CSS custom properties with hierarchical opacity layers
2. **Adopt modern CSS features** including `color-mix()` for dynamic color generation
3. **Establish a comprehensive typography scale** with consistent font sizing and weights
4. **Create a dual-mode color system** supporting both light and dark themes
5. **Improve design consistency** through standardized spacing, borders, and UI element styling

### Benefits

- **Better maintainability**: Centralized color and typography definitions
- **Improved accessibility**: Semantic color system with proper contrast ratios
- **Enhanced flexibility**: Easy theme switching and customization
- **Modern aesthetics**: Sophisticated color mixing and opacity layering
- **Developer experience**: Clear naming conventions and reusable design tokens

---

## Current State Analysis

### Existing Implementation

The current frontend uses:
- **Tailwind CSS** with basic configuration
- **Minimal CSS variables**: Only `--background` and `--foreground`
- **Google Sans font**: System font fallback
- **Monochrome gray palette**: True neutral colors (no blue tint)
- **Dark mode only**: Hardcoded dark theme
- **Basic color system**: Direct Tailwind classes without semantic abstraction

### Limitations

1. **No semantic color system**: Colors are hardcoded in components
2. **Limited opacity variations**: No systematic approach to transparency
3. **No light mode support**: Dark mode only
4. **Inconsistent typography**: No standardized font size scale
5. **No color-mix support**: Missing modern CSS color mixing capabilities
6. **Limited design tokens**: Minimal CSS variable infrastructure

---

## Design System Architecture

### Core Principles

1. **Semantic Naming**: Colors named by purpose, not appearance
2. **Hierarchical Opacity**: Primary → Secondary → Tertiary → Quaternary
3. **Dual Variants**: Transparent and opaque versions of each color
4. **Theme-Aware**: Automatic adaptation to light/dark modes
5. **Accessibility First**: WCAG AA compliant contrast ratios

### System Structure

```
Design System
├── Color System
│   ├── Base Colors (bg, fg, card)
│   ├── Text Colors (primary, secondary, tertiary, quaternary)
│   ├── Background Colors (primary, secondary, tertiary, quaternary)
│   ├── Border Colors (strong, primary, secondary, tertiary, quaternary)
│   ├── Status Colors (success, warning, error, info)
│   └── UI Element Colors (button, input, tooltip, etc.)
├── Typography System
│   ├── Font Families
│   ├── Font Sizes
│   ├── Font Weights
│   └── Line Heights
└── Spacing & Layout
    ├── Spacing Scale
    ├── Border Radius
    └── Component Sizes
```

---

## Color System

### Base Color Palette

#### Dark Mode Base Colors
```css
--color-theme-bg: #14120B;           /* Warm dark brown background */
--color-theme-fg: #EDECEC;           /* Light beige foreground */
--color-theme-fg-02: #D7D6D5;        /* Slightly darker beige */
--color-theme-bg-card: #1b1a15;      /* Card background */
--color-theme-bg-card-hover: #262622; /* Card hover state */
```

#### Light Mode Base Colors
```css
--color-theme-bg: #F7F7F4;           /* Off-white background */
--color-theme-fg: #26251E;           /* Dark brown foreground */
--color-theme-fg-02: #3B3A33;        /* Slightly lighter brown */
--color-theme-bg-card: #F2F1ED;      /* Card background */
--color-theme-bg-card-hover: #E8E7E2; /* Card hover state */
```

### Text Color Hierarchy

Using `color-mix()` for opacity-based text colors:

```css
/* Primary Text - Full opacity */
--color-theme-text-primary: var(--color-theme-fg);

/* Secondary Text - 60% opacity */
--color-theme-text-secondary: color-mix(in oklab, var(--color-theme-fg) 60%, transparent);
--color-theme-text-secondary-opaque: color-mix(in oklab, var(--color-theme-fg) 60%, var(--color-theme-bg-card));

/* Tertiary Text - 40% opacity */
--color-theme-text-tertiary: color-mix(in oklab, var(--color-theme-fg) 40%, transparent);
--color-theme-text-tertiary-opaque: color-mix(in oklab, var(--color-theme-fg) 40%, var(--color-theme-bg-card));

/* Quaternary Text - 20% opacity */
--color-theme-text-quaternary: color-mix(in oklab, var(--color-theme-fg) 20%, transparent);
```

### Background Color Hierarchy

```css
/* Primary Background - 8% opacity */
--color-theme-bg-primary: var(--color-theme-fg);
--color-theme-bg-secondary: color-mix(in oklab, var(--color-theme-fg) 8%, transparent);
--color-theme-bg-secondary-opaque: color-mix(in oklab, var(--color-theme-fg) 8%, var(--color-theme-bg-card));

/* Tertiary Background - 6% opacity */
--color-theme-bg-tertiary: color-mix(in oklab, var(--color-theme-fg) 6%, transparent);
--color-theme-bg-tertiary-opaque: color-mix(in oklab, var(--color-theme-fg) 6%, var(--color-theme-bg-card));

/* Quaternary Background - 2.5% opacity */
--color-theme-bg-quaternary: color-mix(in oklab, var(--color-theme-fg) 2.5%, transparent);
```

### Border Color Hierarchy

```css
/* Strong Border - 80% opacity */
--color-theme-border-strong: color-mix(in oklab, var(--color-theme-fg) 80%, transparent);

/* Primary Border - 12% opacity */
--color-theme-border-primary: color-mix(in oklab, var(--color-theme-fg) 12%, transparent);
--color-theme-border-primary-opaque: color-mix(in oklab, var(--color-theme-border-primary) 100%, var(--color-theme-bg-card));

/* Secondary Border - 8% opacity */
--color-theme-border-secondary: color-mix(in oklab, var(--color-theme-fg) 8%, transparent);
--color-theme-border-secondary-opaque: color-mix(in oklab, var(--color-theme-border-secondary) 100%, var(--color-theme-bg-card));

/* Tertiary Border - 4% opacity */
--color-theme-border-tertiary: color-mix(in oklab, var(--color-theme-fg) 4%, transparent);
--color-theme-border-tertiary-opaque: color-mix(in oklab, var(--color-theme-border-tertiary) 100%, var(--color-theme-bg-card));

/* Quaternary Border - 2.5% opacity */
--color-theme-border-quaternary: color-mix(in oklab, var(--color-theme-fg) 2.5%, transparent);
--color-theme-border-quaternary-opaque: color-mix(in oklab, var(--color-theme-border-quaternary) 100%, var(--color-theme-bg-card));
```

### Status Colors

#### Terminal ANSI Colors (Semantic Status)
```css
--terminal-ansi-green: #96C2AC;      /* Success */
--terminal-ansi-yellow: #ebcb8b;     /* Warning */
--terminal-ansi-red: #bf616a;        /* Error */
--terminal-ansi-blue: #81a1c1;       /* Info */
```

#### Dashboard Status Colors
```css
/* Text Colors */
--dashboard-text-success-primary: var(--terminal-ansi-green);
--dashboard-text-success-secondary: color-mix(in srgb, var(--terminal-ansi-green) 68%, transparent);
--dashboard-text-warning-primary: var(--terminal-ansi-yellow);
--dashboard-text-warning-secondary: color-mix(in srgb, var(--terminal-ansi-yellow) 68%, transparent);
--dashboard-text-error-primary: var(--terminal-ansi-red);
--dashboard-text-error-secondary: color-mix(in srgb, var(--terminal-ansi-red) 68%, transparent);

/* Background Colors */
--dashboard-bg-success-secondary: color-mix(in srgb, var(--terminal-ansi-green) 10%, transparent);
--dashboard-bg-warning-secondary: color-mix(in srgb, var(--terminal-ansi-yellow) 10%, transparent);
--dashboard-bg-error-secondary: color-mix(in srgb, var(--terminal-ansi-red) 10%, transparent);

/* Stroke/Border Colors */
--dashboard-stroke-success-primary: color-mix(in srgb, var(--terminal-ansi-green) 56%, transparent);
--dashboard-stroke-success-secondary: color-mix(in srgb, var(--terminal-ansi-green) 32%, transparent);
--dashboard-stroke-success-tertiary: color-mix(in srgb, var(--terminal-ansi-green) 8%, transparent);
```

### UI Element Colors

```css
/* Buttons */
--color-theme-accent: #F54E00;                    /* Primary accent color (orange) */
--color-theme-button-text: var(--color-theme-text-inverted);
--color-theme-bg-button: var(--color-theme-bg-primary);
--color-theme-bg-button-hover: var(--color-theme-fg-02);
--color-theme-bg-button-disabled: color-mix(in oklab, var(--color-theme-fg) 20%, transparent);
--color-theme-text-button-disabled: var(--color-theme-text-secondary-opaque);

/* Input Fields */
--color-theme-bg-chat-input: var(--color-theme-bg-card);

/* Tooltips */
--color-theme-tooltip-bg: rgb(18, 18, 17);        /* Dark mode */
--color-theme-tooltip-bg: rgb(255, 255, 255);     /* Light mode */

/* Icons */
--color-theme-status-icon: #DDD;                  /* Dark mode */
--color-theme-action-icon: #999;
--color-theme-action-icon-disabled: #555;
```

### Icon Colors (Dashboard)

```css
/* Primary Icon - 92% opacity */
--dashboard-icon-primary: color-mix(in srgb, var(--color-theme-fg) 92%, transparent);

/* Secondary Icon - 60% opacity */
--dashboard-icon-secondary: color-mix(in srgb, var(--color-theme-fg) 60%, transparent);

/* Tertiary Icon - 36% opacity */
--dashboard-icon-tertiary: color-mix(in srgb, var(--color-theme-fg) 36%, transparent);

/* Quaternary Icon - 12% opacity */
--dashboard-icon-quaternary: color-mix(in srgb, var(--color-theme-fg) 12%, transparent);

/* Status Icon Colors */
--dashboard-icon-success-primary: color-mix(in srgb, var(--terminal-ansi-green) 92%, transparent);
--dashboard-icon-warning-primary: color-mix(in srgb, var(--terminal-ansi-yellow) 92%, transparent);
--dashboard-icon-error-primary: color-mix(in srgb, var(--terminal-ansi-red) 92%, transparent);
```

---

## Typography System

### Font Families

#### Primary Font: Cursor Gothic Beta
```css
--font-cursor-gothic-beta: "cursorGothicBeta", sans-serif;
```

**Implementation Notes:**
- Custom font family (may need to source or find alternative)
- Fallback to system sans-serif fonts
- Consider using a similar geometric sans-serif as fallback

#### Monospace Font: JetBrains Mono
```css
--font-jetbrains-mono: "JetBrains Mono", monospace;
```

**Current Implementation:**
- Already using JetBrains Mono via Next.js font loading
- Keep existing implementation

### Font Smoothing

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

### Font Size Scale

Reference implementation uses a custom scale:

```css
--text-xs: 0.75rem;      /* 12px */
--text-base: 1rem;       /* 16px */
--text-md: 1.375rem;     /* 22px */
--text-lg: 2.25rem;      /* 36px */
--text-xl: 3.25rem;      /* 52px */
--text-2xl: 4.5rem;      /* 72px */
```

**Alternative Scale (More Standard):**
```css
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */
--text-6xl: 3.75rem;     /* 60px */
```

**Recommendation:** Use standard Tailwind scale for better compatibility, but add custom sizes for hero/display text.

### Font Weights

```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-bold: 700;
```

### Font Width (Variable Font Support)

```css
--font-width-normal: 4.7;
```

**Note:** This is for variable fonts. May not be applicable if using static fonts.

### Line Height

Standard line heights:
- `1.5` (default)
- Use Tailwind's line-height utilities: `leading-none`, `leading-tight`, `leading-normal`, `leading-relaxed`, `leading-loose`

---

## Implementation Plan

### Phase 1: CSS Variable Infrastructure

#### 1.1 Create Base CSS Variables File

**File:** `frontend/src/styles/variables.css`

```css
:root {
  /* Base Colors - Light Mode */
  --color-theme-bg: #F7F7F4;
  --color-theme-fg: #26251E;
  --color-theme-fg-02: #3B3A33;
  --color-theme-bg-card: #F2F1ED;
  --color-theme-bg-card-hover: #E8E7E2;
  
  /* Text Colors */
  --color-theme-text-primary: var(--color-theme-fg);
  --color-theme-text-secondary: color-mix(in oklab, var(--color-theme-fg) 60%, transparent);
  --color-theme-text-tertiary: color-mix(in oklab, var(--color-theme-fg) 40%, transparent);
  --color-theme-text-quaternary: color-mix(in oklab, var(--color-theme-fg) 20%, transparent);
  
  /* Background Colors */
  --color-theme-bg-primary: var(--color-theme-fg);
  --color-theme-bg-secondary: color-mix(in oklab, var(--color-theme-fg) 8%, transparent);
  --color-theme-bg-tertiary: color-mix(in oklab, var(--color-theme-fg) 6%, transparent);
  --color-theme-bg-quaternary: color-mix(in oklab, var(--color-theme-fg) 2.5%, transparent);
  
  /* Border Colors */
  --color-theme-border-strong: color-mix(in oklab, var(--color-theme-fg) 80%, transparent);
  --color-theme-border-primary: color-mix(in oklab, var(--color-theme-fg) 12%, transparent);
  --color-theme-border-secondary: color-mix(in oklab, var(--color-theme-fg) 8%, transparent);
  --color-theme-border-tertiary: color-mix(in oklab, var(--color-theme-fg) 4%, transparent);
  --color-theme-border-quaternary: color-mix(in oklab, var(--color-theme-fg) 2.5%, transparent);
  
  /* Status Colors */
  --terminal-ansi-green: #96C2AC;
  --terminal-ansi-yellow: #ebcb8b;
  --terminal-ansi-red: #bf616a;
  --terminal-ansi-blue: #81a1c1;
  
  /* UI Element Colors */
  --color-theme-accent: #F54E00;
  --color-theme-bg-button: var(--color-theme-bg-primary);
  --color-theme-bg-button-hover: var(--color-theme-fg-02);
  --color-theme-bg-chat-input: var(--color-theme-bg-card);
  
  /* Typography */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  
  /* Spacing */
  --navbar-height: 2.75rem;
}

:root.dark {
  /* Base Colors - Dark Mode */
  --color-theme-bg: #14120B;
  --color-theme-fg: #EDECEC;
  --color-theme-fg-02: #D7D6D5;
  --color-theme-bg-card: #1b1a15;
  --color-theme-bg-card-hover: #262622;
  
  /* UI Element Colors - Dark Mode */
  --color-theme-tooltip-bg: rgb(18, 18, 17);
  --color-theme-status-icon: #DDD;
  --color-theme-action-icon: #999;
  --color-theme-action-icon-disabled: #555;
}

/* Fallback for browsers without color-mix support */
@supports not (color: color-mix(in oklab, red, blue)) {
  :root {
    --color-theme-text-secondary: rgba(38, 37, 30, 0.6);
    --color-theme-text-tertiary: rgba(38, 37, 30, 0.4);
    --color-theme-text-quaternary: rgba(38, 37, 30, 0.2);
    /* Add more fallbacks as needed */
  }
  
  :root.dark {
    --color-theme-text-secondary: rgba(237, 236, 236, 0.6);
    --color-theme-text-tertiary: rgba(237, 236, 236, 0.4);
    --color-theme-text-quaternary: rgba(237, 236, 236, 0.2);
  }
}
```

#### 1.2 Update Tailwind Configuration

**File:** `frontend/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme colors using CSS variables
        theme: {
          bg: "var(--color-theme-bg)",
          fg: "var(--color-theme-fg)",
          "fg-02": "var(--color-theme-fg-02)",
          "bg-card": "var(--color-theme-bg-card)",
          "bg-card-hover": "var(--color-theme-bg-card-hover)",
          // Text colors
          "text-primary": "var(--color-theme-text-primary)",
          "text-secondary": "var(--color-theme-text-secondary)",
          "text-tertiary": "var(--color-theme-text-tertiary)",
          "text-quaternary": "var(--color-theme-text-quaternary)",
          // Background colors
          "bg-primary": "var(--color-theme-bg-primary)",
          "bg-secondary": "var(--color-theme-bg-secondary)",
          "bg-tertiary": "var(--color-theme-bg-tertiary)",
          "bg-quaternary": "var(--color-theme-bg-quaternary)",
          // Border colors
          "border-strong": "var(--color-theme-border-strong)",
          "border-primary": "var(--color-theme-border-primary)",
          "border-secondary": "var(--color-theme-border-secondary)",
          "border-tertiary": "var(--color-theme-border-tertiary)",
          "border-quaternary": "var(--color-theme-border-quaternary)",
          // Status colors
          "status-success": "var(--terminal-ansi-green)",
          "status-warning": "var(--terminal-ansi-yellow)",
          "status-error": "var(--terminal-ansi-red)",
          "status-info": "var(--terminal-ansi-blue)",
          // UI element colors
          accent: "var(--color-theme-accent)",
          "bg-button": "var(--color-theme-bg-button)",
          "bg-button-hover": "var(--color-theme-bg-button-hover)",
          "bg-chat-input": "var(--color-theme-bg-chat-input)",
        },
      },
      fontFamily: {
        sans: ["var(--font-cursor-gothic-beta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      fontWeight: {
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        bold: "var(--font-weight-bold)",
      },
      spacing: {
        "navbar-height": "var(--navbar-height)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography")({
      target: "modern",
    }),
  ],
};

export default config;
```

#### 1.3 Update Global Styles

**File:** `frontend/src/styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import './variables.css';

@layer base {
  * {
    @apply border-theme-border-secondary;
  }
  
  html {
    scroll-behavior: smooth;
    background-color: var(--color-theme-bg);
    color: var(--color-theme-text-primary);
    font-family: var(--font-cursor-gothic-beta), system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  
  body {
    margin: 0;
    line-height: 1.5;
    overscroll-behavior: none;
    background-color: var(--color-theme-bg);
    color: var(--color-theme-text-primary);
  }
}

/* Phase 5: Blink animation for typing cursor */
@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
```

### Phase 2: Font Implementation

#### 2.1 Font Loading Strategy

**Option A: Use System Font Stack (Recommended for MVP)**
- Use a similar geometric sans-serif as primary font
- Fallback to system fonts for performance

**Option B: Load Custom Font**
- Source Cursor Gothic Beta font files
- Add to `public/fonts/` directory
- Use Next.js `next/font/local` for loading

**Option C: Use Similar Google Font**
- Consider Inter, Poppins, or Work Sans as alternatives
- Load via Next.js `next/font/google`

**Recommendation:** Start with Option A or C, migrate to Option B if custom font is available.

#### 2.2 Update Layout

**File:** `frontend/src/app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Inter } from "next/font/google"; // Or chosen alternative
import "@/styles/globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-cursor-gothic-beta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YouTube Batch Summary Service",
  description: "Turn hours of video into minutes of reading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${jetbrainsMono.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

### Phase 3: Component Migration

#### 3.1 Update Visual Effects Config

**File:** `frontend/src/config/visual-effects.ts`

Update to use new CSS variables:

```typescript
export const colors = {
  background: {
    primary: "bg-theme-bg",
    secondary: "bg-theme-bg-card",
    tertiary: "bg-theme-bg-tertiary",
    overlay: "bg-theme-bg-secondary",
  },
  text: {
    primary: "text-theme-text-primary",
    secondary: "text-theme-text-secondary",
    tertiary: "text-theme-text-tertiary",
    muted: "text-theme-text-quaternary",
    inverse: "text-theme-bg",
  },
  border: {
    default: "border-theme-border-primary",
    focus: "border-theme-border-strong",
    muted: "border-theme-border-tertiary",
  },
  status: {
    success: "text-theme-status-success",
    error: "text-theme-status-error",
    warning: "text-theme-status-warning",
    info: "text-theme-status-info",
  },
  // ... rest of config
} as const;
```

#### 3.2 Component Updates

Update components to use new Tailwind classes:

**Example: Button Component**
```typescript
// Before
className="bg-gray-900 text-gray-100 hover:bg-gray-800"

// After
className="bg-theme-bg-button text-theme-button-text hover:bg-theme-bg-button-hover"
```

**Example: Card Component**
```typescript
// Before
className="bg-gray-900 border-gray-700"

// After
className="bg-theme-bg-card border-theme-border-primary hover:bg-theme-bg-card-hover"
```

### Phase 4: Light Mode Support

#### 4.1 Theme Toggle Component

Create a theme toggle component:

**File:** `frontend/src/components/ui/ThemeToggle.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-theme-bg-card hover:bg-theme-bg-card-hover"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

#### 4.2 Update Layout

**File:** `frontend/src/app/layout.tsx`

Remove hardcoded `dark` class, let theme toggle control it:

```typescript
<html lang="en" suppressHydrationWarning>
```

---

## Migration Strategy

### Step-by-Step Migration

1. **Week 1: Infrastructure Setup**
   - Create CSS variables file
   - Update Tailwind config
   - Update global styles
   - Test CSS variable loading

2. **Week 2: Font Implementation**
   - Choose and implement font solution
   - Update layout with font loading
   - Test font rendering across browsers

3. **Week 3: Component Migration**
   - Update visual-effects config
   - Migrate core components (Button, Card, Input)
   - Update dashboard components
   - Test component styling

4. **Week 4: Light Mode & Polish**
   - Implement theme toggle
   - Test light/dark mode switching
   - Accessibility audit
   - Performance optimization

### Backward Compatibility

- Keep existing Tailwind classes working during migration
- Gradually replace old classes with new semantic classes
- Maintain existing component APIs
- Add deprecation warnings for old color classes

### Rollback Plan

- Keep old CSS variables as fallbacks
- Maintain old Tailwind config alongside new
- Feature flag for new design system
- Easy revert via Git if issues arise

---

## Testing & Validation

### Visual Testing

1. **Component Library Review**
   - Verify all components render correctly
   - Check color contrast ratios
   - Validate spacing and typography

2. **Cross-Browser Testing**
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari
   - Test `color-mix()` fallbacks

3. **Responsive Testing**
   - Mobile (320px - 768px)
   - Tablet (768px - 1024px)
   - Desktop (1024px+)

### Accessibility Testing

1. **Color Contrast**
   - WCAG AA compliance (4.5:1 for text)
   - WCAG AAA where possible (7:1 for text)
   - Test all text/background combinations

2. **Keyboard Navigation**
   - Focus indicators visible
   - Proper tab order
   - Accessible color for focus states

3. **Screen Reader Testing**
   - Semantic HTML structure
   - ARIA labels where needed
   - Proper heading hierarchy

### Performance Testing

1. **CSS Load Time**
   - Measure CSS file size
   - Check critical CSS extraction
   - Optimize unused CSS

2. **Font Loading**
   - Test font display strategy
   - Check FOUT/FOIT behavior
   - Optimize font subset loading

3. **Runtime Performance**
   - Check CSS variable performance
   - Test theme switching speed
   - Verify no layout shifts

---

## Timeline & Milestones

### Milestone 1: CSS Variable Infrastructure (Week 1)
- ✅ CSS variables file created
- ✅ Tailwind config updated
- ✅ Global styles updated
- ✅ Basic color system working

### Milestone 2: Typography System (Week 2)
- ✅ Font loading implemented
- ✅ Font size scale defined
- ✅ Typography utilities working

### Milestone 3: Component Migration (Week 3)
- ✅ Core components migrated
- ✅ Dashboard components updated
- ✅ Visual effects config updated

### Milestone 4: Light Mode & Polish (Week 4)
- ✅ Theme toggle implemented
- ✅ Light mode tested
- ✅ Accessibility audit complete
- ✅ Documentation updated

---

## Success Metrics

### Design System Adoption
- 100% of components using new color system
- Zero hardcoded color values
- Consistent spacing across all components

### Performance
- CSS file size < 50KB (gzipped)
- Font loading < 200ms
- Theme switching < 50ms

### Accessibility
- WCAG AA compliance for all text
- Keyboard navigation working
- Screen reader compatible

### Developer Experience
- Clear documentation
- Easy theme customization
- Intuitive class naming

---

## Future Enhancements

### Potential Additions

1. **Additional Color Variants**
   - Brand color variations
   - Seasonal themes
   - High contrast mode

2. **Advanced Typography**
   - Variable font support
   - Custom font features
   - Text effects (gradients, shadows)

3. **Animation System**
   - Standardized transitions
   - Micro-interactions
   - Loading states

4. **Component Variants**
   - Size variants (sm, md, lg)
   - Style variants (outlined, filled, ghost)
   - State variants (default, hover, active, disabled)

---

## Appendix

### Browser Support

**CSS `color-mix()` Support:**
- Chrome 111+
- Firefox 113+
- Safari 16.4+
- Edge 111+

**Fallback Strategy:**
- Use `rgba()` fallbacks for older browsers
- Provide opaque color variants
- Test in older browsers

### Color Palette Reference

**Dark Mode:**
- Background: #14120B (warm dark brown)
- Foreground: #EDECEC (light beige)
- Card: #1b1a15 (slightly lighter brown)
- Accent: #F54E00 (orange)

**Light Mode:**
- Background: #F7F7F4 (off-white)
- Foreground: #26251E (dark brown)
- Card: #F2F1ED (slightly darker beige)
- Accent: #F54E00 (orange)

### Font Alternatives

If Cursor Gothic Beta is not available:
1. **Inter** - Modern, geometric sans-serif
2. **Poppins** - Friendly, rounded sans-serif
3. **Work Sans** - Professional, clean sans-serif
4. **DM Sans** - Versatile, readable sans-serif

---

## Conclusion

This PRD outlines a comprehensive design system update that will modernize the application's styling approach. By implementing semantic color systems, modern CSS features, and a robust typography system, we'll create a more maintainable, accessible, and visually appealing application.

The phased approach ensures minimal disruption while gradually improving the design system. Regular testing and validation will ensure quality and accessibility throughout the implementation process.

---

**Document Status:** Ready for Review  
**Next Steps:** Review PRD, approve implementation plan, begin Phase 1

