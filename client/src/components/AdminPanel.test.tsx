
/**
 * Unit tests for AdminPanel component.
 * 
 * To run these tests, you need to install the following dependencies:
 * npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
 * 
 * Then run: npx vitest
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPanel from './AdminPanel';

// Mock fetch
global.fetch = vi.fn();

// Mock window.confirm
window.confirm = vi.fn(() => true);

const mockIcons = [
  { id: '1', name: 'Icon 1', mainCategory: 'icon', subCategory: 'food', tags: [] }
];

const mockCategories = [
  { _id: 'cat1', main: 'icon', sub: 'food' }
];

const mockProps = {
  icons: mockIcons,
  setIcons: vi.fn(),
  adminName: 'Admin',
  theme: 'light' as const,
  onToggleTheme: vi.fn(),
  onLogout: vi.fn(),
  onNavigate: vi.fn(),
  isAdmin: true,
  apiBaseUrl: 'http://localhost:4000',
  authToken: 'token',
  categories: [{ main: 'icon', subs: ['food'] }],
  rawCategories: mockCategories,
  onRefreshIcons: vi.fn(),
  onRefreshCategories: vi.fn(),
};

describe('AdminPanel Category Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  it('renders categories correctly', () => {
    render(<AdminPanel {...mockProps} />);
    // Switch to Categories tab
    fireEvent.click(screen.getByText('Categories'));
    expect(screen.getByText('food')).toBeInTheDocument();
  });

  it('adds a new category successfully', async () => {
    render(<AdminPanel {...mockProps} />);
    fireEvent.click(screen.getByText('Categories'));
    fireEvent.click(screen.getByText('Add Category'));

    const input = screen.getByPlaceholderText('e.g., Animals');
    fireEvent.change(input, { target: { value: 'Animals' } });
    
    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: 'newcat', main: 'icon', sub: 'Animals' }),
    });

    // Find the save button in modal. It says " Add Category" (with leading space)
    const saveBtn = screen.getByText(' Add Category', { selector: 'button' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockProps.onRefreshCategories).toHaveBeenCalled();
    });
  });

  it('handles empty category name error', async () => {
    render(<AdminPanel {...mockProps} />);
    fireEvent.click(screen.getByText('Categories'));
    fireEvent.click(screen.getByText('Add Category'));

    // Try to save with empty name
    const saveBtn = screen.getByText(' Add Category', { selector: 'button' });
    fireEvent.click(saveBtn);

    // Expect alert (mocked or just check fetch not called)
    // The component uses window.alert for empty name validation
    // Ideally we should mock alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Retrigger click
    fireEvent.click(saveBtn);
    
    expect(alertMock).toHaveBeenCalledWith('Please enter sub category name');
    expect(global.fetch).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('handles edit category', async () => {
    render(<AdminPanel {...mockProps} />);
    fireEvent.click(screen.getByText('Categories'));
    
    const editBtn = screen.getByTestId('edit-category-cat1');
    fireEvent.click(editBtn);

    const input = screen.getByPlaceholderText('e.g., Animals');
    expect(input).toHaveValue('food');
    
    fireEvent.change(input, { target: { value: 'updated-food' } });

    // Mock update response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: 'cat1', main: 'icon', sub: 'updated-food' }),
    });

    const saveBtn = screen.getByText(' Save Changes', { selector: 'button' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/categories/cat1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ main: 'icon', sub: 'updated-food' })
        })
      );
      expect(mockProps.onRefreshCategories).toHaveBeenCalled();
    });
  });

  it('handles delete category', async () => {
    render(<AdminPanel {...mockProps} />);
    fireEvent.click(screen.getByText('Categories'));
    
    const deleteBtn = screen.getByTestId('delete-category-cat1');
    
    // Mock delete response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Category deleted' }),
    });

    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/categories/cat1',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(mockProps.onRefreshCategories).toHaveBeenCalled();
    });
  });

  it('handles network failure during add', async () => {
    render(<AdminPanel {...mockProps} />);
    fireEvent.click(screen.getByText('Categories'));
    fireEvent.click(screen.getByText('Add Category'));

    const input = screen.getByPlaceholderText('e.g., Animals');
    fireEvent.change(input, { target: { value: 'Animals' } });
    
    // Mock failure
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const saveBtn = screen.getByText(' Add Category', { selector: 'button' });
    fireEvent.click(saveBtn);

    // Should show toast (we can't easily check toast state without more setup, but we check fetch was called)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    // Ensure onRefreshCategories NOT called if fetch fails (Wait, it throws)
    // But in catch block, it calls showToast.
    // Ideally we verify it didn't call onRefreshCategories if fetch threw before success?
    // In handleAddCategory:
    // try { await fetch ... if (!ok) throw ... await onRefreshCategories ... } catch ...
    // So onRefreshCategories is NOT called on error.
    expect(mockProps.onRefreshCategories).not.toHaveBeenCalled();
  });
});
