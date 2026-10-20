import * as m from '@/paraglide/messages';
import type { Locale } from '@/i18n/locales';
import { stripLocale, withTrailingSlash } from '@/i18n/paths';
import { getBlogIndexHref, getPageUrl } from '@/libs/content/service';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  active: boolean;
}

const PAGE_ITEMS = [
  { key: 'home', group: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
  { key: 'about', group: 'about', label: (locale: Locale) => m.nav_about({}, { locale }) },
  {
    key: 'features',
    group: 'features',
    label: (locale: Locale) => m.nav_features({}, { locale }),
  },
  { key: 'pricing', group: 'pricing', label: (locale: Locale) => m.nav_pricing({}, { locale }) },
] as const;

const BLOG_ITEM = {
  key: 'blog',
  label: (locale: Locale) => m.nav_blog({}, { locale }),
} as const;

function isActive(href: string, currentUrl: string): boolean {
  const hrefPath = withTrailingSlash(stripLocale(href).pathname.split(/[?#]/)[0] || '/');
  const currentPath = withTrailingSlash(
    stripLocale(currentUrl).pathname.split(/[?#]/)[0] || '/'
  );

  if (hrefPath === currentPath) return true;
  return hrefPath !== '/' && currentPath.startsWith(hrefPath);
}

export async function getNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  const items: NavItem[] = [];

  for (const item of PAGE_ITEMS) {
    const href = await getPageUrl(item.group, locale);
    if (!href) continue;
    items.push({
      key: item.key,
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

  return items;
}
