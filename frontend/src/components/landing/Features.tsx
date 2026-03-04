'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  cardConfig,
  motionVariants,
  animationDurations,
} from '@/config/visual-effects';
import { Video, Zap, Globe, FileText } from 'lucide-react';
import { iconSizes } from '@/config/visual-effects';

/**
 * Landing Page Features Component
 * Displays key features in a card grid
 * Uses design system configs (no hardcoded values)
 */
export function Features() {
  const { t } = useTranslation('landing');
  
  const features = [
    {
      icon: Video,
      titleKey: 'features.batchProcessing.title',
      descriptionKey: 'features.batchProcessing.description',
    },
    {
      icon: Zap,
      titleKey: 'features.aiPowered.title',
      descriptionKey: 'features.aiPowered.description',
    },
    {
      icon: Globe,
      titleKey: 'features.multiLanguage.title',
      descriptionKey: 'features.multiLanguage.description',
    },
    {
      icon: FileText,
      titleKey: 'features.customStyles.title',
      descriptionKey: 'features.customStyles.description',
    },
  ];
  
  return (
    <section
      id="features"
      className={cn(
        'py-16',
        spacing.container.pagePadding,
        colors.background.secondary
      )}
    >
      <div className={cn(spacing.container.maxWidth, 'mx-auto')}>
        {/* Section Header */}
        <motion.div
          initial={motionVariants.fadeInUp.initial}
          whileInView={motionVariants.fadeInUp.animate}
          viewport={{ once: true, margin: '-100px' }}
          transition={{
            ...motionVariants.fadeInUp.transition,
            duration: animationDurations.pageTransition,
          }}
          className={cn('text-center', spacing.marginBottom.xl)}
        >
          <h2
            className={cn(
              typography.fontSize.lg,
              typography.fontWeight.bold,
              colors.text.primary,
              spacing.marginBottom.md
            )}
          >
            {t('features.title')}
          </h2>
          <p
            className={cn(
              typography.fontSize.base,
              colors.text.secondary,
              'max-w-2xl mx-auto'
            )}
          >
            {t('features.subtitle')}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
            spacing.gap.md
          )}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.titleKey}
                initial={motionVariants.fadeInUp.initial}
                whileInView={motionVariants.fadeInUp.animate}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  ...motionVariants.fadeInUp.transition,
                  duration: animationDurations.pageTransition,
                  delay: index * 0.1,
                }}
                className={cn(
                  cardConfig.borderRadius,
                  cardConfig.border,
                  cardConfig.background,
                  cardConfig.padding,
                  'flex flex-col',
                  spacing.vertical.md,
                  'hover:scale-[1.02]',
                  'transition-transform',
                  'duration-200'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex items-center justify-center',
                    colors.background.tertiary,
                    borderRadius.md,
                    'w-12 h-12',
                    spacing.marginBottom.md
                  )}
                >
                  <Icon
                    className={cn(iconSizes.lg, colors.text.primary)}
                  />
                </div>

                {/* Title */}
                <h3
                  className={cn(
                    typography.fontSize.md,
                    typography.fontWeight.semibold,
                    colors.text.primary,
                    spacing.marginBottom.sm
                  )}
                >
                  {t(feature.titleKey)}
                </h3>

                {/* Description */}
                <p
                  className={cn(
                    typography.fontSize.sm,
                    typography.fontWeight.normal,
                    colors.text.secondary,
                    typography.lineHeight.relaxed
                  )}
                >
                  {t(feature.descriptionKey)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


