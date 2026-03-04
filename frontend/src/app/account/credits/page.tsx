'use client';

/**
 * Account Credits Page
 * Phase 5: Credit transaction history and visualizations
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { routes } from '@/config/routes';
import { colors, spacing, typography } from '@/config/visual-effects';
import { CreditTransactionList } from '@/components/account/CreditTransactionList';
import { CreditVisualizations } from '@/components/account/CreditVisualizations';
import { useUserDataContext } from '@/contexts/UserDataContext';

export default function AccountCreditsPage() {
  const router = useRouter();
  const { user, quota, credits, loading } = useUserDataContext();

  const handleBack = () => {
    router.push(routes.account);
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
          <span>Back to Account</span>
        </Button>
        <h1 className={cn(typography.fontSize['5xl'], typography.fontWeight.bold, colors.text.primary)}>
          Credit History
        </h1>
      </div>

      {/* Main Content Grid */}
      <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6")}>
        {/* Left Column - Visualizations */}
        <div className={cn("lg:col-span-1")}>
          <CreditVisualizations quota={quota} credits={credits} loading={loading} />
        </div>

        {/* Right Column - Transaction List */}
        <div className={cn("lg:col-span-2")}>
          <CreditTransactionList />
        </div>
      </div>
    </div>
  );
}

