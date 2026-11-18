import type { Locale } from '@/i18n/locales';

export interface ClientContentTypeMeta {
  label?: (locale: Locale) => string;
  description?: (locale: Locale) => string;
  icon?: string;
}

/**
 * Client-owned Astro content collections spread into `src/content.config.ts`.
 * Follow the `<group>/<locale>.mdx` entry convention so routing, alternates,
 * and `audit:i18n` work automatically.
 */
export const clientCollections = {} as const;

/**
 * Optional UI metadata for custom collections registered in `clientCollections`
 * and `client/config.json` -> `content.types`.
 */
export const CLIENT_CONTENT_TYPES: Record<string, ClientContentTypeMeta> = {};
