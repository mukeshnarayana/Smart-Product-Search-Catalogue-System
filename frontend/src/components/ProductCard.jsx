import React, { useState } from 'react';
import { Star, CheckCircle2, XCircle } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';

/**
 * Safely highlights matching keyword terms in text without using dangerouslySetInnerHTML.
 */
function HighlightedText({ text, query }) {
  if (!query || !query.trim() || !text) return <>{text}</>;

  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  // Escape special regex characters in search tokens
  const pattern = `(${tokens
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`;
  const regex = new RegExp(pattern, 'gi');

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function ProductCard({ product, searchQuery = '' }) {
  const [imageError, setImageError] = useState(false);

  const fallbackImage = `https://placehold.co/400x400/e2e8f0/475569?text=${encodeURIComponent(
    product.name.slice(0, 20)
  )}`;

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col h-full">
      {/* Product Image Container */}
      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
        <img
          src={imageError ? fallbackImage : product.image_url || fallbackImage}
          alt={product.name}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Stock Badge */}
        <div className="absolute top-3 left-3">
          {product.in_stock ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 backdrop-blur-md shadow-xs">
              <CheckCircle2 className="w-3 h-3" />
              <span>In Stock</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 backdrop-blur-md shadow-xs">
              <XCircle className="w-3 h-3" />
              <span>Out of Stock</span>
            </span>
          )}
        </div>

        {/* Category Pill */}
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/60 text-white backdrop-blur-md">
            {product.category}
          </span>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Brand & SKU */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-brand-600 tracking-wide uppercase">
              {product.brand}
            </span>
            <span className="font-mono text-slate-400 text-[11px]">
              {product.sku}
            </span>
          </div>

          {/* Product Name with Safe Keyword Highlighting */}
          <h3 className="font-semibold text-slate-900 text-sm md:text-base leading-snug line-clamp-2 title-match">
            <HighlightedText text={product.name} query={searchQuery} />
          </h3>
        </div>

        {/* Price and Rating */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Price</span>
            <span className="text-lg md:text-xl font-bold text-slate-900">
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Rating Stars */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-slate-800">
                {Number(product.rating || 0).toFixed(1)}
              </span>
            </div>
            {product.stock_quantity > 0 && (
              <span className="text-[11px] text-slate-400">
                {product.stock_quantity} available
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
