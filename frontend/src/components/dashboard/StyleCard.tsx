"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { spacing, colors, borderRadius, typography, shadows } from "@/config/visual-effects";

export interface StyleCardProps {
  preset: string;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (preset: string) => void;
}

export function StyleCard({ preset, isSelected, isExpanded, onSelect }: StyleCardProps) {
  const { t } = useTranslation('summary');
  
  const handleSelect = () => {
    onSelect(preset);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(preset);
    }
  };

  // Get style description data from translations
  const styleName = t(`form.styleDescriptions.${preset}.name`, { defaultValue: t(`form.presetLabels.${preset}`, preset) });
  const framework = t(`form.styleDescriptions.${preset}.framework`, { defaultValue: '' });
  const description = t(`form.styleDescriptions.${preset}.description`, { defaultValue: '' });
  const bestFor = t(`form.styleDescriptions.${preset}.bestFor`, { defaultValue: '' });
  const characteristics = t(`form.styleDescriptions.${preset}.characteristics`, { returnObjects: true, defaultValue: [] }) as string[];

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      aria-label={`Select ${styleName} style`}
      aria-pressed={isSelected}
      className={cn(
        "cursor-pointer transition-all",
        "hover:border-theme-border-strong",
        "focus:outline-none focus:ring-2",
        shadows.focus.ring,
        isSelected && `border-2 ${colors.border.focus}`,
        !isSelected && colors.border.default,
        "hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      <CardHeader className={cn("pb-2")}>
        <CardTitle className={cn(
          typography.fontSize.lg,
          typography.fontWeight.semibold,
          colors.text.primary,
          "mb-1"
        )}>
          {styleName}
        </CardTitle>
        {framework && (
          <p className={cn(
            typography.fontSize.xs,
            typography.fontWeight.medium,
            colors.text.secondary
          )}>
            {framework}
          </p>
        )}
      </CardHeader>
      {isExpanded && (
        <CardContent className={cn("pt-2")}>
          {description && (
            <p className={cn(
              typography.fontSize.sm,
              colors.text.primary,
              "mb-3"
            )}>
              {description}
            </p>
          )}
          {bestFor && (
            <div className={cn("mb-3")}>
              <p className={cn(
                typography.fontSize.xs,
                typography.fontWeight.medium,
                colors.text.secondary,
                "mb-1"
              )}>
                {t('form.bestFor')}:
              </p>
              <p className={cn(
                typography.fontSize.xs,
                colors.text.tertiary
              )}>
                {bestFor}
              </p>
            </div>
          )}
          {characteristics && characteristics.length > 0 && (
            <ul className={cn("space-y-1")}>
              {characteristics.map((characteristic, index) => (
                <li
                  key={index}
                  className={cn(
                    typography.fontSize.xs,
                    colors.text.tertiary,
                    "flex items-start gap-1"
                  )}
                >
                  <span className={cn("text-theme-text-secondary", "mt-0.5")}>•</span>
                  <span className="flex-1">{characteristic}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}
