import { describe, it, expect } from 'vitest';
import { getBreadcrumbs } from './service';

describe('src/libs/content/service.ts', () => {
  describe('getBreadcrumbs', () => {
    it('returns home crumb for home page', () => {
      const crumbsEn = getBreadcrumbs('/', 'en');
      expect(crumbsEn).toEqual([{ label: 'Home', href: '/' }]);

      const crumbsFa = getBreadcrumbs('/fa', 'fa');
      expect(crumbsFa).toEqual([{ label: 'خانه', href: '/fa' }]);
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

    it('returns complete crumb chain for Persian blog article', () => {
      const crumbs = getBreadcrumbs('/fa/blog/اولین-پست', 'fa', {
        current: 'اولین پست',
      });
      expect(crumbs).toEqual([
        { label: 'خانه', href: '/fa' },
        { label: 'وبلاگ', href: '/fa/blog' },
        { label: 'اولین پست', href: '/fa/blog/اولین-پست' },
      ]);
    });
  });
});
