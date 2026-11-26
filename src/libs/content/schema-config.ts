/**
 * Pure declarative schema and filter configuration types & defaults for
 * config-driven content collections.
 *
 * Kept free of Astro, Zod, and Paraglide imports so it can be shared cleanly
 * across `app.ts`, `types.ts`, `collection-filters.ts`, browser scripts,
 * Node CLI scripts, and unit tests.
 */

type CollectionFieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'url'
  | 'image'
  | 'enum'
  | 'string[]'
  | 'taxonomy[]';

type CollectionFilterMode = 'single' | 'multi' | 'select' | 'toggle' | 'range';

type CollectionFilterSort = 'alpha' | 'count' | 'config';

interface CollectionFilterConfig {
  enabled?: boolean;
  mode: CollectionFilterMode;
  param?: string;
  label?: string;
  labels?: Record<string, string>;
  allLabel?: Record<string, string>;
  sort?: CollectionFilterSort;
}

export interface CollectionFieldConfig {
  name: string;
  type: CollectionFieldType;
  required?: boolean;
  default?: string | number | boolean | string[];
  options?: string[];
  optionLabels?: Record<string, Record<string, string>>;
  min?: number;
  max?: number;
  label?: string;
  labels?: Record<string, string>;
  searchable?: boolean;
  showOnCard?: boolean | 'badge' | 'meta' | 'subtitle';
  showOnEntry?: boolean;
  cms?: boolean;
  filter?: CollectionFilterConfig;
}

export interface CollectionSearchConfig {
  enabled: boolean;
  placeholder?: Record<string, string>;
  fields?: string[];
}

export interface CollectionCardConfig {
  layout: 'grid' | 'gallery' | 'compact';
  aspectRatio: 'video' | 'square' | 'portrait' | 'auto';
  badgeField?: string;
  badgeLimit: number;
  metaFields?: string[];
}

export interface CollectionSchemaConfig {
  fields: CollectionFieldConfig[];
  search: CollectionSearchConfig;
  card: CollectionCardConfig;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  perPage?: number;
}

export interface GenericFilterFieldDef {
  name: string;
  param: string;
  mode: CollectionFilterMode;
  type: CollectionFieldType;
}

const DEFAULT_PROJECT_FIELDS: CollectionFieldConfig[] = [
  {
    name: 'categories',
    type: 'taxonomy[]',
    default: [],
    searchable: true,
    showOnCard: false,
    showOnEntry: true,
    filter: {
      enabled: true,
      mode: 'single',
      param: 'category',
      sort: 'alpha',
    },
  },
  {
    name: 'stack',
    type: 'string[]',
    default: [],
    searchable: true,
    showOnCard: 'badge',
    showOnEntry: true,
    filter: {
      enabled: true,
      mode: 'multi',
      param: 'stack',
      sort: 'alpha',
    },
  },
  {
    name: 'client',
    type: 'string',
    searchable: true,
    showOnCard: 'meta',
    showOnEntry: true,
  },
  {
    name: 'year',
    type: 'number',
    min: 1990,
    max: 2100,
    searchable: true,
    showOnCard: 'meta',
    showOnEntry: true,
  },
  {
    name: 'link',
    type: 'url',
    searchable: false,
    showOnCard: false,
    showOnEntry: true,
  },
];

const DEFAULT_BLOG_FIELDS: CollectionFieldConfig[] = [
  {
    name: 'publishedAt',
    type: 'date',
    required: true,
    searchable: false,
    showOnCard: 'meta',
    showOnEntry: true,
  },
  {
    name: 'updatedAt',
    type: 'date',
    searchable: false,
    showOnCard: false,
    showOnEntry: true,
  },
  {
    name: 'author',
    type: 'string',
    searchable: true,
    showOnCard: 'meta',
    showOnEntry: true,
  },
  {
    name: 'categories',
    type: 'taxonomy[]',
    default: [],
    searchable: true,
    showOnCard: 'badge',
    showOnEntry: true,
    filter: {
      enabled: true,
      mode: 'single',
      param: 'category',
      sort: 'alpha',
    },
  },
  {
    name: 'tags',
    type: 'taxonomy[]',
    default: [],
    searchable: true,
    showOnCard: false,
    showOnEntry: true,
    filter: {
      enabled: true,
      mode: 'multi',
      param: 'tag',
      sort: 'alpha',
    },
  },
];

export const DEFAULT_COLLECTION_SCHEMAS: Record<string, CollectionSchemaConfig> = {
  projects: {
    fields: DEFAULT_PROJECT_FIELDS,
    search: { enabled: true },
    card: {
      layout: 'grid',
      aspectRatio: 'video',
      badgeField: 'stack',
      badgeLimit: 3,
      metaFields: ['client', 'year'],
    },
    sortBy: 'year',
    sortOrder: 'desc',
  },
  blog: {
    fields: DEFAULT_BLOG_FIELDS,
    search: { enabled: true },
    card: {
      layout: 'grid',
      aspectRatio: 'video',
      badgeField: 'categories',
      badgeLimit: 3,
      metaFields: ['author', 'publishedAt'],
    },
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  },
};

const DEFAULT_CUSTOM_FIELDS: CollectionFieldConfig[] = [
  {
    name: 'categories',
    type: 'taxonomy[]',
    default: [],
    searchable: true,
    showOnCard: 'badge',
    showOnEntry: true,
    filter: {
      enabled: true,
      mode: 'single',
      param: 'category',
      sort: 'alpha',
    },
  },
  {
    name: 'tags',
    type: 'taxonomy[]',
    default: [],
    searchable: true,
    showOnCard: false,
    showOnEntry: true,
    filter: {
      enabled: true,
      mode: 'multi',
      param: 'tag',
      sort: 'alpha',
    },
  },
];

function mergeFieldLists(
  baseFields: readonly CollectionFieldConfig[],
  overrideFields?: readonly CollectionFieldConfig[]
): CollectionFieldConfig[] {
  if (!overrideFields) return baseFields.map((field) => ({ ...field }));
  const map = new Map<string, CollectionFieldConfig>();
  for (const field of baseFields) {
    map.set(field.name, { ...field });
  }
  for (const field of overrideFields) {
    const existing = map.get(field.name);
    map.set(
      field.name,
      existing
        ? {
            ...existing,
            ...field,
            filter: field.filter ?? existing.filter,
            labels: field.labels ?? existing.labels,
            optionLabels: field.optionLabels ?? existing.optionLabels,
          }
        : { ...field }
    );
  }
  return [...map.values()];
}

export function resolveCollectionSchema(
  key: string,
  rawConfig?: {
    fields?: readonly CollectionFieldConfig[];
    search?: Partial<CollectionSearchConfig>;
    card?: Partial<CollectionCardConfig>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    perPage?: number;
  }
): CollectionSchemaConfig {
  const preset = DEFAULT_COLLECTION_SCHEMAS[key];
  const baseFields = preset
    ? preset.fields
    : rawConfig?.fields
      ? []
      : DEFAULT_CUSTOM_FIELDS;

  const fields = mergeFieldLists(baseFields, rawConfig?.fields);

  const search: CollectionSearchConfig = {
    enabled: rawConfig?.search?.enabled ?? preset?.search.enabled ?? true,
    placeholder: rawConfig?.search?.placeholder ?? preset?.search.placeholder,
    fields: rawConfig?.search?.fields ?? preset?.search.fields,
  };

  const defaultBadgeField =
    preset?.card.badgeField ??
    fields.find((f) => f.showOnCard === 'badge')?.name ??
    fields.find((f) => f.type === 'string[]' || f.type === 'taxonomy[]')?.name;

  const defaultMetaFields =
    preset?.card.metaFields ??
    fields.filter((f) => f.showOnCard === 'meta' || f.showOnCard === true).map((f) => f.name);

  const card: CollectionCardConfig = {
    layout: rawConfig?.card?.layout ?? preset?.card.layout ?? 'grid',
    aspectRatio: rawConfig?.card?.aspectRatio ?? preset?.card.aspectRatio ?? 'video',
    badgeField: rawConfig?.card?.badgeField ?? defaultBadgeField,
    badgeLimit: rawConfig?.card?.badgeLimit ?? preset?.card.badgeLimit ?? 3,
    metaFields: rawConfig?.card?.metaFields ?? defaultMetaFields,
  };

  return {
    fields,
    search,
    card,
    sortBy: rawConfig?.sortBy ?? preset?.sortBy,
    sortOrder: rawConfig?.sortOrder ?? preset?.sortOrder ?? 'desc',
    perPage: rawConfig?.perPage ?? preset?.perPage,
  };
}

export function getCanonicalFilterParam(field: Pick<CollectionFieldConfig, 'name' | 'filter'>): string {
  if (field.filter?.param?.trim()) return field.filter.param.trim();
  if (field.name === 'categories') return 'category';
  if (field.name === 'tags') return 'tag';
  return field.name;
}

export function toFilterFieldDefs(fields: readonly CollectionFieldConfig[]): GenericFilterFieldDef[] {
  const defs: GenericFilterFieldDef[] = [];
  for (const field of fields) {
    if (!field.filter || field.filter.enabled === false) continue;
    defs.push({
      name: field.name,
      param: getCanonicalFilterParam(field),
      mode: field.filter.mode,
      type: field.type,
    });
  }
  return defs;
}
