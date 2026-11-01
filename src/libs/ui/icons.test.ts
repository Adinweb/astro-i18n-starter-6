import { describe, it, expect } from 'vitest';
import {
  FALLBACK_ICON,
  SITE_ICONS,
  isDirectionalIcon,
  isIconName,
  resolveIconName,
  type IconName,
} from './icons';
import { PAGE_ITEMS, getContentTypeIcon } from '@/libs/config/navigation';

describe('src/libs/ui/icons.ts', () => {
  describe('SITE_ICONS', () => {
    it('is a unique, kebab-case list with a fallback entry', () => {
      expect(new Set(SITE_ICONS).size).toBe(SITE_ICONS.length);
      for (const name of SITE_ICONS) expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(SITE_ICONS).toContain(FALLBACK_ICON);
    });
  });

  describe('isIconName() / resolveIconName()', () => {
    it('accepts registered names and rejects anything else', () => {
      expect(isIconName('home')).toBe(true);
      expect(isIconName('sparkles')).toBe(true);
      expect(isIconName('rocket-ship')).toBe(false);
      expect(isIconName(undefined)).toBe(false);
    });

    it('falls back instead of returning undefined', () => {
      expect(resolveIconName('rocket-ship')).toBe(FALLBACK_ICON);
      expect(resolveIconName(undefined)).toBe(FALLBACK_ICON);
      expect(resolveIconName('mail')).toBe('mail');
    });
  });

  describe('isDirectionalIcon()', () => {
    it('recognises the icons that mirror in RTL', () => {
      expect(isDirectionalIcon('arrow-right')).toBe(true);
      expect(isDirectionalIcon('chevron-left')).toBe(true);
      expect(isDirectionalIcon('chevron-right')).toBe(true);
    });

    it('treats the rest and a missing icon as non-directional', () => {
      expect(isDirectionalIcon('mail')).toBe(false);
      expect(isDirectionalIcon('chevron-down')).toBe(false);
      expect(isDirectionalIcon(undefined)).toBe(false);
    });
  });

  describe('navigation coverage', () => {
    // The drawer renders one icon per row, so a name that navigation emits but
    // the registry does not know would silently become the fallback glyph.
    it('registers every page-group icon', () => {
      for (const item of PAGE_ITEMS) {
        expect(isIconName(item.icon), `missing icon: ${item.icon}`).toBe(true);
      }
    });

    it('registers the content-type icons, including the fallback path', () => {
      expect(isIconName(getContentTypeIcon('blog'))).toBe(true);
      expect(isIconName(getContentTypeIcon('projects'))).toBe(true);
      expect(isIconName(getContentTypeIcon('services'))).toBe(true);
    });
  });

  describe('type surface', () => {
    it('keeps the union usable for literal assignments', () => {
      const name: IconName = 'layers';
      expect(SITE_ICONS).toContain(name);
    });
  });
});
