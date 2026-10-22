import { describe, it, expect } from 'vitest';
import {
  stripLocale,
  localizeHref,
  localeHref,
  getPathname,
  withTrailingSlash,
} from './paths';
import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales';

const nonDefaultLocales = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const testLoc1 = (nonDefaultLocales[0] ?? 'de') as Locale;
const testLoc2 = (nonDefaultLocales[1] ?? nonDefaultLocales[0] ?? 'fr') as Locale;

describe('src/i18n/paths.ts', () => {
  describe('getPathname', () => {
    it('strips query strings and hashes', () => {
      expect(getPathname('/about?ref=nav')).toBe('/about');
      expect(getPathname('/de/blog/#top')).toBe('/de/blog');
    });

    it('normalizes leading and trailing slashes', () => {
      expect(getPathname('')).toBe('/');
      expect(getPathname('about')).toBe('/about');
      expect(getPathname('/about/')).toBe('/about');
      expect(getPathname('/')).toBe('/');
    });
  });

  describe('withTrailingSlash', () => {
    it('canonicalizes page paths', () => {
      expect(withTrailingSlash('/')).toBe('/');
      expect(withTrailingSlash('/about')).toBe('/about/');
      expect(withTrailingSlash('/about/')).toBe('/about/');
      expect(withTrailingSlash('/fa/blog')).toBe('/fa/blog/');
    });

    it('preserves file extensions, queries, and hashes', () => {
      expect(withTrailingSlash('/sitemap.xml')).toBe('/sitemap.xml');
      expect(withTrailingSlash('/rss.xml')).toBe('/rss.xml');
      expect(withTrailingSlash('/about?ref=nav')).toBe('/about/?ref=nav');
      expect(withTrailingSlash('/about#main')).toBe('/about/#main');
    });
  });

  describe('stripLocale', () => {
    it('detects the default locale for unprefixed paths', () => {
      expect(stripLocale('/')).toEqual({ locale: DEFAULT_LOCALE, pathname: '/' });
      expect(stripLocale('/about')).toEqual({ locale: DEFAULT_LOCALE, pathname: '/about' });
      expect(stripLocale('/blog/first-post')).toEqual({
        locale: DEFAULT_LOCALE,
        pathname: '/blog/first-post',
      });
    });

    it('detects non-default locale prefixes and strips them', () => {
      expect(stripLocale(`/${testLoc1}`)).toEqual({ locale: testLoc1, pathname: '/' });
      expect(stripLocale(`/${testLoc1}/`)).toEqual({ locale: testLoc1, pathname: '/' });
      expect(stripLocale(`/${testLoc1}/about`)).toEqual({
        locale: testLoc1,
        pathname: '/about',
      });
    });
  });

  describe('localizeHref', () => {
    it('returns prefix-less paths for the default locale', () => {
      expect(localizeHref('/', DEFAULT_LOCALE)).toBe('/');
      expect(localizeHref('/about', DEFAULT_LOCALE)).toBe('/about/');
      expect(localizeHref('/blog/post-1', DEFAULT_LOCALE)).toBe('/blog/post-1/');
      // Strips a non-default prefix when converting to the default locale.
      expect(localizeHref(`/${testLoc1}/about`, DEFAULT_LOCALE)).toBe('/about/');
    });

    it('returns prefixed paths for non-default locales', () => {
      expect(localizeHref('/', testLoc1)).toBe(`/${testLoc1}/`);
      expect(localizeHref('/about', testLoc1)).toBe(`/${testLoc1}/about/`);

      if (testLoc2 !== testLoc1) {
        expect(localizeHref('/', testLoc2)).toBe(`/${testLoc2}/`);
        expect(localizeHref('/about', testLoc2)).toBe(`/${testLoc2}/about/`);
        expect(localizeHref(`/${testLoc1}/about`, testLoc2)).toBe(
          `/${testLoc2}/about/`
        );
      }
    });

    it('does not double-prefix an already-localized path', () => {
      expect(localizeHref(`/${testLoc1}/about/`, testLoc1)).toBe(
        `/${testLoc1}/about/`
      );
      expect(localizeHref('/about/', DEFAULT_LOCALE)).toBe('/about/');
    });
  });

  describe('localeHref', () => {
    it('switches locale using the stripped path when no alternates exist', () => {
      expect(localeHref('/about', testLoc1)).toBe(`/${testLoc1}/about/`);
      expect(localeHref(`/${testLoc1}/about`, DEFAULT_LOCALE)).toBe('/about/');
      expect(localeHref(`/${testLoc1}`, DEFAULT_LOCALE)).toBe('/');
      expect(localeHref('/', testLoc1)).toBe(`/${testLoc1}/`);
    });

    it('uses the alternates mapping for translated slugs', () => {
      const alternates: Record<string, string> = {
        [DEFAULT_LOCALE]: '/blog/first-post/',
        [testLoc1]: `/${testLoc1}/blog/post-${testLoc1}/`,
      };

      expect(localeHref('/blog/first-post', testLoc1, alternates)).toBe(
        `/${testLoc1}/blog/post-${testLoc1}/`
      );
      expect(
        localeHref(`/${testLoc1}/blog/post-${testLoc1}`, DEFAULT_LOCALE, alternates)
      ).toBe('/blog/first-post/');
    });
  });
});
