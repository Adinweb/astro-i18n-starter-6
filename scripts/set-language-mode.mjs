#!/usr/bin/env node
/**
 * Switches the project into single-language (solo) mode on the chosen locale.
 *
 * The chosen locale becomes `DEFAULT_LOCALE` / `baseLocale`, and every other
 * registered locale is unregistered. By default (`--keep-content`), removed
 * dictionaries and `.mdx` content files are safely archived under
 * `.locale-archive/<locale>/` so `audit:i18n` and `astro build` pass cleanly
 * while allowing instant restoration via `pnpm run i18n:add-lang <locale>`.
 *
 * Usage:
 *   pnpm run i18n:solo <locale-code> [--keep-content|--delete-content] [--allow-draft] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { askYesNo, confirmDeletion } from './lib/prompt.mjs';
import { compileMessages } from './lib/compile-messages.mjs';
import { switchToSingleLocale } from './lib/locale-mutations.mjs';

const args = process.argv.slice(2);
const wantsHelp = args.includes('--help') || args.includes('-h');
const targetLocale = args.find((a) => !a.startsWith('-'));
const allowDraftHome = args.includes('--allow-draft');
const force = args.includes('--force') || args.includes('--yes') || args.includes('-y');

let keepContent = true;
if (args.includes('--delete-content') || args.includes('--with-content')) {
  keepContent = false;
} else if (args.includes('--keep-content')) {
  keepContent = true;
}

if (wantsHelp || !targetLocale) {
  console.log(
    'Usage: pnpm run i18n:solo <locale-code> [--keep-content|--delete-content] [--allow-draft] [--force]'
  );
  process.exit(wantsHelp ? 0 : 1);
}

const rootDir = process.cwd();
const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
if (!fs.existsSync(inlangPath)) {
  console.error('❌ Missing project.inlang/settings.json.');
  process.exit(1);
}

const inlangSettings = JSON.parse(fs.readFileSync(inlangPath, 'utf-8'));
const otherLocales = inlangSettings.locales.filter((loc) => loc !== targetLocale);

if (!keepContent && otherLocales.length > 0) {
  if (!force && !process.stdin.isTTY) {
    console.error(
      '❌ Refusing to permanently delete other locales’ content in a non-interactive session without --force.'
    );
    console.error('   Re-run with --keep-content (default) or pass --delete-content --force.');
    process.exit(1);
  }
  const confirmed = await confirmDeletion({
    question: `⚠️ Permanently delete dictionaries and content files for [${otherLocales.join(', ')}]? (y/n) [default: n]: `,
    force,
  });
  if (!confirmed) {
    console.log('🛑 Operation cancelled. No changes were made.');
    process.exit(0);
  }
} else if (otherLocales.length > 0 && !force && process.stdin.isTTY) {
  const proceed = await askYesNo(
    `❓ Switch to single-language mode on "${targetLocale}" and archive [${otherLocales.join(', ')}]? (y/n) [default: y]: `,
    { defaultYes: true }
  );
  if (!proceed) {
    console.log('🛑 Operation cancelled. No changes were made.');
    process.exit(0);
  }
}

try {
  const result = switchToSingleLocale(targetLocale, {
    rootDir,
    keepContent,
    allowDraftHome,
    compile: false,
  });

  if (result.changed) {
    compileMessages(rootDir);
  }

  for (const warning of result.warnings) {
    console.warn(`⚠️  Warning: ${warning}`);
  }

  if (!result.changed) {
    console.log(`ℹ️  Site is already in single-language mode on "${targetLocale}".`);
    process.exit(0);
  }

  if (result.defaultChanged) {
    console.log(`✅ Switched DEFAULT_LOCALE / baseLocale to "${targetLocale}".`);
  }
  if (result.removedLocales.length > 0) {
    console.log(
      `✅ Unregistered locale(s): ${result.removedLocales.join(', ')}.`
    );
  }
  if (keepContent && result.archivedContentFiles.length > 0) {
    console.log(
      `📦 Archived ${result.archivedContentFiles.length} content file(s) and dictionary backup(s) under .locale-archive/.`
    );
  } else if (!keepContent && result.deletedContentFiles.length > 0) {
    console.log(`🗑️ Deleted ${result.deletedContentFiles.length} content file(s).`);
  }
  console.log(
    `🎉 Site is now configured in single-language mode (${result.meta.name ?? targetLocale}, dir=${result.meta.dir ?? 'ltr'})!`
  );
  console.log('   Next: run `pnpm run audit:i18n && pnpm run build && pnpm run smoke` to verify.');
} catch (error) {
  console.error('❌', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
