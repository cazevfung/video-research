'use client';

import * as React from 'react';
import { HelpCircle, BookOpen, MessageCircle, ExternalLink, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { colors, spacing, typography, markdownConfig } from '@/config/visual-effects';

/**
 * HelpMenu Component
 * Provides access to documentation, FAQ, and support
 * Based on ui_fixes_prd.md Section 3.3.1
 */
export function HelpMenu() {
  const handleDocumentation = () => {
    // TODO: Link to documentation when available
    // For now, open in new tab or navigate
    window.open('https://github.com/your-repo/docs', '_blank');
  };

  const handleFAQ = () => {
    // TODO: Open FAQ page or modal
    console.log('FAQ clicked');
  };

  const handleSupport = () => {
    // TODO: Open support page or contact form
    console.log('Support clicked');
  };

  const handleKeyboardShortcuts = () => {
    // Trigger keyboard shortcuts modal
    // This could be done by dispatching an event or using a context
    const event = new CustomEvent('open-keyboard-shortcuts');
    window.dispatchEvent(event);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center",
            spacing.gap.sm,
            colors.text.secondary,
            markdownConfig.link.hover,
            "bg-theme-bg-card hover:bg-theme-bg-card-hover"
          )}
          style={{
            backgroundColor: "var(--color-theme-bg-card)", // CSS variable
          }}
        >
          <HelpCircle className="h-4 w-4" />
          <span className={cn("hidden sm:inline", typography.fontSize.base)}>
            Help
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("w-56")}>
        <DropdownMenuLabel>
          <span className={cn(typography.fontSize.sm, typography.fontWeight.medium)}>
            Help & Support
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleKeyboardShortcuts} className={cn("flex items-center", spacing.gap.sm)}>
          <FileText className="h-4 w-4" />
          <span>Keyboard Shortcuts</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDocumentation} className={cn("flex items-center", spacing.gap.sm)}>
          <BookOpen className="h-4 w-4" />
          <span>Documentation</span>
          <ExternalLink className={cn("h-3 w-3", "ml-auto")} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFAQ} className={cn("flex items-center", spacing.gap.sm)}>
          <HelpCircle className="h-4 w-4" />
          <span>FAQ</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSupport} className={cn("flex items-center", spacing.gap.sm)}>
          <MessageCircle className="h-4 w-4" />
          <span>Contact Support</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

