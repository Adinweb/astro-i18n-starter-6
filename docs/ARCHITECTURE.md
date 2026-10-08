# Monorepo Project Architecture: Separated Backend & Frontend

This project adopts a clean, modular architecture that separates the **Frontend** presentation layer and the **Backend** business domain inside dedicated top-level directories in the same project repository.

---

## 1. Directory Structure

```text
├── frontend / presentation layer
│   ├── src/pages/              # Physical Astro routes & lean dispatcher ([...path].astro)
│   ├── src/views/              # Presentation views (PageView, BlogPostView, BlogIndexView)
│   ├── src/components/         # Reusable UI components (Icon, SearchModal, LanguageSwitcher)
│   ├── src/layouts/            # Layout shells (BaseLayout)
│   ├── src/content/            # Content collections (pages, blog)
│   ├── src/styles/             # Global Tailwind v4 CSS & prose typography
│   ├── src/i18n/               # Routing URL helpers, locale metadata, and path contracts
│   └── src/paraglide/          # Compile-time Paraglide i18n messages
│
├── backend / domain services layer
│   ├── backend/types/          # Strong TypeScript contracts & DTOs shared with frontend
│   ├── backend/services/       # Business logic (searchService, systemService, etc.)
│   └── backend/index.ts        # Unified backend entry point
│
├── shared / cross-cutting
│   ├── messages/               # Source locale dictionaries (en.json, de.json, fa.json, fr.json)
│   ├── scripts/                # Developer CLI suite (i18n automation, scaffolding, smoke tests)
│   └── docs/                   # PRD, Playbooks, and Architectural documentation
```

---

## 2. Separation of Concerns & Boundary Rules

1. **Frontend Isolation (`src/`):**
   - Renders UI, handles client transitions (`ClientRouter`), manages styling, and displays localized content.
   - Does **not** contain raw server business logic or database operations.
   - API calls from the frontend interact with backend services via typed contracts or standard API endpoints (`/api/*`).

2. **Backend Domain Isolation (`backend/`):**
   - Encapsulates domain logic, content indexing algorithms, data access layers, system monitoring, and external API integrations.
   - Uses dedicated TypeScript aliases (`@backend/*`).
   - Can be scaled or extracted into a standalone server (e.g. Node, Fastify, Express, or Serverless functions) with zero coupling to Astro's `.astro` view templates.

3. **Shared Contracts (`backend/types/index.ts`):**
   - Single source of truth for DTOs and API response envelopes (`ApiResponse`, `BackendHealthResponse`, `SearchIndexItem`).
   - Prevents drift between backend responses and frontend consumption.

4. **API Bridge (`src/pages/api/`):**
   - Thin HTTP dispatchers that connect Astro's server routes to `@backend` services.
   - Example: `src/pages/api/search-dev.json.ts` delegates directly to `SearchService.buildDevSearchIndex()`.
   - Example: `src/pages/api/health.json.ts` delegates directly to `SystemService.getHealthStatus()`.

---

## 3. Performance & SSG Guarantees

- **Zero SSR Bloat for Content:** Static pages and blog posts remain 100% pre-rendered (Pure SSG). Backend services are invoked at build-time or on-demand via lean API routes.
- **Search Optimization:** Production uses post-build Pagefind over `dist/` with `data-pagefind-body` scoping. Dev fallback uses `@backend/services/searchService` with client-side debouncing and race-condition guards.
- **RTL & Logical Properties:** Full bidirectional support (LTR and RTL) with pure CSS `:lang()` font stacks and mirrored navigation controls.
