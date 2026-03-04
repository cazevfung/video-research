'use client';

import { useEffect } from 'react';
import { trackShareLinkVisited } from '@/utils/analytics';

interface SharedPageTrackerProps {
  shareId: string;
  researchId: string;
}

/**
 * Shared Page Tracker Component
 * Phase 5: Tracks share link visits for analytics
 * Separate component to allow client-side tracking with server-side data
 */
export function SharedPageTracker({ shareId, researchId }: SharedPageTrackerProps) {
  useEffect(() => {
    trackShareLinkVisited(shareId, researchId);
  }, [shareId, researchId]);

  return null;
}
