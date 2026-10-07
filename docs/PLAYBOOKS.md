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
