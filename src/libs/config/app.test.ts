import { describe, it, expect } from 'vitest';
import {
  siteConfig,
  appConfig,
  appConfigSchema,
  brandLogoSchema,
  themeModeSchema,
  navbarConfigSchema,
  topBannerConfigSchema,
  quickContactConfigSchema,
  motionConfigSchema,
  uiNavigationSchema,
  uiConfigSchema,
  blogConfigSchema,
  cookieConfigSchema,
  socialConfigSchema,
  businessConfigSchema,
  analyticsConfigSchema,
  redirectsConfigSchema,
  apiEndpointsSchema,
  apiRedirectsSchema,
  apiConfigSchema,
  authorProfileSchema,
  collectionFieldSchema,
  contentTypeSchema,
  defaultUiConfig,
  defaultSocialConfig,
  defaultBusinessConfig,
  defaultAnalyticsConfig,
  defaultApiConfig,
  POSTS_PER_PAGE,
  UI_CONFIG,
  BLOG_CONFIG,
  COOKIE_CONFIG,
  SOCIAL_CONFIG,
  BUSINESS_CONFIG,
  ANALYTICS_CONFIG,
  REDIRECTS_CONFIG,
  API_CONFIG,
  type ApiConfig,
  type BlogConfig,
  type ThemeMode,
} from './app';
import { mergeLayeredConfig, sanitizeCmsConfig } from './defaults';
import { pageSectionItemSchema } from '@/libs/ui/sections';

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

    it('validates navbar offset, scroll threshold, and banner offset defaults and overrides', () => {
      const defaults = navbarConfigSchema.parse({});
      expect(defaults).toEqual({
        initialTopOffset: 16,
        stickyScrollThreshold: 0,
        stickyTopOffset: 12,
        autoBannerOffset: true,
        manualBannerOffset: 0,
      });

      const custom = navbarConfigSchema.parse({
        initialTopOffset: 28,
        stickyScrollThreshold: 140,
        stickyTopOffset: 8,
        autoBannerOffset: false,
        manualBannerOffset: 48,
      });
      expect(custom.initialTopOffset).toBe(28);
      expect(custom.stickyScrollThreshold).toBe(140);
      expect(custom.stickyTopOffset).toBe(8);
      expect(custom.autoBannerOffset).toBe(false);
      expect(custom.manualBannerOffset).toBe(48);

      expect(() => navbarConfigSchema.parse({ initialTopOffset: -4 })).toThrow();
      expect(() => navbarConfigSchema.parse({ stickyScrollThreshold: -1 })).toThrow();
    });

    it('validates site topBanner defaults, localized copy, heightPx bounds, and stacked items', () => {
      const defaults = topBannerConfigSchema.parse({});
      expect(defaults.enabled).toBe(false);
      expect(defaults.variant).toBe('primary');
      expect(defaults.dismissible).toBe(true);
      expect(defaults.items).toEqual([]);

      const multi = topBannerConfigSchema.parse({
        enabled: true,
        items: [
          {
            id: 'promo-spring',
            variant: 'accent',
            heightPx: 40,
            messageByLocale: { en: 'Spring update', fa: 'نسخه بهاره منتشر شد' },
            ctaHrefByLocale: { en: '/pricing/', fa: '/fa/تعرفه‌ها/' },
            dismissible: false,
          },
        ],
      });
      expect(multi.enabled).toBe(true);
      expect(multi.items).toHaveLength(1);
      expect(multi.items[0]?.heightPx).toBe(40);
      expect(multi.items[0]?.messageByLocale.fa).toBe('نسخه بهاره منتشر شد');
      expect(multi.items[0]?.dismissible).toBe(false);

      expect(() =>
        topBannerConfigSchema.parse({ items: [{ id: 'too-short', heightPx: 10 }] })
      ).toThrow();
      expect(appConfig.ui.topBanner.items).toHaveLength(2);
      expect(appConfig.ui.topBanner.items[0]).toMatchObject({
        id: 'site-notice',
        heightPx: 40,
        dismissible: false,
      });
      expect(appConfig.ui.topBanner.items[1]).toMatchObject({
        id: 'site-announcement',
        heightPx: 32,
        dismissible: true,
      });
    });

    it('validates motion config defaults (0ms reveal delay, 1600ms reveal duration) and bounds', () => {
      const defaults = motionConfigSchema.parse({});
      expect(defaults).toEqual({
        revealDelayMs: 0,
        revealDurationMs: 1600,
        revealDistancePx: 56,
        revealSmallDistancePx: 18,
        revealEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        staggerStepMs: 80,
        rootMargin: '0px 0px -8% 0px',
        mobileBehavior: 'lightweight',
        smoothScroll: true,
        smoothScrollLerp: 0.125,
      });

      expect(appConfig.ui.topBanner.enabled).toBe(true);
      expect(appConfig.ui.motion.revealDelayMs).toBe(0);
      expect(appConfig.ui.motion.revealDurationMs).toBe(1600);

      const custom = motionConfigSchema.parse({
        revealDelayMs: 250,
        revealDurationMs: 900,
        revealDistancePx: 32,
        revealSmallDistancePx: 12,
        revealEasing: 'ease-out',
        staggerStepMs: 60,
        rootMargin: '0px 0px -10% 0px',
        mobileBehavior: 'full',
        smoothScroll: false,
        smoothScrollLerp: 0.2,
      });
      expect(custom.revealDelayMs).toBe(250);
      expect(custom.mobileBehavior).toBe('full');
      expect(custom.smoothScroll).toBe(false);

      expect(() => motionConfigSchema.parse({ revealDelayMs: -1 })).toThrow();
      expect(() => motionConfigSchema.parse({ revealDurationMs: 50 })).toThrow();
      expect(() => motionConfigSchema.parse({ revealEasing: 'ease; color: red' })).toThrow();
      expect(() => motionConfigSchema.parse({ smoothScrollLerp: 1.5 })).toThrow();
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

    it('validates optional post-submit form redirects', () => {
      expect(apiRedirectsSchema.parse({})).toEqual({ contact: '', newsletter: '' });
      const parsed = apiConfigSchema.parse({
        redirects: { contact: '/thank-you/', newsletter: '/subscribed/' },
      });
      expect(parsed.redirects).toEqual({
        contact: '/thank-you/',
        newsletter: '/subscribed/',
      });
    });
  });

  describe('authorProfileSchema', () => {
    it('validates structured E-E-A-T author profiles with optional social URLs', () => {
      const profile = authorProfileSchema.parse({
        name: 'Ali Rezaei',
        url: '/fa/درباره-ما/',
        jobTitle: 'Lead Engineer',
        sameAs: ['https://github.com/alirezaei'],
      });
      expect(profile.name).toBe('Ali Rezaei');
      expect(profile.sameAs).toEqual(['https://github.com/alirezaei']);
      expect(() => authorProfileSchema.parse({ name: '' })).toThrow();
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

  describe('three-tier CMS isolation, banner schedule, quickContact, analytics & redirects', () => {
    it('sanitizes incomplete CMS fields and applies 3-tier precedence', () => {
      const cleaned = sanitizeCmsConfig({
        site: {
          contactEmail: '',
        },
        business: {
          phone: '+98 21 1234',
          geo: { lat: '', lng: null },
        },
        ui: {
          topBanner: {
            enabled: false,
            startsAt: '',
            dismissMode: '',
            badgeByLocale: { en: '', fa: 'جدید' },
            messageByLocale: { en: '', fa: '' },
          },
        },
        redirects: [
          { from: '/old/', to: '' },
          { from: '/legacy', to: '/about/', status: 301 },
        ],
      });
      expect(cleaned.site).toEqual({});
      expect((cleaned.business as Record<string, unknown>).geo).toBeUndefined();
      const topBannerClean = (cleaned.ui as { topBanner: Record<string, unknown> }).topBanner;
      expect(topBannerClean.badgeByLocale).toEqual({ fa: 'جدید' });
      expect(topBannerClean.messageByLocale).toBeUndefined();
      expect((cleaned.redirects as unknown[]).length).toBe(1);

      const merged = mergeLayeredConfig<Record<string, unknown>>(
        {
          site: { contactEmail: 'team@core.example' },
          business: { phone: '000', legalName: 'Core Co' },
          brand: { preset: 'indigo' },
          ui: { topBanner: { badgeByLocale: { en: 'New', fa: 'تازه' } } },
        },
        { business: { phone: '111' } },
        {
          site: { contactEmail: '' },
          business: { phone: '222', geo: { lat: '35.7', lng: '51.4' } },
          ui: { topBanner: { badgeByLocale: { en: '', fa: 'جدید' } } },
        }
      );
      expect((merged.site as Record<string, unknown>).contactEmail).toBe('team@core.example');
      expect((merged.ui as { topBanner: { badgeByLocale: Record<string, string> } }).topBanner.badgeByLocale).toEqual({
        en: 'New',
        fa: 'جدید',
      });
      expect((merged.business as Record<string, unknown>).phone).toBe('222');
      expect((merged.business as Record<string, unknown>).legalName).toBe('Core Co');
      expect((merged.business as { geo: { lat: number; lng: number } }).geo).toEqual({
        lat: 35.7,
        lng: 51.4,
      });
    });

    it('validates banner scheduling dates, persistent dismiss TTL/version, and quickContact', () => {
      const scheduled = topBannerConfigSchema.parse({
        enabled: true,
        startsAt: '2026-01-01',
        endsAt: '2026-12-31',
        dismissMode: 'persistent',
        dismissTtlDays: 14,
        dismissVersion: 2,
      });
      expect(scheduled.dismissMode).toBe('persistent');
      expect(scheduled.dismissTtlDays).toBe(14);
      expect(scheduled.dismissVersion).toBe(2);

      expect(() =>
        topBannerConfigSchema.parse({
          startsAt: '2026-05-10',
          endsAt: '2026-05-01',
        })
      ).toThrow();
      expect(() =>
        topBannerConfigSchema.parse({
          startsAt: 'not-a-date',
        })
      ).toThrow();
      expect(() =>
        topBannerConfigSchema.parse({
          dismissTtlDays: 400,
        })
      ).toThrow();

      const qc = quickContactConfigSchema.parse({});
      expect(qc).toEqual({
        enabled: true,
        mobileOnly: true,
        channels: ['phone', 'whatsapp', 'telegram'],
      });
    });

    it('validates consent-gated analytics provider IDs, GTM, Consent Mode, and redirects schema', () => {
      expect(analyticsConfigSchema.parse({})).toEqual(defaultAnalyticsConfig);
      expect(ANALYTICS_CONFIG).toEqual(siteConfig.analytics);
      expect(REDIRECTS_CONFIG).toEqual(siteConfig.redirects);

      const validAnalytics = analyticsConfigSchema.parse({
        ga4Id: 'G-ABCD1234EF',
        gtmId: 'GTM-AB12CD3',
        plausibleDomain: 'example.com',
        umamiWebsiteId: '550e8400-e29b-41d4-a716-446655440000',
        umamiSrc: 'https://analytics.example.com/script.js',
        clarityId: 'abc123defg',
        consentMode: true,
        allowCookielessWithoutBanner: true,
      });
      expect(validAnalytics.ga4Id).toBe('G-ABCD1234EF');
      expect(validAnalytics.gtmId).toBe('GTM-AB12CD3');
      expect(validAnalytics.consentMode).toBe(true);
      expect(validAnalytics.allowCookielessWithoutBanner).toBe(true);

      expect(() => analyticsConfigSchema.parse({ ga4Id: 'UA-12345-1' })).toThrow();
      expect(() => analyticsConfigSchema.parse({ gtmId: 'GTM-1' })).toThrow();
      expect(() =>
        analyticsConfigSchema.parse({ umamiWebsiteId: '550e8400-e29b-41d4-a716-446655440000' })
      ).toThrow();

      expect(
        redirectsConfigSchema.parse([
          { from: '/old', to: '/about/', status: 301 },
          { from: '/old-blog/*', to: '/blog/:splat', status: 301 },
        ])
      ).toHaveLength(2);
      expect(() =>
        redirectsConfigSchema.parse([{ from: '/same', to: '/same/', status: 301 }])
      ).toThrow();
    });
  });

  describe('declarative collectionFieldSchema & contentTypeSchema', () => {
    it('validates config-defined collection fields, filter modes, and CMS locale maps', () => {
      const parsed = contentTypeSchema.parse({
        enabled: true,
        base: 'gallery',
        index: true,
        paginated: true,
        perPage: 12,
        labels: { en: 'Gallery', fa: 'گالری آثار' },
        descriptions: { en: 'Browse artworks', fa: 'مرور آثار هنری' },
        sortBy: 'year',
        sortOrder: 'desc',
        card: { layout: 'gallery', aspectRatio: 'square', badgeField: 'medium', badgeLimit: 2 },
        fields: [
          {
            name: 'medium',
            type: 'enum',
            options: ['oil', 'digital'],
            required: true,
            labels: { en: 'Medium', fa: 'تکنیک' },
            filter: { enabled: true, mode: 'single', allLabel: { en: 'All', fa: 'همه' } },
            showOnCard: 'badge',
          },
          {
            name: 'year',
            type: 'number',
            min: 1990,
            max: 2100,
            filter: { enabled: true, mode: 'range' },
            showOnCard: 'meta',
          },
        ],
      });

      expect(parsed.base).toBe('gallery');
      expect(parsed.perPage).toBe(12);
      expect(parsed.fields).toHaveLength(2);

      // Enum without options must fail
      expect(() =>
        collectionFieldSchema.parse({
          name: 'status',
          type: 'enum',
        })
      ).toThrow();

      // Duplicate filter URL params within one collection must fail
      expect(() =>
        contentTypeSchema.parse({
          fields: [
            { name: 'a', type: 'string', filter: { enabled: true, mode: 'single', param: 'shared' } },
            { name: 'b', type: 'string', filter: { enabled: true, mode: 'single', param: 'shared' } },
          ],
        })
      ).toThrow();

      // Sanitizer strips empty strings from descriptions/placeholder/allLabel maps
      const clean = sanitizeCmsConfig({
        content: {
          types: {
            gallery: {
              descriptions: { en: '', fa: 'توضیح' },
              search: { placeholder: { en: '', fa: 'جستجو...' } },
            },
          },
        },
      });
      const cleanGallery = ((clean.content as Record<string, unknown>).types as Record<string, unknown>)
        .gallery as Record<string, unknown>;
      expect(cleanGallery.descriptions).toEqual({ fa: 'توضیح' });
      expect((cleanGallery.search as Record<string, unknown>).placeholder).toEqual({ fa: 'جستجو...' });
    });
  });

  describe('uiNavigationSchema & declarative SectionComposer config', () => {
    it('validates ui.navigation.pages and ui.navigation.footerColumns', () => {
      expect(uiNavigationSchema.parse({})).toEqual({});

      const parsed = uiNavigationSchema.parse({
        pages: [{ group: 'services', icon: 'sparkles', labels: { en: 'Services', fa: 'خدمات' } }],
        footerColumns: [
          {
            key: 'support',
            titles: { en: 'Support' },
            items: [{ group: 'contact', label: 'Contact Us' }],
          },
        ],
      });
      expect(parsed.pages).toHaveLength(1);
      expect(parsed.footerColumns?.[0]?.items).toHaveLength(1);
      expect(() => uiNavigationSchema.parse({ pages: [{ group: '' }] })).toThrow();
    });

    it('validates ui.homeSections and pageSectionItemSchema across registered blocks', () => {
      const section = pageSectionItemSchema.parse({
        block: 'LandingHeroSplit',
        props: { title: 'Hello', primaryCta: { label: 'Start', href: '/contact/' } },
      });
      expect(section.block).toBe('LandingHeroSplit');
      expect(() =>
        pageSectionItemSchema.parse({ block: 'NonExistentBlock', props: {} })
      ).toThrow();

      const uiParsed = uiConfigSchema.parse({
        homeSections: [{ block: 'CtaBanner', props: { title: 'Ready?' } }],
      });
      expect(uiParsed.homeSections).toHaveLength(1);
    });
  });
});
