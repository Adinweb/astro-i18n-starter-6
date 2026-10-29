import type { APIRoute } from 'astro';
import { getSiteRoutes } from '@/libs/content/service';
import { absoluteUrl } from '@/libs/config/app';
import { DEFAULT_LOCALE } from '@/i18n/locales';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const routes = await getSiteRoutes();

  const latestBlogModified = new Map<string, Date>();
  for (const route of routes) {
    if (route.props.routeType !== 'blog-entry') continue;
    const candidate = route.props.entry.data.updatedAt ?? route.props.entry.data.publishedAt;
    const previous = latestBlogModified.get(route.props.locale);
    if (!previous || candidate.getTime() > previous.getTime()) {
      latestBlogModified.set(route.props.locale, candidate);
    }
  }

  const urlEntries = routes
    .map((route) => {
      const locUrl = escapeXml(absoluteUrl(route.props.url));
      const defaultAlternate = route.props.alternates[DEFAULT_LOCALE];
      const xDefaultTag = defaultAlternate
        ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(defaultAlternate))}" />`
        : '';

      const alternateTags = Object.entries(route.props.alternates)
        .filter(([, altPath]) => Boolean(altPath))
        .map(([locale, altPath]) => {
          const altHref = escapeXml(absoluteUrl(altPath!));
          return `    <xhtml:link rel="alternate" hreflang="${escapeXml(locale)}" href="${altHref}" />`;
        })
        .join('\n');

      const entryData = route.props.entry?.data;
      const modified =
        entryData?.updatedAt ??
        entryData?.publishedAt ??
        (route.props.routeType === 'blog-index'
          ? latestBlogModified.get(route.props.locale)
          : undefined);
      const lastmod = modified ? `\n    <lastmod>${modified.toISOString()}</lastmod>` : '';
      const changefreq = route.props.routeType === 'page' ? 'monthly' : 'weekly';

      return `  <url>
    <loc>${locUrl}</loc>
${alternateTags}${xDefaultTag}${lastmod}
    <changefreq>${changefreq}</changefreq>
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
