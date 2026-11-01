#!/usr/bin/env node
/**
 * Crawls the built site and reports every internal link whose target does not
 * exist in `dist/`.
 *
 * `smoke` asserts the links it knows about (hreflang, pager, feed). This walks
 * what was actually rendered — Markdown links, CTAs, breadcrumbs, navigation,
 * the language switcher, JSON catalogs linked from a page — so a renamed slug
 * or a typo in body copy cannot ship as a 404. Fragment links (`/about/#privacy`)
 * are resolved too: a section id that is renamed or deleted breaks the link just
 * as surely as a removed page.
 *
 * Usage:
 *   pnpm run link:check [--dir=dist] [--json] [--limit=50]
 */
import fs from 'node:fs';
import path from 'node:path';
import { rootDir } from './lib/content-types.mjs';

const args = process.argv.slice(2);
const dirArg = args.find((arg) => arg.startsWith('--dir='));
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const wantsJson = args.includes('--json');

const siteDir = path.resolve(rootDir, dirArg ? dirArg.slice(6) : 'dist');
const limit = limitArg ? Number(limitArg.slice(8)) || 50 : 50;

if (!fs.existsSync(siteDir)) {
  console.error(`❌ ${path.relative(rootDir, siteDir)}/ does not exist. Run \`pnpm run build\` first.`);
  process.exit(1);
}

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = walkHtml(siteDir);

/** Attributes that can point at a URL. `srcset` is split by the caller. */
const LINK_ATTRIBUTES = ['href', 'src', 'poster'];
const SKIPPED_PREFIXES = ['/pagefind/'];

function isExternal(value) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(value) ||
    value.startsWith('//') ||
    value.trim() === ''
  );
}

function stripUrl(value) {
  return value.split('#')[0].split('?')[0];
}

/** Splits `path#fragment` (and drops the query string from the path). */
function splitFragment(value) {
  const hashIndex = value.indexOf('#');
  if (hashIndex === -1) return { pathPart: value, fragment: '' };
  return {
    pathPart: value.slice(0, hashIndex),
    fragment: value.slice(hashIndex + 1).split('?')[0],
  };
}

/** Cached `id`/`name` inventories: one page can be linked from hundreds of places. */
const anchorCache = new Map();

function anchorsOf(file) {
  const cached = anchorCache.get(file);
  if (cached) return cached;

  const anchors = new Set();
  for (const match of fs.readFileSync(file, 'utf-8').matchAll(/\s(?:id|name)\s*=\s*"([^"]*)"/g)) {
    anchors.add(match[1]);
  }
  anchorCache.set(file, anchors);
  return anchors;
}

/**
 * Maps a site-root path to the file a static host would serve.
 *
 * @returns {string | null} absolute path of the built file, or `null`
 */
function resolveTargetFile(urlPath) {
  let clean = urlPath;
  try {
    clean = decodeURIComponent(urlPath);
  } catch {
    // A malformed escape stays as-is: the host would not resolve it either.
  }

  const relative = clean.replace(/^\/+/, '');
  const candidates = [];

  if (relative === '') {
    candidates.push('index.html');
  } else {
    candidates.push(relative, path.join(relative, 'index.html'), `${relative}.html`);
    // A directory without a trailing slash is served by its index page.
    if (!clean.endsWith('/') && !path.extname(relative)) {
      candidates.push(path.join(relative, 'index.html'));
    }
  }

  for (const candidate of candidates) {
    const full = path.join(siteDir, candidate);
    if (!full.startsWith(siteDir)) continue;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

/**
 * Checks that a fragment resolves to an element on the target page.
 *
 * Only HTML targets are inspected: a fragment into a non-HTML asset addresses
 * an id inside that asset, which this crawl does not parse.
 *
 * @returns {boolean} whether the fragment is present (or not checkable)
 */
function fragmentExists(file, fragment) {
  if (!file || !file.endsWith('.html')) return true;

  let id = fragment;
  try {
    id = decodeURIComponent(fragment);
  } catch {
    // A malformed escape cannot match an id either.
  }
  // `#` alone and `#top` are the browser's built-in "back to the top"
  // anchors: they work without an element, so they are not dead links.
  if (id === '' || id === 'top') return true;
  return anchorsOf(file).has(id);
}

const broken = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf-8');
  const pagePath = `/${path.relative(siteDir, file).replace(/\\/g, '/')}`;
  const pageUrl = pagePath.replace(/index\.html$/, '');

  for (const match of html.matchAll(/\s(href|src|poster)\s*=\s*"([^"]*)"/g)) {
    const [, attribute, rawValue] = match;
    const value = rawValue.trim();
    if (!LINK_ATTRIBUTES.includes(attribute) || isExternal(value)) continue;

    // Resolve a relative URL against the page that contains it. A bare
    // fragment (`#privacy`) points into the page it appears on.
    const { pathPart, fragment } = splitFragment(value);
    const resolved =
      pathPart === ''
        ? ''
        : pathPart.startsWith('/')
          ? pathPart
          : new URL(pathPart, `http://x${pageUrl}`).pathname;
    const target = resolved === '' ? pageUrl : stripUrl(resolved) || '/';
    if (SKIPPED_PREFIXES.some((prefix) => target.startsWith(prefix))) continue;

    checked += 1;
    const targetFile = resolveTargetFile(target);
    if (!targetFile) {
      broken.push({ page: pageUrl, link: value, target });
    } else if (fragment && !fragmentExists(targetFile, fragment)) {
      broken.push({ page: pageUrl, link: value, target: `${target}#${fragment}` });
    }
  }

  // `srcset` carries several comma-separated candidates.
  for (const match of html.matchAll(/\ssrcset\s*=\s*"([^"]*)"/g)) {
    for (const candidate of match[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (!url || isExternal(url)) continue;
      const resolved = url.startsWith('/') ? url : new URL(url, `http://x${pageUrl}`).pathname;
      const target = stripUrl(resolved);
      checked += 1;
      if (!resolveTargetFile(target)) {
        broken.push({ page: pageUrl, link: url, target });
      }
    }
  }
}

// A page may link the same broken URL many times (nav, footer, breadcrumb).
const uniqueBroken = [];
const seen = new Set();
for (const entry of broken) {
  const key = `${entry.page} → ${entry.target}`;
  if (seen.has(key)) continue;
  seen.add(key);
  uniqueBroken.push(entry);
}

if (wantsJson) {
  console.log(
    JSON.stringify(
      { ok: uniqueBroken.length === 0, pages: htmlFiles.length, checked, broken: uniqueBroken },
      null,
      2
    )
  );
  process.exit(uniqueBroken.length === 0 ? 0 : 1);
}

console.log(
  `🔗 Checked ${checked} internal link(s) across ${htmlFiles.length} page(s) in ${path.relative(rootDir, siteDir)}/.`
);

if (uniqueBroken.length === 0) {
  console.log('✅ Every internal link and fragment resolves to a built file and an anchor.');
  process.exit(0);
}

console.error(`❌ ${uniqueBroken.length} broken internal link(s):\n`);
for (const entry of uniqueBroken.slice(0, limit)) {
  console.error(`  ${entry.page}\n    → ${entry.target}   (from "${entry.link}")`);
}
if (uniqueBroken.length > limit) {
  console.error(`  … ${uniqueBroken.length - limit} more (raise --limit to see them)`);
}
console.error('\nFix the slug/link at its source; do not add a redirect for a typo.');
process.exit(1);
