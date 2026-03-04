'use client';

import { useState, useMemo, useEffect } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { SummaryGrid } from '@/components/history/SummaryGrid';
import { MasonryGrid } from '@/components/history/MasonryGrid';
import { SummaryDetailView } from '@/components/history/SummaryDetailView';
import { SearchBar } from '@/components/history/SearchBar';
import { SortDropdown, SortOption, SORT_OPTIONS } from '@/components/history/SortDropdown';
import { BulkActionsBar } from '@/components/history/BulkActionsBar';
import { SummaryGridSkeleton } from '@/components/ui/LoadingSkeleton';
import { HistoryDebugPanel } from '@/components/history/HistoryDebugPanel';
import { SummaryListItem, SummaryResponse, ResearchResponse } from '@/types';
import { getSummary, getResearch, deleteSummary, deleteResearch } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getDateTimestamp } from '@/utils/date';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { AlertCircle, History as HistoryIcon, ChevronLeft, ChevronRight, CheckSquare, Square, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { colors, spacing, typography, borderRadius, historyConfig, animationDurations, statusBorder, statusBackground, iconSizes } from '@/config/visual-effects';
import { cn } from '@/lib/utils';

/**
 * History Page
 * Displays past summaries in a grid view with detail modal
 * Phase 3: Added search, sorting, bulk actions, export, and loading skeleton
 * Phase 1: Added page rendering verification and debugging
 */
export default function HistoryPage() {
  // Phase 1: Verify page rendering on mount
  useEffect(() => {
    console.log('[HistoryPage] Component mounted');
    console.log('[HistoryPage] Route:', window.location.pathname);
    return () => {
      console.log('[HistoryPage] Component unmounting');
    };
  }, []);

  const { summaries, pagination, loading, error, fetchHistory, debugInfo } = useHistory();
  
  // Phase 1: Log state changes for debugging
  useEffect(() => {
    console.log('[HistoryPage] State update:', {
      summariesCount: summaries.length,
      loading,
      error: error ? { code: error.code, message: error.message } : null,
      pagination: pagination ? {
        page: pagination.page,
        totalPages: pagination.totalPages,
        total: pagination.total,
      } : null,
    });
  }, [summaries.length, loading, error, pagination]);
  const [selectedSummary, setSelectedSummary] = useState<SummaryResponse | null>(null);
  const [selectedResearch, setSelectedResearch] = useState<ResearchResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>(SORT_OPTIONS[0]); // Default: Date (Newest)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // Phase 4: Retry tracking for error recovery
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const toast = useToast();

  // Load sort preference from localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem('history-sort');
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort);
        const found = SORT_OPTIONS.find(
          (opt) => opt.field === parsed.field && opt.order === parsed.order
        );
        if (found) {
          setSortOption(found);
        }
      } catch {
        // Invalid saved sort, use default
      }
    }
  }, []);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem('history-sort', JSON.stringify({ field: sortOption.field, order: sortOption.order }));
  }, [sortOption]);

  // Filter and sort summaries
  const filteredAndSortedSummaries = useMemo(() => {
    let filtered = summaries;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (summary) =>
          summary.batch_title.toLowerCase().includes(query) ||
          summary.source_videos.some((video) => video.title.toLowerCase().includes(query))
      );
    }

    // Apply sorting by summary/research creation date (with stable secondary sort by _id)
    const sorted = [...filtered].sort((a, b) => {
      const dateA = getDateTimestamp(a.created_at, 0);
      const dateB = getDateTimestamp(b.created_at, 0);
      const cmp = sortOption.order === 'asc' ? dateA - dateB : dateB - dateA;
      return cmp !== 0 ? cmp : (a._id < b._id ? -1 : a._id > b._id ? 1 : 0);
    });

    return sorted;
  }, [summaries, searchQuery, sortOption]);

  const handleSummaryClick = async (item: SummaryListItem) => {
    if (showCheckboxes) {
      // Toggle selection if in bulk mode
      handleSelect(item._id, !selectedIds.has(item._id));
      return;
    }

    setLoadingDetail(true);
    setIsDetailOpen(true);
    setSelectedSummary(null);
    setSelectedResearch(null);

    try {
      // Phase 4: Check type and fetch appropriate data
      const itemType = item.type || 'summary'; // Default to summary for backward compatibility
      
      if (itemType === 'research') {
        const response = await getResearch(item._id);
        if (response.error) {
          toast.error(response.error.message || 'Failed to load research');
          setIsDetailOpen(false);
        } else if (response.data) {
          setSelectedResearch(response.data);
        }
      } else {
        const response = await getSummary(item._id);
        if (response.error) {
          toast.error(response.error.message || 'Failed to load summary');
          setIsDetailOpen(false);
        } else if (response.data) {
          setSelectedSummary(response.data);
        }
      }
    } catch (err) {
      toast.error('Failed to load details');
      setIsDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedSummary(null);
    setSelectedResearch(null);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isDetailOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore body scroll when modal closes
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isDetailOpen]);

  const handlePageChange = (newPage: number) => {
    if (pagination && pagination.totalPages && newPage >= 1 && newPage <= pagination.totalPages) {
      fetchHistory(newPage);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Phase 4: Enhanced retry handler with retry count tracking
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    
    try {
      await fetchHistory(pagination?.page || 1);
      // Reset retry count on success
      setRetryCount(0);
    } catch (err) {
      // Error is already handled by useHistory hook
      if (process.env.NODE_ENV === 'development') {
        console.error('[HistoryPage] Retry failed:', err);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // Phase 4: Log detailed errors in development mode (using console.log instead of console.error for debug info)
  useEffect(() => {
    if (error && process.env.NODE_ENV === 'development') {
      // Safe stringify function to handle circular references
      const safeStringify = (obj: any, maxDepth = 3, currentDepth = 0): string => {
        if (currentDepth >= maxDepth) return '[Max Depth Reached]';
        if (obj === null || obj === undefined) return String(obj);
        if (typeof obj !== 'object') return String(obj);
        
        try {
          const seen = new WeakSet();
          return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular Reference]';
              }
              seen.add(value);
            }
            return value;
          }, 2);
        } catch (e) {
          return `[Stringify Error: ${e instanceof Error ? e.message : 'Unknown'}]`;
        }
      };

      // Use console.warn for connection errors (expected when backend is down)
      // Use console.error only for unexpected errors
      const isConnectionError = error.code === 'CONNECTION_FAILED' || error.code === 'NETWORK_ERROR';
      const logMethod = isConnectionError ? console.warn : console.error;
      
      console.group(isConnectionError ? '⚠️ History Page Connection Issue' : '❌ History Page Error');
      logMethod('Error Code:', error.code);
      logMethod('Error Message:', error.message);
      if (error.details !== undefined) {
        try {
          logMethod('Error Details:', safeStringify(error.details));
        } catch (e) {
          logMethod('Error Details:', '[Unable to stringify - may contain circular references]');
        }
      }
      console.log('Retry Count:', retryCount);
      console.log('Current Page:', pagination?.page || 'N/A');
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }, [error, retryCount, pagination]);

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedSummaries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedSummaries.map((s) => s._id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map(async (id) => {
        const item = filteredAndSortedSummaries.find((s) => s._id === id);
        const type = item?.type ?? 'summary';
        const response = type === 'research' ? await deleteResearch(id) : await deleteSummary(id);
        if (response.error) {
          throw new Error(response.error.message || `Failed to delete ${type} ${id}`);
        }
      });

      await Promise.all(deletePromises);
      toast.success(`Deleted ${selectedIds.size} ${selectedIds.size === 1 ? 'item' : 'items'}`);
      setSelectedIds(new Set());
      setShowCheckboxes(false);
      fetchHistory(pagination?.page || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete items');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDelete = async (id: string, type?: 'summary' | 'research') => {
    try {
      const itemType = type ?? summaries.find((s) => s._id === id)?.type ?? 'summary';
      const response = itemType === 'research' ? await deleteResearch(id) : await deleteSummary(id);
      if (response.error) {
        toast.error(response.error.message || `Failed to delete ${itemType === 'research' ? 'research' : 'summary'}`);
        return;
      }
      toast.success(itemType === 'research' ? 'Research deleted' : 'Summary deleted');
      fetchHistory(pagination?.page || 1);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className={spacing.container.pagePadding}>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className={spacing.margin.xl}>
          {/* Phase 5: Debug Panel */}
          {debugInfo && (
            <HistoryDebugPanel
              userId={debugInfo.userId}
              lastResponse={debugInfo.lastResponse}
              lastError={debugInfo.lastError}
              summariesCount={summaries.length}
            />
          )}
          
          <div className={cn('flex items-center justify-between', spacing.margin.sm)}>
            <div>
              <h1 className={cn(typography.fontSize.xl, typography.fontWeight.bold, colors.text.primary)}>
                History
              </h1>
              <p className={cn(colors.text.tertiary, spacing.margin.xs)}>
                View and manage your past summaries
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCheckboxes(!showCheckboxes);
                if (showCheckboxes) {
                  setSelectedIds(new Set());
                }
              }}
              className={cn('flex items-center', spacing.gap.sm)}
            >
              {showCheckboxes ? (
                <>
                  <Square className={iconSizes.sm} />
                  Cancel Selection
                </>
              ) : (
                <>
                  <CheckSquare className={iconSizes.sm} />
                  Select
                </>
              )}
            </Button>
          </div>

          {/* Search and Sort Bar */}
          {!loading && !error && summaries.length > 0 && (
            <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center', spacing.gap.md, spacing.margin.md)}>
              <div className="flex-1">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
              <SortDropdown value={sortOption} onChange={setSortOption} />
              {showCheckboxes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className={cn('flex items-center', spacing.gap.sm)}
                >
                  {selectedIds.size === filteredAndSortedSummaries.length ? (
                    <>
                      <Square className={iconSizes.sm} />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className={iconSizes.sm} />
                      Select All
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && <SummaryGridSkeleton count={6} />}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDurations.pageTransition }}
            className={spacing.margin.lg}
          >
            <Card className={cn(`border ${colors.statusBorder.error}`, colors.statusBackground.error)}>
              <div className={cn('flex flex-col sm:flex-row items-start sm:items-center', spacing.gap.md, spacing.padding.md)}>
                <AlertCircle className={cn(iconSizes.md, colors.status.error, 'flex-shrink-0')} />
                <div className="flex-1 min-w-0">
                  <p className={cn(typography.fontWeight.medium, colors.status.error, spacing.margin.xs)}>
                    Failed to load history
                  </p>
                  <p className={cn(typography.fontSize.sm, colors.text.tertiary, spacing.margin.xs)}>
                    {/* Phase 4: More user-friendly error messages */}
                    {error.code === 'NETWORK_ERROR' || error.code === 'CONNECTION_ERROR'
                      ? 'Unable to connect to the server. Please check your internet connection and try again.'
                      : error.code === 'TIMEOUT_ERROR'
                      ? 'The request took too long to complete. Please try again.'
                      : error.code === 'DATA_VALIDATION_ERROR'
                      ? 'Received invalid data from the server. Please try refreshing the page.'
                      : error.code === 'UNAUTHORIZED' || error.code === 'AUTH_ERROR'
                      ? 'Authentication error. Please sign in again.'
                      : error.message || 'An unexpected error occurred. Please try again.'}
                  </p>
                  {/* Phase 4: Show retry count if multiple retries */}
                  {retryCount > 0 && (
                    <p className={cn(typography.fontSize.xs, colors.text.muted, spacing.margin.xs)}>
                      Retry attempt {retryCount}
                    </p>
                  )}
                  {/* Phase 3: Show helpful suggestions for common errors */}
                  {error.details?.suggestions && Array.isArray(error.details.suggestions) && error.details.suggestions.length > 0 && (
                    <div className={cn(spacing.margin.sm)}>
                      <p className={cn(typography.fontSize.xs, typography.fontWeight.medium, colors.text.secondary, spacing.margin.xs)}>
                        Suggestions:
                      </p>
                      <ul className={cn('list-disc list-inside', spacing.margin.xs, typography.fontSize.xs, colors.text.tertiary)}>
                        {error.details.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Phase 2: Show error code and details in development mode */}
                  {error.code && (
                    <p className={cn(typography.fontSize.xs, colors.text.muted, spacing.margin.xs)}>
                      Error Code: {error.code}
                    </p>
                  )}
                  {error.details && typeof error.details === 'object' && (
                    <details className={cn(spacing.margin.xs)}>
                      <summary className={cn(typography.fontSize.xs, colors.text.muted, 'cursor-pointer hover:text-theme-text-secondary')}>
                        Show technical details
                      </summary>
                      <pre className={cn(
                        typography.fontSize.xs,
                        colors.text.muted,
                        spacing.padding.sm,
                        spacing.margin.xs,
                        'bg-theme-bg-secondary rounded overflow-auto max-h-48'
                      )}>
                        {JSON.stringify(error.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className={cn('flex items-center', spacing.gap.sm, 'flex-shrink-0')}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={isRetrying || loading}
                    className={cn(
                      colors.border.default,
                      colors.text.secondary,
                      'hover:bg-theme-bg-tertiary',
                      (isRetrying || loading) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 className={cn(iconSizes.sm, 'animate-spin', spacing.margin.xs)} />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <AlertCircle className={cn(iconSizes.sm, spacing.margin.xs)} />
                        {retryCount > 0 ? `Retry (${retryCount})` : 'Retry'}
                      </>
                    )}
                  </Button>
                  {/* Phase 4: Show refresh button as alternative */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className={cn(
                      colors.text.tertiary,
                      'hover:bg-theme-bg-tertiary'
                    )}
                    title="Refresh page"
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAndSortedSummaries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDurations.pageTransition }}
            className={cn(
              borderRadius.lg,
              `border ${colors.border.default} ${colors.background.tertiary}`,
              spacing.padding["2xl"],
              'text-center'
            )}
          >
            <HistoryIcon className={cn('mx-auto', iconSizes["2xl"], spacing.margin.md, colors.text.muted)} />
            <p className={cn(spacing.margin.sm, typography.fontSize.lg, typography.fontWeight.medium, colors.text.secondary)}>
              {searchQuery ? 'No summaries found' : 'No summaries yet'}
            </p>
            <p className={cn(colors.text.tertiary, spacing.margin.xs)}>
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Create your first batch summary to see it here.'}
            </p>
            {/* Phase 2: Show helpful message if summaries exist but are filtered out */}
            {summaries.length > 0 && searchQuery && (
              <p className={cn(typography.fontSize.sm, colors.text.muted, spacing.margin.sm)}>
                {summaries.length} {summaries.length === 1 ? 'summary' : 'summaries'} available, but none match your search.
              </p>
            )}
          </motion.div>
        )}

        {/* Summary Grid - Masonry Layout */}
        {!loading && !error && filteredAndSortedSummaries.length > 0 && (
          <>
            <MasonryGrid
              summaries={filteredAndSortedSummaries}
              onSummaryClick={handleSummaryClick}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              showCheckboxes={showCheckboxes}
            />

            {/* Pagination */}
            {pagination && pagination.totalPages !== undefined && pagination.totalPages > 1 && (
              <div className={cn('mt-8 flex items-center justify-center', historyConfig.pagination.gap)}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={cn('flex items-center', spacing.gap.xs)}
                >
                  <ChevronLeft className={iconSizes.sm} />
                  Previous
                </Button>
                <div
                  className={cn(
                    'flex items-center',
                    spacing.gap.sm,
                    spacing.padding.md,
                    typography.fontSize.sm,
                    colors.text.tertiary
                  )}
                >
                  <span>
                    Page {pagination.page} of {pagination.totalPages ?? '?'}
                  </span>
                  <span className={colors.text.muted}>•</span>
                  <span>{pagination.total} total</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.totalPages !== undefined && pagination.page >= pagination.totalPages}
                  className={cn('flex items-center', spacing.gap.xs)}
                >
                  Next
                  <ChevronRight className={iconSizes.sm} />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Bulk Actions Bar */}
        {showCheckboxes && selectedIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onDelete={handleBulkDelete}
            onClearSelection={() => setSelectedIds(new Set())}
            isDeleting={isDeleting}
          />
        )}

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected items</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedIds.size}{' '}
                {selectedIds.size === 1 ? 'item' : 'items'}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkDelete}
                disabled={isDeleting}
                className={cn(
                  statusBackground.error,
                  'hover:bg-dashboard-bg-error-secondary'
                )}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Detail Modal */}
        <SummaryDetailView
          summary={loadingDetail ? null : selectedSummary}
          research={loadingDetail ? null : selectedResearch}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

