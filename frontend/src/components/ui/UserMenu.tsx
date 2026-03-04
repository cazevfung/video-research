'use client';

/**
 * Phase 2: Multi-language Support - UserMenu with i18n
 * Displays real user data from backend API with credit balance and navigation
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, LogOut, Settings, CreditCard, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, markdownConfig } from '@/config/visual-effects';
import { routes } from '@/config/routes';
import { useUserDataContext } from '@/contexts/UserDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { safeFormatDate } from '@/utils/date';
import { getCreditStatusColor } from '@/config/credits';
import { UpgradeModal } from '@/components/account/UpgradeModal';
import { useGuestSession } from '@/hooks/useGuestSession';
import { guestConfig } from '@/config/guest';
import { warningMessages } from '@/config/messages';

/**
 * UserMenu Component
 * Phase 2: Enhanced with real API integration, credit display, and navigation
 * Phase 6: Added upgrade modal integration
 */
export function UserMenu() {
  const { t, i18n } = useTranslation('navigation');
  
  /**
   * Format reset time for display (localized)
   */
  const formatResetTime = (resetTime: string | undefined): string => {
    if (!resetTime) return 'N/A';
    return safeFormatDate(resetTime, 'MMM d, h:mm a', 'N/A', i18n.language);
  };
  const router = useRouter();
  const { signOut, isGuest, guestSessionId } = useAuth();
  const { user, quota, credits, loading, error, refetchUserData } = useUserDataContext();
  
  // Alias refetch for compatibility
  const refetch = refetchUserData;
  const { summaryCount, hasReachedLimit, maxSummaryLimit } = useGuestSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);
  
  // Refresh data when menu opens
  React.useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Get display values with fallbacks
  const displayName = user?.name || t('user');
  const displayEmail = user?.email || '';
  const tier = user?.tier || 'free';
  const creditsRemaining = quota?.credits_remaining ?? 0;
  const dailyLimit = quota?.daily_limit ?? 1; // For non-guest; guest uses maxSummaryLimit
  const resetTime = quota?.reset_time;

  const handleLogout = async () => {
    try {
      await signOut();
      router.push(routes.login);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogin = () => {
    router.push(routes.login);
    setIsOpen(false);
  };

  const handleSignUp = () => {
    router.push(routes.signup);
    setIsOpen(false);
  };

  const handleSettings = () => {
    router.push(routes.settings);
    setIsOpen(false);
  };

  const handleAccount = () => {
    router.push(routes.account);
    setIsOpen(false);
  };

  const handleUpgrade = () => {
    setUpgradeModalOpen(true);
    setIsOpen(false);
  };

  // Show loading skeleton in trigger button
  const isLoadingData = loading && !user;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center",
            spacing.gap.sm,
            colors.text.secondary,
            markdownConfig.link.hover,
            "bg-theme-bg-card hover:bg-theme-bg-card-hover"
          )}
          style={{
            backgroundColor: "var(--color-theme-bg-card)", // CSS variable
          }}
          disabled={isLoadingData}
        >
          {isLoadingData ? (
            <Loader2 className={cn("h-4 w-4 animate-spin")} />
          ) : (
            <UserIcon className={cn("h-4 w-4")} />
          )}
          <span className="hidden sm:inline">
            {isLoadingData ? t('loading') : (isGuest ? t('guest') : displayName)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("w-64")}>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1.5">
            {isGuest ? (
              // Phase 3: Guest user display
              <>
                <p className={cn(typography.fontSize.base, typography.fontWeight.semibold, colors.text.primary)}>
                  {t('guestUser')}
                </p>
                <p className={cn(typography.fontSize.base, colors.text.secondary)}>
                  {summaryCount} / {maxSummaryLimit ?? 'Unlimited'} {t('summariesUsed')}
                </p>
                {hasReachedLimit && (
                  <p className={cn(typography.fontSize.base, colors.status.warning)}>
                    {t('limitReached')}
                  </p>
                )}
                <div className="mt-2 pt-2 border-t border-theme-border-primary">
                  <p className={cn(typography.fontSize.base, colors.text.tertiary)}>
                    {warningMessages.guestLoginPrompt}
                  </p>
                </div>
              </>
            ) : loading && !user ? (
              // Loading state
              <>
                <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-700 rounded animate-pulse" />
              </>
            ) : error ? (
              // Error state
              <div className="flex flex-col space-y-1">
                <p className={cn(typography.fontSize.base, colors.status.error)}>
                  {t('errorLoadingData')}
                </p>
                <button
                  onClick={() => refetch()}
                  className={cn(
                    typography.fontSize.base,
                    colors.text.secondary,
                    "text-left hover:underline"
                  )}
                >
                  {t('clickToRetry')}
                </button>
              </div>
            ) : (
              // User data display
              <>
                <p className={cn(typography.fontSize.base, typography.fontWeight.semibold, colors.text.primary)}>
                  {displayName}
                </p>
                {displayEmail && (
                  <p className={cn(typography.fontSize.base, colors.text.secondary)}>
                    {displayEmail}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p className={cn(typography.fontSize.base, colors.text.tertiary)}>
                    {tier === 'premium' || tier === 'pro' || tier === 'starter' 
                      ? `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${t('plan')}`
                      : `Free ${t('plan')}`}
                  </p>
                </div>
                
                {/* Credit Balance Display */}
                {quota && (
                  <div className="mt-2 pt-2 border-t border-theme-border-primary">
                    <div className="flex items-center justify-between">
                      <span className={cn(typography.fontSize.base, colors.text.secondary)}>
                        {t('credits')}
                      </span>
                      <span className={cn(
                        typography.fontSize.base,
                        typography.fontWeight.semibold,
                        getCreditStatusColor((creditsRemaining / dailyLimit) * 100)
                      )}>
                        {creditsRemaining} / {dailyLimit}
                      </span>
                    </div>
                    {resetTime && (
                      <p className={cn(typography.fontSize.base, colors.text.tertiary, "mt-1")}>
                        {t('resets')}: {formatResetTime(resetTime)}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isGuest ? (
          // Phase 3: Guest menu items
          <>
            <DropdownMenuItem onClick={handleLogin} className={spacing.gap.sm}>
              <UserIcon className="h-4 w-4" />
              <span>{t('login')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignUp} className={spacing.gap.sm}>
              <UserIcon className="h-4 w-4" />
              <span>{t('signup')}</span>
            </DropdownMenuItem>
          </>
        ) : !error && (
          <>
            <DropdownMenuItem onClick={handleAccount} className={spacing.gap.sm}>
              <UserIcon className="h-4 w-4" />
              <span>{t('account')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettings} className={spacing.gap.sm}>
              <Settings className="h-4 w-4" />
              <span>{t('settings')}</span>
            </DropdownMenuItem>
            {(tier === 'free' || tier === 'starter' || tier === 'pro') && (
              <DropdownMenuItem onClick={handleUpgrade} className={spacing.gap.sm}>
                <CreditCard className="h-4 w-4" />
                <span>{t('upgrade')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className={spacing.gap.sm}>
              <LogOut className="h-4 w-4" />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
      
      {/* Upgrade Modal */}
      <UpgradeModal 
        open={upgradeModalOpen} 
        onClose={() => setUpgradeModalOpen(false)}
        user={user}
      />
    </DropdownMenu>
  );
}

