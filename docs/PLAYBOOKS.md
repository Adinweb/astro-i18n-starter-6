# AI Playbooks & Architectural Reference

This document holds the full directory layout and step-by-step verified playbooks moved out of `AGENTS.md` to keep the root agent manual lightweight (`< 12 KB`).

---

## Directory Layout & Architectural Map

```text
/
├── .agents/skills/            # Agent skills (astro-i18n-starter/SKILL.md + references/)
├── .pages.yml                 # Pages CMS schema for client content + client/cms.json editing
├── app.config.json            # Upstream core defaults (site, brand, business, analytics, content types, redirects, blog, cookies, API, server)
├── client/                    # Client-owned workspace (survives upstream merges cleanly):
│   ├── config.json            # Agency/CLI sparse overrides merged onto app.config.json (incl. ui.navigation, ui.homeSections, content.types)
│   ├── cms.json               # Pages CMS non-technical settings layer (sanitized + merged atop client/config.json)
│   ├── locales.json           # SSOT for active locales, defaultLocale, and metadata (dir, font, htmlLang)
│   ├── messages/              # Client translation overrides & new keys (<locale>.json)
│   ├── navigation.ts          # CLIENT_PAGE_ITEMS + custom primary extras, footer columns & legal links (merged with ui.navigation)
│   ├── content.ts             # Custom Astro contentCollections & CLIENT_CONTENT_TYPES UI metadata
│   ├── icons.ts & ClientIcons.astro # Extra client Tabler icons merged into <Icon />
│   ├── LayoutHooks.astro      # Custom `top-banner`, `<head>`, and `<body>`-end slots inside BaseLayout
│   ├── styles.css             # Client CSS tokens & @font-face commercial Persian font slots (@source "../../client")
│   └── templates/index.ts     # Custom page templates merged into PageView.astro
├── deploy/                    # Build-generated server redirect configs (`nginx-redirects.conf`, `.htaccess-redirects`; outside `dist/`)
├── docs/
│   ├── BLOCKS-API.md          # Auto-generated < 5 KB component & Props catalog (`npm run blocks:catalog`)
│   ├── PLAYBOOKS.md           # This file: directory map + operational playbooks
│   └── deploy/                # Production Nginx config (`nginx.conf`) & webhook starter (`cloudflare-worker-webhook.js`)
├── messages/core/             # Upstream core UI dictionaries (en.json, fa.json)
├── starter-kit/               # Optional demo pages, blog posts, projects & 6 industry blueprints (`npm run starter:seed`)
├── public/                    # Static assets (_headers, chronotrig.min.js, favicons, manifest, default OG)
├── scripts/                   # Developer CLI, QA, health check, sync, Pagefind indexing & upstream check scripts
│   ├── site-apply.mjs         # One-shot declarative site provisioner (`--spec=<path>`, `--dry-run`, `--skip-assets`, `--json`)
│   ├── blocks-catalog.mjs     # Auto-generates `docs/BLOCKS-API.md` from TypeScript AST (`--check`, `--json`, `--quiet`)
│   ├── i18n-sync-keys.mjs     # Scans static `m.*()`, `content.types`, nav & frontmatter to fill missing dictionary keys
│   └── lib/                   # Shared modules (config, blueprints, blocks-catalog, site-apply, i18n-sync, frontmatter, redirects, ...)
├── src/
│   ├── assets/hero/hero-0.jpg # Shared hero photograph fallback
│   ├── components/            # Core chrome (`HomeHero`, `SiteTopBanner`, `QuickContactWidget`, `AnalyticsScripts`, `ThemeToggle`, `DevThemePreview`, `LanguageSwitcher`, `DrawerNavLink`, `PageHeader`, `PageHero`, `PageSection`, `SectionComposer`, `HeroCopy`, `BlogPostHeroContent`, `PostCard`, `CollectionBrowser`, `SearchModal`, `DrawerSearch`, `CookieConsent`, `ContactForm`, `Seo`, `TopLoadingBar`)
│   │                          # + 29 section blocks (7 hero + 22 structural) & 4 interactive/motion showcases (`BentoGrid`, `LatestPostsCarousel`, `SwipeableTabs`, `TestimonialMarquee`) + `ui/` (35 UI primitives incl. `Icon`, `IconButton`, `Button` — guarded by `blocks.test.ts`)
│   ├── content/               # Symmetrical content collections:
│   │   ├── pages/<group>/     # Static pages (<locale>.mdx per active locale + hero artwork; optional `sections: [{ block, props }]`)
│   │   ├── blog/<group>/      # Blog posts with localized slugs (+ cover artwork)
│   │   └── projects/<group>/  # Case studies/portfolio entries + any declarative client collections (`gallery`, `products`, …)
│   ├── i18n/                  # Core i18n engine (`locales.ts`, `format.ts`, `paths.ts`)
│   ├── layouts/               # BaseLayout.astro
│   ├── libs/                  # Core services (`api/client.ts`, `config/{app,client,defaults,theme,navigation}.ts`, `content/*`, `cookies/`, `search/`, `ui/{button,icons,sections}.ts`)
│   ├── pages/                 # Minimal physical pages (`[...path].astro`, `404.astro`, `og/`, `llms.txt.ts`, `rss*`, `sitemap.xml.ts`, `robots.txt.ts`, `api/*.json.ts`)
│   ├── paraglide/             # AUTO-GENERATED compiled messages (DO NOT EDIT)
│   ├── scripts/               # Client modules (`navbar.ts`, `chronotrig.ts`, `lenis.ts`)
│   ├── styles/                # `global.css`, `prose.css`, `chronotrig.css`
│   ├── types/                 # `tabler-icons-astro.d.ts`
│   └── views/                 # Presentation views (`PageView`, `BlogIndexView`, `BlogPostView`, `CollectionIndexView`, `CollectionEntryView` + `pages/HomePageTemplate`)
```

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
   npm run check:quick && npm run audit:i18n && npm run build && npm run smoke
   ```
3. **Expected Outcome**:
   - Persian (`fa`) routes to prefix-less URLs (`/`, `/درباره-ما/`, `/blog/...`).
   - English (`en`) routes to prefixed URLs (`/en/`, `/en/about/`, `/en/blog/first-post/`).
   - Hreflang `x-default`, canonical URLs, and sitemap update automatically.

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
* Disabling never deletes content; it removes the index/entry routes, sitemap entries, header/drawer/footer link, and home-page CTA. `/api/blog-posts.json` and `/rss.xml` keep working so external consumers do not break.

### 2. Inspect what is ready
```bash
npm run content:status                      # group × locale matrix
npm run content:status -- --write=docs/STATUS.md
npm run doctor                              # setup health, with a fix hint per finding
npm run upstream:check                      # verifies core vs client/ separation
```

### 3. Add a declarative collection (e.g. `gallery` or `services`) — Zero Core Edits
1. **Config-First Definition (`client/config.json`)** — declare `content.types.<key>` directly (or apply an industry blueprint via `site:init --blueprint=...` / `site:apply`, which injects domain `content.types` and runs `content:sync` without sample entries): `base`, `labels`/`descriptions`, `sortBy`/`sortOrder`, `fields[]` (`type`, `filter: { mode: 'single' | 'multi' | 'select' | 'toggle' | 'range', param, ... }`, `showOnCard`, `showOnEntry`), `search`, and `card` (`layout`, `aspectRatio`).
2. **Sync CMS & Folders** — run `npm run content:sync` so `.pages.yml` and `src/content/<key>/` match `content.types`.
3. **Sync Missing Keys** — run `npm run i18n:sync-keys` to generate any missing `nav_<key>`, `<key>_index_description`, or field/option keys into `client/messages/*.json` and compile Paraglide.
4. **Scaffold, embed, and verify**:
```bash
npm run content:new gallery studio-shot -- --title="Studio Shot" --publish
npm run assets:generate
npm run content:sync -- --check
npm run check:quick && npm run upstream:check && npm run doctor && npm run build && npm run smoke && npm run link:check
```

---

## Playbook 3: Composable Blocks, Blueprints & Declarative Composition

1. **Inspect `docs/BLOCKS-API.md` First (`npm run blocks:catalog`)**:
   Before reading source `.astro` files, check `docs/BLOCKS-API.md` (< 5 KB) for exact Props & defaults across all **7 heroes**, **22 structural sections + `SectionComposer`**, **4 interactive showcases**, core components, and **35 UI primitives**.
2. **Industry Blueprints (`corporate`, `agency`, `portfolio`, `medical`, `catalog`, `legal`)**:
   Every blueprint in `scripts/lib/blueprints.mjs` configures palette, font pairing, enabled built-ins (`blog`/`projects`), and **domain `content.types`**, automatically invoking `content:sync` without seeding dummy entries.
3. **Declarative Page Composition via `SectionComposer.astro` (`sections` / `ui.homeSections`)**:
   Instead of authoring custom `.astro` wrappers, pass declarative section arrays in either page MDX frontmatter (`sections: [{ block, props }]`) or `client/config.json` (`ui.homeSections`):
   ```yaml
   ---
   title: "Services"
   slug: "services"
   hero: "none"
   container: "canvas"
   flushTop: true
   sections:
     - block: LandingHeroSplit
       props:
         title: "Precision Engineering"
         image: "./hero.jpg"
     - block: FeatureCardGrid
       props:
         surface: "surface"
     - block: CtaBanner
   ---
   ```
   `SectionComposer.astro` supports all **29 section blocks** (7 heroes + 22 structural sections), resolves relative `image` / `parallaxImage` / `bottomImage` / `avatar` paths cleanly, assigns `h1` vs `h2` based on `hasPageH1`, and applies `contained` automatically.
4. **One-Shot Provisioning (`npm run site:apply`)**:
   Apply brand, config, blueprint, `ui.navigation`, `ui.homeSections`, pages (`sections`), collection entries, localized messages, locale modes, `i18n:sync-keys`, and brand assets in one declarative JSON pass:
   ```bash
   npm run site:apply -- --spec=site-spec.json --dry-run
   npm run site:apply -- --spec=site-spec.json
   ```
   Use `--skip-assets` during quick iterations or `--json` for structured output.
5. **Visual Setup & Control Panel (`npm run studio` or `/__studio/` in `npm run dev`)**:
   Open `http://localhost:3000/__studio/` while `npm run dev` runs (or run standalone `npm run studio`) for a bilingual RTL/LTR GUI covering the New Site Wizard (`site:apply`), `client/config.json` & `ui.navigation` editor, visual Page `SectionComposer`, locale/dictionary management (`i18n:sync-keys`), live site health diagnostics (`/api/health`), and allow-listed CLI checks. Disabled automatically in `npm run build` so `dist/` remains 100% pure SSG.
6. **Tailwind RTL & Button Rules**:
   Use `npm run block:adapt -- --file=...`, `npm run i18n:extract -- --target=...`, `<Button>` (`src/components/ui/Button.astro` / `buttonClasses()`), `<IconButton>`, and `<Icon>` (custom client icons in `client/icons.ts` + `client/ClientIcons.astro`).

---

## Playbook 4: Adding Languages, Content & Config-First Navigation

### 1. Config-First Navigation (`ui.navigation` + `client/navigation.ts`)
You can declare/override primary page links and footer columns right inside `client/config.json` under `ui.navigation`:
```json
{
  "ui": {
    "ctaPage": "contact",
    "navigation": {
      "pages": [
        { "group": "services", "icon": "sparkles", "labels": { "en": "Services", "fa": "خدمات" } }
      ],
      "footerColumns": [
        {
          "key": "company",
          "titles": { "en": "Company", "fa": "شرکت" },
          "items": [{ "key": "about", "group": "about" }]
        }
      ]
    }
  }
}
```
Items from `ui.navigation` **merge cleanly** with `client/navigation.ts` (`group`/`key` matches override; new items append). Prefer `ui.navigation` when adding simple links or wiring pages via `site:apply`, and keep `client/navigation.ts` for complex dynamic dropdowns.

### 2. Adding a Language & Syncing Keys (`i18n:add-lang`, `i18n:sync-keys`)
```bash
npm run i18n:add-lang -- ar --with-content --from=en
npm run i18n:sync-keys -- --dry-run   # preview missing keys
npm run i18n:sync-keys                # fill baseLocale with humanized English & others with [TODO: <locale>] <English> + compile
```
Always use `--from`, `--title:<locale>`, `--slug:<locale>`, `npm run new:page`, `npm run new:post`, and `npm run i18n:add-batch` for batch copy updates.

---

## Playbook 5: Removing Languages & Content (Clean Lifecycle)
* `npm run i18n:remove-lang -- ar --with-content --force` (guards `DEFAULT_LOCALE`, cleans `client/locales.json`, `client/messages/`, optional `.mdx` files, recompiles Paraglide).
* `npm run remove:post <slug> [--locale=de] -- --force`
* `npm run remove:page <page-key> [--locale=de] -- --force` (cleans `nav_<key>` and warns on any remaining references).

---

## Playbook 6: Working with the Paginated Blog Index
* Configure page size via `"blog": { "postsPerPage": 9 }` (`POSTS_PER_PAGE`).
* Build URLs exclusively with `getBlogPageHref(page, locale)` and math with `paginate()` / `buildPageWindow()` (`src/libs/content/pagination.ts`).
* Multi-page category/tag filtering loads static `/api/blog-posts/<locale>.json` catalogs and emits `rel="prev"` / `rel="next"`.

---

## Playbook 7: Viewport Reveals, Staggered Grids & ChronoTrig v6.2.0 Motion
* Scoped under `.js [data-trig]` (`src/styles/chronotrig.css`) with `data-trig-once="true"` so ChronoTrig unobserves after animation and releases `will-change: auto`.
* Logical horizontal vectors only: `data-trig-direction="start|end"`, `.clipStart`. Additive delays use `.trig-delay-*` (never `data-trig-delay`).
* `[data-trig-stagger data-trig-once="true"]` on parent grid/list containers; put hover `transition` classes on inner child wrappers, never `[data-trig]` roots. Filter updates call `replayStaggerGrid(grid)` from `@/scripts/chronotrig` (`data-trig-root-margin="0px"` below tall heroes); dynamic appends call `refreshChronoTrig()`. Never refresh on mounted tab switches (`SwipeableTabs`, `FeatureTabsSection`).
* Pinned sections (`[data-trig-pin]`, `[data-trig-timeline]`) require `overflow-x: clip` (never `overflow-x: hidden`). Add `data-lenis-prevent` on scrollable modals/drawers (`overflow-y-auto`). Avoid `blur-2xl`/`blur-3xl` glow layers (use `.hero-glow-*`) and nested `backdrop-blur`, set `loading="lazy"` below the fold, and gate scrubbers/counters/marquees (`ParallaxSection`, `UiProgress`, `TestimonialMarquee`) via `IntersectionObserver` + `data-motion="reduced"`. See `.agents/skills/astro-i18n-starter/references/scroll-and-motion.md`.

---

## Playbook 8: Page Layouts, Top Banner, Serverless Forms & Production Artifacts
* **Layouts (`pages`)**: Schema defaults `hero: "none"`, `container: "canvas"`. Use `hero: "minimal"` (`PageHeader`), `hero: "default"` (`PageHero`), `container: "contained" | "prose"`, `flushTop: true`, `template: "<name>"` (`client/templates/index.ts`), or declarative `sections: [...]`. Never use `layout:` in MDX frontmatter.
* **Top Banner, Adaptive Navbar & Quick Contact**: Configure `ui.topBanner` (scheduled strips, session/persistent dismiss, or stacked `items[]`), `<LayoutHooks slot="top-banner" />`, `ui.navbar` (`ResizeObserver` banner clearance), and `ui.quickContact`.
* **Pure SSG External APIs & Privacy**: Configure `api.provider` (`custom | web3forms | formspree | basin | webhook`), `turnstileSiteKey`, `api.redirects`, `business` (`Organization` / `LocalBusiness` JSON-LD), and consent-gated `analytics` (`CookieConsent.astro`, Consent Mode v2). Forms gracefully omit themselves in favor of `site.contactEmail` `mailto:` fallback if no endpoint is configured.
* **Redirects, `/llms.txt` & QA**: Exact and `/*` -> `:splat` redirects emit `dist/_redirects`, `deploy/nginx-redirects.conf`, and `deploy/.htaccess-redirects`. Verify with `npm run check:quick`, `npm run audit:i18n -- --quiet`, `npm run build`, `npm run smoke -- --quiet`, `npm run link:check -- --quiet`, `npm run doctor:handoff`, and `npm run qa:browser`.

---

## Playbooks A–H Quick Lookup

* **Playbook A (Add Nav Link)**: Create page (`new:page <key>`), add `{ group, icon, labels }` in `ui.navigation.pages` (`client/config.json`) or `CLIENT_PAGE_ITEMS` (`client/navigation.ts`), run `i18n:sync-keys` + `check:quick`.
* **Playbook B (Swap Default / Single-Language)**: `npm run i18n:set-default fa` + `"ui": { "showLanguageSwitcher": false }` (or optional `i18n:solo fa`).
* **Playbook C (Canvas Pages & Heroes)**: Use `hero: "none"`, `container: "canvas"`, optional `flushTop: true`, declarative `sections: [{ block, props }]` (`SectionComposer.astro`), or `template: "<name>"`; keep **exactly one `<h1>`**.
* **Playbook D (Add Icon)**: Import individual `@tabler/icons-astro/dist/esm/icons/<name>.mjs` modules inside `client/ClientIcons.astro` + list in `client/icons.ts`. Never import barrel or paste raw `<svg>`. Clone `<template data-icon-template>` in JS.
* **Playbook E (Blog Pagination)**: Set `blog.postsPerPage` in `client/config.json`; use `getBlogPageHref` + `paginate()`.
* **Playbook F (ChronoTrig & Lenis)**: See Playbook 7 & `references/scroll-and-motion.md`.
* **Playbook G (Content Types)**: Declare `content.types.<key>` -> `npm run content:sync` -> `npm run i18n:sync-keys` -> `npm run content:new` -> `<CollectionBrowser collection="<key>" />`.
* **Playbook H (64 Guarded Blocks + 4 Showcases)**: Consult `docs/BLOCKS-API.md` (`npm run blocks:catalog`) before building custom markup; compose declaratively via `SectionComposer` (`sections` / `ui.homeSections`).
