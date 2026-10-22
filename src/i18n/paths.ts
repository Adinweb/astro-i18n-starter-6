import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';

interface PathParts {
  pathname: string;
  suffix: string;
}

function splitSuffix(pathname: string): PathParts {
  const match = pathname.match(/^([^?#]*)([?#].*)?$/);
  if (!match) return { pathname: '/', suffix: '' };
  return { pathname: match[1] || '/', suffix: match[2] || '' };
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeading.length > 1 && withLeading.endsWith('/')
    ? withLeading.slice(0, -1)
    : withLeading;
}

/**
 * The path of a URL without its query string or hash.
 *
 * Always starts with `/` and never has a trailing slash (except for the root),
 * so two URLs that address the same route compare equal regardless of how the
 * caller wrote them. Page canonicalization is a separate step
 * (`withTrailingSlash`), because file endpoints keep their extension.
 */
export function getPathname(url: string): string {
  const { pathname } = splitSuffix(url);
  return normalizePath(pathname);
}

/**
 * Pages use canonical trailing slashes (`/about/`, `/fa/blog/`), while file
 * endpoints (`/sitemap.xml`, `/rss.xml`, `/icons.svg`) keep their extension.
 */
export function withTrailingSlash(pathname: string): string {
  const { pathname: path, suffix } = splitSuffix(pathname);
  if (path === '/' || /\.[a-z0-9]+$/i.test(path)) return `${path}${suffix}`;
  const normalized = path.endsWith('/') ? path : `${path}/`;
  return `${normalized}${suffix}`;
}

export function stripLocale(pathname: string): { locale: Locale; pathname: string } {
  const { pathname: path, suffix } = splitSuffix(pathname);
  const normalized = normalizePath(path);
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length > 0) {
    const maybeLocale = segments[0];
    if (isLocale(maybeLocale)) {
      const rest = segments.slice(1).join('/');
      return {
        locale: maybeLocale,
        pathname: `${rest ? `/${rest}` : '/'}${suffix}`,
      };
    }
  }

  return {
    locale: DEFAULT_LOCALE,
    pathname: `${normalized}${suffix}`,
  };
}

export function localizeHref(pathname: string, targetLocale: Locale): string {
  const { pathname: barePath } = stripLocale(pathname);
  const href =
    targetLocale === DEFAULT_LOCALE
      ? barePath
      : barePath === '/'
        ? `/${targetLocale}`
        : `/${targetLocale}${barePath}`;

  return withTrailingSlash(href);
}

export function localeHref(
  currentPath: string,
  targetLocale: Locale,
  alternates?: Partial<Record<Locale, string>>
): string {
  if (alternates && alternates[targetLocale]) {
    return withTrailingSlash(alternates[targetLocale]!);
  }

  const { pathname: barePath } = stripLocale(currentPath);
  return localizeHref(barePath, targetLocale);
}
