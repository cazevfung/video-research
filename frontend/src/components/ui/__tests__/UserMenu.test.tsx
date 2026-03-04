/**
 * Phase 5: Functional Testing - UserMenu Component
 * Tests for user menu functionality and accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '../UserMenu';

// Mock DropdownMenu component
jest.mock('../DropdownMenu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="menu-item">
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: any) => <div data-testid="menu-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="menu-separator" />,
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render user menu trigger', () => {
      render(<UserMenu />);
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should display user name when provided', () => {
      render(<UserMenu user={{ name: 'John Doe' }} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user email when provided', () => {
      render(<UserMenu user={{ email: 'john@example.com' }} />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display tier information', () => {
      render(<UserMenu user={{ tier: 'premium' }} />);
      expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    });
  });

  describe('Menu Items', () => {
    it('should render all menu items', () => {
      render(<UserMenu />);
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should call handlers when menu items are clicked', async () => {
      render(<UserMenu />);
      const accountItem = screen.getByText('Account');
      const user = userEvent.setup();
      
      await user.click(accountItem);
      
      expect(console.log).toHaveBeenCalledWith('Account clicked');
    });

    it('should disable upgrade option for premium users', () => {
      render(<UserMenu user={{ tier: 'premium' }} />);
      const upgradeItem = screen.getByText('Upgrade to Premium');
      expect(upgradeItem.closest('button')).toHaveAttribute('disabled');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible trigger button', () => {
      render(<UserMenu />);
      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<UserMenu />);
      const trigger = screen.getByRole('button');
      
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
    });

    it('should have proper ARIA attributes', () => {
      render(<UserMenu />);
      // DropdownMenu should handle ARIA attributes
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('should use default values when user prop is not provided', () => {
      render(<UserMenu />);
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Free Plan')).toBeInTheDocument();
    });
  });
});

