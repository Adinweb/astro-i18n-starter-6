import type { APIRoute } from 'astro';
import { absoluteUrl } from '@/libs/config/app';

export const GET: APIRoute = async () => {
  const sitemapUrl = absoluteUrl('/sitemap.xml');

  const text = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${sitemapUrl}
`;

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
