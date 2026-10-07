export const DEFAULT_LOCALE = 'en';
export const LOCALES = ['en', 'de', 'fa'] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
