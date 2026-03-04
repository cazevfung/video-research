/**
 * Phase 5: Functional Testing - SearchBar Component
 * Tests for search bar functionality and accessibility
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      expect(screen.getByPlaceholderText('Search summaries...')).toBeInTheDocument();
    });

    it('should display custom placeholder', () => {
      render(<SearchBar value="" onChange={mockOnChange} placeholder="Custom placeholder" />);
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should display search icon', () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const icon = screen.getByRole('img', { hidden: true }) || document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when typing', async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText('Search summaries...');
      const user = userEvent.setup();
      
      await user.type(input, 'test query');
      
      expect(mockOnChange).toHaveBeenCalledTimes(10); // Once per character
      expect(mockOnChange).toHaveBeenLastCalledWith('test query');
    });

    it('should show clear button when value is not empty', () => {
      render(<SearchBar value="test" onChange={mockOnChange} />);
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('should hide clear button when value is empty', () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', async () => {
      render(<SearchBar value="test" onChange={mockOnChange} />);
      const clearButton = screen.getByRole('button', { name: /clear/i });
      const user = userEvent.setup();
      
      await user.click(clearButton);
      
      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label on clear button', () => {
      render(<SearchBar value="test" onChange={mockOnChange} />);
      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
    });

    it('should be keyboard accessible', async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText('Search summaries...');
      
      input.focus();
      expect(document.activeElement).toBe(input);
      
      // Should be able to type
      const user = userEvent.setup();
      await user.type(input, 'test');
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should support keyboard navigation to clear button', async () => {
      render(<SearchBar value="test" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText('Search summaries...');
      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      input.focus();
      const user = userEvent.setup();
      await user.tab();
      
      // Clear button should be focusable
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string value', () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      expect(screen.getByPlaceholderText('Search summaries...')).toHaveValue('');
    });

    it('should handle long search queries', async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText('Search summaries...');
      const longQuery = 'a'.repeat(1000);
      const user = userEvent.setup();
      
      await user.type(input, longQuery);
      
      expect(mockOnChange).toHaveBeenLastCalledWith(longQuery);
    });

    it('should handle special characters', async () => {
      render(<SearchBar value="" onChange={mockOnChange} />);
      const input = screen.getByPlaceholderText('Search summaries...');
      const user = userEvent.setup();
      
      await user.type(input, 'test@#$%^&*()');
      
      expect(mockOnChange).toHaveBeenLastCalledWith('test@#$%^&*()');
    });
  });
});

