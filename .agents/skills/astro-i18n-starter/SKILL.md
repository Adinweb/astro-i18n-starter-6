---
name: "astro-i18n-starter"
description: "Workflows, architecture, multi-menu navigation, CLI automation commands, and RTL/LTR rules for developing, maintaining, and extending the Astro v7 i18n SSG starter template."
---

# Astro i18n Starter Skill Guide

This skill coordinates workflows for developing, maintaining, and extending this production-grade Astro v7 multilingual static site generator (SSG) template with native RTL/LTR support.

## Core Directives & Prime Invariants

1. **One Source of Truth (SSOT) & Three-Tier Separation**:
   - **Core (`src/`, `app.config.json`, `messages/core/`, `scripts/`)** vs **Client Workspace (`client/`)** vs **Optional Demo (`starter-kit/`)**. Client changes live in `client/` so upstream updates merge cleanly.
   - Locales & directions: `client/locales.json` (exposed by `src/i18n/locales.ts`).
   - Paths & URLs: `src/i18n/paths.ts` (`localizeHref`, `localeHref`, `stripLocale`).
   - Content schemas: `src/content.config.ts` (spreads `clientCollections` from `client/content.ts`).
   - Content types (`pages`, `blog`, `projects`, plus client collections): `app.config.json` merged with `client/config.json` → `content.types`, validated by `src/libs/content/types.ts` (and `CLIENT_CONTENT_TYPES` in `client/content.ts`). Toggle with `npm run content:enable|disable <type>`; never delete a collection to hide a section.
   - Navigation slots: `client/navigation.ts` (`CLIENT_PAGE_ITEMS`, `getClientPrimaryExtras`, `getClientFooterColumns`, `getClientLegalNavigation`) distributed via `src/libs/config/navigation.ts` (`getNavigationSlots`). The header/drawer CTA target is `ui.ctaPage` in merged config (hides itself if unpublished). Set `ui.showLanguageSwitcher: false` in `client/config.json` for single-language sites without structural deletion.
   - Application, brand logo/theme presets, business profile, cookie & external API config: `app.config.json` + `client/config.json` -> `src/libs/config/app.ts` (`siteConfig`, `POSTS_PER_PAGE`, `API_CONFIG`, `COOKIE_CONFIG`, `UI_CONFIG`, `BLOG_CONFIG`, `SOCIAL_CONFIG`, `BUSINESS_CONFIG`) and `src/libs/config/theme.ts` + `theme-presets.json`. `brand.logo` supports theme-aware light/dark logos; `import.meta.env.DEV`-only `DevThemePreview.astro` provides live palette/font previews.
   - Local SEO & Structured Data (`src/libs/content/schema.ts`): Builds `Organization` / `LocalBusiness` / `Service` JSON-LD from `business` + `social`; `og-card.ts` shapes RTL Persian/Arabic branded OG cards with explicit SVG RTL attributes.
   - Search & Perso-Arabic indexing: `scripts/index-pagefind.mjs`, `src/libs/search/persian.ts`, and `src/libs/search/client.ts`.
   - Pure SSG External/Serverless APIs (Zero Backend): `src/libs/api/client.ts` (`api.provider`: `custom | web3forms | formspree | basin | webhook`, `turnstileSiteKey`, `accessKey`) + `src/components/ContactForm.astro` + `src/components/NewsletterBanner.astro` + `src/components/ContactSplitSection.astro` (quick contact actions & lazy map). Never add a backend server or SSR endpoints; `/api/*.json` routes are static build-time catalogs only.
   - Semantic tokens & `.layout-container` (`1280px`): `src/styles/global.css` + client CSS tokens and commercial Persian `@font-face` hooks in `client/styles.css`.
   - UI copy: Two-tier Paraglide dictionaries (`messages/core/*.json` + `client/messages/*.json`) merged into `.paraglide-work/` and compiled to `@/paraglide/messages`. Never hardcode UI text.
   - CMS & Deployment: `.pages.yml` (Pages CMS config), `public/_headers`, and `docs/deploy/nginx.conf`.
2. **Lean Router Dispatcher**:
   - Centralized exclusively in `src/pages/[...path].astro` -> `src/views/`. Never create dynamic route files (`[lang].astro`, `[slug].astro`) under `src/pages/`.
   - `pages` → `PageView`, `blog-entry` → `BlogPostView`, `blog-index` → `BlogIndexView`; every other enabled type (e.g. `projects`) uses `CollectionIndexView` (with interactive category, tech `stack`, and keyword filtering) / `CollectionEntryView` with `routeType` `collection-index` / `collection-entry`.
3. **Prefix-less Default Locale & Single-Language Option**:
   - Default locale (`en` out of the box, swappable via `npm run i18n:set-default`) has NO prefix (`/`, `/about/`, `/blog/first-post/`). Non-default locales (`fa`, plus `ar`, `de`, `fr`, etc. via `i18n:add-lang`) have prefixes (`/fa/درباره-ما/`). For single-language launches without structural changes, set `ui.showLanguageSwitcher: false` in `client/config.json` (or optionally archive other locales with `npm run i18n:solo`).
4. **RTL-Native Discipline**:
   - Always use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`, `border-e-*`). Never use physical directions.
5. **Page Design Freedom (`canvas` pages & 36+ Reusable PrebuiltUI-Adapted Blocks)**:
   - `pages` entries default to `hero: 'none'` + `container: 'canvas'`, so MDX or `client/templates/<Name>.astro` (`CLIENT_PAGE_TEMPLATES` in `client/templates/index.ts`) may compose full-bleed bands (`<PageSection>` plus **23 section blocks** — `LandingHeroSplit`, `PromoBanner`, `PartnerLogos`, `AboutSplitSection`, `BentoCapabilities`, `FeatureTabsSection`, `ProcessSteps`, `FeatureCardGrid`, `ProofStatsRow`, `ComparisonTable`, `PricingSection`, `TestimonialGrid`, `ImageGallerySection`, `LatestPostsSection`, `TeamSection`, `FaqAccordion`, `ContactSplitSection`, `NewsletterBanner`, `CtaBanner`, `CarouselSection`, `ProductShowcaseGrid`, `AuthFormCard`, `ParallaxSection` — **13 UI primitives** — `UiBadge`, `UiAlert`, `AvatarGroup`, `Breadcrumbs`, `UiPagination`, `UiModal`, `UiTooltip`, `UiProgress`, `UiSwitch`, `UiCheckbox`, `UiInput`, `UiDropdown`, `SocialLinks` — plus 4 interactive/motion showcase blocks `BentoGrid`, `LatestPostsCarousel`, `SwipeableTabs`, `TestimonialMarquee`, all with `locale` fallback and Paraglide defaults). Pass `contained` on section blocks when nesting inside `container: 'contained'` pages. `blog` posts always render through `BlogPostView.astro` + `PageHero.astro`. Every page must render **exactly one `<h1>`**.
6. **Idempotent Client Scripts**:
   - Guard DOM listeners in Astro components with `if (el.dataset.bound === 'true') return; el.dataset.bound = 'true';`. Clean up any intervals/observers/Embla instances on `astro:before-swap`.
7. **Static Language Switching**:
   - Use `window.location.assign(target)` rather than client-side SPA view transitions so `<html lang dir>` and font stacks are fully applied.
8. **ChronoTrig v6.1.0 CSS Scroll Engine, Lenis & Hardware-Friendly Performance**:
   - **Zero CLS & Print/No-JS Safe**: Entrance states are strictly scoped under `.js [data-trig]` (`56px` standard travel; `18px` on `.fadeInUpSm`/`.blurIn`, `1.2s` default `--trig-duration`, `cubic-bezier(0.16, 1, 0.3, 1)`, `--trig-reveal-delay: 0ms`). When JavaScript is disabled or printed, elements render immediately with `opacity: 1` and `transform: none`.
   - **Zero-Waste Scroll & GPU Guardrails**:
     - Always add `data-trig-once="true"` on static `[data-trig]` and `[data-trig-stagger]` elements so ChronoTrig unobserves them and releases `will-change: auto` after entrance (reserve replayable reveals only for filtered grids). Use `.trig-delay-*` utilities, never non-existent `data-trig-delay`.
     - Avoid `blur-2xl` / `blur-3xl` glow layers (use `.hero-glow-primary` / `.hero-glow-accent` pure radial gradients in `src/styles/global.css`), and never stack or scroll-animate nested `backdrop-blur` layers.
     - Use `loading="lazy"` (`decoding="async"`) on all below-the-fold `<Image>` tags; reserve `loading="eager"` + `fetchpriority="high"` strictly for above-the-fold heroes (`ParallaxSection priority`, top `LandingHeroSplit`).
     - Gate continuous JS scroll scrubbers (`ParallaxSection`), counters (`UiProgress`), and Embla `AutoScroll` marquees (`TestimonialMarquee`) via `IntersectionObserver` + `html[data-motion="reduced"]` so off-screen sections consume 0% CPU/GPU.
   - **Unified Motion Policy (`resolveMotion()`)**: `BaseLayout.astro`'s `<head>` checks `localStorage.motion` (`'reduced' | 'full'`), else honors OS `prefers-reduced-motion: reduce`, setting `html[data-motion]`. `chronotrig.css`, `lenis.ts`, `global.css`, and ChronoTrig's `respectReducedMotion` watcher flatten reveals, timelines, and `[data-trig-pin]` containers cleanly.
   - **Logical RTL Directions, Harmonic Staggers, Pins & Timelines**: Use `data-trig-direction="start|end"`, put `data-trig-stagger` (`data-trig-stagger-mode="linear|wave|center|reverse"`) on parent grids, keep CSS `transition` classes off `[data-trig]` roots (put card hover transitions on an inner wrapper), call `refreshChronoTrig()` after appending dynamic cards (on filter changes when `visibilityChanged`, clear reveal classes, `data-trig-settled` on both grid and cards, and `willChange = 'auto'` via `replayGridReveals()` first, and use `data-trig-root-margin="0px"` below tall heroes — ChronoTrig natively locks settled `data-trig-once="true"` elements and skips `[hidden]` stagger children), keep `overflow-x: clip` on `body` and parents around `[data-trig-pin]`, keep `html { scroll-behavior: auto; }`, sync Lenis (`lerp: 0.125`) via `setExternalScroll(true)` + `sync()`, and add `data-lenis-prevent` on nested `overflow-y-auto` overlays.

---

## Production Client Website Workflow

When building a new client site from this starter, follow this order:
1. **Clean & Onboard**: If demo content is seeded and not needed, run `npm run starter:seed -- --clean --yes`. Initialize branding, palette, fonts, OG mode, and modules in `client/config.json` with `npm run site:init -- --name="..." --blueprint=corporate|agency|portfolio|medical --yes` (and tune `brand.logo` / `business` profile in `client/config.json`, or `ui.showLanguageSwitcher: false` + `i18n:set-default <locale>` for single-language sites).
2. **Design & Compose in `client/`**: Build bespoke home/landing views in `client/templates/<Name>.astro` (registered in `client/templates/index.ts`) and/or MDX `hero: "none"`, `container: "canvas"`, `flushTop: true` pages composing the 36+ reusable blocks. Use only semantic OKLCH roles, logical properties (`ms-`, `pe-`, `start-`, `text-start`), `<Icon>`, `<Button>`, and performance rules above.
3. **Wire Navigation, Content, SEO & Copies**: Add client pages/posts via `npm run new:page` / `new:post` with localized `title`, unique `description`, native `--slug:<locale>` (no `-fa`/`-en` placeholders), `author`/`updatedAt`, single `<h1>` + `<h2>`/`<h3>` hierarchy, and descriptive `imageAlt`. Register nav items in `client/navigation.ts`, localize `blog_category_*` / `blog_tag_*` and UI strings via `npm run i18n:add-batch` (never hardcode UI copy or edit `src/paraglide/`), wire `<FaqAccordion>` (`FAQPage`) or `buildServiceSchema()` where relevant, and configure serverless form endpoints (`api.provider` in `client/config.json` or `PUBLIC_*_API_URL` env vars).
4. **Verify Full Pipeline**: Run `npm run messages:compile && npm run upstream:check && npm run lint && npm test && npm run audit:i18n && npm run doctor && npm run build && npm run smoke && npm run link:check` (plus `npm run content:status` when managing multi-locale rollouts).

---

## Domain Routing Table

To perform work in this repository, identify your specific task and read the indicated reference file:

| Task / Domain | Action / Reference File |
| :--- | :--- |
| **Content Pipeline, SEO Authoring, Search & Pure SSG APIs**<br>Collections schemas, content-type registry, **SEO-ready page & post authoring checklist** (`title`, `description`, native `slug`, `updatedAt`, `author`, single `<h1>`, JSON-LD rich results, `FAQPage`, OG cards), 36 composable landing/corporate blocks & UI primitives, pure URL paths, lean router dispatcher, blog engine, Persian-aware Pagefind search, external API client, feeds & sitemaps | ➡️ Read `references/content-and-routing.md` |
| **Multi-Menu Navigation**<br>Header dropdowns, mobile drawer tabs, footer columns (with 5 social channels), active states, single-language `showLanguageSwitcher` flag, slot resolvers | ➡️ Read `references/navigation.md` |
| **CLI Automation Suite**<br>Client onboarding (`site:init`), language default/solo modes, scaffolding pages (`--preset=landing`), posts & content types, deleting content, batch translations, asset generation, `doctor` / `content:status` / `link:check` | ➡️ Read `references/cli-automation.md` |
| **RTL, Typography & Styling**<br>CSS logical properties, `.layout-container`, brand OKLCH/font presets (`theme.ts`), LTR code block isolation, semantic tokens, Tabler icon catalog | ➡️ Read `references/rtl-styling.md` |
| **Smooth Scroll, ChronoTrig v6.1.0 & Motion**<br>ChronoTrig v6.1.0 zero-read reveals (`56px` default travel, `1.2s`) & presets, `data-trig-once`, opt-in `:root` scroll vars (`data-trig-root-vars`), GPU performance guardrails, harmonic stagger modes, pinned sections (`overflow-x: clip`), keyframe timelines, continuous vars, `prefers-reduced-motion` + `data-motion` resolution, RTL start/end vectors, and Lenis `sync()` rules | ➡️ Read `references/scroll-and-motion.md` |
| **Testing, Linting & QA**<br>Paraglide compile, Vitest unit tests (25 files / 262 tests), i18n parity audit, production build, smoke tests, Knip, `verify:cli` | ➡️ Read `references/verification.md` |

---

## Quick Command Reference

All scripts support both `npm run` and `pnpm run`:

```bash
npm run lint           # paraglide compile + astro check + tsc --noEmit
npm test               # Vitest test suite (unit, config, navigation, CLI, blocks)
npm run upstream:check # Verify core/client separation, hooks, and message/locale parity
npm run starter:seed   # Install (or --clean) optional demo pages, posts, projects & nav
npm run audit:i18n     # 6-stage i18n completeness, frontmatter & RTL parity audit (src/ + client/)
npm run site:init      # Interactive/headless client branding, fonts, OG mode & module wizard
npm run build          # Production SSG build + Persian-aware Pagefind indexing
npm run smoke          # Post-build HTML, SEO, feed & pagination validation over dist/
npm run doctor         # No-build health check (config, content types, dictionaries, content, SITE_URL)
npm run link:check     # Crawl dist/ and report internal links or #anchors that resolve to nothing
npm run content:list   # Content types, route bases, enable state and entry counts
npm run verify:cli     # End-to-end CLI workflow assertions in isolated sandbox
```
