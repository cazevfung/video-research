'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  buttonConfig,
  motionVariants,
  animationDurations,
} from '@/config/visual-effects';
import { routes } from '@/config/routes';
import { trackLandingPageCTAClicked } from '@/utils/analytics';

/**
 * Landing Page Hero Component
 * Hero section with headline, subheadline, and CTAs
 * Uses design system configs (no hardcoded values)
 */
export function Hero() {
  const { t } = useTranslation('landing');
  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center',
        'min-h-screen',
        spacing.container.pagePadding,
        spacing.paddingTop.header,
        colors.background.primary
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center text-center',
          spacing.container.maxWidthContent,
          spacing.vertical.lg
        )}
      >
        {/* Headline */}
        <motion.h1
          initial={motionVariants.fadeInUp.initial}
          animate={motionVariants.fadeInUp.animate}
          transition={{
            ...motionVariants.fadeInUp.transition,
            duration: animationDurations.pageTransition,
          }}
          className={cn(
            typography.fontSize.xl,
            typography.fontWeight.bold,
            typography.lineHeight.tight,
            colors.text.primary,
            spacing.margin.md
          )}
          >
          {t('hero.headline')}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={motionVariants.fadeInUp.initial}
          animate={motionVariants.fadeInUp.animate}
          transition={{
            ...motionVariants.fadeInUp.transition,
            duration: animationDurations.pageTransition,
            delay: 0.1,
          }}
          className={cn(
            typography.fontSize.base,
            typography.fontWeight.normal,
            typography.lineHeight.relaxed,
            colors.text.secondary,
            spacing.margin.lg,
            'max-w-2xl'
          )}
        >
          {t('hero.subheadline')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={motionVariants.fadeInUp.initial}
          animate={motionVariants.fadeInUp.animate}
          transition={{
            ...motionVariants.fadeInUp.transition,
            duration: animationDurations.pageTransition,
            delay: 0.2,
          }}
          className={cn(
            'flex flex-col sm:flex-row items-center justify-center',
            spacing.gap.md,
            spacing.marginTop.lg
          )}
        >
          {/* Primary CTA */}
          <Link
            href={routes.app}
            onClick={() => trackLandingPageCTAClicked('primary')}
          >
            <Button
              size="lg"
              variant="default"
              className={cn(
                buttonConfig.hoverScale,
                'w-full sm:w-auto',
                spacing.padding.lg
              )}
            >
              {t('hero.getStarted')}
            </Button>
          </Link>

          {/* Secondary CTA (Optional) */}
          <Link
            href="#features"
            onClick={() => trackLandingPageCTAClicked('secondary')}
          >
            <Button
              size="lg"
              variant="outline"
              className={cn(
                buttonConfig.hoverScale,
                'w-full sm:w-auto',
                spacing.padding.lg
              )}
            >
              {t('hero.learnMore')}
            </Button>
          </Link>
        </motion.div>

        {/* Tech Stack Badges */}
        <motion.div
          initial={motionVariants.fadeInUp.initial}
          animate={motionVariants.fadeInUp.animate}
          transition={{
            ...motionVariants.fadeInUp.transition,
            duration: animationDurations.pageTransition,
            delay: 0.3,
          }}
          className={cn(
            'flex flex-wrap items-center justify-center',
            spacing.gap.sm,
            spacing.marginTop.xl
          )}
        >
          {['React', 'TypeScript', 'Next.js', 'AI-Powered'].map((badge, index) => (
            <span
              key={badge}
              className={cn(
                typography.fontSize.base,
                typography.fontWeight.medium,
                colors.text.tertiary,
                colors.background.secondary,
                borderRadius.md,
                spacing.padding.sm,
                'border',
                colors.border.default
              )}
            >
              {badge}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

