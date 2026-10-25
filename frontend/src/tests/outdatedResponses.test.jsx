import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { server } from './setup';
import { useProductSearch } from '../hooks/useProductSearch';

describe('Protection Against Outdated Responses & Request Aborting', () => {
  it('shows results from latest fast request B even if earlier request A resolves last (race-condition protection)', async () => {
    // Setup: Request A (q=slow) takes 300ms, Request B (q=fast) takes 30ms
    server.use(
      http.get('/api/products', async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get('q');

        if (q === 'slow') {
          await delay(250);
          return HttpResponse.json({
            data: [{ id: 'slow-1', name: 'Slow Result A', sku: 'SLOW-1', price: 10 }],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          });
        }

        if (q === 'fast') {
          await delay(20);
          return HttpResponse.json({
            data: [{ id: 'fast-1', name: 'Fast Result B', sku: 'FAST-1', price: 20 }],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          });
        }

        return HttpResponse.json({ data: [], pagination: { total: 0 } });
      })
    );

    const { result, rerender } = renderHook(
      ({ params }) => useProductSearch(params),
      {
        initialProps: { params: { q: 'slow' } },
      }
    );

    // Rapidly change query to 'fast' before request 'slow' resolves
    rerender({ params: { q: 'fast' } });

    // Wait until loading finishes
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert that the UI displays Result B (fast), never overwritten by Result A (slow)
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('Fast Result B');

    // Wait past the duration of the slow request to ensure it didn't overwrite
    await new Promise((res) => setTimeout(res, 300));
    expect(result.current.products[0].name).toBe('Fast Result B');
  });

  it('aborts the previous in-flight request signal when parameters change', async () => {
    let firstSignal = null;
    let requestCount = 0;

    server.use(
      http.get('/api/products', async ({ request }) => {
        requestCount++;
        if (requestCount === 1) {
          firstSignal = request.signal;
          await delay(300);
        }
        return HttpResponse.json({ data: [], pagination: { total: 0 } });
      })
    );

    const { rerender } = renderHook(
      ({ params }) => useProductSearch(params),
      {
        initialProps: { params: { q: 'initial' } },
      }
    );

    // Wait for initial request to start
    await waitFor(() => {
      expect(firstSignal).not.toBeNull();
    });

    expect(firstSignal.aborted).toBe(false);

    // Change parameter while first is in-flight
    rerender({ params: { q: 'updated' } });

    // First request's signal must now be aborted
    await waitFor(() => {
      expect(firstSignal.aborted).toBe(true);
    });
  });
});
