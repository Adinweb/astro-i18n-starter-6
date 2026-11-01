import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/locales';
import { getPathname, localizeHref, stripLocale, withTrailingSlash } from '@/i18n/paths';
import { POSTS_PER_PAGE } from '@/libs/config/app';
import {
  groupPublishedEntries,
  isPublished,
} from '@/libs/content/entries';
import { getPageCount } from '@/libs/content/pagination';
import {
  getContentType,
  getContentTypeEntryHref,
  getContentTypeIndexHref,
  getEntryContentTypes,
  getIndexedContentTypes,
  type ContentTypeKey,
} from '@/libs/content/types';

interface RouteBase {
  locale: Locale;
  alternates: Partial<Record<Locale, string>>;
  switcherAlternates?: Partial<Record<Locale, string>>;
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
    })
  // Every enabled content type other than `pages` and `blog` shares one generic
  // route pair. The entry type is the union of the declared collections, so
  // adding a fourth collection means adding it here and in `loadExtraEntries`.
  | (RouteBase & {
      routeType: 'collection-index';
      contentType: ContentTypeKey;
      entry?: undefined;
      page: number;
      totalPages: number;
      perPage: number;
    })
  | (RouteBase & {
      routeType: 'collection-entry';
      contentType: ContentTypeKey;
      entry: CollectionEntry<'projects'>;
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

type EntryLike<T extends 'pages' | 'blog' | 'projects'> = {
  id: string;
  data: CollectionEntry<T>['data'];
};

/**
 * Route segment of the blog, read from the content-type registry so a project
 * that renames `content.types.blog.base` gets working links everywhere.
 */
const BLOG_BASE = getContentType('blog').base;

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
  return getContentTypeIndexHref('blog', locale);
}

/** Whether the blog type is switched on in `app.config.json`. */
export function isBlogEnabled(): boolean {
  return getContentType('blog').enabled;
}

/**
 * Generic paginated index URL builder for any content collection (`blog`, `docs`, etc.).
 *
 * Page 1 maps to `/<baseSegment>/` (localized) and deeper pages map to
 * `/<baseSegment>/page/<n>/` (localized).
 */
export function getCollectionPageHref(
  baseSegment: string,
  page: number,
  locale: Locale
): string {
  const normalizedBase = baseSegment.replace(/^\/+|\/+$/g, '');
  if (page <= 1) return localizeHref(`/${normalizedBase}`, locale);
  return localizeHref(`/${normalizedBase}/page/${Math.trunc(page)}`, locale);
}

/**
 * Href of one page of the blog index.
 *
 * The first page is the index itself (`/blog/`), every later page lives under
 * `/blog/page/<n>/`. The path is localized like every other URL, so the
 * German third page is `/de/blog/page/3/`.
 */
export function getBlogPageHref(page: number, locale: Locale): string {
  return getCollectionPageHref(BLOG_BASE, page, locale);
}

export function getBlogPostHref(slug: string, locale: Locale): string {
  return getContentTypeEntryHref('blog', slug, locale);
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
  posts: EntryLike<'blog'>[],
  extraCollections: Partial<Record<ContentTypeKey, EntryLike<'projects'>[]>> = {}
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
  // A disabled blog owns no routes at all — not even an empty index, so the
  // navigation, the sitemap and the build agree that the section is gone.
  const blogEnabled = isBlogEnabled();
  const postsByGroup = blogEnabled
    ? groupPublishedEntries(posts, 'blog')
    : new Map<string, Map<Locale, EntryLike<'blog'>>>();

  const postsPerLocale = new Map<Locale, number>(LOCALES.map((locale) => [locale, 0]));
  for (const [, localeMap] of postsByGroup) {
    for (const [locale] of localeMap) {
      postsPerLocale.set(locale, (postsPerLocale.get(locale) ?? 0) + 1);
    }
  }

  const pagesPerLocale = new Map<Locale, number>();
  for (const locale of LOCALES) {
    pagesPerLocale.set(
      locale,
      blogEnabled ? getPageCount(postsPerLocale.get(locale) ?? 0, POSTS_PER_PAGE) : 0
    );
  }

  // One route per page of the index, per locale.
  // - `alternates` (SEO hreflang & sitemap) includes ONLY locales that genuinely
  //   have `page`, preserving strict bidirectional hreflang reciprocity.
  // - `switcherAlternates` (UI language switcher) clamps to `Math.min(page, otherPages)`
  //   so switching languages on deep pages never leads to a 404.
  for (const locale of LOCALES) {
    const totalPages = pagesPerLocale.get(locale)!;

    for (let page = 1; page <= totalPages; page += 1) {
      const url = getBlogPageHref(page, locale);
      const alternates: Partial<Record<Locale, string>> = {};
      const switcherAlternates: Partial<Record<Locale, string>> = {};

      for (const other of LOCALES) {
        const otherPages = pagesPerLocale.get(other)!;
        if (otherPages >= page) {
          alternates[other] = getBlogPageHref(page, other);
        }
        switcherAlternates[other] = getBlogPageHref(Math.min(page, otherPages), other);
      }

      registerRoute(url, {
        routeType: 'blog-index',
        locale,
        alternates,
        switcherAlternates,
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
      if (entry.data.slug === 'page') {
        throw new Error(
          `[ContentService] Blog entry "${entry.id}" uses reserved pagination slug "page".`
        );
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

  // --- Content types declared in app.config.json beyond pages and blog ------
  for (const type of getEntryContentTypes()) {
    if (type.key === 'blog') continue;

    const entries = extraCollections[type.key] ?? [];
    const entriesByGroup = groupPublishedEntries(entries, type.key);

    for (const [, localeMap] of entriesByGroup) {
      const alternates: Partial<Record<Locale, string>> = {};

      for (const locale of LOCALES) {
        const entry = localeMap.get(locale);
        if (!entry) continue;
        if (!entry.data.slug) {
          throw new Error(`[ContentService] ${type.key} entry "${entry.id}" has an empty slug.`);
        }
        if (type.paginated && entry.data.slug === 'page') {
          throw new Error(
            `[ContentService] ${type.key} entry "${entry.id}" uses reserved pagination slug "page".`
          );
        }
        alternates[locale] = getContentTypeEntryHref(type.key, entry.data.slug, locale);
      }

      for (const locale of LOCALES) {
        const entry = localeMap.get(locale);
        const url = alternates[locale];
        if (!entry || !url) continue;

        registerRoute(url, {
          routeType: 'collection-entry',
          contentType: type.key,
          locale,
          entry: entry as unknown as CollectionEntry<'projects'>,
          alternates,
          url,
        });
      }
    }

    if (!type.index) continue;

    const entriesPerLocale = new Map<Locale, number>(LOCALES.map((locale) => [locale, 0]));
    for (const [, localeMap] of entriesByGroup) {
      for (const [locale] of localeMap) {
        entriesPerLocale.set(locale, (entriesPerLocale.get(locale) ?? 0) + 1);
      }
    }

    const perPage = type.paginated
      ? POSTS_PER_PAGE
      : Math.max(1, ...entriesPerLocale.values());

    for (const locale of LOCALES) {
      const pagesForLocale = (other: Locale) =>
        type.paginated
          ? getPageCount(entriesPerLocale.get(other) ?? 0, perPage)
          : getPageCount(1, 1);
      const totalPages = pagesForLocale(locale);

      for (let page = 1; page <= totalPages; page += 1) {
        const url = getCollectionPageHref(type.base, page, locale);
        const alternates: Partial<Record<Locale, string>> = {};
        const switcherAlternates: Partial<Record<Locale, string>> = {};

        for (const other of LOCALES) {
          const otherPages = pagesForLocale(other);
          if (otherPages >= page) {
            alternates[other] = getCollectionPageHref(type.base, page, other);
          }
          switcherAlternates[other] = getCollectionPageHref(
            type.base,
            Math.min(page, otherPages),
            other
          );
        }

        registerRoute(url, {
          routeType: 'collection-index',
          contentType: type.key,
          locale,
          alternates,
          switcherAlternates,
          url,
          page,
          totalPages,
          perPage,
        });
      }
    }
  }

  return routes;
}

/**
 * Loads the entries of every enabled collection other than `pages` and `blog`.
 *
 * `blog` keeps its own loader because its index, feed and search catalogs carry
 * blog-only fields.
 */
async function loadExtraEntries(): Promise<Partial<Record<ContentTypeKey, EntryLike<'projects'>[]>>> {
  const collections: Partial<Record<ContentTypeKey, EntryLike<'projects'>[]>> = {};

  for (const type of getEntryContentTypes()) {
    if (type.key === 'projects') {
      collections.projects = (await getCollection(
        'projects'
      )) as unknown as EntryLike<'projects'>[];
    }
  }

  return collections;
}

export async function getSiteRoutes(): Promise<SiteRoute[]> {
  const [pages, posts, extra] = await Promise.all([
    getCollection('pages'),
    isBlogEnabled() ? getCollection('blog') : Promise.resolve([]),
    loadExtraEntries(),
  ]);

  return buildSiteRoutes(
    pages as unknown as EntryLike<'pages'>[],
    posts as unknown as EntryLike<'blog'>[],
    extra
  );
}

export async function getPageUrl(group: string, locale: Locale): Promise<string | null> {
  const pages = await getCollection('pages');
  return resolvePageUrl(pages, group, locale);
}

export interface BreadcrumbLabels {
  home: string;
  blog: string;
  /**
   * Label and URL of the section a non-blog collection entry belongs to. Views
   * of registry-driven types pass the type's own index so the trail reads
   * `Home → Projects → Entry` without adding a case per collection.
   */
  section?: { label: string; href: string };
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
  const pathname = pathOnly(url);
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  const crumbs: BreadcrumbItem[] = [{ label: labels.home, href: homeHref }];

  if (pathname === '/') return crumbs;

  // Any enabled indexed type owns the first segment as its section, so a new
  // collection gets a correct trail without a case here.
  const section = getIndexedContentTypes().find(
    (type) => type.base !== '' && type.base === firstSegment
  );

  if (section) {
    const sectionHref = getContentTypeIndexHref(section.key, locale);
    const sectionLabel =
      section.key === 'blog'
        ? labels.blog
        : (labels.section?.label ?? section.base);

    crumbs.push({ label: sectionLabel, href: sectionHref });

    if (pathname !== `/${section.base}/` && labels.current) {
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
