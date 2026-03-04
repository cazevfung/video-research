/**
 * ProtectedRoute Component
 * Phase 3: Protects routes that require authentication (not guest access)
 * Redirects guests to login with a message
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getLoginRoute } from '@/config/routes';
import { routes } from '@/config/routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectMessage?: string;
}

/**
 * ProtectedRoute Component
 * Ensures user is authenticated (not a guest) before rendering children
 * Used for routes like history, settings, account that require full authentication
 */
export function ProtectedRoute({ 
  children, 
  fallback,
  redirectMessage = 'Please login to access this page.',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading, isGuest } = useAuth();

  useEffect(() => {
    // Redirect guests to login
    if (!loading && (isGuest || !user)) {
      const currentPath = window.location.pathname;
      const loginRoute = getLoginRoute(currentPath);
      router.push(loginRoute);
    }
  }, [user, loading, isGuest, router]);

  // Show loading state
  if (loading) {
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

  // Don't render if not authenticated or is guest
  if (isGuest || !user) {
    return null; // Will redirect via useEffect
  }

  // Render children if authenticated
  return <>{children}</>;
}


