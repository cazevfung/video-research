import * as React from "react";
import { cn } from "@/lib/utils";
import { typography } from "@/config/visual-effects";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border-2 border-theme-border-primary bg-theme-bg-chat-input px-3 py-2",
          typography.fontSize.base,
          "text-theme-text-primary",
          "backdrop-blur-sm",
          "placeholder:text-theme-text-quaternary",
          "focus:border-theme-border-strong focus:outline-none focus:ring-2 focus:ring-theme-border-strong/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };

