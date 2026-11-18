import { describe, it, expect } from 'vitest';
import {
  siteConfig,
  appConfig,
  appConfigSchema,
  brandLogoSchema,
  themeModeSchema,
  uiConfigSchema,
  blogConfigSchema,
  cookieConfigSchema,
  socialConfigSchema,
  businessConfigSchema,
  apiEndpointsSchema,
  apiConfigSchema,
  defaultUiConfig,
  defaultSocialConfig,
  defaultBusinessConfig,
  defaultApiConfig,
  POSTS_PER_PAGE,
  UI_CONFIG,
  BLOG_CONFIG,
  COOKIE_CONFIG,
  SOCIAL_CONFIG,
  BUSINESS_CONFIG,
  API_CONFIG,
  type ApiConfig,
  type BlogConfig,
  type ThemeMode,
} from './app';

describe('src/libs/config/app.ts', () => {
  describe('themeModeSchema', () => {
    it('accepts system, light, and dark modes', () => {
      const mode: ThemeMode = themeModeSchema.parse('system');
      expect(mode).toBe('system');
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
      expect(parsed).toEqual(defaultUiConfig);
    });

    it('allows selectively toggling UI features off, including showLanguageSwitcher for solo-locale sites', () => {
      const parsed = uiConfigSchema.parse({
        showSearch: false,
        stickyHeader: false,
        showLanguageSwitcher: false,
      });
      expect(parsed.showSearch).toBe(false);
      expect(parsed.stickyHeader).toBe(false);
      expect(parsed.showLanguageSwitcher).toBe(false);
      expect(parsed.showThemeToggle).toBe(true);
    });

    it('points the call to action at the pricing page by default', () => {
      expect(uiConfigSchema.parse({}).ctaPage).toBe('pricing');
      expect(uiConfigSchema.parse({ ctaPage: 'contact' }).ctaPage).toBe('contact');
      expect(() => uiConfigSchema.parse({ ctaPage: '' })).toThrow();
    });
  });

  describe('blogConfigSchema', () => {
    it('validates postsPerPage and default presentation flags', () => {
      const parsed: BlogConfig = blogConfigSchema.parse({ postsPerPage: 6 });
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

  describe('cookieConfigSchema', () => {
    it('provides GDPR/TDDDG compliant defaults', () => {
      const parsed = cookieConfigSchema.parse({});
      expect(parsed.enabled).toBe(true);
      expect(parsed.consentVersion).toBe(1);
      expect(parsed.storageKey).toBe('cookie_consent');
      expect(parsed.expirationDays).toBe(180);
    });

    it('rejects invalid storage keys or expirationDays exceeding 400 days', () => {
      expect(() => cookieConfigSchema.parse({ storageKey: 'invalid key!' })).toThrow();
      expect(() => cookieConfigSchema.parse({ expirationDays: 0 })).toThrow();
      expect(() => cookieConfigSchema.parse({ expirationDays: 401 })).toThrow();
      expect(() => cookieConfigSchema.parse({ consentVersion: 0 })).toThrow();
    });
  });

  describe('socialConfigSchema', () => {
    it('defaults github, twitter, linkedin, instagram, and telegram to empty strings if omitted', () => {
      const parsed = socialConfigSchema.parse({});
      expect(parsed).toEqual(defaultSocialConfig);
      expect(parsed).toHaveProperty('linkedin', '');
      expect(parsed).toHaveProperty('instagram', '');
      expect(parsed).toHaveProperty('telegram', '');
    });

    it('accepts valid HTTPS URLs for extended social platforms', () => {
      const parsed = socialConfigSchema.parse({
        linkedin: 'https://linkedin.com/company/acme',
        instagram: 'https://instagram.com/acme',
        telegram: 'https://t.me/acme',
      });
      expect(parsed.linkedin).toBe('https://linkedin.com/company/acme');
      expect(parsed.instagram).toBe('https://instagram.com/acme');
      expect(parsed.telegram).toBe('https://t.me/acme');
    });
  });

  describe('apiConfigSchema', () => {
    it('validates pure SSG external API defaults and timeout bounds', () => {
      const parsed: ApiConfig = apiConfigSchema.parse({});
      expect(parsed).toEqual(defaultApiConfig);
      expect(apiEndpointsSchema.parse({})).toEqual({ contact: '/contact' });
      expect(apiEndpointsSchema.parse({ newsletter: '/newsletter' })).toEqual({
        contact: '/contact',
        newsletter: '/newsletter',
      });
      expect(() => apiConfigSchema.parse({ timeoutMs: 200 })).toThrow();
      expect(() => apiConfigSchema.parse({ timeoutMs: 90000 })).toThrow();
    });

    it('validates optional localized contact topics when configured', () => {
      const parsed = apiConfigSchema.parse({
        topics: [
          {
            value: 'sales',
            label: 'Sales',
            labels: { en: 'Sales & Pricing', fa: 'فروش و تعرفه‌ها' },
          },
        ],
      });
      expect(parsed.topics).toHaveLength(1);
      expect(parsed.topics?.[0]?.labels?.fa).toBe('فروش و تعرفه‌ها');
      expect(() => apiConfigSchema.parse({ topics: [{ value: '', label: 'Empty' }] })).toThrow();
    });
  });

  describe('businessConfigSchema & brandLogoSchema', () => {
    it('provides corporate defaults and validates optional local SEO details', () => {
      expect(businessConfigSchema.parse({})).toEqual(defaultBusinessConfig);
      const parsed = businessConfigSchema.parse({
        type: 'MedicalBusiness',
        legalName: 'Clinic GmbH',
        phone: '+49 89 123456',
        whatsapp: '+49 170 123456',
        telegram: '@clinic_support',
        geo: { lat: 48.1351, lng: 11.582 },
      });
      expect(parsed.type).toBe('MedicalBusiness');
      expect(parsed.geo?.lat).toBe(48.1351);
      expect(BUSINESS_CONFIG).toEqual(siteConfig.business);
    });

    it('validates light/dark logo configuration', () => {
      const parsed = brandLogoSchema.parse({
        light: '/logo-light.svg',
        dark: '/logo-dark.svg',
        alt: 'Acme Corp',
        width: 120,
        height: 32,
        showText: false,
      });
      expect(parsed.light).toBe('/logo-light.svg');
      expect(parsed.showText).toBe(false);
    });
  });

  describe('siteConfig and direct exports', () => {
    it('exposes validated site metadata and configuration objects', () => {
      expect(siteConfig.name).toBe(appConfig.site.name);
      expect(siteConfig.defaultTheme).toBe('system');
      expect(siteConfig.ui).toBeDefined();
      expect(siteConfig.blog).toBeDefined();
      expect(siteConfig.cookies).toBeDefined();
      expect(siteConfig.social).toBeDefined();
      expect(siteConfig.business).toBeDefined();
      expect(siteConfig.api).toBeDefined();
      expect(POSTS_PER_PAGE).toBe(appConfig.blog.postsPerPage);
      expect(UI_CONFIG).toEqual(siteConfig.ui);
      expect(BLOG_CONFIG).toEqual(siteConfig.blog);
      expect(COOKIE_CONFIG).toEqual(siteConfig.cookies);
      expect(SOCIAL_CONFIG).toEqual(siteConfig.social);
      expect(BUSINESS_CONFIG).toEqual(siteConfig.business);
      expect(API_CONFIG).toEqual(siteConfig.api);
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

    it('accepts valid brand preset, custom color overrides, font pairings, and socialCardMode', () => {
      const parsed = appConfigSchema.parse({
        ...appConfig,
        brand: {
          ...appConfig.brand,
          preset: 'emerald',
          primaryColor: '#047857',
          accentColor: '#0ea5e9',
          fontPreset: 'editorial',
          rtlFontPreset: 'noto-arabic',
          socialCardMode: 'branded',
        },
      });
      expect(parsed.brand.preset).toBe('emerald');
      expect(parsed.brand.primaryColor).toBe('#047857');
      expect(parsed.brand.fontPreset).toBe('editorial');
      expect(parsed.brand.rtlFontPreset).toBe('noto-arabic');
      expect(parsed.brand.socialCardMode).toBe('branded');
    });

    it('rejects unknown brand preset, font preset, or socialCardMode values', () => {
      expect(() =>
        appConfigSchema.parse({
          ...appConfig,
          brand: { ...appConfig.brand, preset: 'neon' },
        })
      ).toThrow();
      expect(() =>
        appConfigSchema.parse({
          ...appConfig,
          brand: { ...appConfig.brand, fontPreset: 'comic-sans' },
        })
      ).toThrow();
      expect(() =>
        appConfigSchema.parse({
          ...appConfig,
          brand: { ...appConfig.brand, socialCardMode: 'screenshot' },
        })
      ).toThrow();
    });
  });
});
