import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/locales';
import { getPathname, localizeHref, stripLocale, withTrailingSlash } from '@/i18n/paths';
import { POSTS_PER_PAGE } from '@/libs/config/app';
import {
  groupPublishedEntries,
  isPublished,
} from '@/libs/content/entries';
import { getPageCount } from '@/libs/content/pagination';

interface RouteBase {
  locale: Locale;
  alternates: Partial<Record<Locale, string>>;
  url: string;
}

export type SiteRouteProps =
  | (RouteBase & { routeType: 'page'; entry: CollectionEntry<'pages'> })
  | (RouteBase & { routeType: 'blog-entry'; entry: CollectionEntry<'blog'> })
  | (RouteBase & {
      routeType: 'blog-index';
      entry?: undefined;
      /** 1-based number of the page this route serves. */
      page: number;
      /** How many pages the locale's blog index has. */
      totalPages: number;
      /** How many posts a page holds. */
      perPage: number;
    });

export interface SiteRoute {
  params: {
    path: string | undefined;
  };
  props: SiteRouteProps;
}

export interface BreadcrumbItem {
  label: string;
  href: string;
}

type EntryLike<T extends 'pages' | 'blog'> = {
  id: string;
  data: CollectionEntry<T>['data'];
};

const BLOG_BASE = 'blog';

function pathToParam(urlPath: string): string | undefined {
  const clean = urlPath.replace(/^\/+|\/+$/g, '');
  return clean === '' ? undefined : clean;
}

function pageSlug(group: string, entry: EntryLike<'pages'>): string {
  if (group === 'home') return '';
  const slug = entry.data.slug;
  if (!slug) {
    throw new Error(
      `[ContentService] Page "${entry.id}" is not the home page but has an empty slug.`
    );
  }
  return slug;
}

export function getBlogIndexHref(locale: Locale): string {
  return localizeHref(`/${BLOG_BASE}`, locale);
}

/**
 * Href of one page of the blog index.
 *
 * The first page is the index itself (`/blog/`), every later page lives under
 * `/blog/page/<n>/`. The path is localized like every other URL, so the
 * German third page is `/de/blog/page/3/`.
 */
export function getBlogPageHref(page: number, locale: Locale): string {
  if (page <= 1) return getBlogIndexHref(locale);
  return localizeHref(`/${BLOG_BASE}/page/${Math.trunc(page)}`, locale);
}

export function getBlogPostHref(slug: string, locale: Locale): string {
  return localizeHref(`/${BLOG_BASE}/${slug}`, locale);
}

/**
 * Public URL of one locale's Atom feed. The default locale lives at `/rss.xml`;
 * non-default locales live under `/rss/<locale>.xml` so readers only receive
 * articles in the language they subscribed to.
 */
export function getRssFeedHref(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/rss.xml' : `/rss/${locale}.xml`;
}

function resolvePageUrl(
  pages: EntryLike<'pages'>[],
  group: string,
  locale: Locale
): string | null {
  const page = pages.find(
    (entry) => entry.id === `${group}/${locale}` && isPublished(entry)
  );
  if (!page) return null;

  const slug = pageSlug(group, page);
  return localizeHref(slug ? `/${slug}` : '/', locale);
}

export function buildSiteRoutes(
  pages: EntryLike<'pages'>[],
  posts: EntryLike<'blog'>[]
): SiteRoute[] {
  const routes: SiteRoute[] = [];
  const registeredPaths = new Set<string>();

  const registerRoute = (url: string, props: SiteRouteProps) => {
    if (registeredPaths.has(url)) {
      throw new Error(`[ContentService] Duplicate route collision detected at URL: "${url}"`);
    }
    registeredPaths.add(url);

    routes.push({
      params: { path: pathToParam(url) },
      props,
    });
  };

  const pagesByGroup = groupPublishedEntries(pages, 'pages');

  const homePages = pagesByGroup.get('home');
  if (!homePages?.has(DEFAULT_LOCALE)) {
    throw new Error(
      `[ContentService] Missing "${DEFAULT_LOCALE}" home page. Create src/content/pages/home/${DEFAULT_LOCALE}.mdx.`
    );
  }

  for (const [group, localeMap] of pagesByGroup.entries()) {
    const alternates: Partial<Record<Locale, string>> = {};

    for (const locale of LOCALES) {
      const entry = localeMap.get(locale);
      if (!entry) continue;
      const slug = pageSlug(group, entry);
      alternates[locale] = localizeHref(slug ? `/${slug}` : '/', locale);
    }

    for (const locale of LOCALES) {
      const entry = localeMap.get(locale);
      if (!entry) continue;
      const url = alternates[locale];
      if (!url) continue;

      registerRoute(url, {
        routeType: 'page',
        locale,
        entry: entry as unknown as CollectionEntry<'pages'>,
        alternates,
        url,
      });
    }
  }

  // The blog index is paginated, so the post map has to exist before the
  // index routes are registered: the number of pages of a locale follows from
  // the number of published posts that locale has.
  const postsByGroup = groupPublishedEntries(posts, 'blog');

  const postsPerLocale = new Map<Locale, number>(LOCALES.map((locale) => [locale, 0]));
  for (const [, localeMap] of postsByGroup) {
    for (const [locale] of localeMap) {
      postsPerLocale.set(locale, (postsPerLocale.get(locale) ?? 0) + 1);
    }
  }

  const pagesPerLocale = new Map<Locale, number>();
  for (const locale of LOCALES) {
    pagesPerLocale.set(locale, getPageCount(postsPerLocale.get(locale) ?? 0, POSTS_PER_PAGE));
  }

  // One route per page of the index, per locale. The alternates point at the
  // same page in the other locales; a locale with fewer pages falls back to
  // its last page, so the language switcher never leads to a missing URL.
  for (const locale of LOCALES) {
    const totalPages = pagesPerLocale.get(locale)!;

    for (let page = 1; page <= totalPages; page += 1) {
      const url = getBlogPageHref(page, locale);
      const alternates: Partial<Record<Locale, string>> = {};

      for (const other of LOCALES) {
        const otherPages = pagesPerLocale.get(other)!;
        alternates[other] = getBlogPageHref(Math.min(page, otherPages), other);
      }

      registerRoute(url, {
        routeType: 'blog-index',
        locale,
        alternates,
        url,
        page,
        totalPages,
        perPage: POSTS_PER_PAGE,
      });
    }
  }

  for (const [, localeMap] of postsByGroup.entries()) {
    const alternates: Partial<Record<Locale, string>> = {};

    for (const locale of LOCALES) {
      const entry = localeMap.get(locale);
      if (!entry) continue;
      if (!entry.data.slug) {
        throw new Error(`[ContentService] Blog entry "${entry.id}" has an empty slug.`);
      }
      alternates[locale] = getBlogPostHref(entry.data.slug, locale);
    }

    for (const locale of LOCALES) {
      const entry = localeMap.get(locale);
      if (!entry) continue;
      const url = alternates[locale];
      if (!url) continue;

      registerRoute(url, {
        routeType: 'blog-entry',
        locale,
        entry: entry as unknown as CollectionEntry<'blog'>,
        alternates,
        url,
      });
    }
  }

  return routes;
}

export async function getSiteRoutes(): Promise<SiteRoute[]> {
  const [pages, posts] = await Promise.all([getCollection('pages'), getCollection('blog')]);
  return buildSiteRoutes(pages, posts);
}

export async function getPageUrl(group: string, locale: Locale): Promise<string | null> {
  const pages = await getCollection('pages');
  return resolvePageUrl(pages, group, locale);
}

export interface BreadcrumbLabels {
  home: string;
  blog: string;
  current?: string;
}

function pathOnly(pathname: string): string {
  return withTrailingSlash(getPathname(stripLocale(pathname).pathname));
}

export function getBreadcrumbs(
  url: string,
  locale: Locale,
  labels: BreadcrumbLabels
): BreadcrumbItem[] {
  const homeHref = localizeHref('/', locale);
  const blogHref = getBlogIndexHref(locale);
  const pathname = pathOnly(url);
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  const crumbs: BreadcrumbItem[] = [{ label: labels.home, href: homeHref }];

  if (pathname === '/') return crumbs;

  if (firstSegment === BLOG_BASE) {
    crumbs.push({ label: labels.blog, href: blogHref });
    if (pathname !== `/${BLOG_BASE}/` && labels.current) {
      crumbs.push({ label: labels.current, href: url });
    }
  } else if (labels.current) {
    crumbs.push({ label: labels.current, href: url });
  }

  return crumbs;
}

/**
 * Builds a Schema.org `BreadcrumbList` object from localized breadcrumb items.
 */
export function buildBreadcrumbSchema(
  breadcrumbs: readonly BreadcrumbItem[],
  toAbsoluteUrl: (pathname: string) => string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: toAbsoluteUrl(crumb.href),
    })),
  };
}
