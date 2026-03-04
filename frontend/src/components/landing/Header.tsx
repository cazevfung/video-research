'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';
import { colors, spacing, headerConfig } from '@/config/visual-effects';

/**
 * Landing Page Header Component
 * Minimal header with logo and theme toggle
 * Uses design system configs (no hardcoded values)
 */
export function Header() {
  const { t } = useTranslation('landing');
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
        headerConfig.height,
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
          'flex items-center gap-2',
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
                alt={t('header.logoAlt')}
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
                alt={t('header.logoAlt')}
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
            alt={t('header.logoAlt')}
            width={200}
            height={40}
            className="h-8 w-auto"
            priority
          />
        )}
      </Link>

      {/* Theme Toggle - Right side */}
      <div className="flex items-center">
        <ThemeToggle />
      </div>
    </header>
  );
}


