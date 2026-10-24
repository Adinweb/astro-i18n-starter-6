/**
 * Pure helpers shared by the blog index view, its client filter script, and
 * the unit tests. Nothing here imports Astro or Paraglide, so the module can
 * be bundled for the browser as-is.
 */

export interface BlogTaxonomy {
  categories: readonly string[];
  tags: readonly string[];
}

export interface BlogFilters {
  category: string | null;
  tags: string[];
}

export interface SerializedBlogPost {
  locale: string;
  href: string;
  title: string;
  description: string;
  coverSrc: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  categoryLabel: string | null;
  tagLabels: string[];
  hiddenTagCount: number;
  publishedIso: string;
  formattedDate: string;
  readingTimeLabel: string;
  categories: string[];
  tags: string[];
}

export const NO_FILTERS: BlogFilters = { category: null, tags: [] };

const WORDS_PER_MINUTE = 200;

/** Turns a taxonomy key such as `design-systems` into `Design Systems`. */
export function humanizeKey(key: string): string {
  return key
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Reads `?category=…&tag=a,b` into a normalized filter state. */
export function parseBlogFilters(search: string): BlogFilters {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const category = params.get('category')?.trim() || null;
  const tags = [
    ...new Set(
      (params.get('tag') ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ];

  return { category, tags };
}

/** Serializes a filter state into a canonical query string (empty when unset). */
export function buildBlogFilterQuery(filters: BlogFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.tags.length > 0) params.set('tag', [...new Set(filters.tags)].join(','));
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * A post matches when it belongs to the selected category (if any) and owns
 * every selected tag.
 */
export function matchesBlogFilters(post: BlogTaxonomy, filters: BlogFilters): boolean {
  if (filters.category && !post.categories.includes(filters.category)) return false;
  return filters.tags.every((tag) => post.tags.includes(tag));
}

export function filterBlogPosts<T extends BlogTaxonomy>(
  posts: readonly T[],
  filters: BlogFilters
): T[] {
  return posts.filter((post) => matchesBlogFilters(post, filters));
}

export function hasActiveFilters(filters: BlogFilters): boolean {
  return filters.category !== null || filters.tags.length > 0;
}

/** Toggles a tag in the current filter state without mutating the input. */
export function toggleBlogTag(filters: BlogFilters, tag: string): BlogFilters {
  const active = filters.tags.includes(tag);
  return {
    category: filters.category,
    tags: active ? filters.tags.filter((item) => item !== tag) : [...filters.tags, tag],
  };
}

/** Rough reading time in minutes, never below one. */
export function getReadingTime(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Distinct taxonomy keys in first-seen order, optionally filtered by usage. */
export function collectTaxonomyKeys(posts: readonly BlogTaxonomy[], field: keyof BlogTaxonomy): string[] {
  const seen = new Set<string>();
  for (const post of posts) {
    for (const key of post[field]) seen.add(key);
  }
  return [...seen];
}
