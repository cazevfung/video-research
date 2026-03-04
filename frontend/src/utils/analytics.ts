/**
 * Analytics utility for tracking user events
 * Phase 4: Analytics Integration
 * 
 * Provides a centralized way to track events for:
 * - Guest access events
 * - Landing page conversions
 * - User behavior
 * 
 * Can be extended to integrate with analytics services (Google Analytics, etc.)
 */

/**
 * Analytics event types
 */
export type AnalyticsEvent =
  | 'guest_session_started'
  | 'guest_summary_created'
  | 'guest_limit_reached'
  | 'guest_login_prompt_shown'
  | 'guest_to_authenticated_conversion'
  | 'landing_page_cta_clicked'
  | 'landing_page_viewed'
  | 'guest_session_expired'
  | 'summary_creation_started'
  | 'summary_creation_completed'
  | 'summary_creation_failed'
  // Phase 5: Share feature analytics
  | 'share_button_clicked'
  | 'share_link_created'
  | 'share_link_visited'
  | 'share_link_reused'
  | 'share_to_signup_conversion'
  | 'share_page_cta_clicked';

/**
 * Analytics event properties
 */
export interface AnalyticsEventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Track an analytics event
 * 
 * @param event Event name
 * @param properties Optional event properties
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsEventProperties
): void {
  // Only track in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, properties || {});
  }

  // TODO: Integrate with analytics service (Google Analytics, etc.)
  // Example:
  // if (window.gtag) {
  //   window.gtag('event', event, properties);
  // }

  // Store events in localStorage for debugging (optional)
  try {
    const events = JSON.parse(
      localStorage.getItem('analytics_events') || '[]'
    ) as Array<{ event: AnalyticsEvent; properties?: AnalyticsEventProperties; timestamp: string }>;
    
    events.push({
      event,
      properties,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }

    localStorage.setItem('analytics_events', JSON.stringify(events));
  } catch (error) {
    // Ignore localStorage errors
  }
}

/**
 * Track guest session started
 */
export function trackGuestSessionStarted(sessionId: string): void {
  trackEvent('guest_session_started', {
    sessionId: sessionId.substring(0, 8), // Only track first 8 chars for privacy
  });
}

/**
 * Track guest summary created
 */
export function trackGuestSummaryCreated(sessionId: string, summaryCount: number): void {
  trackEvent('guest_summary_created', {
    sessionId: sessionId.substring(0, 8),
    summaryCount,
  });
}

/**
 * Track guest limit reached
 */
export function trackGuestLimitReached(sessionId: string): void {
  trackEvent('guest_limit_reached', {
    sessionId: sessionId.substring(0, 8),
  });
}

/**
 * Track guest login prompt shown
 */
export function trackGuestLoginPromptShown(sessionId: string, source: string): void {
  trackEvent('guest_login_prompt_shown', {
    sessionId: sessionId.substring(0, 8),
    source, // e.g., 'banner', 'menu', 'limit_reached'
  });
}

/**
 * Track guest to authenticated conversion
 */
export function trackGuestToAuthenticatedConversion(
  sessionId: string,
  hadSummary: boolean
): void {
  trackEvent('guest_to_authenticated_conversion', {
    sessionId: sessionId.substring(0, 8),
    hadSummary,
  });
}

/**
 * Track landing page CTA clicked
 */
export function trackLandingPageCTAClicked(ctaType: 'primary' | 'secondary'): void {
  trackEvent('landing_page_cta_clicked', {
    ctaType,
  });
}

/**
 * Track landing page viewed
 */
export function trackLandingPageViewed(): void {
  trackEvent('landing_page_viewed');
}

/**
 * Track guest session expired
 */
export function trackGuestSessionExpired(sessionId: string): void {
  trackEvent('guest_session_expired', {
    sessionId: sessionId.substring(0, 8),
  });
}

/**
 * Track summary creation started
 */
export function trackSummaryCreationStarted(isGuest: boolean, videoCount: number): void {
  trackEvent('summary_creation_started', {
    isGuest,
    videoCount,
  });
}

/**
 * Track summary creation completed
 */
export function trackSummaryCreationCompleted(isGuest: boolean, success: boolean): void {
  trackEvent('summary_creation_completed', {
    isGuest,
    success,
  });
}

/**
 * Track summary creation failed
 */
export function trackSummaryCreationFailed(isGuest: boolean, errorCode?: string): void {
  trackEvent('summary_creation_failed', {
    isGuest,
    errorCode,
  });
}

/**
 * Phase 5: Track share button clicked
 */
export function trackShareButtonClicked(researchId: string, source: 'card' | 'detail' | 'header'): void {
  trackEvent('share_button_clicked', {
    researchId: researchId.substring(0, 12), // Only track first 12 chars for privacy
    source,
  });
}

/**
 * Phase 5: Track share link created
 */
export function trackShareLinkCreated(researchId: string, shareId: string, isNew: boolean): void {
  trackEvent('share_link_created', {
    researchId: researchId.substring(0, 12),
    shareId: shareId.substring(0, 8), // Only track first 8 chars
    isNew,
  });
}

/**
 * Phase 5: Track share link visited
 */
export function trackShareLinkVisited(shareId: string, researchId: string): void {
  trackEvent('share_link_visited', {
    shareId: shareId.substring(0, 8),
    researchId: researchId.substring(0, 12),
  });
}

/**
 * Phase 5: Track share link reused (existing link returned)
 */
export function trackShareLinkReused(researchId: string, shareId: string, accessCount: number): void {
  trackEvent('share_link_reused', {
    researchId: researchId.substring(0, 12),
    shareId: shareId.substring(0, 8),
    accessCount,
  });
}

/**
 * Phase 5: Track conversion from share link visit to signup
 */
export function trackShareToSignupConversion(shareId: string, researchId: string): void {
  trackEvent('share_to_signup_conversion', {
    shareId: shareId.substring(0, 8),
    researchId: researchId.substring(0, 12),
  });
}

/**
 * Phase 5: Track CTA clicked on shared page
 */
export function trackSharePageCTAClicked(ctaType: 'create_research' | 'signup'): void {
  trackEvent('share_page_cta_clicked', {
    ctaType,
  });
}


