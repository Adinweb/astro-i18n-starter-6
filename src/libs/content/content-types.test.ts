import { describe, it, expect } from 'vitest';
import {
  CONTENT_TYPES,
  getContentType,
  getContentTypeEntryHref,
  getContentTypeIndexHref,
  getContentTypeLabel,
  getEntryContentTypes,
  getIndexedContentTypes,
  getNavigableContentTypes,
} from './types';
import { buildSiteRoutes, getBreadcrumbs, type SiteRoute, type SiteRouteProps } from './service';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/locales';
import { localizeHref } from '@/i18n/paths';
import * as m from '@/paraglide/messages';

const nonDefault = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const otherLocale = (nonDefault[0] ?? 'de') as Locale;

const homeEntry = {
  id: `home/${DEFAULT_LOCALE}`,
  data: { title: 'Home', slug: '', draft: false },
} as any;

describe('src/libs/content/types.ts', () => {
  it('declares the page system at the root and a base for every other type', () => {
    const pages = getContentType('pages');
    expect(pages.base).toBe('');
    expect(pages.enabled).toBe(true);

    for (const type of CONTENT_TYPES.filter((candidate) => candidate.key !== 'pages')) {
      expect(type.base).not.toBe('');
      expect(new Set(CONTENT_TYPES.map((candidate) => candidate.base)).size).toBe(
        CONTENT_TYPES.length
      );
    }
  });

  it('builds localized index and entry URLs from the registry base', () => {
    for (const type of CONTENT_TYPES) {
      const index = getContentTypeIndexHref(type.key, DEFAULT_LOCALE);
      const expected =
        type.base === '' ? localizeHref('/', DEFAULT_LOCALE) : `/${type.base}/`;

      expect(index).toBe(expected);
      expect(getContentTypeIndexHref(type.key, otherLocale)).toBe(
        type.base === '' ? localizeHref('/', otherLocale) : `/${type.base}/`.replace('/', `/${otherLocale}/`)
      );
    }

    const project = getContentType('projects');
    if (project.base) {
      expect(getContentTypeEntryHref('projects', 'atlas', DEFAULT_LOCALE)).toBe(
        `/${project.base}/atlas/`
      );
      expect(getContentTypeEntryHref('projects', 'atlas', otherLocale)).toBe(
        `/${otherLocale}/${project.base}/atlas/`
      );
    }
  });

  it('exposes only enabled, indexed types for listing and navigation', () => {
    for (const type of getIndexedContentTypes()) {
      expect(type.enabled).toBe(true);
      expect(type.key).not.toBe('pages');
      expect(type.index).toBe(true);
    }

    for (const type of getNavigableContentTypes()) {
      expect(type.nav).toBe(true);
      expect(type.enabled).toBe(true);
    }

    expect(getEntryContentTypes().every((type) => type.enabled)).toBe(true);
  });

  it('labels a type with its navigation message', () => {
    expect(getContentTypeLabel('projects', DEFAULT_LOCALE)).toBe(
      `${m.nav_projects({}, { locale: DEFAULT_LOCALE })}`
    );
    expect(getContentTypeLabel('blog', otherLocale)).toBe(
      `${m.nav_blog({}, { locale: otherLocale })}`
    );
  });
});

describe('collection routes for registry-driven types', () => {
  type CollectionIndexRoute = SiteRoute & {
    props: Extract<SiteRouteProps, { routeType: 'collection-index' }>;
  };
  type CollectionEntryRoute = SiteRoute & {
    props: Extract<SiteRouteProps, { routeType: 'collection-entry' }>;
  };

  const projectEntry = (id: string, slug: string, draft = false) =>
    ({ id, data: { title: id, slug, draft } }) as any;

  const projectsEnabled = getContentType('projects').enabled;
  const routeOptions = { projects: [projectEntry(`atlas/${DEFAULT_LOCALE}`, 'atlas')] };

  it.runIf(projectsEnabled)('registers one index route per locale and an entry route per locale', () => {
    const routes = buildSiteRoutes([homeEntry], [], routeOptions);
    const indexes = routes.filter(
      (route): route is CollectionIndexRoute => route.props.routeType === 'collection-index'
    );
    const entries = routes.filter(
      (route): route is CollectionEntryRoute => route.props.routeType === 'collection-entry'
    );

    expect(indexes).toHaveLength(LOCALES.length);
    expect(entries).toHaveLength(1);
    expect(entries[0].props.entry.id).toBe(`atlas/${DEFAULT_LOCALE}`);
    expect(entries[0].props.alternates[DEFAULT_LOCALE]).toBe(
      getContentTypeEntryHref('projects', 'atlas', DEFAULT_LOCALE)
    );
  });

  it.runIf(projectsEnabled)('marks an index route of every locale as an alternate', () => {
    const routes = buildSiteRoutes([homeEntry], [], {
      projects: [
        projectEntry(`atlas/${DEFAULT_LOCALE}`, 'atlas'),
        projectEntry(`atlas/${otherLocale}`, 'atlas-fa'),
      ],
    });

    const index = routes.find(
      (route): route is CollectionIndexRoute =>
        route.props.routeType === 'collection-index' && route.props.locale === DEFAULT_LOCALE
    );

    expect(index).toBeDefined();
    expect(Object.keys(index!.props.alternates).sort()).toEqual([...LOCALES].sort());
  });

  it.runIf(projectsEnabled)('keeps drafts out of the route set', () => {
    const routes = buildSiteRoutes([homeEntry], [], {
      projects: [projectEntry(`hidden/${DEFAULT_LOCALE}`, 'hidden', true)],
    });

    expect(routes.some((route) => route.props.url.includes('hidden'))).toBe(false);
  });

  it.runIf(projectsEnabled)('places a collection entry under its own section in the trail', () => {
    const url = getContentTypeEntryHref('projects', 'atlas', DEFAULT_LOCALE);
    const crumbs = getBreadcrumbs(url, DEFAULT_LOCALE, {
      home: m.nav_home({}, { locale: DEFAULT_LOCALE }),
      blog: m.nav_blog({}, { locale: DEFAULT_LOCALE }),
      section: { label: 'Projects', href: getContentTypeIndexHref('projects', DEFAULT_LOCALE) },
      current: 'Atlas',
    });

    expect(crumbs.map((crumb) => crumb.href)).toEqual([
      localizeHref('/', DEFAULT_LOCALE),
      getContentTypeIndexHref('projects', DEFAULT_LOCALE),
      url,
    ]);
  });
});
