"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { typography, tooltipConfig } from "@/config/visual-effects";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    showPointer?: boolean;
  }
>(({ className, sideOffset = tooltipConfig.spacing.defaultSideOffset, showPointer = false, ...props }, ref) => {
  // Generate pointer classes using config values
  const pointerSize = tooltipConfig.pointer.size;
  const pointerOffset = tooltipConfig.pointer.offset;
  const borderOffset = tooltipConfig.pointer.borderOffset;
  const pointerColors = tooltipConfig.pointer.colors;

  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        tooltipConfig.zIndex,
        "overflow-visible",
        tooltipConfig.borderRadius,
        "border",
        tooltipConfig.colors.border,
        tooltipConfig.colors.background,
        tooltipConfig.spacing.padding,
        tooltipConfig.colors.text,
        tooltipConfig.shadow,
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        typography.fontSize.sm,
        // Pointer/arrow styling using config values
        showPointer && [
          "relative",
          // Right side: pointer on left
          `data-[side=right]:before:content-[''] data-[side=right]:before:absolute data-[side=right]:before:left-[-${pointerOffset}px] data-[side=right]:before:top-1/2 data-[side=right]:before:-translate-y-1/2 data-[side=right]:before:w-0 data-[side=right]:before:h-0 data-[side=right]:before:border-[${pointerSize}px] data-[side=right]:before:${pointerColors.right.background} data-[side=right]:before:border-t-transparent data-[side=right]:before:border-b-transparent data-[side=right]:before:border-l-transparent`,
          `data-[side=right]:after:content-[''] data-[side=right]:after:absolute data-[side=right]:after:left-[-${borderOffset}px] data-[side=right]:after:top-1/2 data-[side=right]:after:-translate-y-1/2 data-[side=right]:after:w-0 data-[side=right]:after:h-0 data-[side=right]:after:border-[${pointerSize}px] data-[side=right]:after:${pointerColors.right.border} data-[side=right]:after:border-t-transparent data-[side=right]:after:border-b-transparent data-[side=right]:after:border-l-transparent`,
          // Left side: pointer on right
          `data-[side=left]:before:content-[''] data-[side=left]:before:absolute data-[side=left]:before:right-[-${pointerOffset}px] data-[side=left]:before:top-1/2 data-[side=left]:before:-translate-y-1/2 data-[side=left]:before:w-0 data-[side=left]:before:h-0 data-[side=left]:before:border-[${pointerSize}px] data-[side=left]:before:${pointerColors.left.background} data-[side=left]:before:border-t-transparent data-[side=left]:before:border-b-transparent data-[side=left]:before:border-r-transparent`,
          `data-[side=left]:after:content-[''] data-[side=left]:after:absolute data-[side=left]:after:right-[-${borderOffset}px] data-[side=left]:after:top-1/2 data-[side=left]:after:-translate-y-1/2 data-[side=left]:after:w-0 data-[side=left]:after:h-0 data-[side=left]:after:border-[${pointerSize}px] data-[side=left]:after:${pointerColors.left.border} data-[side=left]:after:border-t-transparent data-[side=left]:after:border-b-transparent data-[side=left]:after:border-r-transparent`,
          // Top side: pointer on bottom
          `data-[side=top]:before:content-[''] data-[side=top]:before:absolute data-[side=top]:before:bottom-[-${pointerOffset}px] data-[side=top]:before:left-1/2 data-[side=top]:before:-translate-x-1/2 data-[side=top]:before:w-0 data-[side=top]:before:h-0 data-[side=top]:before:border-[${pointerSize}px] data-[side=top]:before:${pointerColors.top.background} data-[side=top]:before:border-l-transparent data-[side=top]:before:border-r-transparent data-[side=top]:before:border-b-transparent`,
          `data-[side=top]:after:content-[''] data-[side=top]:after:absolute data-[side=top]:after:bottom-[-${borderOffset}px] data-[side=top]:after:left-1/2 data-[side=top]:after:-translate-x-1/2 data-[side=top]:after:w-0 data-[side=top]:after:h-0 data-[side=top]:after:border-[${pointerSize}px] data-[side=top]:after:${pointerColors.top.border} data-[side=top]:after:border-l-transparent data-[side=top]:after:border-r-transparent data-[side=top]:after:border-b-transparent`,
          // Bottom side: pointer on top
          `data-[side=bottom]:before:content-[''] data-[side=bottom]:before:absolute data-[side=bottom]:before:top-[-${pointerOffset}px] data-[side=bottom]:before:left-1/2 data-[side=bottom]:before:-translate-x-1/2 data-[side=bottom]:before:w-0 data-[side=bottom]:before:h-0 data-[side=bottom]:before:border-[${pointerSize}px] data-[side=bottom]:before:${pointerColors.bottom.background} data-[side=bottom]:before:border-l-transparent data-[side=bottom]:before:border-r-transparent data-[side=bottom]:before:border-t-transparent`,
          `data-[side=bottom]:after:content-[''] data-[side=bottom]:after:absolute data-[side=bottom]:after:top-[-${borderOffset}px] data-[side=bottom]:after:left-1/2 data-[side=bottom]:after:-translate-x-1/2 data-[side=bottom]:after:w-0 data-[side=bottom]:after:h-0 data-[side=bottom]:after:border-[${pointerSize}px] data-[side=bottom]:after:${pointerColors.bottom.border} data-[side=bottom]:after:border-l-transparent data-[side=bottom]:after:border-r-transparent data-[side=bottom]:after:border-t-transparent`,
        ],
        className
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

