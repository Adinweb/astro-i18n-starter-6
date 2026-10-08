import { describe, it, expect } from 'vitest';
import * as m from '@/paraglide/messages';
import { LOCALES } from './locales';

const hasFa = (LOCALES as readonly string[]).includes('fa');
const hasAr = (LOCALES as readonly string[]).includes('ar');

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

    if (hasFa) {
      it('formats singular and plural in Persian', () => {
        expect(m.items_count({ count: 1 }, { locale: 'fa' as any })).toBe('1 مورد');
        expect(m.items_count({ count: 10 }, { locale: 'fa' as any })).toBe('10 مورد');
      });
    }

    if (hasAr) {
      it('formats plurals in Arabic', () => {
        expect(m.items_count({ count: 1 }, { locale: 'ar' as any })).toBe('1 عنصر');
        expect(m.items_count({ count: 2 }, { locale: 'ar' as any })).toBe('عنصران');
        expect(m.items_count({ count: 5 }, { locale: 'ar' as any })).toBe('5 عناصر');
      });
    }
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

    if (hasFa) {
      it('formats ordinals in Persian', () => {
        expect(m.position_ordinal({ pos: 1 }, { locale: 'fa' as any })).toBe('1م');
        expect(m.position_ordinal({ pos: 5 }, { locale: 'fa' as any })).toBe('5م');
      });
    }

    if (hasAr) {
      it('formats ordinals in Arabic', () => {
        expect(m.position_ordinal({ pos: 1 }, { locale: 'ar' as any })).toBe('المركز 1');
      });
    }
  });
});

