import { describe, it, expect } from 'vitest';
import {
  NO_FILTERS,
  areBlogFiltersEqual,
  buildBlogFilterQuery,
  collectTaxonomyKeys,
  filterBlogPosts,
  filterTocHeadings,
  getAdjacentPosts,
  getReadingTime,
  getRelatedPosts,
  hasActiveFilters,
  humanizeKey,
  matchesBlogFilters,
  parseBlogFilterPage,
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

    it('round-trips through parseBlogFilters and serializes filtered page > 1', () => {
      const filters = { category: 'engineering', tags: ['astro', 'rtl'] };
      const query = buildBlogFilterQuery(filters);
      expect(query).toBe('?category=engineering&tag=astro%2Crtl');
      expect(parseBlogFilters(query)).toEqual(filters);
      expect(parseBlogFilterPage(query)).toBe(1);

      const pagedQuery = buildBlogFilterQuery(filters, 3);
      expect(pagedQuery).toBe('?category=engineering&tag=astro%2Crtl&page=3');
      expect(parseBlogFilterPage(pagedQuery)).toBe(3);
      expect(parseBlogFilterPage('?page=0')).toBe(1);
      expect(parseBlogFilterPage('?page=abc')).toBe(1);
      expect(buildBlogFilterQuery(NO_FILTERS, 3)).toBe('');
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

  describe('hasActiveFilters & areBlogFiltersEqual', () => {
    it('detects category and tag selections', () => {
      expect(hasActiveFilters(NO_FILTERS)).toBe(false);
      expect(hasActiveFilters({ category: 'guides', tags: [] })).toBe(true);
      expect(hasActiveFilters({ category: null, tags: ['rtl'] })).toBe(true);
    });

    it('compares filter states regardless of tag order', () => {
      expect(areBlogFiltersEqual(NO_FILTERS, { category: null, tags: [] })).toBe(true);
      expect(
        areBlogFiltersEqual(
          { category: 'engineering', tags: ['astro', 'rtl'] },
          { category: 'engineering', tags: ['rtl', 'astro'] }
        )
      ).toBe(true);
      expect(
        areBlogFiltersEqual(
          { category: 'engineering', tags: ['astro'] },
          { category: 'guides', tags: ['astro'] }
        )
      ).toBe(false);
      expect(
        areBlogFiltersEqual(
          { category: 'engineering', tags: ['astro'] },
          { category: 'engineering', tags: ['astro', 'rtl'] }
        )
      ).toBe(false);
    });
  });

  describe('getReadingTime', () => {
    it('never reports less than one minute and scales with length', () => {
      expect(getReadingTime(undefined)).toBe(1);
      expect(getReadingTime('short body')).toBe(1);
      const longBody = Array.from({ length: 900 }, () => 'word').join(' ');
      expect(getReadingTime(longBody)).toBe(5);
    });

    it('strips fenced code blocks, MDX imports, and JSX tags before counting words', () => {
      const codeBlock = '```ts\n' + Array.from({ length: 1200 }, () => 'const x = 1;').join('\n') + '\n```';
      const mdxBody = [
        "import ContactForm from '@/components/ContactForm.astro';",
        'export const meta = { version: 1 };',
        '<div class="rounded-2xl border border-border p-6">',
        'Short editorial paragraph with twenty readable prose words right here.',
        '</div>',
        codeBlock,
      ].join('\n\n');
      expect(getReadingTime(mdxBody)).toBe(1);
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

  describe('editorial article helpers', () => {
    it('filters TOC headings to h2/h3 and requires at least two entries', () => {
      expect(
        filterTocHeadings([{ depth: 2, slug: 'only-one', text: 'Only One' }])
      ).toEqual([]);

      expect(
        filterTocHeadings([
          { depth: 1, slug: 'h1', text: 'Title' },
          { depth: 2, slug: 'intro', text: 'Introduction' },
          { depth: 3, slug: 'details', text: 'Details' },
          { depth: 4, slug: 'deep', text: 'Deep Note' },
        ])
      ).toEqual([
        { depth: 2, slug: 'intro', text: 'Introduction' },
        { depth: 3, slug: 'details', text: 'Details' },
      ]);
    });

    it('resolves newer and older neighbours in a newest-first list', () => {
      const entries = [{ id: 'newest/en' }, { id: 'middle/en' }, { id: 'oldest/en' }];
      expect(getAdjacentPosts(entries, 'newest/en')).toEqual({
        newer: null,
        older: entries[1],
      });
      expect(getAdjacentPosts(entries, 'middle/en')).toEqual({
        newer: entries[0],
        older: entries[2],
      });
      expect(getAdjacentPosts(entries, 'oldest/en')).toEqual({
        newer: entries[1],
        older: null,
      });
    });

    it('scores related posts by shared categories and tags with recency tie-break', () => {
      const catalog = [
        { id: 'p1/en', data: { categories: ['announcements'], tags: ['release'] } },
        { id: 'p2/en', data: { categories: ['engineering'], tags: ['astro', 'rtl'] } },
        { id: 'p3/en', data: { categories: ['guides'], tags: ['astro'] } },
        { id: 'p4/en', data: { categories: ['engineering'], tags: ['performance'] } },
      ];
      const current = catalog[1];
      const related = getRelatedPosts(catalog, current, 2);
      expect(related.map((item) => item.id)).toEqual(['p4/en', 'p3/en']);
    });
  });
});
