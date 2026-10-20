import { describe, it, expect } from 'vitest';
import {
  buildSiteRoutes,
  getBreadcrumbs,
  getBlogIndexHref,
  getBlogPostHref,
} from './service';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/locales';
import { localizeHref } from '@/i18n/paths';
import * as m from '@/paraglide/messages';

const nonDefaultLocales = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const testLocale = (nonDefaultLocales[0] ?? 'de') as Locale;

function pageEntry(
  id: string,
  data: Partial<{ title: string; slug: string; draft: boolean }> = {}
) {
  return {
    id,
    data: {
      title: data.title ?? id,
      slug: data.slug ?? id.split('/')[0],
      draft: data.draft ?? false,
    },
  } as any;
}

function postEntry(
  id: string,
  data: Partial<{ title: string; slug: string; draft: boolean; publishedAt: Date }> = {}
) {
  return {
    id,
    data: {
      title: data.title ?? id,
      slug: data.slug ?? id.split('/')[0],
      publishedAt: data.publishedAt ?? new Date('2026-01-01T00:00:00Z'),
      draft: data.draft ?? false,
    },
  } as any;
}

describe('src/libs/content/service.ts', () => {
  describe('getBreadcrumbs', () => {
    it('returns a single home crumb for the home page', () => {
      expect(
        getBreadcrumbs(localizeHref('/', DEFAULT_LOCALE), DEFAULT_LOCALE, {
          home: m.nav_home({}, { locale: DEFAULT_LOCALE }),
          blog: m.nav_blog({}, { locale: DEFAULT_LOCALE }),
        })
      ).toEqual([
        {
          label: m.nav_home({}, { locale: DEFAULT_LOCALE }),
          href: localizeHref('/', DEFAULT_LOCALE),
        },
      ]);
    });

    it('returns home and blog crumbs for the blog index', () => {
      expect(
        getBreadcrumbs(getBlogIndexHref(DEFAULT_LOCALE), DEFAULT_LOCALE, {
          home: m.nav_home({}, { locale: DEFAULT_LOCALE }),
          blog: m.nav_blog({}, { locale: DEFAULT_LOCALE }),
        })
      ).toEqual([
        {
          label: m.nav_home({}, { locale: DEFAULT_LOCALE }),
          href: localizeHref('/', DEFAULT_LOCALE),
        },
        {
          label: m.nav_blog({}, { locale: DEFAULT_LOCALE }),
          href: getBlogIndexHref(DEFAULT_LOCALE),
        },
      ]);
    });

    it('returns a complete crumb chain for a blog article', () => {
      const url = getBlogPostHref('first-post', DEFAULT_LOCALE);
      expect(
        getBreadcrumbs(url, DEFAULT_LOCALE, {
          home: m.nav_home({}, { locale: DEFAULT_LOCALE }),
          blog: m.nav_blog({}, { locale: DEFAULT_LOCALE }),
          current: 'First Post',
        })
      ).toEqual([
        {
          label: m.nav_home({}, { locale: DEFAULT_LOCALE }),
          href: localizeHref('/', DEFAULT_LOCALE),
        },
        {
          label: m.nav_blog({}, { locale: DEFAULT_LOCALE }),
          href: getBlogIndexHref(DEFAULT_LOCALE),
        },
        { label: 'First Post', href: url },
      ]);
    });

    it('localizes breadcrumb hrefs for a non-default locale', () => {
      const url = getBlogPostHref('first-post', testLocale);
      const crumbs = getBreadcrumbs(url, testLocale, {
        home: m.nav_home({}, { locale: testLocale }),
        blog: m.nav_blog({}, { locale: testLocale }),
        current: 'First Post',
      });

      expect(crumbs[0].href).toBe(localizeHref('/', testLocale));
      expect(crumbs[1].href).toBe(getBlogIndexHref(testLocale));
      expect(crumbs[2].href).toBe(url);
    });
  });

  describe('buildSiteRoutes', () => {
    it('requires a home page for the default locale', () => {
      expect(() => buildSiteRoutes([], [])).toThrow(/Missing ".*" home page/);
    });

    it('builds localized page, blog index, and article routes with alternates', () => {
      const routes = buildSiteRoutes(
        [
          pageEntry(`home/${DEFAULT_LOCALE}`, { slug: '' }),
          pageEntry(`home/${testLocale}`, { slug: '' }),
          pageEntry(`about/${DEFAULT_LOCALE}`, { slug: 'about' }),
          pageEntry(`about/${testLocale}`, { slug: `about-${testLocale}` }),
        ],
        [postEntry(`first-post/${DEFAULT_LOCALE}`), postEntry(`first-post/${testLocale}`)]
      );

      const defaultHome = routes.find(
        (route) => route.props.routeType === 'page' && route.props.url === '/'
      );
      expect(defaultHome).toBeDefined();
      expect(defaultHome!.props.alternates[testLocale]).toBe(
        localizeHref('/', testLocale)
      );

      const translatedPage = routes.find(
        (route) =>
          route.props.routeType === 'page' &&
          route.props.locale === testLocale &&
          route.props.url.includes(`/about-${testLocale}/`)
      );
      expect(translatedPage!.props.url).toBe(`/${testLocale}/about-${testLocale}/`);

      const blogIndex = routes.filter((route) => route.props.routeType === 'blog-index');
      expect(blogIndex).toHaveLength(LOCALES.length);
      expect(blogIndex.map((route) => route.props.url)).toContain(
        getBlogIndexHref(DEFAULT_LOCALE)
      );

      const article = routes.find(
        (route) => route.props.routeType === 'blog-entry' && route.props.locale === testLocale
      );
      expect(article!.props.url).toBe(getBlogPostHref('first-post', testLocale));
      expect(article!.props.url.endsWith('/')).toBe(true);
    });

    it('skips drafts and reports duplicate URLs as collisions', () => {
      const routes = buildSiteRoutes(
        [
          pageEntry(`home/${DEFAULT_LOCALE}`, { slug: '' }),
          pageEntry(`about/${DEFAULT_LOCALE}`, { slug: 'contact' }),
          pageEntry(`draft/${DEFAULT_LOCALE}`, { slug: 'hidden', draft: true }),
        ],
        [
          postEntry(`hidden-post/${DEFAULT_LOCALE}`, { slug: 'hidden-post', draft: true }),
        ]
      );

      expect(routes.some((route) => route.props.url.includes('hidden'))).toBe(false);
      expect(() =>
        buildSiteRoutes(
          [
            pageEntry(`home/${DEFAULT_LOCALE}`, { slug: '' }),
            pageEntry(`about/${DEFAULT_LOCALE}`, { slug: 'contact' }),
            pageEntry(`pricing/${DEFAULT_LOCALE}`, { slug: 'contact' }),
          ],
          []
        )
      ).toThrow(/Duplicate route collision/);
      expect(routes.length).toBeGreaterThan(0);
    });
  });
});
