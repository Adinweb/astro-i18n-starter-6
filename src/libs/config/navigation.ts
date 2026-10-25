import * as m from '@/paraglide/messages';
import type { Locale } from '@/i18n/locales';
import { getPathname, stripLocale, withTrailingSlash } from '@/i18n/paths';
import { getBlogIndexHref, getPageUrl } from '@/libs/content/service';

export interface NavItem {
  key: string;
  label: string;
  href?: string;
  active: boolean;
  children?: NavItem[];
}

/**
 * Pages shown in the header, drawer, and footer. A page's navigation key is
 * its content group, which is also the `nav_<key>` message key that
 * `new:page` registers.
 */
const PAGE_ITEMS = [
  { group: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
  { group: 'about', label: (locale: Locale) => m.nav_about({}, { locale }) },
  { group: 'features', label: (locale: Locale) => m.nav_features({}, { locale }) },
  { group: 'pricing', label: (locale: Locale) => m.nav_pricing({}, { locale }) },
] as const;

const BLOG_ITEM = {
  key: 'blog',
  label: (locale: Locale) => m.nav_blog({}, { locale }),
} as const;

function isActive(href: string | undefined, currentUrl: string): boolean {
  if (!href || !currentUrl) return false;
  const hrefPath = withTrailingSlash(getPathname(stripLocale(href).pathname));
  const currentPath = withTrailingSlash(getPathname(stripLocale(currentUrl).pathname));

  if (hrefPath === currentPath) return true;
  return hrefPath !== '/' && currentPath.startsWith(hrefPath);
}

export async function getNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
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

  // Sample nested dropdown with multi-level sub-items
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
