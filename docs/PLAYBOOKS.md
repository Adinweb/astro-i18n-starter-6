# AI Playbooks & Operational Guides

This document provides step-by-step verified playbooks for common architectural and content operations.

---

## Playbook 1: Swapping the Default Locale

To switch the primary default (prefix-less) language of the site (e.g. from English to Persian `fa` or German `de`):

1. **Update Locale Configuration**:
   Open `src/i18n/config.ts` and update `DEFAULT_LOCALE`:
   ```typescript
   export const DEFAULT_LOCALE: Locale = 'fa'; // Changed from 'en' to 'fa'
   ```

2. **Update Inlang Base Locale**:
   Open `project.inlang/settings.json` and set:
   ```json
   "baseLocale": "fa"
   ```

3. **Recompile & Verify**:
   Run the full verification suite:
   ```bash
   pnpm messages:compile && pnpm test && pnpm build && pnpm smoke
   ```

4. **Expected Outcome**:
   - Persian (`fa`) instantly routes to prefix-less URLs (`/`, `/about`, `/blog/اولین-پست`).
   - English (`en`) routes to prefixed URLs (`/en`, `/en/about`, `/en/blog/first-post`).
   - Hreflang `x-default` automatically points to the Persian version.
   - Language switcher, canonical URLs, and sitemap update seamlessly without moving a single file.

---

## Playbook 2: Adding a New Content Collection

To add a new multilingual content collection (e.g., `docs`, `case-studies`, `changelog`):

1. **Define Schema & Loader**:
   In `src/content.config.ts`, add the new collection using `glob` loader:
   ```typescript
   caseStudies: defineCollection({
     loader: glob({
       pattern: '**/*.{md,mdx}',
       base: './src/content/case-studies',
       generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
     }),
     schema: baseSchema,
   }),
   ```

2. **Register Route Mapping**:
   In `src/libs/content/service.ts`:
   - Add the collection name to collection scanning in `getSiteRoutes()`.
   - Resolve alternates and register routes with appropriate `routeType` (or generic collection view).

3. **Add View Branch**:
   In `src/pages/[...path].astro`, add a rendering branch for the new route type or view:
   ```astro
   {routeType === 'case-study' && entry && (
     <CaseStudyView entry={entry} locale={locale} alternates={alternates} url={url} />
   )}
   ```

4. **Scaffold First Content Item**:
   Run the CLI scaffolder:
   ```bash
   npm run new:post my-first-case-study -- --collection=case-studies
   ```

5. **Audit & Build**:
   ```bash
   npm run audit:i18n && pnpm build
   ```

---

## Playbook 3: Adding or Adapting UI Components

1. **Tailwind Blocks RTL & Token Adaptation**:
   When pasting Tailwind UI or external component code, adapt directions and utility colors:
   ```bash
   npm run block:adapt -- --file=src/components/MyComponent.astro
   ```

2. **Extract Copy to Compiled Messages**:
   Extract plain text nodes to Paraglide message keys:
   ```bash
   npm run i18n:extract -- --target=src/components/MyComponent.astro --key=mycomp --auto-add --replace
   ```

3. **Fill Translations**:
   Provide translations in `messages/de.json` and `messages/fa.json`, then compile:
   ```bash
   pnpm messages:compile
   ```

---

## Playbook 4: Adding New Languages & Scaffolding Multilingual Content

### 1. Adding a New Language (`npm run i18n:add-lang`)
```bash
# Add a new language with interactive prompt or explicit flags:
npm run i18n:add-lang -- ar --with-content --from=en
npm run i18n:add-lang -- es --with-content --from=fa
npm run i18n:add-lang -- it --no-content
```
* **Flags:**
  * `--with-content` / `--no-content`: Chooses whether to auto-generate markdown files for all existing pages and posts in the new language.
  * `--from=<locale>`: Selects which existing language to clone titles, descriptions, and markdown body from (defaults to `DEFAULT_LOCALE` / `en`).
  * `--publish` / `--draft=false`: Marks auto-generated content as published (default `draft: false`).

### 2. Scaffolding New Articles (`npm run new:post`)
```bash
# Create post with default source language (en) and draft non-source translations:
npm run new:post -- tech-trends

# Create post from Persian and publish all locales immediately:
npm run new:post -- ai-features --from=fa --title="قابلیت‌های هوش مصنوعی" --publish

# Non-interactive frontmatter sync across all 5 language files without overwriting markdown body:
npm run new:post -- tech-trends --update --sync-frontmatter --title="Modern Tech Trends" --desc="Updated description"
```
* **Why non-source locales default to `draft: true`:**
  To prevent unreviewed placeholder translations (`[TODO: ...]`) from appearing publicly on the live blog index (`/fa/blog`, `/de/blog`, etc.), `new:post` sets `draft: true` on non-source locales by default.
  * To show a post on a specific language's blog listing, set `draft: false` in its frontmatter.
  * To publish all languages immediately upon creation, pass `--publish` or `--draft=false`.
* **Updating Frontmatter:** Pass `--update` or `--sync-frontmatter` to update `title`, `description`, `date`, or `draft` across all 5 language files while preserving markdown body content.

### 3. Scaffolding New Pages (`npm run new:page`)
```bash
# Create new page across all locales:
npm run new:page -- contact --from=fa --title="تماس با ما"

# Non-interactive frontmatter update across all locales:
npm run new:page -- contact --update --sync-frontmatter --title:fa="تماس با تیم ما" --title:en="Contact Our Team"
```
* Auto-creates localized page entries across all active locales.
* Automatically registers navigation key `nav_<key>` in all dictionaries and recompiles Paraglide.
* Use `--update` / `--sync-frontmatter` to update existing pages without manual file rewrites.

### 4. Batch Adding Translations (`npm run i18n:add-batch`)
```bash
# Import from JSON file:
npm run i18n:add-batch -- --file=translations.json

# Pass JSON directly or pipe via stdin:
npm run i18n:add-batch -- --json='{"cart_checkout": {"en": "Checkout", "fa": "تسویه حساب"}}'
cat translations.json | npm run i18n:add-batch
```
* Supports key-to-locale maps, locale-to-keys maps, or nested category objects.
* Automatically generates fallback placeholders for missing locales to guarantee dictionary key parity.
* Recompiles Paraglide in a single pass instead of running multi-step loops.

---

## Playbook 5: Removing Languages & Content (Clean Lifecycle)

### 1. Removing a Language (`npm run i18n:remove-lang`)
```bash
# Interactive mode (asks whether to delete content files):
npm run i18n:remove-lang -- ar

# Force mode (deletes language config, dictionary, and all ar.mdx content files):
npm run i18n:remove-lang -- ar --with-content --force

# Keep existing content files under src/content/:
npm run i18n:remove-lang -- ar --keep-content --force
```
* **Guard:** Protects the default base locale (`DEFAULT_LOCALE`) from accidental deletion.
* **Cleanup:**
  1. Removes the locale from `project.inlang/settings.json`.
  2. Deletes `messages/<locale>.json`.
  3. Updates `src/i18n/locales.ts` (removes from `LOCALES` array and `LOCALE_METADATA`).
  4. Deletes associated `<locale>.mdx` files across `src/content/` (if `--with-content`).
  5. Recompiles Paraglide messages automatically.

### 2. Removing an Article / Blog Post (`npm run remove:post`)
```bash
# Delete entire article across all languages:
npm run remove:post -- tech-trends --force

# Delete only the German translation file for a post:
npm run remove:post -- tech-trends --locale=de --force
```

### 3. Removing a Static Page (`npm run remove:page`)
```bash
# Delete entire page and clean its navigation key from dictionaries:
npm run remove:page -- pricing --force

# Delete only a specific language's page file:
npm run remove:page -- pricing --locale=de --force
```
* Automatically cleans up `nav_<page-key>` from all dictionary files (`messages/*.json`) and recompiles Paraglide messages.
* Guards the critical `home` page from deletion without `--force`.


