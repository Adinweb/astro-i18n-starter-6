import { buildSearchQueryVariants, matchesFallbackSearch } from './persian';

export interface SearchItem {
  title: string;
  description: string;
  url: string;
  locale: string;
}

export interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
}

const devIndexPromises = new Map<string, Promise<SearchItem[]>>();
let pagefindPromise: Promise<any> | null = null;
let pagefindUnavailable = false;

/** Resets cached search promises between isolated unit tests. */
export function resetSearchClientForTests(): void {
  devIndexPromises.clear();
  pagefindPromise = null;
  pagefindUnavailable = false;
}

/** Pagefind excerpts contain markup; keep only the text for safe DOM rendering. */
export function plainText(html: string): string {
  const cleanHtml = html.replace(/\u200A/g, '');
  if (typeof document === 'undefined') return cleanHtml;
  const container = document.createElement('div');
  container.innerHTML = cleanHtml;
  return (container.textContent ?? '').replace(/\u200A/g, '');
}

export async function getPagefindInstance() {
  if (!pagefindPromise) {
    const pagefindUrl = '/pagefind/pagefind.js';
    pagefindPromise = (async () => {
      const mod = await import(/* @vite-ignore */ pagefindUrl);
      await mod.init();
      return mod;
    })().catch((error) => {
      pagefindPromise = null;
      pagefindUnavailable = true;
      throw error;
    });
  }
  return pagefindPromise;
}

function loadDevSearchIndex(activeLocale: string): Promise<SearchItem[]> {
  const existing = devIndexPromises.get(activeLocale);
  if (existing) return existing;

  const request = (async () => {
    const perLocaleRes = await fetch(
      `/api/search-dev/${encodeURIComponent(activeLocale)}.json`
    );
    if (perLocaleRes.ok) {
      return (await perLocaleRes.json()) as SearchItem[];
    }
    const fallbackRes = await fetch('/api/search-dev.json');
    if (!fallbackRes.ok) {
      throw new Error(`Search index responded ${fallbackRes.status}`);
    }
    const allItems = (await fallbackRes.json()) as SearchItem[];
    return allItems.filter((item) => item.locale === activeLocale);
  })().catch((error) => {
    devIndexPromises.delete(activeLocale);
    throw error;
  });

  devIndexPromises.set(activeLocale, request);
  return request;
}

export async function executeSearch(query: string, activeLocale: string): Promise<SearchResult[]> {
  const variants = buildSearchQueryVariants(query, activeLocale);
  if (variants.length === 0) return [];

  if ((import.meta.env.PROD || !import.meta.hot) && !pagefindUnavailable) {
    try {
      const pagefind = await getPagefindInstance();
      const searchBatches = await Promise.all(
        variants.map((variant) => pagefind.search(variant))
      );

      const uniqueHandles: any[] = [];
      const seenHandleIds = new Set<string>();
      for (const batch of searchBatches) {
        for (const handle of batch?.results ?? []) {
          if (typeof handle?.id === 'string') {
            if (seenHandleIds.has(handle.id)) continue;
            seenHandleIds.add(handle.id);
          }
          uniqueHandles.push(handle);
          if (uniqueHandles.length >= 12) break;
        }
        if (uniqueHandles.length >= 12) break;
      }

      const resolvedData = await Promise.all(
        uniqueHandles.map((result: any) => result.data())
      );

      const deduplicated: SearchResult[] = [];
      const seenUrls = new Set<string>();
      for (const result of resolvedData) {
        if (!result?.url || seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);
        deduplicated.push({
          url: result.url,
          title: result.meta?.title || result.url,
          excerpt: plainText(result.excerpt || ''),
        });
        if (deduplicated.length >= 8) break;
      }

      return deduplicated;
    } catch {
      // Pagefind is unavailable (e.g. dev server); fallback to dev index.
    }
  }

  let localeItems: SearchItem[] = [];
  try {
    localeItems = await loadDevSearchIndex(activeLocale);
  } catch {
    return [];
  }

  const filtered = localeItems
    .filter((item) => item.locale === activeLocale)
    .filter((item) => matchesFallbackSearch(item.title, item.description, query))
    .slice(0, 8);

  return filtered.map((item) => ({
    url: item.url,
    title: item.title,
    excerpt: item.description,
  }));
}
