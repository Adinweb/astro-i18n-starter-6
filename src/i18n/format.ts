/**
 * Pure locale-aware number and date formatters shared by server templates and
 * browser scripts. Uses native `Intl` APIs with Persian Solar Hijri (`persian`)
 * calendar and native digits (`fa-IR` / `ar-u-nu-arab`) out of the box.
 */

const numberFormatters = new Map<string, Intl.NumberFormat>();
const yearFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function resolveNumberLocale(locale: string): string {
  const primary = locale.split(/[-_]/)[0]?.toLowerCase() ?? 'en';
  if (primary === 'fa') return 'fa-IR';
  if (primary === 'ar') return 'ar-u-nu-arab';
  return locale || 'en';
}

function resolveDateLocale(locale: string): string {
  const primary = locale.split(/[-_]/)[0]?.toLowerCase() ?? 'en';
  if (primary === 'fa') return 'fa-IR-u-ca-persian';
  if (primary === 'ar') return 'ar-u-ca-gregory-nu-arab';
  return locale || 'en';
}

/**
 * Formats an integer or decimal in the numeral system of `locale`
 * (e.g. `۳` in Persian, `٣` in Arabic, `3` in English/German/French).
 */
export function formatNumber(value: number, locale: string): string {
  const resolved = resolveNumberLocale(locale);
  let formatter = numberFormatters.get(resolved);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(resolved);
    } catch {
      formatter = new Intl.NumberFormat('en');
    }
    numberFormatters.set(resolved, formatter);
  }
  return formatter.format(value);
}

/**
 * Formats a calendar year without a thousands separator, in the numeral system
 * of `locale`: `2026` in English, `۲۰۲۶` in Persian. `formatNumber` groups
 * digits and would render a year as `2,026`.
 */
export function formatYear(year: number, locale: string): string {
  const resolved = resolveNumberLocale(locale);
  let formatter = yearFormatters.get(resolved);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(resolved, { useGrouping: false });
    } catch {
      formatter = new Intl.NumberFormat('en', { useGrouping: false });
    }
    yearFormatters.set(resolved, formatter);
  }
  return formatter.format(year);
}

/**
 * Formats a UTC publication date in the calendar and script of `locale`.
 * Persian (`fa`) renders in the Solar Hijri (Jalali) calendar with Persian
 * digits; Arabic (`ar`) renders Gregorian month names with Eastern Arabic
 * digits; other locales use their native `Intl` calendar and numerals.
 */
export function formatDate(
  date: Date,
  locale: string,
  monthStyle: 'short' | 'long' = 'short'
): string {
  const resolved = resolveDateLocale(locale);
  const cacheKey = `${resolved}:${monthStyle}`;
  let formatter = dateFormatters.get(cacheKey);
  if (!formatter) {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: monthStyle,
      day: 'numeric',
      timeZone: 'UTC',
    };
    try {
      formatter = new Intl.DateTimeFormat(resolved, options);
    } catch {
      formatter = new Intl.DateTimeFormat('en', options);
    }
    dateFormatters.set(cacheKey, formatter);
  }
  return formatter.format(date);
}
