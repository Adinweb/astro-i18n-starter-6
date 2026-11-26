import * as m from '@/paraglide/messages';
import type { Locale } from '@/i18n/locales';
import { getPathname, localizeHref, stripLocale, withTrailingSlash } from '@/i18n/paths';
import { humanizeKey } from '@/libs/content/blog';
import { getHomeHref, getPageUrl } from '@/libs/content/service';
import {
  getContentTypeIndexHref,
  getContentTypeLabel,
  getNavigableContentTypes,
} from '@/libs/content/types';
import { siteConfig, type UiNavigationConfig } from '@/libs/config/app';
import { CLIENT_CONTENT_TYPES } from '@client/content';
import {
  CLIENT_PAGE_ITEMS,
  getClientFooterColumns,
  getClientLegalNavigation,
  getClientPrimaryExtras,
  type ClientPageNavItem,
} from '@client/navigation';

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

export interface NavContext {
  locale: Locale;
  currentUrl: string;
  isActive: (href: string | undefined, currentUrl: string) => boolean;
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
 * Pages shown in the default navigation lists, sourced from `client/navigation.ts`.
 */
export const PAGE_ITEMS: readonly ClientPageNavItem[] = CLIENT_PAGE_ITEMS;

export const BLOG_ITEM = {
  key: 'blog',
  icon: 'newspaper',
  label: (locale: Locale) => m.nav_blog({}, { locale }),
} as const;

type MessageCatalog = Record<
  string,
  ((params: Record<string, never>, opts: { locale: Locale }) => string) | undefined
>;

function lookupCatalog(key: string, locale: Locale): string | null {
  const catalog = m as unknown as MessageCatalog;
  const fn = catalog[key];
  return typeof fn === 'function' ? fn({}, { locale }) : null;
}

function mergePageNavItems(
  baseItems: readonly ClientPageNavItem[],
  configPages?: UiNavigationConfig['pages']
): ClientPageNavItem[] {
  const merged = [...baseItems];
  if (!configPages?.length) return merged;

  for (const entry of configPages) {
    const existingIdx = merged.findIndex((item) => item.group === entry.group);
    const existing = existingIdx >= 0 ? merged[existingIdx] : undefined;

    const resolveLabel = (locale: Locale): string => {
      const fromMap = entry.labels?.[locale]?.trim();
      if (fromMap) return fromMap;
      const explicit = entry.label?.trim();
      if (explicit) return explicit;
      if (existing) return existing.label(locale);
      return lookupCatalog(`nav_${entry.group}`, locale) ?? humanizeKey(entry.group);
    };

    const nextItem: ClientPageNavItem = {
      group: entry.group,
      icon: entry.icon ?? existing?.icon ?? 'file',
      label: resolveLabel,
    };

    if (existingIdx >= 0) {
      merged[existingIdx] = nextItem;
    } else {
      merged.push(nextItem);
    }
  }

  return merged;
}

/**
 * Icon of a content type's navigation row. Honors client overrides first.
 */
export function getContentTypeIcon(key: string): string {
  const clientIcon = CLIENT_CONTENT_TYPES[key]?.icon;
  if (clientIcon) return clientIcon;
  const icons: Record<string, string> = { blog: 'newspaper', projects: 'folder' };
  return icons[key] ?? 'layers';
}

function getContentTypeNavItems(locale: Locale, currentUrl = ''): NavItem[] {
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

export interface NavigationBuildOptions {
  pageItems?: readonly ClientPageNavItem[];
  uiNavigation?: UiNavigationConfig;
  primaryExtras?: (ctx: NavContext) => Promise<NavItem[]>;
  footerColumns?: (ctx: NavContext) => Promise<FooterColumn[]>;
  legalItems?: (ctx: NavContext) => Promise<NavItem[]>;
}

/**
 * Primary navigation shared by desktop header and mobile drawer.
 */
async function buildPrimaryNavigation(
  locale: Locale,
  currentUrl = '',
  options: NavigationBuildOptions = {}
): Promise<NavItem[]> {
  const effectiveUiNav = options.uiNavigation ?? siteConfig.ui.navigation;
  const pageItems = mergePageNavItems(options.pageItems ?? PAGE_ITEMS, effectiveUiNav?.pages);
  const extrasFn = options.primaryExtras ?? getClientPrimaryExtras;
  const items: NavItem[] = [];

  for (const item of pageItems) {
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

  const extras = await extrasFn({ locale, currentUrl, isActive });
  items.push(...extras);

  return items;
}

/**
 * Builds the desktop header navigation items.
 */
export async function getHeaderNavigation(
  locale: Locale,
  currentUrl = '',
  options: NavigationBuildOptions = {}
): Promise<NavItem[]> {
  return buildPrimaryNavigation(locale, currentUrl, options);
}

/**
 * Builds the mobile drawer navigation items (the same list as the header).
 */
export async function getDrawerNavigation(
  locale: Locale,
  currentUrl = '',
  options: NavigationBuildOptions = {}
): Promise<NavItem[]> {
  return buildPrimaryNavigation(locale, currentUrl, options);
}

/**
 * Builds the multi-column footer navigation hierarchy.
 */
export async function getFooterNavigation(
  locale: Locale,
  currentUrl = '',
  options: NavigationBuildOptions = {}
): Promise<FooterColumn[]> {
  const effectiveUiNav = options.uiNavigation ?? siteConfig.ui.navigation;
  const pageList = mergePageNavItems(options.pageItems ?? PAGE_ITEMS, effectiveUiNav?.pages);
  const extraFooterFn = options.footerColumns ?? getClientFooterColumns;
  const pageItems: NavItem[] = [];

  for (const item of pageList) {
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

  const extraColumns = await extraFooterFn({ locale, currentUrl, isActive });
  const columns: FooterColumn[] = [pagesColumn, resourcesColumn, companyColumn, ...extraColumns];

  if (effectiveUiNav?.footerColumns?.length) {
    for (const cfgCol of effectiveUiNav.footerColumns) {
      const existingIdx = columns.findIndex((col) => col.key === cfgCol.key);
      const existing = existingIdx >= 0 ? columns[existingIdx] : undefined;

      const resolvedTitle =
        cfgCol.titles?.[locale]?.trim() ||
        cfgCol.title?.trim() ||
        existing?.title ||
        lookupCatalog(`footer_col_${cfgCol.key}`, locale) ||
        humanizeKey(cfgCol.key);

      let resolvedItems: NavItem[] = existing?.items ?? [];
      if (cfgCol.items !== undefined) {
        resolvedItems = [];
        for (const cfgItem of cfgCol.items) {
          let href: string | null = null;
          if (cfgItem.group) {
            href =
              (await getPageUrl(cfgItem.group, locale)) ??
              (cfgItem.group === 'home' ? await getHomeHref(locale) : null);
            if (!href) continue;
          } else if (cfgItem.href) {
            href =
              cfgItem.external || /^https?:\/\//i.test(cfgItem.href)
                ? cfgItem.href
                : localizeHref(cfgItem.href, locale);
          }
          if (!href) continue;

          const label =
            cfgItem.labels?.[locale]?.trim() ||
            cfgItem.label?.trim() ||
            (cfgItem.group ? lookupCatalog(`nav_${cfgItem.group}`, locale) : null) ||
            humanizeKey(cfgItem.group ?? cfgItem.href ?? 'link');

          resolvedItems.push({
            key: cfgItem.group ?? cfgItem.href ?? label,
            label,
            href,
            external: Boolean(cfgItem.external),
            ...(cfgItem.icon ? { icon: cfgItem.icon } : {}),
            active: cfgItem.external ? false : isActive(href, currentUrl),
          });
        }
      }

      const nextCol: FooterColumn = {
        key: cfgCol.key,
        title: resolvedTitle,
        items: resolvedItems,
      };

      if (existingIdx >= 0) {
        columns[existingIdx] = nextCol;
      } else {
        columns.push(nextCol);
      }
    }
  }

  return columns.filter((column) => column.items.length > 0);
}

/**
 * Builds the secondary legal links shown at the very bottom of the footer.
 */
export async function getLegalNavigation(
  locale: Locale,
  currentUrl = '',
  options: NavigationBuildOptions = {}
): Promise<NavItem[]> {
  const legalFn = options.legalItems ?? getClientLegalNavigation;
  return legalFn({ locale, currentUrl, isActive });
}

/**
 * Master slot resolver returning distinct menus for Header, Drawer, and Footer.
 */
export async function getNavigationSlots(
  locale: Locale,
  currentUrl = '',
  options: NavigationBuildOptions = {}
): Promise<NavigationSlots> {
  const [primary, footer, legal] = await Promise.all([
    buildPrimaryNavigation(locale, currentUrl, options),
    getFooterNavigation(locale, currentUrl, options),
    getLegalNavigation(locale, currentUrl, options),
  ]);

  return { header: primary, drawer: primary, footer, legal };
}

/**
 * Backward-compatible single navigation fetcher used by existing scripts and tests.
 */
export async function getNavigation(locale: Locale, currentUrl = ''): Promise<NavItem[]> {
  return getDrawerNavigation(locale, currentUrl);
}
