'use client';

/**
 * CitationContent – Centralized wrapper for content that uses citations.
 * Sets citation context (metadata + usage) so hover cards and badges work.
 * Use this around any MarkdownStreamer or citable content so we don't have to
 * call setCitations/setCitationUsage in every feature.
 */

import * as React from 'react';
import { useCitation } from '@/contexts/CitationContext';
import type { CitationMetadata, CitationUsageMap } from '@/types/citations';

export interface CitationContentProps {
  /** Citation metadata (e.g. from research.citations or generated from source_videos). When undefined, context is not cleared (e.g. streaming may own it). */
  citationMetadata?: CitationMetadata | null;
  /** Optional section-to-citations map. When undefined, not set. */
  citationUsage?: CitationUsageMap | null;
  children: React.ReactNode;
}

export function CitationContent({
  citationMetadata,
  citationUsage,
  children,
}: CitationContentProps) {
  const { setCitations, setCitationUsage } = useCitation();

  // useLayoutEffect so citations are in context before paint – hover card then works like research
  React.useLayoutEffect(() => {
    if (citationMetadata != null) {
      setCitations(citationMetadata);
    }
    if (citationUsage != null) {
      setCitationUsage(citationUsage);
    }
    return () => {
      setCitations(null);
      setCitationUsage({});
    };
  }, [citationMetadata, citationUsage, setCitations, setCitationUsage]);

  return <>{children}</>;
}
