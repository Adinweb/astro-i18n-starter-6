/**
 * Three-tier configuration helpers for Node CLI scripts.
 *
 * Layer 1 (Upstream SSOT): `app.config.json`
 * Layer 2 (Client Developer Overrides): `client/config.json`
 * Layer 3 (Client CMS Settings): `client/cms.json`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const CMS_STRIP_EMPTY_STRING_KEYS = new Set([
  'id',
  'variant',
  'icon',
  'startsAt',
  'endsAt',
  'dismissMode',
  'dismissTtlDays',
  'dismissVersion',
  'heightPx',
  'type',
  'status',
]);

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Strips null/undefined and incomplete optional CMS fields so Pages CMS saves
 * cannot overwrite defaults with invalid blanks.
 */
export function sanitizeCmsConfig(raw) {
  if (!isPlainObject(raw)) return {};

  const walk = (node, keyName) => {
    if (node === null || node === undefined) return undefined;

    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (keyName && CMS_STRIP_EMPTY_STRING_KEYS.has(keyName) && trimmed === '') {
        return undefined;
      }
      return node;
    }

    if (Array.isArray(node)) {
      const cleaned = node.map((item) => walk(item)).filter((item) => item !== undefined);

      if (keyName === 'redirects') {
        return cleaned.filter(
          (item) =>
            isPlainObject(item) &&
            typeof item.from === 'string' &&
            item.from.trim() !== '' &&
            typeof item.to === 'string' &&
            item.to.trim() !== ''
        );
      }

      if (keyName === 'items') {
        return cleaned.filter((item) => isPlainObject(item));
      }

      return cleaned;
    }

    if (isPlainObject(node)) {
      if (keyName === 'geo') {
        const lat = coerceFiniteNumber(node.lat);
        const lng = coerceFiniteNumber(node.lng);
        if (lat === undefined || lng === undefined) return undefined;
        return { lat, lng };
      }

      const out = {};
      for (const [k, v] of Object.entries(node)) {
        const cleaned = walk(v, k);
        if (cleaned !== undefined) {
          out[k] = cleaned;
        }
      }
      return out;
    }

    return node;
  };

  const sanitized = walk(raw);
  return isPlainObject(sanitized) ? sanitized : {};
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

export function cmsConfigPathFor(rootDir = defaultRootDir) {
  return path.join(rootDir, 'client', 'cms.json');
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

export function readCmsConfig(rootDir = defaultRootDir) {
  const filePath = cmsConfigPathFor(rootDir);
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  return raw ? JSON.parse(raw) : {};
}

/**
 * Reads `app.config.json` merged with `client/config.json` only (excluding `cms.json`),
 * used by developer CLI mutators (`site:init`, etc.) so CMS fields never bleed into `client/config.json`.
 */
export function readCoreAndClientConfig(rootDir = defaultRootDir) {
  return deepMergeConfig(readCoreConfig(rootDir), readClientConfig(rootDir));
}

export function mergeLayeredConfig(core, client = {}, cms = {}) {
  const withClient = deepMergeConfig(core, client);
  const cleanCms = sanitizeCmsConfig(cms);
  return deepMergeConfig(withClient, cleanCms);
}

export function readMergedConfig(rootDir = defaultRootDir) {
  return mergeLayeredConfig(readCoreConfig(rootDir), readClientConfig(rootDir), readCmsConfig(rootDir));
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
