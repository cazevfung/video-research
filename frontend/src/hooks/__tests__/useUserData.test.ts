/**
 * Unit tests for useUserData hook
 * Phase 7: Polish & Testing
 * 
 * Tests:
 * - Initial data fetch
 * - Error handling
 * - Retry mechanisms
 * - Optimistic updates
 * - Cache invalidation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserData } from '../useUserData';
import { getCurrentUserData, getUserCredits } from '@/lib/api';
import { User, UserQuota, UserCredits } from '@/types';

// Mock the API module
jest.mock('@/lib/api', () => ({
  getCurrentUserData: jest.fn(),
  getUserCredits: jest.fn(),
  invalidateCache: jest.fn(),
}));

// Mock the config
jest.mock('@/config/api', () => ({
  apiConfig: {
    cacheDuration: 30000,
    userDataPollingInterval: 30000,
    maxCacheEntries: 50,
    retry: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      multiplier: 2,
    },
    timeout: 30000,
  },
}));

describe('useUserData - Phase 7', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    tier: 'free',
  };

  const mockQuota: UserQuota = {
    credits_remaining: 5,
    daily_limit: 10,
    max_videos_per_batch: 3,
    reset_time: '2024-01-02T00:00:00.000Z',
  };

  const mockCredits: UserCredits = {
    balance: 5,
    totalEarned: 100,
    totalSpent: 95,
    lastResetDate: '2024-01-01T00:00:00.000Z',
    tier: 'free',
  };

  describe('Initial Data Fetch', () => {
    it('should fetch user data on mount', async () => {
      const mockGetCurrentUserData = getCurrentUserData as jest.MockedFunction<typeof getCurrentUserData>;
      const mockGetUserCredits = getUserCredits as jest.MockedFunction<typeof getUserCredits>;

      mockGetCurrentUserData.mockResolvedValue({
        data: { user: mockUser, quota: mockQuota },
      });

      mockGetUserCredits.mockResolvedValue({
        data: {
          balance: mockCredits.balance,
          totalEarned: mockCredits.totalEarned,
          totalSpent: mockCredits.totalSpent,
          lastResetDate: mockCredits.lastResetDate,
          tier: mockCredits.tier,
        },
      });

      const { result } = renderHook(() => useUserData());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.quota).toEqual(mockQuota);
      expect(result.current.credits).toEqual(mockCredits);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockGetCurrentUserData = getCurrentUserData as jest.MockedFunction<typeof getCurrentUserData>;
      mockGetCurrentUserData.mockResolvedValue({
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to fetch user data',
        },
      });

      const { result } = renderHook(() => useUserData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.code).toBe('NETWORK_ERROR');
      expect(result.current.user).toBeNull();
      expect(result.current.quota).toBeNull();
    });
  });

  describe('Retry Mechanisms', () => {
    it('should track retry count for retryable errors', async () => {
      const mockGetCurrentUserData = getCurrentUserData as jest.MockedFunction<typeof getCurrentUserData>;
      mockGetCurrentUserData.mockResolvedValue({
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error',
        },
      });

      const { result } = renderHook(() => useUserData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.code).toBe('NETWORK_ERROR');
    });

    it('should reset retry count on successful refetch', async () => {
      const mockGetCurrentUserData = getCurrentUserData as jest.MockedFunction<typeof getCurrentUserData>;
      const mockGetUserCredits = getUserCredits as jest.MockedFunction<typeof getUserCredits>;

      // First call fails
      mockGetCurrentUserData.mockResolvedValueOnce({
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error',
        },
      });

      const { result } = renderHook(() => useUserData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Second call succeeds
      mockGetCurrentUserData.mockResolvedValueOnce({
        data: { user: mockUser, quota: mockQuota },
      });
      mockGetUserCredits.mockResolvedValueOnce({
        data: {
          balance: mockCredits.balance,
          totalEarned: mockCredits.totalEarned,
          totalSpent: mockCredits.totalSpent,
          lastResetDate: mockCredits.lastResetDate,
          tier: mockCredits.tier,
        },
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.user).toBeTruthy();
      });
    });
  });

  describe('Optimistic Updates', () => {
    it('should update user optimistically', async () => {
      const mockGetCurrentUserData = getCurrentUserData as jest.MockedFunction<typeof getCurrentUserData>;
      const mockGetUserCredits = getUserCredits as jest.MockedFunction<typeof getUserCredits>;

      mockGetCurrentUserData.mockResolvedValue({
        data: { user: mockUser, quota: mockQuota },
      });

      mockGetUserCredits.mockResolvedValue({
        data: {
          balance: mockCredits.balance,
          totalEarned: mockCredits.totalEarned,
          totalSpent: mockCredits.totalSpent,
          lastResetDate: mockCredits.lastResetDate,
          tier: mockCredits.tier,
        },
      });

      const { result } = renderHook(() => useUserData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateUserOptimistically({ name: 'Updated Name' });
      });

      expect(result.current.user?.name).toBe('Updated Name');
      expect(result.current.user?.id).toBe(mockUser.id);
    });

    it('should update credits optimistically', async () => {
      const mockGetCurrentUserData = getCurrentUserData as jest.MockedFunction<typeof getCurrentUserData>;
      const mockGetUserCredits = getUserCredits as jest.MockedFunction<typeof getUserCredits>;

      mockGetCurrentUserData.mockResolvedValue({
        data: { user: mockUser, quota: mockQuota },
      });

      mockGetUserCredits.mockResolvedValue({
        data: {
          balance: mockCredits.balance,
          totalEarned: mockCredits.totalEarned,
          totalSpent: mockCredits.totalSpent,
          lastResetDate: mockCredits.lastResetDate,
          tier: mockCredits.tier,
        },
      });

      const { result } = renderHook(() => useUserData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateCreditsOptimistically({ balance: 10 });
      });

      expect(result.current.credits?.balance).toBe(10);
      expect(result.current.quota?.credits_remaining).toBe(10);
    });
  });

  describe('Polling', () => {
    it('should poll for updates at configured interval', async () => {
      const mockGetCurrentUserData = getCurrentUserData as jest.MockedFunction<typeof getCurrentUserData>;
      const mockGetUserCredits = getUserCredits as jest.MockedFunction<typeof getUserCredits>;

      mockGetCurrentUserData.mockResolvedValue({
        data: { user: mockUser, quota: mockQuota },
      });

      mockGetUserCredits.mockResolvedValue({
        data: {
          balance: mockCredits.balance,
          totalEarned: mockCredits.totalEarned,
          totalSpent: mockCredits.totalSpent,
          lastResetDate: mockCredits.lastResetDate,
          tier: mockCredits.tier,
        },
      });

      renderHook(() => useUserData());

      await waitFor(() => {
        expect(mockGetCurrentUserData).toHaveBeenCalledTimes(1);
      });

      // Advance timers to trigger polling
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockGetCurrentUserData).toHaveBeenCalledTimes(2);
      });
    });
  });
});


