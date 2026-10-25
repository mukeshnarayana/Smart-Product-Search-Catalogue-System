import { buildQuery } from '../utils/buildQuery';

export class ApiError extends Error {
  constructor(message, status, code, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_BASE = '/api/products';

/**
 * Fetches products from the backend REST API with AbortSignal support.
 * @param {Object} params Filter, search, and pagination parameters
 * @param {AbortSignal} [signal] Optional AbortSignal for request cancellation
 * @returns {Promise<{data: Array, pagination: Object, appliedFilters: Object, meta: Object}>}
 */
export async function fetchProducts(params = {}, signal = undefined) {
  const queryString = buildQuery(params);
  const url = `${API_BASE}${queryString}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch (e) {
      // Non-JSON error body fallback
    }

    const errorPayload = errorData?.error || {};
    const message = errorPayload.message || `Request failed with status ${response.status}`;
    const code = errorPayload.code || 'HTTP_ERROR';
    const details = errorPayload.details || [];

    throw new ApiError(message, response.status, code, details);
  }

  const result = await response.json();
  return {
    data: result.data || [],
    pagination: result.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    appliedFilters: result.appliedFilters || {},
    meta: result.meta || {},
  };
}

/**
 * Fetches filter metadata (categories, brands, priceRange) with caching support.
 * @param {AbortSignal} [signal]
 * @returns {Promise<{categories: string[], brands: string[], priceRange: {min: number, max: number}}>}
 */
export async function fetchProductFilters(signal = undefined) {
  const url = `${API_BASE}/filters`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch (e) {}
    throw new ApiError(
      errorData?.error?.message || 'Failed to load filter metadata',
      response.status,
      errorData?.error?.code || 'FILTER_METADATA_ERROR'
    );
  }

  const result = await response.json();
  const filterData = result.data || result;

  return {
    categories: Array.isArray(filterData.categories) ? filterData.categories : [],
    brands: Array.isArray(filterData.brands) ? filterData.brands : [],
    priceRange: filterData.priceRange || { min: 0, max: 0 },
  };
}

/**
 * Fetches a single product by ID.
 * @param {string} id
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export async function fetchProductById(id, signal = undefined) {
  const url = `${API_BASE}/${id}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch (e) {}
    throw new ApiError(
      errorData?.error?.message || `Product ${id} not found`,
      response.status,
      errorData?.error?.code || 'NOT_FOUND'
    );
  }

  const result = await response.json();
  return result.data || result;
}
