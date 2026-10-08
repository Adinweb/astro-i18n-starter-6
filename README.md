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
* **Search Built-In**: Production indexing with **Pagefind** over static output, plus an instant dev-mode JSON search fallback.
* **SVG Sprite Endpoint**: Zero-JS, cacheable build-time SVG sprite (`/icons.svg`) with an `<Icon name="..." />` component.
* **Turnkey Developer CLI Suite**: 11 automation scripts to scaffold pages/posts, add/remove languages, adapt Tailwind blocks, extract translations, and audit dictionary parity.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** `>= 22.12.0`
* **npm** (or `pnpm`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Background Mode**: If running in an agentic or background environment:
> ```bash
> astro dev --background
> ```
> Manage the background process with `astro dev status`, `astro dev logs`, and `astro dev stop`.

### 3. Build for Production
```bash
npm run build
```
This compiles Paraglide messages, builds all static HTML pages into `dist/`, and indexes the site with Pagefind.

---

## 📁 Project Structure

```text
├── .agents/skills/            # AI Agent skills (e.g. astro-i18n-starter)
├── messages/                  # Dictionaries (en.json, de.json, fr.json, fa.json, ar.json)
├── project.inlang/            # Paraglide JS configuration & settings
├── public/                    # Static assets (favicons, robots, etc.)
├── scripts/                   # Developer automation CLI scripts (11 tools)
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Icon.astro         # SVG sprite icon renderer (<Icon name="..." />)
│   │   ├── LanguageSwitcher.astro # Dropdown with translated alternate links
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
│   │   └── content/service.ts # Route resolution, slug alternates & breadcrumbs
│   ├── pages/
│   │   ├── [...path].astro    # Lean Router Dispatcher (< 30 lines)
│   │   ├── 404.astro          # Path-prefix locale-aware 404 page
│   │   ├── icons.svg.ts       # SVG sprite endpoint
│   │   ├── sitemap.xml.ts     # Multi-lingual sitemap with x-default
│   │   ├── robots.txt.ts      # Robots.txt pointing to sitemap
│   │   └── api/search-dev.json.ts # Dev-mode search endpoint
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

All automation scripts run from the terminal using `npm run <command>`:

| Command | Action | Example |
| :--- | :--- | :--- |
| `npm run new:page` | Scaffolds a new page across all locales | `npm run new:page contact -- --title="Contact Us"` |
| `npm run new:post` | Scaffolds a new blog post across all locales | `npm run new:post ai-trends -- --title="AI Trends" --publish` |
| `npm run remove:page` | Deletes a page and cleans dictionary navigation keys | `npm run remove:page contact -- --force` |
| `npm run remove:post` | Deletes a blog post across all locales | `npm run remove:post ai-trends -- --force` |
| `npm run i18n:add-lang` | Adds a new language, dictionary, and content files | `npm run i18n:add-lang -- es --name="Español" --with-content` |
| `npm run i18n:remove-lang` | Removes a language and cleans associated files | `npm run i18n:remove-lang -- es --with-content --force` |
| `npm run block:adapt` | Adapts external Tailwind HTML/JSX to logical RTL tokens | `npm run block:adapt -- --file=src/components/MyCard.astro` |
| `npm run i18n:extract` | Extracts raw copy into Paraglide message keys | `npm run i18n:extract -- --target=src/components/MyCard.astro --key=card --auto-add --replace` |
| `npm run i18n:add` | Adds a single translation key to all dictionaries | `npm run i18n:add -- --category=nav --key=docs --en="Docs" --fa="مستندات"` |
| `npm run audit:i18n` | Audits dictionary parity, content parity & slug collisions | `npm run audit:i18n` |
| `npm run smoke` | Runs HTML smoke test assertions on `dist/` | `npm run smoke` |

---

## 📖 Operational Guide

### 1. Adding a New Page
Run the scaffolding CLI:
```bash
npm run new:page team -- --title="Our Team"
```
This will:
1. Create `src/content/pages/team/{en,de,fr,fa,ar}.mdx`.
2. Generate localized slugs (`slug: "team"`, `slug: "team-de"`, etc.).
3. Register the `nav_team` translation key in all `messages/*.json` files.
4. Recompile Paraglide messages automatically.

To display the new page in the navigation bar, add the link in `src/layouts/BaseLayout.astro`:
```astro
const teamHref = await getPageUrl('team', locale);

// In desktop <nav>:
<a href={teamHref} data-nav-link="team" class="hover:text-primary transition-colors">
  {m.nav_team({}, { locale })}
</a>
```

### 2. Adding a New Blog Post
Run the article scaffolder:
```bash
npm run new:post modern-web -- --title="Modern Web Development" --publish
```
This generates synchronized files in `src/content/blog/modern-web/` across all supported languages. You can customize the localized `slug` in each file's frontmatter (e.g. `slug: "توسعه-وب-مدرن"` in `fa.mdx`).

### 3. Adding a New Language
To add Spanish (`es`), Italian (`it`), or another language:
```bash
npm run i18n:add-lang -- es --name="Español" --dir="ltr" --with-content --from=en
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
   npm run messages:compile && npm test && npm run audit:i18n && npm run build && npm run smoke
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
npm run lint

# 2. Vitest Unit Tests (Paths, ICU plurals/ordinals, and Resolvers)
npm test

# 3. i18n Parity Audit
npm run audit:i18n

# 4. Production Build & Pagefind Indexing
npm run build

# 5. Post-Build HTML Smoke Test
npm run smoke
```

---

## 📄 License

MIT
