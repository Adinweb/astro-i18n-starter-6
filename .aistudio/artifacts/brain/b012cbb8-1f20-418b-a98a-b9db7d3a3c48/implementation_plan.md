# Multi-Menu Navigation Architecture (Header, Mobile Drawer & Multi-Column Footer)

Introduce a flexible, type-safe multi-menu navigation system into the Astro v7 SSG starter, allowing distinct menus to be configured and assigned independently to the desktop header, mobile slide-over drawer, and multi-column footer while maintaining full multilingual parity and native RTL/LTR logical property discipline.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following architectural decisions:
> - **Configuration Strategy**: TypeScript registry with typed slots in `src/libs/config/navigation.ts` for maximum type safety, autocomplete, and seamless integration with Paraglide message calls.
> - **Navigation Slots**: Distinct menus for **Header main menu**, **Mobile drawer**, and **Multi-column footer** (categorized into semantic columns like Product, Resources, and Company/Legal).
> - **Backend / SSG Scope**: No backend server or directory restructuring needed; the application remains a pure static site generation (SSG) template.

- **Confirmed Decision 1**: TypeScript-driven menu slot registry in `src/libs/config/navigation.ts` exporting `getNavigationSlots(locale, currentUrl)`.
- **Confirmed Decision 2**: Preserving backward compatibility with the existing `getNavigation()` function so existing tests, imports, and CLI scripts continue to run seamlessly.
- **Confirmed Decision 3**: Transforming the footer from a single horizontal link row into an organized multi-column grid with semantic sections and bottom copyright/legal link bar.

---

## 1. Overview & Core Concept

- **What It Does**: Decouples navigation structure so that the top header, the mobile drawer, and the page footer no longer share the same flat link list. Administrators and developers can independently define which items appear in the desktop navbar (streamlined primary items + dropdowns), the mobile drawer (full interactive sitemap and quick links), and the footer (multi-column categorized link groups).
- **Target Audience / Persona**: Developers, agencies, and site maintainers building multilingual, RTL-compatible marketing sites, documentation hubs, or corporate portals with Astro SSG.
- **Key Value**: Clean separation of concerns between navigation presentation slots; rich multi-column footer capabilities; 100% typed with Paraglide message localization across all 5 supported locales (EN, DE, FR, FA, AR).

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - **Desktop Header Navigation**: Clean horizontal bar with primary links (Home, Features, Pricing, Blog) and rich multi-level dropdowns (Resources). Active page indicator matches current route using logical border accents.
  - **Mobile Drawer Navigation**: Responsive slide-over panel with two distinct tabs (Navigation and Search). Navigation displays primary hierarchy with inline collapsible sub-lists, language switcher, and quick actions.
  - **Multi-Column Footer**: Modern, accessible 4-column footer hierarchy:
    - *Column 1 (Brand & Mission)*: Site brand wordmark, localized description, and status/social indicators.
    - *Column 2 (Product / Navigation)*: Home, Features, Pricing, and Changelog / Releases.
    - *Column 3 (Resources / Knowledge)*: Blog, Documentation, RTL Guide, and System Architecture.
    - *Column 4 (Company & Legal)*: About Us, Privacy Policy, Terms, and Contact.
    - *Bottom Bar*: Copyright with localized Solar Hijri / Gregorian year formatting, localized "All rights reserved", and inline secondary legal links.
- **Visual Identity & Theme**:
  - *Design System*: Follows the repository's semantic tokens (`bg-surface`, `border-border`, `text-fg`, `text-muted`, `text-primary`).
  - *RTL Discipline*: Strict usage of CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`, `border-s-`). Zero physical `ml-`, `mr-`, `left-`, or `right-` classes.
  - *Anti-Slop Restraint*: No static pill envelopes around footer titles or menu items; clean typography with uppercase tracked category headers (`text-xs font-semibold uppercase tracking-wider text-muted`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Typed Slots Registry vs. JSON Configuration**
  - *Chosen Approach*: TypeScript registry in `src/libs/config/navigation.ts` defining `NavigationSlots` interface (`header`, `drawer`, `footerColumns`, `footerLegal`).
  - *Why*: Paraglide messages are type-safe compiler functions (`m.nav_about({}, { locale })`). A TypeScript registry enables direct autocomplete, prevents runtime key mismatches, and allows custom active-state logic per item.
  - *Alternatives Considered*: Storing menus in `app.config.json` was rejected because JSON cannot invoke Paraglide compiler functions dynamically per locale without string-based reflection.
- **Decision 2: Backward Compatibility Layer**
  - *Chosen Approach*: Keep `export async function getNavigation(...)` as an alias returning `slots.header` while introducing `getNavigationSlots(...)`.
  - *Why*: Ensures zero breakage for CLI scripts (`scripts/new-page.mjs`, `scripts/verify-cli.mjs`) and existing Vitest unit tests.
- **Decision 3: Multi-Column Footer Component Breakdown**
  - *Chosen Approach*: Refactor footer within `BaseLayout.astro` into a clean semantic grid using the footer slot data.
  - *Why*: Keeps the footer tightly integrated with `BaseLayout`'s existing theme, language switcher, and search drawer triggers while elevating the footer from a basic bar to an enterprise-grade multi-column layout.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      src/libs/config/navigation.ts                      │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────┐ │
│  │   HEADER_PAGE_ITEMS   │  │   DRAWER_PAGE_ITEMS   │  │ FOOTER_COLS │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────┬──────┘ │
│              │                          │                     │        │
│              ▼                          ▼                     ▼        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              getNavigationSlots(locale, currentUrl)              │  │
│  │  Returns: { header: NavItem[], drawer: NavItem[], footer: ... }   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       src/layouts/BaseLayout.astro                     │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ <header> Desktop Nav: Iterates headerItems                     │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ <aside> Mobile Drawer: Iterates drawerItems with inline subnav │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ <footer> Multi-Column: Iterates footerColumns + bottom bar     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Structures & Types

```typescript
export interface NavItem {
  key: string;
  label: string;
  href?: string;
  active: boolean;
  external?: boolean;
  children?: NavItem[];
}

export interface FooterColumn {
  key: string;
  title: string;
  items: NavItem[];
}

export interface NavigationSlots {
  header: NavItem[];
  drawer: NavItem[];
  footer: FooterColumn[];
  legal: NavItem[];
}
```

### Implementation Steps

1. **Dictionary Updates (`messages/{en,de,fr,fa,ar}.json`)**:
   - Add missing footer column header keys (`footer_col_product`, `footer_col_resources`, `footer_col_company`, `footer_legal_privacy`, `footer_legal_terms`).
   - Run `pnpm run messages:compile` to generate Paraglide typings.
2. **Navigation Service Expansion (`src/libs/config/navigation.ts`)**:
   - Define `FooterColumn` and `NavigationSlots` interfaces.
   - Define dedicated menu item arrays for Header, Drawer, and Footer columns.
   - Implement `getNavigationSlots(locale, currentUrl)` returning all slots with localized labels and active-state resolution.
   - Maintain `getNavigation(locale, currentUrl)` as a backward-compatible alias.
3. **Base Layout Update (`src/layouts/BaseLayout.astro`)**:
   - Call `getNavigationSlots(locale, url)`.
   - Update desktop navbar to consume `slots.header`.
   - Update mobile drawer to consume `slots.drawer`.
   - Replace single-row footer with responsive 4-column grid displaying `slots.footer` and bottom legal links.
4. **Verification & Audit**:
   - Run `pnpm run lint` (`messages:compile` + `astro check` + `tsc --noEmit`).
   - Run `pnpm test` (Vitest unit tests).
   - Run `pnpm run audit:i18n` to verify dictionary parity across all 5 locales.
   - Run `compile_applet` to ensure production SSG build succeeds.
