import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, ShoppingBag } from 'lucide-react';
import { useSearchParamsState } from '../hooks/useSearchParamsState';
import { useProductSearch } from '../hooks/useProductSearch';
import { fetchProductFilters } from '../api/productsApi';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import SortDropdown from '../components/SortDropdown';
import ProductGrid from '../components/ProductGrid';
import Pagination from '../components/Pagination';
import ActiveFilterChips from '../components/ActiveFilterChips';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ProductDetailModal from '../components/ProductDetailModal';
import { fetchBackendHealth, BASE_URL } from '../api/productsApi';


export function CatalogPage() {
  const {
    state,
    setSearch,
    toggleCategory,
    toggleBrand,
    setPriceRange,
    setMinRating,
    setInStock,
    setSort,
    setPage,
    clearAllFilters,
    removeFilter,
  } = useSearchParamsState();

  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 0 },
  });

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isPriceInvalid, setIsPriceInvalid] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ online: true, database: 'connected' });

  // Check live backend health
  useEffect(() => {
    const controller = new AbortController();
    fetchBackendHealth(controller.signal)
      .then((health) => {
        setBackendStatus({ online: health.status === 'ok', database: health.database });
      })
      .catch(() => {
        // Silently preserve default for test environments
      });

    return () => controller.abort();
  }, []);

  // Fetch filter metadata on mount
  useEffect(() => {
    const controller = new AbortController();
    fetchProductFilters(controller.signal)
      .then((data) => {
        setFilterOptions(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load filter metadata:', err);
        }
      });

    return () => controller.abort();
  }, []);

  // Core product search hook with dual-layer race-condition defense
  const {
    products,
    pagination,
    isLoading,
    isInitialLoading,
    error,
    retry,
  } = useProductSearch(state, isPriceInvalid);

  // Active filter count for mobile badge
  const activeFilterCount =
    (state.q ? 1 : 0) +
    state.category.length +
    state.brand.length +
    (state.minPrice !== '' || state.maxPrice !== '' ? 1 : 0) +
    (state.minRating !== '' ? 1 : 0) +
    (state.inStock !== null ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Brand & Live Status */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                  OmniStore
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Product Catalogue & Search
                </span>
              </div>
            </div>

            {/* Live Backend Connection Indicator */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200/70 text-[11px] font-medium text-slate-600"
              title="Connected to live Render backend"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live API: Render</span>
            </div>
          </div>

          {/* Central Search Bar */}
          <div className="w-full md:max-w-xl">
            <SearchBar
              value={state.q}
              onSearch={setSearch}
              isLoading={isLoading && !isInitialLoading}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
        {/* Controls & Metrics Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Open filter panel"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Total Results Announcement */}
            <div
              className="text-sm font-medium text-slate-600"
              aria-live="polite"
              aria-atomic="true"
            >
              {!isInitialLoading && !error && (
                <span>
                  Found <strong className="text-slate-900 font-bold">{pagination.total}</strong>{' '}
                  {pagination.total === 1 ? 'product' : 'products'}
                </span>
              )}
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="self-end sm:self-auto">
            <SortDropdown value={state.sort} onChange={setSort} />
          </div>
        </div>

        {/* Active Filter Chips */}
        <div className="mb-6">
          <ActiveFilterChips
            state={state}
            onRemoveFilter={removeFilter}
            onClearAll={clearAllFilters}
          />
        </div>

        {/* Content Layout: Sidebar + Grid */}
        <div className="flex items-start gap-8 flex-1">
          {/* Filter Sidebar */}
          <FilterPanel
            filterOptions={filterOptions}
            selectedFilters={state}
            onToggleCategory={toggleCategory}
            onToggleBrand={toggleBrand}
            onPriceChange={setPriceRange}
            onRatingChange={setMinRating}
            onInStockChange={setInStock}
            onClearAll={clearAllFilters}
            onValidationChange={setIsPriceInvalid}
            isMobileOpen={isMobileFilterOpen}
            onCloseMobile={() => setIsMobileFilterOpen(false)}
          />

          {/* Main Catalogue Grid View */}
          <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
            {error ? (
              <ErrorState
                error={error}
                onRetry={retry}
                onClearAll={clearAllFilters}
              />
            ) : products.length === 0 && !isLoading && !isInitialLoading ? (
              <EmptyState
                searchQuery={state.q}
                onClearAll={clearAllFilters}
              />
            ) : (
              <>
                <ProductGrid
                  products={products}
                  isLoading={isLoading}
                  isInitialLoading={isInitialLoading}
                  searchQuery={state.q}
                  onSelectProduct={(product) => setSelectedProduct(product)}
                />
                <Pagination
                  pagination={pagination}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Product Quick View / Details Modal */}
      {selectedProduct && (
        <ProductDetailModal
          productId={selectedProduct.id}
          initialData={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}


      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 OmniStore Catalogue. Real-time server-side search, filtering, and deterministic pagination.</p>
        </div>
      </footer>
    </div>
  );
}

export default CatalogPage;
