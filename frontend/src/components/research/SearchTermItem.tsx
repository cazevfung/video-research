"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { colors, typography, spacing, borderRadius, layoutConfig } from "@/config/visual-effects";

export interface SearchTermItemProps {
  term: string;
  index: number;
  relatedQuestion?: string;
}

/**
 * SearchTermItem Component
 * Phase 3: Display a search term with optional related question context
 */
export function SearchTermItem({
  term,
  index,
  relatedQuestion,
}: SearchTermItemProps) {
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
            "text-blue-500"
          )}
        >
          <Search className="h-4 w-4" />
        </div>
        <div className={layoutConfig.approvalItem.content.container}>
          <p className={cn(
            typography.fontSize.base,
            typography.fontWeight.medium,
            colors.text.primary,
            layoutConfig.approvalItem.content.textLineHeight
          )}>
            {term}
          </p>
          {relatedQuestion && (
            <p className={cn(typography.fontSize.sm, colors.text.secondary, "mt-2")}>
              <span className={cn(typography.fontWeight.medium)}>
                Related to:
              </span>{" "}
              {relatedQuestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
