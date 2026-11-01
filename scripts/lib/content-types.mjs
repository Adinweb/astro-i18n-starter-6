/**
 * Node-side view of the content-type registry in `app.config.json`.
 *
 * The router reads the same block through `src/libs/content/types.ts`. Keeping
 * one reader here means `content:list`, `content:enable`, `content:disable`,
 * `content:new`, `doctor` and `content:status` all describe the project the
 * build actually produces, instead of keeping their own list of collections.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const appConfigPath = path.join(rootDir, 'app.config.json');

/** Collection names Astro defines in `src/content.config.ts`. */
export const KNOWN_TYPES = ['pages', 'blog', 'projects'];

/** Types that cannot be switched off or renamed away from the root. */
export const FIXED_TYPES = new Set(['pages']);

export function readAppConfig() {
  return JSON.parse(fs.readFileSync(appConfigPath, 'utf-8'));
}

/**
 * Writes `app.config.json` back with two-space indentation, the file's own line
 * endings and a trailing newline, so a toggle produces a one-line diff instead
 * of a reformat of the whole config.
 */
export function writeAppConfig(config) {
  const existing = fs.readFileSync(appConfigPath, 'utf-8');
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const json = JSON.stringify(config, null, 2).split('\n').join(eol);
  fs.writeFileSync(appConfigPath, `${json}${eol}`, 'utf-8');
}

/**
 * Every declared type with its effective settings.
 *
 * @returns {{ key: string, enabled: boolean, base: string, index: boolean,
 *   paginated: boolean, feed: boolean, nav: boolean, declared: boolean }[]}
 */
export function readContentTypes(config = readAppConfig()) {
  const types = config.content?.types ?? {};
  const keys = [...new Set([...KNOWN_TYPES, ...Object.keys(types)])];

  return keys.map((key) => {
    const settings = types[key] ?? {};
    return {
      key,
      declared: key in types,
      enabled: key === 'pages' ? true : settings.enabled !== false,
      base: key === 'pages' ? '' : (settings.base ?? key),
      index: key === 'pages' ? false : settings.index !== false,
      paginated: settings.paginated === true,
      feed: settings.feed === true,
      nav: key === 'pages' ? false : settings.nav !== false,
    };
  });
}

/**
 * @param {string} key
 * @returns {string | null} An error message, or `null` when the type is usable.
 */
export function contentTypeKeyError(key) {
  if (!key) return '❌ Missing content type.';
  if (!KNOWN_TYPES.includes(key)) {
    return (
      `❌ Unknown content type "${key}". Known types: ${KNOWN_TYPES.join(', ')}. ` +
      'Declare the collection in src/content.config.ts first.'
    );
  }
  return null;
}

/** Directory that holds the entries of one type. */
export function contentDirFor(key) {
  return path.join(rootDir, 'src', 'content', key);
}

/** Folder names of a collection, sorted, ignoring files. */
export function groupDirs(key) {
  const dir = contentDirFor(key);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

export function countTodos(text) {
  return [...normalizeEol(text).matchAll(/\[TODO:[^\]]*\]/g)].length;
}

export function countWords(body) {
  const text = normalizeEol(body)
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\-|]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}
