import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import type { Locale } from '@/i18n/locales';
import type { SerializedGenericCollectionEntry } from '@/libs/content/collection-filters';
import {
  formatEntryFieldForDisplay,
  serializeCollectionEntries,
  sortCollectionEntries,
} from '@/libs/content/catalog-utils';
import { getContentType, type ContentTypeKey } from '@/libs/content/types';

export { formatEntryFieldForDisplay, sortCollectionEntries };

/**
 * Builds the serialized entry catalog for any collection declared in
 * `content.types`. Shared by `/api/collections/<type>/<locale>.json` so
 * paginated collection listings filter cleanly across all pages.
 */
export async function buildSerializedCollectionCatalog(
  contentType: ContentTypeKey,
  targetLocale?: Locale
): Promise<SerializedGenericCollectionEntry[]> {
  const typeConfig = getContentType(contentType);
  if (!typeConfig.enabled || contentType === 'pages') return [];

  const allEntries = (await getCollection(contentType as 'projects')) as Array<{
    id: string;
    data: Record<string, unknown>;
  }>;

  return serializeCollectionEntries(
    contentType,
    allEntries,
    typeConfig,
    targetLocale,
    async (rawImage) => {
      const image = rawImage as
        | { width: number; height: number; src: string; format: 'png' | 'jpg' | 'webp' }
        | undefined;
      if (!image) return { src: null, width: null, height: null };

      const targetWidth = Math.min(800, image.width);
      const optimized = await getImage({
        src: image as Parameters<typeof getImage>[0]['src'],
        width: targetWidth,
        format: 'webp',
        quality: 75,
      });

      return {
        src: optimized.src,
        width: Number(optimized.attributes.width) || targetWidth,
        height:
          Number(optimized.attributes.height) ||
          Math.round((targetWidth * image.height) / image.width),
      };
    }
  );
}
