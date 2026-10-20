import { describe, it, expect } from 'vitest';
import { getCategoryLabel, getTagLabel } from './taxonomy';
import { LOCALES } from '@/i18n/locales';

describe('src/libs/content/taxonomy.ts', () => {
  it('resolves localized category labels from the message dictionaries', () => {
    expect(getCategoryLabel('engineering', 'en')).toBe('Engineering');
    expect(getCategoryLabel('engineering', 'de')).toBe('Entwicklung');
    expect(getCategoryLabel('engineering', 'fa')).toBe('مهندسی');
    expect(getCategoryLabel('guides', 'ar')).toBe('أدلة');
  });

  it('resolves localized tag labels', () => {
    expect(getTagLabel('i18n', 'en')).toBe('Internationalization');
    expect(getTagLabel('i18n', 'fr')).toBe('Internationalisation');
    expect(getTagLabel('rtl', 'fa')).toBe('راست‌چین');
  });

  it('falls back to a humanized key when no message exists', () => {
    expect(getCategoryLabel('design-systems', 'en')).toBe('Design Systems');
    expect(getTagLabel('zero-config', 'fa')).toBe('Zero Config');
  });

  it('returns a non-empty label for every locale', () => {
    for (const locale of LOCALES) {
      expect(getCategoryLabel('engineering', locale).trim().length).toBeGreaterThan(0);
      expect(getTagLabel('astro', locale).trim().length).toBeGreaterThan(0);
    }
  });
});
