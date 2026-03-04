'use client';

/**
 * Phase 1: Foundation - useCreditTransactions hook
 * Custom hook for fetching and managing credit transaction history
 */

import { useState, useEffect, useCallback } from 'react';
import { getCreditTransactions } from '@/lib/api';
import { CreditTransaction, PaginationInfo } from '@/types';
import { creditTransactions } from '@/config/credits';

// Define ApiError type locally
interface ApiError {
  code: string;
  message: string;
  details?: any;
}

interface UseCreditTransactionsReturn {
  transactions: CreditTransaction[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: ApiError | null;
  refetch: (page?: number, limit?: number) => Promise<void>;
  hasMore: boolean;
  currentPage: number;
  currentLimit: number;
}

/**
 * Custom hook for fetching credit transaction history
 */
export function useCreditTransactions(
  initialPage: number = 1,
  initialLimit: number = creditTransactions.defaultPageSize
): UseCreditTransactionsReturn {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentLimit] = useState(initialLimit);

  /**
   * Fetch credit transactions from API
   */
  const fetchTransactions = useCallback(
    async (page: number = currentPage, limit: number = currentLimit) => {
      setLoading(true);
      setError(null);

      try {
        const response = await getCreditTransactions(page, limit);

        if (response.error) {
          // Phase 7: Track retry count for retryable errors
          const isRetryable = 
            response.error.code === 'NETWORK_ERROR' ||
            response.error.code === 'TIMEOUT_ERROR' ||
            response.error.code === 'RATE_LIMIT';
          
          if (isRetryable) {
            setRetryCount((prev) => prev + 1);
          }
          
          setError(response.error);
          setTransactions([]);
          setPagination(null);
        } else if (response.data) {
          // Phase 7: Reset retry count on success
          if (retryCount > 0) {
            setRetryCount(0);
          }
          setTransactions(response.data.transactions);
          setPagination(response.data.pagination);
          setCurrentPage(page);
        }
      } catch (err) {
        const apiError: ApiError = {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to fetch credit transactions',
        };
        setError(apiError);
        setTransactions([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [currentPage, currentLimit]
  );

  /**
   * Refetch function exposed to components
   * Phase 7: Supports manual retry with reset of retry count
   */
  const refetch = useCallback(
    async (page?: number, limit?: number) => {
      setRetryCount(0); // Reset retry count on manual refetch
      setError(null);
      await fetchTransactions(page ?? currentPage, limit ?? currentLimit);
    },
    [fetchTransactions, currentPage, currentLimit]
  );

  // Fetch on mount
  useEffect(() => {
    fetchTransactions(initialPage, initialLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Phase 3: Support both totalPages and hasMore from backend
  const hasMore = pagination 
    ? (pagination.hasMore !== undefined 
        ? pagination.hasMore 
        : (pagination.totalPages !== undefined 
            ? pagination.page < pagination.totalPages 
            : false))
    : false;

  return {
    transactions,
    pagination,
    loading,
    error,
    refetch,
    hasMore,
    currentPage,
    currentLimit,
  };
}

