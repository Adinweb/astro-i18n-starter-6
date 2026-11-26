import { CONTENT_CONFIG } from '@/libs/config/app';
import { formatYear } from '@/i18n/format';
import { LOCALES, type Locale } from '@/i18n/locales';
import { localizeHref } from '@/i18n/paths';
import { humanizeKey } from '@/libs/content/blog';
import {
  resolveCollectionSchema,
  type CollectionCardConfig,
  type CollectionFieldConfig,
  type CollectionSearchConfig,
} from '@/libs/content/schema-config';
import { CLIENT_CONTENT_TYPES, clientCollections } from '@client/content';
import * as m from '@/paraglide/messages';

/**
 * The content-type registry: the single source of truth for which collections
 * exist, which of them are switched on, which route segment each one owns,
 * and how its declarative frontmatter/filter schema is configured.
 *
 * Built-in types (`pages`, `blog`, `projects`) combine dynamically with custom
 * collections exported from `client/content.ts` AND schema-driven collections
 * configured in `app.config.json` / `client/config.json` (`content.types`).
 */
const BUILT_IN_TYPES = ['pages', 'blog', 'projects'] as const;

function getConfigDefinedKeys(): string[] {
  const configured = CONTENT_CONFIG.types ?? {};
  return Object.entries(configured)
    .filter(([, cfg]) => Array.isArray(cfg?.fields) || cfg?.schemaDriven === true)
    .map(([key]) => key);
}

const KNOWN_CONTENT_TYPE_KEYS: string[] = [
  ...new Set([
    ...BUILT_IN_TYPES,
    ...Object.keys(clientCollections),
    ...getConfigDefinedKeys(),
  ]),
];

export type ContentTypeKey = (typeof BUILT_IN_TYPES)[number] | (string & {});

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
  icon?: string;
  labels?: Record<string, string>;
  descriptions?: Record<string, string>;
  fields: CollectionFieldConfig[];
  search: CollectionSearchConfig;
  card: CollectionCardConfig;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  perPage?: number;
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
  'og',
  'sitemap',
  'robots',
  'icons',
  'site.webmanifest',
  'llms.txt',
  ...LOCALES,
]);

const BASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readConfig(): ContentTypeConfig[] {
  const configured = CONTENT_CONFIG.types;
  const knownSet = new Set(KNOWN_CONTENT_TYPE_KEYS);
  const unknown = Object.keys(configured).filter((key) => !knownSet.has(key));
  if (unknown.length > 0) {
    throw new Error(
      `[ContentTypes] Unknown content type(s) in config: ${unknown.join(', ')}. ` +
        `Known types: ${KNOWN_CONTENT_TYPE_KEYS.join(', ')}. Register custom collections ` +
        'in client/content.ts or declare "fields" in content.types first.'
    );
  }

  const seenBases = new Map<string, ContentTypeKey>();
  const types: ContentTypeConfig[] = [];

  for (const key of KNOWN_CONTENT_TYPE_KEYS) {
    const settings = configured[key];
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

    const schema = resolveCollectionSchema(key, settings);

    types.push({
      key,
      base,
      enabled,
      index,
      paginated: settings?.paginated ?? false,
      feed: settings?.feed ?? false,
      nav: settings?.nav ?? true,
      icon: settings?.icon ?? CLIENT_CONTENT_TYPES[key]?.icon,
      labels: settings?.labels,
      descriptions: settings?.descriptions,
      fields: schema.fields,
      search: schema.search,
      card: schema.card,
      sortBy: schema.sortBy,
      sortOrder: schema.sortOrder,
      perPage: schema.perPage,
    });
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

type MessageCatalog = Record<string, ((params: Record<string, never>, opts: { locale: Locale }) => string) | undefined>;

function lookupCatalog(key: string, locale: Locale): string | null {
  const catalog = m as unknown as MessageCatalog;
  const fn = catalog[key];
  return typeof fn === 'function' ? fn({}, { locale }) : null;
}

/** Localized menu label of a type. */
export function getContentTypeLabel(key: ContentTypeKey, locale: Locale): string {
  const clientLabel = CLIENT_CONTENT_TYPES[key]?.label;
  if (clientLabel) return clientLabel(locale);

  const type = CONTENT_TYPES.find((candidate) => candidate.key === key);
  const configLabel = type?.labels?.[locale]?.trim();
  if (configLabel) return configLabel;

  switch (key) {
    case 'pages':
      return m.nav_home({}, { locale });
    case 'blog':
      return m.nav_blog({}, { locale });
    case 'projects':
      return m.nav_projects({}, { locale });
    default: {
      return lookupCatalog(`nav_${key}`, locale) ?? humanizeKey(key);
    }
  }
}

/** Localized description shown under a type's index heading. */
export function getContentTypeDescription(key: ContentTypeKey, locale: Locale): string {
  const clientDesc = CLIENT_CONTENT_TYPES[key]?.description;
  if (clientDesc) return clientDesc(locale);

  const type = CONTENT_TYPES.find((candidate) => candidate.key === key);
  const configDesc = type?.descriptions?.[locale]?.trim();
  if (configDesc) return configDesc;

  switch (key) {
    case 'pages':
      return m.site_description({}, { locale });
    case 'blog':
      return m.blog_index_description({}, { locale });
    case 'projects':
      return m.projects_index_description({}, { locale });
    default: {
      return lookupCatalog(`${key}_index_description`, locale) ?? m.site_description({}, { locale });
    }
  }
}

/** Localized label for a collection field / filter group. */
export function getContentTypeFieldLabel(
  contentType: ContentTypeKey,
  field: Pick<CollectionFieldConfig, 'name' | 'label' | 'labels' | 'filter'>,
  locale: Locale
): string {
  const filterConfigLabel = field.filter?.labels?.[locale]?.trim() || field.filter?.label?.trim();
  if (filterConfigLabel) return filterConfigLabel;

  const fieldConfigLabel = field.labels?.[locale]?.trim() || field.label?.trim();
  if (fieldConfigLabel) return fieldConfigLabel;

  const messageKey = `${contentType}_field_${field.name}`;
  const customMsg = lookupCatalog(messageKey, locale);
  if (customMsg) return customMsg;

  if (field.name === 'categories') return m.collection_filter_category({}, { locale });
  if (field.name === 'tags') return m.blog_tags({}, { locale });
  if (field.name === 'stack') return m.collection_filter_stack({}, { locale });
  if (field.name === 'client') return m.projects_client({}, { locale });
  if (field.name === 'year') return m.projects_year({}, { locale });

  return humanizeKey(field.name);
}

/** Localized label for a filter option value within a collection field. */
export function getContentTypeOptionLabel(
  contentType: ContentTypeKey,
  field: Pick<CollectionFieldConfig, 'name' | 'type' | 'optionLabels'>,
  rawValue: string,
  locale: Locale
): string {
  const configOptionLabel = field.optionLabels?.[rawValue]?.[locale]?.trim();
  if (configOptionLabel) return configOptionLabel;

  const safeKey = rawValue.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const exactMsg = lookupCatalog(`${contentType}_${field.name}_${safeKey}`, locale);
  if (exactMsg) return exactMsg;

  if (field.name === 'categories') {
    return (
      lookupCatalog(`${contentType}_category_${rawValue}`, locale) ??
      lookupCatalog(`blog_category_${rawValue}`, locale) ??
      humanizeKey(rawValue)
    );
  }

  if (field.name === 'tags') {
    return (
      lookupCatalog(`${contentType}_tag_${rawValue}`, locale) ??
      lookupCatalog(`blog_tag_${rawValue}`, locale) ??
      humanizeKey(rawValue)
    );
  }

  if (field.name === 'year' && /^\d{4}$/.test(rawValue)) {
    return formatYear(Number(rawValue), locale);
  }

  if (field.type === 'taxonomy[]' || field.type === 'enum') {
    return humanizeKey(rawValue);
  }

  return rawValue;
}
