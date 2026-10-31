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
