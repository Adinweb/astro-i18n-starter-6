// @ts-check

/**
 * Pure URL redirect validation and static/Nginx/Apache generator helpers.
 *
 * Shared between Astro's build-time `astro:build:done` integration (`astro.config.mjs`),
 * the Zod runtime config validator (`src/libs/config/app.ts`), `doctor.mjs`, and `link-check.mjs`.
 */

const INVALID_CHARS_RE = /[\s{};\r\n]/;

/**
 * Normalizes an internal path for duplicate/cycle comparison by collapsing redundant
 * trailing slashes (while keeping `/` and trailing `/*` prefix wildcards canonical).
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeRedirectKey(value) {
  const clean = value.split(/[?#]/)[0].trim();
  if (clean === '/' || clean === '/*') return clean;
  if (clean.endsWith('/*')) {
    return `${clean.slice(0, -2).replace(/\/+$/, '')}/*`;
  }
  return clean.replace(/\/+$/, '') || '/';
}

/**
 * Checks whether a redirect target is an internal site-root path (not external URL).
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isInternalRedirectTarget(value) {
  return value.startsWith('/') && !value.startsWith('//');
}

/**
 * Checks whether a redirect source uses a valid trailing `/*` prefix wildcard.
 *
 * @param {string} from
 * @returns {boolean}
 */
export function isWildcardRedirectSource(from) {
  return from.endsWith('/*');
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates a list of `{ from, to, status }` redirect rules.
 * Supports exact paths and trailing `/*` prefix wildcards (with optional `:splat` in `to`).
 * Rejects malformed paths, mid-path globs, orphan `:splat`, invalid status codes,
 * duplicate `from` entries, direct self-redirects, and redirect loops/cycles.
 *
 * @param {readonly { from?: unknown; to?: unknown; status?: unknown }[]} rules
 * @returns {string[]} human-readable validation error messages (empty when valid)
 */
export function validateRedirects(rules) {
  if (!Array.isArray(rules)) {
    return ['"redirects" must be an array of { from, to, status } objects.'];
  }

  /** @type {string[]} */
  const errors = [];
  /** @type {Map<string, string>} */
  const seenSources = new Map();
  /** @type {Map<string, string>} */
  const graph = new Map();

  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i] ?? {};
    const label = `redirects[${i}]`;
    const from = typeof rule.from === 'string' ? rule.from.trim() : '';
    const to = typeof rule.to === 'string' ? rule.to.trim() : '';
    const status = rule.status === undefined ? 301 : rule.status;

    if (!from || !from.startsWith('/') || from.startsWith('//') || INVALID_CHARS_RE.test(from)) {
      errors.push(`${label}.from ("${String(rule.from ?? '')}") must start with "/" without spaces or control characters.`);
      continue;
    }

    const firstStar = from.indexOf('*');
    if (firstStar !== -1 && (!from.endsWith('/*') || firstStar !== from.length - 1)) {
      errors.push(
        `${label}.from ("${from}") only supports a single trailing "/*" prefix wildcard (for example "/old-blog/*").`
      );
      continue;
    }

    const validTo =
      Boolean(to) &&
      !INVALID_CHARS_RE.test(to) &&
      (isInternalRedirectTarget(to) || /^https?:\/\/[^\s]+$/i.test(to));
    if (!validTo) {
      errors.push(`${label}.to ("${String(rule.to ?? '')}") must be a root-relative path ("/...") or an HTTP(S) URL.`);
      continue;
    }

    const isWildcard = isWildcardRedirectSource(from);
    if (to.includes(':splat') && !isWildcard) {
      errors.push(`${label}.to ("${to}") uses ":splat" without a trailing "/*" wildcard in ${label}.from.`);
    }

    if (status !== 301 && status !== 302) {
      errors.push(`${label}.status (${String(status)}) must be 301 or 302.`);
    }

    const fromKey = normalizeRedirectKey(from);
    if (seenSources.has(fromKey)) {
      errors.push(`${label}.from ("${from}") duplicates "${seenSources.get(fromKey)}".`);
    } else {
      seenSources.set(fromKey, from);
    }

    if (isInternalRedirectTarget(to)) {
      const toKey = normalizeRedirectKey(to);
      if (isWildcard) {
        const prefixWithoutStar = from.slice(0, -1);
        const splatSelf = `${prefixWithoutStar}:splat`;
        if (
          normalizeRedirectKey(to.split(/[?#]/)[0]) === normalizeRedirectKey(splatSelf) ||
          fromKey === toKey
        ) {
          errors.push(`${label} redirects "${from}" to itself.`);
        }
      } else if (fromKey === toKey) {
        errors.push(`${label} redirects "${from}" to itself.`);
      } else {
        graph.set(fromKey, toKey);
      }
    }
  }

  // Detect multi-hop redirect cycles (A -> B -> ... -> A) for exact rules
  const visited = new Set();
  for (const start of graph.keys()) {
    if (visited.has(start)) continue;
    const trail = new Set();
    let cursor = start;
    while (cursor && graph.has(cursor)) {
      if (trail.has(cursor)) {
        errors.push(`Redirect cycle detected involving "${cursor}".`);
        break;
      }
      if (visited.has(cursor)) break;
      trail.add(cursor);
      visited.add(cursor);
      cursor = graph.get(cursor) ?? '';
    }
  }

  return errors;
}

/**
 * Formats Netlify / Cloudflare Pages `_redirects` lines.
 *
 * @param {readonly { from: string; to: string; status?: number }[]} rules
 * @returns {string}
 */
export function buildNetlifyRedirects(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return '';
  const ordered = [
    ...rules.filter((rule) => !isWildcardRedirectSource(rule.from.trim())),
    ...rules.filter((rule) => isWildcardRedirectSource(rule.from.trim())),
  ];
  const lines = ordered.map((rule) => {
    const status = rule.status === 302 ? 302 : 301;
    return `${rule.from.trim()} ${rule.to.trim()} ${status}`;
  });
  return `${lines.join('\n')}\n`;
}

/**
 * Formats an Nginx `server {}` include snippet for configured redirects.
 * Kept in `deploy/nginx-redirects.conf` outside `dist/` so server configs are never served publicly.
 *
 * @param {readonly { from: string; to: string; status?: number }[]} rules
 * @returns {string}
 */
export function buildNginxRedirects(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return '';
  const lines = [
    '# Auto-generated at build time from app.config.json + client/config.json + client/cms.json.',
    '# Include inside your Nginx `server { ... }` block.',
    '',
  ];
  for (const rule of rules) {
    const from = rule.from.trim();
    const to = rule.to.trim();
    const status = rule.status === 302 ? 302 : 301;
    if (isWildcardRedirectSource(from)) {
      const prefix = from.slice(0, -1);
      if (to.includes(':splat')) {
        const flag = status === 302 ? 'redirect' : 'permanent';
        const target = to.replaceAll(':splat', '$1');
        lines.push(`location ^~ ${prefix} { rewrite ^${escapeRegex(prefix)}(.*)$ ${target} ${flag}; }`);
      } else {
        lines.push(`location ^~ ${prefix} { return ${status} ${to}; }`);
      }
    } else {
      lines.push(`location = ${from} { return ${status} ${to}; }`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Formats an Apache / LiteSpeed `.htaccess` `mod_rewrite` snippet for configured redirects.
 * Kept in `deploy/.htaccess-redirects` outside `dist/` so server configs are never published directly unless merged.
 *
 * @param {readonly { from: string; to: string; status?: number }[]} rules
 * @returns {string}
 */
export function buildHtaccessRedirects(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return '';
  const ordered = [
    ...rules.filter((rule) => !isWildcardRedirectSource(rule.from.trim())),
    ...rules.filter((rule) => isWildcardRedirectSource(rule.from.trim())),
  ];
  const lines = [
    '# Auto-generated at build time from app.config.json + client/config.json + client/cms.json.',
    '# Append inside your Apache / LiteSpeed `.htaccess` file at site root.',
    '<IfModule mod_rewrite.c>',
    'RewriteEngine On',
  ];

  for (const rule of ordered) {
    const from = rule.from.trim();
    const to = rule.to.trim();
    const status = rule.status === 302 ? 302 : 301;

    if (isWildcardRedirectSource(from)) {
      const relPrefix = from.slice(0, -1).replace(/^\/+/, '');
      const pattern = `^${escapeRegex(relPrefix)}(.*)$`;
      const target = to.includes(':splat') ? to.replaceAll(':splat', '$1') : to;
      lines.push(`RewriteRule ${pattern} ${target} [R=${status},L]`);
    } else if (from === '/') {
      lines.push(`RewriteRule ^$ ${to} [R=${status},L]`);
    } else {
      const relFrom = from.replace(/^\/+/, '').replace(/\/+$/, '');
      const hasExt = /\.[a-z0-9]{1,8}$/i.test(relFrom);
      const pattern = `^${escapeRegex(relFrom)}${hasExt ? '' : '/?'}$`;
      lines.push(`RewriteRule ${pattern} ${to} [R=${status},L]`);
    }
  }

  lines.push('</IfModule>');
  return `${lines.join('\n')}\n`;
}
