#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

console.log('🧪 Starting Smoke Test Suite over dist/ ...\n');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found! Run "pnpm build" first.');
  process.exit(1);
}

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

// 1. Verifies /index.html renders default locale (<html lang="en" dir="ltr">)
const rootHtmlPath = path.join(distDir, 'index.html');
assert(fs.existsSync(rootHtmlPath), 'Root index.html exists');
if (fs.existsSync(rootHtmlPath)) {
  const html = fs.readFileSync(rootHtmlPath, 'utf-8');
  assert(
    html.includes('lang="en"') && html.includes('dir="ltr"'),
    '/index.html renders default locale (<html lang="en" dir="ltr">)'
  );
}

// 2. Verifies /fa/index.html renders Persian (<html lang="fa" dir="rtl">)
const faHtmlPath = path.join(distDir, 'fa', 'index.html');
assert(fs.existsSync(faHtmlPath), '/fa/index.html exists');
if (fs.existsSync(faHtmlPath)) {
  const html = fs.readFileSync(faHtmlPath, 'utf-8');
  assert(
    html.includes('lang="fa"') && html.includes('dir="rtl"'),
    '/fa/index.html renders Persian (<html lang="fa" dir="rtl">)'
  );
}

// 3. Verifies translated slug routes exist (e.g. dist/fa/blog/اولین-پست/index.html)
const faPostPath = path.join(distDir, 'fa', 'blog', 'اولین-پست', 'index.html');
assert(
  fs.existsSync(faPostPath),
  'Translated slug route exists (dist/fa/blog/اولین-پست/index.html)'
);

// 4. Verifies canonical <link rel="canonical"> matches target URL
if (fs.existsSync(rootHtmlPath)) {
  const html = fs.readFileSync(rootHtmlPath, 'utf-8');
  const canonicalMatch = html.match(/<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i);
  assert(
    canonicalMatch && canonicalMatch[1].endsWith('/'),
    `Canonical link present and valid on root: ${canonicalMatch ? canonicalMatch[1] : 'none'}`
  );
}

if (fs.existsSync(faPostPath)) {
  const html = fs.readFileSync(faPostPath, 'utf-8');
  const canonicalMatch = html.match(/<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i);
  assert(
    canonicalMatch && canonicalMatch[1].includes(encodeURI('اولین-پست')) || (canonicalMatch && canonicalMatch[1].includes('اولین-پست')),
    `Canonical link matches target URL on translated route: ${canonicalMatch ? canonicalMatch[1] : 'none'}`
  );
}

// 5. Verifies hreflang tags: exactly locales.length + 1 tags (en, de, fa, x-default)
if (fs.existsSync(rootHtmlPath)) {
  const html = fs.readFileSync(rootHtmlPath, 'utf-8');
  const hreflangMatches = [...html.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"/gi)];
  const langs = hreflangMatches.map((m) => m[1]);
  assert(
    langs.length === 4,
    `Hreflang tags count is exactly 4 (found: ${langs.length} -> ${langs.join(', ')})`
  );
  assert(langs.includes('en'), 'Hreflang includes "en"');
  assert(langs.includes('de'), 'Hreflang includes "de"');
  assert(langs.includes('fa'), 'Hreflang includes "fa"');
  assert(langs.includes('x-default'), 'Hreflang includes "x-default"');
}

// 6. Verifies dist/icons.svg exists and contains compiled icon symbols
const iconsSvgPath = path.join(distDir, 'icons.svg');
assert(fs.existsSync(iconsSvgPath), 'dist/icons.svg exists');
if (fs.existsSync(iconsSvgPath)) {
  const svgContent = fs.readFileSync(iconsSvgPath, 'utf-8');
  assert(
    svgContent.includes('<symbol id="search"') && svgContent.includes('<symbol id="globe"'),
    'dist/icons.svg contains compiled icon symbols (search, globe)'
  );
}

// 7. Verifies dist/pagefind/ search bundle exists
const pagefindDir = path.join(distDir, 'pagefind');
assert(fs.existsSync(pagefindDir), 'dist/pagefind/ search bundle exists');
if (fs.existsSync(pagefindDir)) {
  const pagefindJs = path.join(pagefindDir, 'pagefind.js');
  assert(fs.existsSync(pagefindJs), 'dist/pagefind/pagefind.js entry point exists');
}

console.log('\n----------------------------------------');
if (failed) {
  console.error('❌ Smoke test suite failed.');
  process.exit(1);
} else {
  console.log('🎉 All 7 Smoke test specifications verified successfully!');
  process.exit(0);
}
