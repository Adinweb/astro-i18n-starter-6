---
name: "astro-i18n-starter"
description: "Workflows, architecture, CLI automation commands, and RTL/LTR rules for developing, maintaining, and extending the Astro v7 i18n SSG starter template."
---

# Astro i18n Starter Skill Guide

This skill provides step-by-step procedures for AI agents to interact with this Astro v7 multilingual static site generator (SSG) template.

---

## 1. Core Architecture & Rules

### Symmetrical Content Layout
Every content entry lives in a group folder containing synchronized `<locale>.mdx` files:
```text
src/content/{collection}/{group}/{locale}.mdx
```
* **Identity**: The directory name `{group}` is the universal entity identity.
* **Slug**: Specified in frontmatter `slug: "..."` (localized per language).
* **Drafts**: Excluded from production routing when `draft: true`.

### Routing Dispatcher
Physical route handling is centralized in `src/pages/[...path].astro`.
* `getStaticPaths()` calls `getSiteRoutes()` in `src/libs/content/service.ts`.
* Dispatches to `PageView.astro`, `BlogPostView.astro`, or `BlogIndexView.astro`.
* **Rule**: Never create competing dynamic files (e.g. `src/pages/[locale].astro` or `src/pages/blog/[slug].astro`).

---

## 2. Operating the CLI Automation Suite

Always run scripts from the project root using `pnpm run <command>`.

### Scaffolding Content
* **Add a new static page:**
  ```bash
  pnpm run new:page <page-key> -- --title="<Title>" [--from=<locale>] [--publish] [--slug:<locale>="<native-slug>"]
  ```
* **Add a new blog post:**
  ```bash
  pnpm run new:post <post-slug> -- [--title="<Title>"] [--from=<locale>] [--publish] [--slug:<locale>="<native-slug>"]
  ```
  * Only the **source locale** is published by default; the other locales are written
    as `draft: true` until they are translated. `--publish` publishes all of them,
    `--draft` drafts all of them.
  * `--from` selects the source locale, it does not copy another article's body
    (use `--clone-from=<group>` for that).

### Removing Content
* **Delete a page and clean its navigation dictionary key:**
  ```bash
  pnpm run remove:page <page-key> -- --force
  ```
  * With `--locale=<locale>` only that locale's file is deleted; the navigation key
    stays in every dictionary (the dictionaries always carry the same key set) and the
    i18n audit reports the missing locale as a warning.
* **Delete an entire blog article across all languages:**
  ```bash
  pnpm run remove:post <post-slug> -- --force
  ```

### Language Operations
* **Add a new language:**
  ```bash
  pnpm run i18n:add-lang -- <locale> --name="<Display Name>" [--dir="ltr|rtl"] --with-content --from=en
  ```
* **Remove a language:**
  ```bash
  pnpm run i18n:remove-lang -- <locale> --with-content --force
  ```

### Translation & UI Automation
* **Adapt external Tailwind components to logical properties and semantic tokens:**
  ```bash
  pnpm run block:adapt -- --file=src/components/MyComponent.astro
  ```
* **Extract user-visible copy to Paraglide:**
  ```bash
  pnpm run i18n:extract -- --target=src/components/MyComponent.astro --key=mycomp --auto-add --replace
  ```
* **Add a translation key manually:**
  ```bash
  pnpm run i18n:add -- --category=<category> --key=<key> --en="..." --fa="..." --ar="..." --de="..." --fr="..."
  ```

---

## 3. RTL & Styling Guidelines

* **Logical Properties Mandatory**:
  * Margin/Padding: `ms-*` (start), `me-*` (end), `ps-*`, `pe-*`
  * Position: `start-*`, `end-*`
  * Alignment: `text-start`, `text-end`
  * Border/Radius: `border-s-*`, `border-e-*`, `rounded-s-*`, `rounded-e-*`
  * Mirroring: `<span class="inline-block rtl:rotate-180">→</span>`
* **Semantic Theme Tokens**:
  * Backgrounds: `bg-bg`, `bg-surface`, `bg-surface-hover`
  * Text: `text-fg`, `text-muted`
  * Borders: `border-border`
  * Brand roles: `primary`, `secondary`, `accent`, `neutral` — each with an `-fg` partner (`bg-primary text-primary-fg`)
  * Status roles: `info`, `success`, `warning`, `error` — each with an `-fg` partner (`bg-success text-success-fg`)
  * Never hardcode hex colours; all roles live in `src/styles/global.css`
* **Font Stacks**: Handled in `src/styles/global.css` via `:lang(fa)` and `:lang(ar)`.

---

## 4. Verification & QA Protocol

Run the full verification suite after making structural changes:

```bash
# 1. Typecheck
pnpm run lint

# 2. Unit tests (Vitest)
pnpm test

# 3. i18n Dictionary and Content Parity Audit
pnpm run audit:i18n

# 4. Production Static Build
pnpm run build

# 5. End-to-end Smoke Test on dist/
pnpm run smoke

# 6. Dead Code / Dependency Check
pnpm run knip

# 7. End-to-end check of every documented CLI workflow (45 claims, temp copy)
pnpm run verify:cli
```

All 7 commands must exit with code 0.
