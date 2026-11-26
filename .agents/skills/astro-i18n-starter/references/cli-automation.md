# CLI Automation Suite Reference

This reference documents the automated developer CLI suite in `scripts/` used to scaffold, update, delete, and audit content and translations.

---

## 1. Package Manager Flexibility

All CLI commands can be invoked using either `npm run <command>` or `pnpm run <command>`.
When passing arguments to script flags, use the standard `--` delimiter:
```bash
npm run <command> -- [options]
```

---

## 2. Content Scaffolding & Updating

### 2.0 Client Onboarding, Rebranding (`site:init`) & Clean Reset (`site:reset`)
```bash
npm run site:init -- [--name="Acme Studio"] [--short-name="Acme"] [--desc="..."] [--author="..."] [--email="hello@acme.test"] \
  [--blueprint=corporate|agency|portfolio|medical|catalog|legal] \
  [--preset=indigo|cobalt|emerald|amber|slate|rose] [--primary=#rrggbb] [--accent=#rrggbb] \
  [--font=system|jakarta|manrope|outfit|editorial] [--rtl-font=vazirmatn|noto-arabic|iransans|yekan-bakh|peyda] \
  [--logo=path/to/logo.svg] [--logo-dark=path/to/logo-dark.svg] \
  [--og-mode=branded|artwork|default] [--default-theme=system|light|dark] \
  [--default-locale=<code>] [--single-lang|--multi-lang] [--blog=true|false] [--projects=true|false] \
  [--cta-page=<key>] [--github=...] [--twitter=...] [--linkedin=...] [--instagram=...] [--telegram=...] \
  [--skip-assets] [--yes]
```
* Updates `client/config.json` (sparse diff against `app.config.json`), applies optional industry `--blueprint` presets (`corporate`, `agency`, `portfolio`, `medical`, `catalog`, `legal` from `scripts/lib/blueprints.mjs`, each injecting domain `content.types` and invoking `content:sync` without sample data), validates & copies optional `--logo` / `--logo-dark` assets into `public/brand/logo*` (passing empty `--logo=` clears the uploaded logo), keeps `site_description` synchronized in `client/messages/<targetLocale>.json`, optionally switches default/solo locale mode in `client/locales.json`, and refreshes brand icons / `og-default.png` unless `--skip-assets` is passed. Runs interactively when stdin is a TTY or headlessly with `--yes`.
* **One-Shot Declarative Site Provisioner (`site:apply`)**:
  ```bash
  npm run site:apply -- --spec=site-spec.json [--dry-run] [--skip-assets] [--json]
  ```
  Validates and applies a complete JSON site spec in a single transaction: `blueprint`, `site`, `brand` (incl. `logo` copying to `public/brand/`), `business`, `social`, `analytics`, `cookies`, `api`, `redirects`, `ui` (incl. `navigation` and `homeSections`), `content.types` (`content:sync`), `messages`, `pages` (with `nav` merge and `sections`), `entries` across built-in/custom collections, `locale` switches (`defaultLocale`, `solo`), automatic `i18n:sync-keys`, and brand/cover assets.
* **Resetting a workspace between client projects (`site:reset`)**:
  ```bash
  npm run site:reset -- --yes [--clean-starter]
  ```
  Resets `client/config.json` and `client/cms.json` back to `{}` and cleans generated `deploy/` redirect snippets and `public/brand/` logos (`--clean-starter` also invokes `starter:seed --clean` to return `src/content/` to clean minimal base).

* **One-Step Client Project Bootstrap (`client:bootstrap`)**:
  ```bash
  npm run client:bootstrap -- [--reset] [--seed=all|clean|pages] [--name="Acme Studio"] [--blueprint=corporate|agency|...] \
    [--logo=logo.svg] [--from-logo=logo.svg] [--site-url=https://acme.com] [--contact-url=...] [--turnstile-key=...] [--handoff] [--yes]
  ```
  Orchestrates workspace reset/seeding, `site:init`, `.env` updates (`SITE_URL`, `PUBLIC_API_BASE_URL`, `PUBLIC_CONTACT_API_URL`, `PUBLIC_NEWSLETTER_API_URL`, `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_WEB3FORMS_KEY`), logo-derived favicon/PWA icon generation, and `doctor` / `doctor --handoff` in one command.

### 2.1 Static Pages (`new:page`)
```bash
npm run new:page <page-key> -- [--title="<Title>"] [--desc="<Desc>"] [--title:<locale>="..."] [--desc:<locale>="..."] [--slug:<locale>="<native-slug>"] [--from=<locale>] [--preset=standard|landing] [--hero=none|minimal|default] [--container=canvas|contained|prose] [--image=<path>|none] [--data='{...}'|--file=copy.json] [--publish]
```
* **Files Created**: `src/content/pages/<page-key>/<locale>.mdx` across all active locales in `client/locales.json` (`en.mdx`, `fa.mdx` out of the box) + `./<page-key>.png`.
* **Three Presentation Layers**:
  - Content schema (`src/content.config.ts`): `hero: 'none'`, `container: 'canvas'`.
  - Standard CLI scaffold (`--preset=standard`, default): `hero: 'default'`, `container: 'contained'`.
  - Landing preset (`--preset=landing`): `hero: 'none'`, `container: 'canvas'`, `flushTop: true` — scaffolds an MDX landing page composed with `<LandingHeroSplit>`, `<ProofStatsRow>`, `<BentoCapabilities>`, `<FaqAccordion>`, and `<CtaBanner>`.
* **Dictionary Key**: Automatically registers `nav_<page-key>` across `client/messages/*.json` and prints the follow-up. The key is only a label — the page appears in a menu once it is added to `CLIENT_PAGE_ITEMS` (header + drawer) or to `getClientFooterColumns` / `getClientLegalNavigation` in `client/navigation.ts` (pass `--no-nav` / `--skip-nav` when scaffolding pages intentionally excluded from `nav_*`).
* **Publication State**:
  - Default: Only the source locale (`--from`, defaults to `DEFAULT_LOCALE`) is published (`draft: false`); other locales remain `draft: true` until translated.
  - `--publish` / `--draft=false`: Publishes locales that have real translations (`--title:<locale>` / `--desc:<locale>` or `--data`). Locales retaining `[TODO: ...]` placeholders remain drafts. The body is still the localized "content coming soon" sentence, so the command warns and `npm run smoke` fails while that sentence is in `dist/`.
* **Placeholder Slugs**: the source locale owns the group slug (`contact`); every other locale starts with `contact-<locale>` so each has a valid route. Pass `--slug:fa="<native-slug>"` at creation time or fix via `--update --slug:fa="<native-slug>"` — `npm run doctor` reports any remaining placeholder slugs.
* **Updating Frontmatter without Body Overwrite**:
  ```bash
  npm run new:page <page-key> -- --update --sync-frontmatter --title="<New Title>" --desc="<Meta Desc>" --slug:fa="<native-slug>" --hero=minimal --container=contained
  ```
  `--update` preserves existing markdown content while `--sync-frontmatter` aligns structural/shared frontmatter (`image`, `hero`, `container`, `flushTop`, `template`) across all locale files.

### 2.2 Blog Posts (`new:post`)
```bash
npm run new:post <group-slug> -- [--title="<Title>"] [--desc="<Desc>"] [--title:<locale>="..."] [--desc:<locale>="..."] [--slug:<locale>="<native-slug>"] [--date="YYYY-MM-DD"] [--from=<locale>] [--category=<cat>] [--tags=<tags>] [--image=<path>|none] [--clone-from=<group>] [--data='{...}'|--file=copy.json] [--publish]
```
* **Files Created**: `src/content/blog/<group-slug>/<locale>.mdx` across all active locales + `./<group-slug>.png`.
* **SEO-Ready Creation Pattern**: Pass localized `--title:<locale>`, `--desc:<locale>` (~140–160 chars), native `--slug:<locale>`, `--category`, and `--tags` immediately on scaffold, then add localized taxonomy labels via `npm run i18n:add-batch` (`blog_category_<key>`, `blog_tag_<key>`), write the prose body, and optionally set `author` / `updatedAt` in frontmatter.
* **Cloning Body**: Use `--clone-from=<existing-group>` to clone the body copy from another post; without it the body is the scaffold sentence that `npm run smoke` refuses to publish.
* **Placeholder Slugs**: non-source locales start with `<group>-<locale>`; pass `--slug:<locale>="..."` directly or update later with `--update --slug:<locale>="..."`. `npm run doctor` reports any leftovers.
* **Taxonomy**: Validates categories and tags against ASCII lowercase rules (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`).
* **Updating Frontmatter**:
  ```bash
  npm run new:post <group-slug> -- --update --sync-frontmatter --title="<New Title>" --desc="<Meta Desc>" --date="2026-11-22"
  ```
  Synchronizes shared taxonomy/date/image/author frontmatter across all active locales without overwriting localized body prose.

---

## 3. Content Removal

### 3.1 Removing Pages (`remove:page`)
```bash
# Remove entire page group and prune nav_<key> from dictionaries:
npm run remove:page <page-key> -- --force

# Remove only one locale's file:
npm run remove:page <page-key> -- --locale=fa --force
```
* When `--locale` is used, the navigation key **remains** in dictionaries to maintain invariant key parity across all languages.
* In non-interactive environments (CI), `--force` (or `-y` / `--yes`) is mandatory.
* A whole-group removal deletes `nav_<key>` and recompiles Paraglide. Because the footer's pages column is derived from `CLIENT_PAGE_ITEMS` (`client/navigation.ts`), the remaining step is removing the group's entry there: the command scans `src/` and `client/` for surviving `m.nav_<key>(` calls and lists the files to fix, so a dangling key fails loudly here instead of breaking the next build with an undefined message.

### 3.2 Removing Posts (`remove:post`)
```bash
# Remove entire article group across all languages:
npm run remove:post <group-slug> -- --force

# Remove single locale:
npm run remove:post <group-slug> -- --locale=fa --force
```

---

## 4. Language Management

### 4.1 Adding a New Language (`i18n:add-lang`)
```bash
npm run i18n:add-lang -- <locale> --name="<Display Name>" [--dir="ltr|rtl"] --with-content --from=en
```
* Updates `client/locales.json` (`locales`, `metadata`).
* Creates `client/messages/<locale>.json` (preserving core fallback behavior).
* Generates `<locale>.mdx` files across all pages and blog posts.
* Merges core + client dictionaries into `.paraglide-work/` and runs Paraglide compilation.

### 4.2 Removing a Language (`i18n:remove-lang`)
```bash
npm run i18n:remove-lang -- <locale> --with-content --force
```

### 4.3 Swapping Default Locale (`i18n:set-default`)
```bash
npm run i18n:set-default <locale> [--allow-draft]
```
* Updates `defaultLocale` and ordering in `client/locales.json`, and recompiles Paraglide messages so `<locale>` takes over root `/` URLs without prefix.

### 4.4 Single-Language Client Mode (`ui.showLanguageSwitcher: false` or optional `i18n:solo`)
* **Recommended zero-structural-change option**: Set `"ui": { "showLanguageSwitcher": false }` in `client/config.json` (combined with `npm run i18n:set-default <locale>` if the root `/` site should use another locale such as `fa`). All existing files stay intact without touching routes or dictionaries.
* **Optional strict solo archive (`i18n:solo`)**:
  ```bash
  npm run i18n:solo <locale> [--keep-content|--delete-content] [--allow-draft] [--force]
  ```
  Switches `defaultLocale` to `<locale>` in `client/locales.json`, unregisters every other locale so alternate prefixes are omitted from `dist/` and `sitemap.xml`, and archives inactive client dictionaries and `.mdx` files under `.locale-archive/<locale>/` (restorable cleanly with `i18n:add-lang`).

---

## 5. Translations & Styling Tools

### 5.1 Adding Translation Keys (`i18n:add` and `i18n:add-batch`)
```bash
# Single key:
npm run i18n:add -- --category=<category> --key=<key> --en="..." --fa="..." --ar="..." --de="..." --fr="..."

# Batch keys from JSON file or CLI string:
npm run i18n:add-batch -- --file=translations.json
npm run i18n:add-batch -- --json='{"cart_checkout":{"en":"Checkout","fa":"تسویه حساب"}}'
```
* Automatically maintains alphabetical key sorting in all JSON dictionaries.
* Triggers Paraglide compiler once.

### 5.2 Converting Tailwind Blocks (`block:adapt`)
```bash
npm run block:adapt -- --file=<path-to-component>
```
* Automatically converts physical classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l-`, `border-r-`) to logical equivalents (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, `border-s-`, `border-e-`).
* Replaces hardcoded grayscale colors with semantic tokens (`bg-white` → `bg-bg`, `text-gray-900` → `text-fg`, `border-gray-200` → `border-border`).

### 5.3 Extracting User-Visible Copy (`i18n:extract`) & Auto-Syncing Keys (`i18n:sync-keys`)
```bash
npm run i18n:extract -- --target=<file-or-dir> --key=<namespace> --auto-add --replace
npm run i18n:sync-keys [-- --dry-run] [--json] [--quiet]
```
`i18n:sync-keys` scans static `m.*()` usages, enabled `content.types`, `ui.navigation.pages`, and frontmatter taxonomy (`categories`/`tags`), fills missing keys in `client/messages/<locale>.json` with humanized English for `defaultLocale` and `[TODO: <locale>] <English>` for other locales, and compiles Paraglide.

### 5.3b Generating Component Props Catalog (`blocks:catalog`)
```bash
npm run blocks:catalog [-- --check] [--json] [--quiet]
```
Parses TypeScript `interface Props` and defaults across `src/components/*.astro` and `src/components/ui/*.astro` to emit `< 5 KB` `docs/BLOCKS-API.md`.

### 5.4 Regenerating Brand Artwork & Logo-Derived Icon Suite (`assets:generate`)
```bash
npm run assets:generate
npm run assets:generate -- --from-logo=path/to/logo.svg --brand-only --force
```
* When `--from-logo[=<path>]` is provided or `brand.logo.light` resolves to a file in `public/`, uses `sharp` to derive `apple-touch-icon.png` (180×180), PWA `icon-192.png`/`icon-512.png`, multi-size `favicon.ico` (16×16 + 32×32 PNG-in-ICO), `favicon.svg` (when SVG source without `<script>`), and logo-badged `og-default.png`, alongside all per-group hero/cover artwork (`src/content/<type>/<group>/<group>.png`). Without a logo, falls back deterministically to pure PNG generation.

### 5.5 Post-Build Pagefind Indexing (`scripts/index-pagefind.mjs`)
```bash
node scripts/index-pagefind.mjs [--site=dist]
```
* Runs automatically as the final step of `npm run build`.
* Feeds built HTML from `dist/` into Pagefind's Node API in memory, normalizing Perso-Arabic character variants (`ي`/`ك` → `ی`/`ک`) and isolating Perso-Arabic punctuation (`«»،؛؟٪٬`) so Persian tokens index cleanly without modifying `dist/*.html` on disk.

---

## 6. Content-Type Management (`content:*`)

Every command reads merged config (`app.config.json` + `client/config.json` + `client/cms.json`) and custom client collections (`client/content.ts`) through `scripts/lib/content-types.mjs` and `scripts/lib/config.mjs`, so the CLI, `.pages.yml`, and the Astro build stay in complete sync.

### 6.1 Inspect (`content:list`)
```bash
npm run content:list
npm run content:list -- --json
```
Prints each type's route base, enable state, `index`/`paginated`/`nav` flags, group count, published/draft/missing entry counts, and a per-locale tally. `--json` is stable enough to consume from CI.

### 6.2 Enable / disable (`content:enable`, `content:disable`)
```bash
npm run content:disable projects
npm run content:enable projects
```
* Writes sparse overrides (`content.types.<type>.enabled`) to `client/config.json` without mutating upstream `app.config.json`.
* A disabled type loses its index/entry routes, sitemap entries, navigation links and the home-page CTA on the next build. **Content files are never touched**, so re-enabling restores the section.
* `pages` is refused (it owns the home page); unknown keys are refused with the list of known types.
* Static `/api/blog-posts.json` and `/rss.xml` keep working when `blog` is disabled, deliberately, so external consumers do not break.

### 6.3 Starter Demo Package (`starter:seed`) & Upstream Check (`upstream:check`)
```bash
npm run starter:seed [-- --blueprint=corporate|agency|portfolio|medical|catalog|legal] # Seed optional starter-kit/ pages, posts, projects & blueprint config
npm run starter:seed -- --clean --yes # Remove seeded demo items and return to clean minimal base state
npm run upstream:check               # Verify 3-tier config/CMS, messages, locales, and core/client hooks
```

### 6.4 Scaffold any type (`content:new`)
```bash
npm run content:new <type> <slug> -- [--title="<Title>"] [--desc="<Desc>"] \
  [--from=<locale>] [--slug:<locale>="<native-slug>"] [--image=cover.png|none] [--publish]
```
* `pages` and `blog` are forwarded to `new:page` / `new:post` (their frontmatter and taxonomy stay authoritative).
* Other types get `src/content/<type>/<slug>/<locale>.mdx` for every active locale, plus a generated `./<slug>.png` cover.
* **Schema-driven field scaffolding**: `content:new` inspects `content.types.<type>.fields` and automatically populates `default` values and safe placeholders for `required` fields in the generated `.mdx` frontmatter (`enum` picks the first `options` entry unless a `default` is set; `string[]`/`taxonomy[]` become `[]`, etc.).
* Only the source locale is published with `--publish`; other locales get a `[TODO: <locale>]` title and `draft: true`, so untranslated placeholder copy never reaches production.
* Group slugs are validated before any write (`../blog`, `/etc`, `.` are rejected, as is the reserved pagination slug `page`), and an existing group is never overwritten.
* The cover is generated even when the type is disabled: the entry's `image` reference must exist so re-enabling the type cannot fail the build. `assets:generate` covers every declared collection for the same reason.

### 6.5 Sync CMS & Collection Folders (`content:sync`)
```bash
npm run content:sync              # Regenerate .pages.yml collection blocks & ensure src/content/<type>/ directories exist
npm run content:sync -- --check   # Dry-check in CI / pre-delivery: exits 1 if .pages.yml or content folders are out of sync
npm run content:sync -- --dry-run # Print planned .pages.yml / folder updates without writing
```
* Reads `content.types` from the merged 3-tier config (`app.config.json` + `client/config.json` + `client/cms.json`), preserves `pages` and `client/cms.json` file entries, appends any client-added `fields` on `blog` / `projects` / custom collections (skipping `cms: false`), maps `enum` → Pages CMS `select`, `string[]`/`taxonomy[]` → `list: true`, `text`/`number`/`boolean`/`date`/`image` appropriately, and creates empty `src/content/<type>/` directories with `.gitkeep` so Astro's content loader stays clean before entries exist.

---

## 7. Health, Readiness & Link Checks

### 7.1 `doctor` & Strict Pre-Handoff Gate (`doctor:handoff`)
```bash
npm run doctor
npm run doctor:handoff       # same as `npm run doctor -- --handoff` (or `--strict`): exits 1 on warnings
npm run doctor -- --json     # exit 1 only when a real error is found
```
Checks Node against `engines`, the pinned package manager and lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`/`bun.lockb`), `app.config.json` / `client/config.json` / `client/cms.json` parsing, `analytics` provider ID formats (`ga4Id`, `gtmId`, `clarityId`) and GDPR compliance warnings when consent-required analytics run with `cookies.enabled: false` (unless `analytics.requireConsent: false` or cookieless opt-out is set), `redirects` validity (including wildcard `/*` and `:splat`), content-type bases (empty, duplicate, reserved by the router or equal to a locale prefix), template branding/author defaults still in place, valid non-placeholder `SITE_URL`, dictionary parity and `[TODO: …]` values, `src/paraglide` freshness (compared against `src/paraglide/messages/_index.js`), missing group/locale files, broken `brand.logo` or frontmatter image references, and the presence of `dist/`. In `--handoff` / `--strict` mode every readiness warning escalates into a blocking `error`. Each finding prints the command that fixes it.

### 7.2 `content:status` (readiness matrix)
```bash
npm run content:status
npm run content:status -- --json
npm run content:status -- --write=docs/STATUS.md --type=projects
```
One row per group with a column per locale: `✅` published, `✏️` draft, `—` missing, plus word count, reading time, `[TODO: …]` count and a `type disabled` note. `--write` emits a Markdown table for a client hand-off.

### 7.3 `link:check` (post-build crawl)
```bash
npm run link:check
npm run link:check -- --dir=dist --json --limit=100
```
Walks every built HTML file and verifies `href`, `src`, `poster`, each `srcset` candidate, and configured non-wildcard redirect destination targets that point inside the site (wildcard `/*` / `:splat` rules are validated syntactically and skipped as concrete file targets). A path resolves when it maps to a real file, to `<path>/index.html`, or to `<path>.html`; `/pagefind/` is skipped because it is loaded at runtime. A `#fragment` must also exist as an `id`/`name` on the target page (the browser's built-in `#top`/`#` anchors and fragments into non-HTML assets are skipped), so renaming a section id breaks the build check instead of shipping a dead `#privacy` link. Exits 1 with `page → target#fragment` pairs.

### 7.4 Browser Layout & Delivery Preflight (`qa:browser`, `preflight`, `preflight:full`)
```bash
npm run qa:browser      # Playwright Chromium layout, CLS/JS budgets & @axe-core/playwright WCAG audit on dist/
npm run preflight       # compile -> upstream -> audit -> doctor -> vitest -> build -> smoke -> link:check
npm run preflight:full  # Runs full preflight + Chromium Playwright layout, performance & Axe accessibility QA
```
