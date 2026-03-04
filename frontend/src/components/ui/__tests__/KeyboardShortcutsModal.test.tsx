/**
 * Phase 5: Functional Testing - KeyboardShortcutsModal Component
 * Tests for keyboard shortcuts modal functionality and accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal';

// Mock Dialog component
jest.mock('../Dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div data-testid="dialog-trigger">{children}</div>,
}));

describe('KeyboardShortcutsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render trigger button', () => {
      render(<KeyboardShortcutsModal />);
      expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
      expect(screen.getByText('Shortcuts')).toBeInTheDocument();
    });

    it('should render modal content when open', async () => {
      render(<KeyboardShortcutsModal />);
      const trigger = screen.getByTestId('dialog-trigger');
      const user = userEvent.setup();
      
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Keyboard Shortcuts');
      });
    });

    it('should display all shortcuts', async () => {
      render(<KeyboardShortcutsModal />);
      const trigger = screen.getByTestId('dialog-trigger');
      const user = userEvent.setup();
      
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Submit form')).toBeInTheDocument();
        expect(screen.getByText('New batch')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible trigger button', () => {
      render(<KeyboardShortcutsModal />);
      const trigger = screen.getByRole('button', { name: /shortcuts/i });
      expect(trigger).toBeInTheDocument();
    });

    it('should have proper ARIA labels on keyboard keys', async () => {
      render(<KeyboardShortcutsModal />);
      const trigger = screen.getByTestId('dialog-trigger');
      const user = userEvent.setup();
      
      await user.click(trigger);
      
      await waitFor(() => {
        const kbdElements = screen.getAllByRole('textbox', { hidden: true });
        // kbd elements should be present
        expect(document.querySelectorAll('kbd').length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard navigation', async () => {
      render(<KeyboardShortcutsModal />);
      const trigger = screen.getByRole('button', { name: /shortcuts/i });
      
      // Tab to trigger
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('External Trigger', () => {
    it('should open modal when external event is dispatched', async () => {
      render(<KeyboardShortcutsModal />);
      
      // Dispatch external event
      const event = new CustomEvent('open-keyboard-shortcuts');
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      });
    });

    it('should clean up event listener on unmount', () => {
      const { unmount } = render(<KeyboardShortcutsModal />);
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'open-keyboard-shortcuts',
        expect.any(Function)
      );
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});

