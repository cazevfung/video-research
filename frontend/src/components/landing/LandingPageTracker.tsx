'use client';

import { useEffect } from 'react';
import { trackLandingPageViewed } from '@/utils/analytics';

/**
 * Landing Page Tracker Component
 * Tracks landing page views for analytics
 * Separate component to allow client-side tracking with server-side metadata
 */
export function LandingPageTracker() {
  useEffect(() => {
    trackLandingPageViewed();
  }, []);

  return null;
}


