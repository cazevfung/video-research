'use client';

/**
 * Phase 4: Settings Page - SettingsSection component
 * A container component for grouped settings
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';
import { spacing, typography, colors } from '@/config/visual-effects';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * SettingsSection Component
 * A card container for grouped settings with title and description
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className={cn(typography.fontSize.xl, colors.text.primary)}>
          {title}
        </CardTitle>
        {description && (
          <CardDescription className={cn(typography.fontSize.sm, colors.text.secondary)}>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn("space-y-4", spacing.vertical.md)}>
        {children}
      </CardContent>
    </Card>
  );
}


