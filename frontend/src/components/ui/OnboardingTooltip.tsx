"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { HelpCircle } from "lucide-react";
import { spacing, colors, typography, tooltipConfig, animationDurations } from "@/config/visual-effects";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface OnboardingTooltipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  storageKey?: string;
}

/**
 * OnboardingTooltip Component
 * Shows tooltips for first-time users with dismiss functionality
 * Enhanced with side positioning, pointer arrows, and smooth animations
 */
export function OnboardingTooltip({ 
  children, 
  content, 
  side = "left",
  storageKey = "onboarding-seen"
}: OnboardingTooltipProps) {
  // Initialize both states as false to ensure server/client match
  const [hasSeen, setHasSeen] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [isFirstRender, setIsFirstRender] = React.useState(true);

  // Check localStorage only after mount (client-side only)
  React.useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem(storageKey) === "true";
    setHasSeen(seen);
    // Only open tooltip if user hasn't seen it
    if (!seen) {
      setOpen(true);
    }
  }, [storageKey]);

  // Track first render for attention animation
  React.useEffect(() => {
    if (open && isFirstRender) {
      setIsFirstRender(false);
    }
  }, [open, isFirstRender]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !hasSeen) {
      // Don't mark as seen just yet - wait for user to dismiss
    } else if (!newOpen && !hasSeen) {
      // Mark as seen when tooltip is closed
      setHasSeen(true);
      localStorage.setItem(storageKey, "true");
    }
  };

  const handleDismiss = () => {
    setHasSeen(true);
    setOpen(false);
    localStorage.setItem(storageKey, "true");
  };

  // Don't render tooltip until mounted to avoid hydration mismatch
  // Always return children without tooltip (tutorial bubbles disabled)
  if (!mounted || hasSeen || true) {
    return <>{children}</>;
  }

  // Animation variants based on side using config values
  const getAnimationVariants = () => {
    const anim = tooltipConfig.animation;
    const baseVariants = {
      initial: { opacity: 0, scale: anim.scale.initial },
      animate: { opacity: 1, scale: anim.scale.animate },
      exit: { opacity: 0, scale: anim.scale.initial },
    };

    switch (side) {
      case "right":
        return {
          initial: { ...baseVariants.initial, x: -anim.slide.horizontal },
          animate: { ...baseVariants.animate, x: 0 },
          exit: { ...baseVariants.exit, x: -anim.slide.horizontal },
        };
      case "left":
        return {
          initial: { ...baseVariants.initial, x: anim.slide.horizontal },
          animate: { ...baseVariants.animate, x: 0 },
          exit: { ...baseVariants.exit, x: anim.slide.horizontal },
        };
      case "top":
        return {
          initial: { ...baseVariants.initial, y: anim.slide.vertical },
          animate: { ...baseVariants.animate, y: 0 },
          exit: { ...baseVariants.exit, y: anim.slide.vertical },
        };
      case "bottom":
        return {
          initial: { ...baseVariants.initial, y: -anim.slide.vertical },
          animate: { ...baseVariants.animate, y: 0 },
          exit: { ...baseVariants.exit, y: -anim.slide.vertical },
        };
      default:
        return baseVariants;
    }
  };

  const variants = getAnimationVariants();

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent 
          side={side} 
          sideOffset={tooltipConfig.spacing.sideOffset}
          align="center"
          showPointer={true}
          className={tooltipConfig.maxWidth}
        >
          <motion.div
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{
              duration: tooltipConfig.animation.duration,
              ease: tooltipConfig.animation.ease,
            }}
            className={cn(
              isFirstRender && "animate-pulse"
            )}
          >
            <div className={cn("flex items-start", tooltipConfig.spacing.contentGap)}>
              <HelpCircle className={cn("h-4 w-4 flex-shrink-0 mt-0.5")} />
              <div className="flex-1 min-w-0">
                <p className={cn(typography.fontSize.sm, colors.text.secondary, "mb-2 leading-relaxed")}>{content}</p>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-auto p-0 text-sm hover:underline mt-1"
                  )}
                >
                  Got it
                </Button>
              </div>
            </div>
          </motion.div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

