import type { APIRoute } from 'astro';
import { siteConfig } from '@/libs/config/app';

/**
 * The web app manifest is generated from `app.config.json`, so the app name,
 * colours, and icons are defined once and cannot drift from the metadata the
 * page emits.
 */
export const GET: APIRoute = async () => {
  const manifest = {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: siteConfig.backgroundColor,
    theme_color: siteConfig.themeColor,
    icons: siteConfig.icons.map(({ file, size, purpose }) => ({
      src: `/${file}`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose,
    })),
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
