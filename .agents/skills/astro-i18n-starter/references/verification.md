# Verification, Testing & QA Protocol Reference

This reference documents the complete quality-assurance suite (10 steps) and diagnostic troubleshooting for the Astro v7 starter.

---

## 1. Complete QA Verification Suite

Before committing code or submitting changes, run these commands:

| Step | Command | Purpose & Assertion |
| :--- | :--- | :--- |
| **1. Lint** | `npm run lint` | Compiles Paraglide dictionaries, runs `astro check`, and checks strict types via `tsc --noEmit`. Must exit with 0 errors. |
| **2. Test** | `npm test` | Runs Vitest unit tests across 25 test files (260 tests): ICU formatters, URL normalization, navigation slots, pagination, content loaders, content-type registry & generic collection routes, CLI helpers, Persian search & Pagefind normalization, external/serverless API client & Turnstile (`api/client.ts`), cookie consent, Lenis, ChronoTrig scroll reveals, brand theme presets (`theme.ts`), dynamic RTL/LTR OG cards (`og-card.ts`), Schema.org builders (`schema.test.ts`), `buttonClasses()` recipe, `SITE_ICONS` (66 core icons), composable block contracts (`blocks.test.ts`), and browser-safe config mirror (`src/libs/config/client.ts`). |
| **3. Audit** | `npm run audit:i18n` | 6-stage check across `src/` and `client/`: (1) locale configuration parity, (2) two-tier dictionary key/placeholder parity + used/dead keys, (3) content collection parity, (4) slug & route collision guard, (5) unextracted text scanner, (6) RTL logical property guard. |
| **4. Upstream** | `npm run upstream:check` | Validates two-tier config merge (`app.config.json` + `client/config.json`), `client/locales.json`, two-tier dictionaries (`messages/core/` + `client/messages/`), core extension hooks, and `.gitignore`/`.gitattributes` guards. |
| **5. Build** | `npm run build` | Merges & compiles dictionaries, runs audit, builds production static SSG bundle to `dist/`, and indexes static content with `scripts/index-pagefind.mjs` (Perso-Arabic normalization). |
| **6. Smoke** | `npm run smoke` | Inspects generated HTML files in `dist/` to assert canonical tags, hreflang links, Open Graph cards, Atom feeds, Pagefind bundle, H1 tags, and that neither `[TODO: …]` nor the localized scaffold sentence (`contentStub` / `postStub`) reached a built page. |
| **7. Knip** | `npm run knip` | Audits the project for dead code, unused exports, and orphaned dependencies. |
| **8. CLI Check** | `npm run verify:cli` | Clones the starter to an isolated temp sandbox and executes end-to-end assertions against all CLI tools, including `--preset=landing`, `site:init`, `i18n:set-default`, `i18n:solo`, `starter:seed`, `upstream:check`, content-type toggling, `doctor --json`, `content:status --json`, and the `link:check` crawl. |
| **9. Doctor** | `npm run doctor` | No-build health check (runtime, config, content types, dictionaries, content, `SITE_URL`). Errors exit 1; warnings do not. |
| **10. Links** | `npm run link:check` | Crawls `dist/` and fails on any internal link that does not resolve to a built file, and on any `#fragment` whose `id` is missing from the target page. Run after every build, after any slug rename and after moving a page section. |

---

## 2. Testing Invariants & Mocking Strategy

### Vitest Mocking (`src/test/astro-content-mock.ts`)
Vitest unit tests run directly under Node.js without needing an Astro build process:
- `vitest.config.ts` aliases `astro:content` to `src/test/astro-content-mock.ts`.
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
