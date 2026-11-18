# Astro i18n Starter

A production-grade, multi-lingual (RTL + LTR), SSG-first website starter template built with **Astro v7**, **TypeScript**, **Tailwind CSS v4**, and **Paraglide JS**.

Designed for high performance, strict type safety, zero route collisions, and effortless internationalization across both Left-to-Right (LTR) and Right-to-Left (RTL) writing systems.

---

## ✨ Features

* **Static-First Performance (Pure SSG, Zero Backend) & Serverless Form Adapters**: 100% static HTML & JSON generation with no server runtime required. Interactive forms (`ContactForm.astro` and `NewsletterBanner.astro`) post directly from the client via `src/libs/api/client.ts` with built-in support for `custom`, `web3forms`, `formspree`, `basin`, and `webhook` providers, Cloudflare Turnstile (`turnstileSiteKey` / `PUBLIC_TURNSTILE_SITE_KEY`), and honeypot spam protection — alongside built-in TDDDG § 25 / GDPR cookie & script consent (`CookieConsent.astro`).
* **Native RTL & LTR Support**: Ships out of the box with **English (`en`)** and **Persian / Farsi (`fa`)** active, plus pre-wired font/formatting rules and one-command CLI scaffolding (`npm run i18n:add-lang`) for **Arabic (`ar`)**, **German (`de`)**, **French (`fr`)**, and any other RTL/LTR language.
* **CSS Logical Properties & Standard `1280px` Container**: Built with Tailwind CSS v4 using semantic tokens (`bg-surface`, `text-fg`, `border-border`), a unified `.layout-container` (`max-w-7xl` / `1280px`), and logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`).
* **Clean Prefix-less Default Locale & Easy Single-Language Option**: The default language has clean root URLs (`/`, `/about/`, `/blog/first-post/`), while other languages receive prefixes (`/fa/`, `/fa/درباره-ما/`, `/ar/من-نحن/`). For single-language client projects, simply set `ui.showLanguageSwitcher: false` in `client/config.json` (plus `npm run i18n:set-default <locale>` if needed) without modifying core files—or optionally run `npm run i18n:solo <locale>` to prune alternate routes and archive inactive files.
* **Swappable Default Language**: Swap the default language cleanly at any time via `npm run i18n:set-default <locale>` (updates `client/locales.json` + recompiles merged messages) with zero file restructuring.
* **Zero Route Collisions**: A single Lean Router Dispatcher (`src/pages/[...path].astro`) dynamically handles all localized pages, translated slugs, and index views.
* **Compile-Time i18n via Paraglide**: Strongly typed translations with native ICU plurals and ordinals, compiled directly from `messages/core/` + `client/messages/` into tree-shakeable JS functions without runtime overhead.
* **Symmetrical Content Collections & Filterable Indexes**: Folder-per-entry content pipeline (`src/content/{collection}/{group}/{locale}.mdx`) with localized slugs, cross-language alternate linking, and interactive category/stack/keyword filtering in `CollectionIndexView.astro` (`projects`, etc.).
* **Manageable Content Types & Pages CMS**: `pages`, `blog` and `projects` are declared in `app.config.json` → `content.types` (overridable in `client/config.json`, plus client collections via `client/content.ts`), with Git-based visual editing configured out of the box in `.pages.yml`. `npm run content:enable|disable <type>` adds or removes a type's routes, sitemap entries and navigation links without touching a single content file, and `content:new` scaffolds an entry in any type.
* **22 Composable Corporate, Landing & UI Blocks + Business Profile**: 19 section blocks (`LandingHeroSplit`, `PromoBanner`, `PartnerLogos`, `AboutSplitSection`, `BentoCapabilities`, `FeatureTabsSection`, `ProcessSteps`, `FeatureCardGrid`, `ProofStatsRow`, `ComparisonTable`, `PricingSection`, `TestimonialGrid`, `ImageGallerySection`, `LatestPostsSection`, `TeamSection`, `FaqAccordion`, `ContactSplitSection` with phone/WhatsApp/Telegram quick actions and click-to-load lazy map embed, `NewsletterBanner`, `CtaBanner`) plus 3 reusable UI primitives (`UiBadge`, `UiAlert`, `AvatarGroup`) and industry onboarding blueprints (`--blueprint=corporate|agency|portfolio|medical`).
* **Configurable, Dead-Link-Free Navigation**: `CLIENT_PAGE_ITEMS` in `client/navigation.ts` feeds both the desktop header **and** the mobile drawer from a single builder, `ui.ctaPage` in config picks the header/drawer CTA target, and any entry whose page (or `#anchor`) no longer exists hides itself — `npm run link:check` fails the pipeline if an internal link or fragment resolves to nothing.
* **Paginated Blog Index & Cross-Page Filtering**: Static paginated route set — one URL per page per locale (`/blog/`, `/blog/page/2/`, `/fa/blog/page/2/`) — with reciprocal `hreflang`, `rel="prev"` / `rel="next"`, and progressive cross-page taxonomy filtering powered by lightweight per-locale static catalogs (`/api/blog-posts/<locale>.json`).
* **Persian-Aware Search Built-In**: Production static indexing with **Pagefind** (`scripts/index-pagefind.mjs`) enhanced with Perso-Arabic character normalization (`ي`/`ك` → `ی`/`ک`), punctuation token boundary isolation (`«...»`, `،`), client-side ZWNJ/space compound & numeral query expansion (`src/libs/search/persian.ts`), and per-locale JSON fallbacks (`/api/search-dev/<locale>.json`).
* **SEO, Local Business Schema & Branded Social Cards**: Canonical URLs, hreflang plus `x-default`, RTL-shaped build-time deterministic branded PNG Open Graph cards (`/og/[...slug].png.ts` when `brand.socialCardMode === 'branded'`), Twitter cards, `Organization` / `LocalBusiness` / `Service` / `WebSite` / `WebPage` / `CollectionPage` / `BlogPosting` + `BreadcrumbList` / `FAQPage` JSON-LD (`src/libs/content/schema.ts`), a multilingual sitemap with `lastmod`, and per-locale Atom feeds (`/rss.xml` and `/rss/<locale>.xml`).
* **Brand Logo, Theme Presets & DEV Theme Studio**: Support for Light/Dark image or SVG `brand.logo` overrides in header, drawer, and footer, 6 curated OKLCH-safe palettes (`indigo`, `cobalt`, `emerald`, `amber`, `slate`, `rose`), optional hex overrides, bundled `@fontsource-variable/*` Latin/RTL font pairings + commercial Persian `@font-face` scaffolding in `client/styles.css`, and an interactive `import.meta.env.DEV`-only Theme Studio (`DevThemePreview.astro`, zero bytes in production).
* **Native Light & Dark Mode**: FOUC-free theme initialization with `prefers-color-scheme` detection, `localStorage` persistence, View Transition swap continuity, and OKLCH semantic tokens in `src/styles/global.css`.
* **Locale-Native Dates & Numerals**: Centralized `Intl` formatting (`src/i18n/format.ts`) with Solar Hijri (Jalali) dates and Persian numerals (`۰-۹`) for `fa`, Eastern Arabic numerals (`٠-٩`) for `ar`, and standard localized formatting for LTR locales.
* **Rich Editorial UX & Print Stylesheet**: Automatic sticky/collapsible Table of Contents (`h2`/`h3`), taxonomy-scored Related Articles, chronological Newer/Older article navigation, localized `updatedAt` timestamps, one-click Copy Code buttons on `<pre>` blocks, and a clean `@media print` stylesheet.
* **Accessible & Reduced-Motion Aware**: Native `<dialog>` search (`⌘K`, `↑`/`↓`/`Enter`), two-tab mobile slide-over drawer, single `<h1>` per page, skip link, visible focus rings, and unified OS `prefers-reduced-motion` + `data-motion` support across CSS reveals, Lenis smooth scrolling, and cookie banners.
* **ChronoTrig v5.2.0 Scroll Reveals & Smooth Scroll**: GPU-only entrance animations (`data-trig` + `data-trig-once="true"` scoped under `<html class="js">`, never `display: none`), modern reveal presets (`.fadeInUpSm`, `.blurIn`, `.clipUp`, `.trig-delay-*`), RTL-mirrored logical directions (`data-trig-direction="start"` / `"end"`), harmonic stagger modes (`linear`, `wave`, `center`, `reverse`), pinned sections (`[data-trig-pin]`), multi-step timelines (`[data-trig-timeline]`), interactive filter replays, and accessible **Lenis** smooth scrolling.
* **Flexible Page Canvas & Atmospheric Blog Heroes**: Static `pages` schema defaults to `hero: 'none'` and `container: 'canvas'` for complete design freedom (`<PageSection>`, `hero: 'minimal' | 'default'`, `container: 'contained' | 'prose'`, `flushTop`, or bespoke Astro templates via `template: '<name>'` in `client/templates/index.ts`), while `blog` posts share a full-bleed defocused `PageHero.astro` backdrop shaped by vertical scrims that read identically in LTR and RTL.
* **Optimized Image Pipeline & Production Caching**: Every picture is served through Astro's image pipeline (WebP output, responsive `srcset`/`sizes`), plus link hover prefetch (`astro.config.mjs`), Cloudflare/Netlify security & cache rules (`public/_headers`), and Nginx reference configuration (`docs/deploy/nginx.conf`).
* **Frosted-Glass Design System**: The header, its icon controls, buttons (`Button.astro`), and chips are defined once in `src/styles/global.css` alongside an AA-contrast OKLCH semantic palette (`primary`, `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, `error`), extensible in `client/styles.css`.
* **Raster Brand Assets From Code**: `scripts/generate-assets.mjs` deterministically produces the app icons, the default Open Graph image, and all hero/cover artwork with no image-editing dependency.
* **Inline Tabler Icons**: 66 core semantic icons rendered via `<Icon name="..." />` from `@tabler/icons-astro` (plus custom client icons via `client/icons.ts` + `client/ClientIcons.astro`), imported per icon so builds stay lean — no sprite request and no inline SVG duplication.
* **Three-Tier Zero-Conflict Separation & Starter Kit**: Core (`src/`, `app.config.json`, `messages/core/`), Client Workspace (`client/`), and optional Demo Bundle (`starter-kit/`, toggled via `npm run starter:seed`), guarded by `npm run upstream:check`.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** `>= 22.12.0`
* **npm** or **pnpm** `>= 10`

> Set `SITE_URL` so canonical, sitemap, RSS, and Open Graph URLs are absolute: copy `.env.example` to `.env` and set the public origin. A **local** build without it still runs — it falls back to the dev origin configured in `app.config.json` and warns — while a **CI or deployment** build fails, so a deploy can never ship placeholder URLs.

### 1. Install Dependencies
```bash
npm install
```

### 2. Optional: Seed Demo Content (`starter-kit/`)
By default the template boots in **Clean Minimal Base** state (`home` page in `en`/`fa`). To preview all demo pages, blog posts, projects, and sample navigation:
```bash
npm run starter:seed -- --yes
```
To strip the demo back out before starting client work:
```bash
npm run starter:seed -- --clean --yes
```

### 3. Start the Development Server
```bash
npm run dev
```
Open the URL printed by Astro — by default [http://localhost:3000](http://localhost:3000), using the port from `app.config.json` (overridable in `client/config.json`).

> **Background Mode**: If running in an agentic or background environment:
> ```bash
> npx astro dev --background
> ```
> Manage the background process with `npx astro dev status`, `npx astro dev logs`, and `npx astro dev stop`.

### 4. Build for Production
```bash
npm run build
```
This merges and compiles Paraglide messages, runs `audit:i18n`, builds all static HTML pages into `dist/`, and indexes the site with Pagefind.

> Canonical URLs and internal links always end in `/` (`withTrailingSlash`), while Astro runs with `trailingSlash: 'ignore'` so slash-less unknown URLs render the custom localized `404.astro` instead of a framework error screen.

### 5. Deploying
`dist/` is fully static — HTML, CSS, JS, optimized images, the Atom feeds (`/rss.xml`, `/rss/<locale>.xml`), `sitemap.xml`, `robots.txt`, `site.webmanifest` and the Pagefind index. Upload it to any static host or CDN; no Node runtime is needed at serve time.

* Set `SITE_URL` to the public origin for the build that ships. It is baked into canonicals, `hreflang`, Open Graph URLs, feeds and the sitemap, so a redeploy after a domain change is required.
* Commit your lockfile (`package-lock.json` or `pnpm-lock.yaml`) for reproducible CI installs; the pinned `sharp` build produces the social cards and hero variants.
* Serve `trailingSlash`-less URLs by redirecting to the trailing-slash form, and point the host's 404 handler at `dist/404.html`.

---

## 📁 Project Structure

```text
├── .agents/skills/            # AI Agent skills (e.g. astro-i18n-starter)
├── .pages.yml                 # Pages CMS Git-based visual editor configuration
├── app.config.json            # Upstream core defaults (site, brand, business, blog, cookies, API & server values)
├── client/                    # Client-owned workspace (overrides, locales, messages, nav, styles, icons, templates)
│   ├── config.json            # Sparse overrides merged onto app.config.json
│   ├── locales.json           # Active locales, defaultLocale, and metadata (dir, fonts, htmlLang)
│   ├── messages/              # Client translation keys & overrides (<locale>.json)
│   ├── navigation.ts          # CLIENT_PAGE_ITEMS + custom primary/footer/legal links
│   ├── content.ts             # Custom Astro collections & CLIENT_CONTENT_TYPES metadata
│   ├── icons.ts & ClientIcons.astro # Extra client Tabler icons merged into <Icon />
│   ├── LayoutHooks.astro      # Custom <head> / <body>-end slots inside BaseLayout
│   ├── styles.css             # Client CSS overrides, custom classes & commercial Persian @font-face slots
│   └── templates/index.ts     # Custom .astro page templates registered for PageView
├── docs/
│   └── deploy/nginx.conf      # Production Nginx caching, gzip & localized 404 reference config
├── messages/core/             # Upstream core UI dictionaries (en.json, fa.json)
├── starter-kit/               # Optional demo pages, blog posts, projects, assets & nav (`npm run starter:seed`)
├── public/                    # Static assets (_headers, favicons, browser icons, chronotrig.min.js, chronotrig.esm.js)
├── scripts/                   # Developer automation CLI, health checks, Pagefind indexing & upstream check
│   └── lib/                   # Shared config, blueprints, merge-messages, prompt, frontmatter, validation, content-type & artwork helpers
├── src/
│   ├── assets/hero/hero-0.jpg # Shared hero photograph (no page image of its own)
│   ├── components/            # Reusable UI components
│   │   ├── Icon.astro         # Tabler icon registry behind <Icon name="..." />
│   │   ├── IconButton.astro   # Icon-only button (glass or ghost variant)
│   │   ├── Button.astro       # The one text button: variant + size + label + icon
│   │   ├── DrawerNavLink.astro # Drawer menu row: icon + label (tile box only at depth 0)
│   │   ├── ThemeToggle.astro  # Accessible light/dark mode toggle
│   │   ├── LanguageSwitcher.astro # Dropdown with translated alternate links
│   │   ├── PageHeader.astro   # Minimal typographic page header (hero: "minimal")
│   │   ├── PageHero.astro     # Hero shell: full-bleed background + light-shaping scrims
│   │   ├── PageSection.astro  # Full-bleed section wrapper with .layout-container inner width
│   │   ├── HeroCopy.astro     # Shared hero copy (heading, description, slots)
│   │   ├── HomeHero.astro     # Bespoke home hero band (badge, headline, CTAs, three proofs)
│   │   ├── BlogPostHeroContent.astro # Hero copy for articles (breadcrumbs, meta)
│   │   ├── PostCard.astro     # Blog listing card (direct child of [data-trig-stagger])
│   │   ├── DrawerSearch.astro # Inline mobile drawer search
│   │   ├── SearchModal.astro  # Accessible search modal (Pagefind + Dev fallback)
│   │   ├── CookieConsent.astro # TDDDG § 25 / GDPR cookie & script consent modal
│   │   ├── ContactForm.astro  # Pure-SSG contact form (custom/Web3Forms/Formspree/Basin/webhook + Turnstile)
│   │   ├── DevThemePreview.astro # DEV-only interactive Theme & Font Studio (excluded from dist/)
│   │   ├── Seo.astro          # Canonical links, reciprocal hreflang tags & OG card wiring
│   │   ├── TopLoadingBar.astro # Page transition progress bar (reduced-motion aware)
│   │   └── …                  # + 19 section blocks & 3 UI primitives (LandingHeroSplit … ContactSplitSection, UiBadge, UiAlert, AvatarGroup)
│   ├── content/               # Multilingual Content Collections
│   │   ├── pages/             # Static pages: home, about, features, pricing
│   │   │   └── <group>/       # Holds <locale>.mdx files + group hero/OG artwork
│   │   ├── blog/              # Blog articles with localized slugs
│   │   │   └── <group>/       # Holds <locale>.mdx files + group cover artwork
│   │   └── projects/          # Case studies/portfolio entries (registry-driven type)
│   │       └── <group>/       # Holds <locale>.mdx files + group cover artwork
│   ├── i18n/                  # Core i18n Single Source of Truth (SSOT)
│   │   ├── locales.ts         # LOCALES array, DEFAULT_LOCALE, metadata (dir, fonts)
│   │   ├── format.ts          # Locale-native Intl number & date/time formatters (Jalali for fa)
│   │   └── paths.ts           # Pure path functions (localizeHref, localeHref, stripLocale, getPathname)
│   ├── layouts/
│   │   └── BaseLayout.astro   # Main layout: brand.logo, Organization/LocalBusiness JSON-LD, header, drawer, footer
│   ├── libs/
│   │   ├── api/client.ts      # Pure client-side HTTP adapter (custom, Web3Forms, Formspree, Basin, Webhook + Turnstile)
│   │   ├── config/app.ts      # Validates app.config.json; typed site/brand/business/blog/api values
│   │   ├── config/client.ts   # Browser-safe config mirror (no Zod runtime in client bundle)
│   │   ├── config/defaults.ts # Shared defaults for client.ts and Zod schemas
│   │   ├── config/theme.ts    # OKLCH palette & font preset resolver (+ theme-presets.json)
│   │   ├── config/navigation.ts # Multi-menu header/drawer/footer/legal navigation builder
│   │   ├── content/entries.ts # Entry IDs, draft filtering, locale selection & sorting
│   │   ├── content/service.ts # Route resolution, slug alternates, feeds & breadcrumbs
│   │   ├── content/types.ts   # Content-type registry: enabled/base/index/paginated/feed/nav + URL helpers
│   │   ├── content/blog-catalog.ts # Serializer for static blog JSON catalogs
│   │   ├── content/faq.ts     # FAQPage JSON-LD builder for FaqAccordion
│   │   ├── content/feed.ts    # Per-locale Atom 1.0 feed builder
│   │   ├── content/og-card.ts # Deterministic RTL/LTR SVG→PNG branded Open Graph card renderer
│   │   ├── content/pagination.ts # Pure paginate() + buildPageWindow() helpers
│   │   ├── content/schema.ts  # Organization, LocalBusiness, Service & social profile JSON-LD builders
│   │   ├── content/social.ts  # Social card resolver (branded / artwork / default)
│   │   ├── cookies/           # Consent state model & multi-domain cookie/script manager
│   │   ├── search/            # client.ts + persian.ts (Pagefind + ZWNJ/orthography search engine)
│   │   ├── ui/button.ts       # Button class recipe shared by Button.astro and client renderers
│   │   └── ui/icons.ts        # 66 core icons + client extensions (SITE_ICONS)
│   ├── pages/
│   │   ├── [...path].astro    # Lean Router Dispatcher
│   │   ├── 404.astro          # Path-prefix locale-aware 404 page
│   │   ├── og/[...slug].png.ts # Build-time branded OG PNG route (socialCardMode: 'branded')
│   │   ├── site.webmanifest.ts # Web app manifest generated from app.config.json
│   │   ├── rss.xml.ts         # Default-locale Atom feed
│   │   ├── rss/[locale].xml.ts # Non-default locale Atom feeds (/rss/fa.xml, etc.)
│   │   ├── sitemap.xml.ts     # Multi-lingual sitemap with x-default + lastmod
│   │   ├── robots.txt.ts      # Robots.txt pointing to sitemap
│   │   ├── api/blog-posts.json.ts # Combined static blog catalog fallback
│   │   ├── api/blog-posts/[locale].json.ts # Per-locale static blog catalog
│   │   ├── api/search-dev.json.ts # Combined locale-aware search fallback index
│   │   └── api/search-dev/[locale].json.ts # Per-locale static search fallback index
│   ├── types/
│   │   └── tabler-icons-astro.d.ts # Types for per-icon deep imports in Icon.astro
│   ├── paraglide/             # Generated Paraglide code (gitignored, do not edit)
│   ├── scripts/
│   │   ├── lenis.ts           # Accessible smooth scroll lifecycle (ClientRouter + anchor sync + trigScroll)
│   │   └── chronotrig.ts      # ChronoTrig v5.2.0 coordinator (setupChronoTrig + refreshChronoTrig)
│   ├── styles/                # Global & prose stylesheets
│   │   ├── global.css         # Tailwind v4 @theme static inline + .layout-container + overflow-x: clip + semantic palette + glass
│   │   ├── prose.css          # Article formatting with RTL isolation for code blocks
│   │   └── chronotrig.css     # ChronoTrig v5.2.0 .js [data-trig] presets, modifiers, staggers, pins & print/opt-out flattening
│   └── views/
│       ├── PageView.astro     # Flexible static page renderer (canvas / contained / prose / custom template)
│       ├── BlogIndexView.astro # Blog listing page
│       ├── BlogPostView.astro # Individual article renderer
│       ├── CollectionIndexView.astro # Generic listing for registry-driven types (projects, …)
│       ├── CollectionEntryView.astro # Generic entry renderer for those types
│       └── pages/HomePageTemplate.astro # Shared bespoke home page template
```

---

## ⚙️ Configuration

All application-level values that must stay in sync across the app and the CLI scripts live in [`app.config.json`](app.config.json):

* **`site`** — name, short name, description (used by the web manifest; page/SEO descriptions come from the localized `site_description` message), `contactEmail` (the `mailto:` destination of the contact & newsletter fallbacks; leave it empty and panels show an unavailable notice instead of promising an email), default social card path and size.
* **`brand`** — `defaultTheme`, OKLCH palette `preset` (`indigo`, `cobalt`, `emerald`, `amber`, `slate`, `rose`), optional hex overrides (`primaryColor`, `accentColor`), optional `logo` (`light`, `dark`, `alt`, `width`, `height`, `showText`), Latin `fontPreset` (`system`, `jakarta`, `manrope`, `outfit`, `editorial`), `rtlFontPreset` (`vazirmatn`, `noto-arabic`, `iransans`, `yekan-bakh`, `peyda` — with commercial `@font-face` scaffolding in `client/styles.css`), `socialCardMode` (`branded`, `artwork`, `default`), `themeColor`, `darkThemeColor`, `backgroundColor`, Apple touch icon, and manifest icons.
* **`business`** — corporate identity for Local SEO & contact panels: `type` (`Organization` | `LocalBusiness` | `ProfessionalService` | `MedicalBusiness` | `Store`), `legalName`, `phone`, `whatsapp`, `telegram`, `address`, `city`, `country`, `workingHours`, `mapEmbedUrl`, and `geo` (`lat`, `lng`), emitted automatically as JSON-LD via `src/libs/content/schema.ts` and wired into `ContactSplitSection.astro`.
* **`ui`** — header/drawer flags including `ctaPage` and `showLanguageSwitcher` (set `showLanguageSwitcher: false` for single-language sites with zero structural changes).
* **`blog.postsPerPage`** — how many posts one index page holds.
* **`social`** — optional `github`, `twitter`, `linkedin`, `instagram`, and `telegram` URLs rendered in the footer Company column and `sameAs` links in Organization JSON-LD.
* **`api`** — optional `provider` (`custom`, `web3forms`, `formspree`, `basin`, `webhook`), `accessKey` (`PUBLIC_WEB3FORMS_KEY`), `turnstileSiteKey` (`PUBLIC_TURNSTILE_SITE_KEY`), `baseUrl`, `timeoutMs`, `endpoints.contact`, `endpoints.newsletter`, and localized `topics` for connecting client-side forms (`src/libs/api/client.ts`) to external/headless backends (overridable via `PUBLIC_API_BASE_URL`, `PUBLIC_CONTACT_API_URL`, and `PUBLIC_NEWSLETTER_API_URL`). Without a configured endpoint neither form is rendered: visitors see a `mailto:` button when `site.contactEmail` is set (`*_unavailable_desc` otherwise), and dev setup hints appear in `import.meta.env.DEV` only.
* **`server`** — dev host/port, also used as the local fallback site origin.

[`src/libs/config/app.ts`](src/libs/config/app.ts) deep-merges `app.config.json` with sparse overrides from [`client/config.json`](client/config.json), validates the result with Zod, and exposes typed values (`siteConfig`, `POSTS_PER_PAGE`, `API_CONFIG`, `BUSINESS_CONFIG`, hero defaults, `absoluteUrl`). The asset generator, web manifest, and smoke tests read the same merged view. Browser scripts read the same config through [`src/libs/config/client.ts`](src/libs/config/client.ts), which shares its fallbacks with the schema via [`defaults.ts`](src/libs/config/defaults.ts) and never imports the validator — an import of `app.ts` from a client module would ship the whole Zod runtime (~93 kB) to every page. Framework-only settings remain in `astro.config.mjs`, and locale configuration lives in [`client/locales.json`](client/locales.json) (exposed via `src/i18n/locales.ts`).

The Paraglide workspace is materialized automatically into `.paraglide-work/` (gitignored) by `scripts/messages-compile.mjs`, merging `messages/core/<locale>.json` with `client/messages/<locale>.json` and resolving the local plugins from `node_modules` without network access.

---

## 🛠️ Developer CLI Suite

All automation scripts run from the terminal using `npm run <command>` (or `pnpm run <command>`):

| Command | Action | Example |
| :--- | :--- | :--- |
| `npm run site:init` | Interactive/headless branding, `--blueprint` (`corporate`/`agency`/`portfolio`/`medical`), palette, fonts & OG wizard | `npm run site:init -- --name="Acme" --blueprint=agency --yes` |
| `npm run new:page` | Scaffolds a new page across all locales (`standard` or `landing` preset) | `npm run new:page offer -- --preset=landing --title="Product Launch"` |
| `npm run new:post` | Scaffolds a new blog post across all locales | `npm run new:post ai-trends -- --title="AI Trends" --publish` |
| `npm run remove:page` | Deletes a page and cleans `client/messages/` navigation keys | `npm run remove:page contact -- --force` |
| `npm run remove:post` | Deletes a blog post across all locales | `npm run remove:post ai-trends -- --force` |
| `npm run i18n:add-lang` | Adds a new language, dictionary (`client/messages/`), and content files | `npm run i18n:add-lang -- es --name="Español" --with-content` |
| `npm run i18n:remove-lang` | Removes a language from `client/` and cleans associated files | `npm run i18n:remove-lang -- es --with-content --force` |
| `npm run i18n:set-default` | Swaps the root prefix-less default locale cleanly in `client/locales.json` | `npm run i18n:set-default fa` |
| `npm run i18n:solo` | Optional: switches to strict solo locale and archives alternate files | `npm run i18n:solo fa` |
| `npm run block:adapt` | Adapts external Tailwind HTML/JSX to logical RTL tokens | `npm run block:adapt -- --file=src/components/MyCard.astro` |
| `npm run i18n:extract` | Extracts raw copy into Paraglide message keys in `client/messages/` | `npm run i18n:extract -- --target=src/components/MyCard.astro --key=card --auto-add --replace` |
| `npm run i18n:add` | Adds a single translation key to `client/messages/*.json` | `npm run i18n:add -- --category=nav --key=docs --en="Docs" --fa="مستندات"` |
| `npm run content:list` | Lists every declared content type with its route base, state and entry counts | `npm run content:list -- --json` |
| `npm run content:new` | Scaffolds an entry group in any content type | `npm run content:new projects atlas -- --title="Atlas" --publish` |
| `npm run content:enable` / `content:disable` | Toggles a content type override in `client/config.json` without editing core | `npm run content:disable projects` |
| `npm run content:status` | Prints the per-locale readiness matrix (published/draft/missing, words, TODOs) | `npm run content:status -- --write=docs/STATUS.md` |
| `npm run doctor` | No-build health check (runtime, config, content types, dictionaries, content) with fix hints | `npm run doctor` |
| `npm run link:check` | Crawls the built HTML and reports internal links and `#anchor` fragments that resolve to nothing | `npm run link:check` |
| `npm run audit:i18n` | Audits locale-config parity, placeholders, used keys, content and route collisions | `npm run audit:i18n` |
| `npm run smoke` | Runs HTML, SEO, feed, manifest and H1 assertions on `dist/` | `npm run smoke` |
| `npm run knip` | Finds dead files, exports and dependencies | `npm run knip` |
| `npm run starter:seed` | Seeds (or `--clean`s) optional `starter-kit/` demo content & `--blueprint` overrides | `npm run starter:seed -- --blueprint=corporate` |
| `npm run upstream:check` | Verifies two-tier config/messages/locales, core extension hooks & merge hygiene | `npm run upstream:check` |
| `npm run assets:generate` | Regenerates PNG icons, the OG image, and all hero/cover artwork next to the content groups | `npm run assets:generate` |
| `npm run verify:cli` | Runs every documented CLI workflow in a throwaway copy and prints a PASS/FAIL line per claim | `npm run verify:cli` |

---

## 📖 Operational Guide

### 1. Adding a New Page
Run the scaffolding CLI:
```bash
npm run new:page team -- --title="Our Team" --hero=minimal --container=contained
```
This will:
1. Create `src/content/pages/team/<locale>.mdx` across all active locales in `client/locales.json` (`en.mdx`, `fa.mdx` out of the box).
2. Generate localized slugs (`slug: "team"`, `slug: "team-fa"`, etc.).
3. Register the `nav_team` translation key in `client/messages/*.json`.
4. Point every locale's `image` frontmatter at `./team.png` — the artwork sits next to the entries — and generate that artwork.
5. Merge core + client dictionaries and recompile Paraglide messages automatically.

Only the **source locale** is published by default (`draft: false`); every other locale
is written as `draft: true` so an untranslated page never goes live. Pass
`--publish` (or `--draft=false`) to publish the source and every locale with real
`--title:<locale>` / `--desc:<locale>` copy; locales that still contain `[TODO: ...]`
placeholders stay drafts. `--draft` keeps every locale as a draft, and
`--slug:fa="تیم-ما"` sets a native slug per language.

Pass `--image=cover.png` to use a different file: the path is looked up next to the content group and in the project root, then copied into the group folder, because the frontmatter reference is relative to the entry file. Pass `--image=none` to leave the page without artwork of its own. A named image that does not exist is reported as a warning and the group artwork is used instead, so the build never breaks.

To display the new page in the navigation bar, add one entry to `CLIENT_PAGE_ITEMS` in `client/navigation.ts` — the single list the desktop header **and** the mobile drawer read (custom footer columns and legal links live in the same file):
```ts
// client/navigation.ts
export const CLIENT_PAGE_ITEMS = [
  // …
  { group: 'team', icon: 'users', label: (locale: Locale) => m.nav_team({}, { locale }) },
] as const;
```
The URL comes from `getPageUrl`, the label from the `nav_team` key `new:page` registered, and a page that is unpublished in a locale simply drops out of the menu. No core template edits are required.

### 2. Adding a New Blog Post
Run the article scaffolder:
```bash
npm run new:post modern-web -- \
  --title="Modern Web Development" \
  --category=engineering \
  --tags="astro,performance" \
  --image=cover.png \
  --publish
```
This generates synchronized files in `src/content/blog/modern-web/` across all supported languages. You can customize the localized `slug` in each file's frontmatter (e.g. `slug: "توسعه-وب-مدرن"` in `fa.mdx`), or let the scaffolder do it with `--slug:fa="توسعه-وب-مدرن"`.

`--from` picks the source locale; it does not copy the body of another article. Use
`--clone-from=<group>` to start from the body of an existing one. Like `new:page`,
only the source locale is published unless you pass `--publish`.

Without `--image`, the post points at its group cover `./<group>.png` — next to the entries — and that artwork is generated for you. Pass `--image=none` to use the shared hero artwork instead.

#### Blog frontmatter
| Field | Purpose |
| :--- | :--- |
| `image` | Featured cover (`./<file>.png`, relative to the entry), rendered on cards, the article hero, and `og:image`. Astro resolves it against the entry file and optimizes it. |
| `categories` | Language-neutral keys such as `engineering`. Rendered from `blog_category_<key>`. |
| `tags` | Language-neutral keys such as `i18n`. Rendered from `blog_tag_<key>`. |
| `author` | Optional byline, also emitted in the `BlogPosting` JSON-LD. |

Taxonomy keys must be lowercase ASCII with single hyphens (`design-systems`) because they double as URL query values. Their visible labels live in `messages/core/*.json` and `client/messages/*.json`; `npm run i18n:add` adds a label for a new key to `client/messages/*.json`. Unknown keys still render, humanized (`design-systems` → “Design Systems”).

Covers are generated from code, one per blog group:
```bash
npm run assets:generate
```

#### Page layouts & the hero band
Unlike `blog` posts (which render uniformly through `BlogPostView.astro` + `PageHero.astro`), static `pages` give you full layout freedom via frontmatter in `src/content.config.ts`:

* **`hero`**: `'none'` (default — no forced banner), `'minimal'` (`src/components/PageHeader.astro` typographic header with breadcrumbs), or `'default'` (`src/components/PageHero.astro` atmospheric banner).
* **`container`**: `'canvas'` (default — full-bleed `<main>` for custom `<PageSection>` / `.layout-container` compositions), `'contained'` (`1280px` `.layout-container` + `.prose-wide`), or `'prose'` (`72ch` editorial column). Named `container` so it never collides with `@astrojs/mdx`'s reserved `layout` key.
* **`flushTop` & `template`**: Set `flushTop: true` when a custom `hero: 'none'` canvas starts directly under the fixed glass header, or set `template: '<name>'` to delegate rendering to a bespoke `.astro` view registered in `CLIENT_PAGE_TEMPLATES` (`client/templates/index.ts`) — or `template: 'home'` (`src/views/pages/`) — while sourcing localized copy/SEO from MDX.
* **Atmospheric `PageHero.astro` (Blog & `hero: "default"` pages)**:
  * The entry's `image` frontmatter **is** the background of the band — one full-bleed image layer, defocused (`blur-md scale-105`) under vertical/flat scrims so the band reads identically in LTR and RTL.
  * Inner copy is passed through the default slot: `HeroCopy.astro` for pages and the blog index, `BlogPostHeroContent.astro` for articles. Without an `image`, `src/assets/hero/hero-0.jpg` is used.

#### The image pipeline
Every picture on the site is served through Astro's image pipeline, never as a raw file:

* A group's artwork lives next to its entries (`src/content/<collection>/<group>/<group>.png`), because the frontmatter reference is relative to the entry file. The shared photograph is imported from `src/assets/hero/`.
* Astro's `image()` schema helper (`src/content.config.ts`) resolves the frontmatter reference against the entry file and checks that the file exists, so a path with no asset behind it fails the build instead of silently rendering a broken hero.
* `<Image>` renders WebP with a responsive `srcset`; the hero offers `sizes="100vw"` and the blog cards `(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 94vw` (aligned to the `1280px` `.layout-container`). The widths are capped at the width of the source, so a picture is never upscaled.
* `og:image` is resolved by `src/libs/content/social.ts`: with `brand.socialCardMode: 'branded'` (the shipped `app.config.json` default), `/og/[...slug].png.ts` renders deterministic `1200×630` RTL/LTR SVG→PNG cards via `sharp` (`src/libs/content/og-card.ts`); with `'artwork'`, the entry artwork is cropped to 1.91:1 JPEG; with `'default'`, `/og-default.png` is used.

#### Blog listing, filtering, and taxonomy
* The index at `/blog/` renders a responsive card grid with cover art, category badge, tags, date, and reading time.
* Category pills and tag chips filter the grid client-side and sync the URL (`?category=engineering&tag=astro,rtl`), so filtered views are shareable and deep-linkable. Tags combine with AND semantics; category and tag filters combine too.
* A live `role="status"` line reports how many articles match, and a “Clear filters” action appears whenever a filter is active. Without JavaScript every article stays visible — filtering is progressive enhancement.
* Post pages show the featured image, category/tag links back into the filtered index, reading time, and `articleSection`/`keywords` metadata.

#### Blog pagination
The index is paginated statically at build time, with progressive client-side pagination only when taxonomy filters are active on multi-page catalogs:

* The page size is a single value, `blog.postsPerPage` in merged `app.config.json` / `client/config.json` (default `9` — three columns × three rows), exposed as `POSTS_PER_PAGE` by `src/libs/config/app.ts`. The route builder, the view, and the smoke test read the same value, so the number of generated pages and the number of rendered cards can never drift apart.
* One page is one route, per locale. Page one is the index itself (`/blog/`), every later page lives under `/blog/page/<n>/` and is localized like every other URL (`/de/blog/page/2/`, `/fa/blog/page/2/`).
* The page count of a locale follows from the number of *published* posts that locale has, so a locale with fewer posts simply has fewer pages. Only locales that actually have page `N` appear in SEO `hreflang` alternates (strict reciprocity), while `uiAlternates` maps the language switcher gracefully to the last available page of shorter locales.
* When a user activates a category or tag filter on a multi-page blog, `BlogIndexView.astro` fetches `/api/blog-posts/<locale>.json`, filters across the entire locale collection, and renders a localized client-side pager (`?category=...&page=2`) with Lenis smooth-scroll coordination.
* `Seo.astro` and `BaseLayout.astro` accept `prevUrl` / `nextUrl` and emit `<link rel="prev">` / `<link rel="next">`; pages beyond the first get a distinct document title (`Blog — Page 2 of 3`).
* `npm run smoke` derives the expected page count from the content collection and asserts that every page exists, that `hreflang` links are strictly reciprocal, that `rel="prev"` / `rel="next"` links point at the right neighbours, and that no page beyond the last one was generated.

### 3. Adding a New Language
To add Spanish (`es`), Italian (`it`), or another language:
```bash
npm run i18n:add-lang -- es --name="Español" --dir="ltr" --with-content --from=en
```
The script automatically:
* Registers `es` and its metadata in `client/locales.json` (and syncs `.paraglide-work/` on compile).
* Creates `client/messages/es.json` (while `messages/core/es.json` is bootstrapped if needed).
* Generates `es.mdx` files for all existing pages and blog posts as drafts (`draft: true`); `--publish` does not override a `[TODO: ...]` placeholder title, so translate each file and flip its `draft` flag when it is ready.
* Merges two-tier dictionaries and recompiles Paraglide messages into `src/paraglide/`.

### 4. Swapping the Default Language & Single-Language Mode
To make Persian (`fa`) or Arabic (`ar`) the prefix-less default:
```bash
npm run i18n:set-default fa
```
Persian instantly routes to `/`, `/fa` prefix disappears (`/`), while English routes to `/en`, `/en/...`, etc.

**Single-language client deployment (no structural changes needed):**
Set `"ui": { "showLanguageSwitcher": false }` in `client/config.json` (plus `npm run i18n:set-default fa` if Persian should sit at `/`). All content folders and dictionaries stay intact without modifying core code. (If you also want to exclude alternate routes from `dist/` and `sitemap.xml`, you may optionally run `npm run i18n:solo fa`, which archives unused files under `.locale-archive/`.)

### 5. Writing RTL-Compatible Components
Always use logical properties instead of physical left/right classes:

| Instead of | Use (Logical) | Description |
| :--- | :--- | :--- |
| `ml-4` | `ms-4` | Margin inline start |
| `mr-4` | `me-4` | Margin inline end |
| `pl-6` | `ps-6` | Padding inline start |
| `pr-6` | `pe-6` | Padding inline end |
| `left-0` | `start-0` | Inset inline start |
| `right-0` | `end-0` | Inset inline end |
| `text-left` | `text-start` | Text alignment |
| `text-right` | `text-end` | Text alignment |
| `border-l` | `border-s` | Border inline start |
| `border-r` | `border-e` | Border inline end |
| `rounded-l` | `rounded-s` | Corner border radius start |
| `rounded-r` | `rounded-e` | Corner border radius end |

`<Button>` already rotates a directional icon (`arrow-right`, `chevron-left`, `chevron-right`) in RTL. For any other mirrored element — an icon passed to `<Icon>`, or a horizontal gradient — use Tailwind's `rtl:` variant:
```astro
<Icon name="arrow-right" class="rtl:rotate-180" />
<span class="bg-linear-to-r from-accent to-fg bg-clip-text text-transparent rtl:bg-linear-to-l">…</span>
```

### 6. Using the Glass Design System
Every frosted surface, button and chip in the project is defined **once**, in `src/styles/global.css`. Compose those classes instead of re-declaring the treatment in a component:

| Class | Use it for |
| :--- | :--- |
| `glass-surface` | The frosted navigation bar. |
| `glass-control` | A control inside the glass bar (icon button, locale switcher). |
| `ghost-control` | A control on an opaque panel (drawer, modal). |
| `cta` | The primary call to action. |
| `btn-secondary` | The outlined call to action. |
| `chip` | Pill-shaped filter and taxonomy chips. |

Text buttons go through one component, so only the colour, the text and the icon ever change:
```astro
<Button href={pricingHref} variant="primary" size="lg" icon="arrow-right">
  {m.common_get_started({}, { locale })}
</Button>
```

| Prop | Values |
| :--- | :--- |
| `variant` | `primary` (`cta`), `secondary` (`btn-secondary`), `hero` (`btn-hero-secondary`), `ghost` (`ghost-control`), `glass` (`glass-control`) |
| `size` | `sm` (`h-9`), `md` (`h-10`), `lg` (`h-11`), `auto` (caller-sized) |
| `href` | Present → renders `<a>`; absent → renders `<button type="…">` |
| `icon` / `iconPosition` | Semantic name from `src/libs/ui/icons.ts` plus `start` or `end`; `arrow-*` and `chevron-*` mirror in RTL and nudge forward on hover |
| `block`, `class` | Full width, and call-site utilities merged last |

Every button shares the hover lift and press from `src/libs/ui/button.ts`, which the blog pager's client renderer reuses, so a server-rendered control and a runtime one never drift apart.

Icon-only controls go through one component, so their size, shape and accessible name are consistent:
```astro
<IconButton icon="search" label={m.common_search_placeholder({}, { locale })} data-open-search />
```

The glass palette is tokenised (`--color-glass`, `--color-glass-control`, `--color-glass-border`, `--color-glass-hover`), so the translucency of the whole site is tuned from one place.

### 7. ChronoTrig v5.2.0 Scroll Reveals, Harmonic Staggers, Pins & Timelines
Entrance animations are scoped strictly under `<html class="js">` (`src/styles/chronotrig.css` + `src/scripts/chronotrig.ts`), never `display: none` or unscoped `opacity-0`, ensuring zero layout shift (CLS = 0) and 100% visibility when JavaScript is disabled or printed:

* **Single elements & reveal-once**: Add `data-trig` (optionally `data-trig-once="true"` to trigger once and unobserve cleanly) plus optional v5.2.0 presets/modifiers (`.fadeInUpSm`, `.blurIn`, `.clipUp`, `.clipStart`, `.trig-delay-100`..`1000`, `.trig-duration-*`, `.trig-ease-*`). In `.mdx` content, `.prose h2/h3/h4` are tagged automatically. Default reveals travel 56px over `1.2s` (`cubic-bezier(0.22, 1, 0.36, 1)`) after a `--trig-reveal-delay` (`180ms`) hold.
* **RTL-aware horizontal vectors**: Always use `data-trig-direction="start"` / `"end"` or `.clipStart` instead of physical `left` / `right` so horizontal motion mirrors automatically in `fa` and `ar`.
* **Harmonic staggered grids (`data-trig-stagger`)**: Put `data-trig-stagger` (plus optional `data-trig-stagger-mode="linear|wave|center|reverse"`, `data-trig-stagger-delay="0.08"`, `data-trig-once="true"`) on the parent grid/list. ChronoTrig targets `[data-trig-stagger-item], :scope > *`, seeds `--stagger-index` / `--stagger-delay` / `--stagger-total`, and activates children via `.trig-stagger-active`.
* **Pinned stages & timelines**: Use `[data-trig-pin]` (`data-trig-pin-distance`, `data-trig-pin-horizontal="true"` + `[data-trig-pin-track]`, `data-trig-pin-media`) and `[data-trig-timeline]`. `src/styles/global.css` sets `body { overflow-x: clip; }` (never `overflow-x: hidden`) so `position: sticky` inside pinned containers never breaks.
* **Interactive filter replays**: Filtering only toggles `card.hidden`, so reset the grid's reveal classes first (`replayGridReveals()` in `BlogIndexView.astro`) and then call `refreshChronoTrig()` from `@/scripts/chronotrig` (invokes `window.chronoTrig.refresh()`); existing cards then replay alongside newly appended ones. Never replay on the initial render. Add `[data-card][hidden] { display: none !important; }` when toggling `card.hidden` on flex/grid cards.
* **Motion preference**: `BaseLayout.astro`'s `<head>` `resolveMotion()` checks `localStorage.motion` and otherwise honors OS `prefers-reduced-motion: reduce`, setting `html[data-motion="reduced"]`. `chronotrig.css`, `lenis.ts` (syncing via `trigScroll?.()`), `global.css`, ChronoTrig's live `respectReducedMotion` watcher (`body.chronotrig-mobile-disabled`), and `@media print` all flatten or disable motion cleanly.
* **Lenis nested scroll isolation**: Add `data-lenis-prevent` to any scrollable modal, drawer, or overflow panel (`overflow-y-auto`).

---

## 🧪 Testing & Verification

Run the full quality assurance pipeline:

```bash
# 1. Upstream Contract & Separation Check
npm run upstream:check

# 2. TypeScript Strict Check
npm run lint

# 3. Vitest Unit Tests (25 files, 260 tests: paths, ICU, routes, blocks, theme, schema, OG, and CLI helpers)
npm test

# 4. i18n Parity, Placeholder, Content & Route Audit
npm run audit:i18n

# 5. Production Build & Pagefind Indexing (runs the audit first)
#    Locally it falls back to the dev origin in app.config.json with a warning;
#    in CI (CI=true) it fails unless SITE_URL is set.
SITE_URL=https://example.com npm run build

# 6. Post-Build HTML, SEO, Feed & Asset Smoke Test
npm run smoke

# 7. No-Build Health Check & Internal Link Crawl
npm run doctor
npm run link:check

# 8. Dead Code / Dependency Check
npm run knip

# 9. End-to-end check of every documented CLI workflow in an isolated sandbox
npm run verify:cli

# Optional: Seed or clean the demo Starter Kit package
npm run starter:seed
npm run starter:seed -- --clean --yes

# Regenerate icons, the Open Graph image, and all hero/cover artwork
npm run assets:generate
```

The same pipeline runs on every push and pull request in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) against a throwaway `SITE_URL`.

---

## 📚 Documentation

| Document | Language | Contents |
| --- | --- | --- |
| [docs/GUIDE-FA.md](docs/GUIDE-FA.md) | فارسی | راهنمای جامع کاربر: همهٔ ویژگی‌ها با مثال (نصب، محتوا، CLI، RTL، وبلاگ، SEO، استقرار) |
| [docs/GUIDE-HOMEPAGE-FA.md](docs/GUIDE-HOMEPAGE-FA.md) | فارسی | راهنمای گام‌به‌گام ساخت صفحهٔ اصلی سفارشی برای پروژهٔ مشتری (سه مسیر، بلوک‌های آماده، چک‌لیست تحویل) |
| [docs/CONTENT-TYPES-FA.md](docs/CONTENT-TYPES-FA.md) | فارسی | انواع محتوا: رجیستری، فعال/غیرفعال کردن، افزودن مجموعهٔ جدید و دستورهای content/doctor/link |
| [README.md](README.md) | English | Feature overview, quick start, and operational guide |
| [AGENTS.md](AGENTS.md) | English | Contract rules and playbooks for AI coding agents |
| [docs/PRD.md](docs/PRD.md) | English | Master build prompt: goals, architecture, and definition of done |
| [docs/PLAYBOOKS.md](docs/PLAYBOOKS.md) | English | Step-by-step playbooks for common changes |
| [.agents/skills/astro-i18n-starter/references/scroll-and-motion.md](.agents/skills/astro-i18n-starter/references/scroll-and-motion.md) | English | Deep-dive reference on `data-trig`, `data-trig-stagger`, replaying filtered grids, and Lenis |

---

## 📄 License

Released under the [MIT License](LICENSE). Use it as the base for commercial and private projects; keep the copyright notice.
