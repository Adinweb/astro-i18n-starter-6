#!/usr/bin/env node
import { askYesNo, confirmDeletion } from './lib/prompt.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import { unregisterLocale } from './lib/locale-mutations.mjs';

const args = process.argv.slice(2);
const langCode = args.find((a) => !a.startsWith('--'));
let force = false;
let contentOption = null;

for (const arg of args) {
  if (arg === '--force' || arg === '-y' || arg === '--yes') {
    force = true;
  } else if (arg === '--with-content' || arg === '--delete-content') {
    contentOption = true;
  } else if (arg === '--keep-content' || arg === '--without-content' || arg === '--no-content') {
    contentOption = false;
  }
}

if (!langCode) {
  console.error(
    'Usage: npm run i18n:remove-lang -- <locale-code> [--with-content|--keep-content] [--force]'
  );
  process.exit(1);
}

const rootDir = process.cwd();
const localeConfig = readLocaleConfig(rootDir);
const baseLocale = localeConfig.defaultLocale || 'en';

if (!localeConfig.locales.includes(langCode)) {
  console.error(`❌ Locale "${langCode}" is not registered in client/locales.json.`);
  console.error(`   Currently registered locales: ${localeConfig.locales.join(', ')}`);
  process.exit(1);
}

if (langCode === baseLocale) {
  console.error(`❌ Cannot remove base/default locale "${langCode}".`);
  console.error(
    `   To remove "${langCode}", first swap the default locale with: npm run i18n:set-default -- <other-locale>`
  );
  console.error('   See docs/PLAYBOOKS.md Playbook 1 for more details.');
  process.exit(1);
}

if (localeConfig.locales.length <= 1) {
  console.error('❌ Cannot remove the only remaining locale.');
  process.exit(1);
}

if (!force && !process.stdin.isTTY) {
  console.error('❌ Refusing to remove a language in a non-interactive session without --force.');
  console.error('   Re-run with --force and optionally --with-content once verified.');
  process.exit(1);
}

const proceed = await confirmDeletion({
  question: `⚠️ Are you sure you want to completely remove language "${langCode}"? (y/n) [default: n]: `,
  force,
});

if (!proceed) {
  console.log('🛑 Operation cancelled. No changes were made.');
  process.exit(0);
}

let deleteContent = contentOption === true;
if (!force && contentOption === null) {
  deleteContent = await askYesNo(
    `❓ Do you also want to delete all "${langCode}.mdx" content files across pages and blog posts? (y/n) [default: y]: `,
    { defaultYes: true }
  );
}

console.log(`\n🗑️ Removing language "${langCode}"...`);

try {
  const result = unregisterLocale(langCode, {
    rootDir,
    deleteContent,
    archiveContent: !deleteContent,
    compile: true,
  });
  console.log(`✅ Removed "${langCode}" from client/locales.json`);
  if (result.deletedDictionary) {
    console.log(
      result.archivedDictionary
        ? `✅ Archived client/messages/${langCode}.json → .locale-archive/${langCode}/messages.json`
        : `✅ Deleted client/messages/${langCode}.json`
    );
  }
  if (deleteContent) {
    for (const rel of result.deletedContentFiles) {
      console.log(`  - Deleted: ${rel}`);
    }
    console.log(`✅ Deleted ${result.deletedContentFiles.length} content files.`);
  } else if (result.archivedContentFiles.length > 0) {
    console.log(
      `📦 Archived ${result.archivedContentFiles.length} content file(s) for "${langCode}" under .locale-archive/${langCode}/content/ (restore anytime with \`npm run i18n:add-lang -- ${langCode}\`).`
    );
  } else {
    console.log(`ℹ️ No content files found for "${langCode}".`);
  }
  console.log(`🎉 Language "${langCode}" successfully removed!`);
} catch (error) {
  console.error('❌', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
