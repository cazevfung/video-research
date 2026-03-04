'use client';

/**
 * Phase 4: Multiple Simultaneous Tasks - Polish & Edge Cases
 * Task list component displaying all active tasks
 * Enhanced with better empty states, error handling, and performance optimizations
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TaskInfo } from '@/hooks/useTaskManager';
import { TaskCard } from './TaskCard';
import { TaskStreamWrapper } from './TaskStreamWrapper';
import { useSummaryStreamInstance } from '@/hooks/useSummaryStreamInstance';
import { FileText, AlertCircle } from 'lucide-react';
import { memo, useMemo } from 'react';

interface TaskListProps {
  tasks: TaskInfo[];
  onCancel: (jobId: string) => void;
  onStreamUpdate?: (jobId: string, stream: ReturnType<typeof useSummaryStreamInstance>) => void;
}

/**
 * Task list component
 * Displays list of active tasks with enhanced empty state handling
 * Phase 4: Performance optimized with memoization and better error states
 */
export const TaskList = memo(function TaskList({ tasks, onCancel, onStreamUpdate }: TaskListProps) {
  const { t } = useTranslation('tasks');
  // Phase 4: Memoize task sorting to prevent unnecessary re-renders
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Sort by: active tasks first, then by creation time (newest first)
      const aActive = a.status !== 'completed' && a.status !== 'error';
      const bActive = b.status !== 'completed' && b.status !== 'error';
      
      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [tasks]);

  // Phase 4: Enhanced empty state with better messaging
  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 text-center text-gray-500 dark:text-gray-400"
        role="status"
        aria-live="polite"
      >
        <FileText size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        <p className="text-base font-medium mb-1">{t('list.empty.title')}</p>
        <p className="text-xs">{t('list.empty.description')}</p>
      </motion.div>
    );
  }

  // Phase 4: Check for all tasks in error state
  const allTasksError = tasks.length > 0 && tasks.every(t => t.status === 'error');

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700" role="list" aria-label="Task list">
      {/* Phase 6: Connection warning banner removed - status indicated by progress bar color in TaskCard */}
      {/* Phase 4: All tasks error state */}
      {allTasksError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 text-center text-gray-500 dark:text-gray-400"
          role="alert"
        >
          <AlertCircle size={24} className="mx-auto mb-2 text-red-500" />
          <p className="text-base">{t('list.allErrors.title')}</p>
          <p className="text-xs mt-1">{t('list.allErrors.description')}</p>
        </motion.div>
      )}

      {/* Phase 4: Create stream wrappers for each task (optimized) */}
      {sortedTasks.map((task) => (
        <TaskStreamWrapper
          key={`stream-${task.jobId}`}
          task={task}
          onStreamUpdate={onStreamUpdate || (() => {})}
        />
      ))}
      
      {/* Phase 4: Task cards with optimized animations */}
      <AnimatePresence mode="popLayout">
        {sortedTasks.map((task) => (
          <TaskCard key={task.jobId} task={task} onCancel={onCancel} />
        ))}
      </AnimatePresence>
    </div>
  );
});

