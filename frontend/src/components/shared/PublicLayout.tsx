'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { cn } from '@/lib/utils';
import { routes } from '@/config/routes';
import { colors, spacing, headerConfig, typography, buttonConfig } from '@/config/visual-effects';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { trackSharePageCTAClicked } from '@/utils/analytics';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * PublicLayout Component
 * Minimal layout for public shared pages
 * - Logo only (no auth UI)
 * - Public footer with CTA
 * - No authentication required
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  const { t } = useTranslation('shared');
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
    <div className="min-h-screen bg-theme-bg flex flex-col">
      {/* Minimal Header - Logo Only */}
      <header className={cn(
        "sticky top-0",
        headerConfig.zIndex,
        "border-b",
        colors.border.default,
        colors.background.secondary,
        "backdrop-blur-sm",
        headerConfig.height
      )}>
        <div className={cn("w-full", spacing.container.horizontalPadding)}>
          <div className={cn("flex items-center justify-between", headerConfig.height)}>
            {/* Logo */}
            <Link href={routes.home} className={cn("flex items-center gap-2", "hover:opacity-80 transition-opacity")}>
              <div suppressHydrationWarning>
                {mounted ? (
                  <>
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
                ) : (
                  <Image
                    src="/logo_white.png"
                    alt="Video Research"
                    width={200}
                    height={40}
                    className="h-8 w-auto"
                    priority
                  />
                )}
              </div>
            </Link>

            {/* Theme Toggle - Right side */}
            <div className="flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("flex-1 mx-auto w-full", spacing.container.maxWidthContent, spacing.container.pagePadding, spacing.paddingTop.header, "pb-32")}>
        {children}
      </main>

      {/* Public Footer with CTA - Sticky to bottom */}
      <footer className={cn(
        "sticky bottom-0 z-50",
        "border-t",
        colors.border.default,
        colors.background.secondary,
        spacing.container.horizontalPadding,
        "py-8"
      )}>
        <div className={cn("flex flex-col items-center justify-center", spacing.gap.md)}>
          <Button
            asChild
            variant="default"
            size="default"
            className={cn(buttonConfig.sizes.default.height, buttonConfig.sizes.default.padding)}
            onClick={() => {
              // Phase 5: Track CTA click
              trackSharePageCTAClicked('create_research');
            }}
          >
            <Link href={routes.signup}>
              {t('footer.createResearch')}
            </Link>
          </Button>
          <p className={cn(typography.fontSize.base, colors.text.secondary)}>
            <Trans
              i18nKey="footer.poweredBy"
              ns="shared"
              components={{
                brand: <span className={cn(colors.text.primary, typography.fontWeight.medium)} />
              }}
            />
          </p>
        </div>
      </footer>
    </div>
  );
}
