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

Always run scripts from the project root using `npm run <command>`.

### Scaffolding Content
* **Add a new static page:**
  ```bash
  npm run new:page <page-key> -- --title="<Title>" [--from=<locale>] [--publish]
  ```
* **Add a new blog post:**
  ```bash
  npm run new:post <post-slug> -- [--title="<Title>"] [--from=<locale>] [--publish]
  ```

### Removing Content
* **Delete a page and clean its navigation dictionary key:**
  ```bash
  npm run remove:page <page-key> -- --force
  ```
* **Delete an entire blog article across all languages:**
  ```bash
  npm run remove:post <post-slug> -- --force
  ```

### Language Operations
* **Add a new language:**
  ```bash
  npm run i18n:add-lang -- <locale> --name="<Display Name>" [--dir="ltr|rtl"] --with-content --from=en
  ```
* **Remove a language:**
  ```bash
  npm run i18n:remove-lang -- <locale> --with-content --force
  ```

### Translation & UI Automation
* **Adapt external Tailwind components to logical properties and semantic tokens:**
  ```bash
  npm run block:adapt -- --file=src/components/MyComponent.astro
  ```
* **Extract user-visible copy to Paraglide:**
  ```bash
  npm run i18n:extract -- --target=src/components/MyComponent.astro --key=mycomp --auto-add --replace
  ```
* **Add a translation key manually:**
  ```bash
  npm run i18n:add -- --category=<category> --key=<key> --en="..." --fa="..." --ar="..." --de="..." --fr="..."
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
  * Primary: `bg-primary`, `text-primary-fg`, `hover:border-primary/50`
* **Font Stacks**: Handled in `src/styles/global.css` via `:lang(fa)` and `:lang(ar)`.

---

## 4. Verification & QA Protocol

Run the full verification suite after making structural changes:

```bash
# 1. Typecheck
npm run lint

# 2. Unit tests (Vitest)
npm test

# 3. i18n Dictionary and Content Parity Audit
npm run audit:i18n

# 4. Production Static Build
npm run build

# 5. End-to-end Smoke Test on dist/
npm run smoke
```

All 5 commands must pass with 0 exit codes.
