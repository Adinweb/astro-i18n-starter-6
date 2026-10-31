import { describe, it, expect } from 'vitest';
import {
  getPublishedLocaleEntries,
  getSortedLocaleEntries,
  groupPublishedEntries,
  isPublished,
  parseContentEntryId,
  sortByPublishedAtDesc,
  type DatedContentEntry,
} from './entries';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/locales';

const altLocale: Locale = LOCALES.find((locale) => locale !== DEFAULT_LOCALE) ?? DEFAULT_LOCALE;

function post(
  id: string,
  publishedAt = '2026-01-01T00:00:00Z',
  draft = false
): DatedContentEntry {
  return { id, data: { publishedAt: new Date(publishedAt), draft } };
}

describe('src/libs/content/entries.ts', () => {
  describe('parseContentEntryId', () => {
    it('splits a group path and its locale', () => {
      expect(parseContentEntryId('first-post/en')).toEqual({
        group: 'first-post',
        locale: 'en',
      });
      expect(parseContentEntryId('release/2026/en')).toEqual({
        group: 'release/2026',
        locale: 'en',
      });
    });

    it('rejects an entry without a locale folder', () => {
      expect(() => parseContentEntryId('first-post')).toThrow(/Invalid content entry ID/);
    });

    it('rejects a locale that is not registered', () => {
      expect(() => parseContentEntryId('first-post/es')).toThrow(/Unknown locale "es"/);
    });
  });

  describe('isPublished', () => {
    it('treats a missing draft flag as published', () => {
      expect(isPublished({ id: 'about/en', data: {} })).toBe(true);
      expect(isPublished({ id: 'about/en', data: { draft: false } })).toBe(true);
      expect(isPublished({ id: 'about/en', data: { draft: true } })).toBe(false);
    });
  });

  describe('sortByPublishedAtDesc', () => {
    it('orders newest first without mutating the input', () => {
      const entries = [
        post('a/en', '2026-01-01T00:00:00Z'),
        post('b/en', '2026-03-01T00:00:00Z'),
        post('c/en', '2026-02-01T00:00:00Z'),
      ];

      expect(sortByPublishedAtDesc(entries).map((entry) => entry.id)).toEqual([
        'b/en',
        'c/en',
        'a/en',
      ]);
      expect(entries.map((entry) => entry.id)).toEqual(['a/en', 'b/en', 'c/en']);
    });

    it('breaks ties deterministically by lexical entry ID when timestamps match', () => {
      const forward = [
        post('zeta/en', '2026-05-01T00:00:00Z'),
        post('alpha/en', '2026-05-01T00:00:00Z'),
        post('middle/en', '2026-05-01T00:00:00Z'),
      ];
      const reversed = [...forward].reverse();

      const expected = ['alpha/en', 'middle/en', 'zeta/en'];
      expect(sortByPublishedAtDesc(forward).map((entry) => entry.id)).toEqual(expected);
      expect(sortByPublishedAtDesc(reversed).map((entry) => entry.id)).toEqual(expected);
    });
  });

  describe('groupPublishedEntries', () => {
    it('skips drafts and groups by group then locale', () => {
      const grouped = groupPublishedEntries(
        [
          post(`first/${DEFAULT_LOCALE}`),
          post(`first/${altLocale}`),
          post(`second/${altLocale}`),
          post(`draft/${DEFAULT_LOCALE}`, undefined, true),
        ],
        'blog'
      );

      expect([...grouped.keys()]).toEqual(['first', 'second']);
      expect([...grouped.get('first')!.keys()]).toEqual([DEFAULT_LOCALE, altLocale]);
      expect(grouped.get('second')!.has(DEFAULT_LOCALE)).toBe(false);
    });

    it('fails on a duplicate group/locale entry', () => {
      expect(() =>
        groupPublishedEntries([post(`first/${DEFAULT_LOCALE}`), post(`first/${DEFAULT_LOCALE}`)], 'blog')
      ).toThrow(new RegExp(`Duplicate blog entry for "first/${DEFAULT_LOCALE}"`));
    });
  });

  describe('locale selection', () => {
    const entries = [
      post(`first/${DEFAULT_LOCALE}`, '2026-01-01T00:00:00Z'),
      post(`second/${DEFAULT_LOCALE}`, '2026-03-01T00:00:00Z'),
      post(`first/${altLocale}`, '2026-02-01T00:00:00Z'),
      post(`hidden/${DEFAULT_LOCALE}`, '2026-04-01T00:00:00Z', true),
    ];

    it('returns only published entries of the requested locale', () => {
      expect(getPublishedLocaleEntries(entries, DEFAULT_LOCALE).map((entry) => entry.id)).toEqual([
        `first/${DEFAULT_LOCALE}`,
        `second/${DEFAULT_LOCALE}`,
      ]);
      expect(getPublishedLocaleEntries(entries, altLocale).map((entry) => entry.id)).toEqual([
        `first/${altLocale}`,
      ]);
    });

    it('sorts the locale selection newest first', () => {
      expect(getSortedLocaleEntries(entries, DEFAULT_LOCALE).map((entry) => entry.id)).toEqual([
        `second/${DEFAULT_LOCALE}`,
        `first/${DEFAULT_LOCALE}`,
      ]);
    });
  });
});
