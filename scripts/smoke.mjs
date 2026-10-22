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
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

function readHtml(relativePath) {
  const filePath = path.join(distDir, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

function count(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function readFrontmatterSlug(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const slugLine = match[1].match(/^slug:\s*["']?(.*?)["']?\s*$/m);
  return slugLine ? slugLine[1].trim() : null;
}

const settings = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
);
const LOCALES = settings.locales;
const DEFAULT_LOCALE = settings.baseLocale || 'en';
const RTL_LOCALES = new Set(['fa', 'ar', 'he', 'ur', 'ps', 'ckb']);
const dirFor = (locale) => (RTL_LOCALES.has(locale) ? 'rtl' : 'ltr');
const nonDefaultLocales = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const testLocale = nonDefaultLocales.includes('fa') ? 'fa' : nonDefaultLocales[0];

// ---------------------------------------------------------------------------
// 1. Default locale renders prefix-less at the root with the right lang/dir
// ---------------------------------------------------------------------------
const rootHtml = readHtml('index.html');
assert(rootHtml !== null, 'Root index.html exists');
if (rootHtml) {
  assert(
    rootHtml.includes(`lang="${DEFAULT_LOCALE}"`) &&
      rootHtml.includes(`dir="${dirFor(DEFAULT_LOCALE)}"`),
    `Root renders the default locale (<html lang="${DEFAULT_LOCALE}" dir="${dirFor(DEFAULT_LOCALE)}">)`
  );
  assert(
    count(rootHtml, /<h1[\s>]/g) === 1,
    `Root page has exactly one <h1> (found ${count(rootHtml, /<h1[\s>]/g)})`
  );
  assert(
    !rootHtml.includes(`href="/${DEFAULT_LOCALE}/`) &&
      !rootHtml.includes(`href="/${DEFAULT_LOCALE}"`),
    'Default locale links are prefix-less'
  );
  const canonical = rootHtml.match(/<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i);
  assert(
    Boolean(canonical && canonical[1].endsWith('/') && /^https?:\/\//.test(canonical[1])),
    `Canonical link is absolute with a trailing slash: ${canonical ? canonical[1] : 'none'}`
  );
  const ogImage = rootHtml.match(/<meta[^>]+property="og:image"[^>]*content="([^"]+)"/i);
  assert(
    Boolean(ogImage && /^https?:\/\//.test(ogImage[1])),
    'Open Graph image is an absolute URL'
  );
  assert(
    rootHtml.includes('application/ld+json'),
    'Root emits JSON-LD structured data'
  );
  assert(
    rootHtml.includes('application/rss+xml'),
    'Root advertises the RSS feed'
  );
}

// ---------------------------------------------------------------------------
// 2. Non-default locale pages keep their prefix, language, and direction
// ---------------------------------------------------------------------------
if (testLocale) {
  const html = readHtml(path.join(testLocale, 'index.html'));
  assert(html !== null, `/${testLocale}/index.html exists`);
  if (html) {
    assert(
      html.includes(`lang="${testLocale}"`) && html.includes(`dir="${dirFor(testLocale)}"`),
      `/${testLocale}/ renders <html lang="${testLocale}" dir="${dirFor(testLocale)}">`
    );
    assert(count(html, /<h1[\s>]/g) === 1, `/${testLocale}/ has exactly one <h1>`);
  }

  const blogIndex = readHtml(path.join(testLocale, 'blog', 'index.html'));
  assert(blogIndex !== null, `/${testLocale}/blog/index.html exists`);
}

if (LOCALES.includes('ar')) {
  const html = readHtml(path.join('ar', 'index.html'));
  assert(html !== null, '/ar/index.html exists');
  if (html) {
    assert(
      html.includes('lang="ar"') && html.includes('dir="rtl"'),
      '/ar/ renders Arabic with RTL'
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Localized article slugs resolve to real built pages
// ---------------------------------------------------------------------------
let blogArticleHtml = null;
let blogArticlePath = null;
const blogRoot = path.join(rootDir, 'src', 'content', 'blog');
if (fs.existsSync(blogRoot) && testLocale) {
  const firstGroup = fs
    .readdirSync(blogRoot, { withFileTypes: true })
    .find((entry) => entry.isDirectory())?.name;

  if (firstGroup) {
    const slug = readFrontmatterSlug(
      path.join(blogRoot, firstGroup, `${testLocale}.mdx`)
    );
    if (slug) {
      const relative = path.join(testLocale, 'blog', slug, 'index.html');
      blogArticleHtml = readHtml(relative);
      blogArticlePath = relative;
      assert(blogArticleHtml !== null, `Localized article exists: ${relative}`);
    }
  }
}

if (blogArticleHtml) {
  const canonical = blogArticleHtml.match(
    /<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i
  );
  assert(
    Boolean(canonical && canonical[1].includes(`/${testLocale}/`)),
    'Article canonical includes the locale prefix'
  );
  assert(
    count(blogArticleHtml, /<h1[\s>]/g) === 1,
    `Article has exactly one <h1> (${blogArticlePath})`
  );
  const ogType = blogArticleHtml.match(/<meta[^>]+property="og:type"[^>]*content="([^"]+)"/i);
  assert(Boolean(ogType && ogType[1] === 'article'), 'Article OG type is "article"');
  assert(
    blogArticleHtml.includes('"@type":"BlogPosting"') ||
      blogArticleHtml.includes('"@type": "BlogPosting"'),
    'Article emits BlogPosting JSON-LD'
  );
}

// ---------------------------------------------------------------------------
// 4. Hreflang coverage on the home page
// ---------------------------------------------------------------------------
if (rootHtml) {
  const langs = [...rootHtml.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"/gi)].map(
    (match) => match[1]
  );
  const expected = LOCALES.length + 1;
  assert(
    langs.length === expected,
    `Hreflang count is ${expected} (found ${langs.length}: ${langs.join(', ')})`
  );
  for (const locale of LOCALES) {
    assert(langs.includes(locale), `Hreflang includes "${locale}"`);
  }
  assert(langs.includes('x-default'), 'Hreflang includes "x-default"');
}

// ---------------------------------------------------------------------------
// 5. Static endpoints and generated assets
// ---------------------------------------------------------------------------
assert(fs.existsSync(path.join(distDir, 'sitemap.xml')), 'dist/sitemap.xml exists');
const sitemap = readHtml('sitemap.xml');
if (sitemap) {
  assert(
    sitemap.includes('hreflang="x-default"'),
    'Sitemap emits x-default alternates'
  );
  for (const locale of LOCALES) {
    assert(
      sitemap.includes(`hreflang="${locale}"`),
      `Sitemap includes hreflang="${locale}"`
    );
  }
  assert(sitemap.includes('<lastmod>'), 'Sitemap includes lastmod timestamps');
}

assert(fs.existsSync(path.join(distDir, 'rss.xml')), 'dist/rss.xml exists');
const rss = readHtml('rss.xml');
if (rss) {
  assert(rss.includes('<feed') && rss.includes('<entry>'), 'RSS feed contains entries');
}

assert(fs.existsSync(path.join(distDir, 'site.webmanifest')), 'dist/site.webmanifest exists');
for (const asset of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-default.png']) {
  assert(fs.existsSync(path.join(distDir, asset)), `dist/${asset} exists`);
}

assert(fs.existsSync(path.join(distDir, '404.html')), 'dist/404.html exists');
const notFound = readHtml('404.html');
if (notFound) {
  assert(notFound.includes('name="robots"'), '404 page is noindex');
  assert(count(notFound, /<h1[\s>]/g) === 1, '404 page has exactly one <h1>');
}

const iconsSvg = readHtml('icons.svg');
assert(iconsSvg !== null, 'dist/icons.svg exists');
if (iconsSvg) {
  assert(
    iconsSvg.includes('<symbol id="search"') && iconsSvg.includes('<symbol id="globe"'),
    'icons.svg contains compiled symbols'
  );
}

const pagefindDir = path.join(distDir, 'pagefind');
assert(fs.existsSync(pagefindDir), 'dist/pagefind/ exists');
if (fs.existsSync(pagefindDir)) {
  assert(
    fs.existsSync(path.join(pagefindDir, 'pagefind.js')),
    'dist/pagefind/pagefind.js exists'
  );
}

const searchIndex = readHtml(path.join('api', 'search-dev.json'));
assert(searchIndex !== null, 'Fallback search index exists');
if (searchIndex) {
  try {
    const items = JSON.parse(searchIndex);
    assert(Array.isArray(items) && items.length > 0, 'Fallback search index contains items');
    assert(
      items.every((item) => typeof item.url === 'string' && item.url.endsWith('/')),
      'Fallback search index URLs use canonical trailing slashes'
    );
  } catch {
    assert(false, 'Fallback search index is valid JSON');
  }
}

// ---------------------------------------------------------------------------
// 6. Blog pagination: generated page routes, pager markup and rel=prev/next
// ---------------------------------------------------------------------------
const blogConfigSource = fs.readFileSync(
  path.join(rootDir, 'src', 'libs', 'config', 'blog.ts'),
  'utf-8'
);
const perPageMatch = blogConfigSource.match(/POSTS_PER_PAGE\s*=\s*(\d+)/);
const postsPerPage = perPageMatch ? Number(perPageMatch[1]) : 0;

/** Published (non-draft) posts of one locale, counted from the content source. */
function countPublishedPosts(locale) {
  const blogRoot = path.join(rootDir, 'src', 'content', 'blog');
  if (!fs.existsSync(blogRoot)) return 0;

  let total = 0;
  for (const group of fs.readdirSync(blogRoot, { withFileTypes: true })) {
    if (!group.isDirectory()) continue;

    const file = path.join(blogRoot, group.name, `${locale}.mdx`);
    if (!fs.existsSync(file)) continue;

    const raw = fs.readFileSync(file, 'utf-8');
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatter && /^\s*draft:\s*true\s*$/m.test(frontmatter[1])) continue;

    total += 1;
  }
  return total;
}

/** The public URL of one page of a locale's blog index. */
function expectedBlogPath(locale, page) {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return page === 1 ? `${prefix}/blog/` : `${prefix}/blog/page/${page}/`;
}

/** The file of one page of a locale's blog index inside dist/. */
function builtBlogPath(locale, page) {
  const segments =
    locale === DEFAULT_LOCALE
      ? ['blog']
      : [locale, 'blog'];
  if (page > 1) segments.push('page', String(page));
  return path.join(...segments, 'index.html');
}

if (postsPerPage > 0) {
  for (const locale of LOCALES) {
    const total = countPublishedPosts(locale);
    const expectedPages = Math.max(1, Math.ceil(total / postsPerPage));

    for (let page = 1; page <= expectedPages; page += 1) {
      const relative = builtBlogPath(locale, page);
      const html = readHtml(relative);
      assert(html !== null, `Blog page ${page} of "${locale}" exists: ${relative}`);
      if (!html) continue;

      const prev = html.match(/<link[^>]+rel="prev"[^>]*href="([^"]+)"/i);
      const next = html.match(/<link[^>]+rel="next"[^>]*href="([^"]+)"/i);

      if (page === 1) {
        assert(prev === null, `Blog page 1 of "${locale}" has no rel="prev"`);
      } else {
        assert(
          Boolean(prev && prev[1].endsWith(expectedBlogPath(locale, page - 1))),
          `Blog page ${page} of "${locale}" points back to page ${page - 1}`
        );
      }

      if (page === expectedPages) {
        assert(next === null, `Last blog page of "${locale}" has no rel="next"`);
      } else {
        assert(
          Boolean(next && next[1].endsWith(expectedBlogPath(locale, page + 1))),
          `Blog page ${page} of "${locale}" points forward to page ${page + 1}`
        );
      }

      const hasPager = /\sdata-blog-pagination(?=[\s>])/.test(html);
      assert(
        hasPager === (expectedPages > 1),
        `Blog page ${page} of "${locale}" ${
          hasPager ? 'renders' : 'omits'
        } the pager (${expectedPages} page(s))`
      );

      // The attribute is matched in attribute position, so the occurrences in
      // the scoped stylesheet and in the inlined script are not counted.
      const cards = count(html, /\sdata-post-card(?=[\s>])/g);
      assert(
        cards <= postsPerPage,
        `Blog page ${page} of "${locale}" renders at most ${postsPerPage} cards (${cards})`
      );
    }

    assert(
      readHtml(builtBlogPath(locale, expectedPages + 1)) === null,
      `No blog page ${expectedPages + 1} exists for "${locale}"`
    );
  }
}

console.log('\n----------------------------------------');
if (failed) {
  console.error(`❌ Smoke test suite failed (${checks} checks).`);
  process.exit(1);
}
console.log(`🎉 All ${checks} smoke checks passed!`);
