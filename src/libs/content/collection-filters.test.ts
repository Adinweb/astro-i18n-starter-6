import { describe, it, expect } from 'vitest';
import {
  buildCollectionFilterQuery,
  buildCollectionSearchHaystack,
  buildGenericCollectionFilterQuery,
  hasActiveCollectionFilters,
  hasActiveGenericCollectionFilters,
  matchesCollectionFilters,
  matchesGenericCollectionFilters,
  parseCollectionFilterPage,
  parseCollectionFilters,
  parseGenericCollectionFilters,
} from './collection-filters';
import type { GenericFilterFieldDef } from './schema-config';

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

  it('parses, serializes, and matches generic filter definitions (single, multi, select, toggle, range)', () => {
    const defs: GenericFilterFieldDef[] = [
      { name: 'medium', param: 'medium', mode: 'single', type: 'enum' },
      { name: 'styles', param: 'style', mode: 'multi', type: 'taxonomy[]' },
      { name: 'location', param: 'loc', mode: 'select', type: 'string' },
      { name: 'featured', param: 'featured', mode: 'toggle', type: 'boolean' },
      { name: 'year', param: 'year', mode: 'range', type: 'number' },
    ];

    const parsed = parseGenericCollectionFilters(
      '?medium=oil&style=minimal,abstract&loc=Tehran&featured=true&year_min=2020&year_max=2025&q=سفارش',
      defs
    );

    expect(parsed).toEqual({
      query: 'سفارش',
      values: {
        medium: 'oil',
        styles: ['minimal', 'abstract'],
        location: 'Tehran',
        featured: true,
        year: { min: 2020, max: 2025 },
      },
    });
    expect(hasActiveGenericCollectionFilters(parsed)).toBe(true);
    expect(buildGenericCollectionFilterQuery(parsed, defs, 2)).toBe(
      '?medium=oil&style=minimal%2Cabstract&loc=Tehran&featured=true&year_min=2020&year_max=2025&q=%D8%B3%D9%81%D8%A7%D8%B1%D8%B4&page=2'
    );

    const matchingEntry = {
      values: {
        medium: 'oil',
        styles: ['minimal', 'abstract', 'modern'],
        location: 'Tehran',
        featured: true,
        year: 2024,
      },
      searchHaystack: buildCollectionSearchHaystack(['تابلو سفارش خاص', 'Tehran']),
    };

    expect(matchesGenericCollectionFilters(matchingEntry, parsed, defs)).toBe(true);
    expect(
      matchesGenericCollectionFilters(
        {
          ...matchingEntry,
          values: { ...matchingEntry.values, year: 2018 },
        },
        parsed,
        defs
      )
    ).toBe(false);
    expect(
      matchesGenericCollectionFilters(
        {
          ...matchingEntry,
          values: { ...matchingEntry.values, featured: false },
        },
        parsed,
        defs
      )
    ).toBe(false);
    expect(hasActiveGenericCollectionFilters({ query: '', values: {} })).toBe(false);
  });
});
