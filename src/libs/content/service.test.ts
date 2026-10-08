import { describe, it, expect } from 'vitest';
import { getBreadcrumbs } from './service';
import { LOCALES } from '@/i18n/locales';

const hasFa = (LOCALES as readonly string[]).includes('fa');

describe('src/libs/content/service.ts', () => {
  describe('getBreadcrumbs', () => {
    it('returns home crumb for home page', () => {
      const crumbsEn = getBreadcrumbs('/', 'en');
      expect(crumbsEn).toEqual([{ label: 'Home', href: '/' }]);

      if (hasFa) {
        const crumbsFa = getBreadcrumbs('/fa', 'fa' as any);
        expect(crumbsFa).toEqual([{ label: 'خانه', href: '/fa' }]);
      } else {
        const crumbsDe = getBreadcrumbs('/de', 'de');
        expect(crumbsDe).toEqual([{ label: 'Startseite', href: '/de' }]);
      }
    });

    it('returns home and blog crumbs for blog index', () => {
      const crumbs = getBreadcrumbs('/blog', 'en');
      expect(crumbs).toEqual([
        { label: 'Home', href: '/' },
        { label: 'Blog', href: '/blog' },
      ]);
    });

    it('returns complete crumb chain for blog article', () => {
      const crumbs = getBreadcrumbs('/blog/first-post', 'en', {
        current: 'First Post',
      });
      expect(crumbs).toEqual([
        { label: 'Home', href: '/' },
        { label: 'Blog', href: '/blog' },
        { label: 'First Post', href: '/blog/first-post' },
      ]);
    });

    it('returns complete crumb chain for non-default blog article', () => {
      if (hasFa) {
        const crumbs = getBreadcrumbs('/fa/blog/اولین-پست', 'fa' as any, {
          current: 'اولین پست',
        });
        expect(crumbs).toEqual([
          { label: 'خانه', href: '/fa' },
          { label: 'وبلاگ', href: '/fa/blog' },
          { label: 'اولین پست', href: '/fa/blog/اولین-پست' },
        ]);
      } else {
        const crumbs = getBreadcrumbs('/de/blog/erste-post', 'de', {
          current: 'Erste Post',
        });
        expect(crumbs).toEqual([
          { label: 'Startseite', href: '/de' },
          { label: 'Blog', href: '/de/blog' },
          { label: 'Erste Post', href: '/de/blog/erste-post' },
        ]);
      }
    });
  });
});

