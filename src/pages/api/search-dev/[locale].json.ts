import type { APIRoute, GetStaticPaths } from 'astro';
import { LOCALES, isLocale } from '@/i18n/locales';
import { getSiteRoutes } from '@/libs/content/service';

export const getStaticPaths: GetStaticPaths = () => {
  return LOCALES.map((locale) => ({ params: { locale } }));
};

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale;
  if (!locale || !isLocale(locale)) {
    return new Response('Not found', { status: 404 });
  }

  const routes = await getSiteRoutes();
  const items = routes
    .filter((route) => route.props.entry && route.props.locale === locale)
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
