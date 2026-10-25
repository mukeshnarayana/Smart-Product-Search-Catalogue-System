# E-Commerce Product Catalogue Backend with Advanced Search

High-performance, production-grade backend service for an e-commerce product catalogue built with **Node.js**, **Express.js**, **PostgreSQL**, **Sequelize ORM**, and **Zod**.

Features an enterprise-grade search engine with **PostgreSQL GIN trigram indexing (`pg_trgm`)**, multi-token fuzzy search, literal wildcard escaping, relevance ranking, deterministic tie-breaking for stable pagination, in-memory filter caching, and comprehensive security protections.

---

## Architecture & Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js (v20+) | High-throughput asynchronous event-driven runtime |
| **Framework** | Express.js | Robust, modular HTTP application server |
| **Database** | PostgreSQL | Relational database with advanced indexing and text search capabilities |
| **ORM** | Sequelize | Type-safe models, connection pooling, and SQL injection prevention |
| **Text Search** | `pg_trgm` (GIN) | Sub-millisecond substring/fuzzy indexing across multi-column text |
| **Validation** | Zod | Runtime type coercion, strict query parameter validation, and clear error reporting |
| **Testing** | Jest + Supertest | Automated integration and regression test suite |
| **Security** | Helmet, CORS, Express-Rate-Limit | Enterprise protection against common web vulnerabilities and brute-force |
| **Logging** | Morgan | Structured HTTP request observability |

---

## Directory Structure

```
Backend/
├── src/
│   ├── config/
│   │   ├── db.js                   # Sequelize connection pool & SSL configuration
│   │   └── env.js                  # Environment variable schema & validation
│   ├── models/
│   │   ├── Product.js              # Product entity definition with CHECK constraints
│   │   └── index.js                # Database & model exports
│   ├── routes/
│   │   └── products.routes.js      # REST API route declarations
│   ├── controllers/
│   │   └── products.controller.js  # Controller handlers for HTTP endpoints
│   ├── services/
│   │   └── productSearch.service.js# Query builder, relevance ranking, tie-breaking, caching
│   ├── validators/
│   │   └── productQuery.schema.js  # Zod validation schema for query parameters
│   ├── middleware/
│   │   ├── errorHandler.js         # Centralized error handler (no SQL/stack leakage)
│   │   ├── notFound.js             # Standardized 404 handler
│   │   └── validate.js             # Schema validation middleware
│   ├── app.js                      # Express application setup
│   └── server.js                   # Server bootstrap & graceful shutdown listeners
├── scripts/
│   ├── migrate.js                  # Extensions, table sync, check constraints, GIN & B-tree indexes
│   └── seed.js                     # Deterministic generator (650+ items, fixtures, tie clusters)
├── tests/
│   ├── setup.js                    # Jest setup & database lifecycle hooks
│   ├── search.test.js              # Full-text, multi-token, filters, sorting & pagination tests
│   ├── validation.test.js          # Boundary checks, 400 validation error formatting tests
│   └── injection.test.js           # SQL injection attacks & wildcard escaping tests
├── .env.example                    # Environment template
├── .env                            # Active environment configuration
├── jest.config.js                  # Jest runner configuration
├── package.json                    # Project metadata & npm scripts
└── README.md                       # Comprehensive documentation
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** v20.x or higher
- **npm** v10.x or higher
- **PostgreSQL** instance with superuser or extension creation privileges (e.g. Neon, AWS RDS, or local PostgreSQL)

### 2. Environment Configuration
Copy the template and configure your connection string:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL= postgresql://username:password@localhost:5432/catalogue_db
TEST_DATABASE_URL= postgresql://username:password@localhost:5432/catalogue_test_db
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### 3. Database Migration
Run the migration script to enable PostgreSQL extensions, create the tables, apply CHECK constraints, and configure GIN trigram and B-Tree indexes:
```bash
npm run db:migrate
```

### 4. Database Seeding
Seed 650+ realistic and deterministic products (including known test fixtures and intentional tie-breaking clusters):
```bash
npm run db:seed
```

To wipe the database and reseed from scratch:
```bash
npm run db:reset
```

### 5. Running the Application
Start in development mode with auto-reload:
```bash
npm run dev
```

Or start standard production process:
```bash
npm start
```

### 6. Running Automated Tests
Run the complete automated test suite (61 tests covering search, validation, SQL injection prevention, and stable pagination):
```bash
npm test
```

---

## Indexing & Performance Strategy

### 1. PostgreSQL GIN Trigram (`pg_trgm`) Indexes
Standard B-Tree indexes only accelerate prefix queries (`name LIKE 'wire%'`) and cannot utilize indexes on substring matches (`name LIKE '%wire%'`) or multi-column keyword searches. 

We enable the PostgreSQL `pg_trgm` extension and create Generalized Inverted Index (GIN) trigram indexes:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_description_trgm ON products USING gin (description gin_trgm_ops);
CREATE INDEX idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops);
CREATE INDEX idx_products_category_trgm ON products USING gin (category gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);
```
- **Why `gin_trgm_ops`?** Trigrams break strings into 3-character slices. A GIN index maps trigrams directly to row pointers, enabling PostgreSQL to execute sub-millisecond index scans on arbitrary substring searches with `ILIKE %token%`.
- **Case-Insensitivity**: In PostgreSQL, `gin_trgm_ops` natively accelerates `ILIKE` without requiring `lower()` expression wrapping.

### 2. B-Tree Indexes for Filtering & Sorting
High-cardinality filters and sort columns are indexed with standard B-Trees:
- `idx_products_category ON products (category)`
- `idx_products_brand ON products (brand)`
- `idx_products_price ON products (price)`
- `idx_products_rating ON products (rating)`
- `idx_products_created_at ON products (created_at)`
- `idx_products_in_stock ON products (in_stock)`

### 3. Composite Index for Filter + Sort
For the most common e-commerce pattern (browsing a category sorted by price):
```sql
CREATE INDEX idx_products_category_price ON products (category, price);
```
Allows PostgreSQL to satisfy category filtering and price ordering in a single index scan without an expensive external disk/memory sort pass.

---

## Search Engine & Query Builder Design

All query generation is centralized in [`src/services/productSearch.service.js`](file:///c:/Users/mukes/OneDrive/Desktop/assignments/e-commerce%20product%20catalogue/Backend/src/services/productSearch.service.js).

### 1. Multi-Token Search
- User query `q` is split on whitespace into distinct tokens: `q.trim().split(/\s+/).filter(Boolean)`.
- **Within a token**: An `OR` condition checks across `name`, `description`, `brand`, `category`, and `sku`.
- **Across tokens**: All token conditions combine with `AND`.
- Result: Searching `"wireless mouse"` strictly matches products containing *both* "wireless" and "mouse", regardless of which attribute fields contain them.

### 2. Wildcard Escaping & SQL Injection Safety
User inputs containing SQL wildcards (`%`, `_`, `\`) are escaped so they match literal characters:
```javascript
function escapeLikeWildcards(str) {
  return str.replace(/[\\%_]/g, '\\$&');
}
```
- Querying `100%` matches `"100% Mechanical Gaming Keyboard"` without `%` matching all characters.
- Querying `_` matches `"Ultra_Speed USB-C Hub"` without `_` acting as a single-character wildcard.
- Search patterns are passed to Sequelize `Op.iLike` as bound parameters (`$1`, `$2`), never through string concatenation.

### 3. Relevance Ranking
When keyword `q` is supplied and no explicit sort is chosen by the client, results are ranked dynamically using a parameterized `CASE` expression:
1. Exact SKU match (`UPPER(sku) = UPPER(:exactQ)`) $\rightarrow$ Rank 1
2. Name starts with (`name ILIKE :startsWithQ`) $\rightarrow$ Rank 2
3. Name contains (`name ILIKE :containsQ`) $\rightarrow$ Rank 3
4. Other matches $\rightarrow$ Rank 4
Followed by `created_at DESC` and the unique `id ASC` tiebreaker.

### 4. Deterministic Tie-Breaking (Stable Pagination)
Without a unique tiebreaker, SQL database engines do not guarantee a deterministic row order when sorting by non-unique fields (e.g. 50 products priced at $99.99). This causes duplicate rows across pages and missing items.

Every sort order in this application is strictly guaranteed a total deterministic ordering by appending the primary key tiebreaker:
- `price_asc`: `ORDER BY price ASC, id ASC`
- `price_desc`: `ORDER BY price DESC, id ASC`
- `rating_desc`: `ORDER BY rating DESC, id ASC`
- `newest`: `ORDER BY created_at DESC, id ASC`
- `name_asc`: `ORDER BY lower(name) ASC, id ASC`

### 5. Clamped Pagination & Parallel Execution
- `Product.count()` and `Product.findAll()` are executed simultaneously via `Promise.all` using the identical `where` clause.
- If a client requests `page > totalPages`, the API gracefully clamps the response: returning HTTP 200 with `data: []` and accurate pagination metadata (instead of throwing an error).

### 6. Filter Cache
`GET /api/products/filters` computes distinct categories, distinct brands, and global min/max price. Results are cached in-memory with a 5-minute TTL to prevent redundant table scans.

---

## API Reference & Examples

### Base URL: `http://localhost:3000`

---

### 1. Health Check
Checks server uptime and database connectivity.

- **Endpoint**: `GET /health`
- **Curl**:
  ```bash
  curl -X GET http://localhost:3000/health
  ```
- **Response** (`200 OK`):
  ```json
  {
    "status": "ok",
    "uptime": 45.2,
    "timestamp": "2026-10-25T04:10:00.000Z",
    "database": "connected"
  }
  ```

---

### 2. Search & Filter Products
Search products with multi-token keyword search, facet filters, sorting, and pagination.

- **Endpoint**: `GET /api/products`
- **Query Parameters**:
  | Param | Type | Default | Description |
  |---|---|---|---|
  | `q` | `string` | — | Search query (trimmed, max 100 characters) |
  | `category` | `string` | — | Single category or comma-separated list (`Accessories,Gaming`) |
  | `brand` | `string` | — | Single brand or comma-separated list (`Logitech,Corsair`) |
  | `minPrice` | `number` | — | Minimum price (inclusive, >= 0) |
  | `maxPrice` | `number` | — | Maximum price (inclusive, >= minPrice) |
  | `minRating` | `number` | — | Minimum rating (0.0 to 5.0) |
  | `inStock` | `boolean` | — | Stock status (`true` or `false`) |
  | `sort` | `enum` | `newest` | `price_asc`, `price_desc`, `rating_desc`, `newest`, `name_asc` |
  | `page` | `integer` | `1` | Page number (>= 1) |
  | `limit` | `integer` | `20` | Items per page (1 to 100) |

- **Curl Example (Keyword Search)**:
  ```bash
  curl -X GET "http://localhost:3000/api/products?q=wireless+mouse"
  ```

- **Curl Example (Multi-Filter & Sort)**:
  ```bash
  curl -X GET "http://localhost:3000/api/products?category=Accessories,Gaming&minPrice=20&maxPrice=150&minRating=4.0&inStock=true&sort=price_asc&page=1&limit=10"
  ```

- **Response** (`200 OK`):
  ```json
  {
    "data": [
      {
        "id": "90629f69-16f7-4e09-a859-648bf0cd42f4",
        "sku": "TEST-0001",
        "name": "Wireless Mouse Pro",
        "brand": "Logitech",
        "category": "Accessories",
        "price": 49.99,
        "rating": 4.8,
        "in_stock": true,
        "stock_quantity": 75,
        "image_url": "https://picsum.photos/seed/TEST-0001/400/400",
        "created_at": "2024-01-10T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "appliedFilters": {
      "q": "wireless mouse",
      "category": ["Accessories", "Gaming"],
      "brand": null,
      "minPrice": 20,
      "maxPrice": 150,
      "minRating": 4.0,
      "inStock": true,
      "sort": "price_asc"
    }
  }
  ```

---

### 3. Filter Options Aggregation
Returns distinct categories, brands, and global min/max price for populating user interface filters. Caches in memory for 5 minutes.

- **Endpoint**: `GET /api/products/filters`
- **Curl**:
  ```bash
  curl -X GET http://localhost:3000/api/products/filters
  ```
- **Response** (`200 OK`):
  ```json
  {
    "data": {
      "categories": [
        "Accessories",
        "Audio",
        "Cameras",
        "Computers",
        "Electronics",
        "Gaming",
        "Home Appliances",
        "Networking",
        "Office Electronics",
        "Smart Home",
        "Smartphones",
        "Wearables"
      ],
      "brands": [
        "Anker",
        "Apple",
        "Asus",
        "Bose",
        "Corsair",
        "Logitech",
        "O'Reilly & Sons",
        "Sony"
      ],
      "priceRange": {
        "min": 6.91,
        "max": 4986.5
      }
    }
  }
  ```

---

### 4. Get Product By ID
Retrieves full product details including complete description.

- **Endpoint**: `GET /api/products/:id`
- **Curl**:
  ```bash
  curl -X GET http://localhost:3000/api/products/90629f69-16f7-4e09-a859-648bf0cd42f4
  ```
- **Response** (`200 OK`):
  ```json
  {
    "data": {
      "id": "90629f69-16f7-4e09-a859-648bf0cd42f4",
      "sku": "TEST-0001",
      "name": "Wireless Mouse Pro",
      "description": "Ergonomic wireless optical mouse with ultra precision sensor and rechargeable battery.",
      "brand": "Logitech",
      "category": "Accessories",
      "price": 49.99,
      "rating": 4.8,
      "in_stock": true,
      "stock_quantity": 75,
      "image_url": "https://picsum.photos/seed/TEST-0001/400/400",
      "created_at": "2024-01-10T10:00:00.000Z",
      "updated_at": "2024-01-10T10:00:00.000Z"
    }
  }
  ```
- **Product Not Found Response** (`404 Not Found`):
  ```json
  {
    "error": {
      "code": "PRODUCT_NOT_FOUND",
      "message": "Product with id '00000000-0000-0000-0000-000000000000' not found"
    }
  }
  ```

---

### 5. Error & Validation Format
Invalid parameters reject with HTTP 400 and detailed field-level issues:

- **Curl Example**:
  ```bash
  curl -X GET "http://localhost:3000/api/products?minPrice=100&maxPrice=50&minRating=7"
  ```
- **Response** (`400 Bad Request`):
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid query parameters provided",
      "details": [
        {
          "field": "minRating",
          "message": "minRating must be less than or equal to 5"
        },
        {
          "field": "minPrice",
          "message": "minPrice cannot be greater than maxPrice"
        },
        {
          "field": "maxPrice",
          "message": "maxPrice must be greater than or equal to minPrice"
        }
      ]
    }
  }
  ```

---

## Security Hardening
1. **SQL Injection**: All input parameters are strictly bound into parameterized SQL statements via Sequelize. No string concatenation is used in queries. Unsafe inputs like `'; DROP TABLE products;--` are treated as literal text.
2. **Strict Validation**: Zod coerces and sanitizes incoming types. Non-numeric values for numeric filters fail before database execution.
3. **HTTP Rate Limiting**: Defaults to 100 requests per 1 minute window per client IP.
4. **Helmet & CORS**: Sets modern HTTP security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, HSTS) and limits cross-origin access.
5. **Safe Error Handling**: Never leaks database column names, raw queries, or stack traces in responses.

---

## Testing Verification
The test suite consists of 61 comprehensive automated tests across three suites:
1. `tests/search.test.js`: Validates partial/full name match, brand, category, SKU, case-insensitivity, multi-token AND/OR queries, filter intersections, sorting, stable pagination with ties, clamping, in-memory cache, and index execution.
2. `tests/validation.test.js`: Validates price bounds, cross-field price consistency, ratings (0-5), sort enum values, pagination limits, 404 route handling, and error shapes.
3. `tests/injection.test.js`: Stresses the query builder against SQL injection payloads (`' OR '1'='1`, `DROP TABLE`, `pg_sleep`) across all parameters and verifies literal treatment of `%`, `_`, and `\`.

Run tests anytime with:
```bash
npm test
```






# E-Commerce Product Catalogue Frontend

High-performance, accessible, and reliable React 18 e-commerce product catalogue built with **Vite**, **React Router**, and **Tailwind CSS**.

Consumes the backend REST API (`/api/products` and `/api/products/filters`) with **100% server-side search, filtering, sorting, and pagination**.

---

## Key Features

- **State Lives in the URL**: Full synchronization with `useSearchParams`. Refreshing, bookmarking, and browser back/forward history restore the exact search criteria and pagination.
- **Search Bar UX**: Local controlled input for instant typing feedback, debounced by 300ms, with `<Enter>` key immediate search and `<Esc>` key clear.
- **Multi-Faceted Filtering**: Dynamic categories, brand search, validated min/max price range, minimum rating, and in-stock toggle populated from `/api/products/filters`.
- **Pre-Flight Client Validation**: Rejects negative prices and inverted price boundaries (`min > max`) inline before firing network requests.
- **Two-Tier Outdated Response Defense**: Combines `AbortController` in-flight cancellation with monotonic `requestId` ref verification to eliminate race conditions.
- **Fluid UI States**: Skeleton loading cards on first load, dimmed overlay during subsequent page loads to avoid layout jumps, comprehensive error recovery with retry, and empty states.
- **Safe Keyword Highlighting**: Multi-token search term highlighting in product titles without `dangerouslySetInnerHTML`.
- **Automated Test Coverage**: Vitest, React Testing Library, and Mock Service Worker (MSW) test suites.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + Vite |
| **Routing** | React Router v6 (`useSearchParams`) |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |
| **Testing** | Vitest + React Testing Library + MSW v2 (Mock Service Worker) |

---

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── productsApi.js          # REST client with AbortSignal & ApiError mapping
│   ├── hooks/
│   │   ├── useDebouncedValue.js    # Generic value debounce hook
│   │   ├── useProductSearch.js     # Core data-fetching hook with race-condition defense
│   │   └── useSearchParamsState.js # URL searchParams state synchronization
│   ├── components/
│   │   ├── SearchBar.jsx           # Controlled search bar with debounce & hotkeys
│   │   ├── FilterPanel.jsx         # Multi-faceted filter panel with client validation
│   │   ├── SortDropdown.jsx        # Sort options dropdown synced to URL
│   │   ├── ProductGrid.jsx         # Grid container with transition dimming
│   │   ├── ProductCard.jsx         # Product card with lazy images & safe highlight
│   │   ├── Pagination.jsx          # Server pagination with ellipses & count metrics
│   │   ├── ActiveFilterChips.jsx   # Removable filter tags & reset-all button
│   │   ├── LoadingSkeleton.jsx     # Pulse skeleton placeholders
│   │   ├── EmptyState.jsx          # Friendly empty search results view
│   │   └── ErrorState.jsx          # Error display with validation breakdown & retry
│   ├── pages/
│   │   └── CatalogPage.jsx         # Main catalogue layout & orchestration
│   ├── utils/
│   │   ├── formatPrice.js          # Currency formatter utility
│   │   └── buildQuery.js           # Query builder & URL parser
│   ├── tests/
│   │   ├── setup.js                # MSW server & testing setup
│   │   ├── mocks/handlers.js       # MSW network mock definitions
│   │   ├── debounce.test.jsx       # Debounce & hotkey unit tests
│   │   ├── outdatedResponses.test.jsx # Fast vs slow race condition tests
│   │   ├── searchAndFilters.test.jsx  # URL hydration, reset-to-page-1, boundary tests
│   │   └── uiStates.test.jsx       # Skeleton, error, and empty state tests
│   ├── App.jsx                     # Root application with router
│   ├── main.jsx                    # React 18 entry point with StrictMode
│   └── index.css                   # Tailwind CSS root directives & utilities
├── index.html                      # HTML root template with Inter font
├── vite.config.js                  # Vite configuration & dev proxy
├── tailwind.config.js              # Custom Tailwind configuration
├── postcss.config.js               # PostCSS configuration
└── package.json                    # Project dependencies & scripts
```

---

## Setup & Running Locally

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment & Dev Proxy
The frontend proxies all `/api` requests to the Node.js backend. In [`vite.config.js`](file:///c:/Users/mukes/OneDrive/Desktop/assignments/e-commerce%20product%20catalogue/frontend/vite.config.js):
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
  },
});
```

Create `.env` (optional, defaults to `http://localhost:3000`):
```env
VITE_API_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Ensure the backend server is running on port 3000 (`npm start` or `npm run dev` in `Backend/`).

### 4. Run Automated Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

---

## Architectural Deep Dive

### 1. Two-Tier Outdated Response Defense
In asynchronous search interfaces, rapid keystrokes or fast filter changes can cause **out-of-order race conditions** where a slow earlier request (e.g., query `lap`) resolves *after* a fast later request (e.g., query `laptop`), causing the UI to display stale results.

This application protects against this using two independent layers of defense in [`src/hooks/useProductSearch.js`](file:///c:/Users/mukes/OneDrive/Desktop/assignments/e-commerce%20product%20catalogue/frontend/src/hooks/useProductSearch.js):

1. **Tier 1 — `AbortController` Signal**:
   Before initiating a new fetch, the active `AbortController` from the previous request is immediately aborted via `controller.abort()`. Handlers gracefully swallow `AbortError`, preventing unneeded network traffic from completing.
2. **Tier 2 — Monotonic `requestId` Ref Verification (Defense-in-Depth)**:
   In environments where HTTP/2 or server buffering does not terminate aborted connections immediately, a ref `latestRequestIdRef` increments with each request (`req-1`, `req-2`, etc.). When a response resolves, the hook checks:
   ```javascript
   if (currentRequestId === latestRequestIdRef.current && !controller.signal.aborted) {
     setProducts(response.data);
     // Apply state updates
   }
   ```
   If a response resolves from an older request ID, it is discarded silently.

### 2. URL as Single Source of Truth
Filter state is managed through [`src/hooks/useSearchParamsState.js`](file:///c:/Users/mukes/OneDrive/Desktop/assignments/e-commerce%20product%20catalogue/frontend/src/hooks/useSearchParamsState.js):
- **Rule 1**: Modifying any search query `q`, category, brand, price, rating, in-stock, or sort option automatically resets `page` to 1.
- **Rule 2**: Changing the page preserves all active search queries and filters intact.
- **Rule 3**: Default parameter values (`page=1`, `limit=20`, `sort=newest`) are omitted from the URL query string to keep URLs clean and readable.

### 3. Pre-Flight Client-Side Validation
In [`src/components/FilterPanel.jsx`](file:///c:/Users/mukes/OneDrive/Desktop/assignments/e-commerce%20product%20catalogue/frontend/src/components/FilterPanel.jsx):
- When a user inputs negative prices or sets `minPrice > maxPrice`, inline errors are displayed immediately (`role="alert"`).
- `onValidationChange(hasError)` informs `useProductSearch`, which halts API requests until the user corrects the range, avoiding unnecessary 400 errors from the server.

### 4. Layout Stability & Fluid UX
- **First Load**: Renders `<LoadingSkeleton count={8} />` placeholder cards.
- **Subsequent Updates (Filtering & Pagination)**: Rather than unmounting the grid and causing jarring layout shifts, previous results remain mounted with a subtle dimming opacity (`opacity-60`) and a top indeterminate progress bar until the new page arrives.
- **Accessible Announcements**: Total product count changes are announced to screen readers using `aria-live="polite"`.
