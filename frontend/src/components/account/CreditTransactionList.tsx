'use client';

/**
 * CreditTransactionList Component
 * Phase 5: Transaction history list with pagination and filters
 */

import * as React from 'react';
import { CreditTransaction, CreditTransactionType } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, borderRadius } from '@/config/visual-effects';
import { safeFormatDate } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { creditTransactions } from '@/config/credits';

interface CreditTransactionListProps {
  initialPage?: number;
  initialLimit?: number;
}

/**
 * Get transaction type icon
 */
function getTransactionIcon(type: CreditTransactionType) {
  switch (type) {
    case 'earned':
    case 'tier_upgrade':
    case 'purchased':
    case 'refunded':
      return ArrowUp;
    case 'spent':
      return ArrowDown;
    case 'reset':
      return RefreshCw;
    default:
      return TrendingUp;
  }
}

/**
 * Get transaction type color
 */
function getTransactionColor(type: CreditTransactionType): string {
  switch (type) {
    case 'earned':
    case 'tier_upgrade':
    case 'purchased':
    case 'refunded':
      return colors.status.success;
    case 'spent':
      return colors.status.error;
    case 'reset':
      return colors.status.info;
    default:
      return colors.text.secondary;
  }
}

/**
 * Format transaction type for display
 */
function formatTransactionType(type: CreditTransactionType): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format transaction amount with sign
 */
function formatAmount(amount: number, type: CreditTransactionType): string {
  const sign = type === 'spent' ? '-' : '+';
  return `${sign}${Math.abs(amount)}`;
}

export function CreditTransactionList({ 
  initialPage = 1, 
  initialLimit = creditTransactions.defaultPageSize 
}: CreditTransactionListProps) {
  const { i18n } = useTranslation();
  const [page, setPage] = React.useState(initialPage);
  const [limit, setLimit] = React.useState(initialLimit);
  const [filterType, setFilterType] = React.useState<CreditTransactionType | 'all'>('all');
  
  const { 
    transactions, 
    pagination, 
    loading, 
    error, 
    refetch,
    hasMore 
  } = useCreditTransactions(page, limit);

  // Filter transactions by type
  const filteredTransactions = React.useMemo(() => {
    if (filterType === 'all') {
      return transactions;
    }
    return transactions.filter(t => t.type === filterType);
  }, [transactions, filterType]);

  // Transaction type options for filter
  const transactionTypes: Array<{ value: CreditTransactionType | 'all'; label: string }> = [
    { value: 'all', label: 'All Types' },
    { value: 'earned', label: 'Earned' },
    { value: 'spent', label: 'Spent' },
    { value: 'reset', label: 'Reset' },
    { value: 'tier_upgrade', label: 'Tier Upgrade' },
    { value: 'purchased', label: 'Purchased' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    refetch(newPage, limit);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    refetch(1, newLimit);
  };

  const handleFilterChange = (type: CreditTransactionType | 'all') => {
    setFilterType(type);
    setPage(1);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>View your credit transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "p-4 rounded-lg border",
            colors.background.secondary,
            colors.border.default
          )}>
            <p className={cn(typography.fontSize.sm, colors.status.error)}>
              {error.message || 'Failed to load transactions'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch(page, limit)}
              className={cn(spacing.marginTop.sm)}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className={cn("flex items-center justify-between")}>
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View your credit transaction history</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch(page, limit)}
            disabled={loading}
            className={cn(spacing.gap.sm)}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("space-y-4")}>
          {/* Filters */}
          <div className={cn(
            "flex flex-wrap items-center gap-2",
            spacing.padding.md,
            borderRadius.md,
            colors.background.secondary,
            "border",
            colors.border.default
          )}>
            <div className={cn("flex items-center", spacing.gap.sm)}>
              <Filter className={cn("h-4 w-4", colors.text.secondary)} />
              <span className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
                Filter:
              </span>
            </div>
            {transactionTypes.map(({ value, label }) => (
              <Button
                key={value}
                variant={filterType === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(value)}
                className={cn(
                  filterType === value && colors.background.primary
                )}
              >
                {label}
                {filterType === value && (
                  <X className={cn("ml-1 h-3 w-3")} />
                )}
              </Button>
            ))}
          </div>

          {/* Transaction List */}
          {loading && !transactions.length ? (
            <div className={cn("space-y-2")}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-16 w-full rounded",
                    colors.background.tertiary,
                    "animate-pulse"
                  )}
                />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className={cn(
              "p-8 text-center",
              colors.text.secondary
            )}>
              <p className={cn(typography.fontSize.sm)}>
                No transactions found{filterType !== 'all' ? ` for ${formatTransactionType(filterType)}` : ''}.
              </p>
            </div>
          ) : (
            <div className={cn("space-y-2")}>
              {filteredTransactions.map((transaction) => {
                const Icon = getTransactionIcon(transaction.type);
                const color = getTransactionColor(transaction.type);
                
                return (
                  <div
                    key={transaction.transactionId}
                    className={cn(
                      "flex items-center justify-between",
                      spacing.padding.md,
                      borderRadius.md,
                      colors.background.secondary,
                      "border",
                      colors.border.default,
                      "hover:border-theme-border-strong transition-colors"
                    )}
                  >
                    <div className={cn("flex items-center", spacing.gap.md, "flex-1 min-w-0")}>
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full",
                        colors.background.tertiary,
                        color
                      )}>
                        <Icon className={cn("h-5 w-5")} />
                      </div>
                      <div className={cn("flex-1 min-w-0")}>
                        <div className={cn("flex items-center", spacing.gap.sm)}>
                          <p className={cn(
                            typography.fontSize.sm,
                            typography.fontWeight.medium,
                            colors.text.primary
                          )}>
                            {formatTransactionType(transaction.type)}
                          </p>
                          <span className={cn(
                            typography.fontSize.xs,
                            colors.text.tertiary
                          )}>
                            {safeFormatDate(transaction.timestamp, 'MMM d, yyyy h:mm a', 'N/A', i18n.language)}
                          </span>
                        </div>
                        <p className={cn(
                          typography.fontSize.xs,
                          colors.text.secondary,
                          "truncate"
                        )}>
                          {transaction.description}
                        </p>
                      </div>
                    </div>
                    <div className={cn("flex items-center", spacing.gap.lg, "flex-shrink-0")}>
                      <div className={cn("text-right")}>
                        <p className={cn(
                          typography.fontSize.lg,
                          typography.fontWeight.semibold,
                          color
                        )}>
                          {formatAmount(transaction.amount, transaction.type)}
                        </p>
                        <p className={cn(
                          typography.fontSize.xs,
                          colors.text.tertiary
                        )}>
                          Balance: {transaction.balanceAfter}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && (pagination.totalPages ? pagination.totalPages > 1 : hasMore || pagination.page > 1) && (
            <div className={cn(
              "flex items-center justify-between",
              spacing.padding.md,
              borderRadius.md,
              colors.background.secondary,
              "border",
              colors.border.default
            )}>
              <div className={cn("flex items-center", spacing.gap.md)}>
                <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                  {pagination.totalPages 
                    ? `Page ${pagination.page} of ${pagination.totalPages}`
                    : `Page ${pagination.page}`}
                </span>
                {pagination.total > 0 && (
                  <span className={cn(typography.fontSize.sm, colors.text.tertiary)}>
                    ({pagination.total} total)
                  </span>
                )}
              </div>
              
              <div className={cn("flex items-center", spacing.gap.sm)}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className={cn("h-4 w-4")} />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                  <ChevronRight className={cn("h-4 w-4")} />
                </Button>
              </div>
            </div>
          )}

          {/* Page Size Selector */}
          {pagination && (
            <div className={cn(
              "flex items-center justify-end",
              spacing.gap.sm
            )}>
              <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                Show:
              </span>
              <div className={cn("flex", spacing.gap.xs)}>
                {creditTransactions.pageSizeOptions.map((size) => (
                  <Button
                    key={size}
                    variant={limit === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLimitChange(size)}
                    disabled={loading}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

