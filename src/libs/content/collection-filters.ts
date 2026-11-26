import { normalizeForFallbackMatch } from '@/libs/search/persian';

/**
 * Pure URL query parsing, filter matching, and client catalog serialization types
 * shared by `CollectionIndexView.astro`, `collection-catalog.ts`, and unit tests.
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
}

export function buildCollectionSearchHaystack(parts: readonly (string | number | undefined | null)[]): string {
  return normalizeForFallbackMatch(
    parts
      .filter((part): part is string | number => part !== undefined && part !== null && String(part).trim() !== '')
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
