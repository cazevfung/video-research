/**
 * Phase 5: Functional Testing - ThemeToggle Component
 * Tests for theme toggle functionality and accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ThemeToggle';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.classList.remove('dark');
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render theme toggle button', async () => {
      render(<ThemeToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /theme/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('should show light mode option when in dark mode', async () => {
      localStorageMock.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      
      render(<ThemeToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument();
      });
    });

    it('should show dark mode option when in light mode', async () => {
      localStorageMock.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      
      render(<ThemeToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Switching', () => {
    it('should toggle theme on click', async () => {
      localStorageMock.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      
      render(<ThemeToggle />);
      const button = await screen.findByRole('button', { name: /theme/i });
      const user = userEvent.setup();
      
      await user.click(button);
      
      await waitFor(() => {
        expect(localStorageMock.getItem('theme')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('should persist theme preference to localStorage', async () => {
      render(<ThemeToggle />);
      const button = await screen.findByRole('button', { name: /theme/i });
      const user = userEvent.setup();
      
      await user.click(button);
      
      await waitFor(() => {
        expect(localStorageMock.getItem('theme')).toBeTruthy();
      });
    });

    it('should load saved theme preference on mount', async () => {
      localStorageMock.setItem('theme', 'light');
      
      render(<ThemeToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', async () => {
      render(<ThemeToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /switch to/i });
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have title attribute for tooltip', async () => {
      render(<ThemeToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /theme/i });
        expect(button).toHaveAttribute('title');
      });
    });

    it('should be keyboard accessible', async () => {
      render(<ThemeToggle />);
      const button = await screen.findByRole('button', { name: /theme/i });
      
      button.focus();
      expect(document.activeElement).toBe(button);
      
      // Should be able to activate with Enter/Space
      const user = userEvent.setup();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(localStorageMock.getItem('theme')).toBeTruthy();
      });
    });
  });

  describe('Hydration', () => {
    it('should prevent hydration mismatch', () => {
      const { container } = render(<ThemeToggle />);
      // Should render disabled button initially
      const button = container.querySelector('button[disabled]');
      expect(button).toBeInTheDocument();
    });

    it('should enable button after mount', async () => {
      render(<ThemeToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /theme/i });
        expect(button).not.toHaveAttribute('disabled');
      });
    });
  });
});

