#!/usr/bin/env node
/**
 * Switches the project into single-language (solo) mode on the chosen locale.
 *
 * Updates `client/locales.json` and optionally archives removed locale overrides
 * and `.mdx` content files under `.locale-archive/<locale>/`.
 *
 * Usage:
 *   npm run i18n:solo -- <locale-code> [--keep-content|--delete-content] [--allow-draft] [--force]
 */
import fs from 'node:fs';
import { askYesNo, confirmDeletion } from './lib/prompt.mjs';
import { compileMessages } from './lib/compile-messages.mjs';
import { localeConfigPathFor, readLocaleConfig } from './lib/locales.mjs';
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
    'Usage: npm run i18n:solo -- <locale-code> [--keep-content|--delete-content] [--allow-draft] [--force]'
  );
  process.exit(wantsHelp ? 0 : 1);
}

const rootDir = process.cwd();
const localesPath = localeConfigPathFor(rootDir);
if (!fs.existsSync(localesPath)) {
  console.error('❌ Missing client/locales.json.');
  process.exit(1);
}

const localeConfig = readLocaleConfig(rootDir);
const otherLocales = localeConfig.locales.filter((loc) => loc !== targetLocale);

if (!keepContent && otherLocales.length > 0) {
  if (!force && !process.stdin.isTTY) {
    console.error(
      '❌ Refusing to permanently delete other locales’ content in a non-interactive session without --force.'
    );
    console.error('   Re-run with --keep-content (default) or pass --delete-content --force.');
    process.exit(1);
  }
  const confirmed = await confirmDeletion({
    question: `⚠️ Permanently delete client dictionaries and content files for [${otherLocales.join(', ')}]? (y/n) [default: n]: `,
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
    console.log(`✅ Switched defaultLocale to "${targetLocale}" in client/locales.json.`);
  }
  if (result.removedLocales.length > 0) {
    console.log(`✅ Unregistered locale(s): ${result.removedLocales.join(', ')}.`);
  }
  if (keepContent && result.archivedContentFiles.length > 0) {
    console.log(
      `📦 Archived ${result.archivedContentFiles.length} content file(s) and client dictionary backup(s) under .locale-archive/.`
    );
  } else if (!keepContent && result.deletedContentFiles.length > 0) {
    console.log(`🗑️ Deleted ${result.deletedContentFiles.length} content file(s).`);
  }
  console.log(
    `🎉 Site is now configured in single-language mode (${result.meta.name ?? targetLocale}, dir=${result.meta.dir ?? 'ltr'})!`
  );
  console.log('   Next: run `npm run audit:i18n && npm run build && npm run smoke` to verify.');
} catch (error) {
  console.error('❌', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
