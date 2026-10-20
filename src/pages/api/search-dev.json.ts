import type { APIRoute } from 'astro';
import { getSiteRoutes } from '@/libs/content/service';

/**
 * Development-only fallback for the search modal. It reuses the route builder
 * so URLs, localized slugs, and draft filtering always match the built site.
 */
export const GET: APIRoute = async () => {
  const routes = await getSiteRoutes();

  const items = routes
    .filter((route) => route.props.entry)
    .map((route) => {
      const entry = route.props.entry!;
      return {
        title: entry.data.title,
        description: entry.data.description ?? '',
        url: route.props.url,
        locale: route.props.locale,
      };
    });

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
