/**
 * Reads and writes the client locale configuration (`client/locales.json`).
 *
 * `client/locales.json` is the single source of truth for active locales,
 * `defaultLocale`, and each locale's metadata (`dir`, `htmlLang`, `name`,
 * `fontFamily`). `src/i18n/locales.ts`, `merge-messages.mjs`, `audit:i18n`,
 * `doctor`, `smoke`, and the locale lifecycle scripts all consume this file.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const LOCALES_PATTERN = /export const LOCALES\s*=\s*\[([\s\S]*?)\]\s*as const/;
const DEFAULT_LOCALE_PATTERN =
  /export const DEFAULT_LOCALE\s*:\s*Locale\s*=\s*['"]([^'"]+)['"]/;
const METADATA_PATTERN =
  /export const LOCALE_METADATA\s*=\s*\{([\s\S]*?)\}\s*satisfies\s+Record<Locale,\s*LocaleMeta>/;
const METADATA_BLOCK_PATTERN = /^  ['"]?([A-Za-z0-9_-]+)['"]?:\s*\{([^}]*)\},?\r?$/gm;

export function localeConfigPathFor(rootDir = defaultRootDir) {
  return path.join(rootDir, 'client', 'locales.json');
}

/**
 * Legacy TypeScript snippet parser kept for backward-compatible unit tests.
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
 * Reads `client/locales.json`.
 *
 * @param {string} [rootDir]
 * @returns {{
 *   locales: string[],
 *   defaultLocale: string | undefined,
 *   metadata: Record<string, { dir?: string, htmlLang?: string, name?: string, fontFamily?: string }>,
 * }}
 */
export function readLocaleConfig(rootDir = defaultRootDir) {
  const filePath = localeConfigPathFor(rootDir);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing ${path.relative(rootDir, filePath)}. ` +
        'It is the source of truth for the active locales of the site.'
    );
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return {
    locales: Array.isArray(parsed.locales) ? parsed.locales : [],
    defaultLocale: parsed.defaultLocale,
    metadata: parsed.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : {},
  };
}

/**
 * Writes `client/locales.json` preserving line endings and readable formatting.
 *
 * @param {{ defaultLocale: string, locales: string[], metadata: Record<string, object> }} config
 * @param {string} [rootDir]
 */
export function writeLocaleConfig(config, rootDir = defaultRootDir) {
  const filePath = localeConfigPathFor(rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const eol = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8').includes('\r\n')
      ? '\r\n'
      : '\n'
    : '\n';
  const payload = {
    defaultLocale: config.defaultLocale,
    locales: config.locales,
    metadata: config.metadata,
  };
  const json = JSON.stringify(payload, null, 2).split('\n').join(eol);
  fs.writeFileSync(filePath, `${json}${eol}`, 'utf-8');
}
