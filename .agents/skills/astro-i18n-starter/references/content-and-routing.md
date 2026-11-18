# Content Pipeline, Routing & Blog Architecture Reference

This reference documents the content layer schemas, URL manipulation engine, lean routing dispatcher, blog engine, pagination math, feeds, and SEO endpoints for the Astro v7 starter.

---

## 1. Symmetrical Content Layer (`src/content.config.ts`)

Every collection (static pages, blog articles, and any registry-driven type such as projects) uses the Astro Content Layer with the folder-per-entry convention:
```text
src/content/{collection}/{group}/{locale}.mdx
```

### 1.1 Collections & Schemas
* **`pages`**: General site pages (`home`, `about`, `features`, `pricing`) with flexible layout controls:
  - `hero`: `'none' | 'minimal' | 'default' | boolean` (defaults to `'none'` — no forced hero banner).
  - `container`: `'canvas' | 'contained' | 'prose'` (defaults to `'canvas'` — unconstrained `<main>` canvas; `'contained'` uses `.layout-container` (`1280px`) + `.prose-wide`; `'prose'` uses a `72ch` editorial column. Named `container` so it never collides with `@astrojs/mdx`'s reserved `layout` import property).
  - `flushTop`: `boolean` (defaults to `false`; removes header top padding when `hero: 'none'` so custom full-bleed heroes sit under the floating glass header).
  - `template`: optional key mapped in `client/templates/index.ts` (`CLIENT_PAGE_TEMPLATES`) or core `src/views/PageView.astro` to render a shared bespoke `.astro` page template across all locales while sourcing localized copy/SEO from MDX.
* **`blog`**: Chronological articles requiring `publishedAt` and a non-empty `slug`, rendered uniformly through `BlogPostView.astro` (taxonomy, TOC, related posts, feed).
* **`projects`**: Case studies/portfolio entries on top of `baseSchema` plus `client`, `year`, `link` and `stack`, rendered through the generic `CollectionEntryView.astro`. Whether it is routed, listed, linked or fed is decided by its `content.types` entry, not by the schema. (Additional client-specific collections can be exported inside `clientCollections` in `client/content.ts` and are automatically spread into `src/content.config.ts`.)
* **Group Identity**: The directory name `{group}` is the universal entity identity shared across all locales.
* **Featured Image**: Specified as a relative path (`./<group>.png`). Astro's `image()` helper resolves the reference at build time, checks file existence, and provides ready-to-use `ImageMetadata` (used for `og:image` social cards and optional `hero: 'default'` banners). A broken path fails the build immediately.

### 1.2 Full-Bleed Page Composition (`container: 'canvas'`)

`pages` are deliberately not template-bound — unlike `blog` posts, which always render through `BlogPostView.astro` + `PageHero.astro`. In canvas mode `BaseLayout.astro` renders the MDX body **directly inside `<main>`** (no `.layout-container`, no `.prose`), so a page may stack any full-viewport bands:

```mdx
---
title: "Custom Landing"
slug: "custom-landing"
hero: "none"            # no built-in hero band
container: "canvas"
flushTop: true          # first band sits under the floating glass header
---

import { Image } from 'astro:assets';
import PageSection from '@/components/PageSection.astro';
import hero from '../../../assets/hero/hero-0.jpg';

<section class="relative isolate flex min-h-[70vh] items-end overflow-hidden">
  <Image src={hero} alt="" widths={[640, 1280, 1920]} sizes="100vw"
    class="absolute inset-0 -z-10 h-full w-full object-cover" />
  <div class="layout-container py-16"><h1>…</h1></div>
</section>

<PageSection surface="surface" spacing="lg" bleed>
  <div class="layout-container grid gap-6 sm:grid-cols-3">…</div>
</PageSection>
```

* `PageSection` renders a `w-full` band with `surface` / `spacing` / `border-*` props and wraps children in `.layout-container` unless `bleed` is set.
* **22 Composable Corporate, Landing & UI Blocks (PrebuiltUI-Adapted)** live in `src/components/`: 19 section blocks (`LandingHeroSplit`, `PromoBanner`, `PartnerLogos`, `AboutSplitSection`, `BentoCapabilities`, `FeatureTabsSection`, `ProcessSteps`, `FeatureCardGrid`, `ProofStatsRow`, `ComparisonTable`, `PricingSection`, `TestimonialGrid`, `ImageGallerySection`, `LatestPostsSection`, `TeamSection`, `FaqAccordion` + `src/libs/content/faq.ts`, `ContactSplitSection`, `NewsletterBanner`, `CtaBanner`) and 3 UI primitives (`UiBadge`, `UiAlert`, `AvatarGroup`), sharing `SectionHeader.astro`, `src/libs/ui/locale.ts`, and `src/libs/ui/initials.ts`. All use semantic OKLCH tokens, CSS logical properties, `<Icon>`, `<Button>`, Paraglide localized defaults (`locale` auto-detects from URL), and ChronoTrig attributes. Pass `contained` on section blocks when nesting them inside a `container: 'contained'` page (`pricing/*.mdx`, etc.) so they skip a redundant `<PageSection>` wrapper.
* Reuse `.layout-container` (1280px) inside a band for aligned content; omit it for true edge-to-edge media.
* For repeatable bespoke client layouts shared by every locale without touching upstream core, create `client/templates/<Name>.astro` and register it in `CLIENT_PAGE_TEMPLATES` inside `client/templates/index.ts` (`src/views/PageView.astro` merges `CLIENT_PAGE_TEMPLATES` over core templates), then set `template: '<name>'` in frontmatter. The template receives `entry`, `locale`, `alternates`, `url`, and `schema`.
* A canvas page must bring its own bottom spacing (`.layout-container`'s `pb-12 md:pb-16` only applies to contained pages) and must render **exactly one `<h1>`**.

### 1.3 Zod Validation Rules
* **Slugs (`slugSchema`)**: Supports Unicode letters, digits, combining marks, hyphens, and zero-width joiners (`\u200C`, `\u200D`). Empty slug is permitted **only** for the `home` page.
* **Taxonomy Keys (`taxonomyKey`)**: Lowercase ASCII with single hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). Human-readable display labels come from Paraglide message keys (`blog_category_<key>`, `blog_tag_<key>`).

---

## 2. URL Construction & Invariants (`src/i18n/paths.ts`)

Never hardcode paths with locale prefixes in templates or logic. Always use pure URL helpers:

| Function | Signature | Purpose & Example |
| :--- | :--- | :--- |
| `localizeHref` | `(pathname: string, targetLocale: Locale) => string` | Prepends non-default locale prefix and canonical trailing slash (`/about` + `fa` → `/fa/about/`; `/about` + `en` → `/about/`). |
| `localeHref` | `(currentPath: string, targetLocale: Locale, alternates?: Record<Locale, string>) => string` | Uses page-specific alternate slug if provided, else adapts current path to target locale. |
| `stripLocale` | `(pathname: string) => { locale: Locale; pathname: string }` | Extracts locale from path prefix and returns root-relative pathname. |
| `getPathname` | `(urlOrPath: string) => string` | Strips origin, query, and hash; removes trailing slash (except root `/`). |
| `withTrailingSlash` | `(pathname: string) => string` | Guarantees a single canonical trailing slash on HTML URLs. |

---

## 3. Lean Router Dispatcher (`src/pages/[...path].astro`)

Physical dynamic routes are consolidated into a single dispatcher file (`src/pages/[...path].astro`):
* `getStaticPaths()` calls `getSiteRoutes()` from `src/libs/content/service.ts`.
* Delegates rendering to dedicated views based on `routeType`:
  - `routeType === 'page'` → `<PageView entry={entry} locale={locale} ... />`
  - `routeType === 'blog-entry'` → `<BlogPostView entry={entry} locale={locale} ... />`
  - `routeType === 'blog-index'` → `<BlogIndexView locale={locale} ... />`
  - `routeType === 'collection-index'` → `<CollectionIndexView contentType={...} page={page} totalPages={...} perPage={...} />`
  - `routeType === 'collection-entry'` → `<CollectionEntryView contentType={...} entry={entry} />`
* **Route Collision Guard**: `buildSiteRoutes()` detects and throws fatal build errors on duplicate canonical URLs.
* **Language Switcher Safety**: Locales with fewer posts fall back to their last available paginated page in the `alternates` map, preventing 404 links during language switching.

---

## 4. Blog Engine, Pagination & Taxonomy

### 4.1 Pagination Engine (`src/libs/content/pagination.ts`)
* **Page Size**: `POSTS_PER_PAGE` defined in `app.config.json` (`blog.postsPerPage`).
* **Page URLs**: Generated by `getBlogPageHref(page, locale)`:
  - Page 1 → `/blog/` (prefix-less in default locale) or `/fa/blog/`.
  - Page 2+ → `/blog/page/2/` or `/fa/blog/page/2/`.
* **Pure Helpers**:
  - `paginate(items, page, perPage)`: Clamps page into range `1..totalPages` and slices posts.
  - `buildPageWindow(page, totalPages)`: Generates visible page numbers with `PAGE_GAP` (`…`).

### 4.2 Reading Time & Related Posts (`src/libs/content/blog.ts`)
* **Reading Time**: Calculated with `getReadingTime(body)` and localized via ICU plural message `m.blog_read_time({ count })`.
* **Related Posts**: Scored based on shared categories (+2 points) and shared tags (+1 point); sorted by score and recency.
* **Table of Contents (TOC)**: Auto-extracted from `h2` and `h3` headings when at least 2 headings exist. Sticky on desktop, collapsible on mobile.

---

## 5. Feeds, Sitemap & SEO Endpoints

* **Atom 1.0 Feeds (`src/libs/content/feed.ts`)**:
  - `/rss.xml`: Atom feed for default locale (`en`).
  - `/rss/[locale].xml`: Per-locale Atom feeds (`/rss/fa.xml`, `/rss/de.xml`, etc.).
  - Emits `xml:lang`, per-locale alternates, and localized category taxonomy.
* **Multi-lingual Sitemap (`src/pages/sitemap.xml.ts`)**:
  - Emits `<xhtml:link rel="alternate" hreflang="..." />` for all language versions + `x-default`.
  - Computes `lastmod` accurately from the latest modified/published date of each entry.
* **Web App Manifest (`src/pages/site.webmanifest.ts`)**:
  - Generated dynamically using `app.config.json` brand colors and `DEFAULT_LOCALE` metadata.
* **Dynamic Branded Open Graph Cards (`src/pages/og/[...slug].png.ts` & `src/libs/content/og-card.ts`)**:
  - `src/libs/content/social.ts` (`getSocialCard`) switches behavior based on `brand.socialCardMode`: `'branded'` (shipped `app.config.json` default — `renderBrandedOgSvg()` generates deterministic `1200×630` RTL/LTR SVG→PNG cards matching the active brand palette and page title via `sharp`, setting explicit `direction="rtl" unicode-bidi="embed"` and `text-anchor="start"` anchored on the right edge for Persian/Arabic cursive shaping), `'artwork'` (cropped `entry.data.image`), or `'default'` (`/og-default.png`).
* **Corporate & LocalBusiness Structured Data (`src/libs/content/schema.ts`)**:
  - `buildOrganizationSchema()`, `buildServiceSchema()`, and `collectSocialProfiles()` build Schema.org JSON-LD (`Organization`, `LocalBusiness`, `ProfessionalService`, `MedicalBusiness`, `Store`, `Service`) from `app.config.json` → `business` + `social`, injected automatically by `BaseLayout.astro`.
* **Git-Based Editing (`.pages.yml`)**: Pre-configured Pages CMS schema mapping `pages`, `blog`, and `projects` collections plus media uploads.
* **Static Blog & Search Fallback Catalogs (`src/pages/api/*.json.ts`)**:
  - `/api/blog-posts/[locale].json` (plus combined `/api/blog-posts.json`): Build-time static JSON catalogs powering client-side cross-page taxonomy filtering on multi-page blogs.
  - `/api/search-dev/[locale].json` (plus combined `/api/search-dev.json`): Emits title, description, URL, and locale for every published route as a dev/offline search fallback.

---

## 6. Search Engine (Persian-Aware Pagefind) & Pure SSG External APIs

### 6.1 Build-Time Pagefind Indexer (`scripts/index-pagefind.mjs`)
* Invoked automatically at the end of `npm run build`.
* Scans `dist/**/*.html` in memory via the Pagefind Node API (`createIndex`) **without mutating `dist/*.html` on disk**.
* For Perso-Arabic pages (`<html lang="fa|ar|...">`), normalizes Arabic character variants (`ي`/`ى` → `ی`, `ك` → `ک`), strips tatweel & optional harakat, and pads Perso-Arabic punctuation (`«`, `»`, `،`, `؛`, `؟`, `٪`, `٬`) with Unicode hair spaces (`\u200A`) outside `<script>/<style>/<pre>/<code>/<svg>` and HTML tags so Pagefind's Rust tokenizer indexes clean word stems without polluting excerpts.

### 6.2 Client Search & Persian Query Expansion (`src/libs/search/`)
* `src/libs/search/persian.ts` normalizes queries (`normalizePersianQuery`), reconstructs productive Persian ZWNJ (`\u200C`) compounds (`applyPersianZwnjCompounds`: e.g. `صفحه بندی` → `صفحه‌بندی`, `راست به چپ` → `راست‌به‌چپ`), generates up to 4 prioritized query variants (`buildSearchQueryVariants` covering ZWNJ/space forms, `ارایه` ↔ `ارائه` hamza variants, and `۰-۹` ↔ `0-9` numerals), and provides ZWNJ-agnostic fallback matching (`matchesFallbackSearch`).
* `src/libs/search/client.ts` (`executeSearch`) queries `/pagefind/pagefind.js` in production across all generated query variants concurrently (deduplicating by handle ID and canonical URL), strips `\u200A` from excerpts via `plainText()`, and falls back cleanly to `/api/search-dev/<locale>.json` in development.

### 6.3 Pure SSG External & Serverless API Adapter (`src/libs/api/client.ts`)
* This starter is **100% static SSG with zero backend**. Never add SSR routes or backend server directories.
* Interactive forms (`src/components/ContactForm.astro` and `src/components/NewsletterBanner.astro`) post JSON payloads directly from the browser through `submitContactInquiry()` and `submitNewsletterSubscription()` in `src/libs/api/client.ts` (helpers: `FormProvider`, `resolveFormEndpoint()`, `resolveApiEndpoint()`, `getInvalidContactFields()`, `validateContactPayload()`, `validateNewsletterPayload()`).
* Supported providers (`api.provider`): `'custom' | 'web3forms' | 'formspree' | 'basin' | 'webhook'`. When `provider === 'web3forms'` and `api.accessKey` / `PUBLIC_WEB3FORMS_KEY` is provided, `resolveFormEndpoint()` automatically targets `https://api.web3forms.com/submit`. Endpoints also resolve from `PUBLIC_CONTACT_API_URL`, `PUBLIC_NEWSLETTER_API_URL`, `PUBLIC_API_BASE_URL`, or `app.config.json` (`api.baseUrl` + `api.endpoints.contact|newsletter`, plus optional `api.topics`). Optional Cloudflare Turnstile verification (`api.turnstileSiteKey` or `PUBLIC_TURNSTILE_SITE_KEY`) works alongside `AbortController` timeout protection and honeypot spam filtering.
* `ContactSplitSection.astro` consumes `BUSINESS_CONFIG` (`phone`, `whatsapp`, `telegram`, `address`, `workingHours`, `mapEmbedUrl`, `geo`) to render optional Phone/WhatsApp/Telegram quick-action links and a privacy-first click-to-load lazy map embed alongside `<ContactForm embedded />`.
* Without a resolved endpoint the form is **not rendered at all**. Each panel then falls back to `*_fallback_desc` plus a `mailto:` button when `site.contactEmail` is set, and `*_unavailable_desc` when it is not — the copy must never promise an email channel the site does not have. Developer notices naming `PUBLIC_*_API_URL` are rendered in `import.meta.env.DEV` only.

---

## 7. Content-Type Registry (`app.config.json` → `content.types`)

A content type is a collection directory (`src/content/<key>/`) plus the routes it owns. The registry decides what is built; the collection schema only decides what a field means.

```json
"content": {
  "types": {
    "pages":    { "enabled": true, "base": "",         "index": false, "paginated": false, "feed": false, "nav": true },
    "blog":     { "enabled": true, "base": "blog",     "index": true,  "paginated": true,  "feed": true,  "nav": true },
    "projects": { "enabled": true, "base": "projects", "index": true,  "paginated": false, "feed": false, "nav": true }
  }
}
```

| Field | Effect |
| :--- | :--- |
| `enabled` | `false` removes the type's index/entry routes, sitemap entries, navigation links and home-page CTA. Content files stay on disk. `pages` cannot be disabled. |
| `base` | First route segment (`/projects/`). `pages` always owns the root and must keep `""`. |
| `index` | Whether the type has a listing route. |
| `paginated` | Whether the listing is split into `/<base>/page/<n>/` like the blog. |
| `feed` | Whether a type-specific Atom feed is produced (blog only today). |
| `nav` | Whether `getContentTypeNavItems()` includes the type in header, drawer and footer. |

### 7.1 Validation (`src/libs/content/types.ts`)

`readConfig()` runs once at module load and throws on: an unknown type key, `pages` disabled, an empty/invalid base, a base reserved by the router (`page`, `pagefind`, `_astro`, `api`, `rss`, `sitemap`, `robots`, `icons`, `site.webmanifest`, locale prefixes), or two types sharing a base. A misconfiguration fails the build with a specific message instead of silently producing a broken site.

Helpers exported from the same module — use these instead of hardcoding a segment:

* `getContentType(key)` / `CONTENT_TYPES`
* `getIndexedContentTypes()` / `getEntryContentTypes()` / `getNavigableContentTypes()`
* `getContentTypeIndexHref(key, locale)` / `getContentTypeEntryHref(key, slug, locale)`
* `getContentTypeLabel(key, locale)` / `getContentTypeDescription(key, locale)`

### 7.2 Route generation (`src/libs/content/service.ts`)

`buildSiteRoutes(pages, posts, extraCollections)` registers the page and blog routes as before, then loops `getEntryContentTypes()`:

* one `collection-entry` route per published entry per locale, with `alternates` built from `getContentTypeEntryHref`;
* one `collection-index` route per **live** locale when `index` is on — paginated types get the same clamping logic as the blog (`switcherAlternates` never points past a locale's last page).

**Live locales.** A locale is live once at least one entry of it is published — a page, a post or an entry of any other collection. A locale that exists in configuration only gets no section indexes at all (`/de/blog/` is not built for a German dictionary that still holds `[TODO: de]` titles), because those listings would be placeholder copy and would link at a home page that was never built. Declaring a locale therefore never publishes anything: the first translated, published entry is what turns its sections on, and `npm run i18n:add-lang` alone cannot produce a broken build.

A disabled blog registers **no** routes at all (not even an empty `/blog/`). `getBreadcrumbs()` matches the first URL segment against the enabled indexed types, so a new collection gets `Home → Section → Entry` for free.

### 7.3 Views & Interactive Filtering

`CollectionIndexView.astro` loads the collection itself, filters `draft` and locale via `parseContentEntryId`, sorts by `year` then title, and renders a staggered card grid, an empty state (`content_empty`) and an optional pager. On client render (`[data-collection-root]`), progressive controls allow filtering by category, tech `stack`, and keyword search, updating visible counts via `formatNumber`, offering `collection_filter_clear` / `collection_filter_empty`, and replaying card animations via `refreshChronoTrig()`. It passes the type's localized label as the breadcrumb section, so the trail reads `Home → Projects` rather than the raw route segment.

`CollectionEntryView.astro` renders the hero (with a breadcrumb prelude inside `HeroCopy`'s `prelude` slot, matching `BlogPostHeroContent`), the prose body, optional project meta (`client`, `year`, `stack`, `link`) and a `CreativeWork` + `BreadcrumbList` JSON-LD pair (`year` is serialized as an ISO `dateCreated: '<year>-01-01'`, because schema.org rejects a bare four-digit year). The visible trail and the structured data must stay in sync: if a view emits `BreadcrumbList`, it must render the same breadcrumbs.

Neither view knows about blog taxonomy/TOC/related-posts/feeds: collection filtering stays local to the collection index, so adding a collection never drags blog complexity along.

### 7.4 Adding a fourth client collection / content type (zero core edits)

1. Define the client collection schema inside `clientCollections` in `client/content.ts` (and optional `label` / `description` / `icon` UI metadata in `CLIENT_CONTENT_TYPES`) — `src/content.config.ts`, `src/libs/content/types.ts`, `src/libs/content/service.ts`, and `scripts/lib/content-types.mjs` discover exported keys automatically.
2. Add the collection settings under `content.types.<key>` in `client/config.json` (e.g. `{ "enabled": true, "base": "services", "index": true, "paginated": false, "feed": false, "nav": true }`).
3. Add `nav_<key>` and optional `<key>_index_description` in `client/messages/<locale>.json` (picked up automatically by `getContentTypeLabel` / `getContentTypeDescription` when not overridden in `CLIENT_CONTENT_TYPES`).
4. Optional: add a hue row in `TYPE_HUES` of `scripts/generate-assets.mjs` if customizing generated cover tones.

Then `npm run content:new <key> <slug> --publish` and the standard verification suite.
