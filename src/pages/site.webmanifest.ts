import type { APIRoute } from 'astro';
import { siteConfig } from '@/libs/config/app';
import { resolveLocalizedSiteName } from '@/libs/content/seo';
import { DEFAULT_LOCALE, getLocaleMeta } from '@/i18n/locales';
import * as m from '@/paraglide/messages';

/**
 * The web app manifest is generated from `app.config.json` and `DEFAULT_LOCALE`,
 * so the app name, language, direction, colours, description, and icons are
 * derived from one source of truth regardless of which locale is default.
 */
export const GET: APIRoute = async () => {
  const meta = getLocaleMeta(DEFAULT_LOCALE);
  const localizedName = resolveLocalizedSiteName(
    siteConfig,
    DEFAULT_LOCALE,
    m.site_name({}, { locale: DEFAULT_LOCALE })
  );
  const icons = siteConfig.icons.flatMap(({ file, size, purpose }) => {
    const purposes = String(purpose || 'any')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const uniquePurposes = purposes.length > 0 ? [...new Set(purposes)] : ['any'];
    return uniquePurposes.map((entryPurpose) => ({
      src: `/${file}`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: entryPurpose,
    }));
  });

  const manifest = {
    name: localizedName,
    short_name: siteConfig.shortName,
    description: m.site_description({}, { locale: DEFAULT_LOCALE }) || siteConfig.description,
    lang: meta.htmlLang,
    dir: meta.dir,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: siteConfig.backgroundColor,
    theme_color: siteConfig.themeColor,
    icons,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
