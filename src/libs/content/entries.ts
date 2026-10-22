import { isLocale, type Locale } from '@/i18n/locales';

/**
 * Content-entry invariants shared by the route builder, the views, and the
 * feed.
 *
 * Every collection follows the same folder contract —
 * `src/content/<collection>/<group>/<locale>.mdx` — so the entry ID is the
 * single source of truth for an entry's group and locale. Keeping the parsing,
 * draft filtering and sorting here means the route set, the rendered listing
 * and the RSS feed can never disagree about what a "published post of locale X"
 * is.
 */

export interface ContentEntryLike {
  id: string;
  data: {
    draft?: boolean;
  };
}

export interface DatedContentEntry extends ContentEntryLike {
  data: {
    draft?: boolean;
    publishedAt: Date;
  };
}

export interface ContentEntryId {
  /** Folder name of the entry group (`about`, `first-post`, …). */
  group: string;
  locale: Locale;
}

/**
 * Splits `<group>/<locale>` into its parts.
 *
 * Throws for a malformed ID or a locale that is not registered in
 * `src/i18n/locales.ts`/`project.inlang/settings.json`, because both are
 * configuration errors that must fail the build instead of silently producing a
 * default-locale URL.
 */
export function parseContentEntryId(id: string): ContentEntryId {
  const parts = id.split('/');
  if (parts.length < 2) {
    throw new Error(
      `[Content] Invalid content entry ID: "${id}". Expected format: "<group>/<locale>".`
    );
  }

  const locale = parts[parts.length - 1];
  if (!isLocale(locale)) {
    throw new Error(
      `[Content] Unknown locale "${locale}" in content entry "${id}". ` +
        'Add it to src/i18n/locales.ts and project.inlang/settings.json first.'
    );
  }

  return { group: parts.slice(0, -1).join('/'), locale };
}

/** Drafts are filtered in exactly one place: here. */
export function isPublished(entry: ContentEntryLike): boolean {
  return !entry.data.draft;
}

/** Newest first, without mutating the collection Astro handed us. */
export function sortByPublishedAtDesc<T extends DatedContentEntry>(
  entries: readonly T[]
): T[] {
  return [...entries].sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );
}

/**
 * Groups published entries as `Map<group, Map<locale, entry>>`.
 *
 * Duplicate `group/locale` pairs are a content error: they would compete for
 * the same URL, so they fail loudly here rather than being silently dropped.
 */
export function groupPublishedEntries<T extends ContentEntryLike>(
  entries: readonly T[],
  collectionName: 'pages' | 'blog'
): Map<string, Map<Locale, T>> {
  const grouped = new Map<string, Map<Locale, T>>();

  for (const entry of entries) {
    if (!isPublished(entry)) continue;

    const { group, locale } = parseContentEntryId(entry.id);
    let localeMap = grouped.get(group);
    if (!localeMap) {
      localeMap = new Map();
      grouped.set(group, localeMap);
    }

    if (localeMap.has(locale)) {
      throw new Error(
        `[Content] Duplicate ${collectionName} entry for "${group}/${locale}".`
      );
    }
    localeMap.set(locale, entry);
  }

  return grouped;
}

/**
 * Published entries of one locale, in the order their collection declared.
 * Used where the caller applies its own ordering.
 */
export function getPublishedLocaleEntries<T extends ContentEntryLike>(
  entries: readonly T[],
  locale: Locale
): T[] {
  return entries.filter(
    (entry) => isPublished(entry) && parseContentEntryId(entry.id).locale === locale
  );
}

/** Published entries of one locale, newest first. */
export function getSortedLocaleEntries<T extends DatedContentEntry>(
  entries: readonly T[],
  locale: Locale
): T[] {
  return sortByPublishedAtDesc(getPublishedLocaleEntries(entries, locale));
}
