'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageDropdown } from '@/components/ui/LanguageDropdown';
import { cn } from '@/lib/utils';
import { colors, spacing, headerConfig } from '@/config/visual-effects';

/**
 * LoginHeader Component
 * Minimal header with logo/brand name and theme toggle
 * Matches PRD requirements for Phase 2
 */
export function LoginHeader() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0',
        headerConfig.zIndex,
        'h-16',
        'flex items-center justify-between',
        spacing.container.horizontalPadding,
        colors.background.secondary,
        'backdrop-blur-sm',
        'border-b',
        colors.border.default
      )}
    >
      {/* Logo/Brand */}
      <Link
        href="/"
        className={cn(
          'flex items-center',
          spacing.gap.sm,
          'hover:opacity-80',
          'transition-opacity',
          'duration-200'
        )}
      >
        {mounted && (
          <>
            {/* White logo for dark mode */}
            {isDark && (
              <Image
                src="/logo_white.png"
                alt="Video Research"
                width={200}
                height={40}
                className="h-8 w-auto"
                priority
              />
            )}
            {/* Black logo for light mode */}
            {!isDark && (
              <Image
                src="/logo_black.png"
                alt="Video Research"
                width={200}
                height={40}
                className="h-8 w-auto"
                priority
              />
            )}
          </>
        )}
        {!mounted && (
          // Fallback during SSR/hydration
          <Image
            src="/logo_white.png"
            alt="Video Research"
            width={200}
            height={40}
            className="h-8 w-auto"
            priority
          />
        )}
      </Link>

      {/* Right side controls */}
      <div className={cn('flex items-center', spacing.gap.md)}>
        <LanguageDropdown />
        <ThemeToggle />
      </div>
    </header>
  );
}

