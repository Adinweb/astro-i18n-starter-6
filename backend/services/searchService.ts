import { getCollection } from 'astro:content';
import { DEFAULT_LOCALE } from '@/i18n/config';
import type { SearchIndexItem } from '../types';

export class SearchService {
  /**
   * Builds the indexed search documents across all content collections.
   * Isolated in backend domain so frontend components never duplicate collection parsing.
   */
  static async buildDevSearchIndex(): Promise<SearchIndexItem[]> {
    const pages = await getCollection('pages');
    const posts = await getCollection('blog');

    const pageItems: SearchIndexItem[] = pages
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
          group,
          collection: 'pages',
        };
      });

    const postItems: SearchIndexItem[] = posts
      .filter((post) => !post.data.draft)
      .map((post) => {
        const parts = post.id.split('/');
        const group = parts.slice(0, -1).join('/');
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
          group,
          collection: 'blog',
        };
      });

    return [...pageItems, ...postItems];
  }
}
