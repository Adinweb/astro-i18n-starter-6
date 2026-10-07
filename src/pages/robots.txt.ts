import type { APIRoute } from 'astro';
import { siteConfig } from '@/libs/config/site';

export const GET: APIRoute = async () => {
  const sitemapUrl = new URL('/sitemap.xml', siteConfig.url).href;

  const text = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
