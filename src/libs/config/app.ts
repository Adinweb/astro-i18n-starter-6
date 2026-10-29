import heroPhoto from '@/assets/hero/hero-0.jpg';
import { z } from 'astro/zod';
import rawConfig from '../../../app.config.json';

/**
 * Typed access to the application's single configuration file.
 *
 * `app.config.json` is the one place that holds values shared by the Astro app
 * and the Node scripts (site metadata, brand colours, social card, blog
 * pagination, dev server). This module validates that file once and exposes the
 * values the app consumes, so a script and a component can never disagree
 * about, say, the default OG image size.
 *
 * Framework-only settings stay in `astro.config.mjs` (site URL env handling,
 * integrations, build output); locale configuration stays in
 * `src/i18n/locales.ts` and `project.inlang/settings.json`.
 */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex colour, for example "#4338ca".');

const brandIconSchema = z.object({
  file: z.string().min(1),
  size: z.number().int().positive(),
  purpose: z.string().min(1),
});

export const themeModeSchema = z.enum(['system', 'light', 'dark']);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const uiConfigSchema = z.object({
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
});
export type SocialConfig = z.infer<typeof socialConfigSchema>;

export const defaultUiConfig: UiConfig = {
  showSearch: true,
  showThemeToggle: true,
  showLanguageSwitcher: true,
  showTopLoadingBar: true,
  stickyHeader: true,
};

const defaultCookieConfig: CookieConfig = {
  enabled: true,
  consentVersion: 1,
  storageKey: 'cookie_consent',
  expirationDays: 180,
};

export const defaultSocialConfig: SocialConfig = {
  github: '',
  twitter: '',
};

export const appConfigSchema = z.object({
  site: z.object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    description: z.string().min(1),
    author: z.string().optional().default('Astro Starter Team'),
    socialImage: z.object({
      path: z.string().startsWith('/'),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  }),
  brand: z.object({
    defaultTheme: themeModeSchema.default('system'),
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
  cookies: cookieConfigSchema.default(defaultCookieConfig),
  social: socialConfigSchema.default(defaultSocialConfig),
  server: z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
  }),
});

export const appConfig = appConfigSchema.parse(rawConfig);

const siteConfigSchema = z.object({
  url: z.url(),
  name: z.string().min(1),
  shortName: z.string().min(1),
  description: z.string().min(1),
  author: z.string(),
  defaultTheme: themeModeSchema,
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
});

export const siteConfig = siteConfigSchema.parse({
  // Astro injects `site` from astro.config.mjs into import.meta.env.SITE.
  // The fallback uses the same dev server port as astro.config.mjs, because
  // both read it from app.config.json.
  url: import.meta.env.SITE || `http://localhost:${appConfig.server.port}`,
  name: appConfig.site.name,
  shortName: appConfig.site.shortName,
  description: appConfig.site.description,
  author: appConfig.site.author,
  defaultTheme: appConfig.brand.defaultTheme,
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
});

/** How many posts one blog index page holds. */
export const POSTS_PER_PAGE = appConfig.blog.postsPerPage;

/** Direct export for UI feature toggles. */
export const UI_CONFIG = siteConfig.ui;

/** Direct export for blog presentation toggles. */
export const BLOG_CONFIG = siteConfig.blog;

/** Direct export for TDDDG §25 / DSGVO cookie consent configuration. */
export const COOKIE_CONFIG = siteConfig.cookies;

/** Direct export for external social links. */
export const SOCIAL_CONFIG = siteConfig.social;

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
