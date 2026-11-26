import { formatNumber } from '@/i18n/format';
import { buildPageWindow, PAGE_GAP } from '@/libs/content/pagination';
import { buttonClasses } from '@/libs/ui/button';

/**
 * Clones an `<Icon />` pre-rendered inside a `<template data-icon-template="...">`
 * element so client scripts never embed raw SVG paths.
 */
export function cloneTemplateIcon(
  name: string,
  size: number,
  extraClass = ''
): SVGElement | null {
  const template = document.querySelector<HTMLTemplateElement>(
    `template[data-icon-template="${name}"]`
  );
  const node = template?.content.firstElementChild?.cloneNode(true) as
    | SVGElement
    | null
    | undefined;
  if (!node) return null;
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  if (extraClass) node.classList.add(...extraClass.split(' ').filter(Boolean));
  return node;
}

export interface DynamicPaginationOptions {
  container: HTMLElement;
  locale: string;
  currentPage: number;
  totalPages: number;
  makePageHref: (page: number) => string;
  pageStatusTemplate: string;
  pageLabelTemplate: string;
  prevLabel: string;
  nextLabel: string;
  pagerAriaLabel: string;
  statusDataKey?: 'blogPageStatus' | 'collectionPageStatus';
  navDataKey?: 'blogPagination' | 'collectionPagination';
}

export function renderDynamicPagination(options: DynamicPaginationOptions): boolean {
  const {
    container,
    locale,
    currentPage,
    totalPages,
    makePageHref,
    pageStatusTemplate,
    pageLabelTemplate,
    prevLabel,
    nextLabel,
    pagerAriaLabel,
    statusDataKey = 'blogPageStatus',
    navDataKey = 'blogPagination',
  } = options;

  if (totalPages <= 1) {
    container.hidden = true;
    return false;
  }

  container.hidden = false;
  container.replaceChildren();

  const statusEl = document.createElement('p');
  statusEl.className = 'text-center text-xs text-muted';
  statusEl.dataset[statusDataKey] = '';
  statusEl.textContent = pageStatusTemplate
    .replace('{page}', formatNumber(currentPage, locale))
    .replace('{totalPages}', formatNumber(totalPages, locale));

  const nav = document.createElement('nav');
  nav.className = 'flex flex-wrap items-center justify-center gap-1.5';
  nav.setAttribute('aria-label', pagerAriaLabel);
  nav.dataset[navDataKey] = '';

  if (currentPage > 1) {
    const prev = document.createElement('a');
    prev.href = makePageHref(currentPage - 1);
    prev.dataset.dynamicPage = String(currentPage - 1);
    prev.className = buttonClasses({ variant: 'secondary', size: 'sm' });
    const prevIcon = cloneTemplateIcon('chevron-left', 16, 'shrink-0 rtl:rotate-180');
    if (prevIcon) prev.append(prevIcon);
    prev.append(document.createTextNode(prevLabel));
    nav.append(prev);
  }

  for (const entry of buildPageWindow(currentPage, totalPages)) {
    if (entry === PAGE_GAP) {
      const gap = document.createElement('span');
      gap.className = 'px-1 text-xs text-muted';
      gap.setAttribute('aria-hidden', 'true');
      gap.textContent = '…';
      nav.append(gap);
    } else {
      const link = document.createElement('a');
      link.href = makePageHref(entry);
      link.dataset.dynamicPage = String(entry);
      link.setAttribute(
        'aria-label',
        pageLabelTemplate.replace('{page}', formatNumber(entry, locale))
      );
      if (entry === currentPage) link.setAttribute('aria-current', 'page');
      link.className = 'chip h-9 min-w-9 justify-center px-3 text-xs';
      link.textContent = formatNumber(entry, locale);
      nav.append(link);
    }
  }

  if (currentPage < totalPages) {
    const next = document.createElement('a');
    next.href = makePageHref(currentPage + 1);
    next.dataset.dynamicPage = String(currentPage + 1);
    next.className = buttonClasses({ variant: 'secondary', size: 'sm' });
    next.append(document.createTextNode(nextLabel));
    const nextIcon = cloneTemplateIcon('chevron-right', 16, 'shrink-0 rtl:rotate-180');
    if (nextIcon) next.append(nextIcon);
    nav.append(next);
  }

  container.append(statusEl, nav);
  return true;
}
