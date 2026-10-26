---
name: "astro-i18n-starter"
description: "Workflows, architecture, multi-menu navigation, CLI automation commands, and RTL/LTR rules for developing, maintaining, and extending the Astro v7 i18n SSG starter template."
---

# Astro i18n Starter Skill Guide

This skill coordinates workflows for developing, maintaining, and extending this production-grade Astro v7 multilingual static site generator (SSG) template with native RTL/LTR support.

## Core Directives & Prime Invariants

1. **One Source of Truth (SSOT)**:
   - Locales & directions: `src/i18n/locales.ts` and `project.inlang/settings.json`.
   - Paths & URLs: `src/i18n/paths.ts` (`localizeHref`, `localeHref`, `stripLocale`).
   - Content schemas: `src/content.config.ts`.
   - Navigation slots: `src/libs/config/navigation.ts` (`getNavigationSlots`).
   - Application & brand config: `app.config.json` -> `src/libs/config/app.ts`.
   - Semantic tokens: `src/styles/global.css`.
   - UI copy: Compiled Paraglide messages (`import * as m from '@/paraglide/messages'`). Never hardcode UI text.
2. **Lean Router Dispatcher**:
   - Centralized exclusively in `src/pages/[...path].astro` -> `src/views/`. Never create dynamic route files (`[lang].astro`, `[slug].astro`) under `src/pages/`.
3. **Prefix-less Default Locale**:
   - Default locale (`en`) has NO prefix (`/`, `/about`, `/blog/first-post`). Non-default locales (`de`, `fr`, `fa`, `ar`) have prefixes (`/fa/درباره-ما`).
4. **RTL-Native Discipline**:
   - Always use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s-*`, `border-e-*`). Never use physical directions.
5. **Idempotent Client Scripts**:
   - Guard DOM listeners in Astro components with `if (el.dataset.bound === 'true') return; el.dataset.bound = 'true';`.
6. **Static Language Switching**:
   - Use `window.location.assign(target)` rather than client-side SPA view transitions so `<html lang dir>` and font stacks are fully applied.

---

## Domain Routing Table

To perform work in this repository, identify your specific task and read the indicated reference file:

| Task / Domain | Action / Reference File |
| :--- | :--- |
| **Content Pipeline & Routing**<br>Collections schemas, pure URL paths, lean router dispatcher, blog engine, pagination, Atom feeds, and sitemaps | ➡️ Read `references/content-and-routing.md` |
| **Multi-Menu Navigation**<br>Header dropdowns, mobile drawer tabs, 4-column footer, active states, slot resolvers | ➡️ Read `references/navigation.md` |
| **CLI Automation Suite**<br>Scaffolding pages/posts, deleting content, language lifecycle, batch translations, asset generation | ➡️ Read `references/cli-automation.md` |
| **RTL, Typography & Styling**<br>CSS logical properties, font stacks, LTR code block isolation, OKLCH tokens, SVG icon catalog | ➡️ Read `references/rtl-styling.md` |
| **Testing, Linting & QA**<br>Paraglide compile, Vitest unit tests, i18n parity audit, production build, smoke tests, Knip | ➡️ Read `references/verification.md` |

---

## Quick Command Reference

All scripts support both `npm run` and `pnpm run`:

```bash
npm run lint          # paraglide compile + astro check + tsc --noEmit
npm test              # Vitest test suite (12 suites, 137 unit tests)
npm run audit:i18n    # 5-stage i18n completeness and parity audit
npm run build         # Production SSG build + Pagefind indexing
npm run smoke         # Post-build HTML validation over dist/
npm run verify:cli    # 45 end-to-end CLI workflow assertions
```
