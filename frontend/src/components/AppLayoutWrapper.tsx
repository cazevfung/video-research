'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserMenu } from '@/components/ui/UserMenu';
import { LanguageDropdown } from '@/components/ui/LanguageDropdown';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { cn } from '@/lib/utils';
import { routes } from '@/config/routes';
import { colors, spacing, headerConfig, typography, iconSizes, buttonConfig } from '@/config/visual-effects';

interface AppLayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * App Layout Wrapper
 * Conditionally renders app layout features (header, navigation, etc.)
 * Excludes login and signup pages
 */
export function AppLayoutWrapper({ children }: AppLayoutWrapperProps) {
  const { t } = useTranslation('navigation');
  const pathname = usePathname();
  // Normalize pathname by removing trailing slashes for consistent comparison
  const normalizedPathname = pathname.replace(/\/$/, '') || '/';
  const isHistoryPage = normalizedPathname === routes.history;
  // Check if pathname matches /research exactly (with or without trailing slash)
  const isResearchPage = normalizedPathname === routes.research;
  const isHomePage = normalizedPathname === routes.home;
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Check if we should show the app layout (exclude login/signup pages and shared pages)
  const isSharedPage = pathname.startsWith('/shared/');
  const showAppLayout = pathname !== routes.login && pathname !== routes.signup && !isSharedPage;

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

  // If it's a login/signup page, render children without app layout
  if (!showAppLayout) {
    return (
      <ErrorBoundary>
        {children}
        <ToastContainer />
      </ErrorBoundary>
    );
  }

  // Render with app layout (header, navigation, AuthGuard, etc.)
  return (
    <AuthGuard>
      <ErrorBoundary>
        <div className="min-h-screen bg-theme-bg">
            {/* Navigation Header */}
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
                  {/* Logo + Get Summary + Smart Research - Left */}
                  <div className={cn("flex items-center", spacing.gap.md)}>
                    <Link href={routes.home} className={cn("flex items-center", spacing.gap.sm)}>
                      {/* Use suppressHydrationWarning to prevent hydration mismatch */}
                      <div suppressHydrationWarning>
                        {mounted ? (
                          <>
                            {/* White logo for dark mode */}
                            {isDark && (
                              <Image
                                src="/logo_white.png"
                                alt="YouTube Batch Summary"
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
                                alt="YouTube Batch Summary"
                                width={200}
                                height={40}
                                className="h-8 w-auto"
                                priority
                              />
                            )}
                          </>
                        ) : (
                          // Fallback during SSR/hydration - use dark mode logo by default
                          <Image
                            src="/logo_white.png"
                            alt="YouTube Batch Summary"
                            width={200}
                            height={40}
                            className="h-8 w-auto"
                            priority
                          />
                        )}
                      </div>
                    </Link>
                    <Link
                      href={routes.home}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md font-medium",
                        "transition-all duration-200 ease-in-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-border-strong focus-visible:ring-offset-2",
                        "hover:bg-theme-bg-secondary active:scale-[0.98]",
                        buttonConfig.sizes.default.height,
                        buttonConfig.sizes.default.padding,
                        buttonConfig.sizes.default.fontSize,
                        isHomePage
                          ? cn(colors.background.tertiary, colors.text.primary)
                          : cn(colors.text.secondary, "hover:text-theme-text-primary")
                      )}
                    >
                      {t('getSummary')}
                    </Link>
                    <Link
                      href={routes.research}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md font-medium",
                        "transition-all duration-200 ease-in-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-border-strong focus-visible:ring-offset-2",
                        "hover:bg-theme-bg-secondary active:scale-[0.98]",
                        buttonConfig.sizes.default.height,
                        buttonConfig.sizes.default.padding,
                        buttonConfig.sizes.default.fontSize,
                        isResearchPage
                          ? cn(colors.background.tertiary, colors.text.primary)
                          : cn(colors.text.secondary, "hover:text-theme-text-primary")
                      )}
                    >
                      {t('smartResearch')}
                    </Link>
                  </div>

                  {/* Navigation Links - Right: Theme Toggle, Language, History (icon), User */}
                  <nav className={cn("flex items-center", spacing.gap.md)}>
                    <ThemeToggle />
                    <LanguageDropdown />
                    <Link
                      href={routes.history}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md font-medium",
                        "transition-all duration-200 ease-in-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-border-strong focus-visible:ring-offset-2",
                        "hover:bg-theme-bg-secondary active:scale-[0.98]",
                        "h-10 w-10 p-0 min-w-10",
                        isHistoryPage
                          ? cn(colors.background.tertiary, colors.text.primary)
                          : cn(colors.text.secondary, "hover:text-theme-text-primary")
                      )}
                      aria-label={t('history')}
                    >
                      <History className={iconSizes.sm} />
                    </Link>
                    <UserMenu />
                  </nav>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className={cn("mx-auto", spacing.container.maxWidth, spacing.container.pagePadding, spacing.paddingTop.header)}>
              {children}
            </main>
            
            {/* Toast Container */}
            <ToastContainer />
          </div>
      </ErrorBoundary>
    </AuthGuard>
  );
}

