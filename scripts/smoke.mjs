#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

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

const inlangSettings = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
);
const LOCALES = inlangSettings.locales;
const nonDefaultLocales = LOCALES.filter((l) => l !== inlangSettings.baseLocale);
const testNonDefault = LOCALES.includes('fa') ? 'fa' : nonDefaultLocales[0] || 'de';

// 2. Verifies non-default locale index renders correctly (e.g. /fa/index.html or /de/index.html)
const nonDefaultHtmlPath = path.join(distDir, testNonDefault, 'index.html');
assert(fs.existsSync(nonDefaultHtmlPath), `/${testNonDefault}/index.html exists`);
if (fs.existsSync(nonDefaultHtmlPath)) {
  const html = fs.readFileSync(nonDefaultHtmlPath, 'utf-8');
  const expectedDir = ['fa', 'ar', 'he', 'ur'].includes(testNonDefault) ? 'rtl' : 'ltr';
  assert(
    html.includes(`lang="${testNonDefault}"`) && html.includes(`dir="${expectedDir}"`),
    `/${testNonDefault}/index.html renders correct lang and dir (<html lang="${testNonDefault}" dir="${expectedDir}">)`
  );
}

if (LOCALES.includes('ar')) {
  const arHtmlPath = path.join(distDir, 'ar', 'index.html');
  assert(fs.existsSync(arHtmlPath), '/ar/index.html exists');
  if (fs.existsSync(arHtmlPath)) {
    const html = fs.readFileSync(arHtmlPath, 'utf-8');
    assert(
      html.includes('lang="ar"') && html.includes('dir="rtl"'),
      '/ar/index.html renders Arabic with RTL (<html lang="ar" dir="rtl">)'
    );
  }
}

// 3. Verifies non-default blog route exists
const testBlogPath = LOCALES.includes('fa')
  ? path.join(distDir, 'fa', 'blog', 'اولین-پست', 'index.html')
  : path.join(distDir, testNonDefault, 'blog', 'index.html');
assert(
  fs.existsSync(testBlogPath),
  `Non-default blog route exists (${path.relative(distDir, testBlogPath)})`
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

if (fs.existsSync(testBlogPath)) {
  const html = fs.readFileSync(testBlogPath, 'utf-8');
  const canonicalMatch = html.match(/<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i);
  assert(
    canonicalMatch && (canonicalMatch[1].includes(testNonDefault)),
    `Canonical link matches target URL on translated route: ${canonicalMatch ? canonicalMatch[1] : 'none'}`
  );
}

// 5. Verifies hreflang tags: exactly locales.length + 1 tags (self + alternates + x-default)
if (fs.existsSync(rootHtmlPath)) {
  const html = fs.readFileSync(rootHtmlPath, 'utf-8');
  const hreflangMatches = [...html.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"/gi)];
  const langs = hreflangMatches.map((m) => m[1]);

  const inlangSettings = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
  );
  const LOCALES = inlangSettings.locales;
  const expectedCount = LOCALES.length + 1;

  assert(
    langs.length === expectedCount,
    `Hreflang tags count is exactly ${expectedCount} (found: ${langs.length} -> ${langs.join(', ')})`
  );
  for (const loc of LOCALES) {
    assert(langs.includes(loc), `Hreflang includes "${loc}"`);
  }
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
