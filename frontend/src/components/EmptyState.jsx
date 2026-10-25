import React from 'react';
import { PackageSearch, RotateCcw } from 'lucide-react';

export function EmptyState({ searchQuery = '', onClearAll }) {
  return (
    <div
      className="w-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center my-6"
      role="region"
      aria-label="No results found"
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4 shadow-xs">
        <PackageSearch className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-1">
        {searchQuery ? `No products found for "${searchQuery}"` : 'No matching products'}
      </h3>

      <p className="text-sm text-slate-500 max-w-md mb-6">
        We couldn't find any products matching your current search or filter combination.
        Try checking for spelling errors, loosening price bounds, or clearing filters.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Clear all filters</span>
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
        <span className="font-semibold text-slate-500">Search tips:</span> Verify product SKU format (e.g. TEST-0001), try general keywords like "mouse" or "gaming", or toggle "In Stock Only".
      </div>
    </div>
  );
}

export default EmptyState;
