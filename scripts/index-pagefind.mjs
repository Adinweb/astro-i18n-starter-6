#!/usr/bin/env node
/**
 * Post-build Pagefind indexer with Perso-Arabic text & punctuation normalization.
 *
 * Reads built HTML files from `dist/` in memory (never mutating `dist/*.html` on
 * disk), normalizes Arabic/Persian character variants (`ي`/`ى` → `ی`, `ك` → `ک`),
 * separates Perso-Arabic punctuation (`«`, `»`, `،`, `؛`, `؟`, `٪`, `٬`) from
 * adjacent word tokens using Unicode hair spaces (`\u200A`) so Pagefind's Rust
 * tokenizer indexes clean word stems without polluting excerpts, and writes the
 * compiled search bundle to `dist/pagefind/`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { close, createIndex } from 'pagefind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDistDir = path.resolve(__dirname, '..', 'dist');

const PERSO_ARABIC_LANGS = new Set(['fa', 'ar', 'ur', 'ps', 'ckb']);

const PROTECTED_HTML_SEGMENT_RE =
  /<!--[\s\S]*?-->|<(script|style|pre|code|svg|textarea)\b[^>]*>[\s\S]*?<\/\1>|<[^>]+>/gi;

const ARABIC_DIACRITICS_RE = /[\u0640\u064B-\u0652\u0656-\u065F\u0670]/g;

/**
 * Normalizes a plain text node inside an HTML document for Pagefind indexing
 * without altering visible prose wording or HTML entities.
 *
 * @param {string} text
 * @param {string} primaryLang
 * @returns {string}
 */
export function normalizeTextNodeForPagefind(text, primaryLang) {
  let result = text.replace(ARABIC_DIACRITICS_RE, '').replace(/\u200C{2,}/g, '\u200C');

  if (primaryLang === 'fa') {
    result = result
      .replace(/[\u064A\u0649]/g, '\u06CC') // ي / ى → ی
      .replace(/\u0643/g, '\u06A9'); // ك → ک
  }

  // Pagefind's non-stemmed tokenizer splits on Unicode whitespace, not on
  // Perso-Arabic punctuation (`«منبع`, `بومی‌سازی،`). Padding with `\u200A`
  // produces clean tokens while `plainText()` strips `\u200A` from excerpts.
  result = result
    .replace(/([^\s\u200A])([«»،؛؟٪٬])/g, '$1\u200A$2')
    .replace(/([«»،؛؟٪٬])([^\s\u200A])/g, '$1\u200A$2');

  return result;
}

/**
 * Prepares a built HTML string in memory before passing it to Pagefind.
 * Non-Perso-Arabic pages are returned unmodified.
 *
 * @param {string} html
 * @returns {string}
 */
export function prepareHtmlForPagefind(html) {
  const langMatch = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  const primaryLang = (langMatch?.[1] ?? '').trim().toLowerCase().split(/[-_]/)[0];

  if (!PERSO_ARABIC_LANGS.has(primaryLang)) {
    return html;
  }

  let output = '';
  let lastIndex = 0;

  for (const match of html.matchAll(PROTECTED_HTML_SEGMENT_RE)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      output += normalizeTextNodeForPagefind(html.slice(lastIndex, matchIndex), primaryLang);
    }
    output += match[0];
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < html.length) {
    output += normalizeTextNodeForPagefind(html.slice(lastIndex), primaryLang);
  }

  return output;
}

/**
 * Collects all built HTML files under `dir`, skipping `_astro` and `pagefind`.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function collectHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_astro' || entry.name === 'pagefind') continue;
      files.push(...collectHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

/**
 * Builds the Pagefind static search bundle inside `<distDir>/pagefind`.
 *
 * @param {string} [distDir]
 */
async function buildPagefindIndex(distDir = defaultDistDir) {
  if (!fs.existsSync(distDir)) {
    throw new Error(`[index-pagefind] Build directory not found: ${distDir}`);
  }

  const { errors: createErrors, index } = await createIndex();
  if (createErrors.length > 0 || !index) {
    await close();
    throw new Error(`[index-pagefind] Failed to create index: ${createErrors.join('; ')}`);
  }

  try {
    const htmlFiles = collectHtmlFiles(distDir);
    let indexedPages = 0;

    for (const filePath of htmlFiles) {
      const relativeSourcePath = path.relative(distDir, filePath).split(path.sep).join('/');
      const rawHtml = fs.readFileSync(filePath, 'utf-8');
      const preparedHtml = prepareHtmlForPagefind(rawHtml);

      const { errors, file } = await index.addHTMLFile({
        sourcePath: relativeSourcePath,
        content: preparedHtml,
      });

      if (errors.length > 0) {
        throw new Error(
          `[index-pagefind] Error indexing "${relativeSourcePath}": ${errors.join('; ')}`
        );
      }
      if (file && file.uniqueWords > 0) {
        indexedPages += 1;
      }
    }

    const outputPath = path.join(distDir, 'pagefind');
    const { errors: writeErrors } = await index.writeFiles({ outputPath });
    if (writeErrors.length > 0) {
      throw new Error(`[index-pagefind] Error writing bundle: ${writeErrors.join('; ')}`);
    }

    console.log(
      `🔎 Pagefind indexed ${indexedPages} page(s) (${htmlFiles.length} HTML files scanned) → ${path.relative(process.cwd(), outputPath)}`
    );
  } finally {
    await close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const customSiteFlag = process.argv.find((arg) => arg.startsWith('--site='));
  const targetDir = customSiteFlag
    ? path.resolve(process.cwd(), customSiteFlag.slice('--site='.length))
    : defaultDistDir;

  buildPagefindIndex(targetDir).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
