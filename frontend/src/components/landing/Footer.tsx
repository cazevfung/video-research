'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  colors,
  spacing,
  typography,
} from '@/config/visual-effects';
import { routes } from '@/config/routes';

/**
 * Landing Page Footer Component
 * Minimal footer with links and copyright
 * Uses design system configs (no hardcoded values)
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'border-t',
        colors.border.default,
        colors.background.secondary,
        spacing.container.horizontalPadding,
        spacing.padding.lg
      )}
    >
      <div
        className={cn(
          spacing.container.maxWidth,
          'mx-auto',
          'flex flex-col sm:flex-row items-center justify-between',
          spacing.gap.md
        )}
      >
        {/* Copyright */}
        <p
          className={cn(
            typography.fontSize.sm,
            colors.text.tertiary,
            'text-center sm:text-left'
          )}
        >
          © {currentYear} Video Research. All rights reserved.
        </p>

        {/* Links */}
        <nav
          className={cn(
            'flex flex-wrap items-center justify-center',
            spacing.gap.md
          )}
        >
          <Link
            href={routes.login}
            className={cn(
              typography.fontSize.sm,
              colors.text.secondary,
              'hover:text-theme-text-primary',
              'transition-colors',
              'duration-200'
            )}
          >
            Login
          </Link>
          <Link
            href={routes.signup}
            className={cn(
              typography.fontSize.sm,
              colors.text.secondary,
              'hover:text-theme-text-primary',
              'transition-colors',
              'duration-200'
            )}
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </footer>
  );
}

