# OmniStore — E-Commerce Product Catalogue with Advanced Search

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B%20(pg__trgm)-blue.svg)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Swagger API Docs](https://img.shields.io/badge/Swagger-OpenAPI_3.0-85EA2D.svg)](http://localhost:3000/api-docs)
[![Tests Passing](https://img.shields.io/badge/Tests-74%20Passed-success.svg)](#testing-suites)

A production-grade, full-stack e-commerce product catalogue application engineered for **correctness, reliability, and sub-millisecond search performance**. 

All search, multi-faceted filtering, sorting, and pagination happen **100% on the server** powered by **PostgreSQL GIN trigram indexes (`pg_trgm`)**. The **React 18 frontend** is synchronized directly with URL search parameters, featuring real-time debounced search, two-tier race-condition protection, and localized Indian Rupee (`₹`) pricing.

---

## Architecture Overview

```
                         Browser Client (React 18 + Vite)
                                    │
                                    │ (useSearchParams State Sync)
                                    │ (Debounce 300ms + AbortController)
                                    ▼
                          Vite Proxy (:5173 -> :3000)
                                    │
                                    ▼
                     Express Backend Application (:3000)
  ┌─────────────────────────────────┴──────────────────────────────────┐
  │                                                                    │
  ▼                                                                    ▼
Swagger UI Docs (:3000/api-docs)                    Zod Input Validation (productQuery.schema.js)
                                                                       │
                                                                       ▼
                                                    Query Builder (productSearch.service.js)
                                                    - Multi-token whitespace parsing
                                                    - LIKE wildcard escaping (%, _, \)
                                                    - Parameterized CASE relevance ranking
                                                    - Deterministic tie-breaking (id ASC)
                                                                       │
                                                                       ▼
                                                    PostgreSQL (Neon Cloud / pg_trgm)
                                                    - GIN Trigram Indexes (Name, SKU, Brand...)
                                                    - Composite Index (category, price)
                                                    - B-Tree Indexes (Rating, In-Stock, Date)
```

---

## Tech Stack

### Backend
- **Runtime & Framework**: Node.js, Express.js
- **Database & ORM**: PostgreSQL (Neon Cloud DB), Sequelize ORM
- **Text Search Engine**: `pg_trgm` extension with GIN trigram indexing (`gin_trgm_ops`)
- **Validation**: Zod (strict coercion, boundary checking, and custom cross-field refinements)
- **API Documentation**: OpenAPI 3.0 / Swagger UI (`swagger-ui-express`, `yamljs`)
- **Testing**: Jest, Supertest
- **Security & Observability**: Helmet, CORS, Express-Rate-Limit (100 req/min), Morgan

### Frontend
- **Framework & Build**: React 18, Vite
- **Routing**: React Router v6 (`useSearchParams` synchronization)
- **Styling**: Tailwind CSS, Lucide React icons
- **Testing**: Vitest, React Testing Library, Mock Service Worker (MSW v2)
- **Currency & Localization**: Indian Rupee (`₹` / `INR`) with Indian numbering system (`en-IN`)

---

## Monorepo Project Structure

```
.
├── Backend/
│   ├── src/
│   │   ├── config/             # Database connection pool & environment loader
│   │   ├── models/             # Product Sequelize entity with CHECK constraints
│   │   ├── routes/             # Express API routes
│   │   ├── controllers/        # Request controllers
│   │   ├── services/           # Query builder, ranking, tie-breaking & filter cache
│   │   ├── validators/         # Zod schemas for query parameter validation
│   │   ├── middleware/         # Error handler, 404 handler, schema validation
│   │   ├── app.js              # Express app with Swagger UI and security middlewares
│   │   └── server.js           # Server bootstrap and graceful shutdown
│   ├── scripts/
│   │   ├── migrate.js          # pg_trgm extension, table sync, GIN and B-Tree indexes
│   │   └── seed.js             # 660+ deterministic products, fixtures, and tie clusters
│   ├── tests/                  # 61 Jest test cases (search, validation, SQL injection)
│   ├── swagger.yaml            # Complete OpenAPI 3.0 YAML specification
│   ├── .env.example            # Backend environment template
│   ├── .env                    # Active database connection string
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                # Products API client with AbortSignal support
│   │   ├── hooks/              # useProductSearch, useSearchParamsState, useDebouncedValue
│   │   ├── components/         # SearchBar, FilterPanel, ProductCard, Pagination, etc.
│   │   ├── pages/              # CatalogPage main layout
│   │   ├── utils/              # formatPrice (₹ INR), buildQuery
│   │   ├── tests/              # 13 Vitest tests (debounce, race-conditions, UI states)
│   │   ├── App.jsx             # Router root
│   │   ├── main.jsx            # React 18 root
│   │   └── index.css           # Tailwind directives & custom utilities
│   ├── index.html              # HTML shell with Google Fonts Inter
│   ├── vite.config.js          # Vite config with backend proxy and Vitest setup
│   ├── tailwind.config.js      # Custom theme & brand color configuration
│   └── package.json
│
├── .gitignore                  # Monorepo root gitignore
└── README.md                   # Overall project documentation
```

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js** v20.x or higher
- **npm** v10.x or higher
- **PostgreSQL** instance with `pg_trgm` extension support (already configured via Neon connection string in `.env`)

---

### 2. Backend Setup & Run

Open a terminal in the root directory:

```bash
# Navigate to Backend
cd Backend

# Install dependencies
npm install

# Run database migration (creates pg_trgm extension, tables, constraints & GIN indexes)
npm run db:migrate

# Seed 660+ realistic products (including known fixtures and tie clusters)
npm run db:seed

# Start backend server
npm start
```

The backend will start at **`http://localhost:3000`**.
- **Interactive Swagger Docs**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)
- **Products API**: [http://localhost:3000/api/products](http://localhost:3000/api/products)

---

### 3. Frontend Setup & Run

Open a second terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at **`http://localhost:5173`**.
Vite automatically proxies `/api` calls to the backend running at `http://localhost:3000`.

---

## Core Technical Features

### 1. Multi-Token Keyword Search & Literal Wildcard Escaping
- Search queries are split by whitespace into tokens.
- **Inside each token**: Matches across all 5 fields (`name`, `description`, `brand`, `category`, `sku`) with `OR`.
- **Across tokens**: Combined with `AND`, ensuring multi-word queries like `"wireless mouse"` strictly require both words to exist across the product's attributes.
- Wildcards (`%`, `_`, `\`) are escaped automatically so inputs like `"100%"` or `"_"` match literal characters.
- Accelerated by **PostgreSQL GIN trigram indexes (`gin_trgm_ops`)** for sub-millisecond substring lookup.

### 2. Dynamic Relevance Ranking
When a user searches without selecting an explicit sort order, results are dynamically ranked using a parameterized SQL `CASE` expression:
1. **Tier 1 (Highest)**: Exact SKU Match (`UPPER(sku) = UPPER(:q)`)
2. **Tier 2**: Product Name starts with query (`name ILIKE :startsWith`)
3. **Tier 3**: Product Name contains query (`name ILIKE :contains`)
4. **Tier 4**: Brand, category, or description matches

### 3. Stable Pagination & Deterministic Tie-Breaking
Standard SQL orderings on non-unique fields (e.g. 35 products with identical price `₹99.99`) lead to non-deterministic row sequences, causing duplicate items on subsequent pages.
- **Solution**: Every sort option strictly appends the primary key tiebreaker `id ASC` (`ORDER BY price ASC, id ASC`).
- Guarantees zero duplicate products across pages and zero missing items.

### 4. Two-Tier Outdated Response Protection (Frontend)
Prevents slow earlier network responses from overwriting faster newer responses during rapid typing:
1. **Tier 1 — `AbortController`**: Aborts active in-flight fetch requests when parameters change.
2. **Tier 2 — Monotonic `requestId` Counter**: Increments a numeric counter with each request; discards responses that do not match the latest request ID (defense-in-depth).

### 5. Client Pre-Flight Validation
- Real-time client-side validation detects negative prices or inverted boundaries (`minPrice > maxPrice`).
- Displays inline accessible alerts (`role="alert"`) and suspends API calls until corrected.

---

## API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server uptime and database connectivity check |
| `GET` | `/api-docs` | Interactive Swagger UI API documentation |
| `GET` | `/api-docs.yaml` | Raw OpenAPI 3.0 YAML specification |
| `GET` | `/api/products` | Multi-token search, facet filtering, sorting, and pagination |
| `GET` | `/api/products/filters` | Distinct categories, brands, and price range (cached 5 min) |
| `GET` | `/api/products/:id` | Full product details by UUID |

### `GET /api/products` Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | `string` | — | Search keyword (max 100 characters) |
| `category` | `string` | — | Single or comma-separated list of categories |
| `brand` | `string` | — | Single or comma-separated list of brands |
| `minPrice` | `number` | — | Minimum price (inclusive, >= 0) |
| `maxPrice` | `number` | — | Maximum price (inclusive, >= minPrice) |
| `minRating` | `number` | — | Minimum rating (0.0 to 5.0) |
| `inStock` | `boolean` | — | Filter by in-stock status (`true` / `false`) |
| `sort` | `enum` | `newest` | `newest`, `price_asc`, `price_desc`, `rating_desc`, `name_asc` |
| `page` | `integer` | `1` | 1-indexed page number |
| `limit` | `integer` | `20` | Page size (1 to 100) |
| `requestId` | `string` | — | Optional client tracking ID (echoed back in meta) |

---

## Testing Suites

The project features a total of **74 automated test cases**:

### Backend Tests (61 Jest Tests)
```bash
cd Backend
npm test
```
- **`search.test.js`**: Partial/full name matching, brand, category, exact SKU, case-insensitivity (`WIRELESS`/`wireless`), multi-token queries, combined filters, sort options, stable pagination with ties, clamping, in-memory cache, and index execution.
- **`validation.test.js`**: Boundary validation, negative price rejection, cross-field checks (`minPrice > maxPrice`), rating bounds (0–5), page/limit boundaries, and 404 handlers.
- **`injection.test.js`**: SQL injection attack defense (`' OR '1'='1`, `DROP TABLE`, `pg_sleep`) and literal escaping of `%`, `_`, and `\`.

### Frontend Tests (13 Vitest Tests)
```bash
cd frontend
npm test
```
- **`debounce.test.jsx`**: Verifies rapid typing triggers only 1 request after 300ms, Enter immediate trigger, and Escape key clear.
- **`outdatedResponses.test.jsx`**: Verifies race-condition defense (mock slow request A vs fast request B) and request abort signal cancellation.
- **`searchAndFilters.test.jsx`**: URL parameter hydration on load, filter changes resetting page to 1, page change preserving filters, clear-all-filters, pre-flight price validation, and pagination boundaries.
- **`uiStates.test.jsx`**: Skeleton cards loading state, empty state suggestions, and error state with retry.

---

## Environment Variables

### Backend (`Backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port for Express server |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `DATABASE_URL` | — | PostgreSQL connection URI with SSL mode |
| `TEST_DATABASE_URL` | — | Optional separate test database connection URI |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limiting window in milliseconds |
| `RATE_LIMIT_MAX` | `100` | Maximum requests per IP per window |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Target backend URL for API proxying |

---

## License
MIT License. Open for educational and commercial catalogue implementation.
#   S m a r t - P r o d u c t - S e a r c h - C a t a l o g u e - S y s t e m  
 