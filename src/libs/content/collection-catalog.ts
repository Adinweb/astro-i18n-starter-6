import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import type { Locale } from '@/i18n/locales';
import type { SerializedGenericCollectionEntry } from '@/libs/content/collection-filters';
import {
  formatEntryFieldForDisplay,
  serializeCollectionEntries,
  sortCollectionEntries,
} from '@/libs/content/catalog-utils';
import { resolveCatalogCover } from '@/libs/content/media';
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
    (rawImage) => resolveCatalogCover(rawImage, getImage)
  );
}
