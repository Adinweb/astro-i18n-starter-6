import { describe, it, expect } from 'vitest';
import {
  siteConfig,
  appConfig,
  appConfigSchema,
  themeModeSchema,
  uiConfigSchema,
  blogConfigSchema,
  socialConfigSchema,
  POSTS_PER_PAGE,
  UI_CONFIG,
  BLOG_CONFIG,
  SOCIAL_CONFIG,
} from './app';

describe('src/libs/config/app.ts', () => {
  describe('themeModeSchema', () => {
    it('accepts system, light, and dark modes', () => {
      expect(themeModeSchema.parse('system')).toBe('system');
      expect(themeModeSchema.parse('light')).toBe('light');
      expect(themeModeSchema.parse('dark')).toBe('dark');
    });

    it('rejects invalid theme strings', () => {
      expect(() => themeModeSchema.parse('auto')).toThrow();
      expect(() => themeModeSchema.parse('blue')).toThrow();
    });
  });

  describe('uiConfigSchema', () => {
    it('provides sensible defaults for all UI toggles', () => {
      const parsed = uiConfigSchema.parse({});
      expect(parsed.showSearch).toBe(true);
      expect(parsed.showThemeToggle).toBe(true);
      expect(parsed.showLanguageSwitcher).toBe(true);
      expect(parsed.showTopLoadingBar).toBe(true);
      expect(parsed.stickyHeader).toBe(true);
    });

    it('allows selectively toggling UI features off', () => {
      const parsed = uiConfigSchema.parse({
        showSearch: false,
        stickyHeader: false,
      });
      expect(parsed.showSearch).toBe(false);
      expect(parsed.stickyHeader).toBe(false);
      expect(parsed.showThemeToggle).toBe(true);
    });
  });

  describe('blogConfigSchema', () => {
    it('validates postsPerPage and default presentation flags', () => {
      const parsed = blogConfigSchema.parse({ postsPerPage: 6 });
      expect(parsed.postsPerPage).toBe(6);
      expect(parsed.showReadingTime).toBe(true);
      expect(parsed.showTableOfContents).toBe(true);
      expect(parsed.showRelatedPosts).toBe(true);
    });

    it('rejects non-positive postsPerPage', () => {
      expect(() => blogConfigSchema.parse({ postsPerPage: 0 })).toThrow();
      expect(() => blogConfigSchema.parse({ postsPerPage: -5 })).toThrow();
    });
  });

  describe('socialConfigSchema', () => {
    it('defaults github and twitter to empty strings if omitted', () => {
      const parsed = socialConfigSchema.parse({});
      expect(parsed.github).toBe('');
      expect(parsed.twitter).toBe('');
    });
  });

  describe('siteConfig and direct exports', () => {
    it('exposes validated site metadata and configuration objects', () => {
      expect(siteConfig.name).toBe(appConfig.site.name);
      expect(siteConfig.defaultTheme).toBe('system');
      expect(siteConfig.ui).toBeDefined();
      expect(siteConfig.blog).toBeDefined();
      expect(siteConfig.social).toBeDefined();
      expect(POSTS_PER_PAGE).toBe(appConfig.blog.postsPerPage);
      expect(UI_CONFIG).toEqual(siteConfig.ui);
      expect(BLOG_CONFIG).toEqual(siteConfig.blog);
      expect(SOCIAL_CONFIG).toEqual(siteConfig.social);
    });
  });

  describe('appConfigSchema validation', () => {
    it('rejects invalid hex colors in brand configuration', () => {
      const invalidConfig = {
        ...appConfig,
        brand: {
          ...appConfig.brand,
          themeColor: 'rgb(0,0,0)',
        },
      };
      expect(() => appConfigSchema.parse(invalidConfig)).toThrow();
    });
  });
});
