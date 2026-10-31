import { describe, it, expect } from 'vitest';
import { getCategoryLabel, getTagLabel } from './taxonomy';
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@/i18n/locales';

const altLocale: Locale = LOCALES.find((locale) => locale !== DEFAULT_LOCALE) ?? DEFAULT_LOCALE;

function expectCategoryIfActive(key: string, code: string, expected: string) {
  if (isLocale(code)) {
    expect(getCategoryLabel(key, code)).toBe(expected);
  }
}

function expectTagIfActive(key: string, code: string, expected: string) {
  if (isLocale(code)) {
    expect(getTagLabel(key, code)).toBe(expected);
  }
}

describe('src/libs/content/taxonomy.ts', () => {
  it('resolves localized category labels from the message dictionaries', () => {
    expectCategoryIfActive('engineering', 'en', 'Engineering');
    expectCategoryIfActive('engineering', 'de', 'Entwicklung');
    expectCategoryIfActive('engineering', 'fa', 'مهندسی');
    expectCategoryIfActive('guides', 'ar', 'أدلة');
  });

  it('resolves localized tag labels', () => {
    expectTagIfActive('i18n', 'en', 'Internationalization');
    expectTagIfActive('i18n', 'fr', 'Internationalisation');
    expectTagIfActive('rtl', 'fa', 'راست‌چین');
  });

  it('falls back to a humanized key when no message exists', () => {
    expect(getCategoryLabel('design-systems', DEFAULT_LOCALE)).toBe('Design Systems');
    expect(getTagLabel('zero-config', altLocale)).toBe('Zero Config');
  });

  it('returns a non-empty label for every locale', () => {
    for (const locale of LOCALES) {
      expect(getCategoryLabel('engineering', locale).trim().length).toBeGreaterThan(0);
      expect(getTagLabel('astro', locale).trim().length).toBeGreaterThan(0);
    }
  });
});
