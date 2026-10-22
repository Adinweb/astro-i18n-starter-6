/**
 * Reads the locale configuration from `src/i18n/locales.ts`.
 *
 * That file is the single source of truth for the locale list, the default
 * locale, and each locale's metadata. The i18n audit and the smoke test both
 * need it, and neither may keep its own copy: a second parser drifts from the
 * first and then quietly stops describing the site that is actually built.
 *
 * The file is read as source instead of being imported, because it is
 * TypeScript and these scripts run as plain Node.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const LOCALES_PATTERN = /export const LOCALES\s*=\s*\[([\s\S]*?)\]\s*as const/;
const DEFAULT_LOCALE_PATTERN =
  /export const DEFAULT_LOCALE\s*:\s*Locale\s*=\s*['"]([^'"]+)['"]/;
const METADATA_PATTERN =
  /export const LOCALE_METADATA\s*=\s*\{([\s\S]*?)\}\s*satisfies\s+Record<Locale,\s*LocaleMeta>/;
// One locale block: its key, and everything up to the block's own closing brace.
const METADATA_BLOCK_PATTERN = /^  ([A-Za-z0-9_-]+):\s*\{([\s\S]*?)^  \},?\r?$/gm;

export const LOCALES_SOURCE_PATH = path.join(rootDir, 'src', 'i18n', 'locales.ts');

/**
 * Parses the locale configuration out of the source of `locales.ts`.
 *
 * @param {string} source
 * @returns {{
 *   locales: string[],
 *   defaultLocale: string | undefined,
 *   metadata: Record<string, { dir?: string, htmlLang?: string, name?: string, fontFamily?: string }>,
 * }}
 */
export function parseLocaleConfig(source) {
  const localesMatch = source.match(LOCALES_PATTERN);
  const locales = localesMatch
    ? [...localesMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1])
    : [];

  const defaultMatch = source.match(DEFAULT_LOCALE_PATTERN);
  const metadataMatch = source.match(METADATA_PATTERN);

  // The properties of a locale block are read as a block, so the order of the
  // keys inside `LOCALE_METADATA` cannot change the result.
  const metadata = {};
  if (metadataMatch) {
    for (const block of metadataMatch[1].matchAll(METADATA_BLOCK_PATTERN)) {
      metadata[block[1]] = {
        dir: block[2].match(/dir:\s*['"](ltr|rtl)['"]/)?.[1],
        htmlLang: block[2].match(/htmlLang:\s*['"]([^'"]+)['"]/)?.[1],
        name: block[2].match(/name:\s*['"]([^'"]+)['"]/)?.[1],
        fontFamily: block[2].match(/fontFamily:\s*['"]([^'"]+)['"]/)?.[1],
      };
    }
  }

  return { locales, defaultLocale: defaultMatch?.[1], metadata };
}

/**
 * Reads the locale configuration of the project.
 *
 * @returns {ReturnType<typeof parseLocaleConfig>}
 */
export function readLocaleConfig() {
  if (!fs.existsSync(LOCALES_SOURCE_PATH)) {
    throw new Error(
      `Missing ${path.relative(rootDir, LOCALES_SOURCE_PATH)}. ` +
        'It is the source of truth for the locales of the site.'
    );
  }
  return parseLocaleConfig(fs.readFileSync(LOCALES_SOURCE_PATH, 'utf-8'));
}
