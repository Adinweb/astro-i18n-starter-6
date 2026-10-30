#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES_SOURCE_PATH, readLocaleConfig } from './lib/locales.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const settings = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
);
const LOCALES = settings.locales;
const BASE_LOCALE = settings.baseLocale || 'en';

if (!LOCALES.includes(BASE_LOCALE)) {
  console.error(`❌ FATAL: baseLocale "${BASE_LOCALE}" is not listed in locales.`);
  process.exit(1);
}

let hasFatal = false;
let warningCount = 0;

function fatal(message) {
  console.error(`❌ FATAL: ${message}`);
  hasFatal = true;
}

console.log('🔍 Running i18n Audit Suite...\n');

// ---------------------------------------------------------------------------
// 1. Locale configuration parity
//
// `project.inlang/settings.json` drives Paraglide; `src/i18n/locales.ts`
// drives routing and metadata. They must describe the same language set, or
// content and URLs silently disagree about which locales exist.
// ---------------------------------------------------------------------------
console.log('--- 1. Locale Configuration Parity ---');

let localeConfigOk = true;
const recordLocaleFatal = (message) => {
  localeConfigOk = false;
  fatal(message);
};

if (!fs.existsSync(LOCALES_SOURCE_PATH)) {
  recordLocaleFatal('Missing src/i18n/locales.ts');
} else {
  const { locales: tsLocales, defaultLocale, metadata } = readLocaleConfig();

  if (tsLocales.length === 0) {
    recordLocaleFatal('Could not read LOCALES from src/i18n/locales.ts');
  } else if (JSON.stringify(tsLocales) !== JSON.stringify(LOCALES)) {
    recordLocaleFatal(
      `source LOCALES [${tsLocales.join(', ')}] differ from project.inlang locales [${LOCALES.join(', ')}]`
    );
  }

  if (defaultLocale !== BASE_LOCALE) {
    recordLocaleFatal(
      `DEFAULT_LOCALE (${defaultLocale ?? 'missing'}) differs from baseLocale (${BASE_LOCALE})`
    );
  }

  for (const locale of LOCALES) {
    const meta = metadata[locale];
    if (!meta) {
      recordLocaleFatal(`LOCALE_METADATA is missing "${locale}"`);
      continue;
    }
    if (!meta.dir || !['ltr', 'rtl'].includes(meta.dir)) {
      recordLocaleFatal(`LOCALE_METADATA["${locale}"].dir must be "ltr" or "rtl"`);
    }
    if (!meta.htmlLang?.trim()) {
      recordLocaleFatal(`LOCALE_METADATA["${locale}"].htmlLang is empty`);
    }
    if (!meta.name?.trim()) {
      recordLocaleFatal(`LOCALE_METADATA["${locale}"].name is empty`);
    }
    if (!meta.fontFamily?.trim()) {
      recordLocaleFatal(`LOCALE_METADATA["${locale}"].fontFamily is empty`);
    }
  }

  const extraMetadata = Object.keys(metadata).filter((locale) => !LOCALES.includes(locale));
  if (extraMetadata.length) {
    recordLocaleFatal(`LOCALE_METADATA defines unregistered locales: ${extraMetadata.join(', ')}`);
  }

  if (localeConfigOk) {
    console.log(
      `✅ project.inlang/settings.json and src/i18n/locales.ts agree on ${LOCALES.length} locales.`
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Dictionary parity: keys, placeholder signatures, and empty values
// ---------------------------------------------------------------------------
console.log('\n--- 2. Dictionary Parity ---');
const messagesDir = path.join(rootDir, 'messages');
const dictionaries = {};

for (const locale of LOCALES) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    fatal(`Missing dictionary file: messages/${locale}.json`);
    continue;
  }
  try {
    dictionaries[locale] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    fatal(`Failed to parse messages/${locale}.json: ${error.message}`);
  }
}

function messageKeys(dictionary) {
  return Object.keys(dictionary).filter((key) => !key.startsWith('$'));
}

function placeholderSignature(value) {
  const names = new Set();
  const collect = (text) => {
    for (const match of String(text).matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:[,}])/g)) {
      names.add(match[1]);
    }
  };

  if (typeof value === 'string') {
    collect(value);
  } else if (Array.isArray(value)) {
    for (const variant of value) {
      for (const declaration of variant?.declarations ?? []) {
        const match = String(declaration).match(/^input\s+([A-Za-z_][A-Za-z0-9_]*)/);
        if (match) names.add(match[1]);
      }
      for (const text of Object.values(variant?.match ?? {})) collect(text);
    }
  } else if (value && typeof value === 'object') {
    for (const text of Object.values(value)) collect(text);
  }

  return [...names].sort().join(',');
}

const baseDictionary = dictionaries[BASE_LOCALE];
if (baseDictionary) {
  const baseKeys = messageKeys(baseDictionary);

  for (const locale of LOCALES) {
    const dictionary = dictionaries[locale];
    if (!dictionary) continue;

    const keys = messageKeys(dictionary);
    const keySet = new Set(keys);

    const missing = baseKeys.filter((key) => !keySet.has(key));
    if (missing.length) fatal(`${locale}.json is missing keys: ${missing.join(', ')}`);

    const extra = keys.filter((key) => !baseKeys.includes(key));
    if (extra.length) fatal(`${locale}.json has extra keys: ${extra.join(', ')}`);

    for (const key of baseKeys) {
      if (!(key in dictionary)) continue;
      const value = dictionary[key];
      if (typeof value === 'string' && value.trim() === '') {
        fatal(`${locale}.json has an empty value for "${key}"`);
      }

      const expected = placeholderSignature(baseDictionary[key]);
      const actual = placeholderSignature(value);
      if (expected !== actual) {
        fatal(
          `${locale}.json placeholders for "${key}" differ from ${BASE_LOCALE}.json ` +
            `(expected {${expected}}, got {${actual}})`
        );
      }
    }
  }

  if (!hasFatal) {
    console.log(`✅ Keys and placeholders in parity across ${LOCALES.length} locales (${baseKeys.length} keys).`);
  }

  // Every `m.key(...)` call must resolve to a compiled dictionary entry.
  const usageDir = path.join(rootDir, 'src');
  const usedKeys = new Map();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'paraglide') continue;
        walk(fullPath);
      } else if (/\.(astro|ts|tsx|js)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const match of content.matchAll(/\bm\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
          usedKeys.set(match[1], path.relative(rootDir, fullPath));
        }
      }
    }
  };
  walk(usageDir);

  const missingUsage = [...usedKeys].filter(([key]) => !(key in baseDictionary));
  if (missingUsage.length) {
    for (const [key, file] of missingUsage) {
      fatal(`Message "${key}" used in ${file} is not defined in ${BASE_LOCALE}.json`);
    }
  } else {
    console.log(`✅ All ${usedKeys.size} statically referenced message keys exist.`);
  }

  // Dynamic prefix families (`nav_<group>`, `blog_category_<key>`, `blog_tag_<key>`)
  // are resolved via computed lookups in navigation.ts and taxonomy.ts.
  const dynamicPrefixPattern = /^(?:nav_|blog_category_|blog_tag_)/;
  const unusedKeys = baseKeys.filter(
    (key) => !usedKeys.has(key) && !dynamicPrefixPattern.test(key)
  );
  if (unusedKeys.length > 0) {
    for (const key of unusedKeys) {
      console.warn(`⚠️ [WARN] Unused dictionary key "${key}" (no static m.${key}(...) call in src/)`);
      warningCount += 1;
    }
  } else {
    console.log('✅ No orphaned dictionary keys detected.');
  }
}

// ---------------------------------------------------------------------------
// 3. Content parity and frontmatter validity
// ---------------------------------------------------------------------------
console.log('\n--- 3. Content Collection Parity ---');
const contentDir = path.join(rootDir, 'src', 'content');

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!/^---\r?\n[\s\S]*?\r?\n---/.test(content)) return null;
  return parseFrontmatter(content).data;
}

function localeFile(groupDir, locale) {
  for (const extension of ['mdx', 'md']) {
    const candidate = path.join(groupDir, `${locale}.${extension}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const groups = [];
let missingLocales = 0;
if (!fs.existsSync(contentDir)) {
  console.log('⚠️ No content directory found.');
} else {
  const collections = fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const collection of collections) {
    const collectionDir = path.join(contentDir, collection);
    for (const group of fs.readdirSync(collectionDir, { withFileTypes: true })) {
      if (!group.isDirectory()) continue;
      const groupDir = path.join(collectionDir, group.name);
      groups.push({ collection, group: group.name, groupDir });

      for (const locale of LOCALES) {
        if (!localeFile(groupDir, locale)) {
          // A group may exist in fewer languages than the site has: a blog
          // post that was only written in English is a normal case, and the
          // route builder, the navigation and the language switcher all cope
          // with it. It is reported, but it must not break the build.
          const message = `Missing ${locale}.mdx for src/content/${collection}/${group.name}`;
          console.warn(`⚠️ [WARN] ${message}`);
          warningCount += 1;
          missingLocales += 1;
        }
      }

      const files = fs.readdirSync(groupDir);
      for (const file of files) {
        const locale = file.replace(/\.(mdx|md)$/, '');
        if (!file.match(/\.(mdx|md)$/)) continue;
        if (!LOCALES.includes(locale)) {
          fatal(`Unknown locale file: src/content/${collection}/${group.name}/${file}`);
        }
      }
    }
  }

  if (missingLocales === 0) {
    console.log(`✅ All ${groups.length} content groups have a file for every locale.`);
  } else {
    console.log(
      `ℹ️ ${missingLocales} of ${groups.length * LOCALES.length} group/locale combinations have no entry (see the warnings above).`
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Slugs, required frontmatter, and route collisions
// ---------------------------------------------------------------------------
console.log('\n--- 4. Slug & Route Guard ---');

/**
 * Top-level route bases that page slugs must not shadow. Derived from the
 * physical files in `src/pages/`, so adding an endpoint (or the 404 page) is
 * protected without touching this audit.
 */
function deriveReservedRouteBases() {
  const pagesDir = path.join(rootDir, 'src', 'pages');
  // The blog index, static build output folders, and non-default locale prefixes must never be shadowed by a page slug.
  const reserved = new Set([
    'blog',
    'pagefind',
    '_astro',
    ...LOCALES.filter((locale) => locale !== BASE_LOCALE),
  ]);
  if (!fs.existsSync(pagesDir)) return reserved;

  for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
    if (entry.name.startsWith('[')) continue;
    if (entry.isDirectory()) {
      reserved.add(entry.name);
      continue;
    }
    reserved.add(entry.name.replace(/\.(astro|ts|tsx|js)$/, ''));
  }

  return reserved;
}

const RESERVED_ROUTE_BASES = deriveReservedRouteBases();
const SLUG_PATTERN = /^[\p{L}\p{N}\p{M}]+(?:[\u200C\u200D-][\p{L}\p{N}\p{M}]+)*$/u;
const TAXONOMY_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// The formats Astro's image pipeline accepts as input.
const IMAGE_EXTENSIONS = new Set([
  'jpeg',
  'jpg',
  'png',
  'apng',
  'tiff',
  'webp',
  'gif',
  'svg',
  'avif',
]);
let slugFatal = false;

for (const { collection, group, groupDir } of groups) {
  for (const locale of LOCALES) {
    const file = localeFile(groupDir, locale);
    if (!file) continue;

    const frontmatter = readFrontmatter(file);
    const relative = path.relative(rootDir, file);

    if (!frontmatter) {
      fatal(`${relative} has no frontmatter block`);
      slugFatal = true;
      continue;
    }

    if (!String(frontmatter.title ?? '').trim()) {
      fatal(`${relative} is missing a non-empty "title"`);
      slugFatal = true;
    }

    if (collection === 'blog') {
      if (!frontmatter.publishedAt) {
        fatal(`${relative} is missing "publishedAt"`);
        slugFatal = true;
      } else if (Number.isNaN(Date.parse(String(frontmatter.publishedAt)))) {
        fatal(`${relative} has an invalid "publishedAt" date: "${frontmatter.publishedAt}"`);
        slugFatal = true;
      }
    }

    if (frontmatter.updatedAt && Number.isNaN(Date.parse(String(frontmatter.updatedAt)))) {
      fatal(`${relative} has an invalid "updatedAt" date: "${frontmatter.updatedAt}"`);
      slugFatal = true;
    }

    for (const taxonomyField of ['categories', 'tags']) {
      const items = frontmatter[taxonomyField];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (!TAXONOMY_KEY_PATTERN.test(String(item))) {
            fatal(
              `Invalid ${taxonomyField} key "${item}" in ${relative} (use lowercase ASCII letters, digits, and single hyphens)`
            );
            slugFatal = true;
          }
        }
      }
    }

    if (frontmatter.draft !== true && frontmatter.draft !== 'true') {
      const source = fs.readFileSync(file, 'utf-8');
      if (source.includes('[TODO')) {
        console.warn(`⚠️ [WARN] ${relative} is published but still contains "[TODO" placeholders`);
        warningCount += 1;
      }
    }

    const slug = frontmatter.slug;
    if (slug === undefined || slug === '') {
      if (collection === 'pages' && group === 'home') continue;
      fatal(`${relative} is missing a non-empty "slug"`);
      slugFatal = true;
      continue;
    }

    if (!SLUG_PATTERN.test(String(slug))) {
      fatal(`Invalid slug "${slug}" in ${relative} (use letters, digits, and single hyphens)`);
      slugFatal = true;
    }

    if (collection === 'pages' && RESERVED_ROUTE_BASES.has(String(slug))) {
      fatal(`Slug "${slug}" in ${relative} collides with a reserved route`);
      slugFatal = true;
    }

    if (collection === 'blog' && String(slug) === 'page') {
      fatal(
        `Slug "page" in ${relative} collides with reserved blog pagination route (/blog/page/<n>/)`
      );
      slugFatal = true;
    }

    // The `image` field is a path relative to the content file: Astro's
    // `image()` helper resolves it, checks that the file exists and hands the
    // entry ready-made image metadata.
    const image = frontmatter.image;
    if (image) {
      if (!image.startsWith('./') && !image.startsWith('../')) {
        fatal(
          `Image "${image}" in ${relative} must be a path relative to the content file (for example "./cover.png")`
        );
        slugFatal = true;
      } else {
        const asset = path.resolve(path.dirname(file), image);
        if (!fs.existsSync(asset)) {
          fatal(`Image "${image}" in ${relative} has no file at ${path.relative(rootDir, asset)}`);
          slugFatal = true;
        } else if (!IMAGE_EXTENSIONS.has(path.extname(asset).slice(1).toLowerCase())) {
          fatal(
            `Image "${image}" in ${relative} is not a format Astro can optimize (${IMAGE_EXTENSIONS.join(', ')})`
          );
          slugFatal = true;
        }
      }
    }
  }
}

const seen = new Map();

for (const locale of LOCALES) {
  const addRoute = (routePath, source) => {
    const key = `/${locale === BASE_LOCALE ? '' : `${locale}/`}${routePath}`;
    if (seen.has(key)) {
      fatal(`Route collision for "${key}":\n  - ${seen.get(key)}\n  - ${source}`);
      slugFatal = true;
    } else {
      seen.set(key, source);
    }
  };

  for (const { collection, groupDir } of groups) {
    const file = localeFile(groupDir, locale);
    if (!file) continue;
    const frontmatter = readFrontmatter(file);
    if (!frontmatter) continue;
    const slug = frontmatter.slug ?? '';

    if (collection === 'pages') {
      addRoute(slug, file);
    } else {
      addRoute(`blog/${slug}`, file);
    }
  }

  // Blog index is registered once per locale by the content service.
  addRoute('blog', 'generated blog index');
}

if (!slugFatal) {
  console.log('✅ Frontmatter valid and no route collisions detected.');
}

// ---------------------------------------------------------------------------
// 5. Unextracted text scanner (warnings only)
// ---------------------------------------------------------------------------
console.log('\n--- 5. Unextracted Text Scanner (Warnings) ---');
const skippedTemplatePatterns = [/©/, /^[0-9]+$/, /^[\s|·/–—↑←→]+$/];

function scanAstro(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'paraglide') continue;
      files.push(...scanAstro(fullPath));
    } else if (entry.name.endsWith('.astro')) {
      files.push(fullPath);
    }
  }
  return files;
}

for (const file of scanAstro(path.join(rootDir, 'src'))) {
  const content = fs.readFileSync(file, 'utf-8');
  const template = content.replace(/^---[\s\S]*?---/, '');

  template.split(/\r?\n/).forEach((line, lineIndex) => {
    if (/\{m\.[A-Za-z0-9_]+\s*\(/.test(line) || /\{[^}]*\}/.test(line)) return;
    const match = line.match(/>([^<>{}\n]+)</);
    if (!match) return;

    const text = match[1].trim();
    if (text.length <= 8 || skippedTemplatePatterns.some((pattern) => pattern.test(text))) {
      return;
    }

    console.warn(
      `⚠️ [WARN] Potential unextracted text in ${path.relative(rootDir, file)}:${lineIndex + 1}: "${text}"`
    );
    warningCount += 1;
  });
}

if (warningCount === 0) {
  console.log('✅ Unextracted text scanner clean (0 warnings).');
} else {
  console.log(`ℹ️ Emitted ${warningCount} warning(s).`);
}

// ---------------------------------------------------------------------------
// 6. RTL Logical Property & Reveal Vector Guard (AGENTS.md Rules 4 & 10)
// ---------------------------------------------------------------------------
console.log('\n--- 6. RTL Logical Property Guard ---');
const FORBIDDEN_PHYSICAL_CLASS =
  /^(?:-?m[lr]-|p[lr]-|-?(?:left|right)-|text-(?:left|right)$|border-[lr](?:$|-)|rounded-(?:[tb])?[lr](?:$|-))/;
const FORBIDDEN_REVEAL_VECTOR =
  /\b(?:data-reveal|data-trig-direction|direction)\s*=\s*["'](?:left|right)["']/;

function scanRtlSources(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'paraglide' || entry.name === 'test') continue;
      files.push(...scanRtlSources(fullPath));
    } else if (
      /\.(astro|mdx|ts|tsx)$/.test(entry.name) &&
      !/\.(?:test|spec)\.[jt]sx?$/.test(entry.name)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

let rtlViolations = 0;
for (const file of scanRtlSources(path.join(rootDir, 'src'))) {
  const raw = fs.readFileSync(file, 'utf-8');
  const source = file.endsWith('.mdx') ? raw.replace(/```[\s\S]*?```/g, '') : raw;
  const relative = path.relative(rootDir, file);

  const revealMatch = source.match(FORBIDDEN_REVEAL_VECTOR);
  if (revealMatch) {
    fatal(
      `Forbidden physical reveal vector (${revealMatch[0]}) in ${relative}; use logical "start" or "end"`
    );
    rtlViolations += 1;
  }

  const classAttrPatterns = [
    /\bclass(?:Name)?\s*=\s*"([^"]*)"/g,
    /\bclass(?:Name)?\s*=\s*'([^']*)'/g,
    /\.className\s*=\s*['"`]([^'"`]*)['"`]/g,
  ];

  for (const pattern of classAttrPatterns) {
    for (const match of source.matchAll(pattern)) {
      const tokens = match[1].split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        const utility = token.replace(/^(?:[a-z0-9-[\]=]+:)+/, '');
        if (FORBIDDEN_PHYSICAL_CLASS.test(utility)) {
          fatal(
            `Forbidden physical directional class "${token}" in ${relative}; use CSS logical properties`
          );
          rtlViolations += 1;
        }
      }
    }
  }
}

if (rtlViolations === 0) {
  console.log('✅ Zero physical directional CSS classes or reveal vectors detected.');
}

console.log('\n----------------------------------------');
if (hasFatal) {
  console.error('❌ Audit Failed: resolve the fatal errors above.');
  process.exit(1);
}
console.log('🎉 Audit Passed: 0 fatal errors.');
