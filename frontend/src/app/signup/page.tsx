'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { LoginHeader } from '@/components/auth/LoginHeader';
import { SignupForm } from '@/components/auth/SignupForm';
import { cn } from '@/lib/utils';
import { routes } from '@/config/routes';
import { colors, spacing, animationDurations } from '@/config/visual-effects';

/**
 * Signup Page Content Component
 * Handles search params and redirect logic
 */
function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const redirect = searchParams.get('redirect') || routes.home;

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push(redirect);
    }
  }, [user, loading, router, redirect]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className={cn('min-h-screen', 'flex items-center justify-center', colors.background.primary)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto" />
          <p className={cn('mt-4', 'text-sm', colors.text.secondary)}>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className={cn('min-h-screen', 'flex flex-col', colors.background.primary)}>
      {/* Header */}
      <LoginHeader />

      {/* Main Content */}
      <main
        className={cn(
          'flex-1',
          'flex items-center justify-center',
          spacing.container.pagePadding,
          'pt-24' // Account for fixed header
        )}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: animationDurations.pageTransition }}
          className="w-full flex justify-center"
        >
          <SignupForm />
        </motion.div>
      </main>

      {/* Footer */}
      <footer
        className={cn(
          'py-8',
          'text-center',
          spacing.container.horizontalPadding
        )}
      >
        <a
          href={routes.home}
          className={cn(
            'text-sm',
            colors.text.tertiary,
            'hover:text-theme-text-secondary',
            'transition-colors',
            'duration-200'
          )}
        >
          ← Back to home
        </a>
      </footer>
    </div>
  );
}

/**
 * Signup Page
 * Beautiful, minimalist signup page matching login page design
 * Implements Phase 1 of the authentication system fixes PRD
 */
export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className={cn('min-h-screen', 'flex items-center justify-center', colors.background.primary)}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto" />
            <p className={cn('mt-4', 'text-sm', colors.text.secondary)}>Loading...</p>
          </div>
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}

