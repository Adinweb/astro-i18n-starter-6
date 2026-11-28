# Content Pipeline, Routing & Blog Architecture Reference

This reference documents the content layer schemas, URL manipulation engine, lean routing dispatcher, blog engine, pagination math, feeds, and SEO endpoints for the Astro v7 starter.

---

## 1. Symmetrical Content Layer (`src/content.config.ts`)

Every collection (static pages, blog articles, and any registry-driven type such as projects) uses the Astro Content Layer with the folder-per-entry convention:
```text
src/content/{collection}/{group}/{locale}.mdx
```

### 1.1 Collections & Schemas
* **`pages`**: General site pages (`home`, `about`, `features`, `pricing`, `contact`, `components`, `components-herosections`) with flexible layout controls:
  - `hero`: `'none' | 'minimal' | 'default' | boolean` (defaults to `'none'` — no forced hero banner).
  - `container`: `'canvas' | 'contained' | 'prose'` (defaults to `'canvas'` — unconstrained `<main>` canvas; `'contained'` uses `.layout-container` (`1280px`) + `.prose-wide`; `'prose'` uses a `72ch` editorial column. Named `container` so it never collides with `@astrojs/mdx`'s reserved `layout` import property).
  - `flushTop`: `boolean` (defaults to `false`; removes header top padding when `hero: 'none'` so custom full-bleed heroes sit under the floating glass header).
  - `sections`: optional declarative `[{ block, props }]` array rendered automatically by `src/components/SectionComposer.astro` across all **29 section blocks** (7 heroes + 22 structural sections; see `docs/BLOCKS-API.md`). `HomePageTemplate.astro` also supports `ui.homeSections` from `client/config.json` when no page-level `sections` are defined. `SectionComposer` resolves `./` / `../` asset paths in `image`, `parallaxImage`, `bottomImage`, and `avatar`, picks `h1` vs `h2` based on `hasPageH1`, and forwards `contained`.
  - `template`: optional key mapped in `client/templates/index.ts` (`CLIENT_PAGE_TEMPLATES`) or core `src/views/PageView.astro` to render a shared bespoke `.astro` page template across all locales while sourcing localized copy/SEO from MDX.
* **`blog`**: Chronological articles requiring `publishedAt` and a non-empty `slug`, rendered uniformly through `BlogPostView.astro` (taxonomy, TOC, related posts, feed). Supports optional client-added fields declared in `content.types.blog.fields`.
* **`projects` & Declarative Collections (`gallery`, `products`, `services`, …)**: `src/content.config.ts` inspects every entry collection configured in `content.types` (`app.config.json` + `client/config.json` + `client/cms.json`) and dynamically generates its Zod schema via `buildConfiguredCollectionSchema()` (`src/libs/content/zod-schema.ts`) from `fields[]` (`schema-config.ts`). Any bespoke collection or custom Zod schema exported inside `clientCollections` in `client/content.ts` overrides or extends the generated definition cleanly. Whether a collection is routed, listed, paginated, fed, or linked is decided by its `content.types` entry.
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
* **64 Guarded Composable Blocks & UI Primitives (`src/libs/ui/blocks.test.ts`) + 4 Interactive Showcases**:
  - **29 section blocks** (`src/components/`): **7 hero sections** (`LandingHeroSplit`, `HeroCenteredEditorial`, `HeroDashboardShowcase`, `HeroCommandCli`, `HeroInteractivePrompt`, `HeroProofMarquee`, `HeroFloatingOrbSplit`) and **22 content/feature sections** (`BentoCapabilities`, `ProofStatsRow`, `FaqAccordion` + `src/libs/content/faq.ts`, `CtaBanner`, `PricingSection`, `TestimonialGrid`, `TeamSection`, `PartnerLogos`, `NewsletterBanner`, `PromoBanner`, `AboutSplitSection`, `ProcessSteps`, `FeatureTabsSection`, `ComparisonTable`, `FeatureCardGrid`, `ImageGallerySection`, `LatestPostsSection`, `ContactSplitSection`, `CarouselSection`, `ProductShowcaseGrid` with `currency` / `currencyPrefix` / `currencySuffix`, `AuthFormCard`, `ParallaxSection`).
  - **35 UI primitives** (`src/components/ui/`): 25 localized (`UiBadge`, `UiAlert`, `AvatarGroup`, `Breadcrumbs`, `HeroPreviewNav`, `HeroParallaxLayer`, `HeroShowcaseCard`, `UiPagination`, `UiModal`, `UiTooltip`, `UiProgress`, `UiSwitch`, `UiCheckbox`, `UiInput`, `UiDropdown`, `SocialLinks`, `Accordion`, `AnnouncementPill`, `ChipGroup`, `CodeBlock`, `Divider`, `RatingStars`, `Skeleton`, `StatTile`, `TopBanner`) and 10 pure (`BackdropLayer`, `Button`, `Card`, `HeroHeadline`, `Icon`, `IconBox`, `IconButton`, `Kbd`, `PartnerStrip`, `SectionHeader`).
  - **4 interactive/motion showcase blocks** (`src/components/`): `BentoGrid`, `LatestPostsCarousel`, `SwipeableTabs` (Embla-powered swipeable/keyboard tabs supporting `variant: 'pills' | 'underline'` and `data-motion="reduced"`), and `TestimonialMarquee`, sharing `src/components/ui/SectionHeader.astro`, `src/libs/ui/locale.ts`, and `src/libs/ui/initials.ts`.
  All use semantic OKLCH tokens, CSS logical properties, `<Icon>`, `<Button>`, Paraglide localized defaults (`locale` auto-detects from URL), and GPU-friendly ChronoTrig `data-trig-once="true"` / `loading="lazy"` defaults. Core pages (`home`, `about`, `features`, `pricing`, `contact`) compose directly in `container: 'canvas'`; pass `contained` on section blocks only if nesting inside a custom `container: 'contained'` page so they skip a redundant `<PageSection>` wrapper. Pass `priority` only on above-the-fold `ParallaxSection` or hero images.
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

### 4.2 Reading Time, Interactive Filters & Related Posts (`src/libs/content/blog.ts`)
* **Interactive Filtering (`BlogIndexView.astro` + `blog.ts`)**: Category pills use `toggleBlogCategory(filters, category)` (clicking an active category toggles it off while preserving active tags; "All Posts" resets to `NO_FILTERS`), and tag chips use `toggleBlogTag(filters, tag)` with AND semantics.
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
  - `src/libs/content/social.ts` (`getSocialCard`) switches behavior based on `brand.socialCardMode`: `'branded'` (shipped `app.config.json` default — `renderBrandedOgSvg()` + `renderBrandedOgPng()` generates deterministic `1200×630` RTL/LTR SVG→PNG cards matching the active brand palette, active `brand.fontPreset` / `brand.rtlFontPreset` bundled fonts, `brand.logo` badge overlay, and page title using `@resvg/resvg-js` + decompressed `@fontsource-variable/*` fonts via `wawoff2` with zero OS font dependency, setting `direction="rtl" unicode-bidi="embed"` and `text-anchor="end"` on RTL margins), `'artwork'` (cropped `entry.data.image`), or `'default'` (`/og-default.png`).
* **Corporate, Author (`Person`), LocalBusiness & Product Structured Data (`src/libs/content/schema.ts`)**:
  - `buildOrganizationSchema()`, `buildServiceSchema()`, `buildPersonSchema()` / `resolveAuthorSchema()` (`site.authors` profiles), `buildProductSchema()` / `buildProductListSchema()` (`Product` + `Offer`, normalizing `IRT` Toman → ISO-4217 `IRR` × 10), and `collectSocialProfiles()` build Schema.org JSON-LD injected automatically by `BaseLayout.astro`, `BlogPostView.astro`, and `ProductShowcaseGrid.astro`.
* **Git-Based Editing (`.pages.yml` + `client/cms.json`)**: Pre-configured Pages CMS schema mapping `pages`, `blog`, `projects`, and any custom declarative collections (kept synchronized via `npm run content:sync`), media uploads, and an isolated client settings form writing to `client/cms.json` (`site.contactEmail`, `business`, `social`, `ui.topBanner` with localized `*ByLocale` & scheduling, `ui.quickContact`, `redirects`, plus safe collection overrides).
* **AI Discovery Index (`src/pages/llms.txt.ts`)**: Generates `/llms.txt` at build time listing site canonical origin, sitemap, active locales, contact mailto, and published pages, blog posts, and collection entries grouped across all active locales.
* **Config-Driven Wildcard & Exact Redirects (`src/libs/content/redirects.ts`, `scripts/lib/redirects.mjs`, `astro.config.mjs`)**: Supports exact paths (`/old/`) and single trailing prefix wildcards (`/old-blog/*` -> `/blog/:splat`). Automatically emits `dist/_redirects` (Netlify/Cloudflare Pages), `deploy/nginx-redirects.conf` (included optionally by `docs/deploy/nginx.conf`), and `deploy/.htaccess-redirects` (Apache/LiteSpeed) without publishing Nginx/Apache configs inside `dist/`.
* **Static Collection, Blog & Search Fallback Catalogs (`src/pages/api/*.json.ts`)**:
  - `/api/collections/[type]/[locale].json`: Build-time static JSON catalogs emitted for every enabled non-`pages` collection (`blog`, `projects`, and custom client collections), powering multi-page filtering in `<CollectionBrowser />`.
  - `/api/blog-posts/[locale].json` (plus combined `/api/blog-posts.json`): Build-time static JSON catalogs powering client-side cross-page taxonomy filtering on multi-page blogs (`BlogIndexView.astro`).
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
* Supported providers (`api.provider`): `'custom' | 'web3forms' | 'formspree' | 'basin' | 'webhook'`. When `provider === 'web3forms'` and `api.accessKey` / `PUBLIC_WEB3FORMS_KEY` is provided, `resolveFormEndpoint()` automatically targets `https://api.web3forms.com/submit`. Endpoints also resolve from `PUBLIC_CONTACT_API_URL`, `PUBLIC_NEWSLETTER_API_URL`, `PUBLIC_API_BASE_URL`, or `app.config.json` (`api.baseUrl` + `api.endpoints.contact|newsletter`, `api.redirects.{contact,newsletter}`, plus optional `api.topics`). Optional Cloudflare Turnstile verification (`api.turnstileSiteKey` or `PUBLIC_TURNSTILE_SITE_KEY`) works alongside `AbortController` timeout protection, honeypot spam filtering, conversion tracking (`dispatchFormConversion` emits `astro-starter:contact-success` / `astro-starter:newsletter-success` `CustomEvent`s and fires `gtag`/`dataLayer`/`plausible`/`umami` when consent, `analytics.requireConsent === false`, or cookieless mode allows), optional localized post-submit `redirectTo` (prop or `api.redirects`), and the ready-to-deploy `docs/deploy/cloudflare-worker-webhook.js` Turnstile relay template.
* `ContactSplitSection.astro` consumes `BUSINESS_CONFIG` (`phone`, `whatsapp`, `telegram`, `address`, `workingHours`, `mapEmbedUrl`, `geo`) to render optional Phone/WhatsApp/Telegram quick-action links and a privacy-first click-to-load lazy map embed alongside `<ContactForm embedded />`. `ImageGallerySection.astro` offers interactive category chips paired with a full keyboard/button multi-slide `<dialog>` lightbox.
* **Privacy-First Analytics (`src/components/AnalyticsScripts.astro`)**: Supports `ga4Id`, `gtmId`, `plausibleDomain`, `umamiWebsiteId`/`umamiSrc`, and `clarityId` gated by `CookieConsent.astro` when `analytics.requireConsent` is `true` (default; set `false` for direct loading without a consent banner), with optional Google Consent Mode v2 (`analytics.consentMode`) and explicit cookieless opt-out (`analytics.allowCookielessWithoutBanner` for Plausible/Umami).
* Without a resolved endpoint the form is **not rendered at all**. Each panel then falls back to `*_fallback_desc` plus a `mailto:` button when `site.contactEmail` is set, and `*_unavailable_desc` when it is not — the copy must never promise an email channel the site does not have. Developer notices naming `PUBLIC_*_API_URL` are rendered in `import.meta.env.DEV` only.

---

## 7. Schema-Driven Content-Type Registry (`app.config.json` / `client/config.json` → `content.types`)

A content type is a collection directory (`src/content/<key>/`) plus its declarative frontmatter schema, filter/search UI rules, card presentation, and routes. The merged 3-tier config (`app.config.json` <- `client/config.json` <- `client/cms.json`) decides what is built and how it filters.

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
| `paginated` | Whether the listing is split into `/<base>/page/<n>/` like the blog (`perPage` overrides `blog.postsPerPage`). |
| `perPage` | Optional per-collection page size (defaults to `blog.postsPerPage` when `paginated: true`). |
| `feed` | Whether a type-specific Atom feed is produced (blog only today). |
| `nav` | Whether `getContentTypeNavItems()` includes the type in header, drawer and footer. |
| `icon` | Optional semantic Tabler icon name (e.g. `"photo"`, `"briefcase"`). |
| `labels` / `descriptions` | Optional locale-keyed titles & index meta descriptions (`{ "en": "Gallery", "fa": "گالری" }`), fallback to Paraglide keys (`nav_<key>`, `<key>_index_description`). |
| `sortBy` / `sortOrder` | Sorting field (e.g. `"year"`, `"publishedAt"`, `"title"`, or any numeric/date/string field) + `"asc" | "desc"`. |
| `fields[]` | Declarative frontmatter & auto-filter schema definitions (see 7.1). |
| `search` | `{ "enabled": true, "placeholder": { "fa": "..." }, "fields": ["title", "description", ...] }`. |
| `card` | `{ "layout": "grid" | "gallery" | "compact", "aspectRatio": "video" | "square" | "portrait" | "auto", "badgeField": "...", "badgeLimit": 3, "metaFields": ["..."] }`. |

### 7.1 Declarative Fields & Validation (`schema-config.ts`, `zod-schema.ts`, `types.ts`)

Each object in `content.types.<key>.fields` configures Zod validation, `.pages.yml` CMS fields, `<CollectionBrowser />` filter controls, and `<CollectionEntryView />` metadata rendering:

* **Supported `type` values**: `'string'`, `'text'`, `'number'`, `'boolean'`, `'date'`, `'url'`, `'image'`, `'enum'` (requires non-empty `options[]`), `'string[]'`, `'taxonomy[]'`.
* **Display & metadata options**: `required`, `default`, `options`, `optionLabels` (`{ "<value>": { "en": "...", "fa": "..." } }`), `min`, `max`, `label` / `labels` (`{ "en": "...", "fa": "..." }`), `searchable` (default `true` on text/array fields), `showOnCard` (`boolean | 'badge' | 'meta' | 'subtitle'`), `showOnEntry` (default `true`), `cms` (`false` omits from `.pages.yml`).
* **Auto-generated filter controls (`filter`)**:
  - `mode: 'single'` — Pill/chip single-select (`?param=val`)
  - `mode: 'multi'` — Toggleable multi-value pills with AND matching (`?param=a,b`)
  - `mode: 'select'` — Accessible `<select>` dropdown
  - `mode: 'toggle'` — Boolean switch/checkbox (`?param=true`)
  - `mode: 'range'` — Numeric min/max inputs (`?param_min=...&param_max=...`)
  - Plus `enabled`, `param` (defaults to `field.name`; **must be unique per collection**), `label`/`labels`, `allLabel`, and `sort` (`'alpha' | 'count' | 'config'`).

`readConfig()` runs once at module load and throws on: an unknown/reserved type key, `pages` disabled, an empty/invalid base, a base reserved by the router (`page`, `pagefind`, `_astro`, `api`, `rss`, `sitemap`, `robots`, `icons`, `site.webmanifest`, locale prefixes), two types sharing a base, `enum` without `options`, or duplicate `filter.param` values inside the same collection.

Helpers exported from `src/libs/content/types.ts` — use these instead of hardcoding segments or labels:

* `getContentType(key)` / `CONTENT_TYPES`
* `getIndexedContentTypes()` / `getEntryContentTypes()` / `getNavigableContentTypes()`
* `getContentTypeIndexHref(key, locale)` / `getContentTypeEntryHref(key, slug, locale)`
* `getContentTypeLabel(key, locale)` / `getContentTypeDescription(key, locale)`
* `getContentTypeFieldLabel(key, field, locale)` / `getContentTypeOptionLabel(key, field, value, locale)`

### 7.2 Route generation (`src/libs/content/service.ts`)

`buildSiteRoutes(pages, posts, extraCollections)` registers the page and blog routes as before, then loops `getEntryContentTypes()`:

* one `collection-entry` route per published entry per locale, with `alternates` built from `getContentTypeEntryHref`;
* one `collection-index` route per **live** locale when `index` is on — paginated types get the same clamping logic as the blog (`switcherAlternates` never points past a locale's last page).

**Live locales.** A locale is live once at least one entry of it is published — a page, a post or an entry of any other collection. A locale that exists in configuration only gets no section indexes at all (`/de/blog/` is not built for a German dictionary that still holds `[TODO: de]` titles), because those listings would be placeholder copy and would link at a home page that was never built.

A disabled blog registers **no** routes at all (not even an empty `/blog/`). `getBreadcrumbs()` matches the first URL segment against the enabled indexed types, so a new collection gets `Home → Section → Entry` for free.

### 7.3 `<CollectionBrowser />`, `CollectionIndexView`, & `CollectionEntryView`

**`<CollectionBrowser collection="..." />` (`src/components/CollectionBrowser.astro`)** is a standalone, schema-driven browser component you can drop into any page, MDX file, or bespoke template — and which `CollectionIndexView.astro` delegates to automatically:

```astro
---
import CollectionBrowser from '@/components/CollectionBrowser.astro';
---
<CollectionBrowser collection="gallery" columns={3} contained />
```

* **Props**: `collection` (`ContentTypeKey`, required), `locale`, `page` (`1`), `totalPages`, `perPage`, `baseHref`, `currentUrl`, `columns` (`2 | 3 | 4`), `showSearch` (defaults to `typeConfig.search.enabled`), `showFilters` (`true`), `showPagination` (`true`), `syncUrl` (`true`), `contained` (`false`), `class`.
* **Runtime Engine (`collection-filters.ts`, `catalog-utils.ts`, `replayStaggerGrid`)**: Dynamically renders all configured `filter` controls (`single`, `multi`, `select`, `toggle`, `range`), Perso-Arabic-aware keyword search (`normalizeForFallbackMatch`), live count updates (`formatNumber`), clear-filters reset, URL query syncing (`syncUrl`), multi-page filtering across the full locale via static `/api/collections/<type>/<locale>.json` (preserving Astro-optimized WebP thumbnails), and synchronized ChronoTrig stagger replays (`replayStaggerGrid()`). When embedded inside an unrelated page (e.g. a landing page showcase), set `syncUrl={false}` or `showPagination={false}` as desired.
* **`CollectionEntryView.astro`**: Renders the hero (with breadcrumb prelude inside `HeroCopy`), prose body, built-in project fields (`client`, `year`, `stack`, `link`) plus any configured `fields` where `showOnEntry !== false` (formatted via `formatEntryFieldForDisplay()`), and `CreativeWork` + `BreadcrumbList` JSON-LD (`year` serialized as `dateCreated: '<year>-01-01'`).

### 7.4 Adding a declarative client collection (zero core edits)

1. **Recommended (Config-First in `client/config.json`)**: Add your collection directly under `content.types.<key>` (e.g. `gallery`, `products`, `services`) with its `base`, `labels`, `fields[]` (including `filter` config), `search`, and `card` layout. You can also extend `blog` or `projects` with extra `fields[]` the same way.
2. **Sync CMS & folders**: Run `npm run content:sync` to update `.pages.yml` and initialize `src/content/<key>/`. (If you need non-standard Astro Zod transforms or computed fields, you can additionally export a custom entry in `clientCollections` inside `client/content.ts`.)
3. **Optional localized labels**: Add `nav_<key>`, `<key>_index_description`, or field/option labels in `client/messages/<locale>.json` (or supply `labels` / `optionLabels` directly in `client/config.json`).
4. **Scaffold entries & verify**: Run `npm run content:new <key> <slug> -- --publish`, drop `<CollectionBrowser collection="<key>" />` anywhere needed, and run `npm run content:sync -- --check` + `npm run preflight`.

---

## 8. SEO-Ready Page & Post Authoring & Management Playbook

Every `pages`, `blog`, and `projects` entry inherits `Seo.astro`, `sitemap.xml.ts`, `og-card.ts`, and `schema.ts` automatically. Follow these rules when creating or updating entries so search engines, social shares, and internal links perform at enterprise quality:

1. **Unique Metadata (`title` & `description`)**:
   * Keep `title` concise (`~50–60` characters; rendered as `{title} | {siteName}`).
   * Always provide a unique, localized `description` (`~140–160` characters). If omitted, `Seo.astro` falls back to generic `m.site_description()`, which weakens page-level uniqueness in search results.
2. **Native Localized Slugs (`slug`)**:
   * Always pass `--slug:<locale>="<native-slug>"` (e.g. Persian words joined by `-` or ZWNJ `\u200C`, which `slugSchema` validates). Never leave placeholder `<key>-fa` / `<group>-fa` slugs in published content (`npm run doctor` flags them).
   * Updating a published `slug` changes its canonical URL: run `npm run link:check` afterward and configure server redirects if an old live URL already has backlinks.
3. **Single `<h1>` & Semantic Outline**:
   * Every page must emit **exactly one `<h1>`** (verified by `npm run smoke`). On `hero: 'none'`, `container: 'canvas'` pages without `<PageHero>` or `<LandingHeroSplit>`, provide one top `<h1>`.
   * Structure body sections cleanly with `<h2>` → `<h3>` (Blog posts with ≥2 `h2`/`h3` headings automatically generate an accessible Table of Contents).
4. **Freshness, Authorship & Rich Results (JSON-LD)**:
   * Set `author: "<Name>"` on blog posts and register rich profiles under `site.authors` in `client/config.json` (`name`, `url`, `jobTitle`, `sameAs`) so `resolveAuthorSchema()` enriches `BlogPosting.author` to a complete E-E-A-T `Person`.
   * Set/update `updatedAt` (YYYY-MM-DD) when making meaningful content updates so `sitemap.xml <lastmod>`, `article:modified_time`, and `BlogPosting.dateModified` reflect fresh revisions.
   * Use `<FaqAccordion />` whenever a page or article answers common customer questions — it emits valid `FAQPage` JSON-LD automatically; `<ProductShowcaseGrid />` emits `ItemList` + `Product` + `Offer` JSON-LD by default (`emitSchema`, `priceCurrency`, `availability`, `sku`, `brand`, normalizing `IRT` → `IRR` × 10).
   * For bespoke corporate/service templates in `client/templates/<Name>.astro`, pass enriched `buildServiceSchema()` or `buildOrganizationSchema()` from `src/libs/content/schema.ts` to `<BaseLayout schema={...}>`.
5. **Taxonomy & Internal Linking (Blog)**:
   * Assign focused hyphenated ASCII `categories` and `tags` (e.g. `categories: ["seo"]`, `tags: ["astro", "rtl"]`) and register localized labels (`blog_category_<key>`, `blog_tag_<key>`) with `npm run i18n:add-batch` — this drives `BlogPosting.articleSection` / `keywords` JSON-LD and strengthens `getRelatedPosts()` internal linking.
6. **Images, Alt Text & Branded OG Cards**:
   * Keep a `./<group>.png` (or custom local asset) in `image:` so Astro optimizes responsive WebP artwork. Provide descriptive `imageAlt` on visual blocks (`LandingHeroSplit`, `ParallaxSection`, `ImageGallerySection`, MDX `<Image>`).
   * Choose `brand.socialCardMode` in `client/config.json`: `"branded"` generates high-contrast `1200×630` RTL/LTR PNG cards per page/post; `"artwork"` uses the cropped entry `image`.
7. **Drafts & Per-Entry `noindex` Boundary**:
   * Setting `draft: true` keeps an entry out of static routes, `sitemap.xml`, Atom feeds, and Pagefind search.
   * Setting `noindex: true` in any entry's frontmatter (`baseCollectionSchema` in `src/libs/content/zod-schema.ts`, synced into `.pages.yml` and Studio's Entry modal) keeps the page live at its URL while emitting `<meta name="robots" content="noindex, nofollow">` + `data-pagefind-ignore` and excluding it from `sitemap.xml` (including `hreflang` alternates), `/llms.txt`, Atom feeds, and `/api/search-dev*.json`.
8. **Post-Edit SEO Verification**:
   * Run `npm run content:status` (translation coverage), `npm run doctor` (placeholder slugs, broken images, config, analytics/GDPR), `npm run audit:i18n`, `SITE_URL=https://yourdomain.com npm run build`, `npm run smoke` (canonical, `hreflang`, OG PNGs, JSON-LD, `/llms.txt`, redirects, single `<h1>`, Pagefind), and `npm run link:check` (internal links, `#anchors`, & exact redirect targets).


