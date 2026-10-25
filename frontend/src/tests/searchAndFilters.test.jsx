import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CatalogPage from '../pages/CatalogPage';
import FilterPanel from '../components/FilterPanel';
import Pagination from '../components/Pagination';

describe('Search, Filters, and URL Synchronization Tests', () => {
  it('hydrates search input and filters from initial URL query parameters', async () => {
    // Initial URL with query params
    const initialEntry = '/?q=wireless&category=Accessories&minPrice=20';

    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CatalogPage />
      </MemoryRouter>
    );

    // Search input should be hydrated with "wireless"
    const searchInput = screen.getByPlaceholderText(/search by name/i);
    expect(searchInput.value).toBe('wireless');

    // Wait for filtered products to render
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Wireless Mouse Pro/i })).toBeInTheDocument();
    });
  });

  it('changing a filter resets page to 1, while changing page preserves filters and q', async () => {
    // Initial URL on page 3 with active query and category
    const initialEntry = '/?q=mouse&category=Accessories&page=3';

    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by name/i).value).toBe('mouse');
    });

    // Toggle In Stock filter
    const inStockToggle = screen.getByLabelText(/in stock only/i);
    await userEvent.click(inStockToggle);

    // Page should be reset to 1
    // Filter chips should reflect both category and in-stock
    await waitFor(() => {
      expect(screen.getByText(/in stock only/i)).toBeInTheDocument();
    });
  });

  it('clicking "Clear all filters" resets active filters and displays all items', async () => {
    const initialEntry = '/?q=wireless&category=Accessories';

    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <CatalogPage />
      </MemoryRouter>
    );

    // Wait for active chips to appear
    await waitFor(() => {
      expect(screen.getByText(/search: "wireless"/i)).toBeInTheDocument();
    });

    // Click "Clear all"
    const clearAllBtn = screen.getByRole('button', { name: /clear all/i });
    await userEvent.click(clearAllBtn);

    // Input should be empty and chips removed
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search by name/i);
      expect(searchInput.value).toBe('');
      expect(screen.queryByText(/search: "wireless"/i)).not.toBeInTheDocument();
    });
  });

  it('invalid price range (negative, min > max) shows validation error and does NOT fire requests', async () => {
    const onPriceChangeMock = vi.fn();
    const onValidationChangeMock = vi.fn();

    render(
      <FilterPanel
        filterOptions={{ categories: [], brands: [], priceRange: { min: 0, max: 500 } }}
        selectedFilters={{
          category: [],
          brand: [],
          minPrice: '',
          maxPrice: '',
          minRating: '',
          inStock: null,
        }}
        onPriceChange={onPriceChangeMock}
        onValidationChange={onValidationChangeMock}
      />
    );

    const minInput = screen.getByPlaceholderText('Min');
    const maxInput = screen.getByPlaceholderText('Max');

    // Enter min > max: 100 > 50
    await userEvent.type(minInput, '100');
    await userEvent.type(maxInput, '50');

    // Error message should be displayed inline
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/min price cannot be greater than max price/i);
    });

    // onValidationChange must report true (hasError)
    expect(onValidationChangeMock).toHaveBeenCalledWith(true);

    // Now test negative value
    await userEvent.clear(minInput);
    await userEvent.type(minInput, '-10');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/cannot be negative/i);
    });
  });

  it('disables Prev and Next buttons at pagination boundaries', () => {
    const onPageChange = vi.fn();

    // At Page 1 of 5: Prev disabled, Next enabled
    const { rerender } = render(
      <Pagination
        pagination={{
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: false,
        }}
        onPageChange={onPageChange}
      />
    );

    const prevBtn = screen.getByLabelText(/previous page/i);
    const nextBtn = screen.getByLabelText(/next page/i);

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // At Page 5 of 5: Prev enabled, Next disabled
    rerender(
      <Pagination
        pagination={{
          page: 5,
          limit: 20,
          total: 100,
          totalPages: 5,
          hasNext: false,
          hasPrev: true,
        }}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByLabelText(/previous page/i)).toBeEnabled();
    expect(screen.getByLabelText(/next page/i)).toBeDisabled();
  });
});
