"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Keyboard, HelpCircle } from "lucide-react";
import { spacing, colors, typography, borderRadius, buttonConfig, iconSizes } from "@/config/visual-effects";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  descriptionKey: string;
}

/**
 * KeyboardShortcutsModal Component
 * Displays available keyboard shortcuts in a modal dialog
 * Phase 2: Dashboard Improvements
 * Phase 4: General Improvements - Added external trigger support
 */
export function KeyboardShortcutsModal() {
  const { t } = useTranslation('common');
  const [open, setOpen] = React.useState(false);

  const shortcuts: Shortcut[] = [
    { keys: ["Ctrl", "Enter"], descriptionKey: "keyboardShortcuts.shortcuts.submitForm" },
    { keys: ["Ctrl", "N"], descriptionKey: "keyboardShortcuts.shortcuts.newBatch" },
  ];

  // Listen for external open events (from HelpMenu)
  React.useEffect(() => {
    const handleOpenEvent = () => {
      setOpen(true);
    };
    window.addEventListener('open-keyboard-shortcuts', handleOpenEvent);
    return () => {
      window.removeEventListener('open-keyboard-shortcuts', handleOpenEvent);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "flex items-center",
            spacing.gap.sm,
            colors.text.secondary,
            "hover:text-theme-text-primary"
          )}
          aria-label="Open keyboard shortcuts"
        >
          <Keyboard className={iconSizes.sm} aria-hidden="true" />
          <span className={cn("hidden sm:inline", typography.fontSize.base)}>{t('keyboardShortcuts.button')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('keyboardShortcuts.title')}</DialogTitle>
          <DialogDescription>
            {t('keyboardShortcuts.description')}
          </DialogDescription>
        </DialogHeader>
        <div className={cn("space-y-4", spacing.margin.md)}>
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className={cn("flex items-center justify-between", spacing.gap.md)}>
              <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                {t(shortcut.descriptionKey)}
              </span>
              <div className={cn("flex", spacing.gap.xs)}>
                {shortcut.keys.map((key, keyIdx) => (
                  <React.Fragment key={keyIdx}>
                    <kbd
                      className={cn(
                        spacing.padding.xs,
                        typography.fontSize.xs,
                        typography.fontWeight.semibold,
                        colors.text.secondary,
                        colors.background.secondary,
                        "border",
                        colors.border.default,
                        borderRadius.sm
                      )}
                    >
                      {key}
                    </kbd>
                    {keyIdx < shortcut.keys.length - 1 && (
                      <span className={cn(colors.text.muted, spacing.marginHorizontal.sm)}>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

