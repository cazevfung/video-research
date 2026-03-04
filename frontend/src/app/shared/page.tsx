'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams, notFound } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { SharedResearchCard } from '@/components/shared/SharedResearchCard';
import { SharedSummaryCard } from '@/components/shared/SharedSummaryCard';
import { SharedPageTracker } from '@/components/shared/SharedPageTracker';
import { getSharedResearch, type SharedContentData } from '@/lib/api';
import { typography, spacing, colors } from '@/config/visual-effects';
import { cn } from '@/lib/utils';
import type { ResearchResponse, SummaryResponse, SelectedVideo } from '@/types';
import { Loader2 } from 'lucide-react';

/**
 * Inner content that uses useSearchParams/usePathname.
 * Must be wrapped in Suspense for static export/prerender.
 */
function SharedResearchContent() {
  const { t } = useTranslation('shared');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const shareIdFromQuery = searchParams.get('shareId');
  // Back-compat: allow old-style links like /shared/<id> when hosting rewrites to /shared
  const shareIdFromPath = (() => {
    if (!pathname) return null;
    // e.g. "/shared/abc123/" -> "abc123"
    const trimmed = pathname.replace(/\/+$/, '');
    const parts = trimmed.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'shared') return decodeURIComponent(parts[1]);
    return null;
  })();
  const shareId = shareIdFromQuery || shareIdFromPath;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedData, setSharedData] = useState<SharedContentData | null>(null);

  useEffect(() => {
    if (!shareId) {
      setError(t('loading.shareIdRequired'));
      setLoading(false);
      return;
    }

    async function fetchSharedResearch() {
      const id = shareId;
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        const response = await getSharedResearch(id);

        if (response.error || !response.data) {
          const errorCode = response.error?.code;
          if (
            errorCode === 'NOT_FOUND' ||
            errorCode === 'SHARE_NOT_FOUND' ||
            errorCode === 'RESEARCH_NOT_FOUND' ||
            errorCode === 'SUMMARY_NOT_FOUND'
          ) {
            notFound();
            return;
          }

          setError(response.error?.message || t('loading.error'));
          return;
        }

        setSharedData(response.data);
      } catch (err) {
        console.error('Error fetching shared research:', err);
        setError(err instanceof Error ? err.message : t('loading.errorMessage'));
      } finally {
        setLoading(false);
      }
    }

    fetchSharedResearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]); // Only depend on shareId - t function is stable and doesn't need to be in deps

  if (loading) {
    return (
      <PublicLayout>
        <div className={cn('flex flex-col items-center justify-center min-h-[60vh]', spacing.gap.md)}>
          <Loader2 className={cn('animate-spin', colors.text.secondary)} size={48} />
          <p className={cn(typography.fontSize.base, colors.text.secondary)}>{t('loading.title')}</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !sharedData) {
    return (
      <PublicLayout>
        <div className={cn('flex flex-col items-center justify-center min-h-[60vh]', spacing.gap.md)}>
          <h1 className={cn(typography.fontSize.xl, typography.fontWeight.bold, colors.text.primary)}>
            {t('loading.error')}
          </h1>
          <p className={cn(typography.fontSize.base, colors.text.secondary)}>
            {error || t('loading.errorMessage')}
          </p>
        </div>
      </PublicLayout>
    );
  }

  const { metadata } = sharedData;
  const sharedDate = metadata.sharedAt
    ? new Date(metadata.sharedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const contentId = sharedData.contentType === 'research'
    ? (sharedData.research._id || (sharedData.research as any)?.id || '')
    : (sharedData.summary._id || (sharedData.summary as any)?.id || '');

  return (
    <PublicLayout>
      <SharedPageTracker shareId={shareId || ''} researchId={contentId} />

      <div className={cn('w-full', spacing.vertical.lg)}>
        <div
          className={cn(
            'flex flex-col sm:flex-row sm:items-center sm:justify-between',
            spacing.marginBottom.lg,
            spacing.gap.sm,
            'pb-4',
            'border-b',
            colors.border.default
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {sharedDate && (
              <p className={cn(typography.fontSize.sm, colors.text.secondary)}>
                {t('metadata.sharedOn', { date: sharedDate })}
              </p>
            )}
            {metadata.viewCount !== undefined && (
              <p className={cn(typography.fontSize.sm, colors.text.secondary)}>
                • {t('metadata.viewed', { count: metadata.viewCount })}
              </p>
            )}
          </div>
        </div>

        {sharedData.contentType === 'research' ? (
          <SharedResearchCard
            research={sharedData.research}
            selectedVideos={sharedData.research.selected_videos || []}
          />
        ) : (
          <SharedSummaryCard summary={sharedData.summary} />
        )}
      </div>
    </PublicLayout>
  );
}

/**
 * Shared Research Page (Static-export friendly)
 * Route: /shared?shareId=...
 *
 * Why query param?
 * - With `output: 'export'`, Next.js cannot serve arbitrary dynamic routes like `/shared/[shareId]`.
 * - Using `/shared?shareId=...` keeps the route fully static while still loading dynamic data client-side.
 *
 * useSearchParams() is wrapped in Suspense so the page can be prerendered/exported.
 */
export default function SharedResearchPage() {
  return (
    <Suspense
      fallback={
        <PublicLayout>
          <div className={cn('flex flex-col items-center justify-center min-h-[60vh]', spacing.gap.md)}>
            <Loader2 className={cn('animate-spin', colors.text.secondary)} size={48} />
            <p className={cn(typography.fontSize.base, colors.text.secondary)}>Loading...</p>
          </div>
        </PublicLayout>
      }
    >
      <SharedResearchContent />
    </Suspense>
  );
}
