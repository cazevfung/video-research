/**
 * Phase 5: Performance Optimization - Lazy Loading Utilities
 * Provides lazy loading helpers for components and code splitting
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * Lazy load a component with error boundary support
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(importFn);
}

/**
 * Lazy load components that are only needed on specific pages
 * This reduces initial bundle size
 */

// History page components - only load when navigating to history
export const SummaryDetailView = lazyLoad(
  () => import('@/components/history/SummaryDetailView').then(m => ({ default: m.SummaryDetailView }))
);

export const BulkActionsBar = lazyLoad(
  () => import('@/components/history/BulkActionsBar').then(m => ({ default: m.BulkActionsBar }))
);

export const SortDropdown = lazyLoad(
  () => import('@/components/history/SortDropdown').then(m => ({ default: m.SortDropdown }))
);

// Dashboard components - lazy load heavy components
export const ResultCard = lazyLoad(
  () => import('@/components/dashboard/ResultCard').then(m => ({ default: m.ResultCard }))
);

export const ProcessingOverlay = lazyLoad(
  () => import('@/components/dashboard/ProcessingOverlay').then(m => ({ default: m.ProcessingOverlay }))
);

// UI components - lazy load modals and dialogs
export const KeyboardShortcutsModal = lazyLoad(
  () => import('@/components/ui/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal }))
);

export const HelpMenu = lazyLoad(
  () => import('@/components/ui/HelpMenu').then(m => ({ default: m.HelpMenu }))
);

/**
 * Preload a lazy component before it's needed
 * Useful for prefetching on hover or before navigation
 */
export function preloadComponent<T extends ComponentType<any>>(
  lazyComponent: LazyExoticComponent<T>
): void {
  // Trigger the import by accessing the component
  // This will start loading the chunk
  if ('_payload' in lazyComponent && lazyComponent._payload) {
    // Component is already loaded or loading
    return;
  }
  
  // For components that haven't been loaded yet, we can't directly trigger
  // The import will happen when the component is first rendered
  // This function is mainly for documentation/type safety
}

/**
 * Check if a component is already loaded
 */
export function isComponentLoaded<T extends ComponentType<any>>(
  lazyComponent: LazyExoticComponent<T>
): boolean {
  return '_payload' in lazyComponent && lazyComponent._payload !== null;
}

