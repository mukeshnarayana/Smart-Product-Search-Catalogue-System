import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

describe('UI States Test Suite', () => {
  it('renders LoadingSkeleton placeholders during load', () => {
    render(<LoadingSkeleton count={4} />);
    const statusRegion = screen.getByRole('status', { name: /loading products/i });
    expect(statusRegion).toBeInTheDocument();
  });

  it('renders EmptyState with query text and clear filters trigger', async () => {
    const onClearAllMock = vi.fn();
    render(<EmptyState searchQuery="unknown gadget" onClearAll={onClearAllMock} />);

    expect(screen.getByText(/no products found for "unknown gadget"/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /clear all filters/i });
    await userEvent.click(clearBtn);

    expect(onClearAllMock).toHaveBeenCalledTimes(1);
  });

  it('renders ErrorState with validation details and triggers retry', async () => {
    const onRetryMock = vi.fn();
    const error = {
      message: 'Invalid query parameters provided',
      code: 'VALIDATION_ERROR',
      details: [
        { field: 'minPrice', message: 'minPrice must be greater than or equal to 0' },
      ],
    };

    render(<ErrorState error={error} onRetry={onRetryMock} />);

    expect(screen.getByText(/invalid search query/i)).toBeInTheDocument();
    expect(screen.getByText(/minPrice:/i)).toBeInTheDocument();
    expect(screen.getByText(/minPrice must be greater than or equal to 0/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    await userEvent.click(retryBtn);

    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });
});
