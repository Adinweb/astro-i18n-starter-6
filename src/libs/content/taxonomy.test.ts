import { describe, it, expect } from 'vitest';
import { getCategoryLabel, getTagLabel } from './taxonomy';
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@/i18n/locales';
import * as m from '@/paraglide/messages';

const altLocale: Locale = LOCALES.find((locale) => locale !== DEFAULT_LOCALE) ?? DEFAULT_LOCALE;
const messagesRecord = m as unknown as Record<string, ((params: Record<string, never>, options: { locale: Locale }) => string) | undefined>;

function expectCategoryIfActive(key: string, code: string, expected: string, fallback: string) {
  if (!isLocale(code)) return;
  const hasMessage = typeof messagesRecord[`blog_category_${key}`] === 'function';
  expect(getCategoryLabel(key, code)).toBe(hasMessage ? expected : fallback);
}

function expectTagIfActive(key: string, code: string, expected: string, fallback: string) {
  if (!isLocale(code)) return;
  const hasMessage = typeof messagesRecord[`blog_tag_${key}`] === 'function';
  expect(getTagLabel(key, code)).toBe(hasMessage ? expected : fallback);
}

describe('src/libs/content/taxonomy.ts', () => {
  it('resolves localized category labels when present in dictionaries, or falls back cleanly', () => {
    expectCategoryIfActive('engineering', 'en', 'Engineering', 'Engineering');
    expectCategoryIfActive('engineering', 'de', 'Entwicklung', 'Engineering');
    expectCategoryIfActive('engineering', 'fa', 'مهندسی', 'Engineering');
    expectCategoryIfActive('guides', 'ar', 'أدلة', 'Guides');
  });

  it('resolves localized tag labels when present in dictionaries, or falls back cleanly', () => {
    expectTagIfActive('i18n', 'en', 'Internationalization', 'I18n');
    expectTagIfActive('i18n', 'fr', 'Internationalisation', 'I18n');
    expectTagIfActive('rtl', 'fa', 'راست‌چین', 'Rtl');
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
