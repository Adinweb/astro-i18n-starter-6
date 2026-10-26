import * as m from '@/paraglide/messages';
import type { Locale } from '@/i18n/locales';
import { getPathname, stripLocale, withTrailingSlash } from '@/i18n/paths';
import { getBlogIndexHref, getPageUrl } from '@/libs/content/service';
import { siteConfig } from '@/libs/config/app';

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

/**
 * Declarative configuration item for extending or customizing navigation items.
 */
export interface NavItemConfig {
  key: string;
  label: (locale: Locale) => string;
  href?: string | ((locale: Locale) => Promise<string | null | undefined>);
  external?: boolean;
  children?: NavItemConfig[];
}

/**
 * Pages shown in the default navigation lists. A page's navigation key is
 * its content group, which is also the `nav_<key>` message key that
 * `new:page` registers.
 */
export const PAGE_ITEMS = [
  { group: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
  { group: 'about', label: (locale: Locale) => m.nav_about({}, { locale }) },
  { group: 'features', label: (locale: Locale) => m.nav_features({}, { locale }) },
  { group: 'pricing', label: (locale: Locale) => m.nav_pricing({}, { locale }) },
] as const;

export const BLOG_ITEM = {
  key: 'blog',
  label: (locale: Locale) => m.nav_blog({}, { locale }),
} as const;

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
 * Builds the desktop header navigation items.
 */
export async function getHeaderNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  const items: NavItem[] = [];

  const homeHref = await getPageUrl('home', locale);
  if (homeHref) {
    items.push({
      key: 'home',
      label: m.nav_home({}, { locale }),
      href: homeHref,
      active: isActive(homeHref, currentUrl),
    });
  }

  const featuresHref = await getPageUrl('features', locale);
  if (featuresHref) {
    items.push({
      key: 'features',
      label: m.nav_features({}, { locale }),
      href: featuresHref,
      active: isActive(featuresHref, currentUrl),
    });
  }

  const pricingHref = await getPageUrl('pricing', locale);
  if (pricingHref) {
    items.push({
      key: 'pricing',
      label: m.nav_pricing({}, { locale }),
      href: pricingHref,
      active: isActive(pricingHref, currentUrl),
    });
  }

  const blogHref = getBlogIndexHref(locale);
  items.push({
    key: BLOG_ITEM.key,
    label: BLOG_ITEM.label(locale),
    href: blogHref,
    active: isActive(blogHref, currentUrl),
  });

  const fallbackFeaturesHref = featuresHref ?? blogHref;
  const exploreChildren: NavItem[] = [
    {
      key: 'rtl_support',
      label: m.nav_rtl_support({}, { locale }),
      href: `${fallbackFeaturesHref}#rtl`,
      active: false,
    },
    {
      key: 'design_system',
      label: m.nav_design_system({}, { locale }),
      href: `${fallbackFeaturesHref}#design`,
      active: false,
    },
  ];

  const resourcesChildren: NavItem[] = [
    {
      key: 'overview',
      label: m.nav_overview({}, { locale }),
      href: fallbackFeaturesHref,
      active: isActive(fallbackFeaturesHref, currentUrl),
    },
    {
      key: 'explore',
      label: m.nav_explore({}, { locale }),
      active: exploreChildren.some((child) => child.active),
      children: exploreChildren,
    },
  ];

  items.push({
    key: 'resources',
    label: m.nav_resources({}, { locale }),
    active: resourcesChildren.some((child) => child.active),
    children: resourcesChildren,
  });

  return items;
}

/**
 * Builds the mobile drawer navigation items, including all primary pages
 * and deeper nested navigation links.
 */
export async function getDrawerNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  const items: NavItem[] = [];

  for (const item of PAGE_ITEMS) {
    const href = await getPageUrl(item.group, locale);
    if (!href) continue;
    items.push({
      key: item.group,
      label: item.label(locale),
      href,
      active: isActive(href, currentUrl),
    });
  }

  const blogHref = getBlogIndexHref(locale);
  items.push({
    key: BLOG_ITEM.key,
    label: BLOG_ITEM.label(locale),
    href: blogHref,
    active: isActive(blogHref, currentUrl),
  });

  const featuresHref = (await getPageUrl('features', locale)) ?? blogHref;
  const exploreChildren: NavItem[] = [
    {
      key: 'rtl_support',
      label: m.nav_rtl_support({}, { locale }),
      href: `${featuresHref}#rtl`,
      active: false,
    },
    {
      key: 'design_system',
      label: m.nav_design_system({}, { locale }),
      href: `${featuresHref}#design`,
      active: false,
    },
  ];

  const resourcesChildren: NavItem[] = [
    {
      key: 'overview',
      label: m.nav_overview({}, { locale }),
      href: featuresHref,
      active: isActive(featuresHref, currentUrl),
    },
    {
      key: 'explore',
      label: m.nav_explore({}, { locale }),
      active: exploreChildren.some((child) => child.active),
      children: exploreChildren,
    },
  ];

  items.push({
    key: 'resources',
    label: m.nav_resources({}, { locale }),
    active: resourcesChildren.some((child) => child.active),
    children: resourcesChildren,
  });

  return items;
}

/**
 * Builds the multi-column footer navigation hierarchy.
 */
export async function getFooterNavigation(locale: Locale, currentUrl = ''): Promise<FooterColumn[]> {
  const homeHref = (await getPageUrl('home', locale)) ?? '/';
  const aboutHref = await getPageUrl('about', locale);
  const featuresHref = await getPageUrl('features', locale);
  const pricingHref = await getPageUrl('pricing', locale);
  const blogHref = getBlogIndexHref(locale);

  const productColumn: FooterColumn = {
    key: 'product',
    title: m.footer_col_product({}, { locale }),
    items: [
      ...(homeHref ? [{ key: 'home', label: m.nav_home({}, { locale }), href: homeHref, active: isActive(homeHref, currentUrl) }] : []),
      ...(featuresHref ? [{ key: 'features', label: m.nav_features({}, { locale }), href: featuresHref, active: isActive(featuresHref, currentUrl) }] : []),
      ...(pricingHref ? [{ key: 'pricing', label: m.nav_pricing({}, { locale }), href: pricingHref, active: isActive(pricingHref, currentUrl) }] : []),
      ...(featuresHref ? [{ key: 'design_system', label: m.nav_design_system({}, { locale }), href: `${featuresHref}#design`, active: false }] : []),
    ],
  };

  const resourcesColumn: FooterColumn = {
    key: 'resources',
    title: m.footer_col_resources({}, { locale }),
    items: [
      { key: 'blog', label: m.nav_blog({}, { locale }), href: blogHref, active: isActive(blogHref, currentUrl) },
      ...(featuresHref ? [{ key: 'rtl_support', label: m.nav_rtl_support({}, { locale }), href: `${featuresHref}#rtl`, active: false }] : []),
      ...(featuresHref ? [{ key: 'overview', label: m.nav_overview({}, { locale }), href: featuresHref, active: isActive(featuresHref, currentUrl) }] : []),
      { key: 'documentation', label: m.nav_documentation({}, { locale }), href: 'https://astro.build', external: true, active: false },
    ],
  };

  const companyColumn: FooterColumn = {
    key: 'company',
    title: m.footer_col_company({}, { locale }),
    items: [
      ...(aboutHref ? [{ key: 'about', label: m.nav_about({}, { locale }), href: aboutHref, active: isActive(aboutHref, currentUrl) }] : []),
      ...(siteConfig.social.github ? [{ key: 'github', label: 'GitHub', href: siteConfig.social.github, external: true, active: false }] : []),
    ],
  };

  return [productColumn, resourcesColumn, companyColumn];
}

/**
 * Builds the secondary legal links shown at the very bottom of the footer.
 */
export async function getLegalNavigation(locale: Locale, _currentUrl = ''): Promise<NavItem[]> {
  const aboutHref = (await getPageUrl('about', locale)) ?? '';
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
  const [header, drawer, footer, legal] = await Promise.all([
    getHeaderNavigation(locale, currentUrl),
    getDrawerNavigation(locale, currentUrl),
    getFooterNavigation(locale, currentUrl),
    getLegalNavigation(locale, currentUrl),
  ]);

  return { header, drawer, footer, legal };
}

/**
 * Backward-compatible single navigation fetcher used by existing scripts and tests.
 */
export async function getNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  return getDrawerNavigation(locale, currentUrl);
}
