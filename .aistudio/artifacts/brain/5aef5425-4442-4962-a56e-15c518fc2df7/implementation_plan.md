# Astro v7 Starter Architecture Enhancements & Skills Modernization

Comprehensive architectural improvements for the Astro v7 SSG Multilingual Starter template to enhance its developer experience (DX), configuration extensibility, and agent skills documentation without altering its proven visual design system.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following foundational direction:
> - **Starter Template Focus**: This repository is a developer starter template rather than a bespoke end-user website; all improvements must prioritize architecture, developer ergonomics, maintainability, and clean abstractions over cosmetic changes.
> - **Zero UI Redesign**: No new visual components or redesigns of the existing design system are needed ("no need" for new UI elements).
> - **Skills Modernization**: Update `.agents/skills/astro-i18n-starter/SKILL.md` to accurately document the current multi-menu navigation architecture, CLI automation, and development workflows for AI coding agents.

- **Confirmed Decision 1**: Focus strictly on codebase architecture, configuration extensibility, type safety, and agent operational skills.
- **Confirmed Decision 2**: Preserve the existing visual styling, OKLCH semantic palette, glass surfaces, and responsive layouts exactly as designed.
- **Confirmed Decision 3**: Upgrade `.agents/skills/astro-i18n-starter/SKILL.md` to serve as a comprehensive, accurate manual for AI agents working in this repository.

---

## 1. Overview & Core Concept

- **What It Does**: Refines the starter template's architectural foundations by:
  1. Making the navigation configuration declarative and modular so developers can customize header, mobile drawer, and multi-column footer menus from a typed, centralized registry.
  2. Enhancing content schema types with optional author and metadata extensions in `src/content.config.ts`.
  3. Streamlining package scripts and build hooks so both `npm` and `pnpm` run cleanly across varied developer environments.
  4. Fully synchronizing `.agents/skills/astro-i18n-starter/SKILL.md` with the latest multi-menu architecture, CLI suite, and audit procedures.
- **Target Audience / Persona**: Developers, agencies, and open-source contributors using this repository as the foundation for multilingual, RTL-native SSG websites.
- **Key Value**: A rock-solid, production-ready starting point that is effortless for developers to customize, strictly typed, and clearly documented for both human engineers and AI coding agents.

---

## 2. User Experience & Visual Design

- **Visual Design Continuity**: As confirmed, no visual redesign or UI restyling will be performed. The existing visual language (glass surfaces, semantic OKLCH tokens, logical property RTL discipline) remains unchanged.
- **Developer Experience (DX)**:
  - Clear, autocomplete-friendly configuration interfaces for declaring header dropdowns, drawer sections, and footer link columns.
  - Fail-loud type checks and zero-ambiguity error messages if an administrator references an unmapped navigation route or missing locale file.
  - Complete, up-to-date agent operational skills enabling AI assistants to scaffold, update, and audit content without manual trial and error.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Declarative Menu Configuration Schema vs. Hardcoded Builders**
  - *Chosen Approach*: Refactor `src/libs/config/navigation.ts` to use a declarative schema-driven definition (`NavigationMenuConfig`) that maps menu items, dropdowns, and footer columns cleanly while keeping Paraglide localization functions typed.
  - *Why*: Allows template consumers to add, remove, or reorder menu items in a single typed object without having to manipulate procedural array push/spread operations inside layout or helper files.
  - *Alternatives Considered*: Storing menus in `app.config.json` was rejected because JSON cannot execute compile-time Paraglide message functions (`m.nav_home({}, { locale })`).
- **Decision 2: Updating Agent Skills (`SKILL.md`) as First-Class Code**
  - *Chosen Approach*: Update `.agents/skills/astro-i18n-starter/SKILL.md` with full playbooks for multi-menu navigation, custom brand assets, CLI workflows, and testing.
  - *Why*: In an AI-assisted development workflow, outdated skill manuals lead to regression bugs when subsequent agents generate code based on deprecated patterns.
- **Decision 3: Retaining 100% Backward Compatibility**
  - *Chosen Approach*: Keep all existing function signatures (`getNavigationSlots`, `getNavigation`, `getPageUrl`, etc.) intact.
  - *Why*: Prevents breaking any of the 45 CLI tests in `scripts/verify-cli.mjs` or existing unit test suites.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Starter Template Core                         │
│                                                                        │
│   ┌─────────────────────┐    ┌──────────────────────────────────────┐  │
│   │   app.config.json   │───▶│       src/libs/config/app.ts         │  │
│   └─────────────────────┘    │   (Zod Validation, Site/Brand SSOT)  │  │
│                              └──────────────────────────────────────┘  │
│                                                  │                     │
│                                                  ▼                     │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                 src/libs/config/navigation.ts                   │  │
│   │   Declarative Slot Definitions:                                 │  │
│   │   - Header Menu (Primary + Nested Dropdowns + CTA)              │  │
│   │   - Drawer Menu (Hierarchical Pages + Languages + Search)       │  │
│   │   - Footer Columns (Semantic Columns: Product, Resources, ...)  │  │
│   │   - Legal Bar (Privacy, Terms, Solar Hijri / Gregorian Year)    │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                  │                     │
│                        ┌─────────────────────────┴────────────┐        │
│                        ▼                                      ▼        │
│   ┌──────────────────────────────┐       ┌─────────────────────────┐   │
│   │ src/layouts/BaseLayout.astro │       │ .agents/skills/         │   │
│   │ (Consumes Slots, Injects Head│       │ astro-i18n-starter/     │   │
│   │  Header, Drawer & Footer)    │       │ SKILL.md (Agent Manual) │   │
│   └──────────────────────────────┘       └─────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Proposed Execution Phases

1. **Phase 1: Navigation Architecture Modularity**
   - Cleanly modularize menu item definitions in `src/libs/config/navigation.ts` so developers can easily register custom navigation trees, external links, and badges.
   - Maintain 100% test passing across `navigation.test.ts`.

2. **Phase 2: Agent Skill Guide Modernization (`SKILL.md`)**
   - Update `.agents/skills/astro-i18n-starter/SKILL.md` to document:
     - The multi-menu navigation architecture (`getNavigationSlots`, header dropdowns, mobile drawer tabs, 4-column footer).
     - Up-to-date CLI commands and options.
     - Dual-package manager compatibility (`npm` / `pnpm`).
     - Best practices for adding content groups and translation keys.

3. **Phase 3: Verification & Auditing**
   - Run `lint_applet` (`astro check` + `tsc --noEmit`).
   - Run `npm test` (all 12 test suites, 137 tests).
   - Run `audit:i18n` (parity across all 5 locales).
   - Run `compile_applet` (production build verification).
