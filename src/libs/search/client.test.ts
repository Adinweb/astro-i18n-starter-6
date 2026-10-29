import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeSearch,
  getPagefindInstance,
  plainText,
  resetSearchClientForTests,
  type SearchItem,
  type SearchResult,
} from './client';

describe('src/libs/search/client.ts', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetSearchClientForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns plainText safely in Node environments without document', () => {
    expect(plainText('Hello <mark>Astro</mark>')).toBe('Hello <mark>Astro</mark>');
  });

  it('exposes getPagefindInstance rejection cleanly when static bundle is absent', async () => {
    await expect(getPagefindInstance()).rejects.toBeDefined();
  });

  it('deduplicates concurrent dev search fetches so parallel keystrokes never return empty []', async () => {
    const sampleItems: SearchItem[] = [
      {
        title: 'Astro Multilingual Architecture',
        description: 'Native RTL and LTR routing.',
        url: '/blog/first-post/',
        locale: 'en',
      },
      {
        title: 'Pricing Overview',
        description: 'Open source starter tiers.',
        url: '/pricing/',
        locale: 'en',
      },
    ];

    let resolveFetch!: (value: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchSpy = vi.fn().mockReturnValue(pendingResponse);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const firstCall = executeSearch('astro', 'en');
    const secondCall = executeSearch('pricing', 'en');

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => sampleItems,
    } as Response);

    const [firstResults, secondResults]: [SearchResult[], SearchResult[]] = await Promise.all([
      firstCall,
      secondCall,
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/search-dev/en.json');
    expect(firstResults).toEqual([
      {
        title: 'Astro Multilingual Architecture',
        excerpt: 'Native RTL and LTR routing.',
        url: '/blog/first-post/',
      },
    ]);
    expect(secondResults).toEqual([
      {
        title: 'Pricing Overview',
        excerpt: 'Open source starter tiers.',
        url: '/pricing/',
      },
    ]);
  });
});
