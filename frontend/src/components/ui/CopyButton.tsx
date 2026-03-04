"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { streamingConfig, animationDurations } from "@/config/visual-effects";

interface CopyButtonProps {
  text: string;
  className?: string;
  onCopy?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
}

/**
 * CopyButton Component
 * Reusable copy button with animations
 * Matches PRD Section 4.2.4.3 specifications
 * Phase 4: Animate UI Copy Button component
 */
export function CopyButton({
  text,
  className,
  onCopy,
  size = "md",
  variant = "default",
}: CopyButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), streamingConfig.copyButton.resetTimeout);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const sizeClasses = {
    sm: cn(
      streamingConfig.copyButton.sizes.sm.height,
      streamingConfig.copyButton.sizes.sm.padding,
      streamingConfig.copyButton.sizes.sm.fontSize
    ),
    md: cn(
      streamingConfig.copyButton.sizes.md.height,
      streamingConfig.copyButton.sizes.md.padding,
      streamingConfig.copyButton.sizes.md.fontSize
    ),
    lg: cn(
      streamingConfig.copyButton.sizes.lg.height,
      streamingConfig.copyButton.sizes.lg.padding,
      streamingConfig.copyButton.sizes.lg.fontSize
    ),
  };

  const variantClasses = {
    default: cn(
      streamingConfig.copyButton.variants.default.background,
      streamingConfig.copyButton.variants.default.backgroundHover,
      streamingConfig.copyButton.variants.default.text,
      "border",
      streamingConfig.copyButton.variants.default.border
    ),
    outline: cn(
      streamingConfig.copyButton.variants.outline.background,
      streamingConfig.copyButton.variants.outline.backgroundHover,
      streamingConfig.copyButton.variants.outline.text,
      "border",
      streamingConfig.copyButton.variants.outline.border
    ),
    ghost: cn(
      streamingConfig.copyButton.variants.ghost.background,
      streamingConfig.copyButton.variants.ghost.backgroundHover,
      streamingConfig.copyButton.variants.ghost.text,
      "border",
      streamingConfig.copyButton.variants.ghost.border
    ),
  };

  return (
    <motion.button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border transition-colors",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      whileHover={shouldReduceMotion ? {} : { scale: streamingConfig.copyButton.animations.hoverScale }}
      whileTap={shouldReduceMotion ? {} : { scale: streamingConfig.copyButton.animations.tapScale }}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <>
          <motion.div
            initial={shouldReduceMotion ? {} : { scale: 0 }}
            animate={shouldReduceMotion ? {} : { scale: 1 }}
            transition={{ duration: animationDurations.copyButtonCheckmark }}
          >
            <Check className={cn(streamingConfig.copyButton.sizes[size].iconSize, streamingConfig.copyButton.animations.successColor)} />
          </motion.div>
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className={streamingConfig.copyButton.sizes[size].iconSize} />
          <span>Copy</span>
        </>
      )}
    </motion.button>
  );
}

