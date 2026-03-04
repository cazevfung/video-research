'use client';

/**
 * Centralized Task Manager Context
 * Single source of truth for task management
 * Prevents multiple instances by providing shared state
 * Fixes React error #310 by ensuring consistent hook order
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useTaskManager as useTaskManagerHook, UseTaskManagerReturn } from '@/hooks/useTaskManager';
import { useUserDataContext } from '@/contexts/UserDataContext';

const TaskManagerContext = createContext<UseTaskManagerReturn | undefined>(undefined);

interface TaskManagerProviderProps {
  children: ReactNode;
}

/**
 * TaskManagerProvider component
 * Provides a single instance of useTaskManager to all child components
 */
export function TaskManagerProvider({ children }: TaskManagerProviderProps) {
  const { user, quota } = useUserDataContext();

  // Single instance of useTaskManager - shared across all components
  const taskManager = useTaskManagerHook({ user, quota });

  return (
    <TaskManagerContext.Provider value={taskManager}>
      {children}
    </TaskManagerContext.Provider>
  );
}

/**
 * Hook to access task manager context
 * Must be used within TaskManagerProvider
 */
export function useTaskManagerContext(): UseTaskManagerReturn {
  const context = useContext(TaskManagerContext);
  if (context === undefined) {
    throw new Error('useTaskManagerContext must be used within a TaskManagerProvider');
  }
  return context;
}
