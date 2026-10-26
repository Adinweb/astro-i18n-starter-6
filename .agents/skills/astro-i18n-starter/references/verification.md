# Verification, Testing & QA Protocol Reference

This reference documents the complete 7-step quality assurance verification suite and diagnostic troubleshooting for the Astro v7 starter.

---

## 1. Complete QA Verification Suite

Before committing code or submitting changes, run these 7 commands:

| Step | Command | Purpose & Assertion |
| :--- | :--- | :--- |
| **1. Lint** | `npm run lint` | Compiles Paraglide dictionaries, runs `astro check`, and checks strict types via `tsc --noEmit`. Must exit with 0 errors. |
| **2. Test** | `npm test` | Runs Vitest unit tests across 12 test suites (ICU formatters, URL normalization, navigation slots, pagination, content loaders). |
| **3. Audit** | `npm run audit:i18n` | 5-stage check: locale agreement, dictionary key/placeholder parity across all 5 locales, content group completeness, slug collisions, unextracted text. |
| **4. Build** | `npm run build` | Compiles dictionaries, runs audit, builds production static SSG bundle to `dist/`, and indexes static content with Pagefind. |
| **5. Smoke** | `npm run smoke` | Inspects generated HTML files in `dist/` to assert canonical tags, hreflang links, Open Graph cards, Atom feeds, and H1 tags. |
| **6. Knip** | `npm run knip` | Audits the project for dead code, unused exports, and orphaned dependencies. |
| **7. CLI Check** | `npm run verify:cli` | Clones the starter to an isolated temp sandbox and executes 45 end-to-end assertions against all CLI tools. |

---

## 2. Testing Invariants & Mocking Strategy

### Vitest Mocking (`src/test/astro-content-mock.ts`)
Vitest unit tests run directly under Node.js without needing an Astro build process:
- `vitest.config.ts` aliases `astro:content` to `src/test/astro-content-mock.ts`.
- Content service tests mock `getPageUrl` or `getSiteRoutes` cleanly.
- Tests verify ICU pluralization (`blog_read_time`) and ordinal rules (`position_ordinal`) across all 5 languages.

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

### Issue: Missing Hero Artwork Build Failure
* **Cause**: An entry's `image:` frontmatter references a relative file that does not exist.
* **Fix**: Ensure the image exists next to the entry (`./<group>.png`), or run `npm run assets:generate`.
