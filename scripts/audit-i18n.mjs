#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localeConfigPathFor, readLocaleConfig } from './lib/locales.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { readContentTypes } from './lib/content-types.mjs';
import { readMergedConfig } from './lib/config.mjs';
import {
  readClientMessages,
  readCoreMessages,
  readMergedMessages,
  stripSchema,
} from './lib/merge-messages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const localeConfig = readLocaleConfig(rootDir);
const LOCALES = localeConfig.locales;
const BASE_LOCALE = localeConfig.defaultLocale || 'en';

const appConfig = readMergedConfig(rootDir);
const CONTENT_TYPES = readContentTypes(appConfig, rootDir);
const CONTENT_TYPE_MAP = new Map(CONTENT_TYPES.map((type) => [type.key, type]));
const ENABLED_CONTENT_BASES = CONTENT_TYPES.filter(
  (type) => type.key !== 'pages' && type.enabled && type.base
).map((type) => type.base);

if (!LOCALES.includes(BASE_LOCALE)) {
  console.error(`❌ FATAL: defaultLocale "${BASE_LOCALE}" is not listed in client/locales.json locales.`);
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
// 1. Locale configuration validation (`client/locales.json`)
// ---------------------------------------------------------------------------
console.log('--- 1. Locale Configuration (`client/locales.json`) ---');

let localeConfigOk = true;
const recordLocaleFatal = (message) => {
  localeConfigOk = false;
  fatal(message);
};

const localesJsonPath = localeConfigPathFor(rootDir);
if (!fs.existsSync(localesJsonPath)) {
  recordLocaleFatal('Missing client/locales.json');
} else {
  const { locales, defaultLocale, metadata } = localeConfig;

  if (locales.length === 0) {
    recordLocaleFatal('client/locales.json "locales" array is empty');
  }
  if (!defaultLocale || !locales.includes(defaultLocale)) {
    recordLocaleFatal(`defaultLocale (${defaultLocale ?? 'missing'}) must be in locales`);
  }

  for (const locale of locales) {
    const meta = metadata[locale];
    if (!meta) {
      recordLocaleFatal(`client/locales.json metadata is missing "${locale}"`);
      continue;
    }
    if (!meta.dir || !['ltr', 'rtl'].includes(meta.dir)) {
      recordLocaleFatal(`client/locales.json metadata["${locale}"].dir must be "ltr" or "rtl"`);
    }
    if (!meta.htmlLang?.trim()) {
      recordLocaleFatal(`client/locales.json metadata["${locale}"].htmlLang is empty`);
    }
    if (!meta.name?.trim()) {
      recordLocaleFatal(`client/locales.json metadata["${locale}"].name is empty`);
    }
    if (!meta.fontFamily?.trim()) {
      recordLocaleFatal(`client/locales.json metadata["${locale}"].fontFamily is empty`);
    }
  }

  const extraMetadata = Object.keys(metadata).filter((locale) => !locales.includes(locale));
  if (extraMetadata.length) {
    recordLocaleFatal(
      `client/locales.json metadata defines unregistered locales: ${extraMetadata.join(', ')}`
    );
  }

  if (localeConfigOk) {
    console.log(`✅ client/locales.json defines ${LOCALES.length} valid locale(s) (default: ${BASE_LOCALE}).`);
  }
}

// ---------------------------------------------------------------------------
// 2. Two-tier dictionary parity: `messages/core/` + `client/messages/`
// ---------------------------------------------------------------------------
console.log('\n--- 2. Dictionary Parity ---');

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

// Check upstream core dictionary parity across its own files (`messages/core/*.json`)
const coreMessagesDir = path.join(rootDir, 'messages', 'core');
if (fs.existsSync(coreMessagesDir)) {
  const coreFiles = fs
    .readdirSync(coreMessagesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  const coreDicts = {};
  for (const loc of coreFiles) {
    try {
      coreDicts[loc] = readCoreMessages(loc, rootDir);
    } catch (error) {
      fatal(`Failed to parse messages/core/${loc}.json: ${error.message}`);
    }
  }
  const coreRefLocale = coreDicts.en ? 'en' : coreFiles[0];
  const coreRef = coreRefLocale ? coreDicts[coreRefLocale] : null;
  if (coreRef) {
    const coreRefKeys = messageKeys(coreRef);
    for (const loc of coreFiles) {
      const dict = coreDicts[loc];
      if (!dict) continue;
      const keys = messageKeys(dict);
      const keySet = new Set(keys);
      const missing = coreRefKeys.filter((k) => !keySet.has(k));
      if (missing.length) fatal(`messages/core/${loc}.json is missing keys: ${missing.join(', ')}`);
      const extra = keys.filter((k) => !coreRefKeys.includes(k));
      if (extra.length) fatal(`messages/core/${loc}.json has extra keys: ${extra.join(', ')}`);
    }
  }
}

// Build merged dictionaries for all active client locales
const dictionaries = {};
for (const locale of LOCALES) {
  const hasCore = Object.keys(stripSchema(readCoreMessages(locale, rootDir))).length > 0;
  const clientFilePath = path.join(rootDir, 'client', 'messages', `${locale}.json`);
  if (!hasCore && !fs.existsSync(clientFilePath)) {
    fatal(`Missing dictionary file: client/messages/${locale}.json`);
    continue;
  }
  try {
    dictionaries[locale] = readMergedMessages(locale, rootDir);
  } catch (error) {
    fatal(`Failed to load merged dictionary for "${locale}": ${error.message}`);
  }
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
    if (missing.length) fatal(`Merged ${locale} dictionary is missing keys: ${missing.join(', ')}`);

    const extra = keys.filter((key) => !baseKeys.includes(key));
    if (extra.length) fatal(`Merged ${locale} dictionary has extra keys: ${extra.join(', ')}`);

    for (const key of baseKeys) {
      if (!(key in dictionary)) continue;
      const value = dictionary[key];
      if (typeof value === 'string' && value.trim() === '') {
        fatal(`Merged ${locale} dictionary has an empty value for "${key}"`);
      }

      const expected = placeholderSignature(baseDictionary[key]);
      const actual = placeholderSignature(value);
      if (expected !== actual) {
        fatal(
          `Merged ${locale} dictionary placeholders for "${key}" differ from ${BASE_LOCALE} ` +
            `(expected {${expected}}, got {${actual}})`
        );
      }
    }
  }

  if (!hasFatal) {
    console.log(
      `✅ Merged core + client dictionaries in parity across ${LOCALES.length} locales (${baseKeys.length} keys).`
    );
  }

  // Every `m.key(...)` call across `src/` and `client/` must resolve to a compiled dictionary entry.
  const usedKeys = new Map();
  const walkUsage = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'paraglide') continue;
        walkUsage(fullPath);
      } else if (/\.(astro|ts|tsx|js)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const match of content.matchAll(/\bm\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
          usedKeys.set(match[1], path.relative(rootDir, fullPath));
        }
      }
    }
  };
  walkUsage(path.join(rootDir, 'src'));
  walkUsage(path.join(rootDir, 'client'));

  const missingUsage = [...usedKeys].filter(([key]) => !(key in baseDictionary));
  if (missingUsage.length) {
    for (const [key, file] of missingUsage) {
      fatal(`Message "${key}" used in ${file} is not defined in merged ${BASE_LOCALE} dictionary`);
    }
  } else {
    console.log(`✅ All ${usedKeys.size} statically referenced message keys exist.`);
  }

  // Flag orphaned client-owned keys (skip dynamic prefix families & overrides of core keys).
  const dynamicPrefixPattern = /^(?:nav_|blog_category_|blog_tag_)/;
  const baseCoreKeys = new Set(messageKeys(readCoreMessages(BASE_LOCALE, rootDir)));
  const baseClientKeys = messageKeys(readClientMessages(BASE_LOCALE, rootDir));
  const unusedClientKeys = baseClientKeys.filter(
    (key) => !usedKeys.has(key) && !dynamicPrefixPattern.test(key) && !baseCoreKeys.has(key)
  );
  if (unusedClientKeys.length > 0) {
    for (const key of unusedClientKeys) {
      console.warn(
        `⚠️ [WARN] Unused client dictionary key "${key}" in client/messages/${BASE_LOCALE}.json`
      );
      warningCount += 1;
    }
  } else {
    console.log('✅ No orphaned client dictionary keys detected.');
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

function deriveReservedRouteBases() {
  const pagesDir = path.join(rootDir, 'src', 'pages');
  const reserved = new Set([
    'page',
    'pagefind',
    '_astro',
    ...ENABLED_CONTENT_BASES,
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

    if (collection === 'pages') {
      if (
        frontmatter.hero !== undefined &&
        ![true, false, 'none', 'minimal', 'default'].includes(frontmatter.hero)
      ) {
        fatal(
          `Invalid hero "${frontmatter.hero}" in ${relative} (expected "none", "minimal", "default", or boolean)`
        );
        slugFatal = true;
      }
      const reservedLayoutKey = Object.keys(frontmatter).find((k) => /layout$/i.test(k));
      if (reservedLayoutKey) {
        fatal(
          `Reserved MDX frontmatter key "${reservedLayoutKey}" in ${relative} — use "container" ("canvas", "contained", or "prose") instead`
        );
        slugFatal = true;
      }
      if (
        frontmatter.container !== undefined &&
        !['canvas', 'contained', 'prose'].includes(String(frontmatter.container))
      ) {
        fatal(
          `Invalid container "${frontmatter.container}" in ${relative} (expected "canvas", "contained", or "prose")`
        );
        slugFatal = true;
      }
      if (frontmatter.flushTop !== undefined && typeof frontmatter.flushTop !== 'boolean') {
        fatal(`Invalid flushTop "${frontmatter.flushTop}" in ${relative} (expected boolean)`);
        slugFatal = true;
      }
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

    const collectionType = CONTENT_TYPE_MAP.get(collection);
    if (collectionType?.paginated && String(slug) === 'page') {
      fatal(
        `Slug "page" in ${relative} collides with reserved ${collectionType.key} pagination route (/${collectionType.base}/page/<n>/)`
      );
      slugFatal = true;
    }

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
            `Image "${image}" in ${relative} is not a format Astro can optimize (${[...IMAGE_EXTENSIONS].join(', ')})`
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
      const type = CONTENT_TYPE_MAP.get(collection);
      if (!type || !type.enabled) continue;
      addRoute(`${type.base}/${slug}`, file);
    }
  }

  for (const type of CONTENT_TYPES) {
    if (type.key !== 'pages' && type.enabled && type.index && type.base) {
      addRoute(type.base, `generated ${type.key} index`);
    }
  }
}

if (!slugFatal) {
  console.log('✅ Frontmatter valid and no route collisions detected.');
}

// ---------------------------------------------------------------------------
// 5. Unextracted text scanner (warnings only, scans `src/` and `client/`)
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

for (const file of [
  ...scanAstro(path.join(rootDir, 'src')),
  ...scanAstro(path.join(rootDir, 'client')),
]) {
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
// 6. RTL Logical Property & Reveal Vector Guard (`src/` and `client/`)
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
for (const file of [
  ...scanRtlSources(path.join(rootDir, 'src')),
  ...scanRtlSources(path.join(rootDir, 'client')),
]) {
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
