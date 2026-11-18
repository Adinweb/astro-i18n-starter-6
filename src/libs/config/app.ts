import heroPhoto from '@/assets/hero/hero-0.jpg';
import { z } from 'astro/zod';
import rawConfig from '../../../app.config.json';
import clientConfig from '../../../client/config.json';
import { COOKIE_CONFIG_DEFAULTS, deepMergeConfig } from './defaults';
import {
  BRAND_PRESET_KEYS,
  FONT_PRESET_KEYS,
  RTL_FONT_PRESET_KEYS,
  SOCIAL_CARD_MODES,
} from './theme';

/**
 * Typed access to the application's merged configuration (`app.config.json` +
 * `client/config.json`).
 *
 * Upstream defaults live in `app.config.json`; client-specific overrides live
 * cleanly in `client/config.json`. This module validates the merged result once
 * and exposes the typed config the app consumes.
 *
 * Framework-only settings stay in `astro.config.mjs`; locale configuration stays
 * in `client/locales.json` (exposed via `src/i18n/locales.ts`).
 */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex colour, for example "#4338ca".');

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

export const defaultUiConfig: UiConfig = {
  ctaPage: 'pricing',
  showSearch: true,
  showThemeToggle: true,
  showLanguageSwitcher: true,
  showTopLoadingBar: true,
  stickyHeader: true,
};

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
  api: apiConfigSchema.default(defaultApiConfig),
  server: z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
  }),
});

const mergedRawConfig = deepMergeConfig(
  rawConfig as Record<string, unknown>,
  clientConfig as Record<string, unknown>
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
