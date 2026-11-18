import clientLocales from '../../client/locales.json';

export type Locale = import('@/paraglide/runtime').Locale;

export const LOCALES = clientLocales.locales as readonly Locale[];

export const DEFAULT_LOCALE: Locale = clientLocales.defaultLocale as Locale;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export interface LocaleMeta {
  dir: 'ltr' | 'rtl';
  htmlLang: string;
  name: string;
  fontFamily: string;
}

export const LOCALE_METADATA: Record<Locale, LocaleMeta> =
  clientLocales.metadata as Record<Locale, LocaleMeta>;

export function getLocaleMeta(locale: Locale): LocaleMeta {
  return LOCALE_METADATA[locale];
}

/**
 * Produces the language_TERRITORY form required by og:locale.
 * Uses Intl's likely-subtags data so new locales work without a manual map.
 */
export function getOgLocale(locale: Locale): string {
  const { htmlLang } = getLocaleMeta(locale);
  try {
    const maximized = new Intl.Locale(htmlLang).maximize();
    const region = maximized.region;
    return region
      ? `${maximized.language}_${region.toUpperCase()}`
      : htmlLang.replace(/-/g, '_');
  } catch {
    return htmlLang.replace(/-/g, '_');
  }
}
