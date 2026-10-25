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
DATABASE_URL=postgresql://neondb_owner:npg_KL4bjetdPs6z@ep-ancient-cherry-b59ojfhc-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
TEST_DATABASE_URL=
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
