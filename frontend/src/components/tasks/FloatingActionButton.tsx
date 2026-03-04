'use client';

/**
 * Phase 4: Multiple Simultaneous Tasks - Polish & Edge Cases
 * Floating action button for creating new tasks
 * Enhanced with better accessibility, mobile responsiveness, and error states
 */

import { motion } from 'framer-motion';
import { Plus, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskManagerContext } from '@/contexts/TaskManagerContext';
import { useUser } from '@/contexts/UserDataContext';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip';
import { zIndex } from '@/config/visual-effects';
import { memo } from 'react';

interface FloatingActionButtonProps {
  onClick: () => void;
  onCreateTask?: () => void;
}

/**
 * Floating action button component
 * Displays + button for creating new tasks
 * Disabled when task limit is reached
 * Phase 4: Enhanced with accessibility, mobile responsiveness, and better error messaging
 */
export const FloatingActionButton = memo(function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const { t } = useTranslation('tasks');
  const { canCreateTask, activeTaskCount, maxTaskCount, isLoading } = useTaskManagerContext();
  const { user } = useUser();

  const isDisabled = !canCreateTask || isLoading;
  const tierName = user?.tier === 'free' ? 'Free' : 'Premium';

  const tooltipText = isLoading
    ? t('fab.creating')
    : isDisabled
    ? t('fab.limitReached', { tier: tierName, max: maxTaskCount })
    : t('fab.createNew', { active: activeTaskCount, max: maxTaskCount });

  const ariaLabel = isLoading
    ? t('fab.creatingWait')
    : isDisabled
    ? t('fab.cannotCreate', { tier: tierName, max: maxTaskCount })
    : t('fab.createNewAria', { active: activeTaskCount, max: maxTaskCount });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            disabled={isDisabled}
            className={`fixed bottom-6 right-6 ${zIndex.floatingActionButton} w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800
                         max-sm:bottom-4 max-sm:right-4 max-sm:w-12 max-sm:h-12
                         ${
              isDisabled
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-theme-bg-button hover:bg-theme-bg-button-hover text-theme-text-button hover:scale-110 active:scale-95'
            }`}
            style={
              !isDisabled
                ? {
                    backgroundColor: 'var(--color-theme-bg-button)',
                    color: 'var(--color-theme-button-text)',
                  }
                : undefined
            }
            whileHover={!isDisabled ? { scale: 1.1 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            aria-label={ariaLabel}
            aria-disabled={isDisabled}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Plus size={24} />
              </motion.div>
            ) : (
              <Plus size={24} />
            )}
            {/* Phase 4: Visual indicator when limit reached */}
            {isDisabled && !isLoading && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <AlertCircle size={10} className="text-white" />
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p>{tooltipText}</p>
          {isDisabled && !isLoading && user?.tier === 'free' && (
            <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
              {t('fab.upgradePrompt')}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

