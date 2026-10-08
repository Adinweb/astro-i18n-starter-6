#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const inlangSettings = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
);
const LOCALES = inlangSettings.locales;
const RESERVED_ROUTE_BASES = new Set(['blog', 'icons.svg', '404', 'sitemap.xml', 'robots.txt']);

const args = process.argv.slice(2);
const warnContent = args.includes('--warn-content') || args.includes('--lenient');

let hasFatal = false;
let warningCount = 0;

console.log('🔍 Running i18n Audit Suite...\n');

// 1. Dictionary Key Parity (FATAL / Exit 1)
console.log('--- 1. Dictionary Key Parity ---');
const messagesDir = path.join(rootDir, 'messages');
const dictionaries = {};

for (const loc of LOCALES) {
  const filePath = path.join(messagesDir, `${loc}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ FATAL: Missing dictionary file: ${filePath}`);
    hasFatal = true;
  } else {
    try {
      dictionaries[loc] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`❌ FATAL: Failed to parse ${filePath}:`, e.message);
      hasFatal = true;
    }
  }
}

if (dictionaries.en) {
  const baseKeys = Object.keys(dictionaries.en).filter((k) => !k.startsWith('$'));

  for (const loc of LOCALES) {
    if (loc === 'en' || !dictionaries[loc]) continue;
    const targetKeys = new Set(Object.keys(dictionaries[loc]).filter((k) => !k.startsWith('$')));

    const missingKeys = baseKeys.filter((k) => !targetKeys.has(k));
    if (missingKeys.length > 0) {
      console.error(`❌ FATAL: ${loc}.json is missing keys present in en.json: ${missingKeys.join(', ')}`);
      hasFatal = true;
    }

    const extraKeys = Array.from(targetKeys).filter((k) => !baseKeys.includes(k));
    if (extraKeys.length > 0) {
      console.error(`❌ FATAL: ${loc}.json has extra keys not in en.json: ${extraKeys.join(', ')}`);
      hasFatal = true;
    }
  }

  if (!hasFatal) {
    console.log(`✅ Dictionary keys in parity across all locales (${baseKeys.length} keys).`);
  }
}

// 2. Content Collection Parity (FATAL / Exit 1)
console.log('\n--- 2. Content Collection Parity ---');
const contentDir = path.join(rootDir, 'src', 'content');
if (fs.existsSync(contentDir)) {
  const collections = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const collection of collections) {
    const colDir = path.join(contentDir, collection);
    const groups = fs.readdirSync(colDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const group of groups) {
      const groupDir = path.join(colDir, group);
      for (const loc of LOCALES) {
        const hasMdx = fs.existsSync(path.join(groupDir, `${loc}.mdx`));
        const hasMd = fs.existsSync(path.join(groupDir, `${loc}.md`));
        if (!hasMdx && !hasMd) {
          if (warnContent) {
            console.warn(`⚠️ [WARN] Missing locale file for group: src/content/${collection}/${group}/${loc}.mdx`);
            warningCount++;
          } else {
            console.error(`❌ FATAL: Missing locale file for group: src/content/${collection}/${group}/${loc}.mdx (use --warn-content to treat as warning)`);
            hasFatal = true;
          }
        }
      }
    }
  }

  if (!hasFatal) {
    console.log('✅ All content collection groups have matching files for all locales.');
  }
} else {
  console.log('⚠️ No content directory found.');
}

// 3. Slug Collision Guard (FATAL / Exit 1)
console.log('\n--- 3. Slug Collision Guard ---');
function extractFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/);
  const data = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length > 0) {
      let val = rest.join(':').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      data[key.trim()] = val;
    }
  }
  return data;
}

if (fs.existsSync(contentDir)) {
  const collections = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const loc of LOCALES) {
    const seenSlugs = new Map(); // slug -> filePath

    for (const collection of collections) {
      const colDir = path.join(contentDir, collection);
      const groups = fs.readdirSync(colDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const group of groups) {
        const groupDir = path.join(colDir, group);
        const targetFile = fs.existsSync(path.join(groupDir, `${loc}.mdx`))
          ? path.join(groupDir, `${loc}.mdx`)
          : path.existsSync(path.join(groupDir, `${loc}.md`))
          ? path.join(groupDir, `${loc}.md`)
          : null;

        if (targetFile) {
          const fm = extractFrontmatter(targetFile);
          const slug = fm.slug !== undefined ? fm.slug : group;

          // For static pages, check against reserved top-level routes
          if (collection === 'pages' && RESERVED_ROUTE_BASES.has(slug)) {
            console.error(`❌ FATAL: Slug "${slug}" in ${targetFile} collides with reserved route base.`);
            hasFatal = true;
          }

          if (slug !== '') {
            const key = `${collection}:${slug}`;
            if (seenSlugs.has(key)) {
              console.error(`❌ FATAL: Duplicate slug "${slug}" detected in ${collection} for locale "${loc}":\n  - ${seenSlugs.get(key)}\n  - ${targetFile}`);
              hasFatal = true;
            } else {
              seenSlugs.set(key, targetFile);
            }
          }
        }
      }
    }
  }

  if (!hasFatal) {
    console.log('✅ No slug collisions detected.');
  }
}

// 4. Unextracted Text Scanner (WARNING / Exit 0)
console.log('\n--- 4. Unextracted Text Scanner (Warnings) ---');
function scanDirForAstro(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(scanDirForAstro(fullPath));
    } else if (entry.name.endsWith('.astro')) {
      files.push(fullPath);
    }
  }
  return files;
}

const astroFiles = scanDirForAstro(path.join(rootDir, 'src'));
for (const file of astroFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  // Strip frontmatter
  const template = content.replace(/^---[\s\S]*?---/, '');
  // Look for text between tags
  const lines = template.split(/\r?\n/);
  lines.forEach((line, lineIdx) => {
    // Basic heuristic: text node with 3+ words that does not use {m. and is not a comment/import
    const textMatch = line.match(/>([^<>{}\n]+)</);
    if (textMatch) {
      const text = textMatch[1].trim();
      if (text.length > 8 && !text.startsWith('{') && !text.startsWith('//') && !text.startsWith('/*')) {
        // Emit warning without breaking build
        console.warn(`⚠️ [WARN] Potential unextracted text in ${path.relative(rootDir, file)}:${lineIdx + 1}: "${text}"`);
        warningCount++;
      }
    }
  });
}

if (warningCount === 0) {
  console.log('✅ Unextracted text scanner clean (0 warnings).');
} else {
  console.log(`ℹ️ Scanned template files, emitted ${warningCount} warnings.`);
}

console.log('\n----------------------------------------');
if (hasFatal) {
  console.error('❌ Audit Failed: Resolve fatal errors above.');
  process.exit(1);
} else {
  console.log('🎉 Audit Passed: 0 fatal errors.');
  process.exit(0);
}
