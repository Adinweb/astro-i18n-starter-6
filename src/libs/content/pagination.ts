/**
 * Pure pagination helpers.
 *
 * Nothing here imports Astro or Paraglide, so the module can be used at build
 * time (to decide which static pages exist) and bundled for the browser
 * (to render a listing) alike.
 */

/** A slice of a collection together with the metadata a pager needs. */
export interface PageSlice<T> {
  /** The items that belong to the served page. */
  items: T[];
  /** The served page, 1-based and always within `1..totalPages`. */
  page: number;
  /** How many items a page holds. */
  perPage: number;
  /** How many items the collection holds in total. */
  totalItems: number;
  /** How many pages the collection needs. */
  totalPages: number;
  /** 1-based number of the previous page, if there is one. */
  previousPage: number | null;
  /** 1-based number of the next page, if there is one. */
  nextPage: number | null;
}

/**
 * How many pages a collection of `totalItems` needs. Always at least one, so
 * an empty collection still has a first page (which renders the empty state).
 */
export function getPageCount(totalItems: number, perPage: number): number {
  if (!Number.isFinite(perPage) || perPage < 1) return 1;
  const total = Number.isFinite(totalItems) ? Math.max(0, totalItems) : 0;
  return Math.max(1, Math.ceil(total / perPage));
}

/**
 * Clamps a requested page into the range the collection actually has, so a
 * stale link (`/blog/page/99/`) can never produce an out-of-range slice.
 */
export function clampPage(page: number, totalPages: number): number {
  const safeTotal = Math.max(1, Math.trunc(totalPages) || 1);
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.trunc(page), 1), safeTotal);
}

/**
 * Slices a collection into one page and reports its neighbours.
 *
 * The returned `page` is the clamped one, so the caller can always trust it
 * to describe the slice it received.
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  perPage: number
): PageSlice<T> {
  const totalItems = items.length;
  const totalPages = getPageCount(totalItems, perPage);
  const current = clampPage(page, totalPages);
  const start = (current - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    page: current,
    perPage,
    totalItems,
    totalPages,
    previousPage: current > 1 ? current - 1 : null,
    nextPage: current < totalPages ? current + 1 : null,
  };
}

/**
 * A hole in the page window. It is rendered as an ellipsis instead of a
 * number, so the pager never grows wider than the viewport.
 */
export const PAGE_GAP = 'gap' as const;

export type PageWindowEntry = number | typeof PAGE_GAP;

/**
 * The page numbers a pager should render around the current page.
 *
 * The first and the last page are always present; a window of `radius`
 * neighbours around the current page fills the space between them. Holes
 * become `PAGE_GAP` entries.
 */
export function buildPageWindow(
  page: number,
  totalPages: number,
  radius = 1
): PageWindowEntry[] {
  const safeTotal = Math.max(1, Math.trunc(totalPages) || 1);
  const current = clampPage(page, safeTotal);
  const span = Math.max(0, Math.trunc(radius));

  // Few enough pages: show them all instead of gaps.
  if (safeTotal <= span * 2 + 5) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, safeTotal]);
  for (let candidate = current - span; candidate <= current + span; candidate += 1) {
    if (candidate >= 1 && candidate <= safeTotal) pages.add(candidate);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const window: PageWindowEntry[] = [];

  sorted.forEach((entry, index) => {
    if (index > 0 && entry - sorted[index - 1] > 1) window.push(PAGE_GAP);
    window.push(entry);
  });

  return window;
}
