import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { typography } from "@/config/visual-effects";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  /**
   * When true, renders a Radix `Slot` so the child (e.g. `Link`) becomes the actual element.
   * This prevents invalid nesting and avoids forwarding `asChild` to the DOM.
   */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium",
          "transition-all duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-border-strong focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          typography.fontSize.base, // All buttons use text-base (14px)
          {
            // Default variant - solid button with good contrast
            // Using explicit style to ensure colors are applied correctly
            "bg-theme-bg-button text-theme-button-text hover:bg-theme-bg-button-hover active:scale-[0.98]":
              variant === "default",
            // Outline variant
            "border border-theme-border-primary bg-transparent hover:bg-theme-bg-secondary text-theme-text-primary active:scale-[0.98]":
              variant === "outline",
            // Ghost variant
            "hover:bg-theme-bg-secondary text-theme-text-primary active:scale-[0.98]": variant === "ghost",
            // Sizes
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3": size === "sm",
            "h-11 px-8": size === "lg",
          },
          className
        )}
        style={
          variant === "default"
            ? {
                backgroundColor: "var(--color-theme-bg-button)",
                color: "var(--color-theme-button-text)",
              }
            : undefined
        }
        ref={ref as any}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };

