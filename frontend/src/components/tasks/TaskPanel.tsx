'use client';

/**
 * Phase 4: Multiple Simultaneous Tasks - Polish & Edge Cases
 * Main expandable task panel component (Google Drive-like)
 * Enhanced with accessibility, mobile responsiveness, and edge case handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TaskInfo } from '@/hooks/useTaskManager';
import { useTaskManagerContext } from '@/contexts/TaskManagerContext';
import { TaskList } from './TaskList';
import { FloatingActionButton } from './FloatingActionButton';
import { TaskCreationModal } from './TaskCreationModal';
import { useSummaryStreamInstance, UseSummaryStreamInstanceReturn } from '@/hooks/useSummaryStreamInstance';
import { zIndex, taskPanelConfig } from '@/config/visual-effects';

/**
 * Task panel component
 * Expandable/collapsible UI showing all active tasks
 * Google Drive-like animation (slide up from bottom)
 * Phase 4: Enhanced with accessibility, mobile responsiveness, and edge case handling
 */
export function TaskPanel() {
  const { t } = useTranslation('tasks');
  const { tasks, activeTaskCount, cancelTask, updateTaskStream, refreshTasks } = useTaskManagerContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasActiveTasks = activeTaskCount > 0;

  // Phase 4: Handle stream updates from TaskStreamWrapper
  const handleStreamUpdate = useCallback((jobId: string, stream: UseSummaryStreamInstanceReturn) => {
    updateTaskStream(jobId, stream);
    
    // Phase 4: Detect network errors from stream
    if (stream.errorType === 'connection' && stream.error) {
      setHasNetworkError(true);
    } else if (stream.isConnected && !stream.error) {
      setHasNetworkError(false);
    }
  }, [updateTaskStream]);

  // Phase 4: Handle page visibility changes (tab switch, minimize)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasActiveTasks) {
        // Refresh tasks when page becomes visible
        refreshTasks().catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasActiveTasks, refreshTasks]);

  // Note: Panel only expands when user clicks the expand button, not automatically
  // Removed auto-expand on page refresh to respect user's explicit action requirement

  // Phase 4: Save expanded state to sessionStorage
  useEffect(() => {
    if (isExpanded) {
      sessionStorage.setItem(taskPanelConfig.sessionStorage.expandedKey, 'true');
    } else {
      sessionStorage.removeItem(taskPanelConfig.sessionStorage.expandedKey);
    }
  }, [isExpanded]);

  // Phase 4: Keyboard navigation support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false);
    }
  }, [isExpanded]);

  // Phase 4: Focus management - focus panel when expanded
  useEffect(() => {
    if (isExpanded && panelRef.current) {
      // Small delay to ensure animation completes
      const timer = setTimeout(() => {
        panelRef.current?.focus();
      }, taskPanelConfig.focus.delay);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  return (
    <>
      {/* Collapsed State - Task Count Badge */}
      {/* Phase 4: Enhanced with network error indicator */}
      {hasActiveTasks && (
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`fixed ${taskPanelConfig.position.badge.bottom} ${taskPanelConfig.position.badge.right} ${zIndex.taskPanel} ${taskPanelConfig.badge.size} rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={t('panel.badge.ariaLabel', { count: activeTaskCount, action: isExpanded ? 'collapse' : 'expand' })}
          aria-expanded={isExpanded}
          aria-controls="task-panel"
        >
          <span className="text-sm font-semibold">{activeTaskCount}</span>
          {/* Phase 4: Network error indicator */}
          {hasNetworkError && (
            <span className={`absolute ${taskPanelConfig.badge.errorIndicator.position} ${taskPanelConfig.badge.errorIndicator.size} bg-red-500 rounded-full border-2 border-white dark:border-gray-800`} aria-label={t('panel.badge.networkError')} />
          )}
        </motion.button>
      )}

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Phase 3: Backdrop removed - panel is informational, not modal */}
            {/* Panel */}
            <motion.div
              ref={panelRef}
              id="task-panel"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={taskPanelConfig.animation.panelSlide}
              onKeyDown={handleKeyDown}
              tabIndex={-1}
              role="dialog"
              aria-labelledby="task-panel-title"
              aria-modal="true"
              className={`fixed ${taskPanelConfig.position.panel.bottom.default} ${taskPanelConfig.position.panel.right.default} ${zIndex.taskPanel} w-full ${taskPanelConfig.panel.maxWidth.default} bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 ${taskPanelConfig.panel.maxHeight} overflow-hidden flex flex-col
                         ${taskPanelConfig.panel.maxWidth.sm} ${taskPanelConfig.position.panel.bottom.sm} ${taskPanelConfig.position.panel.right.sm}
                         ${taskPanelConfig.panel.maxWidth.md}
                         ${taskPanelConfig.position.panel.bottom.mobile} ${taskPanelConfig.position.panel.right.mobile} ${taskPanelConfig.position.panel.left.mobile} ${taskPanelConfig.panel.maxWidth.mobile}`}
            >
              {/* Phase 4: Simplified header */}
              <div className={`${taskPanelConfig.header.padding} border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50`}>
                <div className="flex items-center gap-2">
                  <h3 id="task-panel-title" className={`${taskPanelConfig.header.titleSize} font-semibold text-gray-900 dark:text-gray-100`}>
                    {t('panel.title')}
                  </h3>
                  <span className={`${taskPanelConfig.header.countSize} text-gray-500 dark:text-gray-400`}>
                    {t('panel.count', { count: activeTaskCount })}
                  </span>
                  {/* Phase 4: Network error indicator - icon only */}
                  {hasNetworkError && (
                    <AlertCircle 
                      size={taskPanelConfig.header.iconSize} 
                      className="text-amber-500" 
                      role="alert"
                      aria-label={t('panel.connectionIssue')}
                    />
                  )}
                </div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  aria-label={isExpanded ? t('panel.collapse') : t('panel.expand')}
                >
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              </div>

              {/* Task List */}
              {/* Phase 4: Enhanced with better error handling */}
              <div className="overflow-y-auto flex-1" role="region" aria-label="Task list">
                <TaskList 
                  tasks={tasks} 
                  onCancel={cancelTask}
                  onStreamUpdate={handleStreamUpdate}
                />
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <FloatingActionButton 
        onClick={() => setIsModalOpen(true)}
        onCreateTask={() => setIsModalOpen(true)}
      />

      {/* Task Creation Modal */}
      <TaskCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

