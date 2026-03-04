'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { Button } from '@/components/ui/Button';
import { typography, spacing, colors, buttonConfig } from '@/config/visual-effects';
import { routes } from '@/config/routes';
import { cn } from '@/lib/utils';

/**
 * Not Found Page for Invalid/Expired Shares
 * Shown when share link is not found, expired, or revoked
 */
export default function SharedResearchNotFound() {
  return (
    <PublicLayout>
      <div className={cn('flex flex-col items-center justify-center min-h-[60vh]', spacing.gap.md)}>
        <h1 className={cn(typography.fontSize.xl, typography.fontWeight.bold, colors.text.primary)}>
          Share Link Not Found
        </h1>
        <p className={cn(typography.fontSize.base, colors.text.secondary, 'text-center max-w-md')}>
          This share link may have expired, been revoked, or doesn't exist.
        </p>
        <Button
          asChild
          variant="default"
          size="default"
          className={cn(buttonConfig.sizes.default.height, buttonConfig.sizes.default.padding, 'mt-4')}
        >
          <Link href={routes.home}>Create your own research</Link>
        </Button>
      </div>
    </PublicLayout>
  );
}

