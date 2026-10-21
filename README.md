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
* **Search Built-In**: Production indexing with **Pagefind** over static output, plus a locale-aware JSON fallback when Pagefind is unavailable.
* **SEO & Social Metadata**: Canonical URLs, hreflang plus `x-default`, Open Graph/Twitter cards, `WebSite`/`BlogPosting` JSON-LD, a multilingual sitemap with `lastmod`, and an Atom feed at `/rss.xml`.
* **Accessible by Default**: Native `<dialog>` mobile menu and search, exactly one `<h1>` per page, skip link, visible focus rings, and reduced-motion support.
* **Image-Backed Hero Bands**: Every page and post opens with a full-bleed hero whose background *is* the entry's artwork — one sharp image layer, never a card beside the copy and never a blurred duplicate. Scrims are vertical only, so the band reads identically in LTR and RTL.
* **Raster Brand Assets From Code**: `scripts/generate-assets.mjs` deterministically produces the app icons, the Open Graph image, and all hero/cover artwork with no image-editing dependency.
* **SVG Sprite Endpoint**: Zero-JS, cacheable build-time SVG sprite (`/icons.svg`) with an `<Icon name="..." />` component.
* **Turnkey Developer CLI Suite**: Automation scripts to scaffold pages/posts, add/remove languages, adapt Tailwind blocks, extract translations, audit dictionary parity, and detect dead code.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** `>= 22.12.0`
* **pnpm** `>= 10` (declared through `packageManager`; the scripts also run under `npm`)

> Builds require `SITE_URL` so canonical, sitemap, RSS, and Open Graph URLs are absolute. Copy `.env.example` to `.env` and set the public origin.

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start the Development Server
```bash
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

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
├── messages/                  # Dictionaries (en.json, de.json, fr.json, fa.json, ar.json)
├── project.inlang/            # Paraglide JS configuration & settings
├── public/                    # Static assets (favicons, robots, etc.)
│   └── images/                # Generated artwork:
│       ├── hero/default.png   # Shared hero background (no page image of its own)
│       ├── pages/<group>.png  # One hero background per page group
│       └── blog/<group>.png   # One cover per blog group
├── scripts/                   # Developer automation CLI scripts (13 tools)
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Icon.astro         # SVG sprite icon renderer (<Icon name="..." />)
│   │   ├── LanguageSwitcher.astro # Dropdown with translated alternate links
│   │   ├── PageHero.astro     # Hero shell: full-bleed background + light-shaping scrims
│   │   ├── HeroContent.astro  # Hero copy for pages and the blog index
│   │   ├── BlogPostHeroContent.astro # Hero copy for articles (breadcrumbs, meta)
│   │   ├── SearchModal.astro  # Accessible search modal (Pagefind + Dev fallback)
│   │   ├── Seo.astro          # Canonical links & hreflang tags (locales + 1)
│   │   └── TopLoadingBar.astro # RTL-aware page transition progress indicator
│   ├── content/               # Multilingual Content Collections
│   │   ├── pages/             # Static pages: home, about, features, pricing
│   │   └── blog/              # Blog articles with localized slugs
│   ├── i18n/                  # Core i18n Single Source of Truth (SSOT)
│   │   ├── locales.ts         # LOCALES array, DEFAULT_LOCALE, metadata (dir, fonts)
│   │   ├── config.ts          # Config re-export
│   │   └── paths.ts           # Pure path functions (localizeHref, localeHref, stripLocale)
│   ├── layouts/
│   │   └── BaseLayout.astro   # Main layout: header, mobile menu drawer, main, footer
│   ├── libs/
│   │   ├── config/site.ts     # Site metadata & Zod validation
│   │   ├── config/navigation.ts # Locale-aware navigation builder
│   │   └── content/service.ts # Route resolution, slug alternates & breadcrumbs
│   ├── pages/
│   │   ├── [...path].astro    # Lean Router Dispatcher (< 30 lines)
│   │   ├── 404.astro          # Path-prefix locale-aware 404 page
│   │   ├── icons.svg.ts       # SVG sprite endpoint
│   │   ├── rss.xml.ts         # Atom feed for all published articles
│   │   ├── sitemap.xml.ts     # Multi-lingual sitemap with x-default + lastmod
│   │   ├── robots.txt.ts      # Robots.txt pointing to sitemap
│   │   └── api/search-dev.json.ts # Locale-aware search fallback index
│   ├── paraglide/             # Generated Paraglide code (gitignored, do not edit)
│   ├── styles/
│   │   ├── global.css         # Tailwind v4 @theme inline + font stacks
│   │   └── prose.css          # Article formatting with RTL isolation for code blocks
│   └── views/
│       ├── PageView.astro     # Static page renderer
│       ├── BlogIndexView.astro # Blog listing page
│       └── BlogPostView.astro # Individual article renderer
```

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
| `pnpm run audit:i18n` | Audits parity, placeholders, used keys, content and route collisions | `pnpm run audit:i18n` |
| `pnpm run smoke` | Runs HTML, SEO, feed, manifest and H1 assertions on `dist/` | `pnpm run smoke` |
| `pnpm run knip` | Finds dead files, exports and dependencies | `pnpm run knip` |
| `pnpm run assets:generate` | Regenerates PNG icons, the OG image, and all hero/cover artwork | `pnpm run assets:generate` |

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
4. Point every locale's `image` frontmatter at `/images/pages/team.png` and generate that artwork.
5. Recompile Paraglide messages automatically.

Pass `--image=/images/pages/team.png` to use a different file, or `--image=none` to leave the page without artwork of its own.

To display the new page in the navigation bar, register it once in the navigation single source of truth — the header, mobile drawer, and footer all consume `getNavigation()`:
```ts
// src/libs/config/navigation.ts
const PAGE_ITEMS = [
  // ...
  { key: 'team', group: 'team', label: (locale) => m.nav_team({}, { locale }) },
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
  --image=images/blog/modern-web.png \
  --publish
```
This generates synchronized files in `src/content/blog/modern-web/` across all supported languages. You can customize the localized `slug` in each file's frontmatter (e.g. `slug: "توسعه-وب-مدرن"` in `fa.mdx`).

Without `--image`, the post points at its group cover `/images/blog/<group>.png` and that artwork is generated for you. Pass `--image=none` to use the shared hero artwork instead.

#### Blog frontmatter
| Field | Purpose |
| :--- | :--- |
| `image` | Featured cover (`/images/...`), rendered on cards, the article hero, and `og:image`. |
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

* The entry's `image` frontmatter **is** the background of the band — one sharp, full-bleed image layer. It is never cropped into a card beside the copy and never blurred.
* Only two overlays shape the light: a scrim that deepens towards the bottom where the copy sits, and a wash under the fixed header. Both are vertical gradients, so the band is identical in LTR and RTL.
* Inner copy is passed through the default slot: `HeroContent.astro` for pages and the blog index, `BlogPostHeroContent.astro` for articles. `PageHero` renders no copy of its own.
* Without an `image`, the shared artwork at `/images/hero/default.png` is used.
* All artwork is drawn from code by `scripts/generate-assets.mjs`, so it is reproducible and needs no image editor. The palette is luminance-normalised, so every hue reads at the same perceived brightness.

#### Blog listing, filtering, and taxonomy
* The index at `/blog/` renders a responsive card grid with cover art, category badge, tags, date, and reading time.
* Category pills and tag chips filter the grid client-side and sync the URL (`?category=engineering&tag=astro,rtl`), so filtered views are shareable and deep-linkable. Tags combine with AND semantics; category and tag filters combine too.
* A live `role="status"` line reports how many articles match, and a “Clear filters” action appears whenever a filter is active. Without JavaScript every article stays visible — filtering is progressive enhancement.
* Post pages show the featured image, category/tag links back into the filtered index, reading time, and `articleSection`/`keywords` metadata.

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
