import { describe, it, expect } from 'vitest';
import { stripLocale, localizeHref, localeHref } from './paths';
import { LOCALES } from './locales';

const nonDefaultLocales = (LOCALES as readonly string[]).filter((l) => l !== 'en');
const testLoc1 = (nonDefaultLocales[0] || 'de') as any;
const testLoc2 = (nonDefaultLocales[1] || nonDefaultLocales[0] || 'de') as any;

describe('src/i18n/paths.ts', () => {
  describe('stripLocale', () => {
    it('detects default locale for unprefixed paths', () => {
      expect(stripLocale('/')).toEqual({ locale: 'en', pathname: '/' });
      expect(stripLocale('/about')).toEqual({ locale: 'en', pathname: '/about' });
      expect(stripLocale('/blog/first-post')).toEqual({
        locale: 'en',
        pathname: '/blog/first-post',
      });
    });

    it('detects non-default locale prefixes and strips them', () => {
      expect(stripLocale(`/${testLoc1}`)).toEqual({ locale: testLoc1, pathname: '/' });
      expect(stripLocale(`/${testLoc1}/`)).toEqual({ locale: testLoc1, pathname: '/' });
      expect(stripLocale(`/${testLoc1}/about`)).toEqual({ locale: testLoc1, pathname: '/about' });
    });
  });

  describe('localizeHref', () => {
    it('returns prefix-less paths for default locale (en)', () => {
      expect(localizeHref('/', 'en')).toBe('/');
      expect(localizeHref('/about', 'en')).toBe('/about');
      expect(localizeHref('/blog/post-1', 'en')).toBe('/blog/post-1');
      // Strips non-default prefix when converting to default locale
      expect(localizeHref(`/${testLoc1}/about`, 'en')).toBe('/about');
    });

    it('returns prefixed paths for non-default locales', () => {
      expect(localizeHref('/', testLoc1)).toBe(`/${testLoc1}`);
      expect(localizeHref('/about', testLoc1)).toBe(`/${testLoc1}/about`);
      if (testLoc2 !== testLoc1) {
        expect(localizeHref('/', testLoc2)).toBe(`/${testLoc2}`);
        expect(localizeHref('/about', testLoc2)).toBe(`/${testLoc2}/about`);
        // Replaces another locale prefix
        expect(localizeHref(`/${testLoc1}/about`, testLoc2)).toBe(`/${testLoc2}/about`);
      }
    });
  });

  describe('localeHref', () => {
    it('switches locale using stripped path when no alternates are provided', () => {
      expect(localeHref('/about', testLoc1)).toBe(`/${testLoc1}/about`);
      expect(localeHref(`/${testLoc1}/about`, 'en')).toBe('/about');
      expect(localeHref(`/${testLoc1}`, 'en')).toBe('/');
      expect(localeHref('/', testLoc1)).toBe(`/${testLoc1}`);
    });

    it('uses alternates mapping for translated slugs', () => {
      const alternates: Record<string, string> = {
        en: '/blog/first-post',
        [testLoc1]: `/blog/post-${testLoc1}`,
      };

      expect(localeHref('/blog/first-post', testLoc1, alternates)).toBe(`/${testLoc1}/blog/post-${testLoc1}`);
      expect(localeHref(`/${testLoc1}/blog/post-${testLoc1}`, 'en', alternates)).toBe('/blog/first-post');
    });
  });
});

