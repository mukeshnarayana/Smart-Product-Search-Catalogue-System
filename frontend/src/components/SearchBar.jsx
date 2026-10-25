import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * High-performance controlled SearchBar with local typing state,
 * debounced dispatch, Enter key immediate execution, and Escape key clear.
 */
export function SearchBar({ value = '', onSearch, isLoading = false }) {
  const [inputValue, setInputValue] = useState(value);
  const debounceTimerRef = useRef(null);

  // Sync internal state when external URL parameter changes (e.g. browser back/forward, clear all)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const commitSearch = (text) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const trimmed = text.slice(0, 100).trim();
    onSearch(trimmed);
  };

  const handleChange = (e) => {
    const nextVal = e.target.value;
    if (nextVal.length > 100) return;

    setInputValue(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      commitSearch(nextVal);
    }, 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitSearch(inputValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setInputValue('');
      commitSearch('');
    }
  };

  const handleClear = () => {
    setInputValue('');
    commitSearch('');
  };

  return (
    <div className="relative w-full max-w-3xl">
      <label htmlFor="catalog-search-input" className="sr-only">
        Search by name, brand, category or SKU
      </label>
      
      <div className="relative flex items-center">
        <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        <input
          id="catalog-search-input"
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, brand, category or SKU"
          maxLength={100}
          className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-base font-normal hover:border-slate-300"
          autoComplete="off"
          spellCheck="false"
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Clear search query"
            title="Clear search (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
