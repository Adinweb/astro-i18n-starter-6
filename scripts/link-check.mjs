#!/usr/bin/env node
/**
 * Crawls the built site and reports every internal link whose target does not
 * exist in `dist/`.
 *
 * `smoke` asserts the links it knows about (hreflang, pager, feed). This walks
 * what was actually rendered — Markdown links, CTAs, breadcrumbs, navigation,
 * the language switcher, JSON catalogs linked from a page — so a renamed slug
 * or a typo in body copy cannot ship as a 404.
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
    value.startsWith('#') ||
    value.trim() === ''
  );
}

function stripUrl(value) {
  return value.split('#')[0].split('?')[0];
}

/**
 * Maps a site-root path to the file a static host would serve.
 *
 * @returns {boolean} whether something in `dist/` answers that path
 */
function targetExists(urlPath) {
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
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return true;
  }
  return false;
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

    // Resolve a relative URL against the page that contains it.
    const resolved = value.startsWith('/') ? value : new URL(value, `http://x${pageUrl}`).pathname;
    if (SKIPPED_PREFIXES.some((prefix) => resolved.startsWith(prefix))) continue;

    const target = stripUrl(resolved) || '/';
    checked += 1;
    if (!targetExists(target)) {
      broken.push({ page: pageUrl, link: value, target });
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
      if (!targetExists(target)) {
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
  console.log('✅ Every internal link resolves to a built file.');
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
