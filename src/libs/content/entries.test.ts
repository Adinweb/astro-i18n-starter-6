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
  });

  describe('groupPublishedEntries', () => {
    it('skips drafts and groups by group then locale', () => {
      const grouped = groupPublishedEntries(
        [post('first/en'), post('first/de'), post('second/de'), post('draft/en', undefined, true)],
        'blog'
      );

      expect([...grouped.keys()]).toEqual(['first', 'second']);
      expect([...grouped.get('first')!.keys()]).toEqual(['en', 'de']);
      expect(grouped.get('second')!.has('en')).toBe(false);
    });

    it('fails on a duplicate group/locale entry', () => {
      expect(() =>
        groupPublishedEntries([post('first/en'), post('first/en')], 'blog')
      ).toThrow(/Duplicate blog entry for "first\/en"/);
    });
  });

  describe('locale selection', () => {
    const entries = [
      post('first/en', '2026-01-01T00:00:00Z'),
      post('second/en', '2026-03-01T00:00:00Z'),
      post('first/de', '2026-02-01T00:00:00Z'),
      post('hidden/en', '2026-04-01T00:00:00Z', true),
    ];

    it('returns only published entries of the requested locale', () => {
      expect(getPublishedLocaleEntries(entries, 'en').map((entry) => entry.id)).toEqual([
        'first/en',
        'second/en',
      ]);
      expect(getPublishedLocaleEntries(entries, 'de').map((entry) => entry.id)).toEqual([
        'first/de',
      ]);
    });

    it('sorts the locale selection newest first', () => {
      expect(getSortedLocaleEntries(entries, 'en').map((entry) => entry.id)).toEqual([
        'second/en',
        'first/en',
      ]);
    });
  });
});
