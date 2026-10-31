import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeSearch,
  getPagefindInstance,
  plainText,
  resetSearchClientForTests,
  type SearchItem,
  type SearchResult,
} from './client';
import {
  applyPersianZwnjCompounds,
  buildSearchQueryVariants,
  matchesFallbackSearch,
  normalizeForFallbackMatch,
  normalizePersianQuery,
} from './persian';
import {
  normalizeTextNodeForPagefind,
  prepareHtmlForPagefind,
} from '../../../scripts/index-pagefind.mjs';

describe('src/libs/search/client.ts & persian.ts', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetSearchClientForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns plainText safely in Node environments and strips hair-space delimiters', () => {
    expect(plainText('Hello <mark>Astro</mark>')).toBe('Hello <mark>Astro</mark>');
    expect(plainText('اصل «\u200Aمنبع واحد حقیقت\u200A»')).toBe('اصل «منبع واحد حقیقت»');
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

  it('normalizes Arabic Yeh/Kaf, tatweel, harakat, and Eastern Arabic digits in Persian queries', () => {
    expect(normalizePersianQuery('ويژگي‌هاي كليديِ پـروژه ١٤٠٥')).toBe('ویژگی‌های کلیدی پروژه ۱۴۰۵');
    expect(normalizePersianQuery('«منبع واحد حقیقت»،')).toBe('منبع واحد حقیقت');
  });

  it('converts space-separated Persian affixes and compound stems into ZWNJ without merging separate words', () => {
    expect(applyPersianZwnjCompounds('صفحه بندی وبلاگ')).toBe('صفحه‌بندی وبلاگ');
    expect(applyPersianZwnjCompounds('راست به چپ بومی')).toBe('راست‌به‌چپ بومی');
    expect(applyPersianZwnjCompounds('فاصله گذاری ها')).toBe('فاصله‌گذاری‌ها');
    expect(applyPersianZwnjCompounds('ایزوله سازی کد')).toBe('ایزوله‌سازی کد');
    expect(applyPersianZwnjCompounds('به روزرسانی های سریع تر')).toBe('به‌روزرسانی‌های سریع‌تر');
    expect(applyPersianZwnjCompounds('فرانت اند')).toBe('فرانت‌اند');
  });

  it('builds prioritized Pagefind query variants for ZWNJ, hamza/yeh, and numeral scripts', () => {
    const compoundVariants = buildSearchQueryVariants('صفحه بندی وبلاگ', 'fa');
    expect(compoundVariants[0]).toBe('صفحه‌بندی وبلاگ');
    expect(compoundVariants).toContain('صفحه بندی وبلاگ');

    const hamzaVariants = buildSearchQueryVariants('ارایه', 'fa');
    expect(hamzaVariants).toContain('ارایه');
    expect(hamzaVariants).toContain('ارائه');

    const numeralVariants = buildSearchQueryVariants('1405', 'fa');
    expect(numeralVariants[0]).toBe('۱۴۰۵');
    expect(numeralVariants).toContain('1405');

    expect(buildSearchQueryVariants('Astro routing', 'en')).toEqual(['Astro routing']);
  });

  it('matches Persian fallback items across ZWNJ/space/joined forms, Arabic ي/ك, hamza, and digits', () => {
    const title = 'ویژگی‌ها و صفحه‌بندی وبلاگ ۱۴۰۵';
    const desc = 'ارائهٔ معماری راست‌به‌چپ و ایزوله‌سازی کد.';

    expect(normalizeForFallbackMatch('ويژگي ها')).toBe('ویژگی ها');
    expect(matchesFallbackSearch(title, desc, 'ويژگي ها')).toBe(true);
    expect(matchesFallbackSearch(title, desc, 'صفحه بندی وبلاگ')).toBe(true);
    expect(matchesFallbackSearch(title, desc, 'صفحهبندی')).toBe(true);
    expect(matchesFallbackSearch(title, desc, 'راست به چپ')).toBe(true);
    expect(matchesFallbackSearch(title, desc, 'ارایه معماری')).toBe(true);
    expect(matchesFallbackSearch(title, desc, 'كد')).toBe(true);
    expect(matchesFallbackSearch(title, desc, '1405')).toBe(true);
  });

  it('executes Persian fallback search end-to-end when Pagefind is unavailable', async () => {
    const faItems: SearchItem[] = [
      {
        title: 'ویژگی‌ها',
        description: 'پشتیبانی از صفحه‌بندی و چیدمان راست‌به‌چپ در ۱۴۰۵.',
        url: '/fa/ویژگی‌ها/',
        locale: 'fa',
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => faItems,
    } as Response) as unknown as typeof fetch;

    const results = await executeSearch('ويژگي صفحه بندي 1405', 'fa');
    expect(results).toHaveLength(1);
    expect(results[0]?.url).toBe('/fa/ویژگی‌ها/');
  });

  it('prepares Persian HTML for Pagefind without mutating code blocks, scripts, or non-Persian pages', () => {
    expect(normalizeTextNodeForPagefind('اصل «منبع» و كارت‌ها،', 'fa')).toBe(
      'اصل «\u200Aمنبع\u200A» و کارت‌ها\u200A،'
    );

    const sampleFaHtml =
      '<html lang="fa" dir="rtl"><head><title>ويژگي‌ها</title></head>' +
      '<body><main data-pagefind-body><p>اصل «منبع واحد حقیقت»</p>' +
      '<pre><code>const x = "«منبع» ي ك";</code></pre></main></body></html>';

    const prepared = prepareHtmlForPagefind(sampleFaHtml);
    expect(prepared).toContain('<title>ویژگی‌ها</title>');
    expect(prepared).toContain('«\u200Aمنبع واحد حقیقت\u200A»');
    expect(prepared).toContain('<pre><code>const x = "«منبع» ي ك";</code></pre>');

    const sampleEnHtml = '<html lang="en"><body><p>Hello «world»</p></body></html>';
    expect(prepareHtmlForPagefind(sampleEnHtml)).toBe(sampleEnHtml);
  });
});
