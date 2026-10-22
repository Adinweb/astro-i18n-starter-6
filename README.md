# Astro i18n Starter

A production-grade, multi-lingual (RTL + LTR), SSG-first website starter template built with **Astro v7**, **TypeScript**, **Tailwind CSS v4**, and **Paraglide JS**.

Designed for high performance, strict type safety, zero route collisions, and effortless internationalization across both Left-to-Right (LTR) and Right-to-Left (RTL) writing systems.

---

## ✨ Features

* **Static-First Performance (SSG)**: Pure static HTML generation for optimal speed, security, and SEO.
* **Native RTL & LTR Support**: First-class support for Right-to-Left languages (**Persian / Farsi `fa`**, **Arabic `ar`**) and Left-to-Right languages (**English `en`**, **German `de`**, **French `fr`**).
* **CSS Logical Properties**: Built with Tailwind CSS v4 using semantic tokens (`bg-surface`, `text-fg`, `border-border`) and logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`).
* **Clean Prefix-less Default Locale**: The default language has clean root URLs (`/`, `/about`, `/blog/first-post`), while other languages receive prefixes (`/fa`, `/fa/درباره-ما`, `/ar/من-نحن`).
* **Swappable Default Language**: Swap the default language at any time in `src/i18n/locales.ts` with zero file restructuring.
* **Zero Route Collisions**: A single Lean Router Dispatcher (`src/pages/[...path].astro`) dynamically handles all localized pages, translated slugs, and index views.
* **Compile-Time i18n via Paraglide**: Strongly typed translations with native ICU plurals and ordinals, compiled directly to tree-shakeable JS functions without runtime overhead.
* **Symmetrical Content Collections**: Folder-per-entry content pipeline (`src/content/{collection}/{group}/{locale}.mdx`) with localized slugs and cross-language alternate linking.
* **Paginated Blog Index**: The listing is a static, paginated route set — one URL per page per locale (`/blog/`, `/blog/page/2/`, `/de/blog/page/2/`) — with a localized pager, `rel="prev"` / `rel="next"` head links, and no client-side pagination.
* **Search Built-In**: Production indexing with **Pagefind** over static output, plus a locale-aware JSON fallback when Pagefind is unavailable.
* **SEO & Social Metadata**: Canonical URLs, hreflang plus `x-default`, Open Graph/Twitter cards, `WebSite`/`BlogPosting` JSON-LD, a multilingual sitemap with `lastmod`, and an Atom feed at `/rss.xml`.
* **Accessible by Default**: Native `<dialog>` mobile menu and search, exactly one `<h1>` per page, skip link, visible focus rings, and reduced-motion support.
* **Image-Backed Hero Bands**: Every page and post opens with a full-bleed hero whose background *is* the entry's artwork — one image layer, never a card beside the copy and never a duplicated layer. The picture is defocused into atmosphere and shaped by vertical scrims, so the band reads identically in LTR and RTL.
* **Optimized Image Pipeline**: Every picture is served through Astro's image pipeline — WebP output, a responsive `srcset` with the right `sizes`, and an `og:image` cropped to the social ratio. A 263 KB hero PNG becomes a 7 KB WebP on a phone.
* **Frosted-Glass Design System**: The header, its icon controls, the calls to action and every chip are defined once in `src/styles/global.css` and composed everywhere else, so the whole site speaks one visual language.
* **Raster Brand Assets From Code**: `scripts/generate-assets.mjs` deterministically produces the app icons, the Open Graph image, and all hero/cover artwork with no image-editing dependency.
* **SVG Sprite Endpoint**: Zero-JS, cacheable build-time SVG sprite (`/icons.svg`) with an `<Icon name="..." />` component.
* **Turnkey Developer CLI Suite**: Automation scripts to scaffold pages/posts, add/remove languages, adapt Tailwind blocks, extract translations, audit dictionary parity, and detect dead code.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** `>= 22.12.0`
* **pnpm** `>= 10` (declared through `packageManager`; the CLI scripts call pnpm internally)

> Set `SITE_URL` so canonical, sitemap, RSS, and Open Graph URLs are absolute: copy `.env.example` to `.env` and set the public origin. A **local** build without it still runs — it falls back to the dev origin configured in `app.config.json` and warns — while a **CI or deployment** build fails, so a deploy can never ship placeholder URLs.

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start the Development Server
```bash
pnpm run dev
```
Open the URL printed by Astro — by default [http://localhost:4321](http://localhost:4321), using the port from `app.config.json`.

> **Background Mode**: If running in an agentic or background environment:
> ```bash
> astro dev --background
> ```
> Manage the background process with `astro dev status`, `astro dev logs`, and `astro dev stop`.

### 3. Build for Production
```bash
pnpm run build
```
This compiles Paraglide messages, builds all static HTML pages into `dist/`, and indexes the site with Pagefind.

> Canonical URLs always end in `/` (Astro `trailingSlash: 'always'`). Most static hosts redirect `/about` to `/about/` automatically; if yours does not, enable that redirect so every page resolves to its canonical form.

---

## 📁 Project Structure

```text
├── .agents/skills/            # AI Agent skills (e.g. astro-i18n-starter)
├── app.config.json            # Single source of truth for app, brand, blog & server values
├── messages/                  # Dictionaries (en.json, de.json, fr.json, fa.json, ar.json)
├── project.inlang/            # Paraglide JS configuration & settings
├── public/                    # Static assets that need a stable URL (favicons, browser icons)
├── scripts/                   # Developer automation CLI scripts (13 tools)
│   └── lib/                   # Shared prompt, frontmatter, and artwork helpers
├── src/
│   ├── assets/hero/hero-0.jpg # Shared hero photograph (no page image of its own)
│   ├── components/            # Reusable UI components
│   │   ├── Icon.astro         # SVG sprite icon renderer (<Icon name="..." />)
│   │   ├── IconButton.astro   # Icon-only button (glass or ghost variant)
│   │   ├── LanguageSwitcher.astro # Dropdown with translated alternate links
│   │   ├── PageHero.astro     # Hero shell: full-bleed background + light-shaping scrims
│   │   ├── HeroCopy.astro     # Shared hero copy (heading, description, slots)
│   │   ├── BlogPostHeroContent.astro # Hero copy for articles (breadcrumbs, meta)
│   │   ├── SearchModal.astro  # Accessible search modal (Pagefind + Dev fallback)
│   │   ├── Seo.astro          # Canonical links & hreflang tags (locales + 1)
│   │   └── TopLoadingBar.astro # Page transition progress bar (reduced-motion aware)
│   ├── content/               # Multilingual Content Collections
│   │   ├── pages/             # Static pages: home, about, features, pricing
│   │   │   └── <group>/       # The group folder also holds its hero artwork
│   │   └── blog/              # Blog articles with localized slugs
│   │       └── <group>/       # The group folder also holds its cover artwork
│   ├── i18n/                  # Core i18n Single Source of Truth (SSOT)
│   │   ├── locales.ts         # LOCALES array, DEFAULT_LOCALE, metadata (dir, fonts)
│   │   └── paths.ts           # Pure path functions (localizeHref, localeHref, stripLocale, getPathname)
│   ├── layouts/
│   │   └── BaseLayout.astro   # Main layout: header, mobile menu drawer, main, footer
│   ├── libs/
│   │   ├── config/app.ts      # Validates app.config.json; typed site/brand/blog values
│   │   ├── config/navigation.ts # Locale-aware navigation builder
│   │   ├── content/entries.ts # Entry IDs, draft filtering, locale selection & sorting
│   │   ├── content/service.ts # Route resolution, slug alternates & breadcrumbs
│   │   ├── content/pagination.ts # Pure paginate() + buildPageWindow() helpers
│   │   └── content/social.ts  # Optimized og:image card
│   ├── pages/
│   │   ├── [...path].astro    # Lean Router Dispatcher (< 30 lines)
│   │   ├── 404.astro          # Path-prefix locale-aware 404 page
│   │   ├── icons.svg.ts       # SVG sprite endpoint
│   │   ├── site.webmanifest.ts # Web app manifest generated from app.config.json
│   │   ├── rss.xml.ts         # Atom feed for all published articles
│   │   ├── sitemap.xml.ts     # Multi-lingual sitemap with x-default + lastmod
│   │   ├── robots.txt.ts      # Robots.txt pointing to sitemap
│   │   └── api/search-dev.json.ts # Locale-aware search fallback index
│   ├── paraglide/             # Generated Paraglide code (gitignored, do not edit)
│   ├── styles/
│   │   ├── global.css         # Tailwind v4 @theme inline + glass design system + font stacks
│   │   └── prose.css          # Article formatting with RTL isolation for code blocks
│   └── views/
│       ├── PageView.astro     # Static page renderer
│       ├── BlogIndexView.astro # Blog listing page
│       └── BlogPostView.astro # Individual article renderer
```

---

## ⚙️ Configuration

All application-level values that must stay in sync across the app and the CLI scripts live in [`app.config.json`](app.config.json):

* **`site`** — name, short name, description, default social card path and size.
* **`brand`** — browser theme/background colours, Apple touch icon, manifest icons.
* **`blog.postsPerPage`** — how many posts one index page holds.
* **`server`** — dev host/port, also used as the local fallback site origin.

[`src/libs/config/app.ts`](src/libs/config/app.ts) validates that file with Zod and exposes typed values (`siteConfig`, `POSTS_PER_PAGE`, hero defaults, `absoluteUrl`). The asset generator, web manifest, and smoke tests read the same file. Framework-only settings remain in `astro.config.mjs`, and locale configuration in `src/i18n/locales.ts` + `project.inlang/settings.json`.

---

## 🛠️ Developer CLI Suite

All automation scripts run from the terminal using `pnpm run <command>`:

| Command | Action | Example |
| :--- | :--- | :--- |
| `pnpm run new:page` | Scaffolds a new page across all locales | `pnpm run new:page contact -- --title="Contact Us"` |
| `pnpm run new:post` | Scaffolds a new blog post across all locales | `pnpm run new:post ai-trends -- --title="AI Trends" --publish` |
| `pnpm run remove:page` | Deletes a page and cleans dictionary navigation keys | `pnpm run remove:page contact -- --force` |
| `pnpm run remove:post` | Deletes a blog post across all locales | `pnpm run remove:post ai-trends -- --force` |
| `pnpm run i18n:add-lang` | Adds a new language, dictionary, and content files | `pnpm run i18n:add-lang -- es --name="Español" --with-content` |
| `pnpm run i18n:remove-lang` | Removes a language and cleans associated files | `pnpm run i18n:remove-lang -- es --with-content --force` |
| `pnpm run block:adapt` | Adapts external Tailwind HTML/JSX to logical RTL tokens | `pnpm run block:adapt -- --file=src/components/MyCard.astro` |
| `pnpm run i18n:extract` | Extracts raw copy into Paraglide message keys | `pnpm run i18n:extract -- --target=src/components/MyCard.astro --key=card --auto-add --replace` |
| `pnpm run i18n:add` | Adds a single translation key to all dictionaries | `pnpm run i18n:add -- --category=nav --key=docs --en="Docs" --fa="مستندات"` |
| `pnpm run audit:i18n` | Audits locale-config parity, placeholders, used keys, content and route collisions | `pnpm run audit:i18n` |
| `pnpm run smoke` | Runs HTML, SEO, feed, manifest and H1 assertions on `dist/` | `pnpm run smoke` |
| `pnpm run knip` | Finds dead files, exports and dependencies | `pnpm run knip` |
| `pnpm run assets:generate` | Regenerates PNG icons, the OG image, and all hero/cover artwork next to the content groups | `pnpm run assets:generate` |

---

## 📖 Operational Guide

### 1. Adding a New Page
Run the scaffolding CLI:
```bash
pnpm run new:page team -- --title="Our Team"
```
This will:
1. Create `src/content/pages/team/{en,de,fr,fa,ar}.mdx`.
2. Generate localized slugs (`slug: "team"`, `slug: "team-de"`, etc.).
3. Register the `nav_team` translation key in all `messages/*.json` files.
4. Point every locale's `image` frontmatter at `./team.png` — the artwork sits next to the entries — and generate that artwork.
5. Recompile Paraglide messages automatically.

Pass `--image=cover.png` to use a different file: the path is looked up next to the content group and in the project root, then copied into the group folder, because the frontmatter reference is relative to the entry file. Pass `--image=none` to leave the page without artwork of its own.

To display the new page in the navigation bar, register it once in the navigation single source of truth — the header, mobile drawer, and footer all consume `getNavigation()`:
```ts
// src/libs/config/navigation.ts
const PAGE_ITEMS = [
  // ...
  { group: 'team', label: (locale) => m.nav_team({}, { locale }) },
] as const;
```
No template edits are required.

### 2. Adding a New Blog Post
Run the article scaffolder:
```bash
pnpm run new:post modern-web -- \
  --title="Modern Web Development" \
  --category=engineering \
  --tags="astro,performance" \
  --image=cover.png \
  --publish
```
This generates synchronized files in `src/content/blog/modern-web/` across all supported languages. You can customize the localized `slug` in each file's frontmatter (e.g. `slug: "توسعه-وب-مدرن"` in `fa.mdx`).

Without `--image`, the post points at its group cover `./<group>.png` — next to the entries — and that artwork is generated for you. Pass `--image=none` to use the shared hero artwork instead.

#### Blog frontmatter
| Field | Purpose |
| :--- | :--- |
| `image` | Featured cover (`./<file>.png`, relative to the entry), rendered on cards, the article hero, and `og:image`. Astro resolves it against the entry file and optimizes it. |
| `categories` | Language-neutral keys such as `engineering`. Rendered from `blog_category_<key>`. |
| `tags` | Language-neutral keys such as `i18n`. Rendered from `blog_tag_<key>`. |
| `author` | Optional byline, also emitted in the `BlogPosting` JSON-LD. |

Taxonomy keys must be lowercase ASCII with single hyphens (`design-systems`) because they double as URL query values. Their visible labels live in `messages/*.json`; `pnpm run i18n:add` can add a label for a new key. Unknown keys still render, humanized (`design-systems` → “Design Systems”).

Covers are generated from code, one per blog group:
```bash
pnpm run assets:generate
```

#### The hero band
Every page and post opens with a hero band rendered by `src/components/PageHero.astro`:

* The entry's `image` frontmatter **is** the background of the band — one full-bleed image layer. It is never cropped into a card beside the copy and never duplicated.
* The image is defocused (`blur-md` with a slight scale-up) so it reads as atmosphere rather than as a competing picture, and the copy sits on top of it.
* Three overlays shape the light: a flat tonal wash, a scrim that deepens towards the bottom where the copy sits, and a wash under the fixed header. All are vertical or flat, so the band is identical in LTR and RTL.
* Inner copy is passed through the default slot: `HeroCopy.astro` for pages and the blog index, `BlogPostHeroContent.astro` for articles. `PageHero` renders no copy of its own.
* Without an `image`, the shared photograph `src/assets/hero/hero-0.jpg` is used.
* The per-group artwork is drawn from code by `scripts/generate-assets.mjs`, so it is reproducible and needs no image editor. The palette is luminance-normalised, so every hue reads at the same perceived brightness.

#### The image pipeline
Every picture on the site is served through Astro's image pipeline, never as a raw file:

* A group's artwork lives next to its entries (`src/content/<collection>/<group>/<group>.png`), because the frontmatter reference is relative to the entry file. The shared photograph is imported from `src/assets/hero/`.
* Astro's `image()` schema helper (`src/content.config.ts`) resolves the frontmatter reference against the entry file and checks that the file exists, so a path with no asset behind it fails the build instead of silently rendering a broken hero.
* `<Image>` renders WebP with a responsive `srcset`; the hero offers `sizes="100vw"` and the blog cards `(min-width: 1024px) 310px, (min-width: 640px) 50vw, 100vw`. The widths are capped at the width of the source, so a picture is never upscaled.
* `og:image` is built by `src/libs/content/social.ts`: the artwork is cropped to the 1.91:1 social ratio and encoded as JPEG, so a crawler never downloads the full-size file.

#### Blog listing, filtering, and taxonomy
* The index at `/blog/` renders a responsive card grid with cover art, category badge, tags, date, and reading time.
* Category pills and tag chips filter the grid client-side and sync the URL (`?category=engineering&tag=astro,rtl`), so filtered views are shareable and deep-linkable. Tags combine with AND semantics; category and tag filters combine too.
* A live `role="status"` line reports how many articles match, and a “Clear filters” action appears whenever a filter is active. Without JavaScript every article stays visible — filtering is progressive enhancement.
* Post pages show the featured image, category/tag links back into the filtered index, reading time, and `articleSection`/`keywords` metadata.

#### Blog pagination
The index is paginated statically — no client-side slicing, no infinite scroll:

* The page size is a single value, `blog.postsPerPage` in `app.config.json` (default `9` — three columns × three rows), exposed as `POSTS_PER_PAGE` by `src/libs/config/app.ts`. The route builder, the view, and the smoke test read the same value, so the number of generated pages and the number of rendered cards can never drift apart.
* One page is one route, per locale. Page one is the index itself (`/blog/`), every later page lives under `/blog/page/<n>/` and is localized like every other URL (`/de/blog/page/2/`, `/fa/blog/page/2/`).
* The page count of a locale follows from the number of *published* posts that locale has, so a locale with fewer posts simply has fewer pages. The `alternates` map falls back to the last available page, so the language switcher never leads to a missing URL.
* The pager is rendered by `src/views/BlogIndexView.astro` only when there is more than one page. Its arrows use the `chevron-left` icon flipped with `rtl:rotate-180` / `rotate-180 rtl:rotate-0`, so they follow the reading direction, and every pager link keeps the active taxonomy filter.
* `Seo.astro` and `BaseLayout.astro` accept `prevUrl` / `nextUrl` and emit `<link rel="prev">` / `<link rel="next">`; pages beyond the first get a distinct document title (`Blog — Page 2 of 3`).
* `pnpm run smoke` derives the expected page count from the content collection and asserts that every page exists, that the `rel="prev"` / `rel="next"` links point at the right neighbours, and that no page beyond the last one was generated.

### 3. Adding a New Language
To add Spanish (`es`), Italian (`it`), or another language:
```bash
pnpm run i18n:add-lang -- es --name="Español" --dir="ltr" --with-content --from=en
```
The script automatically:
* Registers `es` in `project.inlang/settings.json`.
* Creates `messages/es.json`.
* Updates `LOCALES` and metadata in `src/i18n/locales.ts`.
* Generates `es.mdx` files for all existing pages and blog posts.
* Recompiles Paraglide messages.

### 4. Swapping the Default Language
To make Persian (`fa`) or Arabic (`ar`) the prefix-less default:
1. In `src/i18n/locales.ts`:
   ```typescript
   export const DEFAULT_LOCALE: Locale = 'fa';
   ```
2. In `project.inlang/settings.json`:
   ```json
   "baseLocale": "fa"
   ```
3. Run verification:
   ```bash
   pnpm run messages:compile && pnpm test && pnpm run audit:i18n && pnpm run build && pnpm run smoke
   ```
Persian instantly routes to `/`, `/درباره-ما`, `/قیمت‌گذاری`, while English routes to `/en`, `/en/about`, etc.

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

To flip arrow icons in RTL layouts, use Tailwind's `rtl:` variant:
```astro
<span class="inline-block rtl:rotate-180">→</span>
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

Icon-only controls go through one component, so their size, shape and accessible name are consistent:
```astro
<IconButton icon="search" label={m.common_search_placeholder({}, { locale })} data-open-search />
```

The glass palette is tokenised (`--color-glass`, `--color-glass-control`, `--color-glass-border`, `--color-glass-hover`), so the translucency of the whole site is tuned from one place.

---

## 🧪 Testing & Verification

Run the full quality assurance pipeline:

```bash
# 1. TypeScript Strict Check
pnpm run lint

# 2. Vitest Unit Tests (paths, ICU, routes, and CLI helpers)
pnpm test

# 3. i18n Parity, Placeholder, Content & Route Audit
pnpm run audit:i18n

# 4. Production Build & Pagefind Indexing (runs the audit first)
#    Locally it falls back to the dev origin in app.config.json with a warning;
#    in CI (CI=true) it fails unless SITE_URL is set.
SITE_URL=https://example.com pnpm run build

# 5. Post-Build HTML, SEO, Feed & Asset Smoke Test
pnpm run smoke

# 6. Dead Code / Dependency Check
pnpm run knip

# Regenerate icons, the Open Graph image, and all hero/cover artwork
pnpm run assets:generate
```

The same pipeline runs on every push and pull request in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) against a throwaway `SITE_URL`.

---

## 📄 License

MIT
