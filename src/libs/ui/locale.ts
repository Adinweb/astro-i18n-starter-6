import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';
import { stripLocale } from '@/i18n/paths';

/**
 * Resolves the active locale for reusable UI components. Uses explicit `locale`
 * prop when valid, falls back to the URL prefix via `stripLocale` (so omitting
 * `locale` inside MDX still matches `/fa/...`), and finally defaults to
 * `DEFAULT_LOCALE`.
 */
export function resolveComponentLocale(locale?: Locale | string, pathname?: string): Locale {
  if (locale && isLocale(locale)) return locale;
  if (pathname) return stripLocale(pathname).locale;
  return DEFAULT_LOCALE;
}

/**
 * Resolves a block's header field (`eyebrow`, `heading`, `subheading`) so:
 * - explicit `null` suppresses the field,
 * - an explicit string renders as passed,
 * - `undefined` falls back to `defaultValue` ONLY when using default block items
 *   (preserving clean layouts when callers provide custom items without a header).
 */
export function resolveOptionalHeader(
  value: string | null | undefined,
  usingDefaults: boolean,
  defaultValue?: string
): string | undefined {
  if (value === null) return undefined;
  if (value !== undefined) return value;
  return usingDefaults ? defaultValue : undefined;
}
