# Verification, Testing & QA Protocol Reference

This reference documents the complete quality-assurance suite (including Playwright real-browser checks and `preflight` bundles) and diagnostic troubleshooting for the Astro v7 starter.

---

## 1. Complete QA Verification Suite

Before committing code or delivering a client project, run `npm run preflight` (or `npm run preflight:full` to include headless Chromium Playwright QA):

| Step | Command | Purpose & Assertion |
| :--- | :--- | :--- |
| **1. Lint** | `npm run lint` | Compiles Paraglide dictionaries, runs `astro check`, and checks strict types via `tsc --noEmit`. Must exit with 0 errors. |
| **2. Test** | `npm test` | Runs Vitest unit tests across **33 test files (315 tests)**: ICU formatters, URL normalization, navigation slots, pagination, content loaders, declarative collection schemas & filter rules (`schema-config.test.ts`, `collection-filters.test.ts`, `content-types.test.ts`), generic collection routes, wildcard & exact redirects (`redirects.test.ts`), CLI helpers (including `upsertEnvContent` & `qa-metrics`), Persian search & Pagefind normalization, external/serverless API client, Turnstile & form conversion tracking (`api/client.test.ts`), cookie consent & GTM/Consent Mode v2 (`cookies.test.ts`), Lenis, adaptive sticky navbar & `SiteTopBanner` (`navbar.test.ts`), ChronoTrig v6.2.0 scroll reveals & GPU guardrails, `TopLoadingBar` progression (`TopLoadingBar.test.ts`), brand theme presets (`theme.ts`), deterministic Resvg+wawoff2 RTL/LTR OG cards (`og-card.ts`), `Organization`/`Person`/`Product` Schema.org builders (`schema.test.ts`), `buttonClasses()` recipe, `SITE_ICONS` (69 core icons), composable block contracts (`blocks.test.ts` — 64 blocks: 29 section blocks + 35 UI primitives), `ui.navbar`/`ui.topBanner`/`ui.quickContact`/`analytics`/`redirects`/`site.authors`/`api.redirects`/`client/cms.json` + declarative `content.types.*` validation (`app.test.ts`), and browser-safe config mirror (`src/libs/config/client.ts`: `CLIENT_COOKIE_CONFIG`, `CLIENT_NAVBAR_CONFIG`, `CLIENT_MOTION_CONFIG`). |
| **3. Audit** | `npm run audit:i18n` | 6-stage check across `src/` and `client/`: (1) locale configuration parity, (2) two-tier dictionary key/placeholder parity + used/dead keys (recognizing dynamic `nav_<type>`, `<type>_index_description`, `<type>_field_<field>`, `<type>_filter_<field>_all`, and `<type>_option_<field>_<val>` keys), (3) content collection parity, (4) slug & route collision guard, (5) unextracted text scanner, (6) RTL logical property guard. |
| **4. Upstream & Sync** | `npm run upstream:check` & `npm run content:sync -- --check` | `upstream:check` validates three-tier config merge (`app.config.json` + `client/config.json` + `client/cms.json`), `client/locales.json`, two-tier dictionaries (`messages/core/` + `client/messages/`), core extension hooks, and `.gitignore`/`.gitattributes` guards. `content:sync -- --check` verifies `.pages.yml` and `src/content/<type>/` directories match `content.types`. |
| **5. Build** | `npm run build` | Merges & compiles dictionaries, runs audit, builds production static SSG bundle to `dist/`, emits `dist/_redirects`, `deploy/nginx-redirects.conf`, and `deploy/.htaccess-redirects` (when redirects exist), and indexes static content with `scripts/index-pagefind.mjs`. |
| **6. Smoke** | `npm run smoke` | Inspects generated HTML files in `dist/` to assert canonical tags, hreflang links, Open Graph cards, Atom feeds, `/llms.txt`, redirect files outside/inside `dist/`, Pagefind bundle, H1 tags, and that neither `[TODO: …]` nor the localized scaffold sentence (`contentStub` / `postStub`) reached a built page. |
| **7. Knip** | `npm run knip` | Audits the project for dead code, unused exports, and orphaned dependencies. |
| **8. CLI Check** | `npm run verify:cli` | Clones the starter to an isolated temp sandbox and executes end-to-end assertions against all CLI tools, including `--preset=landing`, `site:init --logo`, `--blueprint=catalog`, `site:reset`, `client:bootstrap`, `i18n:set-default`, `i18n:solo`, `starter:seed`, `upstream:check`, content-type toggling, `doctor --json`, `doctor --handoff --json`, `content:status --json`, and `link:check`. |
| **9. Doctor** | `npm run doctor` | No-build health check (runtime, lockfiles, 3-tier config, analytics IDs & GDPR cookie banner checks, redirects, content types, dictionaries, content, broken brand logos/images, `SITE_URL`). Errors exit 1; use `npm run doctor:handoff` (`--handoff`) to escalate warnings to blocking errors before client delivery. |
| **10. Links** | `npm run link:check` | Crawls `dist/` and fails on any internal link or exact redirect target that does not resolve to a built file, and on any `#fragment` whose `id` is missing from the target page. |
| **11. Browser QA** | `npm run qa:browser` | Launches headless Playwright Chromium (also in CI) over `dist/` across routes, light/dark themes, and mobile/desktop viewports checking zero runtime errors, zero horizontal overflow, sticky header & banner clearance, non-overlapping `QuickContactWidget` vs `CookieConsent`, CLS budget (`<= 0.05`), `/_astro/*.js` payload budget (`<= 180 KB`), `<img>` `alt`/single `<h1>` semantics, `@axe-core/playwright` WCAG 2A/2AA violations, plus interactive Search modal, Mobile Drawer, `QuickContactWidget` toggle, and `ImageGallerySection` lightbox slides. |

> **Performance & Motion Sanity Check**: `chronotrig.test.ts` guards against regressions to heavy `blur-3xl` / `blur-2xl` glows, global `scroll` listeners inside `UiProgress`, un-gated `ParallaxSection` scroll reads, and missing `56px` / `data-trig-once` contracts. Keep `loading="lazy"` on below-the-fold `<Image>` tags when adding custom sections.

---

## 2. Testing Invariants & Mocking Strategy

### Vitest Mocking (`src/test/astro-content-mock.ts`) & Pure Helpers
Vitest unit tests run directly under Node.js without needing an Astro build process:
- `vitest.config.ts` aliases `astro:content` to `src/test/astro-content-mock.ts` and `astro:schema` (`zod-schema.ts` uses Astro Zod schema helpers).
- Pure configuration, schema, filtering, and formatting logic lives in Astro-free modules (`src/libs/content/schema-config.ts`, `src/libs/content/collection-filters.ts`, `src/libs/content/catalog-utils.ts`) so Vitest tests and Node CLI scripts import them directly without loading `astro:*` runtime virtual modules.
- Content service tests mock `getPageUrl` or `getSiteRoutes` cleanly.
- Tests verify ICU pluralization (`blog_read_time`) and ordinal rules (`position_ordinal`) across active locales.

---

## 3. Diagnostic & Troubleshooting Playbook

### Issue: `TypeError: Unknown file extension ".astro"`
* **Cause**: Dev server started before `npm install` or stale Vite module graph.
* **Fix**: Stop the dev server (`astro dev stop`) and restart it fresh.

### Issue: Dictionary Key Parity Failure in `audit:i18n`
* **Cause**: A key was added to `client/messages/en.json` (or `messages/core/en.json`) without matching other active locales.
* **Fix**: Use `npm run i18n:add` or `npm run i18n:add-batch`, which automatically write fallback placeholders into `client/messages/*.json`.

### Issue: Duplicate Route Collision in `getSiteRoutes()`
* **Cause**: Two content entries generated the same canonical pathname.
* **Fix**: Ensure frontmatter `slug` values are unique per locale.

### Issue: Build fails with `[ContentTypes] …`
* **Cause**: `content.types` in `app.config.json` or `client/config.json` names an unknown type, reuses a route base, disables `pages`, or claims a reserved base (`page`, `api`, `rss`, `pagefind`, a locale prefix, …).
* **Fix**: Run `npm run content:list` / `npm run doctor` for the message, then correct the `base`/`enabled` flag. Never delete the collection to work around it.

### Issue: A section disappeared from the site
* **Cause**: Its content type is disabled, or its index has `nav: false`.
* **Fix**: `npm run content:list` shows the state; `npm run content:enable <type>` restores routes, sitemap entries and navigation links. `npm run link:check` reports any hand-written MDX links that still point at the removed section.

### Issue: Missing Hero Artwork Build Failure
* **Cause**: An entry's `image:` frontmatter references a relative file that does not exist.
* **Fix**: Ensure the image exists next to the entry (`./<group>.png`), or run `npm run assets:generate`.
