import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle2, XCircle, Package, Hash, Calendar, Loader2 } from 'lucide-react';
import { fetchProductById } from '../api/productsApi';
import { formatPrice } from '../utils/formatPrice';

export function ProductDetailModal({ productId, onClose, initialData = null }) {
  const [product, setProduct] = useState(initialData);
  const [isLoading, setIsLoading] = useState(!initialData || !initialData.description);
  const [error, setError] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!productId) return;

    let isMounted = true;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    fetchProductById(productId, controller.signal)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted && err.name !== 'AbortError') {
          setError(err.message || 'Failed to load product details');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [productId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!productId) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center min-h-[360px] text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
            <p className="text-sm font-medium">Loading live product details...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center min-h-[280px] flex flex-col items-center justify-center">
            <XCircle className="w-10 h-10 text-rose-500 mb-3" />
            <h4 className="text-base font-semibold text-slate-900 mb-1">Could not load details</h4>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
            >
              Close
            </button>
          </div>
        ) : product ? (
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Image Gallery Column */}
            <div className="relative aspect-square bg-slate-50 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-slate-100">
              <img
                src={product.image_url || `https://placehold.co/500x500/e2e8f0/475569?text=${encodeURIComponent(product.name)}`}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-3 left-3">
                {product.in_stock ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>In Stock ({product.stock_quantity})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Out of Stock</span>
                  </span>
                )}
              </div>
            </div>

            {/* Information Column */}
            <div className="p-6 md:p-8 flex flex-col justify-between">
              <div>
                {/* Brand & Category Badges */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold tracking-wide uppercase">
                    {product.brand}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                    {product.category}
                  </span>
                </div>

                {/* Title */}
                <h3
                  id="modal-product-title"
                  className="text-xl font-bold text-slate-900 leading-snug mb-3"
                >
                  {product.name}
                </h3>

                {/* Rating & SKU Meta */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-1 font-semibold text-slate-800">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{Number(product.rating || 0).toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">/ 5.0</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-slate-400">
                    <Hash className="w-3.5 h-3.5" />
                    <span>{product.sku}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Description
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {product.description || 'High-performance electronic accessory built with premium materials for maximum durability and everyday reliability.'}
                  </p>
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Price</span>
                    <span className="text-2xl font-black text-slate-900">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                  {product.created_at && (
                    <div className="text-right text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(product.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!product.in_stock}
                    onClick={() => setAddedToCart(true)}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${
                      !product.in_stock
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : addedToCart
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-98 shadow-brand-500/20'
                    }`}
                  >
                    {addedToCart ? 'Added to Cart ✓' : product.in_stock ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ProductDetailModal;
