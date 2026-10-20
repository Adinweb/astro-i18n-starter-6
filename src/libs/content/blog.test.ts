import { describe, it, expect } from 'vitest';
import {
  NO_FILTERS,
  buildBlogFilterQuery,
  collectTaxonomyKeys,
  filterBlogPosts,
  getReadingTime,
  hasActiveFilters,
  humanizeKey,
  matchesBlogFilters,
  parseBlogFilters,
  toggleBlogTag,
} from './blog';

const posts = [
  { categories: ['engineering'], tags: ['astro', 'performance'] },
  { categories: ['guides'], tags: ['astro', 'i18n'] },
  { categories: ['engineering'], tags: ['rtl'] },
];

describe('src/libs/content/blog.ts', () => {
  describe('parseBlogFilters', () => {
    it('returns empty filters for an empty search', () => {
      expect(parseBlogFilters('')).toEqual(NO_FILTERS);
      expect(parseBlogFilters('?')).toEqual(NO_FILTERS);
    });

    it('reads category and comma-separated tags, accepting a leading "?"', () => {
      expect(parseBlogFilters('?category=engineering&tag=astro,rtl')).toEqual({
        category: 'engineering',
        tags: ['astro', 'rtl'],
      });
      expect(parseBlogFilters('category=guides&tag=i18n')).toEqual({
        category: 'guides',
        tags: ['i18n'],
      });
    });

    it('deduplicates tags and ignores blank values', () => {
      expect(parseBlogFilters('tag=astro,,astro&category=')).toEqual({
        category: null,
        tags: ['astro'],
      });
    });
  });

  describe('buildBlogFilterQuery', () => {
    it('returns an empty string when nothing is selected', () => {
      expect(buildBlogFilterQuery(NO_FILTERS)).toBe('');
    });

    it('round-trips through parseBlogFilters', () => {
      const filters = { category: 'engineering', tags: ['astro', 'rtl'] };
      const query = buildBlogFilterQuery(filters);
      expect(query).toBe('?category=engineering&tag=astro%2Crtl');
      expect(parseBlogFilters(query)).toEqual(filters);
    });
  });

  describe('matchesBlogFilters', () => {
    it('matches everything without filters', () => {
      expect(posts.every((post) => matchesBlogFilters(post, NO_FILTERS))).toBe(true);
    });

    it('requires the selected category and every selected tag', () => {
      expect(filterBlogPosts(posts, { category: 'engineering', tags: [] })).toHaveLength(2);
      expect(
        filterBlogPosts(posts, { category: 'engineering', tags: ['astro'] })
      ).toEqual([posts[0]]);
      expect(
        filterBlogPosts(posts, { category: null, tags: ['astro', 'i18n'] })
      ).toEqual([posts[1]]);
      expect(filterBlogPosts(posts, { category: 'guides', tags: ['rtl'] })).toHaveLength(0);
    });
  });

  describe('toggleBlogTag', () => {
    it('adds and removes tags without mutating the input', () => {
      const base = { category: 'guides', tags: ['astro'] };
      const added = toggleBlogTag(base, 'rtl');
      expect(added).toEqual({ category: 'guides', tags: ['astro', 'rtl'] });
      expect(base.tags).toEqual(['astro']);

      expect(toggleBlogTag(added, 'astro')).toEqual({ category: 'guides', tags: ['rtl'] });
    });
  });

  describe('hasActiveFilters', () => {
    it('detects category and tag selections', () => {
      expect(hasActiveFilters(NO_FILTERS)).toBe(false);
      expect(hasActiveFilters({ category: 'guides', tags: [] })).toBe(true);
      expect(hasActiveFilters({ category: null, tags: ['rtl'] })).toBe(true);
    });
  });

  describe('getReadingTime', () => {
    it('never reports less than one minute and scales with length', () => {
      expect(getReadingTime(undefined)).toBe(1);
      expect(getReadingTime('short body')).toBe(1);
      const longBody = Array.from({ length: 900 }, () => 'word').join(' ');
      expect(getReadingTime(longBody)).toBe(5);
    });
  });

  describe('taxonomy helpers', () => {
    it('humanizes keys', () => {
      expect(humanizeKey('design-systems')).toBe('Design Systems');
      expect(humanizeKey('rtl')).toBe('Rtl');
    });

    it('collects distinct keys in first-seen order', () => {
      expect(collectTaxonomyKeys(posts, 'categories')).toEqual(['engineering', 'guides']);
      expect(collectTaxonomyKeys(posts, 'tags')).toEqual([
        'astro',
        'performance',
        'i18n',
        'rtl',
      ]);
    });
  });
});
