'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { shouldSkipAuth, isFirebaseAuthEnabled } from '@/config/env';
import { getLoginRoute } from '@/config/routes';
import { getOrCreateGuestSessionId } from '@/utils/guest-session.utils';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side authentication guard component
 * Protects routes that require authentication
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { user, loading, isGuest } = useAuth();
  const skipAuth = shouldSkipAuth();
  const useFirebaseAuth = isFirebaseAuthEnabled(); // Centralized config
  const isProduction = process.env.NODE_ENV === 'production';
  const [mounted, setMounted] = useState(false);

  // Ensure consistent hydration by only showing loading state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // In development with SKIP_AUTH, allow access
    if (!isProduction && skipAuth) {
      return;
    }

    // Phase 3: Allow guest access - don't redirect if user is a guest
    if (isGuest) {
      return;
    }

    // If Firebase Auth is enabled, check authentication
    if (useFirebaseAuth) {
      if (!loading && !user) {
        // Before redirecting, check if guest session should be created
        // This handles the case where AuthContext hasn't initialized guest session yet
        if (typeof window !== 'undefined') {
          const guestSessionId = getOrCreateGuestSessionId();
          if (guestSessionId) {
            // Guest session exists or was just created, don't redirect
            // AuthContext will update isGuest on next render
            return;
          }
        }
        
        const currentPath = window.location.pathname;
        router.push(getLoginRoute(currentPath));
      }
    } else {
      // Fallback: Check for JWT token
      const token = localStorage.getItem('auth_token');
      if (!token && isProduction) {
        const currentPath = window.location.pathname;
        router.push(getLoginRoute(currentPath));
      }
    }
  }, [user, loading, isGuest, router, skipAuth, useFirebaseAuth, isProduction]);

  // Show loading state only after mount to prevent hydration mismatch
  if (!mounted || (useFirebaseAuth && loading)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Checking authentication...</p>
          </div>
        </div>
      )
    );
  }

  // Phase 3: Allow guest access
  if (isGuest) {
    return <>{children}</>;
  }

  // Additional check: if no user and not loading, check for guest session
  // This handles the case where AuthContext hasn't updated isGuest yet
  if (!user && !loading && typeof window !== 'undefined') {
    const guestSessionId = getOrCreateGuestSessionId();
    if (guestSessionId) {
      // Guest session exists, allow access (AuthContext will update isGuest)
      return <>{children}</>;
    }
  }

  // In production, don't render if not authenticated
  if (isProduction && useFirebaseAuth && !user && !skipAuth) {
    return null; // Will redirect via useEffect
  }

  // In development with SKIP_AUTH, always render
  if (!isProduction && skipAuth) {
    return <>{children}</>;
  }

  // Render children if authenticated
  if (useFirebaseAuth && user) {
    return <>{children}</>;
  }

  // Fallback: Check JWT token
  if (!useFirebaseAuth) {
    const token = localStorage.getItem('auth_token');
    if (token || !isProduction) {
      return <>{children}</>;
    }
  }

  // Not authenticated, show loading (will redirect)
  return (
    fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    )
  );
}

