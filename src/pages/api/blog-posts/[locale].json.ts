import type { APIRoute, GetStaticPaths } from 'astro';
import { LOCALES, isLocale } from '@/i18n/locales';
import { buildSerializedBlogCatalog } from '@/libs/content/blog-catalog';

export const getStaticPaths: GetStaticPaths = () => {
  return LOCALES.map((locale) => ({ params: { locale } }));
};

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale;
  if (!locale || !isLocale(locale)) {
    return new Response('Not found', { status: 404 });
  }

  const payload = await buildSerializedBlogCatalog(locale);

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
