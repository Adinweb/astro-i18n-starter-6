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
} from './navigation';
import * as service from '@/libs/content/service';

describe('src/libs/config/navigation.ts', () => {
  beforeEach(() => {
    vi.spyOn(service, 'getPageUrl').mockImplementation(async (group: string, locale: string) => {
      if (group === 'home') return locale === 'en' ? '/' : `/${locale}/`;
      return locale === 'en' ? `/${group}/` : `/${locale}/${group}/`;
    });
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

  describe('PAGE_ITEMS', () => {
    it('defines expected page groups', () => {
      const groups = PAGE_ITEMS.map((item) => item.group);
      expect(groups).toContain('home');
      expect(groups).toContain('about');
      expect(groups).toContain('features');
      expect(groups).toContain('pricing');
    });
  });

  describe('Individual navigation getters', () => {
    it('getHeaderNavigation returns desktop navbar items', async () => {
      const header = await getHeaderNavigation('en', '/features/');
      expect(header.length).toBeGreaterThan(0);
      expect(header.map((i) => i.key)).toContain('features');
    });

    it('getFooterNavigation returns multi-column structure', async () => {
      const footer = await getFooterNavigation('en', '/');
      expect(footer.length).toBe(3);
      expect(footer.map((c) => c.key)).toEqual(['product', 'resources', 'company']);
    });

    it('getLegalNavigation returns privacy and terms links', async () => {
      const legal = await getLegalNavigation('en', '/');
      expect(legal.map((i) => i.key)).toEqual(['privacy', 'terms']);
    });
  });

  describe('getNavigationSlots()', () => {
    it('returns distinct header, drawer, footer, and legal slots', async () => {
      const slots = await getNavigationSlots('en', 'https://example.com/features/');

      // Header slot check
      expect(Array.isArray(slots.header)).toBe(true);
      expect(slots.header.length).toBeGreaterThan(0);
      const headerKeys = slots.header.map((item) => item.key);
      expect(headerKeys).toContain('home');
      expect(headerKeys).toContain('features');
      expect(headerKeys).toContain('pricing');
      expect(headerKeys).toContain('blog');
      expect(headerKeys).toContain('resources');

      // Check active state
      const featuresItem = slots.header.find((item) => item.key === 'features');
      expect(featuresItem?.active).toBe(true);

      // Drawer slot check
      expect(Array.isArray(slots.drawer)).toBe(true);
      const drawerKeys = slots.drawer.map((item) => item.key);
      expect(drawerKeys).toContain('home');
      expect(drawerKeys).toContain('about');
      expect(drawerKeys).toContain('features');
      expect(drawerKeys).toContain('pricing');
      expect(drawerKeys).toContain('blog');

      // Footer columns check
      expect(Array.isArray(slots.footer)).toBe(true);
      expect(slots.footer.length).toBe(3);
      const footerKeys = slots.footer.map((col) => col.key);
      expect(footerKeys).toEqual(['product', 'resources', 'company']);

      // Check footer column items
      const productCol = slots.footer.find((col) => col.key === 'product');
      expect(productCol?.items.length).toBeGreaterThan(0);

      // Legal slot check
      expect(Array.isArray(slots.legal)).toBe(true);
      const legalKeys = slots.legal.map((item) => item.key);
      expect(legalKeys).toContain('privacy');
      expect(legalKeys).toContain('terms');
    });

    it('works across different locales (e.g. Persian/fa)', async () => {
      const slotsFa = await getNavigationSlots('fa', 'https://example.com/fa/features/');
      expect(slotsFa.footer.length).toBe(3);
      expect(slotsFa.footer[0].title).toBe('محصولات');
      expect(slotsFa.footer[1].title).toBe('منابع');
      expect(slotsFa.footer[2].title).toBe('سازمان');
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
