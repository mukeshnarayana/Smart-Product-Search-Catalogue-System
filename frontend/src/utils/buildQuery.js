/**
 * Builds a query string from filter state, omitting defaults and empty values.
 * @param {Object} state
 * @returns {string} Query string with leading '?' or empty string
 */
export function buildQuery(state = {}) {
  const params = new URLSearchParams();

  if (state.q && typeof state.q === 'string' && state.q.trim()) {
    params.set('q', state.q.trim());
  }

  if (Array.isArray(state.category) && state.category.length > 0) {
    params.set('category', state.category.filter(Boolean).join(','));
  }

  if (Array.isArray(state.brand) && state.brand.length > 0) {
    params.set('brand', state.brand.filter(Boolean).join(','));
  }

  if (state.minPrice !== undefined && state.minPrice !== null && state.minPrice !== '') {
    const num = Number(state.minPrice);
    if (!isNaN(num)) params.set('minPrice', String(num));
  }

  if (state.maxPrice !== undefined && state.maxPrice !== null && state.maxPrice !== '') {
    const num = Number(state.maxPrice);
    if (!isNaN(num)) params.set('maxPrice', String(num));
  }

  if (state.minRating !== undefined && state.minRating !== null && state.minRating !== '') {
    const num = Number(state.minRating);
    if (!isNaN(num)) params.set('minRating', String(num));
  }

  if (state.inStock === true || state.inStock === 'true') {
    params.set('inStock', 'true');
  } else if (state.inStock === false || state.inStock === 'false') {
    params.set('inStock', 'false');
  }

  if (state.sort && state.sort !== 'newest') {
    params.set('sort', state.sort);
  }

  if (state.page && Number(state.page) > 1) {
    params.set('page', String(state.page));
  }

  if (state.limit && Number(state.limit) !== 20) {
    params.set('limit', String(state.limit));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Parses URLSearchParams into typed state.
 * @param {URLSearchParams} searchParams
 * @returns {Object}
 */
export function parseQuery(searchParams) {
  const q = searchParams.get('q') || '';
  const categoryRaw = searchParams.get('category');
  const brandRaw = searchParams.get('brand');
  const minPriceRaw = searchParams.get('minPrice');
  const maxPriceRaw = searchParams.get('maxPrice');
  const minRatingRaw = searchParams.get('minRating');
  const inStockRaw = searchParams.get('inStock');
  const sort = searchParams.get('sort') || 'newest';
  const pageRaw = searchParams.get('page');
  const limitRaw = searchParams.get('limit');

  const category = categoryRaw
    ? categoryRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const brand = brandRaw
    ? brandRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const minPrice = minPriceRaw !== null && minPriceRaw !== '' ? Number(minPriceRaw) : '';
  const maxPrice = maxPriceRaw !== null && maxPriceRaw !== '' ? Number(maxPriceRaw) : '';
  const minRating = minRatingRaw !== null && minRatingRaw !== '' ? Number(minRatingRaw) : '';

  let inStock = null;
  if (inStockRaw === 'true') inStock = true;
  else if (inStockRaw === 'false') inStock = false;

  const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1;
  const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10) || 20) : 20;

  return {
    q,
    category,
    brand,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    sort,
    page,
    limit,
  };
}
