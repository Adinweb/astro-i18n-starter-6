import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@/i18n/locales';
import { localizeHref, stripLocale, withTrailingSlash } from '@/i18n/paths';

interface RouteBase {
  locale: Locale;
  alternates: Partial<Record<Locale, string>>;
  url: string;
}

type SiteRouteProps =
  | (RouteBase & { routeType: 'page'; entry: CollectionEntry<'pages'> })
  | (RouteBase & { routeType: 'blog-entry'; entry: CollectionEntry<'blog'> })
  | (RouteBase & { routeType: 'blog-index'; entry?: undefined });

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

function parseEntryId(id: string): { group: string; locale: Locale } {
  const parts = id.split('/');
  if (parts.length < 2) {
    throw new Error(`[ContentService] Invalid content entry ID: "${id}". Expected format: "<group>/<locale>".`);
  }

  const locale = parts[parts.length - 1];
  if (!isLocale(locale)) {
    throw new Error(
      `[ContentService] Unknown locale "${locale}" in content entry "${id}". ` +
        `Add it to src/i18n/locales.ts and project.inlang/settings.json first.`
    );
  }

  return { group: parts.slice(0, -1).join('/'), locale };
}

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

export function getBlogPostHref(slug: string, locale: Locale): string {
  return localizeHref(`/${BLOG_BASE}/${slug}`, locale);
}

function resolvePageUrl(
  pages: EntryLike<'pages'>[],
  group: string,
  locale: Locale
): string | null {
  const page = pages.find((entry) => entry.id === `${group}/${locale}` && !entry.data.draft);
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

  const pagesByGroup = new Map<string, Map<Locale, EntryLike<'pages'>>>();
  for (const page of pages) {
    if (page.data.draft) continue;
    const { group, locale } = parseEntryId(page.id);
    if (!pagesByGroup.has(group)) pagesByGroup.set(group, new Map());
    const localeMap = pagesByGroup.get(group)!;
    if (localeMap.has(locale)) {
      throw new Error(`[ContentService] Duplicate page entry for "${group}/${locale}".`);
    }
    localeMap.set(locale, page);
  }

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

  const blogIndexAlternates: Partial<Record<Locale, string>> = {};
  for (const locale of LOCALES) {
    blogIndexAlternates[locale] = getBlogIndexHref(locale);
  }

  for (const locale of LOCALES) {
    const url = blogIndexAlternates[locale]!;
    registerRoute(url, {
      routeType: 'blog-index',
      locale,
      alternates: blogIndexAlternates,
      url,
    });
  }

  const postsByGroup = new Map<string, Map<Locale, EntryLike<'blog'>>>();
  for (const post of posts) {
    if (post.data.draft) continue;
    const { group, locale } = parseEntryId(post.id);
    if (!postsByGroup.has(group)) postsByGroup.set(group, new Map());
    const localeMap = postsByGroup.get(group)!;
    if (localeMap.has(locale)) {
      throw new Error(`[ContentService] Duplicate blog entry for "${group}/${locale}".`);
    }
    localeMap.set(locale, post);
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
  return withTrailingSlash(stripLocale(pathname).pathname.split(/[?#]/)[0] || '/');
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

  if (pathname === homeHref) return crumbs;

  if (firstSegment === BLOG_BASE) {
    crumbs.push({ label: labels.blog, href: blogHref });
    if (pathname !== blogHref && labels.current) {
      crumbs.push({ label: labels.current, href: url });
    }
  } else if (labels.current) {
    crumbs.push({ label: labels.current, href: url });
  }

  return crumbs;
}
