import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isActive,
  getHeaderNavigation,
  getDrawerNavigation,
  getFooterNavigation,
  getLegalNavigation,
  getNavigationSlots,
  getNavigation,
  getMenuById,
  getAllMenus,
  hasActiveNavDescendant,
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

  describe('ui.navigation config-first merge', () => {
    it('merges ui.navigation.pages overrides and appends new published pages without dropping unpublished guards', async () => {
      vi.mocked(service.getPageUrl).mockImplementation(async (group: string, locale: string) => {
        if (group === 'draft-only') return null;
        return locale === DEFAULT_LOCALE ? `/${group}/` : `/${locale}/${group}/`;
      });

      const slots = await getNavigationSlots('en', '/services/', {
        ...sampleNavOptions,
        uiNavigation: {
          pages: [
            { group: 'features', icon: 'rocket', labels: { en: 'Capabilities', fa: 'امکانات' } },
            { group: 'services', icon: 'sparkles', labels: { en: 'Services', fa: 'خدمات' } },
            { group: 'draft-only', icon: 'lock', labels: { en: 'Secret', fa: 'محرمانه' } },
          ],
          footerColumns: [],
        },
      });

      const featuresHeader = slots.header.find((item) => item.key === 'features');
      expect(featuresHeader?.label).toBe('Capabilities');
      expect(featuresHeader?.icon).toBe('rocket');

      const servicesHeader = slots.header.find((item) => item.key === 'services');
      expect(servicesHeader).toMatchObject({
        key: 'services',
        label: 'Services',
        href: '/services/',
        icon: 'sparkles',
        active: true,
      });

      expect(slots.header.some((item) => item.key === 'draft-only')).toBe(false);
      expect(slots.drawer.map((i) => i.key)).toEqual(slots.header.map((i) => i.key));
    });

    it('merges ui.navigation.footerColumns overrides and appends custom footer columns', async () => {
      vi.mocked(service.getPageUrl).mockImplementation(async (group: string, locale: string) => {
        if (group === 'missing') return null;
        return locale === DEFAULT_LOCALE ? `/${group}/` : `/${locale}/${group}/`;
      });

      const footer = await getFooterNavigation('en', '/about/', {
        ...sampleNavOptions,
        uiNavigation: {
          pages: [],
          footerColumns: [
            {
              key: 'legal_links',
              titles: { en: 'Support', fa: 'پشتیبانی' },
              items: [
                { group: 'about', labels: { en: 'About Us', fa: 'درباره ما' }, external: false },
                { group: 'missing', labels: { en: 'Missing' }, external: false },
                { href: 'https://status.example.com', external: true, label: 'Status' },
              ],
            },
          ],
        },
      });

      const supportCol = footer.find((col) => col.key === 'legal_links');
      expect(supportCol?.title).toBe('Support');
      expect(supportCol?.items).toHaveLength(2);
      expect(supportCol?.items[0]).toMatchObject({
        key: 'about',
        label: 'About Us',
        href: '/about/',
        active: true,
      });
      expect(supportCol?.items[1]).toMatchObject({
        href: 'https://status.example.com',
        label: 'Status',
        external: true,
      });
    });
  });

  describe('Named tree menus (menus + slots + displayMode)', () => {
    it('resolves multi-level nested menus by ID with dropdown/list overrides and active state bubbling', async () => {
      vi.mocked(service.getPageUrl).mockImplementation(async (group: string, locale: string) => {
        if (group === 'unpublished') return null;
        if (group === 'home') return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
        return locale === DEFAULT_LOCALE ? `/${group}/` : `/${locale}/${group}/`;
      });

      const uiNavigation = {
        menus: [
          {
            id: 'main-header',
            titles: { en: 'Main Header', fa: 'منوی هدر' },
            displayMode: 'dropdown' as const,
            items: [
              { group: 'home', icon: 'home' },
              {
                id: 'solutions',
                label: 'Solutions',
                labels: { en: 'Solutions', fa: 'راهکارها' },
                childrenDisplay: 'list' as const,
                children: [
                  { group: 'unpublished', label: 'Hidden Draft' },
                  {
                    id: 'enterprise',
                    label: 'Enterprise',
                    childrenDisplay: 'dropdown' as const,
                    children: [
                      { group: 'features', label: 'Platform Features' },
                      { href: 'https://ext.example.com', external: true, label: 'External Portal' },
                    ],
                  },
                ],
              },
              { contentType: 'blog' },
              { contentType: 'disabled-type', label: 'Disabled' },
            ],
          },
          {
            id: 'footer-company',
            titles: { en: 'Company Menu', fa: 'شرکت' },
            displayMode: 'list' as const,
            items: [
              { group: 'about', labels: { en: 'About Us', fa: 'درباره ما' } },
              { href: '/contact/#support', label: 'Support' },
            ],
          },
        ],
        slots: {
          header: 'main-header',
          footer: ['footer-company'],
          footerMode: 'replace' as const,
          legal: 'footer-company',
        },
      };

      const resolvedEn = await getMenuById('main-header', 'en', '/features/', { uiNavigation });
      expect(resolvedEn?.id).toBe('main-header');
      expect(resolvedEn?.title).toBe('Main Header');
      expect(resolvedEn?.displayMode).toBe('dropdown');

      // Unpublished page and disabled contentType are filtered out
      expect(resolvedEn?.items.map((i) => i.key)).toEqual(['home', 'solutions', 'blog']);

      const solutions = resolvedEn?.items.find((i) => i.key === 'solutions');
      expect(solutions?.displayMode).toBe('list');
      expect(solutions?.active).toBe(true);
      expect(hasActiveNavDescendant(solutions!)).toBe(true);
      expect(solutions?.children?.map((c) => c.key)).toEqual(['enterprise']);

      const enterprise = solutions?.children?.[0];
      expect(enterprise?.displayMode).toBe('dropdown');
      expect(enterprise?.active).toBe(true);
      expect(enterprise?.children).toHaveLength(2);
      expect(enterprise?.children?.[1]).toMatchObject({
        href: 'https://ext.example.com',
        external: true,
        active: false,
      });

      const resolvedFa = await getMenuById('main-header', 'fa', '/fa/features/', { uiNavigation });
      expect(resolvedFa?.title).toBe('منوی هدر');
      expect(resolvedFa?.items.find((i) => i.key === 'solutions')?.label).toBe('راهکارها');

      const allMenus = await getAllMenus('en', '/', { uiNavigation });
      expect(allMenus.map((mItem) => mItem.id)).toEqual(['main-header', 'footer-company']);
      expect(await getMenuById('non-existent', 'en', '/', { uiNavigation })).toBeNull();

      // Slots binding: header -> main-header, drawer inherits header when unset, footer replaces defaults
      const slots = await getNavigationSlots('en', '/features/', {
        ...sampleNavOptions,
        uiNavigation,
      });
      expect(slots.header.map((i) => i.key)).toEqual(['home', 'solutions', 'blog']);
      expect(slots.drawer.map((i) => i.key)).toEqual(['home', 'solutions', 'blog']);
      expect(slots.footer).toHaveLength(1);
      expect(slots.footer[0]).toMatchObject({
        key: 'footer-company',
        title: 'Company Menu',
        displayMode: 'list',
      });
      expect(slots.legal.map((i) => i.key)).toEqual(['about', '/contact/#support']);

      // Append mode keeps default footer columns + appends assigned menu column
      const appendedFooter = await getFooterNavigation('en', '/', {
        ...sampleNavOptions,
        uiNavigation: {
          ...uiNavigation,
          slots: { footer: ['footer-company'], footerMode: 'append' },
        },
      });
      expect(appendedFooter.map((c) => c.key)).toContain('product');
      expect(appendedFooter.map((c) => c.key)).toContain('footer-company');
    });

    it('renders the same menu ID as dropdown in Header and list in Footer/Drawer via placement overrides', async () => {
      vi.mocked(service.getPageUrl).mockImplementation(async (group: string, locale: string) =>
        locale === DEFAULT_LOCALE ? `/${group}/` : `/${locale}/${group}/`
      );

      const uiNavigation = {
        menus: [
          {
            id: 'shared-nav',
            title: 'Shared Navigation',
            displayMode: 'dropdown' as const,
            items: [
              {
                id: 'products',
                label: 'Products',
                childrenDisplay: 'dropdown' as const,
                children: [
                  {
                    id: 'cloud',
                    label: 'Cloud',
                    childrenDisplay: 'dropdown' as const,
                    children: [{ group: 'features', label: 'Features' }],
                  },
                ],
              },
            ],
          },
        ],
        slots: {
          header: 'shared-nav',
          headerDisplayMode: 'dropdown' as const,
          drawer: 'shared-nav',
          drawerDisplayMode: 'list' as const,
          footer: [{ id: 'shared-nav', displayMode: 'list' as const }],
          footerMode: 'replace' as const,
        },
      };

      const slots = await getNavigationSlots('en', '/features/', {
        ...sampleNavOptions,
        uiNavigation,
      });

      // Header keeps dropdown across all levels
      expect(slots.header[0]?.displayMode).toBe('dropdown');
      expect(slots.header[0]?.children?.[0]?.displayMode).toBe('dropdown');

      // Drawer and Footer render the exact same menu as expanded list across all levels
      expect(slots.drawer[0]?.displayMode).toBe('list');
      expect(slots.drawer[0]?.children?.[0]?.displayMode).toBe('list');

      expect(slots.footer[0]?.key).toBe('shared-nav');
      expect(slots.footer[0]?.displayMode).toBe('list');
      expect(slots.footer[0]?.items[0]?.displayMode).toBe('list');
      expect(slots.footer[0]?.items[0]?.children?.[0]?.displayMode).toBe('list');

      // Direct NavMenu placement override via getMenuById
      const listMenu = await getMenuById('shared-nav', 'en', '/features/', {
        uiNavigation,
        menuDisplayMode: 'list',
      });
      expect(listMenu?.displayMode).toBe('list');
      expect(listMenu?.items[0]?.displayMode).toBe('list');
      expect(listMenu?.items[0]?.children?.[0]?.displayMode).toBe('list');
    });
  });
});



