'use client';

/**
 * UpgradeModal Component
 * Phase 6: Modal for tier upgrade flow with tier comparison and request submission
 * Uses centralized tier configuration (no hardcoded values)
 */

import * as React from 'react';
import { UserTier, User } from '@/types/user';
import { TierComparison } from './TierComparison';
import { tierConfig, getUpgradeableTiers, formatTierName } from '@/config/tier';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius as borderRadiusConfig } from '@/config/visual-effects';
import { Crown, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useTierContext } from '@/contexts/UserDataContext';
import { useToast } from '@/contexts/ToastContext';

// Fallback in case borderRadius is undefined (shouldn't happen but defensive check)
const borderRadius = borderRadiusConfig || {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-full",
};

interface UpgradeModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Current user data */
  user: User | null;
}

/**
 * UpgradeModal Component
 * Shows tier comparison and handles upgrade requests
 */
export function UpgradeModal({ open, onClose, user }: UpgradeModalProps) {
  const { tierStatus, requestUpgrade } = useTierContext();
  const toast = useToast();
  const [selectedTier, setSelectedTier] = React.useState<UserTier | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const currentTier: UserTier = (user?.tier as UserTier) || 'free';
  const upgradeableTiers = getUpgradeableTiers(currentTier);
  const pendingRequest = tierStatus?.pendingRequest;

  // Reset selected tier when modal opens/closes
  React.useEffect(() => {
    if (open) {
      // Pre-select first upgradeable tier if available
      if (upgradeableTiers.length > 0 && !selectedTier) {
        setSelectedTier(upgradeableTiers[0]);
      }
    } else {
      setSelectedTier(null);
    }
  }, [open, upgradeableTiers.length]);

  const handleTierSelect = (tier: UserTier) => {
    if (upgradeableTiers.includes(tier)) {
      setSelectedTier(tier);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedTier) return;

    // Filter out 'free' tier as requestUpgrade only accepts paid tiers
    if (selectedTier === 'free') {
      toast.error('Cannot upgrade to free tier');
      return;
    }

    setIsSubmitting(true);
    try {
      // Request upgrade - useTier hook validates tier type
      await requestUpgrade(selectedTier as 'starter' | 'pro' | 'premium');
      
      toast.success(
        `Upgrade request submitted! We'll review your request and notify you once it's processed.`
      );
      
      // Close modal after a short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to submit upgrade request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is already on premium tier
  if (currentTier === 'premium') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={cn("max-w-md")}>
          <DialogHeader>
            <DialogTitle>You're on the Premium Plan!</DialogTitle>
            <DialogDescription>
              Enjoy all premium features and benefits.
            </DialogDescription>
          </DialogHeader>
          <div className={cn("space-y-4")}>
            <div className={cn(
              "flex items-center",
              spacing.gap.md,
              borderRadius.md,
              colors.background.secondary,
              spacing.padding.md
            )}>
              <CheckCircle className={cn("h-5 w-5", colors.status.success)} />
              <div>
                <p className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
                  You're already on the highest tier!
                </p>
                <p className={cn(typography.fontSize.xs, colors.text.secondary)}>
                  Enjoy all premium features and benefits.
                </p>
              </div>
            </div>
            <div className={cn("flex justify-end")}>
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-6xl max-h-[90vh] overflow-y-auto")}>
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Compare plans and select the tier that best fits your needs
          </DialogDescription>
        </DialogHeader>
        <div className={cn("space-y-6")}>
          {/* Pending Request Status */}
          {pendingRequest && (
            <div className={cn(
              "flex items-start",
              spacing.gap.md,
              borderRadius.md,
              colors.background.secondary,
              spacing.padding.md,
              "border",
              colors.border.default
            )}>
              <AlertCircle className={cn("h-5 w-5 mt-0.5 flex-shrink-0", colors.status.warning)} />
              <div className={cn("flex-1")}>
                <div className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
                  Upgrade Request Pending
                </div>
                <div className={cn(typography.fontSize.xs, colors.text.secondary, spacing.marginTop.xs)}>
                  <p>
                    You have a pending request to upgrade to{' '}
                    <strong>{formatTierName(pendingRequest.requestedTier as UserTier)}</strong>
                  </p>
                  <p className={cn(spacing.marginTop.xs)}>
                    Status: <strong className={cn(
                      pendingRequest.status === 'pending' && colors.status.warning,
                      pendingRequest.status === 'approved' && colors.status.success,
                      pendingRequest.status === 'rejected' && colors.status.error
                    )}>
                      {pendingRequest.status.charAt(0).toUpperCase() + pendingRequest.status.slice(1)}
                    </strong>
                  </p>
                  {pendingRequest.status === 'rejected' && (
                    <p className={cn(spacing.marginTop.xs, colors.status.error)}>
                      Your upgrade request was not approved. Please contact support for more information.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tier Comparison */}
          <div>
            <h3 className={cn(typography.fontSize.base, typography.fontWeight.semibold, colors.text.primary, spacing.marginBottom.md)}>
              Compare Plans
            </h3>
            <TierComparison
              currentTier={currentTier}
              onTierSelect={handleTierSelect}
              showSelectButtons={!pendingRequest}
            />
          </div>

          {/* Selected Tier Info */}
          {selectedTier && !pendingRequest && (
            <div className={cn(
              "border",
              borderRadius.md,
              colors.border.default,
              colors.background.secondary,
              spacing.padding.md
            )}>
              <div className={cn("flex items-center justify-between", spacing.marginBottom.sm)}>
                <div>
                  <h4 className={cn(typography.fontSize.sm, typography.fontWeight.semibold, colors.text.primary)}>
                    Selected: {formatTierName(selectedTier)}
                  </h4>
                  {tierConfig[selectedTier].monthlyPrice !== null && (
                    <p className={cn(typography.fontSize.xs, colors.text.secondary)}>
                      ${tierConfig[selectedTier].monthlyPrice?.toFixed(2)}/month
                    </p>
                  )}
                </div>
                <Crown className={cn("h-5 w-5", tierConfig[selectedTier].monthlyPrice ? 'text-yellow-500' : colors.text.secondary)} />
              </div>
              <p className={cn(typography.fontSize.xs, colors.text.secondary)}>
                Click "Request Upgrade" below to submit your upgrade request. Our team will review 
                and process your request.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className={cn("flex items-center justify-end", spacing.gap.sm)}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!pendingRequest && selectedTier && (
              <Button
                onClick={handleUpgrade}
                disabled={isSubmitting || !selectedTier}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className={cn("mr-2 h-4 w-4 animate-spin")} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Crown className={cn("mr-2 h-4 w-4")} />
                    Request Upgrade
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

