import React from 'react';
import ProductCard from './ProductCard';
import LoadingSkeleton from './LoadingSkeleton';

export function ProductGrid({
  products = [],
  isLoading = false,
  isInitialLoading = false,
  searchQuery = '',
}) {
  if (isInitialLoading) {
    return <LoadingSkeleton count={8} />;
  }

  return (
    <div className="relative w-full">
      {/* Subtle top loading indicator bar during subsequent page/filter updates */}
      {isLoading && (
        <div className="absolute -top-3 left-0 right-0 h-1 bg-brand-100 overflow-hidden rounded-full z-10">
          <div className="h-full bg-brand-600 animate-pulse w-full" />
        </div>
      )}

      {/* Grid container with subtle dimming to prevent layout shifts while keeping current results readable */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity duration-200 ${
          isLoading ? 'opacity-60 cursor-wait' : 'opacity-100'
        }`}
        aria-busy={isLoading}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
}

export default ProductGrid;
