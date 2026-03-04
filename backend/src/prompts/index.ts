/**
 * Prompt templates system
 * Centralized prompt management
 */

export * from './pre-condense.prompt';
export * from './final-summary.prompt';
export * from './title-generation.prompt';
export * from './research.prompt';

import { getSummaryConfig } from '../config';
import { getValidPresetStyles } from '../utils/validators';

// Import PresetStyle for use in this file
import type { PresetStyle } from './final-summary.prompt';

/**
 * Get supported preset styles from config
 * @returns Array of valid preset style values
 */
export function getPresetStyles(): string[] {
  return getValidPresetStyles();
}

/**
 * Validate preset style
 * @param style Preset style to validate
 * @returns True if valid
 */
export function isValidPresetStyle(style: string): style is PresetStyle {
  const validStyles = getValidPresetStyles();
  return validStyles.includes(style);
}

// Re-export PresetStyle type
export type { PresetStyle } from './final-summary.prompt';

/**
 * @deprecated Use getPresetStyles() instead. This constant is kept for backward compatibility but now uses config.
 */
export const PRESET_STYLES = getPresetStyles() as readonly string[];

