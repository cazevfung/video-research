'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { ToastProps } from '@/components/ui/Toast';
import { apiConfig } from '@/config/api';

export interface Toast extends ToastProps {
  id: string;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (props: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (props: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = {
        ...props,
        id,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto-remove after duration (uses config default)
      const duration = props.duration ?? apiConfig.toast.defaultDuration;
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, title?: string) => {
      return showToast({
        variant: 'success',
        title: title || 'Success',
        description: message,
      });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      return showToast({
        variant: 'error',
        title: title || 'Error',
        description: message,
      });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      return showToast({
        variant: 'warning',
        title: title || 'Warning',
        description: message,
      });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      return showToast({
        variant: 'default',
        title: title || 'Info',
        description: message,
      });
    },
    [showToast]
  );

  // Listen for auth errors from hooks
  // Use ref to access latest showToast without adding it to deps
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Track if we've already shown an auth error toast to prevent duplicates
  // Multiple hooks (useUserData, useTier, useTaskManager) can all dispatch auth-error events
  // Use a timestamp-based deduplication to prevent multiple toasts within a short time window
  const authErrorTimestampRef = useRef<number>(0);
  const DEDUP_WINDOW_MS = 5000; // 5 seconds window to prevent duplicate toasts
  const toastsRef = useRef(toasts);
  
  // Keep toasts ref updated without causing re-renders
  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      const now = Date.now();
      
      // Prevent showing multiple "Session Expired" toasts within a short time window
      // Multiple hooks may dispatch auth-error events simultaneously (within milliseconds)
      const timeSinceLastToast = now - authErrorTimestampRef.current;
      if (timeSinceLastToast < DEDUP_WINDOW_MS) {
        // Too soon, ignore this duplicate event (likely from another hook)
        return;
      }
      
      // Check if a "Session Expired" toast already exists
      const existingAuthToast = toastsRef.current.find(
        t => t.title === 'Session Expired' && t.variant === 'error'
      );
      if (existingAuthToast) {
        // Toast already exists, don't show another one
        return;
      }

      const { code, message, action } = event.detail;
      
      showToastRef.current({
        variant: 'error',
        title: 'Session Expired',
        description: message || 'Your session has expired. Please refresh the page.',
        duration: apiConfig.toast.authErrorDuration, // Don't auto-dismiss (0 from config)
        action: action === 'refresh' ? {
          label: 'Refresh Page',
          onClick: () => {
            window.location.reload();
          }
        } : undefined,
      });

      // Update timestamp to track when we last showed an auth error toast
      authErrorTimestampRef.current = now;
    };

    window.addEventListener('auth-error', handleAuthError as EventListener);
    
    return () => {
      window.removeEventListener('auth-error', handleAuthError as EventListener);
    };
  }, []); // Empty deps - event listener doesn't need to re-register

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}


