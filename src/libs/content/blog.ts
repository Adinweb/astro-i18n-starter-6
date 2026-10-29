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

/** Reads `?page=…` into a 1-based positive integer (defaults to 1). */
export function parseBlogFilterPage(search: string): number {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = Number(params.get('page'));
  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

/** Serializes a filter state (and optional page > 1) into a canonical query string. */
export function buildBlogFilterQuery(filters: BlogFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.tags.length > 0) params.set('tag', [...new Set(filters.tags)].join(','));
  if (Number.isInteger(page) && page > 1 && hasActiveFilters(filters)) {
    params.set('page', String(page));
  }
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

/** Compares two normalized filter states regardless of tag order. */
export function areBlogFiltersEqual(a: BlogFilters, b: BlogFilters): boolean {
  if (a.category !== b.category) return false;
  if (a.tags.length !== b.tags.length) return false;
  const bTags = new Set(b.tags);
  return a.tags.every((tag) => bTags.has(tag));
}

/** Toggles a tag in the current filter state without mutating the input. */
export function toggleBlogTag(filters: BlogFilters, tag: string): BlogFilters {
  const active = filters.tags.includes(tag);
  return {
    category: filters.category,
    tags: active ? filters.tags.filter((item) => item !== tag) : [...filters.tags, tag],
  };
}

/**
 * Rough reading time in minutes, never below one.
 * Strips fenced code blocks, MDX import/export lines, JSX/HTML tags, and URLs
 * so code samples and markup do not inflate prose word counts.
 */
export function getReadingTime(body: string | undefined): number {
  const cleaned = (body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/^\s*(?:import|export)\s+.*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1 ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`#*>`_~|]+/g, ' ');
  const words = cleaned.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export interface TocHeadingLike {
  depth: number;
  slug: string;
  text: string;
}

/** Distinct taxonomy keys in first-seen order, optionally filtered by usage. */
export function collectTaxonomyKeys(posts: readonly BlogTaxonomy[], field: keyof BlogTaxonomy): string[] {
  const seen = new Set<string>();
  for (const post of posts) {
    for (const key of post[field]) seen.add(key);
  }
  return [...seen];
}

/**
 * Keeps `h2` and `h3` headings for the article Table of Contents. Returns an
 * empty list when fewer than two headings exist so short notes stay uncluttered.
 */
export function filterTocHeadings<T extends TocHeadingLike>(headings: readonly T[]): T[] {
  const eligible = headings.filter(
    (heading) =>
      (heading.depth === 2 || heading.depth === 3) &&
      heading.slug.trim().length > 0 &&
      heading.text.trim().length > 0
  );
  return eligible.length >= 2 ? eligible : [];
}

/**
 * Finds the newer and older neighbours of `currentId` inside a newest-first
 * locale post list.
 */
export function getAdjacentPosts<T extends { id: string }>(
  sortedPosts: readonly T[],
  currentId: string
): { newer: T | null; older: T | null } {
  const index = sortedPosts.findIndex((post) => post.id === currentId);
  if (index === -1) return { newer: null, older: null };
  return {
    newer: index > 0 ? sortedPosts[index - 1] : null,
    older: index < sortedPosts.length - 1 ? sortedPosts[index + 1] : null,
  };
}

/**
 * Ranks sibling articles by shared categories (+2) and shared tags (+1),
 * falling back to recency order in `sortedPosts` on ties.
 */
export function getRelatedPosts<T extends { id: string; data: BlogTaxonomy }>(
  sortedPosts: readonly T[],
  current: { id: string; data: BlogTaxonomy },
  limit = 2
): T[] {
  if (limit <= 0) return [];
  const currentCategories = new Set(current.data.categories);
  const currentTags = new Set(current.data.tags);

  return sortedPosts
    .filter((post) => post.id !== current.id)
    .map((post, index) => {
      let score = 0;
      for (const category of post.data.categories) {
        if (currentCategories.has(category)) score += 2;
      }
      for (const tag of post.data.tags) {
        if (currentTags.has(tag)) score += 1;
      }
      return { post, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.post);
}
