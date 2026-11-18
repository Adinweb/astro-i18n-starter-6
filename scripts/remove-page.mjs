#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { confirmDeletion } from './lib/prompt.mjs';
import { compileMessages } from './lib/compile-messages.mjs';
import { entryKeyError, localeCodeError } from './lib/validate.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import {
  readClientMessages,
  stripSchema,
  writeClientMessages,
} from './lib/merge-messages.mjs';

const args = process.argv.slice(2);
const pageKey = args.find((a) => !a.startsWith('--'));
let targetLocale = '';
let force = false;
let cleanNav = true;

for (const arg of args) {
  if (arg.startsWith('--locale=')) targetLocale = arg.slice(9);
  else if (arg === '--no-clean-nav') cleanNav = false;
  else if (arg === '--clean-nav') cleanNav = true;
  else if (arg === '--force' || arg === '-y' || arg === '--yes') force = true;
}

/**
 * Removes `nav_<pageKey>` from `client/messages/<locale>.json` across active locales.
 */
function cleanNavKey(rootDir, locales) {
  const navKey = `nav_${pageKey}`;
  let modified = false;
  for (const locale of locales) {
    const clientFile = path.join(rootDir, 'client', 'messages', `${locale}.json`);
    if (!fs.existsSync(clientFile)) continue;
    try {
      const dict = stripSchema(readClientMessages(locale, rootDir));
      if (navKey in dict) {
        delete dict[navKey];
        writeClientMessages(locale, dict, rootDir);
        modified = true;
      }
    } catch {
      // Unparseable dictionaries are reported by the audit.
    }
  }
  return modified;
}

/**
 * Finds files in `src/` and `client/` that still call `m.nav_<pageKey>(...)`.
 */
function findRemainingNavReferences(rootDir, key) {
  const needle = `m.nav_${key}(`;
  const hits = [];

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'paraglide' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|mjs|astro|mdx)$/.test(entry.name)) continue;
      if (fs.readFileSync(full, 'utf-8').includes(needle)) {
        hits.push(path.relative(rootDir, full));
      }
    }
  };

  walk(path.join(rootDir, 'src'));
  walk(path.join(rootDir, 'client'));
  return hits;
}

if (!pageKey) {
  console.error(
    'Usage: npm run remove:page -- <page-key> [--locale=<locale>] [--no-clean-nav] [--force]'
  );
  process.exit(1);
}

const keyError = entryKeyError(pageKey, 'page key');
if (keyError) {
  console.error(keyError);
  process.exit(1);
}

if (targetLocale) {
  const localeError = localeCodeError(targetLocale);
  if (localeError) {
    console.error(localeError);
    process.exit(1);
  }
}

if (pageKey === 'home' && !force) {
  console.error('❌ Refusing to delete critical "home" page without --force flag.');
  process.exit(1);
}

const rootDir = process.cwd();
const targetGroupDir = path.join(rootDir, 'src', 'content', 'pages', pageKey);

if (!fs.existsSync(targetGroupDir)) {
  console.error(`❌ Page group directory not found: ${targetGroupDir}`);
  process.exit(1);
}

if (!force && !process.stdin.isTTY) {
  console.error('❌ Refusing to delete in a non-interactive session without --force.');
  console.error('   Re-run with --force once you have verified the target.');
  process.exit(1);
}

const targetDesc = targetLocale
  ? `"${targetLocale}.mdx" in page "${pageKey}"`
  : `entire page group for "${pageKey}" (all languages)`;

const proceed = await confirmDeletion({
  question: `⚠️ Are you sure you want to delete ${targetDesc}? (y/n) [default: n]: `,
  force,
});
if (!proceed) {
  console.log('🛑 Operation cancelled. No changes were made.');
  process.exit(0);
}

if (targetLocale) {
  const targetFile = path.join(targetGroupDir, `${targetLocale}.mdx`);
  const targetMd = path.join(targetGroupDir, `${targetLocale}.md`);

  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
    console.log(`✅ Deleted: src/content/pages/${pageKey}/${targetLocale}.mdx`);
  } else if (fs.existsSync(targetMd)) {
    fs.unlinkSync(targetMd);
    console.log(`✅ Deleted: src/content/pages/${pageKey}/${targetLocale}.md`);
  } else {
    console.error(`❌ File for locale "${targetLocale}" not found in ${targetGroupDir}`);
    process.exit(1);
  }

  console.log(
    `ℹ️ The group has no "${targetLocale}" entry any more. The i18n audit reports that as a warning, not an error.`
  );
  console.log(`ℹ️ The key "nav_${pageKey}" stays in the dictionaries, so every locale keeps the same key set.`);
} else {
  fs.rmSync(targetGroupDir, { recursive: true, force: true });
  console.log(`✅ Successfully removed page group: src/content/pages/${pageKey}/`);

  if (cleanNav) {
    const remainingReferences = findRemainingNavReferences(rootDir, pageKey);
    const { locales } = readLocaleConfig(rootDir);

    if (cleanNavKey(rootDir, locales)) {
      console.log(`🧹 Cleaned translation key "nav_${pageKey}" from client/messages/*.json.`);
      if (remainingReferences.length > 0) {
        console.warn(
          `⚠️ Code still calls m.nav_${pageKey}(): ${remainingReferences.join(', ')}.`
        );
        console.warn(
          '   Remove or rewrite those references (CLIENT_PAGE_ITEMS / footer in client/navigation.ts) before building; the i18n audit fails while they exist.'
        );
      }
      console.log('🔄 Recompiling Paraglide messages...');
      try {
        compileMessages(rootDir);
        console.log('🎉 Paraglide recompiled successfully.');
      } catch (e) {
        console.warn('⚠️ Warning: Failed to recompile Paraglide messages:', e.message);
      }
    }
  }
}
