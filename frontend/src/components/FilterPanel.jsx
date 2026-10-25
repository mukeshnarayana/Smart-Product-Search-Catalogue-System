import React, { useState, useEffect, useMemo } from 'react';
import { 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Check, 
  Star,
  AlertCircle
} from 'lucide-react';

export function FilterPanel({
  filterOptions = { categories: [], brands: [], priceRange: { min: 0, max: 0 } },
  selectedFilters,
  onToggleCategory,
  onToggleBrand,
  onPriceChange,
  onRatingChange,
  onInStockChange,
  onClearAll,
  onValidationChange,
  isMobileOpen = false,
  onCloseMobile,
}) {
  // Brand search input filter
  const [brandSearch, setBrandSearch] = useState('');

  // Local price input state for smooth typing & blur/debounce
  const [minPriceInput, setMinPriceInput] = useState(selectedFilters.minPrice ?? '');
  const [maxPriceInput, setMaxPriceInput] = useState(selectedFilters.maxPrice ?? '');
  const [priceError, setPriceError] = useState('');

  // Section collapse states
  const [openSections, setOpenSections] = useState({
    categories: true,
    brands: true,
    price: true,
    rating: true,
    stock: true,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Sync price inputs when external state resets (e.g. Clear All)
  useEffect(() => {
    setMinPriceInput(selectedFilters.minPrice ?? '');
  }, [selectedFilters.minPrice]);

  useEffect(() => {
    setMaxPriceInput(selectedFilters.maxPrice ?? '');
  }, [selectedFilters.maxPrice]);

  // Client-side validation: no negative prices, min <= max
  useEffect(() => {
    let error = '';

    const min = minPriceInput !== '' ? Number(minPriceInput) : null;
    const max = maxPriceInput !== '' ? Number(maxPriceInput) : null;

    if (min !== null && (isNaN(min) || min < 0)) {
      error = 'Minimum price cannot be negative';
    } else if (max !== null && (isNaN(max) || max < 0)) {
      error = 'Maximum price cannot be negative';
    } else if (min !== null && max !== null && min > max) {
      error = 'Min price cannot be greater than max price';
    }

    setPriceError(error);
    if (onValidationChange) {
      onValidationChange(Boolean(error));
    }

    if (!error) {
      // Debounce price update to URL / API
      const timer = setTimeout(() => {
        onPriceChange(minPriceInput, maxPriceInput);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [minPriceInput, maxPriceInput]);

  const handlePriceBlurOrEnter = () => {
    if (!priceError) {
      onPriceChange(minPriceInput, maxPriceInput);
    }
  };

  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return filterOptions.brands;
    const query = brandSearch.toLowerCase();
    return filterOptions.brands.filter((b) => b.toLowerCase().includes(query));
  }, [filterOptions.brands, brandSearch]);

  const hasActiveFilters =
    Boolean(selectedFilters.q) ||
    selectedFilters.category.length > 0 ||
    selectedFilters.brand.length > 0 ||
    selectedFilters.minPrice !== '' ||
    selectedFilters.maxPrice !== '' ||
    selectedFilters.minRating !== '' ||
    selectedFilters.inStock !== null;

  const content = (
    <aside className="w-full flex flex-col gap-6" aria-label="Filters">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
          <Filter className="w-5 h-5 text-brand-600" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors focus:outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* 1. Category Filter */}
      <div className="border-b border-slate-100 pb-5">
        <button
          type="button"
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between font-medium text-slate-800 text-sm hover:text-slate-900 focus:outline-none"
          aria-expanded={openSections.categories}
        >
          <span>Category</span>
          {openSections.categories ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.categories && (
          <div className="mt-3 flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
            {filterOptions.categories.map((cat) => {
              const isChecked = selectedFilters.category.includes(cat);
              return (
                <label
                  key={cat}
                  className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCategory(cat)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 transition-colors"
                  />
                  <span className={isChecked ? 'font-medium text-brand-700' : ''}>{cat}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Brand Filter with search */}
      <div className="border-b border-slate-100 pb-5">
        <button
          type="button"
          onClick={() => toggleSection('brands')}
          className="w-full flex items-center justify-between font-medium text-slate-800 text-sm hover:text-slate-900 focus:outline-none"
          aria-expanded={openSections.brands}
        >
          <span>Brand</span>
          {openSections.brands ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.brands && (
          <div className="mt-3 flex flex-col gap-2.5">
            {filterOptions.brands.length > 8 && (
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter brands..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredBrands.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No brands found</span>
              ) : (
                filteredBrands.map((brandName) => {
                  const isChecked = selectedFilters.brand.includes(brandName);
                  return (
                    <label
                      key={brandName}
                      className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleBrand(brandName)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 transition-colors"
                      />
                      <span className={isChecked ? 'font-medium text-brand-700' : ''}>{brandName}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Price Range Filter */}
      <div className="border-b border-slate-100 pb-5">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between font-medium text-slate-800 text-sm hover:text-slate-900 focus:outline-none"
          aria-expanded={openSections.price}
        >
          <span>Price Range (₹)</span>
          {openSections.price ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.price && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="min-price-input" className="sr-only">Minimum price</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400">₹</span>
                  <input
                    id="min-price-input"
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    onBlur={handlePriceBlurOrEnter}
                    onKeyDown={(e) => e.key === 'Enter' && handlePriceBlurOrEnter()}
                    className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <span className="text-slate-400 text-sm">–</span>

              <div className="flex-1">
                <label htmlFor="max-price-input" className="sr-only">Maximum price</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400">₹</span>
                  <input
                    id="max-price-input"
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    onBlur={handlePriceBlurOrEnter}
                    onKeyDown={(e) => e.key === 'Enter' && handlePriceBlurOrEnter()}
                    className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {priceError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1 font-medium" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{priceError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Minimum Rating Filter */}
      <div className="border-b border-slate-100 pb-5">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="w-full flex items-center justify-between font-medium text-slate-800 text-sm hover:text-slate-900 focus:outline-none"
          aria-expanded={openSections.rating}
        >
          <span>Minimum Rating</span>
          {openSections.rating ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.rating && (
          <div className="mt-3 flex flex-col gap-1.5">
            {[4, 3, 2, 1].map((ratingVal) => {
              const isSelected = Number(selectedFilters.minRating) === ratingVal;
              return (
                <button
                  key={ratingVal}
                  type="button"
                  onClick={() => onRatingChange(isSelected ? '' : ratingVal)}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors ${
                    isSelected
                      ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200/80'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs">& above</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. In-Stock Availability Toggle */}
      <div>
        <label className="flex items-center justify-between cursor-pointer select-none py-1">
          <span className="text-sm font-medium text-slate-800">In Stock Only</span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={selectedFilters.inStock === true}
              onChange={(e) => onInStockChange(e.target.checked ? true : null)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </div>
        </label>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 shrink-0 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-fit sticky top-24">
        {content}
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full p-6 overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                aria-label="Close filters drawer"
              >
                ✕
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

export default FilterPanel;
