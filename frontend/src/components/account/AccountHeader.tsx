'use client';

/**
 * AccountHeader Component
 * Phase 3: Displays user avatar, name, email, tier badge, and account creation date
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius, iconSizes } from '@/config/visual-effects';
import { safeFormatDate } from '@/utils/date';
import { User as UserIcon, Mail, Calendar } from 'lucide-react';
import { getTierColorClasses, formatTierName, type UserTier } from '@/config/tier';

interface AccountHeaderProps {
  user: User | null;
  loading?: boolean;
}

/**
 * Get user initials for avatar
 */
function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function AccountHeader({ user, loading }: AccountHeaderProps) {
  const { t, i18n } = useTranslation('account');
  
  if (loading || !user) {
    return (
      <Card>
        <CardHeader>
          <div className={cn("flex items-center", spacing.gap.md)}>
            <div className={cn(
              borderRadius.full,
              "w-16 h-16",
              colors.background.tertiary,
              "animate-pulse"
            )} />
            <div className={cn("flex-1", spacing.vertical.sm)}>
              <div className={cn("h-6 w-48", colors.background.tertiary, "rounded animate-pulse")} />
              <div className={cn("h-4 w-64", colors.background.tertiary, "rounded animate-pulse")} />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const initials = getUserInitials(user.name);
  const tierDisplay = formatTierName(user.tier as UserTier);
  const tierColorClasses = getTierColorClasses(user.tier as UserTier);
  const accountCreated = user.createdAt 
    ? safeFormatDate(user.createdAt, 'MMMM d, yyyy', 'N/A', i18n.language)
    : 'N/A';

  return (
    <Card>
      <CardHeader>
        <div className={cn("flex items-center", spacing.gap.lg)}>
          {/* Avatar */}
          <div className={cn(
            borderRadius.full,
            "w-16 h-16",
            colors.background.secondary,
            "flex items-center justify-center",
            typography.fontSize['2xl'],
            typography.fontWeight.bold,
            colors.text.primary,
            "border-2",
            colors.border.default,
            "flex-shrink-0"
          )}>
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className={cn(borderRadius.full, "w-full h-full object-cover")}
              />
            ) : (
              initials
            )}
          </div>

          {/* User Info */}
          <div className={cn("flex-1", spacing.vertical.sm)}>
            <div className={cn("flex items-center", spacing.gap.md, "flex-wrap")}>
              <CardTitle className={cn(typography.fontSize.xl, typography.fontWeight.bold, colors.text.primary)}>
                {user.name}
              </CardTitle>
              <span className={cn(
                cn("px-2 py-1 rounded-md font-medium border", typography.fontSize.xs),
                tierColorClasses
              )}>
                {tierDisplay}
              </span>
            </div>
            
            <div className={cn("flex items-center", spacing.gap.sm, "flex-wrap")}>
              <div className={cn("flex items-center", spacing.gap.xs)}>
                <Mail className={cn(iconSizes.sm, colors.text.secondary)} />
                <CardDescription className={cn(typography.fontSize.sm, colors.text.secondary)}>
                  {user.email}
                </CardDescription>
              </div>
              
              {user.createdAt && (
                <div className={cn("flex items-center", spacing.gap.xs)}>
                  <Calendar className={cn(iconSizes.sm, colors.text.secondary)} />
                  <CardDescription className={cn(typography.fontSize.sm, colors.text.secondary)}>
                    {t('header.joined', { date: accountCreated })}
                  </CardDescription>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

