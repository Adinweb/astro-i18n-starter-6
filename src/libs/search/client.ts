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
  if (typeof document === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.textContent ?? '';
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
  const trimmed = query.trim();
  if (!trimmed) return [];

  if ((import.meta.env.PROD || !import.meta.hot) && !pagefindUnavailable) {
    try {
      const pagefind = await getPagefindInstance();
      const search = await pagefind.search(trimmed);
      const pagefindResults = await Promise.all(
        search.results.slice(0, 8).map((result: any) => result.data())
      );

      return pagefindResults.map((result: any) => ({
        url: result.url,
        title: result.meta?.title || result.url,
        excerpt: plainText(result.excerpt || ''),
      }));
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

  const normalized = trimmed.toLowerCase();
  const filtered = localeItems
    .filter((item) => item.locale === activeLocale)
    .filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized)
    )
    .slice(0, 8);

  return filtered.map((item) => ({
    url: item.url,
    title: item.title,
    excerpt: item.description,
  }));
}
