export const LOCALES = ['en', 'fa'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export interface LocaleMeta {
  dir: 'ltr' | 'rtl';
  htmlLang: string;
  name: string;
  fontFamily: string;
}

export const LOCALE_METADATA = {
  en: {
    dir: 'ltr',
    htmlLang: 'en',
    name: 'English',
    fontFamily: 'var(--font-sans)',
  },
  fa: {
    dir: 'rtl',
    htmlLang: 'fa',
    name: 'فارسی',
    fontFamily: 'var(--font-fa)',
  },
} satisfies Record<Locale, LocaleMeta>;

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
