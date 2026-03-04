'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserMenu } from '@/components/ui/UserMenu';
import { LanguageDropdown } from '@/components/ui/LanguageDropdown';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ConnectionStatusIndicator } from '@/components/ui/ConnectionStatusIndicator';
import { cn } from '@/lib/utils';
import { routes } from '@/config/routes';
import { colors, spacing, headerConfig, zIndex, typography, iconSizes } from '@/config/visual-effects';

/**
 * Protected Layout for /app routes
 * Ensures user is authenticated before rendering children
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isHistoryPage = pathname === `${routes.app}/history`;
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
          <div className="w-full px-6">
            <div className={cn("flex items-center justify-between", headerConfig.height)}>
              {/* Logo/Brand - Far Left with Good Padding */}
              <Link href={routes.app} className={cn("flex items-center", spacing.gap.sm)}>
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

              {/* Navigation Links - Far Right: History, Theme Toggle, Language, User */}
              <nav className={cn("flex items-center", spacing.gap.md)}>
                <Link 
                  href={`${routes.app}/history`}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md font-medium",
                    "transition-all duration-200 ease-in-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-border-strong focus-visible:ring-offset-2",
                    "hover:bg-theme-bg-secondary active:scale-[0.98]",
                    "h-10 px-4 py-2",
                    "flex items-center",
                    spacing.gap.sm,
                    isHistoryPage
                      ? cn(colors.background.tertiary, colors.text.primary)
                      : cn(colors.text.secondary, "hover:text-theme-text-primary")
                  )}
                >
                  <History className={iconSizes.sm} />
                  <span className={cn("hidden sm:inline", typography.fontSize.base)}>History</span>
                </Link>
                <ThemeToggle />
                <LanguageDropdown />
                <UserMenu />
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn("mx-auto max-w-7xl", spacing.container.pagePadding, spacing.paddingTop.header)}>
          {children}
        </main>
        
        {/* Toast Container */}
        <ToastContainer />
        
        {/* Connection Status Indicator */}
        <ConnectionStatusIndicator />
          </div>
      </ErrorBoundary>
    </AuthGuard>
  );
}

