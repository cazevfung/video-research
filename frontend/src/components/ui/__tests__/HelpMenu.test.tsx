/**
 * Phase 5: Functional Testing - HelpMenu Component
 * Tests for help menu functionality and accessibility
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpMenu } from '../HelpMenu';

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

// Mock window.open
const mockWindowOpen = jest.fn();
window.open = mockWindowOpen;

describe('HelpMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render help menu trigger', () => {
      render(<HelpMenu />);
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
      expect(screen.getByText('Help')).toBeInTheDocument();
    });

    it('should render all menu items', () => {
      render(<HelpMenu />);
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      expect(screen.getByText('FAQ')).toBeInTheDocument();
      expect(screen.getByText('Contact Support')).toBeInTheDocument();
    });
  });

  describe('Menu Actions', () => {
    it('should open keyboard shortcuts modal when clicked', async () => {
      const addEventListenerSpy = jest.spyOn(window, 'dispatchEvent');
      render(<HelpMenu />);
      const shortcutsItem = screen.getByText('Keyboard Shortcuts');
      const user = userEvent.setup();
      
      await user.click(shortcutsItem);
      
      expect(addEventListenerSpy).toHaveBeenCalled();
      const event = addEventListenerSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('open-keyboard-shortcuts');
      
      addEventListenerSpy.mockRestore();
    });

    it('should open documentation in new tab', async () => {
      render(<HelpMenu />);
      const docsItem = screen.getByText('Documentation');
      const user = userEvent.setup();
      
      await user.click(docsItem);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://github.com/your-repo/docs',
        '_blank'
      );
    });

    it('should handle FAQ click', async () => {
      render(<HelpMenu />);
      const faqItem = screen.getByText('FAQ');
      const user = userEvent.setup();
      
      await user.click(faqItem);
      
      expect(console.log).toHaveBeenCalledWith('FAQ clicked');
    });

    it('should handle support click', async () => {
      render(<HelpMenu />);
      const supportItem = screen.getByText('Contact Support');
      const user = userEvent.setup();
      
      await user.click(supportItem);
      
      expect(console.log).toHaveBeenCalledWith('Support clicked');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible trigger button', () => {
      render(<HelpMenu />);
      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<HelpMenu />);
      const trigger = screen.getByRole('button');
      
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
    });
  });
});

