'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, markdownConfig } from '@/config/visual-effects';
import { routes } from '@/config/routes';

/**
 * Breadcrumbs Component
 * Displays navigation breadcrumbs for page hierarchy
 * Based on ui_fixes_prd.md Section 3.3.1
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  
  // Don't show breadcrumbs on root pages
  if (pathname === routes.home || pathname === '/') {
    return null;
  }

  // Build breadcrumb items from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    return { href, label };
  });

  // Add home breadcrumb
  const homeBreadcrumb = { href: routes.home, label: 'Home' };
  const allBreadcrumbs = [homeBreadcrumb, ...breadcrumbs];

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center", spacing.margin.md, spacing.gap.sm)}
    >
      <ol className={cn("flex items-center", spacing.gap.sm)}>
        {allBreadcrumbs.map((crumb, index) => {
          const isLast = index === allBreadcrumbs.length - 1;
          
          return (
            <li key={`breadcrumb-${index}-${crumb.href}`} className="flex items-center">
              {index === 0 ? (
                <Link
                  href={crumb.href}
                  className={cn(
                    "flex items-center",
                    spacing.gap.xs,
                    typography.fontSize.sm,
                    isLast
                      ? colors.text.gray200
                      : cn(colors.text.gray400, markdownConfig.link.hover)
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  <Home className="h-4 w-4" />
                  {!isLast && <span>{crumb.label}</span>}
                </Link>
              ) : (
                <>
                  <ChevronRight className={cn("h-4 w-4", colors.text.gray500)} />
                  {isLast ? (
                    <span
                      className={cn(
                        typography.fontSize.sm,
                        typography.fontWeight.medium,
                        colors.text.gray200
                      )}
                      aria-current="page"
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className={cn(
                        typography.fontSize.sm,
                        colors.text.gray400,
                        markdownConfig.link.hover
                      )}
                    >
                      {crumb.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

