'use client';

/**
 * Phase 3: Multiple Simultaneous Tasks - Multi-Stream Integration
 * Task manager hook for managing multiple concurrent summary tasks
 * Integrates SSE streams for real-time updates per task
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConfig } from './useConfig';
import { useAuth } from '@/contexts/AuthContext';
import { SummaryRequest, JobStatus, User, UserQuota } from '@/types';
import { startSummaryJob, getActiveTasks, cancelTask } from '@/lib/api';
import { useSummaryStreamInstance, UseSummaryStreamInstanceReturn } from './useSummaryStreamInstance';
import RateLimitCoordinator from '@/lib/rate-limit-coordinator';
import { apiConfig } from '@/config/api';
import { ExponentialBackoff } from '@/lib/exponential-backoff';
import { CircuitBreaker } from '@/lib/circuit-breaker';
import { useToast } from '@/contexts/ToastContext';

/**
 * Task information interface
 * Phase 3: Includes stream instance for real-time updates
 */
export interface TaskInfo {
  jobId: string;
  title: string | null;
  status: JobStatus | 'idle' | 'connected';
  progress: number;
  message: string | null;
  createdAt: Date;
  stream?: UseSummaryStreamInstanceReturn;
}

/**
 * Task manager hook return type
 * Phase 3: Added updateTaskStream method
 */
export interface UseTaskManagerReturn {
  tasks: TaskInfo[];
  createTask: (request: SummaryRequest) => Promise<string | null>;
  cancelTask: (jobId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  updateTaskStream: (jobId: string, stream: UseSummaryStreamInstanceReturn) => void;
  canCreateTask: boolean;
  activeTaskCount: number;
  maxTaskCount: number;
  isLoading: boolean;
}

export interface UseTaskManagerDeps {
  user: User | null;
  quota: UserQuota | null;
}

/**
 * Custom hook for managing multiple concurrent summary tasks
 * Handles task creation, cancellation, and status updates
 */
export function useTaskManager({ user, quota }: UseTaskManagerDeps): UseTaskManagerReturn {
  const { showToast } = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const { config } = useConfig();
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const streamInstancesRef = useRef<Map<string, UseSummaryStreamInstanceReturn>>(new Map());
  
  // Phase 2: Exponential backoff and circuit breaker
  // Note: pollingIntervalMs comes from config, so we'll use it as base delay
  const backoffRef = useRef<ExponentialBackoff | null>(null);
  const circuitBreakerRef = useRef(new CircuitBreaker({
    name: 'TaskManager',
    failureThreshold: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5',
      10
    ),
    successThreshold: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '2',
      10
    ),
    timeout: parseInt(
      process.env.NEXT_PUBLIC_CIRCUIT_BREAKER_TIMEOUT_MS || '60000', // 1 minute
      10
    ),
  }));

  // Get max task count from quota (from backend config.yaml tasks.limits)
  // This value comes from the backend quota endpoint which reads from config.yaml
  // Fallback to default values only if backend doesn't provide (shouldn't happen in production)
  // The fallback values match the default config.yaml values but should not be relied upon
  const maxTaskCount = quota?.max_simultaneous_tasks ?? 
    (user?.tier === 'premium' ? 10 : 1);
  
  // Phase 3: Get polling interval from config (from backend config.yaml tasks.polling_interval_seconds)
  // Default to 5 seconds if config not available (matches backend default)
  const pollingIntervalSeconds = config?.tasks?.polling_interval_seconds ?? 5;
  const pollingIntervalMs = pollingIntervalSeconds * 1000;
  
  const activeTaskCount = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'error'
  ).length;
  
  const canCreateTask = activeTaskCount < maxTaskCount;

  /**
   * Fetch active tasks from backend
   * Phase 3: Preserves stream instances when updating tasks
   * Phase 2: Enhanced with circuit breaker and exponential backoff
   */
  const refreshTasks = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Check global coordinator before polling
    if (RateLimitCoordinator.isPausedNow()) {
      return;
    }

    // Phase 2: Check circuit breaker
    if (circuitBreakerRef.current.isOpen()) {
      console.warn('[useTaskManager] Circuit breaker is open, skipping request');
      return;
    }

    try {
      // Phase 2: Execute with circuit breaker protection
      const response = await circuitBreakerRef.current.execute(async () => {
        return await getActiveTasks();
      });

      // Circuit breaker blocked the request
      if (response === null) {
        return;
      }
      if (response.error) {
        // Phase 2: Record failure for exponential backoff (if backoff is initialized)
        if (backoffRef.current) {
          backoffRef.current.recordFailure();
        }
        
        // Handle UNAUTHORIZED errors - stop polling immediately
        // Note: This is expected when user is not authenticated, so we use debug instead of error
        if (response.error.code === 'UNAUTHORIZED') {
          // Check if user was previously authenticated (had user data or tasks)
          const wasAuthenticated = user !== null || tasks.length > 0;
          
          console.debug('[useTaskManager] Unauthorized - stopping polling', {
            wasAuthenticated,
            message: wasAuthenticated ? 'Session expired' : 'Not authenticated (expected)'
          });
          
          // Stop polling immediately
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Only show "Session Expired" message if user was previously authenticated
          // If they were never authenticated, this is expected behavior (guest mode)
          if (wasAuthenticated && typeof window !== 'undefined') {
            // Dispatch custom event for error toast
            window.dispatchEvent(new CustomEvent('auth-error', {
              detail: {
                code: 'UNAUTHORIZED',
                message: 'Your session has expired. Please refresh the page to continue.',
                action: 'refresh'
              }
            }));
          }
          
          return;
        }
        
        // Handle rate limit errors with global coordinator
        if (response.error.code === 'RATE_LIMIT') {
          const retryAfter = response.error.details?.retryAfter || apiConfig.rateLimit.defaultRetryAfterSeconds;
          
          // Use global coordinator instead of local pause
          RateLimitCoordinator.pause(Math.min(retryAfter, apiConfig.rateLimit.maxPauseSeconds));
          
          console.warn('[useTaskManager] Rate limited, using global pause');
          
          // Phase 3: Show user-friendly rate limit notification
          const retryMinutes = Math.ceil((Math.min(retryAfter, apiConfig.rateLimit.maxPauseSeconds)) / 60);
          showToast({
            variant: 'warning',
            title: 'Rate Limit Reached',
            description: `Too many requests. Please wait ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''} before trying again.`,
            duration: apiConfig.toast.defaultDuration,
          });
        } else if (response.error.code === 'NETWORK_ERROR') {
          // Phase 3: Show network error notification
          showToast({
            variant: 'error',
            title: 'Connection Error',
            description: 'Unable to connect to server. Please check your internet connection.',
            duration: apiConfig.toast.defaultDuration,
          });
        }
        
        // Phase 2: Log backoff delay (if backoff is initialized)
        if (backoffRef.current) {
          console.warn(
            `[useTaskManager] API error, next retry in ${backoffRef.current.getDelayString()}`
          );
        }
        
        // Defensive check: ensure we never log an empty object
        const error = response.error;
        const errorKeys = error && typeof error === 'object' ? Object.keys(error) : [];
        const isEmptyError = !error || errorKeys.length === 0 || 
          (errorKeys.length === 1 && errorKeys[0] === '__proto__');
        
        // Check if error has meaningful information
        const hasMessage = error?.message && typeof error.message === 'string' && error.message.length > 0;
        const hasCode = error?.code && typeof error.code === 'string' && error.code.length > 0;
        const errorMessage = hasMessage 
          ? error.message 
          : (hasCode ? `Error code: ${error.code}` : 'Failed to refresh tasks from server');
        
        // Always log structured error information, never an empty object
        const errorInfo: Record<string, any> = {
          message: errorMessage,
          isEmpty: isEmptyError,
          timestamp: new Date().toISOString(),
        };
        
        if (hasCode) errorInfo.code = error.code;
        if (error?.details && typeof error.details === 'object') {
          errorInfo.details = error.details;
        }
        if (errorKeys.length > 0) {
          errorInfo.errorKeys = errorKeys;
        }
        if (!isEmptyError && error) {
          // Only include full error if it's not empty
          try {
            const serialized = JSON.parse(JSON.stringify(error));
            // Check if serialization resulted in empty object
            if (serialized && typeof serialized === 'object' && Object.keys(serialized).length > 0) {
              errorInfo.fullError = serialized;
            } else {
              errorInfo.fullError = String(error);
              errorInfo.serializationNote = 'Error object could not be serialized, using string representation';
            }
          } catch (e) {
            errorInfo.fullError = String(error);
            errorInfo.serializationError = String(e);
          }
        }
        
        errorInfo.responseStructure = {
          hasData: !!response.data,
          hasError: !!response.error,
          responseKeys: Object.keys(response),
        };
        
        // Ensure errorInfo is never empty before logging - add required fields
        const finalErrorInfo: Record<string, any> = {
          message: errorInfo.message || 'Unknown error occurred while refreshing tasks',
          timestamp: errorInfo.timestamp || new Date().toISOString(),
        };
        
        // Copy all other properties
        Object.keys(errorInfo).forEach(key => {
          if (errorInfo[key] !== undefined) {
            finalErrorInfo[key] = errorInfo[key];
          }
        });
        
        // Final validation - ensure we have at least message and timestamp
        if (!finalErrorInfo.message) {
          finalErrorInfo.message = 'Failed to refresh tasks (no error message available)';
        }
        if (!finalErrorInfo.timestamp) {
          finalErrorInfo.timestamp = new Date().toISOString();
        }
        
        // Safely serialize error info to avoid empty object issues
        // Ensure message is never empty or undefined
        const safeMessage = finalErrorInfo.message && String(finalErrorInfo.message).trim().length > 0
          ? String(finalErrorInfo.message)
          : 'Failed to refresh tasks (no error message available)';
        
        let errorLogMessage = `Failed to refresh tasks: ${safeMessage}`;
        try {
          // Try to stringify the error info, but handle circular references
          const serialized = JSON.stringify(finalErrorInfo, (key, value) => {
            // Skip circular references and functions
            if (typeof value === 'function') return '[Function]';
            if (typeof value === 'undefined') return '[undefined]';
            return value;
          }, 2);
          if (serialized && serialized !== '{}' && serialized.length > 2) {
            errorLogMessage += '\n' + serialized;
          } else {
            // If serialization resulted in empty object, add basic info
            errorLogMessage += `\nError code: ${finalErrorInfo.code || 'none'}`;
            errorLogMessage += `\nIs empty: ${finalErrorInfo.isEmpty || false}`;
            if (finalErrorInfo.errorKeys && Array.isArray(finalErrorInfo.errorKeys)) {
              errorLogMessage += `\nError keys: ${finalErrorInfo.errorKeys.join(', ')}`;
            }
          }
        } catch (e) {
          // If serialization fails, just log the message and basic info
          errorLogMessage += `\nError details: code=${finalErrorInfo.code || 'none'}, isEmpty=${finalErrorInfo.isEmpty || false}`;
          errorLogMessage += `\nSerialization error: ${e instanceof Error ? e.message : String(e)}`;
        }
        
        // Always log as a string only - never pass objects to console.error
        console.error(errorLogMessage);
        return;
      }

      // Phase 2: Record success for exponential backoff (if backoff is initialized)
      if (backoffRef.current && response.data) {
        backoffRef.current.recordSuccess();
      }

      if (response.data?.tasks) {
        setTasks((prevTasks) => {
          // Create a map of existing tasks to preserve stream instances
          const existingTasksMap = new Map(prevTasks.map((t) => [t.jobId, t]));
          
          return response.data!.tasks.map((task: any) => {
            const existingTask = existingTasksMap.get(task.job_id);
            
            // Phase 3: Get or create stream instance for this task
            let stream = streamInstancesRef.current.get(task.job_id);
            if (!stream && task.job_id) {
              // Stream will be created by useSummaryStreamInstance hook
              // We'll update this in a separate effect
            } else if (stream) {
              // Update task with stream data (status, progress, etc. from stream)
              return {
                jobId: task.job_id,
                title: stream.title || task.title,
                status: stream.status !== 'idle' ? stream.status : (task.status as JobStatus | 'idle' | 'connected'),
                progress: stream.progress || task.progress,
                message: stream.message || task.message,
                createdAt: existingTask?.createdAt || new Date(task.created_at),
                stream,
              };
            }
            
            return {
              jobId: task.job_id,
              title: task.title,
              status: task.status as JobStatus | 'idle' | 'connected',
              progress: task.progress,
              message: task.message,
              createdAt: existingTask?.createdAt || new Date(task.created_at),
              stream: existingTask?.stream,
            };
          });
        });
      }
    } catch (error) {
      // Handle various error types and ensure we NEVER log an empty object
      let errorInfo: Record<string, any>;
      
      if (error instanceof Error) {
        errorInfo = {
          message: error.message || 'An error occurred while refreshing tasks',
          name: error.name || 'Error',
          type: 'Error',
          timestamp: new Date().toISOString(),
        };
        if (error.stack) errorInfo.stack = error.stack;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        const keys = Object.keys(errorObj);
        const isEmpty = keys.length === 0 || (keys.length === 1 && keys[0] === '__proto__');
        
        errorInfo = {
          message: errorObj.message || 'Unknown error occurred while refreshing tasks',
          type: 'object',
          isEmpty,
          timestamp: new Date().toISOString(),
        };
        
        if (errorObj.code) errorInfo.code = errorObj.code;
        if (errorObj.details && typeof errorObj.details === 'object') {
          errorInfo.details = errorObj.details;
        }
        if (!isEmpty && keys.length > 0) {
          errorInfo.errorKeys = keys;
          try {
            errorInfo.fullError = JSON.parse(JSON.stringify(errorObj));
          } catch {
            errorInfo.fullError = String(errorObj);
          }
        }
        errorInfo.errorString = String(error);
      } else {
        errorInfo = {
          message: String(error) || 'Unknown error occurred while refreshing tasks',
          type: typeof error,
          errorValue: error,
          timestamp: new Date().toISOString(),
        };
      }
      
      // Ensure errorInfo is never empty
      if (Object.keys(errorInfo).length === 0) {
        errorInfo = { 
          message: 'An unknown error occurred during task refresh',
          timestamp: new Date().toISOString(),
          fallback: true,
        };
      }
      
      // Final safety check - ensure message exists
      if (!errorInfo.message) {
        errorInfo.message = 'Failed to refresh tasks (no error message available)';
      }
      
      // Safely serialize error info to avoid empty object issues
      // Ensure message is never empty or undefined
      const safeMessage = errorInfo.message && String(errorInfo.message).trim().length > 0
        ? String(errorInfo.message)
        : 'Failed to refresh tasks (no error message available)';
      
      let errorLogMessage = `Failed to refresh tasks (catch block): ${safeMessage}`;
      try {
        // Try to stringify the error info, but handle circular references
        const serialized = JSON.stringify(errorInfo, (key, value) => {
          // Skip circular references and functions
          if (typeof value === 'function') return '[Function]';
          if (typeof value === 'undefined') return '[undefined]';
          return value;
        }, 2);
        if (serialized && serialized !== '{}' && serialized.length > 2) {
          errorLogMessage += '\n' + serialized;
        } else {
          // If serialization resulted in empty object, add basic info
          errorLogMessage += `\nError type: ${errorInfo.type || 'unknown'}`;
          errorLogMessage += `\nError name: ${errorInfo.name || 'none'}`;
        }
      } catch (e) {
        // If serialization fails, just log the message and basic info
        errorLogMessage += `\nError details: type=${errorInfo.type || 'unknown'}, name=${errorInfo.name || 'none'}`;
        errorLogMessage += `\nSerialization error: ${e instanceof Error ? e.message : String(e)}`;
      }
      
      // Always log as a string only - never pass objects to console.error
      console.error(errorLogMessage);
    }
  }, [user, showToast]); // Fixed: Added missing dependencies. Note: tasks is intentionally excluded to avoid infinite loops (we use functional setState)

  /**
   * Create a new task
   * Phase 3: Creates stream instance for the new task
   */
  const createTask = useCallback(
    async (request: SummaryRequest): Promise<string | null> => {
      if (!canCreateTask) {
        const tierName = user?.tier === 'free' ? 'Free' : 'Premium';
        throw new Error(
          `Task limit reached. ${tierName} users can run ${maxTaskCount} task${maxTaskCount > 1 ? 's' : ''} simultaneously.`
        );
      }

      setIsLoading(true);
      try {
        const response = await startSummaryJob(request);
        if (response.error) {
          throw new Error(response.error.message);
        }

        const jobId = response.data?.job_id;
        if (!jobId) {
          throw new Error('Failed to create task');
        }

        // Phase 3: Create stream instance for this task
        // Note: The stream instance will be created by the TaskStreamWrapper component
        // We'll add the task first, then the stream will be attached

        // Add task to list immediately
        const newTask: TaskInfo = {
          jobId,
          title: null,
          status: 'idle',
          progress: 0,
          message: 'Starting...',
          createdAt: new Date(),
        };

        setTasks((prev) => [...prev, newTask]);

        // Refresh from backend to sync
        await refreshTasks();

        return jobId;
      } catch (error) {
        console.error('Failed to create task:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [canCreateTask, maxTaskCount, user?.tier, refreshTasks]
  );

  /**
   * Cancel a task
   * Phase 3: Cleans up stream instance on cancellation
   */
  const cancelTaskHandler = useCallback(
    async (jobId: string) => {
      try {
        // Phase 3: Disconnect stream before cancelling
        const stream = streamInstancesRef.current.get(jobId);
        if (stream) {
          stream.disconnect();
          streamInstancesRef.current.delete(jobId);
        }

        await cancelTask(jobId);
        setTasks((prev) => prev.filter((t) => t.jobId !== jobId));
        await refreshTasks();
      } catch (error) {
        console.error('Failed to cancel task:', error);
        throw error;
      }
    },
    [refreshTasks]
  );

  // Phase 4: Sync stream status with task state (optimized)
  // Use a polling mechanism to check for stream updates without causing infinite loops
  useEffect(() => {
    // Only sync if we have tasks
    // CRITICAL: Always return a cleanup function (even if empty) to maintain consistent hook order
    if (tasks.length === 0) {
      return () => {}; // Return empty cleanup to maintain hook consistency
    }

    const syncInterval = setInterval(() => {
      setTasks((prevTasks) => {
        let hasChanges = false;
        const updatedTasks = prevTasks.map((task) => {
          const stream = streamInstancesRef.current.get(task.jobId);
          if (stream && stream.jobId === task.jobId) {
            // Phase 4: Only update if there are actual changes to prevent unnecessary re-renders
            const newStatus = stream.status !== 'idle' ? stream.status : task.status;
            const newProgress = stream.progress ?? task.progress;
            const newMessage = stream.message || task.message;
            const newTitle = stream.title || task.title;

            // Skip update if nothing changed
            if (
              newStatus === task.status &&
              newProgress === task.progress &&
              newMessage === task.message &&
              newTitle === task.title &&
              task.stream === stream
            ) {
              return task;
            }

            hasChanges = true;

            // Update task with latest stream data
            return {
              ...task,
              title: newTitle,
              status: newStatus,
              progress: newProgress,
              message: newMessage,
              stream,
            };
          }
          return task;
        });

        // Only return new array if there were actual changes
        return hasChanges ? updatedTasks : prevTasks;
      });
    }, 500); // Check every 500ms for stream updates

    return () => clearInterval(syncInterval);
  }, [tasks.length]); // Only re-run when task count changes, not task content

  // Phase 4: Persist tasks to sessionStorage for page refresh recovery
  useEffect(() => {
    try {
      const tasksToStore = tasks.map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        stream: undefined, // Don't store stream instances
      }));
      sessionStorage.setItem('activeTasks', JSON.stringify(tasksToStore));
    } catch (error) {
      console.error('Failed to persist tasks to storage:', error);
    }
  }, [tasks]);

  // Phase 4: Set up polling for task updates with performance optimizations
  // Uses polling interval from config (not hardcoded)
  useEffect(() => {
    isMountedRef.current = true;
    
    // Don't fetch tasks or set up polling until auth is ready and user is authenticated
    // CRITICAL: Always return a cleanup function (even if empty) to maintain consistent hook order
    if (authLoading || !isAuthenticated) {
      return () => {}; // Return empty cleanup to maintain hook consistency
    }
    
    // Phase 4: Initial load - restore tasks from sessionStorage on page refresh
    const restoreTasksFromStorage = () => {
      try {
        const storedTasks = sessionStorage.getItem('activeTasks');
        if (storedTasks) {
          const parsedTasks = JSON.parse(storedTasks);
          // Only restore if tasks are recent (within configured timeout)
          const restoredTasks = parsedTasks.filter((task: any) => {
            const createdAt = new Date(task.createdAt);
            const age = Date.now() - createdAt.getTime();
            return age < apiConfig.tasks.restorationTimeout;
          });
          if (restoredTasks.length > 0) {
            setTasks(restoredTasks.map((task: any) => ({
              ...task,
              createdAt: new Date(task.createdAt),
            })));
          }
        }
      } catch (error) {
        console.error('Failed to restore tasks from storage:', error);
      }
    };

    restoreTasksFromStorage();
    refreshTasks();

    // Phase 2: Initialize exponential backoff with polling interval from config
    if (!backoffRef.current) {
      backoffRef.current = new ExponentialBackoff({
        baseDelay: pollingIntervalMs,
        maxDelay: parseInt(
          process.env.NEXT_PUBLIC_BACKOFF_MAX_DELAY_MS || '240000', // 4 minutes
          10
        ),
        multiplier: parseFloat(
          process.env.NEXT_PUBLIC_BACKOFF_MULTIPLIER || '2',
        ),
      });
    }

    // Phase 4: Poll for updates - uses config from backend (tasks.polling_interval_seconds)
    // Phase 2: Enhanced with dynamic polling interval from exponential backoff
    // Only poll when page is visible and not rate limited (uses global coordinator)
    let currentInterval = pollingIntervalMs;
    
    const pollTasks = () => {
      if (isMountedRef.current && 
          document.visibilityState === 'visible' && 
          !RateLimitCoordinator.isPausedNow()) {
        refreshTasks();
      }
    };
    
    const updatePollingInterval = () => {
      if (!backoffRef.current) return;
      
      const newInterval = backoffRef.current.getDelay();
      if (newInterval !== currentInterval) {
        console.log(`[useTaskManager] Adjusting polling interval to ${backoffRef.current.getDelayString()}`);
        currentInterval = newInterval;
        
        // Clear old interval and set new one
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        pollingIntervalRef.current = setInterval(() => {
          pollTasks();
          updatePollingInterval(); // Check if we need to adjust interval
        }, newInterval);
      }
    };

    pollingIntervalRef.current = setInterval(() => {
      pollTasks();
      updatePollingInterval(); // Check if we need to adjust interval
    }, currentInterval);

    // Subscribe to global coordinator events
    const unsubscribe = RateLimitCoordinator.subscribe(() => {
      if (!RateLimitCoordinator.isPausedNow() && 
          isMountedRef.current && 
          document.visibilityState === 'visible') {
        refreshTasks();
      }
    });

    // Phase 4: Listen to visibility changes to pause/resume polling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        // Refresh immediately when page becomes visible
        refreshTasks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshTasks, pollingIntervalMs, authLoading, isAuthenticated]);

  // Phase 4: Cleanup stream instances on unmount and handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clean up streams before page unload
      streamInstancesRef.current.forEach((stream) => {
        stream.disconnect();
      });
      streamInstancesRef.current.clear();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      streamInstancesRef.current.forEach((stream) => {
        stream.disconnect();
      });
      streamInstancesRef.current.clear();
    };
  }, []);

  /**
   * Update task with stream data
   * Phase 3: Called by TaskStreamWrapper to sync stream state with task
   */
  const updateTaskStream = useCallback((jobId: string, stream: UseSummaryStreamInstanceReturn) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.jobId === jobId) {
          // Update task with stream data
          return {
            ...task,
            title: stream.title || task.title,
            status: stream.status !== 'idle' ? stream.status : task.status,
            progress: stream.progress || task.progress,
            message: stream.message || task.message,
            stream,
          };
        }
        return task;
      })
    );
    
    // Store stream instance in ref for cleanup
    streamInstancesRef.current.set(jobId, stream);
  }, []);

  return {
    tasks,
    createTask,
    cancelTask: cancelTaskHandler,
    refreshTasks,
    updateTaskStream,
    canCreateTask,
    activeTaskCount,
    maxTaskCount,
    isLoading,
  };
}

