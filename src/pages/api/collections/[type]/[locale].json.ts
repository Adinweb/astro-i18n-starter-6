import type { APIRoute, GetStaticPaths } from 'astro';
import { LOCALES, isLocale } from '@/i18n/locales';
import { buildSerializedCollectionCatalog } from '@/libs/content/collection-catalog';
import { getEntryContentTypes } from '@/libs/content/types';

export const getStaticPaths: GetStaticPaths = () => {
  const types = getEntryContentTypes();
  return types.flatMap((type) =>
    LOCALES.map((locale) => ({
      params: { type: type.key, locale },
    }))
  );
};

export const GET: APIRoute = async ({ params }) => {
  const type = params.type;
  const locale = params.locale;
  const knownType = getEntryContentTypes().find((candidate) => candidate.key === type);

  if (!type || !knownType || !locale || !isLocale(locale)) {
    return new Response('Not found', { status: 404 });
  }

  const payload = await buildSerializedCollectionCatalog(knownType.key, locale);

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
