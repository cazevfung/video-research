"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { motion } from "framer-motion";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { typography, spacing, animationDurations, borderRadius } from "@/config/visual-effects";

/**
 * DropdownMenuAnimate Component
 * 
 * Animated dropdown menu component using Framer Motion for smooth transitions.
 * Integrates with existing theme system using CSS variables (no hardcoded colors).
 * All configurations come from visual-effects.ts (spacing, typography, animations).
 * 
 * Based on Animate UI pattern with Radix UI primitives and Framer Motion animations.
 */

// Animation configuration from visual-effects.ts (no hardcoded values)
const DROPDOWN_ANIMATION_DURATION = animationDurations.dropdownTransition; // From config
const DROPDOWN_SIDE_OFFSET = 4; // pixels (default from plan - can be moved to config if needed)

// Framer Motion variants for dropdown animations
const dropdownContentVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DROPDOWN_ANIMATION_DURATION,
      ease: [0.4, 0, 0.2, 1] as const, // easeOut cubic bezier
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: {
      duration: DROPDOWN_ANIMATION_DURATION,
      ease: [0.4, 0, 1, 1] as const, // easeIn cubic bezier
    },
  },
};

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, style, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 outline-none transition-colors",
      typography.fontSize.base, // All menu items use text-base (14px)
      inset && "pl-8",
      className
    )}
    style={{
      ...style,
      color: "var(--color-theme-text-primary)", // CSS variable
    }}
    onFocus={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // CSS variable
    }}
    onBlur={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // CSS variable
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" style={{ color: "var(--color-theme-text-secondary)" }} />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg",
      borderRadius.sm, // From config
      className
    )}
    style={{
      backgroundColor: "var(--color-theme-bg-card)", // CSS variable
      borderColor: "var(--color-theme-border-primary)", // CSS variable
      color: "var(--color-theme-text-primary)", // CSS variable
    }}
    {...props}
  >
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={dropdownContentVariants}
    >
      {children}
    </motion.div>
  </DropdownMenuPrimitive.SubContent>
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = DROPDOWN_SIDE_OFFSET, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md",
        borderRadius.sm, // From config
        className
      )}
      style={{
        backgroundColor: "var(--color-theme-bg-card)", // CSS variable
        borderColor: "var(--color-theme-border-primary)", // CSS variable
        color: "var(--color-theme-text-primary)", // CSS variable
      }}
      {...props}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={dropdownContentVariants}
      >
        {children}
      </motion.div>
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, style, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&:focus]:opacity-100",
      typography.fontSize.base, // All menu items use text-base (14px)
      inset && "pl-8",
      className
    )}
    style={{
      ...style,
      color: "var(--color-theme-text-primary)", // CSS variable
    }}
    onFocus={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // CSS variable
    }}
    onBlur={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // CSS variable
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, style, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      typography.fontSize.base, // All menu items use text-base (14px)
      className
    )}
    checked={checked}
    style={{
      ...style,
      color: "var(--color-theme-text-primary)", // CSS variable
    }}
    onFocus={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // CSS variable
    }}
    onBlur={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // CSS variable
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" style={{ color: "var(--color-theme-text-primary)" }} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, style, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      typography.fontSize.base, // All menu items use text-base (14px)
      className
    )}
    style={{
      ...style,
      color: "var(--color-theme-text-primary)", // CSS variable
    }}
    onFocus={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // CSS variable
    }}
    onBlur={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "var(--color-theme-bg-card-hover)"; // CSS variable
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" style={{ color: "var(--color-theme-text-primary)" }} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 font-semibold",
      typography.fontSize.base, // Menu labels use text-base (14px)
      typography.fontWeight.semibold, // From config
      inset && "pl-8",
      className
    )}
    style={{
      color: "var(--color-theme-text-primary)", // CSS variable
    }}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px", className)}
    style={{
      backgroundColor: "var(--color-theme-border-primary)", // CSS variable
    }}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto tracking-widest opacity-60", typography.fontSize.xs, className)}
      style={{
        color: "var(--color-theme-text-secondary)", // CSS variable
      }}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
