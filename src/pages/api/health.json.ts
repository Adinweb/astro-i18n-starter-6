import type { APIRoute } from 'astro';
import { SystemService } from '@backend/services/systemService';

export const GET: APIRoute = async () => {
  const health = SystemService.getHealthStatus();

  return new Response(JSON.stringify(health), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
