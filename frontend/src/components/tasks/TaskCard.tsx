'use client';

/**
 * Phase 4: Multiple Simultaneous Tasks - Polish & Edge Cases
 * Individual task progress card component
 * Enhanced with better error handling, loading states, and accessibility
 */

import { motion } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TaskInfo } from '@/hooks/useTaskManager';
import { taskPanelConfig } from '@/config/visual-effects';
import { memo } from 'react';

interface TaskCardProps {
  task: TaskInfo;
  onCancel: (jobId: string) => void;
}

/**
 * Get status icon based on task status
 * Phase 4: Visual status indicators
 */
function getStatusIcon(status: TaskInfo['status'], isReconnecting?: boolean) {
  const iconSize = taskPanelConfig.taskCard.iconSizes.status;
  if (isReconnecting) {
    return <Loader2 size={iconSize} className="animate-spin text-amber-500" />;
  }
  
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={iconSize} className="text-green-500" />;
    case 'error':
      return <AlertCircle size={iconSize} className="text-red-500" />;
    case 'connected':
    case 'generating':
    case 'fetching':
    case 'processing':
    case 'condensing':
    case 'aggregating':
      return <Loader2 size={iconSize} className="animate-spin text-blue-500" />;
    default:
      return null;
  }
}

/**
 * Task card component displaying individual task progress
 * Phase 4: Enhanced with accessibility, error states, and loading indicators
 */
export const TaskCard = memo(function TaskCard({ task, onCancel }: TaskCardProps) {
  const { t } = useTranslation('tasks');
  const isActive = task.status !== 'completed' && task.status !== 'error';
  const isReconnecting = task.stream?.isReconnecting ?? false;
  
  // Phase 1: Improved detection of active streaming
  // Check if task is in an active state (not just 'generating')
  const isActiveStatus = task.status === 'generating' || 
                         task.status === 'processing' || 
                         task.status === 'fetching' || 
                         task.status === 'condensing' || 
                         task.status === 'aggregating' ||
                         task.status === 'connected';
  
  // Check if actively streaming: status is active AND (progress > 0 OR chunks being received OR stream connected)
  const isActivelyStreaming = isActiveStatus && (
    task.progress > 0 || 
    task.stream?.isStreaming || 
    task.stream?.isConnected ||
    (task.stream?.chunkCount ?? 0) > 0
  );
  
  // Only show connection warning if:
  // 1. Task is active
  // 2. Has explicit connection error OR stream is not connected
  // 3. NOT actively streaming (no progress, no chunks, not connected)
  // 4. NOT currently reconnecting
  const hasConnectionError = task.stream?.errorType === 'connection' || 
                             (!task.stream?.isConnected && !isActivelyStreaming);
  const showNetworkWarning = isActive && hasConnectionError && !isReconnecting && !isActivelyStreaming;

  // Phase 2: Build aria-label with timestamp for accessibility
  const taskTitle = task.title || t('card.processing');
  const ariaLabel = `Task: ${taskTitle}, Status: ${task.status}, Progress: ${task.progress}%, Created at ${new Date(task.createdAt).toLocaleString()}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: taskPanelConfig.animation.card.duration }}
      className={`${taskPanelConfig.taskCard.padding} border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
      role="listitem"
      aria-label={ariaLabel}
    >
      {/* Phase 2: Compact header with icon, title, progress, and cancel button */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getStatusIcon(task.status, isReconnecting)}
          <h4 className="text-sm font-medium truncate" title={task.title || t('card.processing')}>
            {task.title || t('card.processing')}
          </h4>
        </div>
        {isActive && (
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {task.progress}%
          </span>
        )}
        {isActive && (
          <button
            onClick={() => onCancel(task.jobId)}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-label={t('card.cancelTask', { title: task.title || t('card.processing') })}
            disabled={task.status === 'completed' || task.status === 'error'}
          >
            <X size={taskPanelConfig.taskCard.iconSizes.cancel} />
          </button>
        )}
      </div>

      {/* Phase 2: Compact progress bar */}
      {isActive && (
        <div className="mt-1.5" role="progressbar" aria-valuenow={task.progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('card.progress', { progress: task.progress })}>
          <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${taskPanelConfig.taskCard.progressBar.height} overflow-hidden`}>
            <motion.div
              className={`${taskPanelConfig.taskCard.progressBar.height} rounded-full ${
                showNetworkWarning ? 'bg-amber-500' : 'bg-primary'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: taskPanelConfig.animation.progressBar.duration, ease: taskPanelConfig.animation.progressBar.ease }}
            />
          </div>
        </div>
      )}

      {/* Phase 2: Only show error messages, not status messages */}
      {task.stream?.error && task.status === 'error' && (
        <div className="mt-1.5 flex items-start gap-1.5">
          <AlertCircle size={taskPanelConfig.taskCard.iconSizes.error} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 dark:text-red-400 break-words" role="alert">
            {task.stream.error}
          </p>
        </div>
      )}
    </motion.div>
  );
});

