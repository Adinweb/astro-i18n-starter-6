import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isActive,
  getHeaderNavigation,
  getDrawerNavigation,
  getFooterNavigation,
  getLegalNavigation,
  getNavigationSlots,
  getNavigation,
  PAGE_ITEMS,
  BLOG_ITEM,
  getContentTypeIcon,
  type NavItemConfig,
  type NavigationBuildOptions,
} from './navigation';
import * as service from '@/libs/content/service';
import { siteConfig } from '@/libs/config/app';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales';
import * as m from '@/paraglide/messages';

const demoPageItems = [
  { group: 'home', icon: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
  { group: 'features', icon: 'sparkles', label: () => 'Features' },
  { group: 'pricing', icon: 'tag', label: () => 'Pricing' },
  { group: 'about', icon: 'info', label: () => 'About' },
];

const sampleNavOptions: NavigationBuildOptions = {
  pageItems: demoPageItems,
  primaryExtras: async ({ locale, currentUrl, isActive: activeFn }) => {
    const featuresHref = await service.getPageUrl('features', locale);
    const blogHref = service.getBlogIndexHref(locale);
    const overviewHref = featuresHref ?? blogHref;

    const exploreChildren = featuresHref
      ? [
          { key: 'rtl_support', label: 'RTL Support', href: `${featuresHref}#rtl`, icon: 'globe', active: false },
          { key: 'design_system', label: 'Design System', href: `${featuresHref}#design`, icon: 'palette', active: false },
        ]
      : [];

    return [
      {
        key: 'resources',
        label: 'Resources',
        icon: 'layers',
        active: false,
        children: [
          {
            key: 'overview',
            label: 'Overview',
            href: overviewHref,
            icon: 'book-open',
            active: featuresHref ? false : activeFn(overviewHref, currentUrl),
          },
          ...(exploreChildren.length > 0
            ? [
                {
                  key: 'explore',
                  label: 'Explore',
                  icon: 'compass',
                  active: false,
                  children: exploreChildren,
                },
              ]
            : []),
        ],
      },
    ];
  },
  legalItems: async ({ locale }) => {
    const aboutHref = await service.getPageUrl('about', locale);
    if (!aboutHref) return [];
    return [
      { key: 'privacy', label: m.footer_legal_privacy({}, { locale }), href: `${aboutHref}#privacy`, active: false },
      { key: 'terms', label: m.footer_legal_terms({}, { locale }), href: `${aboutHref}#terms`, active: false },
    ];
  },
};

describe('src/libs/config/navigation.ts', () => {
  beforeEach(() => {
    vi.spyOn(service, 'getPageUrl').mockImplementation(async (group: string, locale: string) => {
      if (group === 'home') return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
      return locale === DEFAULT_LOCALE ? `/${group}/` : `/${locale}/${group}/`;
    });
    vi.spyOn(service, 'getHomeHref').mockImplementation(async (locale: string) =>
      locale === DEFAULT_LOCALE ? '/' : `/${locale}/`
    );
  });

  describe('isActive()', () => {
    it('returns true when exact path matches currentUrl', () => {
      expect(isActive('/features/', 'https://example.com/features/')).toBe(true);
      expect(isActive('/features', 'https://example.com/features/')).toBe(true);
      expect(isActive('/features/', '/features/')).toBe(true);
    });

    it('returns false for undefined or empty href/currentUrl', () => {
      expect(isActive(undefined, '/about/')).toBe(false);
      expect(isActive('/about/', '')).toBe(false);
    });

    it('returns false for external links', () => {
      expect(isActive('https://astro.build', 'https://astro.build')).toBe(false);
      expect(isActive('http://example.com', 'http://example.com')).toBe(false);
    });

    it('returns true for subpaths of non-root routes', () => {
      expect(isActive('/blog/', 'https://example.com/blog/my-post/')).toBe(true);
      expect(isActive('/blog/', '/blog/my-post/')).toBe(true);
    });

    it('returns false for root path on non-root currentUrl', () => {
      expect(isActive('/', 'https://example.com/about/')).toBe(false);
      expect(isActive('/', '/about/')).toBe(false);
    });
  });

  describe('PAGE_ITEMS & BLOG_ITEM', () => {
    it('includes the home group in active PAGE_ITEMS and exposes declarative blog config', () => {
      const groups = PAGE_ITEMS.map((item) => item.group);
      expect(groups).toContain('home');

      const sampleConfig: NavItemConfig = {
        key: BLOG_ITEM.key,
        label: BLOG_ITEM.label,
      };
      expect(sampleConfig.key).toBe('blog');
      expect(sampleConfig.label('en')).toBe(m.nav_blog({}, { locale: 'en' }));
    });
  });

  describe('Individual navigation getters', () => {
    it('getHeaderNavigation returns desktop navbar items', async () => {
      const header = await getHeaderNavigation('en', '/features/', sampleNavOptions);
      expect(header.length).toBeGreaterThan(0);
      expect(header.map((i) => i.key)).toContain('features');
    });

    it('getFooterNavigation returns multi-column structure', async () => {
      const footer = await getFooterNavigation('en', '/', sampleNavOptions);
      expect(footer.length).toBe(3);
      expect(footer.map((c) => c.key)).toEqual(['product', 'resources', 'company']);
    });

    it('getLegalNavigation returns privacy and terms links', async () => {
      const legal = await getLegalNavigation('en', '/', sampleNavOptions);
      expect(legal.map((i) => i.key)).toEqual(['privacy', 'terms']);
    });
  });

  describe('getNavigationSlots()', () => {
    it('returns distinct header, drawer, footer, and legal slots', async () => {
      const slots = await getNavigationSlots('en', 'https://example.com/features/', sampleNavOptions);

      expect(Array.isArray(slots.header)).toBe(true);
      expect(slots.header.length).toBeGreaterThan(0);
      const headerKeys = slots.header.map((item) => item.key);
      expect(headerKeys).toContain('home');
      expect(headerKeys).toContain('features');
      expect(headerKeys).toContain('pricing');
      expect(headerKeys).toContain('blog');
      expect(headerKeys).toContain('resources');

      const featuresItem = slots.header.find((item) => item.key === 'features');
      const resourcesItem = slots.header.find((item) => item.key === 'resources');
      expect(featuresItem?.active).toBe(true);
      expect(resourcesItem?.active).toBe(false);

      expect(Array.isArray(slots.drawer)).toBe(true);
      const drawerKeys = slots.drawer.map((item) => item.key);
      expect(drawerKeys).toContain('home');
      expect(drawerKeys).toContain('about');
      expect(drawerKeys).toContain('features');
      expect(drawerKeys).toContain('pricing');
      expect(drawerKeys).toContain('blog');

      expect(Array.isArray(slots.footer)).toBe(true);
      expect(slots.footer.length).toBe(3);
      expect(slots.footer.map((col) => col.key)).toEqual(['product', 'resources', 'company']);

      const productCol = slots.footer.find((col) => col.key === 'product');
      expect(productCol?.items.length).toBeGreaterThan(0);

      expect(Array.isArray(slots.legal)).toBe(true);
      const legalKeys = slots.legal.map((item) => item.key);
      expect(legalKeys).toContain('privacy');
      expect(legalKeys).toContain('terms');
    });

    it('works across different locales (e.g. Persian/fa) and localizes home fallback', async () => {
      const slotsFa = await getNavigationSlots('fa', 'https://example.com/fa/features/', sampleNavOptions);
      expect(slotsFa.footer.length).toBe(3);
      expect(slotsFa.footer[0].title).toBe(m.footer_col_pages({}, { locale: 'fa' }));
      expect(slotsFa.footer[1].title).toBe(m.footer_col_resources({}, { locale: 'fa' }));
      expect(slotsFa.footer[2].title).toBe(m.footer_col_company({}, { locale: 'fa' }));

      vi.spyOn(service, 'getPageUrl').mockImplementationOnce(async (group: string) =>
        group === 'home' ? null : '/fa/about/'
      );
      const fallbackFooter = await getFooterNavigation('fa', '/fa/about/', sampleNavOptions);
      const productHome = fallbackFooter
        .find((col) => col.key === 'product')
        ?.items.find((item) => item.key === 'home');
      expect(productHome?.href).toBe('/fa/');
    });
  });

  describe('footer columns', () => {
    it('derives the pages column from pageItems and drops unpublished pages', async () => {
      vi.mocked(service.getPageUrl).mockImplementation(async (group: string) =>
        group === 'pricing' ? null : `/${group}/`
      );

      const footer = await getFooterNavigation('en', '/', sampleNavOptions);
      const pagesColumn = footer.find((column) => column.key === 'product');

      expect(pagesColumn?.title).toBe(m.footer_col_pages({}, { locale: 'en' }));
      expect(pagesColumn?.items.map((item) => item.key)).toEqual(
        demoPageItems.map((item) => item.group).filter((group) => group !== 'pricing')
      );

      const pageKeys = new Set<string>(demoPageItems.map((item) => item.group));
      const otherColumns = footer.filter((column) => column.key !== 'product');
      for (const column of otherColumns) {
        for (const item of column.items) {
          expect(pageKeys.has(item.key)).toBe(false);
        }
      }
    });

    it('includes extended social channels (linkedin, instagram, telegram) when configured', async () => {
      const originalSocial = { ...siteConfig.social };
      try {
        siteConfig.social.linkedin = 'https://linkedin.com/company/acme';
        siteConfig.social.instagram = 'https://instagram.com/acme';
        siteConfig.social.telegram = 'https://t.me/acme';

        const footer = await getFooterNavigation('en', '/', sampleNavOptions);
        const companyCol = footer.find((column) => column.key === 'company');
        const keys = companyCol?.items.map((item) => item.key) ?? [];

        expect(keys).toContain('linkedin');
        expect(keys).toContain('instagram');
        expect(keys).toContain('telegram');
      } finally {
        Object.assign(siteConfig.social, originalSocial);
      }
    });
  });

  describe('shared primary navigation', () => {
    it('serves the header and the drawer from the same page list', async () => {
      const header = await getHeaderNavigation('en', '/pricing/', sampleNavOptions);
      const drawer = await getDrawerNavigation('en', '/pricing/', sampleNavOptions);
      expect(drawer.map((item) => item.key)).toEqual(header.map((item) => item.key));

      for (const group of demoPageItems.map((item) => item.group)) {
        expect(header.filter((item) => item.key === group)).toHaveLength(1);
      }
    });

    it('never emits anchors into a features page that does not exist', async () => {
      vi.mocked(service.getPageUrl).mockImplementation(async (group: string, locale: string) =>
        group === 'features' || group === 'home'
          ? null
          : locale === DEFAULT_LOCALE
            ? `/${group}/`
            : `/${locale}/${group}/`
      );

      const header = await getHeaderNavigation(DEFAULT_LOCALE, '/', sampleNavOptions);
      const footer = await getFooterNavigation(DEFAULT_LOCALE, '/', sampleNavOptions);
      const headerItems = header.flatMap((item) => [item, ...(item.children ?? [])]);
      const hrefs = [...headerItems, ...footer.flatMap((column) => column.items)].map(
        (item) => item.href ?? ''
      );
      expect(hrefs.some((href) => href.includes('#rtl') || href.includes('#design'))).toBe(false);

      const resources = header.find((item) => item.key === 'resources');
      expect(resources?.children?.map((child) => child.key)).toEqual(['overview']);
      expect(resources?.children?.[0].href).toBe(service.getBlogIndexHref(DEFAULT_LOCALE));
    });

    it('hides the legal links when the about page is unpublished', async () => {
      vi.mocked(service.getPageUrl).mockImplementation(async (group: string) =>
        group === 'about' ? null : '/any/'
      );
      expect(await getLegalNavigation('en', '/', sampleNavOptions)).toEqual([]);
    });
  });

  describe('drawer icons', () => {
    it('gives every page group, content type and submenu entry an icon', async () => {
      const drawer = await getDrawerNavigation('en', '/', sampleNavOptions);
      const everyItem = drawer.flatMap(function flatten(item): typeof drawer {
        return [item, ...(item.children ?? []).flatMap(flatten)];
      });

      expect(everyItem.length).toBeGreaterThan(0);
      for (const item of everyItem) {
        expect(item.icon, `missing icon for ${item.key}`).toBeTruthy();
      }
    });

    it('declares an icon for every page group in PAGE_ITEMS', () => {
      for (const item of PAGE_ITEMS) {
        expect(item.icon).toMatch(/^[a-z-]+$/);
      }
    });

    it('falls back to a neutral icon for a content type without one', () => {
      expect(getContentTypeIcon('blog')).toBe('newspaper');
      expect(getContentTypeIcon('projects')).toBe('folder');
      expect(getContentTypeIcon('services')).toBe('layers');
    });
  });

  describe('getNavigation() backward compatibility', () => {
    it('returns navigation array matching drawer items', async () => {
      const legacyNav = await getNavigation('en', '/');
      const drawerNav = await getDrawerNavigation('en', '/');
      expect(legacyNav.map((i) => i.key)).toEqual(drawerNav.map((i) => i.key));
    });
  });
});
