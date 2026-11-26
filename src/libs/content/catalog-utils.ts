import { formatDate, formatNumber, formatYear } from '@/i18n/format';
import { LOCALES, type Locale } from '@/i18n/locales';
import {
  buildCollectionSearchHaystack,
  type SerializedGenericCollectionEntry,
} from '@/libs/content/collection-filters';
import { parseContentEntryId } from '@/libs/content/entries';
import {
  getContentTypeEntryHref,
  getContentTypeOptionLabel,
  type ContentTypeConfig,
  type ContentTypeKey,
} from '@/libs/content/types';

function compareFieldValues(aVal: unknown, bVal: unknown, locale: Locale): number {
  if (aVal === bVal) return 0;
  if (aVal === undefined || aVal === null) return 1;
  if (bVal === undefined || bVal === null) return -1;

  if (aVal instanceof Date || bVal instanceof Date) {
    const aTime = aVal instanceof Date ? aVal.getTime() : Date.parse(String(aVal));
    const bTime = bVal instanceof Date ? bVal.getTime() : Date.parse(String(bVal));
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
  }

  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return aVal - bVal;
  }

  if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
    return Number(aVal) - Number(bVal);
  }

  return String(aVal).localeCompare(String(bVal), locale);
}

export function sortCollectionEntries<T extends { data: Record<string, unknown> }>(
  entries: T[],
  typeConfig: Pick<ContentTypeConfig, 'sortBy' | 'sortOrder'>,
  locale: Locale
): T[] {
  const sortBy = typeConfig.sortBy;
  const direction = typeConfig.sortOrder === 'asc' ? 1 : -1;

  return entries.sort((a, b) => {
    if (sortBy) {
      const aVal = a.data[sortBy];
      const bVal = b.data[sortBy];
      if (aVal !== undefined || bVal !== undefined) {
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        const cmp = compareFieldValues(aVal, bVal, locale);
        if (cmp !== 0) return cmp * direction;
      }
    }
    return String(a.data.title ?? '').localeCompare(String(b.data.title ?? ''), locale);
  });
}

function serializeValue(val: unknown): unknown {
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map((item) => serializeValue(item));
  return val;
}

export function formatEntryFieldForDisplay(
  contentType: ContentTypeKey,
  fieldName: string,
  rawVal: unknown,
  typeConfig: Pick<ContentTypeConfig, 'fields'>,
  locale: Locale
): string | null {
  if (rawVal === undefined || rawVal === null || rawVal === '') return null;
  const fieldDef = typeConfig.fields.find((f) => f.name === fieldName);

  if (rawVal instanceof Date || fieldDef?.type === 'date') {
    const date = rawVal instanceof Date ? rawVal : new Date(String(rawVal));
    return Number.isNaN(date.getTime()) ? String(rawVal) : formatDate(date, locale);
  }

  if (fieldName === 'year' && typeof rawVal === 'number') {
    return formatYear(rawVal, locale);
  }

  if (typeof rawVal === 'number') {
    return formatNumber(rawVal, locale);
  }

  if (typeof rawVal === 'boolean') {
    if (!rawVal) return null;
    return fieldDef?.labels?.[locale] ?? fieldDef?.label ?? fieldName;
  }

  if (Array.isArray(rawVal)) {
    const items = rawVal
      .map((item) =>
        fieldDef
          ? getContentTypeOptionLabel(contentType, fieldDef, String(item), locale)
          : String(item)
      )
      .filter(Boolean);
    return items.length > 0 ? items.join(', ') : null;
  }

  return fieldDef
    ? getContentTypeOptionLabel(contentType, fieldDef, String(rawVal), locale)
    : String(rawVal);
}

export interface CoverResolution {
  src: string | null;
  width: number | null;
  height: number | null;
}

/**
 * Pure entry serializer decoupled from `astro:assets` / `astro:content` so it can be
 * shared between the Astro API builder and unit tests.
 */
export async function serializeCollectionEntries(
  contentType: ContentTypeKey,
  allEntries: Array<{ id: string; data: Record<string, unknown> }>,
  typeConfig: Pick<ContentTypeConfig, 'fields' | 'search' | 'card' | 'sortBy' | 'sortOrder'>,
  targetLocale?: Locale,
  resolveCover?: (image: unknown) => Promise<CoverResolution>
): Promise<SerializedGenericCollectionEntry[]> {
  const localesToInclude = targetLocale ? [targetLocale] : LOCALES;
  const payload: SerializedGenericCollectionEntry[] = [];

  for (const locale of localesToInclude) {
    const published = allEntries.filter((entry) => {
      if (entry.data.draft === true) return false;
      return parseContentEntryId(entry.id).locale === locale;
    });

    sortCollectionEntries(published, typeConfig, locale);

    for (const entry of published) {
      const data = entry.data;
      const title = String(data.title ?? '');
      const description = typeof data.description === 'string' ? data.description : '';
      const slug = String(data.slug ?? '');

      const cover: CoverResolution =
        data.image && resolveCover
          ? await resolveCover(data.image)
          : { src: null, width: null, height: null };

      const values: Record<string, unknown> = {};
      const haystackParts: Array<string | number | boolean | undefined | null> = [title, description];

      for (const field of typeConfig.fields) {
        if (field.type === 'image') continue;
        const raw = data[field.name];
        if (raw !== undefined) {
          values[field.name] = serializeValue(raw);
        }
        const includeInSearch =
          typeConfig.search.fields && typeConfig.search.fields.length > 0
            ? typeConfig.search.fields.includes(field.name)
            : field.searchable !== false;

        if (includeInSearch && raw !== undefined && raw !== null) {
          if (Array.isArray(raw)) {
            for (const item of raw) {
              const str = String(item);
              haystackParts.push(str);
              const label = getContentTypeOptionLabel(contentType, field, str, locale);
              if (label !== str) haystackParts.push(label);
            }
          } else if (typeof raw !== 'boolean') {
            const str = String(raw);
            haystackParts.push(str);
            const label = getContentTypeOptionLabel(contentType, field, str, locale);
            if (label !== str) haystackParts.push(label);
          }
        }
      }

      for (const fallbackKey of ['categories', 'tags', 'stack', 'client', 'year']) {
        if (!(fallbackKey in values) && data[fallbackKey] !== undefined) {
          values[fallbackKey] = serializeValue(data[fallbackKey]);
        }
      }

      const badgeField = typeConfig.card.badgeField;
      const badgeRaw = badgeField ? data[badgeField] : undefined;
      const badgeFieldDef = badgeField
        ? typeConfig.fields.find((f) => f.name === badgeField)
        : undefined;
      const badges: string[] = Array.isArray(badgeRaw)
        ? badgeRaw.map((item) =>
            badgeFieldDef
              ? getContentTypeOptionLabel(contentType, badgeFieldDef, String(item), locale)
              : String(item)
          )
        : badgeRaw !== undefined && badgeRaw !== null && String(badgeRaw).trim() !== ''
          ? [
              badgeFieldDef
                ? getContentTypeOptionLabel(contentType, badgeFieldDef, String(badgeRaw), locale)
                : String(badgeRaw),
            ]
          : [];

      const metaFields = typeConfig.card.metaFields ?? [];
      const metaParts = metaFields
        .map((fieldName) =>
          formatEntryFieldForDisplay(contentType, fieldName, data[fieldName], typeConfig, locale)
        )
        .filter((item): item is string => Boolean(item));
      const metaText = metaParts.length > 0 ? metaParts.join(' · ') : null;

      const categories = Array.isArray(data.categories) ? data.categories.map(String) : [];
      const stack = Array.isArray(data.stack) ? data.stack.map(String) : [];
      const client = typeof data.client === 'string' ? data.client : null;
      const year = typeof data.year === 'number' ? data.year : null;

      payload.push({
        locale,
        href: getContentTypeEntryHref(contentType, slug, locale),
        title,
        description,
        coverSrc: cover.src,
        coverWidth: cover.width,
        coverHeight: cover.height,
        categories,
        stack,
        client,
        year,
        formattedYear: year ? formatYear(year, locale) : null,
        values,
        badges,
        metaText,
        searchHaystack: buildCollectionSearchHaystack(haystackParts),
      });
    }
  }

  return payload;
}
