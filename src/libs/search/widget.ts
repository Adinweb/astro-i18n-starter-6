import { executeSearch, formatSearchResultsStatus } from '@/libs/search/client';

export interface SearchWidgetOptions {
  root: HTMLElement;
  input: HTMLInputElement;
  resultsContainer: HTMLElement;
  statusElement?: HTMLElement | null;
  clearButton?: HTMLElement | null;
  maxResults?: number;
  debounceMs?: number;
  messageClass?: string;
  linkClass?: string;
  excerptClass?: string;
  enableKeyboard?: boolean;
  onSelectResult?: (link: HTMLAnchorElement) => void;
  onResultsChange?: (count: number) => void;
}

export interface SearchWidgetController {
  reset: () => void;
  search: (query: string) => Promise<void>;
  destroy: () => void;
}

/**
 * Shared client controller for both the desktop `SearchModal` and mobile
 * `DrawerSearch` widgets: debounced search, stale-response guarding,
 * localized screen-reader status updates, and optional keyboard navigation.
 */
export function bindSearchWidget(options: SearchWidgetOptions): SearchWidgetController {
  const {
    root,
    input,
    resultsContainer,
    statusElement = null,
    clearButton = null,
    maxResults = 8,
    debounceMs = 150,
    messageClass = 'py-6 text-center text-sm text-muted',
    linkClass = 'block rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-surface-hover',
    excerptClass = 'mt-1 line-clamp-2 text-xs text-muted',
    enableKeyboard = false,
    onSelectResult,
    onResultsChange,
  } = options;

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let requestId = 0;
  let activeIndex = -1;
  const controller = new AbortController();

  const announceStatus = (text: string) => {
    if (statusElement) statusElement.textContent = text;
  };

  const getResultLinks = (): HTMLAnchorElement[] => [
    ...resultsContainer.querySelectorAll<HTMLAnchorElement>('a[data-search-result]'),
  ];

  const highlightResult = (index: number) => {
    if (!enableKeyboard) return;
    const links = getResultLinks();
    if (links.length === 0) {
      activeIndex = -1;
      return;
    }
    const clamped = ((index % links.length) + links.length) % links.length;
    activeIndex = clamped;
    links.forEach((link, idx) => {
      const active = idx === clamped;
      link.dataset.active = active ? 'true' : 'false';
      link.classList.toggle('border-primary/50', active);
      link.classList.toggle('bg-surface-hover', active);
      link.classList.toggle('border-transparent', !active);
      if (active) link.scrollIntoView({ block: 'nearest' });
    });
  };

  const setMessage = (text: string, announce = '') => {
    activeIndex = -1;
    resultsContainer.replaceChildren();
    const message = document.createElement('p');
    message.className = messageClass;
    message.textContent = text;
    resultsContainer.append(message);
    announceStatus(announce);
    onResultsChange?.(0);
  };

  const createResultLink = (
    href: string,
    title: string,
    excerpt: string,
    index: number
  ): HTMLAnchorElement => {
    const link = document.createElement('a');
    link.href = href;
    link.dataset.searchResult = String(index);
    link.className = linkClass;

    const heading = document.createElement('div');
    heading.className = 'text-sm font-medium text-fg';
    heading.textContent = title;
    link.append(heading);

    if (excerpt) {
      const description = document.createElement('p');
      description.className = excerptClass;
      description.textContent = excerpt;
      link.append(description);
    }

    if (enableKeyboard) {
      link.addEventListener('mouseenter', () => {
        highlightResult(index);
      });
    }

    return link;
  };

  const search = async (query: string) => {
    const currentRequest = ++requestId;
    const activeLocale = root.dataset.locale || document.documentElement.lang || 'en';
    const placeholder = root.dataset.placeholder || 'Type to search...';

    if (!query.trim()) {
      clearButton?.classList.add('hidden');
      setMessage(placeholder);
      return;
    }

    clearButton?.classList.remove('hidden');

    const results = await executeSearch(query, activeLocale);
    if (currentRequest !== requestId) return;

    if (results.length === 0) {
      const noResultsMsg = root.dataset.noResults || 'No results';
      setMessage(noResultsMsg, noResultsMsg);
      return;
    }

    const visible = results.slice(0, maxResults);
    resultsContainer.replaceChildren(
      ...visible.map((result, idx) =>
        createResultLink(result.url, result.title, result.excerpt, idx)
      )
    );
    announceStatus(
      formatSearchResultsStatus(
        results.length,
        root.dataset.resultsCount || '{count} result(s) found.',
        activeLocale
      )
    );
    onResultsChange?.(visible.length);
    if (enableKeyboard) highlightResult(0);
  };

  const reset = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
    requestId += 1;
    input.value = '';
    clearButton?.classList.add('hidden');
    setMessage(root.dataset.placeholder || 'Type to search...');
  };

  input.addEventListener(
    'input',
    () => {
      const value = input.value;
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        void search(value);
      }, debounceMs);
    },
    { signal: controller.signal }
  );

  if (clearButton) {
    clearButton.addEventListener(
      'click',
      () => {
        reset();
        input.focus();
      },
      { signal: controller.signal }
    );
  }

  if (onSelectResult) {
    resultsContainer.addEventListener(
      'click',
      (event) => {
        const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a');
        if (link) onSelectResult(link);
      },
      { signal: controller.signal }
    );
  }

  if (enableKeyboard) {
    input.addEventListener(
      'keydown',
      (event) => {
        const links = getResultLinks();
        if (links.length === 0) return;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          highlightResult(activeIndex + 1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          highlightResult(activeIndex <= 0 ? links.length - 1 : activeIndex - 1);
        } else if (event.key === 'Enter' && activeIndex >= 0 && links[activeIndex]) {
          event.preventDefault();
          const targetLink = links[activeIndex];
          onSelectResult?.(targetLink);
          targetLink.click();
        }
      },
      { signal: controller.signal }
    );
  }

  return {
    reset,
    search,
    destroy: () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      controller.abort();
    },
  };
}
