"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { colors, typography, spacing, borderRadius, layoutConfig } from "@/config/visual-effects";

export interface QuestionItemProps {
  question: string;
  index: number;
  explanation?: string;
}

/**
 * QuestionItem Component
 * Phase 3: Display a single research question
 */
export function QuestionItem({
  question,
  index,
  explanation,
}: QuestionItemProps) {
  return (
    <div
      className={cn(
        colors.background.secondary,
        borderRadius.md,
        "border",
        colors.border.default,
        spacing.padding.md,
        "space-y-2"
      )}
    >
      <div className={cn(layoutConfig.approvalItem.layout.container, layoutConfig.approvalItem.layout.gap)}>
        <div
          className={cn(
            layoutConfig.approvalItem.badge.container,
            layoutConfig.approvalItem.badge.size,
            layoutConfig.approvalItem.badge.alignment,
            colors.background.secondary,
            typography.fontSize.sm,
            typography.fontWeight.bold,
            colors.text.primary
          )}
        >
          {index + 1}
        </div>
        <div className={layoutConfig.approvalItem.content.container}>
          <p className={cn(
            typography.fontSize.base,
            typography.fontWeight.medium,
            colors.text.primary,
            layoutConfig.approvalItem.content.textLineHeight
          )}>
            {question}
          </p>
          {explanation && (
            <p className={cn(typography.fontSize.sm, colors.text.secondary, "mt-2")}>
              {explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
