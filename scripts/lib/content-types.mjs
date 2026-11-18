/**
 * Node-side view of the two-tier content-type registry
 * (`app.config.json` merged with `client/config.json`, plus custom collections
 * declared in `client/content.ts`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  coreConfigPathFor,
  readCoreConfig,
  readClientConfig,
  readMergedConfig,
  writeClientConfig,
} from './config.mjs';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const appConfigPath = coreConfigPathFor(rootDir);

/** Upstream core collection names defined in `src/content.config.ts`. */
export const CORE_TYPES = ['pages', 'blog', 'projects'];

/** Types that cannot be switched off or renamed away from the root. */
export const FIXED_TYPES = new Set(['pages']);

/**
 * Extracts collection keys exported in `client/content.ts -> export const clientCollections = { ... }`.
 * Handles both shorthand (`services,`) and keyed (`services: defineCollection(...)`) entries.
 */
export function readClientCollectionKeys(targetRootDir = rootDir) {
  const clientContentPath = path.join(targetRootDir, 'client', 'content.ts');
  if (!fs.existsSync(clientContentPath)) return [];
  const source = fs.readFileSync(clientContentPath, 'utf-8');
  const decl = source.match(/export const clientCollections\s*=\s*\{/);
  if (!decl || decl.index === undefined) return [];

  const start = decl.index + decl[0].length;
  let depth = 1;
  let i = start;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    i += 1;
  }
  const body = source.slice(start, i - 1);
  const keys = [];
  // Scan only top-level properties (depth === 0 inside body)
  let innerDepth = 0;
  let tokenStart = 0;
  const splitTopLevel = [];
  for (let idx = 0; idx < body.length; idx += 1) {
    const ch = body[idx];
    if (ch === '{' || ch === '(' || ch === '[') innerDepth += 1;
    else if (ch === '}' || ch === ')' || ch === ']') innerDepth -= 1;
    else if (ch === ',' && innerDepth === 0) {
      splitTopLevel.push(body.slice(tokenStart, idx));
      tokenStart = idx + 1;
    }
  }
  splitTopLevel.push(body.slice(tokenStart));

  for (const rawPart of splitTopLevel) {
    const cleaned = rawPart
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
    if (!cleaned) continue;
    const keyMatch = cleaned.match(/^['"]?([a-z0-9-]+)['"]?(?:\s*:|$)/i);
    if (keyMatch) keys.push(keyMatch[1]);
  }
  return keys;
}

export function getKnownTypes(targetRootDir = rootDir) {
  return [...new Set([...CORE_TYPES, ...readClientCollectionKeys(targetRootDir)])];
}

export const KNOWN_TYPES = getKnownTypes(rootDir);

export function readAppConfig(targetRootDir = rootDir) {
  return readMergedConfig(targetRootDir);
}

/**
 * Persists client changes as a sparse diff in `client/config.json` instead of
 * mutating upstream `app.config.json`.
 */
export function writeAppConfig(config, targetRootDir = rootDir) {
  return writeClientConfig(config, { rootDir: targetRootDir, sparse: true });
}

export { readCoreConfig, readClientConfig, readMergedConfig, writeClientConfig };

/**
 * Every declared type with its effective settings.
 *
 * @returns {{ key: string, enabled: boolean, base: string, index: boolean,
 *   paginated: boolean, feed: boolean, nav: boolean, declared: boolean }[]}
 */
export function readContentTypes(config = readAppConfig(), targetRootDir = rootDir) {
  const types = config.content?.types ?? {};
  const keys = [...new Set([...getKnownTypes(targetRootDir), ...Object.keys(types)])];

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
 * @param {string} [targetRootDir]
 * @returns {string | null} An error message, or `null` when the type is usable.
 */
export function contentTypeKeyError(key, targetRootDir = rootDir) {
  if (!key) return '❌ Missing content type.';
  const known = getKnownTypes(targetRootDir);
  if (!known.includes(key)) {
    return (
      `❌ Unknown content type "${key}". Known types: ${known.join(', ')}. ` +
      'Declare the collection in client/content.ts (and configure it in client/config.json) first.'
    );
  }
  return null;
}

/** Directory that holds the entries of one type. */
export function contentDirFor(key, targetRootDir = rootDir) {
  return path.join(targetRootDir, 'src', 'content', key);
}

/** Folder names of a collection, sorted, ignoring files. */
export function groupDirs(key, targetRootDir = rootDir) {
  const dir = contentDirFor(key, targetRootDir);
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
