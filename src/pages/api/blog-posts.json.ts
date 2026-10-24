import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { LOCALES } from '@/i18n/locales';
import { formatDate, formatNumber } from '@/i18n/format';
import { getReadingTime, type SerializedBlogPost } from '@/libs/content/blog';
import { getSortedLocaleEntries } from '@/libs/content/entries';
import { getBlogPostHref } from '@/libs/content/service';
import { getCategoryLabel, getTagLabel } from '@/libs/content/taxonomy';
import * as m from '@/paraglide/messages';

/**
 * Static catalog of published blog posts across all locales.
 *
 * Loaded lazily by `BlogIndexView.astro` only when the blog spans multiple
 * pages (`totalPages > 1`) and the reader activates a category/tag filter, so
 * filtering searches the entire collection instead of only the current page.
 */
export const GET: APIRoute = async () => {
  const allEntries = await getCollection('blog');
  const payload: SerializedBlogPost[] = [];

  for (const locale of LOCALES) {
    const posts = getSortedLocaleEntries(allEntries, locale);
    for (const post of posts) {
      const { title, description, image, categories, tags, publishedAt } = post.data;

      let coverSrc: string | null = null;
      let coverWidth: number | null = null;
      let coverHeight: number | null = null;

      if (image) {
        const targetWidth = Math.min(640, image.width);
        const optimized = await getImage({
          src: image,
          width: targetWidth,
          format: 'webp',
          quality: 75,
        });
        coverSrc = optimized.src;
        coverWidth = Number(optimized.attributes.width) || targetWidth;
        coverHeight =
          Number(optimized.attributes.height) ||
          Math.round((targetWidth * image.height) / image.width);
      }

      const visibleTags = tags.slice(0, 2);
      const readingTime = getReadingTime(post.body);

      payload.push({
        locale,
        href: getBlogPostHref(post.data.slug, locale),
        title,
        description: description ?? '',
        coverSrc,
        coverWidth,
        coverHeight,
        categoryLabel: categories[0] ? getCategoryLabel(categories[0], locale) : null,
        tagLabels: visibleTags.map((tag) => getTagLabel(tag, locale)),
        hiddenTagCount: Math.max(0, tags.length - visibleTags.length),
        publishedIso: publishedAt.toISOString(),
        formattedDate: formatDate(publishedAt, locale, 'short'),
        readingTimeLabel: m.blog_read_time(
          { count: formatNumber(readingTime, locale) },
          { locale }
        ),
        categories: [...categories],
        tags: [...tags],
      });
    }
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
