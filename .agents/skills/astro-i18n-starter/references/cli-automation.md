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

### 2.1 Static Pages (`new:page`)
```bash
npm run new:page <page-key> -- [--title="<Title>"] [--desc="<Desc>"] [--from=<locale>] [--hero=none|minimal|default] [--container=canvas|contained|prose] [--image=<path>|none] [--publish] [--slug:<locale>="<native-slug>"]
```
* **Files Created**: `src/content/pages/<page-key>/<locale>.mdx` across all active locales in `src/i18n/locales.ts` (`en.mdx`, `fa.mdx` out of the box) + `./<page-key>.png`.
* **Dictionary Key**: Automatically registers `nav_<page-key>` across all dictionaries in `messages/*.json`.
* **Publication State**:
  - Default: Only the source locale (`--from`, defaults to `DEFAULT_LOCALE`) is published (`draft: false`); other locales remain `draft: true` until translated.
  - `--publish` / `--draft=false`: Publishes locales that have real translations. Locales retaining `[TODO: ...]` placeholders remain drafts.
* **Updating Frontmatter without Body Overwrite**:
  ```bash
  npm run new:page <page-key> -- --update --sync-frontmatter --title="<New Title>" --hero=minimal --container=contained
  ```
  `--update` preserves existing markdown content while `--sync-frontmatter` aligns structural/shared frontmatter (`image`, `hero`, `container`, `flushTop`, `template`) across all locale files.

### 2.2 Blog Posts (`new:post`)
```bash
npm run new:post <group-slug> -- [--title="<Title>"] [--from=<locale>] [--publish] [--category=<cat>] [--tags=<tags>] [--image=<path>|none]
```
* **Files Created**: `src/content/blog/<group-slug>/<locale>.mdx` across all active locales + `./<group-slug>.png`.
* **Cloning Body**: Use `--clone-from=<existing-group>` to clone the body copy from another post.
* **Taxonomy**: Validates categories and tags against ASCII lowercase rules (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`).
* **Updating Frontmatter**:
  ```bash
  npm run new:post <group-slug> -- --update --sync-frontmatter --title="<New Title>"
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
* Updates `project.inlang/settings.json`.
* Creates `messages/<locale>.json` with parity placeholders.
* Updates `src/i18n/locales.ts` (`LOCALES`, `LOCALE_METADATA`).
* Generates `<locale>.mdx` files across all pages and blog posts.
* Runs Paraglide compilation.

### 4.2 Removing a Language (`i18n:remove-lang`)
```bash
npm run i18n:remove-lang -- <locale> --with-content --force
```

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

### 5.3 Extracting User-Visible Copy (`i18n:extract`)
```bash
npm run i18n:extract -- --target=<file-or-dir> --key=<namespace> --auto-add --replace
```

### 5.4 Regenerating Brand Artwork & Icons (`assets:generate`)
```bash
npm run assets:generate
```
* Generates `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-default.png`, and all per-group hero/cover PNG artwork using Node.js without requiring headless browsers.

### 5.5 Post-Build Pagefind Indexing (`scripts/index-pagefind.mjs`)
```bash
node scripts/index-pagefind.mjs [--site=dist]
```
* Runs automatically as the final step of `npm run build`.
* Feeds built HTML from `dist/` into Pagefind's Node API in memory, normalizing Perso-Arabic character variants (`ي`/`ك` → `ی`/`ک`) and isolating Perso-Arabic punctuation (`«»،؛؟٪٬`) so Persian tokens index cleanly without modifying `dist/*.html` on disk.

---

## 6. Content-Type Management (`content:*`)

Every command reads the registry from `app.config.json` through `scripts/lib/content-types.mjs`, so the CLI and the build can never disagree about which collections exist.

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
* Flips `content.types.<type>.enabled` and rewrites `app.config.json` with its own indentation and line endings, so the diff is one line.
* A disabled type loses its index/entry routes, sitemap entries, navigation links and the home-page CTA on the next build. **Content files are never touched**, so re-enabling restores the section.
* `pages` is refused (it owns the home page); unknown keys are refused with the list of known types.
* Static `/api/blog-posts.json` and `/rss.xml` keep working when `blog` is disabled, deliberately, so external consumers do not break.

### 6.3 Scaffold any type (`content:new`)
```bash
npm run content:new <type> <slug> -- [--title="<Title>"] [--desc="<Desc>"] \
  [--from=<locale>] [--slug:<locale>="<native-slug>"] [--image=cover.png|none] [--publish]
```
* `pages` and `blog` are forwarded to `new:page` / `new:post` (their frontmatter and taxonomy stay authoritative).
* Other types get `src/content/<type>/<slug>/<locale>.mdx` for every active locale, plus a generated `./<slug>.png` cover.
* Only the source locale is published with `--publish`; other locales get a `[TODO: <locale>]` title and `draft: true`, so untranslated placeholder copy never reaches production.
* Group slugs are validated before any write (`../blog`, `/etc`, `.` are rejected, as is the reserved pagination slug `page`), and an existing group is never overwritten.
* The cover is generated even when the type is disabled: the entry's `image` reference must exist so re-enabling the type cannot fail the build. `assets:generate` covers every declared collection for the same reason.

---

## 7. Health, Readiness & Link Checks

### 7.1 `doctor` (no build)
```bash
npm run doctor
npm run doctor -- --json     # exit 1 only when a real error is found
```
Checks Node against `engines`, the pinned package manager and lockfile, `app.config.json` parsing, content-type bases (empty, duplicate, reserved by the router or equal to a locale prefix), template branding still in place, `SITE_URL`, dictionary parity and `[TODO: …]` values, `src/paraglide` freshness (compared against `src/paraglide/messages/_index.js`, the file the compiler always rewrites), missing group/locale files, frontmatter image references that point at nothing, and the presence of `dist/`. Each finding prints the command that fixes it.

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
Walks every built HTML file and verifies `href`, `src`, `poster` and each `srcset` candidate that points inside the site. A path resolves when it maps to a real file, to `<path>/index.html`, or to `<path>.html`; `/pagefind/` is skipped because it is loaded at runtime. Exits 1 with `page → target` pairs, so a renamed slug or a stale CTA cannot ship as a 404.
