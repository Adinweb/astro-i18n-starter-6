#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { confirmDeletion } from './lib/prompt.mjs';
import { compileMessages } from './lib/compile-messages.mjs';

const args = process.argv.slice(2);
const pageKey = args.find((a) => !a.startsWith('--'));
let targetLocale = '';
let force = false;
let cleanNav = true; // default true when removing a whole page

for (const arg of args) {
  if (arg.startsWith('--locale=')) targetLocale = arg.slice(9);
  else if (arg === '--no-clean-nav') cleanNav = false;
  else if (arg === '--clean-nav') cleanNav = true;
  else if (arg === '--force' || arg === '-y' || arg === '--yes') force = true;
}

/**
 * Removes `nav_<pageKey>` from the dictionaries of the given locales.
 *
 * A dictionary that keeps the key of a page it no longer has would offer a
 * navigation entry that leads nowhere, so the key is cleaned per locale.
 *
 * @param {string} rootDir
 * @param {string[]} locales Locales whose dictionary is cleaned.
 * @returns {boolean} Whether a dictionary was changed.
 */
function cleanNavKey(rootDir, locales) {
  const navKey = `nav_${pageKey}`;
  const messagesDir = path.join(rootDir, 'messages');
  if (!fs.existsSync(messagesDir)) return false;

  let modified = false;
  for (const locale of locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    if (!fs.existsSync(filePath)) continue;
    try {
      const dict = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (dict[navKey]) {
        delete dict[navKey];
        fs.writeFileSync(filePath, JSON.stringify(dict, null, 2) + '\n', 'utf-8');
        modified = true;
      }
    } catch {
      // A dictionary that cannot be parsed is reported by the audit, not here.
    }
  }
  return modified;
}

if (!pageKey) {
  console.error('Usage: pnpm run remove:page <page-key> [--locale=<locale>] [--no-clean-nav] [--force]');
  process.exit(1);
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

  // The navigation key stays in every dictionary: the dictionaries always
  // carry the same key set, and the navigation itself skips a page whose
  // locale has no entry.
  console.log(
    `ℹ️ The group has no "${targetLocale}" entry any more. The i18n audit reports that as a warning, not an error.`
  );
  console.log(`ℹ️ The key "nav_${pageKey}" stays in the dictionaries, so every locale keeps the same key set.`);
} else {
  // The group's artwork lives inside the group folder, so it is removed with it.
  fs.rmSync(targetGroupDir, { recursive: true, force: true });
  console.log(`✅ Successfully removed page group: src/content/pages/${pageKey}/`);

  // Clean nav translation key if present
  if (cleanNav) {
    const messagesDir = path.join(rootDir, 'messages');
    const files = fs.existsSync(messagesDir)
      ? fs
          .readdirSync(messagesDir)
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.replace(/\.json$/, ''))
      : [];

    if (cleanNavKey(rootDir, files)) {
      console.log(`🧹 Cleaned translation key "nav_${pageKey}" from dictionaries.`);
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
