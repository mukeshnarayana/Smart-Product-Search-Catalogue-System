import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { formatPrice } from '../utils/formatPrice';

export function ActiveFilterChips({ state, onRemoveFilter, onClearAll }) {
  const chips = [];

  if (state.q) {
    chips.push({
      id: 'q',
      label: `Search: "${state.q}"`,
      type: 'q',
      value: state.q,
    });
  }

  if (Array.isArray(state.category)) {
    state.category.forEach((cat) => {
      chips.push({
        id: `cat-${cat}`,
        label: `Category: ${cat}`,
        type: 'category',
        value: cat,
      });
    });
  }

  if (Array.isArray(state.brand)) {
    state.brand.forEach((b) => {
      chips.push({
        id: `brand-${b}`,
        label: `Brand: ${b}`,
        type: 'brand',
        value: b,
      });
    });
  }

  const hasMinPrice = state.minPrice !== '' && state.minPrice !== undefined && state.minPrice !== null;
  const hasMaxPrice = state.maxPrice !== '' && state.maxPrice !== undefined && state.maxPrice !== null;

  if (hasMinPrice && hasMaxPrice) {
    chips.push({
      id: 'price',
      label: `${formatPrice(state.minPrice)} – ${formatPrice(state.maxPrice)}`,
      type: 'price',
      value: 'range',
    });
  } else if (hasMinPrice) {
    chips.push({
      id: 'price',
      label: `Min: ${formatPrice(state.minPrice)}`,
      type: 'price',
      value: 'min',
    });
  } else if (hasMaxPrice) {
    chips.push({
      id: 'price',
      label: `Max: ${formatPrice(state.maxPrice)}`,
      type: 'price',
      value: 'max',
    });
  }

  if (state.minRating !== '' && state.minRating !== undefined && state.minRating !== null) {
    chips.push({
      id: 'minRating',
      label: `Rating: ${state.minRating}+ ★`,
      type: 'minRating',
      value: state.minRating,
    });
  }

  if (state.inStock === true) {
    chips.push({
      id: 'inStock',
      label: 'In Stock Only',
      type: 'inStock',
      value: true,
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
        Active Filters:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200/60 shadow-xs hover:bg-brand-100 transition-colors"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(chip.type, chip.value)}
            className="hover:bg-brand-200 p-0.5 rounded-full transition-colors focus:outline-none"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1 focus:outline-none"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Clear all</span>
      </button>
    </div>
  );
}

export default ActiveFilterChips;
