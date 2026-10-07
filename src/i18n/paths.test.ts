import { describe, it, expect } from 'vitest';
import { stripLocale, localizeHref, localeHref } from './paths';

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
      expect(stripLocale('/fa')).toEqual({ locale: 'fa', pathname: '/' });
      expect(stripLocale('/fa/')).toEqual({ locale: 'fa', pathname: '/' });
      expect(stripLocale('/fa/about')).toEqual({ locale: 'fa', pathname: '/about' });
      expect(stripLocale('/de/blog/erste-post')).toEqual({
        locale: 'de',
        pathname: '/blog/erste-post',
      });
    });
  });

  describe('localizeHref', () => {
    it('returns prefix-less paths for default locale (en)', () => {
      expect(localizeHref('/', 'en')).toBe('/');
      expect(localizeHref('/about', 'en')).toBe('/about');
      expect(localizeHref('/blog/post-1', 'en')).toBe('/blog/post-1');
      // Strips non-default prefix when converting to default locale
      expect(localizeHref('/fa/about', 'en')).toBe('/about');
    });

    it('returns prefixed paths for non-default locales (fa, de)', () => {
      expect(localizeHref('/', 'fa')).toBe('/fa');
      expect(localizeHref('/about', 'fa')).toBe('/fa/about');
      expect(localizeHref('/', 'de')).toBe('/de');
      expect(localizeHref('/about', 'de')).toBe('/de/about');
      // Replaces another locale prefix
      expect(localizeHref('/de/about', 'fa')).toBe('/fa/about');
    });
  });

  describe('localeHref', () => {
    it('switches locale using stripped path when no alternates are provided', () => {
      expect(localeHref('/about', 'fa')).toBe('/fa/about');
      expect(localeHref('/fa/about', 'en')).toBe('/about');
      expect(localeHref('/fa/about', 'de')).toBe('/de/about');
      expect(localeHref('/de', 'en')).toBe('/');
      expect(localeHref('/', 'fa')).toBe('/fa');
    });

    it('uses alternates mapping for translated slugs', () => {
      const alternates = {
        en: '/blog/first-post',
        fa: '/blog/اولین-پست',
        de: '/blog/erste-post',
      };

      expect(localeHref('/blog/first-post', 'fa', alternates)).toBe('/fa/blog/اولین-پست');
      expect(localeHref('/blog/first-post', 'de', alternates)).toBe('/de/blog/erste-post');
      expect(localeHref('/fa/blog/اولین-پست', 'en', alternates)).toBe('/blog/first-post');
    });
  });
});
