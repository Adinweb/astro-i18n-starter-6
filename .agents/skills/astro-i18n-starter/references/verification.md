# Verification, Testing & QA Protocol Reference

This reference documents the complete quality-assurance suite (9 steps) and diagnostic troubleshooting for the Astro v7 starter.

---

## 1. Complete QA Verification Suite

Before committing code or submitting changes, run these commands:

| Step | Command | Purpose & Assertion |
| :--- | :--- | :--- |
| **1. Lint** | `npm run lint` | Compiles Paraglide dictionaries, runs `astro check`, and checks strict types via `tsc --noEmit`. Must exit with 0 errors. |
| **2. Test** | `npm test` | Runs Vitest unit tests across 18 test files (193 tests): ICU formatters, URL normalization, navigation slots, pagination, content loaders, content-type registry & generic collection routes, CLI helpers, Persian search & Pagefind normalization, external API client, cookie consent, Lenis, and ChronoTrig scroll reveals. |
| **3. Audit** | `npm run audit:i18n` | 6-stage check: (1) locale configuration parity, (2) dictionary key/placeholder parity + used/dead keys, (3) content collection parity, (4) slug & route collision guard, (5) unextracted text scanner, (6) RTL logical property guard. |
| **4. Build** | `npm run build` | Compiles dictionaries, runs audit, builds production static SSG bundle to `dist/`, and indexes static content with `scripts/index-pagefind.mjs` (Perso-Arabic normalization). |
| **5. Smoke** | `npm run smoke` | Inspects generated HTML files in `dist/` to assert canonical tags, hreflang links, Open Graph cards, Atom feeds, Pagefind bundle, and H1 tags. |
| **6. Knip** | `npm run knip` | Audits the project for dead code, unused exports, and orphaned dependencies. |
| **7. CLI Check** | `npm run verify:cli` | Clones the starter to an isolated temp sandbox and executes 82 end-to-end assertions against all CLI tools, including content-type toggling, `doctor --json`, `content:status --json` and the `link:check` crawl. |
| **8. Doctor** | `npm run doctor` | No-build health check (runtime, config, content types, dictionaries, content, `SITE_URL`). Errors exit 1; warnings do not. |
| **9. Links** | `npm run link:check` | Crawls `dist/` and fails on any internal link that does not resolve to a built file. Run after every build and after any slug rename. |

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
* **Cause**: A key was added to `messages/en.json` but not to other locale files.
* **Fix**: Use `npm run i18n:add` or `npm run i18n:add-batch`, which automatically write fallback placeholders to all dictionaries.

### Issue: Duplicate Route Collision in `getSiteRoutes()`
* **Cause**: Two content entries generated the same canonical pathname.
* **Fix**: Ensure frontmatter `slug` values are unique per locale.

### Issue: Build fails with `[ContentTypes] …`
* **Cause**: `content.types` in `app.config.json` names an unknown type, reuses a route base, disables `pages`, or claims a reserved base (`page`, `api`, `rss`, `pagefind`, a locale prefix, …).
* **Fix**: Run `npm run content:list` / `npm run doctor` for the message, then correct the `base`/`enabled` flag. Never delete the collection to work around it.

### Issue: A section disappeared from the site
* **Cause**: Its content type is disabled, or its index has `nav: false`.
* **Fix**: `npm run content:list` shows the state; `npm run content:enable <type>` restores routes, sitemap entries and navigation links. `npm run link:check` reports any hand-written MDX links that still point at the removed section.

### Issue: Missing Hero Artwork Build Failure
* **Cause**: An entry's `image:` frontmatter references a relative file that does not exist.
* **Fix**: Ensure the image exists next to the entry (`./<group>.png`), or run `npm run assets:generate`.
