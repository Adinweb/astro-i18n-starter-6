import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber, formatYear } from './format';

describe('src/i18n/format.ts', () => {
  describe('formatNumber', () => {
    it('renders Western digits for Latin locales', () => {
      expect(formatNumber(42, 'en')).toBe('42');
      expect(formatNumber(1250, 'de')).toBe('1.250');
    });

    it('renders Extended Arabic-Indic (Persian) digits for fa', () => {
      expect(formatNumber(0, 'fa')).toBe('۰');
      expect(formatNumber(9, 'fa')).toBe('۹');
      expect(formatNumber(2026, 'fa')).toContain('۲۰۲۶'.slice(0, 1));
      expect(formatNumber(12, 'fa')).toBe('۱۲');
    });

    it('renders Eastern Arabic digits for ar', () => {
      expect(formatNumber(3, 'ar')).toBe('٣');
      expect(formatNumber(15, 'ar')).toBe('١٥');
    });
  });

  describe('formatYear', () => {
    it('renders a year without a thousands separator', () => {
      expect(formatYear(2026, 'en')).toBe('2026');
      expect(formatYear(2026, 'de')).toBe('2026');
      expect(formatYear(2026, 'fa')).toBe('۲۰۲۶');
      expect(formatYear(2026, 'ar')).toBe('٢٠٢٦');
    });
  });

  describe('formatDate', () => {
    const sample = new Date('2026-01-15T00:00:00Z');

    it('renders Gregorian English and German dates in UTC', () => {
      expect(formatDate(sample, 'en', 'short')).toContain('2026');
      expect(formatDate(sample, 'en', 'long')).toContain('January');
      expect(formatDate(sample, 'de', 'long')).toContain('2026');
    });

    it('renders Solar Hijri (Jalali) calendar with Persian digits for fa', () => {
      // 2026-01-15 UTC corresponds to 25 Dey 1404 in the Solar Hijri calendar.
      const shortFa = formatDate(sample, 'fa', 'short');
      const longFa = formatDate(sample, 'fa', 'long');
      expect(shortFa).toContain('۱۴۰۴');
      expect(longFa).toContain('دی');
      expect(longFa).toContain('۲۵');
    });

    it('renders native Eastern Arabic numerals for ar dates', () => {
      const arDate = formatDate(sample, 'ar', 'long');
      expect(arDate).toContain('٢٠٢٦');
      expect(arDate).toContain('١٥');
    });
  });
});
