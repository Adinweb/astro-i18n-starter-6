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

let searchData: SearchItem[] = [];
let isFetchingDevIndex = false;
let pagefindPromise: Promise<any> | null = null;
let pagefindUnavailable = false;

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

  if (searchData.length === 0 && !isFetchingDevIndex) {
    isFetchingDevIndex = true;
    try {
      const response = await fetch('/api/search-dev.json');
      if (!response.ok) throw new Error(`Search index responded ${response.status}`);
      searchData = await response.json();
    } catch {
      searchData = [];
    } finally {
      isFetchingDevIndex = false;
    }
  }

  const normalized = trimmed.toLowerCase();
  const filtered = searchData
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
