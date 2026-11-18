/**
 * Two-tier configuration helpers for Node CLI scripts.
 *
 * Layer 1 (Upstream SSOT): `app.config.json`
 * Layer 2 (Client Overrides): `client/config.json`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively deep-merges `override` onto `base`. Arrays and primitives replace wholesale.
 */
export function deepMergeConfig(base, override) {
  if (!isPlainObject(base)) return override;
  if (!isPlainObject(override)) return base;

  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMergeConfig(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Produces a sparse diff object containing only values in `next` that differ from `core`.
 */
export function diffSparseConfig(core, next) {
  if (!isPlainObject(core) || !isPlainObject(next)) {
    return JSON.stringify(core) === JSON.stringify(next) ? undefined : next;
  }

  const diff = {};
  for (const [key, nextVal] of Object.entries(next)) {
    if (nextVal === undefined) continue;
    const coreVal = core[key];
    if (isPlainObject(nextVal) && isPlainObject(coreVal)) {
      const nested = diffSparseConfig(coreVal, nextVal);
      if (nested !== undefined && Object.keys(nested).length > 0) {
        diff[key] = nested;
      }
    } else if (JSON.stringify(coreVal) !== JSON.stringify(nextVal)) {
      diff[key] = nextVal;
    }
  }
  return diff;
}

export function coreConfigPathFor(rootDir = defaultRootDir) {
  return path.join(rootDir, 'app.config.json');
}

export function clientConfigPathFor(rootDir = defaultRootDir) {
  return path.join(rootDir, 'client', 'config.json');
}

export function readCoreConfig(rootDir = defaultRootDir) {
  return JSON.parse(fs.readFileSync(coreConfigPathFor(rootDir), 'utf-8'));
}

export function readClientConfig(rootDir = defaultRootDir) {
  const filePath = clientConfigPathFor(rootDir);
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  return raw ? JSON.parse(raw) : {};
}

export function readMergedConfig(rootDir = defaultRootDir) {
  return deepMergeConfig(readCoreConfig(rootDir), readClientConfig(rootDir));
}

/**
 * Writes `client/config.json`.
 * By default (`sparse: true`), stores only keys that differ from `app.config.json`.
 */
export function writeClientConfig(nextConfig, { rootDir = defaultRootDir, sparse = true } = {}) {
  const filePath = clientConfigPathFor(rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const eol = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8').includes('\r\n')
      ? '\r\n'
      : '\n'
    : '\n';

  const payload = sparse ? (diffSparseConfig(readCoreConfig(rootDir), nextConfig) ?? {}) : nextConfig;
  const json = JSON.stringify(payload, null, 2).split('\n').join(eol);
  fs.writeFileSync(filePath, `${json}${eol}`, 'utf-8');
  return payload;
}
