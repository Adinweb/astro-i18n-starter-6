# AGENTS.md — AI Agent Operating Manual

> **Target:** AI Coding Agents | **Stack:** Astro v7 SSG Multilingual (RTL/LTR), Tailwind v4, Paraglide JS, ChronoTrig v6.2.0

---

## 1. Prime Directive & 10 Non-Negotiable Contract Rules

1. **One Source of Truth (SSOT) & Three-Tier Ownership**:
   - **Core (`src/`, `app.config.json`, `messages/core/`, `scripts/`)**, **Client (`client/`)**, **Demo (`starter-kit/`)**. All client edits live in `client/` so upstream pulls merge cleanly.
   - Locales & directions: `client/locales.json` → `src/i18n/locales.ts`. Formatting: `src/i18n/format.ts` (`formatNumber`, `formatYear`, `formatDate`). Paths: `src/i18n/paths.ts` (`localizeHref`, `localeHref`, `stripLocale`).
   - Schemas & Collections: `src/content.config.ts` builds Zod schemas from `content.types` (`buildConfiguredCollectionSchema()`) + `client/content.ts`. Merged config (`app.config.json` ← `client/config.json` ← `client/cms.json` via `sanitizeCmsConfig`/`mergeLayeredConfig`) flows through `src/libs/config/app.ts`. **Disable sections via `npm run content:disable <type>` — never delete collections.** Sync `.pages.yml` and `src/content/<type>/` via `npm run content:sync`.
   - **Browser Bundle Guard**: Client scripts MUST import `src/libs/config/client.ts` (`CLIENT_COOKIE_CONFIG`, `CLIENT_NAVBAR_CONFIG`, `CLIENT_MOTION_CONFIG`) + zero-import `src/libs/config/defaults.ts` instead of `app.ts` (prevents bundling Zod ~93 KB into client JS).
   - Routes & Content Helpers: `src/libs/content/service.ts` (`getHomeHref` falls back to default locale), `entries.ts`, `blog.ts` (`toggleBlogCategory`/`toggleBlogTag`), `feed.ts`, `pagination.ts`, `schema.ts` (`Organization`/`LocalBusiness`/`Person`/`Product` JSON-LD), `og-card.ts`, `llms.txt.ts`, `redirects.ts` (`_redirects`, `nginx-redirects.conf`, `.htaccess-redirects`).
   - Navigation & Chrome: Config-first `ui.navigation` (`pages`, `footerColumns` in `client/config.json`) merges cleanly with `client/navigation.ts` inside `src/libs/config/navigation.ts` (`getNavigationSlots()` shared by header & drawer). Anchors emit only if their target page exists; `ui.ctaPage` hides if unpublished; `ui.showLanguageSwitcher: false` gives clean single-language mode. `SiteTopBanner` (`ui.topBanner` + `<LayoutHooks slot="top-banner" />`), `ui.navbar` (`ResizeObserver`), `QuickContactWidget`, and `<CollectionBrowser />` wire automatically.
   - Pure SSG Search, Forms & Privacy: Never add SSR routes or backend servers. Forms (`src/libs/api/client.ts`: `custom|web3forms|formspree|basin|webhook` + Turnstile) fall back to `site.contactEmail` `mailto:` when unconfigured. `AnalyticsScripts.astro` is gated by `CookieConsent.astro`. Search uses `scripts/index-pagefind.mjs` + `src/libs/search/persian.ts`.
   - Copy & Icons: Merge `messages/core/<loc>.json` + `client/messages/<loc>.json` → `@/paraglide/messages`. Extend icons in `client/icons.ts` + `client/ClientIcons.astro` importing individual `@tabler/icons-astro/dist/esm/icons/<name>.mjs` modules (never barrel!). No raw `<svg>`; clone `<template data-icon-template>` in JS.
2. **Lean Router Dispatcher**: Never create `src/pages/[lang].astro` or `[slug].astro`. All dynamic routes flow through `src/pages/[...path].astro` → `src/views/` (`PageView`, `BlogIndexView`, `BlogPostView`, `CollectionIndexView`, `CollectionEntryView`). `/api/*.json` endpoints are static build-time catalogs only.
3. **Prefix-less Default Locale**: `DEFAULT_LOCALE` has **no prefix** (`/`, `/about/`); secondary locales have prefixes (`/fa/درباره-ما/`). Never hardcode `/en/` or `/fa/`.
4. **RTL-Native Discipline**: Use CSS logical classes ONLY (`ms-`, `me-`, `ps-`, `pe-`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`, `border-e-*`, `rounded-s-*`). Mirror horizontal gradients (`bg-linear-to-r rtl:bg-linear-l`, `print:bg-none print:text-fg`). Code blocks (`pre`, `code`, `.math`) stay `ltr` (`prose.css`).
5. **Untouchable Generated Code**: Never hand-edit `src/paraglide/` or `.paraglide-work/`. Edit `client/messages/<locale>.json` and run `npm run messages:compile` (or `npm run i18n:sync-keys`).
6. **Static Language Switching**: Always use `window.location.assign(target)` (no SPA view transitions across locales) so `<html lang dir>` and font stacks swap cleanly.
7. **Idempotent Client Scripts**: Guard `astro:page-load` DOM listeners with `if (el.dataset.bound === 'true') return; el.dataset.bound = 'true';` and clean up observers/Embla on `astro:before-swap`.
8. **Render-Time Message Invocation**: Call `m.<key>({}, { locale })` inside template/render cycles — never at module top-level scope.
9. **Shared Visual System & Page Composition**:
   - Semantic OKLCH tokens (`primary`, `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, `error` — zero hardcoded hex in components), `.layout-container` (`max-w-7xl`), `.glass-*`, `.cta`, `.btn-secondary`, and `.chip` live once in `src/styles/global.css`. Text buttons use `<Button>` (`buttonClasses()`); icon controls use `<IconButton>`.
   - `pages` default to `hero: 'none'`, `container: 'canvas'` (also supports `minimal`/`default` heroes, `contained`/`prose` containers, `flushTop`, `template` via `client/templates/index.ts`, **or declarative `sections: [{ block, props }]` / `ui.homeSections` rendered by `src/components/SectionComposer.astro`**). Never use MDX `layout:`. Every page must emit **exactly one `<h1>`**.
10. **ChronoTrig v6.2.0, Lenis & GPU Guardrails**:
    - Scope entrance reveals under `.js [data-trig]` with `data-trig-once="true"`, logical `data-trig-direction="start|end"`, and additive `.trig-delay-*` (never `data-trig-delay`). Put `data-trig-stagger data-trig-once="true"` on parent grids and hover `transition` classes on inner child wrappers (never `[data-trig]` root).
    - Dynamic appends call `refreshChronoTrig()`; filter visibility changes call `replayStaggerGrid(grid)` from `@/scripts/chronotrig` (`data-trig-root-margin="0px"` below tall heroes) — never call on initial render or mounted tab switches (`SwipeableTabs`, `FeatureTabsSection`).
    - `ui.motion` (`revealDelayMs: 0`, `revealDurationMs: 1600`) configures `<html style>`; `resolveMotion()` sets `html[data-motion]` (`reduced` / `@media print` flatten motion). Keep `overflow-x: clip` (never `overflow-x: hidden`) for `[data-trig-pin]` / `[data-trig-timeline]`, add `data-lenis-prevent` on scrollable modals, keep `html { scroll-behavior: auto; }` (`lenis.ts` uses `setExternalScroll(true)` + `sync()`). Avoid `blur-2xl`/`blur-3xl` (use `.hero-glow-*`) and nested `backdrop-blur`; default below-fold `<Image>` to `loading="lazy"`; gate continuous scrubbers/counters/marquees via `IntersectionObserver` + `data-motion="reduced"`.

---

## 2. AI Agent Fast-Path Workflow

1. **Inspect Component APIs First**: Read `docs/BLOCKS-API.md` (`< 5 KB`, generated via `npm run blocks:catalog`) instead of scanning all 90+ `.astro` component source files.
2. **Provision & Compose Declaratively**:
   - Prefer `npm run site:apply -- --spec=spec.json` (`--dry-run` to preview, `--skip-assets` for speed, `--json` for structured logs) to configure brand, blueprint (injects domain `content.types` + `content:sync`), `ui.navigation`, `ui.homeSections`, pages (`sections: [{ block, props }]` across 29 blocks), collection entries, messages, locale switches, `i18n:sync-keys`, and brand assets in one command.
   - Use `ui.navigation` (`pages`, `footerColumns`) in `client/config.json` (merges with `client/navigation.ts`) and `sections` / `ui.homeSections` (`SectionComposer.astro`) before writing custom `.astro` templates.
3. **Sync Copy & Verify Incrementally**: Run `npm run i18n:sync-keys` to fill missing `client/messages/<locale>.json` keys (`defaultLocale` → English, others → `[TODO: <locale>] <English>`), then iterate with `npm run check:quick` (`messages:compile` + `tsc --noEmit` + Vitest `--no-isolate`). Save `npm run preflight` / `qa:browser` for final delivery. Pass `--quiet` / `--json` on `audit:i18n`, `smoke`, `link:check`, `doctor`, and `content:*` to save context tokens.

---

## 3. Essential Commands

| Command | Purpose |
| :--- | :--- |
| `npm run check:quick` | Fast loop: `messages:compile` + `tsc --noEmit` + Vitest (`--no-isolate`) |
| `npm run site:apply -- --spec=<f>` | One-shot apply JSON site spec (`--dry-run`, `--skip-assets`, `--json`) |
| `npm run blocks:catalog` | Regenerate `docs/BLOCKS-API.md` (`--check`, `--json`, `--quiet`) |
| `npm run i18n:sync-keys` | Populate missing dictionary keys in `client/messages/*.json` (`--dry-run`, `--json`) |
| `npm run studio` | Launch local visual Studio GUI (or visit `/__studio/` during `npm run dev`) |
| `npm run client:bootstrap` / `site:init` | Interactive/headless setup (`--blueprint=corporate\|agency\|portfolio\|medical\|catalog\|legal`, `--logo`) |
| `npm run site:reset` / `starter:seed` | Reset `client/config.json` & `cms.json` / seed or `--clean` demo content |
| `npm run new:page` / `new:post` | Scaffold/update pages (`--preset=landing`) or blog posts across locales |
| `npm run remove:page` / `remove:post` | Remove page/post groups (or single `--locale`) cleanly |
| `npm run content:list\|sync\|new\|enable\|disable\|status` | Inspect, sync `.pages.yml`, scaffold, toggle, or matrix-check collections |
| `npm run i18n:add-lang\|remove-lang\|set-default\|solo\|add\|add-batch\|extract` | Manage locales and two-tier Paraglide dictionaries |
| `npm run block:adapt` / `assets:generate` | Convert physical Tailwind to logical RTL / generate `--from-logo` & cover art |
| `npm run lint` / `npm test` / `npm run knip` | Full Astro+TS check / Vitest suite / unused exports check |
| `npm run audit:i18n` / `upstream:check` / `doctor` / `doctor:handoff` | Parity audit (`--quiet`, `--json`), 3-tier hygiene, pre-handoff check |
| `npm run build` / `smoke` / `link:check` / `qa:browser` | SSG build + Pagefind / `dist/` smoke (`--quiet`, `--json`) / link crawl (`--quiet`) / Playwright |
| `npm run preflight` / `preflight:full` / `verify:cli` | Complete delivery gate / + Chromium QA / sandbox CLI E2E check |

---

## 4. Forbidden Anti-Patterns (Zero Tolerance)

| ❌ Forbidden | ✅ Use Instead |
| :--- | :--- |
| Hardcoded `/en/...` or `/fa/...`, or `/projects/...` | `localizeHref()`, `getPageUrl()`, `getContentTypeIndexHref()` |
| Deleting collection to hide section | `npm run content:disable <type>` |
| Physical CSS (`ml-*`, `pr-*`, `left-*`, `text-left`) or one-way `bg-linear-to-r` | Logical (`ms-*`, `pe-*`, `start-*`, `text-start`) & `rtl:bg-linear-l` |
| Hand-editing `src/paraglide/` or `.paraglide-work/`, or top-level `m.*()` | Edit `client/messages/*.json`, run `messages:compile`, call `m.*({}, { locale })` at render |
| Importing `app.ts` in browser scripts | Import `src/libs/config/client.ts` |
| `src/pages/[lang]/...` dynamic files, `layout:` in MDX, multiple `<h1>`s | `src/pages/[...path].astro` dispatcher, `container:` / `sections:`, single `<h1>` |
| Raw `<svg>`/`<path>`, barrel `@tabler/icons-astro` import, raw `<button><Icon>` | `<Icon>`, deep per-icon `.mjs` import, `<IconButton>` / `<Button>`, `<template data-icon-template>` |
| `navigate()` for language switch, unbound `astro:page-load` listeners | `window.location.assign(target)`, `el.dataset.bound = 'true'` guard |
| `display: none` / `opacity-0` reveals, `data-trig-delay`, `overflow-x: hidden` pins | `.js [data-trig]`, `.trig-delay-*`, `overflow-x: clip`, `data-lenis-prevent` |
| Filter `hidden` without replay, `blur-2xl`/`blur-3xl`, eager below-fold `<Image>` | `replayStaggerGrid(grid)` (never on initial render/tabs), `.hero-glow-*`, `loading="lazy"` |

---

## 5. Deep References

- **Component Props (< 5 KB)**: `docs/BLOCKS-API.md`
- **Directory Map & Playbooks 1–8 / A–H**: `docs/PLAYBOOKS.md`
- **Content Types & CMS**: `docs/CONTENT-TYPES-FA.md`
- **Agent Skill References**: `.agents/skills/astro-i18n-starter/references/{cli-automation,navigation,content-and-routing,rtl-styling,scroll-and-motion,verification}.md`
