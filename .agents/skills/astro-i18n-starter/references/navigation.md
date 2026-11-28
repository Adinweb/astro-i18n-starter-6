# Navigation & Menu Architecture Reference

This reference documents the multi-menu navigation system, menu slot resolvers, responsive drawer behaviors, and active-state routing for the Astro v7 starter.

---

## 1. Architectural Model & Data Contracts

All navigation data structures and resolvers live in `src/libs/config/navigation.ts`, reading client-owned items from `client/navigation.ts` (`CLIENT_PAGE_ITEMS`, `getClientPrimaryExtras`, `getClientFooterColumns`, `getClientLegalNavigation`).

### Core Interfaces

```typescript
export interface NavItem {
  key: string;
  label: string;
  href?: string;
  active: boolean;
  external?: boolean;
  /** Semantic icon name from `src/libs/ui/icons.ts`; the drawer renders it. */
  icon?: string;
  /** Controls how nested child items under this item are rendered (`dropdown` vs `list`). */
  displayMode?: NavDisplayMode;
  children?: NavItem[];
}

export interface FooterColumn {
  key: string;
  title: string;
  displayMode?: NavDisplayMode;
  items: NavItem[];
}

export interface ResolvedMenu {
  id: string;
  title: string;
  displayMode: NavDisplayMode;
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
  icon?: string;
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
`url` is also the page's canonical URL, so a view whose canonical is not the page it renders under passes `activeUrl` to `BaseLayout` instead: the 404 document keeps its home canonical for SEO but opts out of active highlighting with `activeUrl={null}`.
All four slots are resolved concurrently via `Promise.all` to maintain maximum build performance. The header and the drawer come from a single `buildPrimaryNavigation` pass (`CLIENT_PAGE_ITEMS` → page links → content-type links → extras/Resources dropdown), so the two menus cannot drift apart and the page lookups run once.

### 2.2 Desktop Header Navigation (`getHeaderNavigation`)
* **Brand Identity (`brand.logo`)**: Header, mobile drawer, and footer render an optional Light/Dark image or SVG logo from `app.config.json` / `client/config.json` → `brand.logo` (`light`, `dark`, `alt`, `width`, `height`, `showText`), falling back cleanly to `{siteName}` text.
* **Purpose**: Primary desktop navbar in `BaseLayout.astro`.
* **Dropdowns (`NavItem.children`)**: Rendered using CSS peer/group states (`group-hover:block group-focus-within:block`).
* **Sub-dropdowns**: Multi-level submenus render with logical directional indicators (`Icon name="chevron-right"` with `class="rtl:rotate-180"`).
* **CTA Button**: `m.common_get_started`, pointing at the page group named by `ui.ctaPage` in merged `app.config.json` / `client/config.json` (`'pricing'` by default). `getPageUrl` returns `null` for an unpublished page, so the CTA hides itself instead of linking to a 404.

### 2.3 Mobile Slide-Over Drawer (`getDrawerNavigation`)
* **Same list as the header**: `getDrawerNavigation` returns the shared primary navigation.
* **Two-Tab Interface**:
  1. **Navigation Tab (`drawer_tab_nav`)**:
     - Every row is `DrawerNavLink.astro`: `NavItem.icon` (`file` as fallback) plus the label. Top-level rows are 36px tiles in 52px rows and are the only place with a tile box; submenu rows keep the same rhythm with a bare glyph, filled with the accent colour for the current page and turning accent on hover.
     - One continuous tree, never a separate card: a branch renders as a normal row (icon + `font-semibold` label, not a control), and its children hang below it on a guide rule that starts under the parent tile's centre (`ms-6.5 border-s ps-2`, then `ms-6` for the next level). Never uses popups in mobile drawers.
     - Dedicated **2-column language grid** (`data-drawer-language-section`) showing native language names and status checkmarks — hidden automatically alongside `<LanguageSwitcher>` whenever `ui.showLanguageSwitcher: false` (ideal for single-language sites).
     - Dedicated **theme toggle** row.
     - Mobile CTA button.
  2. **Search Tab (`drawer_tab_search`)**:
     - Directly embeds `DrawerSearch.astro`.
     - Automatically focuses the input when the tab is switched.
     - Shares search logic with `executeSearch` in `src/libs/search/client.ts`.
* **Accessibility**: Panel uses `inert` when closed, supports `Escape` key, backdrop click, and `app:close-drawer` custom event.

### 2.4 Multi-Column Footer (`getFooterNavigation`)
Renders a semantic responsive grid: a brand & mission block (title + `m.site_description`) followed by up to three `FooterColumn` data sets:
* **Pages** (`footer_col_pages`): derived from `CLIENT_PAGE_ITEMS` (`client/navigation.ts`) — the same list the header and the drawer read — so adding, renaming or removing a page changes the footer with it. The home page is the one link that always stays, as a localized fallback.
* **Resources**: one link per navigable content type (`getContentTypeNavItems`, so Blog and Projects follow the registry — `nav: false` drops the link). Nothing here points at a template's external homepage.
* **Company**: all configured social links from merged `app.config.json` / `client/config.json` (`social.github`, `twitter`, `linkedin`, `instagram`, `telegram`), each rendered only when populated (if none are configured, the column is omitted).

Every entry is skipped when its page is missing or unpublished in the locale, and empty columns are dropped, so the footer of a fresh client project never ships an empty or dead column entry. Page groups are named **only** in `CLIENT_PAGE_ITEMS`: `remove:page` can therefore never delete a `nav_<key>` message the footer still calls.

### 2.5 Bottom Legal Bar (`getLegalNavigation`)
* Localized copyright year using Solar Hijri for Persian (`formatYear(currentYear, locale)`).
* Secondary legal links: Privacy Policy (`m.footer_legal_privacy`) and Terms of Service (`m.footer_legal_terms`), both fragments of the about page. Without a published about page the bar renders no legal links rather than a bare `#privacy`.

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

## 4. Content-Type Menu Items (`getContentTypeNavItems`)

Every enabled, indexed content type is one navigation item, produced once and spread into all three slots:

```typescript
export function getContentTypeNavItems(locale: Locale, currentUrl = ''): NavItem[] {
  return getNavigableContentTypes().map((type) => ({
    key: type.key,
    label: getContentTypeLabel(type.key, locale),
    href: getContentTypeIndexHref(type.key, locale),
    active: isActive(href, currentUrl),
  }));
}
```

* Order follows `CONTENT_TYPE_KEYS` (`blog`, then `projects`), so the header, drawer and footer always agree.
* `content.types.<type>.nav: false` keeps the routes but drops the link; `enabled: false` drops routes **and** link.
* Never hardcode `/blog/` or `/projects/` in a menu: the segment comes from the registry.
* The home page's secondary CTA renders only when `getContentType('blog').enabled`, so disabling the blog cannot leave a dead button behind.
* The Resources menu never invents an anchor target: without a features page it collapses to a single Overview link (features, else blog), and it disappears when neither exists. A CTA or menu item that has no published target is hidden rather than pointed at `/`.

---

## 5. Extending Navigation Menus (`ui.navigation` & `client/navigation.ts`)

You can declare navigation items either via config (`client/config.json` → `ui.navigation`) or programmatically in `client/navigation.ts`:
1. Ensure the page exists under `src/content/pages/<page-key>/` (`npm run new:page <page-key>` or `npm run site:apply`).
2. **Simple page & footer overrides (`pages`, `footerColumns`)**: Add entries to `ui.navigation.pages` in `client/config.json` (which **merge cleanly** over `CLIENT_PAGE_ITEMS` by `group`) or edit `CLIENT_PAGE_ITEMS` in `client/navigation.ts`:
   ```ts
   { group: 'contact', icon: 'mail', label: (locale: Locale) => m.nav_contact({}, { locale }) },
   ```
   `icon` names an entry of `src/libs/ui/icons.ts` or `client/icons.ts`; the mobile drawer shows it in the row's tile, and a missing entry simply falls back to `file`.
3. **Reusable tree menus & slots (`menus`, `slots`, `<NavMenu />`)**: Define named multi-level menus in `ui.navigation.menus` (`id`, `title`/`titles`, `displayMode: 'dropdown' | 'list'`, recursive `items[]` with `group`/`contentType`/`href`/`childrenDisplay`) and bind them via `ui.navigation.slots` (`header`, `headerDisplayMode`, `drawer`, `drawerDisplayMode`, `footer`, `footerMode: 'append' | 'replace'`, `footerDisplayMode`, `legal`), or embed any named menu directly in Astro/MDX via `<NavMenu menuId="..." displayMode="..." orientation="horizontal|vertical" />` (`src/components/NavMenu.astro` using `getMenuById()`).
4. For programmatic extras, custom footer columns, or legal links, edit `getClientPrimaryExtras`, `getClientFooterColumns`, and `getClientLegalNavigation` in `client/navigation.ts`.
5. Use compiled Paraglide message functions (`m.nav_<key>({}, { locale })`) or inline `labels` maps.
6. Run `npm run check:quick` to verify active state and TypeScript types.

---

## 6. Site-Wide Top Banner (`ui.topBanner`) & Adaptive Sticky Navbar (`ui.navbar`)

### 6.1 Site-Wide Top Banner (`src/components/SiteTopBanner.astro`)
* Rendered inside `[data-site-top-banner-region]` at the top of `<body>` in `BaseLayout.astro` (above the navbar, in normal document flow so page content is pushed down cleanly with zero CLS, hidden automatically on print).
* Custom client strips may also be injected immediately below it via `<LayoutHooks slot="top-banner" locale={locale} url={url} />` (`client/LayoutHooks.astro`).
* Configured via `ui.topBanner` in `app.config.json` / `client/config.json`:
  - **Shipped default**: `app.config.json` ships `ui.topBanner.enabled: true` with two stacked `items[]`: a persistent non-dismissible `40px` `site-notice` bar (`variant: 'hero'`, `heightPx: 40`, `dismissible: false`) above a slimmer `32px` dismissible `site-announcement` bar (`variant: 'primary'`, `heightPx: 32`, `dismissible: true`), while the Zod/client schema fallback default (`TOP_BANNER_CONFIG_DEFAULTS.enabled`) is `false` when `ui.topBanner` is omitted. Set `"ui": { "topBanner": { "enabled": false } }` in `client/config.json` to hide them cleanly.
  - **Variants & Height**: `'primary' | 'hero' | 'surface' | 'accent' | 'info' | 'warning'`, plus optional `heightPx` (`24`–`160`, mapped via `--site-banner-height` on `.site-top-banner`).
  - **Localization & Scheduling**: Single-banner mode supports `badge`, `message`, `ctaLabel`, `ctaHref` plus `*ByLocale` maps (`messageByLocale`, `badgeByLocale`, `ctaLabelByLocale`, `ctaHrefByLocale`), optional date windows (`startsAt`, `endsAt`), and persistent dismissal (`dismissMode: 'session' | 'persistent'`, `dismissTtlDays`, `dismissVersion`); multi-banner mode uses `items[]`.
  - **Dismiss persistence & View Transitions**: Dismissible banners store dismissal state in `sessionStorage` or `localStorage` (`top-banner-dismissed:<id>`), are suppressed synchronously right below `[data-site-top-banner-region]` and on `astro:before-swap` before painting, and dispatch `app:top-banner-change` so the navbar recalculates immediately.

### 6.2 Adaptive Sticky Navbar (`ui.navbar` & `src/scripts/navbar.ts`)
* Configured via `ui.stickyHeader` (`true` by default) and `ui.navbar` in `app.config.json` / `client/config.json` (exposed to browser scripts via `CLIENT_NAVBAR_CONFIG` in `src/libs/config/client.ts`):
  - `initialTopOffset` (default `16`): gap in `px` below the banner region (or viewport top if no banner) before sticky transition.
  - `stickyScrollThreshold` (default `0`): scroll distance in `px` before transitioning `.site-header` from `position: absolute` to `position: fixed`.
  - `stickyTopOffset` (default `12`): gap in `px` from the viewport top while stuck.
  - `autoBannerOffset` (default `true`): `ResizeObserver` continuously measures `[data-site-top-banner-region]` (including dismiss/wrap/resize) so `effectiveThreshold = Math.max(stickyScrollThreshold, bannerClearScroll)` never overlaps the banner even if `stickyScrollThreshold < bannerHeight`.
  - `manualBannerOffset` (default `0`): manual clearance in `px` used only when `autoBannerOffset: false` (CSS uses `max(0px, var(--navbar-manual-banner-offset) - var(--actual-banner-height))` in `.main-header-clearance` to prevent double padding).
* Synchronizes `--navbar-initial-top`, `--navbar-sticky-top`, `--navbar-manual-banner-offset`, `--actual-banner-height`, `--top-banner-height`, and `--navbar-height` on `document.documentElement`, feeding `.site-header`, `.main-header-clearance`, `scroll-padding-top`, and Lenis dynamic `#hash` anchor offsets (`getHeaderOffset()`).

### 6.3 Floating Quick-Contact Widget (`src/components/QuickContactWidget.astro`)
* Configured via `ui.quickContact` (`enabled`, `mobileOnly`, `channels: ['phone', 'whatsapp', 'telegram']`) and reads direct links from `BUSINESS_CONFIG`.
* Renders a collapsible corner action button (`bottom-4 end-4`) hidden cleanly whenever an undecided `CookieConsent` banner, open mobile drawer (`.is-open`), or `<dialog open>` is present.

