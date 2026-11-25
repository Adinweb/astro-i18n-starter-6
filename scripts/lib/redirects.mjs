// @ts-check

/**
 * Pure URL redirect validation and static/Nginx generator helpers.
 *
 * Shared between Astro's build-time `astro:build:done` integration (`astro.config.mjs`),
 * the Zod runtime config validator (`src/libs/config/app.ts`), `doctor.mjs`, and `link-check.mjs`.
 */

const INVALID_CHARS_RE = /[\s{};\r\n]/;

/**
 * Normalizes an internal path for duplicate/cycle comparison by collapsing redundant
 * trailing slashes (while keeping `/` as `/`).
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeRedirectKey(value) {
  const clean = value.split(/[?#]/)[0].trim();
  if (clean === '/') return '/';
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
 * Validates a list of `{ from, to, status }` redirect rules.
 * Rejects malformed paths, invalid status codes, duplicate `from` entries,
 * direct self-redirects, and redirect loops/cycles.
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

    const validTo =
      Boolean(to) &&
      !INVALID_CHARS_RE.test(to) &&
      (isInternalRedirectTarget(to) || /^https?:\/\/[^\s]+$/i.test(to));
    if (!validTo) {
      errors.push(`${label}.to ("${String(rule.to ?? '')}") must be a root-relative path ("/...") or an HTTP(S) URL.`);
      continue;
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
      if (fromKey === toKey) {
        errors.push(`${label} redirects "${from}" to itself.`);
      } else {
        graph.set(fromKey, toKey);
      }
    }
  }

  // Detect multi-hop redirect cycles (A -> B -> ... -> A)
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
  const lines = rules.map((rule) => {
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
    const status = rule.status === 302 ? 302 : 301;
    lines.push(`location = ${rule.from.trim()} { return ${status} ${rule.to.trim()}; }`);
  }
  return `${lines.join('\n')}\n`;
}
