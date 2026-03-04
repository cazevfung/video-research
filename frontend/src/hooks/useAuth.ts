'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated as checkIsAuthenticated, validateAuthBypass, type User } from '@/lib/auth';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Custom hook for authentication
 * Returns mock user data during development
 * Will be replaced with real auth implementation later
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Validate auth configuration in development mode
    validateAuthBypass();
    
    async function checkAuth() {
      try {
        const authenticated = await checkIsAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}

