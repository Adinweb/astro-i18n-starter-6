import * as m from '@/paraglide/messages';
import type { Locale } from '@/i18n/locales';
import { getPathname, stripLocale, withTrailingSlash } from '@/i18n/paths';
import { getBlogIndexHref, getHomeHref, getPageUrl } from '@/libs/content/service';
import {
  getContentType,
  getContentTypeIndexHref,
  getContentTypeLabel,
  getNavigableContentTypes,
} from '@/libs/content/types';
import { siteConfig } from '@/libs/config/app';

export interface NavItem {
  key: string;
  label: string;
  href?: string;
  active: boolean;
  external?: boolean;
  /**
   * Icon name of the row, from `src/libs/ui/icons.ts`. The mobile drawer renders
   * it; the desktop header stays text-only, so an item without an icon is normal
   * and falls back to `file`.
   */
  icon?: string;
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

/**
 * Declarative configuration item for extending or customizing navigation items.
 */
export interface NavItemConfig {
  key: string;
  label: (locale: Locale) => string;
  href?: string | ((locale: Locale) => Promise<string | null | undefined>);
  external?: boolean;
  icon?: string;
  children?: NavItemConfig[];
}

/**
 * Pages shown in the default navigation lists. A page's navigation key is
 * its content group, which is also the `nav_<key>` message key that
 * `new:page` registers.
 */
export const PAGE_ITEMS = [
  { group: 'home', icon: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
  { group: 'about', icon: 'info', label: (locale: Locale) => m.nav_about({}, { locale }) },
  { group: 'features', icon: 'sparkles', label: (locale: Locale) => m.nav_features({}, { locale }) },
  { group: 'pricing', icon: 'tag', label: (locale: Locale) => m.nav_pricing({}, { locale }) },
] as const;

export const BLOG_ITEM = {
  key: 'blog',
  icon: 'newspaper',
  label: (locale: Locale) => m.nav_blog({}, { locale }),
} as const;

/**
 * Icon of a content type's navigation row. A type without an entry (one added
 * through the registry) still gets a coherent row instead of a missing icon.
 */
export function getContentTypeIcon(key: string): string {
  const icons: Record<string, string> = { blog: 'newspaper', projects: 'folder' };
  return icons[key] ?? 'layers';
}

/**
 * One navigation item per enabled, navigable content type (blog, projects, …).
 *
 * The registry decides what appears: switching a type off in `content.types`
 * removes its link from the header, the drawer and the footer at once.
 */
export function getContentTypeNavItems(locale: Locale, currentUrl = ''): NavItem[] {
  return getNavigableContentTypes().map((type) => {
    const href = getContentTypeIndexHref(type.key, locale);
    return {
      key: type.key,
      label: getContentTypeLabel(type.key, locale),
      href,
      icon: getContentTypeIcon(type.key),
      active: isActive(href, currentUrl),
    };
  });
}

function extractPathname(urlOrPath: string): string {
  try {
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      return new URL(urlOrPath).pathname;
    }
  } catch {
    // ignore
  }
  return urlOrPath;
}

export function isActive(href: string | undefined, currentUrl: string): boolean {
  if (!href || !currentUrl) return false;
  if (href.startsWith('http://') || href.startsWith('https://')) return false;
  const currentPathname = extractPathname(currentUrl);
  const hrefPathname = extractPathname(href);

  const hrefPath = withTrailingSlash(getPathname(stripLocale(hrefPathname).pathname));
  const currentPath = withTrailingSlash(getPathname(stripLocale(currentPathname).pathname));

  if (hrefPath === currentPath) return true;
  return hrefPath !== '/' && currentPath.startsWith(hrefPath);
}

/**
 * Primary navigation. The desktop header and the mobile drawer share this
 * one builder so the two menus can never drift apart: both are driven by
 * `PAGE_ITEMS`, both skip unpublished pages and both list the navigable
 * content types.
 */
async function buildPrimaryNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  const items: NavItem[] = [];

  for (const item of PAGE_ITEMS) {
    const href = await getPageUrl(item.group, locale);
    if (!href) continue;
    items.push({
      key: item.group,
      label: item.label(locale),
      href,
      icon: item.icon,
      active: isActive(href, currentUrl),
    });
  }

  items.push(...getContentTypeNavItems(locale, currentUrl));

  const resources = await buildResourcesItem(locale, currentUrl);
  if (resources) items.push(resources);

  return items;
}

/**
 * The Resources dropdown.
 *
 * Its children are deep links into sections of the features page, so the
 * menu only exists while those anchors do: without a features page it
 * degrades to a single Overview link to the blog, and it disappears entirely
 * when there is nothing left to point at — never shipping a `#rtl` or
 * `#design` anchor that resolves to nothing.
 */
async function buildResourcesItem(locale: Locale, currentUrl = ''): Promise<NavItem | null> {
  const featuresHref = await getPageUrl('features', locale);
  const blogHref = getContentType('blog').enabled ? getBlogIndexHref(locale) : null;
  const overviewHref = featuresHref ?? blogHref;
  if (!overviewHref) return null;

  const exploreChildren: NavItem[] = featuresHref
    ? [
        {
          key: 'rtl_support',
          label: m.nav_rtl_support({}, { locale }),
          href: `${featuresHref}#rtl`,
          icon: 'globe',
          active: false,
        },
        {
          key: 'design_system',
          label: m.nav_design_system({}, { locale }),
          href: `${featuresHref}#design`,
          icon: 'palette',
          active: false,
        },
      ]
    : [];

  const resourcesChildren: NavItem[] = [
    {
      key: 'overview',
      label: m.nav_overview({}, { locale }),
      href: overviewHref,
      icon: 'book-open',
      // The top-level Features item owns the highlight while it exists.
      active: featuresHref ? false : isActive(overviewHref, currentUrl),
    },
    ...(exploreChildren.length > 0
      ? [
          {
            key: 'explore',
            label: m.nav_explore({}, { locale }),
            icon: 'compass',
            active: exploreChildren.some((child) => child.active),
            children: exploreChildren,
          },
        ]
      : []),
  ];

  return {
    key: 'resources',
    label: m.nav_resources({}, { locale }),
    icon: 'layers',
    active: resourcesChildren.some((child) => child.active),
    children: resourcesChildren,
  };
}

/**
 * Builds the desktop header navigation items.
 */
export async function getHeaderNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  return buildPrimaryNavigation(locale, currentUrl);
}

/**
 * Builds the mobile drawer navigation items (the same list as the header).
 */
export async function getDrawerNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  return buildPrimaryNavigation(locale, currentUrl);
}
/**
 * Builds the multi-column footer navigation hierarchy.
 *
 * The pages column is derived from `PAGE_ITEMS` — the same list the header and
 * the drawer read — instead of naming page groups here. A page that is added,
 * renamed or removed therefore changes the footer with it, and `remove:page`
 * can never delete a `nav_<key>` message that the footer still references.
 * Empty columns are dropped so a project without social links does not render
 * an empty heading.
 */
export async function getFooterNavigation(locale: Locale, currentUrl = ''): Promise<FooterColumn[]> {
  const pageItems: NavItem[] = [];

  for (const item of PAGE_ITEMS) {
    // The home page is the one link a footer always offers: every other page
    // needs a published entry of its own.
    const href =
      (await getPageUrl(item.group, locale)) ??
      (item.group === 'home' ? await getHomeHref(locale) : null);
    if (!href) continue;

    pageItems.push({
      key: item.group,
      label: item.label(locale),
      href,
      active: isActive(href, currentUrl),
    });
  }

  const pagesColumn: FooterColumn = {
    key: 'product',
    title: m.footer_col_pages({}, { locale }),
    items: pageItems,
  };

  const resourcesColumn: FooterColumn = {
    key: 'resources',
    title: m.footer_col_resources({}, { locale }),
    items: getContentTypeNavItems(locale, currentUrl),
  };

  const SOCIAL_CHANNELS = [
    ['github', 'GitHub'],
    ['twitter', 'X'],
    ['linkedin', 'LinkedIn'],
    ['instagram', 'Instagram'],
    ['telegram', 'Telegram'],
  ] as const;

  const socialItems: NavItem[] = SOCIAL_CHANNELS.flatMap(([key, label]) => {
    const href = siteConfig.social[key];
    return href ? [{ key, label, href, external: true, active: false }] : [];
  });

  const companyColumn: FooterColumn = {
    key: 'company',
    title: m.footer_col_company({}, { locale }),
    items: socialItems,
  };

  return [pagesColumn, resourcesColumn, companyColumn].filter((column) => column.items.length > 0);
}

/**
 * Builds the secondary legal links shown at the very bottom of the footer.
 */
export async function getLegalNavigation(locale: Locale, _currentUrl = ''): Promise<NavItem[]> {
  // Privacy and terms are sections of the about page. Without that page there
  // is nothing to link to, and `${aboutHref}#privacy` would silently point at
  // whatever page the visitor happens to be on.
  const aboutHref = await getPageUrl('about', locale);
  if (!aboutHref) return [];
  return [
    {
      key: 'privacy',
      label: m.footer_legal_privacy({}, { locale }),
      href: `${aboutHref}#privacy`,
      active: false,
    },
    {
      key: 'terms',
      label: m.footer_legal_terms({}, { locale }),
      href: `${aboutHref}#terms`,
      active: false,
    },
  ];
}

/**
 * Master slot resolver returning distinct menus for Header, Drawer, and Footer.
 */
export async function getNavigationSlots(locale: Locale, currentUrl = ''): Promise<NavigationSlots> {
  const [primary, footer, legal] = await Promise.all([
    buildPrimaryNavigation(locale, currentUrl),
    getFooterNavigation(locale, currentUrl),
    getLegalNavigation(locale, currentUrl),
  ]);

  // Header and drawer render the same entries, so one pass serves both.
  return { header: primary, drawer: primary, footer, legal };
}

/**
 * Backward-compatible single navigation fetcher used by existing scripts and tests.
 */
export async function getNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  return getDrawerNavigation(locale, currentUrl);
}
