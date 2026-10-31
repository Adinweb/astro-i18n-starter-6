# AI Playbooks & Operational Guides

This document provides step-by-step verified playbooks for common architectural and content operations.

---

## Playbook 1: Swapping the Default Locale

To switch the primary default (prefix-less) language of the site (e.g. from English to Persian `fa` or German `de`):

1. **Update Locale Configuration**:
   Open `src/i18n/locales.ts` and update `DEFAULT_LOCALE`:
   ```typescript
   export const DEFAULT_LOCALE: Locale = 'fa'; // Changed from 'en' to 'fa'
   ```

2. **Update Inlang Base Locale**:
   Open `project.inlang/settings.json` and set:
   ```json
   "baseLocale": "fa"
   ```

3. **Recompile & Verify**:
   Run the full verification suite:
   ```bash
   pnpm messages:compile && pnpm test && pnpm build && pnpm smoke
   ```

4. **Expected Outcome**:
   - Persian (`fa`) instantly routes to prefix-less URLs (`/`, `/darbare-ma`, `/blog/اولین-پست`).
   - English (`en`) routes to prefixed URLs (`/en`, `/en/about`, `/en/blog/first-post`).
   - Hreflang `x-default` automatically points to the Persian version.
   - Language switcher, canonical URLs, and sitemap update seamlessly without moving a single file.

---

## Playbook 2: Adding a New Content Collection

To add a new multilingual content collection (e.g., `docs`, `case-studies`, `changelog`):

1. **Define Schema & Loader**:
   In `src/content.config.ts`, add the new collection using `glob` loader:
   ```typescript
   caseStudies: defineCollection({
     loader: glob({
       pattern: '**/*.{md,mdx}',
       base: './src/content/case-studies',
       generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
     }),
     schema: baseSchema,
   }),
   ```

2. **Register Route Mapping**:
   In `src/libs/content/service.ts`:
   - Add the collection name to collection scanning in `getSiteRoutes()`.
   - Resolve alternates and register routes with appropriate `routeType` (or generic collection view).

3. **Add View Branch**:
   In `src/pages/[...path].astro`, add a rendering branch for the new route type or view:
   ```astro
   {routeType === 'case-study' && entry && (
     <CaseStudyView entry={entry} locale={locale} alternates={alternates} url={url} />
   )}
   ```

4. **Scaffold First Content Item**:
   Run the CLI scaffolder:
   ```bash
   pnpm run new:post my-first-case-study -- --collection=case-studies
   ```

5. **Audit & Build**:
   ```bash
   pnpm run audit:i18n && pnpm build
   ```

---

## Playbook 3: Adding or Adapting UI Components

1. **Tailwind Blocks RTL & Token Adaptation**:
   When pasting Tailwind UI or external component code, adapt directions and utility colors:
   ```bash
   pnpm run block:adapt -- --file=src/components/MyComponent.astro
   ```

2. **Extract Copy to Compiled Messages**:
   Extract plain text nodes to Paraglide message keys:
   ```bash
   pnpm run i18n:extract -- --target=src/components/MyComponent.astro --key=mycomp --auto-add --replace
   ```

3. **Fill Translations**:
   Provide translations in `messages/de.json` and `messages/fa.json`, then compile:
   ```bash
   pnpm messages:compile
   ```

---

## Playbook 4: Adding New Languages & Scaffolding Multilingual Content

### 1. Adding a New Language (`pnpm run i18n:add-lang`)
```bash
# Add a new language with interactive prompt or explicit flags:
pnpm run i18n:add-lang -- ar --with-content --from=en
pnpm run i18n:add-lang -- es --with-content --from=fa
pnpm run i18n:add-lang -- it --no-content
```
* **Flags:**
  * `--with-content` / `--no-content`: Chooses whether to auto-generate markdown files for all existing pages and posts in the new language.
  * `--from=<locale>`: Selects which existing language to clone titles, descriptions, and markdown body from (defaults to `DEFAULT_LOCALE` / `en`).
  * `--publish` / `--draft=false`: Requests published output, but entries whose title still contains a `[TODO: ...]` placeholder always stay `draft: true`. Generated content copies the source language, so translate each file and flip its `draft` flag instead of forcing it.

### 2. Scaffolding New Articles (`pnpm run new:post`)
```bash
# Create post with default source language (en) and draft non-source translations:
pnpm run new:post -- tech-trends

# Create post from Persian and publish the locales that have translations:
pnpm run new:post -- ai-features --from=fa --title="قابلیت‌های هوش مصنوعی" --publish

# Non-interactive frontmatter sync across all active language files without overwriting markdown body:
pnpm run new:post -- tech-trends --update --sync-frontmatter --title="Modern Tech Trends" --desc="Updated description"
```
* **Why non-source locales default to `draft: true`:**
  To prevent unreviewed placeholder translations (`[TODO: ...]`) from appearing publicly on the live blog index (`/fa/blog/`, etc.), `new:post` sets `draft: true` on non-source locales by default.
  * To show a post on a specific language's blog listing, set `draft: false` in its frontmatter.
  * To publish every ready language at creation, pass `--publish` or `--draft=false`. Locales that still contain `[TODO: ...]` placeholders stay drafts; supply `--title:<locale>` / `--desc:<locale>` for each one you want to publish.
  * `--draft` / `--draft=true` keeps **every** locale (including the source) as a draft.
* **Slugs:** The source and default locale use the group key (`tech-trends`); the other locales get a placeholder (`tech-trends-fa`) until a native slug is set with `--slug:fa="روندهای-فناوری"`. `--from` selects the source locale only — use `--clone-from=<group>` to copy the body of an existing article.
* **Blog taxonomy and covers:** Pass `--category=engineering`, `--tags="astro,performance"`, and `--image=cover.png` when scaffolding (the file is looked up next to the content group and in the project root, then copied into the group folder, because the frontmatter reference is relative to the entry file) so cards, filters, and the article hero are populated from the start. The same flags work with `--update`, and inline YAML arrays are preserved when frontmatter is rewritten.
  * Category and tag keys stay language-neutral (`engineering`, `i18n`); visible labels are message keys (`blog_category_engineering`, `blog_tag_i18n`). Unknown keys fall back to a humanized label, so a new tag never blocks a build.
  * Run `pnpm run assets:generate` after adding a post group to produce `src/content/blog/<group>/<group>.png` (1200×675).
  * Filtering lives entirely in `src/libs/content/blog.ts`; the blog index syncs `?category=…&tag=a,b` so filtered views are linkable.
* **Updating Frontmatter:** Pass `--update` and `--sync-frontmatter` to update `title`, `description`, `publishedAt`, `categories`, `tags`, `image`, `author`, or `draft` across all active language files while preserving markdown body content.

### 3. Scaffolding New Pages (`pnpm run new:page`)
```bash
# Create new page across all active locales with layout options:
pnpm run new:page -- contact --from=fa --title="تماس با ما" --hero=minimal --container=contained

# Non-interactive frontmatter update across all active locales:
pnpm run new:page -- contact --update --sync-frontmatter --title:fa="تماس با تیم ما" --title:en="Contact Our Team"
```
* Auto-creates localized page entries across all active locales in `src/i18n/locales.ts`.
* Automatically registers navigation key `nav_<key>` in all dictionaries and recompiles Paraglide.
* Use `--update` / `--sync-frontmatter` to synchronize structural frontmatter (`image`, `hero`, `container`, `flushTop`, `template`) without manual file rewrites.
* Only the source locale is published by default; the other locales stay `draft: true` until translated. Use `--publish`, `--draft`, and `--slug:<locale>="…"` to control that explicitly.

### 4. Batch Adding Translations (`pnpm run i18n:add-batch`)
```bash
# Import from JSON file:
pnpm run i18n:add-batch -- --file=translations.json

# Pass JSON directly or pipe via stdin:
pnpm run i18n:add-batch -- --json='{"cart_checkout": {"en": "Checkout", "fa": "تسویه حساب"}}'
cat translations.json | pnpm run i18n:add-batch
```
* Supports key-to-locale maps, locale-to-keys maps, or nested category objects.
* Automatically generates fallback placeholders for missing locales to guarantee dictionary key parity.
* Recompiles Paraglide in a single pass instead of running multi-step loops.

---

## Playbook 5: Removing Languages & Content (Clean Lifecycle)

### 1. Removing a Language (`pnpm run i18n:remove-lang`)
```bash
# Interactive mode (asks whether to delete content files):
pnpm run i18n:remove-lang -- ar

# Force mode (deletes language config, dictionary, and all ar.mdx content files):
pnpm run i18n:remove-lang -- ar --with-content --force

# Keep existing content files under src/content/:
pnpm run i18n:remove-lang -- ar --keep-content --force
```
* **Guard:** Protects the default base locale (`DEFAULT_LOCALE`) from accidental deletion.
* **Cleanup:**
  1. Removes the locale from `project.inlang/settings.json`.
  2. Deletes `messages/<locale>.json`.
  3. Updates `src/i18n/locales.ts` (removes from `LOCALES` array and `LOCALE_METADATA`).
  4. Deletes associated `<locale>.mdx` files across `src/content/` (if `--with-content`).
  5. Recompiles Paraglide messages automatically.

### 2. Removing an Article / Blog Post (`pnpm run remove:post`)
```bash
# Delete entire article across all languages:
pnpm run remove:post -- tech-trends --force

# Delete only the German translation file for a post:
pnpm run remove:post -- tech-trends --locale=de --force
```

### 3. Removing a Static Page (`pnpm run remove:page`)
```bash
# Delete entire page and clean its navigation key from dictionaries:
pnpm run remove:page -- pricing --force

# Delete only a specific language's page file:
pnpm run remove:page -- pricing --locale=de --force
```
* Automatically cleans up `nav_<page-key>` from all dictionary files (`messages/*.json`) and recompiles Paraglide messages. With `--locale` only that locale's file is deleted and the navigation key stays in every dictionary, because the dictionaries always carry the same key set; the missing locale is reported by `pnpm run audit:i18n` as a warning, not an error.
* Guards the critical `home` page from deletion without `--force`.

---

## Playbook 6: Working with the Paginated Blog Index

The blog index is a **static, paginated** listing: one URL per page per locale. Nothing is paginated in the browser, so every page is a real, linkable, crawlable document.

### 1. Changing the Page Size
The single source of truth is `app.config.json`:
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
* The previous/next arrows use the `chevron-left` symbol from `/icons.svg`, flipped with `rtl:rotate-180` / `rotate-180 rtl:rotate-0`, so the direction follows the reading direction.
* Every pager link carries the active taxonomy filter query, so paging never drops the selection.
* `Seo.astro` / `BaseLayout.astro` accept `prevUrl` / `nextUrl` and emit `<link rel="prev">` / `<link rel="next">`; pages beyond the first get a distinct document title (`Blog — Page 2 of 3`).

### 5. Verify
```bash
pnpm run lint && pnpm test && pnpm run audit:i18n && pnpm run build && pnpm run smoke
```
`pnpm run smoke` derives the expected page count from the content collection and asserts that every page exists, that `rel="prev"` / `rel="next"` point at the right neighbours, that the pager is present only when there is more than one page, and that no page beyond the last one was generated.

> To see the pager while developing, temporarily lower `POSTS_PER_PAGE` (e.g. `1`) and rebuild — the starter ships only three posts per locale, so the default of `9` renders a single page.

---

## Playbook 7: Implementing Viewport Reveals, Staggered Grids & ChronoTrig Motion

### 1. The ChronoTrig Reveal Contract
* Never hide elements with `display: none` / `hidden` or unscoped Tailwind `opacity-0` for scroll entrance.
* `BaseLayout.astro` synchronously adds `.js` on `<html class="js">` in `<head>`. `src/styles/chronotrig.css` scopes initial entrance offsets strictly under `.js [data-trig]` (preserving full layout geometry, zero CLS, and 100% visibility when JS is disabled or printed).
* When an element enters the viewport, ChronoTrig adds `.trig`, animating `opacity: 1` and `transform: none` over `1.2s` (`1.1s` for stagger cards) with a `cubic-bezier(0.22, 1, 0.36, 1)` curve and a 56px bottom offset.
* Reveals hold for `--trig-reveal-delay` (`180ms`, defined once at the top of `chronotrig.css`) before starting, so an entrance is not finished before the element is properly in view.
* Reveals are **not** gated by the OS `prefers-reduced-motion` setting; `html[data-motion="reduced"]` and `@media print` are the only flattening paths.

### 2. Single Elements & RTL-Safe Directions
* Add `data-trig` to any element, title, or card for a smooth bottom reveal.
* For split columns or directional entrances, use `data-trig-direction="start"` and `data-trig-direction="end"` so horizontal entrances mirror automatically in RTL (`fa` and `ar`).

### 3. Harmonic Stagger Grids (`data-trig-stagger`)
* Add `data-trig-stagger data-trig-stagger-delay="0.08"` to the parent grid or list container.
* ChronoTrig automatically computes `--stagger-index`, `--stagger-delay`, and activates child items via `.trig-stagger-active`.

### 4. Dynamic Filtering, Re-scans & Filter Replays
* When dynamically appending cards in client scripts, call `refreshChronoTrig()` from `@/scripts/chronotrig` to re-scan and observe the new elements.
* A filter change is different: hiding cards leaves the surviving ones with `.trig`, so they would appear without animating. Reset the grid first (`replayGridReveals()` in `BlogIndexView.astro`), force a reflow, then call `refreshChronoTrig()` — and skip that replay on the initial render, otherwise the page entrance restarts.

---

## Playbook 8: Custom Page Layouts & Pure SSG External Form APIs

### 1. Choosing a Page Layout (`src/content/pages/<group>/<locale>.mdx`)
Unlike `blog` entries (which always use `BlogPostView.astro` + `PageHero.astro`), static `pages` default to `hero: "none"` and `container: "canvas"`:
* **Custom Full-Bleed Canvas (`hero: "none"`, `container: "canvas"`)**: Compose arbitrary sections inside MDX using `<PageSection>` or `.layout-container` (`1280px` max-width), or delegate to a shared `.astro` view in `src/views/pages/` via `template: "home"`. Add `flushTop: true` when your first section sits directly behind the floating glass header. Never use `layout:` in MDX frontmatter (reserved by `@astrojs/mdx`).
* **Minimal Typographic Header (`hero: "minimal"`, `container: "contained" | "prose"`)**: Renders `PageHeader.astro` (breadcrumbs, accent rule, `<h1>`, description) above either a `1280px` `.layout-container` (`contained`) or a `72ch` editorial column (`prose`).
* **Atmospheric Banner (`hero: "default"`)**: Renders the defocused full-bleed `PageHero.astro` + `HeroCopy.astro`.

### 2. Connecting Forms to an External API (Zero Backend)
This starter is **100% Pure SSG** and ships with no backend server. Client-side forms (`src/components/ContactForm.astro`) post directly to external/headless APIs through `src/libs/api/client.ts`:
1. Set `PUBLIC_CONTACT_API_URL="https://api.example.com/v1/contact"` (or `PUBLIC_API_BASE_URL`) in `.env` / deployment environment variables, **or** set `api.baseUrl` and `api.endpoints.contact` in `app.config.json`.
2. Embed `<ContactForm locale={locale} />` in any Astro view or MDX page. When no external endpoint is configured yet, the form automatically displays a clear configuration notice and disables submission cleanly.
