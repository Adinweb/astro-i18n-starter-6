export const LOCALES = ['en', 'de', 'fr', 'fa', 'ar'] as const;

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
  de: {
    dir: 'ltr',
    htmlLang: 'de',
    name: 'Deutsch',
    fontFamily: 'var(--font-sans)',
  },
  fr: {
    dir: 'ltr',
    htmlLang: 'fr',
    name: 'Français',
    fontFamily: 'var(--font-sans)',
  },
  fa: {
    dir: 'rtl',
    htmlLang: 'fa',
    name: 'فارسی',
    fontFamily: 'var(--font-fa)',
  },
  ar: {
    dir: 'rtl',
    htmlLang: 'ar',
    name: 'العربية',
    fontFamily: 'var(--font-ar)',
  },
} satisfies Record<Locale, LocaleMeta>;

export function getLocaleMeta(locale: Locale): LocaleMeta {
  return LOCALE_METADATA[locale];
}

