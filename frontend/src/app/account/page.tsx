'use client';

/**
 * Account Page
 * Phase 3: Complete account management page with all sections
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { routes } from '@/config/routes';
import { colors, spacing, typography } from '@/config/visual-effects';
import { useUserDataContext } from '@/contexts/UserDataContext';
import { AccountHeader } from '@/components/account/AccountHeader';
import { ProfileForm } from '@/components/account/ProfileForm';
import { CreditBalanceCard } from '@/components/account/CreditBalanceCard';
import { TierCard } from '@/components/account/TierCard';
import { AccountStatistics } from '@/components/account/AccountStatistics';
import { UpgradeModal } from '@/components/account/UpgradeModal';

export default function AccountPage() {
  const router = useRouter();
  const { user, quota, credits, loading, error, refetchUserData } = useUserDataContext();
  
  // Alias refetch for compatibility
  const refetch = refetchUserData;
  const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleUpgradeClick = () => {
    setUpgradeModalOpen(true);
  };

  return (
    <div className={cn("max-w-6xl mx-auto", spacing.vertical.lg, spacing.padding.lg)}>
      {/* Header */}
      <div className={cn("flex items-center", spacing.gap.md, spacing.marginBottom.lg)}>
        <Button
          variant="ghost"
          onClick={handleBack}
          className={cn("flex items-center", spacing.gap.sm)}
        >
          <ArrowLeft className={cn("h-4 w-4")} />
          <span>Back</span>
        </Button>
        <h1 className={cn(typography.fontSize.xl, typography.fontWeight.bold, colors.text.primary)}>
          Account
        </h1>
      </div>

      {/* Error State */}
      {error && (
        <div className={cn(
          "p-4 rounded-lg border",
          colors.background.secondary,
          colors.border.default,
          spacing.marginBottom.lg
        )}>
          <p className={cn(typography.fontSize.sm, colors.status.error)}>
            {error.message || 'Failed to load account data'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className={cn(spacing.marginTop.sm)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6")}>
        {/* Left Column - Full Width on Mobile, 2 columns on Desktop */}
        <div className={cn("lg:col-span-2 space-y-6")}>
          {/* Account Header */}
          <AccountHeader user={user} loading={loading} />

          {/* Profile Form */}
          <ProfileForm user={user} onUpdate={refetch} loading={loading} />

          {/* Statistics */}
          <AccountStatistics user={user} quota={quota} loading={loading} />
        </div>

        {/* Right Column - Full Width on Mobile, 1 column on Desktop */}
        <div className={cn("space-y-6")}>
          {/* Credit Balance Card */}
          <CreditBalanceCard quota={quota} credits={credits} loading={loading} />

          {/* Tier Card */}
          <TierCard user={user} loading={loading} onUpgradeClick={handleUpgradeClick} />
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal 
        open={upgradeModalOpen} 
        onClose={() => setUpgradeModalOpen(false)}
        user={user}
      />
    </div>
  );
}

