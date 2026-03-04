'use client';

/**
 * Centralized User Data Context
 * Single source of truth for user data, quota, credits, and tier
 * Prevents multiple polling instances by providing shared state
 * Phase 2: Connection Crash Fix - High Priority Improvements
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useUserData as useUserDataHook } from '@/hooks/useUserData';
import { useTier as useTierHook } from '@/hooks/useTier';
import { 
  User, 
  UserQuota, 
  UserCredits, 
  TierStatus, 
  CreditTransactionsResponse 
} from '@/types';

// Define ApiError type locally to match hook return types
interface ApiError {
  code: string;
  message: string;
  details?: any;
}

interface UserDataContextValue {
  // User data
  user: User | null;
  quota: UserQuota | null;
  credits: UserCredits | null;
  
  // Tier data
  tierStatus: TierStatus | null;
  
  // Loading states
  loading: boolean;
  tierLoading: boolean;
  
  // Errors
  error: ApiError | null;
  tierError: ApiError | null;
  
  // Actions
  refetchUserData: () => Promise<void>;
  refetchTier: () => Promise<void>;
  requestUpgrade: (tier: string) => Promise<boolean>;
  updateCreditsOptimistically: (updates: Partial<UserCredits>) => void;
  fetchTransactionHistory: (page?: number, limit?: number) => Promise<CreditTransactionsResponse | null>;
}

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
  // Single instance of useUserData
  const {
    user,
    quota,
    credits,
    loading,
    error,
    refetch: refetchUserData,
    updateCreditsOptimistically,
    fetchTransactionHistory,
  } = useUserDataHook();
  
  // Single instance of useTier
  const {
    tierStatus,
    loading: tierLoading,
    error: tierError,
    refetch: refetchTier,
    requestUpgrade: requestUpgradeHook,
  } = useTierHook();

  // Wrapper for requestUpgrade to match interface
  const requestUpgrade = async (tier: string): Promise<boolean> => {
    try {
      await requestUpgradeHook(tier as 'starter' | 'pro' | 'premium');
      return true;
    } catch (error) {
      console.error('Failed to request upgrade:', error);
      return false;
    }
  };
  
  const value: UserDataContextValue = {
    user,
    quota,
    credits,
    tierStatus,
    loading,
    tierLoading,
    error,
    tierError,
    refetchUserData,
    refetchTier,
    requestUpgrade,
    updateCreditsOptimistically,
    fetchTransactionHistory,
  };
  
  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

/**
 * Hook to access user data context
 * Replaces direct useUserData and useTier calls
 */
export function useUserDataContext() {
  const context = useContext(UserDataContext);
  
  if (context === undefined) {
    throw new Error('useUserDataContext must be used within UserDataProvider');
  }
  
  return context;
}

// Convenience hooks for specific data
export function useUser() {
  const { user, loading, error } = useUserDataContext();
  return { user, loading, error };
}

export function useQuota() {
  const { quota, loading, error } = useUserDataContext();
  return { quota, loading, error };
}

export function useCredits() {
  const { credits, loading, error } = useUserDataContext();
  return { credits, loading, error };
}

export function useTierContext() {
  const { tierStatus, tierLoading, tierError, requestUpgrade, refetchTier } = useUserDataContext();
  return { 
    tierStatus, 
    loading: tierLoading, 
    error: tierError, 
    requestUpgrade, 
    refetch: refetchTier 
  };
}


