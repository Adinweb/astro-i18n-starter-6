import { normalizeForFallbackMatch } from '@/libs/search/persian';
import type { GenericFilterFieldDef } from '@/libs/content/schema-config';

/**
 * Pure URL query parsing, filter matching, and client catalog serialization types
 * shared by `CollectionBrowser.astro`, `CollectionIndexView.astro`,
 * `collection-catalog.ts`, and unit tests.
 * Kept free of Astro or Paraglide imports so it bundles safely in browser scripts.
 */
export interface CollectionFilterState {
  category: string;
  stacks: string[];
  query: string;
}

export interface CollectionFilterableEntry {
  categories: readonly string[];
  stack: readonly string[];
  searchHaystack: string;
}

export interface SerializedCollectionEntry extends CollectionFilterableEntry {
  locale: string;
  href: string;
  title: string;
  description: string;
  coverSrc: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  client: string | null;
  year: number | null;
  formattedYear: string | null;
  values?: Record<string, unknown>;
  badges?: string[];
  metaText?: string | null;
}

interface GenericRangeValue {
  min?: number;
  max?: number;
}

type GenericFilterValue = string | string[] | boolean | GenericRangeValue;

export interface GenericFilterState {
  query: string;
  values: Record<string, GenericFilterValue>;
}

export interface GenericFilterableEntry {
  values: Record<string, unknown>;
  searchHaystack: string;
}

export interface SerializedGenericCollectionEntry extends SerializedCollectionEntry {
  values: Record<string, unknown>;
  badges: string[];
  metaText: string | null;
}

export function buildCollectionSearchHaystack(
  parts: readonly (string | number | boolean | undefined | null)[]
): string {
  return normalizeForFallbackMatch(
    parts
      .filter(
        (part): part is string | number | boolean =>
          part !== undefined && part !== null && String(part).trim() !== ''
      )
      .map(String)
      .join(' ')
  );
}

export function parseCollectionFilters(search: string): CollectionFilterState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const category = params.get('category')?.trim() ?? '';
  const stacks = [
    ...new Set(
      (params.get('stack') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
  const query = params.get('q')?.trim() ?? '';
  return { category, stacks, query };
}

export function parseCollectionFilterPage(search: string): number {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = Number(params.get('page'));
  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

export function hasActiveCollectionFilters(filters: CollectionFilterState): boolean {
  return Boolean(filters.category || filters.stacks.length > 0 || filters.query.trim());
}

export function buildCollectionFilterQuery(filters: CollectionFilterState, page = 1): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.stacks.length > 0) params.set('stack', [...new Set(filters.stacks)].join(','));
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (Number.isInteger(page) && page > 1 && hasActiveCollectionFilters(filters)) {
    params.set('page', String(page));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function matchesCollectionFilters(
  entry: CollectionFilterableEntry,
  filters: CollectionFilterState
): boolean {
  const matchesCat = !filters.category || entry.categories.includes(filters.category);
  if (!matchesCat) return false;

  const matchesStack =
    filters.stacks.length === 0 ||
    filters.stacks.every((selected) => entry.stack.includes(selected));
  if (!matchesStack) return false;

  const needle = normalizeForFallbackMatch(filters.query);
  return !needle || entry.searchHaystack.includes(needle);
}

export function parseGenericCollectionFilters(
  search: string,
  filterDefs: readonly GenericFilterFieldDef[]
): GenericFilterState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const query = params.get('q')?.trim() ?? '';
  const values: Record<string, GenericFilterValue> = {};

  for (const def of filterDefs) {
    if (def.mode === 'multi') {
      const items = [
        ...new Set(
          (params.get(def.param) ?? '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        ),
      ];
      if (items.length > 0) values[def.name] = items;
    } else if (def.mode === 'toggle') {
      const raw = (params.get(def.param) ?? '').trim().toLowerCase();
      if (raw === 'true' || raw === '1' || raw === 'yes') {
        values[def.name] = true;
      }
    } else if (def.mode === 'range') {
      const rawMin = params.get(`${def.param}_min`)?.trim();
      const rawMax = params.get(`${def.param}_max`)?.trim();
      const min = rawMin !== undefined && rawMin !== '' && Number.isFinite(Number(rawMin))
        ? Number(rawMin)
        : undefined;
      const max = rawMax !== undefined && rawMax !== '' && Number.isFinite(Number(rawMax))
        ? Number(rawMax)
        : undefined;
      if (min !== undefined || max !== undefined) {
        values[def.name] = { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
      }
    } else {
      const single = params.get(def.param)?.trim() ?? '';
      if (single) values[def.name] = single;
    }
  }

  return { query, values };
}

export function hasActiveGenericCollectionFilters(state: GenericFilterState): boolean {
  if (state.query.trim()) return true;
  for (const value of Object.values(state.values)) {
    if (typeof value === 'string' && value.trim() !== '') return true;
    if (Array.isArray(value) && value.length > 0) return true;
    if (typeof value === 'boolean' && value) return true;
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      (value.min !== undefined || value.max !== undefined)
    ) {
      return true;
    }
  }
  return false;
}

export function buildGenericCollectionFilterQuery(
  state: GenericFilterState,
  filterDefs: readonly GenericFilterFieldDef[],
  page = 1
): string {
  const params = new URLSearchParams();

  for (const def of filterDefs) {
    const val = state.values[def.name];
    if (val === undefined) continue;

    if (def.mode === 'multi' && Array.isArray(val) && val.length > 0) {
      params.set(def.param, [...new Set(val)].join(','));
    } else if (def.mode === 'toggle' && val === true) {
      params.set(def.param, 'true');
    } else if (
      def.mode === 'range' &&
      typeof val === 'object' &&
      val !== null &&
      !Array.isArray(val)
    ) {
      if (val.min !== undefined && Number.isFinite(val.min)) {
        params.set(`${def.param}_min`, String(val.min));
      }
      if (val.max !== undefined && Number.isFinite(val.max)) {
        params.set(`${def.param}_max`, String(val.max));
      }
    } else if (typeof val === 'string' && val.trim() !== '') {
      params.set(def.param, val.trim());
    }
  }

  if (state.query.trim()) params.set('q', state.query.trim());
  if (Number.isInteger(page) && page > 1 && hasActiveGenericCollectionFilters(state)) {
    params.set('page', String(page));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function asStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (raw === undefined || raw === null) return [];
  const str = String(raw).trim();
  return str ? [str] : [];
}

export function matchesGenericCollectionFilters(
  entry: GenericFilterableEntry,
  state: GenericFilterState,
  filterDefs: readonly GenericFilterFieldDef[]
): boolean {
  for (const def of filterDefs) {
    const active = state.values[def.name];
    if (active === undefined) continue;

    const entryRaw = entry.values[def.name];

    if (def.mode === 'single' || def.mode === 'select') {
      if (typeof active === 'string' && active !== '') {
        const candidates = asStringArray(entryRaw);
        if (!candidates.includes(active)) return false;
      }
    } else if (def.mode === 'multi') {
      if (Array.isArray(active) && active.length > 0) {
        const candidates = asStringArray(entryRaw);
        if (!active.every((selected) => candidates.includes(selected))) return false;
      }
    } else if (def.mode === 'toggle') {
      if (active === true && entryRaw !== true) return false;
    } else if (
      def.mode === 'range' &&
      typeof active === 'object' &&
      active !== null &&
      !Array.isArray(active)
    ) {
      if (active.min !== undefined || active.max !== undefined) {
        const num = typeof entryRaw === 'number' ? entryRaw : Number(entryRaw);
        if (!Number.isFinite(num)) return false;
        if (active.min !== undefined && num < active.min) return false;
        if (active.max !== undefined && num > active.max) return false;
      }
    }
  }

  const needle = normalizeForFallbackMatch(state.query);
  return !needle || entry.searchHaystack.includes(needle);
}
