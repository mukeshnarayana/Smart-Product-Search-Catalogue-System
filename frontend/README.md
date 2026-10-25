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
