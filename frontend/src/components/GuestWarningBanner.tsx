/**
 * GuestWarningBanner Component
 * Phase 3: Displays warning banner for guest users
 * Shows when guest has created at least one summary
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { routes } from '@/config/routes';
import { guestConfig } from '@/config/guest';
import { Button } from '@/components/ui/Button';
import { trackGuestLoginPromptShown } from '@/utils/analytics';
import { getGuestSessionId } from '@/utils/guest-session.utils';
import { getDevModeBypassGuestLimits, getDevModeUserTier } from '@/utils/dev-mode';

interface GuestWarningBannerProps {
  /**
   * Current summary count for the guest
   */
  summaryCount: number;

  /**
   * Effective guest summary limit from backend/config (null = unlimited). When not provided, uses guestConfig.
   */
  maxSummaryLimit?: number | null;

  /**
   * Whether the banner can be dismissed
   * @default false
   */
  dismissible?: boolean;

  /**
   * Callback when banner is dismissed
   */
  onDismiss?: () => void;
}

/**
 * GuestWarningBanner Component
 * Displays a warning banner for guest users after they've created at least one summary
 */
export function GuestWarningBanner({
  summaryCount,
  maxSummaryLimit,
  dismissible = false,
  onDismiss,
}: GuestWarningBannerProps) {
  const { t } = useTranslation('navigation');
  const router = useRouter();
  const [isDismissed, setIsDismissed] = React.useState(false);
  
  // Track dev mode settings with state to trigger re-renders
  const [bypassGuestLimits, setBypassGuestLimits] = React.useState(() => 
    typeof window !== 'undefined' ? getDevModeBypassGuestLimits() : false
  );
  const [tierOverride, setTierOverride] = React.useState(() =>
    typeof window !== 'undefined' ? getDevModeUserTier() : null
  );

  // Listen for localStorage changes to update in real-time
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDevModeSettings = () => {
      setBypassGuestLimits(getDevModeBypassGuestLimits());
      setTierOverride(getDevModeUserTier());
    };

    // Check on mount
    checkDevModeSettings();

    // Listen for storage events (from other tabs or same tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'dev_mode_bypass_guest_limits' ||
        e.key === 'dev_mode_user_tier'
      ) {
        checkDevModeSettings();
      }
    };

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      checkDevModeSettings();
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab updates (DevModePanel can dispatch this)
    window.addEventListener('dev-mode-update', handleCustomStorageChange);

    // Poll for changes (fallback for same-tab updates, less frequent)
    const interval = setInterval(checkDevModeSettings, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dev-mode-update', handleCustomStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Track login prompt shown on mount
  // NOTE: This hook must be called before any early returns to follow Rules of Hooks
  React.useEffect(() => {
    // Only track if banner would be shown
    if (summaryCount > 0 && !isDismissed) {
      const sessionId = getGuestSessionId();
      if (sessionId) {
        trackGuestLoginPromptShown(sessionId, 'banner');
      }
    }
  }, [summaryCount, isDismissed]);

  // Hide banner if dev mode bypass is enabled or tier override is set to non-free tier
  const shouldHideBanner = bypassGuestLimits || (tierOverride !== null && tierOverride !== 'free');

  // Don't show if no summaries created yet, dismissed, or dev mode overrides are active
  if (summaryCount === 0 || isDismissed || shouldHideBanner) {
    return null;
  }

  const limit = maxSummaryLimit ?? guestConfig.maxSummaries;
  const hasReachedLimit = limit != null && summaryCount >= limit;
  const remainingSummaries = limit != null ? limit - summaryCount : null;

  const handleLogin = () => {
    router.push(routes.login);
  };

  const handleSignUp = () => {
    router.push(routes.signup);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        hasReachedLimit
          ? cn(
              colors.background.tertiary,
              "border-yellow-600/50",
              colors.status.warning
            )
          : cn(
              colors.background.secondary,
              "border-yellow-700/30",
              colors.text.secondary
            ),
        borderRadius.md,
        spacing.marginBottom.md
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle
        className={cn(
          "h-5 w-5 flex-shrink-0 mt-0.5",
          hasReachedLimit ? colors.status.warning : colors.text.secondary
        )}
        aria-hidden="true"
      />
      
      <div className="flex-1 min-w-0">
        <p className={cn(typography.fontSize.base, typography.fontWeight.semibold, colors.text.primary, "mb-1")}>
          {hasReachedLimit
            ? t('guestLimitReachedTitle')
            : t('guestViewing')}
        </p>
        
        <p className={cn(typography.fontSize.base, colors.text.secondary, "mb-3")}>
          {hasReachedLimit && limit != null
            ? t('guestLimitReachedDescription', { count: limit })
            : remainingSummaries != null
              ? t('guestRemainingDescription', { count: remainingSummaries })
              : t('guestViewing')}
        </p>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleLogin}
            className="h-8 px-3"
          >
            {t('login')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignUp}
            className="h-8 px-3"
          >
            {t('signup')}
          </Button>
        </div>
      </div>
      
      {dismissible && (
        <button
          onClick={handleDismiss}
          className={cn(
            "flex-shrink-0 p-1 rounded-md",
            "hover:bg-theme-bg-tertiary",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-border-strong",
            colors.text.tertiary,
            "hover:text-theme-text-primary"
          )}
          aria-label={t('dismissBanner')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

