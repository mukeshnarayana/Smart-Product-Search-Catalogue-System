import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Generates an array of page numbers and ellipsis tokens.
 */
function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items = [];

  // Always show first page
  items.push(1);

  if (currentPage > 3) {
    items.push('...');
  }

  // Window around current page
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    items.push(i);
  }

  if (currentPage < totalPages - 2) {
    items.push('...');
  }

  // Always show last page
  items.push(totalPages);

  return items;
}

export function Pagination({ pagination, onPageChange }) {
  const { page, limit, total, totalPages, hasNext, hasPrev } = pagination;

  if (total === 0 || totalPages <= 1) {
    return null;
  }

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const handlePageClick = (p) => {
    if (p !== page && p >= 1 && p <= totalPages) {
      onPageChange(p);
      // Scroll to top of catalog smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const pages = getPaginationItems(page, totalPages);

  return (
    <nav
      className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-slate-200 mt-8 w-full"
      aria-label="Catalogue pagination"
    >
      {/* Result Count Info */}
      <div className="text-sm text-slate-500 font-medium">
        Showing <span className="text-slate-900 font-semibold">{startItem}</span>–
        <span className="text-slate-900 font-semibold">{endItem}</span> of{' '}
        <span className="text-slate-900 font-semibold">{total}</span> results
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => handlePageClick(page - 1)}
          disabled={!hasPrev || page <= 1}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numbered Page Buttons & Ellipsis */}
        <div className="flex items-center gap-1">
          {pages.map((item, index) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-slate-400 font-medium select-none"
                >
                  …
                </span>
              );
            }

            const isCurrent = item === page;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handlePageClick(item)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`min-w-9 h-9 px-3 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  isCurrent
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => handlePageClick(page + 1)}
          disabled={!hasNext || page >= totalPages}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
