'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/lib/validation';
import { LoginInput } from './LoginInput';
import { GoogleSignInButton } from './GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { routes } from '@/config/routes';
import { errorMessages } from '@/config/messages';
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  buttonConfig,
  iconSizes,
  animationDurations,
  motionVariants,
} from '@/config/visual-effects';

/**
 * LoginForm Component
 * Main login form with email/password and Google sign-in
 * All styling uses centralized config from visual-effects.ts
 */
export function LoginForm() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { signIn, signInWithEmailAndPassword, user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Get redirect parameter from URL
  const redirect = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('redirect') || routes.home
    : routes.home;

  // Redirect if already authenticated
  if (user) {
    router.push(redirect);
    return null;
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      // Use email/password authentication from AuthContext
      await signInWithEmailAndPassword(data.email, data.password);
      // Redirect handled by useEffect when user state changes
      // The AuthContext will update the user state, which triggers redirect above
      router.push(redirect);
    } catch (error) {
      // Error messages are already user-friendly from AuthContext
      // AuthContext uses getFirebaseAuthErrorMessage() which maps Firebase errors
      // to centralized error messages from config/messages.ts
      const errorMessage = error instanceof Error 
        ? error.message 
        : errorMessages.authDefaultError;
      setServerError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants using centralized config
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: animationDurations.pageTransition },
  };

  const itemVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: animationDurations.overlayFadeIn },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className={cn(
        'w-full max-w-md',
        colors.background.secondary,
        borderRadius.lg,
        spacing.container.cardPaddingMobile,
        shadows.card,
        'border',
        colors.border.default
      )}
    >
      {/* Welcome Heading */}
      <motion.h1
        variants={itemVariants}
        transition={{ delay: 0.2 }}
        className={cn(
          'text-center',
          typography.fontSize.xl,
          typography.fontWeight.bold,
          'leading-tight',
          colors.text.primary,
          spacing.margin.sm
        )}
      >
        {t('login.title')}
      </motion.h1>

      {/* Subheading */}
      <motion.p
        variants={itemVariants}
        transition={{ delay: 0.3 }}
        className={cn(
          'text-center',
          typography.fontSize.base,
          typography.fontWeight.normal,
          colors.text.tertiary,
          spacing.margin.xl
        )}
      >
        {t('login.subtitle')}
      </motion.p>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Input */}
        <motion.div
          variants={itemVariants}
          transition={{ delay: 0.4 }}
        >
          <LoginInput
            id="email"
            label={t('login.emailLabel')}
            type="email"
            placeholder={t('login.emailPlaceholder')}
            {...register('email')}
            error={errors.email?.message}
          />
        </motion.div>

        {/* Password Input */}
        <motion.div
          variants={itemVariants}
          transition={{ delay: 0.5 }}
        >
          <LoginInput
            id="password"
            label={t('login.passwordLabel')}
            type="password"
            placeholder={t('login.passwordPlaceholder')}
            showPasswordToggle
            {...register('password')}
            error={errors.password?.message}
          />
        </motion.div>

        {/* Helper Links */}
        <motion.div
          variants={itemVariants}
          transition={{ delay: 0.6 }}
          className={cn('flex justify-between items-center', spacing.marginTop.md)}
        >
          <label className={cn('flex items-center gap-2', typography.fontSize.sm, colors.text.tertiary)}>
            <input
              type="checkbox"
              className={cn(
                'rounded',
                colors.border.default,
                'focus:ring-2',
                shadows.focus.ring
              )}
            />
            <span>{t('login.rememberMe')}</span>
          </label>
          <a
            href="#"
            className={cn(
              typography.fontSize.sm,
              colors.text.tertiary,
              'hover:text-theme-text-secondary',
              'transition-colors',
              'duration-200'
            )}
          >
            {t('login.forgotPassword')}
          </a>
        </motion.div>

        {/* Server Error Message */}
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDurations.statusMessage }}
            className={cn(
              'p-4',
              'rounded-lg',
              borderRadius.md,
              colors.statusBackground.error,
              'border',
              colors.statusBorder.error,
              colors.status.error,
              typography.fontSize.sm
            )}
            role="alert"
          >
            {serverError}
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.div
          variants={itemVariants}
          transition={{ delay: 0.7 }}
        >
          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full',
              'flex items-center justify-center gap-2',
              buttonConfig.sizes.lg.height,
              buttonConfig.sizes.lg.padding,
              'py-3',
              borderRadius.md,
              colors.gradients.button,
              colors.text.inverse,
              'font-semibold',
              buttonConfig.hoverScale,
              'transition-transform',
              'duration-200',
              'disabled:opacity-50',
              'disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className={cn(iconSizes.sm, 'animate-spin')} />
                <span>{t('login.submitting')}</span>
              </>
            ) : (
              t('login.submitButton')
            )}
          </Button>
        </motion.div>

        {/* Divider */}
        <motion.div
          variants={itemVariants}
          transition={{ delay: 0.75 }}
          className={cn('flex items-center gap-4', spacing.marginTop.lg)}
        >
          <div className={cn('flex-1 h-px', colors.border.default, 'bg-current')} />
          <span className={cn(typography.fontSize.sm, colors.text.tertiary)}>{t('login.divider')}</span>
          <div className={cn('flex-1 h-px', colors.border.default, 'bg-current')} />
        </motion.div>

        {/* Google Sign-In Button */}
        <motion.div
          variants={itemVariants}
          transition={{ delay: 0.8 }}
        >
          <GoogleSignInButton />
        </motion.div>

        {/* Sign Up Link */}
        <motion.p
          variants={itemVariants}
          transition={{ delay: 0.9 }}
          className={cn(
            'text-center',
            typography.fontSize.sm,
            colors.text.tertiary,
            spacing.marginTop.lg
          )}
        >
          {t('login.noAccount')}{' '}
          <a
            href={routes.signup}
            className={cn(
              colors.text.secondary,
              'font-medium',
              'hover:text-theme-text-primary',
              'transition-colors',
              'duration-200'
            )}
          >
            {t('login.signUpLink', 'Sign up')}
          </a>
        </motion.p>
      </form>
    </motion.div>
  );
}

