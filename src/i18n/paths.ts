import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeading.length > 1 && withLeading.endsWith('/')
    ? withLeading.slice(0, -1)
    : withLeading;
}

export function stripLocale(pathname: string): { locale: Locale; pathname: string } {
  const normalized = normalizePath(pathname);
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length > 0) {
    const maybeLocale = segments[0];
    if (isLocale(maybeLocale)) {
      const rest = segments.slice(1).join('/');
      return {
        locale: maybeLocale,
        pathname: rest ? `/${rest}` : '/',
      };
    }
  }

  return {
    locale: DEFAULT_LOCALE,
    pathname: normalized,
  };
}

export function localizeHref(pathname: string, targetLocale: Locale): string {
  const { pathname: barePath } = stripLocale(pathname);

  if (targetLocale === DEFAULT_LOCALE) {
    return barePath;
  }

  return barePath === '/' ? `/${targetLocale}` : `/${targetLocale}${barePath}`;
}

export function localeHref(
  currentPath: string,
  targetLocale: Locale,
  alternates?: Partial<Record<Locale, string>>
): string {
  if (alternates && alternates[targetLocale]) {
    const alt = alternates[targetLocale]!;
    const { pathname: stripped } = stripLocale(alt);
    if (targetLocale === DEFAULT_LOCALE) {
      return stripped;
    }
    return stripped === '/' ? `/${targetLocale}` : `/${targetLocale}${stripped}`;
  }

  const { pathname: barePath } = stripLocale(currentPath);
  return localizeHref(barePath, targetLocale);
}
