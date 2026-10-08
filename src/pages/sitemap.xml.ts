import type { APIRoute } from 'astro';
import { getSiteRoutes } from '@/libs/content/service';
import { siteConfig } from '@/libs/config/site';
import { DEFAULT_LOCALE } from '@/i18n/locales';

export const GET: APIRoute = async () => {
  const routes = await getSiteRoutes();

  const urlEntries = routes
    .map((route) => {
      const locUrl = new URL(route.props.url, siteConfig.url).href;
      const xDefaultUrl = route.props.alternates[DEFAULT_LOCALE]
        ? new URL(route.props.alternates[DEFAULT_LOCALE], siteConfig.url).href
        : locUrl;

      const alternateTags = Object.entries(route.props.alternates)
        .map(([locale, altPath]) => {
          const altHref = new URL(altPath, siteConfig.url).href;
          return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${altHref}" />`;
        })
        .join('\n');

      return `  <url>
    <loc>${locUrl}</loc>
${alternateTags}
    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />
    <changefreq>weekly</changefreq>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
