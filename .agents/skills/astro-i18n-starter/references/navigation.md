# Navigation & Menu Architecture Reference

This reference documents the multi-menu navigation system, menu slot resolvers, responsive drawer behaviors, and active-state routing for the Astro v7 starter.

---

## 1. Architectural Model & Data Contracts

All navigation data structures and resolvers live in `src/libs/config/navigation.ts`.

### Core Interfaces

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

export interface NavItemConfig {
  key: string;
  label: (locale: Locale) => string;
  href?: string | ((locale: Locale) => Promise<string | null | undefined>);
  external?: boolean;
  children?: NavItemConfig[];
}
```

---

## 2. Menu Slot Resolvers

### 2.1 Master Resolver (`getNavigationSlots`)
`BaseLayout.astro` invokes `getNavigationSlots(locale, currentUrl)` at render time:
```typescript
const { header, drawer, footer, legal } = await getNavigationSlots(locale, url);
```
All four slots are resolved concurrently via `Promise.all` to maintain maximum build performance.

### 2.2 Desktop Header Navigation (`getHeaderNavigation`)
* **Purpose**: Primary desktop navbar in `BaseLayout.astro`.
* **Dropdowns (`NavItem.children`)**: Rendered using CSS peer/group states (`group-hover:block group-focus-within:block`).
* **Sub-dropdowns**: Multi-level submenus render with logical directional indicators (`Icon name="chevron-right"` with `class="rtl:rotate-180"`).
* **CTA Button**: Directly links to pricing (`/pricing` / `m.common_get_started`).

### 2.3 Mobile Slide-Over Drawer (`getDrawerNavigation`)
* **Two-Tab Interface**:
  1. **Navigation Tab (`drawer_tab_nav`)**:
     - Hierarchical menu items with inline nested sub-lists (`border-s-2 border-primary/30 ps-3`). Never uses popups in mobile drawers.
     - Dedicated **2-column language grid** (`data-drawer-language-section`) showing native language names and status checkmarks.
     - Dedicated **theme toggle** row.
     - Mobile CTA button.
  2. **Search Tab (`drawer_tab_search`)**:
     - Directly embeds `DrawerSearch.astro`.
     - Automatically focuses the input when the tab is switched.
     - Shares search logic with `executeSearch` in `src/libs/search/client.ts`.
* **Accessibility**: Panel uses `inert` when closed, supports `Escape` key, backdrop click, and `app:close-drawer` custom event.

### 2.4 Multi-Column Footer (`getFooterNavigation`)
Renders a semantic 4-column responsive grid:
* **Column 1 (Brand & Mission)**: Brand title and localized description (`m.site_description`).
* **Column 2 (Product)**: Home, Features, Pricing, and Design System anchor.
* **Column 3 (Resources)**: Blog index, RTL support anchor, Overview, and external documentation (`external: true` with `Icon name="external-link"`).
* **Column 4 (Company)**: About us and GitHub repository link.

### 2.5 Bottom Legal Bar (`getLegalNavigation`)
* Localized copyright year using Solar Hijri for Persian (`formatYear(currentYear, locale)`).
* Secondary legal links: Privacy Policy (`m.footer_legal_privacy`) and Terms of Service (`m.footer_legal_terms`).

---

## 3. Active-State & URL Matching (`isActive`)

The `isActive(href, currentUrl)` helper determines active links:
```typescript
export function isActive(href: string | undefined, currentUrl: string): boolean
```
* **Normalizes URLs**: Strips locale prefixes, domain origins, queries, and fragments.
* **Canonical Trailing Slash**: Compares normalized pathnames with canonical trailing slashes (`withTrailingSlash`).
* **Sub-path Matching**: Non-root routes match sub-paths (e.g. `/blog/` matches `/blog/my-post/`).
* **External Links**: Automatically excluded (`false`).

---

## 4. Extending Navigation Menus

To add a new page or custom link:
1. Ensure the page exists under `src/content/pages/<page-key>/`.
2. Add the item in `src/libs/config/navigation.ts` inside `getHeaderNavigation`, `getDrawerNavigation`, or `getFooterNavigation`.
3. Use compiled Paraglide message functions for labels (`m.nav_<key>({}, { locale })`).
4. Run `npm test` and `npm run lint` to verify active state and TypeScript types.
