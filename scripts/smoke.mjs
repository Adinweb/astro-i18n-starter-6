#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLocaleConfig } from './lib/locales.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const appConfig = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'app.config.json'), 'utf-8')
);

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

/**
 * The attributes of the document element.
 *
 * The `lang` and `dir` of a page are read from the `<html>` tag itself. A
 * substring search over the whole document would also match the `dir="ltr"` of
 * the loading bar, which every page carries, and would then pass on every
 * page — including a page whose `dir` is wrong.
 */
function htmlAttributes(html) {
  const tag = html.match(/<html\b([^>]*)>/i);
  if (!tag) return null;
  const attributes = {};
  for (const attr of tag[1].matchAll(/([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"([^"]*)"/g)) {
    attributes[attr[1].toLowerCase()] = attr[2];
  }
  return attributes;
}

const settings = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
);
const LOCALES = settings.locales;
const DEFAULT_LOCALE = settings.baseLocale || 'en';

/**
 * Text direction per locale, read from `src/i18n/locales.ts` (the SSOT). The
 * smoke test must not keep a second list of RTL languages that can drift from
 * the metadata the site is built with.
 */
const { metadata: LOCALE_METADATA } = readLocaleConfig();
const LOCALE_DIRECTIONS = Object.fromEntries(
  Object.entries(LOCALE_METADATA).map(([locale, meta]) => [locale, meta.dir])
);

const dirFor = (locale) => LOCALE_DIRECTIONS[locale] ?? 'ltr';
const nonDefaultLocales = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const testLocale = nonDefaultLocales.includes('fa') ? 'fa' : nonDefaultLocales[0];

// A locale without a direction is a configuration error, not a default: the
// direction checks below would silently pass on a page whose `dir` is wrong.
for (const locale of LOCALES) {
  assert(
    LOCALE_DIRECTIONS[locale] === 'ltr' || LOCALE_DIRECTIONS[locale] === 'rtl',
    `Locale "${locale}" declares a direction in src/i18n/locales.ts`
  );
}

// ---------------------------------------------------------------------------
// 1. Default locale renders prefix-less at the root with the right lang/dir
// ---------------------------------------------------------------------------
const rootHtml = readHtml('index.html');
assert(rootHtml !== null, 'Root index.html exists');
if (rootHtml) {
  const rootAttributes = htmlAttributes(rootHtml);
  assert(
    Boolean(
      rootAttributes &&
        rootAttributes.lang === DEFAULT_LOCALE &&
        rootAttributes.dir === dirFor(DEFAULT_LOCALE)
    ),
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
    const attributes = htmlAttributes(html);
    assert(
      Boolean(
        attributes &&
          attributes.lang === testLocale &&
          attributes.dir === dirFor(testLocale)
      ),
      `/${testLocale}/ renders <html lang="${testLocale}" dir="${dirFor(testLocale)}">`
    );
    assert(count(html, /<h1[\s>]/g) === 1, `/${testLocale}/ has exactly one <h1>`);
    const rssLink = html.match(
      /<link[^>]+type="application\/rss\+xml"[^>]*href="([^"]+)"/i
    );
    assert(
      Boolean(rssLink && rssLink[1].endsWith(`/rss/${testLocale}.xml`)),
      `/${testLocale}/ advertises its localized Atom feed (/rss/${testLocale}.xml)`
    );
  }

  const blogIndex = readHtml(path.join(testLocale, 'blog', 'index.html'));
  assert(blogIndex !== null, `/${testLocale}/blog/index.html exists`);
  if (blogIndex) {
    assert(
      blogIndex.includes('"@type":"BreadcrumbList"') ||
        blogIndex.includes('"@type": "BreadcrumbList"'),
      `/${testLocale}/blog/ emits BreadcrumbList JSON-LD`
    );
  }
}

if (LOCALES.includes('ar')) {
  const html = readHtml(path.join('ar', 'index.html'));
  assert(html !== null, '/ar/index.html exists');
  if (html) {
    const attributes = htmlAttributes(html);
    assert(
      Boolean(attributes && attributes.lang === 'ar' && attributes.dir === 'rtl'),
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
  assert(
    blogArticleHtml.includes('"@type":"BreadcrumbList"') ||
      blogArticleHtml.includes('"@type": "BreadcrumbList"'),
    'Article emits BreadcrumbList JSON-LD'
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
  assert(rss.includes('<feed') && rss.includes('<entry'), 'RSS feed contains entries');
  assert(
    rss.includes(`xml:lang="${DEFAULT_LOCALE}"`),
    `Default RSS feed declares xml:lang="${DEFAULT_LOCALE}"`
  );
  assert(
    nonDefaultLocales.every((loc) => !rss.includes(`/${loc}/blog/`)),
    'Default RSS feed contains only default-locale entries'
  );
}

for (const locale of nonDefaultLocales) {
  const localeFeedPath = path.join('rss', `${locale}.xml`);
  assert(
    fs.existsSync(path.join(distDir, localeFeedPath)),
    `dist/rss/${locale}.xml exists`
  );
  const localeRss = readHtml(localeFeedPath);
  if (localeRss) {
    assert(
      localeRss.includes('<feed') && localeRss.includes(`xml:lang="${locale}"`),
      `dist/rss/${locale}.xml declares xml:lang="${locale}"`
    );
    assert(
      !localeRss.includes(`hreflang="${DEFAULT_LOCALE}"`),
      `dist/rss/${locale}.xml contains only "${locale}" entries`
    );
  }
}

assert(fs.existsSync(path.join(distDir, 'site.webmanifest')), 'dist/site.webmanifest exists');
const manifest = readHtml('site.webmanifest');
if (manifest) {
  try {
    const data = JSON.parse(manifest);
    assert(data.name === appConfig.site.name, 'Manifest name matches app.config.json');
    assert(
      data.short_name === appConfig.site.shortName,
      'Manifest short_name matches app.config.json'
    );
    assert(
      data.theme_color === appConfig.brand.themeColor,
      'Manifest theme_color matches app.config.json'
    );
    assert(
      data.background_color === appConfig.brand.backgroundColor,
      'Manifest background_color matches app.config.json'
    );
    assert(
      Array.isArray(data.icons) && data.icons.length === appConfig.brand.icons.length,
      'Manifest icons match app.config.json'
    );
    assert(
      appConfig.brand.icons.every((icon) =>
        data.icons.some(
          (entry) => entry.src === `/${icon.file}` && entry.sizes === `${icon.size}x${icon.size}`
        )
      ),
      'Manifest icon files and sizes match app.config.json'
    );
  } catch {
    assert(false, 'Manifest is valid JSON');
  }
}

const brandAssets = [
  appConfig.brand.appleTouchIcon.file,
  ...appConfig.brand.icons.map((icon) => icon.file),
  appConfig.site.socialImage.path.replace(/^\/+/, ''),
];
for (const asset of brandAssets) {
  assert(fs.existsSync(path.join(distDir, asset)), `dist/${asset} exists`);
}

assert(fs.existsSync(path.join(distDir, '404.html')), 'dist/404.html exists');
const notFound = readHtml('404.html');
if (notFound) {
  assert(notFound.includes('name="robots"'), '404 page is noindex');
  assert(count(notFound, /<h1[\s>]/g) === 1, '404 page has exactly one <h1>');

  // The 404 has no artwork, so it uses the site-wide card. Its declared
  // dimensions must describe the generated PNG: a stale or resized
  // `public/og-default.png` would otherwise ship a lying og:image card.
  const card = notFound.match(
    /<meta[^>]+property="og:image"[^>]*content="([^"]+)"/i
  );
  const cardWidth = notFound.match(
    /<meta[^>]+property="og:image:width"[^>]*content="(\d+)"/i
  );
  const cardHeight = notFound.match(
    /<meta[^>]+property="og:image:height"[^>]*content="(\d+)"/i
  );
  assert(
    Boolean(card && cardWidth && cardHeight),
    'Default social card declares an absolute URL and its dimensions'
  );

  if (card && cardWidth && cardHeight) {
    const imagePath = decodeURIComponent(new URL(card[1]).pathname).replace(/^\/+/, '');
    const imageFile = path.join(distDir, imagePath);
    const exists = fs.existsSync(imageFile);
    assert(exists, `Default social card exists in dist: ${imagePath}`);
    if (exists) {
      const png = fs.readFileSync(imageFile);
      const isPng = png.length > 24 && png.toString('ascii', 1, 4) === 'PNG';
      assert(isPng, 'Default social card is a PNG');
      if (isPng) {
        const actualWidth = png.readUInt32BE(16);
        const actualHeight = png.readUInt32BE(20);
        assert(
          Number(cardWidth[1]) === actualWidth && Number(cardHeight[1]) === actualHeight,
          `Default social card dimensions match the file (${actualWidth}x${actualHeight})`
        );
      }
    }
  }
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

const astroAssetsDir = path.join(distDir, '_astro');
const clientBundles = fs.existsSync(astroAssetsDir)
  ? fs
      .readdirSync(astroAssetsDir)
      .filter((name) => name.endsWith('.js'))
      .map((name) => fs.readFileSync(path.join(astroAssetsDir, name), 'utf-8'))
  : [];
const pagefindReferenced =
  Boolean(rootHtml && rootHtml.includes('/pagefind/pagefind.js')) ||
  clientBundles.some((code) => code.includes('/pagefind/pagefind.js'));
assert(
  pagefindReferenced,
  'Client search script retains /pagefind/pagefind.js in production build'
);

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

const blogCatalog = readHtml(path.join('api', 'blog-posts.json'));
assert(blogCatalog !== null, 'Static blog catalog (dist/api/blog-posts.json) exists');
if (blogCatalog) {
  try {
    const items = JSON.parse(blogCatalog);
    assert(
      Array.isArray(items) && items.length > 0,
      'Static blog catalog contains published post entries'
    );
    assert(
      items.every(
        (item) =>
          LOCALES.includes(item.locale) &&
          typeof item.href === 'string' &&
          item.href.endsWith('/')
      ),
      'Static blog catalog entries have valid locales and canonical trailing slashes'
    );
  } catch {
    assert(false, 'Static blog catalog is valid JSON');
  }
}

// ---------------------------------------------------------------------------
// 6. Every page has one H1 and no placeholder copy leaked into the build
// ---------------------------------------------------------------------------
function collectHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_astro' || entry.name === 'pagefind') continue;
      files.push(...collectHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

const builtHtmlFiles = collectHtmlFiles(distDir);
const duplicateHeadingPages = [];
const placeholderPages = [];
const untranspiledInlineScriptPages = [];
const inlineTsGenericPattern =
  /\.\s*(?:querySelector|querySelectorAll|getElementById|closest)\s*<\s*[A-Z]\w*\s*>\s*\(/;

for (const file of builtHtmlFiles) {
  const html = fs.readFileSync(file, 'utf-8');
  const relative = path.relative(distDir, file);
  if (count(html, /<h1[\s>]/g) !== 1) duplicateHeadingPages.push(relative);
  if (html.includes('[TODO')) placeholderPages.push(relative);

  for (const scriptMatch of html.matchAll(
    /<script\b(?![^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi
  )) {
    if (inlineTsGenericPattern.test(scriptMatch[1])) {
      untranspiledInlineScriptPages.push(relative);
      break;
    }
  }
}

assert(
  duplicateHeadingPages.length === 0,
  `Every built page has exactly one <h1>${duplicateHeadingPages.length ? ` (offenders: ${duplicateHeadingPages.join(', ')})` : ''}`
);
assert(
  placeholderPages.length === 0,
  `No placeholder copy is published${placeholderPages.length ? ` (offenders: ${placeholderPages.join(', ')})` : ''}`
);
assert(
  untranspiledInlineScriptPages.length === 0,
  `No built page contains untranspiled TypeScript generics in inline <script> tags${untranspiledInlineScriptPages.length ? ` (offenders: ${untranspiledInlineScriptPages.join(', ')})` : ''}`
);

// ---------------------------------------------------------------------------
// 7. Blog pagination: generated page routes, pager markup and rel=prev/next
// ---------------------------------------------------------------------------
const postsPerPage = appConfig.blog.postsPerPage;

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
