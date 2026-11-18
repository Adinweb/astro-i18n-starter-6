# AI Playbooks & Operational Guides

This document provides step-by-step verified playbooks for common architectural and content operations.

---

## Playbook 1: Swapping the Default Locale & Single-Language Mode

To switch the primary default (prefix-less) language of the site (e.g. from English to Persian `fa`):

```bash
npm run i18n:set-default fa
```

1. **What it updates automatically**:
   - Sets `defaultLocale` and reorders `locales` in `client/locales.json` (which `src/i18n/locales.ts` re-exports).
   - Merges dictionaries and updates `.paraglide-work/project.inlang/settings.json` (`baseLocale`) on compile.
   - Recompiles Paraglide dictionaries (`src/paraglide/`).
2. **Verify**:
   ```bash
   npm run messages:compile && npm test && npm run audit:i18n && npm run build && npm run smoke
   ```
3. **Expected Outcome**:
   - Persian (`fa`) instantly routes to prefix-less URLs (`/`, `/درباره-ما/`, `/blog/...`).
   - English (`en`) routes to prefixed URLs (`/en/`, `/en/about/`, `/en/blog/first-post/`).
   - Hreflang `x-default`, canonical URLs, and sitemap update seamlessly without moving a single file.

### Single-Language Client Sites
* **Recommended (zero structural changes)**: Set `"showLanguageSwitcher": false` under `"ui"` in `client/config.json` (plus `npm run i18n:set-default <locale>` if the root `/` site should use another locale). Both desktop `<LanguageSwitcher>` and the mobile drawer language grid hide cleanly while keeping all files intact.
* **Optional strict solo archive (`i18n:solo`)**: Run `npm run i18n:solo <locale>` if you want alternate locale routes excluded from `dist/` and `sitemap.xml` (archives inactive dictionaries and `.mdx` files under `.locale-archive/`).

---

## Playbook 2: Content Types — Toggling, Adding & Managing Collections

Which collections are built is decided by merged `app.config.json` + `client/config.json` → `content.types`. `pages` owns the root and cannot be disabled; `blog` and `projects` ship enabled.

### 1. Toggle an existing type

```bash
npm run content:list                 # state, route base, entry counts
npm run content:disable projects     # writes sparse override to client/config.json; routes, sitemap & nav links disappear
npm run content:enable projects      # they come back
npm run build && npm run smoke
```

* The command writes only the sparse `content.types.<type>.enabled` override in `client/config.json`, leaving upstream `app.config.json` untouched.
* Disabling never deletes content. It removes the index/entry routes, the sitemap entries, the header/drawer/footer link and the home-page CTA. `/api/blog-posts.json` and `/rss.xml` deliberately keep working so external consumers do not break.
* Hand-written MDX links to a removed section are not rewritten — `npm run link:check` reports the missing page **or the missing `#anchor`** after a build, and the navigation itself never emits an anchor whose target page is gone.

### 2. Inspect what is ready

```bash
npm run content:status                      # group × locale matrix
npm run content:status -- --write=docs/STATUS.md
npm run doctor                              # setup health, with a fix hint per finding
npm run upstream:check                      # verifies core vs client/ separation
```

### 3. Add a new collection (e.g. `services`) — Zero Core Edits

1. **Schema & UI Metadata (`client/content.ts`)** — register `services: defineCollection(...)` in `clientCollections` (`glob` loader in `./src/content/services`) and add `CLIENT_CONTENT_TYPES.services` (`label`, `description`, `icon`). `src/content.config.ts`, `src/libs/content/types.ts`, `src/libs/content/service.ts`, and `scripts/lib/content-types.mjs` read `client/content.ts` automatically.
2. **Configuration (`client/config.json`)** — add `content.types.services` (`"enabled": true, "base": "services", "index": true, "nav": true`).
3. **Messages (`client/messages/<locale>.json`)** — add `nav_services` to each client dictionary and reference `m.nav_services({}, { locale })` from `CLIENT_CONTENT_TYPES.services.label`.

### 4. Scaffold and verify

```bash
npm run content:new services web-design -- --title="Web Design" --publish
npm run assets:generate
npm run upstream:check && npm run doctor && npm run lint && npm test && npm run audit:i18n && npm run build && npm run smoke && npm run link:check
```

`content:new` delegates `pages` and `blog` to `new:page` / `new:post`; every other type receives the shared frontmatter, a generated cover, and `[TODO: …]` drafts for locales that are not translated yet. Full reference: `docs/CONTENT-TYPES-FA.md`.

## Playbook 3: Composable Corporate Blocks & Client Rebranding

1. **Rapid Client Branding & Blueprints (`npm run site:init` + `DevThemePreview`)**:
   Configure site identity, industry blueprint (`corporate`, `agency`, `portfolio`, `medical`), 6 OKLCH palettes (`indigo`, `cobalt`, `emerald`, `amber`, `slate`, `rose`), optional Light/Dark `brand.logo`, Latin/RTL font pairings (`vazirmatn`, `noto-arabic`, `iransans`, `yekan-bakh`, `peyda` with commercial `@font-face` hooks in `client/styles.css`), branded OG card generation, and active content modules in `client/config.json` with one command:
   ```bash
   npm run site:init -- --name="Acme Studio" --blueprint=agency --rtl-font=vazirmatn --og-mode=branded --yes
   ```
   While running `npm run dev`, open the floating **DEV Theme Studio** (`src/components/DevThemePreview.astro`, strictly excluded from production builds) to preview light/dark mode, palettes, custom primary/accent hex overrides, and Latin/RTL fonts live, then copy the generated JSON snippet straight into `client/config.json`.
   Need optional demo pages, posts, and projects to preview or copy blocks from? Run `npm run starter:seed -- --blueprint=corporate` (and `npm run starter:seed -- --clean --yes` to strip demo items cleanly).

2. **Start From the 22 Built-In PrebuiltUI-Adapted Blocks (`src/components/`)**:
   Before building custom markup from scratch, check the starter's 19 RTL/LTR-safe section blocks and 3 UI primitives — all work with zero props using localized Paraglide defaults (`locale` auto-detects from URL) or custom overrides:
   - **Sections (19):** `LandingHeroSplit.astro`, `PromoBanner.astro`, `PartnerLogos.astro`, `AboutSplitSection.astro`, `BentoCapabilities.astro`, `FeatureTabsSection.astro`, `ProcessSteps.astro`, `FeatureCardGrid.astro`, `ProofStatsRow.astro`, `ComparisonTable.astro`, `PricingSection.astro`, `TestimonialGrid.astro`, `ImageGallerySection.astro`, `LatestPostsSection.astro`, `TeamSection.astro`, `FaqAccordion.astro`, `ContactSplitSection.astro`, `NewsletterBanner.astro`, and `CtaBanner.astro`.
   - **UI Primitives (3):** `UiBadge.astro`, `UiAlert.astro`, and `AvatarGroup.astro`.
   - Use `npm run new:page <key> -- --preset=landing` to scaffold a multi-locale landing page pre-wired with canvas layout and composable blocks.

3. **Tailwind Blocks RTL & Token Adaptation**:
   When pasting custom Tailwind UI or external component code, adapt directions and utility colors:
   ```bash
   npm run block:adapt -- --file=src/components/MyComponent.astro
   ```

4. **Extract Copy to Compiled Messages & Recompile**:
   ```bash
   npm run i18n:extract -- --target=src/components/MyComponent.astro --key=mycomp --auto-add --replace
   npm run messages:compile
   ```

5. **Reach for `<Button>`, not a hand-rolled control**:
   Every text button in the project is `src/components/Button.astro` — only its colour (`variant`), scale (`size`), label and icon change. It renders `<a>` for navigation and `<button>` for actions, adds the shared hover lift/press, and mirrors directional icons in RTL:
   ```astro
   <Button href={pricingHref} variant="primary" size="lg" icon="arrow-right">
     {m.common_get_started({}, { locale })}
   </Button>
   ```
   The class recipe lives in `src/libs/ui/button.ts` (`buttonClasses()`), so client-side renderers such as the blog pager produce the same control. Icon-only controls stay `IconButton.astro`. Custom client icons go into `client/icons.ts` + `client/ClientIcons.astro` without editing `src/libs/ui/icons.ts`.

---

## Playbook 4: Adding New Languages & Scaffolding Multilingual Content

### 1. Adding a New Language (`npm run i18n:add-lang`)
```bash
# Add a new language with interactive prompt or explicit flags:
npm run i18n:add-lang -- ar --with-content --from=en
npm run i18n:add-lang -- es --with-content --from=fa
npm run i18n:add-lang -- it --no-content
```
* **Flags:**
  * `--with-content` / `--no-content`: Chooses whether to auto-generate markdown files for all existing pages and posts in the new language.
  * `--from=<locale>`: Selects which existing language to clone titles, descriptions, and markdown body from (defaults to `DEFAULT_LOCALE` / `en`).
  * `--publish` / `--draft=false`: Requests published output, but entries whose title still contains a `[TODO: ...]` placeholder always stay `draft: true`. Generated content copies the source language, so translate each file and flip its `draft` flag instead of forcing it.
  * A body copied from `--from=<locale>` starts with an MDX comment naming the source file (`{/* TODO(de): translate this body — it is still en copy. */}`). It is not translated copy, and the marker makes that obvious in review instead of leaving source-language prose under a translated title. Locales that were never translated keep a localized `[TODO: …]` stub instead.

### 2. Scaffolding New Articles (`npm run new:post`)
```bash
# Create post with default source language (en) and draft non-source translations:
npm run new:post tech-trends

# Create post from Persian and publish the locales that have translations:
npm run new:post ai-features -- --from=fa --title="قابلیت‌های هوش مصنوعی" --publish

# Non-interactive frontmatter sync across all active language files without overwriting markdown body:
npm run new:post tech-trends -- --update --sync-frontmatter --title="Modern Tech Trends" --desc="Updated description"
```
* **Why non-source locales default to `draft: true`:**
  To prevent unreviewed placeholder translations (`[TODO: ...]`) from appearing publicly on the live blog index (`/fa/blog/`, etc.), `new:post` sets `draft: true` on non-source locales by default.
  * To show a post on a specific language's blog listing, set `draft: false` in its frontmatter.
  * To publish every ready language at creation, pass `--publish` or `--draft=false`. Locales that still contain `[TODO: ...]` placeholders stay drafts; supply `--title:<locale>` / `--desc:<locale>` for each one you want to publish.
  * `--draft` / `--draft=true` keeps **every** locale (including the source) as a draft.
* **Slugs:** The source and default locale use the group key (`tech-trends`); the other locales get a placeholder (`tech-trends-fa`) until a native slug is set with `--slug:fa="روندهای-فناوری"`. `--from` selects the source locale only — use `--clone-from=<group>` to copy the body of an existing article.
* **Blog taxonomy and covers:** Pass `--category=engineering`, `--tags="astro,performance"`, and `--image=cover.png` when scaffolding (the file is looked up next to the content group and in the project root, then copied into the group folder, because the frontmatter reference is relative to the entry file) so cards, filters, and the article hero are populated from the start. The same flags work with `--update`, and inline YAML arrays are preserved when frontmatter is rewritten.
  * Category and tag keys stay language-neutral (`engineering`, `i18n`); visible labels are message keys (`blog_category_engineering`, `blog_tag_i18n`). Unknown keys fall back to a humanized label, so a new tag never blocks a build.
  * Run `npm run assets:generate` after adding a post group to produce `src/content/blog/<group>/<group>.png` (1200×675).
  * Filtering lives entirely in `src/libs/content/blog.ts`; the blog index syncs `?category=…&tag=a,b` so filtered views are linkable.
* **Updating Frontmatter:** Pass `--update` and `--sync-frontmatter` to update `title`, `description`, `publishedAt`, `categories`, `tags`, `image`, `author`, or `draft` across all active language files while preserving markdown body content.

### 3. Scaffolding New Pages (`npm run new:page`)
```bash
# Create new page across all active locales with layout options:
npm run new:page contact -- --from=fa --title="تماس با ما" --hero=minimal --container=contained

# Non-interactive frontmatter update across all active locales:
npm run new:page contact -- --update --sync-frontmatter --title:fa="تماس با تیم ما" --title:en="Contact Our Team"
```
* Auto-creates localized page entries across all active locales in `client/locales.json`.
* Automatically registers navigation key `nav_<key>` in `client/messages/*.json` and recompiles Paraglide. The label alone does not add the page to a menu: add `{ group: '<key>', label: … }` to `CLIENT_PAGE_ITEMS` in `client/navigation.ts` (header + drawer) or to `getClientFooterColumns` / `getClientLegalNavigation`.
* Use `--update` / `--sync-frontmatter` to synchronize structural frontmatter (`image`, `hero`, `container`, `flushTop`, `template`) without manual file rewrites.
* Only the source locale is published by default; the other locales stay `draft: true` until translated. Use `--publish`, `--draft`, and `--slug:<locale>="…"` to control that explicitly.
* **Slugs:** the source locale owns the group slug (`contact`); every other locale starts with the placeholder `contact-<locale>` so that each locale has a valid route. The command lists those placeholders with the exact fix (`--update --slug:fa="تماس"`), and `npm run doctor` keeps reporting any placeholder that is still in the content: it builds and routes, but `/fa/contact-fa/` is not a URL you want to ship.
* **`--publish` and scaffold copy:** publishing flips the entry live while its body is still the localized "content coming soon" sentence. The command warns about it, and `npm run smoke` fails while that sentence is in `dist/`, so the copy cannot reach production by accident.

### 4. Batch Adding Translations (`npm run i18n:add-batch`)
```bash
# Import from JSON file:
npm run i18n:add-batch -- --file=translations.json

# Pass JSON directly or pipe via stdin:
npm run i18n:add-batch -- --json='{"cart_checkout": {"en": "Checkout", "fa": "تسویه حساب"}}'
cat translations.json | npm run i18n:add-batch
```
* Writes keys into `client/messages/*.json` (while preserving `messages/core/*.json` cleanly).
* Supports key-to-locale maps, locale-to-keys maps, or nested category objects.
* Automatically generates fallback placeholders for missing locales to guarantee dictionary key parity.
* Merges two-tier dictionaries into `.paraglide-work/` and recompiles Paraglide in a single pass instead of running multi-step loops.

---

## Playbook 5: Removing Languages & Content (Clean Lifecycle)

### 1. Removing a Language (`npm run i18n:remove-lang`)
```bash
# Interactive mode (asks whether to delete content files):
npm run i18n:remove-lang -- ar

# Force mode (deletes language config, dictionary, and all ar.mdx content files):
npm run i18n:remove-lang -- ar --with-content --force

# Keep existing content files under src/content/:
npm run i18n:remove-lang -- ar --keep-content --force
```
* **Guard:** Protects the default base locale (`DEFAULT_LOCALE`) from accidental deletion.
* **Cleanup:**
  1. Updates `client/locales.json` (removes from `locales` array and `metadata`).
  2. Deletes `client/messages/<locale>.json` (and core fallback if applicable).
  3. Deletes associated `<locale>.mdx` files across `src/content/` (if `--with-content`).
  4. Merges dictionaries into `.paraglide-work/` and recompiles Paraglide messages automatically.

### 2. Removing an Article / Blog Post (`npm run remove:post`)
```bash
# Delete entire article across all languages:
npm run remove:post tech-trends -- --force

# Delete only the German translation file for a post:
npm run remove:post tech-trends -- --locale=de --force
```

### 3. Removing a Static Page (`npm run remove:page`)
```bash
# Delete entire page and clean its navigation key from dictionaries:
npm run remove:page pricing -- --force

# Delete only a specific language's page file:
npm run remove:page pricing -- --locale=de --force
```
* Automatically cleans up `nav_<page-key>` from client dictionary files (`client/messages/*.json`) and recompiles Paraglide messages. With `--locale` only that locale's file is deleted and the navigation key stays in every dictionary, because the dictionaries always carry the same key set; the missing locale is reported by `npm run audit:i18n` as a warning, not an error.
* Before deleting the key it scans `src/` and `client/` for surviving `m.nav_<page-key>(` calls and names every file that still needs fixing. The footer's pages column is derived from `CLIENT_PAGE_ITEMS` (`client/navigation.ts`), so after removing a group from that list there is nothing else to rewrite — but a leftover reference is reported here instead of failing the next build with an undefined message.
* Guards the critical `home` page from deletion without `--force`.

---

## Playbook 6: Working with the Paginated Blog Index

The blog index is a **static, paginated** listing: one URL per page per locale. Nothing is paginated in the browser, so every page is a real, linkable, crawlable document.

### 1. Changing the Page Size
The single source of truth is merged `app.config.json` / `client/config.json`:
```json
"blog": { "postsPerPage": 9 }
```
`src/libs/config/app.ts` validates the file and exposes the value as `POSTS_PER_PAGE`.
* The route builder (`src/libs/content/service.ts`), the view (`src/views/BlogIndexView.astro`), and the smoke test all read that value, so the number of generated pages and the number of rendered cards can never drift apart.
* Changing the value is enough — no template edit is needed. Rebuild to see the new page set.

### 2. The URL of a Page
Page URLs are built by `getBlogPageHref(page, locale)` in `src/libs/content/service.ts`:

| Page | Default locale (`en`) | Other locales |
| :--- | :--- | :--- |
| 1 | `/blog/` | `/de/blog/`, `/fa/blog/` |
| 2 | `/blog/page/2/` | `/de/blog/page/2/`, `/fa/blog/page/2/` |

* Never hardcode `/blog/page/2` — the locale prefix and the trailing slash are the job of `localizeHref`.
* A requested page is always clamped into `1..totalPages`, so a stale link (`/blog/page/99/`) can never produce an out-of-range slice.
* The number of pages of a locale follows from the number of *published* posts that locale has. A locale with fewer posts has fewer pages, and its `alternates` map falls back to its last page, so the language switcher never leads to a missing URL.

### 3. The Page Math
All of it is pure and lives in `src/libs/content/pagination.ts` (unit-tested in `pagination.test.ts`):
```ts
const { items, page, totalPages, previousPage, nextPage } = paginate(posts, page, perPage);
const window = buildPageWindow(page, totalPages);   // holes become the PAGE_GAP ellipsis
```

### 4. The Pager UI
`src/views/BlogIndexView.astro` renders the pager only when there is more than one page:
* The previous/next arrows are cloned from the server-rendered `<template data-icon-template="chevron-left">` / `…chevron-right` markup and flipped with `rtl:rotate-180` / `rotate-180 rtl:rotate-0`, so the direction follows the reading direction and the pager never carries its own SVG paths.
* Every pager link carries the active taxonomy filter query, so paging never drops the selection.
* `Seo.astro` / `BaseLayout.astro` accept `prevUrl` / `nextUrl` and emit `<link rel="prev">` / `<link rel="next">`; pages beyond the first get a distinct document title (`Blog — Page 2 of 3`).

### 5. Verify
```bash
npm run lint && npm test && npm run audit:i18n && npm run build && npm run smoke
```
`npm run smoke` derives the expected page count from the content collection and asserts that every page exists, that `rel="prev"` / `rel="next"` point at the right neighbours, that the pager is present only when there is more than one page, and that no page beyond the last one was generated.

> To see the pager while developing, either run `npm run starter:seed` (which adds 6 demo posts) and lower `POSTS_PER_PAGE`, or adjust `blog.postsPerPage` in `client/config.json` (default `9`).

---

## Playbook 7: Implementing Viewport Reveals, Staggered Grids & ChronoTrig v5.2.0 Motion

### 1. The ChronoTrig v5.2.0 Reveal Contract
* Never hide elements with `display: none` / `hidden` or unscoped Tailwind `opacity-0` for scroll entrance.
* `BaseLayout.astro` synchronously adds `.js` on `<html class="js">` in `<head>`. `src/styles/chronotrig.css` scopes initial entrance offsets strictly under `.js [data-trig]` (preserving full layout geometry, zero CLS, and 100% visibility when JS is disabled or printed).
* When an element enters the viewport, ChronoTrig adds `.trig`, animating `opacity: 1` and `transform: none` over `1.2s` (`1.1s` for stagger cards) with a `cubic-bezier(0.22, 1, 0.36, 1)` curve and a 56px bottom offset.
* Add `data-trig-once="true"` on `[data-trig]` or `[data-trig-stagger]` when the reveal should play once, release `will-change: auto`, and unobserve cleanly.
* Reveals hold for `--trig-reveal-delay` (`180ms`, defined once at the top of `chronotrig.css`) before starting, so an entrance is not finished before the element is properly in view.
* Motion preference is resolved once in `BaseLayout.astro`'s `<head>` (`resolveMotion()`): it checks `localStorage.getItem('motion')` (`'reduced' | 'full'`), otherwise honors the OS `prefers-reduced-motion: reduce` setting, and writes `html[data-motion]`. `chronotrig.css`, `lenis.ts` (syncing via `trigScroll?.()`), `global.css`, ChronoTrig's live `respectReducedMotion` watcher (`body.chronotrig-mobile-disabled`), and `@media print` all flatten reveals, timelines, and `[data-trig-pin]` containers cleanly.

### 2. Single Elements, Presets & RTL-Safe Directions
* Add `data-trig` to any element, title, or card for a smooth bottom reveal, optionally paired with v5.2.0 presets/modifiers (`.fadeInUpSm`, `.blurIn`, `.clipUp`, `.clipStart`, `.trig-delay-100`..`1000`, `.trig-duration-*`, `.trig-ease-*`, `.trig-reactive-*`). Avoid non-existent attributes like `data-trig-delay`.
* For split columns or directional entrances, use `data-trig-direction="start"` and `data-trig-direction="end"` or `.clipStart` so horizontal entrances mirror automatically in RTL (`fa` and `ar`).

### 3. Harmonic Stagger Grids (`data-trig-stagger`), Pins & Timelines
* Add `data-trig-stagger data-trig-stagger-delay="0.08"` (plus optional `data-trig-stagger-mode="linear|wave|center|reverse"` and `data-trig-once="true"`) to the parent grid or list container.
* ChronoTrig v5.2.0 targets `[data-trig-stagger-item], :scope > *`, computes `--stagger-index`, `--stagger-delay`, and `--stagger-total` natively (clamping delays `<= 0.04s` in lightweight mobile mode), and activates child items via `.trig-stagger-active`.
* For pinned scrollytelling (`[data-trig-pin]`, `data-trig-pin-distance`, `data-trig-pin-horizontal="true"` + `[data-trig-pin-track]`, `data-trig-pin-media`) and multi-step `[data-trig-timeline]` waypoints, ensure ancestor wrappers never use `overflow-x: hidden` (`src/styles/global.css` uses `overflow-x: clip` on `body`).

### 4. Dynamic Filtering, Re-scans & Filter Replays
* When dynamically appending cards in client scripts, call `refreshChronoTrig()` from `@/scripts/chronotrig` (which calls `window.chronoTrig.refresh()` to re-measure viewport, tracks, and observers; use `trigScroll?.()` instead of removed `onScroll()` inside scroll handlers).
* A filter change is different: hiding cards leaves the surviving ones with `.trig`, so they would appear without animating. Reset the grid first (`replayGridReveals()` in `BlogIndexView.astro`), force a reflow, then call `refreshChronoTrig()` — and skip that replay on the initial render, otherwise the page entrance restarts.

---

## Playbook 8: Custom Page Layouts & Pure SSG External Form APIs

### 1. Choosing a Page Layout (`src/content/pages/<group>/<locale>.mdx`)
Unlike `blog` entries (which always use `BlogPostView.astro` + `PageHero.astro`), static `pages` default to `hero: "none"` and `container: "canvas"`:
* **Custom Full-Bleed Canvas (`hero: "none"`, `container: "canvas"`)**: Compose arbitrary sections inside MDX using `<PageSection>` or `.layout-container` (`1280px` max-width), or delegate to a shared `.astro` view registered in `CLIENT_PAGE_TEMPLATES` (`client/templates/index.ts`, or `template: "home"` in `src/views/pages/`). Add `flushTop: true` when your first section sits directly behind the floating glass header. Never use `layout:` in MDX frontmatter (reserved by `@astrojs/mdx`).
* **Minimal Typographic Header (`hero: "minimal"`, `container: "contained" | "prose"`)**: Renders `PageHeader.astro` (breadcrumbs, accent rule, `<h1>`, description) above either a `1280px` `.layout-container` (`contained`) or a `72ch` editorial column (`prose`).
* **Atmospheric Banner (`hero: "default"`)**: Renders the defocused full-bleed `PageHero.astro` + `HeroCopy.astro`.

### 2. Connecting Contact & Newsletter Forms to Serverless / External APIs (Zero Backend)
This starter is **100% Pure SSG** and ships with no backend server. Both `src/components/ContactForm.astro` and `src/components/NewsletterBanner.astro` post directly to external/serverless providers through `src/libs/api/client.ts`:
1. Configure `api.provider` in `client/config.json` (`'custom' | 'web3forms' | 'formspree' | 'basin' | 'webhook'`), optional `accessKey` / `PUBLIC_WEB3FORMS_KEY` (when using `web3forms`, `resolveFormEndpoint()` automatically targets `https://api.web3forms.com/submit`), and optional Cloudflare Turnstile `turnstileSiteKey` / `PUBLIC_TURNSTILE_SITE_KEY` alongside `PUBLIC_CONTACT_API_URL`, `PUBLIC_NEWSLETTER_API_URL`, or `PUBLIC_API_BASE_URL` in `.env` / deployment environment variables.
2. Optionally populate `business` (`type`, `legalName`, `phone`, `whatsapp`, `telegram`, `address`, `city`, `country`, `workingHours`, `mapEmbedUrl`, `geo`) in `client/config.json`. `BaseLayout.astro` emits `Organization` / `LocalBusiness` JSON-LD via `src/libs/content/schema.ts`, and `ContactSplitSection.astro` pairs `<ContactForm embedded />` with instant Phone/WhatsApp/Telegram quick-action buttons and a click-to-load lazy map embed.
3. Without JavaScript or without a configured endpoint, neither form renders; visitors see a clean `mailto:` fallback (when `site.contactEmail` is set) or neutral unavailable notice, and `import.meta.env.DEV`-only setup notes guide developers without leaking env var names in production HTML.

### 3. Collection Filtering, Git CMS & Production Deployment Artifacts
* **Generic Collection Filtering**: `CollectionIndexView.astro` (`projects`, etc.) supports progressive category, tech `stack`, and keyword search filtering with locale-native `formatNumber` counters and ChronoTrig reveal replays.
* **Git-Based Editing**: `.pages.yml` ships pre-configured for Pages CMS (`pages`, `blog`, `projects`, and media).
* **Production Headers & Caching**: Use `public/_headers` (Cloudflare Pages / Netlify security & cache headers) or `docs/deploy/nginx.conf` (Nginx gzip, immutable `/_astro/*` cache, localized `/404.html` handler) when deploying `dist/`.
