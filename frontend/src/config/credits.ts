/**
 * Phase 5: Credit System Configuration
 * Centralized configuration for credit system thresholds, colors, and settings
 * Ensures no hardcoded values in components
 */

import { colors } from './visual-effects';

/**
 * Credit balance thresholds (as percentages)
 * Used to determine color coding and warnings
 */
export const creditThresholds = {
  /**
   * High threshold - above this percentage, credits are considered healthy
   * Default: 50% (green)
   */
  high: 50,
  
  /**
   * Medium threshold - between this and high, credits are considered moderate
   * Default: 25% (yellow)
   */
  medium: 25,
  
  /**
   * Low threshold - below this percentage, credits are considered low
   * Default: below 25% (red)
   */
  low: 0,
} as const;

/**
 * Get credit status color based on percentage remaining
 * @param percentage - Percentage of credits remaining (0-100)
 * @returns Tailwind color class for the status
 */
export function getCreditStatusColor(percentage: number): string {
  if (percentage > creditThresholds.high) {
    return colors.status.success; // Green for >50%
  } else if (percentage >= creditThresholds.medium) {
    return colors.status.warning; // Yellow for 25-50%
  } else {
    return colors.status.error; // Red for <25%
  }
}

/**
 * Get credit status background color based on percentage remaining
 * @param percentage - Percentage of credits remaining (0-100)
 * @returns Tailwind background color class for the status
 */
export function getCreditStatusBackgroundColor(percentage: number): string {
  if (percentage > creditThresholds.high) {
    return colors.statusBackground.success;
  } else if (percentage >= creditThresholds.medium) {
    return colors.statusBackground.warning;
  } else {
    return colors.statusBackground.error;
  }
}

/**
 * Credit transaction history configuration
 */
export const creditTransactions = {
  /**
   * Default page size for transaction history
   */
  defaultPageSize: 20,
  
  /**
   * Available page sizes for pagination
   */
  pageSizeOptions: [10, 20, 50, 100] as const,
  
  /**
   * Maximum number of transactions to display per page
   */
  maxPageSize: 100,
} as const;

/**
 * Credit visualization configuration
 */
export const creditVisualization = {
  /**
   * Number of data points to show in charts
   */
  defaultDataPoints: 30,
  
  /**
   * Maximum number of data points for charts
   */
  maxDataPoints: 100,
  
  /**
   * Chart height in pixels
   */
  chartHeight: 300,
  
  /**
   * Chart animation duration in milliseconds
   */
  animationDuration: 500,
} as const;

/**
 * Credit display configuration
 */
export const creditDisplay = {
  /**
   * Whether to show credit badge in header (optional feature)
   */
  showHeaderBadge: false,
  
  /**
   * Format for displaying credit amounts
   */
  format: {
    /**
     * Show decimal places for credits
     */
    showDecimals: false,
    
    /**
     * Minimum value to show (below this, show "Low" instead of number)
     */
    minDisplayValue: 0,
  },
} as const;


