'use client';

import { useState, useEffect } from 'react';
import { isDevelopmentMode, getDevUserId, getApiBaseUrl } from '@/config/env';
import { healthCheck } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp, Copy, RefreshCw } from 'lucide-react';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { cn } from '@/lib/utils';

interface HistoryDebugPanelProps {
  userId: string;
  lastResponse?: any;
  lastError?: any;
  summariesCount: number;
}

/**
 * History Debug Panel Component
 * Phase 5: Displays debug information for local development
 * Shows user ID, API response, storage mode, and error details
 */
export function HistoryDebugPanel({
  userId,
  lastResponse,
  lastError,
  summariesCount,
}: HistoryDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [storageMode, setStorageMode] = useState<string>('unknown');
  const [healthData, setHealthData] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchHealthCheck = async () => {
    setLoadingHealth(true);
    try {
      const response = await healthCheck();
      if (response.data) {
        setHealthData(response.data);
        if (response.data.storage) {
          setStorageMode(response.data.storage.mode === 'local' ? 'Local' : 'Firestore');
        }
      }
    } catch (error) {
      console.error('Failed to fetch health check:', error);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Fetch health check on mount
  useEffect(() => {
    fetchHealthCheck();
  }, []);

  if (!isDevelopmentMode()) {
    return null;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <Card className={cn('border-yellow-500/50 bg-yellow-500/5 dark:bg-yellow-500/10', spacing.margin.md)}>
      <div className={cn(spacing.padding.md)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐛</span>
            <h3 className={cn(typography.fontSize.lg, typography.fontWeight.semibold, colors.text.primary)}>
              Debug Panel (Dev Mode)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHealthCheck}
              disabled={loadingHealth}
              className="text-xs"
            >
              <RefreshCw className={cn('w-3 h-3', loadingHealth && 'animate-spin')} />
              Refresh Health
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className={cn('mt-4 space-y-4', spacing.padding.md, 'bg-theme-bg-secondary rounded-lg')}>
            {/* User Information */}
            <div>
              <h4 className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary, spacing.margin.sm)}>
                User Information
              </h4>
              <div className={cn('bg-theme-bg-tertiary rounded p-2 font-mono text-xs', colors.text.tertiary)}>
                <div className="flex items-center justify-between">
                  <span>User ID: {userId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(userId)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Storage Information */}
            <div>
              <h4 className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary, spacing.margin.sm)}>
                Storage Information
              </h4>
              <div className={cn('bg-theme-bg-tertiary rounded p-2 text-xs', colors.text.tertiary)}>
                <div>Mode: <span className="font-mono font-semibold">{storageMode}</span></div>
                {healthData?.storage?.fileCount !== undefined && (
                  <div>File Count: <span className="font-mono">{healthData.storage.fileCount}</span></div>
                )}
                {healthData?.storage?.dataDirectory && (
                  <div className="mt-1 text-[10px] opacity-75">
                    Directory: {healthData.storage.dataDirectory}
                  </div>
                )}
              </div>
            </div>

            {/* API Configuration */}
            <div>
              <h4 className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary, spacing.margin.sm)}>
                API Configuration
              </h4>
              <div className={cn('bg-theme-bg-tertiary rounded p-2 font-mono text-xs', colors.text.tertiary)}>
                <div className="flex items-center justify-between">
                  <span>Base URL: {getApiBaseUrl()}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(getApiBaseUrl())}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div>
              <h4 className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary, spacing.margin.sm)}>
                Summary Statistics
              </h4>
              <div className={cn('bg-theme-bg-tertiary rounded p-2 text-xs', colors.text.tertiary)}>
                <div>Loaded Summaries: <span className="font-mono font-semibold">{summariesCount}</span></div>
                {lastResponse?.pagination && (
                  <div className="mt-1">
                    <div>Total: {lastResponse.pagination.total}</div>
                    <div>Page: {lastResponse.pagination.page} / {lastResponse.pagination.totalPages}</div>
                    <div>Per Page: {lastResponse.pagination.limit}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Last API Response */}
            {lastResponse && (
              <div>
                <h4 className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary, spacing.margin.sm)}>
                  Last API Response
                </h4>
                <div className="relative">
                  <pre className={cn('bg-theme-bg-tertiary rounded p-2 font-mono text-[10px] overflow-x-auto max-h-48', colors.text.tertiary)}>
                    {formatJson(lastResponse)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formatJson(lastResponse))}
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Last Error */}
            {lastError && (
              <div>
                <h4 className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.status.error, spacing.margin.sm)}>
                  Last Error
                </h4>
                <div className="relative">
                  <pre className={cn('bg-red-500/10 border border-red-500/20 rounded p-2 font-mono text-[10px] overflow-x-auto max-h-48', colors.status.error)}>
                    {formatJson(lastError)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formatJson(lastError))}
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                {lastError.details?.suggestions && (
                  <div className={cn('mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs', colors.text.secondary)}>
                    <div className="font-semibold mb-1">💡 Suggestions:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {lastError.details.suggestions.map((suggestion: string, idx: number) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Health Check Data */}
            {healthData && (
              <div>
                <h4 className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.secondary, spacing.margin.sm)}>
                  Health Check Data
                </h4>
                <div className="relative">
                  <pre className={cn('bg-theme-bg-tertiary rounded p-2 font-mono text-[10px] overflow-x-auto max-h-48', colors.text.tertiary)}>
                    {formatJson(healthData)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formatJson(healthData))}
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

