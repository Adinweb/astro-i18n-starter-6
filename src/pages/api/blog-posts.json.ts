import type { APIRoute } from 'astro';
import { buildSerializedBlogCatalog } from '@/libs/content/blog-catalog';

/**
 * Static catalog of published blog posts across all locales.
 * Per-locale catalogs live at `/api/blog-posts/<locale>.json` for lightweight
 * client-side filtering; this combined endpoint remains available for tooling
 * and backward compatibility.
 */
export const GET: APIRoute = async () => {
  const payload = await buildSerializedBlogCatalog();

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
