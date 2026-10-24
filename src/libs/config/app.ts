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

const appConfigSchema = z.object({
  site: z.object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    description: z.string().min(1),
    socialImage: z.object({
      path: z.string().startsWith('/'),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  }),
  brand: z.object({
    themeColor: hexColor,
    darkThemeColor: hexColor.optional(),
    backgroundColor: hexColor,
    appleTouchIcon: z.object({
      file: z.string().min(1),
      size: z.number().int().positive(),
    }),
    icons: z.array(brandIconSchema).min(1),
  }),
  blog: z.object({
    postsPerPage: z.number().int().positive(),
  }),
  server: z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
  }),
});

const appConfig = appConfigSchema.parse(rawConfig);

const siteConfigSchema = z.object({
  url: z.url(),
  name: z.string().min(1),
  shortName: z.string().min(1),
  description: z.string().min(1),
  themeColor: hexColor,
  darkThemeColor: hexColor,
  backgroundColor: hexColor,
  ogImage: z.string().startsWith('/'),
  ogImageWidth: z.number().int().positive(),
  ogImageHeight: z.number().int().positive(),
  appleTouchIcon: z.string().min(1),
  icons: z.array(brandIconSchema).min(1),
});

export const siteConfig = siteConfigSchema.parse({
  // Astro injects `site` from astro.config.mjs into import.meta.env.SITE.
  // The fallback uses the same dev server port as astro.config.mjs, because
  // both read it from app.config.json.
  url: import.meta.env.SITE || `http://localhost:${appConfig.server.port}`,
  name: appConfig.site.name,
  shortName: appConfig.site.shortName,
  description: appConfig.site.description,
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
});

/** How many posts one blog index page holds. */
export const POSTS_PER_PAGE = appConfig.blog.postsPerPage;

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
