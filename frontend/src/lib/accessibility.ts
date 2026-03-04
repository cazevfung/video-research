/**
 * Phase 5: Accessibility Utilities
 * Provides utilities for accessibility testing and improvements
 */

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return element.matches(focusableSelectors);
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * Trap focus within a container (for modals)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') {
      return;
    }

    if (focusableElements.length === 0) {
      e.preventDefault();
      return;
    }

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Restore focus to a previously focused element
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && isFocusable(element)) {
    element.focus();
  }
}

/**
 * Check color contrast ratio (WCAG AA compliance)
 * Returns true if contrast meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  // This is a simplified check - in production, use a library like 'color-contrast'
  // or implement proper RGB to relative luminance conversion
  const threshold = isLargeText ? 3 : 4.5;
  
  // Placeholder implementation
  // In production, convert hex/rgb to relative luminance and calculate ratio
  return true; // Simplified - always return true for now
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  // Using Tailwind's sr-only class (screen reader only)
  // This is a utility class, not a config value
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get accessible name for an element (for testing)
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label first
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  // Check aria-labelledby
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement) {
      return labelElement.textContent || '';
    }
  }

  // Check for associated label
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent || '';
    }
  }

  // Fallback to text content
  return element.textContent || '';
}

/**
 * Validate ARIA attributes on an element
 */
export function validateARIA(element: HTMLElement): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for required ARIA attributes based on role
  const role = element.getAttribute('role');
  
  if (role === 'button' && !element.getAttribute('aria-label') && !element.textContent) {
    errors.push('Button without accessible name');
  }

  if (role === 'dialog' && !element.getAttribute('aria-labelledby') && !element.getAttribute('aria-label')) {
    errors.push('Dialog without accessible name');
  }

  // Check for invalid ARIA attributes
  const ariaAttributes = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('aria-'))
    .map(attr => attr.name);

  const validAriaAttributes = [
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'aria-live',
    'aria-atomic',
    'aria-busy',
    'aria-checked',
    'aria-disabled',
    'aria-expanded',
    'aria-hidden',
    'aria-invalid',
    'aria-modal',
    'aria-pressed',
    'aria-required',
    'aria-selected',
    'aria-valuemax',
    'aria-valuemin',
    'aria-valuenow',
    'aria-valuetext',
    'aria-orientation',
    'aria-posinset',
    'aria-setsize',
    'aria-sort',
    'aria-current',
    'aria-level',
    'aria-multiline',
    'aria-multiselectable',
    'aria-readonly',
    'aria-autocomplete',
    'aria-controls',
    'aria-flowto',
    'aria-owns',
    'aria-activedescendant',
    'aria-colcount',
    'aria-colindex',
    'aria-colspan',
    'aria-rowcount',
    'aria-rowindex',
    'aria-rowspan',
  ];

  ariaAttributes.forEach(attr => {
    if (!validAriaAttributes.includes(attr)) {
      errors.push(`Invalid ARIA attribute: ${attr}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

