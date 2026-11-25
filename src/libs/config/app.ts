import heroPhoto from '@/assets/hero/hero-0.jpg';
import { z } from 'astro/zod';
import rawConfig from '../../../app.config.json';
import clientConfig from '../../../client/config.json';
import cmsConfig from '../../../client/cms.json';
import { validateRedirects } from '../content/redirects';
import {
  ANALYTICS_CONFIG_DEFAULTS,
  COOKIE_CONFIG_DEFAULTS,
  MOTION_CONFIG_DEFAULTS,
  NAVBAR_CONFIG_DEFAULTS,
  QUICK_CONTACT_CONFIG_DEFAULTS,
  REDIRECTS_CONFIG_DEFAULTS,
  TOP_BANNER_CONFIG_DEFAULTS,
  UI_CONFIG_DEFAULTS,
  mergeLayeredConfig,
} from './defaults';
import {
  BRAND_PRESET_KEYS,
  FONT_PRESET_KEYS,
  RTL_FONT_PRESET_KEYS,
  SOCIAL_CARD_MODES,
} from './theme';

/**
 * Typed access to the application's three-tier merged configuration
 * (`app.config.json` -> `client/config.json` -> `client/cms.json`).
 *
 * Upstream defaults live in `app.config.json`; developer overrides live in
 * `client/config.json`; non-technical client/CMS overrides live in `client/cms.json`.
 * This module validates the merged result once and exposes the typed config the app consumes.
 *
 * Framework-only settings stay in `astro.config.mjs`; locale configuration stays
 * in `client/locales.json` (exposed via `src/i18n/locales.ts`).
 */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex colour, for example "#4338ca".');

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/i;

function isValidScheduleString(value: string): boolean {
  const dateOnlyMatch = DATE_ONLY_RE.exec(value);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return (
      dt.getUTCFullYear() === year &&
      dt.getUTCMonth() === month - 1 &&
      dt.getUTCDate() === day
    );
  }
  if (!ISO_DATETIME_RE.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function parseScheduleMs(value: string, bound: 'start' | 'end'): number {
  if (DATE_ONLY_RE.test(value)) {
    return Date.parse(bound === 'start' ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`);
  }
  return Date.parse(value);
}

const scheduleDateSchema = z
  .string()
  .trim()
  .refine(isValidScheduleString, 'Use a valid ISO date ("YYYY-MM-DD") or ISO datetime ("YYYY-MM-DDTHH:mm:ssZ").');

const brandIconSchema = z.object({
  file: z.string().min(1),
  size: z.number().int().positive(),
  purpose: z.string().min(1),
});

export const brandLogoSchema = z.object({
  light: z.string().optional().default(''),
  dark: z.string().optional().default(''),
  alt: z.string().optional().default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  showText: z.boolean().default(true),
});

export const themeModeSchema = z.enum(['system', 'light', 'dark']);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const navbarConfigSchema = z.object({
  /** Initial distance (px) from the top of the page (or below the top banner region when autoBannerOffset is true). */
  initialTopOffset: z.number().min(0).max(400).default(NAVBAR_CONFIG_DEFAULTS.initialTopOffset),
  /** Scroll distance (px) after which the navbar switches to sticky (fixed) positioning. */
  stickyScrollThreshold: z
    .number()
    .min(0)
    .max(2000)
    .default(NAVBAR_CONFIG_DEFAULTS.stickyScrollThreshold),
  /** Distance (px) from the top of the viewport when the navbar is in sticky state. */
  stickyTopOffset: z.number().min(0).max(400).default(NAVBAR_CONFIG_DEFAULTS.stickyTopOffset),
  /** Automatically measure top banner(s) height via ResizeObserver so the navbar never overlaps them. */
  autoBannerOffset: z.boolean().default(NAVBAR_CONFIG_DEFAULTS.autoBannerOffset),
  /** Manual top banner height offset (px) applied when autoBannerOffset is false. */
  manualBannerOffset: z
    .number()
    .min(0)
    .max(600)
    .default(NAVBAR_CONFIG_DEFAULTS.manualBannerOffset),
});
export type NavbarConfig = z.infer<typeof navbarConfigSchema>;

const topBannerVariantSchema = z.enum([
  'primary',
  'hero',
  'surface',
  'accent',
  'info',
  'warning',
]);
export type TopBannerVariant = z.infer<typeof topBannerVariantSchema>;

const topBannerDismissModeSchema = z.enum(['session', 'persistent']);

const localizedStringMapSchema = z.record(z.string(), z.string());

const topBannerScheduleRefinement = (
  val: { startsAt?: string; endsAt?: string },
  ctx: z.RefinementCtx
) => {
  if (val.startsAt && val.endsAt) {
    const startMs = parseScheduleMs(val.startsAt, 'start');
    const endMs = parseScheduleMs(val.endsAt, 'end');
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Banner "endsAt" must not be earlier than "startsAt".',
      });
    }
  }
};

const topBannerItemSchema = z
  .object({
    id: z.string().min(1).default('site-announcement'),
    enabled: z.boolean().default(true),
    variant: topBannerVariantSchema.default('primary'),
    icon: z.string().optional().default('sparkles'),
    badge: z.string().optional().default(''),
    badgeByLocale: localizedStringMapSchema.optional().default({}),
    message: z.string().optional().default(''),
    messageByLocale: localizedStringMapSchema.optional().default({}),
    ctaLabel: z.string().optional().default(''),
    ctaLabelByLocale: localizedStringMapSchema.optional().default({}),
    ctaHref: z.string().optional().default(''),
    ctaHrefByLocale: localizedStringMapSchema.optional().default({}),
    external: z.boolean().default(false),
    dismissible: z.boolean().default(true),
    dismissMode: topBannerDismissModeSchema.default('session'),
    dismissTtlDays: z.number().int().min(1).max(365).optional(),
    dismissVersion: z.number().int().min(1).default(1),
    startsAt: scheduleDateSchema.optional(),
    endsAt: scheduleDateSchema.optional(),
    heightPx: z.number().int().min(24).max(160).optional(),
    excludePaths: z.array(z.string()).optional().default([]),
  })
  .superRefine(topBannerScheduleRefinement);
export type TopBannerItemConfig = z.infer<typeof topBannerItemSchema>;

export const topBannerConfigSchema = z
  .object({
    enabled: z.boolean().default(TOP_BANNER_CONFIG_DEFAULTS.enabled),
    id: z.string().min(1).default(TOP_BANNER_CONFIG_DEFAULTS.id),
    variant: topBannerVariantSchema.default(TOP_BANNER_CONFIG_DEFAULTS.variant),
    icon: z.string().optional().default(TOP_BANNER_CONFIG_DEFAULTS.icon),
    badge: z.string().optional().default(''),
    badgeByLocale: localizedStringMapSchema.optional().default({}),
    message: z.string().optional().default(''),
    messageByLocale: localizedStringMapSchema.optional().default({}),
    ctaLabel: z.string().optional().default(''),
    ctaLabelByLocale: localizedStringMapSchema.optional().default({}),
    ctaHref: z.string().optional().default(''),
    ctaHrefByLocale: localizedStringMapSchema.optional().default({}),
    external: z.boolean().default(false),
    dismissible: z.boolean().default(true),
    dismissMode: topBannerDismissModeSchema.default(TOP_BANNER_CONFIG_DEFAULTS.dismissMode),
    dismissTtlDays: z.number().int().min(1).max(365).optional(),
    dismissVersion: z.number().int().min(1).default(TOP_BANNER_CONFIG_DEFAULTS.dismissVersion),
    startsAt: scheduleDateSchema.optional(),
    endsAt: scheduleDateSchema.optional(),
    heightPx: z.number().int().min(24).max(160).optional(),
    excludePaths: z.array(z.string()).optional().default([]),
    items: z.array(topBannerItemSchema).optional().default([]),
  })
  .superRefine(topBannerScheduleRefinement);

const quickContactChannelSchema = z.enum(['phone', 'whatsapp', 'telegram']);

export const quickContactConfigSchema = z.object({
  enabled: z.boolean().default(QUICK_CONTACT_CONFIG_DEFAULTS.enabled),
  mobileOnly: z.boolean().default(QUICK_CONTACT_CONFIG_DEFAULTS.mobileOnly),
  channels: z
    .array(quickContactChannelSchema)
    .default(QUICK_CONTACT_CONFIG_DEFAULTS.channels),
});
export type QuickContactConfig = z.infer<typeof quickContactConfigSchema>;

export const motionConfigSchema = z.object({
  /** Global pre-reveal delay (ms) before ChronoTrig reveal animations begin. */
  revealDelayMs: z.number().min(0).max(5000).default(MOTION_CONFIG_DEFAULTS.revealDelayMs),
  /** Duration (ms) of standard ChronoTrig reveal entrance animations. */
  revealDurationMs: z.number().min(100).max(5000).default(MOTION_CONFIG_DEFAULTS.revealDurationMs),
  /** Slide travel distance (px) for standard vertical and directional reveals. */
  revealDistancePx: z.number().min(0).max(240).default(MOTION_CONFIG_DEFAULTS.revealDistancePx),
  /** Subtle slide travel distance (px) for `.fadeInUpSm` and `.blurIn` reveals. */
  revealSmallDistancePx: z
    .number()
    .min(0)
    .max(120)
    .default(MOTION_CONFIG_DEFAULTS.revealSmallDistancePx),
  /** CSS easing curve used by ChronoTrig entrance animations (`--trig-ease`). */
  revealEasing: z
    .string()
    .trim()
    .min(1)
    .regex(/^[^;\n{}]+$/, 'Use a valid CSS timing function without semicolons or braces.')
    .default(MOTION_CONFIG_DEFAULTS.revealEasing),
  /** Default delay step (ms) between `[data-trig-stagger]` children when not overridden per container. */
  staggerStepMs: z.number().min(0).max(1000).default(MOTION_CONFIG_DEFAULTS.staggerStepMs),
  /** Default IntersectionObserver rootMargin applied to ChronoTrig triggers. */
  rootMargin: z.string().trim().min(1).default(MOTION_CONFIG_DEFAULTS.rootMargin),
  /** ChronoTrig behavior on mobile/tablet viewports. */
  mobileBehavior: z
    .enum(['lightweight', 'disable', 'full'])
    .default(MOTION_CONFIG_DEFAULTS.mobileBehavior),
  /** Enables Lenis smooth scrolling (when false, native scroll is preserved). */
  smoothScroll: z.boolean().default(MOTION_CONFIG_DEFAULTS.smoothScroll),
  /** Lenis wheel interpolation factor (`0.02`–`1`). */
  smoothScrollLerp: z
    .number()
    .min(0.02)
    .max(1)
    .default(MOTION_CONFIG_DEFAULTS.smoothScrollLerp),
});
export type MotionConfig = z.infer<typeof motionConfigSchema>;

export const uiConfigSchema = z.object({
  /**
   * Content group the header and drawer CTA (the "Get Started" button) links
   * to. It is a page group name, so the CTA hides itself automatically when
   * that page is unpublished, and any published page can become its target.
   */
  ctaPage: z.string().min(1).default('pricing'),
  showSearch: z.boolean().default(true),
  showThemeToggle: z.boolean().default(true),
  showLanguageSwitcher: z.boolean().default(true),
  showTopLoadingBar: z.boolean().default(true),
  stickyHeader: z.boolean().default(true),
  navbar: navbarConfigSchema.default(NAVBAR_CONFIG_DEFAULTS),
  topBanner: topBannerConfigSchema.default(TOP_BANNER_CONFIG_DEFAULTS),
  quickContact: quickContactConfigSchema.default(QUICK_CONTACT_CONFIG_DEFAULTS),
  motion: motionConfigSchema.default(MOTION_CONFIG_DEFAULTS),
});
export type UiConfig = z.infer<typeof uiConfigSchema>;

export const blogConfigSchema = z.object({
  postsPerPage: z.number().int().positive(),
  showReadingTime: z.boolean().default(true),
  showTableOfContents: z.boolean().default(true),
  showRelatedPosts: z.boolean().default(true),
});
export type BlogConfig = z.infer<typeof blogConfigSchema>;

/**
 * One content type (a content collection plus the routes it owns).
 *
 * `base` is the route segment the type lives under and doubles as the URL of
 * its index. `pages` is the page system itself and always owns the root, so its
 * base stays empty.
 */
const contentTypeSchema = z.object({
  enabled: z.boolean().default(true),
  base: z.string().default(''),
  index: z.boolean().default(true),
  paginated: z.boolean().default(false),
  feed: z.boolean().default(false),
  nav: z.boolean().default(true),
});

const contentConfigSchema = z.object({
  types: z.record(z.string(), contentTypeSchema).default({}),
});

export const cookieConfigSchema = z.object({
  enabled: z.boolean().default(true),
  consentVersion: z.number().int().positive().default(1),
  storageKey: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Storage key must contain only ASCII letters, digits, hyphens, or underscores.'
    )
    .default('cookie_consent'),
  expirationDays: z.number().int().positive().max(400).default(180),
});
export type CookieConfig = z.infer<typeof cookieConfigSchema>;

export const socialConfigSchema = z.object({
  github: z.string().optional().default(''),
  twitter: z.string().optional().default(''),
  linkedin: z.string().optional().default(''),
  instagram: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
});
export type SocialConfig = z.infer<typeof socialConfigSchema>;

export const businessConfigSchema = z.object({
  type: z
    .enum(['Organization', 'LocalBusiness', 'ProfessionalService', 'MedicalBusiness', 'Store'])
    .default('Organization'),
  legalName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  whatsapp: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  country: z.string().optional().default(''),
  workingHours: z.string().optional().default(''),
  mapEmbedUrl: z.string().optional().default(''),
  geo: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});
export type BusinessConfig = z.infer<typeof businessConfigSchema>;

export const analyticsConfigSchema = z
  .object({
    ga4Id: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .regex(/^G-[A-Z0-9]{4,20}$/i, 'Use a valid GA4 Measurement ID such as "G-XXXXXXXXXX".'),
      ])
      .optional()
      .default(ANALYTICS_CONFIG_DEFAULTS.ga4Id),
    gtmId: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .regex(/^GTM-[A-Z0-9]{4,16}$/i, 'Use a valid Google Tag Manager ID such as "GTM-XXXXXXX".'),
      ])
      .optional()
      .default(ANALYTICS_CONFIG_DEFAULTS.gtmId),
    plausibleDomain: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .min(1)
          .regex(/^[^\s/]+$/, 'Use a hostname such as "example.com".'),
      ])
      .optional()
      .default(ANALYTICS_CONFIG_DEFAULTS.plausibleDomain),
    plausibleSrc: z.url().optional().default(ANALYTICS_CONFIG_DEFAULTS.plausibleSrc),
    umamiWebsiteId: z
      .union([z.literal(''), z.uuid('Use a valid Umami website UUID.')])
      .optional()
      .default(ANALYTICS_CONFIG_DEFAULTS.umamiWebsiteId),
    umamiSrc: z.union([z.literal(''), z.url()]).optional().default(ANALYTICS_CONFIG_DEFAULTS.umamiSrc),
    clarityId: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .regex(/^[a-z0-9]{6,20}$/i, 'Use a valid Microsoft Clarity project ID.'),
      ])
      .optional()
      .default(ANALYTICS_CONFIG_DEFAULTS.clarityId),
    consentMode: z.boolean().optional().default(ANALYTICS_CONFIG_DEFAULTS.consentMode),
    allowCookielessWithoutBanner: z
      .boolean()
      .optional()
      .default(ANALYTICS_CONFIG_DEFAULTS.allowCookielessWithoutBanner),
  })
  .superRefine((val, ctx) => {
    if (val.umamiWebsiteId && !val.umamiSrc) {
      ctx.addIssue({
        code: 'custom',
        path: ['umamiSrc'],
        message: 'Provide "analytics.umamiSrc" when "analytics.umamiWebsiteId" is configured.',
      });
    }
  });
export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>;

const redirectRuleSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  status: z.union([z.literal(301), z.literal(302)]).default(301),
});

export const redirectsConfigSchema = z.array(redirectRuleSchema).superRefine((rules, ctx) => {
  const errors = validateRedirects(rules);
  for (const msg of errors) {
    ctx.addIssue({
      code: 'custom',
      message: msg,
    });
  }
});

const formProviderSchema = z.enum(['custom', 'web3forms', 'formspree', 'basin', 'webhook']);

export const apiEndpointsSchema = z.object({
  contact: z.string().default('/contact'),
  newsletter: z.string().optional(),
});

const contactTopicSchema = z.object({
  value: z.string().min(1),
  label: z.string().optional(),
  labels: z.record(z.string(), z.string()).optional(),
});

export const apiConfigSchema = z.object({
  provider: formProviderSchema.default('custom'),
  baseUrl: z.string().default(''),
  accessKey: z.string().optional().default(''),
  turnstileSiteKey: z.string().optional().default(''),
  timeoutMs: z.number().int().min(1000).max(60000).default(10000),
  endpoints: apiEndpointsSchema.default({ contact: '/contact' }),
  topics: z.array(contactTopicSchema).optional(),
});
export type ApiConfig = z.infer<typeof apiConfigSchema>;

export const defaultUiConfig: UiConfig = UI_CONFIG_DEFAULTS;

export const defaultSocialConfig: SocialConfig = {
  github: '',
  twitter: '',
  linkedin: '',
  instagram: '',
  telegram: '',
};

export const defaultBusinessConfig: BusinessConfig = {
  type: 'Organization',
  legalName: '',
  phone: '',
  whatsapp: '',
  telegram: '',
  address: '',
  city: '',
  country: '',
  workingHours: '',
  mapEmbedUrl: '',
};

export const defaultAnalyticsConfig: AnalyticsConfig = ANALYTICS_CONFIG_DEFAULTS;

export const defaultApiConfig: ApiConfig = {
  provider: 'custom',
  baseUrl: '',
  accessKey: '',
  turnstileSiteKey: '',
  timeoutMs: 10000,
  endpoints: {
    contact: '/contact',
  },
};

export const appConfigSchema = z.object({
  site: z.object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    description: z.string().min(1),
    author: z.string().optional().default('Astro Starter Team'),
    /**
     * Public contact address. It is the destination of the contact form's
     * mailto fallback when `api.baseUrl` (or `PUBLIC_CONTACT_API_URL`) is not
     * configured, so a visitor never reads a developer instruction. Empty means
     * "no address yet": the form then states that inquiries are unavailable.
     */
    contactEmail: z.union([z.literal(''), z.email()]).optional().default(''),
    socialImage: z.object({
      path: z.string().startsWith('/'),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  }),
  brand: z.object({
    defaultTheme: themeModeSchema.default('system'),
    preset: z.enum(BRAND_PRESET_KEYS).optional(),
    primaryColor: hexColor.optional(),
    accentColor: hexColor.optional(),
    fontPreset: z.enum(FONT_PRESET_KEYS).default('system'),
    rtlFontPreset: z.enum(RTL_FONT_PRESET_KEYS).default('vazirmatn'),
    socialCardMode: z.enum(SOCIAL_CARD_MODES).default('artwork'),
    logo: brandLogoSchema.optional(),
    themeColor: hexColor,
    darkThemeColor: hexColor.optional(),
    backgroundColor: hexColor,
    appleTouchIcon: z.object({
      file: z.string().min(1),
      size: z.number().int().positive(),
    }),
    icons: z.array(brandIconSchema).min(1),
  }),
  ui: uiConfigSchema.default(defaultUiConfig),
  blog: blogConfigSchema,
  content: contentConfigSchema.default({ types: {} }),
  cookies: cookieConfigSchema.default(COOKIE_CONFIG_DEFAULTS),
  social: socialConfigSchema.default(defaultSocialConfig),
  business: businessConfigSchema.default(defaultBusinessConfig),
  analytics: analyticsConfigSchema.default(defaultAnalyticsConfig),
  redirects: redirectsConfigSchema.default(REDIRECTS_CONFIG_DEFAULTS),
  api: apiConfigSchema.default(defaultApiConfig),
  server: z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
  }),
});

const mergedRawConfig = mergeLayeredConfig(
  rawConfig as Record<string, unknown>,
  clientConfig as Record<string, unknown>,
  cmsConfig as Record<string, unknown>
);

export const appConfig = appConfigSchema.parse(mergedRawConfig);

const siteConfigSchema = z.object({
  url: z.url(),
  name: z.string().min(1),
  shortName: z.string().min(1),
  description: z.string().min(1),
  author: z.string(),
  contactEmail: z.string(),
  defaultTheme: themeModeSchema,
  preset: z.enum(BRAND_PRESET_KEYS).optional(),
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  fontPreset: z.enum(FONT_PRESET_KEYS),
  rtlFontPreset: z.enum(RTL_FONT_PRESET_KEYS),
  socialCardMode: z.enum(SOCIAL_CARD_MODES),
  logo: brandLogoSchema.optional(),
  themeColor: hexColor,
  darkThemeColor: hexColor,
  backgroundColor: hexColor,
  ogImage: z.string().startsWith('/'),
  ogImageWidth: z.number().int().positive(),
  ogImageHeight: z.number().int().positive(),
  appleTouchIcon: z.string().min(1),
  icons: z.array(brandIconSchema).min(1),
  ui: uiConfigSchema,
  blog: blogConfigSchema,
  cookies: cookieConfigSchema,
  social: socialConfigSchema,
  business: businessConfigSchema,
  analytics: analyticsConfigSchema,
  redirects: redirectsConfigSchema,
  api: apiConfigSchema,
});

const envApiBaseUrl = (import.meta.env.PUBLIC_API_BASE_URL as string | undefined)?.trim();
const envContactEndpoint = (import.meta.env.PUBLIC_CONTACT_API_URL as string | undefined)?.trim();
const envNewsletterEndpoint = (
  import.meta.env.PUBLIC_NEWSLETTER_API_URL as string | undefined
)?.trim();
const envWeb3FormsKey = (import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined)?.trim();
const envTurnstileSiteKey = (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined)?.trim();

export const siteConfig = siteConfigSchema.parse({
  // Astro injects `site` from astro.config.mjs into import.meta.env.SITE.
  // The fallback uses the same dev server port as astro.config.mjs, because
  // both read it from app.config.json.
  url: import.meta.env.SITE || `http://localhost:${appConfig.server.port}`,
  name: appConfig.site.name,
  shortName: appConfig.site.shortName,
  description: appConfig.site.description,
  author: appConfig.site.author,
  contactEmail: appConfig.site.contactEmail,
  defaultTheme: appConfig.brand.defaultTheme,
  preset: appConfig.brand.preset,
  primaryColor: appConfig.brand.primaryColor,
  accentColor: appConfig.brand.accentColor,
  fontPreset: appConfig.brand.fontPreset,
  rtlFontPreset: appConfig.brand.rtlFontPreset,
  socialCardMode: appConfig.brand.socialCardMode,
  ...(appConfig.brand.logo ? { logo: appConfig.brand.logo } : {}),
  /** Browser chrome colour; mirrors `--color-primary` in `src/styles/global.css`. */
  themeColor: appConfig.brand.themeColor,
  /** Browser chrome colour in dark mode; mirrors dark `--color-bg`. */
  darkThemeColor: appConfig.brand.darkThemeColor ?? '#0f172a',
  /** Splash/background colour of an installed app; mirrors `--color-bg`. */
  backgroundColor: appConfig.brand.backgroundColor,
  ogImage: appConfig.site.socialImage.path,
  ogImageWidth: appConfig.site.socialImage.width,
  ogImageHeight: appConfig.site.socialImage.height,
  appleTouchIcon: appConfig.brand.appleTouchIcon.file,
  icons: appConfig.brand.icons,
  ui: appConfig.ui,
  blog: appConfig.blog,
  cookies: appConfig.cookies,
  social: appConfig.social,
  business: appConfig.business,
  analytics: appConfig.analytics,
  redirects: appConfig.redirects,
  api: {
    provider: appConfig.api.provider,
    baseUrl: envApiBaseUrl || appConfig.api.baseUrl,
    accessKey: envWeb3FormsKey || appConfig.api.accessKey,
    turnstileSiteKey: envTurnstileSiteKey || appConfig.api.turnstileSiteKey,
    timeoutMs: appConfig.api.timeoutMs,
    endpoints: {
      contact: envContactEndpoint || appConfig.api.endpoints.contact,
      ...(envNewsletterEndpoint || appConfig.api.endpoints.newsletter
        ? { newsletter: envNewsletterEndpoint || appConfig.api.endpoints.newsletter }
        : {}),
    },
    ...(appConfig.api.topics ? { topics: appConfig.api.topics } : {}),
  },
});

/** How many posts one blog index page holds. */
export const POSTS_PER_PAGE = appConfig.blog.postsPerPage;

/** Direct export for UI feature toggles. */
export const UI_CONFIG = siteConfig.ui;

/** Direct export for blog presentation toggles. */
export const BLOG_CONFIG = siteConfig.blog;

/**
 * Declared content types, keyed by collection name.
 *
 * `src/libs/content/types.ts` turns this into the typed registry the router,
 * navigation, sitemap and CLI share.
 */
export const CONTENT_CONFIG = appConfig.content;

/** Direct export for TDDDG § 25 / DSGVO cookie consent configuration. */
export const COOKIE_CONFIG = siteConfig.cookies;

/** Direct export for external social links. */
export const SOCIAL_CONFIG = siteConfig.social;

/** Direct export for corporate/business metadata & contact details. */
export const BUSINESS_CONFIG = siteConfig.business;

/** Direct export for consent-gated analytics providers. */
export const ANALYTICS_CONFIG = siteConfig.analytics;

/** Direct export for config-driven URL redirects. */
export const REDIRECTS_CONFIG = siteConfig.redirects;

/** Direct export for external headless/microservice API endpoints. */
export const API_CONFIG = siteConfig.api;

/** Id of the hero's `<h1>`, used by `aria-labelledby` on the hero region. */
export const HERO_TITLE_ID = 'page-hero-title';

/**
 * Background used by the hero when a page has no featured image of its own.
 *
 * The photograph is imported straight from `src/assets/`, so Astro hands it
 * over as image metadata: its real dimensions, a hashed URL and the renditions
 * it can optimize. Nothing has to be looked up by path, and no size table has
 * to be kept in sync with the file on disk.
 */
export const DEFAULT_HERO_IMAGE = heroPhoto;

/**
 * Turns a site-relative path into the absolute URL crawlers and feeds need.
 *
 * Canonical links, hreflang, Open Graph images, the sitemap, the feed and the
 * robots file all resolve against `siteConfig.url`, so none of them can drift to
 * a different origin.
 */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteConfig.url).href;
}
