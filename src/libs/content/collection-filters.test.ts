import { describe, it, expect } from 'vitest';
import {
  buildCollectionFilterQuery,
  buildCollectionSearchHaystack,
  hasActiveCollectionFilters,
  matchesCollectionFilters,
  parseCollectionFilterPage,
  parseCollectionFilters,
} from './collection-filters';

describe('src/libs/content/collection-filters.ts', () => {
  it('parses and serializes category, stack, query, and page parameters consistently', () => {
    const parsed = parseCollectionFilters('?category=engineering&stack=Astro,TypeScript&q=atlas&page=2');
    expect(parsed).toEqual({
      category: 'engineering',
      stacks: ['Astro', 'TypeScript'],
      query: 'atlas',
    });
    expect(parseCollectionFilterPage('?page=3')).toBe(3);
    expect(parseCollectionFilterPage('?page=0')).toBe(1);
    expect(buildCollectionFilterQuery(parsed, 2)).toBe(
      '?category=engineering&stack=Astro%2CTypeScript&q=atlas&page=2'
    );
    expect(buildCollectionFilterQuery({ category: '', stacks: [], query: '' }, 2)).toBe('');
  });

  it('matches entries against normalized Persian/Latin search haystacks, category, and stack', () => {
    const entry = {
      categories: ['engineering'],
      stack: ['Astro', 'TypeScript'],
      searchHaystack: buildCollectionSearchHaystack(['Atlas Cloud', 'بیمه ۱۴۰۰', 'Astro']),
    };

    expect(matchesCollectionFilters(entry, { category: 'engineering', stacks: ['Astro'], query: 'atlas' })).toBe(true);
    expect(matchesCollectionFilters(entry, { category: '', stacks: [], query: '1400' })).toBe(true);
    expect(matchesCollectionFilters(entry, { category: 'guides', stacks: [], query: '' })).toBe(false);
    expect(hasActiveCollectionFilters({ category: '', stacks: [], query: ' ' })).toBe(false);
  });
});
