import { CONTENT_CONFIG } from '@/libs/config/app';
import { LOCALES, type Locale } from '@/i18n/locales';
import { localizeHref } from '@/i18n/paths';
import * as m from '@/paraglide/messages';

/**
 * The content-type registry: the single source of truth for which collections
 * exist, which of them are switched on, and which route segment each one owns.
 *
 * `app.config.json` holds the values; this module validates them once and
 * exposes typed helpers. The route builder, the navigation, the sitemap and the
 * Node CLIs all read the same registry, so disabling a type in one place
 * removes its routes, its sitemap entries, its navigation link and its
 * scaffolding command together.
 *
 * A content type is a content collection directory (`src/content/<key>/`) whose
 * entries follow the shared `<group>/<locale>.mdx` contract. `pages` is the page
 * system itself: it always owns the root and cannot be disabled.
 */
export const CONTENT_TYPE_KEYS = ['pages', 'blog', 'projects'] as const;
export type ContentTypeKey = (typeof CONTENT_TYPE_KEYS)[number];

export interface ContentTypeConfig {
  key: ContentTypeKey;
  /** Route segment of the type's index; empty for `pages`. */
  base: string;
  enabled: boolean;
  /** Whether the type owns an index listing route. */
  index: boolean;
  /** Whether the index is split into `/page/<n>/` pages. */
  paginated: boolean;
  /** Whether the type has its own Atom feed. */
  feed: boolean;
  /** Whether the type appears in the header, drawer and footer navigation. */
  nav: boolean;
}

/**
 * Route segments a content type may not claim: the reserved pagination segment,
 * build output, generated endpoints, and every non-default locale prefix.
 */
const RESERVED_BASES = new Set([
  'page',
  'pagefind',
  '_astro',
  'api',
  'rss',
  'sitemap',
  'robots',
  'icons',
  'site.webmanifest',
  ...LOCALES,
]);

const BASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readConfig(): ContentTypeConfig[] {
  const configured = CONTENT_CONFIG.types;
  const unknown = Object.keys(configured).filter(
    (key) => !(CONTENT_TYPE_KEYS as readonly string[]).includes(key)
  );
  if (unknown.length > 0) {
    throw new Error(
      `[ContentTypes] Unknown content type(s) in app.config.json: ${unknown.join(', ')}. ` +
        `Known types: ${CONTENT_TYPE_KEYS.join(', ')}. Add the collection to ` +
        'src/content.config.ts and the key to CONTENT_TYPE_KEYS first.'
    );
  }

  const seenBases = new Map<string, ContentTypeKey>();
  const types: ContentTypeConfig[] = [];

  for (const key of CONTENT_TYPE_KEYS) {
    const settings = configured[key];
    // A type that is absent from app.config.json keeps its declared defaults
    // unless it is `pages`, which every site needs.
    const enabled = settings ? settings.enabled : key === 'pages';
    const base = key === 'pages' ? '' : (settings?.base ?? key);
    const index = key === 'pages' ? false : (settings?.index ?? true);

    if (key === 'pages' && !enabled) {
      throw new Error('[ContentTypes] The "pages" type cannot be disabled: it owns the home page.');
    }
    if (key !== 'pages') {
      if (!base) {
        throw new Error(`[ContentTypes] Content type "${key}" needs a non-empty "base".`);
      }
      if (!BASE_PATTERN.test(base)) {
        throw new Error(
          `[ContentTypes] Invalid base "${base}" for content type "${key}". ` +
            'Use lowercase letters, digits, and single hyphens.'
        );
      }
      if (RESERVED_BASES.has(base)) {
        throw new Error(
          `[ContentTypes] The base "${base}" of content type "${key}" is reserved by the router.`
        );
      }
      const owner = seenBases.get(base);
      if (owner) {
        throw new Error(
          `[ContentTypes] Content types "${owner}" and "${key}" share the base "${base}".`
        );
      }
      seenBases.set(base, key);
    }

    types.push({ key, base, enabled, index, paginated: settings?.paginated ?? false, feed: settings?.feed ?? false, nav: settings?.nav ?? true });
  }

  return types;
}

export const CONTENT_TYPES: readonly ContentTypeConfig[] = readConfig();

/** Every declared type, enabled or not. */
export function getContentType(key: ContentTypeKey): ContentTypeConfig {
  const type = CONTENT_TYPES.find((candidate) => candidate.key === key);
  if (!type) throw new Error(`[ContentTypes] Unknown content type "${key}".`);
  return type;
}

/** Enabled types other than `pages` that own a listing route. */
export function getIndexedContentTypes(): ContentTypeConfig[] {
  return CONTENT_TYPES.filter((type) => type.enabled && type.key !== 'pages' && type.index);
}

/** Enabled types other than `pages`, including ones without an index. */
export function getEntryContentTypes(): ContentTypeConfig[] {
  return CONTENT_TYPES.filter((type) => type.enabled && type.key !== 'pages');
}

/** Enabled types that appear in the navigation slots. */
export function getNavigableContentTypes(): ContentTypeConfig[] {
  return getIndexedContentTypes().filter((type) => type.nav);
}

/** Public URL of a type's index page, localized. */
export function getContentTypeIndexHref(key: ContentTypeKey, locale: Locale): string {
  const { base } = getContentType(key);
  return base ? localizeHref(`/${base}`, locale) : localizeHref('/', locale);
}

/** Public URL of one entry of a type, localized. */
export function getContentTypeEntryHref(
  key: ContentTypeKey,
  slug: string,
  locale: Locale
): string {
  const { base } = getContentType(key);
  return localizeHref(`/${base}/${slug}`, locale);
}

/** Localized menu label of a type. */
export function getContentTypeLabel(key: ContentTypeKey, locale: Locale): string {
  switch (key) {
    case 'pages':
      return m.nav_home({}, { locale });
    case 'blog':
      return m.nav_blog({}, { locale });
    case 'projects':
      return m.nav_projects({}, { locale });
  }
}

/** Localized description shown under a type's index heading. */
export function getContentTypeDescription(key: ContentTypeKey, locale: Locale): string {
  switch (key) {
    case 'pages':
      return m.site_description({}, { locale });
    case 'blog':
      return m.blog_index_description({}, { locale });
    case 'projects':
      return m.projects_index_description({}, { locale });
  }
}
