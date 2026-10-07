import { describe, it, expect } from 'vitest';
import * as m from '@/paraglide/messages';

describe('ICU Plurals and Selectordinal', () => {
  describe('items_count (Plurals)', () => {
    it('formats singular and plural in English', () => {
      expect(m.items_count({ count: 1 }, { locale: 'en' })).toBe('1 item');
      expect(m.items_count({ count: 2 }, { locale: 'en' })).toBe('2 items');
      expect(m.items_count({ count: 0 }, { locale: 'en' })).toBe('0 items');
    });

    it('formats singular and plural in German', () => {
      expect(m.items_count({ count: 1 }, { locale: 'de' })).toBe('1 Element');
      expect(m.items_count({ count: 5 }, { locale: 'de' })).toBe('5 Elemente');
    });

    it('formats singular and plural in Persian', () => {
      expect(m.items_count({ count: 1 }, { locale: 'fa' })).toBe('1 مورد');
      expect(m.items_count({ count: 10 }, { locale: 'fa' })).toBe('10 مورد');
    });
  });

  describe('position_ordinal (Selectordinal)', () => {
    it('formats ordinals in English', () => {
      expect(m.position_ordinal({ pos: 1 }, { locale: 'en' })).toBe('1st');
      expect(m.position_ordinal({ pos: 2 }, { locale: 'en' })).toBe('2nd');
      expect(m.position_ordinal({ pos: 3 }, { locale: 'en' })).toBe('3rd');
      expect(m.position_ordinal({ pos: 4 }, { locale: 'en' })).toBe('4th');
      expect(m.position_ordinal({ pos: 21 }, { locale: 'en' })).toBe('21st');
    });

    it('formats ordinals in German', () => {
      expect(m.position_ordinal({ pos: 1 }, { locale: 'de' })).toBe('1.');
      expect(m.position_ordinal({ pos: 2 }, { locale: 'de' })).toBe('2.');
    });

    it('formats ordinals in Persian', () => {
      expect(m.position_ordinal({ pos: 1 }, { locale: 'fa' })).toBe('1م');
      expect(m.position_ordinal({ pos: 5 }, { locale: 'fa' })).toBe('5م');
    });
  });
});
