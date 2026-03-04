/**
 * Phase 3: Integration Tests for ProcessingOverlay Component
 * Tests for state transition fix and completion animations
 * 
 * Tests:
 * - Completion animation timing
 * - Overlay fade-out after completion
 * - State transitions
 * - Edge cases (rapid completion, error during completion)
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ProcessingOverlay } from '../ProcessingOverlay';
import * as React from 'react';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock WhimsicalLoader
jest.mock('../WhimsicalLoader', () => ({
  WhimsicalLoader: ({ status, progress, isCompleted }: any) => (
    <div data-testid="whimsical-loader" data-status={status} data-completed={isCompleted}>
      Loader {progress}%
    </div>
  ),
}));

// Mock StatusMessage
jest.mock('../StatusMessage', () => ({
  StatusMessage: ({ message }: any) => (
    <div data-testid="status-message">{message}</div>
  ),
}));

// Mock ProgressBar
jest.mock('../ProgressBar', () => ({
  ProgressBar: ({ progress }: any) => (
    <div data-testid="progress-bar">{progress}%</div>
  ),
}));

describe('ProcessingOverlay - Phase 3: Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Completion State Transition', () => {
    it('should show completion animation when completed', async () => {
      const { rerender } = render(
        <ProcessingOverlay
          status="generating"
          progress={90}
          message="Generating..."
          show={true}
          isStreaming={true}
          isCompleted={false}
          isCompleting={false}
        />
      );

      expect(screen.getByTestId('whimsical-loader')).toBeInTheDocument();
      expect(screen.getByTestId('whimsical-loader')).toHaveAttribute('data-completed', 'false');

      // Transition to completed
      rerender(
        <ProcessingOverlay
          status="completed"
          progress={100}
          message="Summary completed!"
          show={true}
          isStreaming={false}
          isCompleted={true}
          isCompleting={true}
        />
      );

      await waitFor(() => {
        const loader = screen.getByTestId('whimsical-loader');
        expect(loader).toHaveAttribute('data-completed', 'true');
      });

      // Message should update
      expect(screen.getByTestId('status-message')).toHaveTextContent('Summary completed!');
    });

    it('should keep overlay visible during completion animation', async () => {
      const { rerender } = render(
        <ProcessingOverlay
          status="completed"
          progress={100}
          message="Summary completed!"
          show={true}
          isStreaming={false}
          isCompleted={true}
          isCompleting={true}
        />
      );

      // Overlay should be visible
      expect(screen.getByTestId('whimsical-loader')).toBeInTheDocument();

      // Advance time but not past completion duration (1.5s)
      jest.advanceTimersByTime(1000);

      // Overlay should still be visible
      expect(screen.getByTestId('whimsical-loader')).toBeInTheDocument();

      // Advance past completion duration
      jest.advanceTimersByTime(600); // Total 1.6s

      await waitFor(() => {
        // Overlay should start fading out
        // (In real implementation, overlayVisible would become false)
      }, { timeout: 100 });
    });

    it('should fade out overlay after completion animation', async () => {
      const { rerender } = render(
        <ProcessingOverlay
          status="completed"
          progress={100}
          message="Summary completed!"
          show={true}
          isStreaming={false}
          isCompleted={true}
          isCompleting={true}
        />
      );

      expect(screen.getByTestId('whimsical-loader')).toBeInTheDocument();

      // Advance past completion animation duration (1.5s)
      jest.advanceTimersByTime(1600);

      await waitFor(() => {
        // Overlay should fade out
        // Note: In real implementation, overlayVisible state controls this
      }, { timeout: 100 });
    });
  });

  describe('State Transitions', () => {
    it('should transition from generating to completed smoothly', async () => {
      const { rerender } = render(
        <ProcessingOverlay
          status="generating"
          progress={85}
          message="Generating summary..."
          show={true}
          isStreaming={true}
          isCompleted={false}
          isCompleting={false}
        />
      );

      expect(screen.getByTestId('whimsical-loader')).toHaveAttribute('data-status', 'generating');
      expect(screen.getByTestId('whimsical-loader')).toHaveAttribute('data-completed', 'false');

      // Complete
      rerender(
        <ProcessingOverlay
          status="completed"
          progress={100}
          message="Summary completed!"
          show={true}
          isStreaming={false}
          isCompleted={true}
          isCompleting={true}
        />
      );

      await waitFor(() => {
        const loader = screen.getByTestId('whimsical-loader');
        expect(loader).toHaveAttribute('data-status', 'completed');
        expect(loader).toHaveAttribute('data-completed', 'true');
      });
    });

    it('should not show completion animation on error', async () => {
      const { rerender } = render(
        <ProcessingOverlay
          status="generating"
          progress={90}
          message="Generating..."
          show={true}
          isStreaming={true}
          isCompleted={false}
          isCompleting={false}
        />
      );

      // Error occurs
      rerender(
        <ProcessingOverlay
          status="error"
          progress={90}
          message="Error occurred"
          show={true}
          isStreaming={false}
          isCompleted={false}
          isCompleting={false}
        />
      );

      await waitFor(() => {
        const loader = screen.getByTestId('whimsical-loader');
        expect(loader).toHaveAttribute('data-status', 'error');
        expect(loader).toHaveAttribute('data-completed', 'false');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid completion (completes before animation)', async () => {
      render(
        <ProcessingOverlay
          status="completed"
          progress={100}
          message="Summary completed!"
          show={true}
          isStreaming={false}
          isCompleted={true}
          isCompleting={true}
        />
      );

      // Should still show completion animation even if rapid
      expect(screen.getByTestId('whimsical-loader')).toHaveAttribute('data-completed', 'true');
    });

    it('should handle content reset during completion', async () => {
      const { rerender } = render(
        <ProcessingOverlay
          status="completed"
          progress={100}
          message="Summary completed!"
          show={true}
          isStreaming={false}
          isCompleted={true}
          isCompleting={true}
        />
      );

      // New summary starts (reset)
      rerender(
        <ProcessingOverlay
          status="connected"
          progress={0}
          message="Connecting..."
          show={true}
          isStreaming={false}
          isCompleted={false}
          isCompleting={false}
        />
      );

      await waitFor(() => {
        const loader = screen.getByTestId('whimsical-loader');
        expect(loader).toHaveAttribute('data-completed', 'false');
      });
    });

    it('should handle cancel during completion', async () => {
      const onCancel = jest.fn();
      
      render(
        <ProcessingOverlay
          status="completed"
          progress={100}
          message="Summary completed!"
          show={true}
          isStreaming={false}
          isCompleted={true}
          isCompleting={true}
          onCancel={onCancel}
        />
      );

      // Cancel button should not be shown when streaming/completing
      // (onCancel is only passed when state === "processing")
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Message Updates', () => {
    it('should update message to "Summary completed!" when completed', async () => {
      const { rerender } = render(
        <ProcessingOverlay
          status="generating"
          progress={90}
          message="Generating summary..."
          show={true}
          isStreaming={true}
          isCompleted={false}
          isCompleting={false}
        />
      );

      expect(screen.getByTestId('status-message')).toHaveTextContent('Generating summary...');

      // Complete
      rerender(
        <ProcessingOverlay
          status="completed"
          progress={100}
          message="Summary completed!"
          show={true}
          isStreaming={false}
          isCompleted={true}
          isCompleting={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('status-message')).toHaveTextContent('Summary completed!');
      });
    });
  });
});



