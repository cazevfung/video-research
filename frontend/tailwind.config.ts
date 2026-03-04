import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/config/**/*.{js,ts}",
  ],
  safelist: [
    // Border Radius
    'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full',
    // Padding
    'p-4', 'p-6', 'px-1', 'py-0.5', 'px-3', 'py-2', 'px-4', 'py-3', 'md:p-6',
    'pt-2', 'pt-4', 'pt-6', 'pt-8', 'pt-16',
    // Margin
    'mb-2', 'mb-3', 'mb-4', 'mb-6', 'mb-8',
    'mt-0.5', 'mt-1', 'mt-2', 'mt-4', 'mt-6',
    'mx-0.5', 'mx-1', 'mx-2', 'mx-4',
    // Gap
    'gap-1', 'gap-2', 'gap-4', 'gap-6',
    // Spacing
    'space-y-1', 'space-y-1.5', 'space-y-2', 'space-y-4',
    // Icon sizes
    'h-3', 'w-3', 'h-4', 'w-4', 'h-5', 'w-5', 'h-6', 'w-6', 'h-8', 'w-8',
    'h-9', 'w-9', 'h-10', 'w-10', 'h-11', 'w-11', 'h-16',
    // Button sizes
    'px-8',
    // Z-index
    'z-10', 'z-30', 'z-40', 'z-50',
    // Max widths
    'max-w-4xl', 'max-w-7xl',
    // Grid
    'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3',
    // Typography
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
    'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl',
    'font-normal', 'font-medium', 'font-semibold', 'font-bold',
    'leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose',
    // Container padding
    'py-8', 'px-4', 'sm:px-6', 'lg:px-8',
    // Shadow
    'shadow-lg', 'shadow-sm',
    // Focus rings
    'focus:ring-2', 'focus:ring-offset-2', 'focus:outline-none',
    // Dark mode display utilities
    'dark:block', 'dark:hidden', 'dark:opacity-100', 'dark:opacity-0',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-cursor-gothic-beta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        // Legacy support
        background: "var(--background)",
        foreground: "var(--foreground)",
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
          "text-inverted": "var(--color-theme-text-inverted)",
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
          "bg-button-disabled": "var(--color-theme-bg-button-disabled)",
          "text-button": "var(--color-theme-button-text)",
          "text-button-disabled": "var(--color-theme-text-button-disabled)",
          "bg-chat-input": "var(--color-theme-bg-chat-input)",
          "tooltip-bg": "var(--color-theme-tooltip-bg)",
          // Icon colors
          "status-icon": "var(--color-theme-status-icon)",
          "action-icon": "var(--color-theme-action-icon)",
          "action-icon-disabled": "var(--color-theme-action-icon-disabled)",
        },
        // Dashboard colors
        dashboard: {
          "text-success-primary": "var(--dashboard-text-success-primary)",
          "text-success-secondary": "var(--dashboard-text-success-secondary)",
          "text-warning-primary": "var(--dashboard-text-warning-primary)",
          "text-warning-secondary": "var(--dashboard-text-warning-secondary)",
          "text-error-primary": "var(--dashboard-text-error-primary)",
          "text-error-secondary": "var(--dashboard-text-error-secondary)",
          "bg-success-secondary": "var(--dashboard-bg-success-secondary)",
          "bg-warning-secondary": "var(--dashboard-bg-warning-secondary)",
          "bg-error-secondary": "var(--dashboard-bg-error-secondary)",
          "stroke-success-primary": "var(--dashboard-stroke-success-primary)",
          "stroke-success-secondary": "var(--dashboard-stroke-success-secondary)",
          "stroke-success-tertiary": "var(--dashboard-stroke-success-tertiary)",
          "stroke-warning-primary": "var(--dashboard-stroke-warning-primary)",
          "stroke-warning-secondary": "var(--dashboard-stroke-warning-secondary)",
          "stroke-warning-tertiary": "var(--dashboard-stroke-warning-tertiary)",
          "stroke-error-primary": "var(--dashboard-stroke-error-primary)",
          "stroke-error-secondary": "var(--dashboard-stroke-error-secondary)",
          "stroke-error-tertiary": "var(--dashboard-stroke-error-tertiary)",
          "icon-primary": "var(--dashboard-icon-primary)",
          "icon-secondary": "var(--dashboard-icon-secondary)",
          "icon-tertiary": "var(--dashboard-icon-tertiary)",
          "icon-quaternary": "var(--dashboard-icon-quaternary)",
          "icon-success-primary": "var(--dashboard-icon-success-primary)",
          "icon-warning-primary": "var(--dashboard-icon-warning-primary)",
          "icon-error-primary": "var(--dashboard-icon-error-primary)",
          "bg-primary": "var(--dashboard-bg-primary)",
          "bg-inactive-selection": "var(--dashboard-bg-inactive-selection)",
        },
        // Override gray palette with truly neutral monochrome values (no blue tint)
        // Kept for backward compatibility
        gray: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
      },
      fontSize: {
        'sm': ['12px', { lineHeight: '1.5' }],      // Rarely used - only when truly needed
        'base': ['14px', { lineHeight: '1.6' }],    // Body text, content - NORMAL SIZE (standard web size)
        'lg': ['18px', { lineHeight: '1.5' }],      // Headings, titles
        'xl': ['18px', { lineHeight: '1.5' }],      // Same as lg for consistency
        '2xl': ['20px', { lineHeight: '1.4' }],     // Page titles
      },
      fontWeight: {
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        bold: "var(--font-weight-bold)",
      },
      spacing: {
        "navbar-height": "var(--navbar-height)",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(156, 163, 175, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(156, 163, 175, 0.8)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
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

