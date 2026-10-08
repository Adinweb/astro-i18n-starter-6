import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { DEFAULT_LOCALE } from '@/i18n/config';

export const GET: APIRoute = async () => {
  const pages = await getCollection('pages');
  const posts = await getCollection('blog');

  const items = [
    ...pages
      .filter((p) => !p.data.draft)
      .map((p) => {
        const parts = p.id.split('/');
        const group = parts.slice(0, -1).join('/');
        const locale = parts[parts.length - 1];
        const isHome = group === 'home';
        const slug = isHome ? '' : p.data.slug || group;
        const url =
          locale === DEFAULT_LOCALE
            ? slug ? `/${slug}` : '/'
            : slug ? `/${locale}/${slug}` : `/${locale}`;

        return {
          title: p.data.title,
          description: p.data.description || '',
          url,
          locale,
        };
      }),
    ...posts
      .filter((post) => !post.data.draft)
      .map((post) => {
        const parts = post.id.split('/');
        const locale = parts[parts.length - 1];
        const slug = post.data.slug;
        const url =
          locale === DEFAULT_LOCALE
            ? `/blog/${slug}`
            : `/${locale}/blog/${slug}`;

        return {
          title: post.data.title,
          description: post.data.description || '',
          url,
          locale,
        };
      }),
  ];

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};
