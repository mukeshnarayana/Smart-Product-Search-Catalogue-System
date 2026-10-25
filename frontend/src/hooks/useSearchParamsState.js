import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseQuery, buildQuery } from '../utils/buildQuery';

/**
 * Custom hook synchronizing filter state with React Router URL search params.
 * Enforces rule: Any filter/search/sort change resets page to 1.
 * Only changing the page maintains existing search criteria.
 */
export function useSearchParamsState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse current state from URL search parameters
  const state = useMemo(() => parseQuery(searchParams), [searchParams]);

  // Internal helper to update URL params
  const updateUrl = useCallback(
    (nextState, resetPage = true) => {
      const merged = {
        ...state,
        ...nextState,
        page: resetPage ? 1 : nextState.page !== undefined ? nextState.page : state.page,
      };

      const qs = buildQuery(merged);
      // Remove leading '?' for setSearchParams
      setSearchParams(new URLSearchParams(qs ? qs.slice(1) : ''), { replace: false });
    },
    [state, setSearchParams]
  );

  const setSearch = useCallback(
    (q) => {
      updateUrl({ q: q?.trim() || '' }, true);
    },
    [updateUrl]
  );

  const setCategory = useCallback(
    (categories) => {
      updateUrl({ category: categories }, true);
    },
    [updateUrl]
  );

  const toggleCategory = useCallback(
    (cat) => {
      const exists = state.category.includes(cat);
      const nextCategories = exists
        ? state.category.filter((c) => c !== cat)
        : [...state.category, cat];
      updateUrl({ category: nextCategories }, true);
    },
    [state.category, updateUrl]
  );

  const setBrand = useCallback(
    (brands) => {
      updateUrl({ brand: brands }, true);
    },
    [updateUrl]
  );

  const toggleBrand = useCallback(
    (brandName) => {
      const exists = state.brand.includes(brandName);
      const nextBrands = exists
        ? state.brand.filter((b) => b !== brandName)
        : [...state.brand, brandName];
      updateUrl({ brand: nextBrands }, true);
    },
    [state.brand, updateUrl]
  );

  const setPriceRange = useCallback(
    (minPrice, maxPrice) => {
      updateUrl({ minPrice, maxPrice }, true);
    },
    [updateUrl]
  );

  const setMinRating = useCallback(
    (minRating) => {
      updateUrl({ minRating }, true);
    },
    [updateUrl]
  );

  const setInStock = useCallback(
    (inStock) => {
      updateUrl({ inStock }, true);
    },
    [updateUrl]
  );

  const setSort = useCallback(
    (sort) => {
      updateUrl({ sort }, true);
    },
    [updateUrl]
  );

  const setPage = useCallback(
    (page) => {
      // Rule: changing page preserves all other search criteria!
      updateUrl({ page }, false);
    },
    [updateUrl]
  );

  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const removeFilter = useCallback(
    (type, value) => {
      switch (type) {
        case 'q':
          updateUrl({ q: '' }, true);
          break;
        case 'category':
          updateUrl({ category: state.category.filter((c) => c !== value) }, true);
          break;
        case 'brand':
          updateUrl({ brand: state.brand.filter((b) => b !== value) }, true);
          break;
        case 'price':
          updateUrl({ minPrice: '', maxPrice: '' }, true);
          break;
        case 'minRating':
          updateUrl({ minRating: '' }, true);
          break;
        case 'inStock':
          updateUrl({ inStock: null }, true);
          break;
        default:
          break;
      }
    },
    [state, updateUrl]
  );

  return {
    state,
    setSearch,
    setCategory,
    toggleCategory,
    setBrand,
    toggleBrand,
    setPriceRange,
    setMinRating,
    setInStock,
    setSort,
    setPage,
    clearAllFilters,
    removeFilter,
  };
}
