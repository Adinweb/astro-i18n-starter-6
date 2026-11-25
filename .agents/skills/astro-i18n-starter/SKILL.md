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
   - Navigation slots, Top Banner & Quick Contact: `client/navigation.ts` (`CLIENT_PAGE_ITEMS`, `getClientPrimaryExtras`, `getClientFooterColumns`, `getClientLegalNavigation`) distributed via `src/libs/config/navigation.ts` (`getNavigationSlots`). The header/drawer CTA target is `ui.ctaPage` in merged config (hides itself if unpublished). Set `ui.showLanguageSwitcher: false` in `client/config.json` for single-language sites without structural deletion. Site-wide announcements live in `src/components/SiteTopBanner.astro` (`ui.topBanner` with optional `startsAt`/`endsAt` scheduling and `dismissMode: 'session' | 'persistent'` + `dismissTtlDays`/`dismissVersion`, plus `<LayoutHooks slot="top-banner" />`) inside `[data-site-top-banner-region]`, while `src/scripts/navbar.ts` coordinates initial/sticky offsets and automatic banner-height clearance (`ui.navbar`). Mobile/global floating contact shortcuts render via `src/components/QuickContactWidget.astro` (`ui.quickContact`: `enabled`, `mobileOnly`, `channels`) and automatically hide when the undecided `CookieConsent` banner, drawer, or a `<dialog open>` is active.
   - Application, 3-tier CMS config, brand logo/theme presets, business profile, analytics, motion & cookies: `app.config.json` (core) <- `client/config.json` (agency/CLI sparse overrides) <- `client/cms.json` (non-technical editor layer validated via `sanitizeCmsConfig()` + `mergeLayeredConfig()`, mapped in `.pages.yml`) -> `src/libs/config/app.ts` (`siteConfig`, `POSTS_PER_PAGE`, `API_CONFIG`, `COOKIE_CONFIG`, `ANALYTICS_CONFIG`, `UI_CONFIG`, `BLOG_CONFIG`, `SOCIAL_CONFIG`, `BUSINESS_CONFIG`, `REDIRECTS_CONFIG`), browser-safe zero-Zod mirror `src/libs/config/client.ts` (`CLIENT_COOKIE_CONFIG`, `CLIENT_NAVBAR_CONFIG`, `CLIENT_MOTION_CONFIG`) + `src/libs/config/defaults.ts`, and `src/libs/config/theme.ts` + `theme-presets.json`. `brand.logo` supports theme-aware light/dark logos (`site:init --logo / --logo-dark`); `import.meta.env.DEV`-only `DevThemePreview.astro` provides live palette/font previews.
   - Analytics & Privacy Compliance: `src/components/AnalyticsScripts.astro` renders `GA4`, `Google Tag Manager` (`gtmId`), `Plausible`, `Umami`, and `Microsoft Clarity` strictly gated by `CookieConsent.astro` (`type="text/plain"` + `data-cookie-category="analytics"`), supports optional Google Consent Mode v2 (`analytics.consentMode: true`) and explicit cookieless opt-out (`analytics.allowCookielessWithoutBanner: true` for Plausible/Umami), and prevents double pageviews across `<ClientRouter />`.
   - Local SEO, AI Discovery & Redirects (`src/libs/content/schema.ts`, `src/pages/llms.txt.ts`, `src/libs/content/redirects.ts`): Builds `Organization` / `LocalBusiness` / `Service` JSON-LD from `business` + `social`; `og-card.ts` shapes RTL Persian/Arabic branded OG cards with explicit SVG RTL attributes; `/llms.txt` exposes a published default-locale index; `astro.config.mjs` compiles validated exact & trailing-wildcard (`/*` -> `:splat`) `redirects` into `dist/_redirects`, `deploy/nginx-redirects.conf`, and `deploy/.htaccess-redirects`.
   - Search & Perso-Arabic indexing: `scripts/index-pagefind.mjs`, `src/libs/search/persian.ts`, and `src/libs/search/client.ts`.
   - Pure SSG External/Serverless APIs (Zero Backend): `src/libs/api/client.ts` (`api.provider`: `custom | web3forms | formspree | basin | webhook`, `turnstileSiteKey`, `accessKey`, reference Turnstile relay in `docs/deploy/cloudflare-worker-webhook.js`) + `src/components/ContactForm.astro` + `src/components/NewsletterBanner.astro` + `src/components/ContactSplitSection.astro` (quick contact actions & lazy map). Never add a backend server or SSR endpoints; `/api/*.json` routes are static build-time catalogs only.
   - Semantic tokens & `.layout-container` (`1280px`): `src/styles/global.css` + client CSS tokens and commercial Persian `@font-face` hooks in `client/styles.css`.
   - UI copy: Two-tier Paraglide dictionaries (`messages/core/*.json` + `client/messages/*.json`) merged into `.paraglide-work/` and compiled to `@/paraglide/messages`. Never hardcode UI text.
   - CMS & Deployment: `.pages.yml` (collections + `client/cms.json` file entry), `public/_headers`, `docs/deploy/nginx.conf`, and `docs/deploy/cloudflare-worker-webhook.js`.
2. **Lean Router Dispatcher**:
   - Centralized exclusively in `src/pages/[...path].astro` -> `src/views/`. Never create dynamic route files (`[lang].astro`, `[slug].astro`) under `src/pages/`.
   - `pages` → `PageView`, `blog-entry` → `BlogPostView`, `blog-index` → `BlogIndexView`; every other enabled type (e.g. `projects`) uses `CollectionIndexView` (with interactive category, tech `stack`, and keyword filtering) / `CollectionEntryView` with `routeType` `collection-index` / `collection-entry`.
3. **Prefix-less Default Locale & Single-Language Option**:
   - Default locale (`en` out of the box, swappable via `npm run i18n:set-default`) has NO prefix (`/`, `/about/`, `/blog/first-post/`). Non-default locales (`fa`, plus `ar`, `de`, `fr`, etc. via `i18n:add-lang`) have prefixes (`/fa/درباره-ما/`). For single-language launches without structural changes, set `ui.showLanguageSwitcher: false` in `client/config.json` (or optionally archive other locales with `npm run i18n:solo`).
4. **RTL-Native Discipline**:
   - Always use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`, `border-e-*`). Never use physical directions.
5. **Page Design Freedom (`canvas` pages & 68 Composable Blocks/Primitives)**:
   - `pages` entries default to `hero: 'none'` + `container: 'canvas'`, so MDX or `client/templates/<Name>.astro` (`CLIENT_PAGE_TEMPLATES` in `client/templates/index.ts`) may compose full-bleed bands (`<PageSection>` plus **64 blocks guarded by `src/libs/ui/blocks.test.ts`**: **29 section blocks** in `src/components/` — 7 hero sections `LandingHeroSplit`, `HeroCenteredEditorial`, `HeroDashboardShowcase`, `HeroCommandCli`, `HeroInteractivePrompt`, `HeroProofMarquee`, `HeroFloatingOrbSplit`, and 22 structural sections `BentoCapabilities`, `ProofStatsRow`, `FaqAccordion`, `CtaBanner`, `PricingSection`, `TestimonialGrid`, `TeamSection`, `PartnerLogos`, `NewsletterBanner`, `PromoBanner`, `AboutSplitSection`, `ProcessSteps`, `FeatureTabsSection`, `ComparisonTable`, `FeatureCardGrid`, `ImageGallerySection`, `LatestPostsSection`, `ContactSplitSection`, `CarouselSection`, `ProductShowcaseGrid`, `AuthFormCard`, `ParallaxSection` — and **35 UI primitives** in `src/components/ui/` — 25 localized `UiBadge`, `UiAlert`, `AvatarGroup`, `Breadcrumbs`, `HeroPreviewNav`, `HeroParallaxLayer`, `HeroShowcaseCard`, `UiPagination`, `UiModal`, `UiTooltip`, `UiProgress`, `UiSwitch`, `UiCheckbox`, `UiInput`, `UiDropdown`, `SocialLinks`, `Accordion`, `AnnouncementPill`, `ChipGroup`, `CodeBlock`, `Divider`, `RatingStars`, `Skeleton`, `StatTile`, `TopBanner` and 10 pure `BackdropLayer`, `Button`, `Card`, `HeroHeadline`, `Icon`, `IconBox`, `IconButton`, `Kbd`, `PartnerStrip`, `SectionHeader` — plus **4 interactive/motion showcase blocks** `BentoGrid`, `LatestPostsCarousel`, `SwipeableTabs`, `TestimonialMarquee`, all with `locale` fallback and Paraglide defaults). Core site pages (`home`, `about`, `features`, `pricing`, `contact`) use `container: 'canvas'`. Pass `contained` on section blocks when nesting inside `container: 'contained'` pages. `blog` posts always render through `BlogPostView.astro` + `PageHero.astro`. Every page must render **exactly one `<h1>`**.
6. **Idempotent Client Scripts**:
   - Guard DOM listeners in Astro components with `if (el.dataset.bound === 'true') return; el.dataset.bound = 'true';`. Clean up any intervals/observers/Embla instances on `astro:before-swap`.
7. **Static Language Switching**:
   - Use `window.location.assign(target)` rather than client-side SPA view transitions so `<html lang dir>` and font stacks are fully applied.
8. **ChronoTrig v6.2.0 CSS Scroll Engine, Lenis & Hardware-Friendly Performance**:
   - **Zero CLS & Print/No-JS Safe**: Entrance states are strictly scoped under `.js [data-trig]` (`--trig-distance` / `56px` standard travel, `18px` on `.fadeInUpSm`/`.blurIn`, `1.6s` default `--trig-duration`, `cubic-bezier(0.16, 1, 0.3, 1)`). Global timing, travel, stagger step, `rootMargin`, mobile behavior, and Lenis smooth-scroll settings live in `app.config.json` / `client/config.json` → `ui.motion` (`revealDelayMs: 0`, `revealDurationMs: 1600` out of the box, overriding `--trig-reveal-delay` / `--trig-duration` on `<html style>` while `.trig-delay-*` classes add `--trig-reveal-offset`). When JavaScript is disabled or printed, elements render immediately with `opacity: 1` and `transform: none`.
   - **Zero-Waste Scroll & GPU Guardrails**:
     - Always add `data-trig-once="true"` on static `[data-trig]` and `[data-trig-stagger]` elements so ChronoTrig unobserves them and releases `will-change: auto` after entrance (reserve replayable reveals only for filtered grids). Use `.trig-delay-*` utilities (`.trig-delay-100`, `.trig-delay-150`, `.trig-delay-200`..`1000`), never non-existent `data-trig-delay`.
     - Avoid `blur-2xl` / `blur-3xl` glow layers (use `.hero-glow-primary` / `.hero-glow-accent` pure radial gradients in `src/styles/global.css`), and never stack or scroll-animate nested `backdrop-blur` layers.
     - Use `loading="lazy"` (`decoding="async"`) on all below-the-fold `<Image>` tags; reserve `loading="eager"` + `fetchpriority="high"` strictly for above-the-fold heroes (`ParallaxSection priority`, top hero sections).
     - Gate continuous JS scroll scrubbers (`ParallaxSection`), counters (`UiProgress`), and Embla `AutoScroll` marquees (`TestimonialMarquee`) via `IntersectionObserver` + `html[data-motion="reduced"]` so off-screen sections consume 0% CPU/GPU.
   - **Unified Motion Policy (`resolveMotion()`)**: `BaseLayout.astro`'s `<head>` checks `localStorage.motion` (`'reduced' | 'full'`), else honors OS `prefers-reduced-motion: reduce`, setting `html[data-motion]`. `chronotrig.css`, `lenis.ts`, `navbar.ts`, `global.css`, and ChronoTrig's `respectReducedMotion` watcher flatten reveals, timelines, and `[data-trig-pin]` containers cleanly.
   - **Logical RTL Directions, Harmonic Staggers, Pins, Tabs & Timelines**: Use `data-trig-direction="start|end"`, put `data-trig-stagger` (`data-trig-stagger-mode="linear|wave|center|reverse"`) on parent grids, keep CSS `transition` classes off `[data-trig]` roots (put card hover transitions on an inner wrapper), call `refreshChronoTrig()` after appending dynamic cards (on filter changes when `visibilityChanged`, clear reveal classes, `data-trig-settled` on both grid and cards, and `willChange = 'auto'` via `replayGridReveals()` first, and use `data-trig-root-margin="0px"` below tall heroes — `setupChronoTrig()` inherits parent `data-trig-root-margin` / `ui.motion.rootMargin` onto stagger children, while ChronoTrig v6.2.0 queues multiple settlement callbacks in `q()`, locks `.trig-stagger-settled` + `data-trig-settled="true"` in `scan()` so settled one-shots never replay, and skips `[hidden]` stagger children; do **not** call `refreshChronoTrig()` when switching mounted tabs like `SwipeableTabs` or `FeatureTabsSection`). Keep `overflow-x: clip` on `body` and parents around `[data-trig-pin]`, keep `html { scroll-behavior: auto; }`, sync Lenis (`lerp: ui.motion.smoothScrollLerp` / `0.125`, dynamic `getHeaderOffset()`) via `setExternalScroll(true)` + `sync()`, and add `data-lenis-prevent` on nested `overflow-y-auto` overlays.

---

## Production Client Website Workflow

When building a new client site from this starter, follow this order:
1. **Clean & Onboard**: If demo content is seeded and not needed, run `npm run starter:seed -- --clean --yes` (or reset client overrides back to baseline with `npm run site:reset -- --yes`). Initialize branding, palette, fonts, logo (`--logo`, `--logo-dark`), OG mode, and modules in `client/config.json` with `npm run site:init -- --name="..." --blueprint=corporate|agency|portfolio|medical|catalog|legal --yes` (and tune `brand.logo` / `business` / `analytics` in `client/config.json`, leaving editorial toggles/redirects in `client/cms.json` via Pages CMS).
2. **Design & Compose in `client/`**: Build bespoke home/landing views in `client/templates/<Name>.astro` (registered in `client/templates/index.ts`) and/or MDX `hero: "none"`, `container: "canvas"`, `flushTop: true` pages composing the 29 section blocks (7 hero sections + 22 structural sections incl. multi-slide `ImageGallerySection` lightbox), 35 UI primitives in `src/components/ui/`, and 4 interactive showcase blocks (`SwipeableTabs` with `variant="underline"|"pills"`, `BentoGrid`, `LatestPostsCarousel`, `TestimonialMarquee`). Use only semantic OKLCH roles, logical properties (`ms-`, `pe-`, `start-`, `text-start`), `<Icon>`, `<Button>`, and performance rules above.
3. **Wire Navigation, Content, SEO & Copies**: Add client pages/posts via `npm run new:page` / `new:post` with localized `title`, unique `description`, native `--slug:<locale>` (no `-fa`/`-en` placeholders), `author`/`updatedAt`, single `<h1>` + `<h2>`/`<h3>` hierarchy, and descriptive `imageAlt`. Register nav items in `client/navigation.ts`, localize `blog_category_*` / `blog_tag_*` and UI strings via `npm run i18n:add-batch` (never hardcode UI copy or edit `src/paraglide/`), wire `<FaqAccordion>` (`FAQPage`) or `buildServiceSchema()` where relevant, and configure serverless form endpoints (`api.provider` in `client/config.json` or `PUBLIC_*_API_URL` env vars).
4. **Verify Full Pipeline**: Run `npm run preflight` (or `npm run preflight:full` including Playwright real-browser `qa:browser`), plus `npm run lint` and `npm run knip` (and `npm run content:status` when managing multi-locale rollouts).

---

## Domain Routing Table

To perform work in this repository, identify your specific task and read the indicated reference file:

| Task / Domain | Action / Reference File |
| :--- | :--- |
| **Content Pipeline, SEO Authoring, Search & Pure SSG APIs**<br>Collections schemas, content-type registry, **SEO-ready page & post authoring checklist** (`title`, `description`, native `slug`, `updatedAt`, `author`, single `<h1>`, JSON-LD rich results, `FAQPage`, OG cards), 64 guarded landing/corporate blocks & UI primitives + 4 interactive showcases, pure URL paths, lean router dispatcher, blog engine (`toggleBlogCategory`/`toggleBlogTag`), Persian-aware Pagefind search, external API client, feeds & sitemaps | ➡️ Read `references/content-and-routing.md` |
| **Multi-Menu Navigation, Top Banner & Sticky Navbar**<br>Header dropdowns, mobile drawer tabs, footer columns (with 5 social channels), active states, `showLanguageSwitcher`, `SiteTopBanner.astro` (`ui.topBanner` + `<LayoutHooks slot="top-banner" />`), and `ui.navbar` sticky/banner offset controller (`src/scripts/navbar.ts`) | ➡️ Read `references/navigation.md` |
| **CLI Automation Suite**<br>Client onboarding (`site:init`), language default/solo modes, scaffolding pages (`--preset=landing`), posts & content types, deleting content, batch translations, asset generation, `doctor` / `content:status` / `link:check` | ➡️ Read `references/cli-automation.md` |
| **RTL, Typography & Styling**<br>CSS logical properties, `.layout-container`, brand OKLCH/font presets (`theme.ts`), LTR code block isolation, semantic tokens, Tabler icon catalog (69 core icons) | ➡️ Read `references/rtl-styling.md` |
| **Smooth Scroll, ChronoTrig v6.2.0 & `ui.motion` Config**<br>Configurable `ui.motion` timing (`revealDelayMs: 0`, `revealDurationMs: 1600` default, additive `--trig-reveal-offset`), ChronoTrig v6.2.0 zero-read reveals & presets, `data-trig-once`, `q()` settlement, opt-in `:root` scroll vars, GPU guardrails, harmonic staggers, pins, timelines, `data-motion` resolution, RTL start/end vectors, and Lenis `sync()` + dynamic header offset | ➡️ Read `references/scroll-and-motion.md` |
| **Testing, Linting & QA**<br>Paraglide compile, Vitest unit tests (29 files / 289 tests), i18n parity audit, production build, smoke tests, Knip, `verify:cli`, `qa:browser`, `preflight:full` | ➡️ Read `references/verification.md` |

---

## Quick Command Reference

All scripts support both `npm run` and `pnpm run`:

```bash
npm run lint           # paraglide compile + astro check + tsc --noEmit
npm test               # Vitest test suite (unit, config, navigation, redirects, CLI, blocks)
npm run upstream:check # Verify 3-tier config/CMS separation, hooks, and message/locale parity
npm run starter:seed   # Install (or --clean) optional demo pages, posts, projects & nav
npm run audit:i18n     # 6-stage i18n completeness, frontmatter & RTL parity audit (src/ + client/)
npm run site:init      # Interactive/headless client branding, blueprints, --logo, fonts & modules
npm run site:reset     # Reset client/config.json & client/cms.json (plus optional --clean-starter)
npm run build          # Production SSG build + redirect outputs + Persian-aware Pagefind indexing
npm run smoke          # Post-build HTML, SEO, feed, redirect & pagination validation over dist/
npm run doctor         # No-build health check (config, analytics/GDPR, content types, dictionaries, SITE_URL)
npm run link:check     # Crawl dist/ and report internal links or #anchors that resolve to nothing
npm run qa:browser     # Playwright Chromium layout & interactive UI QA (RTL/LTR, light/dark, mobile/desktop)
npm run preflight:full # Full pre-delivery pipeline (preflight + qa:browser)
npm run content:list   # Content types, route bases, enable state and entry counts
npm run verify:cli     # End-to-end CLI workflow assertions in isolated sandbox
```
