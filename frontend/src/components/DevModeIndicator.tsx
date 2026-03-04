'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isDevelopmentMode, getDevUserId } from '@/config/env';
import { healthCheck } from '@/lib/api';

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  services: Record<string, string>;
  storage?: {
    mode: 'local' | 'firestore';
    enabled: boolean;
    fileCount?: number;
    dataDirectory?: string;
  };
  auth?: {
    enabled: boolean;
    mode: 'firebase' | 'jwt';
  };
  version: string;
}

/**
 * Development Mode Indicator Component
 * Displays a floating indicator when running in development mode
 * Shows storage backend, auth status, and user ID from centralized config
 * Phase 5: Enhanced to show user ID and improved display
 */
export function DevModeIndicator() {
  const { t } = useTranslation('common');
  const [storageMode, setStorageMode] = useState<string>('unknown');
  const [authEnabled, setAuthEnabled] = useState<boolean>(false);
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Only fetch health check in development mode
    if (!isDevelopmentMode()) {
      return;
    }

    // Fetch health check to get storage mode and auth status
    healthCheck()
      .then((response) => {
        if (response.data) {
          const health = response.data as HealthCheckResponse;
          
          if (health.storage) {
            setStorageMode(health.storage.mode === 'local' ? 'Local' : 'Firestore');
            if (health.storage.fileCount !== undefined) {
              setFileCount(health.storage.fileCount);
            }
          }
          
          if (health.auth) {
            setAuthEnabled(health.auth.enabled);
          }
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch health check for dev mode indicator:', error);
        setStorageMode('unknown');
      });
  }, []);

  // Don't render until mounted (prevent hydration mismatch)
  if (!mounted || !isDevelopmentMode()) {
    return null;
  }

  const devUserId = getDevUserId();

  return (
    <div className="fixed top-16 right-4 z-50">
      <div 
        className="bg-yellow-500/90 dark:bg-yellow-600/90 text-black dark:text-yellow-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium backdrop-blur-sm border border-yellow-400/50 cursor-pointer hover:bg-yellow-500 dark:hover:bg-yellow-600 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to expand/collapse"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🧪</span>
          <div className="flex flex-col">
            <span className="font-semibold">{t('devMode.title')}</span>
            <div className="text-xs opacity-90">
              {t('devMode.storage')}: <span className="font-mono">{storageMode}</span>
              {fileCount !== null && (
                <span className="ml-2">{t('devMode.files', { count: fileCount })}</span>
              )}
            </div>
            <div className="text-xs opacity-90">
              {t('devMode.auth')}: <span className="font-mono">{authEnabled ? t('devMode.enabled') : t('devMode.disabled')}</span>
            </div>
            {isExpanded && (
              <>
                <div className="text-xs opacity-90 mt-1 pt-1 border-t border-yellow-400/30">
                  {t('devMode.userId')}: <span className="font-mono text-[10px]">{devUserId}</span>
                </div>
                {storageMode === 'Local' && fileCount === 0 && (
                  <div className="text-xs opacity-75 mt-1 text-yellow-900 dark:text-yellow-100">
                    ⚠️ {t('devMode.noLocalFiles')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

