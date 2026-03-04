'use client';

/**
 * CRITICAL: Import i18n first to ensure synchronous initialization
 * This must happen before any React components render to avoid race conditions
 * The import triggers i18n.init() at module load time
 */
import '@/lib/i18n';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UserDataProvider } from '@/contexts/UserDataContext';
import { TaskManagerProvider } from '@/contexts/TaskManagerContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { CitationProvider } from '@/contexts/CitationContext';

/**
 * Root providers component
 * Wraps the app with all necessary context providers
 * Phase 2: Added UserDataProvider for centralized user data management
 * ToastProvider must wrap UserDataProvider since useUserData hook uses useToast
 * 
 * Phase 1 Fix: Removed I18nInit component
 * - i18n is now initialized synchronously in @/lib/i18n at import time
 * - No race conditions - i18n is ready before any components render
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <ToastProvider>
        <AuthProvider>
          <UserDataProvider>
            <TaskManagerProvider>
              <CitationProvider>
                <LanguageProvider>
                  {children}
                </LanguageProvider>
              </CitationProvider>
            </TaskManagerProvider>
          </UserDataProvider>
        </AuthProvider>
      </ToastProvider>
    </NextThemesProvider>
  );
}

