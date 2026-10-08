#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const langCode = args.find((a) => !a.startsWith('--'));
let force = false;
let contentOption = null; // true: delete content, false: keep content, null: prompt

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
  console.error('Usage: npm run i18n:remove-lang <locale-code> [--with-content|--keep-content] [--force]');
  process.exit(1);
}

const rootDir = process.cwd();
const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
const inlangSettings = JSON.parse(fs.readFileSync(inlangPath, 'utf-8'));
const baseLocale = inlangSettings.baseLocale || 'en';

if (!inlangSettings.locales.includes(langCode)) {
  console.error(`❌ Locale "${langCode}" is not registered in project.inlang/settings.json.`);
  console.error(`   Currently registered locales: ${inlangSettings.locales.join(', ')}`);
  process.exit(1);
}

if (langCode === baseLocale) {
  console.error(`❌ Cannot remove base/default locale "${langCode}".`);
  console.error(`   To remove "${langCode}", first swap the default locale to another language.`);
  console.error(`   See docs/PLAYBOOKS.md Playbook 1 for instructions.`);
  process.exit(1);
}

if (inlangSettings.locales.length <= 1) {
  console.error(`❌ Cannot remove the only remaining locale.`);
  process.exit(1);
}

async function confirmDeletion() {
  if (force) {
    return { proceed: true, deleteContent: contentOption !== false };
  }

  if (!process.stdin.isTTY) {
    console.log('ℹ️ Non-interactive mode: proceeding with language removal and content deletion.');
    return { proceed: true, deleteContent: contentOption !== false };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q) => new Promise((resolve) => rl.question(q, resolve));

  try {
    const confirmLang = await question(
      `⚠️ Are you sure you want to completely remove language "${langCode}"? (y/n) [default: n]: `
    );
    const trimmed = confirmLang.trim().toLowerCase();
    if (trimmed !== 'y' && trimmed !== 'yes') {
      return { proceed: false, deleteContent: false };
    }

    let deleteContent = contentOption;
    if (deleteContent === null) {
      const confirmContent = await question(
        `❓ Do you also want to delete all "${langCode}.mdx" content files across pages and blog posts? (y/n) [default: y]: `
      );
      const trimmedContent = confirmContent.trim().toLowerCase();
      deleteContent = !(trimmedContent === 'n' || trimmedContent === 'no');
    }

    return { proceed: true, deleteContent };
  } finally {
    rl.close();
  }
}

const { proceed, deleteContent } = await confirmDeletion();

if (!proceed) {
  console.log('🛑 Operation cancelled. No changes were made.');
  process.exit(0);
}

console.log(`\n🗑️ Removing language "${langCode}"...`);

// 1. Remove from project.inlang/settings.json
inlangSettings.locales = inlangSettings.locales.filter((l) => l !== langCode);
fs.writeFileSync(inlangPath, JSON.stringify(inlangSettings, null, 2) + '\n', 'utf-8');
console.log(`✅ Removed "${langCode}" from project.inlang/settings.json`);

// 2. Remove messages/<locale>.json
const dictPath = path.join(rootDir, 'messages', `${langCode}.json`);
if (fs.existsSync(dictPath)) {
  fs.unlinkSync(dictPath);
  console.log(`✅ Deleted messages/${langCode}.json`);
}

// 3. Update src/i18n/locales.ts
const localesPath = path.join(rootDir, 'src', 'i18n', 'locales.ts');
if (fs.existsSync(localesPath)) {
  let localesCode = fs.readFileSync(localesPath, 'utf-8');

  // Remove from LOCALES array
  localesCode = localesCode.replace(
    /export const LOCALES = \[(.*?)\] as const;/s,
    (m, p1) => {
      const remaining = p1
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s !== `'${langCode}'` && s !== `"${langCode}"`);
      return `export const LOCALES = [${remaining.join(', ')}] as const;`;
    }
  );

  // Remove from LOCALE_METADATA block
  const metaRegex = new RegExp(`\\s*${langCode}:\\s*\\{[\\s\\S]*?\\},?`, 'm');
  localesCode = localesCode.replace(metaRegex, '');

  fs.writeFileSync(localesPath, localesCode, 'utf-8');
  console.log(`✅ Updated LOCALES and LOCALE_METADATA in src/i18n/locales.ts`);
}

// 4. Update src/i18n/config.ts if it directly defined LOCALES
const configPath = path.join(rootDir, 'src', 'i18n', 'config.ts');
if (fs.existsSync(configPath)) {
  let configCode = fs.readFileSync(configPath, 'utf-8');
  if (configCode.includes('export const LOCALES = [')) {
    configCode = configCode.replace(
      /export const LOCALES = \[(.*?)\] as const;/s,
      (m, p1) => {
        const remaining = p1
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && s !== `'${langCode}'` && s !== `"${langCode}"`);
        return `export const LOCALES = [${remaining.join(', ')}] as const;`;
      }
    );
    fs.writeFileSync(configPath, configCode, 'utf-8');
    console.log(`✅ Updated src/i18n/config.ts`);
  }
}

// 5. Delete content files if requested
if (deleteContent) {
  console.log(`\n📄 Deleting content files for "${langCode}"...`);
  const contentDir = path.join(rootDir, 'src', 'content');
  if (fs.existsSync(contentDir)) {
    const collections = fs.readdirSync(contentDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let deletedFilesCount = 0;
    for (const collection of collections) {
      const colDir = path.join(contentDir, collection);
      const groups = fs.readdirSync(colDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const group of groups) {
        const groupDir = path.join(colDir, group);
        const candidates = [
          path.join(groupDir, `${langCode}.mdx`),
          path.join(groupDir, `${langCode}.md`),
        ];
        for (const file of candidates) {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`  - Deleted: src/content/${collection}/${group}/${path.basename(file)}`);
            deletedFilesCount++;
          }
        }
      }
    }
    console.log(`✅ Deleted ${deletedFilesCount} content files.`);
  }
} else {
  console.log(`ℹ️ Kept content files for "${langCode}" under src/content/ as requested.`);
}

// 6. Recompile Paraglide messages
console.log('\n🔄 Recompiling Paraglide messages...');
try {
  execSync('npm run messages:compile', { stdio: 'inherit' });
  console.log(`🎉 Language "${langCode}" successfully removed!`);
} catch (e) {
  console.error('❌ Failed to recompile messages:', e.message);
  process.exit(1);
}
