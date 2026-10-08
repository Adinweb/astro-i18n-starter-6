import type { APIRoute } from 'astro';
import { SearchService } from '@backend/services/searchService';

export const GET: APIRoute = async () => {
  const items = await SearchService.buildDevSearchIndex();

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};
