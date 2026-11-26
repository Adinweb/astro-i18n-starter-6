import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { formatYear } from '@/i18n/format';
import { LOCALES, type Locale } from '@/i18n/locales';
import {
  buildCollectionSearchHaystack,
  type SerializedCollectionEntry,
} from '@/libs/content/collection-filters';
import { parseContentEntryId } from '@/libs/content/entries';
import { getCollectionCategoryLabel } from '@/libs/content/taxonomy';
import {
  getContentType,
  getContentTypeEntryHref,
  type ContentTypeKey,
} from '@/libs/content/types';

/**
 * Builds the serialized entry catalog for a non-blog collection declared in
 * `content.types`. Shared by `/api/collections/<type>/<locale>.json` so
 * paginated collection listings filter cleanly across all pages.
 */
export async function buildSerializedCollectionCatalog(
  contentType: ContentTypeKey,
  targetLocale?: Locale
): Promise<SerializedCollectionEntry[]> {
  const type = getContentType(contentType);
  if (!type.enabled || contentType === 'pages' || contentType === 'blog') return [];

  const allEntries = await getCollection(contentType as 'projects');
  const localesToInclude = targetLocale ? [targetLocale] : LOCALES;
  const payload: SerializedCollectionEntry[] = [];

  for (const locale of localesToInclude) {
    const published = allEntries.filter((entry) => {
      if (entry.data.draft) return false;
      return parseContentEntryId(entry.id).locale === locale;
    });

    published.sort(
      (a, b) =>
        (b.data.year ?? 0) - (a.data.year ?? 0) ||
        a.data.title.localeCompare(b.data.title, locale)
    );

    for (const entry of published) {
      const {
        title,
        description,
        image,
        categories = [],
        stack = [],
        client,
        year,
        slug,
      } = entry.data;

      let coverSrc: string | null = null;
      let coverWidth: number | null = null;
      let coverHeight: number | null = null;

      if (image) {
        const targetWidth = Math.min(800, image.width);
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

      const categoryLabels = categories.map((cat) =>
        getCollectionCategoryLabel(contentType, cat, locale)
      );

      payload.push({
        locale,
        href: getContentTypeEntryHref(contentType, slug, locale),
        title,
        description: description ?? '',
        coverSrc,
        coverWidth,
        coverHeight,
        categories: [...categories],
        stack: [...stack],
        client: client ?? null,
        year: year ?? null,
        formattedYear: year ? formatYear(year, locale) : null,
        searchHaystack: buildCollectionSearchHaystack([
          title,
          description,
          client,
          year,
          ...categories,
          ...categoryLabels,
          ...stack,
        ]),
      });
    }
  }

  return payload;
}
