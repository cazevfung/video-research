'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';
import { spacing, colors, iconSizes, switchConfig } from '@/config/visual-effects';

export interface ThemeToggleProps {
  className?: string;
}

/**
 * ThemeToggle Component
 * Allows users to switch between light and dark themes using a Switch component
 * Based on style_update_prd.md and ui_consistency_and_ux_fixes_implementation_plan.md
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Default to dark mode if no preference is saved
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'dark');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const handleCheckedChange = (checked: boolean) => {
    setTheme(checked ? 'light' : 'dark');
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className={cn("flex items-center", spacing.gap.sm, className)}>
        <Switch.Root
          checked={false}
          disabled
          className={cn(
            "relative inline-flex items-center",
            switchConfig.root.height,
            switchConfig.root.width,
            switchConfig.root.borderRadius,
            switchConfig.root.transition,
            switchConfig.states.unchecked.background,
            "opacity-50 cursor-not-allowed"
          )}
          aria-label="Toggle theme"
        >
          <Switch.Thumb
            className={cn(
              "block rounded-full",
              switchConfig.thumb.height,
              switchConfig.thumb.width,
              switchConfig.thumb.background,
              switchConfig.thumb.shadow,
              switchConfig.thumb.transition,
              switchConfig.states.unchecked.thumbTranslate
            )}
          />
        </Switch.Root>
        <Sun className={cn(iconSizes.sm, colors.text.tertiary)} />
      </div>
    );
  }

  const isLight = theme === 'light';

  return (
    <div className={cn("flex items-center", spacing.gap.sm, className)}>
      <Switch.Root
        checked={isLight}
        onCheckedChange={handleCheckedChange}
        className={cn(
          "relative inline-flex items-center",
          switchConfig.root.height,
          switchConfig.root.width,
          switchConfig.root.borderRadius,
          switchConfig.root.transition,
          isLight ? switchConfig.states.checked.background : switchConfig.states.unchecked.background,
          switchConfig.focus.outline,
          switchConfig.focus.ring,
          switchConfig.focus.ringColor,
          switchConfig.focus.ringOffset
        )}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        <Switch.Thumb
          className={cn(
            "block rounded-full",
            switchConfig.thumb.height,
            switchConfig.thumb.width,
            switchConfig.thumb.background,
            switchConfig.thumb.shadow,
            switchConfig.thumb.transition,
            isLight ? switchConfig.states.checked.thumbTranslate : switchConfig.states.unchecked.thumbTranslate
          )}
        />
      </Switch.Root>
      {theme === 'dark' && (
        <Sun className={cn(iconSizes.sm, colors.text.tertiary)} />
      )}
      {theme === 'light' && (
        <Moon className={cn(iconSizes.sm, colors.text.tertiary)} />
      )}
    </div>
  );
}

