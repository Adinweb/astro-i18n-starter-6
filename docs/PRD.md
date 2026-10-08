# ASTRO I18N STARTER — MASTER BUILD PROMPT / PRD v5.0 

**Purpose:** Complete, self-contained specification for an AI coding agent to design and build a production-grade, multi-lingual (RTL + LTR), SSG-first website starter from scratch.  
**Target Audience:** AI Coding Agent (working phase-by-phase).  
**Version:** 5.0 (Definitive) · **Status:** Ready for execution — zero open questions.

---

## ROLE & MISSION

You are a senior Astro v7 and TypeScript systems engineer building a production-grade, multi-lingual (RTL + LTR), SSG-first website starter template from scratch. Success is measured by the codebase itself: maintainable, strictly typed, single-source-of-truth (SSOT), DRY, and equipped with a verified developer CLI suite. You have full authority over internal file naming and folder organization **except** where this document pins constraints.

---

## CONTRACT RULES (Read First)

1. **The Contract Outranks Habit:** Requirements outrank personal design preference, template habits, or "how Astro starters usually do it."
2. **Scope Discipline:** Do not add features, dependencies, or route files not specified here. Every abstraction must earn its keep by removing duplication.
3. **Never Guess:** If a requirement is ambiguous or self-contradictory, **stop and ask**, presenting the trade-offs. Never silently pick an unverified design.
4. **Phase Discipline:** Work phases in strict order (§11). Never start a phase until the predecessor's exit criteria are green. After each phase, report the exit criteria output **verbatim**, then wait for confirmation before committing.
5. **Step 0 (Persistent Contract):** Save this prompt verbatim as `docs/PRD.md` in the repository before writing any code. Re-read it at the start of every phase.
6. **Tooling Safety:** Automated file-modifying CLI scripts (`block:adapt`, `i18n:extract`, `new:page`) must operate with parser boundaries (using `magic-string` and HTML/text node targeting) to guarantee template markup and Astro frontmatter are never corrupted.

---

## 1. PRODUCT GOALS

| Goal | Meaning in Practice |
| :--- | :--- |
| **Maintainable** | Any file understood in < 2 minutes. Zero dead code, zero copy-pasted URL logic. |
| **Swappable Default Locale** | Switching `DEFAULT_LOCALE` in config instantly updates routing, canonical tags, hreflangs, and switcher logic with **zero** route file restructuring. |
| **Clean URLs (Prefix-less Default)** | Default locale paths have **no prefix** (`/`, `/about`, `/blog/first-post`). Non-default locales have prefixes (`/fa`, `/fa/about`, `/fa/blog/اولین-پست`). |
| **Unified Content Pipeline** | Static pages (`about`, `privacy`) and articles (`blog`) both use the Content Layer under `src/content/{collection}/{group}/{locale}.mdx`. |
| **Turnkey Developer CLI** | Built-in CLI tools to adapt external Tailwind blocks to RTL/tokens, extract text, add translation keys, scaffold pages/posts, and audit completeness. |
| **DRY & SSOT** | Every architectural fact has exactly one owner (§6.1); everything else derives from it. |
| **Type-Safe** | `tsc --noEmit` baseline. Strongly-typed message invocations via Paraglide (`m.*()`), typed content loaders via Zod. Strict `noImplicitAny`. |
| **i18n-First & RTL-Native** | User-visible copy flows through compiled messages. Translated slugs for pages and posts. RTL/LTR first-class with pure CSS `:lang()` font stacks. ICU plurals and ordinals verified. |
| **Verified** | Unit tests + i18n audit + post-build HTML smoke tests over `dist/` all pass in CI. |

---

## 2. NON-GOALS

❌ Client UI frameworks (React/Vue/Svelte) — vanilla Astro `<script>` islands only · ❌ Dynamic SSR runtime (Pure SSG only) · ❌ Backend/DB/CMS/Auth · ❌ Template kit dumps (no Preline, Tailwind UI dumps, or Bootstrap relics) · ❌ Client-side SPA language switching (switching = static navigation to the translated URL) · ❌ Astro built-in `i18n` URL helpers or Paraglide routing adapters (both fail when handling translated slugs with prefix-less defaults) · ❌ Complex view registries for static pages · ❌ Inline SVG path markup in HTML (§7.11).

---

## 3. NON-NEGOTIABLE PRINCIPLES

1. **One source of truth per fact** (§6.1).
2. **Type safety by default** — no `any`, no `as any`, no untyped collection payloads.
3. **No dead code** — every export has an active importer; `knip` enforces this in CI.
4. **No hardcoded copy** — all UI strings come from compiled messages (`m.*()`).
5. **No duplicated routing or URL logic** — path construction, locale stripping, and slug mapping live in dedicated single modules.
6. **Config over code** — route bases, collections, and layouts are typed keys referencing message keys, never raw strings.
7. **Fail loudly** — missing data, missing translations, or duplicate slugs fail the build with explicit errors.
8. **Follow modern platform primitives** — Astro Content Layer (`glob`), View Transitions (`ClientRouter`), CSS logical properties.
9. **Untouchable generated code** — Paraglide output is gitignored, compiled at build time, and never hand-edited.
10. **Render-time message invocation** — message functions are called only inside `.astro` templates or render components, never at module evaluation scope.

---

## 4. TECH STACK & COMMANDS

| Tool | Choice | Notes |
| :--- | :--- | :--- |
| **Runtime & PM** | Node ≥ 22.12, `pnpm` (lockfile committed) | Enforced via `package.json` `engines` and `packageManager`. |
| **Framework** | **Astro 7.x (SSG)** | `site` from env (fail-loud guard), `build.format: 'directory'`, `trailingSlash: 'ignore'`, `compressHTML: 'jsx'`. |
| **Language** | TypeScript Strict | `astro/tsconfigs/strict`, `@/*` → `src/*` path alias. |
| **i18n Engine** | **`@inlang/paraglide-js`** | Compile-time ICU MessageFormat (`plural` + `selectordinal`). Native namespace imports: `import * as m from '@/paraglide/messages'`. |
| **Styling** | **Tailwind CSS v4** | Via `@tailwindcss/vite`. `@theme inline` required. CSS logical properties throughout. |
| **Content** | Astro Content Layer (`glob` loader + Zod) | Symmetrical `<group>/{locale}.mdx` convention for both `pages` and `blog`. |
| **Search** | **Pagefind** + Dev JSON Index | Pagefind indexes `dist/` post-build. Dev mode uses a generated JSON index fallback. |
| **Icons** | Build-Time SVG Sprite Endpoint | `src/pages/icons.svg.ts` endpoint + `<Icon name="..." />` component. Zero inline `<path>` bloat. |
| **Auditing & Tests** | `vitest`, `knip`, custom smoke suite | Automated contract enforcement in CI. |

### Commands (Strict Naming)
```bash
# Core Lifecycle
pnpm dev               # messages:compile -> astro dev --background :4321
pnpm messages:compile  # paraglide-js compile -> src/paraglide/
pnpm lint              # tsc --noEmit
pnpm test              # vitest run (unit tests for paths, ICU plurals/ordinals, resolvers)
pnpm build             # messages:compile -> astro build -> pagefind --site dist
pnpm smoke             # node scripts/smoke.mjs (asserts raw dist/ HTML output)
pnpm clean             # rm -rf dist .astro src/paraglide

# Developer Automation & Management CLI Suite (§8)
npm run block:adapt -- --file=<path-to-component-or-view>
npm run i18n:extract -- --target=<file-or-dir> --key=<namespace> --auto-add --replace
npm run i18n:add -- --category=<category> --key=<key> --fa="متن فارسی"
npm run new:page <page-key>
npm run new:post <group-slug>
npm run audit:i18n
```

---

## 5. CONFIRMED ARCHITECTURAL DECISIONS

| Decision | Specification |
| :--- | :--- |
| **Locales Seeded** | `en` (Default/Source, LTR), `de` (LTR), `fa` (RTL). |
| **URL Strategy** | **Prefix-less Default Locale:** Default (`en`) routes to `/`, `/about`, `/blog/first-post`. Non-default (`fa`, `de`) route to `/fa`, `/fa/about`, `/fa/blog/اولین-پست`, `/de`, etc. |
| **Default Swapping** | Controlled entirely in `src/i18n/config.ts`. If `DEFAULT_LOCALE = 'fa'`, Persian becomes prefix-less (`/`) and English becomes prefixed (`/en`). |
| **Routing Architecture** | **Lean Router Dispatcher:** `src/pages/[...path].astro` delegates rendering to dedicated views (`PageView.astro`, `BlogPostView.astro`, `BlogIndexView.astro`), avoiding fatal dynamic route collisions. |
| **Static Pages Model** | Static pages (`about`, `privacy`) live as first-class entries in `src/content/pages/{group}/{locale}.mdx`. Zero separate registries or configs. |
| **404 Strategy** | Standalone `src/pages/404.astro`. Reads path prefix to detect locale; falls back to `DEFAULT_LOCALE`. |
| **Hreflang Tags** | Count = `locales + 1` (self-reference + alternates + `x-default` pointing to `DEFAULT_LOCALE`). |
| **Content Organization** | Folder-per-entry: `src/content/{collection}/{group}/{locale}.mdx`. Identity is `{group}`. |
| **Search Engine** | Post-build Pagefind over `dist/`. In `pnpm dev`, search queries an auto-generated static JSON search index. |

---

## 6. ARCHITECTURE & SSOT CONSTRAINTS

### 6.1 Single Source of Truth (SSOT) Matrix

| Architectural Fact | Owner Module | Downstream Consumers |
| :--- | :--- | :--- |
| **Locale Configuration** | `src/i18n/config.ts` | `DEFAULT_LOCALE`, `LOCALES`, `Locale` type, URL helpers, sitemap, hreflang. |
| **Locale Metadata** | `src/i18n/locales.ts` | `satisfies Record<Locale, LocaleMeta>` (attaches `dir`, `htmlLang`, `fontFamily`). |
| **UI Strings** | `messages/{locale}.json` | Paraglide compiler → `src/paraglide/messages.js`. |
| **URL Construction** | `src/i18n/paths.ts` | **Exactly 3 pure functions:** `localizeHref`, `localeHref`, `stripLocale`. |
| **Content Schemas** | `src/content.config.ts` | Collection loaders (`pages`, `blog`), frontmatter validation, group mapping. |
| **Route & Slug Mapping** | `src/libs/content/service.ts` | Resolves cross-locale slug alternates, breadcrumbs, and `getSiteRoutes()`. |
| **Theme Tokens** | `src/styles/global.css` | Tailwind `@theme inline` block (oklch semantic variables). |
| **Site Metadata** | `src/libs/config/site.ts` | Env-driven Zod schema (site URL, site name, social tags). |

### 6.2 Strict URL Construction API (`src/i18n/paths.ts`)
```typescript
import { DEFAULT_LOCALE, type Locale } from './config';

export function localizeHref(pathname: string, targetLocale: Locale): string;
export function stripLocale(pathname: string): { locale: Locale; pathname: string };
export function localeHref(
  currentPath: string,
  targetLocale: Locale,
  alternates?: Partial<Record<Locale, string>>
): string;
```

### 6.3 Routing & Lean Dispatcher Architecture
Physical routes in `src/pages/` are strictly limited to:
```text
src/pages/
├── 404.astro               # Path-prefix locale-aware 404
├── icons.svg.ts            # SVG sprite endpoint (cacheable, zero-JS)
├── sitemap.xml.ts          # Derived from URL layer and content service
├── robots.txt.ts           # Derived from site config and sitemap URL
└── [...path].astro         # Lean Router Dispatcher (< 50 lines)
```

**Implementation Contract for `src/pages/[...path].astro`:**
```astro
---
import { getSiteRoutes } from '@/libs/content/service';
import PageView from '@/views/PageView.astro';
import BlogPostView from '@/views/BlogPostView.astro';
import BlogIndexView from '@/views/BlogIndexView.astro';

export async function getStaticPaths() {
  return await getSiteRoutes();
}

const { routeType, entry, locale } = Astro.props;
---

{routeType === 'page' && <PageView entry={entry} locale={locale} />}
{routeType === 'blog-entry' && <BlogPostView entry={entry} locale={locale} />}
{routeType === 'blog-index' && <BlogIndexView locale={locale} />}
```
*Note:* This completely eliminates route collisions between dynamic locales and dynamic collections while keeping presentation logic modular and isolated in `src/views/`.

---

## 7. CROSS-CUTTING SPECIFICATIONS

### 7.1 Styling, Theme & RTL Contract
* **Tailwind CSS v4:** `@theme inline` required. Colors mapped via oklch semantic tokens (`bg-bg`, `bg-surface`, `text-fg`, `text-muted`, `border-border`, `primary`, etc.).
* **Logical Properties:** Standardize exclusively on `ms-`, `me-`, `ps-`, `pe-`, `start-*`, `end-*`.
* **RTL Mirroring Protection:** In `src/styles/prose.css`, code blocks (`pre`, `code`, `.math`) must be forced to LTR:
  ```css
  pre, code, .math {
    direction: ltr !important;
    text-align: left !important;
    unicode-bidi: isolate;
  }
  ```
* **Typography:** Use pure CSS `:lang()` selectors to bind font stacks. Persian (`:lang(fa)`) includes accessible fallback fonts (e.g., `Vazirmatn`, system-ui).

### 7.2 Paraglide Compile-Time Contract
* Messages live in `messages/{locale}.json`.
* Keys use `snake_case` prefixed by area: `nav_home`, `blog_read_more`.
* ICU Support tested for `plural` and `selectordinal`.
* Imported directly: `import * as m from '@/paraglide/messages'`.

### 7.3 Content Collections (`src/content.config.ts`)
Both pages and posts use the Astro Content Layer with the folder-per-entry convention:
```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const baseSchema = z.object({
  title: z.string(),
  slug: z.string(), // Localized slug: 'about' vs 'درباره-ما'
  description: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
  draft: z.boolean().default(false),
});

export const collections = {
  pages: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages', generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, '') }),
    schema: baseSchema,
  }),
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog', generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, '') }),
    schema: baseSchema.extend({
      publishedAt: z.coerce.date(),
    }),
  }),
};
```

---

## 8. DEVELOPER CLI & AUTOMATION SUITE

All scripts reside in `scripts/` and run natively with Node via `npm run <command>`.

### 8.1 `npm run block:adapt` — Tailwind Theme & RTL Converter
Adapts raw external Tailwind blocks (e.g., pasted from Tailwind UI, component kits) to semantic theme tokens and RTL-compatible logical properties.

```bash
npm run block:adapt -- --file=<path-to-component-or-view>
```

* **Script:** `scripts/block-adapt.mjs`
* **Safety Mechanism:** Uses `magic-string` to parse only `class="..."` and `class:list` string attributes. Leaves dynamic JSX variables and component logic untouched. Supports `--dry-run`.
* **Transformations Performed:**
  * Directions: `ml-*` → `ms-*`, `mr-*` → `me-*`, `pl-*` → `ps-*`, `pr-*` → `pe-*`, `left-*` → `start-*`, `right-*` → `end-*`, `text-left` → `text-start`, `text-right` → `text-end`, `border-l-*` → `border-s-*`, `border-r-*` → `border-e-*`, `rounded-l-*` → `rounded-s-*`, `rounded-r-*` → `rounded-e-*`.
  * Colors: `bg-white`/`bg-gray-50` → `bg-bg`/`bg-surface`, `text-gray-900`/`text-black` → `text-fg`, `text-gray-500` → `text-muted`, `border-gray-200`/`border-gray-300` → `border-border`, `bg-blue-600`/`bg-indigo-600` → `bg-primary`, `text-blue-600` → `text-primary`.

---

### 8.2 `npm run i18n:extract` — Text Extractor & Markup Replacer
Extracts hardcoded text nodes and user-facing attributes (`alt`, `placeholder`, `aria-label`, `title`) from Astro/MDX components, appends keys to dictionary files, and replaces markup with typed Paraglide calls.

```bash
npm run i18n:extract -- --target=<file-or-dir> --key=<namespace> --auto-add --replace
```

* **Script:** `scripts/i18n-extract.mjs`
* **Safety Mechanism:** Targets only plain text nodes outside `{}` JSX expressions. Automatically inserts `import * as m from '@/paraglide/messages';` into the Astro component frontmatter if absent. Supports `--dry-run`.
* **Flags:**
  * `--target`: Path to file or folder to process.
  * `--key`: Namespace prefix for generated message keys (e.g., `pricing`, `contact`).
  * `--auto-add`: Appends keys to `messages/{en,de,fa}.json`. `en.json` receives the extracted text; `fa.json` and `de.json` receive `[TODO: <lang>] <text>`.
  * `--replace`: Safely substitutes the text node with `{m.<key>()}`.

---

### 8.3 `npm run i18n:add` — Manual Translation Key Adder
Safely registers a new translation key directly into the dictionary files, maintaining key parity and triggering Paraglide recompilation.

```bash
npm run i18n:add -- --category=<category> --key=<key> --fa="متن فارسی" [--en="..."] [--de="..."]
```

* **Script:** `scripts/i18n-add.mjs`
* **Behavior:**
  1. Creates key `<category>_<key>` (e.g., `nav_contact`).
  2. Updates `messages/fa.json` with the `--fa` text.
  3. Updates `messages/en.json` (with `--en` or fallback `"[TODO: en]"`).
  4. Updates `messages/de.json` (with `--de` or fallback `"[TODO: de]"`).
  5. Alphabetizes JSON keys and triggers `pnpm messages:compile`.

---

### 8.4 `npm run new:page` — Static Page Scaffolder
Creates a new static page group in `src/content/pages/` complete with localized frontmatter and markdown body stubs.

```bash
npm run new:page <page-key> [--title="<title>"]
```

* **Script:** `scripts/new-page.mjs`
* **Behavior:**
  1. Creates directory `src/content/pages/<page-key>/`.
  2. Emits `en.mdx`, `de.mdx`, and `fa.mdx` with localized frontmatter:
     * `en`: `slug: "<page-key>"`, `title: "<title>"`
     * `de`: `slug: "<page-key>-de"`, `title: "[TODO: de] <title>"`
     * `fa`: `slug: "<page-key>-fa"`, `title: "[TODO: fa] <title>"`
  3. Automatically registers a navigation translation key via `npm run i18n:add -- --category=nav --key=<page-key> --en="<title>"`.

---

### 8.5 `npm run new:post` — Multilingual Article Scaffolder
Creates a synchronized group of `.mdx` files for a new article across all locales, with frontmatter pre-filled and option to clone an existing language.

```bash
npm run new:post <group-slug> [--collection=<name>] [--from=<locale>]
```

* **Script:** `scripts/new-post.mjs`
* **Behavior:**
  1. Validates `src/content/<collection>` (defaults to `blog`).
  2. Creates directory `src/content/<collection>/<group-slug>/`.
  3. Emits `<locale>.mdx` for every configured locale (`en.mdx`, `de.mdx`, `fa.mdx`).
  4. If `--from` is specified, copies body content and frontmatter structure from that locale.
  5. Pre-populates frontmatter:
     * `title`: `"[TODO: <locale>] <group-slug>"`
     * `slug`: Localized slug placeholder
     * `description`: `"[TODO: <locale>] Description"`
     * `publishedAt`: Current ISO date
     * `draft: true` (except for source locale)

---

### 8.6 `npm run audit:i18n` — Audit Suite
Audits missing translations across dictionaries, content collections, and page configurations.

```bash
npm run audit:i18n
```

* **Script:** `scripts/audit-i18n.mjs`
* **Verification Checks:**
  1. **Dictionary Key Parity (FATAL / Exit 1):** Verifies all keys in `en.json` exist in `de.json` and `fa.json`. Fails build if missing.
  2. **Content Collection Parity (FATAL / Exit 1):** Verifies all group folders in `src/content/*/*/` contain `.mdx` files for all active locales.
  3. **Slug Collision Guard (FATAL / Exit 1):** Ensures no localized slug collides with a top-level route base or another page in the same locale.
  4. **Unextracted Text Scanner (WARNING / Exit 0):** Scans `.astro` templates for raw text nodes not wrapped in `m.*()` calls, emitting warnings with file and line numbers without breaking the build.

---

## 9. VERIFICATION SUITE & DEFINITION OF DONE

The project must pass the following suite at phase boundaries:
```bash
pnpm lint && pnpm test && npm run audit:i18n && pnpm build && pnpm smoke
```

### Smoke Test Specifications (`pnpm smoke`)
The smoke test script (`scripts/smoke.mjs`) parses `dist/` directly:
1. Verifies `/index.html` renders default locale (`<html lang="en" dir="ltr">`).
2. Verifies `/fa/index.html` renders Persian (`<html lang="fa" dir="rtl">`).
3. Verifies translated slug routes exist (e.g., `dist/fa/blog/اولین-پست/index.html`).
4. Verifies canonical `<link rel="canonical">` matches the target URL.
5. Verifies hreflang tags: exactly `locales.length + 1` tags (`en`, `de`, `fa`, `x-default`).
6. Verifies `dist/icons.svg` exists and contains compiled icon symbols.
7. Verifies `dist/pagefind/` search bundle exists.

---

## 10. AI PLAYBOOKS (`docs/PLAYBOOKS.md`)

For operations that modify business logic, the agent refers to written playbooks rather than writing speculative code:

### Playbook 1: Swapping the Default Locale
1. Open `src/i18n/config.ts`.
2. Change `export const DEFAULT_LOCALE = 'en';` to target (e.g., `'fa'`).
3. If necessary, update `baseLocale` in `project.inlang/settings.json`.
4. Run `pnpm test && pnpm build && pnpm smoke`.
5. *Result:* Persian immediately becomes prefix-less (`/`), English becomes prefixed (`/en/`), and hreflang `x-default` points to Persian.

### Playbook 2: Adding a New Content Collection
1. Define the collection in `src/content.config.ts` using `glob` loader and `baseSchema`.
2. Register the collection route base in `src/libs/content/service.ts`.
3. Add view renderer branch in `src/pages/[...path].astro`.
4. Run `npm run new:post <first-group> --collection=<collection>`.
5. Run `npm run audit:i18n && pnpm build`.

---

## 11. GATED EXECUTION PHASES

### Phase 0 — Spikes & Scaffolding
* Save this PRD verbatim as `docs/PRD.md`.
* **Tooling Spikes:**
  1. Verify Paraglide compiles clean ICU `plural` and `selectordinal` functions in Astro 7.
  2. Verify Pagefind indexing compatibility with Persian text.
  3. Record spike results in `docs/SPIKE_RESULTS.md`.
* Scaffold Astro 7, TypeScript strict, Tailwind v4 (`@tailwindcss/vite`).
* Setup `project.inlang/settings.json` and `src/i18n/config.ts`.
* Create `src/pages/icons.svg.ts` endpoint and `<Icon />` component.
* Create script stubs in `scripts/` so verification commands exist.
* **Exit Criteria (DoD):** `pnpm lint`, `pnpm messages:compile`, and `pnpm build` succeed with 0 errors.

### Phase 1 — i18n Engine & Pure Content Resolvers
* Build `src/i18n/locales.ts` (metadata mapping with `satisfies`).
* Build `src/i18n/paths.ts` (`localizeHref`, `localeHref`, `stripLocale`) supporting prefix-less default.
* Write comprehensive unit tests for `paths.ts` in `src/i18n/paths.test.ts`.
* Seed ICU messages (`messages/{en,de,fa}.json`) with nav, common, plural, and ordinal keys.
* Setup `src/content.config.ts` (`pages` and `blog` collections).
* Seed sample pages (`home`, `about`) and sample blog post across all 3 locales with translated slugs.
* Build `src/libs/content/service.ts` (resolves routes, alternates, and breadcrumbs).
* Write unit tests for content resolvers and ICU plurals/ordinals.
* Implement `scripts/audit-i18n.mjs` (`npm run audit:i18n`).
* **Exit Criteria (DoD):** `pnpm lint`, `pnpm test`, and `npm run audit:i18n` all pass green.

### Phase 2 — Universal Routing & Layouts
* Implement `src/pages/[...path].astro` powered by `getSiteRoutes()`.
* Build `BaseLayout.astro` rendering `<html lang dir>`, CSS font variables, ClientRouter, and SVG sprite injection.
* Build `Seo.astro` generating accurate canonical and hreflang tags (count = 4).
* Build `404.astro` (locale-aware via path prefix).
* Implement `src/pages/sitemap.xml.ts` and `src/pages/robots.txt.ts`.
* Build views: `PageView.astro`, `BlogIndexView.astro`, `BlogPostView.astro`.
* **Exit Criteria (DoD):** `pnpm build` generates all static HTML files for all 3 locales (prefix-less `en`, prefixed `fa` and `de`).

### Phase 3 — UI Shell, Search & RTL Polish
* Implement `LanguageSwitcher.astro` (uses alternates from route context; disables untranslated targets).
* Implement `TopLoadingBar.astro` (RTL-aware, 150ms debounce, respects motion preference).
* Implement Search UI Modal (accessible dialog, keyboard shortcuts, dev JSON fallback + Pagefind prod integration).
* Polish RTL styling in `src/styles/prose.css` (LTR isolation for code blocks).
* **Exit Criteria (DoD):** Interactive search works in dev; Pagefind indexes production `dist/`. Language switcher properly switches between translated slugs.

### Phase 4 — Developer CLI Suite Implementation
* Implement the 5 remaining automation scripts:
  * `scripts/block-adapt.mjs` (`npm run block:adapt`)
  * `scripts/i18n-extract.mjs` (`npm run i18n:extract`)
  * `scripts/i18n-add.mjs` (`npm run i18n:add`)
  * `scripts/new-page.mjs` (`npm run new:page`)
  * `scripts/new-post.mjs` (`npm run new:post`)
* Exercise each script once against test fixtures to confirm correct execution.
* Implement `scripts/smoke.mjs` verifying the compiled output in `dist/`.
* Write `docs/PLAYBOOKS.md`.
* Run `knip` to confirm zero dead exports or unused dependencies.
* **Exit Criteria (DoD):** `pnpm lint && pnpm test && npm run audit:i18n && pnpm build && pnpm smoke` all pass green on a clean clone.

---

## 12. FORBIDDEN PATTERNS (Zero Tolerance)

1. **Hardcoded Locales:** Writing `/en/` or `/fa/` anywhere in components or routing templates.
2. **Raw Utility Colors:** Writing `bg-blue-600` or `text-gray-900` instead of semantic tokens (`bg-surface`, `text-fg`).
3. **Inline SVG Paths:** Pasting `<path d="...">` into `.astro` files instead of `<Icon name="..." />`.
4. **Dynamic Paraglide Keys:** Writing `m[computedKey]()` or generic string wrappers `t('key')`.
5. **Astro Route Collisions:** Creating dynamic route files alongside `[...path].astro` at the same folder depth.
6. **Fragile Regex Replacements:** Editing `.astro` templates without parser/magic-string bounds.
7. **Client Runtime Locale Leak:** Client scripts importing Paraglide runtime instead of reading `document.documentElement.lang`.
8. **Module-Scope Translation Calls:** Calling `m.*()` outside of the component render cycle.
9. **Fake SEO / Fallback Data:** Inventing placeholder URLs or silently falling back to English copy when a translation is missing.
10. **Missing `@theme inline`:** Using Tailwind v4 `@theme` without the `inline` directive.

---

## 13. REPORTING PROTOCOL

* **Acknowledge and Save:** Save this prompt verbatim to `docs/PRD.md`.
* **At Phase Boundaries:** Report the exact terminal output of the Definition of Done commands.
* **Stop on Ambiguity:** If an unexpected edge case arises, pause and provide the technical options before proceeding.
* **Final Handover:** Deliver a green build with all 3 locales rendering properly, verifiable via `pnpm smoke`.
