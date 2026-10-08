import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/locales';

export type RouteType = 'page' | 'blog-entry' | 'blog-index';

export interface SiteRouteProps {
  routeType: RouteType;
  locale: Locale;
  entry?: CollectionEntry<'pages'> | CollectionEntry<'blog'>;
  alternates: Record<Locale, string>;
  url: string;
}

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

function parseEntryId(id: string): { group: string; locale: Locale } {
  const parts = id.split('/');
  if (parts.length < 2) {
    throw new Error(`[ContentService] Invalid content entry ID: "${id}". Expected format: "<group>/<locale>".`);
  }
  const group = parts.slice(0, -1).join('/');
  const locale = parts[parts.length - 1] as Locale;
  return { group, locale };
}

function pathToParam(urlPath: string): string | undefined {
  const clean = urlPath.replace(/^\/+|\/+$/g, '');
  return clean === '' ? undefined : clean;
}

export async function getSiteRoutes(): Promise<SiteRoute[]> {
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

  // 1. Pages Collection
  const allPages = await getCollection('pages');
  const pagesByGroup = new Map<string, Map<Locale, CollectionEntry<'pages'>>>();

  for (const page of allPages) {
    if (page.data.draft) continue;
    const { group, locale } = parseEntryId(page.id);
    if (!pagesByGroup.has(group)) {
      pagesByGroup.set(group, new Map());
    }
    pagesByGroup.get(group)!.set(locale, page);
  }

  for (const [group, localeMap] of pagesByGroup.entries()) {
    const isHome = group === 'home';
    const alternates: Partial<Record<Locale, string>> = {};

    for (const locale of LOCALES) {
      const entry = localeMap.get(locale);
      if (!entry) continue;

      const slug = isHome ? '' : entry.data.slug || group;
      if (locale === DEFAULT_LOCALE) {
        alternates[locale] = slug ? `/${slug}` : '/';
      } else {
        alternates[locale] = slug ? `/${locale}/${slug}` : `/${locale}`;
      }
    }

    for (const locale of LOCALES) {
      const entry = localeMap.get(locale);
      if (!entry) continue;

      const url = alternates[locale]!;
      registerRoute(url, {
        routeType: 'page',
        locale,
        entry,
        alternates: alternates as Record<Locale, string>,
        url,
      });
    }
  }

  // 2. Blog Index Routes
  const blogIndexAlternates: Record<Locale, string> = {} as Record<Locale, string>;
  for (const locale of LOCALES) {
    blogIndexAlternates[locale] =
      (locale as string) === (DEFAULT_LOCALE as string) ? '/blog' : `/${locale}/blog`;
  }

  for (const locale of LOCALES) {
    const url = blogIndexAlternates[locale];
    registerRoute(url, {
      routeType: 'blog-index',
      locale,
      alternates: blogIndexAlternates,
      url,
    });
  }

  // 3. Blog Collection (Articles)
  const allPosts = await getCollection('blog');
  const postsByGroup = new Map<string, Map<Locale, CollectionEntry<'blog'>>>();

  for (const post of allPosts) {
    if (post.data.draft) continue;
    const { group, locale } = parseEntryId(post.id);
    if (!postsByGroup.has(group)) {
      postsByGroup.set(group, new Map());
    }
    postsByGroup.get(group)!.set(locale, post);
  }

  for (const [, localeMap] of postsByGroup.entries()) {
    const alternates: Partial<Record<Locale, string>> = {};

    for (const locale of LOCALES) {
      const entry = localeMap.get(locale);
      if (!entry) continue;

      const slug = entry.data.slug;
      if (locale === DEFAULT_LOCALE) {
        alternates[locale] = `/blog/${slug}`;
      } else {
        alternates[locale] = `/${locale}/blog/${slug}`;
      }
    }

    for (const locale of LOCALES) {
      const entry = localeMap.get(locale);
      if (!entry) continue;

      const url = alternates[locale]!;
      registerRoute(url, {
        routeType: 'blog-entry',
        locale,
        entry,
        alternates: alternates as Record<Locale, string>,
        url,
      });
    }
  }

  return routes;
}

export function getBreadcrumbs(
  url: string,
  locale: Locale,
  titles?: { current?: string; home?: string; blog?: string }
): BreadcrumbItem[] {
  const defaultHomeLabels: Record<string, string> = {
    fa: 'خانه',
    ar: 'الرئيسية',
    de: 'Startseite',
    fr: 'Accueil',
    en: 'Home',
  };
  const defaultBlogLabels: Record<string, string> = {
    fa: 'وبلاگ',
    ar: 'المدونة',
    de: 'Blog',
    fr: 'Blog',
    en: 'Blog',
  };
  const homeLabel = titles?.home || defaultHomeLabels[locale] || 'Home';
  const blogLabel = titles?.blog || defaultBlogLabels[locale] || 'Blog';
  const homeHref = locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
  const blogHref = locale === DEFAULT_LOCALE ? '/blog' : `/${locale}/blog`;

  const crumbs: BreadcrumbItem[] = [{ label: homeLabel, href: homeHref }];

  if (url === homeHref) {
    return crumbs;
  }

  if (url.includes('/blog')) {
    crumbs.push({ label: blogLabel, href: blogHref });
    if (url !== blogHref && titles?.current) {
      crumbs.push({ label: titles.current, href: url });
    }
  } else if (titles?.current) {
    crumbs.push({ label: titles.current, href: url });
  }

  return crumbs;
}

/**
 * Resolves the true translated URL for any static page group (e.g. 'home', 'about', 'features')
 * based on the actual slug defined in its content collection entry.
 */
export async function getPageUrl(group: string, locale: Locale): Promise<string> {
  if (group === 'home' || group === '') {
    return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
  }

  const allPages = await getCollection('pages');
  const targetId = `${group}/${locale}`;
  const page = allPages.find((p) => p.id === targetId && !p.data.draft);

  if (page) {
    const slug = page.data.slug !== undefined ? page.data.slug : group;
    if (slug === '') {
      return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
    }
    return locale === DEFAULT_LOCALE ? `/${slug}` : `/${locale}/${slug}`;
  }

  // Fallback to default locale slug if missing in requested locale
  const defaultPage = allPages.find((p) => p.id === `${group}/${DEFAULT_LOCALE}` && !p.data.draft);
  if (defaultPage) {
    const defaultSlug = defaultPage.data.slug !== undefined ? defaultPage.data.slug : group;
    return locale === DEFAULT_LOCALE ? `/${defaultSlug}` : `/${locale}/${defaultSlug}`;
  }

  return locale === DEFAULT_LOCALE ? `/${group}` : `/${locale}/${group}`;
}


