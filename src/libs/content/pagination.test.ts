import { describe, it, expect } from 'vitest';
import {
  PAGE_GAP,
  buildPageWindow,
  clampPage,
  getPageCount,
  paginate,
} from './pagination';

describe('src/libs/content/pagination.ts', () => {
  describe('getPageCount', () => {
    it('always reports at least one page', () => {
      expect(getPageCount(0, 9)).toBe(1);
      expect(getPageCount(0, 0)).toBe(1);
      expect(getPageCount(-5, 9)).toBe(1);
    });

    it('rounds up a partial last page', () => {
      expect(getPageCount(9, 9)).toBe(1);
      expect(getPageCount(10, 9)).toBe(2);
      expect(getPageCount(18, 9)).toBe(2);
      expect(getPageCount(19, 9)).toBe(3);
    });
  });

  describe('clampPage', () => {
    it('keeps a page inside the available range', () => {
      expect(clampPage(2, 5)).toBe(2);
      expect(clampPage(0, 5)).toBe(1);
      expect(clampPage(-3, 5)).toBe(1);
      expect(clampPage(99, 5)).toBe(5);
    });

    it('survives a broken page count', () => {
      expect(clampPage(3, 0)).toBe(1);
      expect(clampPage(3, Number.NaN)).toBe(1);
      expect(clampPage(Number.NaN, 4)).toBe(1);
    });
  });

  describe('paginate', () => {
    const items = Array.from({ length: 10 }, (_, index) => index + 1);

    it('slices the requested page and reports its neighbours', () => {
      const result = paginate(items, 2, 4);
      expect(result.items).toEqual([5, 6, 7, 8]);
      expect(result.page).toBe(2);
      expect(result.totalItems).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(result.previousPage).toBe(1);
      expect(result.nextPage).toBe(3);
    });

    it('has no previous page on the first and no next page on the last', () => {
      expect(paginate(items, 1, 4).previousPage).toBeNull();
      expect(paginate(items, 1, 4).nextPage).toBe(2);
      expect(paginate(items, 3, 4).nextPage).toBeNull();
    });

    it('clamps a page that does not exist', () => {
      const result = paginate(items, 99, 4);
      expect(result.page).toBe(3);
      expect(result.items).toEqual([9, 10]);
    });

    it('returns an empty slice for an empty collection', () => {
      const result = paginate([], 1, 9);
      expect(result.items).toEqual([]);
      expect(result.totalPages).toBe(1);
      expect(result.nextPage).toBeNull();
    });
  });

  describe('buildPageWindow', () => {
    it('lists every page when there are few', () => {
      expect(buildPageWindow(1, 3)).toEqual([1, 2, 3]);
      expect(buildPageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('keeps the first, the last and the neighbourhood of the current page', () => {
      expect(buildPageWindow(5, 10)).toEqual([1, PAGE_GAP, 4, 5, 6, PAGE_GAP, 10]);
      expect(buildPageWindow(1, 10)).toEqual([1, 2, PAGE_GAP, 10]);
      expect(buildPageWindow(10, 10)).toEqual([1, PAGE_GAP, 9, 10]);
    });

    it('clamps the current page before building the window', () => {
      expect(buildPageWindow(99, 10)).toEqual([1, PAGE_GAP, 9, 10]);
    });
  });
});
