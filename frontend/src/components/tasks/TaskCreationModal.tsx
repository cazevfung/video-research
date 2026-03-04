'use client';

/**
 * Phase 3: Multiple Simultaneous Tasks
 * Modal component for creating new tasks
 * Reuses the summary form components from the dashboard
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSummaryForm } from '@/hooks/useSummaryForm';
import { UrlInputArea } from '@/components/dashboard/UrlInputArea';
import { ControlPanel } from '@/components/dashboard/ControlPanel';
import { Button } from '@/components/ui/Button';
import { useTaskManagerContext } from '@/contexts/TaskManagerContext';
import { useToast } from '@/contexts/ToastContext';
import { Loader2 } from 'lucide-react';

interface TaskCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Task creation modal
 * Allows users to create new summary tasks
 */
export function TaskCreationModal({ isOpen, onClose }: TaskCreationModalProps) {
  const { t } = useTranslation(['tasks', 'common']);
  const form = useSummaryForm();
  const { createTask, canCreateTask, maxTaskCount, activeTaskCount } = useTaskManagerContext();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const formData = form.getFormData();
    if (!formData) {
      toast.warning(t('common:messages.pleaseProvideUrl'));
      return;
    }

    if (!canCreateTask) {
      toast.error(t('tasks:toasts.taskLimitReached', { max: maxTaskCount }));
      return;
    }

    setIsSubmitting(true);
    try {
      await createTask(formData);
      toast.success(t('tasks:toasts.taskCreated'));
      form.reset();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('tasks:toasts.taskCreationFailed');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {t('tasks:modal.title')}
                  </h2>
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
                    {t('tasks:modal.subtitle', { active: activeTaskCount, max: maxTaskCount })}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  aria-label={t('tasks:modal.close')}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* URL Input */}
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('tasks:modal.urlLabel')}
                  </label>
                  <UrlInputArea
                    value={form.urlText}
                    onChange={form.setUrlText}
                  />
                </div>

                {/* Control Panel */}
                <div>
                  <ControlPanel
                    selectedPreset={form.preset}
                    onPresetChange={form.setPreset}
                    customPrompt={form.customPrompt}
                    onCustomPromptChange={form.setCustomPrompt}
                    language={form.language}
                    onLanguageChange={form.setLanguage}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-end gap-3">
                <Button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  variant="outline"
                >
                  {t('tasks:modal.cancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!form.hasValidUrls || !form.preset || isSubmitting || !canCreateTask}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('tasks:modal.creating')}
                    </>
                  ) : (
                    t('tasks:modal.create')
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

