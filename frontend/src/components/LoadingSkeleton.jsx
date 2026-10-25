import React from 'react';

export function LoadingSkeleton({ count = 8 }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 w-full"
      role="status"
      aria-label="Loading products"
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs animate-pulse flex flex-col"
        >
          {/* Image skeleton */}
          <div className="aspect-square w-full bg-slate-200/80" />

          {/* Details skeleton */}
          <div className="p-4 flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
              <div className="h-3 bg-slate-200 rounded w-16" />
              <div className="h-3 bg-slate-100 rounded w-12" />
            </div>

            <div className="space-y-1.5">
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
              <div className="h-6 bg-slate-200 rounded w-20" />
              <div className="h-4 bg-slate-200 rounded w-10" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading products...</span>
    </div>
  );
}

export default LoadingSkeleton;
