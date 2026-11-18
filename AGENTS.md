# AGENTS.md — AI Agent Operating Manual & Repository Guide

> **Target Audience:** AI Coding Agents (Claude Code, Cursor, Copilot, Codex, Gemini, Windsurf).  
> **Repository:** Production-Grade Astro v7 SSG Multilingual Starter with Native RTL/LTR Support.  
> **Version:** 5.1

---

## 1. Prime Directive & Contract Rules

When working in this repository, you **MUST** follow these non-negotiable rules:

1. **One Source of Truth (SSOT) & Three-Tier Ownership**:
   - **Upstream Core** (`src/`, `app.config.json`, `messages/core/`, `scripts/`), **Client Workspace** (`client/`), and **Optional Demo Package** (`starter-kit/`). Client customizations live in `client/` so upstream updates merge cleanly.
   - Locales & directions: `client/locales.json` (typed & re-exported via `src/i18n/locales.ts`).
   - Locale-native numbers & dates: `src/i18n/format.ts` (`formatNumber`, `formatYear`, `formatDate`, `formatDateTime`).
   - Paths & URLs: `src/i18n/paths.ts` (`localizeHref`, `localeHref`, `stripLocale`).
   - Content schemas: `src/content.config.ts` spreads `clientCollections` from `client/content.ts`.
   - Content types (enabled/disabled, route base, index/pagination/feed/nav): `app.config.json` merged with `client/config.json` → `content.types`, validated and typed by `src/libs/content/types.ts` (client UI metadata from `CLIENT_CONTENT_TYPES` in `client/content.ts`). **Switching a type off removes its routes, sitemap entries and navigation links** — never delete the collection to hide a section.
   - Slugs, feeds, alternates & home URL: `src/libs/content/service.ts` (`getHomeHref` is the one home URL for chrome, breadcrumbs and feeds — it falls back to the default locale when a locale's home page is not translated) and `src/libs/content/feed.ts`.
   - Content entry invariants (IDs, drafts, locale selection, sorting): `src/libs/content/entries.ts`.
   - Blog filters & reading time: `src/libs/content/blog.ts`; taxonomy labels: `src/libs/content/taxonomy.ts`.
   - Application config: `app.config.json` + sparse overrides in `client/config.json`, validated and typed by `src/libs/config/app.ts` (`siteConfig`, `POSTS_PER_PAGE`, `API_CONFIG`, `COOKIE_CONFIG`, `UI_CONFIG`, `BLOG_CONFIG`, `SOCIAL_CONFIG`, `BUSINESS_CONFIG`, brand logo/theme presets, dev server). `ui.ctaPage` names the page group the header/drawer CTA points at (hides itself if unpublished), and `ui.showLanguageSwitcher: false` turns the starter into a single-language storefront cleanly without structural locale deletion. Brand logo (`brand.logo`), palette & font tokens (`brand.preset`, `primaryColor`, `accentColor`, `fontPreset`, `rtlFontPreset` including commercial Persian hooks in `client/styles.css`, `socialCardMode`) resolve via `src/libs/config/theme.ts` and `theme-presets.json` (plus `import.meta.env.DEV`-only `DevThemePreview.astro`). Modules that ship to the browser read `src/libs/config/client.ts` (and shared defaults in `defaults.ts`) instead of `app.ts`: the validator runs at import time, so a client import of `app.ts` drags the whole Zod runtime onto every page. Components, views, pages and Node scripts keep using `app.ts`.
   - Navigation: `client/navigation.ts` (`CLIENT_PAGE_ITEMS`, `getClientPrimaryExtras`, `getClientFooterColumns`, `getClientLegalNavigation`) consumed by `src/libs/config/navigation.ts` — one `buildPrimaryNavigation` shared by the header and the drawer, plus `getFooterNavigation` / `getLegalNavigation`. Anchor links only emit while their target page exists.
   - Blog pagination & Collection filters: `blog.postsPerPage` in merged config (`POSTS_PER_PAGE`), math in `src/libs/content/pagination.ts` (`paginate`, `buildPageWindow`), URLs in `src/libs/content/service.ts` (`getBlogPageHref`). Generic collections (`projects`, etc.) share category, tech `stack`, and keyword search filtering in `CollectionIndexView.astro` (`refreshChronoTrig()`).
   - Search & Perso-Arabic indexing: `scripts/index-pagefind.mjs` (build-time Pagefind normalization), `src/libs/search/persian.ts` (ZWNJ/orthography/numeral query expansion & fallback folding), and `src/libs/search/client.ts`.
   - External API & Consent (Pure SSG, Zero Backend): `src/libs/api/client.ts` (`ContactForm.astro` and `NewsletterBanner.astro` post directly to external/headless endpoints via `api.provider`: `'custom' | 'web3forms' | 'formspree' | 'basin' | 'webhook'`, optional Cloudflare Turnstile `turnstileSiteKey` / `PUBLIC_TURNSTILE_SITE_KEY`, `accessKey` / `PUBLIC_WEB3FORMS_KEY`, or `PUBLIC_API_BASE_URL` / `PUBLIC_CONTACT_API_URL` / `PUBLIC_NEWSLETTER_API_URL`) and `src/libs/cookies/` (`CookieConsent.astro`). A site without a configured endpoint renders **no form**: `*_fallback_desc` + a `mailto:` button come from `site.contactEmail`, `*_unavailable_desc` replaces them when that address is empty (never promise an email channel the site does not have), and the developer setup note is `import.meta.env.DEV`-only, so visitors never read environment-variable names. Never add SSR servers or backend folders.
   - Structured data & Branded RTL OG cards: `src/libs/content/schema.ts` generates `Organization` / `LocalBusiness` / `Service` JSON-LD from `business` + `social`; `src/libs/content/og-card.ts` shapes RTL SVG→PNG cards with explicit `direction="rtl"` / `unicode-bidi="embed"`.
   - UI copy: Two-tier Paraglide dictionaries (`messages/core/<locale>.json` + `client/messages/<locale>.json`) merged into `.paraglide-work/` and compiled to `@/paraglide/messages`. Call `m.<key>({}, { locale })` and never hardcode UI text.
   - Icons: Core 66 icons in `src/libs/ui/icons.ts` + `src/components/Icon.astro`, extendable via `client/icons.ts` (`CLIENT_ICONS`, `CLIENT_DIRECTIONAL_ICONS`) and `client/ClientIcons.astro`. Names are semantic; templates never carry raw `<svg>`, and client code clones server-rendered icons instead of writing paths.
2. **Lean Router Dispatcher Pattern**:
   - Never create dynamic routing files (`[lang].astro`, `[slug].astro`) under `src/pages/`.
   - All dynamic routing flows exclusively through `src/pages/[...path].astro`, which dispatches to views in `src/views/` (`PageView`, `BlogIndexView`, `BlogPostView`, and the generic `CollectionIndexView` / `CollectionEntryView` used by registry-driven types such as `projects`). `/api/*.json` endpoints are strictly build-time static JSON catalogs.
3. **Prefix-less Default Locale**:
   - The default locale (`DEFAULT_LOCALE = 'en'`) has **no prefix** (`/`, `/about/`, `/blog/first-post/`).
   - Non-default locales (`fa` out of the box; `ar`, `de`, `fr`, etc. when added via `npm run i18n:add-lang`) have prefixes (`/fa/درباره-ما/`, `/de/about/`, `/ar/من-نحن/`).
   - Never write hardcoded `/en/` or `/fa/` paths in templates or logic.
4. **RTL-Native Discipline**:
   - Always use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`, `border-e-*`).
   - Never use physical directions (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`).
   - Gradients are directional too: a horizontal one is written `bg-linear-to-r rtl:bg-linear-to-l` so its start colour sits at the reading start, and text clipped with `bg-clip-text` resets to `print:bg-none print:text-fg`.
   - Code blocks (`pre`, `code`, `.math`) are strictly isolated to `ltr` via `src/styles/prose.css`.
5. **Untouchable Generated Code**:
   - `src/paraglide/` and `.paraglide-work/` are auto-generated by `scripts/messages-compile.mjs` + `@inlang/paraglide-js`. **Never hand-edit files in `src/paraglide/` or `.paraglide-work/`**. Edit `client/messages/<locale>.json` (or `messages/core/<locale>.json` for upstream) and run `npm run messages:compile`.
6. **Static Language Switching**:
   - Language switching uses full static browser navigation (`window.location.assign(target)`) rather than SPA transitions so `<html lang="..." dir="...">`, font stacks, and `:lang()` rules apply cleanly.
7. **Idempotent Client Scripts**:
   - With `<ClientRouter />`, `astro:page-load` fires on initial load and every client transition. Guard DOM element listeners with `if (el.dataset.bound === 'true') return; el.dataset.bound = 'true';`.
8. **Render-Time Message Invocation**:
   - Call `m.<key>({}, { locale })` inside component render cycles or templates. Never call message functions at module evaluation scope.
9. **Shared Visual Language & Page Layout Architecture**:
   - Semantic colour roles (`primary`, `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, `error` and their `-fg` partners) live **only** in `src/styles/global.css`. Never hardcode hex values in components; compose semantic roles instead.
   - Standard desktop width (`max-w-7xl` / `1280px` with responsive logical inline gutters) is defined once via `.layout-container` in `src/styles/global.css`. Frosted surfaces, buttons and chips live **once** in `src/styles/global.css` (`.glass-surface`, `.glass-control`, `.ghost-control`, `.cta`, `.btn-secondary`, `.chip`). Compose them rather than re-declaring treatments.
   - Text buttons are rendered by `src/components/Button.astro` (colour from `variant`: `primary`/`secondary`/`hero`/`ghost`/`glass`, scale from `size`, plus `icon`), whose class recipe lives in `src/libs/ui/button.ts` (`buttonClasses()`) and is shared with client-side renderers such as the blog pager. In these components only the colour, the text and the icon change; navigation renders an `<a>`, actions render a `<button>`.
   - Icon-only controls are rendered by `src/components/IconButton.astro`. Never hand-roll a `<button>` with an `<Icon>` inside.
   - **Flexible `pages` Content Collection**: Unlike `blog` entries (which share `BlogPostView.astro`), `pages` entries default to `hero: 'none'` and `container: 'canvas'` in `src/content.config.ts` so every page has complete design freedom (`<PageSection>`, `.layout-container`, custom grids). Pages may opt into `hero: 'minimal'` (`PageHeader.astro`), `hero: 'default'` (`PageHero.astro` + `HeroCopy.astro`), `container: 'contained'` (`.layout-container` + `.prose-wide`), `container: 'prose'` (`72ch` editorial column), `flushTop: true`, or a shared bespoke Astro template in `src/views/pages/` via `template: '<name>'`. Never use `layout` in MDX frontmatter (reserved by `@astrojs/mdx`).
   - Article chrome (TOC, related posts, newer/older links, code-copy buttons) and `@media print` flattening live once in `BlogPostView.astro` / `BaseLayout.astro` and `src/styles/global.css`.
10. **ChronoTrig v5.2.0 CSS Scroll Engine & Lenis Smooth Scroll**:
   - Viewport reveals, pinned stages, harmonic staggers, and keyframe timelines are powered by **ChronoTrig v5.2.0** (`public/chronotrig.min.js`, coordinator in `src/scripts/chronotrig.ts`, styles in `src/styles/chronotrig.css`). Standard reveals use `data-trig` (plus optional `data-trig-once="true"` to unobserve and release `will-change: auto` once settled) and v5.2.0 reveal presets/modifiers (`.fadeInUpSm`, `.blurIn`, `.clipUp`, `.clipStart`, `.trig-delay-*`, `.trig-duration-*`, `.trig-ease-*`, `.trig-reactive-*`). All initial reveal states remain scoped under `.js` for zero CLS and 100% visibility when JS is disabled or printed.
   - Always use logical horizontal directions (`data-trig-direction="start"` / `data-trig-direction="end"`, `.clipStart`) rather than physical `left`/`right` so animations mirror automatically in RTL (`fa`, `ar`).
   - In `[data-trig-stagger]` containers, ChronoTrig targets `[data-trig-stagger-item], :scope > *` and natively computes `--stagger-index`, `--stagger-delay` (`data-trig-stagger-mode`: `'linear' | 'wave' | 'center' | 'reverse'`), and `--stagger-total` (clamped `<= 0.04s` on lightweight mobile), activating children via `.trig-stagger-active`. Never overwrite `--stagger-delay` manually before `scan()`. When dynamically appending cards, call `refreshChronoTrig()` from `@/scripts/chronotrig` (which invokes `window.chronoTrig.refresh()`). When a client-side filter changes which cards are visible, reset the grid's reveal classes first (`replayGridReveals()` in `BlogIndexView.astro`) and then call `refreshChronoTrig()`, so surviving cards animate too — never replay on the initial render.
   - **Pinned Sections & Timelines**: `[data-trig-pin]` (`data-trig-pin-distance`, `data-trig-pin-horizontal="true"` + `[data-trig-pin-track]`, `data-trig-pin-media`) and `[data-trig-timeline]` require `overflow-x: clip` (never `overflow-x: hidden`) on `body` (`src/styles/global.css`) and ancestor elements so `position: sticky` stays functional.
   - Entrance timing lives in `src/styles/chronotrig.css`: 56px travel, `1.2s` (`1.1s` for stagger cards) on `cubic-bezier(0.22, 1, 0.36, 1)`, plus a `--trig-reveal-delay` (180ms) hold. Motion is unified synchronously in `BaseLayout.astro`'s `<head>` (`resolveMotion()`): it checks `localStorage.getItem('motion')` (`'reduced' | 'full'`), otherwise honors OS `prefers-reduced-motion: reduce`, and sets `html[data-motion]`. `chronotrig.css`, `lenis.ts` (syncing via `window.chronoTrig.trigScroll?.()`), `global.css`, `respectReducedMotion` (`body.chronotrig-mobile-disabled`), and `@media print` flatten or disable motion cleanly whenever reduced/disabled.
   - Add `data-lenis-prevent` to any nested scrollable overlay/panel (`overflow-y-auto`), and keep `html { scroll-behavior: auto; }` so Lenis (`src/scripts/lenis.ts`) controls smooth scrolling without conflict. See `.agents/skills/astro-i18n-starter/references/scroll-and-motion.md`.

---

## 2. Directory Layout & Architectural Map

```text
/
├── .agents/skills/            # Agent skills (astro-i18n-starter/SKILL.md + references/)
├── .pages.yml                 # Pages CMS schema for visual client content editing
├── app.config.json            # Upstream core defaults (site, brand, business, content types, blog, cookies, API, server)
├── client/                    # Client-owned workspace (survives upstream merges cleanly):
│   ├── config.json            # Sparse overrides merged onto app.config.json
│   ├── locales.json           # SSOT for active locales, defaultLocale, and metadata (dir, font, htmlLang)
│   ├── messages/              # Client translation overrides & new keys (<locale>.json)
│   ├── navigation.ts          # CLIENT_PAGE_ITEMS + custom primary extras, footer columns & legal links
│   ├── content.ts             # Custom Astro contentCollections & CLIENT_CONTENT_TYPES UI metadata
│   ├── icons.ts & ClientIcons.astro # Extra client Tabler icons merged into <Icon />
│   ├── LayoutHooks.astro      # Custom <head> / <body>-end slots inside BaseLayout
│   ├── styles.css             # Client CSS tokens & @font-face commercial Persian font slots (@source "../../client")
│   └── templates/index.ts     # Custom page templates merged into PageView.astro
├── docs/deploy/nginx.conf     # Production Nginx SSL, security headers, caching & bilingual 404 config
├── messages/core/             # Upstream core UI dictionaries (en.json, fa.json)
├── starter-kit/               # Optional demo pages, blog posts, projects & industry blueprints (`npm run starter:seed`)
├── public/                    # Static assets (_headers, chronotrig.min.js, favicons, manifest, default OG)
├── scripts/                   # Developer CLI automation, health checks, Pagefind indexing & upstream checks (lib/)
│   └── lib/                   # Shared config, blueprints, merge-messages, prompt, frontmatter, content-stub, slug, validation, locale-mutations, content-type & artwork helpers
├── src/
│   ├── assets/hero/hero-0.jpg # Shared hero photograph fallback
│   ├── components/            # Core UI & chrome (Icon, IconButton, Button, HomeHero, ThemeToggle, DevThemePreview, LanguageSwitcher, DrawerNavLink, PageHeader, PageHero, PageSection, HeroCopy, BlogPostHeroContent, PostCard, SearchModal, DrawerSearch, CookieConsent, ContactForm, Seo, TopLoadingBar)
│   │                          # + 19 composable section blocks & 3 UI primitives (LandingHeroSplit, PromoBanner, PartnerLogos, AboutSplitSection, BentoCapabilities, FeatureTabsSection, ProcessSteps, FeatureCardGrid, ProofStatsRow, ComparisonTable, PricingSection, TestimonialGrid, ImageGallerySection, LatestPostsSection, TeamSection, FaqAccordion, ContactSplitSection, NewsletterBanner, CtaBanner, UiBadge, UiAlert, AvatarGroup)
│   ├── content/               # Symmetrical content collections:
│   │   ├── pages/<group>/     # Static pages (<locale>.mdx per active locale + hero artwork)
│   │   ├── blog/<group>/      # Blog posts with localized slugs (+ cover artwork)
│   │   └── projects/<group>/  # Case studies/portfolio entries (registry-driven type with category/stack/search filters)
│   ├── i18n/                  # Core i18n engine:
│   │   ├── locales.ts         # SSOT for LOCALES, DEFAULT_LOCALE, metadata (dir, font, name)
│   │   ├── format.ts          # Locale-native Intl number & date/time formatters (Solar Hijri for fa)
│   │   └── paths.ts           # Pure URL utilities (localizeHref, localeHref, stripLocale, getPathname)
│   ├── layouts/               # BaseLayout.astro (HTML head, prefetch, .js + data-motion init, brand.logo, DevThemePreview, header, drawer, footer)
│   ├── libs/                  # Core services:
│   │   ├── api/client.ts      # Pure client-side HTTP adapter for external APIs & serverless forms (custom, web3forms, formspree, basin, webhook + Turnstile)
│   │   ├── config/app.ts      # Validates merged app.config.json + client/config.json; typed site/brand/business/blog/api values & hero defaults
│   │   ├── config/client.ts   # Browser-safe config reader (zero Zod runtime in client bundle) + defaults.ts
│   │   ├── config/theme.ts    # OKLCH brand palette & font preset resolver (+ theme-presets.json)
│   │   ├── config/navigation.ts # Multi-menu header/drawer/footer/legal navigation builder
│   │   ├── content/entries.ts # Entry ID parsing, draft filtering, locale selection, sorting
│   │   ├── content/schema.ts  # Organization / LocalBusiness / Service JSON-LD schema builders
│   │   ├── content/service.ts # getSiteRoutes(), getPageUrl(), getBreadcrumbs(), getRssFeedHref()
│   │   ├── content/types.ts   # Content-type registry (enabled/base/index/paginated/feed/nav) + URL & label helpers
│   │   ├── content/blog-catalog.ts # Shared serializer for static blog JSON catalogs
│   │   ├── content/faq.ts     # FAQPage JSON-LD builder used by FaqAccordion
│   │   ├── content/feed.ts    # Per-locale Atom 1.0 feed builder
│   │   ├── content/og-card.ts # Build-time SVG→PNG branded Open Graph card renderer with RTL shaping
│   │   ├── content/pagination.ts # Pure paginate() + buildPageWindow() helpers
│   │   ├── content/social.ts  # Social card resolver (branded / artwork / default)
│   │   ├── cookies/           # TDDDG § 25 / GDPR consent model & multi-domain script gatekeeper
│   │   ├── search/            # client.ts + persian.ts (Pagefind & dev fallback with Persian ZWNJ/orthography expansion)
│   │   ├── ui/button.ts       # The button class recipe (`buttonClasses`) behind Button.astro and client renderers
│   │   └── ui/icons.ts        # Core 66-icon vocabulary + `client/icons.ts` extension (SITE_ICONS) shared by Icon.astro and tests
│   ├── pages/                 # Minimal physical pages:
│   │   ├── [...path].astro    # Lean Router Dispatcher
│   │   ├── 404.astro          # Path-prefix locale-aware 404 page
│   │   ├── og/[...slug].png.ts # Build-time branded OG PNG route (`socialCardMode: 'branded'`)
│   │   ├── site.webmanifest.ts # Web app manifest generated from app.config.json
│   │   ├── rss.xml.ts         # Default-locale Atom feed
│   │   ├── rss/[locale].xml.ts # Non-default locale Atom feeds (/rss/<locale>.xml)
│   │   ├── sitemap.xml.ts     # Multi-lingual sitemap with x-default + lastmod
│   │   ├── robots.txt.ts      # Robots.txt pointing to sitemap
│   │   ├── api/blog-posts.json.ts # Combined static blog catalog fallback
│   │   ├── api/blog-posts/[locale].json.ts # Per-locale static blog catalog for filtered pagination
│   │   ├── api/search-dev.json.ts # Combined locale-aware search fallback index
│   │   └── api/search-dev/[locale].json.ts # Per-locale static search fallback index
│   ├── paraglide/             # AUTO-GENERATED compiled messages (DO NOT EDIT)
│   ├── scripts/               # Client modules: chronotrig.ts, lenis.ts (smooth scroll)
│   ├── styles/                # global.css (.layout-container + OKLCH palette + glass + print), prose.css, chronotrig.css
│   ├── types/                 # tabler-icons-astro.d.ts: types for the per-icon deep imports used by Icon.astro
│   └── views/                 # Presentation views (PageView, BlogIndexView, BlogPostView, CollectionIndexView, CollectionEntryView + pages/HomePageTemplate)
```

---

## 3. Essential Commands & Verification Suite

| Command | Purpose | When to Run |
| :--- | :--- | :--- |
| `npm run messages:compile` | Merges `messages/core/*.json` + `client/messages/*.json` into `.paraglide-work/` and compiles `src/paraglide/` | After modifying dictionary keys or `client/locales.json` |
| `npm run upstream:check` | Verifies two-tier config/message parity, `client/` extension files, core-to-client hooks, and `starter-kit/` decoupling | Before commits, upstream pulls, and CI |
| `npm run starter:seed` | Seeds optional `starter-kit/` demo pages, posts, projects & messages into `src/content/` & `client/` (`--clean` resets) | When onboarding or resetting demo content |
| `npm run lint` | Messages compile + `astro check` + `tsc --noEmit` | After any code changes |
| `npm test` | Vitest unit tests (paths, ICU, routes, CLI helpers, scroll reveal, interactive views) | After routing, UI, or logic changes |
| `npm run audit:i18n` | Locale-config parity, two-tier dictionary/placeholder parity, content parity, route collisions & RTL logical property guard | Before commits & builds |
| `npm run verify:cli` | End-to-end check of every documented CLI workflow in an isolated sandbox | After changing anything under `scripts/` |
| `npm run doctor` | No-build health check: runtime, merged config, content types, dictionaries, content, `SITE_URL` | After cloning a project or before a client hand-off |
| `npm run content:list` / `content:status` | Content types and their entries / per-locale readiness matrix | When auditing what is published |
| `npm run link:check` | Crawls `dist/` and reports internal links and `#fragment` anchors that resolve to nothing | After a rename or before delivery |
| `npm run build` | `messages:compile` + audit + `astro build` + `node scripts/index-pagefind.mjs` | After major changes |
| `npm run smoke` | HTML, SEO, feed, asset & H1 assertions on `dist/` | After every production build |
| `npm run knip` | Dead files, exports, and dependencies | Before releases |
| `npm run assets:generate` | Regenerate PNG icons, OG image and hero/cover artwork | After brand changes or adding content groups |

### Dev Server Management
Start the server in background mode (`astro dev --background`) and manage via `astro dev status`, `astro dev logs`, and `astro dev stop`. After `npm install` (or `node_modules` changes), **restart the dev server** so Vite refreshes its module graph.

---

## 4. Built-in CLI Automation Suite (`scripts/`)

Execute these scripts instead of performing brittle manual file manipulations:

### 4.1 Client Onboarding & Content Scaffolding
* **Initialize client identity, industry blueprint, brand palette, fonts, OG mode & modules:**
  ```bash
  npm run site:init -- --name="Acme Studio" --blueprint=agency --rtl-font=vazirmatn --og-mode=branded --yes
  ```
  Run interactively or headlessly (`--yes`). Writes sparse overrides to `client/config.json` (optionally applying `--blueprint=corporate|agency|portfolio|medical` presets for palette, fonts, `business.type`, `ui.ctaPage`, and modules), syncs `site_description` in `client/messages/`, adjusts language mode, and refreshes brand assets.

* **Seed or clean optional demo Starter Kit content:**
  ```bash
  npm run starter:seed -- --blueprint=corporate --yes  # installs demo content + blueprint overrides
  npm run starter:seed -- --clean --yes                # removes demo content and returns to clean minimal base
  ```

* **Create or update a static page group across all active locales:**
  ```bash
  npm run new:page <page-key> [--title="<Title>"] [--from=<source-locale>] [--preset=standard|landing] [--hero=none|minimal|default] [--container=canvas|contained|prose] [--image=cover.png|none] [--publish]
  npm run new:page <page-key> --update [--sync-frontmatter] [--title="<New Title>"] [--desc="<New Desc>"] [--hero=...] [--container=...]
  ```
  Creates/updates `src/content/pages/<key>/<locale>.mdx` across all active locales in `client/locales.json`, generates localized slugs, preserves body copy, registers `nav_<key>` in `client/messages/*.json`, and wires `image` frontmatter (`./<key>.png` via `assets:generate` by default). Note the 3 presentation layers: schema defaults (`hero: "none"`, `container: "canvas"`), standard `new:page` defaults (`hero: "default"`, `container: "contained"`), and `--preset=landing` (`hero: "none"`, `container: "canvas"`, `flushTop: true` with starter composable landing blocks). `--sync-frontmatter` aligns structural/shared frontmatter (`image`, `hero`, `container`, `flushTop`, `template`) across locales. Without `--publish`, only the source locale is `draft: false`; locales with `[TODO: ...]` placeholders always remain drafts.

* **Manage a content type (enable/disable) and scaffold an entry in any type:**
  ```bash
  npm run content:list                                  # state, route base, entry counts
  npm run content:disable projects                      # writes override to client/config.json; content kept
  npm run content:enable projects
  npm run content:new projects atlas --title="Atlas" --publish
  ```
  `content:new` delegates `pages`/`blog` to `new:page`/`new:post`. Disabling a type never touches files; it only writes `content.types.<type>.enabled` into `client/config.json`.

* **Create or update a blog article across all active locales:**
  ```bash
  npm run new:post <group-slug> [--from=<source-locale>] [--title="<Title>"] [--category=<cat>] [--tags="a,b"] [--publish]
  npm run new:post <group-slug> --update [--sync-frontmatter] [--title="<New Title>"] [--desc="<New Desc>"]
  ```
  Creates/updates `src/content/blog/<slug>/<locale>.mdx` across all active locales with synchronized frontmatter (`categories`, `tags`, `image`, `publishedAt`, `author`). Use `--clone-from=<group>` to copy an existing article's body.

### 4.2 Content Removal
```bash
npm run remove:page <page-key> [--locale=<locale>] [--force]
npm run remove:post <group-slug> [--locale=<locale>] [--force]
```
Deletes the content folder, cleans `nav_<key>` from `client/messages/*.json` (unless `--locale` or `--no-clean-nav` is passed), and recompiles Paraglide.

### 4.3 Language Management
```bash
npm run i18n:add-lang -- <locale-code> [--name="<Name>"] [--dir="ltr|rtl"] --with-content --from=en
npm run i18n:remove-lang -- <locale-code> --with-content --force
npm run i18n:set-default <locale-code> [--allow-draft]
npm run i18n:solo <locale-code> [--keep-content|--delete-content] [--allow-draft] [--force]
```
`i18n:add-lang` / `remove-lang` update `client/locales.json` and `client/messages/<locale>.json` (never modifying core `src/i18n/locales.ts` or `messages/core/`), scaffold/clean `<locale>.mdx` files, and recompile Paraglide. `i18n:set-default` swaps the root (prefix-less) language safely. `i18n:solo` is an optional command for unregistering other locales and archiving them under `.locale-archive/` when excluding alternate URLs from `dist/` and `sitemap.xml` (for ordinary single-language client launches, `"ui": { "showLanguageSwitcher": false }` in `client/config.json` requires zero structural edits).

### 4.4 Translation & Styling Automation
```bash
npm run block:adapt -- --file=<path-to-component-or-view>
npm run i18n:extract -- --target=<file-or-dir> --key=<namespace> --auto-add --replace
npm run i18n:add -- --category=<cat> --key=<key> --en="English" --fa="فارسی" --ar="العربية" --de="Deutsch" --fr="Français"
npm run i18n:add-batch -- --file=translations.json [--category=<cat>]
```

---

## 5. Playbooks for Common Agent Tasks

### Playbook A: Adding a New Navigation Link
1. Ensure `src/content/pages/<page-key>/` exists (`npm run new:page <page-key>` scaffolds it and registers `nav_<page-key>` in `client/messages/`).
2. Add **one** entry to `CLIENT_PAGE_ITEMS` in `client/navigation.ts` — the shared list behind the desktop header and the mobile drawer — including its `icon` (a name from `src/libs/ui/icons.ts` or `client/icons.ts`; the drawer renders it, and a missing one falls back to `file`). Use `getClientFooterColumns` / `getClientLegalNavigation` in `client/navigation.ts` for footer-only or legal links.
3. Everything consumes `getNavigationSlots()`, which skips pages that are missing or draft in a locale and emits anchor links only while their target page exists.
4. Run `npm run lint && npm test && npm run audit:i18n`.

### Playbook B: Swapping Default Locale & Single-Language Mode
- **Swap root (prefix-less) default locale:**
  Run `npm run i18n:set-default fa` (updates `defaultLocale` in `client/locales.json` and recompiles Paraglide).
- **Single-language client deployment (no structural changes needed):**
  Set `"ui": { "showLanguageSwitcher": false }` in `client/config.json` (plus `i18n:set-default <locale>` if the root site `/` should be Persian or another locale). Alternate locale folders remain intact on disk for future expansion.
- **Optional strict solo archive (prune alternate routes from `dist/` & `sitemap.xml`):**
  Run `npm run i18n:solo <locale>` (archives inactive client dictionaries and `.mdx` files under `.locale-archive/`).
- Verify with `npm run messages:compile && npm test && npm run audit:i18n && npm run build && npm run smoke`.

### Playbook C: Page Heroes & Custom Page Design
- **Custom Canvas Pages (default in schema):** Omit `hero` (or set `hero: "none"`, `container: "canvas"`, optional `flushTop: true`) in `src/content/pages/<group>/<locale>.mdx` to compose arbitrary full-bleed sections (`<PageSection>`, `.layout-container`, custom grids) — or set `template: "<name>"` to delegate to a shared client `.astro` view registered in `client/templates/index.ts` (`CLIENT_PAGE_TEMPLATES`) and resolved by `src/views/PageView.astro`. Never use `layout` in MDX frontmatter (reserved by `@astrojs/mdx`); always use `container`. Ensure every page renders **exactly one `<h1>`**.
- **Minimal Typographic Header:** Set `hero: "minimal"` to render `src/components/PageHeader.astro` (breadcrumbs, accent rule, `<h1>`, description) without a blurred background banner.
- **Atmospheric Hero Band (`hero: "default"` & Blog):** Rendered by `src/components/PageHero.astro` — the entry's `image` (`./<group>.png` resolved via `image()` in `src/content.config.ts`, or `DEFAULT_HERO_IMAGE` fallback) is the single full-bleed defocused (`blur-md scale-105`) background layer under vertical/flat scrims, rendered with `<Image>` (`transition:persist`) and `HeroCopy.astro` / `BlogPostHeroContent.astro` inside its slot.

### Playbook D: Adding an Icon
Icons come from `@tabler/icons-astro`; nothing else renders an `<svg>` in a template.
1. For **client projects**, add the semantic name to `CLIENT_ICONS` (and `CLIENT_DIRECTIONAL_ICONS` if directional) in `client/icons.ts`, and map it in `client/ClientIcons.astro` using the **individual** Tabler module (`import IconStar from '@tabler/icons-astro/dist/esm/icons/star.mjs'`). Never import from the package barrel: it re-exports all 6,258 icons, so Vite loads the whole set before tree-shaking (measured ≈ +2–7 s per build, same HTML output). Core icons live in `src/libs/ui/icons.ts` + `src/components/Icon.astro`.
2. Render with `<Icon name="star" size={20} class="text-primary" />` or `<IconButton icon="star" label="..." />`. Never paste raw `<svg>`/`<path>` blobs in templates.
3. Icon-only button: `<IconButton icon="star" label="..." />`. Text button: `<Button variant="primary" icon="star">Label</Button>`.
4. For an icon that appears *after* load (a pager, a copied state), render it inside a `<template data-icon-template="…">` and clone it in the script; for a state swap, render both glyphs and let CSS choose (`theme-icon-*`, `code-copy-*`). Never hand-write SVG paths in client code.

### Playbook E: Changing the Blog Pagination
1. Set `"blog": { "postsPerPage": <n> }` in `client/config.json` (merged onto `app.config.json` and exposed as `POSTS_PER_PAGE`).
2. Build URLs exclusively with `getBlogPageHref(page, locale)` and slice with `paginate()` / `buildPageWindow()` from `src/libs/content/pagination.ts`.
3. Run `npm run lint && npm test && npm run audit:i18n && npm run build && npm run smoke`.

### Playbook F: Adding Viewport Reveals, Staggered Grids & ChronoTrig v5.2.0 Motion
1. Use `data-trig` (optionally with `data-trig-once="true"` for one-shot unobtrusive reveals and v5.2.0 preset/modifier classes like `.fadeInUpSm`, `.blurIn`, `.clipUp`, `.trig-delay-100`) on elements, sections, or cards. Avoid inventing non-existent attributes like `data-trig-delay`.
2. For horizontal entrances, use `data-trig-direction="start"` / `data-trig-direction="end"` or `.clipStart` so RTL locales mirror automatically.
3. For grids and lists, add `data-trig-stagger data-trig-stagger-delay="0.08"` (and optional `data-trig-stagger-mode="linear|wave|center|reverse"` + `data-trig-once="true"`) on the parent container; tag direct children or nested `[data-trig-stagger-item]` elements.
4. For sticky scrollytelling (`[data-trig-pin]`, `[data-trig-pin-horizontal="true"]`) and multi-step `[data-trig-timeline]` waypoints, ensure ancestor wrappers never apply `overflow-x: hidden` (keep `overflow-x: clip`).
5. When dynamically appending cards, call `refreshChronoTrig()` from `@/scripts/chronotrig` (calls `window.chronoTrig.refresh()`); do not call legacy `onScroll()` (`window.chronoTrig.trigScroll?.()` is the v5.2.0 method). For filter changes that only toggle `hidden`, reset the grid's reveal classes first (`replayGridReveals()` in `BlogIndexView.astro`), then call `refreshChronoTrig()`.
6. Add `data-lenis-prevent` on any nested `overflow-y-auto` modal/panel. Full details: `.agents/skills/astro-i18n-starter/references/scroll-and-motion.md`.

### Playbook G: Content Types (enable/disable/add)
1. **Toggle:** edit `content.types.<type>.enabled` — preferably `npm run content:disable <type>` / `content:enable <type>`, which writes sparse diffs into `client/config.json` without touching `app.config.json`. Disabling removes the type's index/entry routes, sitemap entries, navigation links and home-page CTA; the content files stay on disk. `pages` cannot be disabled.
2. **Inspect:** `npm run content:list` (state + counts) and `npm run content:status` (per-locale published/draft/missing, words, `[TODO: …]`).
3. **Scaffold:** `npm run content:new <type> <slug> --title="…" --publish` — delegates `pages`/`blog` to `new:page`/`new:post`; every other type gets the shared frontmatter, a generated cover, and `[TODO: …]` drafts for untranslated locales.
4. **Add a client-owned type without touching core:** define the Astro collection in `client/content.ts` (`clientCollections` + `CLIENT_CONTENT_TYPES`) → add its `content.types.<type>` config in `client/config.json` → add `nav_<type>` / `<type>_index_description` keys in `client/messages/*.json`. Routes, sitemap, breadcrumbs, and navigation wire automatically.
5. **Verify:** `npm run upstream:check && npm run doctor && npm run lint && npm test && npm run audit:i18n && npm run build && npm run smoke && npm run link:check`.
   Full details: `docs/CONTENT-TYPES-FA.md`.

### Playbook H: Composable Corporate, Landing & UI Blocks (PrebuiltUI-Adapted)
22 reusable Astro components (19 section blocks + 3 UI primitives, plus shared `SectionHeader.astro`, `src/libs/ui/locale.ts`, and `src/libs/ui/initials.ts`) live under `src/components/` (registered in `knip.json` and guarded by `src/libs/ui/blocks.test.ts`), rebuilt with OKLCH tokens, CSS logical properties, `<Icon>`, `<Button>`, `PageSection`, `formatNumber`/`formatDate`, ChronoTrig (`data-trig` / `data-trig-stagger`), optional `locale` (auto-falling back to URL prefix), and full Paraglide defaults:
- **Hero & Structural Sections (19):** `LandingHeroSplit.astro` (emits page `<h1>` when replacing hero), `PromoBanner.astro`, `PartnerLogos.astro`, `AboutSplitSection.astro`, `BentoCapabilities.astro`, `FeatureTabsSection.astro` (RTL-aware keyboard tabs), `ProcessSteps.astro`, `FeatureCardGrid.astro`, `ProofStatsRow.astro`, `ComparisonTable.astro`, `PricingSection.astro` (monthly/annual `billingToggle` + `contained` prop), `TestimonialGrid.astro`, `ImageGallerySection.astro` (category filter + `<dialog>` lightbox), `LatestPostsSection.astro` (live `blog` query or custom `items`), `TeamSection.astro`, `FaqAccordion.astro` (`FAQPage` JSON-LD), `ContactSplitSection.astro` (reads `business` config, renders Phone/WhatsApp/Telegram quick actions and privacy-first click-to-load map embed alongside `<ContactForm embedded />`), `NewsletterBanner.astro` (Pure-SSG external/serverless API + `site.contactEmail` fallback), and `CtaBanner.astro`.
- **UI Primitives (3):** `UiBadge.astro`, `UiAlert.astro`, and `AvatarGroup.astro`.
- **Business Profile & Collection Filters:** Configure `business` in `client/config.json` to emit `Organization` / `LocalBusiness` JSON-LD via `src/libs/content/schema.ts` and `BaseLayout.astro`; `CollectionIndexView.astro` provides progressive category, tech `stack`, and keyword search filtering for `projects` and custom collections.
- On custom landing pages (`hero: "none"`, `container: "canvas"`, `flushTop: true` — or `npm run new:page <key> -- --preset=landing`), compose blocks directly in MDX or shared `client/templates/*.astro` templates, ensuring exactly one `<h1>` per page.

---

## 6. Forbidden Anti-Patterns (Zero Tolerance)

| ❌ Forbidden Pattern | ✅ Correct Pattern |
| :--- | :--- |
| Hardcoding paths like `/en/about` or `/fa/blog` | Use `localizeHref('/about', locale)` or `getPageUrl('about', locale)` |
| Hardcoding a content-type segment (`/projects/…`) | Use `getContentTypeIndexHref()` / `getContentTypeEntryHref()` from `src/libs/content/types.ts` |
| Deleting a collection, or commenting out routes, to hide a section | `npm run content:disable <type>` (writes `client/config.json`; routes, sitemap, nav and CTAs follow) |
| Adding a new collection without a `content.types` entry | Declare it in `client/content.ts` + `client/config.json` so routing, sitemap and the CLIs see it |
| Using physical directions (`ml-4`, `pr-6`, `text-left`) | Use logical properties (`ms-4`, `pe-6`, `text-start`) |
| A one-way gradient (`bg-linear-to-r`) that points the wrong way in RTL | Add the mirrored variant (`rtl:bg-linear-to-l`) |
| Hand-editing files in `src/paraglide/` or `.paraglide-work/` | Edit `client/messages/<lang>.json` (or `messages/core/<lang>.json`) and run `npm run messages:compile` |
| Calling `m.key()` at top-level module scope | Call `m.key({}, { locale })` inside template/render cycle |
| Creating `src/pages/[lang]/...` route files | Use `src/pages/[...path].astro` dispatcher with `src/views/` |
| Inline `<svg>` `<path>` blobs in templates, or a hand-written SVG path string in client code | Register custom names in `client/icons.ts` + `client/ClientIcons.astro` (core in `src/libs/ui/icons.ts` + `Icon.astro`), and render `<Icon name="..." />` |
| Using `navigate()` for language switching | Use `window.location.assign(target)` for static language switch |
| Missing `el.dataset.bound` guard in scripts | Check `if (el.dataset.bound === 'true') return; el.dataset.bound = 'true';` |
| Showing the hero image as a side card or duplicated layer | Make the image the single full-bleed background in `PageHero.astro` |
| Re-declaring a button, chip or frosted surface in a component | Compose `.cta`, `.btn-secondary`, `.chip`, `.glass-*` from `src/styles/global.css`, or render a text button with `<Button variant="…" size="…" icon="…">` |
| Hand-rolling an icon-only `<button>` with an `<Icon>` inside | Use `<IconButton icon="..." label="..." />` |
| Importing icons from the `@tabler/icons-astro` barrel | Import the per-icon module (`@tabler/icons-astro/dist/esm/icons/<name>.mjs`) so the build only reads the icons in use |
| Serving a page image from `public/` or with a raw `<img src>` | Keep it next to the content entry (`./<file>`) and render with `<Image />` |
| Rendering every blog post on one page, or hardcoding `/blog/page/2` | Slice with `paginate()` and link with `getBlogPageHref(page, locale)` |
| Hiding elements with `display: none`, un-scoped `opacity-0`, or physical `left`/`right` | Use `data-trig` (scoped under `.js`) with logical `data-trig-direction="start|end"` |
| Hardcoding staggered animation delays across lists | Use `data-trig-stagger` on parent container |
| Failing to re-observe dynamically appended elements | Call `refreshChronoTrig()` from `@/scripts/chronotrig` |
| Filtering cards that only toggle `hidden` (surviving cards pop in with no animation) | Reset the grid's reveal classes, then call `refreshChronoTrig()` — never on the initial render |
| Nested scrollable overlays (`overflow-y-auto`) without Lenis isolation | Add `data-lenis-prevent` on scrollable modals, drawers, and panels |
