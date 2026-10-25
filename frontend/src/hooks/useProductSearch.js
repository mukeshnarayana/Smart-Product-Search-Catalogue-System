import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProducts } from '../api/productsApi';

/**
 * Core product catalog fetching hook with dual-layer race-condition protection:
 * 1. AbortController signal cancellation on param changes or unmount
 * 2. Monotonically increasing requestId ref validation (defence in depth)
 *
 * @param {Object} params Filter & pagination state
 * @param {boolean} [isBlocked=false] Flag to pause requests (e.g. client validation error)
 */
export function useProductSearch(params, isBlocked = false) {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monotonically increasing request ID counter
  const latestRequestIdRef = useRef(0);
  // Reference to current active AbortController
  const abortControllerRef = useRef(null);
  // Track retry count or triggers
  const [retryTrigger, setRetryTrigger] = useState(0);

  const retry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    // If blocked due to client-side validation errors (e.g. minPrice > maxPrice), do not fire!
    if (isBlocked) {
      setIsLoading(false);
      return;
    }

    // 1. Abort previous in-flight request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 2. Increment request ID for defence-in-depth stale response rejection
    latestRequestIdRef.current += 1;
    const currentRequestId = latestRequestIdRef.current;

    // 3. Create fresh AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    // Attach currentRequestId to params so backend can optionally echo it
    const queryWithId = {
      ...params,
      requestId: `req-${currentRequestId}`,
    };

    fetchProducts(queryWithId, controller.signal)
      .then((response) => {
        // Double-check: only apply if this is still the most recent request
        if (currentRequestId === latestRequestIdRef.current && !controller.signal.aborted) {
          setProducts(response.data);
          setPagination(response.pagination);
          setAppliedFilters(response.appliedFilters);
          setError(null);
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      })
      .catch((err) => {
        // Ignore aborted requests completely
        if (
          err.name === 'AbortError' ||
          controller.signal.aborted ||
          err.message?.includes('aborted')
        ) {
          return;
        }

        // Only set error if this is still the latest request
        if (currentRequestId === latestRequestIdRef.current) {
          setError(err);
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      });

    // Cleanup on parameter change or component unmount
    return () => {
      controller.abort();
    };
  }, [
    params.q,
    // JSON stringify arrays to prevent unnecessary refetches when reference changes but content matches
    JSON.stringify(params.category),
    JSON.stringify(params.brand),
    params.minPrice,
    params.maxPrice,
    params.minRating,
    params.inStock,
    params.sort,
    params.page,
    params.limit,
    isBlocked,
    retryTrigger,
  ]);

  return {
    products,
    pagination,
    appliedFilters,
    isLoading,
    isInitialLoading,
    error,
    retry,
  };
}
